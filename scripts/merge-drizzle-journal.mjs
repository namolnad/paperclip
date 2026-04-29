#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const [, , , oursPath, theirsPath] = process.argv;
if (!oursPath || !theirsPath) {
  console.error("usage: merge-drizzle-journal.mjs <base> <ours> <theirs>");
  process.exit(2);
}

const ours = JSON.parse(readFileSync(oursPath, "utf8"));
const theirs = JSON.parse(readFileSync(theirsPath, "utf8"));

const oursTags = new Set(ours.entries.map((e) => e.tag));
const newFromTheirs = theirs.entries.filter((e) => !oursTags.has(e.tag));

const merged = {
  ...ours,
  entries: [...ours.entries, ...newFromTheirs],
};

writeFileSync(oursPath, JSON.stringify(merged, null, 2) + "\n");
process.exit(0);
