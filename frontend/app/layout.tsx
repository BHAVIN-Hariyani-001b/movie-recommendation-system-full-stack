import type { Metadata } from "next";
import { MovieProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Recommendation System",
  description: "Movie Recommendation System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className=" h-full antialiased">
      <body className="min-h-full flex flex-col">
        <MovieProvider>{children}</MovieProvider>
      </body>
    </html>
  );
}
