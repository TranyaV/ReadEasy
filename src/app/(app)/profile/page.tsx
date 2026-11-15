import type { Metadata } from "next";
import { ReadingProfilePage } from "@/components/profile/ReadingProfilePage";

export const metadata: Metadata = { title: "Reading Profile · ReadEase" };

export default function Page() {
  return <ReadingProfilePage />;
}
