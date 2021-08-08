var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Canvas = require('canvas');
var drawing = require('./drawing');
var util = require('util');

var canvas = Canvas.createCanvas(1024, 600);
var ctx = canvas.getContext('2d');
ctx.strokeStyle = "rgb(0, 0, 0)";
ctx.lineCap = "round";

var port = parseInt(process.argv[2] || '3000');
var debug = process.argv[3] == 'true';

app.get('/', function(req, res) {
    res.sendFile('client.html', { root: __dirname });
});

app.get('/drawing.js', function(req, res) {
    res.sendFile('drawing.js', { root: __dirname });
});

app.get('/client.js', function(req, res) {
    res.sendFile('client.js', { root: __dirname });
});

app.get('/client.css', function(req, res) {
    res.sendFile('client.css', { root: __dirname });
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
