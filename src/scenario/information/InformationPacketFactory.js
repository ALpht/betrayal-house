import { InformationPacket } from "./InformationPacket.js";
import { IdGenerator } from "./IdGenerator.js";

export const InformationPacketFactory = {

    create({ scope, audience, payload }) {
        const id = IdGenerator.next("info");
        return new InformationPacket({
            id,
            audience,
            scope,
            payload
        });
    }

};
