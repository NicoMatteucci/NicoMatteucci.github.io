const express = require("express");
const app = express();
const serv = require('http').Server(app);
const path = require("path");
const { disconnect } = require("process");


app.get("/", (req, res) => {
    //res.send("hello server!");
    res.sendFile(path.join(__dirname + "/client/index.html"));
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("server started.");

var SOCKET_LIST = {};

var Entity = function () {
    var self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        id: "",
    }
    self.update = function () {
        self.updatePosition();
    }
    self.updatePosition = function () {
        self.x += self.spdX;
        self.y += self.spdY;
    }
    self.getDistance = function (pt) {
        return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
    }
    return self;
}

//PLAYER SELF INFO
var Player = function (id) {
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpd = 10;

    var super_update = self.update;
    self.update = function () {
        self.updateSpd();
        super_update();
        //bullet for each player
        if (self.pressingAttack) {
            self.shootBullet(self.mouseAngle);
        }
    }

    self.shootBullet = function (angle) {
        var b = Bullet(self.id, angle);
        b.x = self.x;
        b.y = self.y;
    }

    self.updateSpd = function () {
        if (self.pressingRight)
            self.spdX = self.maxSpd;
        else if (self.pressingLeft)
            self.spdX = -self.maxSpd;
        else self.spdX = 0;
        if (self.pressingUp)
            self.spdY = -self.maxSpd;
        else if (self.pressingDown)
            self.spdY = self.maxSpd;
        else self.spdY = 0;
    }
    Player.list[id] = self;
    return self;
}

//just 1 copy of the list
Player.list = {};

Player.onConnect = function (socket) {
    var player = Player(socket.id);
    //actualiza posicion con la tecla presionada
    socket.on('keyPress', function (data) {
        if (data.inputId === 'right') player.pressingRight = data.state;
        else if (data.inputId === 'left') player.pressingLeft = data.state;
        else if (data.inputId === 'up') player.pressingUp = data.state;
        else if (data.inputId === 'down') player.pressingDown = data.state;
        else if (data.inputId === 'attack') player.pressingAttack = data.state;
        else if (data.inputId === 'mouseAngle') player.mouseAngle = data.state;
    });
}
Player.onDisconnect = function (socket) {
    delete Player.list[socket.id];
}
Player.update = function () {
    var pack = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number,
        })
    }
    return pack;
}

var Bullet = function (parent, angle) {
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle / 180 * Math.PI) * 10;
    self.spdY = Math.sin(angle / 180 * Math.PI) * 10;
    self.parent = parent;
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function () {
        if (self.timer++ > 100)
            self.toRemove = true;
        super_update();

        for (var i in Player.list) {
            var p = Player.list[i]
            if (self.getDistance(p) < 32 && self.parent !== p.id) {
                //handle collision
                //ex: hp--;
                self.toRemove = true;
            }
        }
    }
    Bullet.list[self.id] = self;
    return self;
}
Bullet.list = {};

Bullet.update = function () {

    var pack = [];
    for (var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update();
        if (bullet.toRemove) delete Bullet.list[i];
        else {
            pack.push({
                x: bullet.x,
                y: bullet.y,
            });
        }
    }
    return pack;
}

var DEBUG = true;

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    socket.x = 0;
    socket.y = 0;
    socket.number = "" + Math.floor(10 * Math.random());
    SOCKET_LIST[socket.id] = socket;
    socket.emit('boardInit');

    Player.onConnect(socket);

    socket.on('disconnect', function () {
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
        delete Player.list[socket.id];
    });

    socket.on('sendMsgToServer', function (data) {
        var playerName = ("" + socket.id).slice(2, 7);
        for (var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
        }
    });
    //cannot be on public server
    socket.on('evalServer', function (data) {
        if (!DEBUG) return;
        else {
            var res = eval(data);
            socket.emit('evalAnswer', res);
        }
    });

    socket.on('subir', function (data) {
        console.log('subiendo');
        socket.y -= data.y;
    });

    socket.on('bajar', function (data) {
        console.log('bajando');
        socket.y += data.y;
    });

});

setInterval(function () {
    var pack = {
        player: Player.update(),
        bullet: Bullet.update(),
    }

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newPosition', pack);
    }
}, 1000 / 25) // 25fps