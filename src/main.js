import { EventBus } from "./core/EventBus.js";
import { EventTypes } from "./core/EventTypes.js";
import { GameStateManager } from "./state/GameStateManager.js";

import { GraphMap } from "./model/GraphMap.js";
import { RoomNode } from "./model/RoomNode.js";
import { RoomTile } from "./model/RoomTile.js";
import { TileDeck } from "./model/TileDeck.js";

import { ExploreController } from "./controller/ExploreController.js";

import { RoomDefinitions } from "./data/RoomDefinitions.js";

import { Camera } from "./view/Camera.js";
import { MapRenderer } from "./view/MapRenderer.js";
import { DebugOverlay } from "./view/DebugOverlay.js";

import { CharacterDefinitions } from './data/CharacterDefinitions.js';
import { Player } from './model/Player.js';

const player = new Player(
    CharacterDefinitions[0]
);

console.log(player);

/* =========================
 * Canvas Setup
 * ========================= */

const app = document.getElementById("app");

const canvas = document.createElement("canvas");

app.appendChild(canvas);

const ctx = canvas.getContext("2d");

function resize() {

    canvas.width = window.innerWidth;

    canvas.height = window.innerHeight;
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

debug.log(
    `Rooms: ${graph.getAllRooms().length
    }`
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
 * Test Explore
 * ========================= */

explorer.explore(1, 0);
explorer.explore(2, 0);
explorer.explore(2, 1);
explorer.explore(3, 0);

console.log(
    "房間數:",
    graph.getAllRooms().length
);

console.log(
    graph.getAllRooms()
);

console.log(
    graph
        .getRoom(1, 0)
        .getNeighbors()
);

/* =========================
 * EventBus Test
 * ========================= */

EventBus.on(
    EventTypes.GAME_STATE_CHANGED,
    state => {

        console.log(
            "狀態切換:",
            state
        );
    }
);

setTimeout(
    () => {

        GameStateManager
            .triggerHaunt();

    },
    3000
);

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
        `State: ${GameStateManager.getState()}`,
        40,
        120
    );

    ctx.fillText(
        `Rooms: ${graph.getAllRooms().length}`,
        40,
        180
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
