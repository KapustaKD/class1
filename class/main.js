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
    
    // Налаштовуємо звуки
    setupGlobalSounds();
    
    // Налаштовуємо контролер музики
    setupMusicController();
    
    // Додаємо обробники кнопок режимів
    setupModeButtons();
    
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

function setupModeButtons() {
    // Обробник для локальної гри (тепер це гра проти ботів)
    const localModeBtn = document.getElementById('local-mode-btn');
    if (localModeBtn) {
        localModeBtn.addEventListener('click', () => {
            window.startLocalGame();
        });
    }
    
    // Обробник для онлайн гри
    const onlineModeBtn = document.getElementById('online-mode-btn');
    if (onlineModeBtn) {
        onlineModeBtn.addEventListener('click', () => {
            window.startOnlineGame();
        });
    }
}

// Глобальні функції для використання в HTML
window.startLocalGame = function() {
    if (window.botGame) {
        window.botGame.startLocalBotGame();
    } else {
        window.botGame = new BotGame();
        window.botGame.startLocalBotGame();
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

function setupMusicController() {
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const musicSwitchBtn = document.getElementById('music-switch-btn');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeText = document.getElementById('music-volume-text');
    const musicIcon = document.getElementById('music-icon');
    
    if (!musicToggleBtn || !musicSwitchBtn || !musicVolumeSlider || !musicVolumeText || !musicIcon) {
        console.log('Контролер музики не знайдено');
        return;
    }
    
    // Ініціалізуємо фонову музику
    let backgroundMusic1 = new Audio('sound/main_fon.m4a');
    backgroundMusic1.preload = 'auto';
    backgroundMusic1.loop = true;
    backgroundMusic1.volume = 0.05;
    
    let backgroundMusic2 = new Audio('sound/rumbling_fon_2.mp3');
    backgroundMusic2.preload = 'auto';
    backgroundMusic2.loop = true;
    backgroundMusic2.volume = 0.05;
    
    let currentMusic = backgroundMusic1;
    let isPlaying = false;
    
    // Кнопка вмикання/вимикання музики
    musicToggleBtn.addEventListener('click', () => {
        if (isPlaying) {
            currentMusic.pause();
            musicIcon.textContent = '🔇';
            isPlaying = false;
        } else {
            currentMusic.play().catch(e => {
                console.log('Не вдалося відтворити музику:', e);
            });
            musicIcon.textContent = '🎵';
            isPlaying = true;
        }
    });
    
    // Кнопка перемикання музики
    musicSwitchBtn.addEventListener('click', () => {
        const wasPlaying = isPlaying;
        if (wasPlaying) {
            currentMusic.pause();
        }
        
        currentMusic = currentMusic === backgroundMusic1 ? backgroundMusic2 : backgroundMusic1;
        
        if (wasPlaying) {
            currentMusic.play().catch(e => {
                console.log('Не вдалося відтворити музику:', e);
            });
        }
    });
    
    // Слайдер гучності
    musicVolumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        backgroundMusic1.volume = volume;
        backgroundMusic2.volume = volume;
        musicVolumeText.textContent = e.target.value + '%';
    });
    
    // Кнопка тестування звуків
    const testSoundsBtn = document.getElementById('test-sounds-btn');
    if (testSoundsBtn) {
        testSoundsBtn.addEventListener('click', () => {
            console.log('🔊 Тестуємо звуки...');
            
            // Тестуємо звук клікання
            const clickSound = new Audio('sound/click.mp3');
            clickSound.play().catch(e => console.log('Помилка звуку клікання:', e));
            
            setTimeout(() => {
                // Тестуємо звук сповіщення
                const notificationSound = new Audio('sound/notification.mp3');
                notificationSound.play().catch(e => console.log('Помилка звуку сповіщення:', e));
            }, 500);
            
            setTimeout(() => {
                // Тестуємо звук руху фішки
                const chipMoveSound = new Audio('sound/chip_move.mp3');
                chipMoveSound.play().catch(e => console.log('Помилка звуку руху фішки:', e));
            }, 1000);
            
            setTimeout(() => {
                // Тестуємо звук кубика
                const diceSound = new Audio('sound/dice/normal_dice.mp3');
                diceSound.play().catch(e => console.log('Помилка звуку кубика:', e));
            }, 1500);
        });
    }
    
    console.log('🎵 Контролер музики налаштовано');
}

function setupGlobalSounds() {
    // Ініціалізуємо звук клікання
    const clickSound = new Audio('sound/click.mp3');
    clickSound.preload = 'auto';
    
    // Ініціалізуємо звук сповіщення
    const notificationSound = new Audio('sound/notification.mp3');
    notificationSound.preload = 'auto';
    
    // Додаємо обробник кліків для всіх кнопок
    document.addEventListener('click', (e) => {
        // Перевіряємо, чи це кнопка
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            try {
                clickSound.currentTime = 0;
                clickSound.play().catch(err => {
                    console.log('Не вдалося відтворити звук клікання:', err);
                });
            } catch (err) {
                console.log('Помилка відтворення звуку клікання:', err);
            }
        }
    });
    
    // Додаємо обробник для модальних вікон
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('modal-backdrop') && !target.classList.contains('hidden')) {
                    // Модальне вікно відкрилося
                    try {
                        notificationSound.currentTime = 0;
                        notificationSound.play().catch(err => {
                            console.log('Не вдалося відтворити звук сповіщення:', err);
                        });
                    } catch (err) {
                        console.log('Помилка відтворення звуку сповіщення:', err);
                    }
                }
            }
        });
    });
    
    // Спостерігаємо за змінами в модальних вікнах
    const modalElements = document.querySelectorAll('.modal-backdrop');
    modalElements.forEach(modal => {
        observer.observe(modal, { attributes: true });
    });
    
    console.log('🔊 Глобальні звуки налаштовано');
}
