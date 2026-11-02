#!/usr/bin/env python3
"""
Parser and dataset generator for Stavacintāmaṇi with Kṣemarāja's Vivṛti
Extracted strictly from Sanskrit Wikisource (stava_cinta_vritti.txt).
"""

import json
import re

def dev_to_int(s):
    d = {'०':0, '१':1, '२':2, '३':3, '४':4, '५':5, '६':6, '७':7, '८':8, '९':9}
    return int(''.join(str(d[c]) for c in s if c in d))

def int_to_dev(n):
    d = '०१२३४५६७८९'
    return ''.join(d[int(c)] for c in str(n))

def clean_commentary_text(text):
    if not text:
        return ''
    # Strip page annotations like (पगे १५३)
    text = re.sub(r'\(पगे\s+[०-९a-zA-Z\s]+\)', '', text)
    # Normalize multiple whitespace characters within lines but preserve paragraphs
    lines = [l.strip() for l in text.split('\n')]
    # Re-group paragraphs
    paragraphs = []
    current_p = []
    for line in lines:
        if not line:
            if current_p:
                paragraphs.append(' '.join(current_p))
                current_p = []
        else:
            current_p.append(line)
    if current_p:
        paragraphs.append(' '.join(current_p))
    return '\n\n'.join(paragraphs)

def extract_sloka_and_av(chunk):
    lines = [l.strip() for l in chunk.strip().split('\n') if l.strip()]
    if not lines:
        return '', ''
    danda_idx = -1
    for i in range(len(lines)-1, -1, -1):
        if lines[i].endswith('।') and not lines[i].endswith('॥'):
            danda_idx = i
            break
    if danda_idx != -1:
        sloka_start = max(0, danda_idx - 1)
        av = ' '.join(lines[:sloka_start]).strip()
        cleaned_sl_lines = [re.sub(r'[ \t]+([—–\-])', r'\1', l) for l in lines[sloka_start:]]
        sl = '\n'.join(cleaned_sl_lines).strip()
        return av, sl
    cleaned_lines = [re.sub(r'[ \t]+([—–\-])', r'\1', l) for l in lines]
    return '', '\n'.join(cleaned_lines).strip()

