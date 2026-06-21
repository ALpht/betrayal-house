export class InformationPacket {

    constructor({ id, audience, scope, payload }) {

        if (!id) {
            throw new Error(
                "InformationPacket: id is required"
            );
        }

        if (!audience) {
            throw new Error(
                "InformationPacket: audience is required"
            );
        }

        try {
            if (payload !== undefined) {
                structuredClone(payload);
            }
        } catch {
            throw new Error(
                "InformationPacket: payload must be serializable"
            );
        }

        this.id = id;
        this.audience = audience;
        this.scope = scope || null;
        this.payload = payload !== undefined
            ? structuredClone(payload)
            : null;

    }

}
