const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Перевірка, що ми не намагаємося використовувати неіснуючі класи
if (typeof EducationalPathGame !== 'undefined') {
    console.warn('EducationalPathGame is defined but should not be used in server.js');
}

const app = express();
const server = http.createServer(app);

// Налаштування CORS для Render.com
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"]
    }
});

// Статичні файли
app.use(express.static(__dirname));

// Додаткові заголовки безпеки для продакшн
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
}

// Маршрут для головної сторінки
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Зберігання кімнат та гравців
const rooms = new Map();
const players = new Map();
const spectators = new Map();

// Генерація унікального ID
function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

// Генерація коду кімнати
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Створення кімнати
function createRoom(roomName, hostPlayer) {
    const roomId = generateRoomCode();
    const room = {
        id: roomId,
        name: roomName,
        players: [hostPlayer],
        spectators: [],
        gameState: 'waiting', // waiting, playing, finished
        currentPlayerIndex: 0,
        settings: {
            maxPlayers: 3,
            winPoints: 300,
            allowSpectators: true
        },
        gameData: {
            players: [],
            currentPlayerIndex: 0,
            gameActive: false
        }
    };
    
    rooms.set(roomId, room);
    players.set(hostPlayer.id, { ...hostPlayer, roomId, isHost: true });
    
    return room;
}

// Приєднання до кімнати
function joinRoom(roomId, player) {
    const room = rooms.get(roomId);
    if (!room) return null;
    
    if (room.players.length >= room.settings.maxPlayers) {
        return { error: 'Кімната заповнена' };
    }
    
    room.players.push(player);
    players.set(player.id, { ...player, roomId, isHost: false });
    
    return room;
}

// Покинути кімнату
function leaveRoom(playerId) {
    const player = players.get(playerId);
    if (!player) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    // Видаляємо гравця з кімнати
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Якщо це був хост, передаємо права наступному гравцю
    if (player.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        players.set(room.players[0].id, { ...room.players[0], isHost: true });
    }
    
    // Видаляємо кімнату, якщо вона порожня
    if (room.players.length === 0) {
        rooms.delete(player.roomId);
    }
    
    players.delete(playerId);
    
    return room;
}

