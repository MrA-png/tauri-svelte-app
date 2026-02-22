/**
 * logger.ts
 * Utility logger yang menulis ke file system.log via Tauri command.
 * Juga mengintersep console.log / console.warn / console.error sehingga
 * semua aktivitas otomatis tersimpan ke file.
 */

import { invoke } from "@tauri-apps/api/core";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

let isTauriAvailable = false;

// Cek apakah berjalan dalam konteks Tauri
try {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        isTauriAvailable = true;
    }
} catch (_) { }

/**
 * Tulis satu baris log ke system.log via Tauri command.
 */
async function writeToFile(level: LogLevel, message: string): Promise<void> {
    if (!isTauriAvailable) return;
    try {
        await invoke("write_log", { level, message });
    } catch (_) {
        // Jangan throw — jangan sampai logger sendiri yang crash app
    }
}

/**
 * Format argumen console menjadi satu string.
 */
function formatArgs(args: any[]): string {
    return args
        .map((a) => {
            if (typeof a === "object") {
                try {
                    return JSON.stringify(a);
                } catch (_) {
                    return String(a);
                }
            }
            return String(a);
        })
        .join(" ");
}

const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

/**
 * Instalasi logger: intersep console.log / warn / error.
 * Panggil sekali di onMount aplikasi utama.
 */
export function initLogger(): void {
    console.log = (...args: any[]) => {
        _origLog(...args);
        writeToFile("INFO", formatArgs(args));
    };

    console.warn = (...args: any[]) => {
        _origWarn(...args);
        writeToFile("WARN", formatArgs(args));
    };

    console.error = (...args: any[]) => {
        _origError(...args);
        writeToFile("ERROR", formatArgs(args));
    };

    // Log pertama sebagai marker startup
    console.log("[Logger] system.log initialized.");
}

/**
 * Tulis log secara eksplisit (tanpa lewat console).
 */
export async function log(level: LogLevel, message: string): Promise<void> {
    await writeToFile(level, message);
}
