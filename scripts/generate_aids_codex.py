#!/usr/bin/env python3
"""
使用 Codex CLI 非互動模式（codex exec）為題庫產生題目解析。
每批 25 題交給 Codex 處理，結果寫入暫存 JSON 檔再彙整。
預設跳過法規章節（第一章），優先產生技術性章節解析。

Usage:
    uv run scripts/generate_aids_codex.py                     # general bank，非法規章節
    uv run scripts/generate_aids_codex.py --bank professional  # 專業操作證
    uv run scripts/generate_aids_codex.py --include-law        # 含法規章節
    uv run scripts/generate_aids_codex.py --resume             # 斷點續傳
    uv run scripts/generate_aids_codex.py --batch-size 15      # 調整批次大小

Output:
    public/data/{bank}_study_aids.json
    格式同 professional_study_aids.json（key = 0-based 全域 index）
"""

import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

LAW_CHAPTER_KEYWORD = "民用航空法"
BATCH_SIZE_DEFAULT = 25
CHECKPOINT_EVERY = 3  # 每 N 批存一次


CODEX_PROMPT_TEMPLATE = """\
你是台灣無人機飛航考照的學習輔助 AI。以下是一批選擇題（JSON），請為每題產生繁體中文解析。

每題輸出四個欄位：
- explanation：為什麼這個答案正確，著重技術原理，2-3 句
- keywords：看到哪個關鍵詞就知道答案，1-2 句
- mnemonic：幫助記憶的口訣或諧音（若題目為純計算可寫「N/A」）
- wrong_options：object，key 為錯誤選項字母，value 為為何是錯的簡短說明

請將結果寫入 {output_path}，格式如下（JSON array，每個元素必須含 idx 欄位）：
[
  {{
    "idx": <全域 index，整數>,
    "explanation": "...",
    "keywords": "...",
    "mnemonic": "...",
    "wrong_options": {{"B": "...", "C": "..."}}
  }},
  ...
]

只寫入純 JSON 到該檔案，不要有其他內容。

題目資料：
{questions_json}
"""


def run_codex_batch(
    batch: list[tuple[int, dict]],
    output_path: str,
    dry_run: bool = False,
) -> list[dict]:
    """Run one Codex exec batch; return list of aid dicts with idx."""
    questions_json = json.dumps(
        [
            {
                "idx": idx,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"],
                "chapter": q.get("chapter", ""),
            }
            for idx, q in batch
        ],
        ensure_ascii=False,
        indent=2,
    )

    prompt = CODEX_PROMPT_TEMPLATE.format(
        output_path=output_path,
        questions_json=questions_json,
    )

    if dry_run:
        print(f"  [dry-run] prompt length: {len(prompt)} chars")
        return []

    result = subprocess.run(
        ["npx", "codex", "exec", "-"],
        input=prompt,
        capture_output=True,
        text=True,
        timeout=300,
    )

    if result.returncode != 0:
        print(f"\n  Codex exec 失敗（exit {result.returncode}）:")
        print(result.stderr[-500:] if result.stderr else "(no stderr)")
        return []

    # Codex 應已將結果寫入 output_path
    out_file = Path(output_path)
    if not out_file.exists():
        print(f"\n  Codex 未寫入輸出檔：{output_path}")
        print("  stdout:", result.stdout[-300:])
        return []

    try:
        data = json.loads(out_file.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        print(f"\n  輸出格式錯誤（預期 array）：{type(data)}")
        return []
    except json.JSONDecodeError as e:
        print(f"\n  JSON 解析失敗：{e}")
        print("  檔案內容：", out_file.read_text(encoding="utf-8")[:500])
        return []


def main() -> None:
    parser = argparse.ArgumentParser(description="用 Codex CLI 生成 UAV 題目解析")
    parser.add_argument("--bank", default="general", help="題庫名稱（general/professional/renewal/renewal_basic）")
    parser.add_argument("--include-law", action="store_true", help="包含法規章節")
    parser.add_argument("--resume", action="store_true", help="斷點續傳")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE_DEFAULT, help="每批題目數量")
    parser.add_argument("--dry-run", action="store_true", help="只印出 prompt，不實際呼叫 Codex")
    args = parser.parse_args()

    input_file = Path(f"public/data/{args.bank}.json")
    output_file = Path(f"public/data/{args.bank}_study_aids.json")

    if not input_file.exists():
        print(f"找不到題庫：{input_file}")
        sys.exit(1)

    with open(input_file, encoding="utf-8") as f:
        bank_data = json.load(f)
    questions: list[dict] = bank_data if isinstance(bank_data, list) else bank_data["questions"]

    # 載入現有結果（斷點續傳）
    existing: dict[str, dict] = {}
    if args.resume and output_file.exists():
        with open(output_file, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"斷點續傳：已有 {len(existing)} 筆")

    # 篩選要處理的題目
    targets: list[tuple[int, dict]] = []
    skipped_law = 0
    for idx, q in enumerate(questions):
        if not args.include_law and LAW_CHAPTER_KEYWORD in q.get("chapter", ""):
            skipped_law += 1
            continue
        if str(idx) in existing:
            continue
        targets.append((idx, q))

    print(f"題庫：{args.bank}（共 {len(questions)} 題）")
    if skipped_law:
        print(f"跳過法規章節：{skipped_law} 題（加 --include-law 以包含）")
    print(f"已有解析：{len(existing)} 筆，待生成：{len(targets)} 題")

    if not targets:
        print("全部完成，無需生成。")
        return

    # 分批處理
    batches = [targets[i : i + args.batch_size] for i in range(0, len(targets), args.batch_size)]
    print(f"共 {len(batches)} 批（每批最多 {args.batch_size} 題）\n")

    results: dict[str, dict] = dict(existing)
    errors = 0

    with tempfile.TemporaryDirectory() as tmpdir:
        for batch_idx, batch in enumerate(batches):
            batch_out = f"{tmpdir}/batch_{batch_idx}.json"
            idxs = [str(idx) for idx, _ in batch]
            print(f"批次 {batch_idx + 1}/{len(batches)}：Q{idxs[0]}~Q{idxs[-1]}（{len(batch)} 題）", end=" ", flush=True)

            t0 = time.time()
            aids = run_codex_batch(batch, batch_out, dry_run=args.dry_run)
            elapsed = time.time() - t0

            if aids:
                for item in aids:
                    idx_key = str(item.get("idx", ""))
                    if idx_key:
                        item_copy = {k: v for k, v in item.items() if k != "idx"}
                        results[idx_key] = item_copy
                print(f"✓ {len(aids)} 筆 ({elapsed:.0f}s)")
            else:
                errors += 1
                print(f"✗ 失敗")

            # 定期存檔
            if (batch_idx + 1) % CHECKPOINT_EVERY == 0 or batch_idx == len(batches) - 1:
                _save(output_file, results)
                print(f"  → 已儲存 {len(results)} 筆到 {output_file}")

    print(f"\n完成！成功 {len(results)} 筆，失敗批次 {errors} 個")
    print(f"輸出：{output_file}")


def _save(path: Path, data: dict) -> None:
    sorted_data = {k: data[k] for k in sorted(data, key=lambda x: int(x))}
    path.write_text(json.dumps(sorted_data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
