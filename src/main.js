import "./testRunner.js";

import { GraphMap } from "./model/GraphMap.js";
import { RoomNode } from "./model/RoomNode.js";
import { RoomTile } from "./model/RoomTile.js";
import { TileDeck } from "./model/TileDeck.js";

import { ExploreController } from "./controller/ExploreController.js";

import { RoomDefinitions } from "./data/RoomDefinitions.js";

import { Camera } from "./view/Camera.js";
import { MapRenderer } from "./view/MapRenderer.js";
import { DebugOverlay } from "./view/DebugOverlay.js";

const TEST_MODE = true;

if (TEST_MODE) {
    // 只跑測試
}
else {
    startGame();
}

function startGame() {
    /* =========================
     * Canvas Setup
     * ========================= */

    const app =
        document.getElementById(
            "app"
        );

    const canvas =
        document.createElement(
            "canvas"
        );

    app.appendChild(
        canvas
    );

    const ctx =
        canvas.getContext(
            "2d"
        );

    function resize() {

        canvas.width =
            window.innerWidth;

        canvas.height =
            window.innerHeight;
    }

    window.addEventListener(
        "resize",
        resize
    );

    resize();

    /* =========================
     * Graph System
     * ========================= */

    const graph =
        new GraphMap();

    const camera =
        new Camera();

    camera.x = 400;
    camera.y = 250;

    const mapRenderer =
        new MapRenderer(
            graph,
            camera
        );

    const debug =
        new DebugOverlay();

    debug.log(
        "Map System Initialized"
    );

    const entrance =
        new RoomNode(
            0,
            new RoomTile(
                0,
                "Entrance Hall",
                {
                    north: true,
                    east: true,
                    south: true,
                    west: true
                }
            ),
            0,
            0
        );

    graph.addRoom(
        entrance
    );

    const deck =
        new TileDeck(
            RoomDefinitions
        );

    const explorer =
        new ExploreController(
            graph,
            deck
        );

    /* =========================
     * Temporary Map Seed
     * ========================= */

    explorer.explore(1, 0);
    explorer.explore(2, 0);
    explorer.explore(2, 1);
    explorer.explore(3, 0);

    /* =========================
     * Render
     * ========================= */

    function draw() {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle =
            "#111";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle =
            "#fff";

        ctx.font =
            "30px sans-serif";

        ctx.fillText(
            "Betrayal House",
            40,
            60
        );

        ctx.fillText(
            `Rooms: ${graph.getAllRooms()
                .length
            }`,
            40,
            120
        );

        mapRenderer.render(
            ctx
        );

        debug.render(
            ctx
        );

        requestAnimationFrame(
            draw
        );
    }

    draw();
}