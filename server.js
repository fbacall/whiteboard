const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Canvas = require('canvas');
const drawing = require('./drawing');
const util = require('util');

const canvas = Canvas.createCanvas(1024, 600);
const ctx = canvas.getContext('2d');
ctx.strokeStyle = "rgb(0, 0, 0)";
ctx.lineCap = "round";

const port = parseInt(process.argv[2] || '3000');
const debug = process.argv[3] == 'true';

app.use(express.static('public'));

app.get('/drawing.js', function(req, res) {
    res.sendFile('drawing.js', { root: __dirname });
});

io.on('connection', function(socket) {
    console.log('New connection');
    socket.emit('state', canvas.toDataURL());
    socket.on('draw', function(data) {
        if (debug) {
            console.log(util.inspect(data, {showHidden: false, depth: null}));
        }
        drawing.draw.list(ctx, data);
        socket.broadcast.emit('draw', data);
    });
});

http.listen(port, function() {
    console.log('listening on *:' + port);
});
