import type { Metadata } from "next";
import "./globals.css";
import { atkinsonHyperlegible, geistSans, lexend, lora } from "@/lib/fonts";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";
import { AppearanceSync } from "@/components/layout/AppearanceSync";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/profile/appearanceScript";

export const metadata: Metadata = {
  title: "ReadEase",
  description:
    "ReadEase is a personalised, dyslexia-friendly reading environment — upload documents or images, customise how they look, and listen to them read aloud.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${lora.variable} ${atkinsonHyperlegible.variable} ${lexend.variable} h-full antialiased`}
      // The boot script below may add the "dark" class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AppearanceSync />
        <AssistantProvider>{children}</AssistantProvider>
      </body>
    </html>
  );
}
