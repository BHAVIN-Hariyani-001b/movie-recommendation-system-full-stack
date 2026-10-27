const movieApiUrl = (
  process.env.MOVIE_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export async function proxyMovieApi(
  path: string,
  method: "GET" | "POST" = "GET",
): Promise<Response> {
  let upstream: Response;

  try {
    upstream = await fetch(`${movieApiUrl}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    const detail =
      error instanceof DOMException && error.name === "TimeoutError"
        ? "The movie service took too long to respond."
        : "Could not connect to the movie service.";

    return Response.json({ detail }, { status: 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
