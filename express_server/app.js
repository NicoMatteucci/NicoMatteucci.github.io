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

var POSITION_MOVE = [
    {
        x: 0,
        y: 0,
    }
];

var setPositions = function () {
    var pos_1 = { x: -10, y: 0 };//x
    var pos_2 = { x: 0, y: -10 };//y
    var pos_3 = { x: 10, y: 0 };//x
    var pos_4 = { x: 0, y: 10 };//y
    for (var i in POSITION_MOVE) {
        if (i < 10)
            POSITION_MOVE[i] = pos_1;
        else if (i < 20)
            POSITION_MOVE[i] = pos_2;
        else if (i < 30)
            POSITION_MOVE[i] = pos_3;
        else if (i < 40)
            POSITION_MOVE[i] = pos_4;
    }
    console.log("actualizo los delta en tablero");
};
setPositions();

var Entity = function () {
    var self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        id: "",
        pos: 0,
    }
    self.update = function () {
        self.updatePosition();
    }
    self.updatePosition = function () {
        if (DEBUG) {
            self.x += self.spdX;
            self.y += self.spdY;
        } else {
            self.x += POSITION_MOVE[self.pos].x;
            self.y += POSITION_MOVE[self.pos].y;
        }
    }
    self.getDistance = function (pt) {
        return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
    }
    return self;
}

var max_players = 6;

//PLAYER SELF INFO
var Player = function (id) {
    var self = Entity();
    self.id = id;
    //uses this number to select the image on client side
    self.number = "" + Math.floor(max_players * Math.random());
    //console.log("your self.number: " + self.number);
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
            pos: player.pos,
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

var DEBUG = false;

var USERS = {
    //username:password
    "fede": "fede",
    "juli": "juli",
    "marian": "marian",
    "nico": "nico",
}

var isValidPassword = function (data, cb) {
    setTimeout(function () {
        cb(USERS[data.username] === data.password);
    }, 10);
}
var isUsernameTaken = function (data, cb) {
    setTimeout(function () {
        cb(USERS[data.username]);
    }, 10);
}
var addUser = function (data, cb) {
    setTimeout(function () {
        USERS[data.username] = data.password;
        cb();
    }, 10);
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    socket.x = 0;
    socket.y = 0;
    //using max_player may implied if number repited players can step on each other losing their socket
    socket.number = "" + Math.floor(max_players * Math.random());
    SOCKET_LIST[socket.id] = socket;
    //console.log("your socket.number: " + socket.number);


    socket.on('signIn', function (data) {
        isValidPassword(data, function (res) {
            if (res) {
                //creates a player when connected and update its position
                Player.onConnect(socket);
                socket.emit('signInResponse', { success: true });
            } else {
                socket.emit('signInResponse', { success: false });
            }
        });
    });
    socket.on('signUp', function (data) {
        isUsernameTaken(data, function (res) {
            if (res) {
                socket.emit('signUpResponse', { success: false });
            } else {
                addUser(data, function () {
                    socket.emit('signUpResponse', { success: true });
                });
            }
        });
    });


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

    socket.on('roll', function (data) {
        var res = {
            dice: Math.floor(data.faces * Math.random() + 1),
        };
        Player.pos = data.pos;
        for (var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('rolled', res);
        }
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