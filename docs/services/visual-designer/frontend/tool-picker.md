## Visual Designer – Tool Picker and hooks

The Visual Designer integrates with CRUDService ToolCatalogue to list built‑ins and Loopback MCP tools at scale.

### Data access
- Service: `src/services/toolService.ts` → `listTools(type?)`, `searchTools(q, limit)`
- Hooks: `src/hooks/useTools.ts` → `useToolList(type?)`, `useToolSearch(q, limit, includeEmpty?)`

The BFF provides merged catalogue endpoints (`/api/crud/tools/list`, `/api/crud/tools/search`) which include built‑ins and loopback MCP tools.

### Tool Picker component
Features
- Debounced search
- Filter by All / Built‑in / MCP
- Paging (20/50/100) and scroll
- Endpoint column for MCP
- Disables already selected

Usage
```tsx
<ToolPicker
  open={isOpen}
  onClose={() => setOpen(false)}
  onSelect={(t) => addTool(t)}
  alreadySelected={new Set(selected.map(s => s.name))}
/>
```

### Architecture
```mermaid
flowchart LR
  UI[Visual Designer] --> Hooks[useToolList/useToolSearch]
  Hooks --> Svc[toolService]
  Svc --> BFF[/api/crud/tools/*]
  BFF --> CRUD[ToolCatalogue]
  CRUD --> Builtins[config/tools.yaml]
  CRUD --> Loopback[Loopback MCP]
  CRUD --> External[External MCP endpoints]
```

### Tips
- Use `alreadySelected` to prevent duplicates in the UI
- Display allow‑listed metadata (`provider`, `instance`, `env`) for MCP tools
- Keep search debounced for large catalogues


