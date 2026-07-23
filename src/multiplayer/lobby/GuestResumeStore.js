const STORAGE_PREFIX = "betrayal-house:guest-resume:";

export function createGuestResumeStore({
    serverUrl = "",
    storage = getBrowserStorage()
} = {}) {
    function getKey(roomCode) {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        if (!normalizedRoomCode) return null;
        return `${STORAGE_PREFIX}${encodeURIComponent(serverUrl)}:${normalizedRoomCode}`;
    }

    function read(roomCode) {
        const key = getKey(roomCode);
        if (!key || !storage) return null;
        try {
            const value = JSON.parse(storage.getItem(key) || "null");
            if (
                !value ||
                normalizeRoomCode(value.roomCode) !== normalizeRoomCode(roomCode) ||
                typeof value.resumeToken !== "string" ||
                value.resumeToken.length === 0
            ) {
                return null;
            }
            return {
                roomCode: normalizeRoomCode(value.roomCode),
                resumeToken: value.resumeToken,
                displayName: typeof value.displayName === "string" ? value.displayName : "",
                lastSequence: toSafeInteger(value.lastSequence),
                lastRevision: toSafeInteger(value.lastRevision)
            };
        } catch (_error) {
            return null;
        }
    }

    function save(credential = {}) {
        const key = getKey(credential.roomCode);
        if (!key || !storage || !credential.resumeToken) return false;
        const previous = read(credential.roomCode) || {};
        const value = {
            roomCode: normalizeRoomCode(credential.roomCode),
            resumeToken: credential.resumeToken,
            displayName: credential.displayName ?? previous.displayName ?? "",
            lastSequence: toSafeInteger(credential.lastSequence ?? previous.lastSequence),
            lastRevision: toSafeInteger(credential.lastRevision ?? previous.lastRevision)
        };
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (_error) {
            return false;
        }
    }

    function clear(roomCode) {
        const key = getKey(roomCode);
        if (!key || !storage) return false;
        try {
            storage.removeItem(key);
            return true;
        } catch (_error) {
            return false;
        }
    }

    return Object.freeze({ read, save, clear });
}

function normalizeRoomCode(roomCode) {
    return String(roomCode || "").trim().toUpperCase();
}

function toSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function getBrowserStorage() {
    try {
        return typeof window !== "undefined" ? window.localStorage : null;
    } catch (_error) {
        return null;
    }
}
