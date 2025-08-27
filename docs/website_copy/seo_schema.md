# SEO — JSON‑LD Templates

Organization
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "EmpowerNow",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
```

Product (ARIA)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "EmpowerNow ARIA",
  "description": "Identity Fabric and Self‑Driving Workflows for AI agents.",
  "brand": {"@type": "Brand", "name": "EmpowerNow"}
}
```

FAQ (Pricing)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can we bring our own PDP?",
      "acceptedAnswer": {"@type": "Answer", "text": "Yes. ARIA consumes AuthZEN‑profiled decisions."}
    },
    {
      "@type": "Question",
      "name": "Do you support signed receipts?",
      "acceptedAnswer": {"@type": "Answer", "text": "Yes via the Receipt Vault in Team and Enterprise."}
    }
  ]
}
```

Video (Demo)
```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "ARIA 10‑Minute Demo",
  "description": "Deny‑before‑call, enforced budgets, and zero‑shot orchestration.",
  "thumbnailUrl": ["https://example.com/demo-thumb.jpg"],
  "uploadDate": "2025-01-01"
}
```
