from __future__ import annotations

import os
import re
import sqlite3
import threading
from functools import lru_cache

import torch
from flask import Flask, jsonify, request
from transformers import MarianMTModel, MarianTokenizer


MODEL_NAME = os.environ.get("TRANSLATION_MODEL", "Helsinki-NLP/opus-mt-en-zh")
DICTIONARY_PATH = os.environ.get(
    "DICTIONARY_PATH", "/home/torrey/.local/share/cijian-vocab/ecdict.sqlite"
)
WORD_PATTERN = re.compile(r"^[A-Za-z][A-Za-z' -]{0,79}$")

app = Flask(__name__)
model_lock = threading.Lock()
tokenizer: MarianTokenizer | None = None
model: MarianMTModel | None = None


def load_model() -> tuple[MarianTokenizer, MarianMTModel]:
    global tokenizer, model
    if tokenizer is None or model is None:
        torch.set_num_threads(2)
        tokenizer = MarianTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
        model = MarianMTModel.from_pretrained(MODEL_NAME, local_files_only=True)
        model.eval()
    return tokenizer, model


def concise_meaning(translation: str) -> str:
    senses: list[str] = []
    for fragment in re.split(r"(?:\\n|[；;,，\n])+", translation):
        cleaned = re.sub(r"^(?:[a-z]+\.|\[[^]]+\])\s*", "", fragment.strip(), flags=re.I)
        cleaned = re.sub(r"\s+", "", cleaned).strip("，。；; ")
        if re.search(r"[\u3400-\u9fff]", cleaned) and cleaned not in senses:
            senses.append(cleaned)
        if len(senses) == 3:
            break
    return "；".join(senses)[:160]


def dictionary_meaning(word: str) -> str:
    try:
        with sqlite3.connect(f"file:{DICTIONARY_PATH}?mode=ro", uri=True) as connection:
            row = connection.execute(
                "SELECT translation FROM entries WHERE word = ?", (word,)
            ).fetchone()
    except sqlite3.Error:
        return ""
    return concise_meaning(row[0]) if row else ""


@lru_cache(maxsize=512)
def translate_word(word: str) -> str:
    result = dictionary_meaning(word)
    if result:
        return result
    current_tokenizer, current_model = load_model()
    encoded = current_tokenizer([word], return_tensors="pt", padding=True)
    with model_lock, torch.inference_mode():
        generated = current_model.generate(
            **encoded, max_new_tokens=24, num_beams=3, num_return_sequences=1,
            early_stopping=True
        )
    translated = current_tokenizer.batch_decode(generated, skip_special_tokens=True)[0]
    repeated = re.fullmatch(r"(.{2,}?)\1+", translated.strip())
    cleaned = repeated.group(1) if repeated else translated.strip().strip("，。；; ")
    return cleaned if re.search(r"[\u3400-\u9fff]", cleaned) else ""


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.get("/translate")
def translate():
    word = request.args.get("word", "").strip()
    if not WORD_PATTERN.fullmatch(word):
        return jsonify(error="请输入有效的英文单词"), 400
    try:
        meaning = translate_word(word.lower())
    except Exception:
        app.logger.exception("Translation failed")
        return jsonify(error="暂时无法生成释义"), 503
    if not meaning:
        return jsonify(error="没有找到合适的释义"), 404
    return jsonify(word=word, meaning=meaning)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "8092")), threaded=True)
