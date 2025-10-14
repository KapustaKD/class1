// game.js - ФІНАЛЬНА ВЕРСІЯ З ОБМЕЖЕННЯМИ КАМЕРИ

class EducationalPathGame {
    constructor() {
        this.BOARD_SIZE = 101;
        this.CELL_SIZE = 40; // Ви можете змінити це значення, наприклад, на 50
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
        
        this.scale = 1.0;
        this.minScale = 1.0; // FIX: Буде розраховано динамічно
        this.translateX = 0;
        this.translateY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        this.mapData = null;
        this.loadMapData();
        
        this.specialCells = { 5: { type: 'quest' }, 10: { type: 'pvp-quest' }, 15: { type: 'event-good', effect: p => this.updatePoints(p, 20, "Винайдено писемність! +20 ОО.", true) }, 20: { type: 'creative-quest' }, 25: { type: 'reincarnation', nextEpoch: 2, points: 50, description: 'Реінкарнація! Перехід до наступної епохи.' }, 30: { type: 'quest' }, 35: { type: 'event-bad', effect: p => this.updatePoints(p, -20, "Втрата рукописів. -20 ОО.", true) }, 40: { type: 'pvp-quest' }, 45: { type: 'alternative-path', target: 55, cost: 15, description: 'Обхідна дорога! Скористатися?' }, 50: { type: 'reincarnation', nextEpoch: 3, points: 60, description: 'Реінкарнація! Перехід до наступної епохи.' }, 55: { type: 'creative-quest' }, 60: { type: 'event-good', effect: p => this.updatePoints(p, 30, "Епоха Відродження! +30 ОО.", true) }, 65: { type: 'pvp-quest' }, 70: { type: 'event-bad', effect: p => { p.skipTurn = true; this.updatePoints(p, -10); }, description: "З'їв дивних грибів. Пропуск ходу та -10 ОО." }, 75: { type: 'reincarnation', nextEpoch: 4, points: 70, description: 'Реінкарнація! Перехід до наступної епохи.' }, 80: { type: 'quest' }, 85: { type: 'alternative-path', target: 95, cost: 20, description: 'Обхідна дорога! Скористатися?' }, 90: { type: 'pvp-quest' }, 95: { type: 'event-good', effect: p => { p.extraTurn = true; }, description: "Просвітництво! Додатковий хід." }, 100: { type: 'reincarnation', nextEpoch: 5, points: 80, description: 'Реінкарнація! Перехід до наступної епохи.' }, 124: { type: 'machine-uprising' }, 12: { type: 'alternative-path', target: 18, cost: 5, description: "Обхідний шлях до клітинки 18 за 5 ОО" }, 32: { type: 'alternative-path', target: 38, cost: 8, description: "Обхідний шлях до клітинки 38 за 8 ОО" }, 52: { type: 'alternative-path', target: 58, cost: 10, description: "Обхідний шлях до клітинки 58 за 10 ОО" }, 72: { type: 'alternative-path', target: 78, cost: 12, description: "Обхідний шлях до клітинки 78 за 12 ОО" }, 92: { type: 'alternative-path', target: 98, cost: 15, description: "Обхідний шлях до клітинки 98 за 15 ОО" }, 8: { type: 'event-bad', effect: p => { p.moveModifier = -1; setTimeout(() => p.moveModifier = 0, 1); }, description: "Булінг від мислителя. Наступний хід на 1 менше." }, 18: { type: 'event-good', effect: p => { p.moveModifier = 1; setTimeout(() => p.moveModifier = 0, 1); }, description: "Дружба з мудрецем. Наступний хід на 1 більше." }, 28: { type: 'event-bad', effect: p => this.movePlayerTo(p, Math.max(1, p.position - 3)), description: "Втрата пам'яті. Повернення на 3 клітинки назад." }, 38: { type: 'event-good', effect: p => this.updatePoints(p, 25), description: "Знайшов древній манускрипт! +25 ОО." }, 48: { type: 'event-bad', effect: p => { p.skipTurn = true; }, description: "Захворів на чуму. Пропуск ходу." }, 58: { type: 'event-good', effect: p => { p.extraTurn = true; }, description: "Відкриття нового методу навчання! Додатковий хід." }, 68: { type: 'event-bad', effect: p => this.updatePoints(p, -15), description: "Спалили бібліотеку. -15 ОО." }, 78: { type: 'event-good', effect: p => this.updatePoints(p, 40), description: "Створено університет! +40 ОО." }, 88: { type: 'event-bad', effect: p => this.movePlayerTo(p, Math.max(1, p.position - 5)), description: "Інквізиція. Повернення на 5 клітинок назад." }, 98: { type: 'event-good', effect: p => this.updatePoints(p, 35), description: "Наукова революція! +35 ОО." }};
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    async loadMapData() {
        try {
            const module = await import('./mapData.js');
            this.mapData = module.mapData;
            console.log('Map data loaded successfully.');
        } catch (error) {
            console.error('Error loading map data:', error);
            this.mapData = { canvasSize: { width: 1920, height: 1080 }, zones: [], cells: [] };
        }
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
        this.showSetupBtn.addEventListener('click', () => { this.rulesModal.classList.add('hidden'); this.startModal.classList.remove('hidden'); });
        this.playerCountSelect.addEventListener('change', () => this.setupPlayerInputs());
        this.startGameBtn.addEventListener('click', () => this.initializeGame());
        this.rollDiceBtn.addEventListener('click', () => { if (this.gameActive) this.rollTheDice(); });
        this.gameViewport.addEventListener('wheel', (e) => this.handleZoom(e));
        this.gameViewport.addEventListener('mousedown', (e) => this.startPanning(e));
        window.addEventListener('mousemove', (e) => this.handlePanning(e));
        window.addEventListener('mouseup', () => this.stopPanning());
        this.setupPlayerInputs();
        
        // FIX: Встановлюємо початковий масштаб після того, як всі елементи завантажені
        window.addEventListener('load', () => {
            this.setInitialScale();
            this.applyTransform();
        });
    }

    // FIX: Нова функція для розрахунку та встановлення початкового масштабу
    setInitialScale() {
        const rect = this.gameViewport.getBoundingClientRect();
        const mapWidth = this.mapData.canvasSize.width;
        const mapHeight = this.mapData.canvasSize.height;

        const scaleX = rect.width / mapWidth;
        const scaleY = rect.height / mapHeight;
        
        // Використовуємо Math.max, щоб карта повністю "покривала" контейнер
        this.minScale = Math.max(scaleX, scaleY);
        this.scale = this.minScale;
        
        // Центруємо карту
        this.translateX = (rect.width - mapWidth * this.scale) / 2;
        this.translateY = (rect.height - mapHeight * this.scale) / 2;
    }
    
    setupPlayerInputs() {
        const count = this.playerCountSelect.value;
        this.playerSetupContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            this.playerSetupContainer.innerHTML += `<div class="mt-4 p-3 border rounded-lg" style="border-color: ${this.playerColors[i]};"><h3 class="text-xl font-semibold mb-2" style="color: ${this.playerColors[i]};">Гравець ${i + 1}</h3><div class="mb-2"><label for="player-name-${i}" class="block font-medium">Ім'я:</label><input type="text" id="player-name-${i}" value="Гравець ${i + 1}" class="w-full p-2 border border-gray-300 rounded text-black"></div><div><label for="player-class-${i}" class="block font-medium">Клас:</label><select id="player-class-${i}" class="w-full p-2 border border-gray-300 rounded text-black">${this.playerClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div></div>`;
        }
    }
    
