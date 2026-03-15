# Audit Logging

AgentShield provides an immutable, append-only audit trail of all firewall events with detailed visualization.

## Audit Log Schema

Each audit entry captures:
- **trace_id**: Unique trace ID for request correlation
- **event_type**: Type of event (e.g., `agent_invoke`, `policy_check`, `budget_alert`)
- **actor_id / actor_type**: Who performed the action (`user`, `agent`, or `system`)
- **resource_type / resource_id**: What was acted upon
- **action**: The specific action taken
- **outcome**: `allowed`, `denied`, or `error`
- **details**: JSONB with full request/response metadata
- **ip_address**: Source IP
- **recorded_at**: Timestamp

## Immutability

The audit log is protected against modification:
```sql
CREATE RULE audit_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

## Visualization

The Admin Dashboard provides:
- **Decision Banners**: Color-coded allowed/denied indicators
- **Structured Metadata**: Organized display of request details
- **Raw JSON View**: Full request/response payloads
- **Filtering & Search**: By event type, outcome, actor, date range
- **Statistics**: Aggregated metrics (total requests, allowed/denied ratios, error rates)

## Archival

For compliance (SOX/HIPAA), audit logs can be archived to S3/MinIO with:
- WORM (Write Once Read Many) storage
- Cryptographic hashing for integrity verification
- Configurable retention periods (default: 6 years for HIPAA)
