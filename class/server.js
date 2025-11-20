const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Імпорти даних (переконайтеся, що ці файли існують у тій самій папці)
const { pvpGames, creativeGames, madLibsQuestions, webNovella } = require('./questsData.js');
const specialCells = require('./specialCells.js');

// ГЛОБАЛЬНА КОНСТАНТА МЕЖ ЕПОХ
const EPOCH_BOUNDARIES = { 1: 12, 2: 22, 3: 42, 4: 75, 5: 97, 6: 101 };

function getEpochForPosition(position) {
    if (position <= 12) return 1;
    if (position <= 22) return 2;
    if (position <= 42) return 3;
    if (position <= 75) return 4;
    if (position <= 97) return 5;
    if (position <= 101) return 6;
    return 7; 
}

// --- Функція для передачі ходу наступному гравцю ---
function passTurnToNextPlayer(room) {
    console.log('Передача ходу. Поточний індекс:', room.gameData.currentPlayerIndex);
    
    if (room.roundStartPlayerIndex === undefined) {
        room.roundStartPlayerIndex = room.gameData.currentPlayerIndex;
        room.playersBuffUsedThisRound = {};
    }
    
    let nextPlayerFound = false;
    let attempts = 0;
    const maxAttempts = room.gameData.players.length * 2; // Запобіжник від нескінченного циклу

    // Цикл для пошуку активного гравця
    while (!nextPlayerFound && attempts < maxAttempts) {
        attempts++;
        room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
        room.currentPlayerIndex = room.gameData.currentPlayerIndex; // Синхронізація
        
        if (room.gameData.currentPlayerIndex === room.roundStartPlayerIndex) {
            room.playersBuffUsedThisRound = {};
            room.roundStartPlayerIndex = room.gameData.currentPlayerIndex;
            console.log('Коло завершено, лічильник бафів скинуто');
        }
        
        const nextPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        
        // 1. Пропускаємо вибулих гравців
        if (nextPlayer.hasWon || nextPlayer.hasLost) {
            continue;
        }
        
        // 2. Перевірка на пропуск ходу через "Прокрастинацію" (або інші ефекти)
        if (nextPlayer.effects && nextPlayer.effects.skipTurn && nextPlayer.effects.skipTurn > 0) {
            console.log(`Гравець ${nextPlayer.name} пропускає хід.`);
            nextPlayer.effects.skipTurn--;
            if (nextPlayer.effects.skipTurn <= 0) delete nextPlayer.effects.skipTurn;
            
            io.to(room.id).emit('chat_message', {
                type: 'system',
                message: `⏳ ${nextPlayer.name} пропускає хід!`
            });
            
            io.to(room.id).emit('game_state_update', room.gameData);
            continue;
        }
        
        // 3. Знайшли активного гравця
        nextPlayerFound = true;
        console.log('Хід перейшов до:', nextPlayer.name);
        
        io.to(room.id).emit('turn_update', {
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            currentPlayerId: nextPlayer.id,
            currentPlayerName: nextPlayer.name
        });
    }

    if (!nextPlayerFound) {
        console.error('Не знайдено наступного гравця! Гра завершена?');
    }
}

