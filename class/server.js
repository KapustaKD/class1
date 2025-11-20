const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Функція для передачі ходу наступному гравцю
function passTurnToNextPlayer(room) {
    // Переходимо до наступного гравця
    console.log('Старий currentPlayerIndex:', room.gameData.currentPlayerIndex);
    
    // ВАЖЛИВО: Очищаємо currentEventPlayerId перед передачею ходу
    room.currentEventPlayerId = null;
    room.currentEventData = null;
    
    // Визначаємо початок кола, якщо ще не визначено
    if (room.roundStartPlayerIndex === undefined) {
        room.roundStartPlayerIndex = room.gameData.currentPlayerIndex;
        // Ініціалізуємо лічильник використань бафів
        room.playersBuffUsedThisRound = {};
    }
    
    // ВАЖЛИВО: Перевірка на подвійний/потрійний хід
    // Зберігаємо історію ходів для перевірки
    if (!room.turnHistory) room.turnHistory = [];
    const lastThreeTurns = room.turnHistory.slice(-2); // Останні 2 ходи (разом з поточним буде 3)
    const currentPlayerId = room.gameData.players[room.gameData.currentPlayerIndex]?.id;
    
    // Перевіряємо, чи поточний гравець ходив останні 2 рази
    if (lastThreeTurns.length >= 2 && lastThreeTurns.every(turn => turn === currentPlayerId)) {
        console.warn(`⚠️ Гравець ${currentPlayerId} намагається ходити третій раз підряд! Пропускаємо його.`);
        // Пропускаємо цього гравця і переходимо до наступного
        room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.gameData.players.length;
        room.currentPlayerIndex = room.gameData.currentPlayerIndex;
    }
    
    let nextPlayerFound = false;
    let nextPlayer = null; // ВИПРАВЛЕННЯ: Оголошуємо змінну тут, щоб вона була доступна після циклу
    
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
        
        // ВИПРАВЛЕННЯ: Присвоюємо значення вже оголошеній змінній (без const)
        nextPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        
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
            
            // Системні повідомлення не відправляємо в чат (тільки повідомлення гравців)
            
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
        
        // Додаємо хід в історію
        if (!room.turnHistory) room.turnHistory = [];
        room.turnHistory.push(nextPlayer.id);
        // Обмежуємо історію останніми 10 ходами
        if (room.turnHistory.length > 10) {
            room.turnHistory = room.turnHistory.slice(-10);
        }
        
        io.to(room.id).emit('turn_update', {
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            currentPlayerId: nextPlayer.id,
            currentPlayerName: nextPlayer.name
        });
    }
    
    // Тепер nextPlayer доступний тут, і помилки ReferenceError не буде
    if (nextPlayer) {
        console.log('Відправлено подію turn_update всім гравцям:', {
            currentPlayerIndex: room.gameData.currentPlayerIndex,
            currentPlayerId: nextPlayer.id,
            currentPlayerName: nextPlayer.name
        });
    }
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

    // Системні повідомлення не відправляємо в чат (тільки повідомлення гравців)
    
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

