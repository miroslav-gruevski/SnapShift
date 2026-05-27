export type OutputFormat = "jpeg" | "png" | "webp" | "heic";

export type JobStatus = "queued" | "processing" | "done" | "error";

export interface Job {
  id: string;
  fileName: string;
  status: JobStatus;
  error?: string;
}

export interface ConversionProgress {
  file: string;
  status: string;
  error?: string;
}

export interface BatchResult {
  success_count: number;
  error_count: number;
  errors: string[];
  output_dir: string;
  total_files: number;
}

export const FORMATS: {
  value: OutputFormat;
  label: string;
  extension: string;
}[] = [
  { value: "jpeg", label: "JPEG", extension: ".jpg" },
  { value: "png", label: "PNG", extension: ".png" },
  { value: "webp", label: "WebP", extension: ".webp" },
  { value: "heic", label: "HEIC", extension: ".heic" },
];

export const FORMAT_LABELS: Record<OutputFormat, string> = Object.fromEntries(
  FORMATS.map((f) => [f.value, f.label])
) as Record<OutputFormat, string>;

export function isMacOS(): boolean {
  const platform = navigator.platform.toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  return platform.includes("mac") || ua.includes("mac");
}

export function getAvailableFormats() {
  return isMacOS() ? FORMATS : FORMATS.filter((f) => f.value !== "heic");
}
