import "./style.css";
import { createLocalGameDom } from "./bootstrap/createLocalGameDom.js";

const app = document.getElementById("app");

if (!app) {
    throw new Error("Missing #app root");
}

createLocalGameDom({ root: app });
