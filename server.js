var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Canvas = require('canvas');
var drawing = require('./drawing');

var canvas = new Canvas(1024,600);
var ctx = canvas.getContext('2d');
ctx.strokeStyle = "rgb(0, 0, 0)";

app.get('/', function(req, res) {
    res.sendfile('client.html');
});

app.get('/drawing.js', function(req, res) {
    res.sendfile('drawing.js');
});

app.get('/client.js', function(req, res) {
    res.sendfile('client.js');
});

app.get('/client.css', function(req, res) {
    res.sendfile('client.css');
});

io.on('connection', function(socket) {
    console.log('New connection');
    socket.emit('state', canvas.toDataURL());
    socket.on('draw', function(data) {
        drawing.draw.list(ctx, data);
        socket.broadcast.emit('draw', data);
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
