export class ScenarioServices {

    #services;

    constructor(services = {}) {
        this.#services = new Map();

        for (const [name, instance] of Object.entries(services)) {
            this.#services.set(name, instance);
        }

    }

    get(name) {

        if (!this.#services.has(name)) {

            throw new Error(
                `ScenarioServices: unknown service "${name}"`
            );

        }

        return this.#services.get(name);

    }

    register(name, service) {

        if (this.#services.has(name)) {

            throw new Error(
                `ScenarioServices: service "${name}" already registered`
            );

        }

        this.#services.set(name, service);

    }

}
