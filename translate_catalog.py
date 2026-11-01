"""Translate newline-delimited English text with the bundled Argos CTranslate2 model."""

from pathlib import Path
import json
import sys

import ctranslate2
import sentencepiece as spm


def main() -> None:
    model_dir = Path(__file__).parent / "content" / "translation-model" / "en_ar"
    source = spm.SentencePieceProcessor(model_file=str(model_dir / "sentencepiece.model"))
    target = spm.SentencePieceProcessor(model_file=str(model_dir / "sentencepiece.model"))
    translator = ctranslate2.Translator(str(model_dir / "model"), device="cpu", compute_type="int8")
    texts = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    encoded = [source.encode(text, out_type=str) for text in texts]
    results = translator.translate_batch(encoded, beam_size=1, max_batch_size=64)
    translations = [target.decode(result.hypotheses[0]) for result in results]
    Path(sys.argv[2]).write_text(json.dumps(translations, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
