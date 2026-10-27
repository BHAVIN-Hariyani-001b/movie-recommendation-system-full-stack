from fastapi import APIRouter, HTTPException, Path,Query
from app.service.movie_get import topmovie
from app.service.movie_load import movie_loaded_data, top5_movie_loaded
from typing import Annotated

router = APIRouter()
MODEL_VERSION = "1.0"


@router.get("/")
def home():
    return {"message": "Welcome To Movie Recommedation System"}


@router.get("/health")
def health():
    return {"status": "OK", "message": "Api is run continue", "version": MODEL_VERSION}


@router.get("/movie/top")
async def movietop(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=500),
):
    movies, total = topmovie(page=page, limit=limit)

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "movies": movies,
    }

@router.post("/movie/predict/{id}")
def predict_movie(id: Annotated[int, Path(description="Movie Id")]):
    movies = movie_loaded_data()
    movie_indices = movies.index[movies["id"] == id]
    if movie_indices.empty:
        raise HTTPException(status_code=404, detail="Movie not found")

    recommendations = top5_movie_loaded()[movie_indices[0]]
    recommendation_ids = movies.iloc[recommendations]["id"].tolist()
    movies = topmovie(recommendation_ids)

    return {"recommendations": movies}
