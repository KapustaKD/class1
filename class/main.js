// Головний файл гри
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізуємо UI
    window.gameUI = new GameUI();
    
    // Перевіряємо, чи є збережений стан гри
    const savedGameState = localStorage.getItem('educationalPathGameState');
    if (savedGameState) {
        try {
            const gameState = JSON.parse(savedGameState);
            console.log('🔄 Відновлюємо збережений стан гри:', gameState);
            
            // Ініціалізуємо гру з збереженим станом
            window.game = new MultiplayerGame();
            
            // Відновлюємо стан гри
            if (gameState.isOnlineMode && gameState.roomId) {
                // Відновлюємо онлайн гру
                window.game.isOnlineMode = true;
                window.game.roomId = gameState.roomId;
                window.game.playerName = gameState.playerName;
                window.game.playerId = gameState.playerId;
                
                // Підключаємося до кімнати
                setTimeout(() => {
                    window.game.connectToRoom(gameState.roomId, gameState.playerName);
                }, 1000);
            } else if (gameState.isLocalMode) {
                // Відновлюємо локальну гру
                window.game.startLocalMode();
            }
        } catch (error) {
            console.error('❌ Помилка відновлення стану гри:', error);
            // Якщо не вдалося відновити, створюємо нову гру
            window.game = new MultiplayerGame();
        }
        } else {
            // Ініціалізуємо нову гру
            window.game = new MultiplayerGame();
        }
    
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

// Функції для збереження стану гри
window.saveGameState = function(gameState) {
    try {
        localStorage.setItem('educationalPathGameState', JSON.stringify(gameState));
        console.log('💾 Стан гри збережено:', gameState);
    } catch (error) {
        console.error('❌ Помилка збереження стану гри:', error);
    }
};

window.clearGameState = function() {
    try {
        localStorage.removeItem('educationalPathGameState');
        console.log('🗑️ Стан гри очищено');
    } catch (error) {
        console.error('❌ Помилка очищення стану гри:', error);
    }
};

window.exitGame = function() {
    if (window.game) {
        // Очищаємо стан гри
        window.clearGameState();
        
        // Відключаємося від кімнати якщо онлайн
        if (window.game.isOnlineMode && window.game.socket) {
            window.game.socket.disconnect();
        }
        
        // Скидаємо гру
        window.game = new MultiplayerGame();
        
        // Показуємо головне меню
        if (window.gameUI) {
            window.gameUI.showMainMenu();
        }
        
        console.log('🚪 Гра завершена, повертаємося до головного меню');
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
