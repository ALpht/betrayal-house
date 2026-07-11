let counter = 0;

export const IdGenerator = {

    next(prefix = "pkt") {
        return `${prefix}_${++counter}`;
    },

    _reset() {
        counter = 0;
    }

};
