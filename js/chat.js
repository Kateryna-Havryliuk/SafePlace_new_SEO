// API базовий URL
const API_BASE = 'http://127.0.0.1:5000/api';

// Глобальні змінні
let currentUser = null;
let currentChatId = null;
let isAnonymous = true;

// Елементи DOM
const messagesContainer = document.getElementById("messagesContainer");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const typingIndicator = document.getElementById("typingIndicator");
const emergencyBanner = document.getElementById("emergencyBanner");
const clearChatBtn = document.getElementById("clearChatBtn");
const sidebar = document.getElementById("sidebar");
const anonymousWarning = document.getElementById("anonymousWarning");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const newChatBtn = document.getElementById("newChatBtn");
const chatsList = document.getElementById("chatsList");
const quickInsights = document.getElementById("quickInsights");
const themeToggle = document.getElementById("themeToggle");

// Функції для теми
// Функції для теми (спрощена версія для уникнення конфліктів)
function initChatTheme() {
    // Завжди використовуємо themeManager з theme.js
    if (window.themeManager) {
        updateThemeButton(window.themeManager.getCurrentTheme());
    } else {
        // Якщо themeManager не завантажений, використовуємо просту логіку
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
    }
}

function toggleChatTheme() {
    // Завжди делегуємо themeManager
    if (window.themeManager) {
        window.themeManager.toggleTheme();
        updateThemeButton(window.themeManager.getCurrentTheme());
    } else {
        // Резервна реалізація
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    }
}

function updateThemeButton(theme) {
    if (themeToggle) {
        const sunIcon = themeToggle.querySelector('.fa-sun');
        const moonIcon = themeToggle.querySelector('.fa-moon');
        
        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'inline-block';
        } else {
            sunIcon.style.display = 'inline-block';
            moonIcon.style.display = 'none';
        }
    }
}

// Функції для роботи з API
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...defaultOptions,
            ...options
        });
        
        if (response.status === 401) {
            logout();
            return { success: false, message: 'Необхідно авторизуватися' };
        }
        
        return await response.json();
    } catch (error) {
        console.error('Помилка API:', error);
        return { success: false, message: 'Помилка з\'єднання з сервером' };
    }
}

