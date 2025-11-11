// Конфігурація Cloudinary для аудіофайлів
// Замініть CLOUD_NAME на ваш cloud name з Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'c-3567b94634d50598886be75248fe3a', // Замініть на ваш cloud name з Cloudinary Dashboard
    baseUrl: 'https://res.cloudinary.com',
    audioFolder: 'video/upload' // Cloudinary використовує video/upload для аудіо та відео
};

// Функція для генерації URL аудіофайлу з Cloudinary
// Cloudinary автоматично визначає формат, тому можна не вказувати розширення
function getCloudinaryAudioUrl(publicId, format = 'm4a') {
    // Якщо publicId вже містить розширення, використовуємо його
    // Якщо ні, додаємо формат
    const hasExtension = publicId.includes('.');
    const finalPublicId = hasExtension ? publicId : `${publicId}.${format}`;
    return `${CLOUDINARY_CONFIG.baseUrl}/${CLOUDINARY_CONFIG.cloudName}/${CLOUDINARY_CONFIG.audioFolder}/${finalPublicId}`;
}

// Мапінг публічних ID файлів в Cloudinary
// Замініть public IDs на реальні ID ваших файлів з Cloudinary
const CLOUDINARY_AUDIO_TRACKS = {
    'main_fon': { 
        publicId: 'main_fon', // Замініть на реальний public ID
        format: 'm4a',
        name: 'main_fon'
    },
    'pl1': { 
        publicId: 'pl1', // Замініть на реальний public ID
        format: 'm4a',
        name: 'pl1'
    },
    'pl2': { 
        publicId: 'pl2', // Замініть на реальний public ID
        format: 'm4a',
        name: 'Політ салафонової цеглини, обмотаної мраморною ганчіркою, через морквяний акваріум з дикими качками.'
    },
    'pl3': { 
        publicId: 'pl3', // Замініть на реальний public ID
        format: 'm4a',
        name: 'Приємний лоскіт ніжок кукурудзи'
    },
    'pl4': { 
        publicId: 'pl4', // Замініть на реальний public ID
        format: 'm4a',
        name: 'pl4'
    },
    'pl5': { 
        publicId: 'pl5', // Замініть на реальний public ID
        format: 'm4a',
        name: 'Рататуй, що через каналізацію щаблукав на вулиці Токіо'
    },
    'pl6': { 
        publicId: 'pl6', // Замініть на реальний public ID
        format: 'm4a',
        name: 'pl6'
    },
    'rumbling_fon_2': { 
        publicId: 'rumbling_fon_2', // Замініть на реальний public ID
        format: 'mp3',
        name: 'rumbling_fon_2'
    }
};

// Функція для отримання URL треку
function getTrackUrl(trackKey) {
    const track = CLOUDINARY_AUDIO_TRACKS[trackKey];
    if (!track) {
        console.warn(`Трек ${trackKey} не знайдено в конфігурації Cloudinary`);
        return null;
    }
    return getCloudinaryAudioUrl(track.publicId, track.format);
}

// Експорт для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CLOUDINARY_CONFIG,
        CLOUDINARY_AUDIO_TRACKS,
        getCloudinaryAudioUrl,
        getTrackUrl
    };
}

// Експорт для браузера
if (typeof window !== 'undefined') {
    window.cloudinaryConfig = {
        CLOUDINARY_CONFIG,
        CLOUDINARY_AUDIO_TRACKS,
        getCloudinaryAudioUrl,
        getTrackUrl
    };
}

