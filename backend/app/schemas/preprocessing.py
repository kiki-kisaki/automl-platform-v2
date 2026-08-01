from pydantic import BaseModel, field_validator
from typing import Optional


class TabularPreprocessConfig(BaseModel):
    target_column:    str
    feature_columns:  list[str]
    missing_strategy: str = "median"   # median | most_frequent | drop
    scaling:          str = "standard"  # standard | minmax | none
    encoding:         str = "onehot"   # onehot | label | none

    @field_validator("feature_columns")
    @classmethod
    def features_not_empty(cls, v):
        if not v:
            raise ValueError("feature_columns tidak boleh kosong")
        return v


class ImagePreprocessConfig(BaseModel):
    image_size:  int = 64      # resize ke NxN pixel
    grayscale:   bool = False   # konversi ke grayscale
    label_map:   dict = {}
    # label_map: rename folder → label baru
    # contoh: {"kucing": "cat", "anjing": "dog"}
    # kalau kosong, nama folder dipakai langsung


class TextPreprocessConfig(BaseModel):
    labels:           dict      # mapping dokumen ke label
    # format: {"0": "positif", "1": "negatif"} → indeks baris ke label
    # atau kosong dulu, nanti assign manual
    remove_stopwords: bool = True
    language:         str = "indonesian"  # indonesian | english
    max_features:     int = 5000          # max fitur TF-IDF


class PreprocessRequest(BaseModel):
    dataset_id:  int
    name:        str
    config_type: str
    config:      dict

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nama preprocessing tidak boleh kosong")
        return v.strip()
