import "./style.css";
import { createGameApplication } from "./bootstrap/createGameApplication.js";

const app = document.getElementById("app");

if (!app) {
    throw new Error("Missing #app root");
}

createGameApplication({ root: app });
