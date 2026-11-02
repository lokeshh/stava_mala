# -*- coding: utf-8 -*-
"""
Main Builder Script for Stavacintamani Dataset.
Parses stava_cinta.txt, formats with Sharada separator (𑇈) instead of spaces,
validates all 121 verses, and generates JSON and JS files.
"""

import os
import re
import json

from data_v1_30 import VERSES_1_TO_30
from data_v31_60 import VERSES_31_TO_60
from data_v61_90 import VERSES_61_TO_90
from data_v91_121 import VERSES_91_TO_121

# Combine all verse definitions
ALL_VERSE_DATA = {}
ALL_VERSE_DATA.update(VERSES_1_TO_30)
ALL_VERSE_DATA.update(VERSES_31_TO_60)
ALL_VERSE_DATA.update(VERSES_61_TO_90)
ALL_VERSE_DATA.update(VERSES_91_TO_121)

print(f"Total verse metadata entries loaded: {len(ALL_VERSE_DATA)}")

def clean_sandhi_markers(s):
    # Remove internal digits ०७८९ inside words (e.g. शिवाये७ति -> शिवायेति)
    return re.sub(r'(?<=[\u0900-\u097F])([०७८९])(?=[\u0900-\u097F])', '', s)

def to_sharada_sep(text):
    """
    Replaces all spaces in Devanagari text with 𑇈 (Sharada separator).
    Ensures no trailing/leading 𑇈, and no 𑇈 immediately before । or ॥.
    """
    if not text:
        return ""
    # Normalize danda punctuation
    t = re.sub(r'[ \t\r\f\v𑇈]*([।॥])', r'\1', text)
    # Replace any spaces or existing 𑇈 with a single 𑇈
    t = re.sub(r'[ \t\r\f\v𑇈]+', '𑇈', t)
    # Ensure no 𑇈 immediately before । or ॥
    t = re.sub(r'𑇈([।॥])', r'\1', t)
    return t.strip('𑇈')

def format_sloka_sharada(vbody, verse_id_dev):
    lines = [l.strip() for l in vbody.splitlines() if l.strip()]
    res = []
    for idx, l in enumerate(lines):
        c = clean_sandhi_markers(l)
        c = re.sub(r'[ \t\r\f\v𑇈]+', '𑇈', c)
        c = re.sub(r'𑇈([।॥])', r'\1', c)
        if idx == 0:
            c = c.rstrip('।') + '।'
        else:
            c = c.rstrip('।॥') + f'॥{verse_id_dev}॥'
        res.append(c)
    return '\n'.join(res)

