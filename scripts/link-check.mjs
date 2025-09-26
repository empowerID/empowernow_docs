#!/usr/bin/env node
// Link checker for docs/ and marketing/
// - Validates internal links like /docs/... and /marketing/...
// - Optionally probes external http(s) links with HEAD (best-effort)
// Usage: node scripts/link-check.mjs [--external]

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCAN_DIRS = [path.join(ROOT, 'docs'), path.join(ROOT, 'marketing')];
const CHECK_EXTERNAL = process.argv.includes('--external');

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, visit);
    else if (e.isFile() && /\.(md|mdx)$/i.test(e.name)) visit(p);
  }
}

function extractLinks(content) {
  const links = [];
  const mdLink = /\[[^\]]*?\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g; // [text](href "title")
  let m;
  while ((m = mdLink.exec(content)) !== null) {
    links.push(m[1]);
  }
  return links;
}

function normalizeInternal(href) {
  // Strip anchors and query
  const [pathOnly] = href.split('#');
  const [clean] = pathOnly.split('?');
  return clean;
}

function existsInternal(href) {
  const clean = normalizeInternal(href);
  const abs = path.join(ROOT, clean.replace(/^\//, ''));
  if (fs.existsSync(abs)) return true;
  // Try appending .md if path without extension
  if (!path.extname(abs)) {
    if (fs.existsSync(abs + '.md')) return true;
    if (fs.existsSync(abs + '.mdx')) return true;
    // index.md within folder
    const idx = path.join(abs, 'index.md');
    if (fs.existsSync(idx)) return true;
  }
  return false;
}

async function probeExternal(url) {
  if (!CHECK_EXTERNAL) return { ok: true, skipped: true };
  try {
    const c = AbortSignal.timeout ? { signal: AbortSignal.timeout(4000) } : {};
    const res = await fetch(url, { method: 'HEAD', ...c });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const issues = [];

async function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const links = extractLinks(content);
  for (const href of links) {
    if (/^https?:\/\//i.test(href)) {
      const r = await probeExternal(href);
      if (!r.ok && !r.skipped) issues.push({ file, href, kind: 'external', detail: r.status || r.error || 'unknown' });
      continue;
    }
    if (href.startsWith('/docs/') || href.startsWith('/marketing/')) {
      if (!existsInternal(href)) issues.push({ file, href, kind: 'internal', detail: 'missing target' });
    }
  }
}

async function main() {
  const files = [];
  for (const dir of SCAN_DIRS) walk(dir, f => files.push(f));
  for (const f of files) await checkFile(f);
  if (issues.length) {
    for (const i of issues) console.error(`[${i.kind}] ${path.relative(ROOT, i.file)} → ${i.href} :: ${i.detail}`);
    console.error(`Link check failed: ${issues.length} issue(s)`);
    process.exit(1);
  }
  console.log(`Link check passed for ${files.length} file(s)`);
}

main();


