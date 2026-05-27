import { invoke } from "@tauri-apps/api/core";
import type { BatchResult, OutputFormat } from "./types";

export async function convertFiles(
  files: string[],
  format: OutputFormat,
  quality: number
): Promise<BatchResult> {
  return invoke("convert_files", { files, format, quality });
}

export async function cancelConversion(): Promise<void> {
  return invoke("cancel_conversion");
}

export async function revealOutput(path: string): Promise<void> {
  return invoke("reveal_output", { path });
}
