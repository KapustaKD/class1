// server.js - ФІНАЛЬНА, СТАБІЛЬНА ВЕРСІЯ

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};
const specialCells = {
    3: { type: 'pvp-quest' }, 10: { type: 'creative-quest' }, 14: { type: 'mad-libs-quest' },
    21: { type: 'pvp-quest' }, 32: { type: 'webnovella-quest' }, 40: { type: 'creative-quest' },
    55: { type: 'pvp-quest' }, 61: { type: 'mad-libs-quest' }, 69: { type: 'creative-quest' },
    81: { type: 'webnovella-quest' }, 90: { type: 'pvp-quest' }, 96: { type: 'mad-libs-quest' },
    99: { type: 'webnovella-quest' }, 5: { type: 'alternative-path', target: 11, cost: 10, description: 'Обхідний шлях до клітинки 11 за 10 ОО' },
    26: { type: 'alternative-path', target: 33, cost: 12, description: 'Обхідний шлях до клітинки 33 за 12 ОО' },
    46: { type: 'alternative-path', target: 57, cost: 15, description: 'Обхідний шлях до клітинки 57 за 15 ОО' },
    80: { type: 'alternative-path', target: 91, cost: 18, description: 'Обхідний шлях до клітинки 91 за 18 ОО' },
    12: { type: 'reincarnation', nextEpoch: 2, points: 30 }, 22: { type: 'reincarnation', nextEpoch: 3, points: 40 },
    42: { type: 'reincarnation', nextEpoch: 4, points: 50 }, 75: { type: 'reincarnation', nextEpoch: 5, points: 60 },
    97: { type: 'reincarnation', nextEpoch: 6, points: 70 }, 100: { type: 'machine-uprising' }
};

io.on('connection', (socket) => {
    console.log(`Користувач підключився: ${socket.id}`);

    socket.on('create_room', ({ customRoomCode, playerName }) => {
        if (rooms[customRoomCode]) {
            return socket.emit('error_message', 'Кімната з таким кодом вже існує.');
        }
        socket.join(customRoomCode);
        rooms[customRoomCode] = {
            players: [{ id: socket.id, name: playerName, isHost: true }],
            gameData: null,
            inactivityTimer: null
        };
        socket.emit('room_created', { roomCode: customRoomCode, players: rooms[customRoomCode].players });
        resetInactivityTimer(customRoomCode);
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('error_message', 'Кімната не знайдена.');
        if (room.players.length >= 6) {
             // Логіка для спостерігачів (якщо потрібна)
            socket.emit('error_message', 'Кімната заповнена.');
            return;
        }
        socket.join(roomCode);
        room.players.push({ id: socket.id, name: playerName, isHost: false });
        io.to(roomCode).emit('player_list_update', room.players);
    });

    socket.on('start_game', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.players[0].id === socket.id) {
            const playerClasses = [
                { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
                { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
                { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 },
            ].sort(() => 0.5 - Math.random());

            room.gameData = {
                gameActive: true,
                currentPlayerIndex: 0,
                players: room.players.map((p, i) => ({
                    ...p,
                    class: playerClasses[i % playerClasses.length],
                    points: playerClasses[i % playerClasses.length].startPoints,
                    position: 0,
                    skipTurn: false,
                    extraTurn: false,
                })),
                eventData: null // Для зберігання активної події
            };
            io.to(roomCode).emit('game_started', room.gameData);
        }
    });

    // --- ОСНОВНА ВИПРАВЛЕНА ЛОГІКА ХОДУ ---
    socket.on('roll_dice', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameData || !room.gameData.gameActive) return;
        
        resetInactivityTimer(roomCode); // Скидуємо таймер бездіяльності

        const playerIndex = room.gameData.currentPlayerIndex;
        const player = room.gameData.players[playerIndex];
        if (player.id !== socket.id) return;

        const oldPosition = player.position;
        const roll = Math.floor(Math.random() * 6) + 1;
        let move = roll + (player.class?.moveModifier || 0);

        const newPosition = Math.min(oldPosition + move, 101);
        player.position = newPosition;

        const event = specialCells[newPosition];
        if (event) {
            // Якщо є подія, зберігаємо її стан і відправляємо запит гравцю
            room.gameData.eventData = {
                eventType: event.type,
                eventDetails: event,
                activePlayerId: player.id
            };
        } else {
            // Якщо події немає, просто передаємо хід
            room.gameData.currentPlayerIndex = (playerIndex + 1) % room.gameData.players.length;
        }

        // Відправляємо єдиний оновлений стан гри
        io.to(roomCode).emit('game_state_update', { ...room.gameData, lastRoll: { roll, startPos: oldPosition, endPos: newPosition } });
    });

    socket.on('event_choice_made', ({ roomCode, choice }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameData || !room.gameData.eventData) return;

        const { eventType, eventDetails, activePlayerId } = room.gameData.eventData;
        if (activePlayerId !== socket.id) return; // Не той гравець робить вибір

        const player = room.gameData.players.find(p => p.id === activePlayerId);

        // Обробка вибору (тут можна додати логіку для реінкарнації, обхідних шляхів)
        // Наприклад, для обхідного шляху:
        if (eventType === 'alternative-path' && choice === 'yes') {
            if (player.points >= eventDetails.cost) {
                player.points -= eventDetails.cost;
                player.position = eventDetails.target;
            } else {
                socket.emit('error_message', 'Недостатньо очок!');
            }
        }
        
        // Очищуємо подію і передаємо хід
        room.gameData.eventData = null;
        room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
        
        // Відправляємо фінальний стан гри після події
        io.to(roomCode).emit('game_state_update', room.gameData);
    });

    socket.on('disconnect', () => {
        // ... (ваш код відключення) ...
    });

    function resetInactivityTimer(roomCode) {
        const room = rooms[roomCode];
        if (!room) return;
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => {
            io.to(roomCode).emit('error_message', 'Кімнату закрито через бездіяльність.');
            delete rooms[roomCode];
        }, 300000); // 5 хвилин
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
