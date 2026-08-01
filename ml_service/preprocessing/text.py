import os
import re
import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder


def _clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _get_stopwords(language: str) -> set:
    stopwords = set()
    try:
        import nltk
        try:
            from nltk.corpus import stopwords as nltk_sw
            stopwords = set(nltk_sw.words(
                "indonesian" if language == "indonesian" else "english"))
        except LookupError:
            nltk.download("stopwords", quiet=True)
            from nltk.corpus import stopwords as nltk_sw
            stopwords = set(nltk_sw.words(
                "indonesian" if language == "indonesian" else "english"))
    except Exception:
        pass
    return stopwords


def run_text_preprocessing(dataset_path: str, config: dict, output_path: str) -> dict:
    try:
        # { "0": "positif", "3": "negatif" }
        labels = config.get("labels", {})
        # { "2": "teks yang diedit" }
        edited_texts = config.get("edited_texts", {})
        remove_stopwords = config.get("remove_stopwords", True)
        language = config.get("language", "indonesian")
        max_features = config.get("max_features", 5000)

        if not labels:
            return {"status": "failed", "error": "Labels belum didefinisikan"}

        # Baca semua baris
        with open(dataset_path, "r", encoding="utf-8", errors="ignore") as f:
            all_lines = [l.rstrip("\n") for l in f.readlines()]

        # Apply edited texts
        for idx_str, new_text in edited_texts.items():
            idx = int(idx_str)
            if 0 <= idx < len(all_lines):
                all_lines[idx] = new_text

        # Ambil hanya baris yang punya label
        texts = []
        y_labels_raw = []

        for idx_str, label in labels.items():
            idx = int(idx_str)
            if 0 <= idx < len(all_lines):
                line = all_lines[idx].strip()
                if line:
                    texts.append(line)
                    y_labels_raw.append(label)

        if not texts:
            return {"status": "failed", "error": "Tidak ada dokumen berlabel yang valid"}

        if len(set(y_labels_raw)) < 2:
            return {"status": "failed", "error": f"Minimal 2 label berbeda diperlukan. Label yang ditemukan: {set(y_labels_raw)}"}

        # Preprocessing teks
        stopwords = _get_stopwords(language) if remove_stopwords else set()
        cleaned_texts = []
        for text in texts:
            cleaned = _clean_text(text)
            if stopwords:
                tokens = cleaned.split()
                tokens = [t for t in tokens if t not in stopwords]
                cleaned = " ".join(tokens)
            cleaned_texts.append(cleaned if cleaned.strip() else text)

        # TF-IDF
        vectorizer = TfidfVectorizer(max_features=max_features, min_df=1)
        X = vectorizer.fit_transform(cleaned_texts).toarray()

        # Encode label
        le = LabelEncoder()
        y = le.fit_transform(y_labels_raw)

        os.makedirs(output_path, exist_ok=True)
        joblib.dump(X,          os.path.join(output_path, "X.pkl"))
        joblib.dump(y,          os.path.join(output_path, "y.pkl"))
        joblib.dump(vectorizer, os.path.join(output_path, "vectorizer.pkl"))
        joblib.dump(le,         os.path.join(output_path, "label_encoder.pkl"))

        meta = {
            "total_documents": len(texts),
            "classes":         list(le.classes_),
            "class_counts":    {label: int(sum(1 for l in y_labels_raw if l == label)) for label in le.classes_},
            "n_features":      int(X.shape[1]),
            "language":        language,
            "max_features":    max_features,
        }
        with open(os.path.join(output_path, "meta.json"), "w") as f:
            json.dump(meta, f)

        return {"status": "completed", "meta": meta}

    except Exception as e:
        return {"status": "failed", "error": str(e)}
