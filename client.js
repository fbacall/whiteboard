var x = 0, y = 1; // Constants

var socket = io();
var buffer = []; // Buffer of drawing commands to send to server

// Object to hold mouse state
var mouse = {
    down: false,
    position: [],
    downPosition: []
};

var colour, tool, size; // selected drawing colour, tool and brush size

var previewCanvas, drawingCanvas, previewCtx, drawingCtx;

var interval;

$(document).ready(function() {
    previewCanvas = document.getElementById("preview-canvas");
    drawingCanvas = document.getElementById("drawing-canvas");
    previewCtx = previewCanvas.getContext("2d");
    drawingCtx = drawingCanvas.getContext("2d");

    previewCanvas.addEventListener("mousedown", function (event) { tool.mouseDown(event) }, false);
    window.addEventListener("mouseup", function (event) { tool.mouseUp(event) }, false);
    window.addEventListener("mousemove", function (event) { tool.mouseMove(event) }, false);

    interval = window.setInterval(send, 500); // Send data every half a second.

    $('.colour').click(function () {
        selectColour($(this).css('background-color').slice(4,-1).split(','));
    });

    $('.tool').click(function () {
        selectTool($(this).data('tool'));
    });

    $('#size-select').change(function () {
        selectSize($(this).val());
    });

    selectColour([0,0,0]);
    selectTool('brush');
    selectSize(2);
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
        buffer.unshift(['c', [colour]]); // Make sure to set the drawing colour
        buffer.unshift(['s', [size]]); // and size size
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

function selectSize(s) {
    //$('.tool.selected').removeClass('selected');
    //$(".tool[data-tool='"+s+"']").addClass('selected');
    size = s;
}

// Get the position of the mouse on the canvas
function getPosition(event) {
    var r = previewCanvas.getBoundingClientRect();
    var x = event.clientX - r.left - document.documentElement.scrollLeft;
    var y = event.clientY - r.top - document.documentElement.scrollTop;
    if(x < 0)
        x = 0;
    if(y < 0)
        y = 0;
    if(x >= r.right)
        x = r.right;
    if(y >= r.bottom)
        y = r.bottom;

    return [x, y];
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
                drawingCtx.lineWidth = size;
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
            ctx.lineWidth = size;
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
            buffer.push(this.drawBox(drawingCtx, event));
            mouse.downPosition = [];
        },

        drawBox: function (ctx, event, fill) {
            fill = fill || false;
            clearPreview();
            ctx.lineWidth = size;
            ctx.strokeStyle = 'rgb(' + colour.join(',') + ')';
            ctx.fillStyle = 'rgb(' + colour.join(',') + ')';
            var v1 = [mouse.downPosition[x], mouse.downPosition[y]];
            var v3 = getPosition(event);

            var v2 = [v1[x], v3[y]],
                v4 = [v3[x], v1[y]];

            var command = ['b', [v1, v2, v3, v4, fill]];
            drawing.draw.single(ctx, command);

            return command;
        }
    },

    // TODO: Inherit from quad
    fillQuad: {
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
            buffer.push(this.drawBox(drawingCtx, event));
            mouse.downPosition = [];
        },
        drawBox: function (ctx, event) {
            return tools.quad.drawBox(ctx, event, true);
        }
    }
};
