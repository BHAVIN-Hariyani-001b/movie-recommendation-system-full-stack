import pickle
from pathlib import Path
from typing import Any

MODEL_DIR = Path(__file__).resolve().parents[1] / "model"


def movie_loaded_data(filename: str = "movies.pkl") -> Any:
    model_path = MODEL_DIR / filename
    with model_path.open("rb") as model_file:
        return pickle.load(model_file)


def top5_movie_loaded(filename : str = "top5.pkl") -> Any:
    model_path = MODEL_DIR / filename
    with model_path.open("rb") as model_file:
        return pickle.load(model_file)

