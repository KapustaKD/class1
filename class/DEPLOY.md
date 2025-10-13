# Швидкий деплой на Render.com

## Крок 1: Підготовка
1. Створіть репозиторій на GitHub
2. Завантажте всі файли проекту
3. Зробіть commit та push

## Крок 2: Render.com
1. Зайдіть на https://render.com
2. Натисніть "New +" → "Web Service"
3. Підключіть ваш GitHub репозиторій

## Крок 3: Налаштування
- **Name**: educational-path-game
- **Environment**: Node
- **Build Command**: npm install
- **Start Command**: npm start
- **Environment Variables**:
  - NODE_ENV = production
  - PORT = 3000

## Крок 4: Деплой
1. Натисніть "Create Web Service"
2. Дочекайтеся завершення збірки (5-10 хвилин)
3. Отримайте URL вашого сайту

## ✅ Готово!
Ваша гра тепер доступна онлайн з мультиплеєр функціональністю!
