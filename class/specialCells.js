// Єдине джерело правди про події на клітинках
const specialCells = {
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
    7: { type: 'amphitheater', name: 'Амфітеатр' }, // Епоха Античності
    15: { type: 'tavern', name: 'Шинок' }, // Епоха Середньовіччя
    34: { type: 'tavern', name: 'Шинок' }, // Епоха Середньовіччя
    67: { type: 'casino', name: 'Казино' }, // Новий час
    93: { type: 'casino', name: 'Казино' }, // Новий час

    // Реінкарнація (рання смерть і миттєве переродження)
    6: { type: 'early-reincarnation', targetEpoch: 2, points: 50 },
    18: { type: 'early-reincarnation', targetEpoch: 3, points: 60 },
    30: { type: 'early-reincarnation', targetEpoch: 4, points: 70 },
    63: { type: 'early-reincarnation', targetEpoch: 5, points: 80 },
    85: { type: 'early-reincarnation', targetEpoch: 6, points: 90 },

    // Обхідні шляхи
    // Ціни за епохами: 1 - 20 ОО, 2 - 12 ОО, 3 - 24 ОО, 4 - 40 ОО, 5 - 40 ОО
    5: { type: 'alternative-path', target: 11, cost: 20, description: 'Обхідний шлях до клітинки 11 за 20 ОО' }, // Епоха 1
    46: { type: 'alternative-path', target: 57, cost: 40, description: 'Обхідний шлях до клітинки 57 за 40 ОО' }, // Епоха 4

    // Реінкарнація
    12: { type: 'reincarnation', nextEpoch: 2, points: 30 },
    22: { type: 'reincarnation', nextEpoch: 3, points: 40 },
    43: { type: 'reincarnation', nextEpoch: 4, points: 50 },
    75: { type: 'reincarnation', nextEpoch: 5, points: 60 },
    97: { type: 'reincarnation', nextEpoch: 6, points: 70 },

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

    // Кінець гри
    100: { type: 'machine-uprising' }
};

// Експорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = specialCells;
}

// Експорт для браузера
if (typeof window !== 'undefined') {
    window.specialCells = specialCells;
}

