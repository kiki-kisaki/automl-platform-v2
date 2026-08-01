import os
import json
import pandas as pd
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, MinMaxScaler, OneHotEncoder, LabelEncoder


def run_tabular_preprocessing(dataset_path: str, config: dict, output_path: str) -> dict:
    try:
        df = pd.read_csv(dataset_path, sep=None, engine="python")

        target_column = config.get("target_column")
        feature_columns = config.get("feature_columns", [])
        missing_strategy = config.get("missing_strategy", "median")
        scaling = config.get("scaling", "standard")
        encoding = config.get("encoding", "onehot")
        duplicate_strategy = config.get("duplicate_strategy", "drop")

        # Validasi kolom
        if target_column not in df.columns:
            return {"status": "failed", "error": f"target_column '{target_column}' tidak ditemukan"}

        invalid = [c for c in feature_columns if c not in df.columns]
        if invalid:
            return {"status": "failed", "error": f"feature_columns tidak valid: {invalid}"}

        # Handle duplikat
        before_dedup = len(df)
        if duplicate_strategy == "drop":
            df = df.drop_duplicates()
        removed_duplicates = before_dedup - len(df)

        # Pisahkan fitur dan target
        X = df[feature_columns].copy()
        y = df[target_column].copy()

        # Drop rows dengan missing target
        if missing_strategy == "drop":
            mask = y.notna()
            X, y = X[mask], y[mask]

        # Deteksi tipe kolom
        total_rows = len(X)
        numeric_cols = []
        categorical_cols = []

        for col in X.columns:
            dtype = X[col].dtype
            if dtype == "object" or str(dtype) == "category":
                categorical_cols.append(col)
            elif pd.api.types.is_integer_dtype(dtype):
                unique_ratio = X[col].nunique() / total_rows
                if unique_ratio <= 0.05:
                    categorical_cols.append(col)
                else:
                    numeric_cols.append(col)
            else:
                numeric_cols.append(col)

        # Imputer strategy
        num_imputer_strategy = "median" if missing_strategy in (
            "median", "drop") else "most_frequent"

        # Scaler
        if scaling == "standard":
            scaler = StandardScaler()
        elif scaling == "minmax":
            scaler = MinMaxScaler()
        else:
            scaler = "passthrough"

        # Numeric pipeline
        numeric_steps = [
            ("imputer", SimpleImputer(strategy=num_imputer_strategy))]
        if scaling != "none":
            numeric_steps.append(("scaler", scaler))
        numeric_transformer = Pipeline(steps=numeric_steps)

        # Categorical pipeline
        cat_imputer = SimpleImputer(strategy="most_frequent")
        if encoding == "onehot":
            cat_encoder = OneHotEncoder(
                handle_unknown="ignore", sparse_output=False)
        else:
            cat_encoder = "passthrough"

        categorical_transformer = Pipeline(steps=[
            ("imputer", cat_imputer),
            ("encoder", cat_encoder),
        ])

        # ColumnTransformer
        transformers = []
        if numeric_cols:
            transformers.append(("num", numeric_transformer, numeric_cols))
        if categorical_cols:
            transformers.append(
                ("cat", categorical_transformer, categorical_cols))

        preprocessor = ColumnTransformer(transformers=transformers)

        # Encode target
        target_encoder = None
        if y.dtype == "object" or str(y.dtype) == "category":
            target_encoder = LabelEncoder()
            y_encoded = target_encoder.fit_transform(y.astype(str))
        else:
            y_encoded = y.values

        # Fit preprocessor
        X_processed = preprocessor.fit_transform(X)

        # Simpan hasil
        os.makedirs(output_path, exist_ok=True)
        joblib.dump(preprocessor,   os.path.join(
            output_path, "preprocessor.pkl"))
        joblib.dump(target_encoder, os.path.join(
            output_path, "target_encoder.pkl"))
        joblib.dump(X_processed,    os.path.join(output_path, "X.pkl"))
        joblib.dump(y_encoded,      os.path.join(output_path, "y.pkl"))

        meta = {
            "feature_columns":    feature_columns,
            "target_column":      target_column,
            "numeric_cols":       numeric_cols,
            "categorical_cols":   categorical_cols,
            "n_samples":          int(X_processed.shape[0]),
            "n_features":         int(X_processed.shape[1]),
            "classes":            list(target_encoder.classes_) if target_encoder else None,
            "removed_duplicates": removed_duplicates,
            "duplicate_strategy": duplicate_strategy,
        }
        with open(os.path.join(output_path, "meta.json"), "w") as f:
            json.dump(meta, f)

        return {"status": "completed", "meta": meta}

    except Exception as e:
        return {"status": "failed", "error": str(e)}
