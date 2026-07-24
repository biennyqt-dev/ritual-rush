import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import "@/app/globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Ritual Rush",
  description: "Rush through the network. Survive the chaos.",
  applicationName: "Ritual Rush",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Ritual Rush",
    description: "Rush through the network. Survive the chaos.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Ritual Rush energy core racing through a living computational network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ritual Rush",
    description: "Rush through the network. Survive the chaos.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#game-shell">
          Skip to game
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
