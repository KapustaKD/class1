// UI компоненти та інтерфейс
class GameUI {
    constructor() {
        this.modals = {};
        this.notifications = [];
        this.initializeModals();
    }
    
    initializeModals() {
        this.modals = {
            rules: document.getElementById('rules-modal'),
            start: document.getElementById('start-modal'),
            quest: document.getElementById('quest-modal')
        };
    }
    
    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.remove('hidden');
        }
    }
    
    hideModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.add('hidden');
        }
    }
    
    showMainMenu() {
        // Показуємо вибір режиму гри
        const modeSelection = document.getElementById('mode-selection');
        if (modeSelection) {
            modeSelection.classList.remove('hidden');
        }
        
        // Приховуємо ігровий контейнер
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.classList.add('hidden');
        }
        
        // Приховуємо онлайн панель
        const onlinePanel = document.getElementById('online-panel');
        if (onlinePanel) {
            onlinePanel.classList.add('hidden');
        }
        
        // Приховуємо всі модальні вікна
        Object.keys(this.modals).forEach(modalName => {
            this.hideModal(modalName);
        });
        
        console.log('🏠 Показано головне меню');
    }
    
    showQuestModal(title, content, buttons = [], backgroundImageUrl = null, noDarken = false, scaleUp = false) {
        const modalContent = document.getElementById('quest-modal-content');
        // Скидаємо можливі класи/фон від інших модалок (наприклад, madlibs-bg)
        if (modalContent) {
            modalContent.classList.remove('madlibs-bg', 'winer-modal', 'winer-modal-scaled');
            modalContent.style.removeProperty('--quest-bg');
            modalContent.style.filter = '';
            modalContent.style.transform = '';
            
            // Видаляємо старе відео, якщо воно існує
            const existingVideo = modalContent.querySelector('.modal-background-video');
            if (existingVideo) {
                existingVideo.pause();
                existingVideo.remove();
            }
            
            // Додаємо клас для winer модального вікна
            if (backgroundImageUrl && (backgroundImageUrl.includes('winer') || scaleUp || noDarken)) {
                modalContent.classList.add('winer-modal');
                if (scaleUp) {
                    modalContent.classList.add('winer-modal-scaled');
                }
                if (noDarken) {
                    modalContent.style.filter = 'none';
                }
            }
        }
        const buttonsHTML = buttons.map((btn, index) => 
            `<button id="modal-btn-${index}" class="px-4 py-2 rounded-lg text-white font-semibold transition ${
                index === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }">${btn.text}</button>`
        ).join(' ');
        
        // Перевіряємо, чи це відео файл
        const isVideo = backgroundImageUrl && backgroundImageUrl.toLowerCase().endsWith('.mp4');
        
        // Встановлюємо фонове зображення або відео
        if (backgroundImageUrl) {
            if (isVideo) {
                // Створюємо відео елемент як фон
                modalContent.style.backgroundImage = 'none';
                modalContent.style.backgroundSize = '';
                modalContent.style.backgroundPosition = '';
                modalContent.style.backgroundRepeat = '';
                
                // Встановлюємо позиціонування для відео
                modalContent.style.position = 'relative';
                modalContent.style.overflow = 'hidden';
            } else {
                // Звичайне зображення
                modalContent.style.backgroundImage = `url('${backgroundImageUrl}')`;
                modalContent.style.backgroundSize = 'cover';
                modalContent.style.backgroundPosition = 'center';
                modalContent.style.backgroundRepeat = 'no-repeat';
            }
        } else {
            modalContent.style.backgroundImage = 'none';
            modalContent.style.backgroundSize = '';
            modalContent.style.backgroundPosition = '';
            modalContent.style.backgroundRepeat = '';
        }
        
        modalContent.innerHTML = `
            ${isVideo ? `<video class="modal-background-video" autoplay muted loop playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; pointer-events: none;"><source src="${backgroundImageUrl}" type="video/mp4"></video>` : ''}
            <div style="position: relative; z-index: 1;">
                <h3 class="text-2xl font-bold mb-2">${title}</h3>
                <div class="text-lg mb-6">${content}</div>
                <div class="flex justify-center gap-4">${buttonsHTML}</div>
            </div>
        `;
        
        // Якщо це відео, запускаємо його
        if (isVideo) {
            const video = modalContent.querySelector('.modal-background-video');
            if (video) {
                video.play().catch(e => {
                    console.log('Не вдалося відтворити відео:', e);
                });
            }
        }
        
        // Після вставки innerHTML знову встановлюємо стилі фонового зображення, якщо воно було (і це не відео)
        if (backgroundImageUrl && !isVideo) {
            modalContent.style.backgroundImage = `url('${backgroundImageUrl}')`;
            modalContent.style.backgroundSize = 'cover';
            modalContent.style.backgroundPosition = 'center';
            modalContent.style.backgroundRepeat = 'no-repeat';
            
            // Додаємо data-атрибут для амфітеатру для CSS стилізації
            if (backgroundImageUrl.includes('amfiteatr')) {
                modalContent.setAttribute('data-event-type', 'amphitheater');
            } else {
                modalContent.removeAttribute('data-event-type');
            }
        } else {
            modalContent.removeAttribute('data-event-type');
        }
        
        this.showModal('quest');
        
        // Додаємо обробники подій для кнопок
        buttons.forEach((btn, index) => {
            const button = document.getElementById(`modal-btn-${index}`);
            if (button) {
                button.addEventListener('click', () => {
                    if (btn.callback) btn.callback();
                });
            }
        });
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        } text-white transform transition-all duration-300 translate-x-full`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Анімація появи
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Автоматичне видалення
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
    
    showLoadingSpinner(message = 'Завантаження...') {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        spinner.innerHTML = `
            <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span class="text-gray-800">${message}</span>
            </div>
        `;
        
        document.body.appendChild(spinner);
    }
    
    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
    
    updateConnectionStatus(connected, text) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
            statusText.textContent = text;
        }
    }
    
    updatePlayersList(players, currentPlayerId = null) {
        const playersContainer = document.getElementById('players-container');
        if (!playersContainer) return;
        
        playersContainer.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.id === currentPlayerId ? 'current-player' : ''}`;
            
            playerCard.innerHTML = `
                <div style="color: ${player.color};">${player.name}</div>
                <div class="text-sm text-gray-400">${player.class?.name || 'Не обрано'}</div>
                <div class="text-sm">${player.points || 0} ОО</div>
                ${player.isSpectator ? '<div class="text-xs text-gray-500">👁️ Спектатор</div>' : ''}
            `;
            
            playersContainer.appendChild(playerCard);
        });
    }
    
    addChatMessage(type, message, player = null) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
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
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Обмежуємо кількість повідомлень
        while (chatMessages.children.length > 100) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }
    
    showRoomCode(roomCode) {
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
        
        this.showQuestModal('Кімната створена', modalContent);
        
        // Додаємо обробники подій
        setTimeout(() => {
            const copyBtn = document.getElementById('copy-code-btn');
            const closeBtn = document.getElementById('close-room-modal-btn');
            
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    GameUtils.copyToClipboard(roomCode);
                });
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideModal('quest');
                });
            }
        }, 100);
    }
    
    showGameRules() {
        this.showModal('rules');
    }
    
    showGameSetup() {
        this.hideModal('rules');
        this.showModal('start');
    }
    
    hideGameSetup() {
        this.hideModal('start');
    }
    
    showGameContainer() {
        const gameContainer = document.getElementById('game-container');
        const modeSelection = document.getElementById('mode-selection');
        const onlinePanel = document.getElementById('online-panel');
        
        if (gameContainer) gameContainer.classList.remove('hidden');
        if (modeSelection) modeSelection.classList.add('hidden');
        if (onlinePanel) onlinePanel.classList.add('hidden');
    }
    
    showOnlinePanel() {
        const onlinePanel = document.getElementById('online-panel');
        const modeSelection = document.getElementById('mode-selection');
        const gameContainer = document.getElementById('game-container');
        
        if (onlinePanel) onlinePanel.classList.remove('hidden');
        if (modeSelection) modeSelection.classList.add('hidden');
        if (gameContainer) gameContainer.classList.add('hidden');
    }
    
    showModeSelection() {
        const modeSelection = document.getElementById('mode-selection');
        const gameContainer = document.getElementById('game-container');
        const onlinePanel = document.getElementById('online-panel');
        
        if (modeSelection) modeSelection.classList.remove('hidden');
        if (gameContainer) gameContainer.classList.add('hidden');
        if (onlinePanel) onlinePanel.classList.add('hidden');
    }
    
    updateDiceAnimation(roll) {
        const diceInner = document.getElementById('dice-inner');
        if (!diceInner) return;
        
        const rotations = {
            1: 'rotateY(0deg)',
            2: 'rotateY(-90deg)',
            3: 'rotateY(-180deg)',
            4: 'rotateY(90deg)',
            5: 'rotateX(-90deg)',
            6: 'rotateX(90deg)'
        };
        
        diceInner.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
        setTimeout(() => {
            diceInner.style.transform = `${rotations[roll]} translateZ(42.5px)`;
        }, 1000);
    }
    
    updatePlayerInfo(player) {
        const currentPlayerNameEl = document.getElementById('current-player-name');
        const currentPlayerClassEl = document.getElementById('current-player-class');
        const currentPlayerPointsEl = document.getElementById('current-player-points');
        const currentPlayerAvatarEl = document.getElementById('current-player-avatar');
        
        if (currentPlayerNameEl) {
            currentPlayerNameEl.textContent = player.name;
            currentPlayerNameEl.style.color = player.color;
        }
        
        if (currentPlayerClassEl) {
            currentPlayerClassEl.textContent = player.class?.name || 'Не обрано';
        }
        
        if (currentPlayerPointsEl) {
            // В новій структурі ОО вже є в HTML, просто число
            const pointsSpan = currentPlayerPointsEl.querySelector('span');
            if (pointsSpan) {
                pointsSpan.textContent = player.points || 0;
            } else {
                currentPlayerPointsEl.textContent = player.points || 0;
            }
        }
        
        // Оновлюємо аватар
        if (currentPlayerAvatarEl && player.name) {
            const firstLetter = player.name.charAt(0).toUpperCase();
            const avatarColor = player.color || '#7e22ce';
            const hexColor = avatarColor.replace('#', '');
            const rgbColor = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor.length === 3 ? hexColor.split('').map(c => c + c).join('') : hexColor);
            if (rgbColor) {
                const r = parseInt(rgbColor[1], 16);
                const g = parseInt(rgbColor[2], 16);
                const b = parseInt(rgbColor[3], 16);
                currentPlayerAvatarEl.src = `https://placehold.co/48x48/${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}/ffffff?text=${encodeURIComponent(firstLetter)}`;
            }
        }
    }
    
    updateLeaderboard(players, currentPlayerId = null) {
        const leaderboardEl = document.getElementById('leaderboard');
        if (!leaderboardEl) return;
        
        const sortedPlayers = players
            .filter(p => !p.hasLost)
            .sort((a, b) => (b.points || 0) - (a.points || 0));
        
        // Зберігаємо заголовок "Таблиця лідерів", якщо він існує
        const headerEl = leaderboardEl.querySelector('.cp-header');
        const headerHTML = headerEl ? headerEl.outerHTML : '<div class="cp-header text-purple-400">Таблиця лідерів</div>';
        
        leaderboardEl.innerHTML = headerHTML + sortedPlayers.map((p) => {
            const isActive = currentPlayerId && p.id === currentPlayerId;
            const firstLetter = p.name.charAt(0).toUpperCase();
            const hexColor = (p.color || '#7e22ce').replace('#', '');
            const rgbColor = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor.length === 3 ? hexColor.split('').map(c => c + c).join('') : hexColor);
            let avatarUrl = 'https://placehold.co/24x24/7e22ce/ffffff?text=P';
            if (rgbColor) {
                const r = parseInt(rgbColor[1], 16);
                const g = parseInt(rgbColor[2], 16);
                const b = parseInt(rgbColor[3], 16);
                avatarUrl = `https://placehold.co/24x24/${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}/ffffff?text=${encodeURIComponent(firstLetter)}`;
            }
            
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
}

// Експорт для використання в інших файлах
window.GameUI = GameUI;
