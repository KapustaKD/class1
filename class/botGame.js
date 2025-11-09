// Система локальної гри з ботами
class BotGame extends EducationalPathGame {
    constructor() {
        super();
        this.bots = [];
        this.botResponses = this.initializeBotResponses();
        this.isBotTurn = false;
        this.botDelay = 1500; // Затримка між ходами ботів (1.5 секунди)
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
        
        // Показуємо роздачу класів
        this.showClassAssignment();
    }

    // Роздача випадкових класів
    assignRandomClasses() {
        const shuffledClasses = [...this.playerClasses].sort(() => Math.random() - 0.5);
        
        this.players.forEach((player, index) => {
            player.class = shuffledClasses[index];
            console.log(`${player.name} отримав клас: ${player.class.name}`);
        });
    }

    // Показ роздачі класів
    showClassAssignment() {
        let classInfo = '<h3 class="text-2xl font-bold mb-4">Роздача класів:</h3>';
        
        this.players.forEach(player => {
            classInfo += `
                <div class="mb-2 p-2 bg-gray-100 rounded">
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
        
        // Встановлюємо початкові очки
        this.players.forEach(player => {
            player.points = player.class.startPoints;
        });

        // Показуємо ігрове поле
        this.showGameContainer();
        
        // Оновлюємо UI
        this.updateUI();
        
        // Встановлюємо першого гравця
        this.currentPlayerIndex = 0;
        this.gameActive = true;
        
        // Якщо перший хід іншого гравця, автоматично кидаємо кубик
        if (this.players[this.currentPlayerIndex].isBot) {
            setTimeout(() => {
                this.handleBotTurn();
            }, 1000);
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
                this.handleBotPvpQuest(player);
                break;
            case 'creative':
            case 'creative-quest':
                this.handleBotCreativeQuest(player);
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
    handleBotCreativeQuest(player) {
        const creativeTypes = Object.keys(this.botResponses.creative);
        const selectedType = creativeTypes[Math.floor(Math.random() * creativeTypes.length)];
        const responses = this.botResponses.creative[selectedType];
        const botResponse = responses[Math.floor(Math.random() * responses.length)];

        console.log(`🎮 ${player.name} відповів на творче завдання: ${botResponse}`);

        // Показуємо відповідь гравця
        this.showQuestModal(`${player.name} - Творче завдання`, 
            `Гравець відповів:\n\n"${botResponse}"`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
                    setTimeout(() => this.nextTurn(), 500);
                }}
            ]);
    }

    // Обробка PvP квестів для інших гравців
    handleBotPvpQuest(player) {
        // Вибираємо випадкового опонента (не іншого гравця)
        const opponents = this.players.filter(p => !p.isBot && p.id !== player.id);
        
        if (opponents.length === 0) {
            // Якщо немає опонентів, пропускаємо подію
            setTimeout(() => this.nextTurn(), this.botDelay);
            return;
        }

        const opponent = opponents[Math.floor(Math.random() * opponents.length)];
        
        // Гравець завжди виграє в PvP (для простоти)
        this.updatePoints(player, 30, `Переміг ${opponent.name} в дуелі`);
        
        this.showQuestModal(`${player.name} - PvP Дуель`, 
            `${player.name} викликав на дуель ${opponent.name} і переміг!\n\nОтримано: +30 ОО`, [
                { text: 'Далі', callback: () => {
                    this.questModal.classList.add('hidden');
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
}

// Експортуємо клас для використання
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotGame;
}
