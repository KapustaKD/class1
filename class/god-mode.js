// Режим Бога - інструмент для налаштування UI
class GodMode {
    constructor() {
        this.isActive = false;
        this.settings = {
            modalSize: { width: '600px', height: 'auto' },
            imageBrightness: 1.0,
            textColor: '#ffffff',
            windowPositions: {},
            elementStyles: {}
        };
        this.init();
    }
    
    init() {
        // Додаємо кнопку для активації режиму бога
        this.createGodModeButton();
        // Завантажуємо збережені налаштування
        this.loadSettings();
    }
    
    createGodModeButton() {
        const button = document.createElement('button');
        button.id = 'god-mode-btn';
        button.textContent = '👑 Режим Бога';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        button.addEventListener('click', () => this.toggle());
        document.body.appendChild(button);
    }
    
    toggle() {
        this.isActive = !this.isActive;
        const btn = document.getElementById('god-mode-btn');
        if (this.isActive) {
            btn.textContent = '👑 Режим Бога (Активний)';
            btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            this.activate();
        } else {
            btn.textContent = '👑 Режим Бога';
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            this.deactivate();
        }
    }
    
    activate() {
        // Додаємо можливість переміщення та зміни розміру модальних вікон
        this.makeModalsDraggable();
        this.makeModalsResizable();
        this.addStyleControls();
        console.log('👑 Режим Бога активовано!');
    }
    
    deactivate() {
        // Зберігаємо налаштування
        this.saveSettings();
        // Видаляємо обробники
        document.querySelectorAll('.god-mode-handle').forEach(el => el.remove());
        console.log('👑 Режим Бога деактивовано. Налаштування збережено.');
    }
    
