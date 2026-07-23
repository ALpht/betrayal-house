import os from "node:os";
import { isIPv4 } from "node:net";

const PHYSICAL_INTERFACE_PATTERN = /(wi-?fi|wireless|wlan|ethernet|en\d|eth\d)/i;
const VIRTUAL_INTERFACE_PATTERN =
    /(virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|tailscale|zerotier|vpn|tun|tap|loopback)/i;

function isPrivateIPv4(address) {
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some(value => !Number.isInteger(value))) {
        return false;
    }

    return (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168)
    );
}

function scoreCandidate(name, address) {
    let score = 0;

    if (PHYSICAL_INTERFACE_PATTERN.test(name)) score += 100;
    if (VIRTUAL_INTERFACE_PATTERN.test(name)) score -= 200;
    if (address.startsWith("192.168.")) score += 30;
    if (address.startsWith("10.")) score += 20;
    if (address.startsWith("172.")) score += 10;

    return score;
}

export function resolveLanIPv4Address({
    networkInterfaces = os.networkInterfaces(),
    preferredAddress = process.env.LAN_HOST || ""
} = {}) {
    if (isIPv4(preferredAddress) && isPrivateIPv4(preferredAddress)) {
        return preferredAddress;
    }

    const candidates = [];
    for (const [name, entries] of Object.entries(networkInterfaces || {})) {
        for (const entry of entries || []) {
            const family = entry?.family;
            const address = entry?.address;
            if (
                entry?.internal ||
                (family !== "IPv4" && family !== 4) ||
                !isIPv4(address) ||
                !isPrivateIPv4(address)
            ) {
                continue;
            }

            candidates.push({
                name,
                address,
                score: scoreCandidate(name, address)
            });
        }
    }

    candidates.sort((a, b) =>
        b.score - a.score ||
        a.name.localeCompare(b.name) ||
        a.address.localeCompare(b.address)
    );

    return candidates[0]?.address || null;
}
