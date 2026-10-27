"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Movie = {
  id: number;
  title: string;
  poster: string;
  overview: string;
};

type MovieCatalog = {
  movies: Movie[];
  pages: Record<number, Movie[]>;
  setPageMovies: (page: number, movies: Movie[]) => void;
  totalPages: number;
  totalMovies: number;
  setPagination: (total: number, totalPages: number) => void;
  loaded: boolean;
};

const MovieCatalogContext = createContext<MovieCatalog | null>(null);

export function MovieProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<Record<number, Movie[]>>({});
  const [totalPages, setTotalPages] = useState(0);
  const [totalMovies, setTotalMovies] = useState(0);
  const setPageMovies = useCallback((page: number, movies: Movie[]) => {
    setPages((current) => ({ ...current, [page]: movies }));
  }, []);
  const setPagination = useCallback((total: number, totalPageCount: number) => {
    setTotalMovies(total);
    setTotalPages(totalPageCount);
  }, []);
  const movies = useMemo(() => Object.values(pages).flat(), [pages]);
  const loaded = pages[1] !== undefined;

  return (
    <MovieCatalogContext.Provider
      value={{
        movies,
        pages,
        setPageMovies,
        totalPages,
        totalMovies,
        setPagination,
        loaded,
      }}
    >
      {children}
    </MovieCatalogContext.Provider>
  );
}

export function useMovieCatalog() {
  const catalog = useContext(MovieCatalogContext);
  if (!catalog) {
    throw new Error("useMovieCatalog must be used within MovieProvider.");
  }
  return catalog;
}
