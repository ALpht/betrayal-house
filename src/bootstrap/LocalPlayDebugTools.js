export function createLocalPlayDebugTools({ getSession, root }) {
    const enabled = Boolean(import.meta.env?.DEV);
    const container = document.createElement("section");
    const button = document.createElement("button");

    container.className = "local-debug";
    container.hidden = true;
    button.type = "button";
    button.textContent = "Debug: Start Relic Escape";

    const handler = () => {
        getSession()?.startScenario("relicEscape");
    };

    button.addEventListener("click", handler);
    container.appendChild(button);

    if (enabled) {
        container.hidden = false;
        root.appendChild(container);
    }

    return {
        destroy() {
            button.removeEventListener("click", handler);
            container.remove();
        }
    };
}
