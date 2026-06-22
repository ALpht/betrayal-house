export class RegressionSnapshot {

    static capture(runtime) {
        const snapshot = runtime.toSnapshot();

        const runtimeShape = {
            hasState: snapshot.state !== null && snapshot.state !== undefined,
            hasInformation: snapshot.information !== null && snapshot.information !== undefined,
            hasLifecycle: typeof snapshot.lifecycleState === "string"
        };

        const stateObj = snapshot.state || {};
        const stateKeys = Object.keys(stateObj);
        const stateTypes = {};
        for (const key of stateKeys) {
            stateTypes[key] = typeof stateObj[key];
        }

        const infoObj = snapshot.information || {};
        const packets = infoObj.packets || [];
        const audiences = [...new Set(packets.map(p => p.audience).filter(Boolean))];
        const scopes = [...new Set(packets.map(p => p.scope).filter(Boolean))];

        const def = runtime.definition;
        const vc = def.getVictoryCondition ? def.getVictoryCondition() : null;
        const victoryShape = {
            hasVictoryCondition: vc !== null,
            type: vc ? vc.constructor.name : null
        };

        return {
            runtimeShape,
            stateShape: { keys: stateKeys, types: stateTypes },
            informationShape: { packetCount: packets.length, audiences, scopes },
            victoryShape
        };
    }

    static compare(baseline, current) {
        const diffs = [];

        const br = baseline.runtimeShape || {};
        const cr = current.runtimeShape || {};
        for (const key of Object.keys(br)) {
            if (!(key in cr)) {
                diffs.push({ type: "runtime_field_removed", field: key });
            }
        }

        const bs = baseline.stateShape || { keys: [], types: {} };
        const cs = current.stateShape || { keys: [], types: {} };
        const baselineTypes = bs.types || {};
        const currentTypes = cs.types || {};

        for (const key of Object.keys(baselineTypes)) {
            if (!(key in currentTypes)) {
                diffs.push({ type: "state_key_removed", key });
            } else if (baselineTypes[key] !== currentTypes[key]) {
                diffs.push({ type: "state_type_changed", key, from: baselineTypes[key], to: currentTypes[key] });
            }
        }

        const bi = baseline.informationShape || { audiences: [], scopes: [] };
        const ci = current.informationShape || { audiences: [], scopes: [] };

        for (const aud of bi.audiences) {
            if (!ci.audiences.includes(aud)) {
                diffs.push({ type: "audience_removed", audience: aud });
            }
        }

        for (const scope of bi.scopes) {
            if (!ci.scopes.includes(scope)) {
                diffs.push({ type: "scope_removed", scope });
            }
        }

        const bv = baseline.victoryShape || {};
        const cv = current.victoryShape || {};
        if (bv.hasVictoryCondition === true && cv.hasVictoryCondition === false) {
            diffs.push({ type: "victory_condition_removed" });
        }

        return {
            compatible: diffs.length === 0,
            diffs
        };
    }

    static assertCompatible(baseline, current) {
        const result = RegressionSnapshot.compare(baseline, current);
        if (!result.compatible) {
            throw new Error(
                "Regression snapshot incompatible:\n" +
                JSON.stringify(result.diffs, null, 2)
            );
        }
    }
}