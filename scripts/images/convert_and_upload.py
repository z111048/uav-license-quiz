"""
convert_and_upload.py

Converts PNG images in public/data/images/professional/ to WebP (quality=85),
then uploads them to Firebase Storage.

Prerequisites:
  - A Firebase project with Storage enabled
  - A service account JSON key (set FIREBASE_CREDENTIALS env var to its path)
  - FIREBASE_BUCKET env var set to your Storage bucket name
    e.g.  your-project-id.appspot.com

Usage:
    export FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json
    export FIREBASE_BUCKET=your-project-id.appspot.com
    uv run convert_and_upload.py

Output:
    webp_urls.json  — mapping { "idx": "https://..." }

Resume-friendly: already-uploaded indices in webp_urls.json are skipped.
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not found. Run: uv sync", file=sys.stderr)
    sys.exit(1)

try:
    import firebase_admin
    from firebase_admin import credentials, storage
except ImportError:
    print("Error: firebase-admin not found. Run: uv sync", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

IMAGE_DIR = Path("public/data/images/professional")
WEBP_DIR = IMAGE_DIR / "webp"
URLS_FILE = Path("webp_urls.json")
STORAGE_PREFIX = "professional"   # folder name inside the Firebase bucket
WEBP_QUALITY = 85

# ---------------------------------------------------------------------------
# Init Firebase
# ---------------------------------------------------------------------------

def init_firebase():
    cred_path = os.environ.get("FIREBASE_CREDENTIALS")
    bucket_name = os.environ.get("FIREBASE_BUCKET")

    if not cred_path:
        print("Error: FIREBASE_CREDENTIALS env var not set.", file=sys.stderr)
        print("  export FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json", file=sys.stderr)
        sys.exit(1)
    if not bucket_name:
        print("Error: FIREBASE_BUCKET env var not set.", file=sys.stderr)
        print("  export FIREBASE_BUCKET=your-project-id.appspot.com", file=sys.stderr)
        sys.exit(1)

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
    return storage.bucket()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def public_url(bucket_name: str, blob_name: str) -> str:
    """Return the public media URL for a Firebase Storage blob."""
    encoded = blob_name.replace("/", "%2F")
    return (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}"
        f"/o/{encoded}?alt=media"
    )


def load_urls() -> dict[str, str]:
    if URLS_FILE.exists():
        return json.loads(URLS_FILE.read_text(encoding="utf-8"))
    return {}


def save_urls(urls: dict[str, str]) -> None:
    URLS_FILE.write_text(
        json.dumps(urls, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    WEBP_DIR.mkdir(parents=True, exist_ok=True)

    png_files = sorted(IMAGE_DIR.glob("*.png"), key=lambda p: int(p.stem))
    if not png_files:
        print(f"No PNG files found in {IMAGE_DIR}. Run generate_images_v2.py first.")
        sys.exit(0)

    bucket = init_firebase()
    urls = load_urls()

    total = len(png_files)
    skipped = 0
    uploaded = 0
    failed: list[str] = []

    for png_path in png_files:
        idx = png_path.stem  # e.g. "1", "5", "207"

        if idx in urls:
            skipped += 1
            continue

        webp_path = WEBP_DIR / f"{idx}.webp"

        # -- Convert PNG → WebP --
        try:
            with Image.open(png_path) as img:
                img.save(webp_path, format="WEBP", quality=WEBP_QUALITY)
        except Exception as exc:
            print(f"  [SKIP] {idx}: conversion failed — {exc}")
            failed.append(idx)
            continue

        # -- Upload WebP to Firebase Storage --
        blob_name = f"{STORAGE_PREFIX}/{idx}.webp"
        try:
            blob = bucket.blob(blob_name)
            blob.upload_from_filename(str(webp_path), content_type="image/webp")
            blob.make_public()

            url = public_url(bucket.name, blob_name)
            urls[idx] = url
            save_urls(urls)  # checkpoint after each successful upload
            uploaded += 1
            print(f"  [{uploaded:>3}/{total}] Uploaded {idx}.webp")
        except Exception as exc:
            print(f"  [FAIL] {idx}: upload failed — {exc}")
            failed.append(idx)

    print(
        f"\nDone. {uploaded} uploaded, {skipped} skipped (already done), "
        f"{len(failed)} failed."
    )
    if failed:
        print(f"Failed indices: {', '.join(failed)}")
    print(f"URLs written to {URLS_FILE}")


if __name__ == "__main__":
    main()
