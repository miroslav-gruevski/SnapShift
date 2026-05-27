import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (!update) return;

    const accepted = window.confirm(
      `SnapShift ${update.version} is available.\n\n${update.body ?? ""}\n\nInstall and restart now?`
    );
    if (!accepted) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.error("updater check failed:", err);
  }
}
