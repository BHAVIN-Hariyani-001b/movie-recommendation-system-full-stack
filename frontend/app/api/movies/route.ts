import { proxyMovieApi } from "../_lib/proxy";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "10";

  if (
    !/^\d+$/.test(page) ||
    !/^\d+$/.test(limit) ||
    Number(page) < 1 ||
    Number(limit) < 1 ||
    Number(limit) > 30
  ) {
    return Response.json(
      { detail: "Page must be positive and limit must be between 1 and 30." },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({ page, limit });
  return proxyMovieApi(`/movie/top?${query.toString()}`);
}
