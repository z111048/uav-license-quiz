"""
analyze_questions_claude.py

Re-analyzes all professional question bank questions with Claude to determine
which ones genuinely need an image. Uses a stricter standard than the original
Gemini analysis: an image must be ESSENTIAL for understanding the question,
not merely helpful.

Outputs:
  public/data/professional_image_analysis_v2.json  — machine-readable (same schema as v1)
  public/data/image_review.html                    — human-readable review page

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    uv run scripts/images/analyze_questions_claude.py
    uv run scripts/images/analyze_questions_claude.py --resume   # skip already-analyzed
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from tqdm.asyncio import tqdm

load_dotenv()

INPUT_FILE = Path("public/data/professional.json")
OUTPUT_FILE = Path("public/data/professional_image_analysis_v2.json")
REVIEW_HTML = Path("public/data/image_review.html")

MODEL = "claude-sonnet-4-6"
CONCURRENCY = 5
BATCH_SIZE = 10

SYSTEM_PROMPT = """\
你是台灣無人機飛航考照的題庫審核員，負責決定哪些題目需要搭配教學圖片。

判斷標準（嚴格）：
需要圖片的題目必須同時符合：
1. 題目涉及「空間關係、物理機制、設備構造、氣象圖示、飛行動態」等視覺概念
2. 純靠文字描述，考生「難以在腦中建立正確畫面」
3. 一張清晰的示意圖能大幅降低理解難度

不需要圖片的情況（直接判 need_image: false）：
- 純法規條文、行政程序、罰則數字
- 數值記憶（距離/高度/時間等限制）
- 定義題（「XX 是指...」）
- 閱讀題目文字就能直接選出答案，不需視覺輔助
- 概念雖然抽象但圖片幫助有限（例如「飛行前應注意事項」）

對於需要圖片的題目，請提供精確的英文生圖 prompt，要求：
- 白色背景，平面或半立體教學示意圖風格
- 標注文字使用繁體中文（Traditional Chinese）
- 物理正確、無歧義、適合印刷
- 簡潔，不超過 80 字
"""

TOOL = {
    "name": "submit_analysis",
    "description": "提交題目的圖片需求分析結果",
    "input_schema": {
        "type": "object",
        "properties": {
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "index": {
                            "type": "integer",
                            "description": "題目的 0-based index",
                        },
                        "need_image": {
                            "type": "boolean",
                            "description": "是否需要圖片（嚴格標準）",
                        },
                        "reason": {
                            "type": "string",
                            "description": "判斷理由，一句話",
                        },
                        "image_prompt": {
                            "type": "string",
                            "description": "英文生圖 prompt（need_image=true 時必填，false 時填空字串）",
                        },
                    },
                    "required": ["index", "need_image", "reason", "image_prompt"],
                },
            }
        },
        "required": ["results"],
    },
}


def build_batch_prompt(questions: list[dict], start_idx: int) -> str:
    lines = ["請分析以下題目，判斷每題是否需要圖片：\n"]
    for i, q in enumerate(questions):
        idx = start_idx + i
        opts = "  ".join(f"{k}. {v}" for k, v in q["options"].items())
        lines.append(f"[index={idx}] 第{idx+1}題（{q.get('chapter', '')}）")
        lines.append(f"題目：{q['question']}")
        lines.append(f"選項：{opts}")
        lines.append(f"答案：{q['answer']}\n")
    return "\n".join(lines)


async def analyze_batch(
    client: anthropic.AsyncAnthropic,
    questions: list[dict],
    start_idx: int,
    semaphore: asyncio.Semaphore,
) -> list[dict]:
    async with semaphore:
        for attempt in range(3):
            try:
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=2048,
                    system=SYSTEM_PROMPT,
                    tools=[TOOL],
                    tool_choice={"type": "tool", "name": "submit_analysis"},
                    messages=[
                        {"role": "user", "content": build_batch_prompt(questions, start_idx)}
                    ],
                )
                for block in response.content:
                    if block.type == "tool_use" and block.name == "submit_analysis":
                        return block.input.get("results", [])
                return []
            except Exception as e:
                if attempt < 2:
                    await asyncio.sleep(5 * (attempt + 1))
                else:
                    print(f"\n[ERROR] Batch idx={start_idx} failed: {e}")
                    return []
    return []


def build_review_html(questions: list[dict], analysis: dict) -> str:
    need_count = sum(1 for v in analysis.values() if v.get("need_image"))
    skip_count = len(analysis) - need_count

    rows = []
    for idx_str in sorted(analysis.keys(), key=lambda x: int(x)):
        idx = int(idx_str)
        if idx >= len(questions):
            continue
        q = questions[idx]
        info = analysis[idx_str]
        need = info.get("need_image", False)
        reason = info.get("reason", "")
        prompt = info.get("image_prompt", "")

        bg = "#e8f5e9" if need else "#fafafa"
        badge = (
            '<span style="background:#2e7d32;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">需要圖片</span>'
            if need else
            '<span style="background:#bdbdbd;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">不需要</span>'
        )
        opts_html = "".join(
            f'<span style="margin-right:12px"><b>{k}.</b> {v}</span>'
            for k, v in q["options"].items()
        )
        prompt_html = (
            f'<div style="margin-top:6px;font-size:12px;color:#1565c0;background:#e3f2fd;padding:6px 8px;border-radius:4px">'
            f'📸 Prompt: {prompt}</div>'
            if need and prompt else ""
        )

        rows.append(f"""
