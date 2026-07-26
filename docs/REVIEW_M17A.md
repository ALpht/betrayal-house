# M17A Review — Shared House Map Experience

Review date: 2026-07-26

Branch: `feature/shared-house-map`

Post-development report: `docs/M17A_POST_DEVELOPMENT_REPORT.md`

## Review Conclusion

```text
M17A — Shared House Map Experience

Review Status:
APPROVED

Milestone Status:
COMPLETE

Merge Recommendation:
APPROVE AND CLOSE

Remaining Code Blockers:
NONE
```

M17A implements the approved Shared House Map boundary without reopening the completed
M16 Multiplayer Platform.

## Accepted Architecture

- GraphMap remains the only authority for map coordinates, reveal state, rotation,
  and topology.
- Host consumes a native public-only projection and is not represented as a Viewer.
- Guests do not own GraphMap, Runtime, or client-side topology.
- Hidden rooms, hidden connection IDs, and markers in hidden rooms are removed at the
  Host projection boundary.
- Host, Guest A, and Guest B projections do not share mutable nested references.
- Existing state revision, reconnect, binding, publish, and destroy lifecycles remain
  authoritative.
- No Transport Message, Domain Event, Save schema, or Gameplay Action was added.

## Accepted Product Decision

Host displays the complete public House Map. Guest projection continues to contain the
same complete public map DTO, while the Guest Presentation Query defaults to the
assigned character's current room.

```text
Complete public map DTO
        |
        +--> Host: complete public map
        |
        +--> Guest: focused current-room presentation
```

This is accepted because filtering occurs only in presentation. It does not create a
Guest-specific projection contract or client map model.

Formal decision:

> Guest Projection 保持完整公開地圖契約；Guest UI 預設以自身角色所在房間為聚焦呈現。

## Accepted LAN Flow

M17A also fixes the simplified LAN product entry and Session restart flow:

- Root URL directly opens and creates the Host QR lobby.
- ENTRY mode and the play-mode selection page are removed.
- Guest receives a character assignment immediately after joining.
- Guest Ready and Active Leave Game controls are removed.
- New LAN Game closes the old Room and Session before creating a new lobby, QR code,
  bindings, and character assignments.

These changes are accepted as part of the Multiplayer Experience scope and are covered
by Lobby UI, browser smoke, reconnect, lifecycle, and physical LAN validation.

## Merge Gate

```text
Full regression suite: PASS
HouseMapPresentationTest: PASS
MultiplayerHouseMapIntegrationTest: PASS
Existing Multiplayer Regression: PASS
Local Play Regression: PASS
Multi-Guest Browser Smoke Regression: PASS
Multiplayer Lobby UI Regression: PASS
git diff --check: PASS
Production Build: PASS
Physical LAN Validation: ACCEPTED
```

## Merge Checklist

- Current branch is `feature/shared-house-map`.
- M17A implementation, tests, reports, and contracts must be committed.
- Untracked `CLAUDE.md` must not be added to the index or final diff.
- `develop` must be checked for conflicts before merge.
- `ROADMAP.md`, `ARCHITECTURE.md`, contracts, and constraints contain the final
  architectural and product decisions.

## Next Milestone

Recommended next milestone:

```text
M17B — Exploration & Movement Feedback
```

M17B should make room reveal, player movement, and turn changes more visible while
reusing M17A map projection, Presentation Query, Presentation Model, HouseMapPanel,
and authoritative publish cycle.

M17B must not introduce a new map DTO, Client GraphMap, new publish protocol, new
Transport Message, movement validation, pathfinding, or a general animation framework.
