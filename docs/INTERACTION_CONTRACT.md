# Device-local Interaction Contract v1.3

`data/interaction-model.json` is the v1.3 contract for harmless local continuity and tactile interaction.

## Allowed local state
- separated return-session count and timestamps;
- explicitly explored world IDs;
- last explicitly selected world;
- a bounded recent world trail;
- derived exploration phase and return-state presentation.

## Explicitly prohibited
- identity inference or fingerprinting;
- server-side behavioral scoring;
- treating page views as return visits;
- changing product maturity or evidence claims;
- changing repository telemetry;
- generating semantic company-history milestones.

## Exploration phase
Observing (0) → Mapping (1+) → Connecting (3+) → Constellation (5+ worlds).

## Return state
First encounter (session 1) → Returning (2+) → Familiar (4+) → Embedded (7+).
A session requires 360 minutes of inactivity; normal page navigation does not increment the count.

## Interaction grammar
- hover/focus = ephemeral preview;
- click/tap = deliberate local selection;
- horizontal touch swipe = deliberate local selection;
- core pulse = ephemeral relationship signal and **does not** write exploration state.

`Reset local memory` removes the device-local state.
