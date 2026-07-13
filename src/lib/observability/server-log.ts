type ServerLogLevel = "error" | "warn";

const DD_SERVICE = "room-tba";

function logsIntakeUrl(site: string): string {
  const normalized = site.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://http-intake.logs.${normalized}/api/v2/logs`;
}

function formatArg(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function shouldForwardServerLogs(): boolean {
  return (
    Boolean(process.env.DD_API_KEY?.trim()) &&
    process.env.VERCEL_ENV === "production"
  );
}

async function postLog(status: ServerLogLevel, message: string): Promise<void> {
  const apiKey = process.env.DD_API_KEY?.trim();
  if (!apiKey) return;

  const site = process.env.DD_SITE?.trim() || "us5.datadoghq.com";

  try {
    await fetch(logsIntakeUrl(site), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey,
      },
      body: JSON.stringify([
        {
          ddsource: "vercel",
          service: DD_SERVICE,
          status,
          message,
          ddtags: `env:production,service:${DD_SERVICE}`,
        },
      ]),
    });
  } catch {
    // ponytail: observability must not break request handling
  }
}

function forwardConsoleArgs(
  status: ServerLogLevel,
  original: (...args: unknown[]) => void,
  args: unknown[],
): void {
  original(...args);
  if (!shouldForwardServerLogs()) return;

  const message = args.map(formatArg).join(" ");
  void postLog(status, message);
}

let installed = false;

export function installServerLogForwarder(): void {
  if (installed || !shouldForwardServerLogs()) return;
  installed = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    forwardConsoleArgs("error", originalError, args);
  };
  console.warn = (...args: unknown[]) => {
    forwardConsoleArgs("warn", originalWarn, args);
  };
}
