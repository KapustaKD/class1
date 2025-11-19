const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Функція для передачі ходу наступному гравцю
function passTurnToNextPlayer(room) {
    // Переходимо до наступного гравця
    console.log('Старий currentPlayerIndex:', room.gameData.currentPlayerIndex);
    
    // Визначаємо початок кола, якщо ще не визначено
    if (room.roundStartPlayerIndex === undefined) {
        room.roundStartPlayerIndex = room.gameData.currentPlayerIndex;
        // Ініціалізуємо лічильник використань бафів
        room.playersBuffUsedThisRound = {};
    }
    
    let nextPlayerFound = false;
    
    // Використовуємо цикл while замість рекурсії для безпеки
    // Об'єднуємо перевірки вибулих гравців та пропуску ходу в один цикл
    while (!nextPlayerFound) {
        // Переходимо до наступного гравця
        room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
        console.log('Новий currentPlayerIndex:', room.gameData.currentPlayerIndex);
        
        // Синхронізуємо з room.currentPlayerIndex
        room.currentPlayerIndex = room.gameData.currentPlayerIndex;
        
        // Перевіряємо чи завершено коло (повернулись до початку)
        if (room.gameData.currentPlayerIndex === room.roundStartPlayerIndex) {
            // Коло завершено - скидаємо лічильник бафів
            room.playersBuffUsedThisRound = {};
            room.roundStartPlayerIndex = room.gameData.currentPlayerIndex; // Новий початок кола
            console.log('Коло завершено, скидаємо лічильник бафів');
        }
        
        const nextPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        
        // 1. Пропускаємо вибулих гравців
        if (nextPlayer.hasWon || nextPlayer.hasLost) {
            console.log('Пропущено вибулого гравця:', nextPlayer.name);
            room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
            room.currentPlayerIndex = room.gameData.currentPlayerIndex; // Синхронізуємо
            continue; // Шукаємо далі
        }
        
        // 2. Перевірка на пропуск ходу через "Прокрастинацію"
        if (nextPlayer.effects && nextPlayer.effects.skipTurn && nextPlayer.effects.skipTurn > 0) {
            console.log(`Гравець ${nextPlayer.name} пропускає хід через Прокрастинацію.`);
            nextPlayer.effects.skipTurn--;
            if (nextPlayer.effects.skipTurn <= 0) delete nextPlayer.effects.skipTurn;
            
            // Відправляємо повідомлення в чат
            io.to(room.id).emit('chat_message', {
                type: 'system',
                message: `⏳ ${nextPlayer.name} піддався Прокрастинації та пропускає хід!`
            });
            
            // Відправляємо оновлення стану
            io.to(room.id).emit('game_state_update', room.gameData);
            
            // Переходимо до наступного гравця
            room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
            room.currentPlayerIndex = room.gameData.currentPlayerIndex; // Синхронізуємо
            continue; // Шукаємо далі
        }
        
        // 3. Знайшли активного гравця без пропуску ходу
        nextPlayerFound = true;
        console.log('Наступний гравець:', nextPlayer.name, 'ID:', nextPlayer.id);
        
        io.to(room.id).emit('turn_update', {
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            currentPlayerId: nextPlayer.id,
            currentPlayerName: nextPlayer.name
        });
    }
    
    console.log('Відправлено подію turn_update всім гравцям:', {
        currentPlayerIndex: room.gameData.currentPlayerIndex,
        currentPlayerId: nextPlayer.id,
        currentPlayerName: nextPlayer.name
    });
}

// Функція для обробки подій, що не потребують вибору гравця (Амфітеатр, Шинок, Казино)
function handleImmediateEvent(room, player, eventType) {
    let resultMessage = '';
    const roomPlayer = room.gameData.players.find(p => p.id === player.id);
    if (!roomPlayer) return resultMessage;

    // Переконайся, що клас гравця доступний
    if (!roomPlayer.class || !roomPlayer.class.id) {
        console.error(`Клас гравця ${roomPlayer.name} не визначено!`);
        // Встановимо клас за замовчуванням, щоб уникнути помилки
        roomPlayer.class = { id: 'burgher', name: '⚖️ Міщанин' }; // Або інший клас за замовчуванням
    }
    const playerClassId = roomPlayer.class.id;
    const playerClassName = roomPlayer.class.name; // Для повідомлень

    switch(eventType) {
        case 'amphitheater':
            if (playerClassId === 'aristocrat' || playerClassId === 'burgher') {
                roomPlayer.skipTurn = true;
                resultMessage = `🎭 ${roomPlayer.name} (${playerClassName}) захотів вина та видовищ в Амфітеатрі! У такому стані він не може продовжити гру та пропускає хід.`;
            } else { // peasant
                resultMessage = `⛔ ${roomPlayer.name} (${playerClassName}) хотів потрапити до Амфітеатру, але забув про своє становище у суспільстві - його не пустили.`;
                // Пропуск ходу для селянина не встановлюємо
            }
            break;
            
        case 'tavern': // Шинок
        case 'casino': // Казино
            const eventName = eventType === 'tavern' ? 'Шинку' : 'Казино';
            
            if (playerClassId === 'aristocrat') {
                const lostPoints = roomPlayer.points; // Запам'ятовуємо скільки втратив
                roomPlayer.points = 0;
                resultMessage = `💸 ${roomPlayer.name} (${playerClassName})! Вітаємо! Ви втратили усі статки (${lostPoints} ОО), які століттями накопичувала ваша родина у ${eventName}! Відтепер життя стане складнішим, проте не засмучуйтесь: все ще є шанси перемогти!`;
            } else if (playerClassId === 'burgher') {
                const lostPoints = Math.floor(roomPlayer.points / 2);
                roomPlayer.points -= lostPoints;
                resultMessage = `💰 ${roomPlayer.name} (${playerClassName})! Вітаємо! Ви втратили половину (${lostPoints} ОО) вашого нажитого майна у ${eventName}! Відтепер життя стане дещо складнішим, проте не засмучуйтесь: все ще є шанси перемогти!`;
            } else { // peasant — замість вибування робимо переродження в поточну епоху
                const lostPoints = roomPlayer.points;
                roomPlayer.points = 0;
                // Визначаємо поточну епоху
                const currentEpoch = getEpochForPosition(roomPlayer.position);
                // Стартові позиції епох
                const epochStart = (epoch) => {
                    if (epoch === 1) return 0;
                    if (epoch === 2) return 13;
                    if (epoch === 3) return 23;
                    if (epoch === 4) return 43;
                    if (epoch === 5) return 76;
                    if (epoch === 6) return 98;
                    return 0;
                };
                const targetPosition = epochStart(currentEpoch);
                
                // Переміщуємо
                roomPlayer.position = targetPosition;
                const globalPlayer = players.get(roomPlayer.id);
                if (globalPlayer) globalPlayer.position = targetPosition;
                
                // Призначаємо новий клас відповідно до поточної епохи (правила як для ранньої реінкарнації)
                const occupiedClassesInEpoch = room.gameData.players
                    .filter(p => p.id !== roomPlayer.id && p.class && getEpochForPosition(p.position) === currentEpoch)
                    .map(p => p.class.id);
                const availableClasses = [
                    { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
                    { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
                    { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 }
                ];
                const classCounts = {};
                for (const cid of occupiedClassesInEpoch) classCounts[cid] = (classCounts[cid] || 0) + 1;
                let pool = availableClasses.filter(cls => {
                    const c = classCounts[cls.id] || 0;
                    if (room.gameData.players.length <= 3) return c < 1; else return c < 2;
                });
                if (pool.length === 0) pool = availableClasses;
                roomPlayer.class = pool[Math.floor(Math.random() * pool.length)];
                if (globalPlayer) globalPlayer.class = roomPlayer.class;
                
                resultMessage = `💀 ${roomPlayer.name} (${playerClassName}) витратив останні гроші (${lostPoints} ОО) у ${eventName} і переродився на початку поточної епохи.`;
                
                // Показуємо модальне вікно переродження на клієнті
                // Поточному гравцю - детальне вікно
                io.to(roomPlayer.id).emit('early_reincarnation_event', {
                    playerId: roomPlayer.id,
                    playerName: roomPlayer.name,
                    cellNumber: roomPlayer.position,
                    eventData: { points: 0, targetEpoch: currentEpoch, cellNumber: roomPlayer.position },
                    newClass: roomPlayer.class
                });
                
                // Іншим гравцям - інформаційне вікно
                room.players.forEach(p => {
                    if (p.id !== roomPlayer.id) {
                        io.to(p.id).emit('show_reincarnation_class', {
                            playerId: roomPlayer.id,
                            playerName: roomPlayer.name,
                            newClass: roomPlayer.class,
                            bonusPoints: 0,
                            isOtherPlayer: true
                        });
                    }
                });
            }
            break;
        default:
            resultMessage = `Невідома миттєва подія: ${eventType}`;
    }

    // Повідомляємо всіх про результат
    io.to(room.id).emit('chat_message', {
        type: 'system',
        message: resultMessage
    });
    
    // Оновлюємо стан гри (очки, пропуск ходу, статус вибування)
    io.to(room.id).emit('game_state_update', room.gameData);
    
    // Повертаємо повідомлення для відправки в event_result
    return resultMessage;
}

// Імпортуємо дані міні-ігор
const { pvpGames, creativeGames, madLibsQuestions, webNovella } = require('./questsData.js');

// Імпортуємо єдине джерело правди про події
const specialCells = require('./specialCells.js');

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
    if (position <= 101) return 6;
    return 7; // Фінальна клітинка 101
}

// Спеціальні клітинки з подіями імпортуються з specialCells.js

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

// Keep-alive endpoint для запобігання закриття сервера на Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Keep-alive endpoint для періодичних запитів
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'pong', 
        timestamp: new Date().toISOString()
    });
});

