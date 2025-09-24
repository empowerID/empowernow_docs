# PATs UI User Guide

## Overview
Manage Personal Access Tokens used by dev tools against the EmpowerNow BFF proxy.

## Actions
- New PAT: opens an issue modal. Name it clearly; copy token once.
- Revoke: immediately invalidates the PAT.
- Search: filter by id/name.

## Performance
- UI uses SWR and conditional GETs for instant loads; backend returns ETag/Last-Modified.

## Tips
- Use purpose-based names (e.g., cursor-dev-jdoe).
- Clean up unused tokens periodically (check Last Used).

## See also
- IdP docs: `PAT_Management_UI_Guide.md`
