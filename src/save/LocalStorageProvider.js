import { StorageProvider }
    from "./StorageProvider.js";

export class LocalStorageProvider
    extends StorageProvider {

    save(key, data) {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

    }

    load(key) {

        const raw =
            localStorage.getItem(key);

        if (!raw) {

            return null;

        }

        return JSON.parse(raw);

    }

    remove(key) {

        localStorage.removeItem(key);

    }

}
