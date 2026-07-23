let fallbackSequence = 0;

export function createRuntimeId(prefix = "", {
    cryptoProvider = globalThis.crypto,
    random = Math.random,
    now = Date.now
} = {}) {
    const value = typeof cryptoProvider?.randomUUID === "function"
        ? cryptoProvider.randomUUID()
        : createFallbackId({ cryptoProvider, random, now });

    return prefix ? `${prefix}-${value}` : value;
}

function createFallbackId({ cryptoProvider, random, now }) {
    const bytes = new Uint8Array(16);

    if (typeof cryptoProvider?.getRandomValues === "function") {
        cryptoProvider.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index++) {
            bytes[index] = Math.floor(random() * 256);
        }
        fallbackSequence += 1;
        const sequence = fallbackSequence;
        const timestamp = now();
        for (let index = 0; index < 6; index++) {
            bytes[index] ^= Math.floor(timestamp / (2 ** (index * 8))) & 0xff;
        }
        bytes[15] ^= sequence & 0xff;
        bytes[14] ^= (sequence >>> 8) & 0xff;
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));

    return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10).join("")
    ].join("-");
}
