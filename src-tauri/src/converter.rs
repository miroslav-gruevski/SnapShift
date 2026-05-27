use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConvertError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Conversion failed: {0}")]
    Failed(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Jpeg,
    Png,
    WebP,
    Heic,
}

impl OutputFormat {
    pub fn from_str(s: &str) -> Result<Self, ConvertError> {
        match s.to_lowercase().as_str() {
            "jpeg" | "jpg" => Ok(Self::Jpeg),
            "png" => Ok(Self::Png),
            "webp" => Ok(Self::WebP),
            "heic" | "heif" => Ok(Self::Heic),
            _ => Err(ConvertError::UnsupportedFormat(s.to_string())),
        }
    }

    pub fn extension(&self) -> &str {
        match self {
            Self::Jpeg => "jpg",
            Self::Png => "png",
            Self::WebP => "webp",
            Self::Heic => "heic",
        }
    }

    pub fn label(&self) -> &str {
        match self {
            Self::Jpeg => "JPEG",
            Self::Png => "PNG",
            Self::WebP => "WebP",
            Self::Heic => "HEIC",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ConvertOptions {
    pub format: OutputFormat,
    pub quality: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionProgress {
    pub file: String,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    pub success_count: usize,
    pub error_count: usize,
    pub errors: Vec<String>,
    pub output_dir: String,
    pub total_files: usize,
}

const IMAGE_EXTENSIONS: &[&str] = &[
    "heic", "heif", "avif", "jpg", "jpeg", "png", "webp", "tiff", "tif", "bmp", "gif",
];

const MAX_RECURSE_DEPTH: u32 = 10;

const WINDOWS_RESERVED: &[&str] = &[
    "con", "prn", "aux", "nul",
    "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
    "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
];

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .map(|ext| {
            let ext = ext.to_string_lossy().to_lowercase();
            IMAGE_EXTENSIONS.contains(&ext.as_str())
        })
        .unwrap_or(false)
}

fn same_format(path: &Path, target: &OutputFormat) -> bool {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    match target {
        OutputFormat::Jpeg => ext == "jpg" || ext == "jpeg",
        OutputFormat::Png => ext == "png",
        OutputFormat::WebP => ext == "webp",
        OutputFormat::Heic => ext == "heic" || ext == "heif",
    }
}

fn sanitize_stem(stem: &str) -> String {
    let mut clean: String = stem
        .replace(['/', '\\', '\0', '<', '>', ':', '"', '|', '?', '*'], "_")
        .replace("..", "_")
        .trim()
        .to_string();

    if WINDOWS_RESERVED.contains(&clean.to_lowercase().as_str()) {
        clean = format!("_{}", clean);
    }

    if clean.is_empty() {
        clean = "converted".to_string();
    }

    clean
}

fn unique_output_path(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    let safe_stem = sanitize_stem(stem);
    let candidate = dir.join(format!("{}.{}", safe_stem, ext));
    if !candidate.exists() {
        return candidate;
    }
    for i in 2..=9999u32 {
        let candidate = dir.join(format!("{} ({}).{}", safe_stem, i, ext));
        if !candidate.exists() {
            return candidate;
        }
    }
    dir.join(format!(
        "{} ({}).{}",
        safe_stem,
        chrono::Utc::now().timestamp_millis(),
        ext
    ))
}

fn collect_recursive(
    path: &Path,
    target_format: &OutputFormat,
    depth: u32,
    out: &mut Vec<PathBuf>,
) {
    if depth > MAX_RECURSE_DEPTH {
        log::warn!("Max recursion depth reached at: {}", path.display());
        return;
    }
    if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() && is_image_file(&p) && !same_format(&p, target_format) {
                    out.push(p);
                } else if p.is_dir() {
                    collect_recursive(&p, target_format, depth + 1, out);
                }
            }
        }
    } else if path.is_file() && is_image_file(path) && !same_format(path, target_format) {
        out.push(path.to_path_buf());
    }
}

pub fn collect_image_files(paths: &[PathBuf], target_format: &OutputFormat) -> Vec<PathBuf> {
    let mut files = Vec::new();
    for path in paths {
        collect_recursive(path, target_format, 0, &mut files);
    }
    files
}

