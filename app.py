import os
import logging
import json
import uuid
import re
import sqlite3
import jwt
from datetime import datetime, timedelta
from collections import Counter
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import bcrypt
import threading
import time
import random
from dotenv import load_dotenv

# 1. Завантаження ключів із .env
load_dotenv()

# 2. Налаштування логів
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('safeplace.log'),
        logging.StreamHandler()
    ]
)

# 3. Ініціалізація Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
CORS(app) # Дозволяє крос-доменні запити

# 4. ПРАВИЛЬНЕ підключення Google AI з сучасними моделями
GOOGLE_AI_AVAILABLE = False
model = None
ACTIVE_MODEL = None

try:
    google_api_key = os.getenv('GOOGLE_AI_API_KEY')
    if google_api_key:
        genai.configure(api_key=google_api_key)
        
        # Отримуємо список доступних моделей
        available_models = genai.list_models()
        model_names = [model.name for model in available_models]
        print(f"📋 Знайдено {len(model_names)} доступних моделей")
        
        # СУЧАСНІ моделі, які точно працюють на даний момент
        working_models = [
            'models/gemini-2.0-flash',
            'models/gemini-2.0-flash-001',
            'models/gemini-2.5-flash',
            'models/gemini-flash-latest',
            'models/gemini-pro-latest',
        ]
        
        print("🔍 Спробую підключити доступні моделі...")
        
        for model_name in working_models:
            if model_name in model_names:
                try:
                    print(f"🔄 Тестую модель: {model_name}")
                    model = genai.GenerativeModel(model_name)
                    test_response = model.generate_content("Привіт")
                    GOOGLE_AI_AVAILABLE = True
                    ACTIVE_MODEL = model_name
                    print(f"✅ УСПІХ! Модель {model_name} працює!")
                    break
                except Exception as model_error:
                    print(f"❌ Модель {model_name} не працює: {model_error}")
                    continue
        
        if not GOOGLE_AI_AVAILABLE:
            print("❌ Не вдалося знайти працюючу модель")
            for model_name in model_names:
                if 'flash' in model_name or 'gemini' in model_name:
                    try:
                        print(f"🔄 Спробую будь-яку модель: {model_name}")
                        model = genai.GenerativeModel(model_name)
                        test_response = model.generate_content("Тест")
                        GOOGLE_AI_AVAILABLE = True
                        ACTIVE_MODEL = model_name
                        print(f"✅ Знайдено працюючу модель: {model_name}")
                        break
                    except:
                        continue
            
except Exception as e:
    logging.error(f"Помилка ініціалізації Google AI: {e}")
    print(f"❌ Критична помилка Google AI: {e}")

# Покращена система відповідей з пам'яттю
class EnhancedResponseSystem:
    def __init__(self):
        self.user_context = {} # Словник для зберігання контексту по user_id
        
    def update_context(self, user_id, message, response):
        """Оновлює контекст розмови для користувача"""
        if user_id not in self.user_context:
            self.user_context[user_id] = {
                'conversation_history': [],
                'emotional_state': 'neutral',
                'main_topics': [],
                'last_interaction': datetime.now()
            }
        
        # Додаємо нове повідомлення до історії
        self.user_context[user_id]['conversation_history'].append({
            'user': message,
            'assistant': response,
            'timestamp': datetime.now()
        })
        
        # Обмежуємо історію останніми 10 повідомленнями
        if len(self.user_context[user_id]['conversation_history']) > 10:
            self.user_context[user_id]['conversation_history'] = self.user_context[user_id]['conversation_history'][-10:]
        
        self.user_context[user_id]['last_interaction'] = datetime.now()
    
    def get_conversation_summary(self, user_id):
        """Створює короткий зміст попередньої розмови"""
        if user_id not in self.user_context or not self.user_context[user_id]['conversation_history']:
            return "Це перша розмова з користувачем."
        
        # Беремо останні 3 повідомлення для зведення
        history = self.user_context[user_id]['conversation_history'][-3:]
        summary = "Попередня розмова:\n"
        for i, msg in enumerate(history, 1):
            summary += f"{i}. Користувач: {msg['user'][:100]}... → Асистент: {msg['assistant'][:100]}...\n"
        
        return summary

enhanced_system = EnhancedResponseSystem()

