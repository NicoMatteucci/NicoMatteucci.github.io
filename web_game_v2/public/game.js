// game.js
const socket = io();
let isMyTurn = false;
let playerImage = ''; // Guardar la imagen asignada al jugador
let playerIndex = 0;//localStorage.getItem('playerIndex'); // Recupera el índice del jugador si ya existe
const diceImageElement = document.getElementById('dice-image');
const diceImages = [
    "images/dice_1.png",
    "images/dice_2.png",
    "images/dice_3.png",
    "images/dice_4.png",
    "images/dice_5.png",
    "images/dice_6.png"
];

// Definir las posiciones del tablero en un array de coordenadas [x, y]
const boardPositions = [
    { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 150, y: 0 }, { x: 200, y: 0 }, { x: 250, y: 0 }, { x: 300, y: 0 }, { x: 350, y: 0 }, { x: 400, y: 0 }, { x: 450, y: 0 }, // Top side
    { x: 500, y: 0 }, { x: 500, y: 50 }, { x: 500, y: 100 }, { x: 500, y: 150 }, { x: 500, y: 200 }, { x: 500, y: 250 }, { x: 500, y: 300 }, { x: 500, y: 350 }, { x: 500, y: 400 }, { x: 500, y: 450 }, // Right side
    { x: 500, y: 500 }, { x: 450, y: 500 }, { x: 400, y: 500 }, { x: 350, y: 500 }, { x: 300, y: 500 }, { x: 250, y: 500 }, { x: 200, y: 500 }, { x: 150, y: 500 }, { x: 100, y: 500 }, { x: 50, y: 500 }, // Bottom side
    { x: 0, y: 500 }, { x: 0, y: 450 }, { x: 0, y: 400 }, { x: 0, y: 350 }, { x: 0, y: 300 }, { x: 0, y: 250 }, { x: 0, y: 200 }, { x: 0, y: 150 }, { x: 0, y: 100 }, { x: 0, y: 50 }, // Left side
];

currentPlayer = {
    position: 0,  // Posición en el índice del tablero (0 a 39)
    x: 0,         // Coordenada X inicial
    y: 0,         // Coordenada Y inicial
};

// Recibir la imagen del jugador desde el servidor
socket.on('setPlayerImage', (image) => {
    playerImage = image;
    console.log('Imagen asignada:', playerImage);
    renderPlayers();
});

// Recibir el turno actualizado
socket.on('updateTurn', (newTurn) => {
    isMyTurn = (newTurn === playerIndex); // Compara el turno con el índice del jugador
    if (isMyTurn) {
        //showDebugMessage("Es tu turno!");
    } else {
        //showDebugMessage("No es tu turno.");
    }
});

// Recibir el resultado del dado
socket.on('diceRolled', (result) => {
    console.log('Resultado del dado:', result);
    // Aquí puedes actualizar la interfaz con el resultado
    diceImageElement.src = diceImages[result - 1]; // Selecciona la imagen correcta
    diceImageElement.style.display = 'block'; // Muestra la imagen del dado
});

// Mostrar mensaje de "no es tu turno"
socket.on('notYourTurn', () => {
    alert('No es tu turno!');
});

// Recibir el índice del jugador desde el servidor
socket.on('setPlayerIndex', (index) => {
    playerIndex = index;
    console.log('Índice asignado al jugador:', playerIndex);
});

// Función para manejar el lanzamiento de dados y el avance del jugador
document.getElementById('roll-dice').addEventListener('click', () => {
    if (isMyTurn) {
        const diceResult = rollDice(); // Lanza el dado
        currentPlayer.position += diceResult;

        // Si supera la casilla 39, lo lleva al inicio (circular)
        if (currentPlayer.position >= 40) {
            currentPlayer.position = currentPlayer.position % 40;
        }

        loadOrUpdatePlayerImage(boardPositions[currentPlayer.position]);
        // Actualizamos la posición en el tablero
        //updatePlayerPosition(boardPositions[currentPlayer.position]);
        //showDebugMessage('x:' + `${boardPositions[currentPlayer.position].x}px` + 'y:' + `${boardPositions[currentPlayer.position].y}px`);
        //const playerImg = document.getElementById(`player-${boardPositions[currentPlayer.position].id}`);
        //showDebugMessage(`player-${socket.id}`);


        socket.emit('rollDice', diceResult); // Enviar evento al servidor para tirar el dado
    } else {
        showDebugMessage(`No es tu turno, espera a que te toque.`);
    }
});