def build():
    workspace_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_file = os.path.join(workspace_dir, "stava_cinta.txt")
    
    with open(input_file, "r", encoding="utf-8") as f:
        raw_text = f.read()

    raw_entries = re.split(r'॥([०-९]+)॥', raw_text)
    raw_verses = []
    for i in range(1, len(raw_entries), 2):
        tag = raw_entries[i]
        vbody = raw_entries[i-1].strip()
        raw_verses.append((tag, vbody))

    print(f"Total raw verses extracted from stava_cinta.txt: {len(raw_verses)}")
    assert len(raw_verses) == 121, f"Expected 121 verses, got {len(raw_verses)}"

    dev_nums = ["०","१","२","३","४","५","६","७","८","९"]
    def to_devanagari_num(n):
        return "".join(dev_nums[int(d)] for d in str(n))

    processed_verses = []

    for idx, (tag, vbody) in enumerate(raw_verses):
        verse_id = idx + 1
        dev_num = to_devanagari_num(verse_id)
        
        sloka_text = format_sloka_sharada(vbody, dev_num)

        meta = ALL_VERSE_DATA.get(verse_id)
        if not meta:
            raise ValueError(f"Missing metadata for verse {verse_id}!")

        # Format samasas with 𑇈
        formatted_samasas = []
        for s in meta.get("samasa", []):
            formatted_samasas.append({
                "compound": to_sharada_sep(s.get("compound", "")),
                "vigraha": to_sharada_sep(s.get("vigraha", "")),
                "type": s.get("type", "")
            })

        # Format word meanings with 𑇈 for the Sanskrit word
        formatted_meanings = []
        for m in meta.get("word_meanings", []):
            formatted_meanings.append({
                "word": to_sharada_sep(m.get("word", "")),
                "meaning_hi": m.get("meaning_hi", ""),
                "meaning_en": m.get("meaning_en", "")
            })

        entry = {
            "id": verse_id,
            "order": verse_id,
            "number": dev_num,
            "tag": tag,
            "ms_tag": f"॥{tag}॥",
            "sloka": sloka_text,
            "raw": vbody,
            "meter": meta.get("meter", "अनुष्टुप्"),
            "padaccheda": to_sharada_sep(meta["padaccheda"]),
            "anvaya": to_sharada_sep(meta["anvaya"]),
            "translation_hi": meta["translation_hi"],
            "translation_en": meta["translation_en"],
            "samasa": formatted_samasas,
            "word_meanings": formatted_meanings,
            "notes": meta.get("notes", "")
        }
        processed_verses.append(entry)

    dataset = {
        "id": "stava_cintamani",
        "title": "स्तवचिन्तामणिः",
        "transliteration": "Stavacintāmaṇiḥ",
        "author": "भट्टनारायण",
        "author_en": "Bhaṭṭa Nārāyaṇa",
        "tradition": "काश्मीर𑇈शैवदर्शनम्𑇈(त्रिक𑇈दर्शनम्)",
        "tradition_en": "Kashmir Shaivism (Trika)",
        "commentator": "आचार्य𑇈क्षेमराज𑇈(विवृति)",
        "commentator_en": "Ācārya Kṣemarāja (Vivṛti)",
        "total_verses": len(processed_verses),
        "source": "KSTS No. X / stava_cinta.txt",
        "description": "काश्मीर के महान शैवाचार्य भट्टनारायण द्वारा प्रणीत अनुपम भक्ति एवं अद्वैत दर्शन ग्रन्थ। इसमें १०वीं शताब्दी में रचित १२१ श्लोकों में परावाक्, स्वातन्त्र्य, विमर्श तथा शिवभक्ति रस का अद्भुत समन्वय है।",
        "description_en": "Composed by Bhaṭṭa Nārāyaṇa in 10th-century Kashmir with an illustrious commentary (Vivṛti) by Kṣemarāja, Stavacintāmaṇi ('The Wish-Fulfilling Gem of Praise') is a monumental 121-verse hymnal masterpiece blending ecstatic devotion with non-dual Trika Shaiva philosophy.",
        "verses": processed_verses
    }

    # Save JSON
    json_path = os.path.join(workspace_dir, "data", "texts", "stava_cintamani.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    print(f"Generated JSON at: {json_path}")

    # Save JS
    js_path = os.path.join(workspace_dir, "data", "texts", "stava_cintamani.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("/* Generated Stavacintamani Dataset with Sharada Separator (𑇈) */\n")
        f.write("window.TRIKA_TEXTS = window.TRIKA_TEXTS || {};\n\n")
        f.write("window.TRIKA_TEXTS['stava_cintamani'] = ")
        json.dump(dataset, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Generated JS at: {js_path}")

    # Generate Registry
    registry = {
        "texts": [
            {
                "id": "stava_cintamani",
                "title": "स्तवचिन्तामणिः",
                "transliteration": "Stavacintāmaṇiḥ",
                "author": "भट्टनारायण",
                "author_en": "Bhaṭṭa Nārāyaṇa",
                "verses_count": 121,
                "status": "ready",
                "badge": "पूर्ण𑇈(१२१𑇈श्लोक)",
                "dataFile": "data/texts/stava_cintamani.js",
                "description": "परावाक्, स्वातन्त्र्य और विमर्शात्मक शिवभक्ति का १०वीं शताब्दी का अनुपम महास्तोत्र।"
            },
            {
                "id": "laghu_stava",
                "title": "लघुस्तवः",
                "transliteration": "Laghustavaḥ",
                "author": "धर्माचार्य",
                "author_en": "Dharmācārya",
                "verses_count": 21,
                "status": "coming_soon",
                "badge": "शीघ्र𑇈आगमिष्यति",
                "dataFile": "data/texts/laghu_stava.js",
                "description": "कुण्डलिनी, पराशक्ति तथा शाक्त-त्रिक विमर्श का प्रसिद्ध स्तोत्ररत्न।"
            },
            {
                "id": "shiva_stotravalli",
                "title": "शिवस्तोत्रावली",
                "transliteration": "Śivastotrāvalī",
                "author": "उत्पलदेवाचार्य",
                "author_en": "Utpaladevācārya",
                "verses_count": 20,
                "status": "coming_soon",
                "badge": "शीघ्र𑇈आगमिष्यति",
                "dataFile": "data/texts/shiva_stotravalli.js",
                "description": "परम अद्वैत भक्तिरस से आप्लावित उत्पलदेव की अमर स्तुतियाँ।"
            },
            {
                "id": "shiva_mahimna",
                "title": "शिवमहिम्नस्तोत्रम्",
                "transliteration": "Śivamahimnastotram",
                "author": "पुष्पदन्त",
                "author_en": "Puṣpadanta",
                "verses_count": 43,
                "status": "coming_soon",
                "badge": "शीघ्र𑇈आगमिष्यति",
                "dataFile": "data/texts/shiva_mahimna.js",
                "description": "भगवान शिव के असीम माहात्म्य का विश्वविख्यात स्तोत्र।"
            }
        ]
    }

    registry_path = os.path.join(workspace_dir, "data", "texts_registry.js")
    with open(registry_path, "w", encoding="utf-8") as f:
        f.write("/* Trika Stava Registry */\n")
        f.write("window.TRIKA_REGISTRY = ")
        json.dump(registry, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Generated Registry at: {registry_path}")

    print("\nDataset generation completed successfully with 𑇈 separator!")

if __name__ == "__main__":
    build()
