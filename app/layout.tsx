import type { Metadata } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  Jost,
  Amiri,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Devanagari,
} from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jost",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "600"],
  variable: "--font-urdu",
  display: "swap",
});

const hindi = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500"],
  variable: "--font-hindi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thaanora — Your fabric. Your fit.",
  description:
    "Original Pakistani unstitched suits for women across Riyadh. Cash on delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${jost.variable} ${amiri.variable} ${urdu.variable} ${hindi.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