<div style="background:{bg};border:1px solid #ddd;border-radius:6px;padding:12px 16px;margin-bottom:8px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-weight:bold;color:#555">#{idx} &nbsp;<span style="font-size:12px;color:#888">{q.get('chapter','')}</span></span>
    {badge}
  </div>
  <div style="margin-bottom:4px">{q['question']}</div>
  <div style="font-size:13px;color:#666;margin-bottom:4px">{opts_html}</div>
  <div style="font-size:12px;color:#555">💬 {reason}</div>
  {prompt_html}
</div>""")

    return f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>圖片需求審核 — 專業操作證題庫</title>
<style>
  body {{ font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #333; }}
  h1 {{ font-size: 20px; }}
  .summary {{ background: #f5f5f5; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }}
</style>
</head>
<body>
<h1>圖片需求審核 — 專業操作證題庫（Claude {MODEL}）</h1>
<div class="summary">
  總題數：<b>{len(analysis)}</b> 題 &nbsp;｜&nbsp;
  需要圖片：<b style="color:#2e7d32">{need_count}</b> 題 &nbsp;｜&nbsp;
  不需要：<b style="color:#888">{skip_count}</b> 題 &nbsp;｜&nbsp;
  需圖比例：<b>{need_count/len(analysis)*100:.1f}%</b>
</div>
{"".join(rows)}
</body>
</html>"""


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--resume", action="store_true",
        help="跳過已分析的題目（斷點續傳）",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    data = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    questions: list[dict] = data["questions"]

    existing: dict = {}
    if args.resume and OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        print(f"已載入 {len(existing)} 筆既有結果（--resume）")

    pending_indices = [
        i for i in range(len(questions))
        if not args.resume or str(i) not in existing
    ]

    if not pending_indices:
        print("所有題目已分析完畢！")
    else:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        semaphore = asyncio.Semaphore(CONCURRENCY)

        batches = [
            pending_indices[i: i + BATCH_SIZE]
            for i in range(0, len(pending_indices), BATCH_SIZE)
        ]

        async def process_batch(batch_indices: list[int]) -> list[dict]:
            batch_qs = [questions[i] for i in batch_indices]
            return await analyze_batch(client, batch_qs, batch_indices[0], semaphore)

        results_list = await tqdm.gather(
            *[process_batch(b) for b in batches],
            desc="分析題目",
        )

        for results in results_list:
            for r in results:
                existing[str(r["index"])] = r

        OUTPUT_FILE.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    need = sum(1 for v in existing.values() if v.get("need_image"))
    total = len(existing)
    print(f"\n分析完成：{total} 題，需要圖片：{need} 題（{need/total*100:.1f}%）")
    print(f"已儲存至 {OUTPUT_FILE}")

    # Generate HTML review
    html = build_review_html(questions, existing)
    REVIEW_HTML.write_text(html, encoding="utf-8")
    print(f"審核頁面已輸出至 {REVIEW_HTML}")
    print("→ 用瀏覽器開啟 image_review.html 確認結果後，再執行生圖腳本")


if __name__ == "__main__":
    asyncio.run(main())