// Налаштування Socket.IO
const io = socketIo(server, {
    cors: {
        // Дозволяємо підключення з будь-якого джерела для уникнення проблем з CORS
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    // Налаштування транспорту для стабільності
    transports: ['websocket', 'polling'], // Сервер підтримує обидва, але клієнт обере websocket
    pingTimeout: 60000, // Збільшуємо таймаут, щоб не розривати з'єднання при затримках
    pingInterval: 25000
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
    // Внутрішній keep-alive через HTTP запити до себе
    const keepAliveInterval = setInterval(() => {
        const http = require('http');
        const options = {
            hostname: process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost',
            port: process.env.PORT || 3000,
            path: '/ping',
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            console.log('💓 Keep-alive: сервер активний', new Date().toISOString(), 'Status:', res.statusCode);
        });
        
        req.on('error', (err) => {
            console.log('⚠️ Keep-alive помилка (це нормально на локальному сервері):', err.message);
        });
        
        req.on('timeout', () => {
            req.destroy();
        });
        
        req.end();
    }, 5 * 60 * 1000); // Кожні 5 хвилин (Render закриває сервер після 15 хв неактивності)
    
    // Також логуємо кожні 10 хвилин для моніторингу
    setInterval(() => {
        console.log('💓 Keep-alive: сервер активний', new Date().toISOString());
    }, 10 * 60 * 1000);
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
                socket.emit('room_code_taken', { 
                    message: 'Цей код кімнати вже використовується. Будь ласка, придумайте інший код.',
                    code: data.customRoomCode
                });
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
        
        // Заборонені клітинки, на які гравець не може потрапити
        const FORBIDDEN_CELLS = [5, 14, 26, 46, 80];
        const oldPosition = currentPlayer.position;
        
        // Функція для обчислення фінальної позиції з урахуванням модифікаторів
        const calculateFinalPosition = (diceRoll) => {
            let tempMoveModifier = 0;
            
            // Перераховуємо модифікатори ефектів для нового roll
            if (currentPlayer.effects) {
                if (currentPlayer.effects.hateClone && currentPlayer.effects.hateClone > 0) {
                    tempMoveModifier = -Math.ceil(diceRoll / 2);
                } else if (currentPlayer.effects.happinessCharm && currentPlayer.effects.happinessCharm > 0) {
                    tempMoveModifier = diceRoll;
                }
            }
            
            let tempMove = diceRoll + tempMoveModifier;
            tempMove = Math.max(1, tempMove);
            
            if (currentPlayer.class) {
                tempMove += currentPlayer.class.moveModifier;
                if (currentPlayer.class.id === 'peasant') {
                    tempMove = Math.max(1, tempMove);
                }
            }
            
            // Перевіряємо межі епох
            const EPOCH_BOUNDARIES = [12, 22, 42, 75, 97, 101];
            let tempFinalPosition = oldPosition;
            let tempStopMove = false;
            
            for (let i = 1; i <= tempMove; i++) {
                const nextStep = oldPosition + i;
                if (EPOCH_BOUNDARIES.includes(nextStep)) {
                    if (nextStep !== 101) {
                        tempFinalPosition = nextStep;
                        tempStopMove = true;
                        break;
                    }
                }
            }
            
            if (!tempStopMove) {
                tempFinalPosition = Math.min(oldPosition + tempMove, 101);
            }
            
            return tempFinalPosition;
        };
        
        // Перевіряємо, чи поточна комбінація приведе до забороненої клітинки
        let adjustedRoll = roll;
        let finalPosition = calculateFinalPosition(adjustedRoll);
        
        // Якщо фінальна позиція - заборонена клітинка, шукаємо альтернативний roll
        if (FORBIDDEN_CELLS.includes(finalPosition)) {
            console.log(`⚠️ Гравець ${currentPlayer.name} на позиції ${oldPosition} з roll ${roll} потрапить на заборонену клітинку ${finalPosition}, шукаємо альтернативу...`);
            
            // Перевіряємо всі можливі значення кубика (1-6)
            let foundAlternative = false;
            for (let altRoll = 1; altRoll <= 6; altRoll++) {
                if (altRoll === roll) continue; // Пропускаємо поточний roll
                
                const altFinalPosition = calculateFinalPosition(altRoll);
                if (!FORBIDDEN_CELLS.includes(altFinalPosition)) {
                    adjustedRoll = altRoll;
                    finalPosition = altFinalPosition;
                    foundAlternative = true;
                    console.log(`✅ Знайдено альтернативний roll: ${altRoll}, фінальна позиція: ${finalPosition}`);
                    break;
                }
            }
            
            // Якщо всі можливі roll приведуть до забороненої клітинки, пропускаємо клітинку
            if (!foundAlternative) {
                console.log(`⚠️ Всі можливі roll приведуть до забороненої клітинки, пропускаємо клітинку ${finalPosition}`);
                // Переміщуємо на наступну клітинку після забороненої
                if (FORBIDDEN_CELLS.includes(finalPosition)) {
                    finalPosition = finalPosition + 1;
                }
            }
        }
        
        // Перераховуємо модифікатори з урахуванням скоригованого roll
        let moveModifier = 0;
        let effectApplied = null;
        
        if (currentPlayer.effects) {
            if (currentPlayer.effects.hateClone && currentPlayer.effects.hateClone > 0) {
                moveModifier = -Math.ceil(adjustedRoll / 2);
                currentPlayer.effects.hateClone--;
                effectApplied = 'hateClone';
                if (currentPlayer.effects.hateClone <= 0) delete currentPlayer.effects.hateClone;
            } else if (currentPlayer.effects.happinessCharm && currentPlayer.effects.happinessCharm > 0) {
                moveModifier = adjustedRoll;
                currentPlayer.effects.happinessCharm--;
                effectApplied = 'happinessCharm';
                if (currentPlayer.effects.happinessCharm <= 0) delete currentPlayer.effects.happinessCharm;
            }
        }
        
        let move = adjustedRoll + moveModifier;
        // Гарантуємо мінімальний хід 1 (якщо це не пропуск ходу через інший ефект)
        move = Math.max(1, move);
        
        if (currentPlayer.class) {
            move += currentPlayer.class.moveModifier;
            if (currentPlayer.class.id === 'peasant') {
                move = Math.max(1, move);
            }
        }
        
        console.log(`Кубик: ${roll} -> ${adjustedRoll} (скориговано), Клас: ${currentPlayer.class ? currentPlayer.class.moveModifier : 0}, Ефект: ${moveModifier} (${effectApplied || 'немає'}), Фінальний хід: ${move}, Фінальна позиція: ${finalPosition}`);
        
        const EPOCH_BOUNDARIES = [12, 22, 42, 75, 97, 101];
        let stopMove = false;
        
        // Перевіряємо межі епох з урахуванням скоригованого руху
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
            // Перевіряємо, чи не потрапили на заборонену клітинку через межу епохи
            if (FORBIDDEN_CELLS.includes(finalPosition)) {
                finalPosition = finalPosition + 1;
            }
            currentPlayer.position = finalPosition;
        } else {
            // Якщо фінальна позиція все ще заборонена (через пропуск), переміщуємо далі
            if (FORBIDDEN_CELLS.includes(finalPosition)) {
                finalPosition = finalPosition + 1;
            }
            finalPosition = Math.min(Math.max(finalPosition, oldPosition + 1), 101);
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
            roll: adjustedRoll, // Відправляємо скоригований roll
            originalRoll: roll, // Зберігаємо оригінальний roll для інформації
            move,
            oldPosition: oldPosition,
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
                    currentPlayer: player.id,
                    timer: selectedGame.timer,
                    startTime: Date.now()
                };
                
                // Запускаємо таймер для автоматичного завершення гри
                room.tictactoeTimer = setTimeout(() => {
                    if (room.tictactoeState && room.tictactoeState.gameActive) {
                        room.tictactoeState.gameActive = false;
                        // Визначаємо переможця за поточними рахунками
                        const player1Score = room.tictactoeState.scores[player.id] || 0;
                        const player2Score = room.tictactoeState.scores[opponent.id] || 0;
                        let winnerId = null;
                        if (player1Score > player2Score) {
                            winnerId = player.id;
                        } else if (player2Score > player1Score) {
                            winnerId = opponent.id;
                        }
                        
                        if (winnerId) {
                            const winnerPlayer = room.gameData.players.find(p => p.id === winnerId);
                            if (winnerPlayer) winnerPlayer.points += 30;
                        } else {
                            // Нічия - даємо по 10 очок обом
                            room.tictactoeState.players.forEach(pid => {
                                const p = room.gameData.players.find(pl => pl.id === pid);
                                if(p) p.points += 10;
                            });
                        }
                        
                        io.to(room.id).emit('game_state_update', room.gameData);
                        io.to(room.id).emit('tic_tac_toe_timeout', {
                            gameState: room.tictactoeState,
                            winner: winnerId
                        });
                        passTurnToNextPlayer(room);
                    }
                }, selectedGame.timer * 1000);
                
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
                    currentPlayer: player.id,
                    timer: selectedGame.timer,
                    startTime: Date.now()
                };
                
                // Запускаємо таймер для автоматичного завершення гри
                room.rpsTimer = setTimeout(() => {
                    if (room.rockPaperScissorsState && room.rockPaperScissorsState.gameActive) {
                        room.rockPaperScissorsState.gameActive = false;
                        // Визначаємо переможця за поточними рахунками
                        const player1Score = room.rockPaperScissorsState.scores[player.id] || 0;
                        const player2Score = room.rockPaperScissorsState.scores[opponent.id] || 0;
                        let winnerId = null;
                        if (player1Score > player2Score) {
                            winnerId = player.id;
                        } else if (player2Score > player1Score) {
                            winnerId = opponent.id;
                        }
                        
                        if (winnerId) {
                            const winnerPlayer = room.gameData.players.find(p => p.id === winnerId);
                            if (winnerPlayer) winnerPlayer.points += 30;
                        } else {
                            // Нічия - даємо по 10 очок обом
                            room.rockPaperScissorsState.players.forEach(pid => {
                                const p = room.gameData.players.find(pl => pl.id === pid);
                                if(p) p.points += 10;
                            });
                        }
                        
                        io.to(room.id).emit('game_state_update', room.gameData);
                        io.to(room.id).emit('rps_timeout', {
                            gameState: room.rockPaperScissorsState,
                            winner: winnerId
                        });
                        passTurnToNextPlayer(room);
                    }
                }, selectedGame.timer * 1000);
                
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
            
            // Системні повідомлення не відправляємо в чат (тільки повідомлення гравців)
            
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
            // ВАЖЛИВО: Очищаємо currentEventPlayerId перед передачею ходу
            room.currentEventPlayerId = null;
            room.currentEventData = null;
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
            // ВАЖЛИВО: Передача ходу після реінкарнації
            shouldContinue = true;
        } else if (data.eventType === 'alternative-path') {
            if (data.choice === 'yes') {
                if (player.points < data.eventData.cost) {
                    socket.emit('error_message', 'Вам не вистачає очок!');
                    return;
                }
                const roomPlayer = room.gameData.players.find(p => p.id === player.id);
                
                if (Math.random() < 0.5) {
                    if (roomPlayer) {
                        // Жорстко визначаємо target на основі поточної позиції гравця
                        let targetPosition = data.eventData.target;
                        const currentPosition = roomPlayer.position;
                        
                        // Обхідний шлях 5-11 (копія логіки з 46-57)
                        if (currentPosition === 5) {
                            targetPosition = 11;
                            if (roomPlayer) {
                                roomPlayer.position = targetPosition;
                                roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                                player.position = targetPosition;
                                player.points = Math.max(0, player.points - data.eventData.cost);
                                // Оновлюємо позицію фішки на клієнті
                                io.to(room.id).emit('player_moved', {
                                    playerId: player.id,
                                    newPosition: targetPosition,
                                    position: targetPosition,
                                    newPoints: roomPlayer.points
                                });
                                console.log(`Гравець ${player.name} переміщено з клітинки ${currentPosition} на клітинку ${targetPosition} через альтернативний шлях`);
                                resultMessage = `${player.name} успішно скоротив шлях! Переміщено на клітинку ${targetPosition}, втрачено ${data.eventData.cost} ОО.`;
                            }
                        } else {
                            // Fallback logic - жорстко встановлюємо target для конкретних клітинок
                            if (currentPosition === 14) targetPosition = 18;
                            else if (currentPosition === 26) targetPosition = 33;
                            else if (currentPosition === 46) targetPosition = 57;
                            else if (currentPosition === 80) targetPosition = 91;
                            // Якщо target не встановлено, використовуємо з eventData
                            else if (!targetPosition && data.eventData.target) {
                                targetPosition = data.eventData.target;
                            }
                            
                            // Якщо все ще немає target, беремо з specialCells
                            if (!targetPosition) {
                                const specialCells = require('./specialCells.js');
                                const cellData = specialCells[currentPosition];
                                if (cellData && cellData.target) {
                                    targetPosition = cellData.target;
                                }
                            }
                            
                            if (targetPosition) {
                                roomPlayer.position = targetPosition;
                                roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                                player.position = targetPosition;
                                player.points = Math.max(0, player.points - data.eventData.cost);
                                // Оновлюємо позицію фішки на клієнті
                                io.to(room.id).emit('player_moved', {
                                    playerId: player.id,
                                    newPosition: targetPosition,
                                    position: targetPosition,
                                    newPoints: roomPlayer.points
                                });
                                console.log(`Гравець ${player.name} переміщено з клітинки ${currentPosition} на клітинку ${targetPosition} через альтернативний шлях`);
                                resultMessage = `${player.name} успішно скоротив шлях! Переміщено на клітинку ${targetPosition}, втрачено ${data.eventData.cost} ОО.`;
                            } else {
                                console.error(`Не вдалося визначити target для альтернативного шляху на клітинці ${currentPosition}`);
                                resultMessage = `${player.name} не вдалося скористатися обхідною дорогою. ОО не списано.`;
                            }
                        }
                    }
                } else {
                    if (roomPlayer) {
                        roomPlayer.points = Math.max(0, roomPlayer.points - data.eventData.cost);
                        player.points = Math.max(0, player.points - data.eventData.cost);
                        roomPlayer.skipTurn = true; 
                    }
                    resultMessage = `🍄 ${player.name}, ваша жага до ефективного навчання привела Вас до рехабу! Психотропні речовини виявилися не такими безпечними, як здавалося. Втрачено ${data.eventData.cost} ОО. Наступного разу будьте обережніші! Пропускаєте 1 хід.`;
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
                    roomPlayer.position = 101;
                    player.position = 101;
                    io.to(room.id).emit('player_moved', { playerId: roomPlayer.id, position: 101 });
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
        
        // ВАЖЛИВО: Очищаємо currentEventPlayerId перед передачею ходу
        room.currentEventPlayerId = null;
        room.currentEventData = null;
        
        const roomPlayer = room.gameData.players.find(p => p.id === player.id);
        io.to(room.id).emit('event_result', {
            playerId: player.id,
            playerName: player.name,
            choice: data.choice,
            eventType: data.eventType, // Додаємо eventType для правильного закриття модальних вікон
            resultMessage,
            newPosition: roomPlayer ? roomPlayer.position : player.position,
            newPoints: roomPlayer ? roomPlayer.points : player.points
        });
        
        // Для alternative-path не додаємо системне повідомлення в чат
        // (тільки повідомлення гравців будуть в чаті)
        
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
        
        // Системні повідомлення не відправляємо в чат (тільки повідомлення гравців)
        
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
                // Очищаємо таймер, якщо він існує
                if (room.tictactoeTimer) {
                    clearTimeout(room.tictactoeTimer);
                    room.tictactoeTimer = null;
                }
                // ВИПРАВЛЕННЯ: Нараховуємо очки переможцю і передаємо хід
                const winnerPlayer = room.gameData.players.find(p => p.id === winner);
                if (winnerPlayer) winnerPlayer.points += 30;
                io.to(room.id).emit('game_state_update', room.gameData);
                passTurnToNextPlayer(room);
            } else {
                gameState.currentRound = currentRound + 1;
                if (!gameState.rounds[gameState.currentRound]) gameState.rounds[gameState.currentRound] = {board: Array(9).fill(null), winner: null, currentPlayer: null};
                gameState.gameState = Array(9).fill(null);
                // ВАЖЛИВО: Встановлюємо початкового гравця для нового раунду
                gameState.currentPlayer = gameState.players[0];
                gameState.rounds[gameState.currentRound].currentPlayer = gameState.currentPlayer;
                // Відправляємо оновлення стану для нового раунду
                io.to(room.id).emit('tic_tac_toe_move_update', {
                    gameState: room.tictactoeState,
                    winner: null,
                    currentRound: gameState.currentRound,
                    newRound: true
                });
            }
        } else if (!roundBoard.includes(null)) {
            gameState.rounds[currentRound].winner = null;
            gameState.currentRound = currentRound + 1;
            if (gameState.currentRound >= 3) {
                gameState.gameActive = false;
                // Очищаємо таймер, якщо він існує
                if (room.tictactoeTimer) {
                    clearTimeout(room.tictactoeTimer);
                    room.tictactoeTimer = null;
                }
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
                // ВАЖЛИВО: Встановлюємо початкового гравця для нового раунду
                gameState.currentPlayer = gameState.players[0];
                gameState.rounds[gameState.currentRound].currentPlayer = gameState.currentPlayer;
                // Відправляємо оновлення стану для нового раунду
                io.to(room.id).emit('tic_tac_toe_move_update', {
                    gameState: room.tictactoeState,
                    winner: null,
                    currentRound: gameState.currentRound,
                    newRound: true
                });
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
                // Очищаємо таймер, якщо він існує
                if (room.rpsTimer) {
                    clearTimeout(room.rpsTimer);
                    room.rpsTimer = null;
                }
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
    
    // Обробляємо застосування бафів/дебафів (ВИПРАВЛЕНО)
    socket.on('apply_effect', (data) => {
        console.log('Отримано застосування бафа/дебафа:', data);
        const player = players.get(socket.id);
        if (!player) {
            console.log('Гравець не знайдений');
            socket.emit('effect_error', { message: 'Помилка: гравець не знайдений' });
            return;
        }
        
        const room = rooms.get(data.roomId);
        if (!room || room.gameState !== 'playing') {
            console.log('Кімната не знайдена або гра не активна');
            socket.emit('effect_error', { message: 'Гра не активна або кімната не знайдена' });
            return;
        }
        
        // Знаходимо гравця в кімнаті
        const caster = room.gameData.players.find(p => p.id === player.id);
        if (!caster) {
            console.log('Гравець не знайдений в кімнаті');
            socket.emit('effect_error', { message: 'Вас не знайдено в кімнаті' });
            return;
        }
        
        // Перевірка, чи це хід гравця
        const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        if (currentPlayer.id !== caster.id) {
            console.log('Не хід цього гравця');
            socket.emit('effect_error', { message: 'Зараз не ваш хід! Бафи можна використовувати лише у свій хід.' });
            return;
        }
        
        // Перевірка, чи гравець вже використав баф у цьому колі
        if (!room.playersBuffUsedThisRound) {
            room.playersBuffUsedThisRound = {};
        }
        if (room.playersBuffUsedThisRound[caster.id]) {
            console.log('Гравець вже використав баф у цьому колі');
            io.to(socket.id).emit('effect_error', {
                message: 'Ви вже використали баф/дебаф у цьому колі. Зачекайте до наступного кола.'
            });
            return;
        }
        
        // Визначаємо вартість та ціль ефекту
        let cost = 0;
        let targetPlayer = null;
        
        if (data.effectType === 'hateClone') {
            cost = 100;
            if (!data.targetPlayerId) {
                socket.emit('effect_error', { message: 'Оберіть ціль!' });
                return;
            }
            targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId);
        } else if (data.effectType === 'happinessCharm') {
            cost = 100;
            targetPlayer = caster;
        } else if (data.effectType === 'procrastination') {
            cost = 50;
            if (!data.targetPlayerId) {
                socket.emit('effect_error', { message: 'Оберіть ціль!' });
                return;
            }
            targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId);
        } else if (data.effectType === 'pushBack') {
            cost = 50;
            if (!data.targetPlayerId) {
                socket.emit('effect_error', { message: 'Оберіть ціль!' });
                return;
            }
            targetPlayer = room.gameData.players.find(p => p.id === data.targetPlayerId);
        } else if (data.effectType === 'boostForward') {
            cost = 50;
            targetPlayer = caster;
        }
        
        if (!targetPlayer) {
            console.log('Ціль не знайдена');
            socket.emit('effect_error', { message: 'Цільовий гравець не знайдений або вийшов з гри.' });
            return;
        }
        
        // Перевірка достатності ОО
        if ((caster.points || 0) < cost) {
            console.log('Недостатньо ОО');
            socket.emit('effect_error', { message: `Недостатньо очок! Потрібно ${cost}, у вас ${caster.points || 0}.` });
            return;
        }
        
        // Списуємо ОО
        caster.points -= cost;
        
        // Відмічаємо, що гравець використав баф у цьому колі
        room.playersBuffUsedThisRound[caster.id] = true;
        
        let moveAmount = 0;
        let targetNewPosition = targetPlayer.position;
        
        // Застосовуємо ефект
        if (data.effectType === 'hateClone') {
            // Ініціалізуємо effects, якщо їх немає
            if (!targetPlayer.effects) {
                targetPlayer.effects = {};
            }
            // Збільшуємо лічильник на 3 (3 ходи)
            targetPlayer.effects.hateClone = (targetPlayer.effects.hateClone || 0) + 3;
        } else if (data.effectType === 'happinessCharm') {
            if (!targetPlayer.effects) {
                targetPlayer.effects = {};
            }
            targetPlayer.effects.happinessCharm = (targetPlayer.effects.happinessCharm || 0) + 3;
        } else if (data.effectType === 'procrastination') {
            if (!targetPlayer.effects) {
                targetPlayer.effects = {};
            }
            targetPlayer.effects.skipTurn = (targetPlayer.effects.skipTurn || 0) + 1;
        } else if (data.effectType === 'pushBack') {
            // Відкидаємо гравця назад
            moveAmount = Math.floor(Math.random() * 6) + 10; // 10-15 клітинок
            targetNewPosition = Math.max(0, targetPlayer.position - moveAmount);
            targetPlayer.position = targetNewPosition;
        } else if (data.effectType === 'boostForward') {
            // Переміщуємо гравця вперед
            moveAmount = Math.floor(Math.random() * 6) + 10; // 10-15 клітинок
            targetNewPosition = Math.min(101, caster.position + moveAmount);
            caster.position = targetNewPosition;
            
            // Перевірка перемоги після стрибка
            if (caster.position >= 101) {
                caster.hasWon = true;
                room.gameState = 'finished';
                io.to(room.id).emit('game_ended', { 
                    winner: caster, 
                    reason: `${caster.name} переміг за допомогою стрибка у майбутнє!` 
                });
                
                // Відправляємо сповіщення
                io.to(room.id).emit('effect_applied', {
                    casterId: caster.id,
                    casterName: caster.name,
                    targetId: targetPlayer.id,
                    targetName: targetPlayer.name,
                    effectType: data.effectType,
                    targetNewPosition: targetNewPosition,
                    moveAmount: moveAmount
                });
                
                // Оновлюємо стан гри
                io.to(room.id).emit('game_state_update', room.gameData);
                return;
            }
        }
        
        console.log(`Ефект ${data.effectType} застосовано. Відправляємо сповіщення.`);
        
        // Відправляємо сповіщення
        io.to(room.id).emit('effect_applied', {
            casterId: caster.id,
            casterName: caster.name,
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            effectType: data.effectType,
            targetNewPosition: targetNewPosition,
            moveAmount: moveAmount
        });
        
        // Оновлюємо стан гри
        io.to(room.id).emit('game_state_update', room.gameData);
    });

    // [НОВИЙ ОБРОБНИК] Для режиму тестування
    socket.on('test_trigger_event', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.isHost) {
            socket.emit('error', { message: 'Тільки хост може тестувати події' });
            return;
        }
        const room = rooms.get(player.roomId);
        if (!room) return;

        const currentPlayer = room.gameData.players[room.gameData.currentPlayerIndex];
        
        // Телепортуємо поточного гравця на клітинку тесту
        currentPlayer.position = data.cellNumber;
        room.currentEventPlayerId = currentPlayer.id;
        
        // Знаходимо дані про подію
        const cellData = specialCells[data.cellNumber];
        
        if (cellData) {
            console.log(`[TEST MODE] Хост запускає подію ${cellData.type} на клітинці ${data.cellNumber}`);
            // Імітуємо потрапляння гравця на подію
            // Ми відправляємо це самому собі (серверу) через емуляцію виклику або клієнту
            // Найкраще - змусити сервер обробити це як реальну подію
            // Для цього ми можемо викликати логіку обробки події напряму або через emit
            
            // Варіант: відправляємо клієнту, щоб він ініціював player_on_event (як у реальній грі)
            // Або емулюємо тут. Давайте емулюємо вхідні дані для player_on_event:
            const eventData = { 
                roomId: room.id, 
                eventType: cellData.type, 
                eventData: { ...cellData, cellNumber: data.cellNumber },
                cellNumber: data.cellNumber
            };
            
            // Викликаємо логіку обробки події (тут ми просто емулюємо виклик через socket.emit самому собі, 
            // але оскільки це сервер, краще викликати обробник. 
            // Але для простоти, ми відправимо клієнту інструкцію запустити подію)
            
            // Оскільки ми вже перемістили гравця, оновимо стан
            io.to(room.id).emit('player_moved', { playerId: currentPlayer.id, position: data.cellNumber });
            
            // І запускаємо подію через існуючий механізм
            // Ми робимо вигляд, що клієнт надіслав 'player_on_event'
            // Для цього ми вручну викликаємо логіку, або просимо клієнта це зробити.
            // Надійніше - емулювати це на сервері, викликавши обробку:
            
            // Тимчасовий хак: відправляємо клієнту підтвердження, а він шле player_on_event
            // Або просто викликаємо player_on_event логіку тут. 
            // Давайте просто викличемо player_on_event логіку, скопіювавши виклик (через emit на себе не спрацює так просто).
            
            // Тому: відправляємо хосту сигнал, щоб він надіслав player_on_event
            socket.emit('debug_trigger_event', eventData); 
            // (Вам треба додати client-side обробник для debug_trigger_event -> socket.emit('player_on_event', data))
            // АБО, якщо ви не хочете змінювати клієнт, просто продублюйте виклик player_on_event тут:
            
             // Емуляція player_on_event
             if (['amphitheater', 'tavern', 'casino'].includes(cellData.type)) {
                const msg = handleImmediateEvent(room, currentPlayer, cellData.type);
                io.to(room.id).emit('event_result', {
                    playerId: currentPlayer.id,
                    resultMessage: msg,
                    newPoints: currentPlayer.points,
                    newPosition: currentPlayer.position,
                    eventType: cellData.type
                });
                passTurnToNextPlayer(room);
             } else if (cellData.type === 'test-question') {
                 io.to(room.id).emit('show_event_prompt', {
                    eventType: 'test-question',
                    eventData: { ...cellData, cellNumber: data.cellNumber },
                    playerId: currentPlayer.id,
                    playerName: currentPlayer.name,
                    activePlayerId: currentPlayer.id
                });
             } else {
                 // Інші складні квести - відправляємо show_event_prompt та сигнал для запуску
                 const playerOnEventData = {
                     roomId: room.id,
                     eventType: cellData.type,
                     eventData: { ...cellData, cellNumber: data.cellNumber },
                     cellNumber: data.cellNumber
                 };
                 
                 // Для alternative-path показуємо тільки активному гравцю
                 if (cellData.type === 'alternative-path') {
                     socket.emit('show_event_prompt', {
                         eventType: cellData.type,
                         eventData: { ...cellData, cellNumber: data.cellNumber },
                         playerId: currentPlayer.id,
                         playerName: currentPlayer.name,
                         activePlayerId: currentPlayer.id,
                         cellNumber: data.cellNumber
                     });
                 } else {
                     // Для інших подій відправляємо всім
                     io.to(room.id).emit('show_event_prompt', {
                         eventType: cellData.type,
                         eventData: { ...cellData, cellNumber: data.cellNumber },
                         playerId: currentPlayer.id,
                         playerName: currentPlayer.name,
                         activePlayerId: currentPlayer.id,
                         cellNumber: data.cellNumber
                     });
                 }
                 
                 // Відправляємо сигнал хосту, щоб він надіслав player_on_event
                 // Це дозволить запустити подію через стандартний механізм
                 socket.emit('force_event_start', playerOnEventData);
             }
        } else {
            socket.emit('error', { message: 'На цій клітинці немає події' });
        }
    });
    
    // Гравець покидає кімнату
    socket.on('leave_room', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            // Видаляємо гравця зі списків
            room.players = room.players.filter(p => p.id !== socket.id);
            room.gameData.players = room.gameData.players.filter(p => p.id !== socket.id);
            
            // Повідомляємо інших
            io.to(data.roomId).emit('player_left', { 
                playerId: socket.id,
                player: { name: players.get(socket.id)?.name }
            });
            
            // Якщо кімната порожня - видаляємо
            if (room.players.length === 0) {
                rooms.delete(data.roomId);
                console.log(`Кімната ${data.roomId} видалена (порожня)`);
            } else {
                // Якщо вийшов хост, передаємо права
                const wasHost = players.get(socket.id)?.isHost;
                if (wasHost && room.players.length > 0) {
                    const newHost = room.players[0];
                    const globalNewHost = players.get(newHost.id);
                    if (globalNewHost) globalNewHost.isHost = true;
                    // Системні повідомлення не відправляємо в чат (тільки повідомлення гравців)
                }
                
                // Оновлюємо стан гри (наприклад, якщо це був поточний гравець)
                if (room.gameData.gameActive) {
                    // Якщо вийшов поточний гравець, передаємо хід
                    const currentPlayerId = room.gameData.players[room.gameData.currentPlayerIndex]?.id;
                    if (currentPlayerId === socket.id) { // Це був його хід, але його вже видалили з масиву
                         // Індекс міг зсунутися, тому просто оновлюємо індекс безпечно
                         if (room.gameData.currentPlayerIndex >= room.gameData.players.length) {
                             room.gameData.currentPlayerIndex = 0;
                         }
                         // Передаємо хід новому гравцю на цьому індексі
                         passTurnToNextPlayer(room);
                    }
                    io.to(room.id).emit('game_state_update', room.gameData);
                }
            }
        }
        players.delete(socket.id);
    });
    
    // Гравець досяг перемоги
    socket.on('player_won', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const winner = room.gameData.players.find(p => p.id === data.playerId);
            if (winner) {
                winner.hasWon = true;
                // Визначаємо місце
                if (!room.gameData.finalPositions) room.gameData.finalPositions = [];
                // Перевіряємо, чи гравець вже не в списку переможців
                if (!room.gameData.finalPositions.find(p => p.id === winner.id)) {
                     winner.finalPosition = room.gameData.finalPositions.length + 1;
                     room.gameData.finalPositions.push(winner);
                }

                io.to(room.id).emit('player_eliminated', { 
                    playerId: winner.id, 
                    reason: 'Успішно завершив навчання! (Перемога)', 
                    position: winner.finalPosition 
                });
                
                // Системні повідомлення не відправляємо в чат (тільки повідомлення гравців)

                // Перевіряємо, чи залишилося більше 1 активного гравця
                const activePlayers = room.gameData.players.filter(p => !p.hasWon && !p.hasLost);
                if (activePlayers.length < 2) {
                    // Гра завершена (турнір)
                    room.gameData.gameActive = false;
                    io.to(room.id).emit('tournament_ended', { 
                        finalPositions: room.gameData.finalPositions 
                    });
                } else {
                    // Гра продовжується за 2-3 місця
                    passTurnToNextPlayer(room);
                }
            }
        }
    });
    
    // Переміщення гравця
    socket.on('player_moved', (data) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = rooms.get(playerInfo.roomId);
        if (room) {
            const p = room.gameData.players.find(pl => pl.id === socket.id);
            if (p) {
                p.position = data.position;
                // Синхронізуємо позицію з усіма
                socket.to(room.id).emit('player_moved', { 
                    playerId: socket.id, 
                    position: data.position 
                });
            }
        }
    });
    
    // Оновлення стану гри
    socket.on('game_state_update', (data) => {
        const player = players.get(socket.id);
        if (!player) return; // Тільки хост мав би це робити, але для синхронізації іноді дозволяємо клієнтам
        
        const room = rooms.get(data.roomId);
        if (room) {
            // Обережне оновлення, щоб не перезаписати важливі серверні дані
            if (data.players) room.gameData.players = data.players;
            if (typeof data.currentPlayerIndex !== 'undefined') room.gameData.currentPlayerIndex = data.currentPlayerIndex;
            
            socket.to(room.id).emit('game_state_update', room.gameData);
        }
    });
    
    // Повідомлення в чаті
    socket.on('chat_message', (data) => {
        const player = players.get(socket.id);
        io.to(data.roomId).emit('chat_message', {
            type: 'player',
            message: data.message,
            player: { 
                name: player?.name || 'Невідомий', 
                id: socket.id,
                color: player?.color
            }
        });
    });
    
    // PvP квест
    socket.on('start_pvp_quest', (data) => {
        // Повідомляємо клієнтам, що треба показати UI початку квесту
        io.to(data.roomId).emit('quest_started', {
            type: 'pvp',
            playerId: socket.id, // Хто ініціював
            title: 'PvP Битва',
            description: 'Гравець викликає на дуель! Очікування вибору суперника...'
        });
    });
    
    // Творчий квест
    socket.on('start_creative_quest', (data) => {
        io.to(data.roomId).emit('quest_started', {
            type: 'creative',
            playerId: socket.id,
            title: 'Творчий конкурс',
            description: 'Підготуйте свої клавіатури! Час творити.'
        });
    });
    
    // Голосування в творчому квесті
    socket.on('creative_quest_vote', (data) => {
        const room = rooms.get(data.roomId);
        if (room && room.creativeWritingState) {
            const player = players.get(socket.id);
            if (!player) return;
            
            // Записуємо голос (перезаписує, якщо гравець передумав)
            room.creativeWritingState.votes[socket.id] = data.submissionIndex;
            
            console.log(`[Creative] ${player.name} проголосував. Всього голосів: ${Object.keys(room.creativeWritingState.votes).length}`);

            // Перевірка чи всі АКТИВНІ гравці (ті, хто не вибув і не боти) проголосували
            // Важливо: у творчому конкурсі голосують всі, крім (опціонально) авторів, але зазвичай всі.
            // Тут перевіряємо всіх активних.
            const activePlayers = room.gameData.players.filter(p => !p.hasLost && !p.hasWon);
            const totalVotersNeeded = activePlayers.length;
            const currentVotes = Object.keys(room.creativeWritingState.votes).length;
            
            if (currentVotes >= totalVotersNeeded) {
                console.log('[Creative] Всі проголосували. Підрахунок...');
                
                // Підрахунок голосів
                const voteCounts = {};
                Object.values(room.creativeWritingState.votes).forEach(index => {
                    voteCounts[index] = (voteCounts[index] || 0) + 1;
                });
                
                // Знаходимо переможця (індекс роботи)
                let winnerIndex = -1;
                let maxVotes = -1;
                let isTie = false;
                
                for (const [indexStr, count] of Object.entries(voteCounts)) {
                    const index = parseInt(indexStr);
                    if (count > maxVotes) {
                        maxVotes = count;
                        winnerIndex = index;
                        isTie = false;
                    } else if (count === maxVotes) {
                        isTie = true;
                    }
                }
                
                let resultMessage = "";
                const submissions = room.creativeWritingState.submissions;
                
                if (isTie || winnerIndex === -1) {
                    resultMessage = "Нічия! Перемогла дружба. Всі отримують по 10 ОО.";
                    // Нараховуємо всім по 10
                     activePlayers.forEach(p => p.points += 10);
                } else {
                    const winnerSubmission = submissions[winnerIndex];
                    if (winnerSubmission) {
                        resultMessage = `Переміг ${winnerSubmission.playerName}! (+30 ОО)`;
                        const winnerPlayer = room.gameData.players.find(p => p.id === winnerSubmission.playerId);
                        if (winnerPlayer) {
                            winnerPlayer.points += 30;
                        }
                    }
                }
                
                // Оновлюємо стан гри
                io.to(room.id).emit('game_state_update', room.gameData);
                
                // Оголошуємо результати
                io.to(room.id).emit('creative_voting_end', { 
                    resultMessage: resultMessage,
                    winnerIndex: winnerIndex,
                    isTie: isTie
                });
                
                // Очищаємо стан квесту
                room.creativeWritingState = null;
                
                // КРИТИЧНО ВАЖЛИВО: ПЕРЕДАЄМО ХІД ДАЛІ
                passTurnToNextPlayer(room);
            }
        }
    });
    
    // Завершення гри (повне)
    socket.on('game_ended', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            room.gameState = 'finished';
            room.gameData.gameActive = false;
            io.to(data.roomId).emit('game_ended', {
                winner: data.winner,
                reason: data.reason || 'Гра завершена.'
            });
        }
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

    // Обробляємо творче завдання (для режиму, де пише один гравець)
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

        // Оскільки це завдання для одного гравця, одразу починаємо голосування
        console.log('🗳️ Відправляємо start_voting:', {
            submissions: room.creativeWritingState.submissions,
            gameState: room.creativeWritingState
        });
        io.to(room.id).emit('start_voting', {
            submissions: room.creativeWritingState.submissions,
            gameState: room.creativeWritingState
        });
    });

    // Обробляємо відправку творчої роботи (для режиму, де пишуть усі)
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

        // Перевіряємо, чи всі гравці (що не вибули) відправили роботи
        const activePlayersCount = room.gameData.players.filter(p => !p.hasLost && !p.hasWon).length;
        
        if (room.creativeWritingState.submissions.length >= activePlayersCount) {
            // Всі відправили, починаємо голосування
            console.log('🗳️ Всі відправили роботи, починаємо голосування');
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
            // Завжди переходимо до наступного гравця після кожної відповіді
            room.madLibsState.currentPlayerIndex = 
                (room.madLibsState.currentPlayerIndex + 1) % room.madLibsState.players.length;
            
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

            // ВАЖЛИВО: Очищаємо currentEventPlayerId перед передачею ходу
            room.currentEventPlayerId = null;
            room.currentEventData = null;
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
    
    // Обмін місцями (після PvP)
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
            
            console.log(`${currentPlayer.name} обмінявся місцями з ${targetPlayer.name}`);
            
            // Передаємо хід, оскільки дія завершена
            passTurnToNextPlayer(room);
        }
    });
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
