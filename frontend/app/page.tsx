"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  readErrorMessage,
  readMoviePage,
} from "./_lib/movie-response";
import { useMovieCatalog, type Movie } from "./providers";

type HealthState = "checking" | "online" | "offline";

const MAX_VISIBLE_PAGE_BUTTONS = 10;
const MOVIES_PER_PAGE = 10;
const MAX_BROWSE_MOVIES = 150;

function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  const visibleCount = Math.min(MAX_VISIBLE_PAGE_BUTTONS, totalPages);
  const maxStart = Math.max(1, totalPages - visibleCount + 1);
  const start = Math.min(
    Math.max(1, currentPage - Math.floor(visibleCount / 2)),
    maxStart,
  );

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

function MovieCard({
  movie,
}: {
  movie: Movie;
}) {
  return (
    <article className="movie-card">
      <div className="movie-poster">
        <Link
          className="movie-poster-link"
          href={`/movies/${movie.id}`}
          aria-label={`View ${movie.title} details`}
        >
          {movie.poster ? (
            <Image
              src={movie.poster}
              alt={`${movie.title} poster`}
              fill
              sizes="(max-width: 600px) 70vw, (max-width: 1000px) 35vw, 220px"
              unoptimized
            />
          ) : (
            <span className="poster-placeholder" aria-hidden="true">
              {movie.title.slice(0, 1)}
            </span>
          )}
        </Link>
        <span className="poster-id">#{movie.id}</span>
      </div>
      <div className="movie-card-content">
        <h3>
          <Link className="movie-title-link" href={`/movies/${movie.id}`}>
            {movie.title}
          </Link>
        </h3>
        <p>{movie.overview}</p>
      </div>
    </article>
  );
}

