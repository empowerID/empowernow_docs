---
title: Configure Events — Kafka and CAEP
---

Reference: see `docs/services/bff/reference/logging-events.md` for topics, envelopes, and payloads.

Kafka

- Producers are initialized in the BFF (`ms_bff_spike/ms_bff/src/services/kafka_producer.py`). Topics include audit/auth/sessions. Configure brokers via env; enable/disable per environment.

CAEP (Redis publisher)

- The CAEP publisher sends events via Redis channels (see `ms_bff_spike/ms_bff/src/shared_signals/publisher.py`). Configure channel names and enablement per env.

Validation

- Produce a login/API call and verify events reach the target topic/channel with expected envelope.


