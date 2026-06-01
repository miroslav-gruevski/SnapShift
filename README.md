# SnapShift

A minimal tray app for fast batch image conversion. Drop files or folders, pick an output format, and get converted images on your Desktop.

Repository: https://github.com/miroslav-gruevski/SnapShift

**Latest release:** [v0.1.7](https://github.com/miroslav-gruevski/SnapShift/releases/latest) for macOS, Windows, and Linux.

## Install

Choose your system below. If you are not technical, use the normal download option.

| System | Best option for most people | If you use Terminal |
|--------|-----------------------------|---------------------|
| macOS Apple Silicon (M1/M2/M3/M4) | Download `SnapShift_0.1.7_aarch64.dmg` | `brew install --cask miroslav-gruevski/snapshift/snapshift` |
| macOS Intel | Download `SnapShift_0.1.7_x64.dmg` | `brew install --cask miroslav-gruevski/snapshift/snapshift` |
| Windows | Download `SnapShift_0.1.7_x64_en-US.msi` | `scoop bucket add snapshift https://github.com/miroslav-gruevski/scoop-snapshift` then `scoop install snapshift` |
| Linux | Download `.deb`, `.rpm`, or `.AppImage` | Same files, installed from Terminal |

Downloads are on the [Releases page](https://github.com/miroslav-gruevski/SnapShift/releases/latest).

SnapShift is currently unsigned because this is a free release. macOS and Windows may show one security warning the first time you open it. The steps below show exactly what to click. After the first approval, SnapShift should open normally and update itself in the app.

### macOS

#### Normal download

1. Open the [latest release](https://github.com/miroslav-gruevski/SnapShift/releases/latest).
2. Download the right DMG:
   - **Apple Silicon (M1/M2/M3/M4):** `SnapShift_0.1.7_aarch64.dmg`
   - **Intel Mac:** `SnapShift_0.1.7_x64.dmg`
3. Open the downloaded `.dmg`.
4. Drag **SnapShift** into **Applications**.
5. Open **Applications** and double-click **SnapShift**.

SnapShift is a menu bar app. It may not stay in the Dock. Look for the SnapShift icon near the clock in the top-right menu bar.

#### If macOS says Apple could not verify the app

This is expected for free unsigned Mac builds.

1. Click **Done** in the warning dialog. If the dialog offers **Move to Bin**, choose **Cancel** instead.
2. Open **System Settings**.
3. Go to **Privacy & Security**.
4. Scroll down to the **Security** section.
5. Look for a message about **SnapShift** being blocked.
6. Click **Open Anyway**.
7. Confirm with Touch ID or your password.
8. Open **SnapShift** again from Applications.

You should only need to do this once.

#### If Open Anyway does not appear

Open **Terminal** and run:

```bash
sudo xattr -dr com.apple.quarantine /Applications/SnapShift.app
codesign --force --deep --sign - /Applications/SnapShift.app
open -a SnapShift
```

Your Mac may ask for your password after the first command. That is normal.

#### Homebrew install

If you already use Homebrew:

```bash
brew install --cask miroslav-gruevski/snapshift/snapshift
open -a SnapShift
```

Homebrew installs SnapShift into Applications, but macOS can still require the same **Privacy & Security -> Open Anyway** approval on first launch.

### Windows

#### Normal download

1. Open the [latest release](https://github.com/miroslav-gruevski/SnapShift/releases/latest).
2. Download `SnapShift_0.1.7_x64_en-US.msi`.
3. Open the downloaded installer.
4. Follow the installer steps.
5. Start SnapShift from the Start menu.

SnapShift runs in the system tray. Look near the clock in the bottom-right corner. If you do not see it, click the small arrow to show hidden tray icons.

#### If Windows shows SmartScreen

Windows may show **Windows protected your PC** because SnapShift is currently unsigned.

1. Click **More info**.
2. Click **Run anyway**.
3. Continue the installer.

You should only need to do this once for the installer.

#### Scoop install

If you already use Scoop:

```powershell
scoop bucket add snapshift https://github.com/miroslav-gruevski/scoop-snapshift
scoop install snapshift
```

### Linux

Open the [latest release](https://github.com/miroslav-gruevski/SnapShift/releases/latest), then choose the file for your distro.

#### Debian / Ubuntu

```bash
sudo dpkg -i SnapShift_*_amd64.deb
sudo apt-get install -f
```

#### Fedora / RHEL

```bash
sudo rpm -i SnapShift-*.x86_64.rpm
```

#### AppImage (most Linux distros)

```bash
chmod +x SnapShift_*_amd64.AppImage
./SnapShift_*_amd64.AppImage
```

SnapShift uses the system tray. On GNOME, you may need an AppIndicator/tray extension.

## Where To Find SnapShift After Installing

| System | Where it appears |
|--------|------------------|
| macOS | Menu bar, top-right near the clock |
| Windows | System tray, bottom-right near the clock |
| Linux | System tray or app indicator area |

SnapShift does not open a big normal window at startup. Click the tray/menu bar icon to open the converter.

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

## Auto-updates

Once installed, SnapShift checks for new releases on startup using Tauri's updater plugin. New versions are downloaded, signed-verified, installed, and the app restarts. Users never need to re-visit the Releases page after the first install.

The update manifest is `latest.json` published on every GitHub Release. Updates are verified against an Ed25519 public key embedded in the app; the private key is held only in the `TAURI_SIGNING_PRIVATE_KEY` repo secret.

## Code signing (optional, paid)

CI builds work without any certificates. If you ever buy a paid signing certificate, the existing workflow picks it up automatically and downloads become warning-free.

| Platform | Free unsigned (default today) | Signed (paid certificate) |
|----------|-------------------------------|---------------------------|
| macOS | One-time right-click -> Open, or `xattr` fallback | No prompt; notarized DMG |
| Windows | SmartScreen -> More info -> Run anyway | No prompt once reputation builds |
| Linux | Install directly | n/a |

To enable paid signing:

1. **Settings -> Secrets and variables -> Actions -> Variables**: set `SIGN_RELEASES = true`.
2. Add secrets:

   | Secret | Used for |
   |--------|----------|
   | `APPLE_CERTIFICATE` | Base64 `.p12` (Developer ID Application) |
   | `APPLE_CERTIFICATE_PASSWORD` | `.p12` export password |
   | `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
   | `APPLE_ID` | Apple ID email |
   | `APPLE_PASSWORD` | [App-specific password](https://appleid.apple.com) for notary |
   | `APPLE_TEAM_ID` | 10-character Team ID |
   | `KEYCHAIN_PASSWORD` | Random strong password used by CI keychain |
   | `WINDOWS_CERTIFICATE` | Base64 `.pfx` (Authenticode) |
   | `WINDOWS_CERTIFICATE_PASSWORD` | `.pfx` password |

3. Push a tag. CI signs and notarizes via [tauri-action](https://github.com/tauri-apps/tauri-action).

## Releasing (maintainers)

CI builds installers when you push a version tag. Releases start as **drafts** until you publish them on GitHub.

### One-time setup

1. **Tauri updater key** (required for any future updates to work):

   ```bash
   npm run tauri signer generate -- -w ~/.tauri/snapshift.key
   ```

   Copy the contents of `~/.tauri/snapshift.key` into repo secret `TAURI_SIGNING_PRIVATE_KEY`. Keep `~/.tauri/snapshift.key` backed up safely; losing it breaks updates for every existing install.

2. **Homebrew tap + Scoop bucket** (optional, for one-line installs):
   - Create two empty public repos: `miroslav-gruevski/homebrew-snapshift` and `miroslav-gruevski/scoop-snapshift`.
   - Create a fine-grained PAT with `Contents: Read and write` on those two repos; store it as repo secret `PACKAGE_MANAGER_TOKEN`.
   - Set variable `PUBLISH_PACKAGE_MANAGERS = true`.

### Every release

1. Bump `version` in [`package.json`](package.json), [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json), and [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml).
2. Commit and push to `main`.
3. Tag and push:

   ```bash
   git tag v0.1.7
   git push origin v0.1.7
   ```

4. Wait for [Actions](https://github.com/miroslav-gruevski/SnapShift/actions): all four `Build (...)` jobs, plus `Publish updater manifest`, plus (if enabled) `Bump Homebrew tap` and `Bump Scoop bucket`.
5. Open [Releases](https://github.com/miroslav-gruevski/SnapShift/releases), open the draft, verify `latest.json` is attached, then click **Publish release**.

To run a build without a tag: **Actions -> Build & Release -> Run workflow** (`workflow_dispatch`).

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/miroslav-gruevski/SnapShift). For larger changes, open an issue first.

## License

[MIT](LICENSE) — Copyright (c) 2026 Miro
