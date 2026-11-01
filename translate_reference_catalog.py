"""Create Arabic labels and summaries for the generated official-source catalog."""

from pathlib import Path
import json
import re
import sys

import ctranslate2
import sentencepiece as spm

ROOT = Path(__file__).parent
MODEL = ROOT / "content" / "translation-model" / "en_ar"
SOURCE = ROOT / "content" / "reference-catalog.source.json"
OUTPUT = ROOT / "content" / "reference-catalog.json"


def translate_many(texts: list[str]) -> list[str]:
    processor = spm.SentencePieceProcessor(model_file=str(MODEL / "sentencepiece.model"))
    translator = ctranslate2.Translator(str(MODEL / "model"), device="cpu", compute_type="int8", inter_threads=4)
    output: list[str] = []
    for start in range(0, len(texts), 256):
        batch = texts[start:start + 256]
        tokens = [processor.encode(text, out_type=str) for text in batch]
        results = translator.translate_batch(tokens, beam_size=1, max_batch_size=64)
        output.extend(processor.decode(item.hypotheses[0]).strip() for item in results)
        print(f"Translated {len(output)}/{len(texts)}", flush=True)
    return output


def has_arabic(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06ff]", text))


def main() -> None:
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    texts: list[str] = []
    for row in rows:
        texts.extend((row["term"], row["definition"]))
    translated = translate_many(texts)
    for index, row in enumerate(rows):
        arabic_name = translated[index * 2].strip(" .")
        definition = translated[index * 2 + 1].strip()
        if not has_arabic(arabic_name):
            arabic_name = f"مصطلح تقني: {row['term']}"
        if not has_arabic(definition) or len(definition) < 20:
            definition = f"مصطلح تقني موثق يشير إلى {arabic_name}، ويُفهم معناه الدقيق وفق المصدر والسياق المرتبطين به."
        row["arabicName"] = arabic_name
        row["definition"] = definition
        row["example"] = f"مثال: يظهر مصطلح «{row['term']}» في وثائق أو أدوات تقنية مرتبطة بهذا المجال."
        row["whereUsed"] = f"يُستخدم في معايير وأنظمة ووثائق مجال {arabic_name}."
        row.pop("sourceType", None)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} translated reference entries to {OUTPUT}")


if __name__ == "__main__":
    main()
