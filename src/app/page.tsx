import { Header } from "@/components/layout/Header";
import { Shell } from "@/components/layout/Shell";
import { Hero } from "@/components/landing/Hero";
import { ReadingPreview } from "@/components/landing/ReadingPreview";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Shell>
        <Header />
      </Shell>
      <main className="flex-1">
        <Shell className="pb-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-16">
            <Hero />
            <ReadingPreview />
          </div>
        </Shell>
      </main>
    </div>
  );
}
