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
        
        // Спочатку налаштовуємо елементи мультиплеєра
        this.setupMultiplayerElements();
        // Потім обробники подій мультиплеєра (перезаписують базові)
        this.setupMultiplayerEventListeners();
        
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
        this.playerNameInput = document.getElementById('player-name');
        this.createRoomBtn = document.getElementById('create-room-btn');
        
        this.roomCodeInput = document.getElementById('room-code');
        this.joinPlayerNameInput = document.getElementById('join-player-name');
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
        this.startGameBtn = document.getElementById('start-game-btn');
        
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
            this.updatePlayersList(data.players);
            this.showPlayersList();
            this.showChat();
            this.showRoomCode(data.roomId);
            this.logMessage(`Кімната "${data.roomName}" створена! Код: ${this.roomId}`, 'system');
            
            // Зберігаємо стан гри
            sessionStorage.setItem('activeGameRoom', JSON.stringify({ 
                roomId: this.roomId, 
                playerId: this.playerId 
            }));
            
            // Показуємо кнопку виходу
            this.leaveRoomBtn.classList.remove('hidden');
            
            // Показуємо код кімнати в модальному вікні
            this.showRoomCodeModal(data.roomId, data.roomName);
        });
        
        this.socket.on('room_joined', (data) => {
            this.roomId = data.roomId;
            this.isHost = false;
            this.updatePlayersList(data.players);
            this.showPlayersList();
            this.showChat();
            this.logMessage(`Приєднано до кімнати "${data.roomName}"`, 'system');
            
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
            
            this.logMessage(`Ви приєдналися як спостерігач до кімнати "${data.roomName}"`, 'system');
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
                    this.logMessage(data.message, 'system');
                    
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
                    console.log('Початок голосування:', data);
                    this.showVoting(data);
                });

                this.socket.on('creative_voting_end', (data) => {
                    console.log('Кінець голосування:', data);
                    this.endCreativeVoting(data);
                });

                this.socket.on('mad_libs_question', (data) => {
                    console.log('Питання для "Хто, де, коли?":', data);
                    this.showMadLibsQuestion(data);
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
            this.logMessage(data.message, 'reincarnation');
            
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
                
                // Перевіряємо, чи знаходимося серед гравців
                const myPlayer = this.players.find(p => p.id === this.playerId);
                console.log('Мій гравець в грі:', myPlayer);
                console.log('Мій playerId:', this.playerId);
                console.log('Всі гравці:', this.players.map(p => ({ name: p.name, id: p.id })));
                
                // КРИТИЧНО: Створюємо карту для всіх гравців
                // Чекаємо трохи щоб mapData встиг завантажитися
                setTimeout(() => {
                    try {
                        console.log('Створюємо карту...');
                        this.createBoard();
                        
                        // Переходимо до ігрового інтерфейсу
                        this.showGameInterface();
                        this.updatePlayerInfo();
                        this.updateDiceButtonState();
                        
                        // Приховуємо онлайн панель
                        this.onlinePanel.classList.add('hidden');
                        
                        // Показуємо повідомлення
                        this.addChatMessage('system', 'Гра почалася! Перший хід за ' + this.players[this.currentPlayerIndex].name);
                        
                        // Показуємо клас кожному гравцю
                        this.showPlayerClassAssignment();
                        
                        // KРИТИЧНО: Фокусуємо камеру на старті для всіх гравців
                        setTimeout(() => {
                            try {
                                const startCell = document.getElementById('cell-0');
                                if (startCell) {
                                    this.centerViewOn(startCell);
                                    console.log('Камера сфокусована на старті');
                                } else {
                                    console.error('Не знайдено стартову клітинку cell-0');
                                }
                            } catch (error) {
                                console.error('Помилка при фокусуванні камери:', error);
                            }
                        }, 200);
                        
                        console.log('Карта створена успішно');
                    } catch (error) {
                        console.error('Помилка при створенні карти:', error);
                        alert('Помилка при створенні карти. Спробуйте перезавантажити сторінку.');
                    }
                }, 100);
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
                <div style="color: ${player.color};">${player.name}</div>
                <div class="text-sm text-gray-400">${player.class?.name || 'Не обрано'}</div>
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
        this.playersList.classList.remove('hidden');
    }
    
    showChat() {
        this.chatContainer.classList.remove('hidden');
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
        
        this.logMessage(`🎉 ${eliminatedPlayer.name} досяг 300 ОО і займає ${data.position} місце!`, 'system');
        
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
        
        this.logMessage(message, 'system');
        
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
            window.gameUI.showQuestModal('Результати турніру', resultsHTML);
            
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
                    this.logMessage(`Зараз хід гравця ${currentPlayer?.name || 'невідомо'}`, 'system');
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
        
        this.logMessage(`${player.name}${player.class ? ' (' + player.class.name + ')' : ''} викинув ${data.roll}. Рух: ${data.move}.`, 'roll');
        
        // Не оновлюємо кнопку тут - оновимо після turn_changed
    }
    
    handleRemotePlayerMove(data) {
        const player = this.players.find(p => p.id === data.playerId);
        if (!player) return;
        
        player.position = data.position;
        this.updatePawnPosition(player);
        this.logMessage(`${player.name} перемістився на клітинку ${data.position}.`, 'system');
    }
    
    handleSpecialCell(player, cellData) {
        this.logMessage(`${player.name} потрапив на подію!`, 'event');
        
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
            
            // Зберігаємо стару позицію для анімації
            const oldPosition = player.position;
            console.log(`Гравець ${player.name}: стара позиція ${oldPosition}, нова позиція ${data.newPosition}, рух ${data.move}`);
            
            // Оновлюємо позицію гравця ПЕРЕД анімацією
            player.position = data.newPosition;
            
            // Оновлюємо очки та клас гравця (якщо є)
            if (data.newPoints !== undefined) {
                player.points = data.newPoints;
            }
            if (data.newClass !== undefined) {
                player.class = data.newClass;
            }
            
            // Використовуємо плавну анімацію руху з правильною старою позицією
            console.log(`Починаємо анімацію руху з позиції ${oldPosition} до ${data.newPosition}`);
            await this.animatePawnMovement(player, oldPosition, data.newPosition, data.move);
            console.log(`Анімація завершена. Поточна позиція гравця: ${player.position}`);
            
            this.logMessage(`${player.name}${player.class ? ' (' + player.class.name + ')' : ''} викинув ${data.roll}. Рух: ${data.move}. Позиція: ${data.newPosition}`, 'roll');
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
        
        this.logMessage(`Тепер хід гравця ${data.currentPlayerName}.`, 'turn');
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
        
        this.showQuestModal('Подія', modalContent, buttons);
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
        this.logMessage(data.resultMessage, 'event');
        
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
        this.questModal.classList.add('hidden');
        
        // Передаємо хід наступному гравцю
        this.socket.emit('next_turn', { roomId: this.roomId });
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
        this.showQuestModal(data.title, data.description, data.buttons);
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
        if (!myPlayer || !myPlayer.class) return;
        
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
            window.gameUI.showQuestModal('Роздача класів', modalContent);
            
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
            <h3 class="text-2xl font-bold mb-4">Кімната створена!</h3>
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
        `;
        
        if (window.gameUI) {
            window.gameUI.showQuestModal('Кімната створена', modalContent);
            
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
        } else {
            modalContent += `
                <p class="text-center text-gray-600">Спостерігайте за грою</p>
            `;
        }
        
        this.showQuestModal('PvP-квест', modalContent, []);
        
        if (isParticipant) {
            this.startTimedTextQuestTimer(data.gameState.timer);
        }
    }
    
    startTimedTextQuestTimer(seconds) {
        const timerElement = document.getElementById('timer');
        const submitBtn = document.getElementById('submit-result-btn');
        const textInput = document.getElementById('text-input');
        
        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
                submitBtn.disabled = false;
                textInput.disabled = true;
                submitBtn.textContent = 'Відправити результат';
                
                // Автоматично відправляємо результат
                this.submitTimedTextResult();
            }
        }, 1000);
    }
    
    submitTimedTextResult() {
        const textInput = document.getElementById('text-input');
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
            
            this.showQuestModal('PvP-квест', modalContent, buttons);
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
        
        this.showQuestModal('Творчий квест', modalContent, []);
        
        if (isMyTurn) {
            this.startStoryTimer(data.gameState.timer);
        }
    }
    
    startStoryTimer(seconds) {
        const timerElement = document.getElementById('story-timer');
        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
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
            this.socket.emit('collaborative_story_sentence', {
                roomId: this.roomId,
                sentence: sentence
            });
        }
    }
    
    skipStoryTurn() {
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
        
        this.showQuestModal('Творчий квест', modalContent, []);
        
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
            
            this.showQuestModal('Творчий квест', modalContent, []);
            this.startCreativeTimer(data.gameState.timer);
        }
    }
    
    startCreativeTimer(seconds) {
        const timerElement = document.getElementById('creative-timer');
        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timerElement.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
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
        
        this.showQuestModal('Творчий квест', modalContent, []);
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
        
        this.showQuestModal('Творчий квест', modalContent, []);
        
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
            modalContent += `
                <div class="p-3 border-2 border-gray-400 rounded cursor-pointer hover:bg-gray-200" onclick="game.voteForCreative(${index})">
                    <p class="font-bold">${submission.playerName}:</p>
                    <p>${submission.text}</p>
                </div>
            `;
        });
        
        modalContent += `
            </div>
            <p class="text-center text-gray-600">Оберіть варіант вище</p>
        `;
        
        this.showQuestModal('Голосування', modalContent, []);
    }
    
    voteForCreative(submissionIndex) {
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
        
        this.showQuestModal('Хто, де, коли?', modalContent, []);
        
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
            <p class="mb-4">${data.resultMessage}</p>
            <div class="mb-4">
                <h4 class="font-bold">Відповіді:</h4>
                <div class="space-y-2">
        `;
        
        data.answers.forEach((answer, index) => {
            modalContent += `<p><strong>${answer.playerName}:</strong> ${answer.answer}</p>`;
        });
        
        modalContent += `
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
        
        this.showQuestModal('Вебновела', modalContent, []);
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
}

// Експорт для використання в інших файлах
window.MultiplayerGame = MultiplayerGame;
