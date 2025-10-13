// mapData.js - Нова версія
// Цей файл описує одну велику карту з 5 зонами та 101 клітинкою.

export const mapData = {
    // Розмір всієї ігрової області
    canvasSize: { width: 1920, height: 1080 },
  
    // Опис 5 кольорових зон, які заповнюють всю карту.
    // 'svgPath' - це інструкція для малювання складної форми, як кордону країни.
    zones: [
      { 
        name: 'Сірі Землі', 
        color: 'rgba(179, 179, 179, 0.7)', // Сірий
        svgPath: 'M 0 1080 L 0 500 Q 300 550, 650 700 L 700 1080 Z' 
      },
      { 
        name: 'Рожева Долина', 
        color: 'rgba(255, 179, 209, 0.7)', // Рожевий
        svgPath: 'M 700 1080 L 650 700 Q 850 650, 1100 750 L 1200 1080 Z' 
      },
      { 
        name: 'Зелений Ліс', 
        color: 'rgba(51, 204, 51, 0.7)', // Зелений
        svgPath: 'M 1200 1080 L 1100 750 Q 1400 700, 1600 600 L 1920 800 L 1920 1080 Z' 
      },
      { 
        name: 'Синя Ріка', 
        color: 'rgba(51, 153, 255, 0.7)', // Синій
        svgPath: 'M 1920 800 L 1600 600 Q 1200 400, 800 300 L 900 0 L 1920 0 Z'
      },
      { 
        name: 'Жовті Пустелі', 
        color: 'rgba(255, 255, 77, 0.7)', // Жовтий
        svgPath: 'M 900 0 L 800 300 Q 400 350, 0 500 L 0 0 Z' 
      }
    ],
  
    // Масив з усіма 101 клітинками, згенерований вздовж плавного шляху.
    cells: generateCells()
  };
  
  // Функція для генерації шляху з 101 клітинки
  function generateCells() {
    const cells = [];
    const numCells = 101;
    const pathPoints = [ // Опорні точки для побудови шляху
      { x: 100,  y: 950 },  // Старт в Сірих Землях
      { x: 650,  y: 800 },  // Перехід в Рожеву Долину
      { x: 1150, y: 900 },  // Перехід в Зелений Ліс
      { x: 1600, y: 400 },  // Підйом в Синю Ріку
      { x: 1000, y: 200 },  // Перехід в Жовті Пустелі
      { x: 200,  y: 150 }   // Фініш
    ];
  
    let cellIndex = 1;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const startPoint = pathPoints[i];
      const endPoint = pathPoints[i+1];
      
      // Визначаємо, скільки клітинок буде на цьому відрізку шляху
      const cellsOnSegment = (i === pathPoints.length - 2) ? (numCells - cellIndex + 1) : Math.floor(numCells / (pathPoints.length - 1));
  
      for (let j = 0; j < cellsOnSegment; j++) {
        if (cellIndex > numCells) break;
  
        const t = j / cellsOnSegment;
        // Інтерполяція для створення плавного шляху
        const x = startPoint.x + (endPoint.x - startPoint.x) * t;
        const y = startPoint.y + (endPoint.y - startPoint.y) * t;
  
        // Додаємо трохи "шуму", щоб шлях не був ідеально прямим
        const noiseX = (Math.random() - 0.5) * 50;
        const noiseY = (Math.random() - 0.5) * 80;
        
        cells.push({
          id: cellIndex++,
          x: Math.floor(x + noiseX),
          y: Math.floor(y + noiseY)
        });
      }
    }
  
    return cells;
  }
  
  // Експортуємо готові дані
  export default mapData;
