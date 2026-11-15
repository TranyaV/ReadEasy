import type { Metadata } from "next";
import { UploadPage } from "@/components/upload/UploadPage";

export const metadata: Metadata = { title: "Upload · ReadEase" };

export default function Page() {
  return <UploadPage />;
}
