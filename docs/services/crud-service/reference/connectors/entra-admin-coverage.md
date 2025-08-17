---
id: entra-admin-coverage
title: Entra ID admin commands (coverage overview)
description: Useful administrative operations available via the Azure connector system YAMLs, organized by resource area.
sidebar_label: Entra ID admin commands
---

This page highlights common Entra ID (Azure AD) administrative operations exposed by our Azure connector system YAMLs. As more connectors are added, we’ll expand this reference with examples and links to recipes.

## Users

- Revoke sessions: `account.revoke_signin_sessions`
- Auth methods: `account.get_authentication_methods`, `account.delete_authentication_method`
- Manager and reports: `account.get_manager`, `account.assign_manager`, `account.remove_manager`, `account.get_direct_reports`
- Membership: `account.transitive_member_of`, `account.get_member_groups`, `account.check_member_groups`
- Photo: `account.get_user_photo`

## Groups

- Delta sync: `group.groups_delta`
- Transitive queries: `group.list_group_transitive_members`, `group.list_group_transitive_member_of`
- Group memberships: `group.get_group_member_groups`

## Applications / Service principals

- Owners: add/remove owner on both
- Credentials:
  - `application.add_application_password`
  - `application.remove_application_password`
  - `application.add_application_key`
  - `application.remove_application_key`
  - `servicePrincipal.add_service_principal_password`

## Administrative units and roles

- AU membership: list/add/remove
- AU‑scoped role assignments:
  - `administrativeUnit.list_administrative_unit_role_assignments`
  - `administrativeUnit.assign_role_in_administrative_unit`
- Directory roles:
  - `roleManagement.list_directory_role_assignments`
  - `roleManagement.assign_directory_role`
  - `roleManagement.remove_directory_role_assignment`
  - role definitions list/get

## Devices

- Enable/disable device; list/add/remove owners

## Directory objects utility

- Bulk resolution: `directoryObject.get_by_ids`

## B2B invitations

- Create guest users: `invitation.create_invitation`

## Batch API

- Send multiple Graph calls in one HTTP: `graph.batch`
- See cookbook: `services/crud-service/reference/connectors/entra-graph-batch-examples`


