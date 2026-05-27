# SnapShift

A minimal tray app for fast batch image conversion. Drop files or folders, pick an output format, and get converted images on your Desktop.

Repository: https://github.com/miroslav-gruevski/SnapShift

## Download

Installers are published on [GitHub Releases](https://github.com/miroslav-gruevski/SnapShift/releases). Pick the file that matches your system. Asset names include the version (for example `SnapShift_0.1.0_…`).

| Platform | Where to download | File to look for |
|----------|-------------------|------------------|
| macOS (Apple Silicon) | [Releases](https://github.com/miroslav-gruevski/SnapShift/releases) | `.dmg` with `aarch64` or `arm64` in the name |
| macOS (Intel) | [Releases](https://github.com/miroslav-gruevski/SnapShift/releases) | `.dmg` with `x64` or `x86_64` in the name |
| Windows | [Releases](https://github.com/miroslav-gruevski/SnapShift/releases) | `.msi` (recommended) or `.exe` setup |
| Linux | [Releases](https://github.com/miroslav-gruevski/SnapShift/releases) | `.deb` or `.AppImage` |

If the Releases page is empty, no build has been published yet. See [Releasing (maintainers)](#releasing-maintainers) below.

## Install

### macOS

1. Download the `.dmg` for your Mac: **Apple Silicon** (M1/M2/M3) or **Intel**.
2. Open the DMG and drag **SnapShift** into **Applications**.
3. Open SnapShift from Applications. It runs from the menu bar (tray), not the Dock.
4. If macOS blocks the app (“unidentified developer”): right-click the app → **Open** → confirm. Or go to **System Settings → Privacy & Security** and allow SnapShift.

### Windows

1. Download the `.msi` installer (recommended) or the `.exe` setup from Releases.
2. Run the installer and follow the prompts.
3. If Windows SmartScreen appears, choose **More info** → **Run anyway** (the app is not signed with a commercial certificate yet).
4. After install, find **SnapShift** in the system tray (notification area). Click the icon to open the conversion window.

### Linux

**Debian / Ubuntu (.deb)**

```bash
sudo dpkg -i SnapShift_*_amd64.deb
sudo apt-get install -f
```

Replace the filename with the `.deb` you downloaded from Releases.

**AppImage (most distros)**

```bash
chmod +x SnapShift_*_amd64.AppImage
./SnapShift_*_amd64.AppImage
```

You can move the AppImage anywhere and run it from a terminal or file manager. Tray integration depends on your desktop environment.

## Using SnapShift

1. Click the **SnapShift** icon in the menu bar (macOS/Linux) or system tray (Windows).
2. Drag images or folders onto the window, or click **browse files**.
3. Choose output format: JPEG, PNG, WebP, or HEIC (macOS only).
4. Converted files are saved on your Desktop in a folder like `Converted to JPEG` (or `Converted to JPEG 2` if that folder already exists).
5. When done, use **Open Folder** or start a new batch with **New**.

## Features

- Tray-only workflow: no main window until you open it from the tray
- Drag and drop files or folders, including nested folders
- Browse files via the system file picker
- Parallel batch conversion for large sets
- Skips files already in the target format and shows a warning
- All processing is local: no network, no telemetry

## Supported formats

**Input:** HEIC, HEIF, AVIF, JPEG, PNG, WebP, TIFF, BMP, GIF

**Output:** JPEG, PNG, WebP, HEIC (macOS only)

**How conversion works**

- **macOS** uses the built-in `sips` tool. No extra installs.
- **Windows and Linux** use [libheif](https://github.com/strukturag/libheif) for HEIC/HEIF where needed; other formats use the Rust `image` crate.

## Security and privacy

- Path sanitization blocks unsafe filenames and traversal
- “Open folder” only opens paths under your Desktop
- Content Security Policy limits webview scripts
- No data leaves your device

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/)
- **macOS:** Xcode Command Line Tools
- **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the C++ workload
- **Linux:** `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libgtk-3-dev`, `libheif-dev`

### Commands

```bash
git clone https://github.com/miroslav-gruevski/SnapShift.git
cd SnapShift
npm install
npm run tauri dev
npm run tauri build
```

Release installers are written to `src-tauri/target/release/bundle/`.

On macOS, if the build fails on the Xcode license: `sudo xcodebuild -license accept`

## Releasing (maintainers)

CI builds installers when you push a version tag. Releases start as **drafts** until you publish them on GitHub.

1. Bump `version` in [`package.json`](package.json), [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json), and [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) if needed.
2. Commit and push to `main`.
3. Tag and push:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. Open [Actions](https://github.com/miroslav-gruevski/SnapShift/actions) and wait for all four jobs (macOS ARM, macOS Intel, Linux, Windows) to finish.
5. Open [Releases](https://github.com/miroslav-gruevski/SnapShift/releases), open the draft for that tag, check the uploaded `.dmg`, `.msi`, `.exe`, `.deb`, and `.AppImage` files, then click **Publish release**.

Downloads only appear for everyone after the draft is published.

To run a build without a tag: **Actions → Build & Release → Run workflow** (`workflow_dispatch`).

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/miroslav-gruevski/SnapShift). For larger changes, open an issue first.

## License

[MIT](LICENSE) — Copyright (c) 2026 Miro