// Функція для додавання повідомлення в чат
function addMessage(text, sender, isCritical = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender} ${isCritical ? 'critical' : ''}`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'bot') {
        messageDiv.innerHTML = `
            <div class="avatar">S</div>
            <div class="message-content">
                <div>${text}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div>${text}</div>
                <div class="message-time">${timeString}</div>
            </div>
            <div class="avatar">В</div>
        `;
    }
    
    // Ховаємо індикатор набору тексту перед додаванням повідомлення
    typingIndicator.style.display = 'none';
    
    messagesContainer.insertBefore(messageDiv, typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Функція для показу помилки
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot critical';
    errorDiv.innerHTML = `
        <div class="avatar">⚠️</div>
        <div class="message-content">
            <div>${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    messagesContainer.appendChild(errorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Функція для перевірки критичних слів
function checkForCriticalWords(text) {
    const criticalWords = [
        'ріжу', 'вени', 'суїцид', 'самогубство', 'повіситися', 'вбити', 'померти',
        'вмерти', 'больно', 'болюче', 'ненавижу', 'здавити', 'зарізати', 'застрелитися',
        'хочу себе вбити', 'скінчити з собою', 'не хочу жити', 'панічна атака', 'панічні атаки'
    ];
    
    return criticalWords.some(word => text.toLowerCase().includes(word));
}

// Функція для відправки повідомлення з повторними спробами
async function sendMessageWithRetry(text, requestData) {
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(`${API_BASE}/talk`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(requestData.token && { "Authorization": `Bearer ${requestData.token}` })
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`Помилка сервера: ${response.status}`);
            }
            
            return await response.json();
        } catch (err) {
            if (i === 2) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Демо-відповіді для тестування
function getDemoResponse(text) {
    const responses = [
        "🫂 Дякую, що ділишся зі мною. Твої почуття важливі. Розкажи мені більше, якщо хочеш.",
        "💭 Чую тебе. Хочеш розповісти детальніше про те, що відчуваєш?",
        "✨ Дякую за довіру. Я тут, щоб підтримати тебе. Що ще хочеш розповісти?",
        "🌼 Твої слова мають значення. Дякую, що ділишся своїми думками.",
        "💫 Кожна емоція важлива. Дякую, що дозволяєш мені бути поруч."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Функції для роботи з акаунтами
function initializeUserSession() {
    sidebar.style.display = 'flex';
    anonymousWarning.style.display = 'none';
    
    // Оновлюємо інформацію про користувача
    userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    userName.textContent = currentUser.name;
    userEmail.textContent = currentUser.email;
    
    // Завантажуємо список чатів та аналітику
    loadUserChats();
    loadQuickInsights();
}

function showAnonymousMode() {
    sidebar.style.display = 'none';
    anonymousWarning.style.display = 'block';
}

async function loadUserChats() {
    const result = await apiRequest('/chats');
    
    if (result.success) {
        renderChatsList(result.chats);
    } else {
        console.error('Помилка завантаження чатів:', result.message);
    }
}

function renderChatsList(chats) {
    chatsList.innerHTML = '';
    
    if (chats.length === 0) {
        chatsList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">Ще немає чатів</div>';
        return;
    }
    
    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatElement.innerHTML = `
            <div class="chat-title">${chat.title || 'Новий чат'}</div>
            <div class="chat-preview">${chat.last_message || 'Немає повідомлень'}</div>
            <div class="chat-meta">${formatDate(chat.last_activity || chat.created_at)} • ${chat.message_count || 0} повід.</div>
        `;
        
        chatElement.addEventListener('click', () => loadChat(chat.id));
        chatsList.appendChild(chatElement);
    });
}

async function createNewChat() {
    const result = await apiRequest('/chat/new', {
        method: 'POST'
    });
    
    if (result.success) {
        await loadUserChats();
        return result.chat_id;
    }
    return null;
}

async function loadChat(chatId) {
    const result = await apiRequest(`/chat/${chatId}`);
    
    if (result.success) {
        currentChatId = chatId;
        renderChatMessages(result.chat.messages || []);
        loadUserChats();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'сьогодні';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'сьогодні';
    } else if (diffDays === 1) {
        return 'вчора';
    } else if (diffDays < 7) {
        return `${diffDays} дн. тому`;
    } else {
        return date.toLocaleDateString('uk-UA');
    }
}

function clearChatMessages() {
    while (messagesContainer.children.length > 2) {
        messagesContainer.removeChild(messagesContainer.lastChild);
    }
}

function renderChatMessages(messages) {
    clearChatMessages();
    messages.forEach(msg => {
        if (msg.role !== 'system') {
            addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', checkForCriticalWords(msg.content));
        }
    });
}

// Функція для завантаження швидкої аналітики
async function loadQuickInsights() {
    try {
        const result = await apiRequest('/analytics/user');
        
        if (result.success && result.insights) {
            const insights = result.insights;
            quickInsights.innerHTML = `
                <div class="insight-item">📈 Статус: ${getTrendText(insights.severity_trend)}</div>
                <div class="insight-item">🎯 Теми: ${insights.top_categories?.join(', ') || 'Не визначено'}</div>
                <div class="insight-item">💬 Повідомлень: ${insights.message_count || 0}</div>
            `;
        } else {
            quickInsights.innerHTML = '<div class="insight-item">Недостатньо даних для аналітики</div>';
        }
    } catch (error) {
        console.error('Помилка завантаження аналітики:', error);
        quickInsights.innerHTML = '<div class="insight-item">Помилка завантаження</div>';
    }
}

function getTrendText(trend) {
    const trends = {
        'improving': '✅ Покращення',
        'worsening': '⚠️ Увага', 
        'stable': '➡️ Стабільно',
        'unknown': '📊 Не визначено'
    };
    return trends[trend] || trends['unknown'];
}

// Функція виходу
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    currentUser = null;
    isAnonymous = true;
    showAnonymousMode();
}

// Функція для автоматичного відправлення повідомлення при завантаженні
async function sendInitialMessage(message) {
    if (!message) return;
    
    // Додаємо повідомлення користувача
    addMessage(message, 'user');
    
    // Перевіряємо на наявність критичних слів
    const isCritical = checkForCriticalWords(message);
    
    // Показуємо екстрений банер, якщо виявлено критичні слова
    if (isCritical) {
        emergencyBanner.classList.add('show');
    }
    
    // Показуємо індикатор набору тексту
    typingIndicator.style.display = 'flex';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        // Готуємо дані для відправки
        const requestData = {
            message: message,
            token: localStorage.getItem('authToken'),
            chat_id: isAnonymous ? null : currentChatId
        };
        
        // Відправляємо запит на сервер
        const data = await sendMessageWithRetry(message, requestData);
        
        // Оновлюємо chat_id для зареєстрованих користувачів
        if (!isAnonymous && data.chat_id) {
            currentChatId = data.chat_id;
            await loadUserChats();
        }
        
        // Додаємо відповідь бота
        addMessage(data.answer, 'bot', isCritical);
        
    } catch (err) {
        console.error("Помилка:", err);
        // Демо-відповідь якщо сервер не працює
        const demoResponse = getDemoResponse(message);
        addMessage(demoResponse, 'bot', isCritical);
    }
}