    async initializeGame() {
        const count = this.playerCountSelect.value;
        this.players = [];
        for (let i = 0; i < count; i++) {
            const name = document.getElementById(`player-name-${i}`).value;
            const classId = document.getElementById(`player-class-${i}`).value;
            const playerClass = this.playerClasses.find(c => c.id === classId);
            this.players.push({ id: i + 1, name, color: this.playerColors[i], position: 0, class: playerClass, points: playerClass.startPoints, skipTurn: false, extraTurn: false, hasLost: false, moveModifier: 0 });
        }
        
        await this.createBoardAndWaitForData();

        this.gameActive = true;
        this.currentPlayerIndex = 0;
        this.updateUI();
        this.startModal.classList.add('hidden');
        this.logMessage(`Гра почалася! Мета: ${this.WIN_CONDITION_POINTS} ОО.`, 'system');
        this.logMessage(`Хід гравця ${this.players[this.currentPlayerIndex].name}.`, 'turn');
        
        const startCell = document.getElementById('cell-0');
        if (startCell) {
            this.setInitialScale(); // Перераховуємо масштаб після створення карти
            this.applyTransform();
            this.centerViewOn(startCell);
        }
    }
    
    async createBoardAndWaitForData() {
        while (!this.mapData || !this.mapData.cells || this.mapData.cells.length === 0) {
            await this.sleep(100);
        }
        this.createBoard();
    }
    
