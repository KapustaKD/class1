// Система локальної гри з ботами
class BotGame extends EducationalPathGame {
    constructor() {
        super();
        this.bots = [];
        this.botResponses = this.initializeBotResponses();
        this.isBotTurn = false;
        this.botDelay = 1500; // Затримка між ходами ботів (1.5 секунди)
        
        // Завантажуємо specialCells.js як єдине джерело координат для клітинок
        // У браузері використовуємо глобальний об'єкт, якщо він доступний
        if (typeof window !== 'undefined' && window.specialCells) {
            this.specialCells = window.specialCells;
        } else if (typeof require !== 'undefined') {
            try {
                const specialCellsModule = require('./specialCells.js');
                this.specialCells = specialCellsModule;
            } catch (e) {
                console.warn('Не вдалося завантажити specialCells.js, використовується локальна версія:', e);
                // Fallback на локальну версію з game.js (успадковану від EducationalPathGame)
            }
        }
        
        // Стан для PvP ігор
        this.ticTacToeState = null;
        this.rpsGameState = null;
        
        // Стан для творчих квестів
        this.creativeSubmissions = [];
        this.playersExpectedToSubmit = [];
        this.creativeVotes = {};
    }

    // Ініціалізація відповідей ботів для різних завдань
    initializeBotResponses() {
        return {
            // Творчі завдання
            creative: {
                great_pedagogical: [
                    "Вчитель: 'Діти, що таке фотосинтез?' Учень: 'Це коли рослини фотографуються на сонці!'",
                    "Вчитель: 'Хто може пояснити закон тяжіння?' Учень: 'Це коли яблуко падає на голову Ньютону!'",
                    "Вчитель: 'Що таке еволюція?' Учень: 'Це коли мавпи поступово стають людьми, але деякі залишаються мавпами!'",
                    "Вчитель: 'Поясніть, що таке атом.' Учень: 'Це дуже маленька штука, яку не видно, але вона є!'",
                    "Вчитель: 'Що таке гравітація?' Учень: 'Це те, що не дає нам літати, але дозволяє падати!'"
                ],
                story_continuation: [
                    "І раптом з-за кута вискочив велетенський кролик з парасолькою...",
                    "Тоді герой зрозумів, що його ключі завжди були в кишені...",
                    "Але найцікавіше було те, що дракон виявився вегетаріанцем...",
                    "І ось тут почалася найдивніша частина пригоди...",
                    "Герой подивився в дзеркало і зрозумів, що це не він..."
                ],
                poem_creation: [
                    "Котик сірий на дивані,\nСпить і бачить сни дивні,\nМиші танцюють вальс,\nА він їх не ловить зовсім!",
                    "Дощ іде, а я вдома,\nЧитаю книгу про дракона,\nРаптом стук у двері - хто?\nМоже це мій друг прийшов?",
                    "Зірки в небі блищать,\nМісяць сріблом світить,\nА я сиджу і думаю,\nЩо завтра буде краще життя!"
                ]
            },
            // PvP завдання
            pvp: {
                rock_paper_scissors: [
                    "камінь", "папір", "ножиці"
                ],
                number_guessing: [
                    "Я думаю це число... 42!",
                    "Мабуть це 17!",
                    "Спробую 88!",
                    "Напевно це 3!",
                    "Думаю це 99!"
                ]
            },
            // Завдання "Хто, де, коли?"
            mad_libs: {
                responses: [
                    "Кіт на дереві читає книгу",
                    "Слон в бібліотеці грає в шахи",
                    "Пінгвін на пляжі смажить шашлик",
                    "Жираф в космосі танцює вальс",
                    "Крокодил в кафе п'є каву"
                ]
            },
            // Веб-новела
            webnovella: {
                responses: [
                    "Герой вирішив піти лівим шляхом",
                    "Герой обрав правий шлях",
                    "Герой залишився на місці",
                    "Герой повернувся назад",
                    "Герой пішов прямо"
                ]
            }
        };
    }

    // Початок локальної гри
    startLocalBotGame() {
        console.log('🎮 Починаємо локальну гру');
        
        // Показуємо модальне вікно вибору кількості гравців
        this.showPlayerCountModal();
    }

    // Показ модального вікна вибору кількості гравців
    showPlayerCountModal() {
        const modalContent = `
            <h2 class="text-3xl font-bold mb-4 text-center">Локальна гра</h2>
            <p class="text-center mb-6">Оберіть кількість гравців:</p>
            <div class="flex gap-4 justify-center mb-6">
                <button id="bot-2-players" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 text-xl">
                    2 гравці
                </button>
                <button id="bot-3-players" class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 text-xl">
                    3 гравці
                </button>
            </div>
            <p class="text-sm text-gray-600 text-center">Інші гравці будуть грати автоматично</p>
        `;

        this.showQuestModal('Локальна гра', modalContent, [
            { text: 'Скасувати', callback: () => this.questModal.classList.add('hidden') }
        ]);

        // Додаємо обробники подій для кнопок
        setTimeout(() => {
            document.getElementById('bot-2-players').addEventListener('click', () => {
                this.questModal.classList.add('hidden');
                this.initializeGame(2);
            });
            
            document.getElementById('bot-3-players').addEventListener('click', () => {
                this.questModal.classList.add('hidden');
                this.initializeGame(3);
            });
        }, 100);
    }

    // Ініціалізація гри з вказаною кількістю гравців
    initializeGame(playerCount) {
        console.log(`🎮 Ініціалізуємо гру з ${playerCount} гравцями`);
        
        // Створюємо гравців
        this.players = [];
        this.bots = [];
        
        // Додаємо людину-гравця
        this.players.push({
            id: 'human-player',
            name: 'Ви',
            position: 0,
            points: 0,
            class: null,
            color: this.playerColors[0],
            avatarUrl: null,
            isBot: false,
            hasWon: false,
            hasLost: false
        });

        // Додаємо інших гравців
        const playerNames = ['Алекс', 'Макс', 'Софія', 'Даніель'];
        for (let i = 1; i < playerCount; i++) {
            const bot = {
                id: `bot-${i}`,
                name: playerNames[i - 1],
                position: 0,
                points: 0,
                class: null,
                color: this.playerColors[i],
                avatarUrl: null,
                isBot: true,
                hasWon: false,
                hasLost: false
            };
            this.players.push(bot);
            this.bots.push(bot);
        }

        // Роздаємо класи випадково
        this.assignRandomClasses();
        
        // Показуємо вибір аватара перед роздачею класів
        this.showAvatarSelection();
    }

    // Роздача випадкових класів
    assignRandomClasses() {
        const shuffledClasses = [...this.playerClasses].sort(() => Math.random() - 0.5);
        
        this.players.forEach((player, index) => {
            player.class = shuffledClasses[index];
            console.log(`${player.name} отримав клас: ${player.class.name}`);
        });
    }

