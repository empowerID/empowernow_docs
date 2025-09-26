#!/usr/bin/env node
// Generate website copy pages from marketing briefs (registry-driven)

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, 'docs', 'website_copy', 'page-registry.json');
const WEBSITE = path.join(ROOT, 'docs', 'website_copy');
const BRIEFS = path.join(ROOT, 'marketing', 'briefs', 'product');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readBrief(key) {
  const p = path.join(BRIEFS, `${key}.md`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function extractSection(md, heading) {
  const re = new RegExp(`^##\\s+${heading}[^\n]*\\n([\\s\\S]*?)(?=^##\\s+|\
*$)`, 'm');
  const m = md.match(re);
  return m ? m[1].trim() : '';
}

function pageTemplate(title, hero, problem, how, proofLinks) {
  const today = new Date().toISOString().slice(0, 10);
  return `---\nslug: auto\ntitle: ${title}\nlastReviewed: ${today}\n---\n\n# ${title}\n\n${hero}\n\n## Problem → Value\n\n${problem}\n\n## How it works\n\n${how}\n\n## See also\n\n${proofLinks.map(l => `- ${l}`).join('\n')}\n`;
}

function main() {
  const reg = loadJson(REGISTRY);
  for (const entry of reg.products) {
    const brief = readBrief(entry.key);
    if (!brief) {
      console.warn(`No brief for ${entry.key}`);
      continue;
    }
    const title = entry.title;
    const hero = extractSection(brief, 'One-liner (outcome-first)') || 'TBD.';
    const problem = extractSection(brief, 'Problem') || 'TBD.';
    const how = extractSection(brief, 'How it works') || 'TBD.';
    const proofLinks = (entry.required_reference || []).concat(entry.required_explanation || []).map(p => `[/docs/${p}]`);
    const content = pageTemplate(title, hero, problem, how, proofLinks);
    const outFile = path.join(WEBSITE, entry.file);
    fs.writeFileSync(outFile, content, 'utf8');
    console.log(`Wrote ${outFile}`);
  }
}

main();


