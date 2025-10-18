// Дані про спеціальні клітинки для сервера
module.exports = {
    // Нові міні-ігри на клітинках: 3, 10, 14, 21, 32, 40, 55, 61, 69, 81, 90, 96, 99
    3: { type: 'pvp-quest' },
    10: { type: 'creative-quest' },
    14: { type: 'mad-libs-quest' },
    21: { type: 'pvp-quest' },
    32: { type: 'webnovella-quest' },
    40: { type: 'creative-quest' },
    55: { type: 'pvp-quest' },
    61: { type: 'mad-libs-quest' },
    69: { type: 'creative-quest' },
    81: { type: 'webnovella-quest' },
    90: { type: 'pvp-quest' },
    96: { type: 'mad-libs-quest' },
    99: { type: 'webnovella-quest' },

    // Обхідні шляхи: 5→11, 14→18, 26→33, 46→57, 80→91
    5: { type: 'alternative-path', target: 11, cost: 10, description: 'Обхідний шлях до клітинки 11 за 10 ОО' },
    14: { type: 'alternative-path', target: 18, cost: 8, description: 'Обхідний шлях до клітинки 18 за 8 ОО' },
    26: { type: 'alternative-path', target: 33, cost: 12, description: 'Обхідний шлях до клітинки 33 за 12 ОО' },
    46: { type: 'alternative-path', target: 57, cost: 15, description: 'Обхідний шлях до клітинки 57 за 15 ОО' },
    80: { type: 'alternative-path', target: 91, cost: 18, description: 'Обхідний шлях до клітинки 91 за 18 ОО' },

    // Реінкарнація та випадкова зміна класу: 12, 22, 43, 75, 97
    12: { type: 'reincarnation', nextEpoch: 2, points: 30 },
    22: { type: 'reincarnation', nextEpoch: 3, points: 40 },
    43: { type: 'reincarnation', nextEpoch: 4, points: 50 },
    75: { type: 'reincarnation', nextEpoch: 5, points: 60 },
    97: { type: 'reincarnation', nextEpoch: 6, points: 70 },

    // Портали: 7→25, 15→35, 28→45, 50→65, 85→95
    7: { type: 'portal', target: 25, cost: 5, description: 'Портал до клітинки 25 за 5 ОО' },
    15: { type: 'portal', target: 35, cost: 8, description: 'Портал до клітинки 35 за 8 ОО' },
    28: { type: 'portal', target: 45, cost: 10, description: 'Портал до клітинки 45 за 10 ОО' },
    50: { type: 'portal', target: 65, cost: 12, description: 'Портал до клітинки 65 за 12 ОО' },
    85: { type: 'portal', target: 95, cost: 15, description: 'Портал до клітинки 95 за 15 ОО' },

    // Події з ефектами
    8: { type: 'event-good', effect: 'bonus_points', points: 20, description: 'Бонусні очки!' },
    16: { type: 'event-good', effect: 'bonus_points', points: 25, description: 'Бонусні очки!' },
    24: { type: 'event-good', effect: 'bonus_points', points: 30, description: 'Бонусні очки!' },
    36: { type: 'event-good', effect: 'bonus_points', points: 35, description: 'Бонусні очки!' },
    48: { type: 'event-good', effect: 'bonus_points', points: 40, description: 'Бонусні очки!' },
    64: { type: 'event-good', effect: 'bonus_points', points: 45, description: 'Бонусні очки!' },
    76: { type: 'event-good', effect: 'bonus_points', points: 50, description: 'Бонусні очки!' },
    88: { type: 'event-good', effect: 'bonus_points', points: 55, description: 'Бонусні очки!' },

    // Негативні події
    9: { type: 'event-bad', effect: 'lose_points', points: -15, description: 'Втрата очок!' },
    17: { type: 'event-bad', effect: 'lose_points', points: -20, description: 'Втрата очок!' },
    25: { type: 'event-bad', effect: 'lose_points', points: -25, description: 'Втрата очок!' },
    37: { type: 'event-bad', effect: 'lose_points', points: -30, description: 'Втрата очок!' },
    49: { type: 'event-bad', effect: 'lose_points', points: -35, description: 'Втрата очок!' },
    65: { type: 'event-bad', effect: 'lose_points', points: -40, description: 'Втрата очок!' },
    77: { type: 'event-bad', effect: 'lose_points', points: -45, description: 'Втрата очок!' },
    89: { type: 'event-bad', effect: 'lose_points', points: -50, description: 'Втрата очок!' },

    // Машинне повстання
    100: { type: 'machine-uprising', effect: 'special_event', description: 'Машинне повстання!' },

    // Майбутнє
    101: { type: 'future', effect: 'victory', description: 'Досягнення майбутнього!' }
};
