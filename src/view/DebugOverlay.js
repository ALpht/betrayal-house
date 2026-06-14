export default class DebugOverlay {

    constructor() {

        this.lines = [];

        this.maxLines = 12;
    }

    log(message) {

        this.lines.push(message);

        if(
            this.lines.length >
            this.maxLines
        )
        {
            this.lines.shift();
        }
    }

    render(ctx) {

        ctx.save();

        ctx.fillStyle =
            "rgba(0,0,0,.7)";

        ctx.fillRect(
            10,
            10,
            350,
            220
        );

        ctx.fillStyle =
            "#00ff00";

        ctx.font =
            "14px monospace";

        let y = 35;

        for(const line of this.lines)
        {
            ctx.fillText(
                line,
                20,
                y
            );

            y += 18;
        }

        ctx.restore();
    }
}