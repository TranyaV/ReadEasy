import { Atkinson_Hyperlegible, Geist, Lexend, Lora } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

/** Lexend was designed to reduce visual stress and improve reading fluency. */
export const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});
