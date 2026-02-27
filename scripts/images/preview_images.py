import asyncio
import json
import os
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# 使用你指定的穩定版本
MODEL_ID = "gemini-3.1-flash-image-preview"

# 視覺風格配置
STYLE_CONFIG = {
    "prefix": "Professional 3D technical schematic, minimalist isometric style, light grey background, high-fidelity engineering detail, all text labels and annotations in Traditional Chinese (zh-TW), ",
}

PREVIEW_DIR = Path("preview")
PREVIEW_DIR.mkdir(exist_ok=True)

async def run_single(idx, client, analysis):
    task = analysis.get(str(idx))
    if not task:
        print(f"❌ Error: Index {idx} not found in analysis data.")
        return False

    prompt = STYLE_CONFIG["prefix"] + task["image_prompt"]
    
    print(f"\n🚀 [GEMINI-3.1-FLASH] Index {idx}...")
    print(f"📝 Prompt: {task['image_prompt'][:100]}...")
    
    start_time = time.time()
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            # Gemini-based Image Generation 呼叫方式
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model=MODEL_ID,
                    contents=prompt,
                    config={
                        "response_modalities": ["TEXT", "IMAGE"],
                        "image_config": {
                            "aspect_ratio": "1:1"
                        },
                    }
                ),
                timeout=60
            )

            if response.parts:
                for part in response.parts:
                    if part.inline_data:
                        save_path = PREVIEW_DIR / f"{idx}.png"
                        with open(save_path, "wb") as f:
                            f.write(part.inline_data.data)
                        
                        duration = time.time() - start_time
                        print(f"✅ [SUCCESS] Index {idx} saved! (Time: {duration:.1f}s)")
                        return True
            
            print(f"⚠️ [RETRY] Index {idx}: No image in response, attempt {attempt + 1}/{max_retries}")
            
        except asyncio.TimeoutError:
            wait = (attempt + 1) * 3
            print(f"⏱️ [TIMEOUT] Index {idx}: No response within 60s. Waiting {wait}s...")
            await asyncio.sleep(wait)
            continue
        except Exception as e:
            error_msg = str(e)
            if "500" in error_msg or "INTERNAL" in error_msg:
                wait = (attempt + 1) * 3
                print(f"🔥 [SERVER ERROR] {error_msg[:60]}... Waiting {wait}s...")
                await asyncio.sleep(wait)
                continue
            else:
                print(f"❌ [API ERROR] Index {idx}: {e}")
                break
                
    print(f"💀 [FINAL FAIL] Index {idx} after {max_retries} attempts.")
    return False

async def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    with open("public/data/professional_image_analysis.json", "r", encoding="utf-8") as f:
        analysis = json.load(f)

    target_indices = sys.argv[1:] if len(sys.argv) > 1 else ["50", "125", "137"]
    
    for idx in target_indices:
        await run_single(idx, client, analysis)
        # 一張一張慢慢來，中間喘息一下
        await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(main())
