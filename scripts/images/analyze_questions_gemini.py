import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List
from tqdm.asyncio import tqdm
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: Please install the latest Google GenAI SDK: pip install google-genai", file=sys.stderr)
    sys.exit(1)

load_dotenv()

# 配置
INPUT_FILE = Path("public/data/professional.json")
OUTPUT_FILE = Path("public/data/professional_image_analysis.json")
MODEL_ID = "gemini-3-flash-preview"
BATCH_SIZE = 10 
CONCURRENCY = 5  # 同時發送 5 個請求，大幅提升速度
CHECKPOINT_EVERY = 5

SYSTEM_PROMPT = """你是一個專業的無人機考照教育專家與物理圖解大師。
你的任務是分析題目，判斷其是否需要圖片輔助，並為其設計生圖指令(Prompt)。

請將題目分為三個等級 (Tier)：
- Tier 1: 核心物理原理、複雜構造、氣象圖資、三軸運動。這類題目需要最精密的 3D 渲染或物理示意圖。
- Tier 2: 情境描述、環境安全距離、一般操作場景。這類題目只需要簡單的背景與物件示意。
- Tier 3: 純法規、行政程序、數值記憶、抽象概念。這類題目不需要圖片，或是可以用簡單的圖示(Icon/SVG)表示。

對於需要圖片的題目 (Tier 1 & 2)，請提供精確的英文生圖 Prompt，強調「物理正確性」、「教學用途」、「乾淨的背景」。"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "analysis_results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "tier": {"type": "string", "enum": ["1", "2", "3"]},
                    "reason": {"type": "string"},
                    "visual_concept": {"type": "string"},
                    "image_prompt": {"type": "string"},
                    "svg_path_concept": {"type": "string"}
                },
                "required": ["index", "tier", "reason", "visual_concept", "image_prompt"]
            }
        }
    }
}

async def analyze_batch(client: genai.Client, questions_batch: List[Dict[str, Any]], start_idx: int, semaphore: asyncio.Semaphore):
    async with semaphore:
        prompt_text = "請分析以下題目：\n\n"
        for i, q in enumerate(questions_batch):
            prompt_text += f"--- 索引 {start_idx + i} ---\n"
            prompt_text += f"題目：{q['question']}\n"
            prompt_text += f"選項：{json.dumps(q['options'], ensure_ascii=False)}\n"
            prompt_text += f"答案：{q['answer']}\n\n"

        for attempt in range(3): # 加入重試機制
            try:
                # 使用 await 異步呼叫 (注意：目前 SDK 可能需要用 run_in_executor 或是直接有 async 版本)
                # 這裡假設 client.models.generate_content 是阻塞的，我們用 loop 運行它
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: client.models.generate_content(
                    model=MODEL_ID,
                    contents=prompt_text,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        response_schema=RESPONSE_SCHEMA,
                        temperature=0.2
                    )
                ))
                result = json.loads(response.text)
                return result.get("analysis_results", [])
            except Exception as e:
                if attempt < 2:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                print(f"\n[ERROR] Batch starting at {start_idx} failed: {e}")
                return []

async def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    questions = data.get("questions", [])
    
    all_results = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            try: all_results = json.load(f)
            except: pass

    pending_indices = [i for i in range(len(questions)) if str(i) not in all_results]
    if not pending_indices:
        print("All questions analyzed!")
        return

    semaphore = asyncio.Semaphore(CONCURRENCY)
    tasks = []
    
    # 建立所有任務
    for i in range(0, len(pending_indices), BATCH_SIZE):
        batch_indices = pending_indices[i : i + BATCH_SIZE]
        questions_batch = [questions[idx] for idx in batch_indices]
        tasks.append(analyze_batch(client, questions_batch, batch_indices[0], semaphore))

    # 使用 tqdm 顯示進度並執行
    results_list = await tqdm.gather(*tasks, desc="Parallel Analyzing")

    # 整合結果
    for results in results_list:
        for res in results:
            all_results[str(res["index"])] = res

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    # 統計
    tiers = {"1": 0, "2": 0, "3": 0}
    for r in all_results.values():
        t = str(r.get("tier", "3"))
        tiers[t] = tiers.get(t, 0) + 1
    
    print(f"\nDone! T1:{tiers['1']}, T2:{tiers['2']}, T3:{tiers['3']} -> {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
