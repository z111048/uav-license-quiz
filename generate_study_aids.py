#!/usr/bin/env python3
"""
Generate AI study aids for UAV license quiz questions.
Reads professional.json, calls Claude Haiku API, outputs professional_study_aids.json.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    uv run generate_study_aids.py
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import anthropic
from tqdm import tqdm

INPUT_FILE = Path("public/data/professional.json")
OUTPUT_FILE = Path("public/data/professional_study_aids.json")
CHECKPOINT_EVERY = 50
CONCURRENCY = 3  # ~9,000 output tokens/min, under the 10,000/min rate limit
MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = "你是台灣無人機飛航考照的學習輔助 AI。請用繁體中文填寫所有欄位。"

TOOL = {
    "name": "submit_study_aid",
    "description": "提交一道選擇題的學習輔助資料",
    "input_schema": {
        "type": "object",
        "properties": {
            "keywords": {
                "type": "string",
                "description": "關鍵字提示：看到哪個詞就知道答案，簡短1-2句",
            },
            "mnemonic": {
                "type": "string",
                "description": "諧音或口訣：幫助記憶的方法，可使用諧音、歌訣等",
            },
            "explanation": {
                "type": "string",
                "description": "概念解析：為什麼這個答案是對的，2-3句",
            },
            "wrong_options": {
                "type": "object",
                "description": "錯誤選項說明：key 為選項字母（非正確答案），value 為為何是錯的簡短說明",
                "additionalProperties": {"type": "string"},
            },
        },
        "required": ["keywords", "mnemonic", "explanation", "wrong_options"],
    },
}


def build_prompt(q: dict) -> str:
    options_text = "\n".join(f"{k}. {v}" for k, v in q["options"].items())
    return f"""以下是一道選擇題，請產生學習輔助資料。

題目：{q["question"]}

選項：
{options_text}

正確答案：{q["answer"]}"""


async def generate_aid(
    client: anthropic.AsyncAnthropic, q: dict, idx: int, semaphore: asyncio.Semaphore
) -> tuple[str, dict]:
    key = str(idx)  # 0-based array index; q["id"] restarts per chapter so is NOT unique
    async with semaphore:
        for attempt in range(2):
            try:
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=800,
                    system=SYSTEM_PROMPT,
                    tools=[TOOL],
                    tool_choice={"type": "tool", "name": "submit_study_aid"},
                    messages=[{"role": "user", "content": build_prompt(q)}],
                )
                aid = response.content[0].input  # guaranteed dict, no json.loads needed
                return key, aid
            except anthropic.APIError as e:
                if attempt == 0:
                    await asyncio.sleep(2)
                    continue
                print(f"\n[WARN] Question {key} API error: {e}", file=sys.stderr)
                return key, {}
            except Exception as e:
                if attempt == 0:
                    await asyncio.sleep(1)
                    continue
                print(f"\n[WARN] Question {key} unexpected error: {e}", file=sys.stderr)
                return key, {}
    return key, {}


async def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    if not INPUT_FILE.exists():
        print(f"Error: {INPUT_FILE} not found. Run uv run update_question_bank.py first.", file=sys.stderr)
        sys.exit(1)

    with open(INPUT_FILE) as f:
        data = json.load(f)

    questions = data["questions"] if isinstance(data, dict) else data
    print(f"Loaded {len(questions)} questions from {INPUT_FILE}")

    # Resume support: skip already-processed questions
    existing: dict = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            existing = json.load(f)
        done_count = len(existing)
        print(f"Resuming: {done_count} already done, {len(questions) - done_count} remaining")

    pending = [(i, q) for i, q in enumerate(questions) if str(i) not in existing]
    if not pending:
        print("All questions already processed!")
        return

    client = anthropic.AsyncAnthropic(api_key=api_key)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results = dict(existing)

    tasks = [generate_aid(client, q, i, semaphore) for i, q in pending]
    completed = 0

    with tqdm(total=len(pending), desc="Generating study aids") as pbar:
        for coro in asyncio.as_completed(tasks):
            key, aid = await coro
            results[key] = aid
            completed += 1
            pbar.update(1)

            if completed % CHECKPOINT_EVERY == 0:
                OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
                with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)
                tqdm.write(f"  Checkpoint saved ({completed}/{len(pending)})")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    failed = sum(1 for v in results.values() if not v)
    print(f"\nDone! {len(results)} total ({failed} failed/empty) → {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
