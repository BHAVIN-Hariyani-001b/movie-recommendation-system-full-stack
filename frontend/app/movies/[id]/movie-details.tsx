"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readErrorMessage,
  readMovieList,
  readMoviePage,
} from "../../_lib/movie-response";
import { useMovieCatalog, type Movie } from "../../providers";

type RecommendationResult = {
  movieId: number;
  attempt: number;
  movies?: Movie[];
  error?: string;
};

export default function MovieDetails({ id }: { id: string }) {
  const { movies, setPageMovies, setPagination } = useMovieCatalog();
  const movieId = Number(id);
  const activeMovie = movies.find((item) => item.id === movieId) ?? null;
  const [loadFailure, setLoadFailure] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [recommendationResult, setRecommendationResult] =
    useState<RecommendationResult | null>(null);
  const [recommendationAttempt, setRecommendationAttempt] = useState(0);
  const detailError = !Number.isSafeInteger(movieId) || movieId < 0
    ? "This movie ID is invalid."
    : activeMovie
      ? null
      : loadFailure?.id === id
        ? loadFailure.message
        : null;
  const loadingMovie = !activeMovie && !detailError;
  const currentRecommendation =
    recommendationResult &&
    recommendationResult.movieId === activeMovie?.id &&
    recommendationResult.attempt === recommendationAttempt
      ? recommendationResult
      : null;
  const recommendations = currentRecommendation?.movies ?? [];
  const recommendationError = currentRecommendation?.error ?? null;
  const loadingRecommendations = Boolean(activeMovie && !currentRecommendation);

  useEffect(() => {
    const controller = new AbortController();
    if (
      !Number.isSafeInteger(movieId) ||
      movieId < 0 ||
      activeMovie
    ) {
      return () => controller.abort();
    }

    async function loadMovie() {
      try {
        let totalPages = 1;
        for (let page = 1; page <= totalPages; page += 1) {
          const response = await fetch(
            `/api/movies?page=${page}&limit=10`,
            { signal: controller.signal },
          );
          if (!response.ok) {
            throw new Error(await readErrorMessage(response));
          }

          const result = readMoviePage(await response.json());
          setPageMovies(result.page, result.movies);
          setPagination(result.total, result.totalPages);
          totalPages = result.totalPages;

          if (result.movies.some((item) => item.id === movieId)) return;
        }

        setLoadFailure({
          id,
          message: "This movie is not in the current collection.",
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setLoadFailure({
          id,
          message:
            loadError instanceof Error
              ? loadError.message
              : "Could not load this movie. Please try again.",
        });
      }
    }

    void loadMovie();
    return () => controller.abort();
  }, [activeMovie, id, movieId, setPageMovies, setPagination]);

  useEffect(() => {
    if (!activeMovie) return;

    const controller = new AbortController();
    const selectedMovie = activeMovie;
    const attempt = recommendationAttempt;

    async function loadRecommendations() {
      try {
        const response = await fetch(
          `/api/movies/${encodeURIComponent(selectedMovie.id)}/recommendations`,
          { method: "POST", signal: controller.signal },
        );
        if (!response.ok) throw new Error(await readErrorMessage(response));
        setRecommendationResult({
          movieId: selectedMovie.id,
          attempt,
          movies: readMovieList(await response.json(), "recommendations"),
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setRecommendationResult({
          movieId: selectedMovie.id,
          attempt,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Could not load related movies. Please try again.",
        });
      }
    }

    void loadRecommendations();
    return () => controller.abort();
  }, [activeMovie, recommendationAttempt]);

  return (
    <main className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Reelwise home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7.5h16v12H4zM4 7.5l2-3h12l2 3M8 4.5l2 3m2-3 2 3m2-3 2 3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>reelwise</span>
        </Link>
        <Link className="detail-back-link" href="/#movies">
          <span aria-hidden="true">←</span> Browse all movies
        </Link>
      </header>

      {loadingMovie ? (
        <div className="loading-state detail-loading" role="status">
          <span className="spinner" />
          <p>Loading movie details...</p>
        </div>
      ) : detailError ? (
        <div className="error-state detail-error" role="alert">
          <span className="error-icon">!</span>
          <h1>Movie details unavailable</h1>
          <p>{detailError}</p>
          <Link className="retry-button" href="/#movies">
            Return to top movies
          </Link>
        </div>
      ) : activeMovie ? (
        <>
          <section className="movie-detail">
            <div className="detail-poster">
              {activeMovie.poster ? (
                <Image
                  src={activeMovie.poster}
                  alt={`${activeMovie.title} poster`}
                  fill
                  sizes="(max-width: 700px) 70vw, 340px"
                  priority
                  unoptimized
                />
              ) : (
                <span className="poster-placeholder" aria-hidden="true">
                  {activeMovie.title.slice(0, 1)}
                </span>
              )}
              <span className="poster-id">MOVIE #{activeMovie.id}</span>
            </div>
            <div className="detail-copy">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                MOVIE DETAILS
              </p>
              <h1>{activeMovie.title}</h1>
              <div className="detail-divider" />
              <h2>Overview</h2>
              <p className="detail-overview">
                {activeMovie.overview ||
                  "No overview is available for this movie."}
              </p>
              <div className="detail-meta">
                <span>Catalog ID</span>
                <strong>{activeMovie.id}</strong>
              </div>
              <Link className="hero-cta detail-cta" href="#related-movies">
                Explore related movies <span aria-hidden="true">↓</span>
              </Link>
            </div>
          </section>

          <section className="related-section" id="related-movies">
            <div className="section-heading">
              <div>
                <p className="eyebrow">PICKED FOR YOU</p>
                <h2>Related movies</h2>
                {!loadingRecommendations &&
                  !recommendationError &&
                  currentRecommendation && (
                    <p className="related-result-count">
                      {recommendations.length} recommendations
                    </p>
                  )}
              </div>
              <span className="related-caption">
                Because you liked {activeMovie.title}
              </span>
            </div>
            {loadingRecommendations ? (
              <div className="loading-state related-loading" role="status">
                <span className="spinner" />
                <p>Finding movies you might love...</p>
              </div>
            ) : recommendationError ? (
              <div className="error-state related-error" role="alert">
                <p>{recommendationError}</p>
                <button
                  className="retry-button"
                  type="button"
                  onClick={() => setRecommendationAttempt((attempt) => attempt + 1)}
                >
                  Try recommendations again
                </button>
              </div>
            ) : recommendations.length ? (
              <div className="movie-grid recommendation-grid">
                {recommendations.map((relatedMovie) => (
                  <Link
                    className="movie-card related-card"
                    href={`/movies/${relatedMovie.id}`}
                    key={relatedMovie.id}
                  >
                    <div className="movie-poster">
                      {relatedMovie.poster ? (
                        <Image
                          src={relatedMovie.poster}
                          alt={`${relatedMovie.title} poster`}
                          fill
                          sizes="(max-width: 600px) 70vw, (max-width: 1000px) 35vw, 220px"
                          unoptimized
                        />
                      ) : (
                        <span className="poster-placeholder" aria-hidden="true">
                          {relatedMovie.title.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="movie-card-content">
                      <h3>{relatedMovie.title}</h3>
                      <p>{relatedMovie.overview}</p>
                      <span className="related-card-link">
                        View movie <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty-message">
                No related movies were returned for this title.
              </p>
            )}
          </section>
        </>
      ) : null}

      <footer className="site-footer">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7.5h16v12H4zM4 7.5l2-3h12l2 3M8 4.5l2 3m2-3 2 3m2-3 2 3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>reelwise</span>
        </Link>
        <span>Made for people who love a good story.</span>
        <Link href="/#movies">Browse movies</Link>
      </footer>
    </main>
  );
}
