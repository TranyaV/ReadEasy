import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Recent · ReadEase" };

export default function Page() {
  return <LibraryView view="recent" />;
}