// Socket.io підключення
io.on('connection', (socket) => {
    console.log(`Користувач підключився: ${socket.id}`);
    
    // Створення кімнати
    socket.on('create_room', (data) => {
        console.log('Сервер отримав подію create_room:', data);
        try {
            const player = {
                id: socket.id,
                name: data.playerName,
                color: '#e53e3e', // Буде змінюватися
                position: 0,
                points: 0,
                class: null,
                skipTurn: false,
                extraTurn: false,
                hasLost: false,
                moveModifier: 0
            };
            
            const room = createRoom(data.roomName, player);
            console.log('Кімната створена:', room.id);
            
            socket.join(room.id);
            socket.emit('room_created', {
                roomId: room.id,
                roomName: room.name,
                players: room.players
            });
            console.log('Відправлено подію room_created гравцю:', socket.id);
            
            // Повідомляємо всіх про нову кімнату
            io.emit('room_list_updated', Array.from(rooms.values()));
            
        } catch (error) {
            console.error('Помилка створення кімнати:', error);
            socket.emit('error', { message: 'Не вдалося створити кімнату' });
        }
    });
    
    // Приєднання до кімнати
    socket.on('join_room', (data) => {
        try {
            const player = {
                id: socket.id,
                name: data.playerName,
                color: '#38b2ac', // Буде змінюватися
                position: 0,
                points: 0,
                class: null,
                skipTurn: false,
                extraTurn: false,
                hasLost: false,
                moveModifier: 0
            };
            
            const result = joinRoom(data.roomCode, player);
            
            if (result && !result.error) {
                socket.join(result.id);
                socket.emit('room_joined', {
                    roomId: result.id,
                    roomName: result.name,
                    players: result.players
                });
                
                // Повідомляємо інших гравців
                socket.to(result.id).emit('player_joined', {
                    player,
                    players: result.players
                });
                
            } else {
                socket.emit('error', { message: result?.error || 'Кімната не знайдена' });
            }
            
        } catch (error) {
            console.error('Помилка приєднання до кімнати:', error);
            socket.emit('error', { message: 'Не вдалося приєднатися до кімнати' });
        }
    });
    
    // Старт гри
    socket.on('start_game', (data) => {
        console.log('Сервер отримав подію start_game:', data);
        const player = players.get(socket.id);
        if (!player || !player.isHost) {
            console.log('Гравець не є хостом або не знайдений');
            return;
        }
        
        const room = rooms.get(data.roomId);
        if (!room) {
            console.log('Кімната не знайдена');
            return;
        }
        
        console.log('Починаємо гру в кімнаті:', room.id);
        
        // Доступні класи
        const availableClasses = [
            { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
            { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
            { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 },
        ];
        
        // Перемішуємо класи для випадкової роздачі
        const shuffledClasses = [...availableClasses].sort(() => Math.random() - 0.5);
        
        // Ініціалізуємо гру з роздачею класів
        room.gameState = 'playing';
        room.gameData.gameActive = true;
        room.gameData.players = room.players.map((p, index) => ({
            ...p,
            class: shuffledClasses[index % shuffledClasses.length],
            points: shuffledClasses[index % shuffledClasses.length].startPoints,
            position: 0,
            skipTurn: false,
            extraTurn: false,
            hasLost: false,
            moveModifier: 0
        }));
        room.gameData.currentPlayerIndex = 0;
        
        // Повідомляємо всіх гравців
        io.to(room.id).emit('game_started', {
            players: room.gameData.players,
            currentPlayerIndex: room.gameData.currentPlayerIndex
        });
        
        console.log('Відправлено подію game_started всім гравцям в кімнаті:', room.id);
    });
    
    // Кидання кубика
    socket.on('roll_dice', (data) => {
        console.log('Сервер отримав подію roll_dice:', data);
        const player = players.get(socket.id);
        if (!player) {
            console.log('Гравець не знайдений для roll_dice');
            return;
        }
        
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') {
            console.log('Кімната не знайдена або гра не активна');
            return;
        }
        
        const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        console.log('Поточний гравець:', currentPlayer.name, 'ID:', currentPlayer.id);
        console.log('Гравець, який кидає:', player.name, 'ID:', player.id);
        
        if (currentPlayer.id !== player.id) {
            console.log('Не хід цього гравця');
            return;
        }
        
        console.log('Обробляємо кидання кубика для гравця:', currentPlayer.name);
        
        const roll = Math.floor(Math.random() * 6) + 1;
        let move = roll;
        
        // Додаємо модифікатори класу
        if (currentPlayer.class) {
            move += currentPlayer.class.moveModifier;
            if (currentPlayer.class.id === 'peasant') {
                move = Math.max(1, move);
            }
        }
        
        console.log('Кубик показав:', roll, 'Рух:', move);
        
        // Оновлюємо позицію гравця
        const newPosition = Math.min(currentPlayer.position + move, 124);
        currentPlayer.position = newPosition;
        
        console.log(`${currentPlayer.name} перемістився на позицію ${newPosition}`);
        
        // Повідомляємо всіх про кидання кубика та нову позицію
        io.to(room.id).emit('dice_result', {
            playerId: currentPlayer.id,
            roll,
            move,
            newPosition,
            currentPlayerIndex: room.gameData.currentPlayerIndex
        });
        
        console.log('Відправлено подію dice_result всім гравцям');
        
        // Переходимо до наступного гравця
        console.log('Старий currentPlayerIndex:', room.gameData.currentPlayerIndex);
        room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
        console.log('Новий currentPlayerIndex:', room.gameData.currentPlayerIndex);
        
        // Пропускаємо гравців, які вибули
        while (room.gameData.players[room.gameData.currentPlayerIndex].hasWon || 
               room.gameData.players[room.gameData.currentPlayerIndex].hasLost) {
            room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
            console.log('Пропущено вибулого гравця, новий індекс:', room.gameData.currentPlayerIndex);
        }
        
        // Повідомляємо всіх про зміну черги
        const nextPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        console.log('Наступний гравець:', nextPlayer.name, 'ID:', nextPlayer.id);
        
        io.to(room.id).emit('turn_update', {
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            currentPlayerId: nextPlayer.id,
            currentPlayerName: nextPlayer.name
        });
        
        console.log('Відправлено подію turn_update всім гравцям:', {
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            currentPlayerId: nextPlayer.id,
            currentPlayerName: nextPlayer.name
        });
    });
    
        // Обробляємо подію гравця
        socket.on('player_on_event', (data) => {
            console.log('Гравець потрапив на подію:', data);
            const player = players.get(socket.id);
            if (!player) return;

            const room = rooms.get(data.roomId);
            if (!room || room.gameState !== 'playing') return;

            // Перевіряємо, чи це справді поточний гравець
            const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
            if (currentPlayer.id !== player.id) {
                console.log('Не той гравець намагається активувати подію');
                return;
            }

            // Зберігаємо інформацію про поточну подію
            room.currentEventPlayerId = player.id;
            room.currentEventData = data.eventData;

            console.log(`${player.name} потрапив на подію ${data.eventType}`);

            // Обробляємо різні типи подій
            if (data.eventType === 'pvp-quest') {
                // Вибираємо випадкового опонента
                const availablePlayers = room.gameData.players.filter(p => p.id !== player.id && !p.hasWon && !p.hasLost);
                if (availablePlayers.length === 0) {
                    // Якщо немає опонентів, пропускаємо подію
                    io.to(room.id).emit('event_result', {
                        playerId: player.id,
                        playerName: player.name,
                        choice: 'skip',
                        resultMessage: `${player.name} не знайшов опонента для ПВП-квесту.`,
                        newPosition: player.position,
                        newPoints: player.points
                    });
                    return;
                }

                const opponent = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
                
                // Створюємо стан гри в хрестики-нулики
                room.ticTacToeState = {
                    board: [null, null, null, null, null, null, null, null, null],
                    turn: player.id,
                    players: [player.id, opponent.id],
                    gameType: 'tic-tac-toe'
                };

                // Відправляємо початок гри
                io.to(room.id).emit('tic_tac_toe_start', {
                    gameState: room.ticTacToeState,
                    player1: { id: player.id, name: player.name },
                    player2: { id: opponent.id, name: opponent.name }
                });

            } else if (data.eventType === 'quest') {
                // Запускаємо вікторину
                const questions = [
                    {
                        question: "Яка столиця України?",
                        options: ["Київ", "Львів", "Харків", "Одеса"],
                        correctAnswer: 0
                    },
                    {
                        question: "Хто написав 'Кобзар'?",
                        options: ["Іван Франко", "Тарас Шевченко", "Леся Українка", "Михайло Коцюбинський"],
                        correctAnswer: 1
                    },
                    {
                        question: "Який рік проголошення незалежності України?",
                        options: ["1990", "1991", "1992", "1989"],
                        correctAnswer: 1
                    }
                ];

                const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
                
                io.to(room.id).emit('quiz_start', {
                    question: randomQuestion,
                    activePlayerId: player.id,
                    activePlayerName: player.name
                });

            } else {
                // Для інших подій використовуємо стару логіку
                io.to(room.id).emit('show_event_prompt', {
                    playerId: player.id,
                    playerName: player.name,
                    eventType: data.eventType,
                    eventData: data.eventData
                });
            }

            console.log('Відправлено подію всім гравцям');
        });
    
    // Обробляємо вибір гравця в події
    socket.on('event_choice_made', (data) => {
        console.log('Отримано вибір події:', data);
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') return;
        
        // Перевіряємо, чи це справді гравець, який потрапив на подію
        if (room.currentEventPlayerId !== player.id) {
            console.log('Не той гравець намагається зробити вибір');
            return;
        }
        
        console.log(`${player.name} зробив вибір: ${data.choice}`);
        
        // Обробляємо вибір залежно від типу події
        let resultMessage = '';
        let shouldContinue = true;
        
        if (data.eventType === 'portal') {
            if (data.choice === 'yes') {
                // Переміщуємо гравця на цільову позицію
                player.position = data.targetPosition;
                player.points -= data.cost;
                resultMessage = `${player.name} скористався порталом! Переміщено на клітинку ${data.targetPosition}, втрачено ${data.cost} ОО.`;
            } else {
                resultMessage = `${player.name} відмовився від порталу.`;
            }
        } else if (data.eventType === 'reincarnation') {
            if (data.choice === 'yes') {
                // Переміщуємо гравця на першу клітинку наступної епохи
                const nextEpochStartCell = data.eventData.nextEpoch * 25 + 1;
                player.position = nextEpochStartCell;
                player.points += data.eventData.points;
                resultMessage = `${player.name} завершив епоху! Перехід до наступної епохи, отримано ${data.eventData.points} ОО.`;
            } else {
                resultMessage = `${player.name} відмовився від переходу між епохами.`;
            }
        } else if (data.eventType === 'alternative-path') {
            if (data.choice === 'yes') {
                // Переміщуємо гравця на цільову позицію
                player.position = data.eventData.target;
                player.points -= data.eventData.cost;
                resultMessage = `${player.name} скористався обхідною дорогою! Переміщено на клітинку ${data.eventData.target}, втрачено ${data.eventData.cost} ОО.`;
            } else {
                resultMessage = `${player.name} відмовився від обхідної дороги.`;
            }
        }
        
        // Очищуємо поточну подію
        room.currentEventPlayerId = null;
        room.currentEventData = null;
        
        // Повідомляємо всіх про результат
        io.to(room.id).emit('event_result', {
            playerId: player.id,
            playerName: player.name,
            choice: data.choice,
            resultMessage,
            newPosition: player.position,
            newPoints: player.points
        });
        
        console.log('Відправлено результат події всім гравцям');
        
        // Якщо це був перехід між секціями, продовжуємо гру
        if (shouldContinue) {
            // Переходимо до наступного гравця
            room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
            
            // Пропускаємо гравців, які вибули
            while (room.gameData.players[room.gameData.currentPlayerIndex].hasWon || 
                   room.gameData.players[room.gameData.currentPlayerIndex].hasLost) {
                room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
            }
            
            // Повідомляємо всіх про зміну черги
            const nextPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
            io.to(room.id).emit('turn_update', {
                currentPlayerIndex: room.gameData.currentPlayerIndex,
                currentPlayerId: nextPlayer.id,
                currentPlayerName: nextPlayer.name
            });
        }
    });
    
    // Гравець покидає кімнату
    socket.on('leave_room', (data) => {
        console.log('Гравець покидає кімнату:', data);
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room) return;
        
        // Видаляємо гравця з кімнати
        room.players = room.players.filter(p => p.id !== player.id);
        
        // Якщо це хост і гра не почалася, передаємо права хоста іншому гравцю
        if (player.isHost && room.gameState !== 'playing' && room.players.length > 0) {
            room.players[0].isHost = true;
        }
        
        // Якщо кімната порожня, видаляємо її
        if (room.players.length === 0) {
            rooms.delete(data.roomId);
        } else {
            // Повідомляємо інших гравців
            socket.to(data.roomId).emit('player_left', {
                player,
                players: room.players
            });
        }
        
        // Видаляємо гравця з глобального списку
        players.delete(socket.id);
        
        console.log(`Гравець ${player.name} покинув кімнату ${data.roomId}`);
    });
    
    // Гравець досяг перемоги
    socket.on('player_won', (data) => {
        console.log('Гравець досяг перемоги:', data);
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') return;
        
        const winningPlayer = room.gameData.players.find(p => p.id === data.playerId);
        if (!winningPlayer) return;
        
        // Позначаємо гравця як переможця
        winningPlayer.hasWon = true;
        winningPlayer.finalPosition = room.gameData.finalPositions ? room.gameData.finalPositions.length + 1 : 1;
        
        if (!room.gameData.finalPositions) {
            room.gameData.finalPositions = [];
        }
        room.gameData.finalPositions.push(winningPlayer);
        
        // Перевіряємо, чи залишилися активні гравці
        const activePlayers = room.gameData.players.filter(p => !p.hasWon && !p.hasLost);
        
        if (activePlayers.length <= 1) {
            // Турнір закінчений
            room.gameState = 'finished';
            io.to(room.id).emit('tournament_ended', {
                finalPositions: room.gameData.finalPositions
            });
        } else {
            // Відправляємо інформацію про вибування
            io.to(room.id).emit('player_eliminated', {
                playerId: winningPlayer.id,
                position: winningPlayer.finalPosition,
                remainingPlayers: activePlayers.length
            });
        }
    });
    
    // Переміщення гравця
    socket.on('player_moved', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        const gamePlayer = room.gameData.players.find(p => p.id === socket.id);
        if (!gamePlayer) return;
        
        gamePlayer.position = data.position;
        
        // Повідомляємо всіх про переміщення
        io.to(room.id).emit('player_moved', {
            playerId: socket.id,
            position: data.position
        });
    });
    
    // Оновлення стану гри
    socket.on('game_state_update', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.isHost) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        room.gameData = { ...room.gameData, ...data };
        
        // Повідомляємо всіх про оновлення
        io.to(room.id).emit('game_state_update', room.gameData);
    });
    
    // Повідомлення в чаті
    socket.on('chat_message', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        // Повідомляємо всіх в кімнаті
        io.to(room.id).emit('chat_message', {
            type: 'player',
            message: data.message,
            player: { name: player.name, id: player.id }
        });
    });
    
    // PvP квест
    socket.on('start_pvp_quest', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        // Повідомляємо всіх про початок PvP квесту
        io.to(room.id).emit('quest_started', {
            type: 'pvp',
            playerId: socket.id,
            title: 'PvP Квест',
            description: 'Оберіть суперника для дуелі'
        });
    });
    
    // Творчий квест
    socket.on('start_creative_quest', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        // Повідомляємо всіх про початок творчого квесту
        io.to(room.id).emit('quest_started', {
            type: 'creative',
            playerId: socket.id,
            title: 'Творчий квест',
            description: 'Створіть щось креативне'
        });
    });
    
    // Голосування в творчому квесті
    socket.on('creative_quest_vote', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        // Повідомляємо всіх про голосування
        io.to(room.id).emit('quest_vote', {
            playerId: socket.id,
            choice: data.choice,
            player: { name: player.name }
        });
    });
    
    // Завершення гри
    socket.on('game_ended', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.isHost) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        room.gameState = 'finished';
        room.gameData.gameActive = false;
        
        // Повідомляємо всіх про завершення гри
        io.to(room.id).emit('game_ended', {
            winner: data.winner,
            message: data.message
        });
    });

    // Обробляємо хід в хрестики-нулики
    socket.on('tic_tac_toe_move', (data) => {
        console.log('Отримано хід в хрестики-нулики:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.ticTacToeState) return;

        // Перевіряємо, чи це хід поточного гравця
        if (room.ticTacToeState.turn !== player.id) {
            console.log('Не той гравець намагається зробити хід');
            return;
        }

        // Перевіряємо, чи клітинка вільна
        if (room.ticTacToeState.board[data.cellIndex] !== null) {
            console.log('Клітинка вже зайнята');
            return;
        }

        // Робимо хід
        const symbol = room.ticTacToeState.players[0] === player.id ? 'X' : 'O';
        room.ticTacToeState.board[data.cellIndex] = symbol;

        // Перевіряємо на перемогу
        const winner = checkTicTacToeWinner(room.ticTacToeState.board);
        
        if (winner) {
            // Гра закінчена
            const winnerPlayer = room.gameData.players.find(p => 
                room.ticTacToeState.players[winner === 'X' ? 0 : 1] === p.id
            );
            
            io.to(room.id).emit('tic_tac_toe_end', {
                winner: winnerPlayer.id,
                winnerName: winnerPlayer.name,
                gameState: room.ticTacToeState
            });

            // Очищуємо стан гри
            room.ticTacToeState = null;
        } else if (room.ticTacToeState.board.every(cell => cell !== null)) {
            // Нічия
            io.to(room.id).emit('tic_tac_toe_end', {
                winner: null,
                winnerName: null,
                gameState: room.ticTacToeState
            });

            room.ticTacToeState = null;
        } else {
            // Змінюємо хід
            room.ticTacToeState.turn = room.ticTacToeState.players.find(id => id !== player.id);
            
            io.to(room.id).emit('tic_tac_toe_update', {
                gameState: room.ticTacToeState
            });
        }
    });

    // Обробляємо відповідь на вікторину
    socket.on('quiz_answer', (data) => {
        console.log('Отримано відповідь на вікторину:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room) return;

        // Перевіряємо, чи це правильний гравець
        if (room.currentEventPlayerId !== player.id) {
            console.log('Не той гравець намагається відповісти');
            return;
        }

        const isCorrect = data.answer === room.currentEventData.correctAnswer;
        let resultMessage = '';
        let pointsChange = 0;

        if (isCorrect) {
            pointsChange = 30;
            resultMessage = `${player.name} правильно відповів на питання! +${pointsChange} ОО.`;
        } else {
            pointsChange = -10;
            resultMessage = `${player.name} неправильно відповів. ${pointsChange} ОО.`;
        }

        player.points += pointsChange;

        io.to(room.id).emit('quiz_end', {
            playerId: player.id,
            playerName: player.name,
            wasCorrect: isCorrect,
            correctAnswer: room.currentEventData.correctAnswer,
            pointsChange: pointsChange,
            resultMessage: resultMessage
        });

        // Очищуємо поточну подію
        room.currentEventPlayerId = null;
        room.currentEventData = null;
    });

    // Функція перевірки переможця в хрестики-нулики
    function checkTicTacToeWinner(board) {
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // горизонтальні
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // вертикальні
            [0, 4, 8], [2, 4, 6] // діагональні
        ];

        for (let combination of winningCombinations) {
            const [a, b, c] = combination;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    }
    
    // Обмін місцями після перемоги в міні-грі
    socket.on('swap_positions', (data) => {
        const room = rooms.get(data.roomId);
        if (!room) return;
        
        const currentPlayer = room.players.find(p => p.id === data.playerId);
        const targetPlayer = room.players.find(p => p.id === data.targetPlayerId);
        
        if (currentPlayer && targetPlayer) {
            // Обмінюємося позиціями
            const tempPosition = currentPlayer.position;
            currentPlayer.position = targetPlayer.position;
            targetPlayer.position = tempPosition;
            
            // Повідомляємо всіх гравців
            io.to(room.id).emit('positions_swapped', {
                player1: { id: currentPlayer.id, name: currentPlayer.name, position: currentPlayer.position },
                player2: { id: targetPlayer.id, name: targetPlayer.name, position: targetPlayer.position },
                message: `${currentPlayer.name} обмінявся місцями з ${targetPlayer.name}!`
            });
        }
    });
    
    // Відключення
    socket.on('disconnect', () => {
        console.log(`Користувач відключився: ${socket.id}`);
        
        const room = leaveRoom(socket.id);
        if (room) {
            // Повідомляємо інших гравців
            socket.to(room.id).emit('player_left', {
                player: { id: socket.id },
                players: room.players
            });
        }
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Сервер запущено на ${HOST}:${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Socket.IO підключено`);
});

// Обробка помилок сервера
server.on('error', (error) => {
    console.error('❌ Помилка сервера:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Отримано SIGTERM, закриваємо сервер...');
    server.close(() => {
        console.log('✅ Сервер закрито');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Отримано SIGINT, закриваємо сервер...');
    server.close(() => {
        console.log('✅ Сервер закрито');
        process.exit(0);
    });
});
