import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font — no CDN, no render-blocking, no layout shift
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "Kembara | Spiritual Trip Planner",
  description:
    "Rencanakan perjalanan Umrah dan perjalanan spiritual Anda dengan mudah dan terorganisir.",
  openGraph: {
    title: "Kembara | Spiritual Trip Planner",
    description:
      "Rencanakan perjalanan Umrah dan perjalanan spiritual Anda dengan mudah dan terorganisir.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${amiri.variable}`}
    >
      <body className="antialiased min-h-screen text-stone-900 overflow-hidden text-base selection:bg-brand-200 selection:text-brand-900">
        {children}
      </body>
    </html>
  );
}
