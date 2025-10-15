// Основний клас гри

class EducationalPathGame {

        constructor() {
    
            this.BOARD_SIZE = 125;
    
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
    
           
    
            this.specialCells = {
    
                5: { type: 'quest' },
    
                10: { type: 'pvp-quest' },
    
                15: { type: 'event-good', effect: p => this.updatePoints(p, 20, "Винайдено писемність! +20 ОО.", true) },
    
                20: { type: 'creative-quest' },
    
                25: { type: 'reincarnation', nextEpoch: 2, points: 50, description: 'Реінкарнація! Перехід до наступної епохи.' },
    
                30: { type: 'quest' },
    
                35: { type: 'event-bad', effect: p => this.updatePoints(p, -20, "Втрата рукописів. -20 ОО.", true) },
    
                40: { type: 'pvp-quest' },
    
                45: { type: 'alternative-path', target: 55, cost: 15, description: 'Обхідна дорога! Скористатися?' },
    
                50: { type: 'reincarnation', nextEpoch: 3, points: 60, description: 'Реінкарнація! Перехід до наступної епохи.' },
    
                55: { type: 'creative-quest' },
    
                60: { type: 'event-good', effect: p => this.updatePoints(p, 30, "Епоха Відродження! +30 ОО.", true) },
    
                65: { type: 'pvp-quest' },
    
                70: { type: 'event-bad', effect: p => { p.skipTurn = true; this.updatePoints(p, -10); }, description: "З'їв дивних грибів. Пропуск ходу та -10 ОО." },
    
                75: { type: 'reincarnation', nextEpoch: 4, points: 70, description: 'Реінкарнація! Перехід до наступної епохи.' },
    
                80: { type: 'quest' },
    
                85: { type: 'alternative-path', target: 95, cost: 20, description: 'Обхідна дорога! Скористатися?' },
    
                90: { type: 'pvp-quest' },
    
                95: { type: 'event-good', effect: p => { p.extraTurn = true; }, description: "Просвітництво! Додатковий хід." },
    
                100: { type: 'reincarnation', nextEpoch: 5, points: 80, description: 'Реінкарнація! Перехід до наступної епохи.' },
    
                105: { type: 'creative-quest' },
    
                110: { type: 'event-bad', effect: p => this.movePlayerTo(p, 90), description: "Світова війна. Повернення назад." },
    
                115: { type: 'pvp-quest' },
    
                120: { type: 'event-good', effect: p => this.updatePoints(p, 50), description: "Цифрова революція! +50 ОО." },
    
                124: { type: 'machine-uprising' },
    
                // Нові альтернативні шляхи
    
                12: { type: 'alternative-path', target: 18, cost: 5, description: "Обхідний шлях до клітинки 18 за 5 ОО" },
    
                32: { type: 'alternative-path', target: 38, cost: 8, description: "Обхідний шлях до клітинки 38 за 8 ОО" },
    
                52: { type: 'alternative-path', target: 58, cost: 10, description: "Обхідний шлях до клітинки 58 за 10 ОО" },
    
                72: { type: 'alternative-path', target: 78, cost: 12, description: "Обхідний шлях до клітинки 78 за 12 ОО" },
    
                92: { type: 'alternative-path', target: 98, cost: 15, description: "Обхідний шлях до клітинки 98 за 15 ОО" },
    
                112: { type: 'alternative-path', target: 118, cost: 18, description: "Обхідний шлях до клітинки 118 за 18 ОО" },
    
                // Додаткові події
    
                8: { type: 'event-bad', effect: p => { p.moveModifier = -1; setTimeout(() => p.moveModifier = 0, 1); }, description: "Булінг від мислителя. Наступний хід на 1 менше." },
    
                18: { type: 'event-good', effect: p => { p.moveModifier = 1; setTimeout(() => p.moveModifier = 0, 1); }, description: "Дружба з мудрецем. Наступний хід на 1 більше." },
    
                28: { type: 'event-bad', effect: p => this.movePlayerTo(p, Math.max(0, p.position - 3)), description: "Втрата пам'яті. Повернення на 3 клітинки назад." },
    
                38: { type: 'event-good', effect: p => this.updatePoints(p, 25), description: "Знайшов древній манускрипт! +25 ОО." },
    
                48: { type: 'event-bad', effect: p => { p.skipTurn = true; }, description: "Захворів на чуму. Пропуск ходу." },
    
                58: { type: 'event-good', effect: p => { p.extraTurn = true; }, description: "Відкриття нового методу навчання! Додатковий хід." },
    
                68: { type: 'event-bad', effect: p => this.updatePoints(p, -15), description: "Спалили бібліотеку. -15 ОО." },
    
                78: { type: 'event-good', effect: p => this.updatePoints(p, 40), description: "Створено університет! +40 ОО." },
    
                88: { type: 'event-bad', effect: p => this.movePlayerTo(p, Math.max(0, p.position - 5)), description: "Інквізиція. Повернення на 5 клітинок назад." },
    
                98: { type: 'event-good', effect: p => this.updatePoints(p, 35), description: "Наукова революція! +35 ОО." },
    
                108: { type: 'event-bad', effect: p => { p.skipTurn = true; this.updatePoints(p, -25); }, description: "Цензура. Пропуск ходу та -25 ОО." },
    
                118: { type: 'event-good', effect: p => { p.extraTurn = true; this.updatePoints(p, 30); }, description: "Інтернет! Додатковий хід та +30 ОО." }
    
            };
    
           
    
            this.initializeElements();
    
            this.setupEventListeners();
    
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
        
        // ВИДАЛЕНО: Масштабування тепер встановлюється в createBoard()
        // this.setInitialScale();
        // this.applyTransform();
    
    }
    
