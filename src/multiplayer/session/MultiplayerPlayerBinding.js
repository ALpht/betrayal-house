export const MultiplayerPlayerRole = Object.freeze({
    HOST: "HOST",
    GUEST: "GUEST"
});

const ROLE_VALUES = Object.values(MultiplayerPlayerRole);

function requireNonEmptyString(value, field) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`MultiplayerPlayerBinding: ${field} is required`);
    }
}

export class MultiplayerPlayerBinding {
    constructor({
        sessionId,
        clientId,
        playerId,
        viewerId,
        role
    }) {
        requireNonEmptyString(sessionId, "sessionId");
        requireNonEmptyString(clientId, "clientId");
        requireNonEmptyString(playerId, "playerId");
        requireNonEmptyString(viewerId, "viewerId");

        if (!ROLE_VALUES.includes(role)) {
            throw new Error("MultiplayerPlayerBinding: role is invalid");
        }

        if (playerId !== viewerId) {
            throw new Error("MultiplayerPlayerBinding: playerId must equal viewerId in M16B");
        }

        this.sessionId = sessionId;
        this.clientId = clientId;
        this.playerId = playerId;
        this.viewerId = viewerId;
        this.role = role;

        Object.freeze(this);
    }

    toJSON() {
        return {
            sessionId: this.sessionId,
            clientId: this.clientId,
            playerId: this.playerId,
            viewerId: this.viewerId,
            role: this.role
        };
    }
}
