# Використовуємо офіційний Node.js образ
FROM node:18-alpine

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо package.json та package-lock.json (якщо є)
COPY package*.json ./

# Встановлюємо залежності
RUN npm ci --only=production

# Копіюємо всі файли проекту
COPY . .

# Створюємо користувача для безпеки
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Змінюємо власника файлів
RUN chown -R nextjs:nodejs /app
USER nextjs

# Відкриваємо порт
EXPOSE 3000

# Встановлюємо змінні середовища
ENV NODE_ENV=production
ENV PORT=3000

# Команда запуску
CMD ["npm", "start"]
