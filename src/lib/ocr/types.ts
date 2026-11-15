export type ExtractionStage = "loading-document" | "rendering-page" | "recognizing-text";

export type ExtractionProgress = {
  stage: ExtractionStage;
  currentPage: number;
  totalPages: number;
  progress: number;
  message: string;
};