def build_dataset():
    # 1. Load stava_cinta_vritti.txt
    with open('stava_cinta_vritti.txt', 'r', encoding='utf-8') as f:
        full_text = f.read()

    # Strip page annotations
    clean_text = re.sub(r'\(पगे\s+[०-९a-zA-Z\s]+\)', '', full_text)

    # 2. Load existing anvayas
    with open('data/texts/stava_cintamani.js', 'r', encoding='utf-8') as f:
        js_text = f.read()
    prefix = "window.TRIKA_TEXTS['stava_cintamani'] = "
    idx = js_text.find(prefix)
    content = js_text[idx + len(prefix):].strip()
    if content.endswith(';'): content = content[:-1].strip()
    old_data = json.loads(content)
    old_verses = {v['order']: v['anvaya'].replace('𑇈', ' ') for v in old_data.get('verses', [])}

    # 3. Extract Intro Verses by Kṣemarāja
    intro4_marker = 'तच्चर्वणादिह बुधा विबुधा भवन्तु ॥ ४ ॥'
    idx_intro_end = clean_text.find(intro4_marker) + len(intro4_marker)
    intro_section = clean_text[:idx_intro_end].strip()

    # 4. Extract Stotra Body
    end_marker = 'आलिङ्गति नित्यमेव भक्तिभाज इति शिवम् ॥ १२० ॥'
    idx_end = clean_text.find(end_marker) + len(end_marker)
    body = clean_text[idx_intro_end:idx_end].strip()

    # 5. Extract Concluding Section and Appendix II (मूलश्लोकानां संक्षेपेण विषयार्थसंग्रहः)
    concluding_section = clean_text[idx_end:].strip()

    # Parse Appendix II (प्रतिश्लोकं प्रतिपादितार्थसंक्षेपः / विषयार्थसंग्रहः)
    idx_app = full_text.find("मूलश्लोकानां संक्षेपेण विषयार्थसंग्रहः")
    appendix_map = {}
    if idx_app != -1:
        appendix_text = full_text[idx_app:]
        appendix_text = re.sub(r'\(पगे\s+[०-९a-zA-Z\s.,]+\)', '', appendix_text)
        appendix_text = re.split(r'इति\s+स्त्वचिन्तामणौ', appendix_text)[0]
        app_pattern = r'(?:^|\n)\s*([०-९\d]+(?:\s*\([०-९\d]+\)|\s*-\s*[०-९\d]+)?)\s+'
        parts = re.split(app_pattern, appendix_text)
        for i in range(1, len(parts), 2):
            k = parts[i].strip()
            k_norm = re.sub(r'\s+', '', k)
            v = parts[i+1].strip() if i+1 < len(parts) else ""
            v = re.sub(r'\s+', ' ', v)
            v = re.sub(r'-\s+', '', v)
            appendix_map[k_norm] = v.strip()
    print(f'Total Appendix II entries parsed: {len(appendix_map)}')

    # Purports for verses 71-84 (where pages 148-149 were missing in printed scan)
    missing_purports = {
        '७१': 'कर्मकाण्डज्ञानकाण्डयोः सेश्वरत्वसमर्थनपूर्वकं संसारभ्रान्तिसंभेदकारिणे ज्ञानानन्दवपुषे परमेश्वराय नमस्कारः ।',
        '७२': 'दुरत्ययमायावरणभङ्गेन स्वसंविन्मयमूर्तेः साक्षात्कारप्रार्थनम् ।',
        '७३': 'सर्वभावानां परमेश्वरैकपारमार्थ्यनिश्चयात् परवैराग्यप्राप्तिकथनम् ।',
        '७४': 'परमेश्वरस्य सर्वप्रभुत्वेन स्वयमुपक्रान्तस्य समावेशकार्यस्य पूर्णताकरणप्रार्थनम् ।',
        '७५': 'सर्वज्ञपरमेश्वरस्य सर्वार्थसिद्धिप्रदत्वेन शरणताभ्यर्थनम् ।',
        '७६': 'अन्यैरविचार्यस्यापि सूक्ष्मपारमेश्वरतत्त्वस्य भगवदेकाग्रचित्तेन विचारणीयताकथनम् ।',
        '७७': 'परमेश्वराश्रयेणैव सर्वभावावभासनात् विश्वस्य तन्मयताया दृढनिश्चयः ।',
        '७८': 'परमेश्वरैकनिष्ठचेतसां संसारहेतुभूतसमस्तदोषनिवृत्त्याश्वासनम् ।',
        '७९': 'पृथिव्यादिमूर्तिषु सर्वमयपरमेश्वरस्वरूपसमावेशप्रार्थनम् ।',
        '८०': 'सर्वत्र परमेश्वरसमावेशज्ञानवतां संसारमोक्षस्यावश्यंभाविताकथनम् ।',
        '८१': 'अन्तश्चित्तस्फुरितसमस्तभावानां भगवद्रूपत्वेन लोकोत्तरमहिमवर्णनम् ।',
        '८२': 'अपरिच्छेद्यभगवन्महिम्नोऽवबोधेनाप्यानन्दविकासवर्णनम् ।',
        '८३': 'अनुपममहिम्ने सर्वमयाय शिवाय सततप्रणामानुशासनम् ।',
        '८४': 'भगवत्प्रसादलब्धज्ञानस्यैव परमानन्दहेतुत्वप्रतिपादनम् ।'
    }

    # Find all markers
    pattern = re.compile(r'[।॥]+\s*([०-९]+)\s*[।॥]+')
    markers = list(pattern.finditer(body))
    print(f'Total verse markers matched: {len(markers)}')

    verses = []

    for o in range(1, 122):
        if o <= 46:
            c_start = 0 if o == 1 else markers[2*(o-1) - 1].end()
            c_end = markers[2*(o-1)].start()
            v_start = markers[2*(o-1)].end()
            v_end = markers[2*(o-1)+1].start()
            dev_num = int_to_dev(o)
            num_display = dev_num
        elif o == 47:
            c_start = markers[91].end()
            c_end = markers[92].start()
            v_start = markers[92].end()
            v_end = markers[93].start()
            dev_num = '४७'
            num_display = '४७ (१)'
        elif o == 48:
            c_start = markers[93].end()
            c_end = markers[94].start()
            v_start = markers[94].end()
            v_end = markers[95].start()
            dev_num = '४७'
            num_display = '४७ (२)'
        elif o in [49, 50]:
            prev_m = 95 + 2*(o - 49)
            curr_m = 96 + 2*(o - 49)
            c_start = markers[prev_m].end()
            c_end = markers[curr_m].start()
            v_start = markers[curr_m].end()
            v_end = markers[curr_m+1].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif o == 51:
            c_start = markers[99].end()
            c_end = markers[100].start()
            between = body[markers[100].end():markers[101].start()]
            sp = between.find('यत एवं, तेन')
            v_start = markers[100].end()
            v_end = markers[100].end() + sp
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif o == 52:
            between = body[markers[100].end():markers[101].start()]
            sp = between.find('यत एवं, तेन')
            c_chunk = between[sp:]
            v_start = markers[101].end()
            v_end = markers[102].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif 53 <= o <= 117:
            prev_m = 101 + 2*(o - 52) - 1
            curr_m = 101 + 2*(o - 52)
            c_start = markers[prev_m].end()
            c_end = markers[curr_m].start()
            v_start = markers[curr_m].end()
            v_end = markers[curr_m+1].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif o == 118:
            c_start = markers[232].end()
            c_end = markers[233].start()
            v_start = markers[234].end()
            v_end = markers[235].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif o == 119:
            c_start = markers[233].end()
            c_end = markers[234].start()
            v_start = markers[234].end()
            v_end = markers[235].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif o == 120:
            c_start = markers[235].end()
            c_end = markers[236].start()
            v_start = markers[236].end()
            v_end = markers[237].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num
        elif o == 121:
            c_start = markers[237].end()
            c_end = markers[238].start()
            v_start = markers[238].end()
            v_end = markers[239].start()
            dev_num = int_to_dev(o - 1)
            num_display = dev_num

        if o != 52:
            c_chunk = body[c_start:c_end]
        v_chunk = body[v_start:v_end]

        av, sl = extract_sloka_and_av(c_chunk)
        viv = clean_commentary_text(v_chunk)

        # Append closing marker to sloka
        sl_with_marker = sl + f' ॥ {num_display} ॥'

        # Anvaya
        anvaya_text = old_verses.get(o, '')

        first_line = sl.split('\n')[0] if sl else ''

        # Map to Appendix II (मूलश्लोकानां संक्षेपेण विषयार्थसंग्रहः)
        num_norm = re.sub(r'\s+', '', num_display)
        if num_norm == '४७(१)':
            target_k = '४७'
        elif num_norm in ['११७', '११८']:
            target_k = '११७-१८'
        else:
            target_k = num_norm

        if target_k in appendix_map:
            sangraha_text = appendix_map[target_k]
        elif target_k in missing_purports:
            sangraha_text = missing_purports[target_k]
        else:
            sangraha_text = av

        verse_obj = {
            "id": o,
            "order": o,
            "number": num_display,
            "tag": num_display,
            "first_line": first_line,
            "vishayartha_sangraha": sangraha_text,
            "avataranika": av,
            "sloka": sl_with_marker,
            "anvaya": anvaya_text,
            "vivriti": viv
        }
        verses.append(verse_obj)

    dataset = {
        "id": "stava_cintamani",
        "title": "स्तवचिन्तामणिः",
        "transliteration": "Stavacintāmaṇiḥ",
        "author": "भट्टनारायण",
        "author_en": "Bhaṭṭa Nārāyaṇa",
        "tradition": "काश्मीर-शैवदर्शनम् (त्रिक-दर्शनम्)",
        "tradition_en": "Kashmir Shaivism (Trika)",
        "commentator": "आचार्य-क्षेमराज (विवृति)",
        "commentator_en": "Ācārya Kṣemarāja (Vivṛti)",
        "total_verses": len(verses),
        "source": "Sanskrit Wikisource / Kashmir Series of Texts and Studies (KSTS) No. X",
        "source_url": "https://sa.wikisource.org/wiki/%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A4%B5%E0%A4%9A%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A4%E0%A4%BE%E0%A4%AE%E0%A4%A3%E0%A4%BF%E0%A4%83_(%E0%A4%B5%E0%A5%8D%E0%A4%AF%E0%A4%BE%E0%A4%96%E0%A5%8D%E0%A4%AF%E0%A4%BE%E0%A4%B8%E0%A4%B9%E0%A4%BF%E0%A4%A4%E0%A4%83)",
        "description": "काश्मीर के महान शैवाचार्य भट्टनारायण द्वारा प्रणीत अनुपम भक्ति एवं अद्वैत दर्शन ग्रन्थ, आचार्य क्षेमराज कृत विशद 'विवृति' व्याख्या सहित।",
        "description_en": "Stavacintāmaṇi by Bhaṭṭa Nārāyaṇa with Kṣemarāja's Vivṛti commentary from Sanskrit Wikisource.",
        "mangala_intro": intro_section,
        "upasamhara_outro": concluding_section,
        "verses": verses
    }

    # Write JS file
    js_content = "/* Stavacintamani Dataset from Sanskrit Wikisource */\n"
    js_content += "window.TRIKA_TEXTS = window.TRIKA_TEXTS || {};\n\n"
    js_content += "window.TRIKA_TEXTS['stava_cintamani'] = " + json.dumps(dataset, ensure_ascii=False, indent=2) + ";\n"

    with open('data/texts/stava_cintamani.js', 'w', encoding='utf-8') as f:
        f.write(js_content)

    # Write JSON file
    with open('data/texts/stava_cintamani.json', 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    print(f'Successfully built dataset with {len(verses)} verses!')
    print(f'Written to data/texts/stava_cintamani.js and data/texts/stava_cintamani.json')

if __name__ == '__main__':
    build_dataset()
