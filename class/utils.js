// Допоміжні функції
class GameUtils {
    static generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    static formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    static sanitizeInput(input) {
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    static validatePlayerName(name) {
        return name.length >= 2 && name.length <= 20 && /^[a-zA-Zа-яА-ЯіІїЇєЄ0-9\s]+$/.test(name);
    }
    
    static validateRoomName(name) {
        return name.length >= 3 && name.length <= 30 && /^[a-zA-Zа-яА-ЯіІїЇєЄ0-9\s]+$/.test(name);
    }
    
    static getRandomColor() {
        const colors = ['#e53e3e', '#38b2ac', '#ed8936', '#d69e2e', '#9f7aea', '#f56565'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    static copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Скопійовано в буфер обміну!', 'success');
        }).catch(() => {
            this.showNotification('Не вдалося скопіювати', 'error');
        });
    }
    
    static formatPoints(points) {
        return points.toLocaleString('uk-UA');
    }
    
    static getPlayerRank(points) {
        if (points >= 300) return '🏆 Переможець';
        if (points >= 250) return '🥇 Майстер';
        if (points >= 200) return '🥈 Експерт';
        if (points >= 150) return '🥉 Досвідчений';
        if (points >= 100) return '⭐ Розумний';
        if (points >= 50) return '📚 Учень';
        return '🌱 Початківець';
    }
    
    static calculateDistance(pos1, pos2) {
        return Math.abs(pos1 - pos2);
    }
    
    static getCellTypeDescription(type) {
        const descriptions = {
            'quest': 'Квест - виконайте завдання для отримання очок',
            'pvp-quest': 'PvP Квест - змагайтеся з іншими гравцями',
            'creative-quest': 'Творчий квест - створіть щось креативне',
            'event-good': 'Позитивна подія - отримайте бонуси',
            'event-bad': 'Негативна подія - можливі штрафи',
            'reincarnation': 'Реінкарнація - перехід до наступної епохи',
            'machine-uprising': 'Повстання машин - автоматична поразка',
            'portal': 'Портал - швидкий перехід за плату',
            'alternative-path': 'Обхідний шлях - альтернативний маршрут',
            'empty': 'Звичайна клітинка - без особливих ефектів'
        };
        return descriptions[type] || 'Невідомий тип клітинки';
    }
}

// Експорт для використання в інших файлах
window.GameUtils = GameUtils;
