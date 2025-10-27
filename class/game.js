// Основний клас гри

class EducationalPathGame {

    constructor(isBeingExtended = false) {

            this.BOARD_SIZE = 101;
            
            // Ініціалізуємо звуки
            this.diceSound = new Audio('sound/dice/normal_dice.mp3');
            this.diceSound.preload = 'auto';
            this.diceMetalSound = new Audio('sound/dice/dice_metal.mp3');
            this.diceMetalSound.preload = 'auto';
            this.clickSound = new Audio('sound/button_click/click.mp3');
            this.clickSound.preload = 'auto';
            this.chipMoveSound = new Audio('sound/chips/chip_move.mp3');
            this.chipMoveSound.preload = 'auto';
            this.notificationSound = new Audio('sound/notification/notification.mp3');
            this.notificationSound.preload = 'auto';
            this.timerSound = new Audio('sound/quests/clock_timer.mp3');
            this.timerSound.preload = 'auto';
            this.correctAnswerSound = new Audio('sound/quests/correct_answer.mp3');
            this.correctAnswerSound.preload = 'auto';
            this.pvpSound = new Audio('sound/quests/during_the_quest.mp3');
            this.pvpSound.preload = 'auto';
            this.startGameSound = new Audio('sound/start/start_game.m4a');
            this.startGameSound.preload = 'auto';
            
            // Фонова музика
            this.backgroundMusic1 = new Audio('sound/fon/main_fon.m4a');
            this.backgroundMusic1.preload = 'auto';
            this.backgroundMusic1.loop = true;
            this.backgroundMusic1.volume = 0.05; // 5% гучності
            this.backgroundMusic2 = new Audio('sound/fon/rumbling_fon_2.mp3');
            this.backgroundMusic2.preload = 'auto';
            this.backgroundMusic2.loop = true;
            this.backgroundMusic2.volume = 0.05; // 5% гучності
            this.currentBackgroundMusic = this.backgroundMusic1;
            
            // Система відсоткової вірогідності для металевого звуку
            this.metalSoundChance = 1; // Початковий шанс 1%
            this.metalSoundTriggered = false; // Чи спрацював металевий звук
            
            // Доступні фони для гравців
            this.availableBackgrounds = [
                'image/fon/fon1.png',
                'image/fon/fon2.png',
                'image/fon/fon3.png'
            ];
            
            // Встановлюємо випадковий фон для поточного гравця
            this.setRandomBackground();
    
        this.WIN_CONDITION_POINTS = 300;
    
            this.playerColors = ['#e53e3e', '#38b2ac', '#ed8936'];
    
            this.playerClasses = [
    
                { id: 'aristocrat', name: '⚜️ Аристократ', startPoints: 50, moveModifier: 1 },
    
                { id: 'burgher', name: '⚖️ Міщанин', startPoints: 20, moveModifier: 0 },
    
                { id: 'peasant', name: '🌱 Селянин', startPoints: 0, moveModifier: -1 },
    
            ];
    
           
    
            this.players = [];
    
            this.currentPlayerIndex = 0;
    
            this.gameActive = false;
    
            this.BOARD_SIZE = 101; // Загальна кількість клітинок (включаючи фініш)
    
            this.scale = 1.0; // Буде встановлено правильно в setupEventListeners
    
            this.translateX = 0;
    
            this.translateY = 0;
    
            this.isPanning = false;
    
            this.panStartX = 0;
    
            this.panStartY = 0;
    
           
    
            // Нова структура карти з островами епох
    
            this.mapData = null;
    
            this.loadMapData();
    
           
    
            // Координати клітинок для кожної епохи
    
        this.epochCoordinates = this.generateEpochCoordinates();

        // Відстеження використаних клітинок з подіями
        this.usedEventCells = new Set();
        
        // Відстеження використаних типів подій для унікальності
        this.usedEventTypes = new Set();

        // Дані про події на клітинках (локальний режим)
        // В мультиплеєрному режимі використовується server.js з specialCells.js
        this.specialCells = {
            // Гра "Хто, де, коли?"
            3: { type: 'mad-libs-quest', questName: 'Хто? Де? Коли?' },

            // Вебновели
            10: { type: 'webnovella-quest', questName: 'Халепа!', eventNumber: 2 },
            90: { type: 'webnovella-quest', questName: 'Халепа!', eventNumber: 3 },

            // PvP Квести
            21: { type: 'pvp-quest', gameType: 'megabrain', questName: 'Мегамозок' },
            55: { type: 'pvp-quest', gameType: 'tic_tac_toe', questName: 'Хреститися рано!' },
            61: { type: 'pvp-quest', gameType: 'genius', questName: 'Я у мами геній' },
            81: { type: 'pvp-quest', gameType: 'pedagogobot', questName: 'Педагобот' },
            99: { type: 'pvp-quest', gameType: 'rock_paper_scissors', questName: 'Ляпіс-форфіцес-папірус' },

            // Творчі квести
            40: { type: 'creative-quest', gameType: 'great_pedagogical', questName: 'Великий Педагогічний…' },
            69: { type: 'creative-quest', gameType: 'chronicles', questName: 'Хроніки Неіснуючого Вояжу' },
            96: { type: 'creative-quest', gameType: 'pedagog_mom', questName: 'Я у мами педагог' },

            // Нові розважальні/небезпечні зони
            7: { type: 'amphitheater', name: 'Амфітеатр' },
            15: { type: 'tavern', name: 'Шинок' },
            34: { type: 'tavern', name: 'Шинок' },
            67: { type: 'casino', name: 'Казино' },
            93: { type: 'casino', name: 'Казино' },

            // Реінкарнація (рання смерть і миттєве переродження)
            6: { type: 'early-reincarnation', targetEpoch: 2, points: 50 },
            18: { type: 'early-reincarnation', targetEpoch: 3, points: 60 },
            30: { type: 'early-reincarnation', targetEpoch: 4, points: 70 },
            63: { type: 'early-reincarnation', targetEpoch: 5, points: 80 },
            85: { type: 'early-reincarnation', targetEpoch: 6, points: 90 },

            // Обхідні шляхи
            5: { type: 'alternative-path', target: 11, cost: 10, description: 'Обхідний шлях до клітинки 11 за 10 ОО' },
            46: { type: 'alternative-path', target: 57, cost: 25, description: 'Обхідний шлях до клітинки 57 за 25 ОО' },

            // Тестові завдання
            2: { type: 'test-question' },
            8: { type: 'test-question' },
            11: { type: 'test-question' },
            17: { type: 'test-question' },
            20: { type: 'test-question' },
            23: { type: 'test-question' },
            26: { type: 'test-question' },
            29: { type: 'test-question' },
            35: { type: 'test-question' },
            38: { type: 'test-question' },
            41: { type: 'test-question' },
            44: { type: 'test-question' },
            47: { type: 'test-question' },
            50: { type: 'test-question' },
            53: { type: 'test-question' },
            56: { type: 'test-question' },
            59: { type: 'test-question' },
            62: { type: 'test-question' },
            65: { type: 'test-question' },
            68: { type: 'test-question' },
            71: { type: 'test-question' },
            74: { type: 'test-question' },
            77: { type: 'test-question' },
            80: { type: 'test-question' },
            83: { type: 'test-question' },
            86: { type: 'test-question' },
            89: { type: 'test-question' },
            92: { type: 'test-question' },
            95: { type: 'test-question' },
            98: { type: 'test-question' },

            // Реінкарнація
            12: { type: 'reincarnation', nextEpoch: 2, points: 30 },
            22: { type: 'reincarnation', nextEpoch: 3, points: 40 },
            43: { type: 'reincarnation', nextEpoch: 4, points: 50 },
            75: { type: 'reincarnation', nextEpoch: 5, points: 60 },
            97: { type: 'reincarnation', nextEpoch: 6, points: 70 },

            // Фінальна подія
            100: { type: 'machine-uprising' }
        };
    
           
    
            this.initializeElements();
    
            // Вмикаємо setupEventListeners тільки якщо клас не розширюється (тобто для локального режиму)
            if (!isBeingExtended) {
                this.setupEventListeners();
            }
    
        }
    
       
    
