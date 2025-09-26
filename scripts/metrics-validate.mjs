#!/usr/bin/env node
// Validate events against marketing/metrics/schema.json

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'marketing', 'metrics', 'schema.json'), 'utf8'));

function validate(obj) {
  // minimal checks (no AJV dependency): required fields and enums
  for (const k of SCHEMA.required) {
    if (!(k in obj)) return `${k} missing`;
  }
  const props = SCHEMA.properties || {};
  for (const [k, v] of Object.entries(props)) {
    if (!(k in obj)) continue;
    const def = v;
    if (def.enum && !def.enum.includes(obj[k])) return `${k} not in enum`;
  }
  return null;
}

function main() {
  const file = process.argv[2] || 'marketing/metrics/events.sample.jsonl';
  const content = fs.readFileSync(file, 'utf8').trim();
  const lines = content.split(/\r?\n/).filter(Boolean);
  let errors = 0;
  lines.forEach((line, idx) => {
    try {
      const obj = JSON.parse(line);
      const err = validate(obj);
      if (err) {
        console.error(`L${idx + 1}: ${err}`);
        errors++;
      }
    } catch (e) {
      console.error(`L${idx + 1}: invalid JSON (${e.message})`);
      errors++;
    }
  });
  if (errors) process.exit(1);
  console.log(`Validated ${lines.length} event(s)`);
}

main();


