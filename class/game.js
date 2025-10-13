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
        this.scale = 0.5;
        this.translateX = 0;
        this.translateY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        this.cellCoordinates = [
            {top: 700, left: 75}, {top: 700, left: 125}, {top: 690, left: 175}, {top: 670, left: 225}, {top: 640, left: 265}, {top: 600, left: 290}, {top: 550, left: 300}, {top: 500, left: 295}, {top: 450, left: 275}, {top: 410, left: 240}, {top: 390, left: 190}, {top: 390, left: 140}, {top: 410, left: 90}, {top: 450, left: 75}, {top: 500, left: 90}, {top: 550, left: 110}, {top: 600, left: 140}, {top: 625, left: 190}, {top: 590, left: 230}, {top: 540, left: 240}, {top: 490, left: 225}, {top: 450, left: 190}, {top: 425, left: 140}, {top: 475, left: 125}, {top: 525, left: 175},
            {top: 400, left: 325}, {top: 350, left: 350}, {top: 300, left: 375}, {top: 250, left: 400}, {top: 200, left: 425}, {top: 150, left: 440}, {top: 100, left: 450}, {top: 75, left: 500}, {top: 90, left: 550}, {top: 125, left: 590}, {top: 175, left: 610}, {top: 225, left: 600}, {top: 275, left: 575}, {top: 325, left: 540}, {top: 360, left: 490}, {top: 325, left: 450}, {top: 275, left: 425}, {top: 225, left: 475}, {top: 190, left: 525}, {top: 240, left: 550}, {top: 290, left: 500}, {top: 240, left: 450}, {top: 175, left: 490}, {top: 125, left: 525}, {top: 100, left: 575},
            {top: 400, left: 625}, {top: 425, left: 675}, {top: 475, left: 700}, {top: 525, left: 710}, {top: 575, left: 690}, {top: 625, left: 650}, {top: 675, left: 600}, {top: 690, left: 550}, {top: 650, left: 500}, {top: 600, left: 475}, {top: 550, left: 490}, {top: 500, left: 525}, {top: 475, left: 575}, {top: 490, left: 625}, {top: 540, left: 650}, {top: 590, left: 610}, {top: 625, left: 575}, {top: 575, left: 540}, {top: 525, left: 560}, {top: 575, left: 590}, {top: 540, left: 625}, {top: 500, left: 660}, {top: 450, left: 650}, {top: 425, left: 600}, {top: 450, left: 550},
            {top: 350, left: 750}, {top: 300, left: 775}, {top: 250, left: 800}, {top: 200, left: 825}, {top: 150, left: 850}, {top: 100, left: 875}, {top: 75, left: 925}, {top: 100, left: 975}, {top: 150, left: 1000}, {top: 200, left: 1010}, {top: 250, left: 990}, {top: 300, left: 950}, {top: 325, left: 900}, {top: 290, left: 875}, {top: 240, left: 890}, {top: 190, left: 925}, {top: 150, left: 975}, {top: 175, left: 910}, {top: 225, left: 950}, {top: 275, left: 925}, {top: 250, left: 850}, {top: 200, left: 875}, {top: 150, left: 900}, {top: 125, left: 950}, {top: 160, left: 990},
            {top: 400, left: 1025}, {top: 450, left: 1050}, {top: 500, left: 1075}, {top: 550, left: 1090}, {top: 600, left: 1075}, {top: 650, left: 1050}, {top: 690, left: 1000}, {top: 675, left: 950}, {top: 640, left: 925}, {top: 590, left: 940}, {top: 540, left: 975}, {top: 500, left: 1025}, {top: 525, left: 960}, {top: 575, left: 990}, {top: 625, left: 1025}, {top: 575, left: 1100}, {top: 525, left: 1125}, {top: 475, left: 1140}, {top: 425, left: 1125}, {top: 375, left: 1100}, {top: 325, left: 1125}, {top: 275, left: 1150}, {top: 225, left: 1160}, {top: 175, left: 1150}, {top: 125, left: 1125}
        ];
        
        this.specialCells = {
            5: { type: 'quest' }, 
            10: { type: 'pvp-quest' }, 
            15: { type: 'event-good', effect: p => this.updatePoints(p, 20, "Винайдено писемність! +20 ОО.", true) }, 
            20: { type: 'creative-quest' }, 
            25: { type: 'reincarnation', next: 26, points: 50 },
            30: { type: 'quest' }, 
            35: { type: 'event-bad', effect: p => this.updatePoints(p, -20, "Втрата рукописів. -20 ОО.", true) }, 
            40: { type: 'pvp-quest' }, 
            45: { type: 'portal', target: 55, cost: 15 }, 
            50: { type: 'reincarnation', next: 51, points: 60 },
            55: { type: 'creative-quest' }, 
            60: { type: 'event-good', effect: p => this.updatePoints(p, 30, "Епоха Відродження! +30 ОО.", true) }, 
            65: { type: 'pvp-quest' }, 
            70: { type: 'event-bad', effect: p => { p.skipTurn = true; this.updatePoints(p, -10); }, description: "З'їв дивних грибів. Пропуск ходу та -10 ОО." }, 
            75: { type: 'reincarnation', next: 76, points: 70 },
            80: { type: 'quest' }, 
            85: { type: 'portal', target: 95, cost: 20 }, 
            90: { type: 'pvp-quest' }, 
            95: { type: 'event-good', effect: p => { p.extraTurn = true; }, description: "Просвітництво! Додатковий хід." }, 
            100: { type: 'reincarnation', next: 101, points: 80 },
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
        this.gameViewport.addEventListener('wheel', (e) => this.handleZoom(e));
        this.gameViewport.addEventListener('mousedown', (e) => this.startPanning(e));
        window.addEventListener('mousemove', (e) => this.handlePanning(e));
        window.addEventListener('mouseup', () => this.stopPanning());
        
        this.setupPlayerInputs();
        this.applyTransform();
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
        
        this.createBoard();
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
        
        // Стартова клітинка
        const startCell = document.createElement('div');
        startCell.id = 'cell-0';
        startCell.className = 'board-cell start';
        startCell.style.top = '700px';
        startCell.style.left = '25px';
        startCell.innerHTML = '<span>СТАРТ</span>';
        this.gameBoard.appendChild(startCell);
        
        // Інші клітинки
        this.cellCoordinates.forEach((coord, i) => {
            const cellNum = i + 1;
            const cell = document.createElement('div');
            cell.id = `cell-${cellNum}`;
            const special = this.specialCells[cellNum];
            let cellClass = special ? special.type : 'empty';
            if (cellNum >= 121 && cellNum <= 123) cellClass += ' future';
            if (cellNum === this.BOARD_SIZE) cellClass = 'finish';
            cell.className = `board-cell ${cellClass}`;
            cell.style.top = `${coord.top}px`;
            cell.style.left = `${coord.left}px`;
            cell.innerHTML = `<span>${cellNum === this.BOARD_SIZE ? 'F' : cellNum}</span>`;
            this.gameBoard.appendChild(cell);
        });
        
        this.drawPath();
        
        // Фішки гравців
        this.players.forEach(p => {
            const pawn = document.createElement('div');
            pawn.id = `pawn-${p.id}`;
            pawn.className = 'player-pawn';
            pawn.style.backgroundColor = p.color;
            startCell.appendChild(pawn);
        });
    }
    
    drawPath() {
        let pathData = '';
        const allCoords = [{top: 700, left: 25}, ...this.cellCoordinates];
        for(let i = 0; i < allCoords.length - 1; i++) {
            const p1 = { x: allCoords[i].left, y: allCoords[i].top };
            const p2 = { x: allCoords[i+1].left, y: allCoords[i+1].top };
            if (i === 0) pathData += `M ${p1.x} ${p1.y} `;
            pathData += `L ${p2.x} ${p2.y} `;
        }
        
        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(255, 255, 255, 0.4)');
        path.setAttribute('stroke-width', '10');
        path.setAttribute('stroke-dasharray', '20 10');
        path.setAttribute('stroke-linecap', 'round');
        
        this.pathSvg.innerHTML = '';
        this.pathSvg.appendChild(path);
    }
    
    // Зум і панорама
    applyTransform() {
        this.gameBoardContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }
    
    handleZoom(e) {
        e.preventDefault();
        const rect = this.gameViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const oldScale = this.scale;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale = Math.max(0.3, Math.min(2, this.scale * delta));
        this.translateX = mouseX - (mouseX - this.translateX) * (this.scale / oldScale);
        this.translateY = mouseY - (mouseY - this.translateY) * (this.scale / oldScale);
        this.applyTransform();
    }
    
    startPanning(e) {
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
    rollTheDice() {
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
        setTimeout(() => {
            this.diceInner.style.transform = `${rotations[roll]} translateZ(40px)`;
            this.movePlayer(player, move);
        }, 1000);
    }
    
    async movePlayer(player, steps) {
        const startPos = player.position;
        const endPos = Math.min(startPos + steps, this.BOARD_SIZE);
        
        for (let i = startPos + 1; i <= endPos; i++) {
            player.position = i;
            this.updatePawnPosition(player);
            await new Promise(res => setTimeout(res, 300));
        }
        
        this.checkCell(player);
    }
    
    async movePlayerTo(player, position) {
        player.position = position;
        this.updatePawnPosition(player);
        await new Promise(res => setTimeout(res, 300));
        this.logMessage(`${player.name} переміщено на клітинку ${player.position}.`, 'system');
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
                this.updatePoints(player, cellData.points, `Реінкарнація!`);
                this.movePlayerTo(player, cellData.next);
                break;
            case 'machine-uprising':
                player.hasLost = true;
                this.endGame(null, `${player.name} поглинуло повстання машин!`);
                break;
            case 'portal':
                this.showQuestModal('Таємний портал!', `Ризикнути та стрибнути на клітинку ${cellData.target} за ${cellData.cost} ОО?`, [
                    { text: 'Так', callback: () => { this.updatePoints(player, -cellData.cost); this.movePlayerTo(player, cellData.target); this.questModal.classList.add('hidden'); }},
                    { text: 'Ні', callback: () => { this.questModal.classList.add('hidden'); this.nextTurn(); }}
                ]);
                break;
            case 'alternative-path':
                this.showQuestModal('Обхідний шлях!', `${cellData.description}. Використати?`, [
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
        this.currentPlayerClassEl.textContent = player.class.name;
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
}

// Експорт для використання в інших файлах
window.EducationalPathGame = EducationalPathGame;
