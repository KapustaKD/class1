// Конфігурація Cloudinary для аудіофайлів
const CLOUDINARY_CONFIG = {
    cloudName: 'dwv7kufbc', // Cloud name з ваших посилань
    baseUrl: 'https://res.cloudinary.com',
    audioFolder: 'video/upload'
};

// Прямі посилання на файли з Cloudinary Collections
// Використовуємо прямі URL для надійності
const CLOUDINARY_AUDIO_TRACKS = {
    'main_fon': { 
        // Якщо main_fon також в Cloudinary, додайте його URL тут
        url: null, // Поки використовуємо локальний файл
        name: 'main_fon',
        useLocal: true // Використовувати локальний файл
    },
    'pl1': { 
        // Якщо pl1 є в Cloudinary, додайте його URL тут
        url: null,
        name: 'pl1',
        useLocal: true
    },
    'pl2': { 
        url: 'https://res.cloudinary.com/dwv7kufbc/video/upload/v1762878466/pl3_gnvj0j.mp4',
        name: 'Політ салафонової цеглини, обмотаної мраморною ганчіркою, через морквяний акваріум з дикими качками.',
        useLocal: false
    },
    'pl3': { 
        url: 'https://res.cloudinary.com/dwv7kufbc/video/upload/v1762878466/pl3_gnvj0j.mp4',
        name: 'Приємний лоскіт ніжок кукурудзи',
        useLocal: false
    },
    'pl4': { 
        url: 'https://res.cloudinary.com/dwv7kufbc/video/upload/v1762878466/pl3_gnvj0j.mp4',
        name: 'pl4',
        useLocal: false
    },
    'pl5': { 
        url: 'https://res.cloudinary.com/dwv7kufbc/video/upload/v1762878466/pl3_gnvj0j.mp4',
        name: 'Рататуй, що через каналізацію заблукав на вулиці Токіо',
        useLocal: false
    },
    'pl6': { 
        url: 'https://res.cloudinary.com/dwv7kufbc/video/upload/v1762878466/pl3_gnvj0j.mp4',
        name: 'pl6',
        useLocal: false
    },
    'rumbling_fon_2': { 
        // Якщо rumbling_fon_2 також в Cloudinary, додайте його URL тут
        url: null,
        name: 'rumbling_fon_2',
        useLocal: true // Використовувати локальний файл
    }
};

// Функція для отримання URL треку
function getTrackUrl(trackKey) {
    const track = CLOUDINARY_AUDIO_TRACKS[trackKey];
    if (!track) {
        console.warn(`Трек ${trackKey} не знайдено в конфігурації Cloudinary`);
        return null;
    }
    
    // Якщо є прямий URL і не використовуємо локальний файл
    if (track.url && !track.useLocal) {
        return track.url;
    }
    
    // Fallback на локальний файл
    return null;
}

// Експорт для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CLOUDINARY_CONFIG,
        CLOUDINARY_AUDIO_TRACKS,
        getTrackUrl
    };
}

// Експорт для браузера
if (typeof window !== 'undefined') {
    window.cloudinaryConfig = {
        CLOUDINARY_CONFIG,
        CLOUDINARY_AUDIO_TRACKS,
        getTrackUrl
    };
}

