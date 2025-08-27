# Mermaid — Rendering Standards

## Purpose
Ensure diagrams render consistently and are consumable by both humans and LLM agents across product and docs pages.

## Authoring guidelines
- Use fenced code blocks with `mermaid` as the language
- Prefer `graph TD` for left→right flows; use `sequenceDiagram` for request flows
- Keep node IDs stable and human‑readable; use short labels and add line breaks with `<br/>`
- Color code states only when necessary; avoid excessive custom styling

## Status color map (workflows)
- active: green
- completed: dark gray
- waiting: gold
- failed: red
- future: light gray

## Edge labels
- Use concise condition strings; replace double quotes with single quotes to avoid parser issues

## Accessibility
- Provide a short text description near the diagram for screen readers
- Ensure color is not the only means of conveying state

## Testing
- Validate diagrams in local preview and docs build
- Keep diagrams small and focused; split very large flows