// Función para lanzar el dado
function rollDice() {
    const result = Math.floor(Math.random() * 6) + 1;
    diceImageElement.src = diceImages[result - 1]; // Selecciona la imagen correcta
    diceImageElement.style.display = 'block'; // Muestra la imagen del dado
    showDebugMessage(`Resultado del dado: ${result}`);
    document.getElementById('dice-result').innerText = `Resultado: ${result}`;
    return result;
}

// Función para actualizar la posición del jugador sin crear una nueva imagen
function updatePlayerPosition(player) {
    const playerImg = document.getElementById(`player-${socket.id}`);

    if (playerImg) {
        const scaleFactor = getComputedStyle(document.documentElement).getPropertyValue('--scale-factor');

        // Obtener la nueva posición del jugador en el tablero
        player.x = boardPositions[player.position].x;
        player.y = boardPositions[player.position].y;

        // Actualizar las coordenadas de la imagen existente
        playerImg.style.left = `calc(${player.x}px * ${scaleFactor})`;
        playerImg.style.top = `calc(${player.y}px * ${scaleFactor})`;
    } else {
        console.warn(`No se encontró la imagen del jugador con id ${playerIndex}`);
    }
}

function loadOrUpdatePlayerImage(position) {
    let playerImg = document.getElementById(`player-${playerIndex}`);
    const scaleFactor = getComputedStyle(document.documentElement).getPropertyValue('--scale-factor');

    if (!playerImg) {
        // Si la imagen no existe, la creamos
        playerImg = document.createElement('img');
        playerImg.src = playerImage; // Usamos la imagen asignada por el servidor
        playerImg.classList.add('player');
        playerImg.style.position = 'absolute';
        playerImg.style.left = `0px`;
        playerImg.style.top = `0px`;
        playerImg.style.width = '100px'; // Ajusta el tamaño según lo que necesites
        playerImg.style.height = 'auto';

        // Añadir la imagen al contenedor del tablero
        document.getElementById('board-container').appendChild(playerImg);
    }
    else {
        // Si la imagen ya existe, eliminamos la imagen anterior
        playerImg.remove();

        // Creamos una nueva imagen con las mismas propiedades
        playerImg = document.createElement('img');
        playerImg.src = playerImage; // Usamos la imagen asignada por el servidor
        playerImg.classList.add('player');
        playerImg.style.position = 'absolute';
        playerImg.style.width = '100px'; // Ajusta el tamaño según lo que necesites
        playerImg.style.height = 'auto';
        playerImg.id = `player-${playerIndex}`;

        // Añadir la nueva imagen al contenedor
        document.getElementById('board-container').appendChild(playerImg);
    }
    playerImg.style.left = `${position.x * scaleFactor}px`;
    playerImg.style.top = `${position.y * scaleFactor}px`;
}

// Función para renderizar los jugadores en el tablero
function renderPlayers() {
    const boardContainer = document.getElementById('board-container');

    let playerImg = document.createElement('img');
    playerImg.src = playerImage; // Usamos la imagen asignada por el servidor
    playerImg.classList.add('player');
    playerImg.style.position = 'absolute';
    playerImg.style.left = `0px`;
    playerImg.style.top = `0px`;
    playerImg.style.width = '100px'; // Ajusta el tamaño según lo que necesites
    playerImg.style.height = 'auto';

    // Asignamos un ID único al jugador
    playerImg.id = `player-${socket.id}`;

    boardContainer.appendChild(playerImg);

    // Inicializamos la posición del jugador
    //updatePlayerPosition(currentPlayer);
}

// Cambiar el factor de escala en JavaScript
function setScaleFactor(factor) {
    document.documentElement.style.setProperty('--scale-factor', factor);
}

// Función para manejar eventos en cada casilla
function checkTileEvent(player) {
    const message = `Jugador ${player.id} ha aterrizado en la casilla ${player.position}`;
    console.log(message);  // Confirmar en consola
    showDebugMessage(message);  // Mostrar en pantalla
}

// Función para actualizar el mensaje de depuración en pantalla
function showDebugMessage(message) {
    // Muestra el mensaje en el elemento #debug-message en el cliente
    document.getElementById('debug-message').innerText = message;

    // Emitir el mensaje de depuración al servidor
    socket.emit('debugMessage', message);  // Enviar mensaje al servidor
}

// Establecer un factor de escala
setScaleFactor(1.2);

// Renderizar los jugadores al cargar
renderPlayers();
