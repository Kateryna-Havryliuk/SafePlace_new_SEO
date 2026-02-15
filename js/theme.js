// ============================================
// 🎨 ОРИГІНАЛЬНИЙ THEME MANAGER З ПОКРАЩЕННЯМИ
// ============================================

// 1. НЕГАЙНЕ ЗАСТОСУВАННЯ ТЕМИ (в <head>)
(function earlyThemeFix() {
    // Це має бути ПЕРШИМ в <head>
    const isAnalytics = window.location.pathname.includes('analytics') || 
                       document.title.includes('Аналітика');
    

        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', theme);

    
    // Запобігаємо бліманню
    document.documentElement.style.visibility = 'hidden';
})();

// 2. ОСНОВНИЙ КЛАС THEMEMANAGER (ТОЧНО ЯК БУЛО)
class ThemeManager {
    constructor() {
        // ВИПРАВЛЕННЯ: Завантажуємо тему НЕГАЙНО при створенні об'єкта
        this.currentTheme = this.getSavedTheme();
        
        // ВИПРАВЛЕННЯ: Застосовуємо тему ДО завантаження DOM
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        this.init();
        const saved = localStorage.getItem('theme');
        if (saved) this.applyTheme(saved);   // ставимо збережену
        else this.applyTheme('light');       // або світлу за замовч.
    }

    init() {
        // Тема вже застосована, тільки додаємо слухачі
        this.setupEventListeners();
        this.watchSystemTheme();
        this.updateThemeButtons();
        console.log('🎨 ThemeManager initialized:', this.currentTheme);
        
        // Додаємо кнопку на сторінки де треба
        this.addUniversalButtonIfNeeded();
    }



    getSavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        return savedTheme;
    }

    applyTheme(theme) {
        // ВИПРАВЛЕННЯ: Застосовуємо тему синхронно
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        this.updateThemeButtons();
        this.dispatchThemeChangeEvent();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    updateThemeButtons() {
        const themeToggles = document.querySelectorAll('.theme-toggle, .mobile-theme-toggle');
        
        themeToggles.forEach(toggle => {
            const sunIcon = toggle.querySelector('.fa-sun');
            const moonIcon = toggle.querySelector('.fa-moon');
            
            
            if (sunIcon && moonIcon) {
                // Додаємо плавні переходи
                sunIcon.style.transition = 'opacity 0.3s ease';
                moonIcon.style.transition = 'opacity 0.3s ease';
                
                if (this.currentTheme === 'dark') {
                    sunIcon.style.opacity = '0';
                    moonIcon.style.opacity = '1';
                } else {
                    sunIcon.style.opacity = '1';
                    moonIcon.style.opacity = '0';
                }
            }
        });
    }

    setupEventListeners() {
        // Глобальний перемикач теми
        document.addEventListener('click', (e) => {            
            if (e.target.closest('.theme-toggle') || e.target.closest('.mobile-theme-toggle')) {
                this.toggleTheme();
            }
        });

        // Слухач змін теми між вкладками
        window.addEventListener('storage', (e) => {
            if (e.key === 'theme') {
            }
        });
    }

    watchSystemTheme() {
        // Відстеження змін системної теми
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Автоматичне перемикання тільки якщо користувач не вибрав тему вручну
                if (!localStorage.getItem('theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    saveTheme() {
        localStorage.setItem('theme', this.currentTheme);
    }

    dispatchThemeChangeEvent() {
        const event = new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        });
        window.dispatchEvent(event);
    }

    // Додаткові утиліти
    isDark() {
        return this.currentTheme === 'dark';
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    setTheme(theme) {
        
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        }
    }
    
    // ДОДАНО: Додати універсальну кнопку на сторінки без кнопок
    addUniversalButtonIfNeeded() {
        
        // Перевіряємо чи вже є кнопки
        const existingButtons = document.querySelectorAll('.theme-toggle, .mobile-theme-toggle');
        if (existingButtons.length > 0) return;
        
        // Створюємо кнопку
        const button = document.createElement('button');
        button.className = 'theme-toggle universal-theme-btn';
        button.innerHTML = '<i class="fas fa-sun"></i><i class="fas fa-moon"></i>';
        button.title = 'Перемкнути тему';
        button.setAttribute('aria-label', 'Перемкнути тему');
        
        // Стилі
        Object.assign(button.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '9999',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--theme-btn-bg, #4a90e2)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
        });
        
        // Стилі для іконок
        const style = document.createElement('style');
        style.textContent = `
            .universal-theme-btn .fa-sun,
            .universal-theme-btn .fa-moon {
                position: absolute;
                transition: opacity 0.3s ease;
            }
            
            [data-theme="light"] .universal-theme-btn .fa-sun { opacity: 1; }
            [data-theme="light"] .universal-theme-btn .fa-moon { opacity: 0; }
            [data-theme="dark"] .universal-theme-btn .fa-sun { opacity: 0; }
            [data-theme="dark"] .universal-theme-btn .fa-moon { opacity: 1; }
            
            .universal-theme-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
        `;
        document.head.appendChild(style);
        
        // Додаємо в документ
        document.body.appendChild(button);
        
        // Оновлюємо кнопки
        this.updateThemeButtons();
        
        console.log('➕ Added universal theme button');
    }
}

