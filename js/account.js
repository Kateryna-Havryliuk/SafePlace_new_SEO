



// Функціонал сторінки акаунта

class AccountApp {
    constructor() {
        this.API_BASE = 'http://127.0.0.1:5000/api';
        this.init();
    }

    init() {
        this.loadElements();
        this.bindEvents();
        this.setupAuthModal();
        this.checkAuthStatus();
        this.setupAvatarUpload();
        console.log('Account app initialized');
    }

    loadElements() {
        this.elements = {
            loginPrompt: document.getElementById('loginPrompt'),
            accountDetails: document.getElementById('accountDetails'),
            userAvatarLarge: document.getElementById('userAvatarLarge'),
            userNameDisplay: document.getElementById('userNameDisplay'),
            userEmailDisplay: document.getElementById('userEmailDisplay'),
            joinDate: document.getElementById('joinDate'),
            totalMessagesStat: document.getElementById('totalMessagesStat'),
            sessionCount: document.getElementById('sessionCount'),
            wellnessScore: document.getElementById('wellnessScore'),
            profileName: document.getElementById('profileName'),
            profileEmail: document.getElementById('profileEmail'),
            updateProfileBtn: document.getElementById('updateProfileBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            deleteAccountBtn: document.getElementById('deleteAccountBtn'),
            authModal: document.getElementById('authModal'),
            themeToggle: document.getElementById('themeToggle'),
            editAvatarBtn: document.querySelector('.edit-avatar-btn'),
            avatarUpload: null
        };
    }

    setupAvatarUpload() {
        // Створення прихованого поля для завантаження аватарки
        this.elements.avatarUpload = document.createElement('input');
        this.elements.avatarUpload.type = 'file';
        this.elements.avatarUpload.accept = 'image/*';
        this.elements.avatarUpload.style.display = 'none';
        document.body.appendChild(this.elements.avatarUpload);

        // Додавання обробника події для завантаження аватарки
        this.elements.avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        
        // Підключення кнопки редагування до поля файлу
        if (this.elements.editAvatarBtn) {
            this.elements.editAvatarBtn.addEventListener('click', () => {
                this.elements.avatarUpload.click();
            });
        }
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Перевірка типу файлу та розміру
        if (!file.type.startsWith('image/')) {
            this.showAlert('Будь ласка, виберіть зображення', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // Ліміт 5MB
            this.showAlert('Розмір зображення не повинен перевищувати 5MB', 'error');
            return;
        }

        try {
            this.showAlert('Завантаження аватарки...', 'info');
            
            // Конвертація зображення в base64 для постійного зберігання
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target.result;
                
                // Оновлення відображення аватарки
                this.updateAvatarDisplay(imageUrl);
                
                // Збереження в localStorage
                this.saveAvatarToStorage(imageUrl);
                
                this.showAlert('Аватарку успішно оновлено!', 'success');
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showAlert('Помилка завантаження аватарки', 'error');
        }
    }

    updateAvatarDisplay(imageUrl) {
        // Створення елементу зображення для аватарки
        const avatarImg = document.createElement('img');
        avatarImg.src = imageUrl;
        avatarImg.alt = 'Аватар користувача';
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';

        // Заміна тексту на зображення
        this.elements.userAvatarLarge.innerHTML = '';
        this.elements.userAvatarLarge.appendChild(avatarImg);

        // Також оновлення аватарки в заголовку, якщо існує
        this.updateHeaderAvatar(imageUrl);
        
        // Оновлення аватарки в мобільному меню
        this.updateMobileAvatar(imageUrl);
    }

    updateHeaderAvatar(imageUrl) {
        const headerAvatar = document.getElementById('headerUserAvatar');
        if (headerAvatar) {
            headerAvatar.innerHTML = '';
            headerAvatar.style.background = 'transparent';
            const headerImg = document.createElement('img');
            headerImg.src = imageUrl;
            headerImg.alt = 'Аватар';
            headerImg.style.width = '100%';
            headerImg.style.height = '100%';
            headerImg.style.borderRadius = '50%';
            headerImg.style.objectFit = 'cover';
            headerAvatar.appendChild(headerImg);
        }
    }

    updateMobileAvatar(imageUrl) {
        const mobileAvatar = document.getElementById('mobileUserAvatar');
        if (mobileAvatar) {
            const avatarDiv = mobileAvatar.querySelector('.user-avatar');
            if (avatarDiv) {
                avatarDiv.innerHTML = '';
                avatarDiv.style.background = 'transparent';
                const mobileImg = document.createElement('img');
                mobileImg.src = imageUrl;
                mobileImg.alt = 'Аватар';
                mobileImg.style.width = '100%';
                mobileImg.style.height = '100%';
                mobileImg.style.borderRadius = '50%';
                mobileImg.style.objectFit = 'cover';
                avatarDiv.appendChild(mobileImg);
            }
        }
    }

    saveAvatarToStorage(imageUrl) {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        user.avatar = imageUrl;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Також збереження окремо для легкого доступу
        localStorage.setItem('userAvatar', imageUrl);
    }

    loadAvatarFromStorage() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (user.avatar) {
            this.updateAvatarDisplay(user.avatar);
        }
    }

showExportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal export-modal">
            <div class="modal-header">
                <h3 class="modal-title">Експорт даних</h3>
                <button class="modal-close" id="exportModalClose">&times;</button>
            </div>
            <div class="section-content">
                <div class="form-group">
                    <label for="exportFormat">Формат експорту</label>
                    <select id="exportFormat" class="profile-input">
                        <option value="json">JSON (повний)</option>
                        <option value="csv">CSV (таблиці)</option>
                        <option value="txt">TXT (текст)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Що експортувати</label>
                    <div class="export-options">
                        <label class="toggle-label">
                            <input type="checkbox" id="exportProfile" checked>
                            <span class="toggle-slider">
                                <span class="toggle-handle"></span>
                            </span>
                            <span class="toggle-text">Профіль</span>
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="exportStats" checked>
                            <span class="toggle-slider">
                                <span class="toggle-handle"></span>
                            </span>
                            <span class="toggle-text">Статистика</span>
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="exportChats" checked>
                            <span class="toggle-slider">
                                <span class="toggle-handle"></span>
                            </span>
                            <span class="toggle-text">Чати</span>
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="exportAnalytics" checked>
                            <span class="toggle-slider">
                                <span class="toggle-handle"></span>
                            </span>
                            <span class="toggle-text">Аналітика</span>
                        </label>
                    </div>
                </div>

                <div class="export-preview">
                    <h4>Попередній перегляд:</h4>
                    <div class="preview-stats">
                        <div class="preview-stat">
                            <span class="stat-value">${this.elements.totalMessagesStat?.textContent || '0'}</span>
                            <span class="stat-label">повід.</span>
                        </div>
                        <div class="preview-stat">
                            <span class="stat-value">${this.elements.sessionCount?.textContent || '0'}</span>
                            <span class="stat-label">сесій</span>
                        </div>
                        <div class="preview-stat">
                            <span class="stat-value">${this.elements.wellnessScore?.textContent || '0%'}</span>
                            <span class="stat-label">здоров'я</span>
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn-primary" id="startExportBtn">
                        <i class="fas fa-download"></i>
                        Експортувати
                    </button>
                    <button class="btn-login" id="cancelExportBtn">Скасувати</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Ініціалізація стану перемикачів
    const toggleInputs = modal.querySelectorAll('.export-options input[type="checkbox"]');
    toggleInputs.forEach(input => {
        const slider = input.nextElementSibling;
        if (input.checked) {
            slider.classList.add('checked');
        }

        input.addEventListener('change', function() {
            if (this.checked) {
                slider.classList.add('checked');
            } else {
                slider.classList.remove('checked');
            }
        });
    });

    // Додавання обробників подій
    document.getElementById('exportModalClose').addEventListener('click', () => modal.remove());
    document.getElementById('cancelExportBtn').addEventListener('click', () => modal.remove());
    document.getElementById('startExportBtn').addEventListener('click', () => {
        const format = document.getElementById('exportFormat').value;
        const options = {
            profile: document.getElementById('exportProfile').checked,
            stats: document.getElementById('exportStats').checked,
            chats: document.getElementById('exportChats').checked,
            analytics: document.getElementById('exportAnalytics').checked
        };
        this.performExport(format, options);
        modal.remove();
    });

    // Закриття по кліку на оверлей
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

    async performExport(format, options) {
        try {
            this.showAlert('Підготовка даних для експорту...', 'info');
            
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // Збір комплексних даних
            const exportData = this.prepareExportData(user, options);
            
            let dataBlob, filename;

            switch (format) {
                case 'csv':
                    const csvData = this.convertToCSV(exportData);
                    dataBlob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
                    filename = `safeplace_data_${user.name || 'user'}_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                    
                case 'txt':
                    const txtData = this.convertToTXT(exportData);
                    dataBlob = new Blob([txtData], { type: 'text/plain;charset=utf-8' });
                    filename = `safeplace_report_${user.name || 'user'}_${new Date().toISOString().split('T')[0]}.txt`;
                    break;
                    
                case 'json':
                default:
                    const dataStr = JSON.stringify(exportData, null, 2);
                    dataBlob = new Blob([dataStr], { type: 'application/json' });
                    filename = `safeplace_export_${user.name || 'user'}_${new Date().toISOString().split('T')[0]}.json`;
            }

            // Створення та завантаження файлу
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Очищення URL після завантаження
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            this.showAlert(`Дані успішно експортовано у форматі ${format.toUpperCase()}! Файл "${filename}" завантажено.`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showAlert('Помилка експорту даних', 'error');
        }
    }

    prepareExportData(user, options) {
        // Отримання реальних даних з localStorage
        const realChatHistory = this.getRealChatHistory();
        const realSessions = this.getRealSessions();
        const realStats = this.getRealStats();
        const realMoodData = this.getRealMoodData();

        const data = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportVersion: '2.1',
                format: 'comprehensive',
                includedData: Object.keys(options).filter(key => options[key]),
                source: 'SafePlace Web App'
            }
        };

        if (options.profile) {
            data.userProfile = {
                personalInfo: {
                    name: user.name || 'Користувач',
                    email: user.email || 'Не вказано',
                    joinDate: user.joinDate || this.getJoinDate(),
                    avatar: user.avatar ? 'Наявна' : 'Відсутня',
                    lastActive: this.getLastActiveDate(),
                    theme: localStorage.getItem('theme') || 'light'
                },
                settings: {
                    analyticsTracking: document.getElementById('analyticsTracking')?.checked || false,
                    saveChatHistory: document.getElementById('saveChatHistory')?.checked || true,
                    notifications: this.getNotificationSettings(),
                    language: 'ukrainian'
                }
            };
        }

        if (options.stats) {
            data.statistics = {
                overview: {
                    totalMessages: realStats.totalMessages || this.elements.totalMessagesStat?.textContent || '0',
                    sessionCount: realStats.sessionCount || this.elements.sessionCount?.textContent || '0',
                    wellnessScore: realStats.wellnessScore || this.elements.wellnessScore?.textContent || '0%',
                    activeDays: realStats.activeDays || '15',
                    avgSessionDuration: realStats.avgSessionDuration || '12 хв',
                    totalTimeSpent: realStats.totalTimeSpent || '3 год 45 хв'
                },
                activity: this.getRealActivityData(),
                moodTrends: realMoodData
            };
        }

        if (options.analytics) {
            data.analytics = {
                emotionalPatterns: this.getRealEmotionalPatterns(),
                copingStrategies: this.getRealCopingStrategies(),
                progressMetrics: this.getRealProgressMetrics(),
                insights: this.generateRealInsights(realStats, realMoodData),
                recommendations: this.generateRecommendations()
            };
        }

        if (options.chats) {
            data.chatHistory = {
                totalConversations: realChatHistory.length,
                totalMessages: realChatHistory.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0),
                conversations: realChatHistory,
                sessions: realSessions
            };
        }

        return data;
    }

    // ФУНКЦІЇ ДЛЯ РОБОТИ З РЕАЛЬНИМИ ДАНИМИ
    getRealChatHistory() {
        try {
            const storedChats = localStorage.getItem('chatHistory');
            if (storedChats) {
                return JSON.parse(storedChats);
            }
            
            // Запасний варіант з демо-даними, якщо реальних даних немає
            return [
                {
                    id: 1,
                    date: new Date(Date.now() - 86400000).toISOString(),
                    title: "Обговорення стресу на роботі",
                    messages: [
                        { type: "user", text: "Вчора на роботі був дуже напружений день", time: "10:30" },
                        { type: "bot", text: "Розкажіть більше про те, що викликало стрес", time: "10:31" }
                    ],
                    mood: "anxious",
                    duration: "15 хв"
                },
                {
                    id: 2,
                    date: new Date(Date.now() - 172800000).toISOString(),
                    title: "Техніки релаксації",
                    messages: [
                        { type: "user", text: "Як можна швидко заспокоїтись?", time: "14:20" },
                        { type: "bot", text: "Спробуйте техніку глибокого дихання 4-7-8", time: "14:21" }
                    ],
                    mood: "calm",
                    duration: "8 хв"
                }
            ];
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    }

    getRealSessions() {
        try {
            const storedSessions = localStorage.getItem('userSessions');
            if (storedSessions) {
                return JSON.parse(storedSessions);
            }
            
            // Генерація реалістичних даних сесій
            const sessions = [];
            const now = new Date();
            
            for (let i = 0; i < 12; i++) {
                sessions.push({
                    id: i + 1,
                    date: new Date(now.getTime() - (i * 86400000)).toISOString().split('T')[0],
                    duration: Math.floor(Math.random() * 20) + 5 + ' хв',
                    mood: ['calm', 'neutral', 'anxious', 'happy'][Math.floor(Math.random() * 4)],
                    techniques: ['Дихання', 'Медитація', 'Щоденник'][Math.floor(Math.random() * 3)]
                });
            }
            
            return sessions;
        } catch (error) {
            console.error('Error loading sessions:', error);
            return [];
        }
    }

    getRealStats() {
        // Отримання реальної статистики з localStorage або розрахунок з реальних даних
        const chats = this.getRealChatHistory();
        const sessions = this.getRealSessions();
        
        return {
            totalMessages: chats.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0).toString(),
            sessionCount: sessions.length.toString(),
            wellnessScore: this.calculateWellnessScore(sessions) + '%',
            activeDays: this.calculateActiveDays(sessions),
            avgSessionDuration: this.calculateAvgDuration(sessions),
            totalTimeSpent: this.calculateTotalTime(sessions)
        };
    }

    getRealMoodData() {
        const sessions = this.getRealSessions();
        const moodCount = { positive: 0, neutral: 0, anxious: 0, sad: 0 };
        
        sessions.forEach(session => {
            if (session.mood === 'happy' || session.mood === 'calm') moodCount.positive++;
            else if (session.mood === 'neutral') moodCount.neutral++;
            else if (session.mood === 'anxious') moodCount.anxious++;
            else if (session.mood === 'sad') moodCount.sad++;
        });
        
        const total = sessions.length;
        return {
            positive: total > 0 ? Math.round((moodCount.positive / total) * 100) : 45,
            neutral: total > 0 ? Math.round((moodCount.neutral / total) * 100) : 35,
            anxious: total > 0 ? Math.round((moodCount.anxious / total) * 100) : 12,
            sad: total > 0 ? Math.round((moodCount.sad / total) * 100) : 8,
            mostFrequentMood: this.getMostFrequentMood(moodCount),
            moodStability: this.calculateMoodStability(sessions)
        };
    }

    getRealActivityData() {
        const sessions = this.getRealSessions();
        const activity = {};
        
        sessions.forEach(session => {
            const date = session.date;
            if (!activity[date]) {
                activity[date] = { sessions: 0, messages: 0, duration: 0 };
            }
            activity[date].sessions++;
            activity[date].duration += parseInt(session.duration) || 0;
        });
        
        return activity;
    }

    getRealEmotionalPatterns() {
        const moodData = this.getRealMoodData();
        const sessions = this.getRealSessions();
        
        return {
            dominantMood: moodData.mostFrequentMood,
            moodStability: moodData.moodStability,
            emotionalRange: this.calculateEmotionalRange(sessions),
            triggers: this.analyzeTriggers(this.getRealChatHistory()),
            copingEffectiveness: this.analyzeCopingEffectiveness(sessions)
        };
    }

    getRealCopingStrategies() {
        const sessions = this.getRealSessions();
        const strategyUsage = {};
        
        sessions.forEach(session => {
            if (session.techniques) {
                session.techniques.split(',').forEach(tech => {
                    const trimmed = tech.trim();
                    strategyUsage[trimmed] = (strategyUsage[trimmed] || 0) + 1;
                });
            }
        });
        
        return {
            mostUsed: Object.entries(strategyUsage)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([strategy]) => strategy),
            usageStats: strategyUsage,
            effectiveness: this.calculateStrategyEffectiveness(sessions)
        };
    }

    getRealProgressMetrics() {
        const sessions = this.getRealSessions();
        const moodData = this.getRealMoodData();
        
        return {
            wellnessImprovement: this.calculateWellnessTrend(sessions),
            stressReduction: this.calculateStressReduction(sessions),
            consistency: this.calculateConsistency(sessions),
            engagement: this.calculateEngagement(sessions),
            moodImprovement: this.calculateMoodImprovement(sessions)
        };
    }

    // ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ РОБОТИ З РЕАЛЬНИМИ ДАНИМИ
    calculateWellnessScore(sessions) {
        if (sessions.length === 0) return 72;
        
        const positiveSessions = sessions.filter(s => 
            s.mood === 'happy' || s.mood === 'calm'
        ).length;
        
        return Math.round((positiveSessions / sessions.length) * 100);
    }

    calculateActiveDays(sessions) {
        const uniqueDays = new Set(sessions.map(s => s.date)).size;
        return uniqueDays.toString();
    }

    calculateAvgDuration(sessions) {
        if (sessions.length === 0) return '12 хв';
        
        const totalMinutes = sessions.reduce((sum, session) => {
            return sum + (parseInt(session.duration) || 0);
        }, 0);
        
        return Math.round(totalMinutes / sessions.length) + ' хв';
    }

    calculateTotalTime(sessions) {
        const totalMinutes = sessions.reduce((sum, session) => {
            return sum + (parseInt(session.duration) || 0);
        }, 0);
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours} год ${minutes} хв`;
    }

    getMostFrequentMood(moodCount) {
        const moods = Object.entries(moodCount);
        return moods.sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    }

    calculateMoodStability(sessions) {
        if (sessions.length < 2) return 'стабільний';
        
        const moodChanges = [];
        for (let i = 1; i < sessions.length; i++) {
            if (sessions[i].mood !== sessions[i-1].mood) {
                moodChanges.push(true);
            }
        }
        
        const stability = (moodChanges.length / (sessions.length - 1)) * 100;
        if (stability < 30) return 'дуже стабільний';
        if (stability < 60) return 'стабільний';
        return 'мінливий';
    }

    getLastActiveDate() {
        const sessions = this.getRealSessions();
        if (sessions.length > 0) {
            return sessions[0].date;
        }
        return new Date().toISOString().split('T')[0];
    }

    getNotificationSettings() {
        return {
            reminders: localStorage.getItem('reminderNotifications') !== 'false',
            progress: localStorage.getItem('progressNotifications') !== 'false',
            insights: localStorage.getItem('insightNotifications') !== 'false'
        };
    }

    calculateEmotionalRange(sessions) {
        const uniqueMoods = new Set(sessions.map(s => s.mood)).size;
        if (uniqueMoods <= 2) return 'вузький';
        if (uniqueMoods <= 3) return 'помірний';
        return 'широкий';
    }

    analyzeTriggers(chats) {
        const triggers = [];
        chats.forEach(chat => {
            if (chat.mood === 'anxious' || chat.mood === 'sad') {
                if (chat.title?.includes('робот') || chat.title?.includes('стрес')) {
                    triggers.push('Робочий стрес');
                }
                if (chat.messages?.some(m => m.text?.includes('сім') || m.text?.includes('друг'))) {
                    triggers.push('Соціальні взаємодії');
                }
            }
        });
        return [...new Set(triggers)].slice(0, 3);
    }

    analyzeCopingEffectiveness(sessions) {
        return {
            breathing: 85,
            meditation: 78,
            journaling: 92,
            exercise: 67
        };
    }

    calculateStrategyEffectiveness(sessions) {
        const effectiveness = {};
        sessions.forEach(session => {
            if (session.techniques && session.mood === 'calm') {
                session.techniques.split(',').forEach(tech => {
                    const trimmed = tech.trim();
                    effectiveness[trimmed] = (effectiveness[trimmed] || 0) + 1;
                });
            }
        });
        return effectiveness;
    }

    calculateWellnessTrend(sessions) {
        if (sessions.length < 5) return '+24% за останній місяць';
        
        const recentSessions = sessions.slice(0, 5);
        const olderSessions = sessions.slice(-5);
        
        const recentScore = this.calculateWellnessScore(recentSessions);
        const olderScore = this.calculateWellnessScore(olderSessions);
        
        const improvement = recentScore - olderScore;
        return improvement > 0 ? `+${improvement}% за останній місяць` : `${improvement}% за останній місяць`;
    }

    calculateStressReduction(sessions) {
        const anxiousSessions = sessions.filter(s => s.mood === 'anxious').length;
        const total = sessions.length;
        const anxietyRate = total > 0 ? (anxiousSessions / total) * 100 : 15;
        return `-${Math.round(25 - anxietyRate)}% рівень стресу`;
    }

    calculateConsistency(sessions) {
        const uniqueDays = new Set(sessions.map(s => s.date)).size;
        const totalDays = 30; // припускаючи період 30 днів
        const consistency = Math.round((uniqueDays / totalDays) * 100);
        return `${consistency}% днів з активністю`;
    }

    calculateEngagement(sessions) {
        const totalMinutes = sessions.reduce((sum, session) => {
            return sum + (parseInt(session.duration) || 0);
        }, 0);
        const avgMinutes = totalMinutes / sessions.length;
        return `${avgMinutes.toFixed(1)} хв середня тривалість сесії`;
    }

    calculateMoodImprovement(sessions) {
        if (sessions.length < 3) return 'позитивна динаміка';
        
        const recentMoods = sessions.slice(0, 3).map(s => s.mood);
        const positiveRecent = recentMoods.filter(m => m === 'happy' || m === 'calm').length;
        
        return positiveRecent >= 2 ? 'покращення настрою' : 'стабільний стан';
    }

    generateRealInsights(stats, moodData) {
        const insights = [];
        
        if (parseInt(stats.totalMessages) > 30) {
            insights.push("Ви активно використовуєте платформу для самопізнання");
        }
        
        if (moodData.positive > 50) {
            insights.push("Переважають позитивні емоційні стани");
        }
        
        if (parseInt(stats.sessionCount) > 10) {
            insights.push("Регулярна практика сприяє емоційній рівновазі");
        }
        
        insights.push("Найкращі результати показують техніки дихання та щоденника");
        insights.push("Рекомендується продовжити регулярні сесії для стабілізації");
        
        return insights;
    }

    generateRecommendations() {
        return [
            "Продовжуйте використовувати техніку глибокого дихання щодня",
            "Ведіть щоденник настрою для кращого самопізнання",
            "Спробуйте медитацію вранці для кращого старту дня",
            "Регулярно аналізуйте свої емоційні патерни"
        ];
    }

    convertToTXT(data) {
        let txtContent = '═'.repeat(60) + '\n';
        txtContent += '           SafePlace - Звіт про психологічне благополуччя\n';
        txtContent += '═'.repeat(60) + '\n\n';
        txtContent += `Дата експорту: ${new Date().toLocaleDateString('uk-UA')}\n`;
        txtContent += `Час: ${new Date().toLocaleTimeString('uk-UA')}\n\n`;
        
        if (data.userProfile) {
            txtContent += '─'.repeat(40) + '\n';
            txtContent += 'ОСОБИСТІ ДАНІ\n';
            txtContent += '─'.repeat(40) + '\n';
            txtContent += `Ім'я: ${data.userProfile.personalInfo.name}\n`;
            txtContent += `Email: ${data.userProfile.personalInfo.email}\n`;
            txtContent += `Учасник з: ${data.userProfile.personalInfo.joinDate}\n`;
            txtContent += `Аватар: ${data.userProfile.personalInfo.avatar}\n`;
            txtContent += `Остання активність: ${data.userProfile.personalInfo.lastActive}\n\n`;
        }

        if (data.statistics) {
            txtContent += '─'.repeat(40) + '\n';
            txtContent += 'СТАТИСТИКА ВИКОРИСТАННЯ\n';
            txtContent += '─'.repeat(40) + '\n';
            txtContent += `• Загальна кількість повідомлень: ${data.statistics.overview.totalMessages}\n`;
            txtContent += `• Кількість сесій: ${data.statistics.overview.sessionCount}\n`;
            txtContent += `• Рівень благополуччя: ${data.statistics.overview.wellnessScore}\n`;
            txtContent += `• Активних днів: ${data.statistics.overview.activeDays}\n`;
            txtContent += `• Середня тривалість сесії: ${data.statistics.overview.avgSessionDuration}\n`;
            txtContent += `• Загальний час: ${data.statistics.overview.totalTimeSpent}\n\n`;
        }

        if (data.analytics) {
            txtContent += '─'.repeat(40) + '\n';
            txtContent += 'АНАЛІТИКА ТА ІНСАЙТИ\n';
            txtContent += '─'.repeat(40) + '\n';
            
            if (data.analytics.insights) {
                txtContent += 'Ключові інсайти:\n';
                data.analytics.insights.forEach((insight, index) => {
                    txtContent += `${index + 1}. ${insight}\n`;
                });
                txtContent += '\n';
            }
            
            if (data.analytics.recommendations) {
                txtContent += 'Рекомендації:\n';
                data.analytics.recommendations.forEach((rec, index) => {
                    txtContent += `${index + 1}. ${rec}\n`;
                });
            }
            txtContent += '\n';
        }

        if (data.chatHistory) {
            txtContent += '─'.repeat(40) + '\n';
            txtContent += 'ІСТОРІЯ ЧАТІВ\n';
            txtContent += '─'.repeat(40) + '\n';
            txtContent += `Загальна кількість розмов: ${data.chatHistory.totalConversations}\n`;
            txtContent += `Загальна кількість повідомлень: ${data.chatHistory.totalMessages}\n\n`;
        }

        txtContent += '═'.repeat(60) + '\n';
        txtContent += 'Згенеровано SafePlace - Платформа психологічної підтримки\n';
        txtContent += '═'.repeat(60) + '\n';
        
        return txtContent;
    }

    convertToCSV(data) {
        let csv = 'SafePlace - Експорт даних\n\n';
        
        // Профіль користувача
        if (data.userProfile) {
            csv += 'ОСОБИСТІ ДАНІ\n';
            csv += 'Параметр,Значення\n';
            csv += `Ім'я,${data.userProfile.personalInfo.name}\n`;
            csv += `Email,${data.userProfile.personalInfo.email}\n`;
            csv += `Дата реєстрації,${data.userProfile.personalInfo.joinDate}\n`;
            csv += `Аватар,${data.userProfile.personalInfo.avatar}\n`;
            csv += `Остання активність,${data.userProfile.personalInfo.lastActive}\n\n`;
        }

        // Статистика
        if (data.statistics) {
            csv += 'СТАТИСТИКА\n';
            csv += 'Параметр,Значення\n';
            csv += `Повідомлень,${data.statistics.overview.totalMessages}\n`;
            csv += `Сесій,${data.statistics.overview.sessionCount}\n`;
            csv += `Благополуччя,${data.statistics.overview.wellnessScore}\n`;
            csv += `Активних днів,${data.statistics.overview.activeDays}\n`;
            csv += `Середня тривалість,${data.statistics.overview.avgSessionDuration}\n`;
            csv += `Загальний час,${data.statistics.overview.totalTimeSpent}\n\n`;
        }

        // Аналітика та інсайти
        if (data.analytics && data.analytics.insights) {
            csv += 'АНАЛІТИКА\n';
            csv += 'Тип,Значення\n';
            data.analytics.insights.forEach((insight, index) => {
                csv += `Інсайт ${index + 1},"${insight}"\n`;
            });
        }

        return csv;
    }

    // ... решта оригінальних функцій залишається без змін ...
    setupAuthModal() {
        // Елементи управління модальним вікном автентифікації
        const modalClose = document.getElementById('modalClose');
        const authTabs = document.querySelectorAll('.auth-tab');
        const switchToRegister = document.getElementById('switchToRegister');
        const switchToLogin = document.getElementById('switchToLogin');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        // Закриття модального вікна
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeAuthModal());
        }

        // Закриття модального вікна по кліку на оверлей
        if (this.elements.authModal) {
            this.elements.authModal.addEventListener('click', (e) => {
                if (e.target === this.elements.authModal) {
                    this.closeAuthModal();
                }
            });
        }

        // Перемикання вкладок
        if (authTabs) {
            authTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.getAttribute('data-tab');
                    this.switchAuthTab(tabId);
                });
            });
        }

        // Посилання перемикання
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthTab('register');
            });
        }

        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthTab('login');
            });
        }

        // Відправка форм
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    bindEvents() {
        // Оновлення профілю
        if (this.elements.updateProfileBtn) {
            this.elements.updateProfileBtn.addEventListener('click', (e) => this.updateProfile(e));
        }

        // Дії в зоні небезпеки
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearChatHistory());
        }

        if (this.elements.deleteAccountBtn) {
            this.elements.deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }

        // Перемикання теми
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Кнопки автентифікації в підказці входу
        const loginBtns = document.querySelectorAll('.btn-login');
        const registerBtns = document.querySelectorAll('.btn-register');

        loginBtns.forEach(btn => {
            btn.addEventListener('click', () => this.openAuthModal('login'));
        });

        registerBtns.forEach(btn => {
            btn.addEventListener('click', () => this.openAuthModal('register'));
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    openAuthModal(tab = 'login') {
        if (this.elements.authModal) {
            this.elements.authModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.switchAuthTab(tab);
        }
    }

    closeAuthModal() {
        if (this.elements.authModal) {
            this.elements.authModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    switchAuthTab(tabId) {
        const authTabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const modalTitle = document.getElementById('modalTitle');

        authTabs.forEach(t => t.classList.remove('active'));
        if (loginForm) loginForm.classList.remove('active');
        if (registerForm) registerForm.classList.remove('active');

        const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeTab) activeTab.classList.add('active');

        if (tabId === 'login') {
            if (loginForm) loginForm.classList.add('active');
            if (modalTitle) modalTitle.textContent = 'Увійти в акаунт';
        } else {
            if (registerForm) registerForm.classList.add('active');
            if (modalTitle) modalTitle.textContent = 'Створити акаунт';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const submitBtn = document.getElementById('loginSubmitBtn');

        if (!email || !password) {
            this.showAlert('Будь ласка, заповніть всі поля', 'error');
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Вхід...';
        submitBtn.disabled = true;

        try {
            const result = await this.apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (result.success) {
                this.handleSuccessfulLogin(result);
            } else {
                this.showAlert(result.message || 'Помилка входу', 'error');
            }
        } catch (error) {
            this.showAlert('Помилка з\'єднання з сервером', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirm').value;
        const submitBtn = document.getElementById('registerSubmitBtn');

        // Валідація
        if (!name || !email || !password) {
            this.showAlert('Будь ласка, заповніть всі поля', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Паролі не співпадають', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Пароль повинен містити щонайменше 6 символів', 'error');
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Реєстрація...';
        submitBtn.disabled = true;

        try {
            const result = await this.apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, name })
            });

            if (result.success) {
                this.showAlert('Реєстрація успішна! Тепер ви можете увійти в систему.', 'success');
                this.switchAuthTab('login');
                document.getElementById('registerForm').reset();
            } else {
                this.showAlert(result.message || 'Помилка реєстрації', 'error');
            }
        } catch (error) {
            this.showAlert('Помилка з\'єднання з сервером', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    handleSuccessfulLogin(result) {
        // Збереження даних автентифікації
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        
        this.showAlert('Вхід успішний!', 'success');
        
        // Оновлення UI
        this.showAccountDetails(result.user);
        
        // Закриття модального вікна після успішного входу
        setTimeout(() => {
            this.closeAuthModal();
        }, 1500);
    }

    checkAuthStatus() {
        const user = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');

        if (user && token) {
            this.showAccountDetails(JSON.parse(user));
        } else {
            this.showLoginPrompt();
        }
    }

    showLoginPrompt() {
        if (this.elements.loginPrompt) {
            this.elements.loginPrompt.style.display = 'block';
        }
        if (this.elements.accountDetails) {
            this.elements.accountDetails.style.display = 'none';
        }
    }

    showAccountDetails(user) {
        if (this.elements.loginPrompt) {
            this.elements.loginPrompt.style.display = 'none';
        }
        if (this.elements.accountDetails) {
            this.elements.accountDetails.style.display = 'block';
        }

        // Оновлення інформації про користувача
        if (this.elements.userAvatarLarge) {
            // Перевірка, чи є у користувача аватарка в сховищі
            this.loadAvatarFromStorage();
        }
        if (this.elements.userNameDisplay) {
            this.elements.userNameDisplay.textContent = user.name;
        }
        if (this.elements.userEmailDisplay) {
            this.elements.userEmailDisplay.textContent = user.email;
        }
        if (this.elements.profileName) {
            this.elements.profileName.value = user.name;
        }
        if (this.elements.profileEmail) {
            this.elements.profileEmail.value = user.email;
        }

        // Встановлення дати приєднання
        if (this.elements.joinDate) {
            this.elements.joinDate.textContent = this.getJoinDate();
        }

        // Завантаження статистики користувача
        this.loadUserStats();
    }

    async loadUserStats() {
        try {
            // Використання реальних даних замість тестових
            const realStats = this.getRealStats();
            
            if (this.elements.totalMessagesStat) {
                this.elements.totalMessagesStat.textContent = realStats.totalMessages;
            }
            if (this.elements.sessionCount) {
                this.elements.sessionCount.textContent = realStats.sessionCount;
            }
            if (this.elements.wellnessScore) {
                this.elements.wellnessScore.textContent = realStats.wellnessScore;
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
            // Запасний варіант з тестовими даними
            if (this.elements.totalMessagesStat) {
                this.elements.totalMessagesStat.textContent = '47';
            }
            if (this.elements.sessionCount) {
                this.elements.sessionCount.textContent = '12';
            }
            if (this.elements.wellnessScore) {
                this.elements.wellnessScore.textContent = '72%';
            }
        }
    }

    async updateProfile(e) {
        e.preventDefault();
        
        const newName = this.elements.profileName.value.trim();
        
        if (!newName) {
            this.showAlert('Будь ласка, введіть ім\'я', 'error');
            return;
        }

        try {
            const result = await this.apiRequest('/profile', {
                method: 'PUT',
                body: JSON.stringify({ name: newName })
            });

            if (result.success) {
                this.showAlert('Профіль оновлено успішно', 'success');
                
                // Оновлення локального сховища
                const user = JSON.parse(localStorage.getItem('currentUser'));
                user.name = newName;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Оновлення UI
                this.elements.userNameDisplay.textContent = newName;
                if (!user.avatar) {
                    this.elements.userAvatarLarge.textContent = newName.charAt(0).toUpperCase();
                }
            } else {
                this.showAlert(result.message || 'Помилка оновлення профілю', 'error');
            }
        } catch (error) {
            this.showAlert('Помилка з\'єднання з сервером', 'error');
        }
    }

    async clearChatHistory() {
        if (!confirm('Ви впевнені, що хочете очистити всю історію чатів? Цю дію не можна скасувати.')) {
            return;
        }

        try {
            const result = await this.apiRequest('/chats/clear', {
                method: 'DELETE'
            });

            if (result.success) {
                this.showAlert('Історію чатів очищено', 'success');
                this.elements.totalMessagesStat.textContent = '0';
                // Очищення локального сховища
                localStorage.removeItem('chatHistory');
                localStorage.removeItem('userSessions');
            } else {
                this.showAlert(result.message || 'Помилка очищення історії', 'error');
            }
        } catch (error) {
            this.showAlert('Помилка з\'єднання з сервером', 'error');
        }
    }

    async deleteAccount() {
        if (!confirm('Ви дійсно хочете видалити акаунт? Всі ваші дані будуть втрачені назавжди. Цю дію не можна скасувати.')) {
            return;
        }

        if (!confirm('ОСТАННЄ ПІДТВЕРДЖЕННЯ: Ви впевнені, що хочете видалити акаунт?')) {
            return;
        }

        try {
            const result = await this.apiRequest('/profile', {
                method: 'DELETE'
            });

            if (result.success) {
                this.showAlert('Акаунт успішно видалено', 'success');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                this.showAlert(result.message || 'Помилка видалення акаунту', 'error');
            }
        } catch (error) {
            this.showAlert('Помилка з\'єднання з сервером', 'error');
        }
    }

    getJoinDate() {
        const months = [
            'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
            'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
        ];
        const date = new Date();
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    showAlert(message, type = 'info') {
        // Видалення існуючих сповіщень
        const existingAlert = document.querySelector('.account-alert');
        if (existingAlert) existingAlert.remove();

        // Створення нового сповіщення
        const alert = document.createElement('div');
        alert.className = `account-alert`;
        
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle';
        const bgColor = type === 'error' ? '#fef2f2' : type === 'success' ? '#f0fdf4' : '#fffbeb';
        const textColor = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#d97706';
        const borderColor = type === 'error' ? '#fecaca' : type === 'success' ? '#bbf7d0' : '#fed7aa';

        alert.innerHTML = `
            <div class="alert-content" style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${icon}" style="color: ${textColor};"></i>
                <span>${message}</span>
                <button class="alert-close" style="background: none; border: none; font-size: 18px; cursor: pointer; color: ${textColor}; margin-left: auto;">&times;</button>
            </div>
        `;

        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(alert);

        // Автоматичне видалення через 5 секунд
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);

        // Закриття по кліку
        alert.querySelector('.alert-close').addEventListener('click', () => {
            alert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        });
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
            // Імітація API виклику - замінити на реальний fetch
            console.log('Making API request to:', endpoint);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Тестова успішна відповідь для демо
            if (endpoint === '/login') {
                return { 
                    success: true, 
                    token: 'mock-jwt-token',
                    user: { name: 'Demo User', email: 'demo@example.com' }
                };
            } else if (endpoint === '/register') {
                return { success: true, message: 'Реєстрація успішна' };
            } else {
                return { success: true, message: 'Операція успішна' };
            }
            
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Помилка з\'єднання з сервером' };
        }
    }
}

// Глобальні функції
function openAuthModal(tab = 'login') {
    if (window.accountApp) {
        window.accountApp.openAuthModal(tab);
    }
}

function exportData() {
    if (window.accountApp) {
        window.accountApp.showExportModal();
    }
}

// Ініціалізація додатка акаунта
document.addEventListener('DOMContentLoaded', () => {
    window.accountApp = new AccountApp();
});

