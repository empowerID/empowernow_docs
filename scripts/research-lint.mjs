#!/usr/bin/env node
// Lints competitor JSONs for schema-ish fields, staleness, and evidence presence

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'marketing', 'research', 'competitors');
const today = new Date().toISOString().slice(0, 10);

let hadError = false;

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, visit);
    else if (entry.isFile() && p.endsWith('.json')) visit(p);
  }
}

function daysBetween(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function lintFile(p) {
  const rel = path.relative(ROOT, p);
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const requiredTop = ['name', 'url', 'category', 'capabilities', 'claims', 'evidence', 'lastFetched', 'stalenessDays'];
    for (const k of requiredTop) {
      if (!(k in j)) {
        console.error(`[missing] ${rel}: ${k}`);
        hadError = true;
      }
    }
    if (!Array.isArray(j.evidence) || j.evidence.length === 0) {
      console.error(`[evidence] ${rel}: missing evidence entries`);
      hadError = true;
    }
    const age = daysBetween(j.lastFetched, today);
    if (Number.isFinite(age) && typeof j.stalenessDays === 'number' && age > j.stalenessDays) {
      console.error(`[stale] ${rel}: ${age}d > ${j.stalenessDays}d`);
      hadError = true;
    }
  } catch (e) {
    console.error(`[json] ${rel}: ${e.message}`);
    hadError = true;
  }
}

walk(BASE, lintFile);

if (hadError) {
  console.error('Research lint failed');
  process.exit(1);
}
console.log('Research lint passed');


