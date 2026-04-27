"""
generate_images_chatgpt_batch.py

Generates educational diagram images using OpenAI gpt-image-2 via the Batch API
(50% discount vs synchronous API). Reads prompts from professional_image_analysis_v2.json.

Flow:
  1. Build a .jsonl batch request file for all missing images
  2. Upload to OpenAI Files API
  3. Submit batch job (completion_window=24h)
  4. Poll until complete
  5. Download output, decode base64, save PNGs

Usage:
    uv run scripts/images/generate_images_chatgpt_batch.py
    uv run scripts/images/generate_images_chatgpt_batch.py --quality low
    uv run scripts/images/generate_images_chatgpt_batch.py --dry-run

Resume: already-existing PNGs are excluded from the batch automatically.
State file: public/data/images/professional_chatgpt/.batch_state.json
  → stores batch_id so you can recover if the script is interrupted while polling.

Cost reference (gpt-image-2, 1024x1024, Batch API = 50% off):
  low:    $0.003/image   (vs $0.006 sync)
  medium: $0.0265/image  (vs $0.053 sync)  ← default
  high:   $0.1055/image  (vs $0.211 sync)
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

ANALYSIS_FILE = Path("public/data/professional_image_analysis_v2.json")
IMAGE_DIR = Path("public/data/images/professional_chatgpt")
BATCH_STATE_FILE = IMAGE_DIR / ".batch_state.json"
BATCH_REQUESTS_FILE = IMAGE_DIR / ".batch_requests.jsonl"

DEFAULT_QUALITY = "medium"
DEFAULT_SIZE = "1024x1024"
TWD_PER_USD = 32.0

COST_TABLE_BATCH = {
    "low":    0.003,
    "medium": 0.0265,
    "high":   0.1055,
}

STYLE_PREFIX = (
    "Clean, precise educational diagram for Taiwan UAV (無人機) pilot license exam. "
    "White background. Flat or semi-flat 2D technical illustration. "
    "Unambiguous, physically accurate depiction. "
    "Text labels and annotations in Traditional Chinese (繁體中文). "
    "Minimalist style — no decorative borders, no gradients, no shadows. "
    "Suitable for printing on paper. "
)


def load_analysis() -> list[dict]:
    data = json.loads(ANALYSIS_FILE.read_text(encoding="utf-8"))
    return [v for v in data.values() if v.get("need_image") is True]


def build_requests_jsonl(tasks: list[dict], quality: str) -> list[dict]:
    requests = []
    for task in tasks:
        idx = task["index"]
        prompt = STYLE_PREFIX + task["image_prompt"]
        requests.append({
            "custom_id": f"idx-{idx}",
            "method": "POST",
            "url": "/v1/images/generations",
            "body": {
                "model": "gpt-image-2",
                "prompt": prompt,
                "size": DEFAULT_SIZE,
                "quality": quality,
                "output_format": "png",
                "n": 1,
            },
        })
    return requests


def load_batch_state() -> dict:
    if BATCH_STATE_FILE.exists():
        return json.loads(BATCH_STATE_FILE.read_text(encoding="utf-8"))
    return {}


def save_batch_state(state: dict) -> None:
    BATCH_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def poll_batch(client: OpenAI, batch_id: str) -> object:
    """Poll until batch is complete. Returns the finished batch object."""
    poll_interval = 30 * 60  # 30 minutes
    print(f"Polling batch {batch_id}（每 {poll_interval//60} 分鐘確認一次）...")
    while True:
        batch = client.batches.retrieve(batch_id)
        counts = batch.request_counts
        done = counts.completed + counts.failed
        total = counts.total
        status = batch.status
        elapsed = time.strftime("%H:%M:%S")
        print(f"  [{elapsed}] {status} — {done}/{total} 完成（{counts.completed} 成功, {counts.failed} 失敗）")
        if status in ("completed", "failed", "expired", "cancelled"):
            return batch
        time.sleep(poll_interval)


def download_results(client: OpenAI, output_file_id: str) -> list[dict]:
    """Download and parse the batch output .jsonl file."""
    content = client.files.content(output_file_id).text
    results = []
    for line in content.strip().splitlines():
        if line.strip():
            results.append(json.loads(line))
    return results


def save_images(results: list[dict]) -> tuple[int, int]:
    """Decode base64 and save PNGs. Returns (saved, failed)."""
    saved = 0
    failed = 0
    for item in results:
        custom_id = item.get("custom_id", "")
        idx = custom_id.replace("idx-", "")
        error = item.get("error")
        response = item.get("response", {})
        status_code = response.get("status_code", 0)

        if error or status_code != 200:
            reason = error or response.get("body", {}).get("error", {}).get("message", "unknown")
            print(f"  [FAIL] idx={idx}: {reason}")
            failed += 1
            continue

        b64 = None
        body = response.get("body", {})
        data_list = body.get("data", [])
        if data_list:
            b64 = data_list[0].get("b64_json")

        if not b64:
            print(f"  [WARN] idx={idx}: no image data in response")
            failed += 1
            continue

        out_path = IMAGE_DIR / f"{idx}.png"
        out_path.write_bytes(base64.b64decode(b64))
        saved += 1

    return saved, failed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--quality", choices=["low", "medium", "high"], default=DEFAULT_QUALITY,
        help=f"圖片品質（預設 {DEFAULT_QUALITY}）",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="只估算費用，不實際送出",
    )
    parser.add_argument(
        "--collect", action="store_true",
        help="只收取已送出的 batch 結果（不重新送出）",
    )
    args = parser.parse_args()

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        print("Error: OPENAI_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key) if api_key else None

    # --collect: resume from existing batch_id
    if args.collect:
        state = load_batch_state()
        batch_id = state.get("batch_id")
        if not batch_id:
            print("Error: no batch_id in state file. Run without --collect first.")
            sys.exit(1)
        print(f"Collecting results for batch {batch_id}...")
        batch = poll_batch(client, batch_id)
        if batch.status != "completed":
            print(f"Batch ended with status: {batch.status}")
            sys.exit(1)
        results = download_results(client, batch.output_file_id)
        saved, failed = save_images(results)
        print(f"Done. Saved: {saved}, Failed: {failed}")
        BATCH_STATE_FILE.unlink(missing_ok=True)
        return

    # Normal flow: build + submit batch
    if not ANALYSIS_FILE.exists():
        print(f"Error: {ANALYSIS_FILE} not found. Run analyze_questions_claude.py first.")
        sys.exit(1)

    all_tasks = load_analysis()
    pending = [t for t in all_tasks if not (IMAGE_DIR / f"{t['index']}.png").exists()]
    already_done = len(all_tasks) - len(pending)

    cost_per = COST_TABLE_BATCH[args.quality]
    estimated_usd = cost_per * len(pending)
    estimated_twd = estimated_usd * TWD_PER_USD

    print(f"品質：{args.quality}  尺寸：{DEFAULT_SIZE}  (Batch API, 50% off)")
    print(f"待生成：{len(pending)} 張（已完成 {already_done} / {len(all_tasks)} 張）")
    print(f"預估費用：${estimated_usd:.3f} USD（NT${estimated_twd:.0f}）")
    print()

    if args.dry_run:
        print("--dry-run 模式，結束。")
        return

    if not pending:
        print("所有圖片已生成，無需送出 batch。")
        return

    # Build and write requests .jsonl
    requests = build_requests_jsonl(pending, args.quality)
    BATCH_REQUESTS_FILE.write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in requests),
        encoding="utf-8",
    )
    print(f"已建立 {len(requests)} 筆請求 → {BATCH_REQUESTS_FILE}")

    # Upload file
    print("上傳請求檔案...")
    with open(BATCH_REQUESTS_FILE, "rb") as f:
        uploaded = client.files.create(file=f, purpose="batch")
    print(f"上傳完成，file_id: {uploaded.id}")

    # Submit batch
    print("送出 Batch 任務...")
    batch = client.batches.create(
        input_file_id=uploaded.id,
        endpoint="/v1/images/generations",
        completion_window="24h",
    )
    print(f"Batch 已送出，batch_id: {batch.id}")
    save_batch_state({"batch_id": batch.id, "quality": args.quality, "count": len(pending)})
    print(f"batch_id 已存至 {BATCH_STATE_FILE}")
    print()

    # Poll and collect
    batch = poll_batch(client, batch.id)

    if batch.status != "completed":
        print(f"Batch 結束，狀態：{batch.status}")
        print(f"可稍後執行 --collect 重試收取：")
        print(f"  uv run scripts/images/generate_images_chatgpt_batch.py --collect")
        sys.exit(1)

    print(f"Batch 完成！下載結果...")
    results = download_results(client, batch.output_file_id)
    saved, failed = save_images(results)

    total_usd = cost_per * saved
    print()
    print("=" * 50)
    print(f"完成！成功儲存 {saved} 張，失敗 {failed} 張")
    print(f"實際花費：${total_usd:.3f} USD（NT${total_usd * TWD_PER_USD:.0f}）")
    if failed:
        print(f"失敗的圖片可重新跑此腳本補生（斷點續傳）")
    print("=" * 50)

    BATCH_STATE_FILE.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
