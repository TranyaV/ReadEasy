import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "My Library · ReadEase" };

export default function Page() {
  return <LibraryView view="library" />;
}