    // Завантаження даних карти з mapData.js
    
    loadMapData() {
    
        // Імпортуємо дані з mapData.js
    
        import('./mapData.js').then(module => {
    
            this.mapData = module.mapData;
    
            console.log('Map data loaded:', this.mapData);
            
            // Створюємо карту одразу після завантаження даних
            // this.createBoard(); // Видалено - карта створюється в loadMapData()
    
        }).catch(error => {
    
            console.error('Error loading map data:', error);
    
                // Fallback дані якщо імпорт не вдався
    
                this.mapData = {
    
                    canvasSize: { width: 1920, height: 1080 },
    
                    zones: [],
    
                    cells: []
    
                };
    
            });
    
        }
    
       
    
        // Генерація координат для клітинок з mapData.js
    
        generateEpochCoordinates() {
    
            const coordinates = [];
    
           
    
            if (!this.mapData || !this.mapData.cells) {
    
                console.error('Map data not loaded!');
    
                return coordinates;
    
            }
    
           
    
            this.mapData.cells.forEach(cell => {
    
                // Визначаємо зону для клітинки
    
                const zone = this.getZoneForCell(cell);
    
               
    
                coordinates.push({
    
                    top: cell.y,
    
                    left: cell.x,
    
                    zone: zone,
    
                    cellId: cell.id,
    
                    isFinish: cell.id === 101
    
                });
    
            });
    
           
    
            return coordinates;
    
        }
    
       
    
    // Визначення зони для клітинки
    getZoneForCell(cell) {
        if (!this.mapData || !this.mapData.zones) {
            console.warn('mapData.zones не визначені');
            return 0;
        }
        
        // Перевіряємо, в якій зоні знаходиться клітинка
        for (let i = 0; i < this.mapData.zones.length; i++) {
            const zone = this.mapData.zones[i];
            if (zone && zone.svgPath) {
                if (this.isPointInZone(cell.x, cell.y, zone.svgPath)) {
                    return i;
                }
            } else {
                console.warn(`Зона ${i} не має svgPath:`, zone);
            }
        }
        
        return 0; // За замовчуванням перша зона
    }
    
       
    
    // Перевірка, чи точка знаходиться в зоні (спрощена версія)
    isPointInZone(x, y, svgPath) {
        // Перевіряємо чи svgPath існує
        if (!svgPath || typeof svgPath !== 'string') {
            console.warn('svgPath не визначений або не є рядком:', svgPath);
            return false;
        }
        
        // Спрощена перевірка на основі координат з mapData.js
        if (svgPath.includes('0 1080')) return x >= 0 && x <= 700 && y >= 500; // Сірі Землі
        if (svgPath.includes('700 1080')) return x >= 700 && x <= 1200 && y >= 650; // Рожева Долина
        if (svgPath.includes('1200 1080')) return x >= 1200 && y >= 600; // Зелений Ліс
        if (svgPath.includes('1920 800')) return x >= 800 && y >= 0 && y <= 600; // Синя Ріка
        if (svgPath.includes('900 0')) return x >= 0 && x <= 900 && y >= 0 && y <= 500; // Жовті Пустелі
        
        return false;
    }
    
       
    
        initializeElements() {
    
            this.gameViewport = document.getElementById('game-viewport');
    
            this.gameBoardContainer = document.getElementById('game-board-container');
    
            this.gameBoard = document.getElementById('game-board');
    
            this.rollDiceBtn = document.getElementById('roll-dice-btn');
    
            this.gameLog = document.getElementById('game-log');
    
            this.currentPlayerNameEl = document.getElementById('current-player-name');
    
            this.currentPlayerClassEl = document.getElementById('current-player-class');
    
            this.currentPlayerPointsEl = document.getElementById('current-player-points');
    
            this.leaderboardEl = document.getElementById('leaderboard');
    
            this.diceInner = document.getElementById('dice-inner');
    
            this.pathSvg = document.getElementById('path-svg');
    
            this.rulesModal = document.getElementById('rules-modal');
    
            this.showSetupBtn = document.getElementById('show-setup-btn');
    
            this.startModal = document.getElementById('start-modal');
    
            this.playerCountSelect = document.getElementById('player-count');
    
            this.playerSetupContainer = document.getElementById('player-setup-container');
    
            this.startGameBtn = document.getElementById('start-game-btn');
    
            this.questModal = document.getElementById('quest-modal');
    
            this.questModalContent = document.getElementById('quest-modal-content');
    
        }
    
       
    
        setupEventListeners() {
    
            // Основні події гри
    
            this.showSetupBtn.addEventListener('click', () => {
    
                this.rulesModal.classList.add('hidden');
    
                this.startModal.classList.remove('hidden');
    
            });
    
           
    
            this.playerCountSelect.addEventListener('change', () => this.setupPlayerInputs());
    
            this.startGameBtn.addEventListener('click', () => this.initializeGame());
    
            this.rollDiceBtn.addEventListener('click', () => {
    
                if (this.gameActive) this.rollTheDice();
    
            });
    
           
    
        // Зум і панорама
        
        // ВИМКНЕНО: Зум і переміщення заблоковані - карта статична
        // this.gameViewport.addEventListener('wheel', (e) => this.handleZoom(e));
        // this.gameViewport.addEventListener('mousedown', (e) => this.startPanning(e));
        // window.addEventListener('mousemove', (e) => this.handlePanning(e));
        // window.addEventListener('mouseup', () => this.stopPanning());
    
           
    
        this.setupPlayerInputs();
        
        // Додаємо обробник клавіш для заборони Enter на кидок кубика
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.rollDiceBtn && !this.rollDiceBtn.disabled) {
                // Перевіряємо, чи не знаходимося в модальному вікні з текстовим полем
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    // Дозволяємо Enter в текстових полях
                    return;
                }
                
