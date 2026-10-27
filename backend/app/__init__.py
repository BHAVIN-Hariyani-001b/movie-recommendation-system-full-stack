from fastapi import FastAPI
from app.router import movie_recommedation


def createapp() -> FastAPI:
    app = FastAPI()
    app.include_router(movie_recommedation.router)
    return app
