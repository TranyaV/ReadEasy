import { UploadFlow } from "@/components/landing/UploadFlow";

export function Hero() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-xl flex-col gap-5">
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
          Reading should feel like it was made for you.
        </h1>
        <p className="text-lg leading-relaxed text-foreground/70">
          EyeRead turns any document or image into a reading experience shaped around you —
          legible typography, calming colour, and a voice that reads it back when you&apos;d
          rather listen.
        </p>
      </div>
      <UploadFlow />
    </div>
  );
}