// Функція для відправки повідомлення
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.disabled = true;
    sendButton.disabled = true;

    addMessage(text, 'user');
    const isCritical = checkForCriticalWords(text);
    
    if (isCritical) {
        emergencyBanner.classList.add('show');
    }

    userInput.value = '';

    try {
        typingIndicator.style.display = 'flex';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const requestData = {
            message: text,
            token: localStorage.getItem('authToken'),
            chat_id: isAnonymous ? null : currentChatId
        };

        const data = await sendMessageWithRetry(text, requestData);
        addMessage(data.answer, 'bot', isCritical);
        
        // Оновлюємо список чатів після нового повідомлення
        if (!isAnonymous) {
            await loadUserChats();
            loadQuickInsights();
        }
    } catch (err) {
        console.error("Помилка:", err);
        showError("⚠️ Помилка з'єднання. Спробуйте ще раз.");
        
        // Демо-режим
        const demoResponse = getDemoResponse(text);
        addMessage(demoResponse, 'bot');
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Обробники подій
newChatBtn.addEventListener('click', async () => {
    if (!isAnonymous) {
        const chatId = await createNewChat(); // тут теж виправте
        if (chatId) {
            currentChatId = chatId;
            clearChatMessages();
            // Додаємо привітальне повідомлення
            addMessage("Привіт! Я твій віртуальний супутник у складні моменти. Моя роль — надати тобі емоційну підтримку, вислухати без осуду та допомогти знайти внутрішні ресурси для подолання труднощів.", 'bot');
        }
    }
});

userInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

sendButton.addEventListener("click", sendMessage);

clearChatBtn.addEventListener("click", function() {
    if (confirm("Ви впевнені, що хочете очистити поточний чат?")) {
        clearChatMessages();
        // Додаємо привітальне повідомлення
        addMessage("Привіт! Я твій віртуальний супутник у складні моменти. Моя роль — надати тобі емоційну підтримку, вислухати без осуду та допомогти знайти внутрішні ресурси для подолання труднощів.", 'bot');
    }
});

// Обробник повідомлень від головної сторінки
window.addEventListener('message', function(event) {
    console.log('=== ОТРИМАНО ПОВІДОМЛЕННЯ ===');
    console.log('Джерело:', event.origin);
    console.log('Дані:', event.data);
    
    if (event.data.type === 'INITIAL_MESSAGE') {
        const message = event.data.message;
        const user = event.data.user;
        const token = event.data.token;
        
        console.log('Обробляємо INITIAL_MESSAGE:', message);
        console.log('Дані користувача:', user);
        console.log('Токен:', token ? 'Є' : 'Немає');
        
        if (user && token) {
            currentUser = user;
            isAnonymous = false;
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('authToken', token);
            console.log('Користувач встановлений:', currentUser);
            initializeUserSession();
        } else {
            console.log('Анонімний режим');
            showAnonymousMode();
        }
        
        // Викликаємо функцію відправлення повідомлення
        setTimeout(() => {
            sendInitialMessage(message);
        }, 500);
    }
});



// Ініціалізація при завантаженні
// Ініціалізація при завантаженні
window.addEventListener('load', function() {
    console.log('=== CHAT WINDOW LOAD COMPLETE ===');
    console.log('URL:', window.location.href);
    
    // Перевіряємо, чи є зареєстрований користувач
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedUser && savedToken) {
        try {
            currentUser = JSON.parse(savedUser);
            isAnonymous = false;
            console.log('Знайдено збереженого користувача:', currentUser);
            initializeUserSession();
        } catch (e) {
            console.error('Помилка парсингу користувача:', e);
            showAnonymousMode();
        }
    } else {
        console.log('Користувач не знайдений, анонімний режим');
        showAnonymousMode();
    }

    // Перевіряємо, чи є повідомлення з головної сторінки (резервний спосіб)
    const initialMessage = localStorage.getItem('initialMessage');
    console.log('Знайдено initialMessage в localStorage:', initialMessage);
    
    if (initialMessage) {
        console.log('Відправляємо збережене повідомлення');
        // Невелика затримка для ініціалізації
        setTimeout(() => {
            if (isAnonymous) {
                console.log('Відправляємо повідомлення в анонімному режимі');
                sendInitialMessage(initialMessage);
            } else {
                console.log('Створюємо новий чат для збереженого повідомлення');
                createNewChat().then(chatId => {
                    currentChatId = chatId;
                    sendInitialMessage(initialMessage);
                });
            }
            localStorage.removeItem('initialMessage');
        }, 1000);
    }

    userInput.focus();
    
    // Ініціалізуємо тему
    initChatTheme();
});

function formatMessageText(text) {
  // Замінюємо \n на <br> для збереження нових рядків
  return text
    .replace(/\n/g, '<br>')
    .replace(/^-\s/gm, '• ') // тире → bullet
    .replace(/^\d+\.\s/gm, '$&'); // цифри залишаємо
}

function addMessage(text, sender, isCritical = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender} ${isCritical ? 'critical' : ''}`;

  const now = new Date();
  const timeString = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  const formattedText = formatMessageText(text);

  if (sender === 'bot') {
    messageDiv.innerHTML = `
      <div class="avatar">S</div>
      <div class="message-content">
        <div>${formattedText}</div>
        <div class="message-time">${timeString}</div>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">
        <div>${formattedText}</div>
        <div class="message-time">${timeString}</div>
      </div>
      <div class="avatar">В</div>
    `;
  }

  typingIndicator.style.display = 'none';
  messagesContainer.insertBefore(messageDiv, typingIndicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}