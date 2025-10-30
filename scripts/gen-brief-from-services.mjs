#!/usr/bin/env node
// Generate product brief skeletons from services directories (idempotent)
// Usage: node scripts/gen-brief-from-services.mjs

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SERVICES = path.join(ROOT, 'docs', 'services');
const OUT = path.join(ROOT, 'marketing', 'briefs', 'product');

const MAP = {
  idp: 'idp',
  pdp: 'pdp',
  crud: 'crud-service',
  collector: 'data-collector',
  shield: 'aria-shield',
  mcp: 'mcp-gateway'
};

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function titleFor(key) {
  return {
    idp: 'EmpowerNow IdP — Agent Passports',
    pdp: 'EmpowerNow PDP — AuthZEN Decisions',
    crud: 'EmpowerNow Orchestration Service — Identity Operations',
    collector: 'EmpowerNow Data Collector — Inventory & Usage',
    shield: 'ARIA Shield — Zero-Token SPA & AI Gateway',
    mcp: 'ARIA MCP Gateway — Tool-Boundary Enforcement'
  }[key];
}

function mermaidFor(key) {
  const blocks = {
    idp: 'flowchart LR\n  U[User/Service]-->TE[Token Exchange]\n  TE-->P[Agent Passport]\n  P-->SH[ARIA Shield]\n  P-->MCP[ARIA MCP]\n  SH-->PDP\n  MCP-->PDP\n  PDP-->R[Receipts]',
    pdp: 'flowchart LR\n  A[Caller]-->SH[ARIA Shield]\n  A-->MCP[ARIA MCP]\n  SH-->PDP[AuthZEN]\n  MCP-->PDP\n  PDP-->C[Constraints]\n  PDP-->O[Obligations]\n  PDP-->TTL[TTL]',
    crud: 'flowchart LR\n  IN[Ops/Events]-->D[Idempotent Dedupe]\n  D-->WF[Workflows/Approvals]\n  WF-->EX[Executors]\n  EX-->EV[Events]\n  EV-->ANA[Analytics]\n  WF-->RCPT[Receipts]',
    collector: 'flowchart LR\n  SRC[Sources]-->N[Normalize]\n  N-->L[Lineage]\n  L-->K[Kafka]\n  K-->CH[ClickHouse]\n  CH-->PIP[PIP]\n  CH-->ANA[Analytics]',
    shield: 'flowchart LR\n  FE[SPA]-->BFF[ARIA Shield]\n  BFF-->PDP\n  BFF-->Prov[Providers]\n  PDP-->RCPT[Receipts]',
    mcp: 'flowchart LR\n  AG[Agent]-->G[MCP Gateway]\n  G-->TR[Tool Registry]\n  G-->PDP\n  G-->RV[Receipt Vault]'
  };
  return blocks[key] || 'flowchart LR\n  A-->B';
}

function briefTemplate(key, serviceDir) {
  const title = titleFor(key);
  const serviceIndex = path.join('docs', 'services', serviceDir, 'index.md');
  const today = new Date().toISOString().slice(0, 10);
  return `---\nproduct: ${key}\nname: "${title}"\nstatus: draft\nowner: Product Marketing\npersonas: []\nprimary_outcome: ""\nproof_tags: []\nlastReviewed: ${today}\n---\n\n## One-liner (outcome-first)\n\nTBD.\n\n## Architecture at a glance\n\n\`\`\`mermaid\n${mermaidFor(key)}\n\`\`\`\n\n## How it works (link to Reference)\n\nSee \`${serviceIndex}\`.\n\n## See also\n\n- Website page (registry-controlled).\n`;
}

function main() {
  ensureDir(OUT);
  for (const [key, dir] of Object.entries(MAP)) {
    const outFile = path.join(OUT, `${key}.md`);
    if (fs.existsSync(outFile)) {
      console.log(`Skip existing ${outFile}`);
      continue;
    }
    const content = briefTemplate(key, dir);
    fs.writeFileSync(outFile, content, 'utf8');
    console.log(`Wrote ${outFile}`);
  }
}

main();


