// Головний файл гри
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізуємо UI
    window.gameUI = new GameUI();
    
    // Ініціалізуємо гру
    window.game = new MultiplayerGame();
    
    // Додаємо глобальні обробники подій
    setupGlobalEventListeners();
    
    console.log('🎮 Освітній Шлях: Революція завантажено!');
});

function setupGlobalEventListeners() {
    // Обробка помилок
    window.addEventListener('error', (event) => {
        console.error('Помилка:', event.error);
        if (window.gameUI) {
            window.gameUI.showNotification('Сталася помилка. Спробуйте перезавантажити сторінку.', 'error');
        }
    });
    
    // Обробка необроблених відхилень промісів
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Необроблене відхилення промісу:', event.reason);
        if (window.gameUI) {
            window.gameUI.showNotification('Проблема з підключенням. Перевірте інтернет.', 'warning');
        }
    });
    
    // Обробка зміни розміру вікна
    window.addEventListener('resize', GameUtils.debounce(() => {
        // Перераховуємо позиції елементів при зміні розміру
        if (window.game && window.game.gameActive) {
            window.game.applyTransform();
        }
    }, 250));
    
    // Обробка натискання клавіш
    document.addEventListener('keydown', (event) => {
        // ESC - закрити модальні вікна
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.modal-backdrop:not(.hidden)');
            if (openModal) {
                openModal.classList.add('hidden');
            }
        }
        
        // Enter - кинути кубик (якщо можливо)
        if (event.key === 'Enter' && window.game && window.game.gameActive) {
            const rollBtn = document.getElementById('roll-dice-btn');
            if (rollBtn && !rollBtn.disabled) {
                rollBtn.click();
            }
        }
        
        // R - перезавантажити гру
        if (event.key === 'r' || event.key === 'R') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                location.reload();
            }
        }
    });
    
    // Обробка кліку поза модальними вікнами
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-backdrop')) {
            event.target.classList.add('hidden');
        }
    });
}

// Глобальні функції для використання в HTML
window.startLocalGame = function() {
    if (window.game) {
        window.game.startLocalMode();
    }
};

window.startOnlineGame = function() {
    if (window.game) {
        window.game.startOnlineMode();
    }
};

window.showGameRules = function() {
    if (window.gameUI) {
        window.gameUI.showGameRules();
    }
};

window.copyRoomCode = function(code) {
    GameUtils.copyToClipboard(code);
};

window.joinRoomByCode = function(code) {
    const roomCodeInput = document.getElementById('room-code');
    if (roomCodeInput) {
        roomCodeInput.value = code;
    }
};

// Функції для відладки (тільки в режимі розробки)
if (window.APP_CONFIG && !window.APP_CONFIG.isProduction) {
    window.debugGame = {
        addPoints: (playerId, points) => {
            if (window.game && window.game.players) {
                const player = window.game.players.find(p => p.id === playerId);
                if (player) {
                    window.game.updatePoints(player, points, `Debug: +${points} ОО`);
                }
            }
        },
        
        movePlayer: (playerId, position) => {
            if (window.game && window.game.players) {
                const player = window.game.players.find(p => p.id === playerId);
                if (player) {
                    window.game.movePlayerTo(player, position);
                }
            }
        },
        
        skipTurn: (playerId) => {
            if (window.game && window.game.players) {
                const player = window.game.players.find(p => p.id === playerId);
                if (player) {
                    player.skipTurn = true;
                }
            }
        },
        
        endGame: () => {
            if (window.game) {
                window.game.endGame();
            }
        },
        
        showState: () => {
            if (window.game) {
                console.log('Game State:', {
                    players: window.game.players,
                    currentPlayerIndex: window.game.currentPlayerIndex,
                    gameActive: window.game.gameActive,
                    isOnlineMode: window.game.isOnlineMode,
                    roomId: window.game.roomId
                });
            }
        }
    };
    
    console.log('🔧 Режим відладки активний. Використовуйте window.debugGame для тестування.');
}
