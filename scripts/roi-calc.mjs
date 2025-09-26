#!/usr/bin/env node
// ROI/TCO calculator
// Usage: node scripts/roi-calc.mjs --product <idp|pdp|crud|collector|shield|mcp> [--hourly <rateUSD>]

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

const product = String(args.product || '').toLowerCase();
if (!product) {
  console.error('Missing --product');
  process.exit(2);
}
const ROOT = process.cwd();
const MODEL = path.join(ROOT, 'marketing', 'roi', `${product}.json`);
if (!fs.existsSync(MODEL)) {
  console.error(`Model not found: ${MODEL}`);
  process.exit(2);
}
const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));

const hourly = Number(args.hourly || 150); // USD per engineer-hour for audit/control work

const inputs = model.inputs || {};
const a = model.assumptions || {};

function dollars(n) { return Math.round(n * 100) / 100; }

// Spend saved (annual)
const annual_calls = Number(inputs.monthly_calls || 0) * 12;
const spend_saved = dollars(annual_calls * Number(inputs.avg_cost_per_call || 0) * (Number(a.spend_reduction_pct || 0) / 100));

// Audit hours saved (annual)
const audit_hours_saved = Number(inputs.audit_events_per_year || 0) * Number(a.audit_hours_saved_per_event || 0);
const audit_value_saved = dollars(audit_hours_saved * hourly);

// Risk reduction proxy (percentage points)
const risk_reduction_proxy = Math.max(0, Math.min(100, Number(inputs.breach_risk_baseline_pct || 0) * (Number(a.risk_reduction_pct || 0) / 100)));

// Annualized value and cost
const annual_value = spend_saved + audit_value_saved;
const annual_cost = (Number(a.license_cost_per_month || 0) + Number(a.infra_cost_per_month || 0)) * 12;

// TCO windows
const tco_12m = dollars(annual_cost);
const tco_36m = dollars(annual_cost * 3);

// Payback months
const monthly_value = annual_value / 12;
const monthly_cost = annual_cost / 12;
const payback_months = monthly_value > 0 ? Math.max(0, Math.ceil(monthly_cost / monthly_value)) : Infinity;

const out = {
  product,
  hourly_rate_usd: hourly,
  spend_saved_annual_usd: spend_saved,
  audit_hours_saved_annual: audit_hours_saved,
  audit_value_saved_annual_usd: audit_value_saved,
  risk_reduction_proxy_pct_points: Math.round(risk_reduction_proxy * 100) / 100,
  tco_12m_usd: tco_12m,
  tco_36m_usd: tco_36m,
  payback_months: isFinite(payback_months) ? payback_months : null
};

console.log(JSON.stringify(out, null, 2));


