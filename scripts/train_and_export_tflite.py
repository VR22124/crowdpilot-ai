from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import tensorflow as tf


def build_dataset(samples: int = 4000, seed: int = 42):
    rng = np.random.default_rng(seed)

    # Features align with crowdMlEngine's 7-feature vector.
    x = rng.uniform(low=0.0, high=1.0, size=(samples, 7)).astype(np.float32)

    true_w = np.array([1.2, 0.9, -0.7, -0.4, -0.5, 0.8, 0.1], dtype=np.float32)
    logits = x @ true_w + 0.05 * rng.normal(size=(samples,)).astype(np.float32)
    y = (1.0 / (1.0 + np.exp(-logits))).astype(np.float32)

    return x, y


def build_model() -> tf.keras.Model:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(7,), dtype=tf.float32),
            tf.keras.layers.Dense(8, activation="relu"),
            tf.keras.layers.Dense(1, activation="sigmoid"),
        ]
    )
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.01), loss="mse", metrics=["mae"])
    return model


def export_tflite(model: tf.keras.Model, out_path: Path) -> int:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(tflite_model)
    return len(tflite_model)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    model_path = root / "public" / "models" / "crowdpilot_micro_model.tflite"
    meta_path = root / "public" / "models" / "crowdpilot_micro_model.meta.json"

    x, y = build_dataset()
    model = build_model()
    history = model.fit(x, y, epochs=12, batch_size=64, validation_split=0.2, verbose=0)

    size_bytes = export_tflite(model, model_path)

    metadata = {
        "model": "crowdpilot_micro_model",
        "format": "tflite",
        "input_shape": [7],
        "epochs": 12,
        "final_loss": float(history.history["loss"][-1]),
        "final_val_loss": float(history.history["val_loss"][-1]),
        "size_bytes": size_bytes,
    }
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Exported {model_path} ({size_bytes} bytes)")
    print(f"Metadata written to {meta_path}")


if __name__ == "__main__":
    main()