export default function Home() {
  const {
    pages,
    setPageMovies,
    totalPages,
    totalMovies,
    setPagination,
    loaded,
  } = useMovieCatalog();
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<HealthState>("checking");
  const [error, setError] = useState<string | null>(null);
  const loadingMovies = !loaded && !error;
  const maxBrowsePages = Math.min(
    totalPages,
    Math.ceil(Math.min(totalMovies, MAX_BROWSE_MOVIES) / MOVIES_PER_PAGE),
  );
  const pageRequests = useRef(new Map<number, Promise<ReturnType<typeof readMoviePage>>>());

  const loadPage = useCallback((page: number) => {
    const inFlightRequest = pageRequests.current.get(page);
    if (inFlightRequest) return inFlightRequest;

    const request = (async () => {
      const response = await fetch(
        `/api/movies?page=${page}&limit=${MOVIES_PER_PAGE}`,
      );
      if (!response.ok) throw new Error(await readErrorMessage(response));
      return readMoviePage(await response.json());
    })();

    pageRequests.current.set(page, request);
    void request.then(
      () => {
        if (pageRequests.current.get(page) === request) {
          pageRequests.current.delete(page);
        }
      },
      () => {
        if (pageRequests.current.get(page) === request) {
          pageRequests.current.delete(page);
        }
      },
    );

    return request;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovies() {
      try {
        const result = await loadPage(1);
        if (controller.signal.aborted) return;
        setPageMovies(result.page, result.movies);
        setCurrentPage(result.page);
        setPagination(result.total, result.totalPages);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load movies. Please try again.",
        );
      }
    }

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Health check failed.");
        const result: unknown = await response.json();
        setHealth(
          typeof result === "object" &&
            result !== null &&
            "status" in result &&
            result.status === "OK"
            ? "online"
            : "offline",
        );
      } catch {
        if (!controller.signal.aborted) setHealth("offline");
      }
    }

    if (!loaded) void loadMovies();
    void checkHealth();

    return () => controller.abort();
  }, [loaded, loadPage, setPageMovies, setPagination]);

  useEffect(() => {
    const nextPage = currentPage + 1;
    if (!loaded || nextPage > maxBrowsePages || pages[nextPage]) return;

    let active = true;
    void loadPage(nextPage).then(
      (result) => {
        if (!active) return;
        setPageMovies(result.page, result.movies);
        setPagination(result.total, result.totalPages);
      },
      (prefetchError: unknown) => {
        if (!active) return;
        setError(
          prefetchError instanceof Error
            ? `Could not preload page ${nextPage}: ${prefetchError.message}`
            : `Could not preload page ${nextPage}.`,
        );
      },
    );

    return () => {
      active = false;
    };
  }, [
    currentPage,
    loadPage,
    loaded,
    maxBrowsePages,
    pages,
    setPageMovies,
    setPagination,
  ]);

  const visibleMovies = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const pageMovies = pages[currentPage] ?? [];
    if (!normalizedSearch) return pageMovies;
    return pageMovies.filter((movie) =>
      movie.title.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [currentPage, pages, search]);
  const visiblePageNumbers = useMemo(
    () => getVisiblePageNumbers(currentPage, maxBrowsePages),
    [currentPage, maxBrowsePages],
  );

  async function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > maxBrowsePages || loadingPage) return;

    if (pages[nextPage]) {
      setError(null);
      setCurrentPage(nextPage);
      return;
    }

    setLoadingPage(true);
    setError(null);
    try {
      const result = await loadPage(nextPage);
      setPageMovies(result.page, result.movies);
      setPagination(result.total, result.totalPages);
      setCurrentPage(result.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this page. Please try again.",
      );
    } finally {
      setLoadingPage(false);
    }
  }

  const featuredMovie = pages[1]?.[0];

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
        <nav className="header-nav" aria-label="Main navigation">
          <a className="nav-active" href="#discover">
            Discover
          </a>
          <a href="#movies">Top movies</a>
        </nav>
        <div className={`service-status status-${health}`} role="status">
          <span className="status-dot" />
          {health === "checking"
            ? "Connecting"
            : health === "online"
              ? "API online"
              : "API offline"}
        </div>
      </header>

      <section className="hero" id="discover">
        <div className="hero-glow" />
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            YOUR NEXT FAVORITE FILM
          </p>
          <h1>
            Find your
            <br />
            <span>next obsession.</span>
          </h1>
          <p className="hero-description">
            Tell us what you love. We&apos;ll find the stories you haven&apos;t
            met yet.
          </p>
          <a className="hero-cta" href="#movies">
            Explore the collection <span aria-hidden="true">↓</span>
          </a>
        </div>
        {featuredMovie ? (
          <div className="featured-card" aria-label="Featured movie">
            <div className="featured-poster">
              {featuredMovie.poster && (
                <Image
                  src={featuredMovie.poster}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 45vw, 330px"
                  priority
                  unoptimized
                />
              )}
              <div className="featured-vignette" />
              <div className="featured-caption">
                <span className="featured-label">EDITOR&apos;S PICK</span>
                <h2>{featuredMovie.title}</h2>
                <p>From our movie collection</p>
              </div>
            </div>
            <span className="featured-orbit orbit-one" />
            <span className="featured-orbit orbit-two" />
          </div>
        ) : (
          <div className="hero-art" aria-hidden="true">
            <div className="art-ring ring-one" />
            <div className="art-ring ring-two" />
            <div className="art-core">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m9 6 9 6-9 6V6Z" fill="currentColor" />
              </svg>
            </div>
            <span className="art-star star-one">✳</span>
            <span className="art-star star-two">✦</span>
          </div>
        )}
        <div className="hero-footer">
          <span>CURATED FOR YOUR KIND OF CINEMA</span>
          <span>{String(currentPage).padStart(2, "0")} / {String(maxBrowsePages).padStart(2, "0")}</span>
        </div>
      </section>

      <section className="movies-section" id="movies">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HAND-PICKED BY OUR ALGORITHM · {totalMovies || 30} MOVIES</p>
            <h2>Top movies</h2>
          </div>
          <label className="search-field">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" />
              <path
                d="m16 16 4.5 4.5"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles"
              aria-label="Search movies"
            />
          </label>
        </div>

        {loadingMovies ? (
          <div className="loading-state" role="status">
            <span className="spinner" />
            <p>Finding the good stuff...</p>
            <span className="loading-hint">
              This can take a moment while we gather the collection.
            </span>
          </div>
        ) : error && !loaded ? (
          <div className="error-state" role="alert">
            <span className="error-icon">!</span>
            <h3>We couldn&apos;t load the collection</h3>
            <p>{error}</p>
            <button
              className="retry-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : visibleMovies.length ? (
          <>
            <div className={`movie-grid${loadingPage ? " page-loading" : ""}`}>
              {visibleMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <nav className="pagination" aria-label="Movie pages">
              <span className="pagination-count">
                Showing {(currentPage - 1) * MOVIES_PER_PAGE + 1}–
                {Math.min(currentPage * MOVIES_PER_PAGE, totalMovies, MAX_BROWSE_MOVIES)} of{" "}
                {totalMovies > MAX_BROWSE_MOVIES
                  ? `first ${MAX_BROWSE_MOVIES} (${totalMovies} total)`
                  : totalMovies}
              </span>
              <div className="pagination-controls">
                <button
                  className="page-button"
                  type="button"
                  onClick={() => void goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loadingPage}
                  aria-label="Previous page"
                >
                  ← <span>Previous</span>
                </button>
                {visiblePageNumbers[0] > 1 && (
                  <span className="pagination-ellipsis" aria-hidden="true">
                    …
                  </span>
                )}
                {visiblePageNumbers.map((page) => (
                    <button
                      className={`page-number${page === currentPage ? " page-number-active" : ""}`}
                      key={page}
                      type="button"
                      onClick={() => void goToPage(page)}
                      disabled={loadingPage}
                      aria-current={page === currentPage ? "page" : undefined}
                      aria-label={`Page ${page}`}
                    >
                      {page}
                    </button>
                ))}
                {visiblePageNumbers.at(-1) !== totalPages && (
                  <span className="pagination-ellipsis" aria-hidden="true">
                    …
                  </span>
                )}
                <button
                  className="page-button"
                  type="button"
                  onClick={() => void goToPage(currentPage + 1)}
                  disabled={currentPage >= maxBrowsePages || loadingPage}
                  aria-label="Next page"
                >
                  <span>Next</span> →
                </button>
              </div>
            </nav>
          </>
        ) : error ? (
          <div className="error-state" role="alert">
            <p>{error}</p>
          </div>
        ) : (
          <p className="empty-message">
            No titles match &ldquo;{search}&rdquo;. Try another search.
          </p>
        )}
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#">
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
        </a>
        <span>Made for people who love a good story.</span>
        <a href="#discover">Back to top ↑</a>
      </footer>
    </main>
  );
}