#[cfg(target_os = "macos")]
fn convert_single_file(
    input: &Path,
    output: &Path,
    opts: &ConvertOptions,
) -> Result<(), ConvertError> {
    let sips_format = match &opts.format {
        OutputFormat::Jpeg => Some("jpeg"),
        OutputFormat::Png => Some("png"),
        OutputFormat::Heic => Some("heic"),
        OutputFormat::WebP => None,
    };

    if let Some(fmt) = sips_format {
        let mut cmd = std::process::Command::new("sips");
        cmd.args(["-s", "format", fmt]);
        if matches!(&opts.format, OutputFormat::Jpeg | OutputFormat::Heic) {
            cmd.args(["-s", "formatOptions", &opts.quality.to_string()]);
        }
        let result = cmd.arg(input).arg("--out").arg(output).output()?;
        if !result.status.success() {
            return Err(ConvertError::Failed(
                String::from_utf8_lossy(&result.stderr).trim().to_string(),
            ));
        }
    } else {
        match image::open(input) {
            Ok(img) => img.save(output)?,
            Err(_) => {
                let temp = tempfile::NamedTempFile::with_suffix(".tiff")?;
                let result = std::process::Command::new("sips")
                    .args(["-s", "format", "tiff"])
                    .arg(input)
                    .arg("--out")
                    .arg(temp.path())
                    .output()?;
                if !result.status.success() {
                    return Err(ConvertError::Failed(
                        String::from_utf8_lossy(&result.stderr).trim().to_string(),
                    ));
                }
                image::open(temp.path())?.save(output)?;
            }
        }
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn convert_single_file(
    input: &Path,
    output: &Path,
    opts: &ConvertOptions,
) -> Result<(), ConvertError> {
    if matches!(&opts.format, OutputFormat::Heic) {
        return Err(ConvertError::Failed(
            "HEIC encoding is only supported on macOS".into(),
        ));
    }

    let img = match image::open(input) {
        Ok(img) => img,
        Err(_) => decode_with_libheif(input)?,
    };

    match &opts.format {
        OutputFormat::Jpeg => {
            let file = std::fs::File::create(output)?;
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(file, opts.quality);
            img.write_with_encoder(encoder)?;
        }
        OutputFormat::Png | OutputFormat::WebP => img.save(output)?,
        OutputFormat::Heic => unreachable!(),
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn decode_with_libheif(input: &Path) -> Result<image::DynamicImage, ConvertError> {
    let ctx = libheif_rs::HeifContext::read_from_file(
        input
            .to_str()
            .ok_or_else(|| ConvertError::Failed("Invalid path".into()))?,
    )
    .map_err(|e| ConvertError::Failed(e.to_string()))?;

    let handle = ctx
        .primary_image_handle()
        .map_err(|e| ConvertError::Failed(e.to_string()))?;

    let lib_heif = libheif_rs::LibHeif::new();
    let decoded = lib_heif
        .decode(
            &handle,
            libheif_rs::ColorSpace::Rgb(libheif_rs::RgbChroma::Rgb),
            None,
        )
        .map_err(|e| ConvertError::Failed(e.to_string()))?;

    let width = decoded.width() as usize;
    let height = decoded.height() as usize;
    let planes = decoded.planes();
    let interleaved = planes
        .interleaved
        .ok_or_else(|| ConvertError::Failed("No interleaved plane".into()))?;

    let stride = interleaved.stride;
    let mut pixels = Vec::with_capacity(width * height * 3);
    for y in 0..height {
        let start = y * stride;
        let end = start + width * 3;
        pixels.extend_from_slice(&interleaved.data[start..end]);
    }

    image::RgbImage::from_raw(width as u32, height as u32, pixels)
        .map(image::DynamicImage::ImageRgb8)
        .ok_or_else(|| ConvertError::Failed("Failed to create image buffer".into()))
}

pub fn convert_batch_with_cancel<F>(
    files: &[PathBuf],
    output_dir: &Path,
    opts: &ConvertOptions,
    cancel: Arc<AtomicBool>,
    on_progress: F,
) -> BatchResult
where
    F: Fn(ConversionProgress) + Send + Sync,
{
    let total_files = files.len();
    let last_emit = Arc::new(std::sync::Mutex::new(Instant::now()));
    let emit_counter = Arc::new(AtomicUsize::new(0));

    let throttled_progress = |progress: ConversionProgress| {
        let count = emit_counter.fetch_add(1, Ordering::Relaxed);
        let should_emit = if total_files > 50 {
            let mut last = last_emit.lock().unwrap();
            if last.elapsed().as_millis() >= 100
                || progress.status == "done"
                || progress.status == "error"
            {
                *last = Instant::now();
                true
            } else {
                count % 5 == 0
            }
        } else {
            true
        };
        if should_emit {
            on_progress(progress);
        }
    };

    let results: Vec<Result<(), String>> = files
        .par_iter()
        .map(|input| {
            if cancel.load(Ordering::Relaxed) {
                return Err("Cancelled".to_string());
            }

            let display_name = input
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let stem = input
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let output_path = unique_output_path(output_dir, &stem, opts.format.extension());

            throttled_progress(ConversionProgress {
                file: display_name.clone(),
                status: "processing".to_string(),
                error: None,
            });

            if cancel.load(Ordering::Relaxed) {
                return Err("Cancelled".to_string());
            }

            let start = Instant::now();
            let result = convert_single_file(input, &output_path, opts);
            let elapsed = start.elapsed();

            match result {
                Ok(()) => {
                    log::info!(
                        "Converted {} -> {} ({:.1}ms)",
                        display_name,
                        output_path.file_name().unwrap_or_default().to_string_lossy(),
                        elapsed.as_secs_f64() * 1000.0
                    );
                    throttled_progress(ConversionProgress {
                        file: display_name,
                        status: "done".to_string(),
                        error: None,
                    });
                    Ok(())
                }
                Err(e) => {
                    let msg = e.to_string();
                    log::error!("Failed to convert {}: {}", display_name, msg);
                    throttled_progress(ConversionProgress {
                        file: display_name,
                        status: "error".to_string(),
                        error: Some(msg.clone()),
                    });
                    Err(msg)
                }
            }
        })
        .collect();

    let success_count = results.iter().filter(|r| r.is_ok()).count();
    let errors: Vec<String> = results
        .into_iter()
        .filter_map(|r| r.err())
        .filter(|e| e != "Cancelled")
        .collect();

    log::info!(
        "Batch complete: {} succeeded, {} failed, {} total",
        success_count,
        errors.len(),
        total_files
    );

    BatchResult {
        success_count,
        error_count: errors.len(),
        errors,
        output_dir: output_dir.to_string_lossy().to_string(),
        total_files,
    }
}
