#!/usr/bin/env node
// Copy lint for website pages under docs/website_copy/*
// Checks:
//  - front-matter exists with lastReviewed ≤ 90 days (where applicable)
//  - claims[] present for product pages
//  - at least one deep link to /docs/services/*
//  - duplication guard: fail if markdown tables likely represent config tables

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'docs', 'website_copy');
const MAX_AGE_DAYS = 90;

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, visit);
    else if (e.isFile() && /\.(md|mdx)$/i.test(e.name)) visit(p);
  }
}

function parseFrontMatter(content) {
  if (!content.startsWith('---')) return { data: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: content };
  const fm = content.slice(3, end).trim();
  const body = content.slice(end + 4).trimStart();
  const data = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2];
    data[k] = v;
  }
  // very naive claims presence check
  if (/^claims:\s*$/m.test(fm)) data['claimsPresent'] = true;
  if (/^claims:\s*\[/m.test(fm)) data['claimsPresent'] = true;
  return { data, body };
}

function daysBetween(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (isNaN(d1) || isNaN(d2)) return Infinity;
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

const issues = [];

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const { data, body } = parseFrontMatter(content);
  const rel = path.relative(ROOT, file);

  // lastReviewed freshness
  if (data.lastReviewed) {
    const age = daysBetween(data.lastReviewed, new Date().toISOString().slice(0, 10));
    if (age > MAX_AGE_DAYS) issues.push({ rel, rule: 'freshness', detail: `${age}d > ${MAX_AGE_DAYS}d` });
  }

  // product pages must have claims
  if (/product_.*\.md$/.test(file)) {
    if (!data.claimsPresent) issues.push({ rel, rule: 'claims', detail: 'claims[] front-matter missing' });
  }

  // must deep-link to services reference at least once
  if (!/\]\((\/docs\/services\/[^)]+)\)/.test(body)) {
    issues.push({ rel, rule: 'links', detail: 'missing deep link to /docs/services/*' });
  }

  // duplication guard: warn on markdown tables (likely config tables)
  const hasTable = /^\|[^\n]+\|\s*$/m.test(body) && /\n\|\s*[-:]+/.test(body);
  if (hasTable) issues.push({ rel, rule: 'duplication_guard', detail: 'markdown table detected; move to reference' });
}

walk(BASE, checkFile);

if (issues.length) {
  for (const i of issues) console.error(`[${i.rule}] ${i.rel}: ${i.detail}`);
  process.exit(1);
}
console.log('Copy lint passed');


