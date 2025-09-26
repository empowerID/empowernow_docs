#!/usr/bin/env node
// Minimal dependency-free research fetcher & normalizer
// Usage examples:
//   node scripts/research-pull.mjs --product idp --url https://example.com/page \
//     --out marketing/research/competitors/idp/vendor_new.json --capabilities pairwise_id,token_exchange_rfc8693
//   node scripts/research-pull.mjs --scan marketing/research/competitors/idp

import fs from 'fs';
import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).map((arg, i, arr) => {
  if (arg.startsWith('--')) {
    const key = arg.replace(/^--/, '');
    const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
    return [key, val];
  }
  return [null, null];
}).filter(([k]) => k);

const today = new Date().toISOString().slice(0, 10);

async function fetchPage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'EmpowerNow-Research/1.0' } });
    if (!res.ok) return { ok: false, status: res.status };
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const meta = metaDescMatch ? metaDescMatch[1].trim() : '';
    // naive first paragraph
    const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/is);
    const firstPara = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    return { ok: true, title, meta, firstPara };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function quoteFromText(text) {
  if (!text) return '';
  const words = text.split(/\s+/).slice(0, 25);
  return words.join(' ').trim();
}

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}

async function handleSingle(url, outFile, product, extraCaps) {
  const result = await fetchPage(url);
  const capabilities = toArray(extraCaps);
  const evidence = [];
  if (result.ok) {
    const short = quoteFromText(result.meta || result.firstPara || result.title);
    if (short) evidence.push({ type: 'quote', text: short, href: url });
    else evidence.push({ type: 'url', href: url });
  } else {
    evidence.push({ type: 'url', href: url });
  }

  const categoryMap = { idp: 'IdP', pdp: 'PDP', crud: 'CRUD', collector: 'DataCollector', shield: 'Shield', mcp: 'MCPGateway' };
  const payload = {
    name: 'Unknown Vendor',
    url,
    category: categoryMap[product] || 'Adjacent',
    positioning: result.title || 'n/a',
    capabilities,
    claims: [],
    pricing_signals: '',
    customers_mentioned: [],
    evidence,
    gapsVsEmpowerNow: [],
    traps_counters: { trap: '', counter: '' },
    lastFetched: today,
    stalenessDays: 60,
    notes: ''
  };

  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${outFile}`);
}

function scanDir(dir) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(dir, f);
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      j.lastFetched = today;
      if (!Array.isArray(j.evidence) || j.evidence.length === 0) {
        if (j.url) j.evidence = [{ type: 'url', href: j.url }];
      }
      fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
      console.log(`Refreshed lastFetched in ${p}`);
    } catch (e) {
      console.error(`Failed to update ${p}:`, e.message);
      process.exitCode = 1;
    }
  }
}

async function main() {
  if (args.scan) {
    scanDir(args.scan);
    return;
  }
  const url = args.url;
  const out = args.out;
  const product = args.product;
  if (!url || !out || !product) {
    console.error('Usage: --product <idp|pdp|crud|collector|shield|mcp> --url <url> --out <path> [--capabilities a,b] | --scan <dir>');
    process.exit(2);
    return;
  }
  await handleSingle(url, out, product, args.capabilities);
}

main();


