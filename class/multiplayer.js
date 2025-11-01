// Мультиплеєр клас для Socket.io
class MultiplayerGame extends EducationalPathGame {
    constructor() {
        super(true); // Передаємо true щоб EducationalPathGame не додавав свої обробники
        this.socket = null;
        this.isOnlineMode = false;
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.isSpectator = false;
        this.spectators = [];
        this.storyTimer = null; // Змінна для зберігання таймера спільної історії
        
        // Ініціалізуємо адаптивність
        this.initResponsiveDesign();
        
        // Встановлюємо випадковий фон для мультиплеєра
        this.setRandomBackground();
        
        // Спочатку налаштовуємо елементи мультиплеєра
        this.setupMultiplayerElements();
        // Потім обробники подій мультиплеєра (перезаписують базові)
        this.setupMultiplayerEventListeners();
        // Обробники подій для аватарів встановлюються при показі модального вікна
        
        // Ініціалізуємо звуки
        this.startGameSound = new Audio('sound/start/start_game.m4a');
        this.startGameSound.preload = 'auto';
        this.startGameSound.volume = 0.7; // Встановлюємо гучність
        
        this.notificationSound = new Audio('sound/notification/notification.mp3');
        this.notificationSound.preload = 'auto';
        this.timerSound = new Audio('sound/quests/clock_timer.mp3');
        this.timerSound.preload = 'auto';
        this.timerSound.loop = true; // Зациклюємо звук таймера
        this.timerSoundInterval = null; // Для зберігання інтервалу зациклення
        
        // Відстеження використаних клітинок з подіями
        this.usedEventCells = new Set();
        
        // Відстеження використаних типів подій для унікальності
        this.usedEventTypes = new Set();
        this.pvpSound = new Audio('sound/quests/during_the_quest.mp3');
        this.pvpSound.preload = 'auto';
        
        // Перевіряємо збережену гру
        this.checkForSavedGame();
    }
    
    setupMultiplayerElements() {
        this.modeSelection = document.getElementById('mode-selection');
        this.gameContainer = document.getElementById('game-container');
        this.onlinePanel = document.getElementById('online-panel');
        
        this.localModeBtn = document.getElementById('local-mode-btn');
        this.onlineModeBtn = document.getElementById('online-mode-btn');
        
        console.log('Кнопки режиму:', {
            localModeBtn: this.localModeBtn,
            onlineModeBtn: this.onlineModeBtn,
            modeSelection: this.modeSelection
        });
        
        this.connectionStatus = document.getElementById('connection-status');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        this.customRoomCodeInput = document.getElementById('custom-room-code');
        this.playerNameInput = document.getElementById('player-name-create');
        this.createRoomBtn = document.getElementById('create-room-btn');
        
        this.roomCodeInput = document.getElementById('room-code-join');
        this.joinPlayerNameInput = document.getElementById('player-name-join');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        
        this.playersList = document.getElementById('players-list');
        this.playersContainer = document.getElementById('players-container');
        
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendMessageBtn = document.getElementById('send-message-btn');
        
        // Додаємо елементи для коду кімнати
        this.roomCodeDisplay = document.getElementById('room-code-display');
        this.roomCodeText = document.getElementById('room-code-text');
        this.copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
        
        console.log('Елементи коду кімнати:', { 
            roomCodeDisplay: this.roomCodeDisplay, 
            roomCodeText: this.roomCodeText, 
            copyRoomCodeBtn: this.copyRoomCodeBtn 
        });
        
        // Додаємо елементи для початку гри
        this.startGameSection = document.getElementById('start-game-section');
        this.startGameBtn = document.getElementById('start-game-btn-lobby');
        this.testModeBtn = document.getElementById('test-mode-btn');
        this.isTestMode = false;
        
        // Додаємо елемент для виходу з кімнати
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        
        // Додаємо кнопку кидка кубика
        this.rollDiceBtn = document.getElementById('roll-dice-btn');
        
        // Додаємо кнопку бафів/дебафів
        this.buffDebuffBtn = document.getElementById('buff-debuff-btn');
        
        console.log('Елементи мультиплеєра налаштовано');
    }
    