    // Показ вибору аватара для гравця
    showAvatarSelection() {
        const modal = document.getElementById('avatar-selection-modal');
        if (!modal) {
            console.error('Модальне вікно вибору аватара не знайдено');
            // Якщо модальне вікно не знайдено, призначаємо аватари автоматично
            this.assignAvatars();
            this.showClassAssignment();
            return;
        }

        // Оновлюємо заголовок та текст для локального режиму
        const title = modal.querySelector('h2');
        if (title) {
            title.textContent = 'Оберіть свій аватар';
        }
        
        const readyCounter = document.getElementById('ready-counter');
        if (readyCounter) {
            readyCounter.textContent = 'Боти отримають аватари автоматично';
        }

        // Показуємо модальне вікно
        modal.classList.remove('hidden');
        
        // Заповнюємо сітку аватарів
        this.populateLocalAvatarGrid();
        
        // Налаштовуємо обробники подій
        this.setupLocalAvatarEventListeners();
    }

    // Заповнення сітки аватарів для локального режиму
    populateLocalAvatarGrid() {
        const avatarGrid = document.getElementById('avatar-grid');
        if (!avatarGrid) return;
        
        avatarGrid.innerHTML = '';
        
        // Створюємо 8 аватарів
        for (let i = 1; i <= 8; i++) {
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar-item cursor-pointer p-2 rounded-lg border-2 border-gray-600 hover:border-yellow-400 transition-colors';
            avatarDiv.dataset.avatarUrl = `image/chips/avatar${i}.png`;
            
            const img = document.createElement('img');
            img.src = `image/chips/avatar${i}.png`;
            img.alt = `Аватар ${i}`;
            img.className = 'w-16 h-16 rounded-full mx-auto';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-center text-sm text-gray-300 mt-2';
            nameDiv.textContent = 'Вільний';
            
            avatarDiv.appendChild(img);
            avatarDiv.appendChild(nameDiv);
            avatarGrid.appendChild(avatarDiv);
        }
    }

    // Налаштування обробників подій для аватарів в локальному режимі
    setupLocalAvatarEventListeners() {
        const avatarItems = document.querySelectorAll('.avatar-item');
        let selectedAvatar = null;
        
        avatarItems.forEach((item) => {
            item.addEventListener('click', () => {
                const avatarUrl = item.dataset.avatarUrl;
                if (avatarUrl) {
                    // Знімаємо виділення з попереднього аватара
                    avatarItems.forEach(ai => {
                        ai.classList.remove('border-yellow-400', 'bg-yellow-400', 'bg-opacity-20');
                        ai.classList.add('border-gray-600');
                    });
                    
                    // Виділяємо вибраний аватар
                    item.classList.remove('border-gray-600');
                    item.classList.add('border-yellow-400', 'bg-yellow-400', 'bg-opacity-20');
                    
                    selectedAvatar = avatarUrl;
                }
            });
        });
        
        const readyBtn = document.getElementById('player-ready-btn');
        if (readyBtn) {
            // Видаляємо старі обробники
            readyBtn.replaceWith(readyBtn.cloneNode(true));
            const newReadyBtn = document.getElementById('player-ready-btn');
            newReadyBtn.addEventListener('click', () => {
                if (selectedAvatar) {
                    // Призначаємо аватар гравцю
                    const humanPlayer = this.players.find(p => !p.isBot);
                    if (humanPlayer) {
                        humanPlayer.avatarUrl = selectedAvatar;
                    }
                    
                    // Приховуємо модальне вікно
                    const modal = document.getElementById('avatar-selection-modal');
                    if (modal) {
                        modal.classList.add('hidden');
                    }
                    
                    // Призначаємо аватари ботам та показуємо роздачу класів
                    this.assignAvatars();
                    this.showClassAssignment();
                } else {
                    alert('Будь ласка, оберіть аватар!');
                }
            });
        }
    }

    // Призначення аватарів ботам (рандомно)
    assignAvatars() {
        // Отримуємо список доступних аватарів
        const availableAvatars = [];
        for (let i = 1; i <= 8; i++) {
            availableAvatars.push(`image/chips/avatar${i}.png`);
        }
        
        // Видаляємо аватар, який обрав гравець
        const humanPlayer = this.players.find(p => !p.isBot);
        if (humanPlayer && humanPlayer.avatarUrl) {
            const index = availableAvatars.indexOf(humanPlayer.avatarUrl);
            if (index > -1) {
                availableAvatars.splice(index, 1);
            }
        }
        
        // Перемішуємо доступні аватари
        const shuffledAvatars = [...availableAvatars].sort(() => Math.random() - 0.5);
        
        // Призначаємо аватари ботам
        this.bots.forEach((bot, index) => {
            if (index < shuffledAvatars.length) {
                bot.avatarUrl = shuffledAvatars[index];
                console.log(`🎮 Бот ${bot.name} отримав аватар: ${bot.avatarUrl}`);
            } else {
                // Якщо аватарів не вистачає, використовуємо перший доступний
                bot.avatarUrl = availableAvatars[0] || 'image/chips/avatar1.png';
            }
        });
    }

    // Показ роздачі класів
    showClassAssignment() {
        let classInfo = '<h3 class="text-2xl font-bold mb-4">Роздача класів:</h3>';
        
        this.players.forEach(player => {
            const avatarHtml = player.avatarUrl 
                ? `<img src="${player.avatarUrl}" alt="${player.name}" class="w-8 h-8 rounded-full inline-block mr-2">`
                : '';
            classInfo += `
                <div class="mb-2 p-2 bg-gray-100 rounded">
                    ${avatarHtml}
                    <strong>${player.name}:</strong> ${player.class.name} 
                    (Старт: ${player.class.startPoints} ОО, Модифікатор руху: ${player.class.moveModifier > 0 ? '+' : ''}${player.class.moveModifier})
                </div>
            `;
        });

        this.showQuestModal('Класи роздано!', classInfo, [
            { text: 'Почати гру!', callback: () => {
                this.questModal.classList.add('hidden');
                this.startBotGame();
            }}
        ]);
    }

