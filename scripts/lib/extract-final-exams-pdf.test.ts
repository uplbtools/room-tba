import { expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("keeps a course with a digit in its prefix out of the previous room list", () => {
  const dir = mkdtempSync(join(tmpdir(), "finals-extract-"));
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "data"));
    cpSync(
      new URL("../extract-final-exams-pdf.ts", import.meta.url),
      join(dir, "scripts/extract.ts"),
    );
    writeFileSync(join(dir, "pdftotext"), '#!/bin/sh\ncat "$2"\n', {
      mode: 0o755,
    });
    const fixture = join(dir, "finals.txt");
    writeFileSync(
      fixture,
      [
        "THURSDAY, DECEMBER 03 (THIRD DAY)",
        "SFFG 180         SFFG 7           10:00 - 12:00",
        "SF1 104          IRNR 301",
        "ChE 185          ChE SR",
        "CHEM 111.1       PSLH A,",
        "                 RINR 271A",
      ].join("\n"),
    );
    const result = Bun.spawnSync(
      [
        process.execPath,
        join(dir, "scripts/extract.ts"),
        fixture,
        "--term-id",
        "1261",
        "--source",
        "fixture",
        "--year",
        "2026",
      ],
      { env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } },
    );
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(
      readFileSync(join(dir, "data/final-exams-1261.json"), "utf8"),
    );
    expect(
      payload.exams.map((row: { course_code: string; room_code: string }) => [
        row.course_code,
        row.room_code,
      ]),
    ).toEqual([
      ["SFFG 180", "SFFG 7"],
      ["SF1 104", "IRNR 301"],
      ["ChE 185", "ChE SR"],
      ["CHEM 111.1", "PSLH A"],
      ["CHEM 111.1", "RINR 271A"],
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
