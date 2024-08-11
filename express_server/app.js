const express = require("express");
const app = express();
const serv = require('http').Server(app);
const path = require("path");


app.get("/", (req, res) => {
    //res.send("hello server!");
    res.sendFile(path.join(__dirname + "/client/index.html"));
});

app.use('/client', express.static(__dirname + '/client'));

//app.listen(3000, () => {
//    console.log("server running ok, port", 3000);
//})

serv.listen(2000);
console.log("server started.");

var SOCKET_LIST = {};

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    socket.x = 10;
    socket.y = 10;
    SOCKET_LIST[socket.id] = socket;

    /*console.log('socket connection');
    */

    socket.on('subir', function (data) {
        console.log('subiendo');
        socket.y += data.y;

    });
    socket.on('bajar', function (data) {
        console.log('bajando');
        socket.y += data.y;
    });

    socket.emit('serverMsg', {
        msg: 'te habla el server',
    });
});

setInterval(function () {
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        //socket.x++;
        //socket.y++;
        socket.emit('newPosition', {
            x: socket.x,
            y: socket.y,
        });
    }
}, 1000 / 25) // 25fps