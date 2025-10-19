const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Функція для передачі ходу наступному гравцю
function passTurnToNextPlayer(room) {
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
}

// Імпортуємо дані міні-ігор
const { pvpGames, creativeGames, madLibsQuestions, webNovella } = require('./questsData.js');

// Перевірка, що ми не намагаємося використовувати неіснуючі класи
if (typeof EducationalPathGame !== 'undefined') {
    console.warn('EducationalPathGame is defined but should not be used in server.js');
}

// Межі епох для системи реінкарнації
const EPOCH_BOUNDARIES = { 1: 12, 2: 22, 3: 42, 4: 75, 5: 97, 6: 101 };

function getEpochForPosition(position) {
    if (position <= 12) return 1;
    if (position <= 22) return 2;
    if (position <= 42) return 3;
    if (position <= 75) return 4;
    if (position <= 97) return 5;
    return 6;
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
function createRoom(customRoomCode, hostPlayer) {
    const room = {
        id: customRoomCode,
        name: `Кімната ${customRoomCode}`,
        players: [hostPlayer],
        spectators: [],
        gameState: 'waiting', // waiting, playing, finished
        currentPlayerIndex: 0,
        settings: {
            maxPlayers: 6,
            winPoints: 300,
            allowSpectators: true
        },
        gameData: {
            players: [],
            currentPlayerIndex: 0,
            gameActive: false
        }
    };
    
    rooms.set(customRoomCode, room);
    players.set(hostPlayer.id, { ...hostPlayer, roomId: customRoomCode, isHost: true });
    
    return room;
}

// Приєднання до кімнати
function joinRoom(roomId, player) {
    const room = rooms.get(roomId);
    if (!room) return null;
    
    if (room.players.length >= room.settings.maxPlayers) {
        return { error: 'Кімната заповнена' };
    }
    
    // Перевіряємо, чи гравець вже не в кімнаті
    const existingPlayer = room.players.find(p => p.id === player.id);
    if (existingPlayer) {
        console.log('Гравець вже в кімнаті:', player.name);
        return { error: 'Гравець вже в кімнаті' };
    }
    
    // Перевіряємо, чи ім'я вже зайняте
    const nameExists = room.players.find(p => p.name.toLowerCase() === player.name.toLowerCase());
    if (nameExists) {
        console.log('Ім\'я вже зайняте:', player.name);
        return { error: 'Ім\'я вже зайняте іншим гравцем. Оберіть інше ім\'я.' };
    }
    
    room.players.push(player);
    players.set(player.id, { ...player, roomId, isHost: false });
    
    console.log(`Гравець ${player.name} доданий до кімнати ${roomId}. Загальна кількість: ${room.players.length}`);
    
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
            
            // Перевіряємо, чи кімната з таким кодом вже існує
            if (rooms.has(data.customRoomCode)) {
                socket.emit('error', { message: 'Кімната з таким кодом вже існує' });
                return;
            }
            
            const room = createRoom(data.customRoomCode, player);
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
            const room = rooms.get(data.roomCode);
            if (!room) {
                socket.emit('error', { message: 'Кімната не знайдена' });
                return;
            }
            
            if (room.players.length >= 6) {
                // Кімната заповнена, додаємо як спостерігача
                if (!room.spectators) room.spectators = [];
                const spectator = { 
                    id: socket.id, 
                    name: data.playerName,
                    joinedAt: Date.now()
                };
                room.spectators.push(spectator);
                socket.join(data.roomCode);
                
                // Відправляємо спостерігачу стан гри
                socket.emit('joined_as_spectator', {
                    roomId: data.roomCode,
                    roomName: room.name,
                    gameData: room.gameData,
                    players: room.players,
                    spectators: room.spectators
                });
                
                // Повідомляємо інших про нового спостерігача
                socket.to(data.roomCode).emit('spectator_joined', {
                    spectator: spectator,
                    spectators: room.spectators
                });
                
                console.log(`${data.playerName} приєднався як спостерігач до кімнати ${data.roomCode}`);
            } else {
                // Є вільні місця, додаємо як гравця (стара логіка)
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
                    socket.emit('error', { message: result?.error || 'Не вдалося приєднатися до кімнати' });
                }
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
        
        // ЗАМІНИТИ СТАРИЙ БЛОК РОЗПОДІЛУ КЛАСІВ НА ЦЕЙ:
        const availableClasses = [
            { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
            { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
            { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 },
        ];

        let classPool = [];
        if (room.players.length <= 3) {
            // Якщо гравців 3 або менше, класи не повторюються
            classPool = [...availableClasses].sort(() => 0.5 - Math.random());
        } else {
            // Якщо гравців більше 3, створюємо подвійний набір класів
            classPool = [...availableClasses, ...availableClasses].sort(() => 0.5 - Math.random());
        }

        // Ініціалізуємо гру з роздачею класів
        room.gameState = 'playing';
        room.gameData.gameActive = true;
        room.gameData.players = room.players.map((p, index) => ({
            ...p,
            class: classPool[index],
            points: classPool[index].startPoints,
            position: 0,
            skipTurn: false,
            extraTurn: false,
            hasLost: false,
            moveModifier: 0
        }));
        room.gameData.currentPlayerIndex = 0;
        
        // Додаємо нові поля для вибору аватарів
        room.gameData.avatarSelections = {};
        room.gameData.readyPlayers = [];
        
        // Повідомляємо всіх гравців
        io.to(room.id).emit('game_started', {
            players: room.gameData.players.map(player => ({
                ...player,
                avatarUrl: room.gameData.avatarSelections[player.id] || null
            })),
            currentPlayerIndex: room.gameData.currentPlayerIndex
        });
        
        console.log('Відправлено подію game_started всім гравцям в кімнаті:', room.id);
    });
    
    // Обробник вибору аватара
    socket.on('select_avatar', (data) => {
        console.log('Сервер отримав подію select_avatar:', data);
        const player = players.get(socket.id);
        if (!player) {
            console.log('Гравець не знайдений для select_avatar');
            return;
        }
        
        const room = rooms.get(player.roomId);
        if (!room) {
            console.log('Кімната не знайдена для select_avatar');
            return;
        }
        
        // Перевіряємо, чи ініціалізований gameData
        if (!room.gameData || !room.gameData.avatarSelections) {
            console.log('gameData не ініціалізований для select_avatar');
            return;
        }
        
        // Перевіряємо, чи аватар вже зайнятий
        const isAvatarTaken = Object.values(room.gameData.avatarSelections).includes(data.avatarUrl);
        if (isAvatarTaken) {
            socket.emit('error', { message: 'Цей аватар вже обраний іншим гравцем!' });
            return;
        }
        
        // Зберігаємо вибір
        room.gameData.avatarSelections[socket.id] = data.avatarUrl;
        
        // Відправляємо оновлення всім гравцям
        io.to(room.id).emit('avatar_update', room.gameData.avatarSelections);
        
        console.log('Аватар обрано:', data.avatarUrl, 'для гравця:', player.name);
    });
    
    // Обробник готовності гравця
    socket.on('player_ready', (data) => {
        console.log('Сервер отримав подію player_ready:', data);
        const player = players.get(socket.id);
        if (!player) {
            console.log('Гравець не знайдений для player_ready');
            return;
        }
        
        const room = rooms.get(player.roomId);
        if (!room) {
            console.log('Кімната не знайдена для player_ready');
            return;
        }
        
        // Додаємо гравця до списку готових
        if (!room.gameData.readyPlayers.includes(socket.id)) {
            room.gameData.readyPlayers.push(socket.id);
        }
        
        // Відправляємо оновлення лічильника
        io.to(room.id).emit('ready_update', {
            readyCount: room.gameData.readyPlayers.length,
            totalCount: room.gameData.players.length
        });
        
        // Перевіряємо, чи всі гравці готові
        if (room.gameData.readyPlayers.length === room.gameData.players.length) {
            console.log('Всі гравці готові! Запускаємо гру...');
            
            // Додаємо аватари до даних гравців перед запуском гри
            room.gameData.players = room.gameData.players.map(player => ({
                ...player,
                avatarUrl: room.gameData.avatarSelections[player.id] || null
            }));
            
            io.to(room.id).emit('all_players_ready_start_game', {
                players: room.gameData.players,
                currentPlayerIndex: room.gameData.currentPlayerIndex
            });
        }
        
        console.log('Гравець готовий:', player.name, 'Готово:', room.gameData.readyPlayers.length, '/', room.gameData.players.length);
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
        
        // Межі епох для системи реінкарнації
        const EPOCH_BOUNDARIES = [12, 22, 42, 75, 97, 101];
        
        // Нова логіка руху з перевіркою меж епох
        const oldPosition = currentPlayer.position;
        let finalPosition = oldPosition;
        let stopMove = false;
        
        // Поступово переміщуємо гравця крок за кроком
        for (let i = 1; i <= move; i++) {
            const nextStep = oldPosition + i;
            if (EPOCH_BOUNDARIES.includes(nextStep)) {
                // Гравець ступив на межу епохи
                finalPosition = nextStep;
                stopMove = true;
                break; // Зупиняємо рух, ходи скасовуються
            }
        }
        
        if (stopMove) {
            currentPlayer.position = finalPosition;
            // Тут ТРЕБА запустити логіку реінкарнації (показати модальне вікно)
            // і НЕ передавати хід.
        } else {
            // Якщо межу не перетнули, просто ходимо
            finalPosition = Math.min(oldPosition + move, 101);
            currentPlayer.position = finalPosition;
        }
        
        console.log(`${currentPlayer.name} перемістився з позиції ${oldPosition} на позицію ${currentPlayer.position}`);
        
        // Перевіряємо зміну епохи (реінкарнація)
        const oldEpoch = getEpochForPosition(oldPosition);
        const newEpoch = getEpochForPosition(finalPosition);
        
        if (stopMove) {
            console.log(`${currentPlayer.name} зупинився на межі епохи ${newEpoch} - реінкарнація!`);
            
            // Нараховуємо бонусні очки
            currentPlayer.points += 50;
            
            // Збираємо зайняті класи тільки з гравців, які знаходяться в новій епосі
            const occupiedClasses = room.gameData.players
                .filter(p => p.id !== currentPlayer.id && p.class && getEpochForPosition(p.position) === newEpoch)
                .map(p => p.class.id);
            
            // Створюємо пул доступних класів
            const availableClasses = [
                { id: 'aristocrat', name: 'Аристократ', moveModifier: 1, description: 'Аристократ' },
                { id: 'burgher', name: 'Міщанин', moveModifier: 0, description: 'Міщанин' },
                { id: 'peasant', name: 'Селянин', moveModifier: -1, description: 'Селянин' }
            ];
            
            // ЗАМІНИТИ СТАРУ ЛОГІКУ ВИБОРУ КЛАСУ НА ЦЮ:
            
            // 1. Збираємо класи, які вже зайняті в новій епосі
            const occupiedClassesInNewEpoch = room.gameData.players
                .filter(p => p.id !== currentPlayer.id && getEpochForPosition(p.position) === newEpoch)
                .map(p => p.class.id);

            // 2. Створюємо лічильник класів
            const classCounts = {};
            for (const classId of occupiedClassesInNewEpoch) {
                classCounts[classId] = (classCounts[classId] || 0) + 1;
            }

            // 3. Визначаємо, які класи доступні
            let availableClassPool = availableClasses.filter(cls => {
                const count = classCounts[cls.id] || 0;
                if (room.gameData.players.length <= 3) {
                    return count < 1; // Якщо гравців мало, класи не повторюються
                } else {
                    return count < 2; // Якщо багато, можуть повторюватися до 2 разів
                }
            });

            // Якщо всі класи зайняті, дозволяємо будь-який
            if (availableClassPool.length === 0) {
                availableClassPool = availableClasses;
            }

            // 4. Присвоюємо випадковий клас з доступних
            currentPlayer.class = availableClassPool[Math.floor(Math.random() * availableClassPool.length)];
            
            console.log(`${currentPlayer.name} отримав новий клас: ${currentPlayer.class.name}`);
            
            // Повідомлення про зміну класу
            io.to(room.id).emit('chat_message', { type: 'system', message: `${currentPlayer.name} реінкарнував і став ${currentPlayer.class.name}!` });
        }
        
        // Повідомляємо всіх про кидання кубика та нову позицію
        io.to(room.id).emit('dice_result', {
            playerId: currentPlayer.id,
            roll,
            move,
            newPosition: currentPlayer.position,
            newPoints: currentPlayer.points,
            newClass: currentPlayer.class,
            currentPlayerIndex: room.gameData.currentPlayerIndex
        });
        
        console.log('Відправлено подію dice_result всім гравцям');
        
        // КРИТИЧНО: Перевіряємо події на новій позиції ПЕРЕД передачею ходу
        // Тут має бути перевірка на події (реінкарнація, скорочення шляху тощо)
        // Якщо є подія - НЕ передаємо хід, а відправляємо подію тільки поточному гравцю
        
        // Перевіряємо, чи є подія на новій позиції
        let hasEvent = false;
        
        // Перевірка на реінкарнацію (зупинка на межі епохи)
        if (stopMove) {
            hasEvent = true;
            // Відправляємо подію реінкарнації тільки поточному гравцю
            socket.emit('show_event_prompt', {
                playerId: currentPlayer.id,
                playerName: currentPlayer.name,
                eventType: 'reincarnation',
                eventData: {
                    nextEpoch: newEpoch,
                    points: 30
                },
                activePlayerId: currentPlayer.id
            });
            console.log(`Відправлено подію реінкарнації гравцю ${currentPlayer.name}`);
        }
        
        // Перевірка на інші події (скорочення шляху тощо)
        // Тут можна додати інші перевірки подій
        
        // Якщо події немає, передаємо хід наступному гравцю
        if (!hasEvent) {
            passTurnToNextPlayer(room);
        } else {
            console.log(`Гравець ${currentPlayer.name} потрапив на подію, хід не передається`);
        }
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
                
                // Вибираємо випадкову PvP-гру
                const gameKeys = Object.keys(pvpGames);
                const randomGameKey = gameKeys[Math.floor(Math.random() * gameKeys.length)];
                const selectedGame = pvpGames[randomGameKey];
                
                // Створюємо стан гри на швидкість введення тексту
                room.timedTextQuestState = {
                    gameType: randomGameKey,
                    gameData: selectedGame,
                    players: [player.id, opponent.id],
                    playerNames: [player.name, opponent.name],
                    timer: selectedGame.timer,
                    startTime: Date.now(),
                    results: {},
                    gameActive: true
                };

                // Відправляємо початок гри
                io.to(room.id).emit('start_timed_text_quest', {
                    gameState: room.timedTextQuestState,
                    player1: { id: player.id, name: player.name },
                    player2: { id: opponent.id, name: opponent.name },
                    activePlayerId: player.id
                });

            } else if (data.eventType === 'creative-quest') {
                // Вибираємо випадкову творчу гру
                const gameKeys = Object.keys(creativeGames);
                const randomGameKey = gameKeys[Math.floor(Math.random() * gameKeys.length)];
                const selectedGame = creativeGames[randomGameKey];
                
                if (randomGameKey === 'chronicles') {
                    // Хроніки Неіснуючого Вояжу - спільна історія
                    room.collaborativeStoryState = {
                        gameType: randomGameKey,
                        gameData: selectedGame,
                        players: room.gameData.players.filter(p => !p.hasWon && !p.hasLost),
                        currentPlayerIndex: 0,
                        story: [],
                        timer: selectedGame.timer,
                        gameActive: true,
                        eliminatedPlayers: []
                    };
                    
                    // Відправляємо першому гравцю чергу писати
                    const firstPlayer = room.collaborativeStoryState.players[0];
                    io.to(room.id).emit('collaborative_story_start', {
                        gameState: room.collaborativeStoryState,
                        currentPlayer: firstPlayer,
                        activePlayerId: firstPlayer.id
                    });
                    
                } else {
                    // Великий Педагогічний / Я у мами педагог - всі пишуть, потім голосують
                    room.creativeWritingState = {
                        gameType: randomGameKey,
                        gameData: selectedGame,
                        timer: selectedGame.timer,
                        gameActive: true,
                        submissions: [],
                        votes: {},
                        players: room.gameData.players.map(p => ({ id: p.id, name: p.name }))
                    };
                    
                    // Відправляємо всім гравцям завдання
                    io.to(room.id).emit('start_creative_submission', {
                        gameState: room.creativeWritingState,
                        task: selectedGame.description,
                        timer: selectedGame.timer
                    });
                }

            } else if (data.eventType === 'mad-libs-quest') {
                // Гра "Хто, де, коли?"
                room.madLibsState = {
                    questions: [...madLibsQuestions],
                    players: room.gameData.players.filter(p => !p.hasWon && !p.hasLost),
                    currentPlayerIndex: 0,
                    answers: [],
                    gameActive: true
                };
                
                // Відправляємо перше питання
                const firstPlayer = room.madLibsState.players[0];
                const firstQuestion = room.madLibsState.questions[0];
                
                io.to(firstPlayer.id).emit('mad_libs_question', {
                    question: firstQuestion,
                    playerIndex: 0,
                    gameState: room.madLibsState,
                    activePlayerId: firstPlayer.id
                });

            } else if (data.eventType === 'webnovella-quest') {
                // Вебновела "Халепа!"
                room.webNovellaState = {
                    currentEvent: 'start_event_1',
                    playerId: player.id,
                    gameActive: true
                };
                
                // Відправляємо першу подію
                io.to(player.id).emit('webnovella_event', {
                    event: webNovella['start_event_1'],
                    gameState: room.webNovellaState,
                    activePlayerId: player.id
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
                player.points = Math.max(0, player.points - data.cost);
                resultMessage = `${player.name} скористався порталом! Переміщено на клітинку ${data.targetPosition}, втрачено ${data.cost} ОО.`;
            } else {
                resultMessage = `${player.name} відмовився від порталу.`;
            }
        } else if (data.eventType === 'reincarnation') {
            if (data.choice === 'yes') {
                // Нараховуємо очки за реінкарнацію
                player.points += 30;
                
                // Автоматично переміщуємо на наступну клітинку
                player.position += 1;
                
                resultMessage = `${player.name} завершив епоху! Отримано 30 ОО та переміщено на наступну клітинку.`;
            } else {
                resultMessage = `${player.name} відмовився від переходу між епохами.`;
            }
        } else if (data.eventType === 'alternative-path') {
            if (data.choice === 'yes') {
                // Перевіряємо, чи вистачає очок
                if (player.points < data.eventData.cost) {
                    socket.emit('error_message', 'Вам не вистачає очок!');
                    return; // Зупиняємо виконання
                }
                
                // Переміщуємо гравця на цільову позицію
                player.position = data.eventData.target;
                player.points = Math.max(0, player.points - data.eventData.cost);
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
        
        // КРИТИЧНО: Відправляємо повний оновлений стан гри всім гравцям
        io.to(room.id).emit('game_state_update', room.gameData);
        
        console.log('Відправлено результат події всім гравцям');
        
        // Якщо це був перехід між секціями, продовжуємо гру
        if (shouldContinue) {
            passTurnToNextPlayer(room);
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

    
    // Обробляємо результат PvP гри на швидкість введення тексту
    socket.on('timed_text_quest_result', (data) => {
        console.log('Отримано результат PvP гри:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.timedTextQuestState) return;

        // Зберігаємо результат гравця
        room.timedTextQuestState.results[player.id] = {
            wordsCount: data.wordsCount,
            playerName: player.name
        };

        // Перевіряємо, чи всі гравці відправили результати
        const allResultsReceived = room.timedTextQuestState.players.every(playerId => 
            room.timedTextQuestState.results[playerId]
        );

        if (allResultsReceived) {
            // Визначаємо переможця
            const results = room.timedTextQuestState.results;
            const player1Id = room.timedTextQuestState.players[0];
            const player2Id = room.timedTextQuestState.players[1];
            
            const player1Words = results[player1Id].wordsCount;
            const player2Words = results[player2Id].wordsCount;
            
            let winner = null;
            let resultMessage = '';
            
            if (player1Words > player2Words) {
                winner = player1Id;
                resultMessage = `${results[player1Id].playerName} переміг! ${player1Words} слів проти ${player2Words}.`;
            } else if (player2Words > player1Words) {
                winner = player2Id;
                resultMessage = `${results[player2Id].playerName} переміг! ${player2Words} слів проти ${player1Words}.`;
            } else {
                resultMessage = `Нічия! Перемогла дружба! Кожному по ${player1Words} ОО!`;
            }

            // Відправляємо результат всім гравцям
            io.to(room.id).emit('timed_text_quest_end', {
                winner: winner,
                results: results,
                resultMessage: resultMessage,
                gameState: room.timedTextQuestState
            });

            // Очищуємо стан гри
            room.timedTextQuestState = null;
        }
    });

    // Обробляємо відповідь в спільній історії
    socket.on('collaborative_story_sentence', (data) => {
        console.log('Отримано речення для спільної історії:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.collaborativeStoryState) return;

        // Додаємо речення до історії
        room.collaborativeStoryState.story.push({
            sentence: data.sentence,
            playerName: player.name,
            playerId: player.id
        });

        // Переходимо до наступного гравця
        room.collaborativeStoryState.currentPlayerIndex = 
            (room.collaborativeStoryState.currentPlayerIndex + 1) % room.collaborativeStoryState.players.length;

        const nextPlayer = room.collaborativeStoryState.players[room.collaborativeStoryState.currentPlayerIndex];

        // Відправляємо оновлену історію та чергу наступного гравця
        io.to(room.id).emit('collaborative_story_update', {
            gameState: room.collaborativeStoryState,
            currentPlayer: nextPlayer
        });
    });

    // Обробляємо пропуск ходу в спільній історії
    socket.on('collaborative_story_skip', (data) => {
        console.log('Гравець пропустив хід в спільній історії:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.collaborativeStoryState) return;

        // Виключаємо гравця з гри
        room.collaborativeStoryState.eliminatedPlayers.push(player.id);
        room.collaborativeStoryState.players = room.collaborativeStoryState.players.filter(p => p.id !== player.id);

        // Перевіряємо, чи залишилися гравці
        if (room.collaborativeStoryState.players.length <= 1) {
            // Гра закінчена
            const winner = room.collaborativeStoryState.players[0];
            io.to(room.id).emit('collaborative_story_end', {
                winner: winner,
                story: room.collaborativeStoryState.story,
                resultMessage: `Вітаю, ${winner.name} здобув перемогу!`
            });
            room.collaborativeStoryState = null;
        } else {
            // Переходимо до наступного гравця
            room.collaborativeStoryState.currentPlayerIndex = 
                room.collaborativeStoryState.currentPlayerIndex % room.collaborativeStoryState.players.length;

            const nextPlayer = room.collaborativeStoryState.players[room.collaborativeStoryState.currentPlayerIndex];

            io.to(room.id).emit('collaborative_story_update', {
                gameState: room.collaborativeStoryState,
                currentPlayer: nextPlayer
            });
        }
    });

    // Обробляємо творче завдання
    socket.on('creative_task_submission', (data) => {
        console.log('Отримано творче завдання:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.creativeWritingState) return;

        // Зберігаємо відповідь
        room.creativeWritingState.submissions.push({
            text: data.text,
            playerName: player.name,
            playerId: player.id
        });

        // Відправляємо всім гравцям для голосування
        console.log('🗳️ Відправляємо start_voting:', {
            submissions: room.creativeWritingState.submissions,
            gameState: room.creativeWritingState
        });
        io.to(room.id).emit('start_voting', {
            submissions: room.creativeWritingState.submissions,
            gameState: room.creativeWritingState
        });
    });

    // Обробляємо відправку творчої роботи (всі гравці пишуть)
    socket.on('submit_creative_entry', (data) => {
        console.log('Отримано творчу роботу:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.creativeWritingState) return;

        // Зберігаємо відповідь
        room.creativeWritingState.submissions.push({
            text: data.text,
            playerName: player.name,
            playerId: player.id
        });

        console.log(`Гравець ${player.name} відправив творчу роботу. Всього: ${room.creativeWritingState.submissions.length}/${room.gameData.players.length}`);

        // Перевіряємо, чи всі гравці відправили роботи
        if (room.creativeWritingState.submissions.length >= room.gameData.players.length) {
            // Всі відправили, починаємо голосування
            console.log('🗳️ Всі відправили роботи, починаємо голосування:', {
                submissions: room.creativeWritingState.submissions,
                gameState: room.creativeWritingState
            });
            io.to(room.id).emit('start_voting', {
                submissions: room.creativeWritingState.submissions,
                gameState: room.creativeWritingState
            });
        }
    });

    // Обробляємо голосування в творчій грі
    socket.on('creative_vote', (data) => {
        console.log('🗳️ Отримано голос:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.creativeWritingState) return;

        // Зберігаємо голос
        room.creativeWritingState.votes[player.id] = data.submissionIndex;

        // Перевіряємо, чи всі проголосували
        const totalVoters = room.gameData.players.filter(p => p.id !== room.creativeWritingState.activePlayer).length;
        const votesCount = Object.keys(room.creativeWritingState.votes).length;

        if (votesCount >= totalVoters) {
            // Підраховуємо голоси
            const voteCounts = {};
            Object.values(room.creativeWritingState.votes).forEach(index => {
                voteCounts[index] = (voteCounts[index] || 0) + 1;
            });

            // Знаходимо переможця
            let winnerIndex = 0;
            let maxVotes = 0;
            Object.entries(voteCounts).forEach(([index, votes]) => {
                if (votes > maxVotes) {
                    maxVotes = votes;
                    winnerIndex = parseInt(index);
                }
            });

            const winner = room.creativeWritingState.submissions[winnerIndex];
            
            console.log('🗳️ Відправляємо creative_voting_end:', {
                winner: winner,
                voteCounts: voteCounts,
                resultMessage: `Переможець: ${winner.playerName}!`
            });
            
            io.to(room.id).emit('creative_voting_end', {
                winner: winner,
                voteCounts: voteCounts,
                resultMessage: `Переможець: ${winner.playerName}!`
            });

            room.creativeWritingState = null;
        }
    });

    // Обробляємо відповідь в грі "Хто, де, коли?"
    socket.on('mad_libs_answer', (data) => {
        console.log('Отримано відповідь для "Хто, де, коли?":', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.madLibsState) return;

        // Додаємо відповідь
        room.madLibsState.answers.push({
            answer: data.answer,
            playerName: player.name,
            questionIndex: room.madLibsState.currentPlayerIndex
        });

        // Переходимо до наступного гравця
        room.madLibsState.currentPlayerIndex++;
        
        if (room.madLibsState.currentPlayerIndex < room.madLibsState.players.length) {
            // Відправляємо наступне питання
            const nextPlayer = room.madLibsState.players[room.madLibsState.currentPlayerIndex];
            const questionIndex = room.madLibsState.currentPlayerIndex % room.madLibsState.questions.length;
            const question = room.madLibsState.questions[questionIndex];
            
            io.to(nextPlayer.id).emit('mad_libs_question', {
                question: question,
                playerIndex: room.madLibsState.currentPlayerIndex,
                gameState: room.madLibsState,
                activePlayerId: nextPlayer.id
            });
        } else {
            // Всі відповіли, формуємо фінальну історію
            const story = room.madLibsState.answers
                .sort((a, b) => a.questionIndex - b.questionIndex)
                .map(answer => answer.answer)
                .join(' ');

            io.to(room.id).emit('mad_libs_result', {
                story: story,
                answers: room.madLibsState.answers,
                resultMessage: `Ось ваша історія: ${story}`
            });

            room.madLibsState = null;
        }
    });

    // Обробляємо вибір в вебновели
    socket.on('webnovella_choice', (data) => {
        console.log('Отримано вибір для вебновели:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.webNovellaState) return;

        // Знаходимо наступну подію
        const currentEvent = webNovella[room.webNovellaState.currentEvent];
        const choice = currentEvent.choices[data.choiceIndex];
        
        if (choice.target) {
            room.webNovellaState.currentEvent = choice.target;
            const nextEvent = webNovella[choice.target];
            
            if (nextEvent.consequence) {
                // Якщо є наслідок, переходимо до нього
                room.webNovellaState.currentEvent = nextEvent.consequence;
                const consequenceEvent = webNovella[nextEvent.consequence];
                
                io.to(player.id).emit('webnovella_event', {
                    event: consequenceEvent,
                    gameState: room.webNovellaState,
                    activePlayerId: player.id
                });
            } else {
                // Звичайна подія
                io.to(player.id).emit('webnovella_event', {
                    event: nextEvent,
                    gameState: room.webNovellaState,
                    activePlayerId: player.id
                });
            }
        } else {
            // Кінець історії
            io.to(player.id).emit('webnovella_end', {
                finalEvent: currentEvent,
                resultMessage: `Історія завершена! Отримано ${currentEvent.points || 0} ОО.`
            });
            
            // Нараховуємо очки
            const gamePlayer = room.gameData.players.find(p => p.id === player.id);
            if (gamePlayer) {
                gamePlayer.points += (currentEvent.points || 0);
            }
            
            room.webNovellaState = null;
        }
    });
    
    // Обмін місцями після перемоги в міні-грі
    socket.on('swap_positions', (data) => {
        const room = rooms.get(data.roomId);
        if (!room) return;
        
        const currentPlayer = room.gameData.players.find(p => p.id === data.playerId);
        const targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId);
        
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
            
            // НЕ перевіряємо події на нових позиціях - це тільки обмін місцями
            console.log(`${currentPlayer.name} обмінявся місцями з ${targetPlayer.name}`);
        }
    });
    
    // Перепідключення гравця
    socket.on('reconnect_player', (data) => {
        console.log('Спроба перепідключення гравця:', data);
        
        const room = rooms.get(data.roomId);
        if (!room) {
            socket.emit('error', { message: 'Кімната не знайдена' });
            return;
        }
        
        const player = room.gameData.players.find(p => p.id === data.playerId);
        if (!player) {
            socket.emit('error', { message: 'Гравець не знайдений' });
            return;
        }
        
        // Оновлюємо playerId гравця в масиві гравців кімнати
        player.id = socket.id;
        player.disconnected = false; // Позначаємо як підключеного
        
        // Оновлюємо глобальний список гравців
        players.set(socket.id, { ...player, roomId: data.roomId });
        
        // Приєднуємося до кімнати
        socket.join(data.roomId);
        
        // Відправляємо оновлений список гравців всім у кімнаті
        io.to(data.roomId).emit('player_list_update', {
            players: room.gameData.players
        });
        
        // Критично важливо: Відправляємо повний актуальний стан гри
        if (room.gameState === 'playing') {
            socket.emit('game_started', {
                players: room.gameData.players,
                currentPlayerIndex: room.gameData.currentPlayerIndex
            });
        } else {
            socket.emit('game_state_update', room.gameData);
        }
        
        // Відправляємо повний стан гри всім гравцям у кімнаті
        io.to(data.roomId).emit('game_state_update', room.gameData);
        
        // Повідомляємо інших гравців про повернення
        socket.to(data.roomId).emit('chat_message', { 
            type: 'system', 
            message: `${player.name} повернувся в гру!` 
        });
        
        console.log(`Гравець ${player.name} перепідключився до кімнати ${data.roomId}`);
    });
    
    // Відключення
    socket.on('disconnect', () => {
        console.log(`Користувач відключився: ${socket.id}`);
        
        const player = players.get(socket.id);
        if (player) {
            const room = rooms.get(player.roomId);
            if (room && room.gameState === 'playing') {
                // Не видаляємо гравця одразу, а лише помічаємо як disconnected
                const gamePlayer = room.gameData.players.find(p => p.id === socket.id);
                if (gamePlayer) {
                    gamePlayer.disconnected = true;
                    
                    // Запускаємо таймер на 2 хвилини
                    setTimeout(() => {
                        if (gamePlayer.disconnected) {
                            // Видаляємо гравця через 2 хвилини
                            room.gameData.players = room.gameData.players.filter(p => p.id !== socket.id);
                            players.delete(socket.id);
                            
                            // Повідомляємо інших гравців
                            socket.to(room.id).emit('player_left', {
                                player: { id: socket.id, name: gamePlayer.name },
                                players: room.gameData.players
                            });
                            
                            console.log(`Гравець ${gamePlayer.name} видалено через відсутність`);
                        }
                    }, 120000); // 2 хвилини
                }
            } else {
                // Якщо гра не активна, видаляємо одразу
                const room = leaveRoom(socket.id);
                if (room) {
                    socket.to(room.id).emit('player_left', {
                        player: { id: socket.id },
                        players: room.players
                    });
                }
            }
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
