#!/usr/bin/env bun
import { $ } from "bun";
import { featureTestRetirementFailures } from "../src/lib/ci/feature-test-retirement";

const base = process.env.TEST_RETIREMENT_BASE?.trim();

if (!base || /^0+$/.test(base)) {
  console.log("feature-test-retirement: no base SHA; skipped");
  process.exit(0);
}

const output =
  await $`git diff --name-status --find-renames ${base} HEAD`.text();
const changedFiles = output
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, ...paths] = line.split("\t");
    return { status, path: paths.at(-1) ?? "" };
  });
const failures = featureTestRetirementFailures(changedFiles);

if (failures.length > 0) {
  console.error("Feature retirement check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("feature-test-retirement: coverage lifecycle checked");
