import { InformationPacket }
    from "./InformationPacket.js";

import { isVisibleTo }
    from "./InformationVisibility.js";

export class InformationRouter {

    #packets;

    constructor() {
        this.#packets = [];
    }

    route(packet) {

        if (!(packet instanceof InformationPacket)) {

            throw new Error(
                "InformationRouter: packet must be an InformationPacket instance"
            );

        }

        if (this.hasPacket(packet.id)) {

            throw new Error(
                `Duplicate packet id: ${packet.id}`
            );

        }

        this.#packets.push(packet);

    }

    getVisiblePackets(playerId, traitorPlayerId) {

        return this.#packets.filter(
            p => isVisibleTo(
                p.audience,
                playerId,
                traitorPlayerId
            )
        );

    }

    hasPacket(id) {
        return this.#packets.some(p => p.id === id);
    }

    getAllPackets() {
        return this.#packets.slice();
    }

    getPacketsByAudience(audience) {
        return this.#packets.filter(
            p => p.audience === audience
        );
    }

    clear() {
        this.#packets = [];
    }

    serialize() {
        return {
            packets: this.#packets.map(p => ({
                id: p.id,
                audience: p.audience,
                scope: p.scope,
                payload: p.payload !== null
                    ? structuredClone(p.payload)
                    : null
            }))
        };
    }

    deserialize(data) {

        if (!data || !Array.isArray(data.packets)) {
            this.#packets = [];
            return;
        }

        this.#packets = data.packets.map(
            p => new InformationPacket({
                id: p.id,
                audience: p.audience,
                scope: p.scope,
                payload: p.payload
            })
        );

    }

}
