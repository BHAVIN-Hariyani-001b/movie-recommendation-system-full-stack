from app.service.movie_load import movie_loaded_data
from app.util.movie_data import fetch_data
from collections.abc import Iterable


def topmovie(
    recommendmovie: Iterable[int] | None = None,
    page: int = 1,
    limit: int = 10,
):
    if recommendmovie is not None:
        movie_ids = list(recommendmovie)
    else:
        movie = movie_loaded_data()
        movie_ids = movie["id"].tolist()

    # Calculate pagination
    start = (page - 1) * limit
    end = start + limit

    paginated_ids = movie_ids[start:end]

    result = []

    for movie_id in paginated_ids:
        movie_data = fetch_data(movie_id)

        if movie_data:
            movie_data["id"] = movie_id
            result.append(movie_data)

    return result, len(movie_ids)
