/**
 * МОБІЛЬНА ВЕРСІЯ ГРИ
 * 
 * Цей файл містить всі зміни для адаптивної мобільної версії гри.
 * Якщо потрібно видалити мобільну версію - просто видаліть цей файл та
 * приберіть його підключення з index.html
 * 
 * ВИКОРИСТАННЯ:
 * 1. Підключіть цей файл в index.html після game.js та game.css
 * 2. Файл автоматично застосує всі зміни при завантаженні сторінки
 */

(function() {
    'use strict';

    // ============================================
    // КОНФІГУРАЦІЯ
    // ============================================
    
    // Базові розміри карти (оригінальні розміри, під які розставлялися клітинки)
    const BASE_MAP_WIDTH = 1273.0;
    const BASE_MAP_HEIGHT = 806.0;
    
    // Співвідношення сторін карти (ширина / висота)
    const MAP_ASPECT_RATIO = BASE_MAP_WIDTH / BASE_MAP_HEIGHT; // ≈ 1.579
    
    // ============================================
    // КРОК 2: CSS ЗМІНИ - АДАПТИВНИЙ КОНТЕЙНЕР КАРТИ
    // ============================================
    
    function applyContainerCSS() {
        const style = document.createElement('style');
        style.id = 'mobile-version-styles';
        style.textContent = `
            /* Адаптивний контейнер карти */
            #game-board-container { 
                position: relative; 
                width: 100% !important; 
                height: auto !important; /* Змінюємо з 100% на auto */
                aspect-ratio: ${MAP_ASPECT_RATIO}; /* Зберігаємо пропорції */
                max-width: 100%; 
                max-height: 100%; 
                margin: auto; /* Центрує карту */
            }
            
            /* Батьківський контейнер для центрування */
            .game-viewport {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: hidden !important;
            }
            
            /* Адаптивні клітинки - використовуємо відсотки */
            .board-cell { 
                position: absolute; 
                border: 2px solid #1a202c; 
                border-radius: 50%; 
                width: 3.5% !important;  /* Замість 35px */
                height: 3.5% !important; /* Замість 35px */
                font-size: clamp(0.6rem, 1.2vw, 0.8rem) !important; /* Адаптивний шрифт */
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: bold; 
                transition: all 0.3s ease; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.4); 
                z-index: 2; 
                transform: translate(-50%, -50%); 
                box-sizing: border-box;
                background-clip: padding-box;
            }
            
            /* Адаптивні фішки гравців */
            .player-pawn { 
                width: 5% !important; /* Замість 75px */
                height: 5% !important; /* Замість 75px */
                border-radius: 50%; 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
                object-fit: cover; 
                z-index: 10;
            }
            
            /* МЕДІА-ЗАПИТИ ДЛЯ МОБІЛЬНИХ ПРИСТРОЇВ */
            @media (max-width: 768px) {
                /* Зменшуємо кубик на мобільному */
                .cp-dice {
                    width: 60px !important;
                    height: 60px !important;
                }
                .cp-dice-face {
                    width: 60px !important;
                    height: 60px !important;
                    font-size: 2rem !important;
                }
                .cp-face-1 { transform: rotateY(0deg) translateZ(30px) !important; }
                .cp-face-2 { transform: rotateY(90deg) translateZ(30px) !important; }
                .cp-face-3 { transform: rotateY(180deg) translateZ(30px) !important; }
                .cp-face-4 { transform: rotateY(-90deg) translateZ(30px) !important; }
                .cp-face-5 { transform: rotateX(90deg) translateZ(30px) !important; }
                .cp-face-6 { transform: rotateX(-90deg) translateZ(30px) !important; }
                .cp-dice-container {
                    height: 6rem !important; /* Зменшуємо висоту контейнера кубика */
                }
                
                /* Зменшуємо кнопки */
                .cp-button {
                    padding: 0.6rem 0.8rem !important;
                    font-size: 0.9rem !important;
                }

                /* Зменшуємо аватари та шрифти в сайдбарі */
                .cp-player-avatar {
                    width: 2.5rem !important; /* 40px */
                    height: 2.5rem !important; /* 40px */
                }
                .cp-player-name {
                    font-size: 1rem !important;
                }
                .cp-points-value {
                    font-size: 1.1rem !important;
                }
                .cp-leaderboard-item img {
                    width: 1.25rem !important;
                    height: 1.25rem !important;
                }
                
                /* Зменшуємо розміри клітинок на мобільному */
                .board-cell {
                    width: 4% !important;
                    height: 4% !important;
                    font-size: clamp(0.5rem, 1vw, 0.7rem) !important;
                }
                
                /* Зменшуємо фішки на мобільному */
                .player-pawn {
                    width: 6% !important;
                    height: 6% !important;
                }
            }
            
            @media (max-width: 480px) {
                /* Ще менші розміри для маленьких екранів */
                .board-cell {
                    width: 4.5% !important;
                    height: 4.5% !important;
                    font-size: clamp(0.4rem, 0.9vw, 0.6rem) !important;
                }
                
                .player-pawn {
                    width: 7% !important;
                    height: 7% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ============================================
    // КРОК 3: ЗМІНИ В game.js - ВІДСОТКОВЕ ПОЗИЦІОНУВАННЯ
    // ============================================
    
    function patchGameJS() {
        // Перехоплюємо створення дошки
        if (typeof window.EducationalPathGame !== 'undefined') {
            try {
                const OriginalGame = window.EducationalPathGame;
                
                // Зберігаємо оригінальний метод createBoard
                const originalCreateBoard = OriginalGame.prototype.createBoard;
                
                // Замінюємо метод createBoard
                OriginalGame.prototype.createBoard = function() {
                    try {
                        // Викликаємо оригінальний метод
                        originalCreateBoard.call(this);
                        
                        // Після створення дошки перетворюємо позиції клітинок на відсотки
                        setTimeout(() => {
                            try {
                                this.convertCellsToPercentages();
                            } catch (e) {
                                console.error('Mobile version: Error in convertCellsToPercentages:', e);
                            }
                        }, 100);
                    } catch (e) {
                        console.error('Mobile version: Error in createBoard patch:', e);
                        // Викликаємо оригінальний метод навіть якщо патч не спрацював
                        if (originalCreateBoard) {
                            originalCreateBoard.call(this);
                        }
                    }
                };
            
            // Додаємо новий метод для конвертації позицій у відсотки
            OriginalGame.prototype.convertCellsToPercentages = function() {
                if (!this.mapData || !this.mapData.cells) {
                    console.warn('Map data not loaded yet');
                    return;
                }
                
                // Обробляємо всі клітинки з mapData
                this.mapData.cells.forEach((cell) => {
                    const cellElement = document.getElementById(`cell-${cell.id}`);
                    if (cellElement) {
                        // Конвертуємо пікселі у відсотки
                        const topPercent = (cell.y / BASE_MAP_HEIGHT) * 100;
                        const leftPercent = (cell.x / BASE_MAP_WIDTH) * 100;
                        
                        // Застосовуємо відсоткові позиції
                        cellElement.style.top = `${topPercent}%`;
                        cellElement.style.left = `${leftPercent}%`;
                    }
                });
                
                // Також обробляємо стартову клітинку
                const startCell = document.getElementById('cell-0');
                if (startCell) {
                    // Стартова клітинка має позицію 700px, 25px (з game.js)
                    // Конвертуємо у відсотки
                    const startTopPercent = (700 / BASE_MAP_HEIGHT) * 100;
                    const startLeftPercent = (25 / BASE_MAP_WIDTH) * 100;
                    startCell.style.top = `${startTopPercent}%`;
                    startCell.style.left = `${startLeftPercent}%`;
                }
                
                // Оновлюємо позиції фішок гравців (якщо вони вже створені)
                if (this.players && this.players.length > 0) {
                    this.players.forEach(player => {
                        const pawn = document.getElementById(`pawn-${player.id}`);
                        if (pawn) {
                            this.updatePawnPosition(player);
                        }
                    });
                }
            };
            
            // Перевизначаємо updatePawnPosition для роботи з відсотками
            const originalUpdatePawnPosition = OriginalGame.prototype.updatePawnPosition;
            OriginalGame.prototype.updatePawnPosition = function(player) {
                try {
                    const pawn = document.getElementById(`pawn-${player.id}`);
                    const cell = document.getElementById(`cell-${player.position}`);
                
                if (cell && pawn) {
                    // Позиціонуємо фішку абсолютно відносно дошки
                    pawn.style.position = 'absolute';
                    
                    // Отримуємо позицію клітинки зі стилів (відсотки або пікселі)
                    let cellLeft = parseFloat(cell.style.left);
                    let cellTop = parseFloat(cell.style.top);
                    
                    // Якщо позиція в пікселях, конвертуємо у відсотки
                    if (cell.style.left && cell.style.left.includes('px')) {
                        cellLeft = (cellLeft / BASE_MAP_WIDTH) * 100;
                    }
                    if (cell.style.top && cell.style.top.includes('px')) {
                        cellTop = (cellTop / BASE_MAP_HEIGHT) * 100;
                    }
                    
                    // Якщо не знайдено позицію, використовуємо getBoundingClientRect як fallback
                    if (isNaN(cellLeft) || isNaN(cellTop)) {
                        const cellRect = cell.getBoundingClientRect();
                        const boardRect = this.gameBoard.getBoundingClientRect();
                        const boardWidth = boardRect.width;
                        const boardHeight = boardRect.height;
                        
                        cellLeft = ((cellRect.left - boardRect.left + cellRect.width / 2) / boardWidth) * 100;
                        cellTop = ((cellRect.top - boardRect.top + cellRect.height / 2) / boardHeight) * 100;
                    }
                    
                    // Центруємо фішку на клітинці
                    pawn.style.left = `${cellLeft}%`;
                    pawn.style.top = `${cellTop}%`;
                    pawn.style.transform = 'translate(-50%, -50%)';
                    pawn.style.zIndex = '10';
                }
                } catch (e) {
                    console.error('Mobile version: Error in updatePawnPosition:', e);
                    // Викликаємо оригінальний метод якщо наш патч не спрацював
                    if (originalUpdatePawnPosition) {
                        originalUpdatePawnPosition.call(this, player);
                    }
                }
            };
            
            // Перевизначаємо movePawnToCell для роботи з відсотками
            const originalMovePawnToCell = OriginalGame.prototype.movePawnToCell;
            OriginalGame.prototype.movePawnToCell = async function(pawn, cellPosition) {
                try {
                    return new Promise((resolve) => {
                        const targetCell = document.getElementById(`cell-${cellPosition}`);
                    
                    if (!targetCell) {
                        resolve();
                        return;
                    }
                    
                    // Отримуємо позицію клітинки зі стилів (відсотки або пікселі)
                    let cellLeft = parseFloat(targetCell.style.left);
                    let cellTop = parseFloat(targetCell.style.top);
                    
                    // Якщо позиція в пікселях, конвертуємо у відсотки
                    if (targetCell.style.left && targetCell.style.left.includes('px')) {
                        cellLeft = (cellLeft / BASE_MAP_WIDTH) * 100;
                    }
                    if (targetCell.style.top && targetCell.style.top.includes('px')) {
                        cellTop = (cellTop / BASE_MAP_HEIGHT) * 100;
                    }
                    
                    // Якщо не знайдено позицію, використовуємо getBoundingClientRect як fallback
                    if (isNaN(cellLeft) || isNaN(cellTop)) {
                        const cellRect = targetCell.getBoundingClientRect();
                        const boardRect = this.gameBoard.getBoundingClientRect();
                        const boardWidth = boardRect.width;
                        const boardHeight = boardRect.height;
                        
                        cellLeft = ((cellRect.left - boardRect.left + cellRect.width / 2) / boardWidth) * 100;
                        cellTop = ((cellRect.top - boardRect.top + cellRect.height / 2) / boardHeight) * 100;
                    }
                    
                    // Позиціонуємо фішку абсолютно відносно дошки
                    pawn.style.position = 'absolute';
                    pawn.style.left = `${cellLeft}%`;
                    pawn.style.top = `${cellTop}%`;
                    pawn.style.transform = 'translate(-50%, -50%)';
                    pawn.style.zIndex = '10';
                    
                    // Відтворюємо звук руху фішки
                    setTimeout(() => {
                        if (typeof this.playChipMoveSound === 'function') {
                            this.playChipMoveSound();
                        }
                    }, 100);
                    
                    // Центруємо вид на клітинці (якщо функція доступна)
                    if (typeof this.centerViewOn === 'function') {
                        this.centerViewOn(targetCell);
                    }
                    
                    // Чекаємо завершення CSS transition
                    setTimeout(resolve, 250);
                    });
                } catch (e) {
                    console.error('Mobile version: Error in movePawnToCell:', e);
                    // Викликаємо оригінальний метод якщо наш патч не спрацював
                    if (originalMovePawnToCell) {
                        return originalMovePawnToCell.call(this, pawn, cellPosition);
                    }
                    return Promise.resolve();
                }
            };
            } catch (e) {
                console.error('Mobile version: Error patching game JS:', e);
            }
        }
    }
    
    // ============================================
    // ІНІЦІАЛІЗАЦІЯ
    // ============================================
    
    function initMobileVersion() {
        try {
            // Застосовуємо CSS зміни
            applyContainerCSS();
            
            // Чекаємо, поки завантажиться EducationalPathGame
            if (typeof window.EducationalPathGame !== 'undefined') {
                patchGameJS();
            } else {
            // Якщо клас ще не завантажений, чекаємо
            const checkInterval = setInterval(() => {
                if (typeof window.EducationalPathGame !== 'undefined') {
                    clearInterval(checkInterval);
                    patchGameJS();
                }
            }, 100);
            
            // Таймаут на випадок, якщо клас не завантажиться
            setTimeout(() => {
                clearInterval(checkInterval);
                if (typeof window.EducationalPathGame !== 'undefined') {
                    patchGameJS();
                } else {
                    console.warn('Mobile version: EducationalPathGame not found');
                }
            }, 5000);
        }
        
        // Видаляємо жорстко задані розміри з HTML (якщо вони є)
        window.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('game-board-container');
            if (container && container.style.width && container.style.width.includes('px')) {
                // Залишаємо тільки position: relative
                container.style.width = '';
                container.style.height = '';
            }
            
            // Також перевіряємо батьківський контейнер
            const gameContainer = document.querySelector('.bg-gray-700.panel-overlay');
            if (gameContainer && gameContainer.style.width && gameContainer.style.width.includes('px')) {
                // Видаляємо жорстко задані розміри
                gameContainer.style.width = '';
                gameContainer.style.height = '';
            }
            
            // Спостерігаємо за створенням клітинок (на випадок, якщо createBoard викликається пізніше)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length > 0) {
                        // Перевіряємо, чи додано клітинки
                        const hasCells = Array.from(mutation.addedNodes).some(node => 
                            node.nodeType === 1 && (node.classList?.contains('board-cell') || node.id?.startsWith('cell-'))
                        );
                        
                        if (hasCells && typeof window.EducationalPathGame !== 'undefined') {
                            // Невелика затримка, щоб дати час на створення всіх клітинок
                            setTimeout(() => {
                                const gameInstance = window.game || window.gameInstance;
                                if (gameInstance && typeof gameInstance.convertCellsToPercentages === 'function') {
                                    gameInstance.convertCellsToPercentages();
                                }
                            }, 200);
                        }
                    }
                });
            });
            
            // Спостерігаємо за змінами в game-board
            const gameBoard = document.getElementById('game-board');
            if (gameBoard) {
                observer.observe(gameBoard, { childList: true, subtree: true });
            }
        });
        } catch (e) {
            console.error('Mobile version: Critical error during initialization:', e);
            // Не зупиняємо виконання інших скриптів
        }
    }
    
    // Запускаємо ініціалізацію
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMobileVersion);
        } else {
            initMobileVersion();
        }
        
        console.log('📱 Мобільна версія гри активована!');
    } catch (e) {
        console.error('Mobile version: Error starting initialization:', e);
        // Не зупиняємо виконання інших скриптів
    }
    
})();

