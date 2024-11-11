//server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Variables para gestionar los turnos
let currentTurn = 0;
let players = []; // Aquí se guardarán los sockets conectados
let playerIndex = players.length; // El primer jugador será 0, el siguiente 1, etc.

// Imagenes disponibles para los jugadores
const playerImages = ['images/player-1.png', 'images/player-2.png', 'images/player-3.png', 'images/player-4.png', 'images/player-5.png', 'images/player-0.png'];

io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado: ', socket.id);
    console.log('player lenght: ', players.length);
    playerIndex = players.length;

    // Asignamos un número de jugador basado en la longitud de la lista
    //players.push({ id: playerIndex, socketId: socket.id });
    console.log('idx: ', playerIndex);
    socket.emit('setPlayerIndex', playerIndex);
    // Asigna la imagen al jugador
    let randomImage = playerImages[Math.floor(Math.random() * playerImages.length)];
    socket.emit('setPlayerImage', randomImage);

    // Añadir el nuevo jugador a la lista usando playerIndex
    players.push({ id: playerIndex, socketId: socket.id });

    // Enviar el turno a todos los jugadores
    io.emit('updateTurn', currentTurn);
    /*
    socket.on('setPlayerIndex', (playerIndex) => {
    });
    */

    // Verificar el turno del jugador al hacer clic
    socket.on('rollDice', (rolled) => {
        // Si es el primero, comienza el juego
        if (players[currentTurn].socketId === socket.id) {
            io.emit('diceRolled', rolled); // Enviar el resultado a todos
            // Cambiar al siguiente jugador
            //console.log('player lenght: ', players.length);
            if (players.length - 1 === currentTurn) {
                currentTurn = 0;  // El primer jugador tiene el primer turno
            } else currentTurn++;
            console.log('Le toca a: ', currentTurn);
            io.emit('updateTurn', currentTurn); // Actualizar turno
        }
    });

    // Desconexión del jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        console.log('player lenght: ', players.length);
        players = players.filter(player => player.socketId !== socket.id);
        if (players.length === 0) {
            currentTurn = 0; // Resetear el turno si no hay jugadores
        } else {
            // Recalcular el índice para asegurarse de que no haya huecos
            players.forEach((player, index) => {
                player.id = index; // Actualizamos el índice del jugador
            });
        }
        console.log('Jugadores después de la desconexión:', players);
    });
});

server.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});
