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
    }
    
    startLocalMode() {
        this.isOnlineMode = false;
        this.modeSelection.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        this.onlinePanel.classList.add('hidden');
        
        // Показуємо правила гри
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
            this.roomId = data.roomId;
            this.isHost = true;
            this.updatePlayersList(data.players);
            this.showPlayersList();
            this.showChat();
            this.logMessage(`Кімната "${data.roomName}" створена! Код: ${this.roomId}`, 'system');
        });
        
        this.socket.on('room_joined', (data) => {
            this.roomId = data.roomId;
            this.isHost = false;
            this.updatePlayersList(data.players);
            this.showPlayersList();
            this.showChat();
            this.logMessage(`Приєднано до кімнати "${data.roomName}"`, 'system');
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
            this.handleRemoteDiceRoll(data);
        });
        
        this.socket.on('player_moved', (data) => {
            this.handleRemotePlayerMove(data);
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
    }
    
    updateConnectionStatus(connected, text) {
        this.statusIndicator.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
        this.statusText.textContent = text;
    }
    
    createRoom() {
        const roomName = this.roomNameInput.value.trim();
        const playerName = this.playerNameInput.value.trim();
        
        if (!roomName || !playerName) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        
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
    }
    
    showPlayersList() {
        this.playersList.classList.remove('hidden');
    }
    
    showChat() {
        this.chatContainer.classList.remove('hidden');
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
    
    rollTheDice() {
        if (this.isOnlineMode) {
            // В онлайн режимі тільки хост може кидати кубик
            if (this.isHost && this.gameActive) {
                this.socket.emit('roll_dice', { roomId: this.roomId });
            }
        } else {
            // Локальний режим
            super.rollTheDice();
        }
    }
    
    handleRemoteDiceRoll(data) {
        const player = this.players.find(p => p.id === data.playerId);
        if (!player) return;
        
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
        
        this.logMessage(`${player.name} (${player.class.name}) викинув ${data.roll}. Рух: ${data.move}.`, 'roll');
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
}

// Експорт для використання в інших файлах
window.MultiplayerGame = MultiplayerGame;
