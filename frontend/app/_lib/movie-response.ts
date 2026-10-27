import type { Movie } from "../providers";

function isMovie(value: unknown): value is Movie {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "poster" in value &&
    typeof value.poster === "string" &&
    "overview" in value &&
    typeof value.overview === "string"
  );
}

export function readMovieList(
  value: unknown,
  key: "movies" | "recommendations",
): Movie[] {
  if (typeof value !== "object" || value === null || !(key in value)) {
    throw new Error("The movie service returned invalid movie data.");
  }

  let items = (value as Record<string, unknown>)[key];
  if (
    key === "recommendations" &&
    Array.isArray(items) &&
    items.length === 2 &&
    Array.isArray(items[0]) &&
    typeof items[1] === "number"
  ) {
    items = items[0];
  }

  if (!Array.isArray(items)) {
    throw new Error("The movie service returned invalid movie data.");
  }

  const parsedMovies: Movie[] = [];
  for (const item of items) {
    if (!isMovie(item)) {
      throw new Error("The movie service returned invalid movie data.");
    }
    parsedMovies.push(item);
  }

  return parsedMovies;
}

export type MoviePage = {
  movies: Movie[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function readMoviePage(value: unknown): MoviePage {
  if (typeof value !== "object" || value === null) {
    throw new Error("The movie service returned an invalid page.");
  }

  const result = value as Record<string, unknown>;
  if (
    typeof result.page !== "number" ||
    typeof result.limit !== "number" ||
    typeof result.total !== "number" ||
    typeof result.total_pages !== "number"
  ) {
    throw new Error("The movie service returned invalid pagination data.");
  }

  return {
    movies: readMovieList(value, "movies"),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.total_pages,
  };
}

export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = body.detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    return `The request failed with status ${response.status}.`;
  }

  return `The request failed with status ${response.status}.`;
}