// ===== 3. ГЛОБАЛЬНІ ФУНКЦІЇ (ВІДНОВЛЕНО ПОВНІСТЮ) =====

// Утиліти для інших скриптів
window.getCurrentTheme = function() {
    // ВИПРАВЛЕННЯ: Повертаємо світлу для аналітики
    if (window.location.pathname.includes('analytics')) {
        return 'light';
    }
    return window.themeManager?.getCurrentTheme() || 'light';
};

window.setTheme = function(theme) {
    // ВИПРАВЛЕННЯ: Блокуємо для аналітики
    if (!window.location.pathname.includes('analytics')) {
        window.themeManager?.setTheme(theme);
    }
};

window.toggleTheme = function() {
    // ВИПРАВЛЕННЯ: Блокуємо для аналітики
    if (!window.location.pathname.includes('analytics')) {
        window.themeManager?.toggleTheme();
    }
};

// Універсальна функція для ініціалізації перемикача теми
function initializeThemeToggle(button) {
    if (!button) return;
    
    // ВИПРАВЛЕННЯ: Блокуємо для аналітики
    if (window.location.pathname.includes('analytics')) {
        button.style.display = 'none';
        return;
    }
    
    button.addEventListener('click', function() {
        window.toggleTheme();
    });
    
    // Оновлення вигляду кнопки
    function updateThemeButton() {
        const currentTheme = window.getCurrentTheme();
        const sunIcon = button.querySelector('.fa-sun');
        const moonIcon = button.querySelector('.fa-moon');
        
        if (sunIcon && moonIcon) {
            sunIcon.style.transition = 'opacity 0.3s ease';
            moonIcon.style.transition = 'opacity 0.3s ease';
            
            if (currentTheme === 'dark') {
                sunIcon.style.opacity = '0';
                moonIcon.style.opacity = '1';
            } else {
                sunIcon.style.opacity = '1';
                moonIcon.style.opacity = '0';
            }
        }
    }
    
    // Слухач змін теми
    window.addEventListener('themeChanged', updateThemeButton);
    
    // Початкове оновлення
    updateThemeButton();
}

// Ініціалізація всіх перемикачів теми на сторінці
function initializeAllThemeToggles() {
    // 🔧 Ігноруємо стару кнопку в хедері
    const themeToggles = document.querySelectorAll('.theme-toggle:not(#themeToggle), .mobile-theme-toggle');
    themeToggles.forEach(toggle => {
        if (!toggle.classList.contains('universal-theme-btn')) {
            initializeThemeToggle(toggle);
        }
    });
}

// Автоматична ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', function() {
    // ВИПРАВЛЕННЯ: Примусово світла тема для аналітики
    if (window.location.pathname.includes('analytics')) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
    
    // Ініціалізація менеджера тем
    if (!window.themeManager) {
        window.themeManager = new ThemeManager();
    }
    
    // Ініціалізація всіх кнопок
    initializeAllThemeToggles();
    
    // Показуємо сторінку
    setTimeout(() => {
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.documentElement.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 300);
    }, 50);
    
    console.log('✅ Theme system fully loaded');
});

// Для сторінок, які можуть завантажитися пізніше
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // ВИПРАВЛЕННЯ: Примусово світла тема для аналітики
    if (window.location.pathname.includes('analytics')) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
    
    if (!window.themeManager) {
        window.themeManager = new ThemeManager();
    }
    initializeAllThemeToggles();
    
    // Показуємо сторінку
    setTimeout(() => {
        document.documentElement.style.visibility = 'visible';
    }, 50);
}

// ===== 4. ДОДАТКОВІ ФІКСИ =====

// Фікс для того, щоб сторінка не залишалася прихованою
window.addEventListener('load', function() {
    setTimeout(() => {
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
    }, 100);
});

// Глобальний об'єкт для зручності (додано)
window.theme = {
    toggle: function() {
        window.toggleTheme();
    },
    set: function(theme) {
        window.setTheme(theme);
    },
    get: function() {
        return window.getCurrentTheme();
    },
    isDark: function() {
        return window.themeManager?.isDark() || false;
    }
};

// Стилі для плавних переходів (додано)
(function addTransitionStyles() {
    const styles = `
        /* Плавні переходи для всіх елементів */
        html:not([data-theme]) *,
        html[data-theme] * {
            transition: background-color 0.3s ease,
                        color 0.3s ease,
                        border-color 0.3s ease,
                        fill 0.3s ease,
                        stroke 0.3s ease !important;
        }
        
        /* Виняток для кнопки теми */
        .theme-toggle *,
        .universal-theme-btn * {
            transition: opacity 0.3s ease !important;
        }
        
        /* Запобігання FOUC */
        html[style*="visibility: hidden"] {
            visibility: visible !important;
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
})();

console.log('🎨 Theme Manager loaded (original version restored)');

