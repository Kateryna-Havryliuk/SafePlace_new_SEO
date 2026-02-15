// Функціонал аналітики
class AnalyticsApp {
    constructor() {
        this.API_BASE = 'http://127.0.0.1:5000/api';
        this.charts = {};
        this.init();
    }

    init() {
        this.loadElements();
        this.bindEvents();
        this.loadAnalytics();
        console.log('Analytics app initialized');
    }

    loadElements() {
        this.elements = {
            loginPrompt: document.getElementById('loginPrompt'),
            analyticsContent: document.getElementById('analyticsContent'),
            totalUsers: document.getElementById('totalUsers'),
            totalMessages: document.getElementById('totalMessages'),
            criticalMessages: document.getElementById('criticalMessages'),
            weeklyActivity: document.getElementById('weeklyActivity'),
            globalStats: document.getElementById('globalStats'),
            userInsights: document.getElementById('userInsights'),
            userActivity: document.getElementById('userActivity'),
            recommendations: document.getElementById('recommendations')
        };
    }

    bindEvents() {
        // Перемикання теми для сторінки аналітики
        const analyticsThemeToggle = document.getElementById('analyticsThemeToggle');
        if (analyticsThemeToggle) {
            analyticsThemeToggle.addEventListener('click', () => toggleTheme());
        }

        // Слухач змін теми для оновлення графіків
        window.addEventListener('themeChanged', (e) => {
            this.updateChartsTheme(e.detail.theme);
        });
    }

    async loadAnalytics() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (!token || !user) {
            this.showLoginPrompt();
            return;
        }
        
        this.hideLoginPrompt();
        
