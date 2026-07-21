# LAN Multiplayer Playability

Milestone: M16E - LAN Multiplayer Playability Hardening

M16E makes the existing socket lobby, host authority, guest projection, and reconnect
baseline usable from browser UI. It does not add reliable delivery, action replay,
projection replay, host migration, multi-guest support, authentication, or server-side
gameplay.

## Start Server

Host computer:

```text
npm run server
```

Same-computer test:

```text
http://localhost:3001
```

Two-device LAN test:

```text
http://<HOST_LAN_IP>:3001
```

`localhost` means this device. A second computer must enter the Host computer's LAN
address. The local firewall may need to allow the configured server port.

## Host Flow

```text
Host LAN Game
-> Create Room
-> Share visible Room Code
-> Wait for Guest
-> Start Session
-> Play as Host
```

Room Code remains selectable even if clipboard copy is unavailable.

## Guest Flow

```text
Join LAN Game
-> Enter Host Server Address
-> Enter Room Code
-> Join Room
-> Wait for Host
-> Receive player binding and projection
-> Play as Guest
```

Invalid room codes display a readable error and keep the join UI usable.

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
Use a new room code
```

Same-room restart remains deferred.

## Supported Limits

- One Host
- One Guest
- One active app instance per browser page
- Browser UI consumes viewer-safe projection only
- Local Hot-seat remains available and unchanged
