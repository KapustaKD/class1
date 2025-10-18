// Тестовий скрипт для Render
console.log('🧪 Тестовий скрипт запущено');

// Перевіряємо, чи всі необхідні елементи завантажені
function testGameElements() {
    console.log('🔍 Тестуємо елементи гри...');
    
    const elements = {
        modeSelection: document.getElementById('mode-selection'),
        localBtn: document.getElementById('local-mode-btn'),
        onlineBtn: document.getElementById('online-mode-btn'),
        gameContainer: document.getElementById('game-container'),
        onlinePanel: document.getElementById('online-panel')
    };
    
    console.log('📋 Знайдені елементи:', elements);
    
    // Перевіряємо window.game
    console.log('🎮 window.game:', window.game);
    console.log('🎮 window.gameUI:', window.gameUI);
    
    if (window.game) {
        console.log('✅ window.game існує');
        console.log('🔍 Методи:', {
            startLocalMode: typeof window.game.startLocalMode,
            startOnlineMode: typeof window.game.startOnlineMode
        });
    } else {
        console.error('❌ window.game не існує!');
    }
    
    return elements;
}

// Запускаємо тест через 2 секунди після завантаження
setTimeout(testGameElements, 2000);

// Додаємо глобальну функцію для ручного тестування
window.testGame = testGameElements;
