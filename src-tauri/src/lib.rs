mod converter;

use converter::{BatchResult, ConversionProgress, ConvertOptions, OutputFormat};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder,
};

struct CancelFlag(Arc<AtomicBool>);

fn load_tray_icon() -> tauri::image::Image<'static> {
    let png_bytes = include_bytes!("../icons/tray-icon.png");
    let img = image::load_from_memory(png_bytes).expect("tray icon missing from build");
    let rgba = img.to_rgba8();
    let (w, h) = (rgba.width(), rgba.height());
    tauri::image::Image::new_owned(rgba.into_raw(), w, h)
}

#[tauri::command]
async fn convert_files(
    app: AppHandle,
    cancel_flag: State<'_, CancelFlag>,
    files: Vec<String>,
    format: String,
    quality: u8,
) -> Result<BatchResult, String> {
    let output_format = OutputFormat::from_str(&format).map_err(|e| e.to_string())?;
    let quality = quality.clamp(1, 100);

    let folder_label = output_format.label();

    let opts = ConvertOptions {
        format: output_format.clone(),
        quality,
    };

    let paths: Vec<PathBuf> = files.iter().map(PathBuf::from).collect();
    let image_files = converter::collect_image_files(&paths, &output_format);

    if image_files.is_empty() {
        log::info!("No files to convert for target format {}", folder_label);
        let result = BatchResult {
            success_count: 0,
            error_count: 0,
            errors: vec![],
            output_dir: String::new(),
            total_files: 0,
        };
        app.emit("conversion-complete", &result).ok();
        return Ok(result);
    }

    let desktop = dirs::desktop_dir().ok_or("Could not find Desktop directory")?;
    let mut output_dir = desktop.join(format!("Converted to {}", folder_label));
    let mut suffix = 1u32;
    while output_dir.exists() {
        suffix += 1;
        output_dir = desktop.join(format!("Converted to {} {}", folder_label, suffix));
    }
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    log::info!(
        "Starting conversion: {} files -> {} (q{})",
        image_files.len(),
        folder_label,
        quality
    );

    for f in &image_files {
        let name = f
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        app.emit(
            "conversion-progress",
            ConversionProgress {
                file: name,
                status: "queued".to_string(),
                error: None,
            },
        )
        .ok();
    }

    let cancel = cancel_flag.0.clone();
    cancel.store(false, Ordering::Relaxed);

    let app_clone = app.clone();
    let files_for_batch = image_files;
    let result = tauri::async_runtime::spawn_blocking(move || {
        converter::convert_batch_with_cancel(&files_for_batch, &output_dir, &opts, cancel, |progress| {
            app_clone.emit("conversion-progress", &progress).ok();
        })
    })
    .await
    .map_err(|e| e.to_string())?;

    if result.success_count > 0 {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("afplay")
                .arg("/System/Library/Sounds/Glass.aiff")
                .spawn()
                .ok();
        }
    }

    app.emit("conversion-complete", &result).ok();
    Ok(result)
}

#[tauri::command]
fn cancel_conversion(cancel_flag: State<'_, CancelFlag>) -> Result<(), String> {
    log::info!("Conversion cancelled by user");
    cancel_flag.0.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn reveal_output(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);

    // Validate: only allow opening directories under Desktop
    let desktop = dirs::desktop_dir().ok_or("No Desktop directory")?;
    if !path_buf.starts_with(&desktop) {
        log::warn!("Blocked reveal_output for path outside Desktop: {}", path);
        return Err("Path must be under Desktop".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn toggle_overlay(app: &AppHandle, tray_rect: Option<tauri::Rect>) {
    let win_w = 340.0_f64;

    let scale = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(2.0);

    let position = tray_rect.map(|rect| {
        let pos = rect.position.to_logical::<f64>(scale);
        let sz = rect.size.to_logical::<f64>(scale);
        let x = pos.x - win_w / 2.0 + sz.width / 2.0;
        let y = pos.y + sz.height + 4.0;
        (x.max(8.0), y.max(28.0))
    });

    if let Some(window) = app.get_webview_window("overlay") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            if let Some((x, y)) = position {
                let _ = window.set_position(tauri::Position::Logical(
                    tauri::LogicalPosition::new(x, y),
                ));
            }
            let _ = window.show();
            let _ = window.set_focus();
        }
    } else {
        let effects = tauri::utils::config::WindowEffectsConfig {
            effects: vec![tauri::window::Effect::UltraDark],
            state: Some(tauri::window::EffectState::Active),
            radius: Some(14.0),
            color: None,
        };

        let mut builder =
            WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("index.html".into()))
                .title("SnapShift")
                .inner_size(win_w, 460.0)
                .min_inner_size(300.0, 300.0)
                .max_inner_size(520.0, 900.0)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .resizable(true)
                .skip_taskbar(true)
                .visible(true)
                .effects(effects);

        if let Some((x, y)) = position {
            builder = builder.position(x, y);
        } else {
            builder = builder.center();
        }

        let _ = builder.build();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();

    log::info!("Starting SnapShift v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .manage(CancelFlag(Arc::new(AtomicBool::new(false))))
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let quit =
                MenuItem::with_id(app, "quit", "Quit SnapShift", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            let icon = load_tray_icon();

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("SnapShift")
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        toggle_overlay(tray.app_handle(), Some(rect));
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            convert_files,
            cancel_conversion,
            reveal_output,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
