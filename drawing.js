(function(exports){
    const x = 0;
    const y = 1;

    // Draw data onto canvas
    function drawCommands(ctx, data) {
        for (let i = 0; i < data.length; i++) {
            drawCommand(ctx, data[i]);
        }
    }

    function drawCommand(ctx, command) {
        commands[command[0]].apply(ctx, command[1]); // Pass context as "this" lol
    }

    const commands = {
        // Draw a line from start point ([x,y]) to end point
        l: function (start, end) {
            this.beginPath();
            this.moveTo(start[x], start[y]);
            this.lineTo(end[x], end[y]);
            this.stroke();
        },

        // Draw a quadratic curve
        qc: function (start, control, end) {
            this.beginPath();
            this.moveTo(start[x], start[y]);
            this.quadraticCurveTo(control[x], control[y], end[x], end[y]);
            this.stroke();
        },

        // Draw a bezier curve
        bc: function (start, c1, c2, end) {
            this.beginPath();
            this.moveTo(start[x], start[y]);
            this.bezierCurveTo(c1[x], c1[y], c2[x], c2[y], end[x], end[y]);
            this.stroke();
        },

        // Draw a box, where v1-v4 are the coordinates of each corner
        b: function (v1, v2, v3, v4, fill) {
            this.beginPath();
            this.moveTo(v1[x], v1[y]);
            this.lineTo(v2[x], v2[y]);
            this.lineTo(v3[x], v3[y]);
            this.lineTo(v4[x], v4[y]);
            this.lineTo(v1[x], v1[y]);
            if(fill)
                this.fill();
            else
                this.stroke();
        },

        // Switch the drawing colour
        c: function (colour) {
            this.strokeStyle = "rgb(" + colour.join(',') + ")";
            this.fillStyle = "rgb(" + colour.join(',') + ")";
        },

        // Switch the line thickness
        s: function (size) {
            this.lineWidth = size;
        }
    };

    exports.draw = {
        list: drawCommands,
        single: drawCommand
    }
})(typeof exports === 'undefined'? this['drawing']={}: exports);
// Pattern from: http://caolanmcmahon.com/posts/writing_for_node_and_the_browser/
