// Мультиплеєр клас для Socket.io
class MultiplayerGame extends EducationalPathGame {
    constructor() {
        super();
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
        
        // Додаємо елемент для виходу з кімнати
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        
        console.log('Елементи мультиплеєра налаштовано');
    }
    
    setupMultiplayerEventListeners() {
        console.log('Налаштовуємо обробники подій для кнопок режиму');
        
        // Обробники для кнопок режиму
        if (this.localModeBtn) {
            this.localModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Натиснуто локальний режим');
                this.startLocalMode();
            });
        } else {
            console.error('Кнопка локального режиму не знайдена!');
        }
        
        if (this.onlineModeBtn) {
            this.onlineModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Натиснуто онлайн режим');
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
        
        // Обробник для кнопки виходу з кімнати
        if (this.leaveRoomBtn) {
            this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        }
        
        console.log('Обробники подій мультиплеєра налаштовано');
    }
    
    checkForSavedGame() {
        const savedGame = sessionStorage.getItem('activeGameRoom');
        if (savedGame) {
            try {
                const gameData = JSON.parse(savedGame);
                console.log('Знайдено збережену гру:', gameData);
                
                // Показуємо повідомлення про можливість перепідключення
                if (confirm('Знайдено збережену гру. Перепідключитися?')) {
                    this.reconnectToGame(gameData);
                } else {
                    // Видаляємо збережені дані
                    sessionStorage.removeItem('activeGameRoom');
                }
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
        
        // Показуємо ігровий контейнер
        this.gameContainer.classList.remove('hidden');
        
        // Показуємо правила гри для локального режиму
        this.rulesModal.classList.remove('hidden');
        
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
        
        // Показуємо онлайн панель
        this.onlinePanel.classList.remove('hidden');
        
        // Підключаємося до сервера
        this.connectToServer();
        
        console.log('Онлайн режим запущено');
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
        } else {
            console.error('Не можу почати гру:', {
                isHost: this.isHost,
                roomId: this.roomId,
                socket: !!this.socket
            });
        }
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
            window.gameUI.showQuestModal('Результати турніру', resultsHTML, [], 'image/modal_window/room_creation.png');
            
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
        
        console.log('Ігровий інтерфейс показано');
        this.updateDiceButtonState();
    }

    // Вмикаємо/вимикаємо кнопку кидка кубика залежно від черги
    updateDiceButtonState() {
        if (!this.isOnlineMode) return;
        const currentPlayer = this.players && this.players[this.currentPlayerIndex];
        const isMyTurn = currentPlayer && currentPlayer.id === this.playerId && this.gameActive;
        
        console.log('updateDiceButtonState:', {
            currentPlayer: currentPlayer?.name,
            myPlayerId: this.playerId,
            isMyTurn,
            gameActive: this.gameActive
        });
        
        if (this.rollDiceBtn) {
            this.rollDiceBtn.disabled = !isMyTurn;
            // Не приховуємо кнопку, а просто робимо її неактивною
            this.rollDiceBtn.style.opacity = isMyTurn ? '1' : '0.5';
            this.rollDiceBtn.style.cursor = isMyTurn ? 'pointer' : 'not-allowed';
            
            // Оновлюємо текст кнопки
            if (isMyTurn) {
                this.rollDiceBtn.textContent = 'Кинути кубик';
            } else {
                this.rollDiceBtn.textContent = `Хід: ${currentPlayer?.name || 'Невідомо'}`;
            }
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
                currentPlayerPointsEl.textContent = `${currentPlayer.points || 0} ОО`;
            }
            
            // Оновлюємо таблицю лідерів
            this.updateLeaderboard();
        }
    }
    
    // Оновлюємо таблицю лідерів
    updateLeaderboard() {
        const leaderboardEl = document.getElementById('leaderboard');
        if (!leaderboardEl || !this.players) return;
        
        const sortedPlayers = this.players
            .filter(p => !p.hasLost)
            .sort((a, b) => (b.points || 0) - (a.points || 0));
        
        leaderboardEl.innerHTML = `
            <h3 class="text-lg font-semibold mt-2">Таблиця лідерів</h3>
            ${sortedPlayers.map((p, index) => `
                <div class="flex justify-between items-center py-1">
                    <span style="color:${p.color};">${p.name}</span>
                    <span class="text-yellow-300">${p.points || 0} ОО</span>
                </div>
            `).join('')}
        `;
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
            this.diceInner.style.transform = `${rotations[data.roll]} translateZ(40px)`;
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
                console.log('Показуємо подію після завершення анімації:', data.eventInfo);
                this.showEventPrompt({
                    playerId: data.eventInfo.playerId,
                    playerName: data.eventInfo.playerName,
                    eventType: data.eventInfo.eventType,
                    eventData: data.eventInfo.eventData,
                    activePlayerId: data.eventInfo.playerId
                });
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
        } else if (data.eventType === 'reincarnation') {
            modalContent = `
                <h3 class="text-2xl font-bold mb-4">Реінкарнація!</h3>
                <p class="mb-4">${data.playerName} завершив епоху!</p>
                <p class="mb-4">Перейти до наступної епохи та отримати ${data.eventData.points} ОО?</p>
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
        } else if (data.eventType === 'alternative-path') {
            modalContent = `
                <h3 class="text-2xl font-bold mb-4">Обхідна дорога!</h3>
                <p class="mb-4">${data.playerName} знайшов обхідний шлях!</p>
                <p class="mb-4">${data.eventData.description}</p>
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
        }
        
        this.showQuestModal('Подія', modalContent, buttons, 'image/modal_window/bypass_road.png');
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
        
        // Закриваємо модальне вікно для всіх гравців
        this.questModal.classList.add('hidden');
        
        // Оновлюємо UI
        this.updatePlayerInfo();
        this.updateLeaderboard();
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
        
        this.updateUI();
        
        // Оновлюємо позиції фішок
        this.players.forEach(player => {
            this.updatePawnPosition(player);
        });
        
        if (data.gameActive) {
            this.rollDiceBtn.disabled = false;
        }
    }
    
    handleRemoteQuest(data) {
        // Обробка віддалених квестів
        this.showQuestModal(data.title, data.description, data.buttons, 'image/modal_window/i_am_a_teacher.png');
    }
    
    handleQuestVote(data) {
        // Обробка голосування в квестах
        this.addChatMessage('system', `${data.player.name} проголосував за "${data.choice}"`);
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
    
    // Показуємо роздачу класів гравцям
    showPlayerClassAssignment() {
        const myPlayer = this.players.find(p => p.id === this.playerId);
        if (!myPlayer || !myPlayer.class) {
            console.log('Клас гравця не знайдено або гравець не існує');
            return;
        }
        
        console.log('Показуємо клас гравця:', myPlayer.name, myPlayer.class.name);
        
        const classInfo = myPlayer.class;
        const modalContent = `
            <h3 class="text-2xl font-bold mb-4">Ваш клас!</h3>
            <div class="text-center mb-6">
                <div class="text-4xl mb-2">${classInfo.name}</div>
                <div class="text-lg text-gray-300 mb-2">Стартові очки: ${classInfo.startPoints}</div>
                <div class="text-lg text-gray-300">Модифікатор руху: ${classInfo.moveModifier > 0 ? '+' : ''}${classInfo.moveModifier}</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg mb-4">
                <h4 class="font-bold mb-2">Особливості класу:</h4>
                <ul class="text-sm text-gray-300">
                    ${this.getClassDescription(classInfo.id)}
                </ul>
            </div>
            <button id="close-class-modal-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Зрозуміло
            </button>
        `;
        
        if (window.gameUI) {
            window.gameUI.showQuestModal('Роздача класів', modalContent, [], 'image/modal_window/room_creation.png');
            
            // Додаємо обробник події
            setTimeout(() => {
                const closeBtn = document.getElementById('close-class-modal-btn');
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
            this.rollDiceBtn.textContent = '👁️ Режим спостерігача';
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
            
            if (isCurrentPlayer) {
                this.rollDiceBtn.textContent = '🎲 Ваш хід - Кинути кубик';
                this.rollDiceBtn.style.backgroundColor = '#10b981'; // Зелений колір
            } else {
                this.rollDiceBtn.textContent = `⏳ Не ваш хід - Хід гравця ${currentPlayer?.name || 'невідомо'}`;
                this.rollDiceBtn.style.backgroundColor = '#6b7280'; // Сірий колір
            }
        } else {
            this.rollDiceBtn.disabled = !this.gameActive;
            this.rollDiceBtn.style.opacity = this.gameActive ? '1' : '0.5';
            this.rollDiceBtn.textContent = 'Кинути кубик';
            this.rollDiceBtn.style.backgroundColor = '#eab308'; // Жовтий колір
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
    
    // Показуємо модальне вікно приєднання до кімнати
    showRoomJoinedModal(roomCode) {
        const modalContent = `
            <div class="text-center">
                <p class="mb-4 text-lg font-bold text-green-600">Вітаю! Ви зайшли у кімнату, створену гравцем, як Земля Боженькою.</p>
                <p class="mb-4">Код кімнати:</p>
                <div class="bg-gray-100 p-4 rounded-lg mb-4 text-center">
                    <span class="text-3xl font-bold text-blue-600">${roomCode}</span>
                </div>
                <button id="close-room-modal-btn" class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                    Закрити
                </button>
            </div>
        `;
        
        if (window.gameUI) {
            window.gameUI.showQuestModal('Приєднано до кімнати', modalContent, [], 'image/modal_window/room_creation.png');
            
            // Додаємо обробник події
            setTimeout(() => {
                const closeBtn = document.getElementById('close-room-modal-btn');
                
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
    
    // Нові міні-ігри
    showTimedTextQuest(data) {
        const isParticipant = data.gameState.players.includes(this.playerId);
        const isMyEvent = data.activePlayerId === this.playerId;
        const gameData = data.gameState.gameData;
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">${gameData.name}!</h3>
            <p class="mb-4">${gameData.description}</p>
            <p class="mb-4">${data.player1.name} проти ${data.player2.name}</p>
        `;
        
        if (isParticipant) {
            if (gameData.gameType === 'tic_tac_toe' || gameData.gameType === 'cross_early') {
                // Спеціальний інтерфейс для хрестиків-нуликів
                modalContent += `
                    <div class="mb-4">
                        <div id="tic-tac-toe-board" class="tic-tac-toe-grid mx-auto mb-4"></div>
                        <div id="game-status" class="text-center text-lg font-bold mb-2">Ваш хід!</div>
                        <div id="timer" class="text-2xl font-bold text-red-500 text-center">${data.gameState.timer}</div>
                    </div>
                    <button id="submit-result-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" disabled>
                        Завершити гру
                    </button>
                `;
            } else if (gameData.gameType === 'rock_paper_scissors') {
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
                        <textarea id="text-input" class="w-full h-32 p-3 border-2 border-gray-400 rounded" placeholder="Введіть якомога більше слів..."></textarea>
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
        
        // Визначаємо картинку залежно від типу гри
        let imagePath = null;
        if (gameData.gameType === 'pedagogobot') {
            imagePath = 'image/modal_window/robot.png';
        } else if (gameData.gameType === 'tic_tac_toe' || gameData.gameType === 'cross_early') {
            imagePath = 'image/modal_window/rock_paper_scissor.png';
        } else if (gameData.gameType === 'rock_paper_scissors') {
            imagePath = 'image/modal_window/rock_paper_scissor.png';
        }
        
        this.showQuestModal('PvP-квест', modalContent, [], imagePath);
        
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
            }
            this.startTimedTextQuestTimer(data.gameState.timer);
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
        const wordsCount = text.split(/\s+/).filter(word => word.length > 0).length;
        
        this.socket.emit('timed_text_quest_result', {
            roomId: this.roomId,
            wordsCount: wordsCount
        });
    }
    
    endTimedTextQuest(data) {
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
            
            this.showQuestModal('PvP-квест', modalContent, buttons, 'image/modal_window/rock_paper_scissor.png');
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
                    ${data.gameState.story.map(s => `<p>${s.playerName}: ${s.sentence}</p>`).join('')}
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
        
        this.showQuestModal('Творчий квест', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
        
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
                    ${data.gameState.story.map(s => `<p>${s.playerName}: ${s.sentence}</p>`).join('')}
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
        
        this.showQuestModal('Творчий квест', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
        
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
                    ${data.story.map(s => `<p>${s.playerName}: ${s.sentence}</p>`).join('')}
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
            
            this.showQuestModal('Творчий квест', modalContent, [], data.gameState.gameType === 'pedagog_mom' ? 'image/modal_window/i_am_a_teacher.png' : null);
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
        
        this.showQuestModal('Творчий квест', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
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
        
        this.showQuestModal('Творчий квест', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
        
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
        
        this.showQuestModal('Голосування', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
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
        const isMyTurn = data.activePlayerId === this.playerId;
        
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Хто, де, коли?</h3>
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
        
        this.showQuestModal('Хто, де, коли?', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
        
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
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Хто, де, коли?</h3>
            <p class="mb-4">Питання: <strong>${data.question}</strong></p>
            <p class="text-center text-gray-600">Черга гравця ${data.currentPlayer.name}</p>
        `;
        
        this.showQuestModal('Хто, де, коли?', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
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
        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">Хто, де, коли? завершено!</h3>
            <div class="mb-4">
                <h4 class="font-bold mb-2">Ось історія, яка вийшла:</h4>
                <div class="bg-gray-100 p-4 rounded text-lg">
                    ${data.story}
                </div>
            </div>
        `;
        
        this.showQuestModal('Хто, де, коли?', modalContent, [
            { text: 'Закрити', callback: () => this.closeMiniGame() }
        ]);
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
        
        this.showQuestModal('Вебновела', modalContent, [], 'image/modal_window/i_am_a_teacher.png');
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
        
        // Показуємо клас кожному гравцю після закінчення звуку (приблизно 1.5 секунди)
        setTimeout(() => {
            console.log('🎭 Показуємо клас гравця після закінчення звуку...');
            this.showPlayerClassAssignment();
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
        
        console.log('Масштаб оновлено:', { width, scaleFactor });
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
        
        console.log('Розмір екрану змінився:', {
            oldScreenSize,
            newScreenSize: this.screenSize,
            isMobile: this.isMobile,
            isTablet: this.isTablet
        });
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
        
        console.log('Адаптивний масштаб встановлено:', {
            scale,
            containerWidth: containerRect.width,
            containerHeight: containerRect.height,
            isMobile: this.isMobile,
            isTablet: this.isTablet
        });
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
        
        console.log('Дошка хрестиків-нуликів ініціалізована');
    }
    
    // Обробка ходу в хрестиках-нуликах
    makeTicTacToeMove(cellIndex) {
        const cell = document.querySelector(`[data-index="${cellIndex}"]`);
        if (!cell || cell.textContent !== '') return;
        
        // Пока що просто ставимо X (пізніше додамо логіку гри)
        cell.textContent = 'X';
        cell.classList.add('x');
        
        console.log(`Хід зроблено в клітинку ${cellIndex}`);
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
}

// Експорт для використання в інших файлах
window.MultiplayerGame = MultiplayerGame;
