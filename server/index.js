import { MultiplayerSocketServer } from "./MultiplayerSocketServer.js";

const port = Number.parseInt(process.env.PORT || "3001", 10);
const server = new MultiplayerSocketServer({ port });

await server.start();
console.log(`Multiplayer socket server listening on ${server.getPort()}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
        await server.stop();
        process.exit(0);
    });
}
