import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any
from tqdm.asyncio import tqdm
from dotenv import load_dotenv

try:
    from google import genai
except ImportError:
    print("Error: Please install the latest Google GenAI SDK: pip install google-genai", file=sys.stderr)
    sys.exit(1)

load_dotenv()

# 配置
ANALYSIS_FILE = Path("public/data/professional_image_analysis.json")
IMAGE_DIR = Path("public/data/images/professional")
MODEL_ID = "gemini-3.1-flash-image-preview"
CONCURRENCY = 3

# 費用追蹤
COST_PER_IMAGE_USD = 0.067   # 每張估計費用（USD）— gemini-3.1-flash-image-preview 1K (1024px)
TWD_PER_USD = 32.0           # 匯率：1 USD ≈ 32 TWD
BUDGET_TWD = 300             # 預算上限（TWD）
BUDGET_USD = BUDGET_TWD / TWD_PER_USD  # ≈ 9.375 USD

# 視覺風格配置
STYLE_CONFIG = {
    "prefix": "Professional 3D technical schematic for a UAV flight manual, minimalist isometric style, soft studio lighting, neutral light grey background, high-fidelity engineering detail, clean composition, sharp focus, all text labels and annotations in Traditional Chinese (zh-TW), ",
    "tier_1_extra": "intricate mechanical parts, cross-section view if applicable, physical accuracy emphasized, ",
    "suffix": " --v 2026_pro_style"
}


async def generate_single_image(
    client: genai.Client,
    task: Dict[str, Any],
    semaphore: asyncio.Semaphore,
    stop_event: asyncio.Event,
    cost_state: Dict[str, Any],
    pbar: tqdm,
):
    idx = task["index"]
    tier = str(task["tier"])

    output_path = IMAGE_DIR / f"{idx}.png"

    # 斷點續傳：已存在則跳過（不計費）
    if output_path.exists():
        pbar.update(1)
        return True

    # 已超出預算，不再發送請求
    if stop_event.is_set():
        pbar.update(1)
        return False

    full_prompt = STYLE_CONFIG["prefix"]
    if tier == "1":
        full_prompt += STYLE_CONFIG["tier_1_extra"]
    full_prompt += task["image_prompt"]

    async with semaphore:
        # 再次確認（等待 semaphore 期間可能已被其他協程觸發）
        if stop_event.is_set():
            pbar.update(1)
            return False

        for attempt in range(3):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=MODEL_ID,
                        contents=full_prompt,
                        config={
                            "response_modalities": ["TEXT", "IMAGE"],
                            "image_config": {"aspect_ratio": "1:1"},
                        },
                    ),
                    timeout=60,
                )

                image_data = None
                for part in (response.parts or []):
                    if part.inline_data:
                        image_data = part.inline_data.data
                        break

                if image_data is None:
                    # 回傳空內容，當作可重試的暫時性錯誤
                    await asyncio.sleep(5 * (attempt + 1))
                    continue

                if image_data:
                    with open(output_path, "wb") as f:
                        f.write(image_data)

                    # --- 費用追蹤 ---
                    cost_state["count"] += 1
                    cost_state["usd"] += COST_PER_IMAGE_USD
                    spent_twd = cost_state["usd"] * TWD_PER_USD
                    remaining_twd = BUDGET_TWD - spent_twd
                    pbar.set_postfix_str(
                        f"💰 NT${spent_twd:.0f}/{BUDGET_TWD} "
                        f"(${cost_state['usd']:.3f} USD) "
                        f"剩 NT${remaining_twd:.0f}"
                    )

                    if cost_state["usd"] >= BUDGET_USD:
                        pbar.write(
                            f"\n⚠️  已達預算上限 NT${BUDGET_TWD}！"
                            f"（已生成 {cost_state['count']} 張，"
                            f"花費 NT${spent_twd:.0f} / ${cost_state['usd']:.3f} USD）"
                            f"\n   停止發送新請求，等待進行中的任務完成..."
                        )
                        stop_event.set()

                    pbar.update(1)
                    return True
                else:
                    pbar.write(f"[WARN] No image data for index {idx}")
                    pbar.update(1)
                    return False

            except asyncio.TimeoutError:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            except Exception as e:
                if "429" in str(e) or "503" in str(e):
                    await asyncio.sleep(5 * (attempt + 1))
                    continue
                pbar.write(f"[ERROR] Image {idx} failed: {e}")
                pbar.update(1)
                return False

    pbar.update(1)
    return False


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--indices", nargs="+", type=int, metavar="IDX",
        help="只生成指定 index 的圖片，例如：--indices 240 411 582"
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    if not ANALYSIS_FILE.exists():
        print(f"Error: {ANALYSIS_FILE} not found.", file=sys.stderr)
        sys.exit(1)

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    with open(ANALYSIS_FILE, "r", encoding="utf-8") as f:
        analysis_data = json.load(f)

    all_tasks = [v for v in analysis_data.values() if str(v.get("tier")) in ["1", "2"]]

    if args.indices:
        target = set(args.indices)
        pending_tasks = [t for t in all_tasks if t["index"] in target]
        not_found = target - {t["index"] for t in pending_tasks}
        if not_found:
            print(f"[WARN] 以下 index 在 tier1/2 中不存在：{sorted(not_found)}")
        print(f"指定模式：僅處理 {len(pending_tasks)} 張（index: {sorted(t['index'] for t in pending_tasks)}）")
    else:
        pending_tasks = all_tasks
    already_done = sum(1 for t in pending_tasks if (IMAGE_DIR / f"{t['index']}.png").exists())
    to_generate = len(pending_tasks) - already_done

    print(f"待生成：{to_generate} 張（已完成 {already_done} / {len(pending_tasks)} 張）")
    print(f"預算上限：NT${BUDGET_TWD}（≈ ${BUDGET_USD:.2f} USD，約可生成 {int(BUDGET_USD / COST_PER_IMAGE_USD)} 張）")
    print()

    semaphore = asyncio.Semaphore(CONCURRENCY)
    stop_event = asyncio.Event()
    cost_state = {"count": 0, "usd": 0.0}

    with tqdm(total=len(pending_tasks), desc="生成圖片", unit="張") as pbar:
        # 已完成的先更新進度條
        pbar.update(already_done)

        tasks = [
            generate_single_image(client, t, semaphore, stop_event, cost_state, pbar)
            for t in pending_tasks
        ]
        results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r)
    total_usd = cost_state["usd"]
    total_twd = total_usd * TWD_PER_USD

    print()
    print("=" * 50)
    print(f"完成！成功生成 {cost_state['count']} 張新圖片（含已存在共 {success_count} 張）")
    print(f"本次花費：NT${total_twd:.0f}（${total_usd:.3f} USD，匯率 {TWD_PER_USD:.0f}）")
    if stop_event.is_set():
        remaining = len(pending_tasks) - success_count
        print(f"因預算中止，剩餘 {remaining} 張未生成 → 補充預算後重跑腳本可斷點續傳")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
