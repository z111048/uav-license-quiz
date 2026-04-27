"""
generate_image_manifest.py

Reads:
  - public/data/professional_image_analysis.json  (tier info per question index)
  - webp_urls.json         / webp_urls_chatgpt.json  (produced by convert_and_upload.py)

Writes:
  - public/data/professional_images.json          (Gemini, default)
  - public/data/professional_images_chatgpt.json  (ChatGPT, --source chatgpt)

Only indices that appear in both the tier-1/2 list AND the urls file are included,
so the manifest is safe to regenerate incrementally (partial uploads are fine).

Usage:
    uv run scripts/images/generate_image_manifest.py                  # Gemini
    uv run scripts/images/generate_image_manifest.py --source chatgpt # ChatGPT
"""

import argparse
import json
from pathlib import Path

ANALYSIS_FILE = Path("public/data/professional_image_analysis.json")

SOURCE_CONFIGS = {
    "gemini": {
        "urls_file": Path("webp_urls.json"),
        "output_file": Path("public/data/professional_images.json"),
    },
    "chatgpt": {
        "urls_file": Path("webp_urls_chatgpt.json"),
        "output_file": Path("public/data/professional_images_chatgpt.json"),
    },
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source", choices=["gemini", "chatgpt"], default="gemini",
        help="圖片來源（預設：gemini）",
    )
    args = parser.parse_args()

    cfg = SOURCE_CONFIGS[args.source]
    urls_file: Path = cfg["urls_file"]
    output_file: Path = cfg["output_file"]

    if not ANALYSIS_FILE.exists():
        print(f"Error: {ANALYSIS_FILE} not found.")
        return
    if not urls_file.exists():
        print(f"Error: {urls_file} not found. Run convert_and_upload.py --source {args.source} first.")
        return

    analysis: dict = json.loads(ANALYSIS_FILE.read_text(encoding="utf-8"))
    urls: dict[str, str] = json.loads(urls_file.read_text(encoding="utf-8"))

    tier12_indices = {
        k for k, v in analysis.items() if str(v.get("tier", "3")) in ("1", "2")
    }

    manifest: dict[str, str] = {}
    for idx in sorted(tier12_indices, key=lambda x: int(x)):
        if idx in urls:
            manifest[idx] = urls[idx]

    output_file.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    total_tier12 = len(tier12_indices)
    included = len(manifest)
    missing = total_tier12 - included
    print(f"Source: {args.source}")
    print(f"Tier 1+2 questions: {total_tier12}")
    print(f"Included in manifest: {included}")
    if missing:
        print(f"Missing URLs (not yet uploaded): {missing}")
    print(f"Written to {output_file}")


if __name__ == "__main__":
    main()
