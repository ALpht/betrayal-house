# LAN Multiplayer Playability

Milestone: M16E - LAN Multiplayer Playability Hardening

M16E makes the existing socket lobby, host authority, guest projection, and reconnect
baseline usable from browser UI. It does not add reliable delivery, action replay,
projection replay, host migration, multi-guest support, authentication, or server-side
gameplay.

## Start Server

Host computer:

```text
Terminal A: npm run server
Terminal B: npm run dev
```

Same-computer test:

```text
http://localhost:5173
```

Two-device LAN test:

```text
http://<HOST_LAN_IP>:5173
```

The socket server detects `<HOST_LAN_IP>` and prints the browser and socket URLs at
startup. Vite listens on the LAN interface. The Host can remain on `localhost`; the
room QR code automatically replaces it with the detected LAN address and embeds the
Socket.IO endpoint on port 3001. Guests should scan the QR instead of entering an
address manually.

If multiple adapters make automatic selection ambiguous, set `LAN_HOST` to the desired
private IPv4 address before `npm run server`. The local firewall may need to allow TCP
ports 5173 and 3001.

## Host Flow

```text
Host LAN Game
-> Choose player count
-> QR join code appears
-> Wait for Guests
-> Start Session
-> Observe as Dedicated Host
```

The QR join code opens the browser in Guest mode and carries the hidden room
routing token. Players do not enter Host addresses or room codes.

## Guest Flow

```text
Join LAN Game
-> Scan Host QR code
-> Enter display name
-> Join Game
-> Wait for Host
-> Receive player binding and projection
-> Play as Guest
```

Manual Host Server Address and Room Code entry are not part of the public player
flow. The Host screen is the only intended entry point for mobile Guests.

## Reconnect

Guest reconnect restores connection identity, host binding, and latest viewer-safe
projection. If a PlayerAction was pending when the connection was lost, the UI warns
that the last action may or may not have been applied.

M16E never replays uncertain actions and never rolls back sequence state. The latest
projection after resume is the source of truth.

## Leave And Close

Guest Leave Room is intentional and does not enter reconnect grace.

Host Close Room is a remote room effect. The close request is sent before local cleanup,
and the Guest receives a terminal room/session closure message.

## New LAN Game

New LAN Game means:

```text
Close current room
Create a fresh room
Use a new hidden room token
```

Same-room restart remains deferred.

## Supported Limits

- One Host
- Two or three Guests for M16F dedicated-host rooms
- One active app instance per browser page
- Browser UI consumes viewer-safe projection only
- Local Hot-seat remains available and unchanged
