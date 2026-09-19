import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Outfit, Figtree, Lato } from "next/font/google";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

// Lato has no variable font on Google Fonts, so weights are listed explicitly.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grouv",
  description:
    "A small circle of people in the same chapter as you. No audience. No performance. Just depth.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read here rather than in the app shell: it has to be on <html> itself, or
  // the page paints white first and then flips.
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(saved) ? saved : "light";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${outfit.variable} ${figtree.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