    createBoard() {
        this.gameBoard.innerHTML = '';
        
        // Стартова клітинка
        const startCellElement = document.createElement('div');
        startCellElement.id = 'cell-0';
        startCellElement.className = 'board-cell start';
        startCellElement.style.left = '50px';
        startCellElement.style.top = '500px';
        startCellElement.style.width = `${this.CELL_SIZE * 1.5}px`;
        startCellElement.style.height = `${this.CELL_SIZE * 1.5}px`;
        startCellElement.innerHTML = `<span>СТАРТ</span>`;
        this.gameBoard.appendChild(startCellElement);

        // Клітинки з mapData
        this.mapData.cells.forEach((cell) => {
            const cellElement = document.createElement('div');
            cellElement.id = `cell-${cell.id}`;
            const special = this.specialCells[cell.id];
            let cellClass = special ? special.type : 'empty';
            if (cell.id === this.BOARD_SIZE) cellClass = 'finish';
            cellElement.className = `board-cell ${cellClass}`;
            
            cellElement.style.top = `${cell.y}px`;
            cellElement.style.left = `${cell.x}px`;
            cellElement.style.width = `${this.CELL_SIZE}px`;
            cellElement.style.height = `${this.CELL_SIZE}px`;
            cellElement.style.zIndex = '10';
            
            cellElement.innerHTML = (cell.id === this.BOARD_SIZE) ? '<span>👑</span>' : `<span>${cell.id}</span>`;
            this.gameBoard.appendChild(cellElement);
        });
        
        // Фішки гравців
        this.players.forEach(p => {
            const pawn = document.createElement('div');
            pawn.id = `pawn-${p.id}`;
            pawn.className = 'player-pawn';
            pawn.style.backgroundColor = p.color;
            pawn.style.zIndex = '20';
            startCellElement.appendChild(pawn);
        });
    }
    