        try {
            // Завантаження глобальної аналітики
            await this.loadGlobalAnalytics();
            
            // Завантаження аналітики користувача
            await this.loadUserAnalytics();
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Помилка завантаження аналітики');
        }
    }

    async loadGlobalAnalytics() {
        try {
            const response = await fetch(`${this.API_BASE}/analytics/global`);
            const globalData = await response.json();
            
            if (globalData.success) {
                this.updateGlobalStats(globalData);
                this.updateCharts(globalData.emotional_patterns);
            }
        } catch (error) {
            console.error('Error loading global analytics:', error);
        }
    }

    async loadUserAnalytics() {
        try {
            const userData = await this.apiRequest('/analytics/user');
            
            if (userData.success) {
                this.updateUserInsights(userData.insights);
            }

            // Завантаження розширеної аналітики
            const advancedData = await this.apiRequest('/analytics/advanced?days=30');
            if (advancedData.success) {
                this.updateAdvancedAnalytics(advancedData);
            }
        } catch (error) {
            console.error('Error loading user analytics:', error);
        }
    }

    updateGlobalStats(globalData) {
        this.elements.totalUsers.textContent = globalData.total_users;
        this.elements.totalMessages.textContent = globalData.total_messages;
        this.elements.criticalMessages.textContent = globalData.critical_messages;
        this.elements.weeklyActivity.textContent = globalData.weekly_activity;
        
        this.elements.globalStats.innerHTML = `
            <p>Всього користувачів: <strong>${globalData.total_users}</strong></p>
            <p>Всього повідомлень: <strong>${globalData.total_messages}</strong></p>
            <p>Критичних ситуацій: <strong>${globalData.critical_messages}</strong></p>
            <p>Активність за тиждень: <strong>${globalData.weekly_activity}</strong></p>
            <p>Проаналізовано чатів: <strong>${globalData.total_chats}</strong></p>
        `;
    }

    updateUserInsights(insights) {
        this.elements.userInsights.innerHTML = `
            <div class="insight-item">
                <strong>Активність:</strong>
                <p>Повідомлень: ${insights.message_count || 0}</p>
                <p>Критичних: ${insights.critical_messages || 0}</p>
                <p>Середня тональність: ${insights.avg_sentiment || 0}</p>
            </div>
            <div class="insight-item">
                <strong>Основні теми:</strong>
                <p>${(insights.top_categories || ['Ще не визначено']).join(', ')}</p>
            </div>
            <div class="insight-item">
                <strong>Тенденції:</strong>
                <p>Стан: ${this.getTrendText(insights.severity_trend)}</p>
                <p>Настрій: ${this.getTrendText(insights.sentiment_trend)}</p>
            </div>
        `;
        
        // Активність користувача
        if (insights.daily_activity && Object.keys(insights.daily_activity).length > 0) {
            this.elements.userActivity.innerHTML = `
                <p>Активність за останні 7 днів:</p>
                <ul>
                    ${Object.entries(insights.daily_activity).map(([date, count]) => 
                        `<li>${this.formatDate(date)}: ${count} повід.</li>`
                    ).join('')}
                </ul>
            `;
        } else {
            this.elements.userActivity.innerHTML = '<p>Ще немає даних про активність</p>';
        }
        
        // Рекомендації
        if (insights.recommendations && insights.recommendations.length > 0) {
            this.elements.recommendations.innerHTML = 
                insights.recommendations.map(rec => 
                    `<div class="insight-item">💡 ${rec}</div>`
                ).join('');
        } else {
            this.elements.recommendations.innerHTML = 
                '<div class="insight-item">Продовжуйте використовувати сервіс для отримання персоналізованих рекомендацій</div>';
        }
    }

    updateAdvancedAnalytics(advancedData) {
        // Можна додати детальніші графіки та візуалізації тут
        console.log('Advanced analytics:', advancedData);
        
        // Оновлення додаткових елементів UI розширеними даними
        if (advancedData.summary) {
            this.updateSummaryCards(advancedData.summary);
        }
    }

    updateSummaryCards(summary) {
        // Створення додаткових карток зведення, якщо потрібно
        const summaryHTML = `
            <div class="data-grid">
                <div class="data-item">
                    <div class="data-label">Загальна активність</div>
                    <div class="data-value">${summary.total_messages}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Рівень залученості</div>
                    <div class="data-value">${summary.engagement_rate}%</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Критичні повідомлення</div>
                    <div class="data-value">${summary.critical_messages}</div>
                </div>
            </div>
        `;
        
        // Додавання до відповідного контейнера або створення нового
        const existingSummary = document.getElementById('advancedSummary');
        if (existingSummary) {
            existingSummary.innerHTML = summaryHTML;
        }
    }

    updateCharts(patterns) {
        this.createTopicsChart(patterns);
        this.createSentimentChart(patterns);
    }

    createTopicsChart(patterns) {
        const ctx = document.getElementById('topicsChart').getContext('2d');
        
        if (this.charts.topicsChart) {
            this.charts.topicsChart.destroy();
        }

        if (patterns.top_categories) {
            const labels = Object.keys(patterns.top_categories);
            const data = Object.values(patterns.top_categories);
            const isDark = getCurrentTheme() === 'dark';
            
            this.charts.topicsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Кількість звернень',
                        data: data,
                        backgroundColor: [
                            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
                            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Найпопулярніші теми',
                            color: isDark ? '#f1f5f9' : '#1a365d',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            labels: {
                                color: isDark ? '#f1f5f9' : '#1a365d'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: isDark ? '#94a3b8' : '#718096'
                            },
                            grid: {
                                color: isDark ? '#334155' : '#e2e8f0'
                            }
                        },
                        x: {
                            ticks: {
                                color: isDark ? '#94a3b8' : '#718096'
                            },
                            grid: {
                                color: isDark ? '#334155' : '#e2e8f0'
                            }
                        }
                    }
                }
            });
        }
    }

    createSentimentChart(patterns) {
        const ctx = document.getElementById('sentimentChart').getContext('2d');
        
        if (this.charts.sentimentChart) {
            this.charts.sentimentChart.destroy();
        }

        if (patterns.avg_sentiment) {
            const labels = Object.keys(patterns.avg_sentiment);
            const data = Object.values(patterns.avg_sentiment);
            const isDark = getCurrentTheme() === 'dark';
            
            this.charts.sentimentChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Середня тональність',
                        data: data,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            min: -1,
                            max: 1,
                            ticks: {
                                color: isDark ? '#94a3b8' : '#718096'
                            },
                            grid: {
                                color: isDark ? '#334155' : '#e2e8f0'
                            }
                        },
                        x: {
                            ticks: {
                                color: isDark ? '#94a3b8' : '#718096'
                            },
                            grid: {
                                color: isDark ? '#334155' : '#e2e8f0'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Тональність по категоріям',
                            color: isDark ? '#f1f5f9' : '#1a365d',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            labels: {
                                color: isDark ? '#f1f5f9' : '#1a365d'
                            }
                        }
                    }
                }
            });
        }
    }

    updateChartsTheme(theme) {
        const isDark = theme === 'dark';
        
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                // Оновлення кольорів графіків відповідно до теми
                chart.options.plugins.title.color = isDark ? '#f1f5f9' : '#1a365d';
                chart.options.plugins.legend.labels.color = isDark ? '#f1f5f9' : '#1a365d';
                
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.ticks) scale.ticks.color = isDark ? '#94a3b8' : '#718096';
                        if (scale.grid) scale.grid.color = isDark ? '#334155' : '#e2e8f0';
                    });
                }
                
                chart.update('none');
            }
        });
    }

    showLoginPrompt() {
        this.elements.loginPrompt.style.display = 'block';
        this.elements.analyticsContent.style.display = 'none';
    }

    hideLoginPrompt() {
        this.elements.loginPrompt.style.display = 'none';
        this.elements.analyticsContent.style.display = 'block';
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
        
        errorDiv.style.cssText = `
            background: var(--warn);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        `;
        
        this.elements.analyticsContent.insertBefore(errorDiv, this.elements.analyticsContent.firstChild);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Утилітні методи
    getTrendText(trend) {
        const trends = {
            'improving': '✅ Покращення',
            'worsening': '⚠️ Погіршення', 
            'stable': '➡️ Стабільно',
            'unknown': '📊 Не визначено'
        };
        return trends[trend] || trends['unknown'];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA');
    }

    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                ...defaultOptions,
                ...options
            });
            
            if (response.status === 401) {
                this.showLoginPrompt();
                return { success: false, message: 'Необхідно авторизуватися' };
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Помилка з\'єднання з сервером' };
        }
    }
}