    makeModalsDraggable() {
        document.querySelectorAll('#quest-modal, .glassmorphism-modal, .modal-content').forEach(modal => {
            if (modal.dataset.godModeEnabled) return;
            modal.dataset.godModeEnabled = 'true';
            
            // Додаємо ручку для переміщення
            const handle = document.createElement('div');
            handle.className = 'god-mode-handle';
            handle.textContent = '⋮⋮ Перемістити';
            handle.style.cssText = `
                position: absolute;
                top: 5px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(102, 126, 234, 0.9);
                color: white;
                padding: 5px 15px;
                border-radius: 5px;
                cursor: move;
                font-size: 12px;
                z-index: 10001;
                user-select: none;
            `;
            
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            
            handle.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = modal.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                modal.style.position = 'fixed';
                modal.style.margin = '0';
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                modal.style.left = (startLeft + deltaX) + 'px';
                modal.style.top = (startTop + deltaY) + 'px';
            });
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    this.logChange('window_position', {
                        element: modal.id || modal.className,
                        left: modal.style.left,
                        top: modal.style.top
                    });
                }
            });
            
            modal.style.position = 'relative';
            modal.appendChild(handle);
        });
    }
    
    makeModalsResizable() {
        document.querySelectorAll('#quest-modal-content, .glassmorphism-content, .modal-content').forEach(content => {
            if (content.dataset.resizable) return;
            content.dataset.resizable = 'true';
            
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'god-mode-resize-handle';
            resizeHandle.style.cssText = `
                position: absolute;
                bottom: 0;
                right: 0;
                width: 20px;
                height: 20px;
                background: rgba(102, 126, 234, 0.9);
                cursor: nwse-resize;
                z-index: 10001;
            `;
            
            let isResizing = false;
            let startX, startY, startWidth, startHeight;
            
            resizeHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = content.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                content.style.width = (startWidth + deltaX) + 'px';
                if (startHeight + deltaY > 100) {
                    content.style.height = (startHeight + deltaY) + 'px';
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    this.logChange('window_size', {
                        element: content.id || content.className,
                        width: content.style.width,
                        height: content.style.height
                    });
                }
            });
            
            content.style.position = 'relative';
            content.appendChild(resizeHandle);
        });
    }
    
    addStyleControls() {
        // Створюємо панель управління
        let panel = document.getElementById('god-mode-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'god-mode-panel';
            panel.style.cssText = `
                position: fixed;
                top: 60px;
                right: 10px;
                width: 300px;
                background: rgba(30, 30, 30, 0.95);
                border: 2px solid #667eea;
                border-radius: 10px;
                padding: 15px;
                z-index: 10000;
                color: white;
                max-height: 80vh;
                overflow-y: auto;
            `;
            
            panel.innerHTML = `
                <h3 style="margin-top: 0; color: #f5576c;">👑 Панель Бога</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Яскравість зображень:</label>
                    <input type="range" id="god-brightness" min="0" max="2" step="0.1" value="1.0" style="width: 100%;">
                    <span id="brightness-value">1.0</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Колір тексту:</label>
                    <input type="color" id="god-text-color" value="#ffffff" style="width: 100%; height: 40px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Розмір модальних вікон:</label>
                    <input type="range" id="god-modal-width" min="300" max="1200" step="10" value="600" style="width: 100%;">
                    <span>Ширина: <span id="width-value">600</span>px</span>
                </div>
                
                <button id="god-apply-all" style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                    Застосувати до всіх
                </button>
                
                <button id="god-export" style="width: 100%; padding: 10px; background: #f5576c; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                    📋 Експортувати налаштування
                </button>
            `;
            
            document.body.appendChild(panel);
            
            // Обробники
            const brightnessSlider = document.getElementById('god-brightness');
            const brightnessValue = document.getElementById('brightness-value');
            brightnessSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                brightnessValue.textContent = value.toFixed(1);
                this.applyBrightness(value);
            });
            
            const textColorInput = document.getElementById('god-text-color');
            textColorInput.addEventListener('input', (e) => {
                this.applyTextColor(e.target.value);
            });
            
            const modalWidthSlider = document.getElementById('god-modal-width');
            const widthValue = document.getElementById('width-value');
            modalWidthSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                widthValue.textContent = value;
                this.applyModalWidth(value);
            });
            
            document.getElementById('god-apply-all').addEventListener('click', () => {
                this.applyAllSettings();
            });
            
            document.getElementById('god-export').addEventListener('click', () => {
                this.exportSettings();
            });
        }
    }
    
    applyBrightness(value) {
        document.querySelectorAll('#quest-modal-content[style*="background-image"], .modal-content[style*="background-image"]').forEach(el => {
            el.style.filter = `brightness(${value})`;
        });
        this.settings.imageBrightness = value;
        this.logChange('image_brightness', value);
    }
    
    applyTextColor(color) {
        document.querySelectorAll('#quest-modal-content h3, #quest-modal-content p, #quest-modal-content div, .modal-content h3, .modal-content p').forEach(el => {
            el.style.color = color;
        });
        this.settings.textColor = color;
        this.logChange('text_color', color);
    }
    
    applyModalWidth(width) {
        document.querySelectorAll('#quest-modal, .glassmorphism-modal, .modal-content').forEach(modal => {
            modal.style.maxWidth = width + 'px';
            modal.style.width = width + 'px';
        });
        this.settings.modalSize.width = width + 'px';
        this.logChange('modal_width', width);
    }
    
    applyAllSettings() {
        this.applyBrightness(this.settings.imageBrightness);
        this.applyTextColor(this.settings.textColor);
        this.applyModalWidth(parseInt(this.settings.modalSize.width));
    }
    
    logChange(type, value) {
        const log = {
            timestamp: new Date().toISOString(),
            type: type,
            value: value
        };
        console.log('👑 GOD MODE CHANGE:', JSON.stringify(log, null, 2));
    }
    
    exportSettings() {
        const exportData = {
            timestamp: new Date().toISOString(),
            settings: this.settings,
            changes: this.getAllChanges()
        };
        
        const json = JSON.stringify(exportData, null, 2);
        console.log('👑 ЕКСПОРТ НАЛАШТУВАНЬ:\n' + json);
        
        // Копіюємо в буфер обміну
        navigator.clipboard.writeText(json).then(() => {
            alert('Налаштування скопійовано в буфер обміну та виведено в консоль!');
        });
    }
    
    getAllChanges() {
        // Збираємо всі зміни з DOM
        const changes = [];
        
        document.querySelectorAll('[style*="left"], [style*="top"], [style*="width"], [style*="height"]').forEach(el => {
            if (el.id || el.className.includes('modal') || el.className.includes('content')) {
                const style = window.getComputedStyle(el);
                changes.push({
                    element: el.id || el.className,
                    styles: {
                        left: el.style.left || style.left,
                        top: el.style.top || style.top,
                        width: el.style.width || style.width,
                        height: el.style.height || style.height,
                        maxWidth: el.style.maxWidth || style.maxWidth
                    }
                });
            }
        });
        
        return changes;
    }
    
    saveSettings() {
        localStorage.setItem('godModeSettings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('godModeSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.applyAllSettings();
        }
    }
}

// Ініціалізуємо режим бога
if (typeof window !== 'undefined') {
    window.godMode = new GodMode();
}

