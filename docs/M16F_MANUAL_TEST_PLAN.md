# M16F Manual LAN Test Plan

Milestone: M16F - Dedicated Host & Multi-Guest LAN Foundation

## Setup

```text
1 Dedicated Host PC
2 or 3 Guest browsers/devices
Terminal A: npm run server
Terminal B: npm run dev
Host browser: http://localhost:5173
```

The Socket.IO server detects the Host PC private LAN IPv4 address and prints both the
LAN browser URL (`:5173`) and socket URL (`:3001`). Vite listens on the LAN interface.
The Host may stay on `localhost`; after room creation, the QR payload automatically
uses the detected LAN address for both URLs.

If the PC has multiple physical/VPN adapters and the wrong private address is selected,
set `LAN_HOST` before starting the socket server. Example in PowerShell:

```text
$env:LAN_HOST="192.168.1.20"
npm run server
```

The Host firewall must allow inbound TCP ports 5173 and 3001 on the private LAN.
The browser implementation does not require HTTPS-only `crypto.randomUUID()` support;
LAN HTTP pages use the runtime ID fallback automatically.

## Smoke Flow

```text
Host creates 2-player room
Guest A scans Host QR join code
Guest A enters display name only
Guest A joins with display name
Guest B scans Host QR join code
Guest B enters display name only
Guest B joins with display name
Guest A/B immediately receive unique character assignments
Host sees canStart
Host starts session
Host QR lobby is replaced by the public map stage
Each Guest receives unique assignment
Each Guest sees only own viewer-safe projection
Guest A performs valid action
All connected Guests receive updated state
Guest B disconnects
Host shows Guest B as RECONNECTING
Guest A remains active
Guest B resumes within grace
Guest B keeps assignment
Host returns Guest B to PLAYING
Guest B receives latest projection
Guest A or B explicitly leaves active session
Room closes with PLAYER_LEFT_ACTIVE_SESSION
```

## 3-Player Capacity Flow

```text
Host creates 3-player room
Guest A/B/C join by Host QR code
Fourth Guest join is rejected as ROOM_FULL
All three Guests receive assignments immediately
Host starts session
All three assignments are unique
```

## Pass Criteria

```text
QR browser hostname matches the socket server's detected LAN address
Host has no player controls
Roster is stable by join order
No Ready confirmation is required
Page refresh resumes the same Guest and character within reconnect grace
Host changes to the map stage after start
No duplicate action submission
No private information leakage
One reconnecting Guest does not reset others
No action replay
No browser console blocker
```
