import { proxyMovieApi } from "../_lib/proxy";

export async function GET() {
  return proxyMovieApi("/health");
}