// Періодичний keep-alive механізм (для запобігання закриття на Render)
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        console.log('💓 Keep-alive: сервер активний', new Date().toISOString());
    }, 10 * 60 * 1000); // Кожні 10 хвилин
}

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
                // Є вільні місця, додаємо як гравця
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
        
        const availableClasses = [
            { 
                id: 'aristocrat', 
                name: '⚜️ Аристократ', 
                startPoints: 50, 
                moveModifier: 1,
                description: 'Вітаю! Ви народилися із золотою ложкою в роті! Ваше життя буде легшим, ніж у решти, завдяки безмежним статкам пращурів. Проте все ж один криптоніт маєте – казино та шинки. Якщо ступите ногою у даний заклад, втратите все!'
            },
            { 
                id: 'burgher', 
                name: '⚖️ Міщанин', 
                startPoints: 20, 
                moveModifier: 0,
                description: 'Вітаю! Ви народилися в родині, що здатна вас забезпечити! Проте на більше не сподівайтесь. Ваше життя буде посереднім. До казино та шинків також не варто підходити, якщо не хочете втратити половину майна!'
            },
            { 
                id: 'peasant', 
                name: '🌱 Селянин', 
                startPoints: 0, 
                moveModifier: -1,
                description: 'Вітаю! Ви народились! На цьому гарні новини для вас скінчились. Життя, сповнене стражданнями та злиднями, відтепер звична реальність. До казино та шинків теж не рекомендуємо ходити, якщо не хочете передчасно померти з голоду.'
            },
        ];

        let classPool = [];
        if (room.players.length <= 3) {
            classPool = [...availableClasses].sort(() => 0.5 - Math.random());
        } else {
            classPool = [...availableClasses, ...availableClasses].sort(() => 0.5 - Math.random());
        }

        // Ініціалізуємо гру
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
        room.currentPlayerIndex = 0;
        
        // Призначаємо гравців до кожної події для презентації
        room.gameData.eventAssignments = {};
        const eventCells = [3, 10, 21, 32, 40, 55, 61, 69, 81, 90, 96, 99];
        const shuffledPlayers = [...room.players].sort(() => 0.5 - Math.random());
        
        eventCells.forEach((cellNumber, index) => {
            const assignedPlayer = shuffledPlayers[index % shuffledPlayers.length];
            room.gameData.eventAssignments[cellNumber] = assignedPlayer.id;
            console.log(`Подія на клітинці ${cellNumber} призначена гравцю ${assignedPlayer.name}`);
        });
        
        room.gameData.avatarSelections = {};
        room.gameData.readyPlayers = [];
        
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
        if (!player) return;
        
        const room = rooms.get(player.roomId);
        if (!room) return;
        
        if (!room.gameData || !room.gameData.avatarSelections) return;
        
        const isAvatarTaken = Object.values(room.gameData.avatarSelections).includes(data.avatarUrl);
        if (isAvatarTaken) {
            socket.emit('error', { message: 'Цей аватар вже обраний іншим гравцем!' });
            return;
        }
        
        room.gameData.avatarSelections[socket.id] = data.avatarUrl;
        io.to(room.id).emit('avatar_update', room.gameData.avatarSelections);
        console.log('Аватар обрано:', data.avatarUrl, 'для гравця:', player.name);
    });
    
    // Обробник готовності гравця
    socket.on('player_ready', (data) => {
        console.log('Сервер отримав подію player_ready:', data);
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
            console.log('Всі гравці готові! Запускаємо гру...');
            
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
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') return;
        
        const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        
        if (currentPlayer.id !== player.id && currentPlayer.name !== player.name) {
            console.log('Не хід цього гравця');
            return;
        }
        
        if (currentPlayer.id !== player.id && currentPlayer.name === player.name) {
            console.log('Оновлюємо ID гравця після перепідключення');
            currentPlayer.id = player.id;
        }
        
        console.log('Обробляємо кидання кубика для гравця:', currentPlayer.name);
        
        const roll = Math.floor(Math.random() * 6) + 1;
        let moveModifier = 0;
        let effectApplied = null;
        
        if (currentPlayer.effects) {
            if (currentPlayer.effects.hateClone && currentPlayer.effects.hateClone > 0) {
                moveModifier = -Math.ceil(roll / 2);
                currentPlayer.effects.hateClone--;
                effectApplied = 'hateClone';
                if (currentPlayer.effects.hateClone <= 0) delete currentPlayer.effects.hateClone;
            } else if (currentPlayer.effects.happinessCharm && currentPlayer.effects.happinessCharm > 0) {
                moveModifier = roll;
                currentPlayer.effects.happinessCharm--;
                effectApplied = 'happinessCharm';
                if (currentPlayer.effects.happinessCharm <= 0) delete currentPlayer.effects.happinessCharm;
            }
        }
        
        let move = roll + moveModifier;
        
        if (currentPlayer.class) {
            move += currentPlayer.class.moveModifier;
            if (currentPlayer.class.id === 'peasant') {
                move = Math.max(1, move);
            }
        }
        
        console.log(`Кубик: ${roll}, Клас: ${currentPlayer.class ? currentPlayer.class.moveModifier : 0}, Ефект: ${moveModifier} (${effectApplied || 'немає'}), Фінальний хід: ${move}`);
        
        const EPOCH_BOUNDARIES = [12, 22, 42, 75, 97, 101];
        const oldPosition = currentPlayer.position;
        let finalPosition = oldPosition;
        let stopMove = false;
        
        for (let i = 1; i <= move; i++) {
            const nextStep = oldPosition + i;
            if (EPOCH_BOUNDARIES.includes(nextStep)) {
                if (nextStep !== 101) {
                finalPosition = nextStep;
                stopMove = true;
                    break;
                }
            }
        }
        
        if (stopMove) {
            currentPlayer.position = finalPosition;
        } else {
            finalPosition = Math.min(oldPosition + move, 101);
            currentPlayer.position = finalPosition;
            
            if (finalPosition === 100) {
                console.log(`Гравець ${currentPlayer.name} потрапив на 100-ту клітинку! Повстання машин!`);
                const uprisingCost = Math.ceil(currentPlayer.points / 2);
                currentPlayer.uprisingCost = uprisingCost;
                
                // eventInfo буде створено нижче
                console.log(`Вартість відкупу від ШІ: ${uprisingCost} ОО`);
            }
            
            if (finalPosition >= 101) {
                currentPlayer.hasWon = true;
                room.gameState = 'finished';
                io.to(room.id).emit('game_ended', {
                    winner: currentPlayer,
                    reason: `${currentPlayer.name} переміг, досягнувши кінця освітнього шляху!`
                });
                return;
            }
        }
        
        console.log(`${currentPlayer.name} перемістився з позиції ${oldPosition} на позицію ${currentPlayer.position}`);
        
        const eventInfo = {
            hasEvent: false,
            eventType: null,
            eventData: null,
            playerId: currentPlayer.id,
            playerName: currentPlayer.name
        };
        
        let hasEvent = false;
        
        const specialCell = specialCells[currentPlayer.position];
        if (specialCell && !hasEvent) {
            hasEvent = true;
            eventInfo.hasEvent = true;
            eventInfo.eventType = specialCell.type;
            eventInfo.eventData = { ...specialCell, cellNumber: currentPlayer.position };
            console.log(`Гравець ${currentPlayer.name} потрапив на спеціальну клітинку ${currentPlayer.position}: ${specialCell.type}`);
            
            // Якщо це повстання машин (клітинка 100), додаємо вартість в eventData
            if (currentPlayer.position === 100 && currentPlayer.uprisingCost) {
                 eventInfo.eventData.cost = currentPlayer.uprisingCost;
            }
        }
        
        const oldEpochAfterMove = getEpochForPosition(oldPosition);
        const newEpochAfterMove = getEpochForPosition(finalPosition);
        
        if (oldEpochAfterMove !== newEpochAfterMove && finalPosition > oldPosition) {
            console.log(`${currentPlayer.name} перейшов в нову епоху ${newEpochAfterMove} - реінкарнація!`);
            currentPlayer.points += 50;
            
            const newEpoch = newEpochAfterMove;
            const occupiedClassesInNewEpoch = room.gameData.players
                .filter(p => p.id !== currentPlayer.id && getEpochForPosition(p.position) === newEpoch)
                .map(p => p.class.id);

            const availableClasses = [
                { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
                { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
                { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 }
            ];

            const classCounts = {};
            for (const classId of occupiedClassesInNewEpoch) {
                classCounts[classId] = (classCounts[classId] || 0) + 1;
            }

            let availableClassPool = availableClasses.filter(cls => {
                const count = classCounts[cls.id] || 0;
                if (room.gameData.players.length <= 3) {
                    return count < 1;
                } else {
                    return count < 2;
                }
            });

            if (availableClassPool.length === 0) {
                availableClassPool = availableClasses;
            }

            currentPlayer.class = availableClassPool[Math.floor(Math.random() * availableClassPool.length)];
            
            console.log(`${currentPlayer.name} отримав новий клас: ${currentPlayer.class.name}`);
            
            const reincarnationBonus = 50;
            io.to(currentPlayer.id).emit('show_reincarnation_class', {
                playerId: currentPlayer.id,
                playerName: currentPlayer.name,
                newClass: currentPlayer.class,
                bonusPoints: reincarnationBonus
            });
            
            room.players.forEach(p => {
                if (p.id !== currentPlayer.id) {
                    io.to(p.id).emit('show_reincarnation_class', {
                        playerId: currentPlayer.id,
                        playerName: currentPlayer.name,
                        newClass: currentPlayer.class,
                        bonusPoints: reincarnationBonus,
                        isOtherPlayer: true
                    });
                }
            });
        }
        
        io.to(room.id).emit('dice_result', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            roll,
            move,
            newPosition: currentPlayer.position,
            newPoints: currentPlayer.points,
            newClass: currentPlayer.class,
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            eventInfo: eventInfo
        });
        
        if (hasEvent && !stopMove) {
            console.log(`Гравець ${currentPlayer.name} потрапив на подію, чекаємо на обробку...`);
            room.currentEventPlayerId = currentPlayer.id;
        } else if (stopMove) {
            console.log(`Реінкарнація оброблена, передаємо хід наступному гравцю...`);
            passTurnToNextPlayer(room);
        } else {
            passTurnToNextPlayer(room);
        }
    });
    
    // Обробляємо подію гравця
    socket.on('player_on_event', (data) => {
        console.log('Гравець потрапив на подію:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') return;

        if (room.currentEventPlayerId !== player.id) {
            console.log('Не той гравець намагається активувати подію');
            return;
        }

        room.currentEventData = data.eventData;
        console.log(`${player.name} потрапив на подію ${data.eventType}`);
        
        const isAssignedPlayer = room.gameData.eventAssignments && 
                               room.gameData.eventAssignments[data.cellNumber] === player.id;
        
        if (isAssignedPlayer) {
            console.log(`Гравець ${player.name} призначений до події на клітинці ${data.cellNumber}`);
        }

        if (data.eventType === 'pvp-quest') {
            const availablePlayers = room.gameData.players.filter(p => p.id !== player.id && !p.hasWon && !p.hasLost);
            if (availablePlayers.length === 0) {
                io.to(room.id).emit('event_result', {
                    playerId: player.id,
                    playerName: player.name,
                    choice: 'skip',
                    resultMessage: `${player.name} не знайшов опонента для ПВП-квесту.`,
                    newPosition: player.position,
                    newPoints: player.points
                });
                passTurnToNextPlayer(room); // ВИПРАВЛЕННЯ: Передача ходу, якщо немає опонентів
                return;
            }

            const opponent = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
            
            let selectedGameKey = 'genius';
            let selectedGame;
            
            if (data.eventData && data.eventData.gameType && pvpGames[data.eventData.gameType]) {
                selectedGameKey = data.eventData.gameType;
                selectedGame = pvpGames[selectedGameKey];
            } else {
                selectedGameKey = 'genius';
                selectedGame = pvpGames[selectedGameKey];
            }
            
            if (selectedGameKey === 'tic_tac_toe') {
                room.tictactoeState = {
                    gameType: 'tic_tac_toe',
                    gameData: selectedGame,
                    players: [player.id, opponent.id],
                    playerNames: [player.name, opponent.name],
                    currentRound: 0,
                    totalRounds: 3,
                    rounds: [{board: Array(9).fill(null), winner: null, currentPlayer: player.id}, 
                             {board: Array(9).fill(null), winner: null, currentPlayer: player.id}, 
                             {board: Array(9).fill(null), winner: null, currentPlayer: player.id}],
                    scores: {[player.id]: 0, [opponent.id]: 0},
                    gameActive: true,
                    currentPlayer: player.id
                };
                
                io.to(room.id).emit('tic_tac_toe_start', {
                    gameState: room.tictactoeState,
                    player1: { id: player.id, name: player.name },
                    player2: { id: opponent.id, name: opponent.name }
                });
            } else if (selectedGameKey === 'rock_paper_scissors') {
                room.rockPaperScissorsState = {
                    gameType: 'rock_paper_scissors',
                    gameData: selectedGame,
                    players: [player.id, opponent.id],
                    playerNames: [player.name, opponent.name],
                    currentRound: 0,
                    maxRounds: 3,
                    rounds: [{ player1Choice: null, player2Choice: null, winner: null },
                            { player1Choice: null, player2Choice: null, winner: null },
                            { player1Choice: null, player2Choice: null, winner: null }],
                    choices: { [player.id]: null, [opponent.id]: null },
                    scores: { [player.id]: 0, [opponent.id]: 0 },
                    gameActive: true,
                    currentPlayer: player.id
                };
                
                io.to(room.id).emit('rock_paper_scissors_start', {
                    gameState: room.rockPaperScissorsState,
                    player1: { id: player.id, name: player.name },
                    player2: { id: opponent.id, name: opponent.name }
                });
            } else {
                room.timedTextQuestState = {
                    gameType: selectedGameKey,
                    gameData: selectedGame,
                    players: [player.id, opponent.id],
                    playerNames: [player.name, opponent.name],
                    timer: selectedGame.timer,
                    startTime: Date.now(),
                    results: {},
                    gameActive: true
                };

                io.to(room.id).emit('start_timed_text_quest', {
                    gameState: room.timedTextQuestState,
                    player1: { id: player.id, name: player.name },
                    player2: { id: opponent.id, name: opponent.name },
                    activePlayerId: player.id
                });
            }

        } else if (data.eventType === 'creative-quest') {
            let gameType = 'great_pedagogical';
            if (data.eventData && data.eventData.gameType && creativeGames[data.eventData.gameType]) {
                gameType = data.eventData.gameType;
            }
            
            const selectedGame = creativeGames[gameType];
            
            if (gameType === 'chronicles') {
                room.collaborativeStoryState = {
                    gameType: gameType,
                    gameData: selectedGame,
                    players: room.gameData.players.filter(p => !p.hasWon && !p.hasLost),
                    currentPlayerIndex: 0,
                    story: [],
                    timer: selectedGame.timer,
                    gameActive: true,
                    eliminatedPlayers: []
                };
                
                const firstPlayer = room.collaborativeStoryState.players[0];
                io.to(room.id).emit('collaborative_story_start', {
                    gameState: room.collaborativeStoryState,
                    currentPlayer: firstPlayer,
                    activePlayerId: firstPlayer.id
                });
                
            } else {
                room.creativeWritingState = {
                    gameType: gameType,
                    gameData: selectedGame,
                    timer: selectedGame.timer,
                    gameActive: true,
                    submissions: [],
                    votes: {},
                    players: room.gameData.players.map(p => ({ id: p.id, name: p.name }))
                };
                
                io.to(room.id).emit('start_creative_submission', {
                    gameState: room.creativeWritingState,
                    task: selectedGame.description,
                    timer: selectedGame.timer
                });
            }

        } else if (data.eventType === 'mad-libs-quest') {
            room.madLibsState = {
                questions: [...madLibsQuestions],
                players: room.gameData.players.filter(p => !p.hasWon && !p.hasLost),
                currentQuestionIndex: 0,
                currentPlayerIndex: 0,
                answers: [],
                gameActive: true
            };
            
            const firstPlayer = room.madLibsState.players[0];
            const firstQuestion = room.madLibsState.questions[0];
            
            io.to(firstPlayer.id).emit('mad_libs_question', {
                question: firstQuestion,
                questionIndex: 0,
                playerIndex: 0,
                gameState: room.madLibsState,
                activePlayerId: firstPlayer.id
            });
            
            room.madLibsState.players.forEach((player, index) => {
                if (index !== 0) {
                    io.to(player.id).emit('mad_libs_waiting', {
                        currentPlayer: firstPlayer,
                        question: firstQuestion,
                        questionIndex: 0
                    });
                }
            });

        } else if (data.eventType === 'webnovella-quest') {
            let novellaStart = 'start_event_1';
            if (data.cellNumber === 81) novellaStart = 'start_event_2';
            else if (data.cellNumber === 90) novellaStart = 'start_event_3';
            
            room.webNovellaState = {
                currentEvent: novellaStart,
                playerId: player.id,
                gameActive: true
            };
            
            io.to(player.id).emit('webnovella_event', {
                event: webNovella[novellaStart],
                gameState: room.webNovellaState,
                activePlayerId: player.id
            });

        } else if (data.eventType === 'amphitheater' || data.eventType === 'tavern' || data.eventType === 'casino') {
            const resultMessage = handleImmediateEvent(room, player, data.eventType);
            io.to(room.id).emit('event_result', {
                playerId: player.id,
                playerName: player.name,
                eventType: data.eventType,
                resultMessage: resultMessage,
                newPosition: player.position,
                newPoints: room.gameData.players.find(p => p.id === player.id)?.points || player.points
            });
            passTurnToNextPlayer(room);
        } else if (data.eventType === 'early-reincarnation') {
            const targetEpoch = data.eventData.targetEpoch;
            const cellNumber = data.eventData.cellNumber;
            let targetPosition;
            
            if (targetEpoch === 2) targetPosition = 13;
            else if (targetEpoch === 3) targetPosition = 23;
            else if (targetEpoch === 4) targetPosition = 43;
            else if (targetEpoch === 5) targetPosition = 76;
            else if (targetEpoch === 6) targetPosition = 98;
            else targetPosition = data.eventData.targetEpoch * 12;
            
            const roomPlayer = room.gameData.players.find(p => p.id === player.id);
            if (roomPlayer) {
                roomPlayer.position = targetPosition;
                roomPlayer.points += data.eventData.points;
                player.position = targetPosition;
                player.points += data.eventData.points;
                
                const newEpoch = getEpochForPosition(targetPosition);
                const occupiedClassesInNewEpoch = room.gameData.players
                    .filter(p => p.id !== player.id && p.class && getEpochForPosition(p.position) === newEpoch)
                    .map(p => p.class.id);
                
                const availableClasses = [
                    { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
                    { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
                    { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 }
                ];
                
                const classCounts = {};
                for (const classId of occupiedClassesInNewEpoch) {
                    classCounts[classId] = (classCounts[classId] || 0) + 1;
                }
                
                let availableClassPool = availableClasses.filter(cls => {
                    const count = classCounts[cls.id] || 0;
                    if (room.gameData.players.length <= 3) return count < 1; else return count < 2;
                });
                
                if (availableClassPool.length === 0) availableClassPool = availableClasses;
                
                roomPlayer.class = availableClassPool[Math.floor(Math.random() * availableClassPool.length)];
                player.class = roomPlayer.class;
            }
            
            io.to(room.id).emit('chat_message', {
                type: 'system',
                message: `${player.name} зазнав ранньої смерті та переродився у епосі ${targetEpoch}! Переміщено на клітинку ${targetPosition}, отримано ${data.eventData.points} ОО.`
            });
            
            io.to(player.id).emit('early_reincarnation_event', {
                playerId: player.id,
                playerName: player.name,
                cellNumber: cellNumber,
                eventData: {
                    points: data.eventData.points,
                    targetEpoch: targetEpoch,
                    cellNumber: cellNumber
                },
                newClass: roomPlayer.class
            });
            
            room.players.forEach(p => {
                if (p.id !== player.id) {
                    io.to(p.id).emit('show_reincarnation_class', {
                        playerId: player.id,
                        playerName: player.name,
                        newClass: roomPlayer.class,
                        bonusPoints: data.eventData.points || 0,
                        isOtherPlayer: true
                    });
                }
            });
            
            io.to(room.id).emit('game_state_update', room.gameData);
            passTurnToNextPlayer(room);
        } else {
            socket.emit('show_event_prompt', {
                playerId: player.id,
                playerName: player.name,
                eventType: data.eventType,
                eventData: data.eventData,
                activePlayerId: player.id
            });
        }
    });
    
    // Обробляємо вибір гравця в події
    socket.on('event_choice_made', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') return;
        
        if (room.currentEventPlayerId !== player.id) return;
        
        let resultMessage = '';
        let shouldContinue = true;
        
        if (data.eventType === 'portal') {
            if (data.choice === 'yes') {
                const roomPlayer = room.gameData.players.find(p => p.id === player.id);
                if (roomPlayer) {
                    roomPlayer.position = data.eventData.target || data.targetPosition; // data.eventData.target is safer
                    roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                    player.position = roomPlayer.position;
                    player.points = roomPlayer.points;
                }
                resultMessage = `${player.name} скористався порталом! Переміщено на клітинку ${data.eventData.target}, втрачено ${data.eventData.cost} ОО.`;
            } else {
                resultMessage = `${player.name} відмовився від порталу.`;
            }
        } else if (data.eventType === 'reincarnation') {
            if (data.choice === 'yes') {
                const roomPlayer = room.gameData.players.find(p => p.id === player.id);
                if (roomPlayer) {
                    const points = data.eventData.points || 30;
                    roomPlayer.points += points;
                    player.points += points;
                    roomPlayer.position += 1;
                    player.position += 1;
                }
                resultMessage = `${player.name} завершив епоху! Отримано ${data.eventData.points || 30} ОО та переміщено на наступну клітинку.`;
            } else {
                resultMessage = `${player.name} відмовився від переходу між епохами.`;
            }
        } else if (data.eventType === 'alternative-path') {
            if (data.choice === 'yes') {
                if (player.points < data.eventData.cost) {
                    socket.emit('error_message', 'Вам не вистачає очок!');
                    return;
                }
                const roomPlayer = room.gameData.players.find(p => p.id === player.id);
                
                if (Math.random() < 0.5) {
                    if (roomPlayer) {
                        roomPlayer.position = data.eventData.target;
                        roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                        player.position = data.eventData.target;
                        player.points = Math.max(0, player.points - data.eventData.cost);
                    }
                    resultMessage = `${player.name} успішно скоротив шлях! Переміщено на клітинку ${data.eventData.target}, втрачено ${data.eventData.cost} ОО.`;
                } else {
                    if (roomPlayer) {
                        roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                        player.points = Math.max(0, player.points - data.eventData.cost);
                        roomPlayer.skipTurn = true; 
                    }
                    resultMessage = `🍄 ${player.name}, ваша жага до ефективного навчання привела Вас до рехабу! Втрачено ${data.eventData.cost} ОО. Наступного разу будьте обережніші з грибами! Пропускаєте 1 хід.`;
                }
            } else {
                resultMessage = `${player.name} відмовився від обхідної дороги.`;
            }
        } else if (data.eventType === 'machine-uprising') {
            const roomPlayer = room.gameData.players.find(p => p.id === player.id);
            const cost = roomPlayer.uprisingCost || 0;
            
            if (data.choice === 'pay') {
                if (roomPlayer.points >= cost) {
                    roomPlayer.points -= cost;
                    roomPlayer.hasWon = true;
                    resultMessage = `🤖 ${player.name} відкупився від ШІ за ${cost} ОО та успішно завершив Освітній Шлях! Перемога!`;
                    room.gameState = 'finished';
                    io.to(room.id).emit('game_ended', { winner: roomPlayer, reason: resultMessage });
                    shouldContinue = false;
                } else {
                    roomPlayer.hasLost = true;
                    resultMessage = `📉 ${player.name} не зміг відкупитися від ШІ (${cost} ОО)! Штучний інтелект переміг. Гравець вибуває!`;
                    io.to(room.id).emit('player_eliminated', { playerId: roomPlayer.id, playerName: roomPlayer.name, reason: `не зміг відкупитися від ШІ` });
                }
            } else {
                roomPlayer.hasLost = true;
                resultMessage = `💥 ${player.name} відмовився платити ШІ! Повстання машин було успішним. Гравець вибуває!`;
                io.to(room.id).emit('player_eliminated', { playerId: roomPlayer.id, playerName: roomPlayer.name, reason: `відмовився платити ШІ` });
            }
            delete roomPlayer.uprisingCost;
            shouldContinue = false;
        }
        
        room.currentEventPlayerId = null;
        room.currentEventData = null;
        
        const roomPlayer = room.gameData.players.find(p => p.id === player.id);
        io.to(room.id).emit('event_result', {
            playerId: player.id,
            playerName: player.name,
            choice: data.choice,
            resultMessage,
            newPosition: roomPlayer ? roomPlayer.position : player.position,
            newPoints: roomPlayer ? roomPlayer.points : player.points
        });
        
        io.to(room.id).emit('game_state_update', room.gameData);
        
        if (shouldContinue) {
            passTurnToNextPlayer(room);
        }
    });
    
    // Обробляємо відповідь на тестове завдання
    socket.on('test_answer', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room) return;
        
        const roomPlayer = room.gameData.players.find(p => p.id === player.id);
        if (!roomPlayer) return;
        
        const questionData = require('./testQuestionsData.js')[data.cellNumber];
        if (!questionData) return;
        
        const isCorrect = data.answer === questionData.correctAnswer;
        let resultMessage = '';
        
        if (isCorrect) {
            roomPlayer.points += 5;
            player.points += 5;
            resultMessage = `${player.name} правильно відповів на тестове завдання! Отримано 5 ОО.`;
        } else {
            resultMessage = `${player.name} неправильно відповів на тестове завдання. Правильна відповідь: ${questionData.correctAnswer}`;
        }
        
        room.currentEventPlayerId = null;
        room.currentEventData = null;
        
        io.to(room.id).emit('game_state_update', {
            players: room.gameData.players,
            currentPlayerIndex: room.currentPlayerIndex,
            gameActive: room.gameState === 'playing'
        });
        
        io.to(room.id).emit('chat_message', { type: 'system', message: resultMessage });
        
        io.to(room.id).emit('test_result', {
            playerId: player.id,
            playerName: player.name,
            isCorrect: isCorrect,
            resultMessage: resultMessage,
            newPoints: roomPlayer.points
        });
        
        passTurnToNextPlayer(room);
    });
    
    // Обробка ходу в хрестиках-нуликах
    socket.on('tic_tac_toe_move', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room || !room.tictactoeState || !room.tictactoeState.gameActive) return;
        
        const gameState = room.tictactoeState;
        
        if (gameState.currentPlayer !== player.id) return;
        
        const currentRound = gameState.currentRound || 0;
        if (!gameState.rounds) gameState.rounds = Array(3).fill(null).map(() => ({board: Array(9).fill(null), winner: null, currentPlayer: null}));
        if (!gameState.rounds[currentRound]) gameState.rounds[currentRound] = {board: Array(9).fill(null), winner: null, currentPlayer: null};
        
        const roundBoard = gameState.rounds[currentRound].board;
        
        if (roundBoard[data.cellIndex] !== null && roundBoard[data.cellIndex] !== '' && roundBoard[data.cellIndex] !== undefined) return;
        
        roundBoard[data.cellIndex] = player.id;
        if (!gameState.gameState) gameState.gameState = Array(9).fill(null);
        gameState.gameState[data.cellIndex] = player.id;
        
        const winningCombinations = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        let winner = null;
        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (roundBoard[a] && roundBoard[a] === roundBoard[b] && roundBoard[a] === roundBoard[c]) {
                winner = roundBoard[a];
                break;
            }
        }
        
        if (winner) {
            gameState.rounds[currentRound].winner = winner;
            gameState.scores[winner] = (gameState.scores[winner] || 0) + 1;
            
            if (currentRound >= 2 || gameState.scores[winner] >= 2) {
                gameState.gameActive = false;
                // ВИПРАВЛЕННЯ: Нараховуємо очки переможцю і передаємо хід
                const winnerPlayer = room.gameData.players.find(p => p.id === winner);
                if (winnerPlayer) winnerPlayer.points += 30;
                io.to(room.id).emit('game_state_update', room.gameData);
                passTurnToNextPlayer(room);
            } else {
                gameState.currentRound = currentRound + 1;
                if (!gameState.rounds[gameState.currentRound]) gameState.rounds[gameState.currentRound] = {board: Array(9).fill(null), winner: null, currentPlayer: null};
                gameState.gameState = Array(9).fill(null);
                gameState.currentPlayer = gameState.players[0];
            }
        } else if (!roundBoard.includes(null)) {
            gameState.rounds[currentRound].winner = null;
            gameState.currentRound = currentRound + 1;
            if (gameState.currentRound >= 3) {
                gameState.gameActive = false;
                // ВИПРАВЛЕННЯ: Нічия, даємо по 10 очок і передаємо хід
                gameState.players.forEach(pid => {
                    const p = room.gameData.players.find(pl => pl.id === pid);
                    if(p) p.points += 10;
                });
                io.to(room.id).emit('game_state_update', room.gameData);
                passTurnToNextPlayer(room);
            } else {
                if (!gameState.rounds[gameState.currentRound]) gameState.rounds[gameState.currentRound] = {board: Array(9).fill(null), winner: null, currentPlayer: null};
                gameState.gameState = Array(9).fill(null);
                gameState.currentPlayer = gameState.players[0];
            }
        } else {
            gameState.currentPlayer = gameState.players.find(p => p !== player.id);
            gameState.rounds[currentRound].currentPlayer = gameState.currentPlayer;
        }
        
        io.to(room.id).emit('tic_tac_toe_move_update', {
            gameState: room.tictactoeState,
            winner: winner,
            currentRound: gameState.currentRound
        });
    });
    
    // Обробка вибору в камінь-ножиці-папір
    socket.on('rps_choice', (data) => {
        const player = players.get(socket.id);
        if (!player) return;
        
        const room = rooms.get(data.roomId);
        if (!room || !room.rockPaperScissorsState || !room.rockPaperScissorsState.gameActive) return;
        
        const gameState = room.rockPaperScissorsState;
        if (!gameState.players.includes(player.id)) return;
        
        gameState.choices[player.id] = data.choice;
        
        const allChose = gameState.players.every(p => {
            const choice = gameState.choices[p];
            return choice !== null && choice !== undefined && choice !== '';
        });
        
        if (allChose) {
            const [player1Id, player2Id] = gameState.players;
            const choice1 = gameState.choices[player1Id];
            const choice2 = gameState.choices[player2Id];
            
            let winner = null;
            if (choice1 === choice2) {
            } else if (
                (choice1 === 'rock' && choice2 === 'scissors') ||
                (choice1 === 'paper' && choice2 === 'rock') ||
                (choice1 === 'scissors' && choice2 === 'paper')
            ) {
                winner = player1Id;
                gameState.scores[player1Id]++;
            } else {
                winner = player2Id;
                gameState.scores[player2Id]++;
            }
            
            gameState.players.forEach(p => {
                const isPlayer1 = p === player1Id;
                io.to(p).emit('rps_choice_update', {
                    gameState: gameState,
                    result: winner ? (winner === p ? 'win' : 'lose') : 'tie',
                    opponentChoice: isPlayer1 ? choice2 : choice1,
                    playerChoice: isPlayer1 ? choice1 : choice2,
                    opponentId: isPlayer1 ? player2Id : player1Id
                });
            });
            
            gameState.currentRound++;
            if (gameState.currentRound > gameState.maxRounds || gameState.scores[player1Id] >= 2 || gameState.scores[player2Id] >= 2) {
                gameState.gameActive = false;
                // ВИПРАВЛЕННЯ: Нараховуємо очки та передаємо хід
                if (gameState.scores[player1Id] > gameState.scores[player2Id]) {
                    const wp = room.gameData.players.find(p => p.id === player1Id);
                    if(wp) wp.points += 30;
                } else if (gameState.scores[player2Id] > gameState.scores[player1Id]) {
                    const wp = room.gameData.players.find(p => p.id === player2Id);
                    if(wp) wp.points += 30;
                } else {
                     gameState.players.forEach(pid => {
                        const p = room.gameData.players.find(pl => pl.id === pid);
                        if(p) p.points += 10;
                    });
                }
                io.to(room.id).emit('game_state_update', room.gameData);
                passTurnToNextPlayer(room);
            } else {
                gameState.choices = { [player1Id]: null, [player2Id]: null };
            }
        } else {
            io.to(room.id).emit('rps_choice_update', {
                gameState: gameState,
                waiting: true,
                currentPlayerChoice: data.choice,
                currentPlayerId: player.id
            });
        }
    });
    
    // Обробляємо застосування бафів/дебафів
    socket.on('apply_effect', (data) => {
        // ... (Логіка бафів без змін)
    });

    // [НОВИЙ ОБРОБНИК] Для режиму тестування
    socket.on('test_trigger_event', (data) => {
        // ... (Логіка тестування без змін)
    });
    
    // Гравець покидає кімнату
    socket.on('leave_room', (data) => {
       // ... (Логіка виходу без змін)
    });
    
    // Гравець досяг перемоги
    socket.on('player_won', (data) => {
        // ... (Логіка перемоги без змін)
    });
    
    // Переміщення гравця
    socket.on('player_moved', (data) => {
        // ... (Логіка переміщення без змін)
    });
    
    // Оновлення стану гри
    socket.on('game_state_update', (data) => {
        // ... (Логіка оновлення без змін)
    });
    
    // Повідомлення в чаті
    socket.on('chat_message', (data) => {
        // ... (Логіка чату без змін)
    });
    
    // PvP квест
    socket.on('start_pvp_quest', (data) => {
        // ... (Логіка початку PvP без змін)
    });
    
    // Творчий квест
    socket.on('start_creative_quest', (data) => {
        // ... (Логіка початку творчого без змін)
    });
    
    // Голосування в творчому квесті
    socket.on('creative_quest_vote', (data) => {
         // ... (Логіка голосування без змін)
    });
    
    // Завершення гри
    socket.on('game_ended', (data) => {
         // ... (Логіка кінця гри без змін)
    });

    
    // Обробляємо результат PvP гри на швидкість введення тексту
    socket.on('timed_text_quest_result', (data) => {
        console.log('Отримано результат PvP гри:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.timedTextQuestState) return;

        const text = data.text || "";
        const wordsCount = text.split(',').filter(word => word.trim().length > 0).length;

        room.timedTextQuestState.results[player.id] = {
            wordsCount: wordsCount,
            playerName: player.name
        };

        const allResultsReceived = room.timedTextQuestState.players.every(playerId => 
            room.timedTextQuestState.results[playerId]
        );

        if (allResultsReceived) {
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
            
            if (winner) {
                const winnerPlayer = room.gameData.players.find(p => p.id === winner);
                if (winnerPlayer) {
                    winnerPlayer.points += 10; 
                }
            } else {
                room.timedTextQuestState.players.forEach(playerId => {
                    const playerInRoom = room.gameData.players.find(p => p.id === playerId);
                    if (playerInRoom) {
                        playerInRoom.points += 10;
                    }
                });
            }
            
            io.to(room.id).emit('game_state_update', room.gameData);

            io.to(room.id).emit('timed_text_quest_end', {
                winner: winner,
                results: results,
                resultMessage: resultMessage,
                gameState: room.timedTextQuestState
            });

            room.timedTextQuestState = null;
            
            passTurnToNextPlayer(room);
        }
    });

    // Обробляємо відповідь в спільній історії
    socket.on('collaborative_story_sentence', (data) => {
        // ... (Логіка речень без змін)
    });

    // Обробляємо пропуск ходу в спільній історії
    socket.on('collaborative_story_skip', (data) => {
        console.log('Гравець пропустив хід в спільній історії:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.collaborativeStoryState) return;

        room.collaborativeStoryState.eliminatedPlayers.push(player.id);
        room.collaborativeStoryState.players = room.collaborativeStoryState.players.filter(p => p.id !== player.id);

        if (room.collaborativeStoryState.players.length <= 1) {
            const winner = room.collaborativeStoryState.players[0];
            io.to(room.id).emit('collaborative_story_end', {
                winner: winner,
                story: room.collaborativeStoryState.story,
                resultMessage: `Вітаю, ${winner.name} здобув перемогу!`
            });
            room.collaborativeStoryState = null;
            passTurnToNextPlayer(room); // ВИПРАВЛЕННЯ: Передача ходу після завершення
        } else {
            room.collaborativeStoryState.currentPlayerIndex = 
                (room.collaborativeStoryState.currentPlayerIndex + 1) % room.collaborativeStoryState.players.length;

            const nextPlayer = room.collaborativeStoryState.players[room.collaborativeStoryState.currentPlayerIndex];

            io.to(room.id).emit('collaborative_story_update', {
                gameState: room.collaborativeStoryState,
                currentPlayer: nextPlayer
            });
        }
    });

    // Обробляємо творче завдання
    socket.on('creative_task_submission', (data) => {
        // ... (Логіка без змін)
    });

    // Обробляємо відправку творчої роботи
    socket.on('submit_creative_entry', (data) => {
        // ... (Логіка без змін)
    });

    // Обробляємо голосування в творчій грі
    socket.on('creative_vote', (data) => {
        console.log('🗳️ Отримано голос:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.creativeWritingState) return;

        const submission = room.creativeWritingState.submissions[data.submissionIndex];
        if (submission && submission.playerId === player.id) return;

        room.creativeWritingState.votes[player.id] = data.submissionIndex;

        const totalPlayers = room.gameData.players.filter(p => !p.hasLost).length;
        const votesCount = Object.keys(room.creativeWritingState.votes).length;

        if (votesCount === totalPlayers) {
            const voteCounts = {};
            Object.values(room.creativeWritingState.votes).forEach(index => {
                voteCounts[index] = (voteCounts[index] || 0) + 1;
            });

            let winnerIndex = 0;
            let maxVotes = 0;
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
            
            let resultMessage;
            if (isTie) {
                resultMessage = 'Перемогла дружба! Кожному по 20 очок!';
                room.gameData.players.forEach(player => {
                    player.points += 20;
                });
            } else {
                resultMessage = `Переможець: ${winner.playerName}!`;
                const winnerPlayer = room.gameData.players.find(p => p.id === winner.playerId);
                if (winnerPlayer) {
                    winnerPlayer.points += 20;
                }
            }
            
            io.to(room.id).emit('creative_voting_end', {
                winner: winner,
                voteCounts: voteCounts,
                resultMessage: resultMessage,
                isTie: isTie
            });

            io.to(room.id).emit('game_state_update', room.gameData);

            room.creativeWritingState = null;
            
            passTurnToNextPlayer(room); // ВИПРАВЛЕННЯ: Передача ходу після завершення голосування
        }
    });

    // Обробляємо відповідь в грі "Хто, де, коли?"
    socket.on('mad_libs_answer', (data) => {
        console.log('Отримано відповідь для "Хто, де, коли?":', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.madLibsState) return;

        room.madLibsState.answers.push({
            answer: data.answer,
            questionIndex: room.madLibsState.currentQuestionIndex
        });

        room.madLibsState.currentQuestionIndex++;
        
        if (room.madLibsState.currentQuestionIndex < room.madLibsState.questions.length) {
            if (room.madLibsState.currentQuestionIndex === 1) {
                // НЕ змінюємо currentPlayerIndex
            } else {
                room.madLibsState.currentPlayerIndex = 
                    (room.madLibsState.currentPlayerIndex + 1) % room.madLibsState.players.length;
            }
            
            const nextPlayer = room.madLibsState.players[room.madLibsState.currentPlayerIndex];
            const nextQuestion = room.madLibsState.questions[room.madLibsState.currentQuestionIndex];
            
            io.to(nextPlayer.id).emit('mad_libs_question', {
                question: nextQuestion,
                questionIndex: room.madLibsState.currentQuestionIndex,
                playerIndex: room.madLibsState.currentPlayerIndex,
                gameState: room.madLibsState,
                activePlayerId: nextPlayer.id
            });
            
            room.madLibsState.players.forEach((player, index) => {
                if (index !== room.madLibsState.currentPlayerIndex) {
                    io.to(player.id).emit('mad_libs_waiting', {
                        currentPlayer: nextPlayer,
                        question: nextQuestion,
                        questionIndex: room.madLibsState.currentQuestionIndex
                    });
                }
            });
        } else {
            const sortedAnswers = room.madLibsState.answers.sort((a, b) => a.questionIndex - b.questionIndex);
            const uniqueAnswers = [];
            const seenIndexes = new Set();
            sortedAnswers.forEach(answer => {
                if (!seenIndexes.has(answer.questionIndex)) {
                    seenIndexes.add(answer.questionIndex);
                    uniqueAnswers.push(answer);
                }
            });
            
            const story = uniqueAnswers.map((answer, index) => {
                    if (index === 1) return answer.answer + ',';
                    else if (index === 4) return answer.answer + ' і все скінчилось';
                    return answer.answer;
                }).join(' ');

            const rewardPoints = 20;
            room.madLibsState.players.forEach(p => {
                const gp = room.gameData.players.find(x => x.id === p.id);
                if (gp) gp.points += rewardPoints;
            });

            io.to(room.id).emit('mad_libs_result', {
                story: story,
                answers: room.madLibsState.answers,
                rewardPoints
            });

            io.to(room.id).emit('game_state_update', room.gameData);

            room.madLibsState = null;
            passTurnToNextPlayer(room); // ВИПРАВЛЕННЯ: Передача ходу після завершення гри
        }
    });

    // Обробляємо вибір в вебновели
    socket.on('webnovella_choice', (data) => {
        console.log('Отримано вибір для вебновели:', data);
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(data.roomId);
        if (!room || !room.webNovellaState) return;

        const currentEvent = webNovella[room.webNovellaState.currentEvent];
        const choice = currentEvent.choices[data.choiceIndex];
        
        if (choice.target) {
            room.webNovellaState.currentEvent = choice.target;
            const nextEvent = webNovella[choice.target];
            
            if (nextEvent.consequence) {
                room.webNovellaState.currentEvent = nextEvent.consequence;
                const consequenceEvent = webNovella[nextEvent.consequence];
                io.to(player.id).emit('webnovella_event', {
                    event: consequenceEvent,
                    gameState: room.webNovellaState,
                    activePlayerId: player.id
                });
            } else {
                io.to(player.id).emit('webnovella_event', {
                    event: nextEvent,
                    gameState: room.webNovellaState,
                    activePlayerId: player.id
                });
            }
        } else {
            io.to(player.id).emit('webnovella_end', {
                finalEvent: currentEvent,
                resultMessage: `Історія завершена! Отримано ${currentEvent.points || 0} ОО.`
            });
            
            const gamePlayer = room.gameData.players.find(p => p.id === player.id);
            if (gamePlayer) {
                gamePlayer.points += (currentEvent.points || 0);
            }
            
            room.webNovellaState = null;
            passTurnToNextPlayer(room); // ВИПРАВЛЕННЯ: Передача ходу після завершення новели
        }
    });
    
    // Обмін місцями, реконнект та інше без змін...
    // ...
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Сервер запущено на ${HOST}:${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Socket.IO підключено`);
});

server.on('error', (error) => {
    console.error('❌ Помилка сервера:', error);
});

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