    setupMultiplayerEventListeners() {
        console.log('Налаштовуємо обробники подій для кнопок режиму');
        
        // Обробники для кнопок режиму
        if (this.localModeBtn) {
            this.localModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Натиснуто локальний режим');
                this.startBackgroundMusic();
                this.startLocalMode();
            });
        } else {
            console.error('Кнопка локального режиму не знайдена!');
        }
        
        if (this.onlineModeBtn) {
            this.onlineModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Натиснуто онлайн режим');
                this.startBackgroundMusic();
                this.startOnlineMode();
            });
        } else {
            console.error('Кнопка онлайн режиму не знайдена!');
        }
        
        if (this.createRoomBtn) {
            this.createRoomBtn.addEventListener('click', () => this.createRoom());
        } else {
            console.error('Кнопка створення кімнати не знайдена!');
        }
        
        if (this.joinRoomBtn) {
            this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        } else {
            console.error('Кнопка приєднання до кімнати не знайдена!');
        }
        
        if (this.sendMessageBtn) {
            this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        } else {
            console.error('Кнопка відправки повідомлення не знайдена!');
        }
        
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        } else {
            console.error('Поле вводу чату не знайдено!');
        }
        
        // Обробник для кнопки початку гри
        if (this.startGameBtn) {
            this.startGameBtn.addEventListener('click', () => this.startOnlineGame());
        }
        
        // Обробник кнопки режиму тесту
        if (this.testModeBtn) {
            this.testModeBtn.addEventListener('click', () => {
                this.isTestMode = !this.isTestMode;
                if (this.isTestMode) {
                    this.testModeBtn.textContent = '🎮 Режим гри';
                    this.testModeBtn.classList.remove('bg-purple-500', 'hover:bg-purple-600');
                    this.testModeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
                    this.enterTestMode();
                } else {
                    this.testModeBtn.textContent = '🧪 Режим тесту';
                    this.testModeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                    this.testModeBtn.classList.add('bg-purple-500', 'hover:bg-purple-600');
                    this.exitTestMode();
                }
            });
        }
        
        // Обробник для кнопки виходу з кімнати
        if (this.leaveRoomBtn) {
            this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        }
        
        // Обробник для кнопки кидка кубика
        if (this.rollDiceBtn) {
            this.rollDiceBtn.addEventListener('click', () => this.rollTheDice());
        }
        
        // Обробник для кнопки бафів/дебафів
        if (this.buffDebuffBtn) {
            this.buffDebuffBtn.addEventListener('click', () => {
                if (!this.buffDebuffBtn.disabled && this.gameActive) {
                    this.showBuffDebuffModal();
                }
            });
        }
        
        // Обробник закриття модального вікна бафів/дебафів
        const closeBuffModalBtn = document.getElementById('close-buff-modal-btn');
        if (closeBuffModalBtn) {
            closeBuffModalBtn.addEventListener('click', () => {
                document.getElementById('buff-debuff-modal').classList.add('hidden');
            });
        }
        
        // Обробники для кнопок застосування бафів/дебафів
        const applyHateBtn = document.getElementById('apply-hate-btn');
        const applyHappinessBtn = document.getElementById('apply-happiness-btn');
        const applyProcrastinationBtn = document.getElementById('apply-procrastination-btn');
        const applyPushbackBtn = document.getElementById('apply-pushback-btn');
        const applyBoostForwardBtn = document.getElementById('apply-boost-forward-btn');
        
        if (applyHateBtn) {
            applyHateBtn.addEventListener('click', () => this.handleApplyEffect('hateClone', 100));
        }
        
        if (applyHappinessBtn) {
            applyHappinessBtn.addEventListener('click', () => this.handleApplyEffect('happinessCharm', 100));
        }
        
        if (applyProcrastinationBtn) {
            applyProcrastinationBtn.addEventListener('click', () => this.handleApplyEffect('procrastination', 50));
        }
        
        if (applyPushbackBtn) {
            applyPushbackBtn.addEventListener('click', () => this.handleApplyEffect('pushBack', 50));
        }
        
        if (applyBoostForwardBtn) {
            applyBoostForwardBtn.addEventListener('click', () => this.handleApplyEffect('boostForward', 50));
        }
        
        console.log('Обробники подій мультиплеєра налаштовано');
    }
    
    checkForSavedGame() {
        const savedGame = sessionStorage.getItem('activeGameRoom');
        if (savedGame) {
            try {
                const gameData = JSON.parse(savedGame);
                console.log('Знайдено збережену гру:', gameData);
                
                // Автоматично перепідключаємось без повідомлення
                    this.reconnectToGame(gameData);
            } catch (error) {
                console.error('Помилка при читанні збереженої гри:', error);
                sessionStorage.removeItem('activeGameRoom');
            }
        }
    }
    
    reconnectToGame(gameData) {
        console.log('Спроба перепідключення до гри:', gameData);
        
        // Підключаємося до сервера
        this.connectToServer();
        
        // Чекаємо підключення та відправляємо запит на перепідключення
        const attemptReconnect = () => {
            if (!this.socket || !this.socket.connected) {
                // Якщо сокет ще не підключений, чекаємо і пробуємо знову
                setTimeout(attemptReconnect, 200);
                return;
            }
            console.log('Намагаюся перепідключитися з даними:', gameData);
            this.socket.emit('reconnect_player', gameData);
        };
        
        // Починаємо спробу перепідключення через невелику затримку
        setTimeout(attemptReconnect, 500);
    }
    
    startLocalMode() {
        console.log('Запускаємо локальний режим');
        this.isOnlineMode = false;
        
        // Зберігаємо стан гри
        if (window.saveGameState) {
            window.saveGameState({
                isOnlineMode: false,
                isLocalMode: true,
                roomId: null,
                playerName: null,
                playerId: null
            });
        }
        
        // Приховуємо вибір режиму та онлайн панель
        this.modeSelection.classList.add('hidden');
        this.onlinePanel.classList.add('hidden');
        
        // Показуємо ігровий контейнер та правила
        this.gameContainer.classList.remove('hidden');
        const startModal = document.getElementById('start-modal');
        if (startModal) {
            startModal.classList.remove('hidden');
        }
        
        console.log('Локальний режим запущено');
    }
    
    startOnlineMode() {
        console.log('Запускаємо онлайн режим');
        this.isOnlineMode = true;
        
        // Зберігаємо стан гри
        if (window.saveGameState) {
            window.saveGameState({
                isOnlineMode: true,
                isLocalMode: false,
                roomId: this.roomId,
                playerName: this.playerName,
                playerId: this.playerId
            });
        }
        
        // Приховуємо вибір режиму та ігровий контейнер
        this.modeSelection.classList.add('hidden');
        this.gameContainer.classList.add('hidden');
        
        // Показуємо лобі (панель створення/приєднання до кімнати)
        this.onlinePanel.classList.remove('hidden');
        
        // Підключаємося до сервера
        this.connectToServer();
        
        console.log('Онлайн режим запущено, показуємо лобі');
    }
    
    connectToServer() {
        // Використовуємо конфігурацію з window.APP_CONFIG
        const socketUrl = window.APP_CONFIG ? window.APP_CONFIG.socketUrl : '';
        this.socket = io(socketUrl);
        
        this.socket.on('connect', () => {
            console.log('Підключено до сервера, ID:', this.socket.id);
            this.updateConnectionStatus(true, 'Підключено');
            this.playerId = this.socket.id;
        });
        
        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false, 'Відключено');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Помилка підключення:', error);
            this.updateConnectionStatus(false, 'Помилка підключення');
            if (window.gameUI) {
                window.gameUI.showNotification('Не вдалося підключитися до сервера. Спробуйте пізніше.', 'error');
            }
        });
        
        this.socket.on('room_created', (data) => {
            console.log('Отримано подію room_created:', data);
            this.roomId = data.roomId;
            this.isHost = true;
            
            // Показуємо модальне вікно створення кімнати
            this.showRoomCreatedModal(data.roomId);
            
            // Нова логіка відображення
            document.getElementById('join-create-section').classList.add('hidden');
            document.getElementById('lobby-section').classList.remove('hidden');
            
            // Оновлюємо UI лоббі
            document.getElementById('room-code-text').textContent = data.roomId;
            this.updatePlayersList(data.players);
            
            // Зберігаємо стан гри
            sessionStorage.setItem('activeGameRoom', JSON.stringify({ 
                roomId: this.roomId, 
                playerId: this.playerId 
            }));
            
            // Показуємо кнопку виходу
            this.leaveRoomBtn.classList.remove('hidden');
        });
        
        this.socket.on('room_joined', (data) => {
            this.roomId = data.roomId;
            this.isHost = false;
            
            // Показуємо модальне вікно приєднання до кімнати
            this.showRoomJoinedModal(data.roomId);
            
            // Нова логіка відображення
            document.getElementById('join-create-section').classList.add('hidden');
            document.getElementById('lobby-section').classList.remove('hidden');
            
            // Оновлюємо UI лоббі
            document.getElementById('room-code-text').textContent = data.roomId;
            this.updatePlayersList(data.players);
            
            // Зберігаємо стан гри
            sessionStorage.setItem('activeGameRoom', JSON.stringify({ 
                roomId: this.roomId, 
                playerId: this.playerId 
            }));
            
            // Показуємо кнопку виходу
            this.leaveRoomBtn.classList.remove('hidden');
        });
        
        this.socket.on('player_joined', (data) => {
            this.updatePlayersList(data.players);
            this.addChatMessage('system', `${data.player.name} приєднався до гри`);
        });
        
        this.socket.on('player_left', (data) => {
            this.updatePlayersList(data.players);
            this.addChatMessage('system', `${data.player.name} покинув гру`);
        });
        
        this.socket.on('player_reconnected', (data) => {
            this.addChatMessage('system', `${data.playerName} повернувся до гри`);
        });
        
        this.socket.on('joined_as_spectator', (data) => {
            console.log('Приєднався як спостерігач:', data);
            this.isSpectator = true;
            this.roomId = data.roomId;
            this.playerId = this.socket.id;
            
            // Показуємо ігровий інтерфейс
            this.showGameInterface();
            
            // Синхронізуємо стан гри
            this.syncGameState(data.gameData);
            
            // Оновлюємо список гравців та спостерігачів
            this.updatePlayersList(data.players);
            this.spectators = data.spectators;
            
            // Показуємо чат
            this.showChat();
            
            // Показуємо кнопку виходу
            this.leaveRoomBtn.classList.remove('hidden');
            
        });
        
        this.socket.on('spectator_joined', (data) => {
            this.spectators.push(data.spectator);
            this.addChatMessage('spectator', `${data.spectator.name} став спектатором`);
        });
        
        this.socket.on('spectator_left', (data) => {
            this.spectators = this.spectators.filter(s => s.id !== data.spectator.id);
            this.addChatMessage('spectator', `${data.spectator.name} перестав бути спектатором`);
        });
        
        this.socket.on('game_state_update', (data) => {
            this.syncGameState(data);
        });
        
        this.socket.on('dice_result', (data) => {
            console.log('Отримано подію dice_result:', data);
            this.handleDiceResult(data);
        });
        
        this.socket.on('turn_update', (data) => {
            console.log('Отримано подію turn_update:', data);
            this.handleTurnUpdate(data);
        });
        
        this.socket.on('show_event_prompt', (data) => {
            console.log('Отримано подію show_event_prompt:', data);
            this.showEventPrompt(data);
        });
        
                this.socket.on('event_result', (data) => {
                    console.log('Отримано подію event_result:', data);
                    this.handleEventResult(data);
                });

                this.socket.on('quest_started', (data) => {
                    this.handleRemoteQuest(data);
                });

                this.socket.on('test_result', (data) => {
                    this.handleTestResult(data);
                });

                // Обробник для Хрестиків-Нуликів
                this.socket.on('tic_tac_toe_start', (data) => {
                    console.log('Початок гри "Хрестики-нулики":', data);
                    this.showTicTacToeModal(data);
                });

                // Обробник для Камінь-Ножиці-Папір
                this.socket.on('rock_paper_scissors_start', (data) => {
                    console.log('Початок гри "Камінь-ножиці-папір":', data);
                    this.showRockPaperScissorsModal(data);
                });
                
                // Обмін місцями
                this.socket.on('positions_swapped', (data) => {
                    console.log('Обмін місцями:', data);
                    
                    // Знаходимо гравців в локальному масиві
                    const player1 = this.players.find(p => p.id === data.player1.id);
                    const player2 = this.players.find(p => p.id === data.player2.id);
                    
                    if (player1) {
                        player1.position = data.player1.position;
                        this.updatePawnPosition(player1);
                    }
                    
                    if (player2) {
                        player2.position = data.player2.position;
                        this.updatePawnPosition(player2);
                    }
                });

                // Нові міні-ігри
                this.socket.on('start_timed_text_quest', (data) => {
                    console.log('Початок PvP гри на швидкість:', data);
                    this.showTimedTextQuest(data);
                });

                this.socket.on('timed_text_quest_end', (data) => {
                    console.log('Кінець PvP гри на швидкість:', data);
                    this.endTimedTextQuest(data);
                });

                this.socket.on('collaborative_story_start', (data) => {
                    console.log('Початок спільної історії:', data);
                    this.showCollaborativeStory(data);
                });

                this.socket.on('collaborative_story_update', (data) => {
                    console.log('Оновлення спільної історії:', data);
                    this.updateCollaborativeStory(data);
                });

                this.socket.on('collaborative_story_end', (data) => {
                    console.log('Кінець спільної історії:', data);
                    this.endCollaborativeStory(data);
                });

                this.socket.on('creative_task_input', (data) => {
                    console.log('Творче завдання:', data);
                    this.showCreativeTaskInput(data);
                });

                this.socket.on('start_creative_submission', (data) => {
                    console.log('Початок творчого завдання для всіх:', data);
                    this.showCreativeSubmission(data);
                });

                this.socket.on('creative_writing_waiting', (data) => {
                    console.log('Очікування творчого завдання:', data);
                    this.showCreativeWritingWaiting(data);
                });

                this.socket.on('start_voting', (data) => {
                    console.log('🗳️ Клієнт отримав start_voting:', data);
                    console.log('🗳️ Мій ID:', this.playerId);
                    console.log('🗳️ Варіанти для голосування:', data.submissions.map(s => `${s.playerName}: ${s.text}`));
                    this.showVoting(data);
                });

                this.socket.on('creative_voting_end', (data) => {
                    console.log('🗳️ Клієнт отримав creative_voting_end:', data);
                    this.endCreativeVoting(data);
                });

                this.socket.on('mad_libs_question', (data) => {
                    console.log('Питання для "Хто, де, коли?":', data);
                    this.showMadLibsQuestion(data);
                });

                this.socket.on('mad_libs_waiting', (data) => {
                    console.log('Очікування в "Хто, де, коли?":', data);
                    this.showMadLibsWaiting(data);
                });

                this.socket.on('mad_libs_result', (data) => {
                    console.log('Результат "Хто, де, коли?":', data);
                    this.showMadLibsResult(data);
                });

                this.socket.on('webnovella_event', (data) => {
                    console.log('Подія вебновели:', data);
                    this.showWebNovellaEvent(data);
                });

                this.socket.on('webnovella_end', (data) => {
                    console.log('Кінець вебновели:', data);
                    this.endWebNovella(data);
                });
        
        // Реінкарнація гравця
        // Обробник для застосування бафів/дебафів
        this.socket.on('effect_applied', (data) => {
            console.log('Баф/Дебаф застосовано:', data);
            let message = '';
            
            if (data.effectType === 'hateClone') {
                message = `🎭 ${data.casterName} застосував "Кльон хейту" на ${data.targetName}! Його рух сповільнено.`;
                if (data.targetId === this.playerId) {
                    alert(`Співчуваємо, ${data.casterName} застосував на вас "Кльон хейту". Тепер Вас ненавидить кожен видатний педагог даної епохи! Ваше просування йде вдвічі повільніше.`);
                }
            } else if (data.effectType === 'happinessCharm') {
                message = `🍀 ${data.casterName} застосував на себе "Замовляння на щастє"! Його рух подвоєно.`;
                if (data.casterId === this.playerId) {
                    alert(`Вітаємо! Ви застосували "Замовляння на щастє". Тепер ваш шлях вдвічі швидший!`);
                }
            } else if (data.effectType === 'procrastination') {
                message = `⏳ ${data.casterName} застосував "Кльон прокрастинації" на ${data.targetName}! Він пропустить хід.`;
                if (data.targetId === this.playerId) {
                    alert(`Співчуваємо, ${data.casterName} застосував на вас "Кльон прокрастинації". Кидання кубику здається непосильним завданням, тому Ви пропускаєте наступний хід.`);
                }
            } else if (data.effectType === 'pushBack') {
                message = `💨 ${data.casterName} відкинув ${data.targetName} на ${data.moveAmount || 0} клітинок назад!`;
                if (data.targetId === this.playerId) {
                    alert(`Співчуваємо, ${data.casterName} використав проти вас "Порив вітру". Ви відкинуті на ${data.moveAmount || 0} клітинок назад!`);
                }
            } else if (data.effectType === 'boostForward') {
                message = `🚀 ${data.casterName} стрибнув у майбутнє на ${data.moveAmount || 0} клітинок вперед!`;
                if (data.casterId === this.playerId) {
                    alert(`Вітаємо! Ви використали "Стрибок у майбутнє" та перемістилися на ${data.moveAmount || 0} клітинок вперед!`);
                }
            }
            
            this.addChatMessage('system', message);
        });
        
        this.socket.on('player_reincarnated', (data) => {
            console.log('Реінкарнація гравця:', data);
            
            // Знаходимо гравця в локальному масиві
            const player = this.players.find(p => p.id === data.playerId);
            if (player) {
                // Оновлюємо клас гравця та очки
                player.class = data.newClass;
                player.points += data.bonusPoints;
                
                // Оновлюємо інформацію про гравця
                this.updatePlayerInfo();
                this.updateLeaderboard();
                
                console.log(`${player.name} реінкарнувався в епоху ${data.newEpoch} як ${data.newClass.name}`);
            }
        });
        
        // Обробник для відображення класу при реінкарнації
        this.socket.on('show_reincarnation_class', (data) => {
            console.log('Показ класу після реінкарнації:', data);
            if (data.playerId === this.playerId && data.newClass) {
                // Використовуємо нове модальне вікно V2 і показуємо бонусні очки
                const payload = { newClass: data.newClass, points: data.bonusPoints || 0 };
                this.showReincarnationModal(payload, false);
            }
        });
        
        // Обробник для раннього переродження
        this.socket.on('early_reincarnation_event', (data) => {
            console.log('Раннє переродження:', data);
            if (data.playerId === this.playerId) {
                // Оновлюємо клас гравця в локальному масиві
                const player = this.players.find(p => p.id === this.playerId);
                if (player && data.newClass) {
                    player.class = data.newClass;
                }
                this.showReincarnationModal(data, false);
            }
        });
        
        this.socket.on('quest_vote', (data) => {
            this.handleQuestVote(data);
        });
        
        this.socket.on('chat_message', (data) => {
            this.addChatMessage(data.type, data.message, data.player);
        });
        
        this.socket.on('game_ended', (data) => {
            this.handleRemoteGameEnd(data);
        });
        
        this.socket.on('player_eliminated', (data) => {
            this.handlePlayerElimination(data);
        });
        
        this.socket.on('tournament_ended', (data) => {
            this.handleTournamentEnd(data);
        });
        
        this.socket.on('game_started', (data) => {
            console.log('Гра почалася:', data);
            
            try {
                this.players = data.players;
                this.currentPlayerIndex = data.currentPlayerIndex;
                this.gameActive = true;
                
                // Показуємо модальне вікно вибору аватарів
                this.showAvatarSelectionModal();
            } catch (error) {
                console.error('Помилка в обробнику game_started:', error);
                alert('Помилка при запуску гри. Спробуйте перезавантажити сторінку.');
            }
        });
    }
    
    updateConnectionStatus(connected, text) {
        this.statusIndicator.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
        this.statusText.textContent = text;
    }
    
    createRoom() {
        const customRoomCode = this.customRoomCodeInput.value.trim();
        const playerName = this.playerNameInput.value.trim();
        
        console.log('Створюємо кімнату:', { customRoomCode, playerName });
        
        if (!customRoomCode || !playerName) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        
        // Перевіряємо, чи код містить тільки цифри
        if (!/^\d+$/.test(customRoomCode)) {
            alert('Код кімнати повинен містити тільки цифри');
            return;
        }
        
        console.log('Відправляємо подію create_room');
        this.socket.emit('create_room', {
            customRoomCode,
            playerName,
            playerId: this.playerId
        });
    }
    
    joinRoom() {
        const roomCode = this.roomCodeInput.value.trim();
        const playerName = this.joinPlayerNameInput.value.trim();
        
        if (!roomCode || !playerName) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        
        this.socket.emit('join_room', {
            roomCode,
            playerName,
            playerId: this.playerId
        });
    }
    
    leaveRoom() {
        if (confirm('Ви впевнені, що хочете покинути кімнату?')) {
            this.socket.emit('leave_room', { roomId: this.roomId });
            
            // Повертаємося до вибору режиму
            this.onlinePanel.classList.add('hidden');
            this.modeSelection.classList.remove('hidden');
            this.leaveRoomBtn.classList.add('hidden');
            
            // Очищуємо дані
            this.roomId = null;
            this.isHost = false;
            this.isSpectator = false;
            this.players = [];
            this.spectators = [];
            this.gameActive = false;
            this.currentPlayerIndex = 0;
            
            // Очищуємо поля вводу
            if (this.roomNameInput) this.roomNameInput.value = '';
            if (this.playerNameInput) this.playerNameInput.value = '';
            if (this.roomCodeInput) this.roomCodeInput.value = '';
            if (this.joinPlayerNameInput) this.joinPlayerNameInput.value = '';
            
            // Очищуємо списки
            if (this.playersContainer) this.playersContainer.innerHTML = '';
            if (this.chatMessages) this.chatMessages.innerHTML = '';
            
            // Приховуємо панелі
            if (this.playersList) this.playersList.classList.add('hidden');
            if (this.chatContainer) this.chatContainer.classList.add('hidden');
            if (this.roomCodeDisplay) this.roomCodeDisplay.classList.add('hidden');
            if (this.startGameSection) this.startGameSection.classList.add('hidden');
        }
    }
    
    updatePlayersList(players) {
        this.playersContainer.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <div class="flex items-center gap-2">
                    <img src="${player.avatarUrl || 'image/chips/avatar1.png'}" class="w-8 h-8 rounded-full border-2 border-gray-500">
                    <div style="color: ${player.color};">${player.name}</div>
                </div>
                <div class="text-sm text-gray-400">${player.class?.name || 'Очікує...'}</div>
                <div class="text-sm">${player.points || 0} ОО</div>
            `;
            
            if (player.id === this.playerId) {
                playerCard.classList.add('current-player');
            }
            
            this.playersContainer.appendChild(playerCard);
        });
        
        // Додаємо спектаторів
        this.spectators.forEach(spectator => {
            const spectatorCard = document.createElement('div');
            spectatorCard.className = 'player-card spectator';
            spectatorCard.innerHTML = `
                <div>👁️ ${spectator.name}</div>
                <div class="text-sm text-gray-400">Спектатор</div>
            `;
            this.playersContainer.appendChild(spectatorCard);
        });
        
        // Показуємо кнопку "Почати гру" якщо є хоча б 2 гравці і ми хост
        if (players.length >= 2 && this.isHost && this.startGameSection) {
            this.startGameSection.classList.remove('hidden');
        } else if (this.startGameSection) {
            this.startGameSection.classList.add('hidden');
        }
    }
    
    showPlayersList() {
        // Тепер не потрібно, оскільки все в одній панелі lobby-section
    }
    
    showChat() {
        // Тепер не потрібно, оскільки все в одній панелі lobby-section
    }
    
    showRoomCode(roomCode) {
        console.log('Показуємо код кімнати:', roomCode);
        
        // Простий спосіб - показуємо alert
        alert(`Код кімнати: ${roomCode}`);
        
        if (this.roomCodeDisplay && this.roomCodeText) {
            this.roomCodeText.textContent = roomCode;
            this.roomCodeDisplay.classList.remove('hidden');
            
            if (this.copyRoomCodeBtn) {
                this.copyRoomCodeBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(roomCode).then(() => {
                        if (window.gameUI) {
                            window.gameUI.showNotification('Код скопійовано!', 'success');
                        }
                    });
                });
            }
        } else {
            console.error('Не знайдено елементи для відображення коду кімнати');
        }
    }
    
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        this.socket.emit('chat_message', {
            message,
            playerId: this.playerId,
            roomId: this.roomId
        });
        
        this.chatInput.value = '';
    }
    
    addChatMessage(type, message, player = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        let prefix = '';
        if (type === 'player' && player) {
            prefix = `${player.name}: `;
        } else if (type === 'system') {
            prefix = '[Система] ';
        } else if (type === 'spectator' && player) {
            prefix = `[Спектатор] ${player.name}: `;
        }
        
        messageDiv.textContent = prefix + message;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Перевизначення методів для мультиплеєру
    initializeGame() {
        if (this.isOnlineMode) {
            // Відтворюємо звук початку гри
            this.playStartGameSound();
            // В онлайн режимі гра ініціалізується сервером
            this.socket.emit('start_game', { roomId: this.roomId });
        } else {
            // Локальний режим
            super.initializeGame();
        }
    }
    
    // Початок онлайн гри
    startOnlineGame() {
        if (this.isHost && this.roomId) {
            console.log('Починаємо онлайн гру, roomId:', this.roomId);
            console.log('Socket connected:', this.socket?.connected);
            console.log('Players count:', this.players?.length);
            
            if (!this.socket || !this.socket.connected) {
                console.error('Socket не підключений!');
                alert('Помилка підключення до сервера. Спробуйте перезавантажити сторінку.');
                return;
            }
            
            this.socket.emit('start_game', { roomId: this.roomId });
            
            // Показуємо кнопку режиму тесту для хоста
            if (this.testModeBtn) {
                this.testModeBtn.classList.remove('hidden');
            }
        } else {
            console.error('Не можу почати гру:', {
                isHost: this.isHost,
                roomId: this.roomId,
                socket: !!this.socket
            });
        }
    }
    
    // Вхід в режим тестування
    enterTestMode() {
        console.log('Входимо в режим тестування');
        
        // Додаємо обробник кліків на клітинки
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach((cell, index) => {
            cell.style.cursor = 'pointer';
            cell.classList.add('test-mode-cell');
            
            cell.addEventListener('click', this.handleTestModeCellClick.bind(this), { once: false });
        });
    }
    
    // Вихід з режиму тестування
    exitTestMode() {
        console.log('Вихід з режиму тестування');
        
        // Видаляємо обробники кліків на клітинки
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.style.cursor = '';
            cell.classList.remove('test-mode-cell');
            
            // Створюємо новий елемент для видалення обробника
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
        });
    }
    
    // Обробка кліку на клітинку в режимі тестування
    handleTestModeCellClick(event) {
        const cell = event.target.closest('.board-cell');
        if (!cell) return;
        
        const cellNumber = parseInt(cell.id.replace('cell-', ''));
        console.log('Клікнуто на клітинку в режимі тестування:', cellNumber);
        
        // Отримуємо дані про клітинку з server.js SPECIAL_CELLS
        // Тут потрібно буде завантажити дані про події
        this.testEventOnCell(cellNumber);
    }
    
    // Тестування події на конкретній клітинці
    /**
     * [TEST MODE] Надсилає запит на сервер для запуску події на клітинці.
     * Сервер обробить запит і розішле подію всім гравцям.
     */
    testEventOnCell(cellNumber) {
        console.log(`[TEST MODE] Відправка запиту на сервер для клітинки: ${cellNumber}`);
        
        if (!this.socket || !this.socket.connected) {
            alert('Помилка: Немає з\'єднання з сервером для тестування.');
            return;
        }

        // Відправляємо запит на сервер
        // Сервер використає "source of truth" (specialCells.js)
        // і розішле подію всім гравцям,
        // симулюючи природний хід гри (включаючи анімацію руху)
        this.socket.emit('test_trigger_event', { 
            roomId: this.roomId, 
            cellNumber: parseInt(cellNumber)
        });

        // Більше нічого не потрібно на клієнті
        // Вся логіка тепер на сервері
    }
    
    // Перевизначення методу завершення гри для мультиплеєру
    endGame(winner, customMessage = "") {
        if (this.isOnlineMode) {
            // В онлайн режимі відправляємо подію на сервер
            this.socket.emit('player_won', {
                roomId: this.roomId,
                playerId: winner?.id,
                message: customMessage
            });
        } else {
            // Локальний режим
            super.endGame(winner, customMessage);
        }
    }
    
    // Обробка вибування гравця
    handlePlayerElimination(data) {
        const eliminatedPlayer = this.players.find(p => p.id === data.playerId);
        if (!eliminatedPlayer) return;
        
        eliminatedPlayer.hasWon = true;
        eliminatedPlayer.finalPosition = data.position;
        
        
        // Оновлюємо інтерфейс
        this.updatePlayerInfo();
        this.updateDiceButtonState();
        
        // Перевіряємо, чи залишилися активні гравці
        const activePlayers = this.players.filter(p => !p.hasWon && !p.hasLost);
        if (activePlayers.length <= 1) {
            // Гра закінчена
            this.handleGameEnd();
        }
    }
    
    // Обробка завершення всієї гри
    handleGameEnd() {
        const sortedPlayers = this.players
            .filter(p => p.hasWon || p.hasLost)
            .sort((a, b) => {
                if (a.hasWon && !b.hasWon) return -1;
                if (!a.hasWon && b.hasWon) return 1;
                return (b.points || 0) - (a.points || 0);
            });
        
        let message = "🏆 Турнір завершено!\n\n";
        sortedPlayers.forEach((player, index) => {
            const position = index + 1;
            const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "🏅";
            message += `${medal} ${position} місце: ${player.name} (${player.points || 0} ОО)\n`;
        });
        
        
        // Показуємо фінальне модальне вікно
        this.showFinalResults(sortedPlayers);
    }
    
    // Показуємо фінальні результати
    showFinalResults(sortedPlayers) {
        const resultsHTML = `
            <h2 class="text-4xl font-bold text-yellow-400 mb-6">🏆 Турнір завершено!</h2>
            <div class="space-y-4 mb-6">
                ${sortedPlayers.map((player, index) => {
                    const position = index + 1;
                    const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "🏅";
                    return `
                        <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">${medal}</span>
                                <span class="text-xl font-semibold" style="color: ${player.color};">${player.name}</span>
                            </div>
                            <span class="text-lg text-yellow-300">${player.points || 0} ОО</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <button id="restart-tournament-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-xl">
                Новий турнір
            </button>
        `;
        
        if (window.gameUI) {
            window.gameUI.showQuestModal('Результати турніру', resultsHTML, [], null);
            
            setTimeout(() => {
                const restartBtn = document.getElementById('restart-tournament-btn');
                if (restartBtn) {
                    restartBtn.addEventListener('click', () => {
                        location.reload();
                    });
                }
            }, 100);
        }
    }
    
    // Обробка завершення турніру з сервера
    handleTournamentEnd(data) {
        this.showFinalResults(data.finalPositions);
    }
    
    // Показуємо ігровий інтерфейс
    showGameInterface() {
        // Показуємо ігровий контейнер
        if (this.gameContainer) {
            this.gameContainer.classList.remove('hidden');
        }
        
        // Приховуємо онлайн панель
        if (this.onlinePanel) {
            this.onlinePanel.classList.add('hidden');
        }
        
        // Приховуємо вибір режиму
        if (this.modeSelection) {
            this.modeSelection.classList.add('hidden');
        }
        
        // Створюємо ігрову дошку
        this.createBoard();
        
        // Встановлюємо правильний масштаб карти
        setTimeout(() => {
            this.setInitialScale();
            this.applyTransform();
            console.log('Масштаб карти встановлено');
        }, 100);
        
        // Встановлюємо адаптивний масштаб гри
        if (typeof this.updateGameScale === 'function') {
            this.updateGameScale();
        }
        
        console.log('Ігровий інтерфейс показано');
        this.updateDiceButtonState();
    }

    // Вмикаємо/вимикаємо кнопку кидка кубика залежно від черги
    updateDiceButtonState() {
        if (!this.isOnlineMode || !this.rollDiceBtn) return;
        
        // Перевірка на наявність гравців та поточного гравця
        if (!this.players || this.players.length === 0) {
            this.rollDiceBtn.disabled = true;
            this.rollDiceBtn.style.opacity = '0.5';
            this.rollDiceBtn.style.cursor = 'not-allowed';
            return;
        }
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer) {
            this.rollDiceBtn.disabled = true;
            this.rollDiceBtn.style.opacity = '0.5';
            this.rollDiceBtn.style.cursor = 'not-allowed';
            return;
        }
        
        // Перевірка чи це мій хід
        const isMyTurn = currentPlayer.id === this.playerId && this.gameActive;
        
        console.log('updateDiceButtonState:', {
            currentPlayer: currentPlayer?.name,
            currentPlayerId: currentPlayer?.id,
            myPlayerId: this.playerId,
            isMyTurn,
            gameActive: this.gameActive
        });
        
        // Встановлюємо стан кнопки
            this.rollDiceBtn.disabled = !isMyTurn;
            this.rollDiceBtn.style.opacity = isMyTurn ? '1' : '0.5';
            this.rollDiceBtn.style.cursor = isMyTurn ? 'pointer' : 'not-allowed';
            
        // Оновлюємо текст кнопки (нова структура має span всередині)
        const spanEl = this.rollDiceBtn.querySelector('span');
            if (isMyTurn) {
            if (spanEl) {
                spanEl.textContent = 'Ваш хід - Кинути кубик';
            } else {
                this.rollDiceBtn.textContent = 'Кинути кубик';
            }
            // Оновлюємо стиль кнопки для активного стану
            this.rollDiceBtn.style.backgroundColor = '';
            this.rollDiceBtn.classList.remove('disabled');
        } else {
            if (spanEl) {
                spanEl.textContent = `Не ваш хід - Хід гравця ${currentPlayer?.name || 'Невідомо'}`;
            } else {
                this.rollDiceBtn.textContent = `Хід: ${currentPlayer?.name || 'Невідомо'}`;
            }
            // Встановлюємо сірий фон для неактивного стану
            this.rollDiceBtn.style.backgroundColor = '#6b7280';
        }
    }
    
    // Оновлюємо інформацію про гравця
    updatePlayerInfo() {
        if (this.players && this.players.length > 0) {
            const currentPlayer = this.players[this.currentPlayerIndex];
            
            // Оновлюємо інформацію про поточного гравця
            const currentPlayerNameEl = document.getElementById('current-player-name');
            const currentPlayerClassEl = document.getElementById('current-player-class');
            const currentPlayerPointsEl = document.getElementById('current-player-points');
            const currentPlayerAvatarEl = document.getElementById('current-player-avatar');
            
            if (currentPlayerNameEl) {
                const isMyTurn = this.isOnlineMode && currentPlayer && currentPlayer.id === this.playerId;
                const turnIndicator = isMyTurn ? '🎯 ' : '⏳ ';
                currentPlayerNameEl.textContent = `${turnIndicator}${currentPlayer.name}`;
                currentPlayerNameEl.style.color = currentPlayer.color;
            }
            
            if (currentPlayerClassEl) {
                currentPlayerClassEl.textContent = currentPlayer.class?.name || 'Не обрано';
            }
            
            if (currentPlayerPointsEl) {
                // В новій структурі ОО вже є в HTML, просто число
                const pointsSpan = currentPlayerPointsEl.querySelector('span');
                if (pointsSpan) {
                    pointsSpan.textContent = currentPlayer.points || 0;
                } else {
                    currentPlayerPointsEl.textContent = currentPlayer.points || 0;
                }
            }
            
            // Оновлюємо аватар
            if (currentPlayerAvatarEl && currentPlayer.name) {
                const firstLetter = currentPlayer.name.charAt(0).toUpperCase();
                const avatarColor = currentPlayer.color || '#7e22ce';
                // Створюємо URL для аватару з початковою літерою та кольором
                const rgbColor = this.hexToRgb(avatarColor) || { r: 126, g: 34, b: 206 };
                currentPlayerAvatarEl.src = `https://placehold.co/48x48/${rgbColor.r.toString(16).padStart(2, '0')}${rgbColor.g.toString(16).padStart(2, '0')}${rgbColor.b.toString(16).padStart(2, '0')}/ffffff?text=${encodeURIComponent(firstLetter)}`;
            }
            
            // Оновлюємо таблицю лідерів
            this.updateLeaderboard();
        }
    }
    
    // Допоміжна функція для конвертації hex в RGB
    hexToRgb(hex) {
        if (!hex) return null;
        // Видаляємо # якщо є
        hex = hex.replace('#', '');
        // Обробка скорочених форм (#FFF -> #FFFFFF)
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // Оновлюємо таблицю лідерів
    updateLeaderboard() {
        const leaderboardEl = document.getElementById('leaderboard');
        if (!leaderboardEl || !this.players) return;
        
        const sortedPlayers = this.players
            .filter(p => !p.hasLost)
            .sort((a, b) => (b.points || 0) - (a.points || 0));
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        const currentPlayerId = currentPlayer ? currentPlayer.id : null;
        
        // Зберігаємо заголовок "Таблиця лідерів", якщо він існує
        const headerEl = leaderboardEl.querySelector('.cp-header');
        const headerHTML = headerEl ? headerEl.outerHTML : '<div class="cp-header text-purple-400">Таблиця лідерів</div>';
        
        leaderboardEl.innerHTML = headerHTML + sortedPlayers.map((p) => {
            const isActive = p.id === currentPlayerId;
            const firstLetter = p.name.charAt(0).toUpperCase();
            const rgbColor = this.hexToRgb(p.color) || { r: 126, g: 34, b: 206 };
            const avatarUrl = `https://placehold.co/24x24/${rgbColor.r.toString(16).padStart(2, '0')}${rgbColor.g.toString(16).padStart(2, '0')}${rgbColor.b.toString(16).padStart(2, '0')}/ffffff?text=${encodeURIComponent(firstLetter)}`;
            
            return `
                <div class="cp-leaderboard-item ${isActive ? 'active-player' : ''} bg-black bg-opacity-20">
                    <div class="flex items-center">
                        <img src="${avatarUrl}" alt="${p.name} Avatar">
                        <span class="cp-leaderboard-item-name text-gray-300">${p.name}</span>
                </div>
                    <span class="cp-leaderboard-item-points text-yellow-400">${p.points || 0} ОО</span>
                </div>
        `;
        }).join('');
    }
    
    rollTheDice() {
        console.log('rollTheDice викликано:', {
            isOnlineMode: this.isOnlineMode,
            isHost: this.isHost,
            gameActive: this.gameActive,
            currentPlayerIndex: this.currentPlayerIndex,
            players: this.players?.length,
            myPlayerId: this.playerId,
            currentPlayer: this.players?.[this.currentPlayerIndex]
        });
        
        // Відтворюємо звук кидка кубика
        this.playDiceSound();
        
        if (this.isOnlineMode) {
            // В онлайн режимі тільки поточний гравець може кидати кубик
            const currentPlayer = this.players[this.currentPlayerIndex];
            const isCurrentPlayer = currentPlayer && currentPlayer.id === this.playerId;
            
            console.log('Перевірка можливості кинути кубик:', {
                isCurrentPlayer,
                currentPlayerId: currentPlayer?.id,
                myPlayerId: this.playerId,
                gameActive: this.gameActive,
                currentPlayerName: currentPlayer?.name
            });
            
            if (isCurrentPlayer && this.gameActive) {
                console.log('Відправляємо подію roll_dice');
                this.socket.emit('roll_dice', { roomId: this.roomId });
            } else {
                console.log('Не можна кинути кубик:', {
                    isCurrentPlayer,
                    gameActive: this.gameActive,
                    reason: !isCurrentPlayer ? 'Не ваш хід' : 'Гра не активна'
                });
                
                // Показуємо повідомлення користувачу
                if (!isCurrentPlayer) {
                } else {
                    console.log('Гравець може кинути кубик - це його хід');
                }
            }
        } else {
            // Локальний режим
            super.rollTheDice();
        }
    }
    
    handleRemoteDiceRoll(data) {
        console.log('handleRemoteDiceRoll викликано:', data);
        const player = this.players.find(p => p.id === data.playerId);
        if (!player) {
            console.log('Гравець не знайдений для dice_rolled');
            return;
        }
        
        console.log('Обробляємо кидання кубика для гравця:', player.name);
        
        this.rollDiceBtn.disabled = true;
        
        // Відтворюємо звук кидка кубика
        this.playDiceSound();
        
        const rotations = {
            1: 'rotateY(0deg)',
            2: 'rotateY(-90deg)',
            3: 'rotateY(-180deg)',
            4: 'rotateY(90deg)',
            5: 'rotateX(-90deg)',
            6: 'rotateX(90deg)'
        };
        
        this.diceInner.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
        setTimeout(() => {
            this.diceInner.style.transform = `${rotations[data.roll]} translateZ(42.5px)`;
            this.movePlayer(player, data.move);
        }, 1000);
        
        
        // Не оновлюємо кнопку тут - оновимо після turn_changed
    }
    
    handleRemotePlayerMove(data) {
        const player = this.players.find(p => p.id === data.playerId);
        if (!player) return;
        
        player.position = data.position;
        this.updatePawnPosition(player);
    }
    
    handleSpecialCell(player, cellData) {
        // Позначаємо клітинку як використану
        this.usedEventCells.add(player.position);
        console.log(`📍 Клітинка ${player.position} позначена як використана (мультиплеєр)`);
        
        // Позначаємо тип події як використаний (крім обхідних доріг та реінкарнації)
        if (cellData.type !== 'alternative-path' && cellData.type !== 'reincarnation') {
            this.usedEventTypes.add(cellData.type);
            console.log(`🎭 Тип події ${cellData.type} позначений як використаний (мультиплеєр)`);
        }
        
        if (this.isOnlineMode) {
            // В онлайн режимі відправляємо подію на сервер
            this.socket.emit('player_on_event', {
                roomId: this.roomId,
                playerId: player.id,
                eventType: cellData.type,
                eventData: cellData
            });
        } else {
            // В локальному режимі використовуємо базову логіку
            super.handleSpecialCell(player, cellData);
        }
    }
    
    handleDiceResult(data) {
        console.log('Обробляємо результат кидання кубика:', data);
        const player = this.players.find(p => p.id === data.playerId);
        if (!player) {
            console.error('Гравець не знайдений для dice_result');
            return;
        }
        
        // Показуємо анімацію кубика
        this.rollDiceBtn.disabled = true;
        
        // Відтворюємо звук кидка кубика для всіх гравців
        this.playDiceSound();
        
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
            this.diceInner.style.transform = `${rotations[data.roll]} translateZ(40px)`;
            
            // Використовуємо плавну анімацію руху
            const oldPosition = Math.max(0, data.newPosition - data.move);
            await this.animatePawnMovement(player, oldPosition, data.newPosition, data.move);
            
            // Оновлюємо позицію гравця
            player.position = data.newPosition;
            
            // Оновлюємо очки та клас гравця (якщо є)
            if (data.newPoints !== undefined) {
                player.points = data.newPoints;
            }
            if (data.newClass !== undefined) {
                player.class = data.newClass;
            }
            
            // Після завершення анімації перевіряємо події
            if (data.eventInfo && data.eventInfo.hasEvent) {
                console.log('Подія виявлена після завершення анімації:', data.eventInfo);
                
                // Для спеціальних типів подій (pvp, creative, webnovella, mad-libs) відправляємо на сервер
                if (data.eventInfo.eventType === 'pvp-quest' || data.eventInfo.eventType === 'creative-quest' || 
                    data.eventInfo.eventType === 'webnovella-quest' || data.eventInfo.eventType === 'mad-libs-quest') {
                    // Відправляємо подію на сервер для обробки
                    this.socket.emit('player_on_event', {
                        roomId: this.roomId,
                        playerId: data.playerId,
                        eventType: data.eventInfo.eventType,
                        eventData: data.eventInfo.eventData,
                        cellNumber: player.position
                    });
                } else {
                    // Для всіх інших типів подій показуємо модальне вікно
                    console.log('Показуємо модальне вікно для типу події:', data.eventInfo.eventType);
                this.showEventPrompt({
                    playerId: data.eventInfo.playerId,
                    playerName: data.eventInfo.playerName,
                    eventType: data.eventInfo.eventType,
                    eventData: data.eventInfo.eventData,
                    activePlayerId: data.eventInfo.playerId
                });
                }
            }
            
        }, 1000);
    }
    
    handleTurnUpdate(data) {
        console.log('Обробляємо оновлення черги:', data);
        console.log('Старий currentPlayerIndex:', this.currentPlayerIndex);
        this.currentPlayerIndex = data.currentPlayerIndex;
        console.log('Новий currentPlayerIndex:', this.currentPlayerIndex);
        
        // Перевіряємо, чи я поточний гравець
        const isMyTurn = data.currentPlayerId === this.playerId;
        console.log('Це мій хід?', isMyTurn, 'Мій ID:', this.playerId, 'Поточний ID:', data.currentPlayerId);
        
        this.updatePlayerInfo();
        this.updateDiceButtonState();
        
    }
    
    showEventPrompt(data) {
        console.log('Показуємо подію всім гравцям:', data);
        const isMyEvent = data.playerId === this.playerId;
        
        let modalContent = '';
        let buttons = [];
        
        if (data.eventType === 'portal') {
            modalContent = `
                <h3 class="text-2xl font-bold mb-4">Таємний портал!</h3>
                <p class="mb-4">${data.playerName} потрапив на таємний портал!</p>
                <p class="mb-4">Ризикнути та стрибнути на клітинку ${data.eventData.target} за ${data.eventData.cost} ОО?</p>
            `;
            
            if (isMyEvent) {
                buttons = [
                    { text: 'Так', callback: () => this.makeEventChoice('yes', data.eventType, data.eventData) },
                    { text: 'Ні', callback: () => this.makeEventChoice('no', data.eventType, data.eventData) }
                ];
            } else {
                buttons = [
                    { text: 'Очікуємо вибору...', callback: () => {}, disabled: true }
                ];
            }
        } else if (data.eventType === 'early-reincarnation') {
            // Раннє переродження - показуємо спеціальне вікно через early_reincarnation_event
            // Це вікно буде показано сервером через socket.on('early_reincarnation_event')
            return;
        } else if (data.eventType === 'reincarnation') {
            modalContent = `
                <h3 class="text-2xl font-bold mb-4">🔄 Реінкарнація!</h3>
                <p class="mb-4">Ви завершили епоху та готові до нової зустрічі з викликами!</p>
                <p class="mb-4">Ви отримуєте ${data.eventData.points} ОО та переходите до наступної епохи.</p>
            `;
            
            // Завжди одна кнопка для реінкарнації
                buttons = [
                { text: 'Ай, шайтаан, знову помер. Відроджуємось та йдемо далі!', callback: () => this.makeEventChoice('yes', data.eventType, data.eventData) }
            ];
            
            // Показуємо модальне вікно для реінкарнації
            this.showQuestModal('Реінкарнація', modalContent, buttons, null);
            return;
        } else if (data.eventType === 'machine-uprising') {
            const cost = data.eventData.cost;
            modalContent = `
                <h3 class="text-2xl font-bold mb-4 text-red-500">🚨 Повстання машин! 🚨</h3>
                <p class="mb-2">Найкращий друг людства кілька століть поспіль зрадив Вас!</p>
                <p class="mb-4">Відкупіться від штучного інтелекту знаннями, які Ви здобули протягом гри, або загиньте!</p>
                <p class="mb-6 font-bold text-yellow-300">Вартість відкупу: ${cost} ОО</p>
            `;
            
            if (isMyEvent) {
                const currentPlayer = this.players[this.currentPlayerIndex];
                const canPay = currentPlayer && currentPlayer.points >= cost;
                buttons = [
                    { text: `💰 Відкупитися (${cost} ОО)`, callback: () => this.makeEventChoice('pay', data.eventType, data.eventData), disabled: !canPay },
                    { text: '💀 Відмовитися', callback: () => this.makeEventChoice('refuse', data.eventType, data.eventData) }
                ];
            } else {
                buttons = [
                    { text: 'Очікуємо вибору...', callback: () => {}, disabled: true }
                ];
            }
            
            // Показуємо модальне вікно
            this.showQuestModal('Повстання машин', modalContent, buttons, null);
            return;
        } else if (data.eventType === 'alternative-path') {
            // Використовуємо glassmorphism дизайн для обхідної дороги
            document.body.classList.add('glassmorphism-bg');
            
            // Визначаємо епоху на основі клітинки для правильного визначення ціни
            const cellNumber = data.eventData.cellNumber || 5;
            let epoch = 1;
            if (cellNumber <= 12) epoch = 1;
            else if (cellNumber <= 22) epoch = 2;
            else if (cellNumber <= 42) epoch = 3;
            else if (cellNumber <= 75) epoch = 4;
            else if (cellNumber <= 97) epoch = 5;
            
            // Визначаємо ціну залежно від епохи
            // Ціни за епохами: 1 - 20 ОО, 2 - 12 ОО, 3 - 24 ОО, 4 - 40 ОО, 5 - 40 ОО
            const epochCosts = { 1: 20, 2: 12, 3: 24, 4: 40, 5: 40 };
            const cost = epochCosts[epoch] || data.eventData.cost || 20;
            
            const newDescription = `Вумний в гору не піде, вумний гору обійде!
Ви маєте можливість не лише записатись до клубу розумників, а й полегшити своє життя. Але пам'ятайте: дороги навпростець не бувають легкими та безкоштовними! Оплатіть ${cost} ОО за упаковку психотропних речовин.`;
            
            const modalHTML = `
                <div class="glassmorphism-modal" id="bypass-road-modal">
                    <div class="glassmorphism-content-bypass">
                        <div class="glassmorphism-header">
                            <h2>🛤️ Обхідна дорога!</h2>
                            <p class="mb-4">${newDescription}</p>
                        </div>
                        
                        <div class="glassmorphism-spacer"></div>
                        
                        <div class="glassmorphism-actions">
                            ${isMyEvent ? `
                                <button class="glassmorphism-btn-primary" id="bypass-yes-btn">
                                    Так, обійти (${cost} ОО)
                                </button>
                                <button class="glassmorphism-btn-secondary" id="bypass-no-btn">
                                    Ні, йти далі
                                </button>
                            ` : `
                                <button class="glassmorphism-btn-secondary" disabled>
                                    Очікуємо вибору...
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
            
            // Видаляємо існуюче модальне вікно, якщо є
            const existingModal = document.getElementById('bypass-road-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Додаємо нове модальне вікно
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Додаємо обробники подій
            if (isMyEvent) {
                setTimeout(() => {
                    const yesBtn = document.getElementById('bypass-yes-btn');
                    const noBtn = document.getElementById('bypass-no-btn');
                    
                    if (yesBtn) {
                        yesBtn.addEventListener('click', () => {
                            const modal = document.getElementById('bypass-road-modal');
                            if (modal) {
                                modal.remove();
                                document.body.classList.remove('glassmorphism-bg');
                            }
                            // Оновлюємо cost в eventData перед відправкою
                            const updatedEventData = { ...data.eventData, cost: cost };
                            this.makeEventChoice('yes', data.eventType, updatedEventData);
                        });
                    }
                    
                    if (noBtn) {
                        noBtn.addEventListener('click', () => {
                            const modal = document.getElementById('bypass-road-modal');
                            if (modal) {
                                modal.remove();
                                document.body.classList.remove('glassmorphism-bg');
                            }
                            this.makeEventChoice('no', data.eventType, data.eventData);
                        });
                    }
                }, 100);
            }
            
            return; // Виходимо, щоб не показувати стандартне модальне вікно
        } else if (data.eventType === 'test-question') {
            // Показуємо тестове завдання всім гравцям
            this.showTestQuestionForAll(data);
            return; // Виходимо, щоб не показувати стандартне модальне вікно
        } else if (data.eventType === 'pvp-quest' || data.eventType === 'creative-quest' || data.eventType === 'webnovella-quest' || data.eventType === 'mad-libs-quest') {
            // Ці події обробляються через socket.on обробники
            // Але клієнт має вже був відправити player_on_event на сервер
            console.log('Події pvp/creative/webnovella/mad-libs будуть оброблені сервером через socket.on');
            // Не показуємо загальне модальне вікно
            return;
        } else {
            console.warn('Необроблений тип події:', data.eventType, data);
            // Якщо modalContent порожній, не показуємо вікно
            if (modalContent || buttons.length > 0) {
        this.showQuestModal('Подія', modalContent, buttons, 'image/modal_window/bypass_road.png');
            } else {
                console.log('modalContent порожній, не показуємо вікно для типу:', data.eventType);
            }
        }
    }
    
    makeEventChoice(choice, eventType, eventData) {
        console.log('Відправляємо вибір події:', choice);
        this.socket.emit('event_choice_made', {
            roomId: this.roomId,
            choice,
            eventType,
            eventData
        });
        this.questModal.classList.add('hidden');
    }
    
    // Показ тестового завдання всім гравцям
    showTestQuestionForAll(data) {
        const questionData = window.TEST_QUESTIONS[data.eventData.cellNumber];
        if (!questionData) {
            console.error(`Тестове завдання для клітинки ${data.eventData.cellNumber} не знайдено`);
            return;
        }

        const isMyEvent = data.playerId === this.playerId;

        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">📝 Тестове завдання</h3>
            <p class="mb-4 text-sm text-gray-600">${data.playerName} потрапив на тестове завдання!</p>
            <p class="mb-4 text-lg">${questionData.question}</p>
            <div class="space-y-3">
        `;

        // Додаємо варіанти відповідей
        Object.entries(questionData.options).forEach(([key, value]) => {
            modalContent += `
                <button class="w-full p-3 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors test-option-btn" data-answer="${key}">
                    <span class="font-bold">${key})</span> ${value}
                </button>
            `;
        });

        modalContent += `
            </div>
            <div class="mt-4 text-center">
                <button class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Закрити
                </button>
            </div>
        `;

        this.showQuestModal('Тестове завдання', modalContent, [], null);

        // Додаємо обробники для кнопок відповідей
        if (isMyEvent) {
            setTimeout(() => {
                document.querySelectorAll('.test-option-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const selectedAnswer = e.currentTarget.dataset.answer;
                        
                        // Відправляємо відповідь на сервер
                        this.socket.emit('test_answer', {
                            roomId: this.roomId,
                            cellNumber: data.eventData.cellNumber,
                            answer: selectedAnswer
                        });
                        
                        // Закриваємо модальне вікно з тестом
                        const modal = document.getElementById('quest-modal');
                        if (modal) {
                            modal.classList.add('hidden');
                        }
                    });
                });
            }, 100);
        }
    }
    
    handleEventResult(data) {
        console.log('Обробляємо результат події:', data);
        
        // Оновлюємо позицію та очки гравця
        const player = this.players.find(p => p.id === data.playerId);
        if (player) {
            // Плавно переміщуємо фішку на нову позицію
            this.updatePawnPosition(player);
            player.position = data.newPosition;
            player.points = data.newPoints;
        }
        
        // Показуємо повідомлення всім
        this.addChatMessage('system', data.resultMessage);
        
        // Закриваємо модальне вікно для всіх гравців
        this.questModal.classList.add('hidden');
        
        // Закриваємо glassmorphism модальне вікно обхідної дороги
        const bypassModal = document.getElementById('bypass-road-modal');
        if (bypassModal) {
            bypassModal.remove();
            document.body.classList.remove('glassmorphism-bg');
        }
        
        // Закриваємо glassmorphism модальне вікно педагобота
        const pedagogobotModal = document.getElementById('pedagogobot-modal');
        if (pedagogobotModal) {
            pedagogobotModal.remove();
            document.body.classList.remove('glassmorphism-bg');
        }
        
        // Оновлюємо UI
        this.updatePlayerInfo();
        this.updateLeaderboard();
    }
    
    // Обробка результату тестового завдання
    handleTestResult(data) {
        console.log('Обробляємо результат тесту:', data);
        
        // Оновлюємо очки гравця
        const player = this.players.find(p => p.id === data.playerId);
        if (player) {
            player.points = data.newPoints;
        }
        
        // Показуємо результат тесту всім гравцям
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">${data.isCorrect ? '✅ Правильно!' : '❌ Неправильно'}</h3>
            <p class="mb-4 text-lg">${data.resultMessage}</p>
            <div class="text-center">
                <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Продовжити
                </button>
            </div>
        `;

        this.showQuestModal('Результат тесту', modalContent, [], null);
        
        // Автоматично закриваємо модальне вікно через 3 секунди
        setTimeout(() => {
            const modal = document.getElementById('quest-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }, 3000);
        
        // Оновлюємо інформацію про гравців
        this.updatePlayerInfo();
    }


    swapPositions(targetPlayerId) {
        // Відправляємо запит на обмін місцями на сервер
        this.socket.emit('swap_positions', {
            roomId: this.roomId,
            targetPlayerId: targetPlayerId,
            playerId: this.playerId
        });
        
        this.closeMiniGame();
    }

    closeMiniGame() {
        // Очищаємо таймер спільної історії, якщо він існує
        if (this.storyTimer) {
            clearInterval(this.storyTimer);
            this.storyTimer = null;
        }
        
        // Зупиняємо звук таймера
        this.stopTimerSound();
        
        this.questModal.classList.add('hidden');
        
        // Не передаємо хід автоматично - хід передається тільки після кидка кубика
    }
    
    syncGameState(data) {
        this.players = data.players;
        this.currentPlayerIndex = data.currentPlayerIndex;
        this.gameActive = data.gameActive;
        
        this.updatePlayerInfo();
        this.updateDiceButtonState();
        
        // Оновлюємо позиції фішок
        this.players.forEach(player => {
            this.updatePawnPosition(player);
            // Оновлюємо аватарку фішки
            this.updatePawnAvatar(player);
        });
        
        if (data.gameActive) {
            this.rollDiceBtn.disabled = false;
        }
    }
    
    // Оновлення аватарки фішки
    updatePawnAvatar(player) {
        const pawn = document.getElementById(`pawn-${player.id}`);
        if (!pawn) return;
        
        // Оновлюємо аватарку, якщо вона є
        if (player.avatarUrl) {
            pawn.src = player.avatarUrl;
            pawn.alt = `${player.name} аватар`;
            pawn.style.backgroundColor = 'transparent';
            pawn.style.borderRadius = '0';
        } else {
            // Fallback на кольоровий кружечок
            pawn.src = '';
            pawn.style.backgroundColor = player.color;
            pawn.style.borderRadius = '50%';
        }
    }
    
    // Перевизначення showQuestModal для підтримки фонових зображень
    showQuestModal(title, content, buttons = [], backgroundImageUrl = null) {
        // Якщо є window.gameUI, використовуємо його (підтримує backgroundImageUrl)
        if (window.gameUI && window.gameUI.showQuestModal) {
            window.gameUI.showQuestModal(title, content, buttons, backgroundImageUrl);
        } else {
            // Fallback на базовий метод з game.js
            super.showQuestModal(title, typeof content === 'string' ? content : '', buttons, backgroundImageUrl);
        }
    }
    
    handleRemoteQuest(data) {
        // Обробка віддалених квестів
        if (data.eventType === 'test-question') {
            this.showTestQuestion(data);
        } else {
        this.showQuestModal(data.title, data.description, data.buttons, null);
        }
    }
    
    handleQuestVote(data) {
        // Обробка голосування в квестах
        this.addChatMessage('system', `${data.player.name} проголосував за "${data.choice}"`);
    }
    
    // Показ тестового завдання в мультиплеєрі
    showTestQuestion(data) {
        const questionData = window.TEST_QUESTIONS[data.cellNumber];
        if (!questionData) {
            console.error(`Тестове завдання для клітинки ${data.cellNumber} не знайдено`);
            return;
        }

        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">📝 Тестове завдання</h3>
            <p class="mb-4 text-lg">${questionData.question}</p>
            <div class="space-y-3">
        `;

        // Додаємо варіанти відповідей
        Object.entries(questionData.options).forEach(([key, value]) => {
            modalContent += `
                <button class="w-full p-3 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors test-option-btn" data-answer="${key}">
                    <span class="font-bold">${key})</span> ${value}
                </button>
            `;
        });

        modalContent += `
            </div>
            <div class="mt-4 text-center">
                <button class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Закрити
                </button>
            </div>
        `;

        this.showQuestModal('Тестове завдання', modalContent, [], null);

        // Додаємо обробники для кнопок відповідей
        setTimeout(() => {
            document.querySelectorAll('.test-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedAnswer = e.currentTarget.dataset.answer;
                    
                    // Відправляємо відповідь на сервер
                    this.socket.emit('test_answer', {
                        roomId: this.roomId,
                        cellNumber: data.cellNumber,
                        answer: selectedAnswer
                    });
                });
            });
        }, 100);
    }
    
    handleRemoteGameEnd(data) {
        this.endGame(data.winner, data.message);
    }
    
    // Перевизначення методів квестів для мультиплеєру
    triggerPvpQuest(player) {
        if (this.isOnlineMode) {
            this.socket.emit('start_pvp_quest', {
                roomId: this.roomId,
                playerId: player.id
            });
        } else {
            super.triggerPvpQuest(player);
        }
    }
    
    triggerCreativeQuest(player) {
        if (this.isOnlineMode) {
            this.socket.emit('start_creative_quest', {
                roomId: this.roomId,
                playerId: player.id
            });
        } else {
            super.triggerCreativeQuest(player);
        }
    }
    
    // Метод для голосування спектаторів
    voteForCreativeQuest(choice) {
        if (this.isOnlineMode) {
            this.socket.emit('creative_quest_vote', {
                roomId: this.roomId,
                choice,
                voterId: this.playerId
            });
        }
    }
    
    // Показуємо спочатку правила, потім клас
    showRulesFirst() {
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            rulesModal.classList.remove('hidden');
            
            // Після закриття правил показуємо клас
            const showSetupBtn = document.getElementById('show-setup-btn');
            if (showSetupBtn) {
                // Вимикаємо обробник з game.js для локального режиму
                showSetupBtn.onclick = null;
                
                // Клонуємо кнопку, щоб видалити всі старі обробники
                const newBtn = showSetupBtn.cloneNode(true);
                showSetupBtn.parentNode.replaceChild(newBtn, showSetupBtn);
                
                // Додаємо новий обробник
                newBtn.addEventListener('click', () => {
                    rulesModal.classList.add('hidden');
                    
                    // Після закриття правил показуємо вікно переродження з класом
                    console.log('Правила закриті, показуємо переродження з класом');
                    this.showReincarnationModal(null, true); // true = початок гри
                }, { once: true }); // once: true щоб обробник виконався тільки один раз
            } else {
                // Якщо кнопка не знайдена, одразу показуємо переродження
                setTimeout(() => {
                    this.showReincarnationModal(null, true);
                }, 300);
            }
        } else {
            // Якщо модальне вікно не знайдено, одразу показуємо переродження
            setTimeout(() => {
                this.showReincarnationModal(null, true);
            }, 300);
        }
    }
    
    // Показуємо вікно переродження з класом (замість старого showPlayerClassAssignment)
    showReincarnationModal(earlyReincarnationData = null, isGameStart = false) {
        const myPlayer = this.players.find(p => p.id === this.playerId);
        
        // Якщо передано новий клас в earlyReincarnationData, використовуємо його
        const classInfo = earlyReincarnationData?.newClass || myPlayer?.class;
        
        if (!classInfo) {
            console.log('Клас гравця не знайдено або гравець не існує');
            return;
        }
        let reincarnationText = '';
        let pointsText = '';
        
        // Визначаємо текст переродження залежно від класу
        if (classInfo.id === 'aristocrat') {
            reincarnationText = 'Вітаю! Ви народилися із золотою ложкою в роті! Ваше життя буде легшим, ніж у решти, завдяки безмежним статкам пращурів. Проте все ж один криптоніт маєте – казино та шинки. Якщо ступите ногою у даний заклад, втратите все!';
        } else if (classInfo.id === 'burgher') {
            reincarnationText = 'Вітаю! Ви народилися в родині, що здатна вас забезпечити! Проте на більше не сподівайтесь. Ваше життя буде посереднім. До казино та шинків також не варто підходити, якщо не хочете втратити половину майна!';
        } else if (classInfo.id === 'peasant') {
            reincarnationText = 'Вітаю! Ви народились! На цьому гарні новини для вас скінчились. Життя, сповнене стражданнями та злиднями, відтепер звична реальність. До казино та шинків теж не рекомендуємо ходити, якщо не хочете передчасно померти з голоду.';
        } else {
            // Запасний варіант
            reincarnationText = 'Вітаю! Ви переродились! Вас чекає нове життя з новою родиною та новою долею. Хай щастить!';
        }
        
        if (earlyReincarnationData) {
            // Раннє переродження - додаємо інформацію про очки
            const points = earlyReincarnationData.eventData?.points || earlyReincarnationData.points || 10;
            pointsText = `+${points} ОО`;
        }
        // Якщо це не раннє переродження, текст вже встановлено залежно від класу вище

        // Створюємо нове модальне вікно V2 (поза загальним quest-modal)
        const backdrop = document.createElement('div');
        backdrop.className = 'reincarnation-backdrop-v2';
        backdrop.id = 'reincarnation-backdrop-v2';

        const content = document.createElement('div');
        content.className = 'reincarnation-content-v2';
        content.innerHTML = `
            <div class=\"reincarnation-header-v2\"><h2>Переродження</h2></div>
            <div class=\"reincarnation-body-v2\">
                ${pointsText ? `<div class=\"bonus-points\">${pointsText}</div>` : ''}
                <div class=\"class-icon\">${classInfo.icon || ''}</div>
                <div class=\"class-name\">${classInfo.name || ''}</div>

                <div class=\"reincarnation-stats-v2\">
                    <div>
                        <div class=\"stat-label\">Стартові очки</div>
                        <div class=\"stat-value\">${classInfo.startPoints ?? 0}</div>
            </div>
                    <div>
                        <div class=\"stat-label\">Модифікатор руху</div>
                        <div class=\"stat-value\">${classInfo.moveModifier > 0 ? '+' : ''}${classInfo.moveModifier ?? 0}</div>
                    </div>
                </div>

                <p class=\"description\">${reincarnationText}</p>

                <div class=\"reincarnation-features-v2\">
                    <ul>
                    ${this.getClassDescription(classInfo.id)}
                </ul>
            </div>
            </div>
            <div class=\"reincarnation-footer-v2\">
                <button id=\"close-class-modal-btn\" class=\"reincarnation-button-v2\"><span>Зрозуміло</span></button>
            </div>
        `;

        backdrop.appendChild(content);
        document.body.appendChild(backdrop);

        // Закриття
            setTimeout(() => {
                const closeBtn = document.getElementById('close-class-modal-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                    const el = document.getElementById('reincarnation-backdrop-v2');
                    if (el) el.remove();
                    });
                }
        }, 50);
    }
    
    // Отримуємо опис класу
    getClassDescription(classId) {
        const descriptions = {
            'aristocrat': '<li>Починаєте з 50 очками освіти</li><li>Кожен рух на +1 клітинку більше</li><li>Привілейований доступ до освіти</li>',
            'burgher': '<li>Починаєте з 20 очками освіти</li><li>Звичайний рух без модифікаторів</li><li>Стабільний прогрес</li>',
            'peasant': '<li>Починаєте з 0 очками освіти</li><li>Кожен рух на -1 клітинку менше</li><li>Мінімум 1 клітинка за хід</li>'
        };
        return descriptions[classId] || '<li>Особливості класу</li>';
    }
    
    // Оновлюємо стан кнопки кидання кубика
    updateDiceButtonState() {
        if (!this.rollDiceBtn) return;
        
        console.log('updateDiceButtonState викликано:', {
            isOnlineMode: this.isOnlineMode,
            gameActive: this.gameActive,
            currentPlayerIndex: this.currentPlayerIndex,
            players: this.players?.length,
            myPlayerId: this.playerId,
            isSpectator: this.isSpectator
        });
        
        if (this.isSpectator) {
            // Режим спостерігача - кнопка завжди неактивна
            this.rollDiceBtn.disabled = true;
            this.rollDiceBtn.style.opacity = '0.5';
            // Оновлюємо текст кнопки (нова структура має span всередині)
            const spanEl = this.rollDiceBtn.querySelector('span');
            if (spanEl) {
                spanEl.textContent = '👁️ Режим спостерігача';
            } else {
            this.rollDiceBtn.textContent = '👁️ Режим спостерігача';
            }
            this.rollDiceBtn.style.backgroundColor = '#6b7280'; // Сірий колір
            return;
        }
        
        if (this.isOnlineMode && this.gameActive) {
            const currentPlayer = this.players[this.currentPlayerIndex];
            const isCurrentPlayer = currentPlayer && currentPlayer.id === this.playerId;
            
            console.log('Онлайн режим - стан кнопки:', {
                currentPlayer: currentPlayer?.name,
                currentPlayerId: currentPlayer?.id,
                myPlayerId: this.playerId,
                isCurrentPlayer
            });
            
            // Кнопка активна тільки для поточного гравця
            this.rollDiceBtn.disabled = !isCurrentPlayer;
            this.rollDiceBtn.style.opacity = isCurrentPlayer ? '1' : '0.5';
            
            // Оновлюємо текст кнопки (нова структура має span всередині)
            const spanEl = this.rollDiceBtn.querySelector('span');
            if (isCurrentPlayer) {
                if (spanEl) {
                    spanEl.textContent = 'Ваш хід - Кинути кубик';
                } else {
                this.rollDiceBtn.textContent = '🎲 Ваш хід - Кинути кубик';
                }
                // Колір вже задано через CSS клас .cp-button.roll
            } else {
                if (spanEl) {
                    spanEl.textContent = `Не ваш хід - Хід гравця ${currentPlayer?.name || 'невідомо'}`;
            } else {
                this.rollDiceBtn.textContent = `⏳ Не ваш хід - Хід гравця ${currentPlayer?.name || 'невідомо'}`;
                }
                this.rollDiceBtn.style.backgroundColor = '#6b7280'; // Сірий колір
            }
            
            // Управління кнопкою бафів/дебафів
            if (this.buffDebuffBtn) {
                const myPlayer = this.players.find(p => p.id === this.playerId);
                const hasEnoughPoints = myPlayer && myPlayer.points >= 50; // Мінімальна вартість бафу
                this.buffDebuffBtn.disabled = !isCurrentPlayer || !hasEnoughPoints || !this.gameActive;
            }
        } else {
            this.rollDiceBtn.disabled = !this.gameActive;
            this.rollDiceBtn.style.opacity = this.gameActive ? '1' : '0.5';
            // Оновлюємо текст кнопки (нова структура має span всередині)
            const spanEl = this.rollDiceBtn.querySelector('span');
            if (spanEl) {
                spanEl.textContent = 'Ваш хід - Кинути кубик';
            } else {
            this.rollDiceBtn.textContent = 'Кинути кубик';
            }
            // Колір вже задано через CSS клас .cp-button.roll
            
            // Управління кнопкою бафів/дебафів для локального режиму
            if (this.buffDebuffBtn) {
                this.buffDebuffBtn.disabled = !this.gameActive;
            }
        }
    }
    
    // Показуємо ігровий інтерфейс
    showGameInterface() {
        console.log('Показуємо ігровий інтерфейс');
        try {
            // Показуємо ігровий контейнер
            if (this.gameContainer) {
                this.gameContainer.classList.remove('hidden');
                console.log('Ігровий контейнер показано');
            } else {
                console.error('gameContainer не знайдено');
            }
            
            // Приховуємо онлайн панель
            if (this.onlinePanel) {
                this.onlinePanel.classList.add('hidden');
                console.log('Онлайн панель приховано');
            }
            
            // Приховуємо вибір режиму
            if (this.modeSelection) {
                this.modeSelection.classList.add('hidden');
                console.log('Вибір режиму приховано');
            }
            
            // Встановлюємо правильний масштаб карти
            setTimeout(() => {
                this.setInitialScale();
                this.applyTransform();
                console.log('Масштаб карти встановлено (друга функція)');
                
                // Налаштовуємо touch-контроли для мобільних пристроїв
                if (this.isMobile) {
                    this.setupTouchControls();
                }
            }, 100);
            
            console.log('Ігровий інтерфейс показано успішно');
        } catch (error) {
            console.error('Помилка при показі ігрового інтерфейсу:', error);
        }
    }
    
    // Показуємо код кімнати в модальному вікні
    showRoomCodeModal(roomCode, roomName) {
        console.log('Показуємо модальне вікно з кодом:', roomCode);
        const modalContent = `
            <div class="text-center">
                <p class="mb-4 text-lg font-bold text-green-600">Вітаю! Ви створили кімнату, як боженька Землю.</p>
                <p class="mb-4">Поділіться цим кодом з іншими гравцями:</p>
                <div class="bg-gray-100 p-4 rounded-lg mb-4 text-center">
                    <span class="text-3xl font-bold text-blue-600">${roomCode}</span>
                </div>
                <button id="copy-code-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-2">
                    📋 Скопіювати код
                </button>
                <button id="close-room-modal-btn" class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                    Закрити
                </button>
            </div>
        `;
        
        if (window.gameUI) {
            window.gameUI.showQuestModal('Кімната створена', modalContent, [], 'image/modal_window/room_creation.png');
            
            // Додаємо обробники подій
            setTimeout(() => {
                const copyBtn = document.getElementById('copy-code-btn');
                const closeBtn = document.getElementById('close-room-modal-btn');
                
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(roomCode).then(() => {
                            if (window.gameUI) {
                                window.gameUI.showNotification('Код скопійовано!', 'success');
                            }
                        });
                    });
                }
                
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        if (window.gameUI) {
                            window.gameUI.hideModal('quest');
                        }
                    });
                }
            }, 100);
        } else {
            console.error('window.gameUI не знайдено');
        }
    }
    
    // Показуємо модальне вікно створення кімнати
    showRoomCreatedModal(roomCode) {
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal" id="room-created-modal">
                <div class="glassmorphism-content-with-image">
                    <div class="glassmorphism-header">
                        <h2>🎉 Кімната створена!</h2>
                        <p>Вітаю! Ви створили кімнату, як боженька Землю.</p>
                </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        <button class="glassmorphism-btn-primary" id="close-room-modal-btn">
                            Ай, шайтаан. Добре!
                </button>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо існуюче модальне вікно, якщо є
        const existingModal = document.getElementById('room-created-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Додаємо нове модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Додаємо обробник події
            setTimeout(() => {
                const closeBtn = document.getElementById('close-room-modal-btn');
                
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                    const modal = document.getElementById('room-created-modal');
                    if (modal) {
                        modal.remove();
                        document.body.classList.remove('glassmorphism-bg');
                        }
                    });
                }
            }, 100);
    }
    
    // Показуємо модальне вікно приєднання до кімнати
    showRoomJoinedModal(roomCode) {
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal" id="room-joined-modal">
                <div class="glassmorphism-content-with-image">
                    <div class="glassmorphism-header">
                        <h2>🎉 Приєднано до кімнати!</h2>
                        <p>Вітаю! Ви зайшли у кімнату, створену гравцем, як Земля Боженькою.</p>
                </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        <button class="glassmorphism-btn-primary" id="close-room-modal-btn">
                            Ай, шайтаан. Добре!
                </button>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо існуюче модальне вікно, якщо є
        const existingModal = document.getElementById('room-joined-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Додаємо нове модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Додаємо обробник події
            setTimeout(() => {
                const closeBtn = document.getElementById('close-room-modal-btn');
                
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                    const modal = document.getElementById('room-joined-modal');
                    if (modal) {
                        modal.remove();
                        document.body.classList.remove('glassmorphism-bg');
                        }
                    });
                }
            }, 100);
    }
    
    // Нові міні-ігри
    showTimedTextQuest(data) {
        const isParticipant = data.gameState.players.includes(this.playerId);
        const isMyEvent = data.activePlayerId === this.playerId;
        const gameData = data.gameState.gameData;
        
        // Спеціальна обробка для педагобота - використовуємо glassmorphism стиль
        if (gameData.gameType === 'pedagogobot') {
            this.showPedagogobotModal(data);
            return;
        }
        
        // Спеціальна обробка для хрестиків-нуликів
        if (gameData.gameType === 'tic_tac_toe' || gameData.gameType === 'cross_early') {
            this.showTicTacToeModal(data);
            return;
        }
        
        // Спеціальна обробка для камінь-ножиці-папір
        if (gameData.gameType === 'rock_paper_scissors') {
            this.showRockPaperScissorsModal(data);
            return;
        }
        
        // Визначаємо фон за типом гри
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">${gameData.name}!</h3>
            <p class="mb-4">${gameData.description}</p>
            <p class="mb-4">${data.player1.name} проти ${data.player2.name}</p>
            
        `;
        
        if (isParticipant) {
            if (gameData.gameType === 'rock_paper_scissors') {
                // Спеціальний інтерфейс для камінь-ножиці-папір
                modalContent += `
                    <div class="mb-4">
                        <div id="rps-game" class="text-center mb-4">
                            <div id="rps-round" class="text-lg font-bold mb-2">Раунд 1 з 3</div>
                            <div id="rps-score" class="text-lg mb-4">Ваші перемоги: 0 | Перемоги суперника: 0</div>
                            <div class="flex justify-center gap-4 mb-4">
                                <button id="rps-rock" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">🪨 Камінь</button>
                                <button id="rps-paper" class="bg-white hover:bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded border-2 border-gray-300">📄 Папір</button>
                                <button id="rps-scissors" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">✂️ Ножиці</button>
                            </div>
                            <div id="rps-result" class="text-lg font-bold mb-2"></div>
                        </div>
                        <div id="timer" class="text-2xl font-bold text-red-500 text-center">${data.gameState.timer}</div>
                    </div>
                    <button id="submit-result-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" disabled>
                        Завершити гру
                    </button>
                `;
            } else {
                // Стандартний інтерфейс для текстових квестів
                modalContent += `
                    <div class="mb-4">
                        <textarea id="text-input" class="w-full h-32 p-3 border-2 border-gray-400 rounded" placeholder="Введіть якомога більше принципів, розділяючи їх комами..."></textarea>
                    </div>
                    <div class="mb-4">
                        <div id="timer" class="text-2xl font-bold text-red-500">${data.gameState.timer}</div>
                    </div>
                    <button id="submit-result-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" disabled>
                        Відправити результат
                    </button>
                `;
            }
        } else {
            modalContent += `
                <p class="text-center text-gray-600">Спостерігайте за грою</p>
            `;
        }
        
        // Спеціальна обробка для педагобота - використовуємо glassmorphism стиль
        if (gameData.gameType === 'pedagogobot') {
            this.showPedagogobotModal(data, modalContent);
            return;
        }
        
        // Визначаємо картинку залежно від типу гри
        let imagePath = null;
        if (gameData.gameType === 'tic_tac_toe' || gameData.gameType === 'cross_early') {
            imagePath = 'image/modal_window/tic_tac_toe.jpg';
        } else if (gameData.gameType === 'rock_paper_scissors') {
            imagePath = 'image/modal_window/rock_paper_scissors.png';
        } else if (gameData.name === 'Мегамозок') {
            imagePath = 'image/modal_window/megabrain_2.jpg';
        } else if (gameData.gameType === 'genius') {
            imagePath = 'image/modal_window/i_am_a_genius.png';
        }
        
        this.showQuestModal('PvP-квест', modalContent, [], imagePath);
        
        // Додаємо клас для filter Мегамозок (темніша і розмитіша)
        if (gameData.name === 'Мегамозок') {
            setTimeout(() => {
                const modal = document.querySelector('#quest-modal-content') || document.querySelector('.modal-content');
                if (modal) {
                    modal.classList.add('megabrain-bg');
                }
            }, 100);
        }
        
        // Оновлюємо масштаб для нового модального вікна
        if (window.updateGameScaling) {
            setTimeout(() => window.updateGameScaling(), 100);
        }
        
        if (isParticipant) {
            if (gameData.gameType === 'tic_tac_toe' || gameData.gameType === 'cross_early') {
                // Ініціалізуємо дошку хрестиків-нуликів
                setTimeout(() => {
                    this.initializeTicTacToeBoard();
                }, 100);
            } else if (gameData.gameType === 'rock_paper_scissors') {
                // Ініціалізуємо гру камінь-ножиці-папір
                setTimeout(() => {
                    this.initializeRockPaperScissors();
                }, 100);
            } else {
                // Запускаємо таймер тільки для текстових ігор (не для хрестиків-нуликів, не для КНП)
                this.startTimedTextQuestTimer(data.gameState.timer);
            }
            
            // Прибрано зміну фону в Мегамозку — використовується основна картинка
        }
    }
    
    // Спеціальний метод для хрестиків-нуликів з glassmorphism стилем
    showTicTacToeModal(data) {
        const isParticipant = data.gameState.players.includes(this.playerId);
        const isMyEvent = data.activePlayerId === this.playerId;
        const gameData = data.gameState.gameData;
        const isTestMode = this.isTestMode; // Перевіряємо чи це режим тестування
        
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal glassmorphism-modal-small" id="tictactoe-modal">
                <div class="glassmorphism-content-tictactoe-small">
                    <div class="glassmorphism-header">
                        <h2>🎯 Хреститися рано!</h2>
                        ${isTestMode ? `
                            <button class="close-test-modal-btn" onclick="document.getElementById('tictactoe-modal').remove(); document.body.classList.remove('glassmorphism-bg');">✖</button>
                        ` : ''}
                    </div>
                    
                    <div class="glassmorphism-info-box">
                        <p class="text-sm">${gameData.description}</p>
                        <p class="text-sm font-bold">${data.player1.name} проти ${data.player2.name}</p>
                    </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        ${isParticipant ? `
                            <div class="mb-4">
                                <div id="tic-tac-toe-board" class="tic-tac-toe-grid mx-auto mb-4"></div>
                                <div id="game-status" class="text-center text-lg font-bold mb-2">Хід гравця: <span class="x">X</span></div>
                            </div>
                            <button id="submit-result-btn" class="glassmorphism-btn-primary w-full" disabled>
                                Завершити гру
                            </button>
                        ` : `
                            <div class="mb-4">
                                <div id="tic-tac-toe-board-view" class="tic-tac-toe-grid mx-auto mb-4"></div>
                                <div id="game-status-view" class="text-center text-lg font-bold mb-2">Очікуємо хід гравця...</div>
                            </div>
                        `}
                        ${isTestMode ? `
                            <button class="glassmorphism-btn-secondary w-full mt-2" onclick="document.getElementById('tictactoe-modal').remove(); document.body.classList.remove('glassmorphism-bg');">
                                Закрити
                            </button>
                        ` : ''}
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
        
        // Ініціалізуємо дошку для всіх гравців
        if (isParticipant) {
            setTimeout(() => {
                this.initializeTicTacToeBoard();
                // Не запускаємо таймер для хрестиків-нуликів
            }, 100);
        } else {
            // Показуємо дошку для спостерігачів
            setTimeout(() => {
                this.initializeTicTacToeBoardForViewers();
            }, 100);
        }
    }
    
    // Спеціальний метод для камінь-ножиці-папір з glassmorphism стилем
    showRockPaperScissorsModal(data) {
        const isParticipant = data.gameState.players.includes(this.playerId);
        const isMyEvent = data.activePlayerId === this.playerId;
        const gameData = data.gameState.gameData;
        const isTestMode = this.isTestMode;
        
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal glassmorphism-modal-small" id="rps-modal">
                <div class="glassmorphism-content-rps-small">
                    <div class="glassmorphism-header">
                        <h2>🪨📄✂️ Камінь, Ножиці, Папір</h2>
                        ${isTestMode ? `
                            <button class="close-test-modal-btn" onclick="document.getElementById('rps-modal').remove(); document.body.classList.remove('glassmorphism-bg');">✖</button>
                        ` : ''}
                    </div>
                    
                    <div class="glassmorphism-info-box">
                        <p class="text-sm">${gameData.description}</p>
                        <p class="text-sm font-bold">${data.player1.name} проти ${data.player2.name}</p>
                    </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        ${isParticipant ? `
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
                        ` : `
                            <p class="text-center text-gray-600">Спостерігайте за грою</p>
                        `}
                        ${isTestMode ? `
                            <button class="glassmorphism-btn-secondary w-full mt-2" onclick="document.getElementById('rps-modal').remove(); document.body.classList.remove('glassmorphism-bg');">
                                Закрити
                            </button>
                        ` : ''}
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
        
        // Додаємо обробники подій
        if (isParticipant) {
            setTimeout(() => {
                this.initializeRockPaperScissors();
                // Не запускаємо таймер для камінь-ножиці-папір
            }, 100);
        }
    }
    
    // Спеціальний метод для педагобота з glassmorphism стилем
    showPedagogobotModal(data, modalContent) {
        const isParticipant = data.gameState.players.includes(this.playerId);
        const isMyEvent = data.activePlayerId === this.playerId;
        const gameData = data.gameState.gameData;
        const isTestMode = this.isTestMode;
        
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal glassmorphism-modal-small" id="pedagogobot-modal">
                <div class="glassmorphism-content-robot-small">
                    <div class="glassmorphism-header">
                        <h2>🤖 Педагобот!</h2>
                        ${isTestMode ? `
                            <button class="close-test-modal-btn" onclick="document.getElementById('pedagogobot-modal').remove(); document.body.classList.remove('glassmorphism-bg');">✖</button>
                        ` : ''}
                    </div>
                    
                    <div class="glassmorphism-info-box">
                        <p class="text-sm">${gameData.description}</p>
                        <p class="text-sm font-bold">${data.player1.name} проти ${data.player2.name}</p>
                    </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        ${isParticipant ? `
                            <div class="mb-4">
                                <textarea id="text-input" class="w-full h-32 p-3 border-2 border-gray-400 rounded bg-gray-800/70 border-gray-500/50 text-white" placeholder="Введіть якомога більше якостей гарного педагога, розділяючи їх комами..."></textarea>
                            </div>
                            <button id="submit-result-btn" class="glassmorphism-btn-primary w-full" disabled>
                                Відправити результат
                            </button>
                        ` : `
                            <p class="text-center text-gray-600">Спостерігайте за грою</p>
                        `}
                        ${isTestMode ? `
                            <button class="glassmorphism-btn-secondary w-full mt-2" onclick="document.getElementById('pedagogobot-modal').remove(); document.body.classList.remove('glassmorphism-bg');">
                                Закрити
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо існуюче модальне вікно, якщо є
        const existingModal = document.getElementById('pedagogobot-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Додаємо нове модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Логування для діагностики фону педагобота
        setTimeout(() => {
            const robotModal = document.getElementById('pedagogobot-modal');
            const robotContent = robotModal?.querySelector('.glassmorphism-content-robot-small') || robotModal?.querySelector('.glassmorphism-content-robot');
            
            console.log('=== ДІАГНОСТИКА ФОНУ ПЕДАГОБОТА ===');
            console.log('Modal element:', robotModal);
            console.log('Content element:', robotContent);
            
            if (robotContent) {
                const computedStyle = window.getComputedStyle(robotContent);
                console.log('Background image:', computedStyle.backgroundImage);
                console.log('Background color:', computedStyle.backgroundColor);
                console.log('Background size:', computedStyle.backgroundSize);
                console.log('Background position:', computedStyle.backgroundPosition);
                console.log('Display:', computedStyle.display);
                console.log('Min-height:', computedStyle.minHeight);
                console.log('Classes:', robotContent.className);
            } else {
                console.log('⚠️ Content element не знайдено!');
            }
            console.log('==================================');
        }, 200);
        
        // Додаємо обробники подій
        if (isParticipant) {
            setTimeout(() => {
            this.startTimedTextQuestTimer(data.gameState.timer);
            }, 100);
        }
    }
    
    startTimedTextQuestTimer(seconds) {
        const timerElement = document.getElementById('timer');
        const submitBtn = document.getElementById('submit-result-btn');
        const textInput = document.getElementById('text-input');
        
        // Відтворюємо звук таймера
        this.playTimerSound();
        
        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
                submitBtn.disabled = false;
                textInput.disabled = true;
                submitBtn.textContent = 'Відправити результат';
                
                // Зупиняємо звук таймера
                this.stopTimerSound();
                
                // Автоматично відправляємо результат
                this.submitTimedTextResult();
            }
        }, 1000);
    }
    
    submitTimedTextResult() {
        const textInput = document.getElementById('text-input');
        if (!textInput) {
            console.error('Поле вводу тексту не знайдено');
            return;
        }
        
        // Зупиняємо звук таймера
        this.stopTimerSound();
        
        const text = textInput.value.trim();
        const wordsCount = text.split(',').filter(word => word.trim().length > 0).length;
        
        this.socket.emit('timed_text_quest_result', {
            roomId: this.roomId,
            wordsCount: wordsCount
        });
    }
    
    endTimedTextQuest(data) {
        // Закриваємо модальне вікно педагобота, якщо воно відкрите
        const pedagogobotModal = document.getElementById('pedagogobot-modal');
        if (pedagogobotModal) {
            pedagogobotModal.remove();
            document.body.classList.remove('glassmorphism-bg');
        }
        
        // Закриваємо модальне вікно хрестиків-нуликів, якщо воно відкрите
        const tictactoeModal = document.getElementById('tictactoe-modal');
        if (tictactoeModal) {
            tictactoeModal.remove();
            document.body.classList.remove('glassmorphism-bg');
        }
        
        // Закриваємо модальне вікно камінь-ножиці-папір, якщо воно відкрите
        const rpsModal = document.getElementById('rps-modal');
        if (rpsModal) {
            rpsModal.remove();
            document.body.classList.remove('glassmorphism-bg');
        }
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">PvP-квест завершено!</h3>
            <p class="mb-4">${data.resultMessage}</p>
            <div class="mb-4">
                <h4 class="font-bold">Результати:</h4>
        `;
        
        Object.values(data.results).forEach(result => {
            modalContent += `<p>${result.playerName}: ${result.wordsCount} слів</p>`;
        });
        
        modalContent += `</div>`;
        
        if (data.winner === this.playerId) {
            modalContent += `<p class="text-center mb-4">Ви можете обмінятися місцями з будь-яким гравцем!</p>`;
            
            const buttons = this.players
                .filter(p => p.id !== this.playerId)
                .map(p => ({
                    text: `Обмінятися з ${p.name}`,
                    callback: () => this.swapPositions(p.id)
                }));
            
            buttons.push({ text: 'Не обмінюватися', callback: () => this.closeMiniGame() });
            
            this.showQuestModal('PvP-квест', modalContent, buttons, null);
        } else {
            this.showQuestModal('PvP-квест', modalContent, [
                { text: 'Закрити', callback: () => this.closeMiniGame() }
            ]);
        }
    }
    
    showCollaborativeStory(data) {
        const isMyTurn = data.activePlayerId === this.playerId;
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Хроніки Неіснуючого Вояжу</h3>
            <p class="mb-4">${data.gameState.gameData.description}</p>
            <div class="mb-4">
                <h4 class="font-bold">Історія:</h4>
                <div id="story-content" class="bg-gray-100 p-3 rounded min-h-20">
                    <p>${data.gameState.story.map(s => s.sentence).join(' ')}</p>
                </div>
            </div>
        `;
        
        if (isMyTurn) {
            modalContent += `
                <div class="mb-4">
                    <textarea id="sentence-input" class="w-full h-20 p-3 border-2 border-gray-400 rounded" placeholder="Додайте речення до історії..."></textarea>
                </div>
                <div class="mb-4">
                    <div id="story-timer" class="text-xl font-bold text-red-500">${data.gameState.timer}</div>
                </div>
                <div class="flex gap-2">
                    <button id="submit-sentence-btn" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        Додати речення
                    </button>
                    <button id="skip-turn-btn" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                        Пропустити хід
                    </button>
                </div>
            `;
        } else {
            modalContent += `
                <p class="text-center text-gray-600">Черга гравця ${data.currentPlayer.name}</p>
            `;
        }
        
        this.showQuestModal('Творчий квест', modalContent, [], null);
        
        if (isMyTurn) {
            this.startStoryTimer(data.gameState.timer);
        }
    }
    
    startStoryTimer(seconds) {
        // Очищаємо попередній таймер, якщо він існує
        if (this.storyTimer) {
            clearInterval(this.storyTimer);
            this.storyTimer = null;
        }
        
        const timerElement = document.getElementById('story-timer');
        let timeLeft = seconds;
        
        this.storyTimer = setInterval(() => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(this.storyTimer);
                this.storyTimer = null;
                // Автоматично пропускаємо хід
                this.skipStoryTurn();
            }
        }, 1000);
        
        // Додаємо обробники кнопок
        setTimeout(() => {
            const submitBtn = document.getElementById('submit-sentence-btn');
            const skipBtn = document.getElementById('skip-turn-btn');
            
            if (submitBtn) {
                submitBtn.addEventListener('click', () => this.submitStorySentence());
            }
            
            if (skipBtn) {
                skipBtn.addEventListener('click', () => this.skipStoryTurn());
            }
        }, 100);
    }
    
    submitStorySentence() {
        const sentenceInput = document.getElementById('sentence-input');
        const sentence = sentenceInput.value.trim();
        
        if (sentence) {
            // Очищаємо таймер перед відправкою
            if (this.storyTimer) {
                clearInterval(this.storyTimer);
                this.storyTimer = null;
            }
            
            // Зупиняємо звук таймера
            this.stopTimerSound();
            
            this.socket.emit('collaborative_story_sentence', {
                roomId: this.roomId,
                sentence: sentence
            });
        }
    }
    
    skipStoryTurn() {
        // Очищаємо таймер перед пропуском
        if (this.storyTimer) {
            clearInterval(this.storyTimer);
            this.storyTimer = null;
        }
        
        // Зупиняємо звук таймера
        this.stopTimerSound();
        
        this.socket.emit('collaborative_story_skip', {
            roomId: this.roomId
        });
    }
    
    updateCollaborativeStory(data) {
        const isMyTurn = data.currentPlayer.id === this.playerId;
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Хроніки Неіснуючого Вояжу</h3>
            <div class="mb-4">
                <h4 class="font-bold">Історія:</h4>
                <div id="story-content" class="bg-gray-100 p-3 rounded min-h-20">
                    <p>${data.gameState.story.map(s => s.sentence).join(' ')}</p>
                </div>
            </div>
        `;
        
        if (isMyTurn) {
            modalContent += `
                <div class="mb-4">
                    <textarea id="sentence-input" class="w-full h-20 p-3 border-2 border-gray-400 rounded" placeholder="Додайте речення до історії..."></textarea>
                </div>
                <div class="mb-4">
                    <div id="story-timer" class="text-xl font-bold text-red-500">${data.gameState.timer}</div>
                </div>
                <div class="flex gap-2">
                    <button id="submit-sentence-btn" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        Додати речення
                    </button>
                    <button id="skip-turn-btn" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                        Пропустити хід
                    </button>
                </div>
            `;
        } else {
            modalContent += `
                <p class="text-center text-gray-600">Черга гравця ${data.currentPlayer.name}</p>
            `;
        }
        
        this.showQuestModal('Творчий квест', modalContent, [], null);
        
        if (isMyTurn) {
            this.startStoryTimer(data.gameState.timer);
        }
    }
    
    endCollaborativeStory(data) {
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Хроніки Неіснуючого Вояжу завершено!</h3>
            <p class="mb-4">${data.resultMessage}</p>
            <div class="mb-4">
                <h4 class="font-bold">Фінальна історія:</h4>
                <div class="bg-gray-100 p-3 rounded">
                    <p>${data.story.map(s => s.sentence).join(' ')}</p>
                </div>
            </div>
        `;
        
        this.showQuestModal('Творчий квест', modalContent, [
            { text: 'Закрити', callback: () => this.closeMiniGame() }
        ]);
    }
    
    showCreativeTaskInput(data) {
        const isActivePlayer = data.activePlayerId === this.playerId;
        
        if (isActivePlayer) {
            let modalContent = `
                <h3 class="text-2xl font-bold mb-4">${data.gameState.gameData.name}</h3>
                <p class="mb-4">${data.gameState.gameData.description}</p>
                <div class="mb-4">
                    <div id="creative-timer" class="text-xl font-bold text-red-500">${data.gameState.timer}</div>
                </div>
                <div class="mb-4">
                    <textarea id="creative-input" class="w-full h-32 p-3 border-2 border-gray-400 rounded" placeholder="Введіть вашу відповідь..."></textarea>
                </div>
                <button id="submit-creative-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    Відправити
                </button>
            `;
            
            // Визначаємо фонову картинку залежно від типу творчого квесту
            let backgroundImage = null;
            if (data.gameState.gameType === 'pedagog_mom') {
                backgroundImage = 'image/modal_window/i_am_a_teacher.mp4';
            } else if (data.gameState.gameType === 'great_pedagogical') {
                backgroundImage = 'image/modal_window/big_pedagogik.png';
            }
            
            this.showQuestModal('Творчий квест', modalContent, [], backgroundImage);
            this.startCreativeTimer(data.gameState.timer);
        }
    }
    
    startCreativeTimer(seconds) {
        const timerElement = document.getElementById('creative-timer');
        
        // Відтворюємо звук таймера
        this.playTimerSound();
        
        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
                
                // Зупиняємо звук таймера
                this.stopTimerSound();
                
                // Автоматично відправляємо результат
                this.submitCreativeTask();
            }
        }, 1000);
        
        // Додаємо обробник кнопки
        setTimeout(() => {
            const submitBtn = document.getElementById('submit-creative-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => this.submitCreativeTask());
            }
        }, 100);
    }
    
    submitCreativeTask() {
        // Зупиняємо звук таймера
        this.stopTimerSound();
        
        const creativeInput = document.getElementById('creative-input');
        const text = creativeInput.value.trim();
        
        if (text) {
            this.socket.emit('creative_task_submission', {
                roomId: this.roomId,
                text: text
            });
        }
    }
    
    showCreativeWritingWaiting(data) {
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Творчий квест</h3>
            <p class="mb-4">${data.activePlayer} пише творче завдання...</p>
            <p class="text-center text-gray-600">Очікуйте завершення</p>
        `;
        
        this.showQuestModal('Творчий квест', modalContent, [], null);
    }

    showCreativeSubmission(data) {
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Творчий квест</h3>
            <p class="mb-4">${data.task}</p>
            <div class="mb-4">
                <div id="creative-submission-timer" class="text-xl font-bold text-red-500">${data.timer}</div>
            </div>
            <div class="mb-4">
                <textarea id="creative-submission-input" class="w-full h-32 p-3 border-2 border-gray-400 rounded" placeholder="Введіть вашу відповідь..."></textarea>
            </div>
            <button id="submit-creative-entry-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Відправити
            </button>
        `;
        
        this.showQuestModal('Творчий квест', modalContent, [], null);
        
        // Запускаємо таймер
        this.startCreativeSubmissionTimer(data.timer);
    }

    startCreativeSubmissionTimer(seconds) {
        let timeLeft = seconds;
        const timerElement = document.getElementById('creative-submission-timer');
        
        const timer = setInterval(() => {
            timeLeft--;
            if (timerElement) {
                timerElement.textContent = timeLeft;
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                // Автоматично відправляємо результат
                this.submitCreativeEntry();
            }
        }, 1000);
        
        // Додаємо обробник кнопки
        setTimeout(() => {
            const submitBtn = document.getElementById('submit-creative-entry-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => this.submitCreativeEntry());
            }
        }, 100);
    }

    submitCreativeEntry() {
        const creativeInput = document.getElementById('creative-submission-input');
        const text = creativeInput.value.trim();
        
        if (text) {
            this.socket.emit('submit_creative_entry', {
                roomId: this.roomId,
                text: text
            });
        }
    }
    
    showVoting(data) {
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Голосування</h3>
            <p class="mb-4">Оберіть найкращий варіант:</p>
            <div class="space-y-2 mb-4">
        `;
        
        data.submissions.forEach((submission, index) => {
            // Перевіряємо, чи це робота поточного гравця
            const isMyWork = submission.playerId === this.playerId;
            const clickHandler = isMyWork ? '' : `onclick="window.game.voteForCreative(${index})"`;
            const cursorStyle = isMyWork ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-200';
            
            modalContent += `
                <div class="p-3 border-2 border-gray-400 rounded ${cursorStyle}" ${clickHandler}>
                    <p class="font-bold">${submission.playerName}:</p>
                    <p>${submission.text}</p>
                    ${isMyWork ? '<p class="text-sm text-gray-500 italic">(Ваша робота - голосувати не можна)</p>' : ''}
                </div>
            `;
        });
        
        modalContent += `
            </div>
            <p class="text-center text-gray-600">Оберіть варіант вище (не можна голосувати за свою роботу)</p>
        `;
        
        this.showQuestModal('Голосування', modalContent, [], null);
    }
    
    voteForCreative(submissionIndex) {
        console.log('🗳️ Клієнт відправляє голос:', {
            roomId: this.roomId,
            submissionIndex: submissionIndex
        });
        this.socket.emit('creative_vote', {
            roomId: this.roomId,
            submissionIndex: submissionIndex
        });
    }
    
    endCreativeVoting(data) {
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Голосування завершено!</h3>
            <p class="mb-4">${data.resultMessage}</p>
            <div class="mb-4">
                <h4 class="font-bold">Переможець:</h4>
                <div class="p-3 bg-green-100 rounded">
                    <p class="font-bold">${data.winner.playerName}:</p>
                    <p>${data.winner.text}</p>
                </div>
            </div>
        `;
        
        this.showQuestModal('Голосування', modalContent, [
            { text: 'Закрити', callback: () => this.closeMiniGame() }
        ]);
    }
    
    showMadLibsQuestion(data) {
        // Інструкції та оформлення
        const rewardText = data.rewardPoints ? `${data.rewardPoints} ОО` : 'ХХ ОО';

        // Встановимо темніший/блюр фон тільки для фону (через CSS змінну і псевдоелемент)
        if (this.questModalContent) {
            this.questModalContent.classList.add('madlibs-bg');
            this.questModalContent.style.setProperty('--quest-bg', "url('image/modal_window/owl.png')");
        }

        // Логіка: перші два питання відповідає один і той самий гравець
        // Зберігаємо першого активного гравця для питання 0
        if (typeof this.madLibsFirstPlayerId === 'undefined' && data.questionIndex === 0) {
            this.madLibsFirstPlayerId = data.activePlayerId;
        }
        // Визначаємо, чи це хід мого гравця з урахуванням правила для другого питання
        let effectiveActivePlayerId = data.activePlayerId;
        if (data.questionIndex === 1 && this.madLibsFirstPlayerId) {
            effectiveActivePlayerId = this.madLibsFirstPlayerId;
        }
        const isMyTurn = effectiveActivePlayerId === this.playerId;
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">🦉 Хто, де, коли? - Творчий квест</h3>
            <div class="text-sm text-gray-300 bg-black bg-opacity-30 p-3 rounded mb-3">
                Вам необхідно по черзі одним словом відповісти на питання “Хто?”, “Де?”, “Коли?”, “З ким?”, “Як”, “Що робив?”. Таким чином у кінці вийде цікавенька міністорія.<br>
                Обмеження у часі відсутнє. Переможця немає, кожен гравець-учасник здобуває по ${rewardText} у кінці гри.
            </div>
            <p class="mb-4">Питання: <strong>${data.question}</strong></p>
        `;
        
        if (isMyTurn) {
            modalContent += `
                <div class="mb-4">
                    <input id="mad-libs-answer" type="text" class="w-full p-3 border-2 border-gray-400 rounded" placeholder="Ваша відповідь...">
                </div>
                <button id="submit-mad-libs-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    Відправити
                </button>
            `;
        } else {
            modalContent += `
                <p class="text-center text-gray-600">Очікуйте відповіді інших гравців</p>
            `;
        }
        
        this.showQuestModal('Хто, де, коли? - Творчий квест', modalContent, [], 'image/modal_window/owl.png');
        
        if (isMyTurn) {
            // Додаємо обробник кнопки
            setTimeout(() => {
                const submitBtn = document.getElementById('submit-mad-libs-btn');
                const answerInput = document.getElementById('mad-libs-answer');
                
                if (submitBtn) {
                    submitBtn.addEventListener('click', () => this.submitMadLibsAnswer());
                }
                
                if (answerInput) {
                    answerInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') this.submitMadLibsAnswer();
                    });
                }
            }, 100);
        }
    }
    
    showMadLibsWaiting(data) {
        if (this.questModalContent) {
            this.questModalContent.classList.add('madlibs-bg');
            this.questModalContent.style.setProperty('--quest-bg', "url('image/modal_window/owl.png')");
        }
        let modalContent = `
            <h3 class=\"text-2xl font-bold mb-4\">🦉 Хто, де, коли? - Творчий квест</h3>
            <p class=\"mb-4\">Питання: <strong>${data.question}</strong></p>
            <p class=\"text-center text-gray-400\">Черга гравця ${data.currentPlayer.name}</p>
        `;
        this.showQuestModal('Хто, де, коли? - Творчий квест', modalContent, [], 'image/modal_window/owl.png');
    }
    
    submitMadLibsAnswer() {
        const answerInput = document.getElementById('mad-libs-answer');
        const answer = answerInput.value.trim();
        
        if (answer) {
            this.socket.emit('mad_libs_answer', {
                roomId: this.roomId,
                answer: answer
            });
        }
    }
    
    showMadLibsResult(data) {
        if (this.questModalContent) {
            this.questModalContent.classList.add('madlibs-bg');
            this.questModalContent.style.setProperty('--quest-bg', "url('image/modal_window/owl.png')");
        }
        const rewardText = data.rewardPoints ? `${data.rewardPoints} ОО` : 'ХХ ОО';
        let modalContent = `
            <h3 class=\"text-2xl font-bold mb-4\">🦉 Хто, де, коли? завершено!</h3>
            <div class=\"mb-4\">
                <h4 class=\"font-bold mb-2\">Ось історія, яка вийшла:</h4>
                <div class=\"bg-gray-100 p-4 rounded text-lg text-gray-900\">
                    ${data.story}
                </div>
            </div>
            <div class=\"text-center text-emerald-300 font-bold text-xl\">Вітаю, Ви здобули ${rewardText}!</div>
        `;
        
        this.showQuestModal('Хто, де, коли? - Творчий квест', modalContent, [
            { text: 'Закрити', callback: () => this.closeMiniGame() }
        ], 'image/modal_window/owl.png');
    }
    
    showWebNovellaEvent(data) {
        const isMyEvent = data.activePlayerId === this.playerId;
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Халепа!</h3>
            <p class="mb-4">${data.event.text}</p>
        `;
        
        if (data.event.choices && data.event.choices.length > 0 && isMyEvent) {
            modalContent += `<div class="space-y-2">`;
            data.event.choices.forEach((choice, index) => {
                modalContent += `
                    <button class="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded" onclick="game.makeWebNovellaChoice(${index})">
                        ${choice.text}
                    </button>
                `;
            });
            modalContent += `</div>`;
        } else if (isMyEvent) {
            modalContent += `
                <button class="w-full p-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded" onclick="game.closeMiniGame()">
                    Закрити
                </button>
            `;
        } else {
            modalContent += `<p class="text-center text-gray-600">Очікуйте вибору гравця</p>`;
        }
        
        this.showQuestModal('Вебновела', modalContent, [], null);
    }
    
    makeWebNovellaChoice(choiceIndex) {
        this.socket.emit('webnovella_choice', {
            roomId: this.roomId,
            choiceIndex: choiceIndex
        });
    }
    
    endWebNovella(data) {
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Вебновела завершена!</h3>
            <p class="mb-4">${data.resultMessage}</p>
        `;
        
        this.showQuestModal('Вебновела', modalContent, [
            { text: 'Закрити', callback: () => this.closeMiniGame() }
        ]);
    }
    
    // Методи для роботи з аватарами
    showAvatarSelectionModal() {
        const modal = document.getElementById('avatar-selection-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.populateAvatarGrid();
            
            // Оновлюємо лічильник гравців
            this.updateReadyCounter(0, this.players.length);
            
            // Встановлюємо обробники подій Socket.IO
            this.setupAvatarEventHandlers();
            
            // Встановлюємо обробники подій після створення елементів
            setTimeout(() => {
                this.setupAvatarEventListeners();
            }, 100);
        }
    }
    
    populateAvatarGrid() {
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
    
    setupAvatarEventListeners() {
        console.log('Налаштовуємо обробники подій для аватарів...');
        
        // Видаляємо старі обробники подій
        const avatarItems = document.querySelectorAll('.avatar-item');
        avatarItems.forEach(item => {
            item.replaceWith(item.cloneNode(true));
        });
        
        // Отримуємо нові елементи після клонування
        const newAvatarItems = document.querySelectorAll('.avatar-item');
        console.log('Знайдено аватарів:', newAvatarItems.length);
        
        newAvatarItems.forEach((item, index) => {
            console.log(`Аватар ${index + 1}:`, item.dataset.avatarUrl);
            item.addEventListener('click', () => {
                console.log('Клік по аватару:', item.dataset.avatarUrl);
                const avatarUrl = item.dataset.avatarUrl;
                if (avatarUrl && !item.classList.contains('taken')) {
                    console.log('Відправляємо вибір аватара:', avatarUrl);
                    this.selectAvatar(avatarUrl);
                } else {
                    console.log('Аватар зайнятий або URL відсутній');
                }
            });
        });
        
        const readyBtn = document.getElementById('player-ready-btn');
        if (readyBtn) {
            console.log('Кнопка "Готово" знайдена');
            // Видаляємо старі обробники
            readyBtn.replaceWith(readyBtn.cloneNode(true));
            const newReadyBtn = document.getElementById('player-ready-btn');
            newReadyBtn.addEventListener('click', () => {
                console.log('Натиснуто "Готово"');
                this.markPlayerReady();
            });
        } else {
            console.error('Кнопка "Готово" не знайдена!');
        }
    }
    
    selectAvatar(avatarUrl) {
        console.log('Відправляємо select_avatar на сервер:', avatarUrl);
        this.socket.emit('select_avatar', { avatarUrl });
    }
    
    markPlayerReady() {
        console.log('Відправляємо player_ready на сервер');
        this.socket.emit('player_ready', {});
    }
    
    // Обробники подій для аватарів
    setupAvatarEventHandlers() {
        console.log('Налаштовуємо обробники подій Socket.IO для аватарів...');
        
        // Видаляємо старі обробники
        this.socket.off('avatar_update');
        this.socket.off('ready_update');
        this.socket.off('all_players_ready_start_game');
        
        this.socket.on('avatar_update', (avatarSelections) => {
            console.log('Отримано avatar_update:', avatarSelections);
            this.updateAvatarGrid(avatarSelections);
        });
        
        this.socket.on('ready_update', (data) => {
            console.log('Отримано ready_update:', data);
            this.updateReadyCounter(data.readyCount, data.totalCount);
        });
        
        this.socket.on('all_players_ready_start_game', (data) => {
            console.log('Всі гравці готові! Запускаємо гру...', data);
            
            // Оновлюємо дані гравців з аватарами
            if (data.players) {
                this.players = data.players;
            }
            if (data.currentPlayerIndex !== undefined) {
                this.currentPlayerIndex = data.currentPlayerIndex;
            }
            
            this.startActualGame();
        });
    }
    
    updateAvatarGrid(avatarSelections) {
        console.log('Оновлюємо сітку аватарів з даними:', avatarSelections);
        const avatarItems = document.querySelectorAll('.avatar-item');
        console.log('Знайдено елементів аватарів для оновлення:', avatarItems.length);
        
        avatarItems.forEach((item, index) => {
            const avatarUrl = item.dataset.avatarUrl;
            const isTaken = Object.values(avatarSelections).includes(avatarUrl);
            
            console.log(`Аватар ${index + 1} (${avatarUrl}): ${isTaken ? 'зайнятий' : 'вільний'}`);
            
            if (isTaken) {
                item.classList.add('taken');
                item.style.filter = 'grayscale(100%)';
                const nameDiv = item.querySelector('div');
                const playerId = Object.keys(avatarSelections).find(id => avatarSelections[id] === avatarUrl);
                const player = this.players.find(p => p.id === playerId);
                if (nameDiv && player) {
                    nameDiv.textContent = player.name;
                    console.log(`Аватар ${avatarUrl} зайнятий гравцем ${player.name}`);
                }
            } else {
                item.classList.remove('taken');
                item.style.filter = 'none';
                const nameDiv = item.querySelector('div');
                if (nameDiv) {
                    nameDiv.textContent = 'Вільний';
                }
            }
        });
    }
    
    updateReadyCounter(readyCount, totalCount) {
        const counter = document.getElementById('ready-counter');
        if (counter) {
            counter.textContent = `Готово: ${readyCount} / ${totalCount}`;
        }
    }
    
    startActualGame() {
        console.log('🎮 Починаємо гру! Всі гравці готові.');
        
        // Приховуємо модальне вікно вибору аватарів
        const modal = document.getElementById('avatar-selection-modal');
        if (modal) {
            modal.classList.add('hidden');
            console.log('Модальне вікно вибору аватарів приховано');
        }
        
        // Спочатку програємо звук початку гри
        console.log('🔊 Програємо звук початку гри...');
        this.playStartGameSound();
        
        // Створюємо карту та запускаємо гру
        setTimeout(() => {
            try {
                console.log('🗺️ Створюємо карту...');
                this.createBoard();
                
                // Переходимо до ігрового інтерфейсу
                this.showGameInterface();
                this.updatePlayerInfo();
                this.updateDiceButtonState();
                
                // Приховуємо онлайн панель
                this.onlinePanel.classList.add('hidden');
                
                // Показуємо повідомлення
                this.addChatMessage('system', 'Гра почалася! Перший хід за ' + this.players[this.currentPlayerIndex].name);
                
                // Фокусуємо камеру на старті
                setTimeout(() => {
                    try {
                        const startCell = document.getElementById('cell-0');
                        if (startCell) {
                            this.centerViewOn(startCell);
                            console.log('📷 Камера сфокусована на старті');
                        } else {
                            console.error('Не знайдено стартову клітинку cell-0');
                        }
                    } catch (error) {
                        console.error('Помилка при фокусуванні камери:', error);
                    }
                }, 200);
                
                console.log('✅ Карта створена успішно');
            } catch (error) {
                console.error('❌ Помилка при створенні карти:', error);
                alert('Помилка при створенні карти. Спробуйте перезавантажити сторінку.');
            }
        }, 100);
        
        // Спершу показуємо правила, потім клас кожному гравцю
        setTimeout(() => {
            console.log('📖 Показуємо правила гри...');
            this.showRulesFirst();
        }, 1500);
    }
    
    // Методи для відтворення звуків
    playStartGameSound() {
        try {
            console.log('Спроба відтворення звуку початку гри...');
            
            // Скидаємо час відтворення
            this.startGameSound.currentTime = 0;
            
            // Додаємо обробник завершення звуку
            this.startGameSound.onended = () => {
                console.log('Звук початку гри завершився');
            };
            
            // Спробуємо відтворити звук
            const playPromise = this.startGameSound.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Звук початку гри успішно запущено');
                }).catch(error => {
                    console.log('Не вдалося відтворити звук початку гри:', error);
                    // Якщо звук не може відтворитися, все одно показуємо клас через 1.5 секунди
                });
            }
        } catch (e) {
            console.log('Помилка відтворення звуку початку гри:', e);
        }
    }
    
    playNotificationSound() {
        try {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(e => {
                console.log('Не вдалося відтворити звук сповіщення:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку сповіщення:', e);
        }
    }
    
    playTimerSound() {
        try {
            console.log('🔊 Запускаємо зациклений звук таймера...');
            
            // Зупиняємо попередній звук, якщо він грає
            this.stopTimerSound();
            
            // Скидаємо час відтворення
            this.timerSound.currentTime = 0;
            
            // Запускаємо звук
            const playPromise = this.timerSound.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('✅ Звук таймера успішно запущено (зациклений)');
                }).catch(error => {
                    console.log('❌ Не вдалося відтворити звук таймера:', error);
                });
            }
        } catch (e) {
            console.log('❌ Помилка відтворення звуку таймера:', e);
        }
    }
    
    stopTimerSound() {
        try {
            if (this.timerSound && !this.timerSound.paused) {
                console.log('🔇 Зупиняємо звук таймера...');
                this.timerSound.pause();
                this.timerSound.currentTime = 0;
            }
        } catch (e) {
            console.log('❌ Помилка зупинки звуку таймера:', e);
        }
    }
    
    playPvpSound() {
        try {
            this.pvpSound.currentTime = 0;
            this.pvpSound.play().catch(e => {
                console.log('Не вдалося відтворити звук PvP:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку PvP:', e);
        }
    }
    
    // Методи для адаптивного дизайну
    initResponsiveDesign() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.screenSize = this.getScreenSize();
        
        // Встановлюємо початковий масштаб
        this.updateScaleFactor();
        
        // Додаємо обробник зміни розміру вікна
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Додаємо обробник зміни орієнтації
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        console.log('Адаптивний дизайн ініціалізовано:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            screenSize: this.screenSize
        });
    }
    
    detectMobile() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    detectTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }
    
    getScreenSize() {
        const width = window.innerWidth;
        if (width <= 480) return 'xs';
        if (width <= 768) return 'sm';
        if (width <= 1024) return 'md';
        if (width <= 1366) return 'lg';
        if (width <= 1920) return 'xl';
        return 'xxl';
    }
    
    updateScaleFactor() {
        const width = window.innerWidth;
        let scaleFactor = 1;
        
        if (width <= 480) {
            scaleFactor = 0.5;
        } else if (width <= 768) {
            scaleFactor = 0.6;
        } else if (width <= 1024) {
            scaleFactor = 0.7;
        } else if (width <= 1366) {
            scaleFactor = 0.8;
        } else if (width <= 1920) {
            scaleFactor = 0.9;
        }
        
        document.documentElement.style.setProperty('--scale-factor', scaleFactor);
        this.scaleFactor = scaleFactor;
        
    }
    
    handleResize() {
        const oldScreenSize = this.screenSize;
        this.screenSize = this.getScreenSize();
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        
        this.updateScaleFactor();
        
        // Оновлюємо ігрове поле, якщо воно існує
        if (this.gameBoardContainer) {
            this.adjustGameBoard();
        }
        
        // Оновлюємо модальні вікна
        this.adjustModals();
    }
    
    handleOrientationChange() {
        console.log('Орієнтація змінилася');
        this.handleResize();
        
        // Додаткова логіка для зміни орієнтації
        if (this.gameBoardContainer) {
            setTimeout(() => {
                this.setInitialScale();
                this.applyTransform();
            }, 200);
        }
    }
    
    adjustGameBoard() {
        if (!this.gameBoardContainer) return;
        
        const container = this.gameContainer;
        const gameBoardWrapper = document.getElementById('game-board-wrapper');
        
        if (this.isMobile) {
            // На мобільних пристроях робимо ігрове поле вертикальним
            container.style.flexDirection = 'column';
            if (gameBoardWrapper) {
                gameBoardWrapper.style.width = '100%';
                gameBoardWrapper.style.height = '60vh';
                gameBoardWrapper.style.minHeight = '300px';
            }
        } else if (this.isTablet) {
            // На планшетах адаптуємо розміри
            container.style.flexDirection = 'row';
            if (gameBoardWrapper) {
                gameBoardWrapper.style.width = '70%';
                gameBoardWrapper.style.height = '80vh';
            }
        } else {
            // На десктопі стандартні розміри
            container.style.flexDirection = 'row';
            if (gameBoardWrapper) {
                gameBoardWrapper.style.width = 'auto';
                gameBoardWrapper.style.height = 'auto';
            }
        }
        
        // Оновлюємо масштаб карти
        setTimeout(() => {
            this.setInitialScale();
            this.applyTransform();
        }, 100);
    }
    
    adjustModals() {
        const modals = document.querySelectorAll('.modal-content');
        modals.forEach(modal => {
            if (this.isMobile) {
                modal.style.width = '95%';
                modal.style.maxWidth = '95%';
                modal.style.margin = '1rem';
                modal.style.padding = '1rem';
            } else if (this.isTablet) {
                modal.style.width = '80%';
                modal.style.maxWidth = '80%';
                modal.style.margin = '2rem';
                modal.style.padding = '1.5rem';
            } else {
                modal.style.width = '600px';
                modal.style.maxWidth = '90%';
                modal.style.margin = 'auto';
                modal.style.padding = '1.5rem';
            }
        });
    }
    
    // Перевизначення методу setInitialScale для адаптивності
    setInitialScale() {
        if (!this.gameBoardContainer) return;
        
        const container = this.gameBoardContainer.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Базові розміри карти
        const mapWidth = 1273;
        const mapHeight = 806;
        
        // Розраховуємо масштаб для різних пристроїв
        let scaleX, scaleY, scale;
        
        if (this.isMobile) {
            // На мобільних пристроях використовуємо більший масштаб для кращої видимості
            scaleX = (containerRect.width - 20) / mapWidth;
            scaleY = (containerRect.height - 20) / mapHeight;
            scale = Math.min(scaleX, scaleY) * 0.9; // Трохи менше для відступів
        } else if (this.isTablet) {
            // На планшетах середній масштаб
            scaleX = (containerRect.width - 40) / mapWidth;
            scaleY = (containerRect.height - 40) / mapHeight;
            scale = Math.min(scaleX, scaleY) * 0.95;
        } else {
            // На десктопі стандартний масштаб
            scaleX = containerRect.width / mapWidth;
            scaleY = containerRect.height / mapHeight;
            scale = Math.min(scaleX, scaleY);
        }
        
        // Обмежуємо масштаб
        scale = Math.max(0.1, Math.min(scale, 2));
        
        this.scale = scale;
        this.scaleX = scale;
        this.scaleY = scale;
    }
    
    // Додаємо підтримку touch-жестів
    setupTouchControls() {
        if (!this.gameBoardContainer) return;
        
        let startX, startY, startScale, startTranslateX, startTranslateY;
        let isPinching = false;
        let initialDistance = 0;
        
        // Обробник початку дотику
        this.gameBoardContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Одиночний дотик - початок переміщення
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTranslateX = this.translateX;
                startTranslateY = this.translateY;
            } else if (e.touches.length === 2) {
                // Подвійний дотик - початок масштабування
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                startScale = this.scale;
            }
        });
        
        // Обробник руху дотику
        this.gameBoardContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1 && !isPinching) {
                // Переміщення одним пальцем
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                
                this.translateX = startTranslateX + deltaX / this.scale;
                this.translateY = startTranslateY + deltaY / this.scale;
                this.applyTransform();
            } else if (e.touches.length === 2 && isPinching) {
                // Масштабування двома пальцями
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                const scaleChange = currentDistance / initialDistance;
                this.scale = Math.max(0.1, Math.min(startScale * scaleChange, 3));
                this.scaleX = this.scale;
                this.scaleY = this.scale;
                this.applyTransform();
            }
        });
        
        // Обробник завершення дотику
        this.gameBoardContainer.addEventListener('touchend', (e) => {
            isPinching = false;
        });
        
        console.log('Touch-контроли налаштовано');
    }
    
    // Ініціалізація дошки хрестиків-нуликів
    initializeTicTacToeBoard() {
        const board = document.getElementById('tic-tac-toe-board');
        if (!board) return;
        
        // Ініціалізуємо стан гри з підтримкою 3 раундів
        this.ticTacToeState = {
            gameActive: true,
            currentPlayer: 'X',
            gameState: ['', '', '', '', '', '', '', '', ''],
            playerSymbol: 'X', // Гравець завжди X
            opponentSymbol: 'O', // Опонент завжди O
            rounds: [{winner: null}, {winner: null}, {winner: null}],
            currentRound: 0,
            playerWins: 0,
            opponentWins: 0
        };
        
        // Очищаємо дошку
        board.innerHTML = '';
        
        // Створюємо 9 клітинок
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'tic-tac-toe-cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.makeTicTacToeMove(i));
            board.appendChild(cell);
        }
        
        // Оновлюємо статус гри
        this.updateTicTacToeStatus();
        
        console.log('Дошка хрестиків-нуликів ініціалізована');
    }
    
    // Ініціалізація дошки для спостерігачів
    initializeTicTacToeBoardForViewers() {
        const board = document.getElementById('tic-tac-toe-board-view');
        if (!board) return;
        
        // Очищаємо дошку
        board.innerHTML = '';
        
        // Створюємо 9 пустих клітинок для перегляду
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'tic-tac-toe-cell';
            cell.dataset.index = i;
            board.appendChild(cell);
        }
        
        console.log('Дошка для спостерігачів ініціалізована');
    }
    
    // Обробка ходу в хрестиках-нуликах
    makeTicTacToeMove(cellIndex) {
        const cell = document.querySelector(`[data-index="${cellIndex}"]`);
        if (!cell || this.ticTacToeState.gameState[cellIndex] !== '' || !this.ticTacToeState.gameActive) {
            return;
        }
        
        // Робимо хід
        this.ticTacToeState.gameState[cellIndex] = this.ticTacToeState.currentPlayer;
        cell.innerHTML = this.createPlayerSVG(this.ticTacToeState.currentPlayer);
        cell.classList.add(this.ticTacToeState.currentPlayer.toLowerCase());
        
        // Перевіряємо результат
        const result = this.checkTicTacToeResult();
        
        if (result.gameOver) {
            // Завершуємо поточний раунд
            this.ticTacToeState.rounds[this.ticTacToeState.currentRound].winner = result.winner;
            
            if (result.winner === 'X') {
                this.ticTacToeState.playerWins++;
            } else if (result.winner === 'O') {
                this.ticTacToeState.opponentWins++;
            }
            
            // Оновлюємо інформацію про раунди
            this.updateTicTacToeStatus(`Раунд ${this.ticTacToeState.currentRound + 1} завершено! ${result.message}`);
            this.disableTicTacToeBoard();
            
            // Перевіряємо чи є ще раунди
            if (this.ticTacToeState.currentRound < 2) {
                // Переходимо до наступного раунду
                setTimeout(() => {
                    this.nextRound();
                }, 2000);
            } else {
                // Всі 3 раунди завершені
                this.updateTicTacToeStatus(`Гра завершена! Ви: ${this.ticTacToeState.playerWins}, Супротивник: ${this.ticTacToeState.opponentWins}`);
                
                // Відправляємо результат на сервер
                setTimeout(() => {
                    this.submitTicTacToeResult({
                        gameOver: true,
                        rounds: this.ticTacToeState.rounds,
                        playerWins: this.ticTacToeState.playerWins,
                        opponentWins: this.ticTacToeState.opponentWins,
                        winner: this.ticTacToeState.playerWins > this.ticTacToeState.opponentWins ? 'X' : 'O'
                    });
                }, 2000);
            }
        } else {
            // Змінюємо гравця
            this.ticTacToeState.currentPlayer = this.ticTacToeState.currentPlayer === 'X' ? 'O' : 'X';
            this.updateTicTacToeStatus();
        }
        
        console.log(`Хід зроблено в клітинку ${cellIndex}`);
    }
    
    // Перехід до наступного раунду
    nextRound() {
        this.ticTacToeState.currentRound++;
        this.ticTacToeState.gameState = ['', '', '', '', '', '', '', '', ''];
        this.ticTacToeState.currentPlayer = 'X';
        this.ticTacToeState.gameActive = true;
        
        // Очищаємо дошку
        const board = document.getElementById('tic-tac-toe-board');
        if (board) {
            board.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.className = 'tic-tac-toe-cell';
                cell.dataset.index = i;
                cell.addEventListener('click', () => this.makeTicTacToeMove(i));
                board.appendChild(cell);
            }
        }
        
        this.updateTicTacToeStatus(`Раунд ${this.ticTacToeState.currentRound + 1} з 3`);
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
    
    // Перевірка результату гри
    checkTicTacToeResult() {
        const winningConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтальні
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикальні
            [0, 4, 8], [2, 4, 6] // Діагональні
        ];
        
        // Перевіряємо перемогу
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (this.ticTacToeState.gameState[a] && 
                this.ticTacToeState.gameState[a] === this.ticTacToeState.gameState[b] && 
                this.ticTacToeState.gameState[a] === this.ticTacToeState.gameState[c]) {
                
                const winner = this.ticTacToeState.gameState[a];
                return {
                    gameOver: true,
                    winner: winner,
                    message: `Гравець ${winner} переміг!`
                };
            }
        }
        
        // Перевіряємо нічию
        if (!this.ticTacToeState.gameState.includes('')) {
            return {
                gameOver: true,
                winner: null,
                message: 'Нічия!'
            };
        }
        
        return { gameOver: false };
    }
    
    // Оновлення статусу гри
    updateTicTacToeStatus(message = null) {
        const statusElement = document.getElementById('game-status');
        if (!statusElement) return;
        
        if (message) {
            statusElement.innerHTML = message;
        } else {
            const playerClass = this.ticTacToeState.currentPlayer.toLowerCase();
            statusElement.innerHTML = `Хід гравця: <span class="${playerClass}">${this.ticTacToeState.currentPlayer}</span>`;
        }
    }
    
    // Відключення дошки після завершення гри
    disableTicTacToeBoard() {
        const cells = document.querySelectorAll('.tic-tac-toe-cell');
        cells.forEach(cell => {
            cell.classList.add('disabled');
            cell.style.cursor = 'not-allowed';
        });
    }
    
    // Відправка результату на сервер
    submitTicTacToeResult(result) {
        this.socket.emit('tic_tac_toe_result', {
            roomId: this.roomId,
            winner: result.winner,
            gameState: this.ticTacToeState.gameState,
            result: result.message
        });
    }
    
    // Ініціалізація гри камінь-ножиці-папір
    initializeRockPaperScissors() {
        this.rpsGameState = {
            round: 1,
            playerWins: 0,
            opponentWins: 0,
            playerChoice: null,
            opponentChoice: null,
            gameFinished: false
        };
        
        // Додаємо обробники подій для кнопок
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
        
        console.log('Гра камінь-ножиці-папір ініціалізована');
    }
    
    // Обробка вибору в камінь-ножиці-папір
    makeRPSChoice(choice) {
        if (this.rpsGameState.gameFinished) return;
        
        this.rpsGameState.playerChoice = choice;
        
        // Показуємо вибір гравця
        const resultDiv = document.getElementById('rps-result');
        if (resultDiv) {
            resultDiv.textContent = `Ви обрали: ${this.getChoiceEmoji(choice)}`;
        }
        
        // Відправляємо вибір на сервер (поки що просто логуємо)
        console.log(`Гравець обрав: ${choice}`);
        
        // Пока що просто симулюємо гру
        setTimeout(() => {
            this.simulateRPSRound();
        }, 1000);
    }
    
    // Симуляція раунду камінь-ножиці-папір
    simulateRPSRound() {
        const choices = ['rock', 'paper', 'scissors'];
        const opponentChoice = choices[Math.floor(Math.random() * choices.length)];
        
        const playerChoice = this.rpsGameState.playerChoice;
        const result = this.getRPSResult(playerChoice, opponentChoice);
        
        // Оновлюємо рахунок
        if (result === 'win') {
            this.rpsGameState.playerWins++;
        } else if (result === 'lose') {
            this.rpsGameState.opponentWins++;
        }
        
        // Оновлюємо інтерфейс
        this.updateRPSInterface(result, opponentChoice);
        
        // Перевіряємо чи хтось виграв
        if (this.rpsGameState.playerWins >= 2 || this.rpsGameState.opponentWins >= 2) {
            this.rpsGameState.gameFinished = true;
            this.finishRPSGame();
        } else {
            // Переходимо до наступного раунду
            this.rpsGameState.round++;
            this.rpsGameState.playerChoice = null;
            setTimeout(() => {
                this.updateRPSInterface('next', null);
            }, 2000);
        }
    }
    
    // Оновлення інтерфейсу камінь-ножиці-папір
    updateRPSInterface(result, opponentChoice) {
        const roundDiv = document.getElementById('rps-round');
        const scoreDiv = document.getElementById('rps-score');
        const resultDiv = document.getElementById('rps-result');
        
        if (roundDiv) {
            roundDiv.textContent = `Раунд ${this.rpsGameState.round} з 3`;
        }
        
        if (scoreDiv) {
            scoreDiv.textContent = `Ваші перемоги: ${this.rpsGameState.playerWins} | Перемоги суперника: ${this.rpsGameState.opponentWins}`;
        }
        
        if (resultDiv && result !== 'next') {
            const playerEmoji = this.getChoiceEmoji(this.rpsGameState.playerChoice);
            const opponentEmoji = this.getChoiceEmoji(opponentChoice);
            
            let resultText = '';
            if (result === 'win') {
                resultText = `Ви виграли! ${playerEmoji} перемагає ${opponentEmoji}`;
            } else if (result === 'lose') {
                resultText = `Ви програли! ${opponentEmoji} перемагає ${playerEmoji}`;
            } else {
                resultText = `Нічия! ${playerEmoji} проти ${opponentEmoji}`;
            }
            
            resultDiv.textContent = resultText;
        } else if (resultDiv && result === 'next') {
            resultDiv.textContent = 'Оберіть свій хід для наступного раунду';
        }
    }
    
    // Завершення гри камінь-ножиці-папір
    finishRPSGame() {
        const resultDiv = document.getElementById('rps-result');
        if (resultDiv) {
            if (this.rpsGameState.playerWins >= 2) {
                resultDiv.textContent = '🎉 Ви виграли гру!';
            } else {
                resultDiv.textContent = '😞 Ви програли гру!';
            }
        }
        
        // Розблоковуємо кнопку завершення
        const submitBtn = document.getElementById('submit-result-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
    
    // Отримання емодзі для вибору
    getChoiceEmoji(choice) {
        const emojis = {
            'rock': '🪨',
            'paper': '📄',
            'scissors': '✂️'
        };
        return emojis[choice] || '❓';
    }
    
    // Визначення результату раунду
    getRPSResult(playerChoice, opponentChoice) {
        if (playerChoice === opponentChoice) {
            return 'tie';
        }
        
        const winConditions = {
            'rock': 'scissors',
            'paper': 'rock',
            'scissors': 'paper'
        };
        
        return winConditions[playerChoice] === opponentChoice ? 'win' : 'lose';
    }
    
    // Метод для показу модального вікна тестування подій
    showEventTestModal() {
        if (!this.isHost) {
            console.log('Тільки хост може тестувати події');
            return;
        }
        
        const events = [
            { type: 'pvp-quest', name: 'Пвп квест', description: 'Тестування пвп квесту' },
            { type: 'creative-quest', name: 'Творчий квест', description: 'Тестування творчого квесту' },
            { type: 'mad-libs-quest', name: 'Хто, де, коли?', description: 'Тестування квесту "Хто, де, коли?"' },
            { type: 'webnovella-quest', name: 'Вебновела', description: 'Тестування вебновели' },
            { type: 'alternative-path', name: 'Обхідний шлях', description: 'Тестування обхідного шляху' },
            { type: 'reincarnation', name: 'Реінкарнація', description: 'Тестування реінкарнації' }
        ];
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">🧪 Тестування подій</h3>
            <p class="mb-4 text-gray-600">Оберіть подію для тестування:</p>
            <div class="grid grid-cols-1 gap-3">
        `;
        
        events.forEach(event => {
            modalContent += `
                <button class="test-event-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300" 
                        data-event-type="${event.type}">
                    <div class="text-left">
                        <div class="font-bold">${event.name}</div>
                        <div class="text-sm opacity-90">${event.description}</div>
                    </div>
                </button>
            `;
        });
        
        modalContent += `
            </div>
            <div class="mt-4 text-center">
                <button class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Закрити
                </button>
            </div>
        `;
        
        this.showQuestModal('Тестування подій', modalContent, [], null);
        
        // Додаємо обробники для кнопок тестування
        setTimeout(() => {
            document.querySelectorAll('.test-event-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const eventType = e.currentTarget.dataset.eventType;
                    this.testEvent(eventType);
                });
            });
        }, 100);
    }
    
    // Метод для тестування конкретної події
    testEvent(eventType) {
        console.log(`Тестуємо подію: ${eventType}`);
        
        switch(eventType) {
            case 'pvp-quest':
                this.testPvPQuest();
                break;
            case 'creative-quest':
                this.testCreativeQuest();
                break;
            case 'mad-libs-quest':
                this.testMadLibsQuest();
                break;
            case 'webnovella-quest':
                this.testWebNovellaQuest();
                break;
            case 'alternative-path':
                this.testAlternativePath();
                break;
            case 'reincarnation':
                this.testReincarnation();
                break;
        }
    }
    
    // Тестування пвп квесту
    testPvPQuest(cellNumber, cellData) {
        let description = '';
        let questName = cellData.questName || 'Пвп квест';
        
        // Визначаємо опис залежно від назви квесту
        switch(questName) {
            case 'Мегамозок':
                description = 'Вам необхідно за 30 секунд згадати та написати якомога більше принципів педагогіки.';
                break;
            case 'Я у мами геній':
                description = 'Вам необхідно за 30 секунд згадати та написати якомога більше прізвищ видатних українських або зарубіжних педагогів.';
                break;
            case 'Педагобот':
                description = 'Вам необхідно за 30 секунд згадати та написати якомога більше якостей гарного педагога.';
                break;
            default:
                description = 'Напишіть якомога більше принципів освіти, розділяючи їх комами';
        }
        
        const testData = {
            title: questName,
            description: description,
            timer: 30,
            gameType: 'text',
            gameState: {
                players: [this.playerId],
                timer: 30,
                gameData: {
                    name: questName,
                    description: description,
                    title: questName
                }
            },
            player1: { name: 'Тестовий гравець 1', id: this.playerId },
            player2: { name: 'Тестовий гравець 2', id: 'test-player-2' },
            activePlayerId: this.playerId
        };
        
        this.showTimedTextQuest(testData);
    }
    
    // Тестування творчого квесту
    testCreativeQuest(cellNumber, cellData) {
        let description = '';
        let questName = cellData.questName || 'Творчий квест';
        
        // Визначаємо опис залежно від назви квесту
        switch(questName) {
            case 'Великий Педагогічний…':
                description = 'Вам необхідно за 1 хвилину згадати або вигадати найкращий, найсмішніший, найсечогінніший анекдот в історії людства.';
                break;
            case 'Я у мами педагог':
                description = 'Вам необхідно за одну хвилину вигадати та коротко описати найкращий спосіб навчити чомусь іншого.';
                break;
            case 'Хроніки Неіснуючого Вояжу':
                description = 'Вам необхідно вигадати цікаву історію. Кожному гравцеві буде надано 5 спроб написати речення, яке стане логічним продовженням речення попереднього гравця.';
                break;
            default:
                description = 'Опишіть ідеальну школу майбутнього';
        }
        
        const testData = {
            title: questName,
            description: description,
            timer: 60,
            gameState: {
                players: [this.playerId],
                timer: 60,
                gameData: {
                    title: questName,
                    description: description
                }
            },
            activePlayerId: this.playerId
        };
        
        this.showCreativeQuest(testData);
    }
    
    // Тестування квесту "Хто, де, коли?"
    testMadLibsQuest(cellNumber, cellData) {
        let question = 'Хто?';
        let questName = cellData.questName || 'Хто? Де? Коли?';
        
        if (questName === 'Хто? Де? Коли?') {
            question = 'Хто?';
        }
        
        const testData = {
            question: question,
            questName: questName,
            activePlayerId: this.playerId,
            currentPlayer: { name: 'Тестовий гравець' }
        };
        
        this.showMadLibsQuestion(testData);
    }
    
    // Тестування вебновели
    testWebNovellaQuest(cellNumber, cellData) {
        let description = '';
        let questName = cellData.questName || 'Вебновела';
        let eventNumber = cellData.eventNumber || 1;
        
        // Визначаємо опис залежно від номера події
        if (questName === 'Халепа!') {
            switch(eventNumber) {
                case 1:
                    description = 'Ви — класний керівник. Під час перевірки щоденників ви виявляєте, що один з учнів Дікапріардіус на останній сторінці замість підпису батьків намалював вам величезний, але досить деталізований… портрет у формі єдинорога.';
                    break;
                case 2:
                    description = 'Учень Євкакій, який завжди запізнюється, вривається до класу на 15 хвилин пізніше з поясненням: "Вибачте, мене викрали інопланетяни для короткого експерименту".';
                    break;
                case 3:
                    description = 'Ви виставили підсумкову оцінку 9 балів старанній учениці Серафіма, яка завжди наполегливо працює. Вона підходить до вас засмучена і каже: "Я витратила на ваш предмет більше часу, ніж на інші.';
                    break;
                default:
                    description = 'Ви перебуваєте у складній педагогічній ситуації. Визначте свій фінал розвитку подій та кінець історії.';
            }
        } else {
            description = 'Продовжіть історію про подорож у часі';
        }
        
        const testData = {
            title: questName,
            description: description,
            currentSentence: description,
            event: {
                text: description,
                currentSentence: description
            },
            activePlayerId: this.playerId
        };
        
        this.showWebNovellaEvent(testData);
    }
    
    // Тестування обхідного шляху
    testAlternativePath(cellData, cellNumber) {
        const target = cellData.target || 1;
        const cost = cellData.cost || 10;
        const description = cellData.description || `Обхідний шлях до клітинки ${target} за ${cost} ОО`;
        const isTestMode = this.isTestMode;
        
        // Додаємо клас для фонового зображення
        document.body.classList.add('glassmorphism-bg');
        
        const modalHTML = `
            <div class="glassmorphism-modal" id="test-bypass-modal">
                <div class="glassmorphism-content-bypass">
                    <div class="glassmorphism-header">
                        <h2>🛤️ Обхідна дорога!</h2>
                        ${isTestMode ? `
                            <button class="close-test-modal-btn" onclick="document.getElementById('test-bypass-modal').remove(); document.body.classList.remove('glassmorphism-bg');">✖</button>
                        ` : ''}
                        <p>Тестовий гравець знайшов обхідний шлях!</p>
                        <p>${description}</p>
                    </div>
                    
                    <div class="glassmorphism-spacer"></div>
                    
                    <div class="glassmorphism-actions">
                        <button class="glassmorphism-btn-primary" id="test-bypass-yes-btn">
                            Так, обійти (${cost} ОО)
                        </button>
                        <button class="glassmorphism-btn-secondary" id="test-bypass-no-btn">
                            Ні, йти далі
                        </button>
                        ${isTestMode ? `
                            <button class="glassmorphism-btn-secondary w-full mt-2" onclick="document.getElementById('test-bypass-modal').remove(); document.body.classList.remove('glassmorphism-bg');">
                                Закрити
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо існуюче модальне вікно, якщо є
        const existingModal = document.getElementById('test-bypass-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Додаємо нове модальне вікно
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Додаємо обробники подій
        setTimeout(() => {
            const yesBtn = document.getElementById('test-bypass-yes-btn');
            const noBtn = document.getElementById('test-bypass-no-btn');
            
            if (yesBtn) {
                yesBtn.addEventListener('click', () => {
                    const modal = document.getElementById('test-bypass-modal');
                    if (modal) {
                        modal.remove();
                        document.body.classList.remove('glassmorphism-bg');
                    }
                });
            }
            
            if (noBtn) {
                noBtn.addEventListener('click', () => {
                    const modal = document.getElementById('test-bypass-modal');
                    if (modal) {
                        modal.remove();
                        document.body.classList.remove('glassmorphism-bg');
                    }
                });
            }
        }, 100);
    }
    
    // Тестування реінкарнації
    testReincarnation() {
        this.showQuestModal('Реінкарнація', `
            <h3 class="text-2xl font-bold mb-4">🔄 Реінкарнація</h3>
            <p class="mb-4">Ви можете повернутися на початок гри за 50 ОО</p>
            <div class="flex gap-3">
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Так, повернутися (50 ОО)
                </button>
                <button class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Ні, залишитися
                </button>
            </div>
        `, [], null);
    }
    
    // Тестування хрестиків-нуликів на конкретній клітинці
    testTicTacToeCell() {
        const testData = {
            gameState: {
                players: [this.playerId],
                timer: 60,
                gameData: {
                    name: 'Хреститися рано!',
                    description: 'Класична гра хрестики-нулики. Перший гравець ставить хрестики, другий - нулики. Перемагає той, хто першим вирівняє три свої символи в ряд.',
                    gameType: 'tic_tac_toe'
                }
            },
            player1: { name: 'Тестовий гравець 1', id: this.playerId },
            player2: { name: 'Тестовий гравець 2', id: 'test-player-2' },
            activePlayerId: this.playerId
        };
        this.showTicTacToeModal(testData);
    }
    
    // Тестування камінь-ножиці-папір на конкретній клітинці
    testRockPaperScissorsCell() {
        const testData = {
            gameState: {
                players: [this.playerId],
                gameData: {
                    name: 'Камінь, Ножиці, Папір',
                    description: 'Класична гра камінь-ножиці-папір. Гра проходить у три раунди. Перемагає той, хто першим набере дві перемоги.',
                    gameType: 'rock_paper_scissors'
                }
            },
            player1: { name: 'Тестовий гравець 1', id: this.playerId },
            player2: { name: 'Тестовий гравець 2', id: 'test-player-2' },
            activePlayerId: this.playerId
        };
        this.showRockPaperScissorsModal(testData);
    }
    
    // Тестування тестового завдання на конкретній клітинці
    testQuestionCell(cellNumber) {
        const questionData = window.TEST_QUESTIONS[cellNumber];
        if (!questionData) {
            alert(`Тестове завдання для клітинки ${cellNumber} не знайдено`);
            return;
        }
        
        this.showTestQuestion({
            eventType: 'test-question',
            eventData: { cellNumber: cellNumber },
            playerId: this.playerId,
            playerName: 'Тестовий гравець'
        });
    }
    
    // Методи для роботи з бафами/дебафами
    showBuffDebuffModal() {
        const modal = document.getElementById('buff-debuff-modal');
        if (!modal) return;
        
        // Оновлюємо ОО гравця
        const pointsEl = document.getElementById('buff-modal-points');
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (pointsEl && currentPlayer) {
            pointsEl.textContent = currentPlayer.points || 0;
        }
        
        // Заповнюємо списки цілей
        this.populateTargets();
        
        // Оновлюємо доступність кнопок
        this.updateBuffButtonsState();
        
        // Показуємо модальне вікно
        modal.classList.remove('hidden');
    }
    
    populateTargets() {
        const hateSelect = document.getElementById('hate-target');
        const procSelect = document.getElementById('procrastination-target');
        const pushbackSelect = document.getElementById('pushback-target');
        
        if (hateSelect && procSelect) {
            // Очищаємо списки
            hateSelect.innerHTML = '';
            procSelect.innerHTML = '';
            if (pushbackSelect) pushbackSelect.innerHTML = '';
            
            // Додаємо опції для інших гравців
            this.players.forEach(player => {
                if (player.id !== this.playerId && !player.hasLost) {
                    const option = document.createElement('option');
                    option.value = player.id;
                    option.textContent = player.name;
                    hateSelect.appendChild(option.cloneNode(true));
                    procSelect.appendChild(option.cloneNode(true));
                    if (pushbackSelect) pushbackSelect.appendChild(option.cloneNode(true));
                }
            });
        }
    }
    
    updateBuffButtonsState() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const points = currentPlayer.points || 0;
        
        // Оновлюємо кнопки
        const applyHateBtn = document.getElementById('apply-hate-btn');
        const applyHappinessBtn = document.getElementById('apply-happiness-btn');
        const applyProcrastinationBtn = document.getElementById('apply-procrastination-btn');
        const applyPushbackBtn = document.getElementById('apply-pushback-btn');
        const applyBoostForwardBtn = document.getElementById('apply-boost-forward-btn');
        
        const hasOtherPlayers = this.players.filter(p => p.id !== this.playerId && !p.hasLost).length > 0;
        
        if (applyHateBtn) {
            applyHateBtn.disabled = points < 100 || !hasOtherPlayers;
        }
        
        if (applyHappinessBtn) {
            applyHappinessBtn.disabled = points < 100;
        }
        
        if (applyProcrastinationBtn) {
            applyProcrastinationBtn.disabled = points < 50 || !hasOtherPlayers;
        }
        
        if (applyPushbackBtn) {
            applyPushbackBtn.disabled = points < 50 || !hasOtherPlayers;
        }
        
        if (applyBoostForwardBtn) {
            applyBoostForwardBtn.disabled = points < 50;
        }
    }
    
    handleApplyEffect(effectType, cost) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer) return;
        
        if (currentPlayer.points < cost) {
            alert('Недостатньо ОО для цього бафа/дебафа!');
            return;
        }
        
        let targetPlayerId = null;
        
        // Для дебафів потрібна ціль
        if (effectType === 'hateClone') {
            const select = document.getElementById('hate-target');
            if (!select || !select.value) {
                alert('Оберіть ціль!');
                return;
            }
            targetPlayerId = select.value;
        } else if (effectType === 'procrastination') {
            const select = document.getElementById('procrastination-target');
            if (!select || !select.value) {
                alert('Оберіть ціль!');
                return;
            }
            targetPlayerId = select.value;
        } else if (effectType === 'pushBack') {
            const select = document.getElementById('pushback-target');
            if (!select || !select.value) {
                alert('Оберіть ціль!');
                return;
            }
            targetPlayerId = select.value;
        }
        
        // Відправляємо подію на сервер
        if (this.socket) {
            this.socket.emit('apply_effect', {
                roomId: this.roomId,
                effectType: effectType,
                targetPlayerId: targetPlayerId
            });
        }
        
        // Закриваємо модальне вікно
        document.getElementById('buff-debuff-modal').classList.add('hidden');
    }
    
    
    closeQuestModal() {
        const modal = document.getElementById('quest-modal');
        if (modal) modal.classList.add('hidden');
    }
}

// Експорт для використання в інших файлах
window.MultiplayerGame = MultiplayerGame;
