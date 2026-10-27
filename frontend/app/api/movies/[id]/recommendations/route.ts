import { proxyMovieApi } from "../../../_lib/proxy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return Response.json({ detail: "Movie id must be an integer." }, {
      status: 400,
    });
  }

  return proxyMovieApi(`/movie/predict/${id}`, "POST");
}
