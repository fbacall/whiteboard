var x = 0, y = 1; // Constants

var socket = io();
var buffer = []; // Buffer of drawing commands to send to server

// Object to hold mouse state
var mouse = {
    down: false,
    position: [],
    downPosition: []
};

var colour, tool; // selected drawing colour and tool

var previewCanvas, drawingCanvas, previewCtx, drawingCtx;

var interval;

$(document).ready(function() {
    previewCanvas = document.getElementById("preview-canvas");
    drawingCanvas = document.getElementById("drawing-canvas");
    previewCtx = previewCanvas.getContext("2d");
    drawingCtx = drawingCanvas.getContext("2d");

    previewCanvas.addEventListener("mousedown", function (event) { tool.mouseDown(event) }, false);
    previewCanvas.addEventListener("mouseup", function (event) { tool.mouseUp(event) }, false);
    previewCanvas.addEventListener("mousemove", function (event) { tool.mouseMove(event) }, false);

    interval = window.setInterval(send, 500); // Send data every half a second.

    $('.colour').click(function () {
        selectColour($(this).css('background-color').slice(4,-1).split(','));
    });

    $('.tool').click(function () {
        selectTool($(this).data('tool'));
    });

    selectColour([0,0,0]);
    selectTool('brush');
});

// Draw incoming data
socket.on('draw', function(data) {
    drawing.draw.list(drawingCtx, data);
});

// Draw the initial canvas state
socket.on('state', function(state) {
    var img = new Image;
    img.onload = function() {
        drawingCtx.drawImage(img,0,0);
    };
    img.src = state;
});

function send() {
    if(buffer.length > 0) {
        buffer.unshift(['c', [colour]]); // This isn't really the right time to do this.
        socket.emit('draw', buffer);
        buffer = [];
    }
}

function selectColour(c) {
    colour = c;
    $('#selected-colour').css('background-color', 'rgb(' + colour.join(',') + ')');
}

function selectTool(t) {
    $('.tool.selected').removeClass('selected');
    $(".tool[data-tool='"+t+"']").addClass('selected');
    tool = tools[t];
}

// Get the position of the mouse on the canvas
function getPosition(event) {
    var r = previewCanvas.getBoundingClientRect();

    return [event.clientX - r.left - document.documentElement.scrollLeft,
        event.clientY - r.top - document.documentElement.scrollTop];
}

function clearPreview() {
    previewCtx.save();
    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.restore();
}

var tools = {
    brush: {
        mouseDown: function (event) {
            mouse.down = true;
            mouse.position = getPosition(event);
        },
        mouseMove: function (event) {
            if (mouse.down) {
                drawingCtx.strokeStyle = 'rgb(' + colour.join(',') + ')';
                var startPos = [mouse.position[x], mouse.position[y]];
                var endPos = getPosition(event);
                var command = ['l', [startPos, endPos]];
                drawing.draw.single(drawingCtx, command);
                buffer.push(command); // Keep a buffer of all the drawing commands performed, to be sent asynchronously.
                mouse.position[x] = endPos[x];
                mouse.position[y] = endPos[y];
            }
        },
        mouseUp: function (event) {
            mouse.down = false;
        }
    },

    line: {
        mouseDown: function (event) {
            mouse.down = true;
            mouse.downPosition = getPosition(event);
        },
        mouseMove: function (event) {
            if (mouse.down) {
                this.drawLine(previewCtx, event);
            }
        },
        mouseUp: function (event) {
            mouse.down = false;
            buffer.push(this.drawLine(drawingCtx, event));
            mouse.downPosition = [];
        },

        drawLine: function (ctx, event) {
            clearPreview();
            ctx.strokeStyle = 'rgb(' + colour.join(',') + ')';
            var startPos = [mouse.downPosition[x], mouse.downPosition[y]];
            var endPos = getPosition(event);
            var command = ['l', [startPos, endPos]];
            drawing.draw.single(ctx, command);

            return command;
        }
    },

    quad: {
        mouseDown: function (event) {
            mouse.down = true;
            mouse.downPosition = getPosition(event);
        },
        mouseMove: function (event) {
            if (mouse.down) {
                this.drawBox(previewCtx, event);
            }
        },
        mouseUp: function (event) {
            mouse.down = false;
            buffer = buffer.concat(this.drawBox(drawingCtx, event));
            mouse.downPosition = [];
        },

        drawBox: function (ctx, event) {
            clearPreview();
            ctx.strokeStyle = 'rgb(' + colour.join(',') + ')';
            var v1 = [mouse.downPosition[x], mouse.downPosition[y]];
            var v3 = getPosition(event);

            var v2 = [v1[x], v3[y]],
                v4 = [v3[x], v1[y]];

            var commands = [
                ['l', [v1, v2]],
                ['l', [v2, v3]],
                ['l', [v3, v4]],
                ['l', [v4, v1]]
            ];
            drawing.draw.list(ctx, commands);

            return commands;
        }
    }
};
