/**
 * FaceSense AI Frontend Structured Logging Utility
 * Provides timestamps, log levels, biometric pipeline timing, and console styling.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "#8b5cf6", // Purple
  info: "#0284c7",  // Blue
  warn: "#f59e0b",  // Amber
  error: "#ef4444", // Red
};

const timers = new Map<string, number>();

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    import.meta.env.DEV ||
    window.localStorage.getItem("facesense_debug") === "true" ||
    window.location.search.includes("debug=true")
  );
}

function formatTime(): string {
  const d = new Date();
  return d.toTimeString().split(" ")[0] + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function print(level: LogLevel, tag: string, message: string, ...args: unknown[]) {
  if (level === "debug" && !isDebugEnabled()) return;

  const color = LEVEL_COLORS[level];
  const time = formatTime();
  const prefix = `%c[FaceSense ${time}]%c %c[${level.toUpperCase()}]%c %c[${tag}]%c ${message}`;
  const styles = [
    "color: #64748b; font-weight: normal;",
    "",
    `color: ${color}; font-weight: bold;`,
    "",
    "color: #0d9488; font-weight: bold;",
    "",
  ];

  if (level === "error") {
    console.error(prefix, ...styles, ...args);
  } else if (level === "warn") {
    console.warn(prefix, ...styles, ...args);
  } else if (level === "info") {
    console.info(prefix, ...styles, ...args);
  } else {
    console.debug(prefix, ...styles, ...args);
  }
}

export const logger = {
  debug(tag: string, message: string, ...args: unknown[]) {
    print("debug", tag, message, ...args);
  },

  info(tag: string, message: string, ...args: unknown[]) {
    print("info", tag, message, ...args);
  },

  warn(tag: string, message: string, ...args: unknown[]) {
    print("warn", tag, message, ...args);
  },

  error(tag: string, message: string, ...args: unknown[]) {
    print("error", tag, message, ...args);
  },

  time(tag: string, label: string) {
    const key = `${tag}:${label}`;
    timers.set(key, performance.now());
  },

  timeEnd(tag: string, label: string) {
    const key = `${tag}:${label}`;
    const start = timers.get(key);
    if (start !== undefined) {
      const elapsed = (performance.now() - start).toFixed(2);
      timers.delete(key);
      print("info", tag, `⏱️ ${label} took ${elapsed}ms`);
    }
  },

  enableDebug(enabled: boolean = true) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("facesense_debug", enabled ? "true" : "false");
      console.info(`[FaceSense] Debug logging ${enabled ? "enabled" : "disabled"}.`);
    }
  },
};
