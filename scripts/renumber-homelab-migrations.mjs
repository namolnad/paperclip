#!/usr/bin/env node
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const upstreamJournalPath = process.argv[2];
if (!upstreamJournalPath) {
  console.error("usage: renumber-homelab-migrations.mjs <upstream-journal-path>");
  process.exit(2);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const journalPath = resolve(repoRoot, "packages/db/src/migrations/meta/_journal.json");
const migrationsDir = resolve(repoRoot, "packages/db/src/migrations");

const journal = JSON.parse(await readFile(journalPath, "utf8"));
const upstream = JSON.parse(await readFile(upstreamJournalPath, "utf8"));

const upstreamTags = new Set(upstream.entries.map((e) => e.tag));
const homelabEntries = journal.entries.filter((e) => !upstreamTags.has(e.tag));

if (homelabEntries.length === 0) {
  console.log("No homelab-only migrations to renumber.");
  process.exit(0);
}

const upstreamMaxIdx = Math.max(...upstream.entries.map((e) => e.idx));
let nextIdx = upstreamMaxIdx + 1;

for (const entry of homelabEntries) {
  const oldTag = entry.tag;
  const match = oldTag.match(/^(\d{4})_(.+)$/);
  if (!match) {
    console.error(`Unexpected tag format: ${oldTag}`);
    process.exit(2);
  }
  const newPrefix = String(nextIdx).padStart(4, "0");
  const newTag = `${newPrefix}_${match[2]}`;

  if (oldTag !== newTag) {
    await rename(
      resolve(migrationsDir, `${oldTag}.sql`),
      resolve(migrationsDir, `${newTag}.sql`),
    );
    console.log(`Renumbered: ${oldTag}.sql -> ${newTag}.sql`);
  }

  entry.idx = nextIdx;
  entry.tag = newTag;
  nextIdx += 1;
}

journal.entries.sort((a, b) => a.idx - b.idx);

await writeFile(journalPath, JSON.stringify(journal, null, 2) + "\n");
console.log(`Updated journal with ${homelabEntries.length} renumbered entries.`);
