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
        // Показуємо помилку тільки в онлайн режимі
        if (window.gameUI && window.game && window.game.isOnlineMode) {
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
    // Показуємо попередження про локальний режим ПЕРЕД створенням гри
    const warningContent = `
        <div class="text-center">
            <h3 class="text-2xl font-bold mb-4 text-yellow-400">⚠️ Попередження</h3>
            <p class="text-lg mb-4 text-white">
                Локальний режим гри знаходиться в стадії розробки і може містити баги.
            </p>
            <p class="text-lg mb-6 text-white">
                Ви впевнені, що хочете продовжити?
            </p>
        </div>
    `;
    
    // Використовуємо базовий клас для показу модального вікна
    // EducationalPathGame доступний глобально через window.EducationalPathGame
    if (window.EducationalPathGame) {
        const tempGame = new window.EducationalPathGame(true);
        tempGame.showQuestModal('Локальний режим', warningContent, [
            { text: 'Так, продовжити', callback: () => {
                tempGame.questModal.classList.add('hidden');
                // Після підтвердження створюємо гру
                if (window.botGame) {
                    window.botGame.startLocalBotGame();
                } else {
                    window.botGame = new BotGame();
                    window.botGame.startLocalBotGame();
                }
            }},
            { text: 'Ні, скасувати', callback: () => {
                tempGame.questModal.classList.add('hidden');
                // Після скасування користувач залишається на виборі режимів
            }}
        ]);
    } else {
        console.error('EducationalPathGame не знайдено. Переконайтеся, що game.js завантажено перед main.js');
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
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const audioPanel = document.getElementById('audio-panel');
    const audioIcon = document.getElementById('audio-icon');
    
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const musicSwitchBtn = document.getElementById('music-switch-btn');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeText = document.getElementById('music-volume-text');
    const musicIcon = document.getElementById('music-icon');
    
    if (!audioToggleBtn || !audioPanel || !audioIcon) {
        console.log('Контролер музики не знайдено');
        return;
    }
    
    // Функція для отримання об'єктів музики з game.js (якщо вони існують)
    function getMusicObjects() {
        // Перевіряємо, чи є екземпляр гри з музикою
        if (window.game && window.game.backgroundMusicObjects && window.game.currentBackgroundMusic) {
            return {
                backgroundMusicObjects: window.game.backgroundMusicObjects,
                backgroundMusicTracks: window.game.backgroundMusicTracks,
                currentBackgroundMusic: window.game.currentBackgroundMusic,
                currentBackgroundMusicKey: window.game.currentBackgroundMusicKey,
                isGameMusic: true
            };
        }
        
        // Якщо немає, створюємо власні об'єкти (fallback)
        // Перевіряємо, чи доступна конфігурація Cloudinary
        const useCloudinary = typeof window !== 'undefined' && window.cloudinaryConfig;
        let fallbackUrl = 'sound/fon/main_fon.m4a';
        
        if (useCloudinary) {
            fallbackUrl = window.cloudinaryConfig.getTrackUrl('main_fon') || fallbackUrl;
        }
        
        if (!window.fallbackMusic1) {
            window.fallbackMusic1 = new Audio(fallbackUrl);
            window.fallbackMusic1.preload = 'auto';
            window.fallbackMusic1.loop = true;
            window.fallbackMusic1.volume = 0.05;
        }
        
        const fallbackTracks = useCloudinary && window.cloudinaryConfig 
            ? window.cloudinaryConfig.CLOUDINARY_AUDIO_TRACKS 
            : { 'main_fon': { file: 'sound/fon/main_fon.m4a', name: 'main_fon' } };
        
        return {
            backgroundMusicObjects: { 'main_fon': window.fallbackMusic1 },
            backgroundMusicTracks: fallbackTracks,
            currentBackgroundMusic: window.fallbackMusic1,
            currentBackgroundMusicKey: 'main_fon',
            isGameMusic: false
        };
    }
    
    // Заповнюємо випадаючий список треків
    function populateTrackSelect() {
        const trackSelect = document.getElementById('music-track-select');
        if (!trackSelect) return;
        
        const musicObjects = getMusicObjects();
        trackSelect.innerHTML = '';
        
        for (const [key, track] of Object.entries(musicObjects.backgroundMusicTracks)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = track.name;
            if (key === musicObjects.currentBackgroundMusicKey) {
                option.selected = true;
            }
            trackSelect.appendChild(option);
        }
    }
    
    // Оновлюємо вибір треку при зміні
    const trackSelect = document.getElementById('music-track-select');
    if (trackSelect) {
        trackSelect.addEventListener('change', (e) => {
            const selectedTrack = e.target.value;
            if (window.game && window.game.setBackgroundTrack) {
                window.game.setBackgroundTrack(selectedTrack);
                updateMusicState();
            }
        });
    }
    
    let musicObjects = getMusicObjects();
    let isPlaying = false;
    
    // Функція для перевірки стану музики
    function updateMusicState() {
        musicObjects = getMusicObjects();
        if (musicObjects.isGameMusic) {
            // Перевіряємо стан музики з game.js
            isPlaying = !musicObjects.currentBackgroundMusic.paused;
            musicIcon.textContent = isPlaying ? '🎵' : '🔇';
            
            // Оновлюємо слайдер гучності
            const currentVolume = Math.round(musicObjects.currentBackgroundMusic.volume * 100);
            musicVolumeSlider.value = currentVolume;
            musicVolumeText.textContent = currentVolume + '%';
            
            // Оновлюємо вибір треку
            if (trackSelect && musicObjects.currentBackgroundMusicKey) {
                trackSelect.value = musicObjects.currentBackgroundMusicKey;
            }
        } else {
            // Для fallback музики
            isPlaying = !musicObjects.currentBackgroundMusic.paused;
            musicIcon.textContent = isPlaying ? '🎵' : '🔇';
            const currentVolume = Math.round(musicObjects.currentBackgroundMusic.volume * 100);
            musicVolumeSlider.value = currentVolume;
            musicVolumeText.textContent = currentVolume + '%';
            
            // Оновлюємо вибір треку
            if (trackSelect && musicObjects.currentBackgroundMusicKey) {
                trackSelect.value = musicObjects.currentBackgroundMusicKey;
            }
        }
    }
    
    // Кнопка відкриття/закриття панелі
    audioToggleBtn.addEventListener('click', () => {
        if (audioPanel.classList.contains('hidden')) {
            audioPanel.classList.remove('hidden');
            audioIcon.textContent = '🔇';
            // Оновлюємо стан музики при відкритті панелі
            updateMusicState();
            // Заповнюємо випадаючий список треків
            populateTrackSelect();
        } else {
            audioPanel.classList.add('hidden');
            audioIcon.textContent = '🔊';
        }
    });
    
    // Кнопка вмикання/вимикання музики
    musicToggleBtn.addEventListener('click', () => {
        musicObjects = getMusicObjects();
        
        if (musicObjects.isGameMusic) {
            // Використовуємо музику з game.js
            if (window.game) {
                updateMusicState(); // Оновлюємо стан перед перемиканням
                if (isPlaying) {
                    window.game.stopBackgroundMusic();
                } else {
                    window.game.startBackgroundMusic();
                }
                updateMusicState(); // Оновлюємо стан після перемикання
            }
        } else {
            // Використовуємо fallback об'єкти
            const currentMusic = musicObjects.currentBackgroundMusic;
            if (isPlaying) {
                currentMusic.pause();
                isPlaying = false;
            } else {
                currentMusic.play().catch(e => {
                    console.log('Не вдалося відтворити музику:', e);
                });
                isPlaying = true;
            }
            musicIcon.textContent = isPlaying ? '🎵' : '🔇';
        }
    });
    
    // Кнопка перемикання музики
    musicSwitchBtn.addEventListener('click', () => {
        musicObjects = getMusicObjects();
        
        if (musicObjects.isGameMusic) {
            // Використовуємо функцію з game.js
            if (window.game) {
                updateMusicState(); // Оновлюємо стан перед перемиканням
                window.game.switchBackgroundMusic();
                updateMusicState(); // Оновлюємо стан після перемикання
            }
        } else {
            // Використовуємо fallback об'єкти
            const wasPlaying = isPlaying;
            if (wasPlaying) {
                musicObjects.currentBackgroundMusic.pause();
            }
            
            window.fallbackMusic1 = musicObjects.backgroundMusic1;
            window.fallbackMusic2 = musicObjects.backgroundMusic2;
            
            musicObjects.currentBackgroundMusic = musicObjects.currentBackgroundMusic === musicObjects.backgroundMusic1 ? 
                musicObjects.backgroundMusic2 : musicObjects.backgroundMusic1;
            
            if (wasPlaying) {
                musicObjects.currentBackgroundMusic.play().catch(e => {
                    console.log('Не вдалося відтворити музику:', e);
                });
            }
        }
    });
    
    // Слайдер гучності
    musicVolumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        musicObjects = getMusicObjects();
        
        if (musicObjects.isGameMusic) {
            // Використовуємо функцію з game.js
            if (window.game) {
                window.game.setBackgroundVolume(volume);
            }
        } else {
            musicObjects.backgroundMusic1.volume = volume;
            musicObjects.backgroundMusic2.volume = volume;
        }
        musicVolumeText.textContent = e.target.value + '%';
    });
    
    // Кнопка тестування звуків
    const testSoundsBtn = document.getElementById('test-sounds-btn');
    if (testSoundsBtn) {
        testSoundsBtn.addEventListener('click', () => {
            console.log('🔊 Тестуємо звуки...');
            
            // Тестуємо звук клікання
            const clickSound = new Audio('sound/button_click/click.mp3');
            clickSound.play().catch(e => console.log('Помилка звуку клікання:', e));
            
            setTimeout(() => {
                // Тестуємо звук сповіщення
                const notificationSound = new Audio('sound/notification/notification.mp3');
                notificationSound.play().catch(e => console.log('Помилка звуку сповіщення:', e));
            }, 500);
            
            setTimeout(() => {
                // Тестуємо звук руху фішки
                const chipMoveSound = new Audio('sound/chips/chip_move.mp3');
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
    const clickSound = new Audio('sound/button_click/click.mp3');
    clickSound.preload = 'auto';
    
    // Ініціалізуємо звук сповіщення
    const notificationSound = new Audio('sound/notification/notification.mp3');
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
