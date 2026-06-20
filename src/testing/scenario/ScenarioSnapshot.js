export class ScenarioSnapshot {
    static capture(snapshotData) {
        return structuredClone(snapshotData);
    }

    static restore(runtime, data) {
        runtime.restoreFromSnapshot(data);
    }

    static serialize(data) {
        return JSON.stringify(data);
    }

    static deserialize(json) {
        return JSON.parse(json);
    }

    static assertIdentical(
        before,
        after,
        keys = ["scenarioId", "active", "state"]
    ) {
        const beforeJson =
            JSON.stringify(before);

        const afterJson =
            JSON.stringify(after);

        if (beforeJson === afterJson) {
            console.log(
                "[SNAPSHOT] roundtrip identical"
            );
            return true;
        }

        for (const key of keys) {
            const b = JSON.stringify(before[key]);
            const a = JSON.stringify(after[key]);
            if (b !== a) {
                console.log(
                    `[SNAPSHOT] mismatch: ${key}`,
                    { before: b, after: a }
                );
            }
        }

        throw new Error(
            "Snapshot roundtrip mismatch"
        );
    }
}