// --- Функція для обробки миттєвих подій ---
function handleImmediateEvent(room, player, eventType) {
    let resultMessage = '';
    const roomPlayer = room.gameData.players.find(p => p.id === player.id);
    if (!roomPlayer) return resultMessage;

    if (!roomPlayer.class || !roomPlayer.class.id) {
        roomPlayer.class = { id: 'burgher', name: '⚖️ Міщанин' }; 
    }
    const playerClassId = roomPlayer.class.id;
    const playerClassName = roomPlayer.class.name;

    switch(eventType) {
        case 'amphitheater':
            if (playerClassId === 'aristocrat' || playerClassId === 'burgher') {
                roomPlayer.skipTurn = true;
                resultMessage = `🎭 ${roomPlayer.name} (${playerClassName}) захотів видовищ в Амфітеатрі! Пропускає хід.`;
            } else { 
                resultMessage = `⛔ ${roomPlayer.name} (${playerClassName}) хотів до Амфітеатру, але його не пустили.`;
            }
            break;
            
        case 'tavern':
        case 'casino':
            const eventName = eventType === 'tavern' ? 'Шинку' : 'Казино';
            if (playerClassId === 'aristocrat') {
                const lostPoints = roomPlayer.points;
                roomPlayer.points = 0;
                resultMessage = `💸 ${roomPlayer.name} втратив усі статки (${lostPoints} ОО) у ${eventName}!`;
            } else if (playerClassId === 'burgher') {
                const lostPoints = Math.floor(roomPlayer.points / 2);
                roomPlayer.points -= lostPoints;
                resultMessage = `💰 ${roomPlayer.name} втратив половину майна (${lostPoints} ОО) у ${eventName}!`;
            } else { 
                const lostPoints = roomPlayer.points;
                roomPlayer.points = 0;
                const currentEpoch = getEpochForPosition(roomPlayer.position);
                
                // Логіка "смерті" для селянина - повернення на початок епохи
                let targetPosition = 0;
                if (currentEpoch === 2) targetPosition = 13;
                else if (currentEpoch === 3) targetPosition = 23;
                else if (currentEpoch === 4) targetPosition = 43;
                else if (currentEpoch === 5) targetPosition = 76;
                else if (currentEpoch === 6) targetPosition = 98;
                
                roomPlayer.position = targetPosition;
                
                // Оновлюємо клас (рандомно)
                const availableClasses = [
                    { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
                    { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
                    { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 }
                ];
                roomPlayer.class = availableClasses[Math.floor(Math.random() * availableClasses.length)];
                
                resultMessage = `💀 ${roomPlayer.name} переродився на початку епохи через ${eventName}.`;
                
                io.to(roomPlayer.id).emit('early_reincarnation_event', {
                    playerId: roomPlayer.id,
                    playerName: roomPlayer.name,
                    cellNumber: roomPlayer.position,
                    eventData: { points: 0, targetEpoch: currentEpoch },
                    newClass: roomPlayer.class
                });
            }
            break;
        default:
            resultMessage = `Невідома подія: ${eventType}`;
    }

    io.to(room.id).emit('chat_message', { type: 'system', message: resultMessage });
    io.to(room.id).emit('game_state_update', room.gameData);
    return resultMessage;
}

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Keep-alive endpoint
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Механізм для підтримки життя сервера
setInterval(() => {
    const options = {
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/ping',
        method: 'GET'
    };
    const req = http.request(options, (res) => {});
    req.on('error', (e) => {});
    req.end();
}, 5 * 60 * 1000); 

const rooms = new Map();
const players = new Map();

// Допоміжні функції кімнат
function createRoom(customRoomCode, hostPlayer) {
    const room = {
        id: customRoomCode,
        name: `Кімната ${customRoomCode}`,
        players: [hostPlayer],
        spectators: [],
        gameState: 'waiting',
        currentPlayerIndex: 0,
        settings: { maxPlayers: 6, winPoints: 300 },
        gameData: { players: [], currentPlayerIndex: 0, gameActive: false }
    };
    rooms.set(customRoomCode, room);
    players.set(hostPlayer.id, { ...hostPlayer, roomId: customRoomCode, isHost: true });
    return room;
}

function joinRoom(roomId, player) {
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.players.length >= room.settings.maxPlayers) return { error: 'Кімната заповнена' };
    
    room.players.push(player);
    players.set(player.id, { ...player, roomId, isHost: false });
    return room;
}

function leaveRoom(playerId) {
    const player = players.get(playerId);
    if (!player) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    if (player.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        players.set(room.players[0].id, { ...room.players[0], isHost: true });
    }
    if (room.players.length === 0) {
        rooms.delete(player.roomId);
    }
    players.delete(playerId);
    return room;
}

// --- SOCKET.IO ЛОГІКА ---
io.on('connection', (socket) => {
    console.log(`Користувач підключився: ${socket.id}`);
    
    socket.on('create_room', (data) => {
        const player = {
            id: socket.id, name: data.playerName, color: '#e53e3e',
            position: 0, points: 0, class: null,
            skipTurn: false, extraTurn: false, hasLost: false, moveModifier: 0
        };
        if (rooms.has(data.customRoomCode)) {
            socket.emit('error', { message: 'Кімната з таким кодом вже існує' });
            return;
        }
        const room = createRoom(data.customRoomCode, player);
        socket.join(room.id);
        socket.emit('room_created', { roomId: room.id, roomName: room.name, players: room.players });
    });
    
    socket.on('join_room', (data) => {
        const room = rooms.get(data.roomCode);
        if (!room) {
            socket.emit('error', { message: 'Кімната не знайдена' });
            return;
        }
        const player = {
            id: socket.id, name: data.playerName, color: '#38b2ac',
            position: 0, points: 0, class: null,
            skipTurn: false, extraTurn: false, hasLost: false, moveModifier: 0
        };
        const result = joinRoom(data.roomCode, player);
        if (result && !result.error) {
            socket.join(result.id);
            socket.emit('room_joined', { roomId: result.id, roomName: result.name, players: result.players });
            socket.to(result.id).emit('player_joined', { player, players: result.players });
        } else {
            socket.emit('error', { message: result?.error || 'Помилка приєднання' });
        }
    });

    socket.on('start_game', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.isHost) return;
        const room = rooms.get(data.roomId);
        if (!room) return;
        
        const availableClasses = [
            { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
            { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
            { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 }
        ];
        let classPool = [...availableClasses, ...availableClasses].sort(() => 0.5 - Math.random());
        
        room.gameState = 'playing';
        room.gameData.gameActive = true;
        room.gameData.players = room.players.map((p, index) => ({
            ...p,
            class: classPool[index % classPool.length],
            points: classPool[index % classPool.length].startPoints,
            position: 0
        }));
        
        room.gameData.avatarSelections = {};
        room.gameData.readyPlayers = [];
        
        // Призначення подій (для синхронізації)
        room.gameData.eventAssignments = {};
        const eventCells = [3, 10, 21, 32, 40, 55, 61, 69, 81, 90, 96, 99];
        const shuffledPlayers = [...room.players].sort(() => 0.5 - Math.random());
        eventCells.forEach((cellNumber, index) => {
            const assignedPlayer = shuffledPlayers[index % shuffledPlayers.length];
            room.gameData.eventAssignments[cellNumber] = assignedPlayer.id;
        });
        
        io.to(room.id).emit('game_started', { players: room.gameData.players, currentPlayerIndex: 0 });
    });

    socket.on('select_avatar', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (room) {
            room.gameData.avatarSelections[socket.id] = data.avatarUrl;
            io.to(room.id).emit('avatar_update', room.gameData.avatarSelections);
        }
    });

    socket.on('player_ready', () => {
        const player = players.get(socket.id);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        if (!room.gameData.readyPlayers.includes(socket.id)) {
            room.gameData.readyPlayers.push(socket.id);
        }
        
        io.to(room.id).emit('ready_update', {
            readyCount: room.gameData.readyPlayers.length,
            totalCount: room.gameData.players.length
        });
        
        if (room.gameData.readyPlayers.length === room.gameData.players.length) {
            room.gameData.players.forEach(p => {
                p.avatarUrl = room.gameData.avatarSelections[p.id];
            });
            io.to(room.id).emit('all_players_ready_start_game', {
                players: room.gameData.players,
                currentPlayerIndex: room.gameData.currentPlayerIndex
            });
        }
    });

    // --- ВИПРАВЛЕНО: Кидок кубика (Межі епох) ---
    socket.on('roll_dice', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') return;
        
        const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        if (currentPlayer.id !== player.id) { 
            if(currentPlayer.name === player.name) currentPlayer.id = player.id; else return; 
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        let move = roll + (currentPlayer.class ? currentPlayer.class.moveModifier : 0);
        if (currentPlayer.class && currentPlayer.class.id === 'peasant') move = Math.max(1, move);
        
        // Ефекти
        if (currentPlayer.effects?.hateClone > 0) {
            move -= Math.ceil(roll / 2);
            currentPlayer.effects.hateClone--;
            if(currentPlayer.effects.hateClone <= 0) delete currentPlayer.effects.hateClone;
        }
        if (currentPlayer.effects?.happinessCharm > 0) {
            move += roll;
            currentPlayer.effects.happinessCharm--;
            if(currentPlayer.effects.happinessCharm <= 0) delete currentPlayer.effects.happinessCharm;
        }

        const oldPosition = currentPlayer.position;
        let finalPosition = oldPosition + move;
        
        // ВИПРАВЛЕННЯ: Використовуємо глобальну константу об'єкт
        const currentEpoch = getEpochForPosition(oldPosition);
        const nextEpochBoundary = EPOCH_BOUNDARIES[currentEpoch];
        
        let stopMove = false;
        // Зупинка на межі епохи, якщо це не фініш (101)
        if (finalPosition > nextEpochBoundary && nextEpochBoundary !== 101) {
            finalPosition = nextEpochBoundary; 
            stopMove = true;
        }
        
        currentPlayer.position = Math.min(finalPosition, 101);
        
        // Перевірка на 101 для перемоги
        if (currentPlayer.position >= 101) {
            currentPlayer.hasWon = true;
            room.gameState = 'finished';
            io.to(room.id).emit('game_ended', {
                winner: currentPlayer,
                reason: `${currentPlayer.name} переміг, досягнувши кінця освітнього шляху!`
            });
            return;
        }
        
        if (finalPosition === 100) currentPlayer.uprisingCost = Math.ceil(currentPlayer.points / 2);

        let eventInfo = { hasEvent: false };
        const specialCell = specialCells[currentPlayer.position];
        
        if (specialCell) {
            eventInfo = {
                hasEvent: true,
                eventType: specialCell.type,
                eventData: { ...specialCell, cellNumber: currentPlayer.position },
                playerId: currentPlayer.id,
                playerName: currentPlayer.name
            };
            room.currentEventPlayerId = currentPlayer.id;
            if (currentPlayer.position === 100) eventInfo.eventData.cost = currentPlayer.uprisingCost;
        }

        // Логіка реінкарнації (зміна епохи)
        const oldEpochAfterMove = getEpochForPosition(oldPosition);
        const newEpochAfterMove = getEpochForPosition(finalPosition);
        
        if (oldEpochAfterMove !== newEpochAfterMove && finalPosition > oldPosition) {
            currentPlayer.points += 50;
            const newEpoch = newEpochAfterMove;
            const occupiedClasses = room.gameData.players
                .filter(p => p.id !== currentPlayer.id && getEpochForPosition(p.position) === newEpoch)
                .map(p => p.class.id);
            
            const availableClasses = [
                { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
                { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
                { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 }
            ];
            
            // Проста логіка вибору класу (можна розширити)
            currentPlayer.class = availableClasses[Math.floor(Math.random() * availableClasses.length)];
            
            io.to(currentPlayer.id).emit('show_reincarnation_class', {
                playerId: currentPlayer.id, playerName: currentPlayer.name, newClass: currentPlayer.class, bonusPoints: 50
            });
             room.players.forEach(p => { 
                 if (p.id !== currentPlayer.id) io.to(p.id).emit('show_reincarnation_class', {
                     playerId: currentPlayer.id, playerName: currentPlayer.name, newClass: currentPlayer.class, bonusPoints: 50, isOtherPlayer:true
                 }); 
             });
        }

        io.to(room.id).emit('dice_result', {
            playerId: currentPlayer.id,
            roll, move,
            newPosition: currentPlayer.position,
            newPoints: currentPlayer.points,
            eventInfo
        });
        
        if (!eventInfo.hasEvent && !stopMove) {
            passTurnToNextPlayer(room);
        } else if (stopMove) {
            // Якщо зупинилися на межі, але події нема (хоча там має бути реінкарнація), передаємо хід
             passTurnToNextPlayer(room);
        }
    });

    socket.on('apply_effect', (data) => {
        const player = players.get(socket.id);
        if (!player) return socket.emit('effect_error', { message: 'Помилка: гравець не знайдений' });
        const room = rooms.get(data.roomId);
        if (!room) return socket.emit('effect_error', { message: 'Кімната не знайдена' });

        const caster = room.gameData.players.find(p => p.id === player.id);
        const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        
        if (currentPlayer.id !== caster.id) return socket.emit('effect_error', { message: 'Зараз не ваш хід!' });
        if (room.playersBuffUsedThisRound && room.playersBuffUsedThisRound[caster.id]) return socket.emit('effect_error', { message: 'Вже використано.' });

        let cost = 0; let targetPlayer = null;
        if (data.effectType === 'hateClone') { cost = 100; targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId); }
        else if (data.effectType === 'happinessCharm') { cost = 100; targetPlayer = caster; }
        else if (data.effectType === 'procrastination') { cost = 50; targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId); }
        else if (data.effectType === 'pushBack') { cost = 50; targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId); }
        else if (data.effectType === 'boostForward') { cost = 50; targetPlayer = caster; }
        
        if (!targetPlayer) return socket.emit('effect_error', { message: 'Ціль не знайдена' });
        if (caster.points < cost) return socket.emit('effect_error', { message: 'Недостатньо очок' });
        
        caster.points -= cost;
        if (!room.playersBuffUsedThisRound) room.playersBuffUsedThisRound = {};
        room.playersBuffUsedThisRound[caster.id] = true;
        
        if (!targetPlayer.effects) targetPlayer.effects = {};
        if (data.effectType === 'hateClone') targetPlayer.effects.hateClone = (targetPlayer.effects.hateClone || 0) + 3;
        else if (data.effectType === 'happinessCharm') targetPlayer.effects.happinessCharm = (targetPlayer.effects.happinessCharm || 0) + 3;
        else if (data.effectType === 'procrastination') targetPlayer.effects.skipTurn = (targetPlayer.effects.skipTurn || 0) + 1;
        else if (data.effectType === 'pushBack') targetPlayer.position = Math.max(0, targetPlayer.position - (Math.floor(Math.random()*6)+10));
        else if (data.effectType === 'boostForward') targetPlayer.position = Math.min(101, targetPlayer.position + (Math.floor(Math.random()*6)+10));

        io.to(room.id).emit('effect_applied', {
            casterId: caster.id, casterName: caster.name, targetId: targetPlayer.id, targetName: targetPlayer.name, effectType: data.effectType
        });
        io.to(room.id).emit('game_state_update', room.gameData);
    });

    socket.on('player_on_event', (data) => {
        const room = rooms.get(data.roomId);
        if (!room) return;
        if (['amphitheater', 'tavern', 'casino'].includes(data.eventType)) {
            handleImmediateEvent(room, players.get(socket.id), data.eventType);
            passTurnToNextPlayer(room);
            return;
        }
        socket.emit('show_event_prompt', data);
    });

    // --- ВИПРАВЛЕННЯ ДЛЯ alternative-path (СКОРОЧЕННЯ ШЛЯХУ) ---
    socket.on('event_choice_made', (data) => {
        const room = rooms.get(data.roomId);
        const player = players.get(socket.id);
        const roomPlayer = room.gameData.players.find(p => p.id === socket.id);
        let shouldContinue = true;

        if (data.eventType === 'alternative-path') {
            if (data.choice === 'yes') {
                if (player.points < data.eventData.cost) {
                    socket.emit('error_message', 'Вам не вистачає очок!');
                    return;
                }
                
                let targetCell = data.eventData.target;
                // ВИПРАВЛЕННЯ: Жорстка прив'язка для 46 клітинки -> 57
                if (roomPlayer.position === 46) targetCell = 57;
                
                if (roomPlayer) {
                    roomPlayer.position = targetCell;
                    roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                    // Важливо: оновити і player об'єкт з мапи players
                    player.position = targetCell;
                    player.points = roomPlayer.points;
                }
                
                io.to(room.id).emit('event_result', { 
                    playerId: socket.id, 
                    playerName: player.name,
                    choice: 'yes',
                    resultMessage: `${player.name} успішно скоротив шлях! Переміщено на клітинку ${targetCell}.`, 
                    newPosition: roomPlayer.position,
                    newPoints: roomPlayer.points
                });
            } else {
                io.to(room.id).emit('event_result', { 
                    playerId: socket.id, 
                    playerName: player.name,
                    choice: 'no',
                    resultMessage: `${player.name} відмовився від скорочення.`
                });
            }
        } else if (data.eventType === 'portal' && data.choice === 'yes') {
             roomPlayer.position = data.eventData.target;
             roomPlayer.points -= data.eventData.cost;
             io.to(room.id).emit('event_result', { playerId: socket.id, resultMessage: 'Портал використано!', newPosition: roomPlayer.position });
        } else if (data.eventType === 'reincarnation' && data.choice === 'yes') {
             roomPlayer.points += (data.eventData.points || 30);
             roomPlayer.position += 1; // Move past the reincarnation cell
             io.to(room.id).emit('event_result', { playerId: socket.id, resultMessage: 'Епоха завершена!', newPosition: roomPlayer.position });
        } else if (data.eventType === 'machine-uprising') {
             if (data.choice === 'pay' && roomPlayer.points >= roomPlayer.uprisingCost) { 
                 roomPlayer.points -= roomPlayer.uprisingCost;
                 roomPlayer.hasWon = true; 
                 shouldContinue = false; 
                 io.to(room.id).emit('game_ended', {winner:roomPlayer}); 
             } else { 
                 roomPlayer.hasLost = true; 
                 shouldContinue = false; 
                 io.to(room.id).emit('player_eliminated', {playerId:roomPlayer.id}); 
             }
        }
        
        room.currentEventPlayerId = null;
        io.to(room.id).emit('game_state_update', room.gameData);
        if (shouldContinue) passTurnToNextPlayer(room);
    });
    
    socket.on('test_answer', (data) => {
        const room = rooms.get(data.roomId);
        const player = room.gameData.players.find(p => p.id === socket.id);
        const qData = require('./testQuestionsData.js')[data.cellNumber];
        const isCorrect = data.answer === qData.correctAnswer;
        if (isCorrect) player.points += 5;
        io.to(room.id).emit('test_result', { playerId: socket.id, isCorrect, resultMessage: isCorrect ? 'Правильно! +5 ОО' : `Помилка. Правильно: ${qData.correctAnswer}` });
        io.to(room.id).emit('game_state_update', room.gameData);
        passTurnToNextPlayer(room);
    });

    // --- ВИПРАВЛЕННЯ ДЛЯ MAD LIBS (Хто? Де? Коли?) ---
    socket.on('mad_libs_answer', (data) => {
         const room = rooms.get(data.roomId);
         room.madLibsState.answers.push(data.answer);
         room.madLibsState.currentQuestionIndex++;
         
         if (room.madLibsState.currentQuestionIndex >= room.madLibsState.questions.length) {
             io.to(room.id).emit('mad_libs_result', { story: room.madLibsState.answers.join(' '), rewardPoints: 20 });
             room.madLibsState.players.forEach(p => { 
                 const gp = room.gameData.players.find(x => x.id === p.id); 
                 if(gp) gp.points += 20; 
             });
             io.to(room.id).emit('game_state_update', room.gameData);
             room.madLibsState = null;
             passTurnToNextPlayer(room);
         } else {
             // ВИПРАВЛЕННЯ: Прибрана перевірка index === 1. Тепер завжди змінюємо гравця.
             room.madLibsState.currentPlayerIndex = (room.madLibsState.currentPlayerIndex + 1) % room.madLibsState.players.length;
             const nextPlayer = room.madLibsState.players[room.madLibsState.currentPlayerIndex];
             
             io.to(nextPlayer.id).emit('mad_libs_question', { 
                 question: room.madLibsState.questions[room.madLibsState.currentQuestionIndex],
                 activePlayerId: nextPlayer.id
             });
             
             room.madLibsState.players.forEach((p, i) => {
                 if (p.id !== nextPlayer.id) io.to(p.id).emit('mad_libs_waiting', { currentPlayer: nextPlayer, questionIndex: 0 });
             });
         }
    });
    
    // Інші події (без змін, але включені для повноти)
    socket.on('swap_positions', (data) => {
        const room = rooms.get(data.roomId);
        const p1 = room.gameData.players.find(p => p.id === data.playerId);
        const p2 = room.gameData.players.find(p => p.id === data.targetPlayerId);
        if (p1 && p2) {
            const temp = p1.position; p1.position = p2.position; p2.position = temp;
            io.to(room.id).emit('positions_swapped', { player1: p1, player2: p2 });
            passTurnToNextPlayer(room);
        }
    });

    socket.on('webnovella_choice', () => passTurnToNextPlayer(rooms.get(players.get(socket.id).roomId)));
    
    socket.on('creative_quest_vote', (data) => {
        const room = rooms.get(data.roomId);
        if (!room.creativeWritingState) return;
        room.creativeWritingState.votes[socket.id] = data.submissionIndex;
        const activePlayers = room.gameData.players.filter(p => !p.hasLost);
        if (Object.keys(room.creativeWritingState.votes).length >= activePlayers.length) {
             // Simple vote counting
             const voteCounts = {};
             Object.values(room.creativeWritingState.votes).forEach(index => {
                 voteCounts[index] = (voteCounts[index] || 0) + 1;
             });

             let winnerIndex = -1;
             let maxVotes = -1;
             let isTie = false;
             
             Object.entries(voteCounts).forEach(([index, votes]) => {
                 if (votes > maxVotes) {
                     maxVotes = votes;
                     winnerIndex = parseInt(index);
                     isTie = false;
                 } else if (votes === maxVotes && votes > 0) {
                     isTie = true;
                 }
             });
             
             const winner = room.creativeWritingState.submissions[winnerIndex];
             
             if (winner) {
                 const wp = room.gameData.players.find(p => p.id === winner.playerId);
                 if (wp) wp.points += 20;
             }
             
             io.to(room.id).emit('creative_voting_end', { resultMessage: 'Голосування завершено!', winner });
             io.to(room.id).emit('game_state_update', room.gameData);
             passTurnToNextPlayer(room);
        }
    });
    
    socket.on('creative_task_submission', (data) => {
        const room = rooms.get(data.roomId);
        room.creativeWritingState.submissions.push({ text: data.text, playerId: socket.id, playerName: players.get(socket.id).name });
        io.to(room.id).emit('start_voting', { submissions: room.creativeWritingState.submissions });
    });

    socket.on('submit_creative_entry', (data) => {
        const room = rooms.get(data.roomId);
        room.creativeWritingState.submissions.push({ text: data.text, playerId: socket.id, playerName: players.get(socket.id).name });
        if (room.creativeWritingState.submissions.length >= room.gameData.players.length) {
             io.to(room.id).emit('start_voting', { submissions: room.creativeWritingState.submissions });
        }
    });

    socket.on('collaborative_story_sentence', (data) => {
        const room = rooms.get(data.roomId);
        room.collaborativeStoryState.story.push({ sentence: data.sentence, playerName: players.get(socket.id).name });
        room.collaborativeStoryState.currentPlayerIndex = (room.collaborativeStoryState.currentPlayerIndex + 1) % room.collaborativeStoryState.players.length;
        io.to(room.id).emit('collaborative_story_update', { gameState: room.collaborativeStoryState, currentPlayer: room.collaborativeStoryState.players[room.collaborativeStoryState.currentPlayerIndex]});
    });

    socket.on('chat_message', (data) => {
        const p = players.get(socket.id);
        io.to(data.roomId).emit('chat_message', { type: 'player', message: data.message, player: { name: p.name, color: p.color } });
    });
    
    socket.on('reconnect_player', (data) => {
        // Логіка перепідключення
        const room = rooms.get(data.roomId);
        if (room) {
            // Оновлюємо сокет ID
            const player = room.gameData.players.find(p => p.id === data.playerId || (p.name === data.playerName));
            if (player) {
                // Оновлюємо мапу гравців
                players.set(socket.id, { ...player, id: socket.id, roomId: data.roomId });
                // Оновлюємо ID в кімнаті
                player.id = socket.id;
                
                socket.join(data.roomId);
                socket.emit('room_joined', { roomId: room.id, roomName: room.name, players: room.players });
                socket.emit('game_started', { players: room.gameData.players, currentPlayerIndex: room.gameData.currentPlayerIndex });
                console.log(`Гравець ${player.name} перепідключився`);
            }
        }
    });

    socket.on('leave_room', (data) => { leaveRoom(socket.id); io.to(data.roomId).emit('player_left', { playerId: socket.id }); });
    socket.on('disconnect', () => { const p = players.get(socket.id); if (p) { leaveRoom(socket.id); io.to(p.roomId).emit('player_left', { playerId: socket.id }); } });
    
    // Обробники для вигнання гравців
    socket.on('kick_player', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.isHost) return;
        
        const room = rooms.get(data.roomId);
        if (room) {
            // Знаходимо гравця, якого треба вигнати
            const targetSocketId = data.playerId;
            const targetPlayer = room.players.find(p => p.id === targetSocketId);
            
            if (targetPlayer) {
                // Видаляємо з кімнати
                leaveRoom(targetSocketId);
                
                // Повідомляємо всіх
                io.to(data.roomId).emit('player_kicked', { playerId: targetSocketId, name: targetPlayer.name });
                io.to(data.roomId).emit('player_left', { playerId: targetSocketId });
                
                // Якщо це був поточний гравець, передаємо хід
                if (room.gameData.gameActive) {
                    if (room.gameData.players[room.gameData.currentPlayerIndex]?.id === targetSocketId) {
                        passTurnToNextPlayer(room);
                    }
                    io.to(room.id).emit('game_state_update', room.gameData);
                }
            }
        }
    });
});

// --- ЗАБЕЗПЕЧЕННЯ СТАБІЛЬНОСТІ СЕРВЕРА ---
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR (Uncaught Exception):', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Сервер запущено на ${HOST}:${PORT}`);
});
