import { createGuestGameSession } from "./createGuestGameSession.js";
import { MultiplayerPlayerBinding, MultiplayerPlayerRole } from "./MultiplayerPlayerBinding.js";

export function validateGuestBinding({
    binding,
    ownClientId,
    expectedSessionId
}) {
    if (!binding || typeof binding !== "object") {
        return { valid: false, error: "BINDING_REQUIRED" };
    }

    if (binding.clientId !== ownClientId) {
        return { valid: false, error: "BINDING_CLIENT_MISMATCH" };
    }

    if (binding.role !== MultiplayerPlayerRole.GUEST) {
        return { valid: false, error: "BINDING_ROLE_MISMATCH" };
    }

    if (binding.playerId !== binding.viewerId) {
        return { valid: false, error: "BINDING_VIEWER_MISMATCH" };
    }

    if (binding.sessionId !== expectedSessionId) {
        return { valid: false, error: "BINDING_SESSION_MISMATCH" };
    }

    return { valid: true, error: null };
}

export function createSocketGuestGameSession({
    transport,
    binding,
    ownClientId,
    expectedSessionId,
    initialSequence = 0,
    initialRevision = 0,
    recoveryBaseline = false
} = {}) {
    const validation = validateGuestBinding({
        binding,
        ownClientId,
        expectedSessionId
    });
    if (!validation.valid) {
        return {
            ok: false,
            error: validation.error,
            session: null
        };
    }

    const playerBinding = new MultiplayerPlayerBinding(binding);
    const session = createGuestGameSession({
        transport,
        sessionId: playerBinding.sessionId,
        playerId: playerBinding.playerId,
        initialSequence,
        initialRevision,
        recoveryBaseline
    }).connect();

    return {
        ok: true,
        error: null,
        binding: playerBinding,
        session
    };
}
