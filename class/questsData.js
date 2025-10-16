const pvpGames = {
    'genius': {
        name: 'Я у мами геній',
        description: 'Вам необхідно за 30 секунд згадати та написати якомога більше прізвищ видатних українських або зарубіжних педагогів.',
        timer: 30,
        type: 'text_input'
    },
    'megabrain': {
        name: 'Мегамозок',
        description: 'Вам необхідно за 30 секунд згадати та написати якомога більше принципів педагогіки.',
        timer: 30,
        type: 'text_input'
    },
    'pedagogobot': {
        name: 'Педагобот',
        description: 'Вам необхідно за 30 секунд згадати та написати якомога більше якостей гарного педагога.',
        timer: 30,
        type: 'text_input'
    }
};

const creativeGames = {
    'chronicles': {
        name: 'Хроніки Неіснуючого Вояжу',
        description: 'Вам необхідно вигадати цікаву історію...',
        rules: 'Спільне написання історії по реченню. Кожен гравець додає одне речення по черзі. Останній, хто залишився, перемагає.',
        timer: 15,
        type: 'collaborative_story'
    },
    'great_pedagogical': {
        name: 'Великий Педагогічний…',
        description: 'Вам необхідно за 1 хвилину згадати або вигадати...',
        rules: 'Один гравець пише, інші голосують за найкращий варіант.',
        timer: 60,
        type: 'creative_writing'
    },
    'pedagog_mom': {
        name: 'Я у мами педагог',
        description: 'Вам необхідно за одну хвилину вигадати...',
        rules: 'Один гравець пише, інші голосують за найкращий варіант.',
        timer: 60,
        type: 'creative_writing'
    }
};

const madLibsQuestions = [
    "Хто?",
    "Де?", 
    "Коли?",
    "З ким?",
    "Що робив?"
];

const webNovella = {
    'start_event_1': {
        text: "Ви — класний керівник. Під час перевірки щоденників ви виявляєте, що один з учнів (Макар) на останній сторінці намалював вам величезний, але досить деталізований, портрет у формі єдинорога.",
        choices: [
            { text: "Викликати батьків до школи...", target: 'event_1_A' },
            { text: "Поставити під портретом свій підпис...", target: 'event_1_B' }
        ]
    },
    'event_1_A': {
        text: "Батьки знітилися... його креативність пригасла. КІНЕЦЬ.",
        points: 10,
        choices: []
    },
    'event_1_B': {
        text: "Макар сяє від щастя... УВАГА: Ви створили прецедент. Далі буде…",
        consequence: 'consequence_1_B'
    },
    'consequence_1_B': {
        text: "Клас починає масово приносити розмальовані щоденники...",
        choices: [
            { text: "Оголосити конкурс...", target: 'event_1_B1' },
            { text: "Проігнорувати скарги...", target: 'event_1_B2' }
        ]
    },
    'event_1_B1': {
        text: "Конкурс малюнків в щоденниках стає щомісячним! Учні розвивають креативність. Перемога!",
        points: 50,
        choices: []
    },
    'event_1_B2': {
        text: "Директор дізнається про хаос в класі. Вас переводять на інший предмет. КІНЕЦЬ.",
        points: -20,
        choices: []
    }
};

// Експорт для Node.js (сервер)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { pvpGames, creativeGames, madLibsQuestions, webNovella };
}

// Експорт для браузера
if (typeof window !== 'undefined') {
    window.questsData = { pvpGames, creativeGames, madLibsQuestions, webNovella };
}
