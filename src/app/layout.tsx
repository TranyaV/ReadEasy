import type { Metadata } from "next";
import "./globals.css";
import { atkinsonHyperlegible, geistSans, lora } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "EyeRead",
  description:
    "EyeRead is a personalised reading environment — upload documents or images, customise how they look, and listen to them read aloud.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${lora.variable} ${atkinsonHyperlegible.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