// Ініціалізація аналітики при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsApp = new AnalyticsApp();
});

// Додавання перемикача теми на сторінку аналітики, якщо відсутній
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    if (header) {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'analytics-theme-toggle';
        themeToggle.title = 'Перемкнути тему';
        themeToggle.innerHTML = `
            <i class="fas fa-sun"></i>
            <i class="fas fa-moon"></i>
        `;
        themeToggle.addEventListener('click', () => toggleTheme());
        header.style.position = 'relative';
        header.appendChild(themeToggle);
    }
});

// Обробка кнопок входу та реєстрації на головній сторінці
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    // Перевіряємо, чи ми на головній сторінці (index.html)
    if (loginBtn && registerBtn) {
        // Функція для відкриття модального вікна входу
        function openLoginModal() {
            // Тимчасове рішення - перенаправлення на сторінку акаунту
            window.location.href = 'account.html';
        }
        
        // Функція для відкриття модального вікна реєстрації
        function openRegisterModal() {
            // Тимчасове рішення - перенаправлення на сторінку акаунту
            window.location.href = 'account.html';
        }
        
        // Додаємо обробники подій для кнопок
        loginBtn.addEventListener('click', openLoginModal);
        registerBtn.addEventListener('click', openRegisterModal);
        
        console.log('Auth buttons initialized on main page');
    }
});

// Базова функція для відкриття модального вікна авторизації
function openAuthModal(type = 'login') {
    // Тимчасове рішення - перенаправлення на сторінку акаунту
    window.location.href = 'account.html';
}

// Функція для перевірки стану авторизації
function checkAuthState() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        // Користувач авторизований
        updateUIForLoggedInUser(JSON.parse(user));
        return true;
    } else {
        // Користувач не авторизований
        updateUIForLoggedOutUser();
        return false;
    }
}

