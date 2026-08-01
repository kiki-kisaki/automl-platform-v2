import os
import json
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_squared_error, mean_absolute_error, r2_score,
)


def _get_model(data_type: str, task_type: str, algorithm: str, hyperparameters: dict):
    hp = hyperparameters or {}

    if data_type == "tabular":
        if task_type == "classification":
            if algorithm == "decision_tree":
                from sklearn.tree import DecisionTreeClassifier
                return DecisionTreeClassifier(**hp)
            elif algorithm == "random_forest":
                from sklearn.ensemble import RandomForestClassifier
                return RandomForestClassifier(**hp)
            elif algorithm == "svm":
                from sklearn.svm import SVC
                return SVC(**hp)
            elif algorithm == "knn":
                from sklearn.neighbors import KNeighborsClassifier
                return KNeighborsClassifier(**hp)
            elif algorithm == "logistic_regression":
                from sklearn.linear_model import LogisticRegression
                return LogisticRegression(**hp)
        elif task_type == "regression":
            if algorithm == "linear_regression":
                from sklearn.linear_model import LinearRegression
                return LinearRegression(**hp)
            elif algorithm == "decision_tree":
                from sklearn.tree import DecisionTreeRegressor
                return DecisionTreeRegressor(**hp)
            elif algorithm == "random_forest":
                from sklearn.ensemble import RandomForestRegressor
                return RandomForestRegressor(**hp)
            elif algorithm == "svr":
                from sklearn.svm import SVR
                return SVR(**hp)

    elif data_type in ("image", "text"):
        # Selalu classification
        if algorithm == "svm":
            from sklearn.svm import SVC
            return SVC(**hp)
        elif algorithm == "random_forest":
            from sklearn.ensemble import RandomForestClassifier
            return RandomForestClassifier(**hp)
        elif algorithm == "knn":
            from sklearn.neighbors import KNeighborsClassifier
            return KNeighborsClassifier(**hp)
        elif algorithm == "naive_bayes":
            from sklearn.naive_bayes import GaussianNB
            return GaussianNB(**hp)
        elif algorithm == "logistic_regression":
            from sklearn.linear_model import LogisticRegression
            return LogisticRegression(**hp)

    raise ValueError(
        f"Algoritma '{algorithm}' tidak dikenali untuk {data_type}/{task_type}")


def _evaluate_classification(y_true, y_pred) -> dict:
    return {
        "accuracy":         float(round(accuracy_score(y_true, y_pred), 4)),
        "precision":        float(round(precision_score(y_true, y_pred, average="weighted", zero_division=0), 4)),
        "recall":           float(round(recall_score(y_true, y_pred, average="weighted", zero_division=0), 4)),
        "f1_score":         float(round(f1_score(y_true, y_pred, average="weighted", zero_division=0), 4)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def _evaluate_regression(y_true, y_pred) -> dict:
    mse = mean_squared_error(y_true, y_pred)
    return {
        "mse":      float(round(mse, 4)),
        "rmse":     float(round(np.sqrt(mse), 4)),
        "mae":      float(round(mean_absolute_error(y_true, y_pred), 4)),
        "r2_score": float(round(r2_score(y_true, y_pred), 4)),
    }


def run_training(config: dict) -> dict:
    try:
        preprocessed_path = config["preprocessed_path"]
        data_type = config["data_type"]
        task_type = config["task_type"]
        algorithm = config["algorithm"]
        hyperparameters = config.get("hyperparameters", {})
        model_save_path = config["model_save_path"]

        # Load data hasil preprocessing
        X = joblib.load(os.path.join(preprocessed_path, "X.pkl"))
        y = joblib.load(os.path.join(preprocessed_path, "y.pkl"))

        # Load meta
        meta_path = os.path.join(preprocessed_path, "meta.json")
        with open(meta_path, "r") as f:
            meta = json.load(f)

        # Split 80/20
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Get model
        model = _get_model(data_type, task_type, algorithm, hyperparameters)

        # Training
        model.fit(X_train, y_train)

        # Evaluasi
        y_pred = model.predict(X_test)
        if task_type == "classification":
            metrics = _evaluate_classification(y_test, y_pred)
        else:
            metrics = _evaluate_regression(y_test, y_pred)

        # Simpan model + metadata preprocessing
        os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
        export = {
            "model":      model,
            "data_type":  data_type,
            "task_type":  task_type,
            "algorithm":  algorithm,
            "meta":       meta,
        }

        # Sertakan preprocessor artifacts jika ada
        for artifact in ["preprocessor.pkl", "target_encoder.pkl", "vectorizer.pkl", "label_encoder.pkl"]:
            artifact_path = os.path.join(preprocessed_path, artifact)
            if os.path.exists(artifact_path):
                export[artifact.replace(".pkl", "")] = joblib.load(
                    artifact_path)

        joblib.dump(export, model_save_path)

        return {
            "status":     "completed",
            "metrics":    metrics,
            "model_path": os.path.abspath(model_save_path),
        }

    except Exception as e:
        return {"status": "failed", "error": str(e)}
