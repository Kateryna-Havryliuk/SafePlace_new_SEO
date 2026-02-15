// main.js - Простий та ефективний
class MainApp {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('Main app initialized');
    }

    bindEvents() {
        this.bindSendMessage();
        this.bindBurgerMenu();
        this.bindSmoothScrolling();
    }

    bindSendMessage() {
        const sendButton = document.getElementById('sendInitialBtn');
        const messageInput = document.getElementById('initialMessage');

        if (sendButton && messageInput) {
            sendButton.addEventListener('click', () => {
                this.sendToChat();
            });

            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendToChat();
                }
            });
        }
    }

    sendToChat() {
        const messageInput = document.getElementById('initialMessage');
        const message = messageInput.value.trim();

        if (message) {
            localStorage.setItem('initialMessage', message);
        }
        
        // Просто переходимо до чату
        window.location.href = 'chat.html';
    }

    bindBurgerMenu() {
        
    const burgerMenu = document.getElementById('burgerMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (!burgerMenu || !mobileMenu) return;

    function toggleMenu() {
        const isActive = mobileMenu.classList.contains('active');
        
        if (isActive) {
            // Закриваємо меню
            mobileMenu.classList.remove('active');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
        } else {
            // Відкриваємо меню
            mobileMenu.classList.add('active');
            if (mobileOverlay) mobileOverlay.classList.add('active');
            document.body.classList.add('menu-open');
        }
        
        burgerMenu.classList.toggle('active');
    }

    // Події для відкриття/закриття
    burgerMenu.addEventListener('click', toggleMenu);
    
    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', toggleMenu);
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', toggleMenu);
    }

    // Закриття при кліку на посилання
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Затримка для плавного переходу до секції
            setTimeout(() => {
                toggleMenu();
            }, 150);
        });
    });

    // Закриття при зміні розміру вікна на десктоп
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            mobileMenu.classList.remove('active');
            mobileOverlay?.classList.remove('active');
            burgerMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });

    // Закриття при натисканні ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            toggleMenu();
        }
    });
}
    bindSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

(function initMainPageTheme() {
    // Головна сторінка - світла тема за замовчуванням
    const saved = localStorage.getItem('theme');
    if (!saved) {
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', saved);
    }
})();

// Запуск додатка
document.addEventListener('DOMContentLoaded', () => {
    window.mainApp = new MainApp();
});