export function installTestDom() {
    function createElement(tag) {
        const listeners = {};
        const el = {
            tagName: tag.toUpperCase(),
            className: "",
            textContent: "",
            value: "",
            placeholder: "",
            disabled: false,
            children: [],
            parentNode: null,
            attributes: {},
            style: {},
            append(...nodes) {
                nodes.forEach(node => this.appendChild(node));
            },
            appendChild(child) {
                child.parentNode = this;
                this.children.push(child);
                return child;
            },
            removeChild(child) {
                this.children = this.children.filter(node => node !== child);
                child.parentNode = null;
            },
            remove() {
                this.parentNode?.removeChild?.(this);
            },
            replaceChildren(...nodes) {
                this.children.forEach(child => { child.parentNode = null; });
                this.children = [];
                this.textContent = "";
                nodes.forEach(node => this.appendChild(node));
            },
            setAttribute(name, value) {
                this.attributes[name] = value;
                this[name] = value;
            },
            getAttribute(name) {
                return this.attributes[name];
            },
            addEventListener(event, handler) {
                listeners[event] = listeners[event] || new Set();
                listeners[event].add(handler);
            },
            removeEventListener(event, handler) {
                listeners[event]?.delete(handler);
            },
            click() {
                if (this.disabled) return;
                for (const handler of [...(listeners.click || [])]) {
                    handler({ target: this });
                }
            },
            dispatchInput(value) {
                this.value = value;
                for (const handler of [...(listeners.input || [])]) {
                    handler({ target: this });
                }
            },
            getContext() {
                return {
                    clearRect() {},
                    fillRect() {},
                    strokeRect() {},
                    fillText() {},
                    beginPath() {},
                    arc() {},
                    fill() {},
                    stroke() {}
                };
            }
        };
        Object.defineProperty(el, "innerHTML", {
            get() {
                return this.children.map(child => child.textContent || "").join("");
            },
            set() {
                this.replaceChildren();
            }
        });
        return el;
    }

    global.document = { createElement };
}

export function textOf(node) {
    if (!node) return "";
    return [
        node.textContent || "",
        ...node.children.map(child => textOf(child))
    ].join(" ");
}

export function findButton(node, label) {
    if (!node) return null;
    if (node.tagName === "BUTTON" && node.textContent === label) return node;
    for (const child of node.children) {
        const found = findButton(child, label);
        if (found) return found;
    }
    return null;
}

export function findFirst(node, predicate) {
    if (!node) return null;
    if (predicate(node)) return node;
    for (const child of node.children) {
        const found = findFirst(child, predicate);
        if (found) return found;
    }
    return null;
}