# ПРОФЕСІЙНИЙ ПСИХОЛОГІЧНИЙ ПРОМПТ
system_prompt = """Ти — Safe Place, досвідчений україномовний психолог-консультант з 15-річним досвідом.  
Ти спеціалізуєшся на когнітивно-поведінковій терапії, емоційній регуляції та кризовій підтримці.  
Твоє завдання — надати емпатичну, професійну та зрозумілу підтримку користувачеві, який пише тобі в чат.

---

🔹 **ТВІЙ ПІДХІД:**
- Глибока емпатія: співпереживай щиро, але професійно  
- Активне слухання: показуй, що ти чуєш і розумієш  
- Валідація почуттів: ніколи не заперечуй емоції і не засуджуй користувача
- Конструктивні питання: став відкриті питання  
- Практичні поради: пропонуй конкретні техніки, які реально працюють 
- Підтримка та заохочення: підбадьорюй, але не втрачай професійності  

---

🔸 **СТРУКТУРА КОЖНОЇ ВІДПОВІДІ (5–15 речень):**
1. Емпатичне введення (1 речення)  
2. Валідація почуттів (1–2 речення)  
3. Конструктивне питання або техніка (2–9 речень, кожен пункт з нового рядка)  
4. Підтримка та заохочення (1–2 речення)  
5. Запрошення продовжити (1 речення)

---

🔸 **ПРАВИЛА ФОРМАТУВАННЯ:**
- Пиши короткими, зрозумілими реченнями
- Кожен пункт починай з нового рядка   
- Не використовуй курсив, HTML, Markdown  
- Використовуй списки з нового рядка, якщо даєш техніку  
- Іноді додавай доречні емодзі (🫂💫🌿✨), але не переборщуй  
- Не повторюй привітання, якщо це не перше повідомлення  
- Не виходь за межі психологічної підтримки  
- Не давай медичних порад  
- Не використовуй шаблонні фрази на кшталт "Я розумію, як тобі важко" — будь конкретнішим

---

🔸 **КРИТИЧНІ СИТУАЦІЇ — НЕГАЙНО ПЕРЕНАПРАВЛЯЙ:**
- Самогубство: 0 800 100 102  
- Насильство: 116 123 або 0 800 500 335  
- Залежність: 0 800 50 15 20  
- Підлітки: teenergizer.org  
- Діти та молодь: 0 800 500 225 або 116111  
- Криза: 5522 (11:00–19:00)

---

🔸 **МОВА:**  
Українська, професійна, але зрозуміла та доступна. 
Якщо користувач звертається іншою мовою - адаптуватися та відповідати нею."""


# Глобальні змінні для кешування
analytics_cache = {}
cache_lock = threading.Lock()
CACHE_DURATION = 300 # Тривалість кешу в секундах (5 хвилин)

# Функції для роботи з паролями
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    try:
        if isinstance(hashed, str):
            hashed = hashed.encode('utf-8')
        return bcrypt.checkpw(password.encode('utf-8'), hashed)
    except Exception as e:
        logging.error(f"Password check error: {e}")
        return False

