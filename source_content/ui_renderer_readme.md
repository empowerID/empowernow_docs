# UI Renderer Guide (param_schema → UI)

This guide explains how to render forms and autocomplete from the API so your UI stays schema-driven and future-proof.

## Endpoints to consume
- Describe (for fields and validation): `GET /commands/form_schema?system=...&object_type=...&action=...`
- Suggesters (autocomplete): `GET /tools/suggest/{provider}/{kind}?q=...&min_chars=...&limit=...&cursor=...`

## Form schema shape
The form schema endpoint returns:

```json
{
  "fields": [
    {
      "name": "email",
      "type": "string",
      "required": true,
      "label": "Work Email",
      "description": "Must be a corporate email.",
      "placeholder": "name@example.com",
      "regexPattern": "^.+@example\\.com$",
      "validation": [
        {"kind": "pattern", "message": "Use your @example.com address"},
        {"kind": "minLength", "value": 6},
        {"kind": "maxLength", "value": 128}
      ],
      "enum": ["on", "off"],
      "suggest": {"provider": "auth0", "kind": "users", "url": "/tools/suggest/auth0/users", "min_chars": 3, "limit": 5},
      "redact": true
    }
  ],
  "ui": {
    "debounceMs": 250,
    "suggest": {"minCharsDefault": 3},
    "normalizeOn": ["blur", "submit"]
  }
}
```

## Rendering rules
- Type: Render `string` as text, honor `enum` as a dropdown (or segmented control).
- Required: Display a visual indicator (e.g., *) and block submit when empty.
- Labels and help: Use `label`, `description`, `placeholder` as UI hints.
- Redaction: Mask input/preview for `redact: true` fields (e.g., password-style display or hidden in logs).
- Pattern/min/max: Show inline messages from `validation` and enforce `regexPattern`, `minLength`, `maxLength` on blur and on submit.
- Normalize: If `ui.normalizeOn` contains `blur`, call server-side normalize (via resume flow) after blur or queue normalization to submit-stage depending on your UX; at minimum, enforce on submit.

## Autocomplete (suggesters)
- Trigger auto-complete when input length ≥ `suggest.min_chars` (or `ui.suggest.minCharsDefault`).
- Debounce: Wait `ui.debounceMs` (default 250ms) between keystrokes before calling the suggester.
- UX: Provide loading/empty states and keyboard navigation; support paging using `nextCursor` from response.
- PII safety: Labels are already PII-masked; display `label` and store/send `value`.

Example suggester call:
```http
GET /tools/suggest/auth0/users?q=ali&min_chars=3&limit=5
{
  "items": [{"label": "ali-user-1", "value": "auth0|1"}],
  "nextCursor": "5",
  "truncated": true
}
```

## Error display (Problem Details)
- On server errors, the API returns RFC-7807 Problem Details.
- Display a compact banner with: `title`, `detail`, and keep a dev-toggle to reveal `correlation_id` and `fingerprint`.

```json
{
  "type": "about:blank",
  "title": "Version required",
  "detail": "Resume requires state_version (If-Match or body).",
  "status": 409,
  "correlation_id": "...",
  "fingerprint": "sha256:..."
}
```

## Idempotency/concurrency tips (UI microcopy)
- Always show a hint: “This action uses concurrency checks (If-Match) and idempotency to avoid duplicates.”
- Include a copy-to-clipboard button for the suggested `idempotency_key` and show the current `state_version`.

## Copy-to-clipboard affordances
- For each WAITING step, offer “Copy resume payload” and “Copy curl” buttons.
- Example curl (fill from WAITING):

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'If-Match: <state_version>' \
  /workflow/resume/<task_id> \
  -d '{
    "task_id": "<task_id>",
    "data": { /* form values */ },
    "state_version": <state_version>,
    "idempotency_key": "<suggested_key>"
  }'
```

## Accessibility and keyboard navigation
- Ensure all inputs are labeled and descriptions are ARIA-associated.
- Autocomplete list supports arrow navigation, Enter select, Esc close.

## Testing checklist
- Required and pattern errors: show inline on blur and block submit.
- Autocomplete: debounce respected; empty and loading states shown; paging works.
- Redaction: no sensitive values in client logs or screen-readable outputs.
- Copy-to-clipboard: payloads and curl snippets reflect current `state_version` and suggested `idempotency_key`.

## Future extensions
- Field-level normalize-on-blur with a lightweight preflight endpoint.
- Per-field `x-suggest` advanced options (dependents, dynamic min_chars, tags).

