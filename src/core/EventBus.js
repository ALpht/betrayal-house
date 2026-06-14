export default class EventBus {

    static listeners =
        new Map();

    static on(
        eventName,
        callback
    )
    {
        if(
            !this.listeners.has(
                eventName
            )
        )
        {
            this.listeners.set(
                eventName,
                []
            );
        }

        this.listeners
            .get(eventName)
            .push(callback);
    }

    static off(
        eventName,
        callback
    )
    {
        const list =
            this.listeners.get(
                eventName
            );

        if(!list)
            return;

        const index =
            list.indexOf(callback);

        if(index >= 0)
        {
            list.splice(
                index,
                1
            );
        }
    }

    static emit(
        eventName,
        payload = null
    )
    {
        const list =
            this.listeners.get(
                eventName
            );

        if(!list)
            return;

        for(const callback of list)
        {
            callback(payload);
        }
    }

    static clear()
    {
        this.listeners.clear();
    }
}