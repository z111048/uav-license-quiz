"""
generate_image_manifest.py

Reads:
  - public/data/professional_image_analysis.json  (tier info per question index)
  - webp_urls.json                                 (index → Firebase URL, produced by convert_and_upload.py)

Writes:
  - public/data/professional_images.json           (index string → URL, only tier 1 & 2)

Only indices that appear in both the tier-1/2 list AND webp_urls.json are included,
so the manifest is safe to regenerate incrementally (partial uploads are fine).

Usage:
    uv run generate_image_manifest.py
"""

import json
from pathlib import Path

ANALYSIS_FILE = Path("public/data/professional_image_analysis.json")
URLS_FILE = Path("webp_urls.json")
OUTPUT_FILE = Path("public/data/professional_images.json")


def main() -> None:
    if not ANALYSIS_FILE.exists():
        print(f"Error: {ANALYSIS_FILE} not found.")
        return
    if not URLS_FILE.exists():
        print(f"Error: {URLS_FILE} not found. Run convert_and_upload.py first.")
        return

    analysis: dict = json.loads(ANALYSIS_FILE.read_text(encoding="utf-8"))
    urls: dict[str, str] = json.loads(URLS_FILE.read_text(encoding="utf-8"))

    # Collect tier 1 & 2 indices (as strings)
    tier12_indices = {
        k for k, v in analysis.items() if str(v.get("tier", "3")) in ("1", "2")
    }

    # Build manifest: only include indices present in both sets
    manifest: dict[str, str] = {}
    for idx in sorted(tier12_indices, key=lambda x: int(x)):
        if idx in urls:
            manifest[idx] = urls[idx]

    OUTPUT_FILE.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    total_tier12 = len(tier12_indices)
    included = len(manifest)
    missing = total_tier12 - included
    print(f"Tier 1+2 questions: {total_tier12}")
    print(f"Included in manifest: {included}")
    if missing:
        print(f"Missing URLs (not yet uploaded): {missing}")
    print(f"Written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
