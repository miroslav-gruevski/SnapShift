import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (!update) return;

    const accepted = window.confirm(
      `A SnapShift update is ready.\n\nVersion ${update.version} will install now and SnapShift will restart.\n\nUpdate now?`
    );
    if (!accepted) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.error("updater check failed:", err);
  }
}
