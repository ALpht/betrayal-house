export class TileDeck {

    constructor(
        tiles = [],
        { random = Math.random } = {}
    )
    {
        this.tiles = [...tiles];
        this.random = random;
        this.version = 0;

        this.shuffle();
    }

    shuffle()
    {
        for(
            let i = this.tiles.length - 1;
            i > 0;
            i--
        )
        {
            const j =
                Math.floor(
                    this.random() * (i + 1)
                );

            [
                this.tiles[i],
                this.tiles[j]
            ] =
            [
                this.tiles[j],
                this.tiles[i]
            ];
        }

        this.version++;
    }

    peek()
    {
        return this.tiles.length > 0
            ? this.tiles[0]
            : null;
    }

    draw()
    {
        if (this.tiles.length === 0) {
            return undefined;
        }

        this.version++;
        return this.tiles.shift();
    }

    discard()
    {
        return this.draw();
    }

    moveTopToBottom()
    {
        if(this.tiles.length <= 1)
        {
            return;
        }

        const tile =
            this.tiles.shift();

        this.tiles.push(tile);
        this.version++;
    }

    count()
    {
        return this.tiles.length;
    }

    isEmpty()
    {
        return this.tiles.length === 0;
    }

    getRemainingTiles()
    {
        const snapshots = this.tiles.map(tile => {
            const snapshot = typeof tile?.clone === "function"
                ? tile.clone()
                : structuredClone(tile);

            if (snapshot?.exits && typeof snapshot.exits === "object") {
                Object.freeze(snapshot.exits);
            }

            return snapshot && typeof snapshot === "object"
                ? Object.freeze(snapshot)
                : snapshot;
        });

        return Object.freeze(snapshots);
    }

    getVersion()
    {
        return this.version;
    }

    commitPlannedDraw({
        selectedTileId,
        selectedTileIndex,
        expectedVersion
    } = {})
    {
        if (
            expectedVersion !== this.version ||
            !Number.isInteger(selectedTileIndex) ||
            selectedTileIndex < 0 ||
            selectedTileIndex >= this.tiles.length ||
            this.tiles[selectedTileIndex]?.id !== selectedTileId
        ) {
            return {
                accepted: false,
                reasonCode: "STALE_TILE_PLAN",
                tile: null
            };
        }

        const selectedTile = this.tiles[selectedTileIndex];
        const skipped = this.tiles.slice(0, selectedTileIndex);
        const remaining = this.tiles.slice(selectedTileIndex + 1);

        this.tiles = [
            ...remaining,
            ...skipped
        ];
        this.version++;

        return {
            accepted: true,
            reasonCode: null,
            tile: selectedTile
        };
    }
}


