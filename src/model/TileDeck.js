export default class TileDeck {

    constructor(tiles = [])
    {
        this.tiles = [...tiles];

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
                    Math.random() * (i + 1)
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
    }

    peek()
    {
        return this.tiles.length > 0
            ? this.tiles[0]
            : null;
    }

    draw()
    {
        return this.tiles.shift();
    }

    discard()
    {
        return this.tiles.shift();
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
    }

    count()
    {
        return this.tiles.length;
    }

    isEmpty()
    {
        return this.tiles.length === 0;
    }
}