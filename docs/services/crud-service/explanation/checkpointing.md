### Checkpointing and recovery

- **Save**: periodic or event-driven snapshots of graph node states, context (inputs, variables, outputs, step_results), in-progress tasks, and current WAITING node.
- **Restore**: given a checkpoint id, rebuild graph state and context, then continue execution (e.g., after resume).

#### Flow
```mermaid
graph LR
  Run[Run loop] -->|node completes| Save[Save checkpoint]
  WAITING((WAITING)) --> Save
  Resume[Resume request] --> Restore[Restore checkpoint]
  Restore --> Run
```

- Storage abstraction: pluggable save/load interface.
- Used for resiliency, long-lived interactions, and operator-driven recovery.
