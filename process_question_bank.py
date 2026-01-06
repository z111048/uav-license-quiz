import json
import os

def process_question_bank(input_filename, output_filename):
    # 檢查輸入檔案是否存在
    if not os.path.exists(input_filename):
        print(f"錯誤: 找不到檔案 '{input_filename}'")
        return

    try:
        # 讀取 JSON 檔案
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, list):
            print("錯誤: 輸入資料格式不符，預期為列表 List [...]")
            return

        # --- 步驟 1: 建立嚴格白名單 (Strict Whitelist) ---
        # 規則：
        # 1. 曾經是正確答案
        # 2. 且「從未」在其他題目中變成錯誤選項 (誘答)
        
        correct_set = set()   # 曾是正確答案的集合
        incorrect_set = set() # 曾是錯誤選項的集合

        for question in data:
            ans_key = question.get('answer')      # 例如 "A"
            options = question.get('options', {}) # 選項 Dict
            
            # 遍歷該題所有選項
            for key, opt_text in options.items():
                clean_text = opt_text.strip()
                
                if key == ans_key:
                    # 這是正確答案
                    correct_set.add(clean_text)
                else:
                    # 這是錯誤選項
                    incorrect_set.add(clean_text)

        # 嚴格白名單 = 曾經正確 - 曾經錯誤
        # 也就是說：只要這個選項出現在題目裡，它就一定是正確答案，絕對不會是干擾項。
        final_whitelist_set = correct_set - incorrect_set
        
        # 將 Set 轉為 List 供輸出用
        answer_option_whitelist = sorted(list(final_whitelist_set))

        # --- 步驟 2: 逐題標註 ---
        count_memorizable = 0

        for question in data:
            ans_key = question.get('answer')
            options = question.get('options', {})
            
            can_memorize = False
            
            if ans_key and ans_key in options:
                correct_text = options[ans_key].strip()
                
                # 只要正確答案在「嚴格白名單」內，就代表此題可無腦背
                # 因為根據定義，此清單內的文字絕不會是錯誤選項，所以不用擔心選錯。
                if correct_text in final_whitelist_set:
                    can_memorize = True
            
            # 新增欄位
            question['can_memorize_directly'] = can_memorize
            
            if can_memorize:
                count_memorizable += 1

        # --- 步驟 3: 輸出結果 ---
        output_data = {
            "answer_option_whitelist": answer_option_whitelist,
            "questions": data
        }

        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)

        print("-" * 30)
        print(f"處理完成！")
        print(f"總題數: {len(data)}")
        print(f"白名單答案總數: {len(answer_option_whitelist)}")
        print(f"可「無腦秒選」的題目數: {count_memorizable}")
        print(f"需「看題目判斷」的題目數: {len(data) - count_memorizable}")
        print("-" * 30)
        print(f"新檔案已儲存為: {output_filename}")

    except Exception as e:
        print(f"發生未預期的錯誤: {e}")

if __name__ == "__main__":
    # 請確保資料夾中有 question_bank.json
    process_question_bank('question_bank.json', 'process_question_bank.json')