// Оновлення UI для авторизованого користувача
function updateUIForLoggedInUser(user) {
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        const userName = user.name || 'Користувач';
        const userInitial = userName.charAt(0).toUpperCase();
        const userAvatar = user.avatar || null;
        
        authButtons.innerHTML = `
            <div class="user-menu">
                <div class="user-avatar ${userAvatar ? 'has-photo' : ''}" onclick="window.location.href='account.html'">
                    ${userAvatar ? `<img src="${userAvatar}" alt="${userName}" />` : userInitial}
                </div>
                <button class="user-name-btn" onclick="window.location.href='account.html'">
                    <i class="fas fa-user"></i>
                    <span>${userName}</span>
                </button>
                <button class="btn-logout" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Вийти</span>
                </button>
            </div>
            <button class="theme-toggle" id="themeToggle" title="Перемкнути тему">
                <i class="fas fa-sun"></i>
                <i class="fas fa-moon"></i>
            </button>
        `;
        
        // Ре-ініціалізуємо перемикач теми
        initializeThemeToggle();
    }
}

// Оновлення UI для неавторизованого користувача
function updateUIForLoggedOutUser() {
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        // Залишаємо стандартні кнопки, які вже є в HTML
        console.log('User is logged out - showing default auth buttons');
    }
}

// Функція виходу
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.reload();
}

// Перевірка стану авторизації при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
});

// Додайте цю функцію до auth.js
function initializeAuthOnAllPages() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        try {
            const userData = JSON.parse(user);
            updateUIForLoggedInUser(userData);
            
            // Специфічні дії для сторінки акаунту
            if (window.location.pathname.includes('account.html')) {
                initializeAccountPage(userData);
            }
            
            // Специфічні дії для сторінки аналітики
            if (window.location.pathname.includes('analytics.html')) {
                if (window.analyticsApp) {
                    window.analyticsApp.loadAnalytics();
                }
            }
            
        } catch (e) {
            console.error('Помилка ініціалізації авторизації:', e);
            logout();
        }
    } else {
        updateUIForLoggedOutUser();
    }
}

// Покращена функція авторизації
// Покращена функція авторизації
async function handleLogin(email, password) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Зберігаємо токен та дані користувача
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Оновлюємо UI на всіх сторінках
            updateAuthUI(result.user);
            
            console.log('Успішний вхід:', result.user);
            return { success: true, user: result.user };
        } else {
            return { success: false, error: result.message };
        }
    } catch (error) {
        console.error('Помилка входу:', error);
        return { success: false, error: 'Помилка з\'єднання з сервером' };
    }
}

// Універсальна функція оновлення UI
function updateAuthUI(userData) {
    const authButtons = document.getElementById('authButtons');
    
    if (!authButtons) return;
    
    if (userData) {
        // Авторизований користувач
        const userName = userData.name || 'Користувач';
        const userInitial = userName.charAt(0).toUpperCase();
        
        authButtons.innerHTML = `
            <div class="user-menu">
                <a href="account.html" class="user-avatar-link">
                    <div class="user-avatar">${userInitial}</div>
                </a>
                <a href="account.html" class="user-name-btn">
                    <i class="fas fa-user"></i>
                    <span>${userName}</span>
                </a>
                <button class="btn-logout" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Вийти</span>
                </button>
            </div>
            <button class="theme-toggle" id="themeToggle" title="Перемкнути тему">
                <i class="fas fa-sun"></i>
                <i class="fas fa-moon"></i>
            </button>
        `;
        
        // Ре-ініціалізація перемикача теми
        initializeThemeToggle(document.getElementById('themeToggle'));
    } else {
        // Неавторизований користувач
        authButtons.innerHTML = `
            <button class="btn-login" id="loginBtn">Увійти</button>
            <button class="btn-register" id="registerBtn">Реєстрація</button>
            <button class="theme-toggle" id="themeToggle" title="Перемкнути тему">
                <i class="fas fa-sun"></i>
                <i class="fas fa-moon"></i>
            </button>
        `;
        
        // Ре-ініціалізація кнопок
        initializeAuthButtons();
        initializeThemeToggle(document.getElementById('themeToggle'));
    }
}

// Функція виходу
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    
    // Оновлюємо UI
    updateAuthUI(null);
    
    // Перезавантажуємо сторінку
    window.location.reload();
}

