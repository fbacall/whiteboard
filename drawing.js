(function(exports){
    var x = 0;
    var y = 1;

    // Draw data onto canvas
    function drawData(ctx, data) {
        for (var i = 0; i < data.length; i++) {
            var f = data[i].shift();
            commands[f].apply(ctx, data[i]); // Pass context as "this" lol
        }
    }

    commands = {
        // Draw a line from start point ([x,y]) to end point
        l: function (start, end) {
            this.beginPath();
            this.moveTo(start[x], start[y]);
            this.lineTo(end[x], end[y]);
            this.stroke();
        },

        // Switch the drawing colour
        c: function (colour) {
            this.strokeStyle = "rgb(" + colour.join(',') + ")";
        }
    };

    exports.drawData = drawData

})(typeof exports === 'undefined'? this['mymodule']={}: exports);
// Pattern from: http://caolanmcmahon.com/posts/writing_for_node_and_the_browser/