    // Початок гри
    startBotGame() {
        console.log('🎮 Починаємо гру');
        
        // Приховуємо start-modal (вікно налаштування гри), якщо воно відкрите
        const startModal = document.getElementById('start-modal');
        if (startModal) {
            startModal.classList.add('hidden');
        }
        
        // Встановлюємо початкові очки
        this.players.forEach(player => {
            player.points = player.class.startPoints;
        });

        // Показуємо ігрове поле
        this.showGameContainer();
        
        // Створюємо ігрову дошку (як в онлайн грі)
        this.createBoard();
        
        // Встановлюємо правильний масштаб карти
        setTimeout(() => {
            if (typeof this.setInitialScale === 'function') {
                this.setInitialScale();
            }
            if (typeof this.applyTransform === 'function') {
                this.applyTransform();
            }
            console.log('Масштаб карти встановлено');
        }, 100);
        
        // Оновлюємо UI
        this.updateUI();
        
        // Встановлюємо першого гравця
        this.currentPlayerIndex = 0;
        this.gameActive = true;
        
        // Ініціалізуємо лічильник кидків кубика (якщо не ініціалізовано)
        if (typeof this.diceRollCount === 'undefined') {
            this.diceRollCount = 0;
        }
        
        // Переконаємося, що кнопка ініціалізована
        if (!this.rollDiceBtn) {
            this.rollDiceBtn = document.getElementById('roll-dice-btn');
        }
        
        // Встановлюємо стан кнопки кидання кубика
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (this.rollDiceBtn) {
            if (currentPlayer.isBot) {
                // Якщо перший хід іншого гравця, автоматично кидаємо кубик
                this.rollDiceBtn.disabled = true;
                setTimeout(() => {
                    this.handleBotTurn();
                }, 1000);
            } else {
                // Якщо перший хід людини-гравця, дозволяємо кинути кубик
                this.rollDiceBtn.disabled = false;
                console.log('✅ Кнопка кидання кубика активна для гравця');
            }
        } else {
            console.error('❌ Кнопка roll-dice-btn не знайдена!');
        }
    }

    // Обробка ходу іншого гравця
    async handleBotTurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        if (!currentPlayer.isBot || !this.gameActive) {
            return;
        }

        console.log(`🎮 Хід гравця: ${currentPlayer.name}`);
        
