"""
update_question_bank.py
自動從 CAA 官方網站爬取最新 PDF，解析題目，並產出四個版本的 JSON。

執行方式：uv run update_question_bank.py
"""
import json
import os
import re

import pdfplumber
import requests
from bs4 import BeautifulSoup

# ==========================================
# 常數設定
# ==========================================

CAA_URL = "https://www.caa.gov.tw/Article.aspx?a=3833&lang=1"
CAA_BASE = "https://www.caa.gov.tw"
OUTPUT_DIR = "public/data"

BANK_CONFIGS = [
    {
        "id": "general",
        "label": "普通操作證",
        "match": "普通操作證學科測驗題庫",
        "exclude": [],
        "require": [],
    },
    {
        "id": "professional",
        "label": "專業操作證",
        "match": "專業操作證學科測驗題庫",
        "exclude": ["屆期", "簡易"],
        "require": [],
    },
    {
        "id": "renewal",
        "label": "屆期換證",
        "match": "屆期換證學科測驗題庫",
        "exclude": ["簡易"],
        "require": [],
    },
    {
        "id": "renewal_basic",
        "label": "屆期換證（簡易）",
        "match": "屆期換證學科測驗題庫",
        "exclude": [],
        "require": ["簡易"],
    },
]


# ==========================================
# 函式一：爬取 PDF 下載連結
# ==========================================

def scrape_pdf_links(url: str) -> dict[str, str]:
    """
    從 CAA 官方頁面解析 PDF 下載連結。
    回傳 {config_id: 完整下載URL}
    """
    print(f"正在從 {url} 爬取 PDF 連結...")
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    response.encoding = "utf-8"

    soup = BeautifulSoup(response.text, "html.parser")

    # 找出所有含 FileAtt.ashx 的 <a> 連結
    anchors = [a for a in soup.find_all("a", href=True) if "FileAtt.ashx" in a["href"]]

    result: dict[str, str] = {}

    for config in BANK_CONFIGS:
        for anchor in anchors:
            link_text = anchor.get_text(strip=True)

            # 必須包含 match 關鍵字
            if config["match"] not in link_text:
                continue

            # 必須包含所有 require 關鍵字
            if any(kw not in link_text for kw in config["require"]):
                continue

            # 不能包含任何 exclude 關鍵字
            if any(kw in link_text for kw in config["exclude"]):
                continue

            href = anchor["href"]
            if href.startswith("http"):
                full_url = href
            else:
                full_url = CAA_BASE + href

            result[config["id"]] = full_url
            print(f"  [{config['label']}] 找到連結：{link_text}")
            break

        if config["id"] not in result:
            print(f"  警告：找不到 [{config['label']}] 的 PDF 連結")

    return result


# ==========================================
# 函式二：下載 PDF（已存在且大小相符則跳過）
# ==========================================

def download_pdf(url: str, dest_path: str) -> None:
    """
    下載 PDF 到指定路徑。
    若檔案已存在且 Content-Length 相符則跳過下載。
    """
    # 先取得 Content-Length
    head = requests.head(url, timeout=30, allow_redirects=True)
    remote_size = int(head.headers.get("Content-Length", -1))

    if os.path.exists(dest_path):
        local_size = os.path.getsize(dest_path)
        if remote_size != -1 and local_size == remote_size:
            print(f"  跳過下載（已是最新）：{dest_path}")
            return

    print(f"  正在下載：{dest_path} ...")
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            downloaded = 0
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
            print(f"  下載完成：{downloaded:,} bytes")


# ==========================================
# 函式三：解析 PDF 為題目列表
# ==========================================

