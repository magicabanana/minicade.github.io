const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '')));

// For any other route, serve the root index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Emptyland 게임 서버 로직 ────────────────────────────────
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const PLAYER_SPEED = 3;
const TICK_RATE = 20;

const PLAYER_COLORS = [
    '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
    '#f4a261', '#a8dadc', '#b5838d', '#6d6875',
];
let colorIndex = 0;
const players = {};

function randomSpawn() {
    const margin = 80;
    return {
        x: Math.floor(Math.random() * (WORLD_WIDTH - margin * 2) + margin),
        y: Math.floor(Math.random() * (WORLD_HEIGHT - margin * 2) + margin),
    };
}

function buildGameState() {
    return Object.values(players)
        .filter(p => p.nickname)
        .map(p => ({ id: p.id, nickname: p.nickname, x: p.x, y: p.y, color: p.color }));
}

// 서버 게임 루프
setInterval(() => {
    let changed = false;
    for (const id in players) {
        const p = players[id];
        if (!p.nickname) continue;
        const newX = Math.max(0, Math.min(WORLD_WIDTH, p.x + p.dx * PLAYER_SPEED));
        const newY = Math.max(0, Math.min(WORLD_HEIGHT, p.y + p.dy * PLAYER_SPEED));
        if (newX !== p.x || newY !== p.y) { p.x = newX; p.y = newY; changed = true; }
    }
    if (changed) io.emit('gameState', buildGameState());
}, TICK_RATE);

io.on('connection', (socket) => {
    const spawn = randomSpawn();
    players[socket.id] = {
        id: socket.id, nickname: null,
        x: spawn.x, y: spawn.y, dx: 0, dy: 0,
        color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
    };
    colorIndex++;

    socket.emit('init', {
        id: socket.id,
        worldWidth: WORLD_WIDTH, worldHeight: WORLD_HEIGHT,
        spawnX: spawn.x, spawnY: spawn.y,
        color: players[socket.id].color,
    });

    socket.on('setNickname', (nickname) => {
        const trimmed = String(nickname).trim().slice(0, 12);
        if (!trimmed) return;
        players[socket.id].nickname = trimmed;
        io.emit('gameState', buildGameState());
    });

    socket.on('playerInput', ({ dx, dy }) => {
        const p = players[socket.id];
        if (!p || !p.nickname) return;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) { p.dx = dx / len; p.dy = dy / len; }
        else { p.dx = 0; p.dy = 0; }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('gameState', buildGameState());
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving all games in the toybox.`);
});