# Декоратор для перевірки JWT токена
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"success": False, "message": "Токен відсутній"}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:] # Видаляємо префікс 'Bearer '
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT id, email, name FROM users WHERE id = ? AND is_active = TRUE', (data['user_id'],))
            user = cursor.fetchone()
            conn.close()
            
            if not user:
                return jsonify({"success": False, "message": "Користувач не знайдений"}), 401
                
            # Зберігаємо інфо про користувача в об'єкті запиту для подальшого використання
            request.current_user = {
                'id': user[0],
                'email': user[1],
                'name': user[2]
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Токен закінчився"}), 401
        except Exception as e:
            logging.error(f"Помилка перевірки токена: {e}")
            return jsonify({"success": False, "message": "Невірний токен"}), 401
        
        return f(*args, **kwargs)
    return decorated

# Підключення до бази даних
def get_db_connection():
    conn = sqlite3.connect('safeplace.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row # Повертає рядки як словники
    return conn

# Ініціалізація бази даних
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Таблиця користувачів
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMP
        )
    ''')
    
    # Таблиця чатів
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message TEXT,
            is_archived BOOLEAN DEFAULT FALSE,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            message_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Таблиця повідомлень
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_critical BOOLEAN DEFAULT FALSE,
            classification TEXT,
            sentiment_score REAL,
            FOREIGN KEY (chat_id) REFERENCES chats (id)
        )
    ''')
    
    # ТАБЛИЦЯ ДЛЯ ДЕТАЛЬНОЇ АНАЛІТИКИ
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_analytics (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date DATE NOT NULL,
            message_count INTEGER DEFAULT 0,
            critical_count INTEGER DEFAULT 0,
            avg_sentiment REAL DEFAULT 0,
            dominant_category TEXT,
            session_duration INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Додаємо відсутні колонки (якщо вони ще не існують)
    try:
        cursor.execute("ALTER TABLE chats ADD COLUMN last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    except sqlite3.OperationalError:
        pass # Колонка вже існує
    
    try:
        cursor.execute("ALTER TABLE chats ADD COLUMN message_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
    except sqlite3.OperationalError:
        pass
    
    # ІНДЕКСИ ДЛЯ ШВИДКОЇ АНАЛІТИКИ
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON user_analytics(user_id, date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chats_activity ON chats(last_activity)')
    
    conn.commit()
    conn.close()

# Система класифікації емоційних станів
class EmotionalClassifier:
    def __init__(self):
        # Словник категорій та їх ключових слів
        self.categories = {
            'anxiety': ['тривога', 'страх', 'паніка', 'хвилювання', 'неспокій', 'нервування', 'боюся'],
            'depression': ['депресія', 'сум', 'відчай', 'безнадія', 'апатія', 'втома', 'порожнеча'],
            'stress': ['стрес', 'напруга', 'перевантаження', 'виснаження', 'тиск'],
            'relationships': ['відносини', 'сім\'я', 'друзі', 'кохання', 'розставання', 'конфлікт', 'самотність'],
            'self_esteem': ['самооцінка', 'впевненість', 'комплекси', 'самокритика'],
            'work_study': ['робота', 'навчання', 'екзамени', 'проекти', 'кар\'єра'],
            'sleep': ['сон', 'безсоння', 'втома'],
            'health': ['здоров\'я', 'самопочуття', 'боль', 'хвороба']
        }
        
        # Індикатори тяжкості стану
        self.severity_indicators = {
            'high': ['суїцид', 'вбити', 'померти', 'різати', 'вени', 'повіситися', 'не хочу жити'],
            'medium': ['не можу', 'втомився', 'немає сил', 'безнадійно', 'здаюся'],
            'low': ['погано', 'сумно', 'тривожно', 'стресово', 'засмучено']
        }
    
    def classify_message(self, text):
        text_lower = text.lower()
        categories = []
        severity = 'low'
        
        # Визначаємо категорії за ключовими словами
        for category, keywords in self.categories.items():
            if any(keyword in text_lower for keyword in keywords):
                categories.append(category)
        
        # Визначаємо тяжкість за індикаторами
        for level, indicators in self.severity_indicators.items():
            if any(indicator in text_lower for indicator in indicators):
                severity = level
                break
        
        return {
            'categories': categories,
            'severity': severity,
            'timestamp': datetime.now().isoformat()
        }

# РОЗШИРЕНА СИСТЕМА АНАЛІТИКИ
class AdvancedAnalyticsEngine:
    def __init__(self):
        self.classifier = EmotionalClassifier()
        
    def record_user_activity(self, user_id, message, response, is_critical=False):
        """Записує активність користувача для аналітики"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            today = datetime.now().date().isoformat()
            
            # Отримуємо поточну статистику за день
            cursor.execute('''
                SELECT message_count, critical_count, avg_sentiment 
                FROM user_analytics 
                WHERE user_id = ? AND date = ?
            ''', (user_id, today))
            
            existing = cursor.fetchone()
            
            classification = self.classifier.classify_message(message)
            sentiment = self.analyze_sentiment(message)
            dominant_category = classification['categories'][0] if classification['categories'] else 'other'
            
            if existing:
                # Оновлюємо існуючий запис
                new_count = existing[0] + 1
                new_critical = existing[1] + (1 if is_critical else 0)
                new_avg = (existing[2] * existing[0] + sentiment) / new_count
                
                cursor.execute('''
                    UPDATE user_analytics 
                    SET message_count = ?, critical_count = ?, avg_sentiment = ?, dominant_category = ?
                    WHERE user_id = ? AND date = ?
                ''', (new_count, new_critical, new_avg, dominant_category, user_id, today))
            else:
                # Створюємо новий запис
                analytics_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO user_analytics (id, user_id, date, message_count, critical_count, avg_sentiment, dominant_category)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (analytics_id, user_id, today, 1, 1 if is_critical else 0, sentiment, dominant_category))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logging.error(f"Помилка запису аналітики: {e}")

    def analyze_sentiment(self, text):
        """Аналізує тональність тексту (-1 до 1)"""
        text_lower = text.lower()
        
        # Позитивні слова
        positive_words = ['дякую', 'добре', 'радість', 'щастя', 'допомог', 'краще', 'зрозумі', 'підтримк', 'надія', 'люб', 'пишатися']
        # Негативні слова
        negative_words = ['погано', 'біль', 'смерть', 'самогуб', 'ненави', 'страх', 'тривог', 'відчай', 'безнаді', 'смутк', 'покінчити з усім/собою', 'паніка']
        
        positive_score = sum(1 for word in positive_words if word in text_lower)
        negative_score = sum(2 for word in negative_words if word in text_lower)  # Більша вага для негативу
        
        total_words = len(text.split())
        if total_words == 0:
            return 0
            
        sentiment = (positive_score - negative_score) / total_words
        return max(-1, min(1, sentiment))  # Обмежуємо від -1 до 1

    def get_comprehensive_analytics(self, user_id, days=30):
        """Повна аналітика користувача"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Статистика повідомлень
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_messages,
                    SUM(CASE WHEN is_critical THEN 1 ELSE 0 END) as critical_messages,
                    AVG(sentiment_score) as avg_sentiment
                FROM messages m
                JOIN chats c ON m.chat_id = c.id
                WHERE c.user_id = ? AND m.timestamp >= date('now', ?)
            ''', (user_id, f'-{days} days'))
            
            msg_stats = cursor.fetchone()
            
            # Популярні категорії
            cursor.execute('''
                SELECT classification, COUNT(*) as count
                FROM messages m
                JOIN chats c ON m.chat_id = c.id
                WHERE c.user_id = ? AND m.timestamp >= date('now', ?) AND classification IS NOT NULL
                GROUP BY classification
                ORDER BY count DESC
                LIMIT 5
            ''', (user_id, f'-{days} days'))
            
            categories = {}
            for classification, count in cursor.fetchall():
                try:
                    class_data = json.loads(classification)
                    for category in class_data.get('categories', []):
                        categories[category] = categories.get(category, 0) + count
                except:
                    continue
            
            # Активність по днях
            cursor.execute('''
                SELECT date, message_count, critical_count, avg_sentiment
                FROM user_analytics
                WHERE user_id = ? AND date >= date('now', ?)
                ORDER BY date DESC
                LIMIT 30
            ''', (user_id, f'-{days} days'))
            
            daily_activity = {}
            for date, count, critical, sentiment in cursor.fetchall():
                daily_activity[date] = {
                    'messages': count,
                    'critical': critical,
                    'sentiment': sentiment
                }
            
            # Час активності
            cursor.execute('''
                SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
                FROM messages m
                JOIN chats c ON m.chat_id = c.id
                WHERE c.user_id = ? AND m.timestamp >= date('now', ?)
                GROUP BY hour
                ORDER BY hour
            ''', (user_id, f'-{days} days'))
            
            hourly_activity = {f"{hour}:00": count for hour, count in cursor.fetchall()}
            
            conn.close()
            
            return {
                'success': True,
                'period_days': days,
                'summary': {
                    'total_messages': msg_stats[0] or 0,
                    'critical_messages': msg_stats[1] or 0,
                    'avg_sentiment': round(msg_stats[2] or 0, 2),
                    'engagement_rate': self.calculate_engagement(daily_activity)
                },
                'categories': categories,
                'daily_activity': daily_activity,
                'hourly_activity': hourly_activity,
                'trends': self.calculate_trends(daily_activity),
                'recommendations': self.generate_personalized_recommendations(categories, msg_stats[1] or 0)
            }
            
        except Exception as e:
            logging.error(f"Помилка комплексної аналітики: {e}")
            return {'success': False, 'error': str(e)}

    def calculate_engagement(self, daily_activity):
        """Розраховує рівень залученості"""
        if not daily_activity:
            return 0
        
        active_days = sum(1 for day in daily_activity.values() if day['messages'] > 0)
        total_days = len(daily_activity)
        
        return round((active_days / total_days) * 100, 1) if total_days > 0 else 0

    def calculate_trends(self, daily_activity):
        """Аналізує тренди активності"""
        if len(daily_activity) < 2:
            return {'message_trend': 'stable', 'sentiment_trend': 'stable', 'message_change': 0}
        
        dates = sorted(daily_activity.keys())
        recent = daily_activity[dates[-1]]['messages']
        previous = daily_activity[dates[-2]]['messages']
        
        message_trend = 'improving' if recent > previous else 'worsening' if recent < previous else 'stable'
        
        # Аналіз тональності
        recent_sentiment = daily_activity[dates[-1]]['sentiment']
        avg_sentiment = sum(day['sentiment'] for day in daily_activity.values()) / len(daily_activity)
        
        sentiment_trend = 'improving' if recent_sentiment > avg_sentiment else 'worsening' if recent_sentiment < avg_sentiment else 'stable'
        
        message_change = round(((recent - previous) / previous * 100) if previous > 0 else 0, 1)
        
        return {
            'message_trend': message_trend,
            'sentiment_trend': sentiment_trend,
            'message_change': message_change
        }

    def generate_personalized_recommendations(self, categories, critical_count):
        """Генерує персоналізовані рекомендації"""
        recommendations = []
        
        if categories.get('anxiety', 0) > 5:
            recommendations.append("🔶 Часті звернення про тривогу: спробуйте техніки дихання 4-7-8")
        
        if categories.get('depression', 0) > 3:
            recommendations.append("🔶 Звернення про депресивні стани: рекомендуємо регулярні прогулянки на свіжому повітрі")
        
        if critical_count > 0:
            recommendations.append("⚠️ Виявлено критичні ситуації: важливо мати підтримку близьких та фахівців")
        
        if not recommendations:
            recommendations.extend([
                "💫 Продовжуйте ділитися своїми почуттями - це важливий крок до благополуччя",
                "🌿 Регулярна практика медитації може покращити емоційний стан",
                "📝 Ведення щоденника допомагає краще розуміти свої емоції"
            ])
        
        return recommendations[:3]  # Не більше 3 рекомендацій

# Ініціалізація розширеної аналітики
advanced_analytics = AdvancedAnalyticsEngine()

# Покращена система аналітики (можливо, попередня версія)
class AnalyticsEngine:
    def __init__(self):
        self.classifier = EmotionalClassifier()
    
    def get_user_insights(self, user_id):
        cache_key = f"user_insights_{user_id}"
        cached_data = self.get_cached_analytics(cache_key)
        if cached_data:
            return cached_data
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Отримуємо останні 100 повідомлень користувача
            cursor.execute('''
                SELECT m.content, m.timestamp, m.is_critical, m.sentiment_score
                FROM messages m 
                JOIN chats c ON m.chat_id = c.id 
                WHERE c.user_id = ? 
                ORDER BY m.timestamp DESC 
                LIMIT 100
            ''', (user_id,))
            
            messages = cursor.fetchall()
            conn.close()
            
            if not messages:
                return {
                    'message_count': 0,
                    'top_categories': [],
                    'severity_trend': 'unknown',
                    'sentiment_trend': 'unknown',
                    'critical_messages': 0,
                    'avg_sentiment': 0,
                    'recommendations': ['Почніть розмову для отримання аналітики'],
                    'last_activity': None,
                    'daily_activity': {}
                }
            
            categories_counter = Counter()
            critical_count = 0
            sentiment_total = 0
            sentiment_count = 0
            
            for content, timestamp, is_critical, sentiment_score in messages:
                classification = self.classifier.classify_message(content)
                
                for category in classification['categories']:
                    categories_counter[category] += 1
                
                if is_critical:
                    critical_count += 1
                
                if sentiment_score:
                    sentiment_total += sentiment_score
                    sentiment_count += 1
            
            top_categories = [cat for cat, count in categories_counter.most_common(3)]
            avg_sentiment = sentiment_total / sentiment_count if sentiment_count > 0 else 0
            
            # Простий розрахунок тренду
            severity_trend = self._calculate_trend(messages)
            
            insights = {
                'message_count': len(messages),
                'top_categories': top_categories,
                'severity_trend': severity_trend,
                'sentiment_trend': 'stable',
                'critical_messages': critical_count,
                'avg_sentiment': round(avg_sentiment, 2),
                'recommendations': self._generate_recommendations(top_categories),
                'last_activity': messages[0][1] if messages else None,
                'daily_activity': self._get_daily_activity(messages)
            }
            
            self.set_cached_analytics(cache_key, insights)
            return insights
            
        except Exception as e:
            logging.error(f"Помилка отримання аналітики: {e}")
            return {
                'message_count': 0,
                'top_categories': [],
                'severity_trend': 'unknown',
                'sentiment_trend': 'unknown',
                'critical_messages': 0,
                'avg_sentiment': 0,
                'recommendations': ['Помилка завантаження аналітики'],
                'last_activity': None,
                'daily_activity': {}
            }
    
    def _calculate_trend(self, messages):
        if len(messages) < 5:
            return 'unknown'
        
        # Простий алгоритм визначення тренду
        recent_critical = sum(1 for msg in messages[:10] if msg[2])  # is_critical
        older_critical = sum(1 for msg in messages[-10:] if msg[2])
        
        if recent_critical > older_critical:
            return 'worsening'
        elif recent_critical < older_critical:
            return 'improving'
        else:
            return 'stable'

    def _get_daily_activity(self, messages):
        daily_activity = {}
        for content, timestamp, is_critical, sentiment_score in messages:
            date = timestamp.split(' ')[0]  # Беремо тільки дату
            daily_activity[date] = daily_activity.get(date, 0) + 1
        
        return dict(list(daily_activity.items())[:7])  # Останні 7 днів

    def get_cached_analytics(self, key):
        with cache_lock:
            if key in analytics_cache:
                data, timestamp = analytics_cache[key]
                if time.time() - timestamp < CACHE_DURATION:
                    return data
        return None
    
    def set_cached_analytics(self, key, data):
        with cache_lock:
            analytics_cache[key] = (data, time.time())
    
    def _generate_recommendations(self, top_categories):
        recommendations = []
        
        if 'anxiety' in top_categories:
            recommendations.append("Регулярні техніки дихання можуть допомогти з тривогою")
        
        if 'depression' in top_categories:
            recommendations.append("Спробуйте вести щоденник настрою")
        
        if 'stress' in top_categories:
            recommendations.append("Медитація та фізична активність допомагають зменшити стрес")
        
        recommendations.extend([
            "Регулярні прогулянки на свіжому повітрі",
            "Збалансоване харчування впливає на емоційний стан",
            "Якісний сон - ключ до психологічного благополуччя"
        ])
        
        return recommendations[:3]

analytics_engine = AnalyticsEngine()

def get_ai_response(user_message, chat_history=[], user_id=None):
    """Отримання професійної психологічної відповіді"""
    if not GOOGLE_AI_AVAILABLE or not model:
        return "🫂 Дякую, що звертаєшся. Наразі технічні труднощі, але я тут, щоб підтримати тебе. Розкажи, що на душі?"
    
    try:
        context = system_prompt + "\n\n"
        
        if user_id and user_id in enhanced_system.user_context:
            conversation_summary = enhanced_system.get_conversation_summary(user_id)
            context += f"КОНТЕКСТ РОЗМОВИ:\n{conversation_summary}\n\n"
        
        if chat_history:
            context += "ОСТАННІ ПОВІДОМЛЕННЯ:\n"
            for msg in chat_history[-25:]: # Беремо останні 25 повідомлень
                role = "Користувач" if msg['role'] == 'user' else "Психолог"
                context += f"{role}: {msg['content']}\n"
            context += "\n"
        
        context += f"ПОТОЧНЕ ПОВІДОМЛЕННЯ КОРИСТУВАЧА: {user_message}\n\n"
        context += "ТВОЯ ВІДПОВІДЬ (емпатична, професійна, 5-15 речень (з емодзі, за потреби)):"
        
        response = model.generate_content(
            context,
            generation_config=genai.types.GenerationConfig(
                temperature=0.8, # Вища температура - більш творчі відповіді
                max_output_tokens=3000, # Максимальна довжина відповіді
                top_p=0.9,
            )
        )
        
        if user_id:
            enhanced_system.update_context(user_id, user_message, response.text)
        
        return response.text
        
    except Exception as e:
        logging.error(f"Помилка Google AI: {e}")
        return "Вибач, сталася технічна помилка... Але я чую тебе і хочу допомогти. Спробуй, будь ласка, ще раз розповісти, що тебе турбує🫂"

# API endpoints

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'google_ai_available': GOOGLE_AI_AVAILABLE,
        'active_model': ACTIVE_MODEL,
        'database': 'connected'
    })

@app.route("/api/analytics/user", methods=["GET"])
@token_required
def get_user_analytics_protected():
    """Аналітика для поточного користувача"""
    try:
        insights = analytics_engine.get_user_insights(request.current_user['id'])
        return jsonify({
            "success": True, 
            "insights": insights
        })
    except Exception as e:
        logging.error(f"Помилка аналітики: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/analytics/advanced", methods=["GET"])
@token_required
def get_advanced_analytics():
    """Розширена аналітика для користувача"""
    try:
        days = request.args.get('days', 30, type=int)
        analytics = advanced_analytics.get_comprehensive_analytics(request.current_user['id'], days)
        
        return jsonify(analytics)
    
    except Exception as e:
        logging.error(f"Помилка розширеної аналітики: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/analytics/record", methods=["POST"])
@token_required
def record_analytics():
    """Записує активність для аналітики"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        response = data.get('response', '')
        is_critical = data.get('is_critical', False)
        
        advanced_analytics.record_user_activity(
            request.current_user['id'], 
            message, 
            response, 
            is_critical
        )
        
        return jsonify({"success": True})
    
    except Exception as e:
        logging.error(f"Помилка запису аналітики: {e}")
        return jsonify({"success": False}), 500

@app.route("/api/analytics/global", methods=["GET"])
def get_global_analytics():
    """Глобальна аналітика"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM users WHERE is_active = TRUE')
        total_users = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT COUNT(*) FROM messages')
        total_messages = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT COUNT(*) FROM messages WHERE is_critical = TRUE')
        critical_messages = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT COUNT(*) FROM chats')
        total_chats = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT COUNT(*) FROM messages WHERE timestamp >= datetime("now", "-7 days")')
        weekly_messages = cursor.fetchone()[0] or 0
        
        # ДОДАЄМО ЕМОЦІЙНІ ПАТЕРНИ:
        cursor.execute('''
            SELECT classification, COUNT(*) 
            FROM messages 
            WHERE classification IS NOT NULL 
            GROUP BY classification
            LIMIT 10
        ''')
        
        emotional_patterns = {}
        for classification, count in cursor.fetchall():
            try:
                class_data = json.loads(classification)
                for category in class_data.get('categories', []):
                    emotional_patterns[category] = emotional_patterns.get(category, 0) + 1
            except:
                continue
        
        conn.close()
        
        return jsonify({
            "success": True,
            "total_users": total_users,
            "total_messages": total_messages,
            "critical_messages": critical_messages,
            "total_chats": total_chats,
            "weekly_activity": weekly_messages,
            "emotional_patterns": {
                "top_categories": emotional_patterns,
                "avg_sentiment": {"anxiety": -0.2, "depression": -0.5, "stress": -0.3} # Приклад статичних даних
            }
        })
    
    except Exception as e:
        logging.error(f"Помилка глобальної аналітики: {e}")
        return jsonify({
            "success": False, 
            "message": "Помилка сервера",
            "emotional_patterns": {}
        }), 500

@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()

        if not email or not password or not name:
            return jsonify({"success": False, "message": "Будь ласка, заповніть всі поля"}), 400

        if len(password) < 6:
            return jsonify({"success": False, "message": "Пароль повинен містити щонайменше 6 символів"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "message": "Користувач з такою поштою вже існує"}), 400

        user_id = str(uuid.uuid4())
        password_hash = hash_password(password)
        
        cursor.execute(
            'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
            (user_id, email, name, password_hash)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True, 
            "message": "Реєстрація успішна!",
            "user_id": user_id
        })
    
    except Exception as e:
        logging.error(f"Помилка реєстрації: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"success": False, "message": "Будь ласка, заповніть всі поля"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, password_hash FROM users WHERE email = ? AND is_active = TRUE', (email,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({"success": False, "message": "Невірний email або пароль"}), 401

        password_valid = check_password(password, user[2])
        
        if not password_valid:
            conn.close()
            return jsonify({"success": False, "message": "Невірний email або пароль"}), 401

        cursor.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            (user[0],)
        )
        
        conn.commit()
        conn.close()

        token_payload = {
            'user_id': user[0],
            'exp': datetime.utcnow() + timedelta(days=7) # Токен дійсний 7 днів
        }
        
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            "success": True, 
            "message": "Вхід успішний!",
            "token": token,
            "user": {
                "id": user[0],
                "name": user[1],
                "email": email
            }
        })
    
    except Exception as e:
        logging.error(f"Помилка входу: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile():
    return jsonify({
        "success": True,
        "user": request.current_user
    })

@app.route("/api/profile", methods=["PUT"])
@token_required
def update_profile():
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        
        if not name:
            return jsonify({"success": False, "message": "Ім'я не може бути порожнім"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE users SET name = ? WHERE id = ?',
            (name, request.current_user['id'])
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Профіль оновлено успішно"
        })
        
    except Exception as e:
        logging.error(f"Помилка оновлення профілю: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/profile", methods=["DELETE"])
@token_required
def delete_profile():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE users SET is_active = FALSE WHERE id = ?', # М'яке видалення
            (request.current_user['id'],)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Акаунт успішно видалено"
        })
        
    except Exception as e:
        logging.error(f"Помилка видалення профілю: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/chats", methods=["GET"])
@token_required
def get_chats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.id, c.title, c.created_at, c.last_message, c.last_activity,
                   c.message_count
            FROM chats c
            WHERE c.user_id = ? AND c.is_archived = FALSE
            ORDER BY c.last_activity DESC
        ''', (request.current_user['id'],))
        
        chats = []
        for row in cursor.fetchall():
            chats.append({
                'id': row[0],
                'title': row[1],
                'created_at': row[2],
                'last_message': row[3],
                'last_activity': row[4],
                'message_count': row[5] or 0
            })
        
        conn.close()
        return jsonify({"success": True, "chats": chats})
    
    except Exception as e:
        logging.error(f"Помилка отримання чатів: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/chat/<chat_id>", methods=["GET"])
@token_required
def get_chat(chat_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT user_id FROM chats WHERE id = ?', (chat_id,))
        chat = cursor.fetchone()
        
        if not chat or chat[0] != request.current_user['id']:
            conn.close()
            return jsonify({"success": False, "message": "Чат не знайдено"}), 404

        cursor.execute('''
            SELECT role, content, timestamp, is_critical 
            FROM messages 
            WHERE chat_id = ? 
            ORDER BY timestamp ASC
        ''', (chat_id,))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                'role': row[0],
                'content': row[1],
                'timestamp': row[2],
                'is_critical': bool(row[3])
            })
        
        conn.close()
        return jsonify({"success": True, "chat": {'messages': messages}})
    
    except Exception as e:
        logging.error(f"Помилка отримання чату: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/chat/new", methods=["POST"])
@token_required
def create_chat():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        chat_id = str(uuid.uuid4())
        cursor.execute(
            'INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)',
            (chat_id, request.current_user['id'], 'Новий чат')
        )
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "chat_id": chat_id})
    
    except Exception as e:
        logging.error(f"Помилка створення чату: {e}")
        return jsonify({"success": False, "message": "Помилка сервера"}), 500

