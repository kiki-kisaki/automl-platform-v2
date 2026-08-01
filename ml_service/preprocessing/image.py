import os
import json
import numpy as np
import joblib
from PIL import Image
from skimage.feature import hog

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def run_image_preprocessing(dataset_paths, config: dict, output_path: str) -> dict:
    """
    dataset_paths: str atau list[str] — path ke folder extract gambar
    config:
        image_size  : int  — resize ke NxN
        grayscale   : bool
        label_groups: dict — { "label_final": ["folder1", "folder2", ...] }
        Contoh: { "kucing": ["kucing1", "kucing2"], "anjing": ["anjing"] }
    """
    try:
        # Normalisasi input — bisa string atau list
        if isinstance(dataset_paths, str):
            dataset_paths = [dataset_paths]

        image_size = config.get("image_size", 64)
        grayscale = config.get("grayscale", False)
        label_groups = config.get("label_groups", {})

        if not label_groups:
            return {"status": "failed", "error": "label_groups tidak boleh kosong. Tentukan pengelompokan folder ke label."}

        # Bangun mapping: folder_name → label_final
        folder_to_label = {}
        for label, folders in label_groups.items():
            for folder in folders:
                folder_to_label[folder] = label

        # Scan semua folder dari semua dataset_paths
        # available_folders: { folder_name: full_path }
        available_folders = {}
        for dataset_path in dataset_paths:
            if not os.path.isdir(dataset_path):
                continue
            for item in os.listdir(dataset_path):
                item_path = os.path.join(dataset_path, item)
                if os.path.isdir(item_path):
                    images = [
                        f for f in os.listdir(item_path)
                        if os.path.splitext(f)[1].lower() in ALLOWED_IMAGE_EXT
                    ]
                    if images:
                        # Kalau folder sama nama dari dataset berbeda, gabung
                        if item not in available_folders:
                            available_folders[item] = []
                        available_folders[item].append(item_path)

        # Proses gambar per label
        X_list = []
        y_list = []
        class_counts = {}
        final_labels = sorted(set(label_groups.keys()))
        label_to_idx = {label: idx for idx, label in enumerate(final_labels)}

        for folder_name, folder_paths in available_folders.items():
            label = folder_to_label.get(folder_name)
            if label is None:
                continue  # folder tidak di-assign, diabaikan

            label_idx = label_to_idx[label]
            if label not in class_counts:
                class_counts[label] = 0

            for folder_path in folder_paths:
                images = [
                    f for f in os.listdir(folder_path)
                    if os.path.splitext(f)[1].lower() in ALLOWED_IMAGE_EXT
                ]

                for img_file in images:
                    img_path = os.path.join(folder_path, img_file)
                    try:
                        img = Image.open(img_path)
                        img = img.convert("L" if grayscale else "RGB")
                        img = img.resize((image_size, image_size))
                        img_array = np.array(img)

                        features = hog(
                            img_array,
                            orientations=8,
                            pixels_per_cell=(8, 8),
                            cells_per_block=(2, 2),
                            channel_axis=None if grayscale else -1,
                        )

                        X_list.append(features)
                        y_list.append(label_idx)
                        class_counts[label] += 1

                    except Exception:
                        continue

        if not X_list:
            return {"status": "failed", "error": "Tidak ada gambar valid yang berhasil diproses. Pastikan folder berisi gambar yang valid."}

        X = np.array(X_list)
        y = np.array(y_list)

        os.makedirs(output_path, exist_ok=True)
        joblib.dump(X, os.path.join(output_path, "X.pkl"))
        joblib.dump(y, os.path.join(output_path, "y.pkl"))

        meta = {
            "classes":      final_labels,
            "label_groups": label_groups,
            "total_images": len(X_list),
            "class_counts": class_counts,
            "n_features":   int(X.shape[1]),
            "image_size":   image_size,
            "grayscale":    grayscale,
        }
        with open(os.path.join(output_path, "meta.json"), "w") as f:
            json.dump(meta, f)

        return {"status": "completed", "meta": meta}

    except Exception as e:
        return {"status": "failed", "error": str(e)}