    // Встановлення правильного початкового масштабу
    setInitialScale() {
        console.log('🔧 setInitialScale() викликано');
        
        // ВИМКНЕНО: Автоматичне масштабування - використовуємо фіксований розмір
        this.scale = 1; // Фіксований масштаб 1:1
        this.translateX = 0; // Без зміщення
        this.translateY = 50; // Опускаємо карту вниз на 50px
        
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
    
            this.logMessage(`Гра почалася! Мета: ${this.WIN_CONDITION_POINTS} ОО.`, 'system');
    
            this.logMessage(`Хід гравця ${this.players[this.currentPlayerIndex].name}.`, 'turn');
    
           
    
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
    
           
    
        // Фішки гравців
    
        this.players.forEach(p => {
    
            const pawn = document.createElement('div');
    
            pawn.id = `pawn-${p.id}`;
    
            pawn.className = 'player-pawn';
    
            pawn.style.backgroundColor = p.color;
    
            startCell.appendChild(pawn);
    
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
    
        applyTransform() {
    
            this.gameBoardContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    
        }
    
       
    
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
    
            if (!this.isPanning) return;
    
            const dx = e.clientX - this.panStartX;
    
            const dy = e.clientY - this.panStartY;
    
            this.translateX += dx;
    
            this.translateY += dy;
    
            this.panStartX = e.clientX;
    
            this.panStartY = e.clientY;
    
            this.applyTransform();
    
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
    
            this.applyTransform();
    
        }
    
       
    
        // Ігрова логіка
    
        async rollTheDice() {
    
            this.rollDiceBtn.disabled = true;
    
            let roll = Math.floor(Math.random() * 6) + 1;
    
            const player = this.players[this.currentPlayerIndex];
    
            let move = roll + player.class.moveModifier + player.moveModifier;
    
            if (player.class.id === 'peasant') move = Math.max(1, move);
    
           
    
            this.logMessage(`${player.name} (${player.class.name}) викинув ${roll}. Рух: ${move}.`, 'roll');
    
           
    
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
    
                this.diceInner.style.transform = `${rotations[roll]} translateZ(40px)`;
    
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
            this.logMessage(`🎉 ${player.name} досяг кінця шляху! Перемога!`, 'victory');
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
    
        this.logMessage(`${player.name} переміщено на клітинку ${player.position}.`, 'system');
        
        // Перевіряємо перемогу (досягнення останньої клітинки)
        if (position >= this.BOARD_SIZE) {
            this.logMessage(`🎉 ${player.name} досяг кінця шляху! Перемога!`, 'victory');
            this.endGame(player, `${player.name} переміг, досягнувши кінця освітнього шляху!`);
            return; // Не перевіряємо події на клітинці, бо гра закінчена
        }
    
        this.checkCell(player);
    
    }
    
       
    
        checkCell(player) {
    
            const cellData = this.specialCells[player.position];
    
            if (cellData) {
    
                this.handleSpecialCell(player, cellData);
    
            } else {
    
                this.nextTurn();
    
            }
    
        }
    
       
    
        handleSpecialCell(player, cellData) {
    
            this.logMessage(`${player.name} потрапив на подію!`, 'event');
    
           
    
            switch(cellData.type) {
    
                case 'quest':
    
                    this.triggerRandomQuest(player);
    
                    break;
    
                case 'pvp-quest':
    
                    this.triggerPvpQuest(player);
    
                    break;
    
                case 'creative-quest':
    
                    this.triggerCreativeQuest(player);
    
                    break;
    
                case 'reincarnation':
    
                            this.showQuestModal('Реінкарнація!', `${cellData.description} Перейти до наступної епохи?`, [
    
                                { text: 'Так', callback: () => {
    
                                    this.updatePoints(player, cellData.points, cellData.description);
    
                                    this.teleportToNextEpoch(player, cellData.nextEpoch);
    
                                    this.questModal.classList.add('hidden');
    
                                }},
    
                                { text: 'Ні', callback: () => {
    
                                    this.questModal.classList.add('hidden');
    
                                    this.nextTurn();
    
                                }}
    
                            ]);
    
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
                            
                            this.logMessage(`${player.name} загинув від повстання машин, але реінкарнувався на клітинці 75!`, 'system');
                            
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
    
                        this.logMessage(`${player.name} отримав ${quest.reward} ОО за ${quest.title.toLowerCase()}.`, 'system');
    
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
    
            if (reason) this.logMessage(`${player.name} ${amount > 0 ? '+' : ''}${amount} ОО. (${reason})`, 'system');
    
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
    
                this.logMessage(`${player.name} отримує додатковий хід!`, 'turn');
    
                this.rollDiceBtn.disabled = false;
    
                return;
    
            }
    
           
    
            if (player.skipTurn) {
    
                player.skipTurn = false;
    
                this.logMessage(`${player.name} пропускає хід.`, 'turn');
    
                this.showQuestModal('Пропуск ходу', `${player.name} пропускає цей хід через подію.`, [
    
                    { text: 'Зрозуміло', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}
    
                ]);
    
                return;
    
            }
    
           
    
            do {
    
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
            } while (this.players[this.currentPlayerIndex].hasLost);
    
           
    
            this.updateUI();
    
            this.logMessage(`Тепер хід гравця ${this.players[this.currentPlayerIndex].name}.`, 'turn');
    
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
    
                cell.appendChild(pawn);
    
                this.centerViewOn(cell);
    
            }
    
        }
    
       
    
        // Плавна анімація руху фішки покроково
    
        async animatePawnMovement(player, fromPosition, toPosition, steps) {
    
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
    
               
    
                // Переміщуємо фішку в нову клітинку
    
                targetCell.appendChild(pawn);
    
               
    
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
    
           
    
            this.logMessage(`${player.name} телепортувався до епохи ${nextEpoch.name}!`, 'system');
    
           
    
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
    
       
    
        logMessage(message, type) {
    
            const logEntry = document.createElement('div');
    
            let typeClass = '';
    
            if (type === 'roll') typeClass = 'text-yellow-300';
    
            else if (type === 'event') typeClass = 'text-purple-300';
    
            else if (type === 'turn') typeClass = 'text-green-300 font-semibold';
    
            else if (type === 'system') typeClass = 'text-gray-400 italic';
    
           
    
            logEntry.className = `p-1 border-b border-gray-700 ${typeClass}`;
    
            logEntry.innerHTML = `> ${message}`;
    
            this.gameLog.insertBefore(logEntry, this.gameLog.firstChild);
    
           
    
            // Обмежуємо кількість записів до 20
    
            while (this.gameLog.children.length > 20) {
    
                this.gameLog.removeChild(this.gameLog.lastChild);
    
            }
    
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
    
           
    
            this.logMessage(message, 'system');
    
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
    
        this.logMessage("PvP квест буде реалізований в мультиплеєрі", 'system');
    
        this.nextTurn();
    
    }
    
   
    
    triggerCreativeQuest(player) {
    
        this.logMessage("Творчий квест буде реалізований в мультиплеєрі", 'system');
    
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
        const rect = this.gameViewport.getBoundingClientRect();
        const viewportWidth = rect.width;
        const viewportHeight = rect.height;
        const mapWidth = 1920 * this.scale;
        const mapHeight = 1080 * this.scale;
        
        // Обмежуємо переміщення по X
        if (mapWidth <= viewportWidth) {
            // Карта менша за контейнер - центруємо
            this.translateX = (viewportWidth - mapWidth) / 2;
        } else {
            // Карта більша за контейнер - обмежуємо переміщення
            const maxTranslateX = 0;
            const minTranslateX = viewportWidth - mapWidth;
            this.translateX = Math.max(minTranslateX, Math.min(maxTranslateX, this.translateX));
        }
        
        // Обмежуємо переміщення по Y
        if (mapHeight <= viewportHeight) {
            // Карта менша за контейнер - центруємо
            this.translateY = (viewportHeight - mapHeight) / 2;
        } else {
            // Карта більша за контейнер - обмежуємо переміщення
            const maxTranslateY = 0;
            const minTranslateY = viewportHeight - mapHeight;
            this.translateY = Math.max(minTranslateY, Math.min(maxTranslateY, this.translateY));
        }
    }
    
    // Встановлення початкового масштабу
    setInitialScale() {
        console.log('🔧 setInitialScale() викликано (друга функція)');
        
        // ВИМКНЕНО: Автоматичне масштабування - використовуємо фіксований розмір
        this.scale = 1; // Фіксований масштаб 1:1
        this.translateX = 0; // Без зміщення
        this.translateY = 50; // Опускаємо карту вниз на 50px
        
        console.log('📊 Фіксований масштаб встановлено (друга функція):', {
            scale: this.scale,
            translateX: this.translateX,
            translateY: this.translateY
        });
    }
    
    // Застосування трансформації
    applyTransform() {
        console.log('🎯 applyTransform() викликано');
        if (this.gameBoardContainer) {
            const transformString = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
            console.log('🔄 Застосовуємо transform:', transformString);
            this.gameBoardContainer.style.transform = transformString;
            
            // Логуємо поточний стан після застосування
            console.log('📋 СТАН ПІСЛЯ ЗАСТОСУВАННЯ:', {
                element: this.gameBoardContainer.id,
                currentStyle: this.gameBoardContainer.style.cssText,
                computedTransform: window.getComputedStyle(this.gameBoardContainer).transform
            });
        }
    }
    
    // Центрування на клітинці
    centerViewOn(cell) {
        // ВИМКНЕНО: Фокусування камери заблоковано - карта статична
        console.log('🚫 centerViewOn() вимкнено - карта статична');
        return; // Не робимо нічого
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