        // Кидаємо кубик для гравця
        await this.botRollDice();
    }

    // Кидання кубика іншим гравцем
    async botRollDice() {
        const player = this.players[this.currentPlayerIndex];
        
        console.log(`🎮 ${player.name} кидає кубик`);
        
        // Відтворюємо звук кубика
        this.playDiceSound();
        
        // Кидаємо кубик
        const roll = Math.floor(Math.random() * 6) + 1;
        let move = roll + player.class.moveModifier + player.moveModifier;
        
        if (player.class.id === 'peasant') {
            move = Math.max(1, move);
        }

        console.log(`🎮 ${player.name} кинув ${roll}, рух: ${move}`);

        // Показуємо анімацію кубика
        const rotations = {
            1: 'rotateY(0deg)',
            2: 'rotateY(-90deg)',
            3: 'rotateY(-180deg)',
            4: 'rotateY(90deg)',
            5: 'rotateX(-90deg)',
            6: 'rotateX(90deg)'
        };

        this.diceInner.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
        
        setTimeout(async () => {
            this.diceInner.style.transform = `${rotations[roll]} translateZ(40px)`;
            
            // Рухаємо гравця
            await this.movePlayer(player, move);
            
            // Перевіряємо події
            this.checkCell(player);
            
        }, 1000);
    }

    // Перевірка подій на клітинці (перевизначений для інших гравців)
    checkCell(player) {
        const cellData = this.specialCells[player.position];
        
        if (cellData) {
            console.log(`🎮 ${player.name} потрапив на подію: ${cellData.type}`);
            
            if (player.isBot) {
                // Для інших гравців обробляємо події автоматично
                this.handleBotEvent(player, cellData);
            } else {
                // Для основного гравця показуємо звичайне модальне вікно
                this.handleSpecialCell(player, cellData);
            }
        } else {
            // Якщо події немає, передаємо хід
            setTimeout(() => {
                this.nextTurn();
            }, this.botDelay);
        }
    }

    // Обробка подій для інших гравців
    handleBotEvent(player, cellData) {
        console.log(`🎮 ${player.name} обробляє подію: ${cellData.type}`);
        
        switch (cellData.type) {
            case 'quest':
            case 'simple':
                this.handleBotSimpleQuest(player);
                break;
            case 'pvp':
            case 'pvp-quest':
                this.handleBotPvpQuest(player, cellData);
                break;
            case 'creative':
            case 'creative-quest':
                this.handleBotCreativeQuest(player, cellData);
                break;
            case 'mad-libs':
            case 'mad-libs-quest':
                this.handleBotMadLibs(player);
                break;
            case 'webnovella':
            case 'webnovella-quest':
                this.handleBotWebnovella(player);
                break;
            case 'alternative-path':
                this.handleBotAlternativePath(player, cellData);
                break;
            case 'reincarnation':
            case 'early-reincarnation':
                this.handleBotReincarnation(player, cellData);
                break;
            case 'machine-uprising':
                this.handleBotMachineUprising(player);
                break;
            case 'test-question':
                this.handleBotTestQuestion(player, player.position);
                break;
            case 'portal':
                this.handleBotPortal(player, cellData);
                break;
            case 'amphitheater':
                this.handleBotAmphitheater(player);
                break;
            case 'tavern':
                this.handleBotTavern(player);
                break;
            case 'casino':
                this.handleBotCasino(player);
                break;
            default:
                // Якщо невідома подія, просто передаємо хід
                setTimeout(() => {
                    this.nextTurn();
                }, this.botDelay);
        }
    }

    // Обробка простих квестів для інших гравців
    handleBotSimpleQuest(player) {
        const simpleQuests = [
            { title: 'Знайшов старовинну книгу!', reward: 15, description: 'Гравець знайшов цінну книгу в бібліотеці.' },
            { title: 'Допоміг вчителю!', reward: 20, description: 'Гравець допоміг вчителю з організацією уроку.' },
            { title: 'Вивчив нову мову!', reward: 25, description: 'Гравець успішно вивчив основи нової мови.' },
            { title: 'Створив науковий проект!', reward: 30, description: 'Проект гравця отримав визнання.' },
            { title: 'Переміг у олімпіаді!', reward: 40, description: 'Гравець посів перше місце в олімпіаді.' }
        ];

        const quest = simpleQuests[Math.floor(Math.random() * simpleQuests.length)];
        
        this.updatePoints(player, quest.reward, quest.title);
        
        // Показуємо результат для людини
        this.showQuestModal(`${player.name} - ${quest.title}`, 
            `${quest.description}\n\nОтримано: +${quest.reward} ОО`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка творчих квестів для інших гравців
    handleBotCreativeQuest(player, cellData) {
        const creativeTypes = Object.keys(this.botResponses.creative);
        const selectedType = cellData.gameType || creativeTypes[Math.floor(Math.random() * creativeTypes.length)];
        const responses = this.botResponses.creative[selectedType] || this.botResponses.creative[creativeTypes[0]];
        const botResponse = responses[Math.floor(Math.random() * responses.length)];

        console.log(`🎮 ${player.name} відповів на творче завдання: ${botResponse}`);

        // Додаємо роботу бота до списку
        this.creativeSubmissions.push({
            playerId: player.id,
            playerName: player.name,
            submission: botResponse,
            submissionIndex: this.creativeSubmissions.length
        });
        
        // Додаємо бота до списку очікуваних, якщо ще не додано
        if (!this.playersExpectedToSubmit.includes(player.id)) {
            this.playersExpectedToSubmit.push(player.id);
        }
        
        // Перевіряємо, чи всі гравці здали роботи
        const humanPlayer = this.players.find(p => !p.isBot);
        const allSubmitted = humanPlayer && 
            this.creativeSubmissions.some(s => s.playerId === humanPlayer.id) &&
            this.creativeSubmissions.some(s => s.playerId === player.id);
        
        if (allSubmitted) {
            // Всі здали - запускаємо голосування
            this.startCreativeVoting();
        } else {
            // Якщо людина ще не здала, чекаємо (бот вже здав)
            // Якщо це бот і людина вже здала, запускаємо голосування
            if (humanPlayer && this.creativeSubmissions.some(s => s.playerId === humanPlayer.id)) {
                this.startCreativeVoting();
            }
            // Інакше просто чекаємо на людину (не викликаємо nextTurn)
        }
    }
    
    // Запуск голосування в творчих квестах
    startCreativeVoting() {
        // Показуємо інтерфейс голосування для людини
        const humanPlayer = this.players.find(p => !p.isBot);
        if (!humanPlayer) return;
        
        // Створюємо HTML для голосування
        let votingHTML = '<h3 class="text-xl font-bold mb-4">Оберіть найкращу роботу:</h3>';
        this.creativeSubmissions.forEach((submission, index) => {
            if (submission.playerId !== humanPlayer.id) { // Не можна голосувати за себе
                votingHTML += `
                    <div class="mb-4 p-4 bg-gray-700 rounded-lg">
                        <p class="font-bold mb-2">${submission.playerName}:</p>
                        <p class="mb-3">"${submission.submission}"</p>
                        <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" 
                                onclick="window.botGame?.makeCreativeVote(${index})">
                            Голосувати
                        </button>
                    </div>
                `;
            }
        });
        
        this.showQuestModal('Голосування', votingHTML, []);
        
        // Бот автоматично голосує через 2 секунди
        setTimeout(() => {
            this.makeBotCreativeVote();
        }, 2000);
    }
    
    // Голос бота в творчих квестах
    makeBotCreativeVote() {
        const botPlayer = this.players.find(p => p.isBot);
        if (!botPlayer) return;
        
        // Бот не може голосувати за себе
        const availableSubmissions = this.creativeSubmissions.filter(s => s.playerId !== botPlayer.id);
        if (availableSubmissions.length === 0) return;
        
        // Вибираємо випадкову роботу
        const selectedSubmission = availableSubmissions[Math.floor(Math.random() * availableSubmissions.length)];
        this.creativeVotes[botPlayer.id] = selectedSubmission.submissionIndex;
        
        console.log(`🎮 ${botPlayer.name} проголосував за роботу ${selectedSubmission.playerName}`);
        
        // Перевіряємо, чи всі проголосували
        const humanPlayer = this.players.find(p => !p.isBot);
        if (humanPlayer && this.creativeVotes[humanPlayer.id]) {
            // Всі проголосували - підраховуємо результати
            this.finishCreativeVoting();
        }
    }
    
    // Голос людини в творчих квестах
    makeCreativeVote(submissionIndex) {
        const humanPlayer = this.players.find(p => !p.isBot);
        if (!humanPlayer) return;
        
        // Перевіряємо, чи не голосує за себе
        const submission = this.creativeSubmissions[submissionIndex];
        if (submission && submission.playerId === humanPlayer.id) {
            alert('Ви не можете голосувати за свою роботу!');
            return;
        }
        
        this.creativeVotes[humanPlayer.id] = submissionIndex;
        console.log(`🎮 ${humanPlayer.name} проголосував за роботу ${submission?.playerName}`);
        
        // Перевіряємо, чи всі проголосували
        const botPlayer = this.players.find(p => p.isBot);
        if (botPlayer && this.creativeVotes[botPlayer.id]) {
            // Всі проголосували - підраховуємо результати
            this.finishCreativeVoting();
        }
    }
    
    // Завершення голосування та підрахунок результатів
    finishCreativeVoting() {
        // Підраховуємо голоси
        const voteCounts = {};
        Object.values(this.creativeVotes).forEach(index => {
            voteCounts[index] = (voteCounts[index] || 0) + 1;
        });
        
        // Знаходимо переможця
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
        
        const winner = this.creativeSubmissions[winnerIndex];
        
        // Нараховуємо очки
        if (isTie) {
            // Нічия - всі отримують очки
            this.players.forEach(p => {
                this.updatePoints(p, 20, 'Нічия в творчому конкурсі');
            });
        } else if (winner) {
            const winnerPlayer = this.players.find(p => p.id === winner.playerId);
            if (winnerPlayer) {
                this.updatePoints(winnerPlayer, 20, 'Перемога в творчому конкурсі');
            }
        }
        
        // Показуємо результат
        const resultMessage = isTie 
            ? 'Перемогла дружба! Кожному по 20 очок!'
            : `Переможець: ${winner?.playerName}!`;
        
        this.showQuestModal('Результати голосування', resultMessage, [
            { text: 'Далі', callback: () => {
                this.questModal.classList.add('hidden');
                // Очищаємо стан
                this.creativeSubmissions = [];
                this.playersExpectedToSubmit = [];
                this.creativeVotes = {};
                setTimeout(() => this.nextTurn(), 500);
            }}
        ]);
    }

    // Обробка "Хто, де, коли?" для інших гравців
    handleBotMadLibs(player) {
        const responses = this.botResponses.mad_libs.responses;
        const botResponse = responses[Math.floor(Math.random() * responses.length)];

        this.showQuestModal(`${player.name} - Хто, де, коли?`, 
            `Гравець відповів:\n\n"${botResponse}"`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка веб-новела для інших гравців
    handleBotWebnovella(player) {
        const responses = this.botResponses.webnovella.responses;
        const botResponse = responses[Math.floor(Math.random() * responses.length)];

        this.showQuestModal(`${player.name} - Веб-новела`, 
            `Гравець обрав:\n\n"${botResponse}"`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка обхідного шляху для інших гравців
    handleBotAlternativePath(player, cellData) {
        // Гравець завжди вибирає "Так" (ризикує)
        this.updatePoints(player, -cellData.cost, `Використав обхідний шлях`);
        this.movePlayerTo(player, cellData.target);
        
        this.showQuestModal(`${player.name} - Обхідний шлях`, 
            `${player.name} вирішив ризикнути і використати обхідний шлях!\n\nСплачено: ${cellData.cost} ОО\nПереміщено на клітинку: ${cellData.target}`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка реінкарнації для інших гравців
    handleBotReincarnation(player, cellData) {
        // Гравець завжди погоджується на реінкарнацію
        const targetEpoch = cellData.targetEpoch || cellData.nextEpoch;
        const points = cellData.points || 50;
        
        if (targetEpoch && this.playerClasses && this.playerClasses.length >= targetEpoch) {
            const newClass = this.playerClasses[targetEpoch - 1];
            if (newClass) {
                player.class = newClass;
                player.points = points;
                this.updateUI();
                
                this.showQuestModal(`${player.name} - Реінкарнація`, 
                    `${player.name} погодився на реінкарнацію!\n\nНовий клас: ${newClass.name}\nНові очки: ${points} ОО`, [
                        { text: 'Далі', callback: () => {
                            this.questModal.classList.add('hidden');
                            setTimeout(() => this.nextTurn(), 500);
                        }}
                    ]);
                return;
            }
        }
        
        // Якщо не вдалося визначити клас, просто даємо очки
        player.points = points;
        this.updateUI();
        
        this.showQuestModal(`${player.name} - Реінкарнація`, 
            `${player.name} погодився на реінкарнацію!\n\nОтримано: ${points} ОО`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка повстання машин для інших гравців
    handleBotMachineUprising(player) {
        // Гравець завжди вибирає "Боротися"
        const fightResult = Math.random() < 0.7; // 70% шанс перемоги
        
        if (fightResult) {
            this.updatePoints(player, 100, `Переміг у повстанні машин`);
            this.showQuestModal(`${player.name} - Повстання машин`, 
                `${player.name} вирішив боротися і переміг!\n\nОтримано: +100 ОО`, [
                    { text: 'Далі', callback: () => {
                        this.questModal.classList.add('hidden');
                        setTimeout(() => this.nextTurn(), 500);
                    }}
                ]);
        } else {
            this.updatePoints(player, -50, `Програв у повстанні машин`);
            this.showQuestModal(`${player.name} - Повстання машин`, 
                `${player.name} вирішив боротися, але програв!\n\nВтрачено: -50 ОО`, [
                    { text: 'Далі', callback: () => {
                        this.questModal.classList.add('hidden');
                        setTimeout(() => this.nextTurn(), 500);
                    }}
                ]);
        }
    }

    // Обробка тестового завдання для ботів
    handleBotTestQuestion(player, cellNumber) {
        const questionData = window.TEST_QUESTIONS && window.TEST_QUESTIONS[cellNumber];
        
        if (!questionData) {
            // Якщо немає питання, даємо випадкову відповідь
            const isCorrect = Math.random() < 0.5; // 50% шанс правильної відповіді
            const reward = isCorrect ? 5 : 0;
            
            if (isCorrect) {
                this.updatePoints(player, reward, 'Правильна відповідь на тест');
            }
            
            this.showQuestModal(`${player.name} - Тестове завдання`, 
                `${player.name} ${isCorrect ? 'правильно відповів' : 'неправильно відповів'} на тестове завдання.\n\n${isCorrect ? `Отримано: +${reward} ОО` : 'Очок не отримано'}`, [
                    { text: 'Далі', callback: () => {
                        this.questModal.classList.add('hidden');
                        setTimeout(() => this.nextTurn(), 500);
                    }}
                ]);
            return;
        }
        
        // Бот вибирає випадкову відповідь
        const options = Object.keys(questionData.options);
        const selectedAnswer = options[Math.floor(Math.random() * options.length)];
        const isCorrect = selectedAnswer === questionData.correctAnswer;
        const reward = isCorrect ? 5 : 0;
        
        if (isCorrect) {
            this.updatePoints(player, reward, 'Правильна відповідь на тест');
        }
        
        this.showQuestModal(`${player.name} - Тестове завдання`, 
            `Питання: ${questionData.question}\n\n${player.name} обрав відповідь: ${selectedAnswer})\n\n${isCorrect ? `✅ Правильно! Отримано: +${reward} ОО` : `❌ Неправильно. Правильна відповідь: ${questionData.correctAnswer}`}`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка порталу для ботів
    handleBotPortal(player, cellData) {
        // Бот завжди використовує портал (ризикує)
        const cost = cellData.cost || 10;
        this.updatePoints(player, -cost, 'Використання порталу');
        this.movePlayerTo(player, cellData.target);
        
        this.showQuestModal(`${player.name} - Таємний портал`, 
            `${player.name} вирішив ризикнути та використати портал!\n\nСплачено: ${cost} ОО\nПереміщено на клітинку: ${cellData.target}`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка амфітеатру для ботів
    handleBotAmphitheater(player) {
        const playerClassId = player.class?.id || 'peasant';
        
        if (playerClassId === 'aristocrat' || playerClassId === 'burgher') {
            // Аристократ або міщанин пропускає хід
            player.skipTurn = true;
            this.showQuestModal(`${player.name} - Амфітеатр`, 
                `🎭 ${player.name} (${player.class.name}) захотів вина та видовищ в Амфітеатрі! У такому стані він не може продовжити гру та пропускає хід.`, [
                    { text: 'Далі', callback: () => {
                        this.questModal.classList.add('hidden');
                        setTimeout(() => this.nextTurn(), 500);
                    }}
                ]);
        } else {
            // Селянин не може потрапити
            this.showQuestModal(`${player.name} - Амфітеатр`, 
                `⛔ ${player.name} (${player.class.name}) хотів потрапити до Амфітеатру, але забув про своє становище у суспільстві - його не пустили.`, [
                    { text: 'Далі', callback: () => {
                        this.questModal.classList.add('hidden');
                        setTimeout(() => this.nextTurn(), 500);
                    }}
                ]);
        }
    }

    // Обробка шинку для ботів
    handleBotTavern(player) {
        const playerClassId = player.class?.id || 'peasant';
        let lostPoints = 0;
        let message = '';
        
        if (playerClassId === 'aristocrat') {
            lostPoints = player.points;
            player.points = 0;
            message = `💸 ${player.name} (${player.class.name})! Вітаємо! Ви втратили усі статки (${lostPoints} ОО), які століттями накопичувала ваша родина у Шинку! Відтепер життя стане складнішим, проте не засмучуйтесь: все ще є шанси перемогти!`;
        } else if (playerClassId === 'burgher') {
            lostPoints = Math.floor(player.points / 2);
            player.points -= lostPoints;
            message = `💰 ${player.name} (${player.class.name})! Вітаємо! Ви втратили половину (${lostPoints} ОО) вашого нажитого майна у Шинку! Відтепер життя стане дещо складнішим, проте не засмучуйтесь: все ще є шанси перемогти!`;
        } else {
            // Селянин не втрачає очок
            message = `🍺 ${player.name} (${player.class.name}) зайшов до Шинку, але не мав грошей на розваги.`;
        }
        
        this.updateUI();
        
        this.showQuestModal(`${player.name} - Шинок`, message, [
            { text: 'Далі', callback: () => {
                this.questModal.classList.add('hidden');
                setTimeout(() => this.nextTurn(), 500);
            }}
        ]);
    }

    // Обробка казино для ботів
    handleBotCasino(player) {
        const playerClassId = player.class?.id || 'peasant';
        let lostPoints = 0;
        let message = '';
        
        if (playerClassId === 'aristocrat') {
            lostPoints = player.points;
            player.points = 0;
            message = `💸 ${player.name} (${player.class.name})! Вітаємо! Ви втратили усі статки (${lostPoints} ОО), які століттями накопичувала ваша родина у Казино! Відтепер життя стане складнішим, проте не засмучуйтесь: все ще є шанси перемогти!`;
        } else if (playerClassId === 'burgher') {
            lostPoints = Math.floor(player.points / 2);
            player.points -= lostPoints;
            message = `💰 ${player.name} (${player.class.name})! Вітаємо! Ви втратили половину (${lostPoints} ОО) вашого нажитого майна у Казино! Відтепер життя стане дещо складнішим, проте не засмучуйтесь: все ще є шанси перемогти!`;
        } else {
            // Селянин не втрачає очок
            message = `🎰 ${player.name} (${player.class.name}) зайшов до Казино, але не мав грошей на азартні ігри.`;
        }
        
        this.updateUI();
        
        this.showQuestModal(`${player.name} - Казино`, message, [
            { text: 'Далі', callback: () => {
                this.questModal.classList.add('hidden');
                setTimeout(() => this.nextTurn(), 500);
            }}
        ]);
    }

    // Перевизначений метод nextTurn для інших гравців
    nextTurn() {
        if (!this.gameActive) return;

        const player = this.players[this.currentPlayerIndex];

        if (player.extraTurn) {
            player.extraTurn = false;
            this.rollDiceBtn.disabled = false;
            return;
        }

        if (player.skipTurn) {
            player.skipTurn = false;
            this.showQuestModal('Пропуск ходу', `${player.name} пропускає цей хід через подію.`, [
                { text: 'Зрозуміло', callback: () => { 
                    this.questModal.classList.add('hidden'); 
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
            return;
        }

        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].hasLost);

        this.updateUI();

        const nextPlayer = this.players[this.currentPlayerIndex];
        
        if (nextPlayer.isBot) {
            // Якщо наступний гравець - інший гравець, автоматично кидаємо кубик
            this.rollDiceBtn.disabled = true;
            setTimeout(() => {
                this.handleBotTurn();
            }, this.botDelay);
        } else {
            // Якщо наступний гравець - основний гравець, дозволяємо кинути кубик
            this.rollDiceBtn.disabled = false;
        }
    }

    // Перевизначений метод rollTheDice для інших гравців
    async rollTheDice() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        if (currentPlayer.isBot) {
            // Інші гравці не можуть кидати кубик вручну
            return;
        }
        
        // Викликаємо базовий метод для основного гравця
        await super.rollTheDice();
    }

    // Показ контейнера гри
    showGameContainer() {
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('online-panel').classList.add('hidden');
    }
    
    // ========== ФУНКЦІЇ МОДАЛЬНИХ ВІКОН (скопійовано з multiplayer.js) ==========
    
    // Показ модального вікна для хрестиків-нуликів
    showTicTacToeModal(data) {
        const humanPlayer = this.players.find(p => !p.isBot);
        const botPlayer = this.players.find(p => p.isBot && p.id === data.gameState?.players?.[0] || p.id === data.gameState?.players?.[1]);
        
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal glassmorphism-modal-small" id="tictactoe-modal">
                <div class="glassmorphism-content-tictactoe-small">
                    <div class="glassmorphism-header">
                        <h2>🎯 Хреститися рано!</h2>
                        <button class="close-test-modal-btn" onclick="document.getElementById('tictactoe-modal').remove(); document.body.classList.remove('glassmorphism-bg');">✖</button>
                    </div>
                    
                    <div class="glassmorphism-info-box">
                        <p class="text-sm">${data.gameState?.gameData?.description || 'Грайте в хрестики-нулики!'}</p>
                        <p class="text-sm font-bold">${humanPlayer?.name || 'Ви'} проти ${botPlayer?.name || 'Бот'}</p>
                    </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        <div class="mb-4">
                            <div id="tic-tac-toe-board" class="tic-tac-toe-grid mx-auto mb-4"></div>
                            <div id="game-status" class="text-center text-lg font-bold mb-2">Хід гравця: <span class="x">X</span></div>
                        </div>
                        <button id="submit-result-btn" class="glassmorphism-btn-primary w-full" disabled>
                            Завершити гру
                        </button>
                        <button class="glassmorphism-btn-secondary w-full mt-2" onclick="document.getElementById('tictactoe-modal').remove(); document.body.classList.remove('glassmorphism-bg');">
                            Закрити
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо існуюче модальне вікно, якщо є
        const existingModal = document.getElementById('tictactoe-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Додаємо нове модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Ініціалізуємо стан гри
        if (!this.ticTacToeState) {
            this.ticTacToeState = {
                gameActive: true,
                currentPlayer: 'X', // Починає людина
                gameState: Array(9).fill(null),
                players: [humanPlayer?.id || 'human', botPlayer?.id || 'bot'],
                playerNames: { [humanPlayer?.id || 'human']: humanPlayer?.name || 'Ви', [botPlayer?.id || 'bot']: botPlayer?.name || 'Бот' },
                currentRound: 0,
                rounds: [{ board: Array(9).fill(null), winner: null }],
                scores: {},
                playerSymbol: 'X',
                opponentSymbol: 'O',
                playerWins: 0,
                opponentWins: 0
            };
        }
        
        // Ініціалізуємо дошку
        setTimeout(() => {
            this.initializeTicTacToeBoard();
        }, 100);
    }
    
    // Показ модального вікна для камінь-ножиці-папір
    showRockPaperScissorsModal(data) {
        const humanPlayer = this.players.find(p => !p.isBot);
        const botPlayer = this.players.find(p => p.isBot && p.id === data.gameState?.players?.[0] || p.id === data.gameState?.players?.[1]);
        
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal glassmorphism-modal-small" id="rps-modal">
                <div class="glassmorphism-content-rps-small">
                    <div class="glassmorphism-header">
                        <h2>🪨📄✂️ Камінь, Ножиці, Папір</h2>
                        <button class="close-test-modal-btn" onclick="document.getElementById('rps-modal').remove(); document.body.classList.remove('glassmorphism-bg');">✖</button>
                    </div>
                    
                    <div class="glassmorphism-info-box">
                        <p class="text-sm">${data.gameState?.gameData?.description || 'Грайте в камінь-ножиці-папір!'}</p>
                        <p class="text-sm font-bold">${humanPlayer?.name || 'Ви'} проти ${botPlayer?.name || 'Бот'}</p>
                    </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        <div id="rps-game" class="text-center mb-4">
                            <div id="rps-round" class="text-xl font-bold mb-3">Раунд 1 з 3</div>
                            <div id="rps-score" class="text-lg mb-4">Ваші перемоги: 0 | Перемоги противника: 0</div>
                            
                            <div class="flex justify-center gap-4 mb-4">
                                <button id="rps-rock" class="rps-choice-btn">✊</button>
                                <button id="rps-paper" class="rps-choice-btn">✋</button>
                                <button id="rps-scissors" class="rps-choice-btn">✌️</button>
                            </div>
                            
                            <div id="rps-result" class="text-lg font-bold mb-2"></div>
                        </div>
                        <button id="submit-result-btn" class="glassmorphism-btn-primary w-full" disabled>
                            Завершити гру
                        </button>
                        <button class="glassmorphism-btn-secondary w-full mt-2" onclick="document.getElementById('rps-modal').remove(); document.body.classList.remove('glassmorphism-bg');">
                            Закрити
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо існуюче модальне вікно, якщо є
        const existingModal = document.getElementById('rps-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Додаємо нове модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Ініціалізуємо стан гри
        if (!this.rpsGameState) {
            this.rpsGameState = {
                round: 1,
                maxRounds: 3,
                playerWins: 0,
                opponentWins: 0,
                playerChoice: null,
                opponentChoice: null,
                gameFinished: false,
                players: [humanPlayer?.id || 'human', botPlayer?.id || 'bot'],
                playerNames: { [humanPlayer?.id || 'human']: humanPlayer?.name || 'Ви', [botPlayer?.id || 'bot']: botPlayer?.name || 'Бот' },
                choices: {},
                scores: {},
                currentRound: 1
            };
        }
        
        // Додаємо обробники подій
        setTimeout(() => {
            this.initializeRockPaperScissors();
        }, 100);
    }
    
    // Ініціалізація дошки хрестиків-нуликів (адаптовано для локальної гри)
    initializeTicTacToeBoard() {
        const board = document.getElementById('tic-tac-toe-board');
        if (!board) return;
        
        board.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'tic-tac-toe-cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.makeTicTacToeMove(i));
            board.appendChild(cell);
        }
        
        this.updateTicTacToeStatus();
    }
    
    // Ініціалізація камінь-ножиці-папір (адаптовано для локальної гри)
    initializeRockPaperScissors() {
        const rockBtn = document.getElementById('rps-rock');
        const paperBtn = document.getElementById('rps-paper');
        const scissorsBtn = document.getElementById('rps-scissors');
        
        if (rockBtn) {
            rockBtn.addEventListener('click', () => this.makeRPSChoice('rock'));
        }
        if (paperBtn) {
            paperBtn.addEventListener('click', () => this.makeRPSChoice('paper'));
        }
        if (scissorsBtn) {
            scissorsBtn.addEventListener('click', () => this.makeRPSChoice('scissors'));
        }
    }
    
    // Оновлення статусу хрестиків-нуликів
    updateTicTacToeStatus(message) {
        const statusEl = document.getElementById('game-status');
        if (statusEl) {
            statusEl.textContent = message || `Хід: ${this.ticTacToeState?.currentPlayer === 'X' ? 'Ви (X)' : 'Бот (O)'}`;
        }
    }
    
    // Створення SVG для гравця
    createPlayerSVG(player) {
        if (player === 'X') {
            return `<svg class="svg-x" viewBox="0 0 100 100">
                        <line x1="15" y1="15" x2="85" y2="85" />
                        <line x1="85" y1="15" x2="15" y2="85" />
                    </svg>`;
        } else {
            return `<svg class="svg-o" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="35" />
                    </svg>`;
        }
    }
    
    // Обробка ходу в хрестиках-нуликах (для людини)
    makeTicTacToeMove(cellIndex) {
        if (!this.ticTacToeState || !this.ticTacToeState.gameActive) return;
        if (this.ticTacToeState.currentPlayer !== 'X') return; // Тільки людина може ходити
        
        const cell = document.querySelector(`[data-index="${cellIndex}"]`);
        if (!cell || this.ticTacToeState.gameState[cellIndex]) return;
        
        // Хід людини
        this.ticTacToeState.gameState[cellIndex] = 'X';
        cell.innerHTML = this.createPlayerSVG('X');
        cell.classList.add('x', 'disabled');
        
        // Перевіряємо результат
        const result = this.checkTicTacToeResult();
        if (result.gameOver) {
            this.handleTicTacToeGameOver(result);
            return;
        }
        
        // Передаємо хід боту
        this.ticTacToeState.currentPlayer = 'O';
        this.updateTicTacToeStatus('Хід бота...');
        
        setTimeout(() => {
            this.makeBotTicTacToeMove();
        }, 1000);
    }
    
    // Хід бота в хрестиках-нуликах
    makeBotTicTacToeMove() {
        if (!this.ticTacToeState || !this.ticTacToeState.gameActive) return;
        
        // Знаходимо вільні клітинки
        const freeCells = [];
        for (let i = 0; i < 9; i++) {
            if (!this.ticTacToeState.gameState[i]) {
                freeCells.push(i);
            }
        }
        
        if (freeCells.length === 0) return;
        
        // Вибираємо випадкову вільну клітинку
        const cellIndex = freeCells[Math.floor(Math.random() * freeCells.length)];
        
        // Хід бота
        this.ticTacToeState.gameState[cellIndex] = 'O';
        const cell = document.querySelector(`[data-index="${cellIndex}"]`);
        if (cell) {
            cell.innerHTML = this.createPlayerSVG('O');
            cell.classList.add('o', 'disabled');
        }
        
        // Перевіряємо результат
        const result = this.checkTicTacToeResult();
        if (result.gameOver) {
            this.handleTicTacToeGameOver(result);
            return;
        }
        
        // Повертаємо хід людині
        this.ticTacToeState.currentPlayer = 'X';
        this.updateTicTacToeStatus('Ваш хід!');
    }
    
    // Перевірка результату хрестиків-нуликів
    checkTicTacToeResult() {
        const board = this.ticTacToeState.gameState;
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Рядки
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Колонки
            [0, 4, 8], [2, 4, 6] // Діагоналі
        ];
        
        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { gameOver: true, winner: board[a], message: `Переміг ${board[a] === 'X' ? 'Ви' : 'Бот'}!` };
            }
        }
        
        if (!board.includes(null)) {
            return { gameOver: true, winner: null, message: 'Нічия!' };
        }
        
        return { gameOver: false };
    }
    
    // Обробка завершення гри хрестиків-нуликів
    handleTicTacToeGameOver(result) {
        this.ticTacToeState.gameActive = false;
        this.updateTicTacToeStatus(result.message);
        
        // Блокуємо всі клітинки
        const cells = document.querySelectorAll('.tic-tac-toe-cell');
        cells.forEach(cell => cell.classList.add('disabled'));
        
        // Нараховуємо очки
        if (result.winner === 'X') {
            const humanPlayer = this.players.find(p => !p.isBot);
            if (humanPlayer) {
                this.updatePoints(humanPlayer, 30, 'Перемога в хрестиках-нуликах');
            }
        } else if (result.winner === 'O') {
            const botPlayer = this.players.find(p => p.isBot);
            if (botPlayer) {
                this.updatePoints(botPlayer, 30, 'Перемога в хрестиках-нуликах');
            }
        }
        
        // Закриваємо модальне вікно через 3 секунди
        setTimeout(() => {
            const modal = document.getElementById('tictactoe-modal');
            if (modal) {
                modal.remove();
                document.body.classList.remove('glassmorphism-bg');
            }
            this.nextTurn();
        }, 3000);
    }
    
    // Обробка вибору в камінь-ножиці-папір (для людини)
    makeRPSChoice(choice) {
        if (!this.rpsGameState || this.rpsGameState.gameFinished) return;
        
        this.rpsGameState.playerChoice = choice;
        this.rpsGameState.choices['human'] = choice;
        
        // Оновлюємо інтерфейс
        this.updateRPSInterface('waiting', null);
        
        // Блокуємо кнопки
        const buttons = document.querySelectorAll('.rps-choice-btn');
        buttons.forEach(btn => btn.disabled = true);
        
        // Хід бота через 1 секунду
        setTimeout(() => {
            this.makeBotRPSChoice();
        }, 1000);
    }
    
    // Хід бота в камінь-ножиці-папір
    makeBotRPSChoice() {
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        this.rpsGameState.opponentChoice = botChoice;
        this.rpsGameState.choices['bot'] = botChoice;
        
        // Визначаємо результат
        const result = this.getRPSResult(this.rpsGameState.playerChoice, botChoice);
        
        // Оновлюємо рахунок
        if (result === 'win') {
            this.rpsGameState.playerWins++;
        } else if (result === 'lose') {
            this.rpsGameState.opponentWins++;
        }
        
        // Оновлюємо інтерфейс
        this.updateRPSInterface(result, botChoice);
        
        // Перевіряємо чи хтось виграв
        if (this.rpsGameState.playerWins >= 2 || this.rpsGameState.opponentWins >= 2) {
            this.rpsGameState.gameFinished = true;
            this.finishRPSGame();
        } else {
            // Наступний раунд
            this.rpsGameState.currentRound++;
            this.rpsGameState.playerChoice = null;
            this.rpsGameState.opponentChoice = null;
            
            setTimeout(() => {
                this.updateRPSInterface('next', null);
                // Розблоковуємо кнопки
                const buttons = document.querySelectorAll('.rps-choice-btn');
                buttons.forEach(btn => btn.disabled = false);
            }, 2000);
        }
    }
    
    // Визначення результату камінь-ножиці-папір
    getRPSResult(playerChoice, opponentChoice) {
        if (playerChoice === opponentChoice) return 'tie';
        if (
            (playerChoice === 'rock' && opponentChoice === 'scissors') ||
            (playerChoice === 'paper' && opponentChoice === 'rock') ||
            (playerChoice === 'scissors' && opponentChoice === 'paper')
        ) {
            return 'win';
        }
        return 'lose';
    }
    
    // Оновлення інтерфейсу камінь-ножиці-папір
    updateRPSInterface(result, opponentChoice) {
        const roundDiv = document.getElementById('rps-round');
        const scoreDiv = document.getElementById('rps-score');
        const resultDiv = document.getElementById('rps-result');
        
        if (roundDiv) {
            roundDiv.textContent = `Раунд ${this.rpsGameState.currentRound} з ${this.rpsGameState.maxRounds}`;
        }
        
        if (scoreDiv) {
            scoreDiv.textContent = `Ваші перемоги: ${this.rpsGameState.playerWins} | Перемоги суперника: ${this.rpsGameState.opponentWins}`;
        }
        
        if (resultDiv) {
            if (result === 'waiting') {
                resultDiv.textContent = 'Очікуємо вибору супротивника...';
            } else if (result === 'next') {
                resultDiv.textContent = 'Оберіть ваш вибір';
            } else {
                const emojiMap = { rock: '✊', paper: '✋', scissors: '✌️' };
                const resultText = result === 'win' ? '🎉 Ви перемогли!' :
                                  result === 'lose' ? '😔 Ви програли' :
                                  '🤝 Нічия!';
                resultDiv.textContent = `${resultText} Ви: ${emojiMap[this.rpsGameState.playerChoice]} vs Супротивник: ${emojiMap[opponentChoice]}`;
            }
        }
    }
    
    // Завершення гри камінь-ножиці-папір
    finishRPSGame() {
        const humanPlayer = this.players.find(p => !p.isBot);
        const botPlayer = this.players.find(p => p.isBot);
        
        if (this.rpsGameState.playerWins > this.rpsGameState.opponentWins && humanPlayer) {
            this.updatePoints(humanPlayer, 30, 'Перемога в камінь-ножиці-папір');
        } else if (this.rpsGameState.opponentWins > this.rpsGameState.playerWins && botPlayer) {
            this.updatePoints(botPlayer, 30, 'Перемога в камінь-ножиці-папір');
        }
        
        setTimeout(() => {
            const modal = document.getElementById('rps-modal');
            if (modal) {
                modal.remove();
                document.body.classList.remove('glassmorphism-bg');
            }
            this.nextTurn();
        }, 3000);
    }
    
    getChoiceEmoji(choice) {
        const emojiMap = { rock: '✊', paper: '✋', scissors: '✌️' };
        return emojiMap[choice] || choice;
    }
}

// Експортуємо клас для використання
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotGame;
}