@app.route("/api/talk", methods=["POST"])
def talk():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        token = data.get("token")
        chat_id = data.get("chat_id")

        if not user_message:
            return jsonify({"answer": "🫂 Будь ласка, поділись тим, що на душі. Я тут, щоб вислухати тебе."}), 400

        chat_history = []
        current_user = None
        
        if token:
            try:
                if token.startswith('Bearer '):
                    token = token[7:]
                data_jwt = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                
                conn = get_db_connection() # Збереження в базу даних
                cursor = conn.cursor()
                cursor.execute('SELECT id, email, name FROM users WHERE id = ? AND is_active = TRUE', (data_jwt['user_id'],))
                user = cursor.fetchone()
                
                if user:
                    current_user = {
                        'id': user[0],
                        'email': user[1],
                        'name': user[2]
                    }
                    
                    if chat_id:
                        cursor.execute('SELECT user_id FROM chats WHERE id = ?', (chat_id,))
                        chat = cursor.fetchone()
                        
                        if chat and chat[0] == current_user['id']:
                            cursor.execute('''
                                SELECT role, content FROM messages 
                                WHERE chat_id = ? 
                                ORDER BY timestamp DESC LIMIT 8
                            ''', (chat_id,))
                            
                            history = cursor.fetchall()
                            history.reverse() # Повертаємо хронологічний порядок
                            
                            for role, content in history:
                                chat_history.append({'role': role, 'content': content})
                
                conn.close()
            except:
                pass # Якщо токен невірний, продовжуємо як анонімний користувач

        user_id = current_user['id'] if current_user else None
        bot_response = get_ai_response(user_message, chat_history, user_id)

        # ЗАПИС АНАЛІТИКИ ДЛЯ ЗАРЕЄСТРОВАНИХ КОРИСТУВАЧІВ
        if current_user:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if not chat_id:
                chat_id = str(uuid.uuid4())
                title = user_message[:30] + '...' if len(user_message) > 30 else user_message
                cursor.execute(
                    'INSERT INTO chats (id, user_id, title, last_message, last_activity) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
                    (chat_id, current_user['id'], title, user_message)
                )
            else:
                cursor.execute(
                    'UPDATE chats SET last_message = ?, last_activity = CURRENT_TIMESTAMP WHERE id = ?',
                    (user_message, chat_id)
                )

            classification = analytics_engine.classifier.classify_message(user_message)
            is_critical = classification['severity'] == 'high'
            
            cursor.execute(
                'INSERT INTO messages (id, chat_id, role, content, is_critical, classification, sentiment_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
                (str(uuid.uuid4()), chat_id, 'user', user_message, 
                 is_critical, json.dumps(classification), advanced_analytics.analyze_sentiment(user_message))
            )
            
            cursor.execute(
                'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
                (str(uuid.uuid4()), chat_id, 'assistant', bot_response)
            )
            
            cursor.execute(
                'UPDATE chats SET message_count = message_count + 1 WHERE id = ?',
                (chat_id,)
            )
            
            conn.commit()
            conn.close()
            
            # ЗАПИСУЄМО АКТИВНІСТЬ ДЛЯ АНАЛІТИКИ
            advanced_analytics.record_user_activity(
                current_user['id'], 
                user_message, 
                bot_response, 
                is_critical
            )

        return jsonify({
            "answer": bot_response,
            "chat_id": chat_id if current_user else None,
            "google_ai_used": GOOGLE_AI_AVAILABLE,
            "model": ACTIVE_MODEL,
            "professional_mode": True
        })
    
    except Exception as e:
        logging.error(f"Помилка: {e}")
        return jsonify({
            "answer": "Вибач, сталася технічна помилка...🫂  Але я чую твій біль і хочу допомогти. Спробуй, будь ласка, ще раз поділитися тим, що тебе турбує. 💫 Ти не самотній у цьому.",
        }), 500




if __name__ == "__main__":
    init_db()
    print("✅ База даних ініціалізована")
    print("🚀 Сервер запускається на http://127.0.0.1:5000")
    
    if GOOGLE_AI_AVAILABLE:
        print(f"🧠 ПРОФЕСІЙНИЙ ПСИХОЛОГІЧНИЙ РЕЖИМ АКТИВОВАНО!")
        print(f"💫 Використовується модель: {ACTIVE_MODEL}")
        print("🎯 Тепер ШІ буде давати глибокі, емпатичні та професійні відповіді!")
        print("📚 Пам'ять розмови: АКТИВОВАНО")
        print("📊 РОЗШИРЕНА АНАЛІТИКА: АКТИВОВАНО")
        print("❤️  Підтримка: ПРОФЕСІЙНИЙ РІВЕНЬ")
    else:
        print("❌ Google AI не доступний")
        print("💡 Використовуються розумні резервні відповіді")
    
    app.run(debug=True, port=5000)
