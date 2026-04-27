"""
generate_images_chatgpt.py

Generates educational diagram images for UAV license exam questions using
OpenAI gpt-image-1. Reads prompts from professional_image_analysis.json
(same analysis file as the Gemini pipeline).

Prerequisites:
  - OPENAI_API_KEY environment variable set

Usage:
    uv run scripts/images/generate_images_chatgpt.py
    uv run scripts/images/generate_images_chatgpt.py --indices 5 28 55
    uv run scripts/images/generate_images_chatgpt.py --quality low   # low/medium/high
    uv run scripts/images/generate_images_chatgpt.py --dry-run       # cost estimate only

Output:
    public/data/images/professional_chatgpt/{idx}.png

Resume-friendly: existing files are skipped.

Cost reference (gpt-image-2, 1024x1024):
  low:    $0.006/image   (~NT$0.19)
  medium: $0.053/image   (~NT$1.70)  ← default
  high:   $0.211/image   (~NT$6.75)
"""

import argparse
import asyncio
import base64
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from tqdm.asyncio import tqdm

try:
    from openai import AsyncOpenAI
except ImportError:
    print("Error: openai package not found. Run: uv add openai", file=sys.stderr)
    sys.exit(1)

load_dotenv()

ANALYSIS_FILE = Path("public/data/professional_image_analysis_v2.json")
IMAGE_DIR = Path("public/data/images/professional_chatgpt")
CONCURRENCY = 2  # gpt-image-2 rate limits; 2 keeps us safe

COST_TABLE = {
    "low":    0.006,
    "medium": 0.053,
    "high":   0.211,
}
TWD_PER_USD = 32.0
DEFAULT_QUALITY = "medium"
DEFAULT_SIZE = "1024x1024"

# Style prefix tuned for gpt-image-1:
# - Direct, instruction-following style (gpt-image-1 strength)
# - Flat/semi-flat 2D technical diagram — less ambiguous than Gemini's 3D isometric
# - White background for readability on mobile
STYLE_CONFIG = {
    "prefix": (
        "Clean, precise educational diagram for Taiwan UAV (無人機) pilot license exam. "
        "White background. Flat or semi-flat 2D technical illustration. "
        "Unambiguous, physically accurate depiction. "
        "Text labels and annotations in Traditional Chinese (繁體中文). "
        "Minimalist style — no decorative borders, no gradients, no shadows. "
        "Suitable for printing on paper. "
    ),
    "tier_1_extra": (
        "Include cross-section views or exploded diagrams where helpful. "
        "Show key dimensions with labelled arrows. "
        "Physics diagram conventions (vectors, force arrows, angles). "
    ),
}


