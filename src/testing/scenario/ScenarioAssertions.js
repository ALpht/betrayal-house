const DEFAULT_OPTIONS = {
    throwOnFail: true
};

function fail(message, options) {
    console.log(`[FAIL] ${message}`);
    if (options.throwOnFail) {
        throw new Error(message);
    }
    return false;
}

function pass(message) {
    console.log(`[PASS] ${message}`);
    return true;
}

export class ScenarioAssertions {
    static assertHeroesWon(
        result,
        options = DEFAULT_OPTIONS
    ) {
        const winner = result?.winner;
        if (winner === "heroes") {
            return pass("heroes won");
        }
        return fail(
            `Expected winner=heroes, got ${winner ?? "null"}`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertTraitorWon(
        result,
        options = DEFAULT_OPTIONS
    ) {
        const winner = result?.winner;
        if (winner === "traitor") {
            return pass("traitor won");
        }
        return fail(
            `Expected winner=traitor, got ${winner ?? "null"}`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertVictoryReason(
        result,
        expectedReason,
        options = DEFAULT_OPTIONS
    ) {
        const reason = result?.reason;
        if (reason === expectedReason) {
            return pass(
                `victory reason=${expectedReason}`
            );
        }
        return fail(
            `Expected reason=${expectedReason}, got ${reason ?? "null"}`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertVictoryResult(
        result,
        options = DEFAULT_OPTIONS
    ) {
        if (result !== null && result !== undefined) {
            return pass("victory result exists");
        }
        return fail(
            "Expected victory result, got null",
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertNoVictory(
        result,
        options = DEFAULT_OPTIONS
    ) {
        if (result === null || result === undefined) {
            return pass("no victory result");
        }
        return fail(
            `Expected null victory, got winner=${result?.winner}`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertStateValue(
        state,
        key,
        expected,
        options = DEFAULT_OPTIONS
    ) {
        const actual = state.get(key);
        const expectedJson =
            JSON.stringify(expected);

        const actualJson =
            JSON.stringify(actual);

        if (expectedJson === actualJson) {
            return pass(
                `state.${key}=${expectedJson}`
            );
        }
        return fail(
            `Expected state.${key}=${expectedJson}, got ${actualJson}`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertStateExists(
        state,
        key,
        options = DEFAULT_OPTIONS
    ) {
        if (state.has(key)) {
            return pass(`state.${key} exists`);
        }
        return fail(
            `Expected state.${key} to exist`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertStateAbsent(
        state,
        key,
        options = DEFAULT_OPTIONS
    ) {
        if (!state.has(key)) {
            return pass(`state.${key} absent`);
        }
        return fail(
            `Expected state.${key} to be absent`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertRuntimeActive(
        runtime,
        options = DEFAULT_OPTIONS
    ) {
        if (runtime.isActive) {
            return pass("runtime is active");
        }
        return fail(
            "Expected runtime active",
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertRuntimeInactive(
        runtime,
        options = DEFAULT_OPTIONS
    ) {
        if (!runtime.isActive) {
            return pass("runtime is inactive");
        }
        return fail(
            "Expected runtime inactive",
            { ...DEFAULT_OPTIONS, ...options }
        );
    }

    static assertTrue(
        label,
        condition,
        options = DEFAULT_OPTIONS
    ) {
        if (condition) {
            return pass(label);
        }
        return fail(
            `Assertion failed: ${label}`,
            { ...DEFAULT_OPTIONS, ...options }
        );
    }
}
