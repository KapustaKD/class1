// Єдине джерело правди про події на клітинках
module.exports = {
    // Гра "Хто, де, коли?"
    3: { type: 'mad-libs', questName: 'Хто? Де? Коли?' },

    // Вебновели
    10: { type: 'webnovella', questName: 'Халепа!', eventNumber: 2 },
    90: { type: 'webnovella', questName: 'Халепа!', eventNumber: 3 },

    // PvP Квести
    21: { type: 'pvp-quest', gameType: 'megabrain', questName: 'Мегамозок' },
    55: { type: 'pvp-quest', gameType: 'tic_tac_toe', questName: 'Хреститися рано!' },
    61: { type: 'pvp-quest', gameType: 'genius', questName: 'Я у мами геній' },
    81: { type: 'pvp-quest', gameType: 'pedagogobot', questName: 'Педагобот' },
    99: { type: 'pvp-quest', gameType: 'rock_paper_scissors', questName: 'Ляпіс-форфіцес-папірус' },

    // Творчі квести
    40: { type: 'creative-quest', questName: 'Великий Педагогічний…' },
    69: { type: 'creative-quest', questName: 'Хроніки Неіснуючого Вояжу' },
    96: { type: 'creative-quest', questName: 'Я у мами педагог' },

    // Обхідні шляхи
    5: { type: 'alternative-path', target: 11, cost: 10, description: 'Обхідний шлях до клітинки 11 за 10 ОО' },
    46: { type: 'alternative-path', target: 57, cost: 25, description: 'Обхідний шлях до клітинки 57 за 25 ОО' },

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

