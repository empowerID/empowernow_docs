---
title: Blue/Green Rollout — Sessions and Capacity
---

Guidance (from architecture docs)

- Use `sessionAffinity: ClientIP` and a `PodDisruptionBudget` to avoid dropping sticky sessions.
- Set conservative resource requests/limits; run 2+ replicas; roll with maxUnavailable=1.

K8s snippets

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
---
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 2
```


