const x = 0, y = 1; // Constants

const socket = io({ path: window.location.pathname + 'socket.io' });
const buffer = []; // Buffer of drawing commands to send to server

// Object to hold mouse state
const mouse = {
    down: false,
    position: [],
    downPosition: []
};

let colour, tool, size; // selected drawing colour, tool and brush size

let previewCanvas, drawingCanvas, previewCtx, drawingCtx;

let interval;

document.addEventListener("DOMContentLoaded", function() {
    previewCanvas = document.getElementById("preview-canvas");
    drawingCanvas = document.getElementById("drawing-canvas");
    previewCtx = previewCanvas.getContext("2d");
    drawingCtx = drawingCanvas.getContext("2d");
    drawingCtx.lineCap = "round";

    previewCanvas.addEventListener("mousedown", function (event) { tool.mouseDown(event) }, false);
    window.addEventListener("mouseup", function (event) { tool.mouseUp(event) }, false);
    window.addEventListener("mousemove", function (event) { tool.mouseMove(event) }, false);

    interval = window.setInterval(send, 500); // Send data every half a second.

    document.querySelectorAll(".colour").forEach(e =>
        e.addEventListener("click", () => selectColour(e.style.backgroundColor.slice(4,-1).split(',')))
    );

    document.querySelectorAll(".tool").forEach(e =>
        e.addEventListener("click", () => selectTool(e.dataset.tool))
    );

    document.getElementById("size-select").addEventListener("change", function () {
        selectSize(this.value);
    });

    selectColour([0, 0, 0]);
    selectTool('brush');
    selectSize(2);
});

// Draw incoming data
socket.on('draw', function(data) {
    drawing.draw.list(drawingCtx, data);
});

// Draw the initial canvas state
socket.on('state', function(state) {
    const img = new Image;
    img.onload = function() {
        drawingCtx.drawImage(img, 0, 0);
    };
    img.src = state;
});

function send() {
    if(buffer.length > 0) {
        buffer.unshift(['c', [colour]]); // Make sure to set the drawing colour
        buffer.unshift(['s', [size]]); // and size size
        socket.emit('draw', buffer);
        buffer.length = 0;
    }
}

function selectColour(c) {
    colour = c;
    document.getElementById('selected-colour').style.backgroundColor = 'rgb(' + colour.join(',') + ')';
}

function selectTool(t) {
    const selectedTool = document.querySelector('.tool.selected');
    if (selectedTool)
        selectedTool.classList.remove('selected');
    document.querySelector(".tool[data-tool='"+t+"']").classList.add('selected');
    tool = tools[t];
}

function selectSize(s) {
    size = s;
}

// Get the position of the mouse on the canvas
function getPosition(event) {
    const r = previewCanvas.getBoundingClientRect();
    let x = event.clientX - r.left - document.documentElement.scrollLeft;
    let y = event.clientY - r.top - document.documentElement.scrollTop;
    if (x < 0)
        x = 0;
    if (y < 0)
        y = 0;
    if (x >= r.right)
        x = r.right;
    if (y >= r.bottom)
        y = r.bottom;

    return [x, y];
}

function clearPreview() {
    previewCtx.save();
    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.restore();
}

const tools = {};
tools.brush = {
    points: [],

    mouseDown: function (event) {
        mouse.down = true;
        this.points = [getPosition(event)];
    },
    mouseMove: function (event) {
        if (mouse.down) {
            if (this.points.length >= 6) {
                tools.brush.drawCurve(event);
            } else {
                this.points.push(getPosition(event));
            }
        }
    },
    mouseUp: function (event) {
        mouse.down = false;
        if (this.points.length) {
            tools.brush.drawCurve(event);
        }
        this.points = [];
    },
    drawCurve: function () {
        drawingCtx.lineWidth = size;
        drawingCtx.strokeStyle = 'rgb(' + colour.join(',') + ')';
        const startPos = this.points[0];
        const endPos = this.points[this.points.length - 1];

        if (this.points.length <= 2) {
            this.points.push(startPos);
            this.points.push(endPos);
        }

        const c1 = [0,0];
        for (let i = 1; i < this.points.length - 1; i++) {
            c1[0] += this.points[i][0];
            c1[1] += this.points[i][1];
        }
        c1[0] = c1[0] / (this.points.length - 2);
        c1[1] = c1[1] / (this.points.length - 2);
        const command = ['qc', [startPos, c1, endPos]];
        drawing.draw.single(drawingCtx, command);
        buffer.push(command); // Keep a buffer of all the drawing commands performed, to be sent asynchronously.
        this.points = [this.points[this.points.length - 1]];
    }
};

tools.line = {
    origin: null,

    mouseDown: function (event) {
        mouse.down = true;
        this.origin = getPosition(event);
    },
    mouseMove: function (event) {
        if (mouse.down) {
            this.drawLine(previewCtx, event);
        }
    },
    mouseUp: function (event) {
        mouse.down = false;
        if (this.origin) {
            buffer.push(this.drawLine(drawingCtx, event));
            this.origin = null;
        }
    },

    drawLine: function (ctx, event) {
        clearPreview();
        ctx.lineWidth = size;
        ctx.strokeStyle = 'rgb(' + colour.join(',') + ')';
        const startPos = [this.origin[x], this.origin[y]];
        const endPos = getPosition(event);
        const command = ['l', [startPos, endPos]];
        drawing.draw.single(ctx, command);

        return command;
    }
};

tools.quad = {
    origin: null,
    fill: false,

    mouseDown: function (event) {
        mouse.down = true;
        this.origin = getPosition(event);
    },
    mouseMove: function (event) {
        if (mouse.down) {
            this.drawBox(previewCtx, event);
        }
    },
    mouseUp: function (event) {
        mouse.down = false;
        if (this.origin) {
            buffer.push(this.drawBox(drawingCtx, event));
            this.origin = null;
        }
    },

    drawBox: function (ctx, event) {
        clearPreview();
        ctx.lineWidth = size;
        ctx.strokeStyle = 'rgb(' + colour.join(',') + ')';
        ctx.fillStyle = 'rgb(' + colour.join(',') + ')';
        const v1 = [this.origin[x], this.origin[y]];
        const v3 = getPosition(event);

        const v2 = [v1[x], v3[y]],
              v4 = [v3[x], v1[y]];

        const command = ['b', [v1, v2, v3, v4, this.fill]];
        drawing.draw.single(ctx, command);

        return command;
    }
};

// TODO: Inherit from quad
tools.fillQuad = { fill: true };
tools.fillQuad.__proto__ = tools.quad;
