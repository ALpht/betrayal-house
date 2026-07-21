export function createElement(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

export function createButton(label, handler, { className = "local-command", disabled = false } = {}) {
    const button = createElement("button", className, label);
    button.disabled = Boolean(disabled);
    button.addEventListener("click", handler);
    return button;
}

export function createLabeledInput({ label, value = "", placeholder = "", onInput }) {
    const wrapper = createElement("label", "local-label");
    const text = createElement("span", "", label);
    const input = createElement("input", "local-control");
    input.value = value;
    input.placeholder = placeholder;
    input.addEventListener("input", () => onInput?.(input.value));
    wrapper.append(text, input);
    return { wrapper, input };
}
