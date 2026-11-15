import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Starred · ReadEase" };

export default function Page() {
  return <LibraryView view="starred" />;
}
