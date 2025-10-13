// mapData.js - ФІНАЛЬНА ВЕРСІЯ КАРТИ (з покращеними формами та відстанями)

/**
 * Допоміжна функція для розрахунку точки на кривій Безьє.
 * Вона створює плавні, природні криві для шляху.
 */
function getBezierPoint(t, p0, p1, p2, p3) {
    const cX = 3 * (p1.x - p0.x);
    const bX = 3 * (p2.x - p1.x) - cX;
    const aX = p3.x - p0.x - cX - bX;

    const cY = 3 * (p1.y - p0.y);
    const bY = 3 * (p2.y - p1.y) - cY;
    const aY = p3.y - p0.y - cY - bY;

    const x = aX * t * t * t + bX * t * t + cX * t + p0.x;
    const y = aY * t * t * t + bY * t * t + cY * t + p0.y;

    return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Основна функція для генерації шляху з 101 клітинки.
 * Шлях будується на основі серії плавних кривих, що з'єднують опорні точки.
 * Координати "розтягнуті" для збільшення відстані між клітинками.
 */
function generateCells() {
    const cells = [];
    
    const segments = [
        // Сегмент 1: Сірі Землі (20 клітинок)
        { p0: { x: 150, y: 800 }, c1: { x: 350, y: 950 }, c2: { x: 550, y: 750 }, p3: { x: 800, y: 850 }, numCells: 20 },
        // Сегмент 2: Рожева Долина (20 клітинок)
        { p0: { x: 800, y: 850 }, c1: { x: 1000, y: 980 }, c2: { x: 1100, y: 750 }, p3: { x: 1350, y: 800 }, numCells: 20 },
        // Сегмент 3: Зелений Ліс (20 клітинок)
        { p0: { x: 1350, y: 800 }, c1: { x: 1550, y: 950 }, c2: { x: 1750, y: 800 }, p3: { x: 1650, y: 550 }, numCells: 20 },
        // Сегмент 4: Синя Ріка (20 клітинок)
        { p0: { x: 1650, y: 550 }, c1: { x: 1500, y: 300 }, c2: { x: 1100, y: 350 }, p3: { x: 950, y: 250 }, numCells: 20 },
        // Сегмент 5: Жовті Пустелі (21 клітинка)
        { p0: { x: 950, y: 250 }, c1: { x: 750, y: 100 }, c2: { x: 400, y: 200 }, p3: { x: 200, y: 150 }, numCells: 21 },
    ];

    let cellId = 1;
    for (const segment of segments) {
        for (let i = 0; i < segment.numCells; i++) {
            if (cellId > 101) break;
            // Використовуємо (segment.numCells) замість (segment.numCells - 1) для трохи більшого відступу в кінці
            const t = i / (segment.numCells);
            const point = getBezierPoint(t, segment.p0, segment.c1, segment.c2, segment.p3);
            cells.push({ id: cellId++, x: point.x, y: point.y });
        }
    }
    return cells;
}


export const mapData = {
    canvasSize: { width: 1920, height: 1080 },
  
    // Оновлені форми зон для кращої відповідності ескізу
    zones: [
      { 
        name: 'Сірі Землі', 
        color: '#b3b3b3',
        svgPath: 'M 0 1080 L 0 550 C 300 600, 500 750, 850 700 L 950 800 L 700 1080 Z' 
      },
      { 
        name: 'Рожева Долина', 
        color: '#ffb3d1',
        svgPath: 'M 950 800 L 850 700 C 1050 650, 1200 800, 1400 750 L 1500 900 L 1200 1080 L 700 1080 Z' 
      },
      { 
        name: 'Зелений Ліс', 
        color: '#33cc33',
        svgPath: 'M 1500 900 L 1400 750 C 1550 700, 1750 850, 1920 750 L 1920 1080 L 1200 1080 Z' 
      },
      { 
        name: 'Синя Ріка', 
        color: '#3399ff',
        svgPath: 'M 1920 750 C 1750 850, 1550 700, 1400 750 C 1200 800, 1050 650, 850 700 C 700 750, 850 450, 1000 350 L 1920 0 Z'
      },
      { 
        name: 'Жовті Пустелі', 
        color: '#ffff4d',
        svgPath: 'M 0 0 L 1000 350 C 850 450, 700 750, 850 700 C 500 750, 300 600, 0 550 Z' 
      }
    ],
  
    // Масив з усіма 101 клітинками, згенерований вздовж плавного шляху.
    cells: generateCells()
};
  
export default mapData;