async def generate_single(
    client: AsyncOpenAI,
    task: dict,
    quality: str,
    semaphore: asyncio.Semaphore,
    stop_event: asyncio.Event,
    cost_state: dict,
    budget_usd: float,
    pbar: tqdm,
) -> bool:
    idx = task["index"]
    output_path = IMAGE_DIR / f"{idx}.png"

    if output_path.exists():
        pbar.update(1)
        return True

    if stop_event.is_set():
        pbar.update(1)
        return False

    prompt = STYLE_CONFIG["prefix"] + task["image_prompt"]

    async with semaphore:
        if stop_event.is_set():
            pbar.update(1)
            return False

        for attempt in range(4):
            try:
                response = await asyncio.wait_for(
                    client.images.generate(
                        model="gpt-image-2",
                        prompt=prompt,
                        size=DEFAULT_SIZE,
                        quality=quality,
                        n=1,
                        response_format="b64_json",
                    ),
                    timeout=120,
                )

                b64 = response.data[0].b64_json
                if not b64:
                    pbar.write(f"[WARN] No image data for index {idx}")
                    pbar.update(1)
                    return False

                output_path.write_bytes(base64.b64decode(b64))

                cost_state["count"] += 1
                cost_state["usd"] += COST_TABLE[quality]
                spent_twd = cost_state["usd"] * TWD_PER_USD
                pbar.set_postfix_str(
                    f"💰 NT${spent_twd:.0f} "
                    f"(${cost_state['usd']:.3f} USD) "
                    f"剩 NT${(budget_usd - cost_state['usd']) * TWD_PER_USD:.0f}"
                )

                if cost_state["usd"] >= budget_usd:
                    pbar.write(
                        f"\n⚠️  已達預算上限！"
                        f"（已生成 {cost_state['count']} 張，"
                        f"花費 NT${spent_twd:.0f} / ${cost_state['usd']:.3f} USD）"
                        f"\n   停止發送新請求，等待進行中的任務完成..."
                    )
                    stop_event.set()

                pbar.update(1)
                return True

            except asyncio.TimeoutError:
                await asyncio.sleep(10 * (attempt + 1))
            except Exception as e:
                msg = str(e)
                if "429" in msg or "503" in msg or "rate" in msg.lower():
                    wait = 15 * (attempt + 1)
                    pbar.write(f"[RATE] idx={idx} rate-limited, waiting {wait}s...")
                    await asyncio.sleep(wait)
                elif attempt < 3:
                    await asyncio.sleep(5 * (attempt + 1))
                else:
                    pbar.write(f"[ERROR] Image {idx} failed: {e}")
                    pbar.update(1)
                    return False

    pbar.update(1)
    return False


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--indices", nargs="+", type=int, metavar="IDX",
        help="只生成指定 index 的圖片，例如：--indices 5 28 55",
    )
    parser.add_argument(
        "--quality", choices=["low", "medium", "high"], default=DEFAULT_QUALITY,
        help=f"圖片品質（預設 {DEFAULT_QUALITY}）",
    )
    parser.add_argument(
        "--budget", type=float, default=None,
        help="預算上限（USD），超過則停止（預設：無上限）",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="只估算費用，不實際生成",
    )
    args = parser.parse_args()

    if not ANALYSIS_FILE.exists():
        print(f"Error: {ANALYSIS_FILE} not found.", file=sys.stderr)
        sys.exit(1)

    analysis: dict = json.loads(ANALYSIS_FILE.read_text(encoding="utf-8"))
    all_tasks = [v for v in analysis.values() if v.get("need_image") is True]

    if args.indices:
        target = set(args.indices)
        all_tasks = [t for t in all_tasks if t["index"] in target]
        not_found = target - {t["index"] for t in all_tasks}
        if not_found:
            print(f"[WARN] 以下 index 在需圖清單中不存在：{sorted(not_found)}")

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    already_done = sum(1 for t in all_tasks if (IMAGE_DIR / f"{t['index']}.png").exists())
    to_generate = len(all_tasks) - already_done
    cost_per_image = COST_TABLE[args.quality]
    estimated_usd = cost_per_image * to_generate
    estimated_twd = estimated_usd * TWD_PER_USD
    budget_usd = args.budget if args.budget else float("inf")

    print(f"品質：{args.quality}  尺寸：{DEFAULT_SIZE}")
    print(f"待生成：{to_generate} 張（已完成 {already_done} / {len(all_tasks)} 張）")
    print(f"預估費用：${estimated_usd:.2f} USD（NT${estimated_twd:.0f}，匯率 {TWD_PER_USD:.0f}）")
    if args.budget:
        max_images = int(args.budget / cost_per_image)
        print(f"預算上限：${args.budget:.2f} USD ≈ 最多生成 {max_images} 張")
    print()

    if args.dry_run:
        print("--dry-run 模式，結束。")
        return

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = AsyncOpenAI(api_key=api_key)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    stop_event = asyncio.Event()
    cost_state = {"count": 0, "usd": 0.0}

    with tqdm(total=len(all_tasks), desc="生成圖片", unit="張") as pbar:
        pbar.update(already_done)
        tasks = [
            generate_single(
                client, t, args.quality, semaphore,
                stop_event, cost_state, budget_usd, pbar,
            )
            for t in all_tasks
        ]
        results = await asyncio.gather(*tasks)

    success = sum(1 for r in results if r)
    total_twd = cost_state["usd"] * TWD_PER_USD
    print()
    print("=" * 50)
    print(f"完成！本次新生成 {cost_state['count']} 張（含已存在共 {success} 張）")
    print(f"本次花費：NT${total_twd:.0f}（${cost_state['usd']:.3f} USD）")
    if stop_event.is_set():
        remaining = len(all_tasks) - success
        print(f"因預算中止，剩餘 {remaining} 張未生成 → 補充預算後重跑可斷點續傳")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
