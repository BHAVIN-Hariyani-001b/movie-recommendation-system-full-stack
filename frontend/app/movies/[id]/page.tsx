import { Suspense } from "react";
import MovieDetails from "./movie-details";

export default function MoviePage({
  params,
}: PageProps<"/movies/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <div className="loading-state detail-loading" role="status">
            <span className="spinner" />
            <p>Loading movie details...</p>
          </div>
        </main>
      }
    >
      {params.then(({ id }) => (
        <MovieDetails id={id} />
      ))}
    </Suspense>
  );
}
