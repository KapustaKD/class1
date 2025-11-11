# Налаштування Cloudinary для аудіофайлів

## Крок 1: Завантаження файлів в Cloudinary

1. Перейдіть на [Cloudinary Console](https://console.cloudinary.com/app/c-3567b94634d50598886be75248fe3a/assets/media_library/search?view_mode=mosaic)
2. Завантажте всі аудіофайли (pl1, pl2, pl3, pl4, pl5, main_fon, rumbling_fon_2)
3. Запам'ятайте **Public ID** кожного файлу (це ім'я файлу без розширення)

## Крок 2: Оновлення конфігурації

Відкрийте файл `cloudinary-config.js` та оновіть:

1. **Cloud Name**: Замініть `'c-3567b94634d50598886be75248fe3a'` на ваш реальний cloud name
   - Cloud name можна знайти в налаштуваннях Cloudinary або в URL файлів

2. **Public IDs**: Для кожного треку в `CLOUDINARY_AUDIO_TRACKS` замініть `publicId` на реальний Public ID з Cloudinary

Приклад:
```javascript
'pl1': { 
    publicId: 'ваш_реальний_public_id_pl1', // Замініть на реальний public ID
    format: 'm4a',
    name: 'pl1'
},
```

## Крок 3: Формат URL

Cloudinary автоматично генерує URL у форматі:
```
https://res.cloudinary.com/{cloud_name}/video/upload/{public_id}.{format}
```

Наприклад:
```
https://res.cloudinary.com/c-3567b94634d50598886be75248fe3a/video/upload/pl1.m4a
```

## Крок 4: Перевірка

1. Відкрийте консоль браузера (F12)
2. Перевірте, чи завантажуються файли з Cloudinary
3. Якщо є помилки, перевірте:
   - Правильність cloud name
   - Правильність public IDs
   - Доступність файлів в Cloudinary

## Fallback

Якщо Cloudinary недоступний або файли не завантажуються, система автоматично використовує локальні файли з папки `sound/fon/`.

## Додаткові налаштування

Якщо потрібно додати трансформації (наприклад, зміна якості), можна модифікувати функцію `getCloudinaryAudioUrl`:

```javascript
function getCloudinaryAudioUrl(publicId, format = 'm4a', transformations = '') {
    const transformStr = transformations ? `/${transformations}` : '';
    return `${CLOUDINARY_CONFIG.baseUrl}/${CLOUDINARY_CONFIG.cloudName}/${CLOUDINARY_CONFIG.audioFolder}${transformStr}/${publicId}.${format}`;
}
```

Приклад з трансформаціями:
```javascript
getCloudinaryAudioUrl('pl1', 'm4a', 'q_auto,f_auto') // Автоматична якість та формат
```

