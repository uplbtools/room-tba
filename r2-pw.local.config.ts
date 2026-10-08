import base from "./playwright.config";

const executablePath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default {
  ...base,
  testDir: "/home/user/room-tba/.claude/worktrees/agent-abbd41174d28ad3ec/e2e",
  outputDir:
    "/tmp/claude-0/-home-user-room-tba/0859d2bd-acf9-505c-9554-6f2a0435a5ef/scratchpad/r2-pw-results",
  reporter: [["list"]],
  webServer: undefined,
  workers: 3,
  projects: (base.projects ?? []).map((p) => ({
    ...p,
    use: { ...p.use, launchOptions: { executablePath } },
  })),
};
