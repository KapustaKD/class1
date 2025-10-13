// mapData.js - ФІНАЛЬНА ВЕРСІЯ КАРТИ

/**
 * Допоміжна функція для розрахунку точки на кривій Безьє.
 * Це дозволяє створювати плавні, природні криві для шляху.
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
 * Шлях тепер будується на основі серії плавних кривих, що з'єднують опорні точки.
 */
function generateCells() {
    const cells = [];
    
    // Опис шляху як послідовності кривих сегментів
    const segments = [
        // Сегмент 1: Сірі Землі (20 клітинок)
        { p0: { x: 150, y: 850 }, c1: { x: 300, y: 950 }, c2: { x: 500, y: 800 }, p3: { x: 700, y: 880 }, numCells: 20 },
        // Сегмент 2: Рожева Долина (20 клітинок)
        { p0: { x: 700, y: 880 }, c1: { x: 900, y: 980 }, c2: { x: 1000, y: 800 }, p3: { x: 1250, y: 850 }, numCells: 20 },
        // Сегмент 3: Зелений Ліс (20 клітинок)
        { p0: { x: 1250, y: 850 }, c1: { x: 1400, y: 950 }, c2: { x: 1600, y: 800 }, p3: { x: 1550, y: 600 }, numCells: 20 },
        // Сегмент 4: Синя Ріка (20 клітинок)
        { p0: { x: 1550, y: 600 }, c1: { x: 1500, y: 400 }, c2: { x: 1100, y: 450 }, p3: { x: 1000, y: 300 }, numCells: 20 },
        // Сегмент 5: Жовті Пустелі (21 клітинка, щоб разом було 101)
        { p0: { x: 1000, y: 300 }, c1: { x: 800, y: 150 }, c2: { x: 400, y: 250 }, p3: { x: 200, y: 200 }, numCells: 21 },
    ];

    let cellId = 1;
    for (const segment of segments) {
        for (let i = 0; i < segment.numCells; i++) {
            if (cellId > 101) break;
            const t = i / (segment.numCells - 1);
            const point = getBezierPoint(t, segment.p0, segment.c1, segment.c2, segment.p3);
            cells.push({ id: cellId++, x: point.x, y: point.y });
        }
    }
    return cells;
}


export const mapData = {
    canvasSize: { width: 1920, height: 1080 },
  
    // Опис 5 кольорових зон, створених на основі вашого ескізу
    zones: [
      { 
        name: 'Сірі Землі', 
        color: '#b3b3b3',
        svgPath: 'M 0 1080 L 0 500 C 250 550, 450 700, 800 650 L 950 800 L 600 1080 Z' 
      },
      { 
        name: 'Рожева Долина', 
        color: '#ffb3d1',
        svgPath: 'M 950 800 L 800 650 C 1000 600, 1150 750, 1350 700 L 1450 950 L 1100 1080 L 950 1080 Z' 
      },
      { 
        name: 'Зелений Ліс', 
        color: '#33cc33',
        svgPath: 'M 1450 950 L 1350 700 C 1500 650, 1700 800, 1920 700 L 1920 1080 L 1100 1080 Z' 
      },
      { 
        name: 'Синя Ріка', 
        color: '#3399ff',
        svgPath: 'M 1920 700 C 1700 800, 1500 650, 1350 700 C 1150 750, 1000 600, 800 650 C 700 700, 900 400, 1050 300 L 1920 0 Z'
      },
      { 
        name: 'Жовті Пустелі', 
        color: '#ffff4d',
        svgPath: 'M 0 0 L 1050 300 C 900 400, 700 700, 800 650 C 450 700, 250 550, 0 500 Z' 
      }
    ],
  
    // Масив з усіма 101 клітинками, згенерований вздовж плавного шляху.
    cells: generateCells()
};
  
export default mapData;
