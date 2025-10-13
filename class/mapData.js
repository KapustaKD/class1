// Структура даних для карти з островами епох
export const mapData = {
    // Загальні налаштування карти
    canvasSize: { width: 1600, height: 900 },

    // Опис кожної епохи (острова)
    epochs: [
        {
            id: 1,
            name: 'Античність',
            color: '#c94a45', // Червоний колір
            position: { x: 50, y: 50 },
            cells: []
        },
        {
            id: 2,
            name: 'Середньовіччя',
            color: '#e6c86e', // Жовтий
            position: { x: 500, y: 100 },
            cells: []
        },
        {
            id: 3,
            name: 'Індустріальна епоха',
            color: '#7ea4d4', // Синій
            position: { x: 950, y: 150 },
            cells: []
        },
        {
            id: 4,
            name: 'Сучасність',
            color: '#a34c56', // Темно-червоний
            position: { x: 150, y: 450 },
            cells: []
        },
        {
            id: 5,
            name: 'Майбутнє',
            color: '#84b56d', // Зелений
            position: { x: 650, y: 500 },
            cells: []
        }
    ],

    // Масив усіх клітинок для зручності доступу
    allCells: []
};

// Генерація координат для кожної епохи
function generateEpochCells() {
    let cellCounter = 1;

    // Епоха 1: Античність (клітинки 1-25) - звивистий шлях
    const ancientEpoch = mapData.epochs.find(e => e.id === 1);
    const ancientPath = [
        { x: 50, y: 250 }, { x: 120, y: 280 }, { x: 200, y: 260 }, { x: 250, y: 200 }, { x: 210, y: 130 },
        { x: 140, y: 100 }, { x: 60, y: 120 }, { x: 40, y: 50 }, { x: 100, y: 30 }, { x: 180, y: 60 },
        { x: 220, y: 120 }, { x: 180, y: 180 }, { x: 120, y: 200 }, { x: 80, y: 160 }, { x: 100, y: 220 },
        { x: 160, y: 240 }, { x: 200, y: 280 }, { x: 240, y: 320 }, { x: 280, y: 280 }, { x: 320, y: 240 },
        { x: 300, y: 180 }, { x: 260, y: 140 }, { x: 220, y: 100 }, { x: 180, y: 80 }, { x: 140, y: 120 }
    ];
    
    ancientPath.forEach(pos => {
        ancientEpoch.cells.push({ id: cellCounter++, x: pos.x, y: pos.y });
    });

    // Епоха 2: Середньовіччя (клітинки 26-50) - спіральний шлях
    const medievalEpoch = mapData.epochs.find(e => e.id === 2);
    const medievalPath = [
        { x: 50, y: 200 }, { x: 100, y: 180 }, { x: 150, y: 160 }, { x: 200, y: 180 }, { x: 250, y: 200 },
        { x: 280, y: 250 }, { x: 250, y: 300 }, { x: 200, y: 320 }, { x: 150, y: 300 }, { x: 100, y: 280 },
        { x: 80, y: 230 }, { x: 120, y: 200 }, { x: 160, y: 220 }, { x: 200, y: 240 }, { x: 180, y: 280 },
        { x: 140, y: 300 }, { x: 100, y: 320 }, { x: 60, y: 300 }, { x: 40, y: 250 }, { x: 70, y: 200 },
        { x: 110, y: 180 }, { x: 150, y: 200 }, { x: 190, y: 220 }, { x: 220, y: 260 }, { x: 200, y: 300 }
    ];
    
    medievalPath.forEach(pos => {
        medievalEpoch.cells.push({ id: cellCounter++, x: pos.x, y: pos.y });
    });

    // Епоха 3: Індустріальна епоха (клітинки 51-75) - прямокутний шлях
    const industrialEpoch = mapData.epochs.find(e => e.id === 3);
    const industrialPath = [
        { x: 50, y: 150 }, { x: 100, y: 150 }, { x: 150, y: 150 }, { x: 200, y: 150 }, { x: 250, y: 150 },
        { x: 250, y: 200 }, { x: 200, y: 200 }, { x: 150, y: 200 }, { x: 100, y: 200 }, { x: 50, y: 200 },
        { x: 50, y: 250 }, { x: 100, y: 250 }, { x: 150, y: 250 }, { x: 200, y: 250 }, { x: 250, y: 250 },
        { x: 250, y: 300 }, { x: 200, y: 300 }, { x: 150, y: 300 }, { x: 100, y: 300 }, { x: 50, y: 300 },
        { x: 50, y: 350 }, { x: 100, y: 350 }, { x: 150, y: 350 }, { x: 200, y: 350 }, { x: 250, y: 350 }
    ];
    
    industrialPath.forEach(pos => {
        industrialEpoch.cells.push({ id: cellCounter++, x: pos.x, y: pos.y });
    });

    // Епоха 4: Сучасність (клітинки 76-100) - змійковий шлях
    const modernEpoch = mapData.epochs.find(e => e.id === 4);
    const modernPath = [
        { x: 50, y: 200 }, { x: 100, y: 200 }, { x: 150, y: 200 }, { x: 200, y: 200 }, { x: 250, y: 200 },
        { x: 250, y: 150 }, { x: 200, y: 150 }, { x: 150, y: 150 }, { x: 100, y: 150 }, { x: 50, y: 150 },
        { x: 50, y: 100 }, { x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }, { x: 250, y: 100 },
        { x: 250, y: 50 }, { x: 200, y: 50 }, { x: 150, y: 50 }, { x: 100, y: 50 }, { x: 50, y: 50 },
        { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 150, y: 0 }, { x: 200, y: 0 }, { x: 250, y: 0 }
    ];
    
    modernPath.forEach(pos => {
        modernEpoch.cells.push({ id: cellCounter++, x: pos.x, y: pos.y });
    });

    // Епоха 5: Майбутнє (клітинки 101-125) - круговий шлях
    const futureEpoch = mapData.epochs.find(e => e.id === 5);
    const futurePath = [];
    
    // Генеруємо круговий шлях
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    
    for (let i = 0; i < 25; i++) {
        const angle = (i / 25) * 2 * Math.PI;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        futurePath.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    futurePath.forEach(pos => {
        futureEpoch.cells.push({ id: cellCounter++, x: pos.x, y: pos.y });
    });

    // Заповнюємо масив усіх клітинок
    mapData.allCells = [];
    mapData.epochs.forEach(epoch => {
        epoch.cells.forEach(cell => {
            mapData.allCells.push({
                ...cell,
                epochId: epoch.id,
                absoluteX: epoch.position.x + cell.x,
                absoluteY: epoch.position.y + cell.y
            });
        });
    });
}

// Ініціалізуємо координати
generateEpochCells();

// Експортуємо дані
export default mapData;
