// analytics.js - додайте на початку
function checkAuth() {
    // Тут перевіряйте, чи користувач авторизований
    // Наприклад, перевіряйте localStorage чи cookies
    const isAuthenticated = localStorage.getItem('userLoggedIn') === 'true' 
                          || localStorage.getItem('authToken');
    
    const loginPrompt = document.getElementById('loginPrompt');
    const analyticsContent = document.getElementById('analyticsContent');
    
    if (isAuthenticated) {
        // Показати контент аналітики
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (analyticsContent) analyticsContent.style.display = 'block';
        loadAnalyticsData(); // Функція для завантаження даних
    } else {
        // Показати запит на вхід
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (analyticsContent) analyticsContent.style.display = 'none';
    }
}

// Викликати при завантаженні
document.addEventListener('DOMContentLoaded', checkAuth);




// Analytics functionality
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
        // Theme toggle for analytics page
        const analyticsThemeToggle = document.getElementById('analyticsThemeToggle');
        if (analyticsThemeToggle) {
            analyticsThemeToggle.addEventListener('click', () => toggleTheme());
        }

        // Listen for theme changes to update charts
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
            // Load global analytics
            await this.loadGlobalAnalytics();
            
            // Load user analytics
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

            // Load advanced analytics
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
        
        // User activity
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
        
        // Recommendations
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
        // Could add more detailed charts and visualizations here
        console.log('Advanced analytics:', advancedData);
        
        // Update any additional UI elements with advanced data
        if (advancedData.summary) {
            this.updateSummaryCards(advancedData.summary);
        }
    }

    updateSummaryCards(summary) {
        // Create additional summary cards if needed
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
        
        // Add to an appropriate container or create one
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
                // Update chart colors based on theme
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

    // Utility methods
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

// Initialize analytics app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsApp = new AnalyticsApp();
});

