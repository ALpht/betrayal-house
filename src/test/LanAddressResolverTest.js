import { resolveLanIPv4Address } from "../../server/LanAddressResolver.js";

export function runLanAddressResolverTest() {
    console.log("\n===== LAN Address Resolver Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    const selected = resolveLanIPv4Address({
        networkInterfaces: {
            "vEthernet (WSL)": [
                { address: "172.20.0.1", family: "IPv4", internal: false }
            ],
            "Wi-Fi": [
                { address: "192.168.50.24", family: "IPv4", internal: false }
            ],
            Loopback: [
                { address: "127.0.0.1", family: "IPv4", internal: true }
            ]
        },
        preferredAddress: ""
    });
    assert(
        selected === "192.168.50.24",
        "Case 1: Physical private IPv4 is preferred over virtual and loopback adapters"
    );

    const preferred = resolveLanIPv4Address({
        networkInterfaces: {
            Ethernet: [
                { address: "192.168.1.10", family: "IPv4", internal: false }
            ]
        },
        preferredAddress: "10.0.0.25"
    });
    assert(
        preferred === "10.0.0.25",
        "Case 2: Valid LAN_HOST override wins over automatic detection"
    );

    const missing = resolveLanIPv4Address({
        networkInterfaces: {
            Loopback: [
                { address: "127.0.0.1", family: "IPv4", internal: true }
            ],
            Ethernet: [
                { address: "169.254.1.8", family: "IPv4", internal: false }
            ]
        },
        preferredAddress: ""
    });
    assert(
        missing === null,
        "Case 3: Resolver does not publish loopback or link-local addresses"
    );

    console.log(`===== LAN Address Resolver Test: ${passed} passed, ${failed} failed =====\n`);
}
