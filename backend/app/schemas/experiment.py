from pydantic import BaseModel, field_validator
from typing import Optional


ALGORITHMS = {
    "tabular": {
        "classification": ["decision_tree", "random_forest", "svm", "knn", "logistic_regression"],
        "regression":     ["linear_regression", "decision_tree", "random_forest", "svr"],
    },
    "image": {
        "classification": ["svm", "random_forest", "knn"],
    },
    "text": {
        "classification": ["naive_bayes", "logistic_regression", "svm", "random_forest"],
    },
}


class ExperimentRequest(BaseModel):
    preprocessing_id: int
    name:             str
    # wajib untuk tabular, auto untuk image/text
    task_type:        Optional[str] = None
    algorithm:        str
    hyperparameters:  dict = {}

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nama eksperimen tidak boleh kosong")
        return v.strip()
