### User interaction and resume

- **WAITING**: `USER_INTERACTION` nodes create a task and set status to WAITING; the workflow returns a payload instructing the client how to proceed.
- **Resume**: submit data to the resume endpoint, the engine restores state (via checkpoint), processes the input, clears WAITING, and continues execution.

#### Sequence
```mermaid
sequenceDiagram
  participant Exec as Executor
  participant DB as Task Store
  participant UI as Client/UI

  Exec->>DB: Create task (form/approval/LLM)
  Exec-->>UI: WAITING payload (task details)
  UI->>DB: User submits input
  UI->>Exec: Resume(node_id, data)
  Exec->>DB: Restore from checkpoint
  Exec->>Exec: Apply input, activate edges
  Exec-->>UI: Next WAITING or final result
```

- Task types: FORM, APPROVAL, LLM, BULK.
- Transition manager keeps DB task state and node status in sync.
