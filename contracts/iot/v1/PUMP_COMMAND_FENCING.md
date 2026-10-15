# PUMP01 boot/ordinal extension (opt-in, 15/10/2026)

schemaVersion1 and existing topics stay unchanged. Default examples remain
valid. New commandFence objects are exact, never null, version integer1.

```json
{"version":1,"ordinal":12,"targetBootId":"71000000-0000-4000-8000-000000000001"}
```

The command contains this object in addition to the v1 fields. The backend
assigns ordinal transactionally from a PostgreSQL sequence (positive JS-safe
integer) and targets the latest observed device boot. ON/RESET require a fresh
fenced OFF status and no unresolved/unseen commands across all history. OFF
may target another boot; it remains subject to the validated wire lifetime.

ACK contains commandFence {version:1, ordinal:12}, plus actual bootId at the
envelope level. A fenced command cannot be completed by an unfenced or wrong
ordinal ACK. ON/RESET also require ACK boot equal to the recorded target.
Duplicates/stale MQTT ordinals produce status only, never renew runtime or
publish a contradictory execution result. Existing v1 failure/lifetime rules
and timer/water/flow/network gates still apply.

Status contains commandFence {version:1, lastOrdinal:12, restartRequired:false}.
Within one boot, lastOrdinal/capability/restart latch cannot regress. New boot
starts with lastOrdinal0 and relay OFF; ON at ordinal0 is invalid. A nonzero
status ordinal must reference a stored fenced command (same target boot, or
an OFF). A restart latch requires OFF+locked. Retained command packets are
rejected; pump ACK/status remain non-retained.

Legacy OFF is the only unfenced command accepted by opt-in firmware. A valid
legacy OFF stops/locks and latches restartRequired until reboot, so an old
in-flight RESET cannot re-enable an old ON. Backend/firmware default flags are
false; mismatched mode blocks ON/RESET. No auto retry, auto resume or downgrade.

This protects MQTT delivery order/boot, not HTTP intent order, hardware feedback,
pump ownership, multi-valve sequencing, NVS or hydraulic safety. Preview queue
remains disconnected. [Implementation and Windows steps](../../../docs/book/CHAPTER_34_PUMP_COMMAND_FENCING.md).
