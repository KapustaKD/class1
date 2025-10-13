// Мультиплеєр клас для Socket.io
class MultiplayerGame extends EducationalPathGame {
    constructor() {
        super();
        this.socket = null;
        this.isOnlineMode = false;
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.spectators = [];
        
        this.setupMultiplayerElements();
        this.setupMultiplayerEventListeners();
    }
    
    setupMultiplayerElements() {
        this.modeSelection = document.getElementById('mode-selection');
        this.gameContainer = document.getElementById('game-container');
        this.onlinePanel = document.getElementById('online-panel');
        
        this.localModeBtn = document.getElementById('local-mode-btn');
        this.onlineModeBtn = document.getElementById('online-mode-btn');
        
        this.connectionStatus = document.getElementById('connection-status');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        this.roomNameInput = document.getElementById('room-name');
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
    }
    
    setupMultiplayerEventListeners() {
        this.localModeBtn.addEventListener('click', () => this.startLocalMode());
        this.onlineModeBtn.addEventListener('click', () => this.startOnlineMode());
        
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Обробник для кнопки початку гри
        if (this.startGameBtn) {
            this.startGameBtn.addEventListener('click', () => this.startOnlineGame());
        }
        
        // Обробник для кнопки виходу з кімнати
        if (this.leaveRoomBtn) {
            this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        }
    }
    
    startLocalMode() {
        this.isOnlineMode = false;
        this.modeSelection.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        this.onlinePanel.classList.add('hidden');
        
        // Показуємо правила гри для локального режиму
        this.rulesModal.classList.remove('hidden');
    }
    
    startOnlineMode() {
        this.isOnlineMode = true;
        this.modeSelection.classList.add('hidden');
        this.onlinePanel.classList.remove('hidden');
        
        // Підключаємося до сервера
        this.connectToServer();
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
        
        this.socket.on('dice_rolled', (data) => {
            console.log('Отримано подію dice_rolled:', data);
            this.handleRemoteDiceRoll(data);
            // Не оновлюємо кнопку тут, оновимо після turn_changed
        });
        
        this.socket.on('player_moved', (data) => {
            console.log('Отримано подію player_moved:', data);
            this.handleRemotePlayerMove(data);
            this.updateDiceButtonState();
        });
        
        this.socket.on('turn_changed', (data) => {
            console.log('Отримано подію turn_changed:', data);
            console.log('Старий currentPlayerIndex:', this.currentPlayerIndex);
            this.currentPlayerIndex = data.currentPlayerIndex;
            console.log('Новий currentPlayerIndex:', this.currentPlayerIndex);
            
            // Оновлюємо інформацію про поточного гравця
            if (data.currentPlayer) {
                console.log('Поточний гравець з сервера:', data.currentPlayer.name, 'ID:', data.currentPlayer.id);
            }
            
            // Перевіряємо, чи я поточний гравець
            const isMyTurn = data.currentPlayer && data.currentPlayer.id === this.playerId;
            console.log('Це мій хід?', isMyTurn, 'Мій ID:', this.playerId);
            
            this.updatePlayerInfo();
            this.updateDiceButtonState();
            
            const currentPlayer = this.players[this.currentPlayerIndex];
            if (currentPlayer) {
                this.logMessage(`Тепер хід гравця ${currentPlayer.name}.`, 'turn');
            } else {
                console.error('Поточний гравець не знайдений!', {
                    currentPlayerIndex: this.currentPlayerIndex,
                    players: this.players
                });
            }
        });
        
        this.socket.on('quest_started', (data) => {
            this.handleRemoteQuest(data);
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
            this.players = data.players;
            this.currentPlayerIndex = data.currentPlayerIndex;
            this.gameActive = true;
            
            // Перевіряємо, чи знаходимося серед гравців
            const myPlayer = this.players.find(p => p.id === this.playerId);
            console.log('Мій гравець в грі:', myPlayer);
            console.log('Мій playerId:', this.playerId);
            console.log('Всі гравці:', this.players.map(p => ({ name: p.name, id: p.id })));
            
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
        });
    }
    
    updateConnectionStatus(connected, text) {
        this.statusIndicator.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
        this.statusText.textContent = text;
    }
    
    createRoom() {
        const roomName = this.roomNameInput.value.trim();
        const playerName = this.playerNameInput.value.trim();
        
        console.log('Створюємо кімнату:', { roomName, playerName });
        
        if (!roomName || !playerName) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        
        console.log('Відправляємо подію create_room');
        this.socket.emit('create_room', {
            roomName,
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
            console.log('Починаємо онлайн гру');
            this.socket.emit('start_game', { roomId: this.roomId });
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
                currentPlayerNameEl.textContent = currentPlayer.name;
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
            myPlayerId: this.playerId
        });
        
        if (this.isOnlineMode && this.gameActive) {
            const currentPlayer = this.players[this.currentPlayerIndex];
            const isCurrentPlayer = currentPlayer && currentPlayer.id === this.playerId;
            
            console.log('Онлайн режим - стан кнопки:', {
                currentPlayer: currentPlayer?.name,
                currentPlayerId: currentPlayer?.id,
                myPlayerId: this.playerId,
                isCurrentPlayer
            });
            
            this.rollDiceBtn.disabled = !isCurrentPlayer;
            this.rollDiceBtn.style.opacity = isCurrentPlayer ? '1' : '0.5';
            
            if (isCurrentPlayer) {
                this.rollDiceBtn.textContent = 'Кинути кубик';
            } else {
                this.rollDiceBtn.textContent = `Хід гравця ${currentPlayer?.name || 'невідомо'}`;
            }
        } else {
            this.rollDiceBtn.disabled = !this.gameActive;
            this.rollDiceBtn.style.opacity = this.gameActive ? '1' : '0.5';
            this.rollDiceBtn.textContent = 'Кинути кубик';
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
}

// Експорт для використання в інших файлах
window.MultiplayerGame = MultiplayerGame;
