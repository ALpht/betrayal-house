export class MultiplayerPlayerBindingRegistry {
    constructor() {
        this.bindingsByGuestId = new Map();
        this.guestIdsByConnectionId = new Map();
        this.guestIdsByPlayerId = new Map();
    }

    bind({ guestId, connectionId, binding }) {
        if (!guestId || !connectionId || !binding) {
            throw new Error("Binding registry requires guestId, connectionId, and binding");
        }

        if (this.bindingsByGuestId.has(guestId)) {
            throw new Error("Guest is already bound");
        }

        if (this.guestIdsByPlayerId.has(binding.playerId)) {
            throw new Error("Player is already bound");
        }

        this.bindingsByGuestId.set(guestId, binding);
        this.guestIdsByConnectionId.set(connectionId, guestId);
        this.guestIdsByPlayerId.set(binding.playerId, guestId);
    }

    resolveByGuestId(guestId) {
        return this.bindingsByGuestId.get(guestId) || null;
    }

    resolveByConnectionId(connectionId) {
        const guestId = this.guestIdsByConnectionId.get(connectionId);
        return guestId ? this.resolveByGuestId(guestId) : null;
    }

    resolveByPlayerId(playerId) {
        const guestId = this.guestIdsByPlayerId.get(playerId);
        return guestId ? this.resolveByGuestId(guestId) : null;
    }

    replaceConnection({ guestId, oldConnectionId, newConnectionId }) {
        const binding = this.resolveByGuestId(guestId);
        if (!binding) {
            return null;
        }

        if (oldConnectionId) {
            this.guestIdsByConnectionId.delete(oldConnectionId);
        }
        this.guestIdsByConnectionId.set(newConnectionId, guestId);
        return binding;
    }

    getAll() {
        return [...this.bindingsByGuestId.values()];
    }

    clear() {
        this.bindingsByGuestId.clear();
        this.guestIdsByConnectionId.clear();
        this.guestIdsByPlayerId.clear();
    }
}