                // Блокуємо Enter для кидка кубика
                e.preventDefault();
                console.log('🚫 Enter заблоковано для кидка кубика');
            }
        });
        
        // ВИДАЛЕНО: Масштабування тепер встановлюється в createBoard()
        // this.setInitialScale();
        // this.applyTransform();
    
    }
    
    // Встановлення правильного початкового масштабу
    setInitialScale() {
        console.log('🔧 setInitialScale() викликано (перша функція)');
        console.log('🔍 ПЕРЕД встановленням translateY:', this.translateY);
        
        // ВИМКНЕНО: Автоматичне масштабування - використовуємо фіксований розмір
        this.scale = 1; // Фіксований масштаб 1:1
        this.translateX = 0; // Без зміщення
        this.translateY = 0; // Без зміщення по вертикалі
        
        console.log('🔍 ПІСЛЯ встановлення translateY:', this.translateY);
        
        console.log('📊 Фіксований масштаб встановлено:', {
            scale: this.scale,
            translateX: this.translateX,
            translateY: this.translateY
        });
    }
    
    
    
    setupPlayerInputs() {
    
            const count = this.playerCountSelect.value;
    
            this.playerSetupContainer.innerHTML = '';
    
            for (let i = 0; i < count; i++) {
    
                this.playerSetupContainer.innerHTML += `
    
                    <div class="mt-4 p-3 border rounded-lg" style="border-color: ${this.playerColors[i]};">
    
                        <h3 class="text-xl font-semibold mb-2" style="color: ${this.playerColors[i]};">Гравець ${i + 1}</h3>
    
                        <div class="mb-2">
    
                            <label for="player-name-${i}" class="block font-medium">Ім'я:</label>
    
                            <input type="text" id="player-name-${i}" value="Гравець ${i + 1}" class="w-full p-2 border border-gray-300 rounded text-black">
    
                        </div>
    
                        <div>
    
                            <label for="player-class-${i}" class="block font-medium">Клас:</label>
    
                            <select id="player-class-${i}" class="w-full p-2 border border-gray-300 rounded text-black">
    
                                ${this.playerClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    
                            </select>
    
                        </div>
    
                    </div>
    
                `;
    
            }
    
        }
    
       
    
        initializeGame() {
    
            const count = this.playerCountSelect.value;
    
            this.players = [];
    
            for (let i = 0; i < count; i++) {
    
                const name = document.getElementById(`player-name-${i}`).value;
    
                const classId = document.getElementById(`player-class-${i}`).value;
    
                const playerClass = this.playerClasses.find(c => c.id === classId);
    
                this.players.push({
    
                    id: i + 1,
    
                    name,
    
                    color: this.playerColors[i],
    
                    position: 0,
    
                    class: playerClass,
    
                    points: playerClass.startPoints,
    
                    skipTurn: false,
    
                    extraTurn: false,
    
                    hasLost: false,
    
                    moveModifier: 0
    
                });
    
            }
    
           
    
            // this.createBoard(); // Видалено - карта створюється в loadMapData()
    
            this.gameActive = true;
    
            this.currentPlayerIndex = 0;
    
            this.updateUI();
    
        this.startModal.classList.add('hidden');
        
       
        
        const startCell = document.getElementById('cell-0');
    
        this.centerViewOn(startCell);
    
        }
    
       
    
        createBoard() {
    
            this.gameBoard.innerHTML = '';
        
        // КРИТИЧНО: Перевіряємо чи завантажені дані карти
        if (!this.mapData || !this.mapData.cells || this.mapData.cells.length === 0) {
            console.error('Map data not loaded yet! Waiting...');
            // Чекаємо завантаження даних карти
            setTimeout(() => this.createBoard(), 100);
            return;
        }
        
        console.log('Creating board with map data:', this.mapData);
    
           
    
        // Створюємо ОДИН великий білий контейнер карти
        // this.createGameMap(); // ВИДАЛЕНО - тепер використовуємо статичне зображення
        
        // Створюємо статичні SVG-зони з mapData.js
        // this.createStaticZones(); // ВИДАЛЕНО - тепер використовуємо статичне зображення
    
           
    
        // Стартова клітинка
    
        const startCell = document.createElement('div');
    
        startCell.id = 'cell-0';
    
        startCell.className = 'board-cell start';
    
        startCell.style.top = '700px';
    
        startCell.style.left = '25px';
    
        startCell.innerHTML = '<span>СТАРТ</span>';
    
        this.gameBoard.appendChild(startCell);
    
           
    
            // Створюємо клітинки з mapData.js
    
        // Створюємо клітинки з mapData.js
        console.log('Створюємо клітинки, загальна кількість:', this.mapData.cells.length);
        this.mapData.cells.forEach((cell, index) => {
            if (index < 5) { // Логуємо тільки перші 5 клітинок
                console.log(`Клітинка ${cell.id}: x=${cell.x}, y=${cell.y}`);
            }
            
            const cellElement = document.createElement('div');
            cellElement.id = `cell-${cell.id}`;
            
            // Визначаємо зону для клітинки
            const zone = this.getZoneForCell(cell);
            const zoneData = this.mapData.zones[zone];
            const special = this.specialCells[cell.id];
    
             
    
             let cellClass = special ? special.type : 'empty';
    
             if (cell.id === 101) cellClass = 'finish';
    
             
    
             cellElement.className = `board-cell ${cellClass} zone-${zone}`;
    
             cellElement.style.top = `${cell.y}px`;
    
             cellElement.style.left = `${cell.x}px`;
    
             
    
             if (cell.id === 101) {
    
                 cellElement.innerHTML = '<span>👑</span>'; // Корона для фінішу
    
             } else {
    
                 cellElement.innerHTML = `<span>${cell.id}</span>`;
    
             }
    
             
    
             // Додаємо підказку з зоною
    
             if (zoneData) {
    
                 cellElement.title = `${zoneData.name}`;
    
             }
    
             
    
             this.gameBoard.appendChild(cellElement);
    
         });
    
           
    
            // ВИДАЛЕНО: this.drawSequentialPath(); - тепер шлях намальований на картинці
    
           
    
        // Фішки гравців (аватари)
    
        this.players.forEach(p => {
    
            const pawn = document.createElement('img');
    
            pawn.id = `pawn-${p.id}`;
    
            pawn.className = 'player-pawn';
    
            // Використовуємо аватар, якщо він є, інакше кольоровий кружечок
            if (p.avatarUrl) {
                pawn.src = p.avatarUrl;
                pawn.alt = `${p.name} аватар`;
            } else {
                // Fallback на кольоровий кружечок
                pawn.style.backgroundColor = p.color;
                pawn.style.borderRadius = '50%';
            }
    
            // Додаємо фішку до дошки замість клітинки
            this.gameBoard.appendChild(pawn);
            
            // Позиціонуємо фішку абсолютно
            const cellRect = startCell.getBoundingClientRect();
            const boardRect = this.gameBoard.getBoundingClientRect();
            
            pawn.style.position = 'absolute';
            pawn.style.left = `${cellRect.left - boardRect.left + cellRect.width / 2 - 37.5}px`;
            pawn.style.top = `${cellRect.top - boardRect.top + cellRect.height / 2 - 37.5}px`;
            pawn.style.zIndex = '10';
    
        });
        
        // Встановлюємо правильний масштаб карти після створення
        setTimeout(() => {
            console.log('⏰ createBoard() - встановлюємо масштаб через setTimeout');
            this.setInitialScale();
            this.applyTransform();
            console.log('✅ createBoard() - масштаб встановлено після створення дошки');
        }, 100);
    
    }
    
       
    
    // ВИДАЛЕНО: createGameMap() та createStaticZones() - тепер використовуємо статичне зображення map_background.png
    
       
    
    // ВИДАЛЕНО: drawSequentialPath() - тепер шлях намальований на картинці
    
       
    
        drawPath() {
    
            this.pathSvg.innerHTML = '';
    
           
    
            // Малюємо лінії тільки всередині кожної секції
    
            const sectionBoundaries = [0, 25, 50, 75, 100, 124]; // Межі секцій
    
            const allCoords = [{top: 700, left: 25}, ...this.cellCoordinates];
    
           
    
            for (let section = 0; section < sectionBoundaries.length - 1; section++) {
    
                const startIdx = sectionBoundaries[section];
    
                const endIdx = sectionBoundaries[section + 1];
    
               
    
                if (startIdx >= allCoords.length) break;
    
               
    
                let pathData = '';
    
                for (let i = startIdx; i < endIdx && i < allCoords.length - 1; i++) {
    
                const p1 = { x: allCoords[i].left, y: allCoords[i].top };
    
                const p2 = { x: allCoords[i+1].left, y: allCoords[i+1].top };
    
                    if (i === startIdx) pathData += `M ${p1.x} ${p1.y} `;
    
                pathData += `L ${p2.x} ${p2.y} `;
    
            }
    
           
    
                if (pathData) {
    
            let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
            path.setAttribute('d', pathData);
    
            path.setAttribute('fill', 'none');
    
            path.setAttribute('stroke', 'rgba(255, 255, 255, 0.4)');
    
            path.setAttribute('stroke-width', '10');
    
            path.setAttribute('stroke-dasharray', '20 10');
    
            path.setAttribute('stroke-linecap', 'round');
    
            this.pathSvg.appendChild(path);
    
                }
    
            }
    
        }
    
       
    
        // Зум і панорама
    
    // ВИДАЛЕНО: Дублююча функція applyTransform() - використовуємо тільки другу
    
       
    
    handleZoom(e) {
        // VИМКНЕНО: Зум заблокований - карта статична
        e.preventDefault();
        return; // Не робимо нічого
    }
    
       
    
        startPanning(e) {
            // ВИМКНЕНО: Переміщення заблоковано - карта статична
            e.preventDefault();
            return; // Не робимо нічого
        }
    
       
    
    handlePanning(e) {
        // ВИМКНЕНО: Переміщення заблоковано - карта статична
        console.log('🚫 handlePanning() вимкнено - карта статична');
        e.preventDefault();
        return; // Не робимо нічого
    }
    
       
    
        stopPanning() {
    
            this.isPanning = false;
    
            this.gameViewport.style.cursor = 'grab';
    
            this.gameBoardContainer.style.transition = 'transform 0.5s ease';
    
        }
    
       
    
        centerViewOn(element) {
    
            const viewportRect = this.gameViewport.getBoundingClientRect();
    
            const targetX = viewportRect.width / 2;
    
            const targetY = viewportRect.height / 2;
    
            const elementX = element.offsetLeft + element.offsetWidth / 2;
    
            const elementY = element.offsetTop + element.offsetHeight / 2;
    
        this.translateX = targetX - (elementX * this.scale);

        this.translateY = targetY - (elementY * this.scale);

        // ВИДАЛЕНО: applyTransform() - фокусування заблоковано
    
        }
    
       
    
    // Ігрова логіка
    
    // Функція для встановлення випадкового фону
    setRandomBackground() {
        // Вибираємо випадковий фон
        const randomIndex = Math.floor(Math.random() * this.availableBackgrounds.length);
        const selectedBackground = this.availableBackgrounds[randomIndex];
        
        // Зберігаємо вибраний фон в localStorage для цієї сесії
        localStorage.setItem('playerBackground', selectedBackground);
        
        // Встановлюємо фон на body
        document.body.style.backgroundImage = `url('${selectedBackground}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        
        console.log('Встановлено фон:', selectedBackground);
    }
    
    // Функція для відтворення звуку кидка кубика
    playDiceSound() {
        try {
            // Відтворюємо нормальний звук кубика
            this.diceSound.currentTime = 0;
            this.diceSound.play().catch(e => {
                console.log('Не вдалося відтворити звук кубика:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку кубика:', e);
        }
    }
    
    playClickSound() {
        try {
            this.clickSound.currentTime = 0;
            this.clickSound.play().catch(e => {
                console.log('Не вдалося відтворити звук клікання:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку клікання:', e);
        }
    }
    
    playChipMoveSound() {
        try {
            this.chipMoveSound.currentTime = 0;
            this.chipMoveSound.play().catch(e => {
                console.log('Не вдалося відтворити звук руху фішки:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку руху фішки:', e);
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
            this.timerSound.currentTime = 0;
            this.timerSound.play().catch(e => {
                console.log('Не вдалося відтворити звук таймера:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку таймера:', e);
        }
    }
    
    playCorrectAnswerSound() {
        try {
            this.correctAnswerSound.currentTime = 0;
            this.correctAnswerSound.play().catch(e => {
                console.log('Не вдалося відтворити звук правильної відповіді:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку правильної відповіді:', e);
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
    
    playStartGameSound() {
        try {
            this.startGameSound.currentTime = 0;
            this.startGameSound.play().catch(e => {
                console.log('Не вдалося відтворити звук початку гри:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення звуку початку гри:', e);
        }
    }
    
    startBackgroundMusic() {
        try {
            this.currentBackgroundMusic.play().catch(e => {
                console.log('Не вдалося відтворити фонову музику:', e);
            });
        } catch (e) {
            console.log('Помилка відтворення фонової музики:', e);
        }
    }
    
    stopBackgroundMusic() {
        try {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
        } catch (e) {
            console.log('Помилка зупинки фонової музики:', e);
        }
    }
    
    switchBackgroundMusic() {
        try {
            this.stopBackgroundMusic();
            this.currentBackgroundMusic = this.currentBackgroundMusic === this.backgroundMusic1 ? 
                this.backgroundMusic2 : this.backgroundMusic1;
            this.startBackgroundMusic();
        } catch (e) {
            console.log('Помилка перемикання фонової музики:', e);
        }
    }
    
    setBackgroundVolume(volume) {
        try {
            this.backgroundMusic1.volume = volume;
            this.backgroundMusic2.volume = volume;
        } catch (e) {
            console.log('Помилка встановлення гучності:', e);
        }
    }

    async rollTheDice() {

        this.rollDiceBtn.disabled = true;
        
        // Збільшуємо лічильник кидків
        this.diceRollCount++;
        
        // Відсоткова система для металевого звуку
        const randomChance = Math.random() * 100;
        let playMetalSound = false;
        
        if (randomChance <= this.metalSoundChance) {
            playMetalSound = true;
            this.metalSoundTriggered = true;
            this.metalSoundChance = 1; // Скидаємо шанс до 1%
            console.log('🎲 Металевий звук спрацював! Шанс був:', this.metalSoundChance + '%');
        } else {
            // Збільшуємо шанс на 5% за кожен кидок
            this.metalSoundChance = Math.min(this.metalSoundChance + 5, 50); // Максимум 50%
        }
        
        // Відтворюємо звук кидка кубика
        if (playMetalSound) {
            try {
                this.diceMetalSound.currentTime = 0;
                this.diceMetalSound.play().catch(e => {
                    console.log('Не вдалося відтворити металевий звук кубика:', e);
                });
            } catch (e) {
                console.log('Помилка відтворення металевого звуку кубика:', e);
            }
        } else {
            this.playDiceSound();
        }
    
        let roll = Math.floor(Math.random() * 6) + 1;
        
        // Логіка підлаштовування кубика для попадання на спеціальні клітинки
        const player = this.players[this.currentPlayerIndex];
        const currentPosition = player.position;
        
        // Список спеціальних клітинок з подіями
        const specialCells = [2, 3, 5, 8, 10, 11, 14, 15, 17, 20, 21, 23, 26, 29, 32, 35, 36, 38, 40, 41, 44, 46, 47, 50, 53, 55, 56, 59, 61, 62, 65, 68, 69, 71, 74, 76, 77, 80, 81, 83, 86, 89, 90, 92, 95, 96, 98, 99];
        
        // Перевіряємо чи можемо попасти на невикористану спеціальну клітинку
        for (const targetCell of specialCells) {
            // Пропускаємо вже використані клітинки
            if (this.usedEventCells.has(targetCell)) {
                continue;
            }
            
            const cellData = this.specialCells[targetCell];
            if (!cellData) continue;
            
            // Пропускаємо вже використані типи подій (крім обхідних доріг та реінкарнації)
            if (this.usedEventTypes.has(cellData.type) && 
                cellData.type !== 'alternative-path' && 
                cellData.type !== 'reincarnation') {
                continue;
            }
            
            const distance = targetCell - currentPosition;
            if (distance > 0 && distance <= 6) {
                // Враховуємо модифікатори руху класу та гравця
                const totalMoveModifier = player.class.moveModifier + player.moveModifier;
                const requiredRoll = distance - totalMoveModifier;
                
                // Перевіряємо чи може гравець дійти до цієї клітинки
                if (requiredRoll >= 1 && requiredRoll <= 6) {
                    // Додаткова перевірка для селянина (мінімум 1 клітинка)
                    if (player.class.id === 'peasant' && requiredRoll + totalMoveModifier < 1) {
                        continue;
                    }
                    
                    roll = requiredRoll;
                    console.log(`🎯 Кубик підлаштований! Гравець ${player.name} (${player.class.name}) потрапить на клітинку ${targetCell} з подією ${cellData.type}. Потрібно ${requiredRoll}, з модифікатором ${totalMoveModifier} = ${requiredRoll + totalMoveModifier} клітинок`);
                    break;
                }
            }
        }
        
        // Якщо всі спеціальні клітинки використані, кидаємо випадкове число
        if (roll === Math.floor(Math.random() * 6) + 1) {
            console.log(`🎲 Всі спеціальні клітинки використані, кидаємо випадкове число: ${roll}`);
        }
    
        let move = roll + player.class.moveModifier + player.moveModifier;
    
        if (player.class.id === 'peasant') move = Math.max(1, move);
        
       
        
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
            
            this.diceInner.style.transform = `${rotations[roll]}`;
            
            await this.movePlayer(player, move);
            
        }, 1000);
    
        }
    
       
    
        async movePlayer(player, steps) {
    
            const startPos = player.position;
    
            const endPos = Math.min(startPos + steps, this.BOARD_SIZE);
    
           
    
            // Використовуємо нову плавну анімацію
    
            await this.animatePawnMovement(player, startPos, endPos, steps);
    
           
    
        // Оновлюємо позицію гравця
        player.position = endPos;
        
        // Перевіряємо перемогу (досягнення останньої клітинки)
        if (endPos >= this.BOARD_SIZE) {
            this.endGame(player, `${player.name} переміг, досягнувши кінця освітнього шляху!`);
            return; // Не перевіряємо події на клітинці, бо гра закінчена
        }
        
        // Перевіряємо події на кінцевій клітинці
        this.checkCell(player);
    
        }
    
       
    
    async movePlayerTo(player, position) {
    
        player.position = position;
    
        this.updatePawnPosition(player);
    
        await new Promise(res => setTimeout(res, 300));
    
        
        // Перевіряємо перемогу (досягнення останньої клітинки)
        if (position >= this.BOARD_SIZE) {
            this.endGame(player, `${player.name} переміг, досягнувши кінця освітнього шляху!`);
            return; // Не перевіряємо події на клітинці, бо гра закінчена
        }
    
        this.checkCell(player);
    
    }
    
       
    
    checkCell(player) {
        // В мультиплеєрному режимі перевірка подій відбувається на сервері
        // В локальному режимі використовуємо this.specialCells
        if (!this.isOnlineMode && this.specialCells[player.position]) {
            const cellData = this.specialCells[player.position];
            if (cellData) {
                this.handleSpecialCell(player, cellData);
            } else {
                this.nextTurn();
            }
        } else {
            // В мультиплеєрному режимі просто передаємо хід
            this.nextTurn();
        }
    }
    
       
    
    handleSpecialCell(player, cellData) {
        // Позначаємо клітинку як використану
        this.usedEventCells.add(player.position);
        console.log(`📍 Клітинка ${player.position} позначена як використана`);
        
        // Позначаємо тип події як використаний (крім обхідних доріг та реінкарнації)
        if (cellData.type !== 'alternative-path' && cellData.type !== 'reincarnation') {
            this.usedEventTypes.add(cellData.type);
            console.log(`🎭 Тип події ${cellData.type} позначений як використаний`);
        }

        switch(cellData.type) {
    
                case 'quest':
    
                    this.triggerRandomQuest(player);
    
                    break;
    
                case 'pvp-quest':
    
                    this.triggerPvpQuest(player);
    
                    break;
    
            case 'mad-libs-quest':
                this.triggerMadLibsQuest(player);
                break;
    
            case 'webnovella-quest':
                this.triggerWebNovellaQuest(player);
                break;
    
            case 'reincarnation':
                this.triggerReincarnation(player, cellData);
                    break;
    
            case 'machine-uprising':
                // Показуємо повідомлення про повстання машин
                this.showQuestModal('Повстання машин!', 
                    'Машини повстали проти людства! Ви загинули в битві з роботами. Але не втрачайте надію - ви реінкарнуєтеся в попередній епосі для нової спроби!', 
                    [
                        { text: 'Зрозуміло', callback: () => {
                            // Переміщуємо гравця на передостанню клітинку попередньої епохи (клітинка 75)
                            player.position = 75;
                            player.hasLost = false; // Відновлюємо гравця
                            
                            // Оновлюємо позицію фішки
                            this.updatePawnPosition(player);
                            
                            
                            this.questModal.classList.add('hidden');
                            this.nextTurn();
                        }}
                    ]
                );
                break;
    
                case 'portal':
    
                    this.showQuestModal('Таємний портал!', `Ризикнути та стрибнути на клітинку ${cellData.target} за ${cellData.cost} ОО?`, [
    
                        { text: 'Так', callback: () => { this.updatePoints(player, -cellData.cost); this.movePlayerTo(player, cellData.target); this.questModal.classList.add('hidden'); }},
    
                        { text: 'Ні', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}
    
                    ]);
    
                    break;
    
            case 'alternative-path':

                this.showQuestModal('Обхідна дорога!', `${cellData.description}`, [

                    { text: 'Так', callback: () => { this.updatePoints(player, -cellData.cost); this.movePlayerTo(player, cellData.target); this.questModal.classList.add('hidden'); }},

                    { text: 'Ні', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}

                ]);

                break;

            case 'test-question':

                this.showTestQuestion(player, player.position);

                break;
    
            default:
                // Якщо є ефект - виконуємо його
                if (cellData.effect) {
                    cellData.effect(player);
                } else {
                    // Якщо немає ефекту - показуємо повідомлення про розробку
                    this.showQuestModal('Подія', 'Подія у розробці. Скоро буде цікаво!', [
                        { text: 'Зрозуміло', callback: () => {
                            this.questModal.classList.add('hidden');
                            this.nextTurn();
                        }}
                    ]);
                    return; // Не передаємо хід автоматично
                }
                
                setTimeout(() => this.nextTurn(), 1000);
                break;
    
            }
    
        }
    
       
    
        // Квести та події
    
        triggerRandomQuest(player) {
    
            const questTypes = ['simple', 'pvp', 'creative'];
    
            const questType = questTypes[Math.floor(Math.random() * questTypes.length)];
    
           
    
            if (questType === 'simple') {
    
                const simpleQuests = [
    
                    { title: 'Знайшов старовинну книгу!', reward: 15, description: 'Ви знайшли цінну книгу в бібліотеці.' },
    
                    { title: 'Допоміг вчителю!', reward: 20, description: 'Ви допомогли вчителю з організацією уроку.' },
    
                    { title: 'Вивчив нову мову!', reward: 25, description: 'Ви успішно вивчили основи нової мови.' },
    
                    { title: 'Створив науковий проект!', reward: 30, description: 'Ваш проект отримав визнання.' },
    
                    { title: 'Переміг у олімпіаді!', reward: 40, description: 'Ви посіли перше місце в олімпіаді.' }
    
                ];
    
                const quest = simpleQuests[Math.floor(Math.random() * simpleQuests.length)];
    
                this.updatePoints(player, quest.reward, quest.title);
    
                this.showQuestModal(quest.title, quest.description, [
    
                    { text: 'Далі', callback: () => {
    
                        this.questModal.classList.add('hidden');
    
    
                        this.nextTurn();
    
                    }}
    
                ]);
    
            } else if (questType === 'pvp') {
    
                this.triggerPvpQuest(player);
    
            } else {
    
                this.triggerCreativeQuest(player);
    
            }
    
        }
    
       
    
        // Допоміжні функції
    
        updatePoints(player, amount, reason = "", showModal = false) {
    
            player.points += amount;
    
    
            this.updateUI();
    
           
    
            if (showModal && reason) {
    
                this.showQuestModal(reason, `${player.name} отримав ${amount > 0 ? '+' : ''}${amount} Очок Освіти!`, [
    
                    { text: 'Далі', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}
    
                ]);
    
            }
    
           
    
            if (player.points >= this.WIN_CONDITION_POINTS) {
    
                this.endGame(player);
    
            }
    
        }
    
       
    
        nextTurn() {
    
            if (!this.gameActive) return;
    
            const player = this.players[this.currentPlayerIndex];
    
           
    
            if (player.extraTurn) {
    
                player.extraTurn = false;
    
    
                this.rollDiceBtn.disabled = false;
    
                return;
    
            }
    
           
    
            if (player.skipTurn) {
    
                player.skipTurn = false;
    
    
                this.showQuestModal('Пропуск ходу', `${player.name} пропускає цей хід через подію.`, [
    
                    { text: 'Зрозуміло', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}
    
                ]);
    
                return;
    
            }
    
           
    
            do {
    
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
            } while (this.players[this.currentPlayerIndex].hasLost);
    
           
    
            this.updateUI();
    
    
            this.rollDiceBtn.disabled = false;
    
        }
    
       
    
        updateUI() {
    
            const player = this.players[this.currentPlayerIndex];
    
            this.currentPlayerNameEl.textContent = player.name;
    
            this.currentPlayerNameEl.style.color = player.color;
    
            this.currentPlayerClassEl.textContent = player.class ? player.class.name : '—';
    
            this.currentPlayerPointsEl.textContent = player.points;
    
            this.leaderboardEl.innerHTML = `<h3 class="text-lg font-semibold mt-2">Таблиця лідерів</h3>` +
    
                this.players.filter(p => !p.hasLost).sort((a,b) => b.points - a.points).map(p =>
    
                    `<div style="color:${p.color};">${p.name}: ${p.points} ОО</div>`
    
                ).join('');
    
        }
    
       
    
    updatePawnPosition(player) {

        const pawn = document.getElementById(`pawn-${player.id}`);

        const cell = document.getElementById(`cell-${player.position}`);

        if (cell && pawn) {

            // Отримуємо позицію клітинки відносно дошки
            const cellRect = cell.getBoundingClientRect();
            const boardRect = this.gameBoard.getBoundingClientRect();
            
            // Позиціонуємо фішку абсолютно відносно дошки
            pawn.style.position = 'absolute';
            pawn.style.left = `${cellRect.left - boardRect.left + cellRect.width / 2 - 37.5}px`;
            pawn.style.top = `${cellRect.top - boardRect.top + cellRect.height / 2 - 37.5}px`;
            pawn.style.zIndex = '10';

            this.centerViewOn(cell);

        }

    }
    
       
    
        // Плавна анімація руху фішки покроково
    
    async animatePawnMovement(player, fromPosition, toPosition, steps) {
        // Виправляємо негативну початкову позицію
        fromPosition = Math.max(0, fromPosition);
        console.log(`Анімація руху ${player.name} з ${fromPosition} до ${toPosition}, кроків: ${steps}`);
    
           
    
            const pawn = document.getElementById(`pawn-${player.id}`);
    
            if (!pawn) return;
    
           
    
            // Блокуємо кнопку кидання кубика під час анімації
    
            this.rollDiceBtn.disabled = true;
    
            this.rollDiceBtn.style.opacity = '0.5';
    
           
    
            // Додаємо клас руху
    
            pawn.classList.add('moving');
    
           
    
            // Якщо рух далекий, додаємо ефект вітру
    
            if (steps > 3) {
    
                pawn.classList.add('wind-effect');
    
            }
    
           
    
            try {
    
                // Рухаємося покроково
    
                for (let i = 1; i <= steps; i++) {
    
                    const currentPosition = fromPosition + i;
    
                   
    
                    // Переміщуємо фішку на поточну клітинку
    
                    await this.movePawnToCell(pawn, currentPosition);
    
                   
    
                    // Невелика затримка між кроками
    
                    await this.sleep(250);
    
                   
    
                    // Перевіряємо події на поточній клітинці
    
                    if (i === steps) {
    
                        // Останній крок - перевіряємо події
    
                        const cellData = this.specialCells[currentPosition];
    
                        if (cellData) {
    
                            console.log(`Гравець ${player.name} потрапив на подію на клітинці ${currentPosition}`);
    
                            await this.handleSpecialCell(player, cellData);
    
                        }
    
                    }
    
                }
    
               
    
                // Додаємо ефект приземлення
    
                pawn.classList.remove('moving');
    
                pawn.classList.add('landing');
    
               
    
                // Додаємо слід
    
                pawn.classList.add('trail');
    
               
    
                // Очищуємо ефекти після анімації
    
                setTimeout(() => {
    
                    pawn.classList.remove('landing', 'trail', 'wind-effect');
    
                }, 600);
    
               
    
            } catch (error) {
    
                console.error('Помилка під час анімації:', error);
    
            } finally {
    
                // Розблоковуємо кнопку
    
                this.rollDiceBtn.disabled = false;
    
                this.rollDiceBtn.style.opacity = '1';
    
            }
    
        }
    
       
    
        // Переміщення фішки на конкретну клітинку
    
        async movePawnToCell(pawn, cellPosition) {
    
            return new Promise((resolve) => {
    
                const targetCell = document.getElementById(`cell-${cellPosition}`);
    
                if (!targetCell) {
    
                    resolve();
    
                    return;
    
                }
    
               
    
            // Отримуємо позицію клітинки відносно дошки
            const cellRect = targetCell.getBoundingClientRect();
            const boardRect = this.gameBoard.getBoundingClientRect();
            
            // Позиціонуємо фішку абсолютно відносно дошки
            pawn.style.position = 'absolute';
            pawn.style.left = `${cellRect.left - boardRect.left + cellRect.width / 2 - 37.5}px`;
            pawn.style.top = `${cellRect.top - boardRect.top + cellRect.height / 2 - 37.5}px`;
            pawn.style.zIndex = '10';
            
            // Відтворюємо звук руху фішки з невеликою затримкою
            setTimeout(() => {
                this.playChipMoveSound();
            }, 100);
    
               
    
                // Центруємо вид на клітинці
    
                this.centerViewOn(targetCell);
    
               
    
                // Чекаємо завершення CSS transition
    
                setTimeout(resolve, 250);
    
            });
    
        }
    
       
    
        // Утиліта для затримки
    
        sleep(ms) {
    
            return new Promise(resolve => setTimeout(resolve, ms));
    
        }
    
       
    
        // Телепорт між епохами
    
        async teleportToNextEpoch(player, nextEpochId) {
    
            const nextEpoch = this.epochs.find(e => e.id === nextEpochId);
    
            if (!nextEpoch) return;
    
           
    
            console.log(`${player.name} телепортується до епохи ${nextEpoch.name}`);
    
           
    
            // Показуємо анімацію телепорту
    
            await this.showTeleportAnimation(player, nextEpoch);
    
           
    
            // Переміщуємо гравця на першу клітинку нової епохи
    
            const newPosition = nextEpoch.startCell;
    
            const oldPosition = player.position;
    
           
    
            player.position = newPosition;
    
           
    
            // Плавно переміщуємо фішку
    
            await this.movePawnToCell(document.getElementById(`pawn-${player.id}`), newPosition);
    
           
    
            // Центруємо камеру на новій епосі
    
            this.centerViewOnEpoch(nextEpochId);
    
           
    
    
           
    
            // Перевіряємо події на новій клітинці
    
            this.checkCell(player);
    
        }
    
       
    
        // Анімація телепорту
    
        async showTeleportAnimation(player, epoch) {
    
            const pawn = document.getElementById(`pawn-${player.id}`);
    
            if (!pawn) return;
    
           
    
            // Додаємо клас телепорту
    
            pawn.classList.add('teleporting');
    
           
    
            // Показуємо ефект світла
    
            const lightEffect = document.createElement('div');
    
            lightEffect.style.position = 'absolute';
    
            lightEffect.style.top = pawn.style.top;
    
            lightEffect.style.left = pawn.style.left;
    
            lightEffect.style.width = '60px';
    
            lightEffect.style.height = '60px';
    
            lightEffect.style.background = `radial-gradient(circle, ${epoch.color} 0%, transparent 70%)`;
    
            lightEffect.style.borderRadius = '50%';
    
            lightEffect.style.transform = 'translate(-50%, -50%)';
    
            lightEffect.style.animation = 'teleportFlash 0.8s ease-out';
    
            lightEffect.style.pointerEvents = 'none';
    
            lightEffect.style.zIndex = '10';
    
           
    
            this.gameBoard.appendChild(lightEffect);
    
           
    
            // Чекаємо завершення анімації
    
            await this.sleep(800);
    
           
    
            // Видаляємо клас телепорту
    
            pawn.classList.remove('teleporting');
    
           
    
            // Видаляємо ефект світла
    
            lightEffect.remove();
    
        }
    
       
    
        // Центрування камери на епосі
    
    centerViewOnEpoch(epochId) {
        // ВИМКНЕНО: Фокусування камери заблоковано - карта статична
        console.log('🚫 centerViewOnEpoch() вимкнено - карта статична');
        return; // Не робимо нічого
    }
    
       
    
    
       
    
        endGame(winner, customMessage = "") {
    
            if (!this.gameActive) return;
    
            this.gameActive = false;
    
            this.rollDiceBtn.disabled = true;
    
           
    
            let message;
    
            if (customMessage) {
    
                message = customMessage;
    
            } else if(winner) {
    
                message = `Переможець: ${winner.name}, який набрав ${winner.points} ОО!`;
    
            } else {
    
                const sortedPlayers = this.players.filter(p => !p.hasLost).sort((a,b) => b.points - a.points);
    
                if (sortedPlayers.length > 0) {
    
                    message = `Гру завершено! Переміг ${sortedPlayers[0].name} з ${sortedPlayers[0].points} ОО!`;
    
                } else {
    
                    message = `Гру завершено! Машини перемогли.`;
    
                }
    
            }
    
           
    
    
            const contentHTML = `
    
                <h2 class="text-4xl font-bold text-yellow-400 mb-4">Гру завершено!</h2>
    
                <p class="text-2xl mb-6">${message}</p>
    
                <button id="restart-game-btn" class="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-xl">Грати знову</button>
    
            `;
    
           
    
            this.showQuestModalWithContent(contentHTML, () => {
    
                document.getElementById('restart-game-btn').addEventListener('click', () => location.reload());
    
            });
    
        }
    
       
    
        showQuestModal(title, text, buttons) {
    
            let buttonsHTML = buttons.map((btn, index) =>
    
                `<button id="modal-btn-${index}" class="px-4 py-2 rounded-lg text-white font-semibold transition ${index === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}">${btn.text}</button>`
    
            ).join(' ');
    
           
    
            const contentHTML = `
    
                <h3 class="text-2xl font-bold mb-2">${title}</h3>
    
                <div class="text-lg mb-6">${text}</div>
    
                <div class="flex justify-center gap-4">${buttonsHTML}</div>
    
            `;
    
           
    
            this.showQuestModalWithContent(contentHTML, () => {
    
                buttons.forEach((btn, index) => {
    
                    document.getElementById(`modal-btn-${index}`).onclick = () => {
    
                        if (btn.callback) btn.callback();
    
                    };
    
                });
    
            });
    
        }
    
       
    
        showQuestModalWithContent(html, setupCallback) {
    
            this.questModalContent.innerHTML = html;
    
            this.questModalContent.classList.remove('modal-shake', 'modal-pulse-green');
    
            this.questModal.classList.remove('hidden');
    
            if(setupCallback) setupCallback(this.questModalContent);
    
        }
    
       
    
    // Заглушки для PvP та Creative квестів (будуть реалізовані пізніше)
    
    triggerPvpQuest(player) {
    
    
        this.nextTurn();
    
    }
    
   
    
    triggerCreativeQuest(player) {
    
    
        this.nextTurn();
    
    }

    triggerMadLibsQuest(player) {
        this.nextTurn();
    }

    triggerWebNovellaQuest(player) {
        this.nextTurn();
    }

    triggerReincarnation(player, cellData) {
        this.updatePoints(player, cellData.points, `Реінкарнація! +${cellData.points} ОО.`, true);
        this.nextTurn();
    }
    
    // Масштабування та переміщення карти
    handleZoom(e) {
        // ВИМКНЕНО: Зум заблокований - карта статична
        e.preventDefault();
        return; // Не робимо нічого
    }
    
    // Обмеження переміщення карти
    constrainTranslation() {
        // ВИМКНЕНО: Обмеження переміщення заблоковано - використовуємо фіксований розмір
        console.log('🚫 constrainTranslation() вимкнено - карта статична');
        return; // Не робимо нічого
    }
    
    // Встановлення початкового масштабу
    setInitialScale() {
        console.log('🔧 setInitialScale() викликано (друга функція)');
        console.log('🔍 ПЕРЕД встановленням translateY:', this.translateY);
        
        // ВИМКНЕНО: Автоматичне масштабування - використовуємо фіксований розмір
        this.scale = 1; // Фіксований масштаб 1:1
        this.translateX = 0; // Без зміщення
        this.translateY = 0; // Без зміщення по вертикалі
        
        console.log('🔍 ПІСЛЯ встановлення translateY:', this.translateY);
        
        console.log('📊 Фіксований масштаб встановлено (друга функція):', {
            scale: this.scale,
            translateX: this.translateX,
            translateY: this.translateY
        });
    }
    
    // Застосування трансформації
    applyTransform() {
        if (this.gameBoardContainer) {
            const transformString = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
            this.gameBoardContainer.style.transform = transformString;
        }
    }
    
    // Центрування на клітинці
    centerViewOn(cell) {
        // ВИМКНЕНО: Фокусування камери заблоковано - карта статична
        console.log('🚫 centerViewOn() вимкнено - карта статична');
        return; // Не робимо нічого
    }
    
    // Показ тестового завдання
    showTestQuestion(player, cellNumber) {
        const questionData = window.TEST_QUESTIONS[cellNumber];
        if (!questionData) {
            console.error(`Тестове завдання для клітинки ${cellNumber} не знайдено`);
            this.nextTurn();
            return;
        }

        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">📝 Тестове завдання</h3>
            <p class="mb-4 text-lg">${questionData.question}</p>
            <div class="space-y-3">
        `;

        // Додаємо варіанти відповідей
        Object.entries(questionData.options).forEach(([key, value]) => {
            modalContent += `
                <button class="w-full p-3 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors test-option-btn" data-answer="${key}">
                    <span class="font-bold">${key})</span> ${value}
                </button>
            `;
        });

        modalContent += `
            </div>
            <div class="mt-4 text-center">
                <button class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Закрити
                </button>
            </div>
        `;

        this.showQuestModal('Тестове завдання', modalContent, [], null);

        // Додаємо обробники для кнопок відповідей
        setTimeout(() => {
            document.querySelectorAll('.test-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedAnswer = e.currentTarget.dataset.answer;
                    const isCorrect = selectedAnswer === questionData.correctAnswer;
                    
                    // Показуємо результат
                    this.showTestResult(player, isCorrect, questionData.correctAnswer, selectedAnswer);
                });
            });
        }, 100);
    }

    // Показ результату тесту
    showTestResult(player, isCorrect, correctAnswer, selectedAnswer) {
        const resultText = isCorrect ? 
            `✅ Правильно! Ви отримуєте 5 ОО!` : 
            `❌ Неправильно. Правильна відповідь: ${correctAnswer}`;

        let modalContent = `
            <h3 class="text-2xl font-bold mb-4">${isCorrect ? '✅ Правильно!' : '❌ Неправильно'}</h3>
            <p class="mb-4 text-lg">${resultText}</p>
            <div class="text-center">
                <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" onclick="document.getElementById('quest-modal').classList.add('hidden')">
                    Продовжити
                </button>
            </div>
        `;

        this.showQuestModal('Результат тесту', modalContent, [], null);

        // Додаємо очки за правильну відповідь
        if (isCorrect) {
            this.updatePoints(player, 5);
        }

        // Передаємо хід наступному гравцю
        setTimeout(() => {
            this.nextTurn();
        }, 1000);
    }
    
    // Початок переміщення карти
    startPanning(e) {
        // ВИМКНЕНО: Переміщення заблоковано - карта статична
        e.preventDefault();
        return; // Не робимо нічого
    }
    
    // Обробка переміщення карти
    handlePanning(e) {
        // ВИМКНЕНО: Переміщення заблоковано - карта статична
        e.preventDefault();
        return; // Не робимо нічого
    }
    
    // Зупинка переміщення карти
    stopPanning() {
        // ВИМКНЕНО: Переміщення заблоковано - карта статична
        return; // Не робимо нічого
    }
    
    }
    
    
    
    // Експорт для використання в інших файлах
    
    window.EducationalPathGame = EducationalPathGame;