    applyTransform() { this.gameBoardContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`; }
    
    // FIX: Оновлена логіка зуму з обмеженнями
    handleZoom(e) {
        e.preventDefault();
        const rect = this.gameViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const oldScale = this.scale;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;

        // Перераховуємо мінімальний масштаб кожен раз
        this.setInitialScale();
        
        this.scale = Math.max(this.minScale, Math.min(3, this.scale * delta)); // Максимальний зум = 3
        
        this.translateX = mouseX - (mouseX - this.translateX) * (this.scale / oldScale);
        this.translateY = mouseY - (mouseY - this.translateY) * (this.scale / oldScale);

        this.clampTranslations(); // Обмежуємо перетягування
        this.applyTransform();
    }
    
    // FIX: Блокуємо перетягування, якщо карта повністю віддалена
    startPanning(e) {
        if (Math.abs(this.scale - this.minScale) < 0.01) {
            return; // Не починати перетягування, якщо масштаб мінімальний
        }
        this.isPanning = true;
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
        this.gameViewport.style.cursor = 'grabbing';
        this.gameBoardContainer.style.transition = 'none';
    }
    
    handlePanning(e) {
        if (!this.isPanning) return;
        const dx = e.clientX - this.panStartX;
        const dy = e.clientY - this.panStartY;
        this.translateX += dx;
        this.translateY += dy;
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;

        this.clampTranslations(); // Обмежуємо перетягування
        this.applyTransform();
    }

    // FIX: Нова функція для обмеження виходу карти за межі екрану
    clampTranslations() {
        const rect = this.gameViewport.getBoundingClientRect();
        const mapWidth = this.mapData.canvasSize.width * this.scale;
        const mapHeight = this.mapData.canvasSize.height * this.scale;

        const minX = rect.width - mapWidth;
        const minY = rect.height - mapHeight;

        this.translateX = Math.min(0, Math.max(minX, this.translateX));
        this.translateY = Math.min(0, Math.max(minY, this.translateY));
    }
    
    stopPanning() {
        this.isPanning = false;
        this.gameViewport.style.cursor = 'grab';
        this.gameBoardContainer.style.transition = 'transform 0.5s ease';
    }
    
    centerViewOn(element) {
        if (!element) return;
        const viewportRect = this.gameViewport.getBoundingClientRect();
        const elementX = element.offsetLeft + element.offsetWidth / 2;
        const elementY = element.offsetTop + element.offsetHeight / 2;
        this.translateX = (viewportRect.width / 2) - (elementX * this.scale);
        this.translateY = (viewportRect.height / 2) - (elementY * this.scale);
        this.clampTranslations();
        this.applyTransform();
    }
    
    async rollTheDice() {
        this.rollDiceBtn.disabled = true;
        let roll = Math.floor(Math.random() * 6) + 1;
        const player = this.players[this.currentPlayerIndex];
        let move = roll + (player.class.moveModifier || 0) + player.moveModifier;
        if (player.class.id === 'peasant') move = Math.max(1, move);
        
        this.logMessage(`${player.name} (${player.class.name}) викинув ${roll}. Рух: ${move}.`, 'roll');
        
        const rotations = { 1: 'rotateY(0deg)', 2: 'rotateY(-90deg)', 3: 'rotateY(-180deg)', 4: 'rotateY(90deg)', 5: 'rotateX(-90deg)', 6: 'rotateX(90deg)' };
        this.diceInner.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
        
        setTimeout(async () => {
            this.diceInner.style.transform = `${rotations[roll]} translateZ(40px)`;
            await this.movePlayer(player, move);
        }, 1000);
    }
    
    async movePlayer(player, steps) {
        const startPos = player.position;
        const endPos = Math.min(startPos + steps, this.BOARD_SIZE);
        
        for (let i = startPos + 1; i <= endPos; i++) {
            await this.movePawnToCell(player, i);
            await this.sleep(200);
        }

        player.position = endPos;
        this.checkCell(player);
    }
    
    async movePlayerTo(player, position) {
        await this.movePawnToCell(player, position);
        player.position = position;
        this.logMessage(`${player.name} переміщено на клітинку ${player.position}.`, 'system');
        this.checkCell(player);
    }

    async movePawnToCell(player, cellId) {
        return new Promise(resolve => {
            const pawn = document.getElementById(`pawn-${player.id}`);
            const targetCell = document.getElementById(cellId === 0 ? 'cell-0' : `cell-${cellId}`);
            if (pawn && targetCell) {
                targetCell.appendChild(pawn);
                this.centerViewOn(targetCell);
            }
            setTimeout(resolve, 200);
        });
    }

    checkCell(player) {
        const cellData = this.specialCells[player.position];
        if (cellData) { this.handleSpecialCell(player, cellData); } 
        else { this.nextTurn(); }
    }
    
    handleSpecialCell(player, cellData) {
        this.logMessage(`${player.name} потрапив на подію!`, 'event');
        switch(cellData.type) {
            case 'quest': this.triggerRandomQuest(player); break;
            case 'pvp-quest': this.triggerPvpQuest(player); break;
            case 'creative-quest': this.triggerCreativeQuest(player); break;
            case 'machine-uprising': player.hasLost = true; this.endGame(null, `${player.name} поглинуло повстання машин!`); break;
            case 'alternative-path':
                this.showQuestModal('Обхідна дорога!', `${cellData.description}`, [
                    { text: 'Так', callback: () => { this.updatePoints(player, -cellData.cost); this.movePlayerTo(player, cellData.target); this.questModal.classList.add('hidden'); }},
                    { text: 'Ні', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}
                ]);
                break;
            default:
                if (cellData.effect) cellData.effect(player);
                setTimeout(() => this.nextTurn(), 1000);
                break;
        }
    }
    
    triggerRandomQuest(player) {
        const quest = { title: 'Знайшов старовинну книгу!', reward: 15, description: 'Ви знайшли цінну книгу в бібліотеці.' };
        this.updatePoints(player, quest.reward, quest.title);
        this.showQuestModal(quest.title, quest.description, [{ text: 'Далі', callback: () => { this.questModal.classList.add('hidden'); this.logMessage(`${player.name} отримав ${quest.reward} ОО.`, 'system'); this.nextTurn(); }}]);
    }

    updatePoints(player, amount, reason = "") {
        player.points += amount;
        if (reason) this.logMessage(`${player.name} ${amount > 0 ? '+' : ''}${amount} ОО. (${reason})`, 'system');
        this.updateUI();
        if (player.points >= this.WIN_CONDITION_POINTS) { this.endGame(player); }
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
            this.nextTurn();
            return;
        }
        
        do { this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length; } 
        while (this.players[this.currentPlayerIndex] && this.players[this.currentPlayerIndex].hasLost);
        
        this.updateUI();
        this.logMessage(`Тепер хід гравця ${this.players[this.currentPlayerIndex].name}.`, 'turn');
        this.rollDiceBtn.disabled = false;
    }
    
    updateUI() {
        if (!this.players || this.players.length === 0) return;
        const player = this.players[this.currentPlayerIndex];
        if (!player) return;
        this.currentPlayerNameEl.textContent = player.name;
        this.currentPlayerNameEl.style.color = player.color;
        this.currentPlayerClassEl.textContent = player.class ? player.class.name : 'Не обрано';
        this.currentPlayerPointsEl.textContent = player.points;
        this.leaderboardEl.innerHTML = `<h3 class="text-lg font-semibold mt-2">Таблиця лідерів</h3>` + this.players.filter(p => !p.hasLost).sort((a,b) => b.points - a.points).map(p => `<div style="color:${p.color};">${p.name}: ${p.points} ОО</div>`).join('');
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
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
        if (this.gameLog.children.length > 20) { this.gameLog.removeChild(this.gameLog.lastChild); }
    }
    
    endGame(winner, customMessage = "") {
        if (!this.gameActive) return;
        this.gameActive = false;
        this.rollDiceBtn.disabled = true;
        let message;
        if (customMessage) { message = customMessage; }
        else if(winner) { message = `Переможець: ${winner.name}, який набрав ${winner.points} ОО!`; }
        else { const sortedPlayers = this.players.filter(p => !p.hasLost).sort((a,b) => b.points - a.points); message = sortedPlayers.length > 0 ? `Гру завершено! Переміг ${sortedPlayers[0].name} з ${sortedPlayers[0].points} ОО!` : `Гру завершено! Машини перемогли.`; }
        this.logMessage(message, 'system');
        const contentHTML = `<h2 class="text-4xl font-bold text-yellow-400 mb-4">Гру завершено!</h2><p class="text-2xl mb-6">${message}</p><button id="restart-game-btn" class="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-xl">Грати знову</button>`;
        this.showQuestModalWithContent(contentHTML, () => {
            document.getElementById('restart-game-btn').addEventListener('click', () => location.reload());
        });
    }
    
    showQuestModal(title, text, buttons) {
        let buttonsHTML = buttons.map((btn, index) => `<button id="modal-btn-${index}" class="px-4 py-2 rounded-lg text-white font-semibold transition ${index === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}">${btn.text}</button>`).join(' ');
        const contentHTML = `<h3 class="text-2xl font-bold mb-2">${title}</h3><div class="text-lg mb-6">${text}</div><div class="flex justify-center gap-4">${buttonsHTML}</div>`;
        this.showQuestModalWithContent(contentHTML, () => {
            buttons.forEach((btn, index) => {
                document.getElementById(`modal-btn-${index}`).onclick = () => { if (btn.callback) btn.callback(); };
            });
        });
    }
    
    showQuestModalWithContent(html, setupCallback) {
        this.questModalContent.innerHTML = html;
        this.questModal.classList.remove('hidden');
        if(setupCallback) setupCallback(this.questModalContent);
    }
    
    triggerPvpQuest(player) { this.logMessage("PvP квест буде реалізований в мультиплеєрі", 'system'); this.nextTurn(); }
    triggerCreativeQuest(player) { this.logMessage("Творчий квест буде реалізований в мультиплеєрі", 'system'); this.nextTurn(); }
}

window.EducationalPathGame = EducationalPathGame;