// Перевірка статусу авторизації
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    
    console.log('Перевірка авторизації:', { token, userStr });
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            updateAuthUI(user);
            return true;
        } catch (e) {
            console.error('Помилка парсингу користувача:', e);
            logout();
            return false;
        }
    } else {
        updateAuthUI(null);
        return false;
    }
}

// Ініціалізація кнопок авторизації
function initializeAuthButtons() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                // Активуємо вкладку реєстрації
                switchToRegisterTab();
            }
        });
    }
}

// Функції для перемикання вкладок (для модального вікна)
function switchToLoginTab() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (authTabs && loginForm && registerForm && modalTitle) {
        authTabs.forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="login"]').classList.add('active');
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        modalTitle.textContent = 'Увійти в акаунт';
    }
}

function switchToRegisterTab() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (authTabs && loginForm && registerForm && modalTitle) {
        authTabs.forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="register"]').classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        modalTitle.textContent = 'Створити акаунт';
    }
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація авторизації...');
    checkAuthStatus();
    initializeAuthButtons();
});

// Слухач змін в localStorage для синхронізації між вкладками
window.addEventListener('storage', function(e) {
    if (e.key === 'authToken' || e.key === 'currentUser') {
        checkAuthStatus();
    }
});


// Додайте ці функції в кінець auth.js

// Ініціалізація модального вікна
function initializeAuthModal() {
    const authModal = document.getElementById('authModal');
    const modalClose = document.getElementById('modalClose');
    const authTabs = document.querySelectorAll('.auth-tab');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    
    if (!authModal) {
        console.error('Модальне вікно не знайдено!');
        return;
    }

    // Закриття модального вікна
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            authModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    // Закриття по кліку на оверлей
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

    // Перемикання вкладок
    if (authTabs.length > 0) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                
                authTabs.forEach(t => t.classList.remove('active'));
                document.getElementById('loginForm').classList.remove('active');
                document.getElementById('registerForm').classList.remove('active');
                
                tab.classList.add('active');
                
                if (tabId === 'login') {
                    document.getElementById('loginForm').classList.add('active');
                    document.getElementById('modalTitle').textContent = 'Увійти в акаунт';
                } else {
                    document.getElementById('registerForm').classList.add('active');
                    document.getElementById('modalTitle').textContent = 'Створити акаунт';
                }
            });
        });
    }

    // Перемикання на реєстрацію
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchToRegisterTab();
        });
    }

    // Перемикання на вхід
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLoginTab();
        });
    }

    // Обробка форми входу
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLoginForm();
        });
    }

    // Обробка форми реєстрації
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleRegisterForm();
        });
    }
}

// Обробка форми входу
async function handleLoginForm() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');
    
    if (!email || !password) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Вхід...';
    submitBtn.disabled = true;

    try {
        const result = await handleLogin(email, password);
        
        if (result.success) {
            // Закриваємо модальне вікно
            document.getElementById('authModal').classList.remove('active');
            document.body.style.overflow = 'auto';
            
            alert('Вхід успішний!');
        } else {
            alert(result.error || 'Помилка входу');
        }
    } catch (error) {
        alert('Помилка з\'єднання з сервером');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Обробка форми реєстрації
async function handleRegisterForm() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirm').value;
    const submitBtn = document.getElementById('registerSubmitBtn');
    
    // Валідація
    if (!name || !email || !password || !confirmPassword) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Паролі не співпадають');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль повинен містити щонайменше 6 символів');
        return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Реєстрація...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Реєстрація успішна! Тепер ви можете увійти в систему.');
            switchToLoginTab();
            // Очищаємо форму
            document.getElementById('registerForm').reset();
        } else {
            alert(result.message || 'Помилка реєстрації');
        }
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        alert('Помилка з\'єднання з сервером');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Оновіть функцію initializeAuthButtons
function initializeAuthButtons() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                switchToLoginTab();
            } else {
                console.error('Модальне вікно не знайдено!');
            }
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                switchToRegisterTab();
            } else {
                console.error('Модальне вікно не знайдено!');
            }
        });
    }
}

// Оновіть ініціалізацію
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація авторизації...');
    checkAuthStatus();
    initializeAuthButtons();
    initializeAuthModal(); // Додаємо ініціалізацію модального вікна
});
