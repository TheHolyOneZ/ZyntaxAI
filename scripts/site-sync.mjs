#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "zyntaxai");
const RELEASES = path.join(SITE, "releases");
const MANIFEST = path.join(SITE, "latest.json");

const USAGE = `
site-sync — put built installers into the landing page and merge the manifests

  node scripts/site-sync.mjs [path ...]

Each path may be a directory, a single file, or a .zip built by CI — zips are
unpacked automatically. With no arguments it uses dist/release, which is where
\`pnpm release\` leaves a local build.

It copies every installer into zyntaxai/releases/<version>/, merges any
latest.json / latest-<target>.json it finds into zyntaxai/latest.json, keeping
platform entries that are already there, and regenerates SHA256SUMS.

Typical use after a CI build, with the zips downloaded into Builds/ and the
Linux build made locally:

  node scripts/site-sync.mjs Builds dist/release

Then upload zyntaxai/ — the release files first, latest.json last.
`;

const INSTALLERS = [".AppImage", ".deb", ".rpm", ".msi", ".exe", ".dmg", ".tar.gz", ".sig"];

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}

const inputs = args.length > 0 ? args : [path.join(ROOT, "dist", "release")];
const files = inputs.flatMap(collect);

if (files.length === 0) fail(`nothing found in: ${inputs.join(", ")}`);

const manifests = files
  .filter((file) => /^latest(-[a-z0-9_.-]+)?\.json$/i.test(path.basename(file)))
  .map((file) => ({ file, data: readJson(file) }))
  .filter((entry) => entry.data && entry.data.version);

const installers = files.filter((file) => INSTALLERS.some((ext) => file.endsWith(ext)));

if (installers.length === 0 && manifests.length === 0) {
  fail("found no installers and no manifests — is that the right directory?");
}

const versions = new Set(manifests.map((entry) => entry.data.version));
if (versions.size > 1) {
  fail(`the manifests disagree on the version: ${[...versions].join(", ")}`);
}

const version =
  versions.size === 1
    ? [...versions][0]
    : JSON.parse(fs.readFileSync(path.join(ROOT, "src-tauri", "tauri.conf.json"), "utf8")).version;

const versionDir = path.join(RELEASES, version);
fs.mkdirSync(versionDir, { recursive: true });

let copied = 0;
for (const file of installers) {
  const target = path.join(versionDir, path.basename(file));
  if (fs.existsSync(target) && sha256(target) === sha256(file)) continue;
  fs.copyFileSync(file, target);
  copied++;
  console.log(`  + ${path.basename(file)}`);
}

let merged = readJson(MANIFEST);
if (!merged || merged.version !== version) {
  merged = { version, notes: "", pub_date: new Date().toISOString(), platforms: {} };
}
merged.platforms = merged.platforms ?? {};

const before = Object.keys(merged.platforms).length;
for (const { data } of manifests) {
  for (const [target, entry] of Object.entries(data.platforms ?? {})) {
    merged.platforms[target] = entry;
  }
  if (data.notes) merged.notes = data.notes;
  if (data.pub_date) merged.pub_date = data.pub_date;
}

for (const [target, entry] of Object.entries(merged.platforms)) {
  const name = decodeURIComponent(entry.url.split("/").pop());
  if (!fs.existsSync(path.join(versionDir, name))) {
    console.warn(`  ! ${target} points at ${name}, which is not in releases/${version}/`);
  }
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);

const sums = fs
  .readdirSync(versionDir)
  .sort()
  .map((name) => `${sha256(path.join(versionDir, name))}  ${version}/${name}`)
  .join("\n");
fs.writeFileSync(path.join(RELEASES, "SHA256SUMS"), `${sums}\n`);

const platforms = Object.keys(merged.platforms).sort();
console.log(`\nZyntaxAI ${version}`);
console.log(`  files copied     : ${copied}`);
console.log(`  files published  : ${fs.readdirSync(versionDir).length}`);
console.log(`  platforms in manifest : ${platforms.join(", ") || "none"} (was ${before})`);
console.log(`\nUpload zyntaxai/releases/ first, then zyntaxai/latest.json.`);

function collect(input) {
  const resolved = path.resolve(input);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    fail(`no such path: ${input}`);
  }
  if (stat.isFile()) return expand(resolved);

  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(...expand(full));
    }
  };
  walk(resolved);
  return found;
}

function expand(file) {
  return file.toLowerCase().endsWith(".zip") ? collect(unpack(file)) : [file];
}

function unpack(zip) {
  const into = fs.mkdtempSync(path.join(os.tmpdir(), "site-sync-"));
  try {
    execFileSync("unzip", ["-q", "-o", zip, "-d", into], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    fail(`could not unpack ${path.basename(zip)} — is \`unzip\` installed?\n${err.message}`);
  }
  console.log(`  unpacked ${path.basename(zip)}`);
  return into;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function fail(message) {
  console.error(`\nsite-sync: ${message}\n`);
  process.exit(1);
}
