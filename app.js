// App State
let deferredPrompt;
let isInstalled = false;

// DOM Elements
const app = document.getElementById('app');
const loading = document.getElementById('loading');
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const installBtn = document.getElementById('installBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const notificationsToggle = document.getElementById('notificationsToggle');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupPWA();
    hideLoadingScreen();
});

// Initialize App
function initializeApp() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    darkModeToggle.checked = savedTheme === 'dark';
    
    // Load saved settings
    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    notificationsToggle.checked = notificationsEnabled;
    
    // Set initial page
    const hash = window.location.hash.slice(1) || 'home';
    showPage(hash);
    updateActiveNav(hash);
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
    
    // Menu button (mobile)
    menuBtn.addEventListener('click', toggleMobileMenu);
    
    // Settings
    darkModeToggle.addEventListener('change', handleThemeToggle);
    notificationsToggle.addEventListener('change', handleNotificationsToggle);
    
    // Install button
    installBtn.addEventListener('click', handleInstallClick);
    
    // Handle back button
    window.addEventListener('popstate', handlePopState);
    
    // Handle orientation change
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Handle touch events for better mobile experience
    setupTouchEvents();
    
    // Handle keyboard navigation
    setupKeyboardNavigation();
}

// Navigation
function handleNavigation(e) {
    e.preventDefault();
    const page = e.currentTarget.dataset.page;
    if (page) {
        showPage(page);
        updateActiveNav(page);
        history.pushState({ page }, '', `#${page}`);
        
        // Close mobile menu if open
        closeMobileMenu();
        
        // Announce page change for screen readers
        announcePageChange(page);
    }
}

function showPage(pageId) {
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Focus management for accessibility
        targetPage.focus();
    }
}

function updateActiveNav(pageId) {
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
}

function handlePopState(e) {
    const page = e.state?.page || window.location.hash.slice(1) || 'home';
    showPage(page);
    updateActiveNav(page);
}

// Mobile Menu
function toggleMobileMenu() {
    nav.classList.toggle('mobile-open');
    menuBtn.setAttribute('aria-expanded', 
        nav.classList.contains('mobile-open') ? 'true' : 'false'
    );
}

function closeMobileMenu() {
    nav.classList.remove('mobile-open');
    menuBtn.setAttribute('aria-expanded', 'false');
}

// Theme Management
function handleThemeToggle() {
    const theme = darkModeToggle.checked ? 'dark' : 'light';
    setTheme(theme);
    localStorage.setItem('theme', theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.content = theme === 'dark' ? '#1E1E1E' : '#2196F3';
    }
}

// Notifications
function handleNotificationsToggle() {
    const enabled = notificationsToggle.checked;
    localStorage.setItem('notifications', enabled.toString());
    
    if (enabled && 'Notification' in window) {
        requestNotificationPermission();
    }
}

async function requestNotificationPermission() {
    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showNotification('Notifications Enabled', 'You will now receive updates from this app.');
        }
    }
}

function showNotification(title, body, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body,
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-72x72.png',
            ...options
        });
        
        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        return notification;
    }
}

// PWA Setup
function setupPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered:', registration);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    }
    
    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });
    
    // Handle app installed
    window.addEventListener('appinstalled', () => {
        isInstalled = true;
        hideInstallButton();
        showNotification('App Installed', 'The app has been successfully installed!');
    });
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        isInstalled = true;
        hideInstallButton();
    }
}

function showInstallButton() {
    if (installBtn && !isInstalled) {
        installBtn.style.display = 'inline-flex';
    }
}

function hideInstallButton() {
    if (installBtn) {
        installBtn.style.display = 'none';
    }
}

async function handleInstallClick() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        
        deferredPrompt = null;
        hideInstallButton();
    }
}

// Touch Events
function setupTouchEvents() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    app.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    app.addEventListener('touchend', (e) => {
        if (!e.changedTouches) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Detect swipe gestures
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                // Swipe right - go to previous page
                navigateToAdjacentPage('prev');
            } else {
                // Swipe left - go to next page
                navigateToAdjacentPage('next');
            }
        }
    }, { passive: true });
    
    // Add haptic feedback for supported devices
    document.addEventListener('click', (e) => {
        if (e.target.matches('.btn, .nav-item, .card')) {
            if ('vibrate' in navigator) {
                navigator.vibrate(10); // Short vibration
            }
        }
    });
}

function navigateToAdjacentPage(direction) {
    const currentPage = document.querySelector('.nav-item.active')?.dataset.page;
    const pageOrder = ['home', 'features', 'settings', 'about'];
    const currentIndex = pageOrder.indexOf(currentPage);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'next') {
        nextIndex = (currentIndex + 1) % pageOrder.length;
    } else {
        nextIndex = (currentIndex - 1 + pageOrder.length) % pageOrder.length;
    }
    
    const nextPage = pageOrder[nextIndex];
    showPage(nextPage);
    updateActiveNav(nextPage);
    history.pushState({ page: nextPage }, '', `#${nextPage}`);
}

// Keyboard Navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Handle Escape key to close mobile menu
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
        
        // Handle arrow keys for navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const direction = e.key === 'ArrowLeft' ? 'prev' : 'next';
            navigateToAdjacentPage(direction);
        }
    });
}

// Orientation Change
function handleOrientationChange() {
    // Force layout recalculation after orientation change
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// Accessibility
function announcePageChange(page) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Navigated to ${page} page`;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Loading Screen
function hideLoadingScreen() {
    setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => {
            loading.style.display = 'none';
        }, 300);
    }, 1000);
}

// Utility Functions
function debounce(func, wait) {
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

function throttle(func, limit) {
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

// Performance Monitoring
function measurePerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart, 'ms');
        });
    }
}

// Initialize performance monitoring
measurePerformance();

// Error Handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // In a production app, you might want to send this to an error tracking service
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // In a production app, you might want to send this to an error tracking service
});

// Network Status
function setupNetworkMonitoring() {
    function updateNetworkStatus() {
        if ('onLine' in navigator) {
            const isOnline = navigator.onLine;
            document.body.classList.toggle('offline', !isOnline);
            
            if (!isOnline) {
                showNotification('Offline Mode', 'You are currently offline. Some features may be limited.');
            }
        }
    }
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
}

setupNetworkMonitoring();

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showPage,
        updateActiveNav,
        setTheme,
        handleNavigation
    };
}