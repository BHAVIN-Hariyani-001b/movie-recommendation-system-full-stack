import requests
from app.core.config import settings


def fetch_data(movie_id):
    try:
        url = f"{settings.TMDB_BASE_URL}/{movie_id}"
        r = requests.get(url, params={"api_key": settings.API_KEY}, timeout=5)
        r.raise_for_status()

        json_data = r.json()

        path = json_data.get("poster_path")
        overview = json_data.get("overview")
        title = json_data.get("title")
        if path and overview and title:
            return {
                "title": title,
                "poster": settings.TMDB_IMAGE_BASE_URL + path,
                "overview": overview,
            }
    except requests.RequestException:
        pass

    return {
        "title": "title not found",
        "poster": settings.PLACEHOLDER,
        "overview": "overview not found",
    }
