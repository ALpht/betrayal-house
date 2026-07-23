import { MultiplayerSocketServer } from "./MultiplayerSocketServer.js";

const port = Number.parseInt(process.env.PORT || "3001", 10);
const server = new MultiplayerSocketServer({ port });

await server.start();
console.log(`Multiplayer socket server listening on ${server.getPort()}`);
if (server.getLanAddress()) {
    console.log(`LAN browser URL: http://${server.getLanAddress()}:5173`);
    console.log(`LAN socket URL: http://${server.getLanAddress()}:${server.getPort()}`);
} else {
    console.warn("No private LAN IPv4 address detected. Set LAN_HOST to override.");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
        await server.stop();
        process.exit(0);
    });
}