def parse_pdf_to_questions(pdf_path: str) -> list[dict]:
    """
    使用 pdfplumber 解析 PDF 題庫，回傳原始題目列表。
    格式同 question_bank.json：[{id, question, options, answer, chapter}, ...]
    """
    print(f"  正在解析 PDF：{pdf_path} ...")

    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=2)
            if text:
                full_text += text + "\n"

    # 切分「題目區」與「答案區」
    split_match = re.search(r"(第[一二三四五六七八九十]+章\s*.*答案)", full_text)

    if split_match:
        split_index = split_match.start()
        print(f"  偵測到答案區起始點：{split_match.group(1)}")
    else:
        print("  警告：無法自動偵測明確的答案區標題，嘗試尋找最後的「答案」關鍵字區塊...")
        split_index = full_text.rfind("答案")
        if split_index == -1:
            split_index = len(full_text)

    questions_text = full_text[:split_index]
    answers_text = full_text[split_index:]

    # 依章節解析題目
    chapter_pattern = re.compile(r"(第[一二三四五六七八九十]+章\s+[^\n]+)")
    chapter_matches = list(chapter_pattern.finditer(questions_text))

    if not chapter_matches:
        chapter_segments = [("未知章節", questions_text)]
    else:
        chapter_segments = []
        for i, match in enumerate(chapter_matches):
            chapter_title = match.group(1).strip()
            start_idx = match.end()
            end_idx = chapter_matches[i + 1].start() if i + 1 < len(chapter_matches) else len(questions_text)
            chapter_segments.append((chapter_title, questions_text[start_idx:end_idx]))

    print(f"  共識別出 {len(chapter_segments)} 個章節段落。")

    questions_data = []

    q_pattern = re.compile(
        r"(\d+)\.\s*(.*?)\s*\(A\)(.*?)\s*\(B\)(.*?)\s*\(C\)(.*?)\s*\(D\)(.*?)(?=\n\n\d+\.|\Z)",
        re.DOTALL,
    )

    for chap_title, seg_text in chapter_segments:
        clean_seg_text = re.sub(r"\n(\d+\.)", r"\n\n\1", seg_text)
        matches = q_pattern.findall(clean_seg_text)

        for match in matches:
            q_id, q_content, opt_a, opt_b, opt_c, opt_d = match
            q_item = {
                "id": int(q_id),
                "question": q_content.strip().replace("\n", ""),
                "options": {
                    "A": opt_a.strip().replace("\n", ""),
                    "B": opt_b.strip().replace("\n", ""),
                    "C": opt_c.strip().replace("\n", ""),
                    "D": opt_d.strip().replace("\n", ""),
                },
                "answer": None,
                "chapter": chap_title,
            }
            questions_data.append(q_item)

    print(f"  已解析 {len(questions_data)} 道題目。")

    # 解析答案
    clean_a_text = answers_text.replace("\n", " ")
    ans_matches = re.findall(r"(\d+)[\.\s,\"\'\\]+([A-D])", clean_a_text)
    all_answers_list = [x[1] for x in ans_matches]

    print(f"  已解析 {len(all_answers_list)} 個答案。")

    # 合併答案
    if abs(len(questions_data) - len(all_answers_list)) > 20:
        print("  注意：題目數量與答案數量差異較大，嘗試使用 ID 對應模式...")
        ids = [q["id"] for q in questions_data]
        is_continuous = all(ids[i] <= ids[i + 1] for i in range(len(ids) - 1))

        if is_continuous and ans_matches:
            temp_map = {int(q_num): q_ans for q_num, q_ans in ans_matches}
            for q in questions_data:
                q["answer"] = temp_map.get(q["id"], "未找到")
            return questions_data

    for i, q in enumerate(questions_data):
        q["answer"] = all_answers_list[i] if i < len(all_answers_list) else "未找到"

    return questions_data


# ==========================================
# 函式四：計算白名單並標註題目
# ==========================================

def process_whitelist(questions: list[dict]) -> dict:
    """
    計算嚴格白名單（correct_set - incorrect_set），逐題標註 can_memorize_directly。
    回傳 {"questions": [...], "answer_option_whitelist": [...]}
    """
    correct_set: set[str] = set()
    incorrect_set: set[str] = set()

    for question in questions:
        ans_key = question.get("answer")
        options = question.get("options", {})

        for key, opt_text in options.items():
            clean_text = opt_text.strip()
            if key == ans_key:
                correct_set.add(clean_text)
            else:
                incorrect_set.add(clean_text)

    final_whitelist_set = correct_set - incorrect_set
    answer_option_whitelist = sorted(final_whitelist_set)

    count_memorizable = 0
    for question in questions:
        ans_key = question.get("answer")
        options = question.get("options", {})
        can_memorize = False

        if ans_key and ans_key in options:
            correct_text = options[ans_key].strip()
            if correct_text in final_whitelist_set:
                can_memorize = True

        question["can_memorize_directly"] = can_memorize
        if can_memorize:
            count_memorizable += 1

    return {
        "questions": questions,
        "answer_option_whitelist": answer_option_whitelist,
    }


# ==========================================
# 主程式
# ==========================================

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs("ref", exist_ok=True)

    print("=" * 50)
    print("UAV 題庫自動更新腳本")
    print("=" * 50)

    # 爬取 PDF 連結
    links = scrape_pdf_links(CAA_URL)

    if not links:
        print("錯誤：未能取得任何 PDF 連結，請檢查網路或網站結構是否有變動。")
        return

    print()

    # 逐版本處理
    for config in BANK_CONFIGS:
        config_id = config["id"]
        label = config["label"]

        print(f"[{label}]")

        if config_id not in links:
            print(f"  跳過：找不到對應的 PDF 連結\n")
            continue

        pdf_path = f"ref/{label}.pdf"
        download_pdf(links[config_id], pdf_path)

        if not os.path.exists(pdf_path):
            print(f"  跳過：PDF 檔案不存在 {pdf_path}\n")
            continue

        questions = parse_pdf_to_questions(pdf_path)
        output = process_whitelist(questions)

        output_path = f"{OUTPUT_DIR}/{config_id}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(
            f"  完成：{len(questions)} 題，白名單 {len(output['answer_option_whitelist'])} 項"
        )
        print(f"  輸出至：{output_path}\n")

    print("=" * 50)
    print("所有版本更新完成！")
    print("=" * 50)


if __name__ == "__main__":
    main()
