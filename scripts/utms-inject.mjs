#!/usr/bin/env node
// Append UTM parameters to external links in markdown files
// Usage:
//  node scripts/utms-inject.mjs --files docs/website_copy/product_idp.md docs/website_copy/product_pdp.md \
//    --campaign idp --persona security --stage consideration
// Notes:
//  - Skips links already containing utm_* params
//  - Only modifies http(s) links

import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const args = {};
let i = 0;
while (i < argv.length) {
  const k = argv[i];
  if (k.startsWith('--')) {
    const key = k.replace(/^--/, '');
    const vals = [];
    let j = i + 1;
    while (j < argv.length && !argv[j].startsWith('--')) { vals.push(argv[j]); j++; }
    args[key] = vals.length > 1 ? vals : vals[0] ?? true;
    i = j;
  } else i++;
}

const files = Array.isArray(args.files) ? args.files : (args.files ? [args.files] : []);
if (!files.length) {
  console.error('Usage: --files <file1> <file2> ... [--campaign <name>] [--persona <p>] [--stage <s>]');
  process.exit(2);
}

const campaign = String(args.campaign || '').trim();
const persona = String(args.persona || '').trim();
const stage = String(args.stage || '').trim();

function appendUtm(url) {
  try {
    const u = new URL(url);
    // skip if already has utm params
    for (const p of u.searchParams.keys()) if (p.startsWith('utm_')) return url;
    if (campaign) u.searchParams.set('utm_campaign', campaign);
    if (persona) u.searchParams.set('utm_persona', persona);
    if (stage) u.searchParams.set('utm_stage', stage);
    return u.toString();
  } catch {
    return url;
  }
}

function transform(content) {
  // markdown link: [text](href "title")
  return content.replace(/\[([^\]]*?)\]\((https?:[^)\s]+)(\s+"[^"]*")?\)/g, (m, text, href, title) => {
    const updated = appendUtm(href);
    if (updated === href) return m;
    return `[${text}](${updated}${title || ''})`;
  });
}

let changes = 0;
for (const f of files) {
  const p = path.resolve(f);
  const before = fs.readFileSync(p, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(p, after, 'utf8');
    console.log(`Updated UTM links in ${f}`);
    changes++;
  } else {
    console.log(`No changes in ${f}`);
  }
}

console.log(`Done. Files changed: ${changes}`);


