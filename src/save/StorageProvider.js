export class StorageProvider {

    save(key, data) {
        throw new Error("StorageProvider.save() must be overridden");
    }

    load(key) {
        throw new Error("StorageProvider.load() must be overridden");
    }

    remove(key) {
        throw new Error("StorageProvider.remove() must be overridden");
    }

}
