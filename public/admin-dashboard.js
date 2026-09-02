/**
 * Enhanced Admin Dashboard JavaScript
 * Handles data fetching, chart rendering, and comprehensive management
 */

const API_BASE_URL = (function() {
    var h = window.location.hostname;
    return (h === 'localhost' || h === '127.0.0.1')
        ? ''
        : 'https://library-backend-j90e.onrender.com';
})();

// ─── JWT Auto-Inject & 401 Handler ─────────────────────────────────────────
(function injectJwtOnBackendRequests() {
    var _fetch = window.fetch;
    window.fetch = function(input, init) {
        init = init || {};
        var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
        var isBackendCall = API_BASE_URL ? url.startsWith(API_BASE_URL) : url.startsWith('/');
        if (isBackendCall) {
            var token = localStorage.getItem('authToken');
            if (token) {
                init.headers = Object.assign({ 'Authorization': 'Bearer ' + token }, init.headers || {});
            }
        }
        return _fetch.call(this, input, init).then(function(response) {
            if (isBackendCall && response.status === 401) {
                var currentPage = window.location.pathname.split('/').pop();
                if (currentPage !== 'auth.html' && !url.endsWith('/login') && !url.endsWith('/register')) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authState');
                    localStorage.removeItem('userData');
                    window.location.replace('auth.html');
                }
            }
            return response;
        });
    };
})();

// Chart instances
var genreChart = null;
var growthChart = null;
var ratingChart = null;
var reviewTrendChart = null;
var currentTimeFilter = 'all';

// ─── Toast & Confirm Helpers (self-contained for this page) ─────────────────
function showToast(message, type = 'info', duration = 3500) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast-msg ' + type;
    toast.innerHTML = message;
    container.appendChild(toast);
    requestAnimationFrame(function() { requestAnimationFrame(function() { toast.classList.add('show'); }); });
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
    }, duration);
}

function showConfirmModal(message, onConfirm, dangerLabel) {
    var overlay = document.getElementById('confirm-modal-overlay');
    var msgEl = document.getElementById('confirm-modal-message');
    var okBtn = document.getElementById('confirm-modal-ok');
    var cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!overlay || !msgEl || !okBtn || !cancelBtn) {
        if (window.confirm(message)) onConfirm();
        return;
    }

    msgEl.textContent = message;
    if (dangerLabel) okBtn.textContent = dangerLabel;

    var newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    var newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newOk.addEventListener('click', function() {
        overlay.classList.remove('active');
        onConfirm();
    });
    newCancel.addEventListener('click', function() {
        overlay.classList.remove('active');
    });
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('active');
    }, { once: true });

    overlay.classList.add('active');
}

// ─── Admin Access Check ─────────────────────────────────────────────────────
async function checkAdminAccess() {
    try {
        var response = await fetch(API_BASE_URL + '/current-user', { credentials: 'include' });
        if (!response.ok) { window.location.href = 'index.html'; return false; }
        var user = await response.json();
        if (user.role !== 'admin') { window.location.href = 'index.html'; return false; }
        return true;
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// ─── Time Filter ────────────────────────────────────────────────────────────
function setTimeFilter(filter, clickedBtn) {
    currentTimeFilter = filter;
    document.querySelectorAll('.time-filter-inline .btn').forEach(function(btn) { btn.classList.remove('active'); });
    if (clickedBtn) clickedBtn.classList.add('active');
    loadStats();
    loadGrowthChart();
    loadReviewTrendChart();
}

// ─── Chart Helpers ──────────────────────────────────────────────────────────
function showChartMessage(canvas, message) {
    canvas.style.display = 'none';
    var container = canvas.parentElement;
    var msg = container.querySelector('.chart-no-data-msg');
    if (!msg) {
        msg = document.createElement('p');
        msg.className = 'text-center text-muted chart-no-data-msg';
        msg.style.cssText = 'padding-top:80px;font-size:.9rem;';
        container.appendChild(msg);
    }
    msg.textContent = message;
}

function clearChartMessage(canvas) {
    canvas.style.display = '';
    var msg = canvas.parentElement.querySelector('.chart-no-data-msg');
    if (msg) msg.remove();
}

// ─── Statistics ─────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        var response = await fetch(API_BASE_URL + '/analytics/stats?timeFilter=' + currentTimeFilter, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch stats');
        var stats = await response.json();
        animateValue('total-users', 0, stats.totalUsers || 0, 1000);
        animateValue('total-books', 0, stats.totalBooks || 0, 1000);
        animateValue('total-reviews', 0, stats.totalReviews || 0, 1000);
        animateValue('active-users', 0, stats.activeUsers || 0, 1000);
        
        var usersChange = document.getElementById('users-change');
        var booksChange = document.getElementById('books-change');
        if (usersChange) usersChange.innerHTML = stats.recentUsers > 0 ? '<i class="fas fa-arrow-up"></i> <span>+' + stats.recentUsers + ' this month</span>' : '<i class="fas fa-minus"></i> <span>No new users</span>';
        if (booksChange) booksChange.innerHTML = stats.recentBooks > 0 ? '<i class="fas fa-arrow-up"></i> <span>+' + stats.recentBooks + ' this month</span>' : '<i class="fas fa-minus"></i> <span>No new books</span>';
        
        var avgEl = document.getElementById('avg-rating');
        if (avgEl) avgEl.textContent = 'Avg: ' + (stats.averageRating || 0).toFixed(1) + ' \u2B50';
        var lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleString();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function animateValue(id, start, end, duration) {
    var element = document.getElementById(id);
    if (!element) return;
    var range = end - start;
    var increment = range / (duration / 16);
    var current = start;
    var timer = setInterval(function() {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// ─── Charts ─────────────────────────────────────────────────────────────────
async function loadGenreChart() {
    try {
        var response = await fetch(API_BASE_URL + '/analytics/genre-stats', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch genre stats');
        var genres = await response.json();
        var ctx = document.getElementById('genreChart').getContext('2d');
        if (genreChart) genreChart.destroy();
        if (genres.length === 0) {
            document.getElementById('genreChart').parentElement.innerHTML = '<p class="text-center text-muted">No genre data available</p>';
            return;
        }
        genreChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: genres.map(function(g) { return g.genre; }),
                datasets: [{
                    data: genres.map(function(g) { return g.count; }),
                    backgroundColor: ['#1DB954', '#667eea', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#ffc107', '#17a2b8', '#764ba2', '#fa709a'],
                    borderWidth: 3,
                    borderColor: '#0f0f0f',
                    hoverBorderColor: '#fff',
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 11 }, color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var value = context.parsed || 0;
                                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var percentage = ((value / total) * 100).toFixed(1);
                                return context.label + ': ' + value + ' books (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading genre chart:', error);
    }
}

async function loadGrowthChart() {
    try {
        var canvas = document.getElementById('growthChart');
        if (!canvas) return;
        var userActivityRes = await fetch(API_BASE_URL + '/analytics/user-activity?timeFilter=' + currentTimeFilter, { credentials: 'include' });
        var bookUploadsRes = await fetch(API_BASE_URL + '/analytics/book-uploads?timeFilter=' + currentTimeFilter, { credentials: 'include' });
        var userActivity = await userActivityRes.json();
        var bookUploads = await bookUploadsRes.json();
        var ctx = canvas.getContext('2d');
        if (growthChart) growthChart.destroy();
        
        if (userActivity.length === 0 && bookUploads.length === 0) {
            showChartMessage(canvas, 'No growth data available for the selected period.');
            return;
        }
        clearChartMessage(canvas);
        
        var allDates = [];
        userActivity.forEach(function(a) { if (allDates.indexOf(a.date) === -1) allDates.push(a.date); });
        bookUploads.forEach(function(b) { if (allDates.indexOf(b.date) === -1) allDates.push(b.date); });
        allDates.sort();
        
        var userData = allDates.map(function(date) { var found = userActivity.find(function(a) { return a.date === date; }); return found ? found.count : 0; });
        var bookData = allDates.map(function(date) { var found = bookUploads.find(function(b) { return b.date === date; }); return found ? found.count : 0; });
        
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allDates.map(function(date) { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }),
                datasets: [
                    { label: 'New Users', data: userData, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#667eea', pointBorderColor: '#fff', pointBorderWidth: 2 },
                    { label: 'New Books', data: bookData, borderColor: '#1DB954', backgroundColor: 'rgba(29, 185, 84, 0.1)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#1DB954', pointBorderColor: '#fff', pointBorderWidth: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'top', labels: { color: '#fff', padding: 15, font: { size: 12 } } }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading growth chart:', error);
        var c = document.getElementById('growthChart');
        if (c) showChartMessage(c, 'Failed to load chart. Try again later.');
    }
}

async function loadRatingChart() {
    try {
        var response = await fetch(API_BASE_URL + '/analytics/rating-distribution', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch rating distribution');
        var ratings = await response.json();
        var ctx = document.getElementById('ratingChart').getContext('2d');
        if (ratingChart) ratingChart.destroy();
        
        var ratingData = [1, 2, 3, 4, 5].map(function(rating) { var found = ratings.find(function(r) { return r.rating === rating; }); return found ? found.count : 0; });
        
        ratingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['\u2B50 1 Star', '\u2B50\u2B50 2 Stars', '\u2B50\u2B50\u2B50 3 Stars', '\u2B50\u2B50\u2B50\u2B50 4 Stars', '\u2B50\u2B50\u2B50\u2B50\u2B50 5 Stars'],
                datasets: [{
                    label: 'Number of Reviews',
                    data: ratingData,
                    backgroundColor: ['#ff6b6b', '#ffa502', '#ffc107', '#26de81', '#20bf6b'],
                    borderColor: '#0f0f0f',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0); var percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0; return context.parsed.y + ' reviews (' + percentage + '%)'; } } } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { ticks: { color: '#aaa' }, grid: { display: false } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading rating chart:', error);
    }
}

async function loadReviewTrendChart() {
    try {
        var canvas = document.getElementById('reviewTrendChart');
        if (!canvas) return;
        var response = await fetch(API_BASE_URL + '/analytics/review-trends?timeFilter=' + currentTimeFilter, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch review trends');
        var trends = await response.json();
        var ctx = canvas.getContext('2d');
        if (reviewTrendChart) reviewTrendChart.destroy();
        
        if (trends.length === 0) { showChartMessage(canvas, 'No review data available for the selected period.'); return; }
        clearChartMessage(canvas);
        
        reviewTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.map(function(t) { return new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }),
                datasets: [{
                    label: 'Reviews Posted',
                    data: trends.map(function(t) { return t.count; }),
                    borderColor: '#43e97b',
                    backgroundColor: 'rgba(67, 233, 123, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#43e97b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading review trend chart:', error);
        var c = document.getElementById('reviewTrendChart');
        if (c) showChartMessage(c, 'Failed to load chart. Try again later.');
    }
}

// ─── Popular Books & Top Reviewers ──────────────────────────────────────────
async function loadPopularBooks() {
    var container = document.getElementById('popular-books');
    try {
        var response = await fetch(API_BASE_URL + '/analytics/popular-books', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch popular books');
        var books = await response.json();
        if (books.length === 0) { container.innerHTML = '<p class="text-center text-muted">No popular books yet</p>'; return; }
        
        container.innerHTML = books.slice(0, 10).map(function(book, index) {
            var coverUrl = book.cover || 'https://via.placeholder.com/60x90?text=No+Cover';
            return '<div class="book-card">' +
                '<img src="' + coverUrl + '" alt="' + (book.title || '') + '" onerror="this.src=\'https://via.placeholder.com/60x90?text=No+Cover\'">' +
                '<div class="flex-grow-1">' +
                '<h6 class="mb-1">' + (index + 1) + '. ' + (book.title || 'Unknown') + '</h6>' +
                '<p class="mb-1 text-muted small">by ' + (book.author || 'Unknown') + '</p>' +
                '<div class="d-flex align-items-center">' +
                '<span class="badge badge-success mr-2">' + book.reviewCount + ' reviews</span>' +
                '<span class="badge badge-warning">\u2B50 ' + (book.avgRating || 0).toFixed(1) + '</span>' +
                '</div></div></div>';
        }).join('');
    } catch (error) {
        console.error('Error loading popular books:', error);
        if (container) container.innerHTML = '<p class="text-center text-danger">Failed to load popular books</p>';
    }
}

async function loadTopReviewers() {
    var container = document.getElementById('top-reviewers');
    try {
        var response = await fetch(API_BASE_URL + '/analytics/top-reviewers', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch top reviewers');
        var reviewers = await response.json();
        if (reviewers.length === 0) { container.innerHTML = '<p class="text-center text-muted">No reviewers yet</p>'; return; }
        
        var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
        container.innerHTML = reviewers.map(function(reviewer, index) {
            var borderColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#1DB954';
            return '<div class="d-flex align-items-center justify-content-between mb-3 p-3 rounded" style="background: rgba(40, 40, 40, 0.6); border-left: 4px solid ' + borderColor + ';">' +
                '<div class="d-flex align-items-center">' +
                '<div class="mr-3"><span style="font-size: 1.5rem;">' + (medals[index] || '#' + (index + 1)) + '</span></div>' +
                '<div><h6 class="mb-0" style="color: #1DB954;">' + reviewer.username + '</h6><small class="text-muted reviewer-email">' + reviewer.email + '</small></div>' +
                '</div>' +
                '<div class="text-right">' +
                '<div><strong style="color: #fff;">' + reviewer.reviewCount + '</strong> <small class="text-muted">reviews</small></div>' +
                '<small class="text-muted">Avg: ' + reviewer.avgRating + ' \u2B50</small>' +
                '</div></div>';
        }).join('');
    } catch (error) {
        console.error('Error loading top reviewers:', error);
        if (container) container.innerHTML = '<p class="text-center text-danger">Failed to load top reviewers</p>';
    }
}

async function loadRecentActivity() {
    var container = document.getElementById('recent-activity');
    try {
        var response = await fetch(API_BASE_URL + '/analytics/recent-activity', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch recent activity');
        var activities = await response.json();
        if (activities.length === 0) { container.innerHTML = '<p class="text-center text-muted">No recent activity</p>'; return; }
        
        container.innerHTML = activities.map(function(activity) {
            var timeAgo = getTimeAgo(new Date(activity.createdAt));
            var content = '', iconClass = 'fa-info-circle', iconColor = '#1DB954';
            if (activity.type === 'review') {
                content = '<strong style="color: #1DB954;">' + activity.username + '</strong> reviewed <em style="color: #4facfe;">' + activity.book_title + '</em><div class="mt-1"><span class="badge badge-warning">\u2B50 ' + activity.rating + '/5</span><small class="text-muted ml-2">' + timeAgo + '</small></div>';
                iconClass = 'fa-star'; iconColor = '#ffc107';
            } else if (activity.type === 'user') {
                content = 'New user <strong style="color: #1DB954;">' + activity.username + '</strong> joined<div class="mt-1"><small class="text-muted">' + timeAgo + '</small></div>';
                iconClass = 'fa-user-plus'; iconColor = '#667eea';
            } else if (activity.type === 'book') {
                content = 'New book added: <em style="color: #4facfe;">' + activity.title + '</em> by ' + activity.author + '<div class="mt-1"><small class="text-muted">' + timeAgo + '</small></div>';
                iconClass = 'fa-book'; iconColor = '#f093fb';
            }
            return '<div class="activity-item"><div class="d-flex align-items-start"><div style="margin-right: 15px;"><i class="fas ' + iconClass + '" style="color: ' + iconColor + '; font-size: 20px;"></i></div><div class="flex-grow-1">' + content + '</div></div></div>';
        }).join('');
    } catch (error) {
        console.error('Error loading recent activity:', error);
        if (container) container.innerHTML = '<p class="text-center text-danger">Failed to load recent activity</p>';
    }
}

async function loadBooksWithoutReviews() {
    var container = document.getElementById('books-without-reviews');
    try {
        var response = await fetch(API_BASE_URL + '/analytics/books-without-reviews', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch books without reviews');
        var books = await response.json();
        if (books.length === 0) { container.innerHTML = '<p class="text-center" style="color: #1DB954;">All books have reviews! \uD83C\uDF89</p>'; return; }
        
        container.innerHTML = books.map(function(book) {
            var coverUrl = book.cover || 'https://via.placeholder.com/60x90?text=No+Cover';
            return '<div class="book-card">' +
                '<img src="' + coverUrl + '" alt="' + (book.title || '') + '" onerror="this.src=\'https://via.placeholder.com/60x90?text=No+Cover\'">' +
                '<div class="flex-grow-1">' +
                '<h6 class="mb-1">' + (book.title || 'Unknown') + '</h6>' +
                '<p class="mb-0 text-muted small">by ' + (book.author || 'Unknown') + '</p>' +
                '<small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Needs reviews</small>' +
                '</div></div>';
        }).join('');
    } catch (error) {
        console.error('Error loading books without reviews:', error);
        if (container) container.innerHTML = '<p class="text-center text-danger">Failed to load books without reviews</p>';
    }
}

async function loadFlaggedActivities() {
    var container = document.getElementById('flagged-activities');
    try {
        var response = await fetch(API_BASE_URL + '/admin/activity/flagged', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch flagged activities');
        var activities = await response.json();
        if (activities.length === 0) { container.innerHTML = '<p class="text-center text-muted">No flagged activities</p>'; return; }
        
        container.innerHTML = activities.map(function(activity) {
            return '<div class="flagged-item ' + activity.severity + '">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + activity.username + '</strong> - ' + activity.type.replace(/_/g, ' ') +
                '<div><small class="text-muted">' + new Date(activity.createdAt).toLocaleString() + '</small></div></div>' +
                '<span class="badge ' + (activity.severity === 'abusive' ? 'badge-danger' : 'badge-warning') + '">' + activity.severity + '</span>' +
                '</div>' +
                (activity.details ? '<div class="mt-2"><small>' + JSON.stringify(activity.details).substring(0, 100) + '...</small></div>' : '') +
                '</div>';
        }).join('');
    } catch (error) {
        console.error('Error loading flagged activities:', error);
        if (container) container.innerHTML = '<p class="text-center text-danger">Failed to load flagged activities</p>';
    }
}

// ─── Management Tab Switching ───────────────────────────────────────────────
function switchManagementTab(tab) {
    document.querySelectorAll('.management-section').forEach(function(s) { s.style.display = 'none'; });
    document.querySelectorAll('#managementTabs .nav-link').forEach(function(l) { l.classList.remove('active'); });
    
    var tabMap = { reservations: 'reservations-management', borrowing: 'borrowing-management', fines: 'fines-management', users: 'users-management', activity: 'activity-management' };
    var sectionId = tabMap[tab];
    if (sectionId) document.getElementById(sectionId).style.display = 'block';
    
    var activeLink = document.querySelector('#managementTabs .nav-link[onclick*="' + tab + '"]');
    if (activeLink) activeLink.classList.add('active');
    
    if (tab === 'reservations') loadAdminReservations();
    if (tab === 'borrowing') loadAdminBorrowing();
    if (tab === 'fines') loadAdminFines();
    if (tab === 'users') loadAdminUsers();
    if (tab === 'activity') loadAdminActivityLogs();
}

// ─── Reservation Management ─────────────────────────────────────────────────
async function loadAdminReservations() {
    var container = document.getElementById('admin-reservations-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/reservations', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch reservations');
        var reservations = await response.json();
        if (reservations.length === 0) { container.innerHTML = '<p class="text-center text-muted">No reservations found</p>'; return; }
        
        container.innerHTML = reservations.map(function(r) {
            return '<div class="management-item">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + (r.book_title || 'Unknown Book') + '</strong> by ' + (r.author || 'Unknown') + '<br><small>User: ' + r.username + ' (' + r.email + ')</small><br><small>Reserved: ' + new Date(r.reservedAt).toLocaleString() + '</small><br><span class="badge ' + (r.status === 'waiting' ? 'badge-warning' : 'badge-success') + '">' + r.status + '</span></div>' +
                '<div class="action-buttons">' +
                (r.status === 'waiting' ? '<button class="btn btn-success btn-action" onclick="fulfillReservation(' + r.id + ')">Fulfill</button>' : '') +
                '<button class="btn btn-danger btn-action" onclick="cancelAdminReservation(' + r.id + ')">Cancel</button>' +
                '</div></div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load reservations</p>';
    }
}

async function fulfillReservation(reservationId) {
    try {
        var response = await fetch(API_BASE_URL + '/admin/reservations/' + reservationId + '/fulfill', { method: 'POST', credentials: 'include' });
        var data = await response.json();
        if (response.ok) { showToast('Reservation marked as fulfilled', 'success'); loadAdminReservations(); }
        else { showToast('Failed to fulfill reservation: ' + data.error, 'error'); }
    } catch (error) { showToast('Network error. Please try again.', 'error'); }
}

async function cancelAdminReservation(reservationId) {
    showConfirmModal('Are you sure you want to cancel this reservation?', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/admin/reservations/' + reservationId, { method: 'DELETE', credentials: 'include' });
            var data = await response.json();
            if (response.ok) { showToast('Reservation cancelled', 'success'); loadAdminReservations(); }
            else { showToast('Failed to cancel reservation: ' + data.error, 'error'); }
        } catch (error) { showToast('Network error. Please try again.', 'error'); }
    }, 'Cancel');
}

// ─── Borrowing Management ───────────────────────────────────────────────────
async function loadAdminBorrowing() {
    var container = document.getElementById('admin-borrowing-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/borrowing', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch borrowed books');
        var borrows = await response.json();
        if (borrows.length === 0) { container.innerHTML = '<p class="text-center text-muted">No borrowed books found</p>'; return; }
        
        container.innerHTML = borrows.map(function(borrow) {
            var isOverdue = new Date(borrow.dueDate) < new Date() && borrow.status === 'borrowed';
            var overdueClass = isOverdue ? 'overdue' : '';
            var overdueBadge = isOverdue ? '<span class="badge badge-overdue ml-1">Overdue</span>' : '';
            var returnBtn = borrow.status === 'borrowed' ? '<button class="btn btn-success btn-action" onclick="returnAdminBook(' + borrow.id + ')">Mark Returned</button>' : '';
            return '<div class="management-item ' + overdueClass + '">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + (borrow.book_title || 'Unknown Book') + '</strong> by ' + (borrow.author || 'Unknown') + '<br>' +
                '<small>User: ' + borrow.username + ' (' + borrow.email + ')</small><br>' +
                '<small>Borrowed: ' + new Date(borrow.borrowDate).toLocaleDateString() + '</small> | ' +
                '<small>Due: ' + new Date(borrow.dueDate).toLocaleDateString() + '</small><br>' +
                '<span class="badge ' + (borrow.status === 'borrowed' ? 'badge-warning' : 'badge-success') + '">' + borrow.status + '</span>' + overdueBadge + '</div>' +
                '<div class="action-buttons">' + returnBtn + '</div></div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load borrowed books</p>';
    }
}

async function loadOverdueBooks() {
    var container = document.getElementById('admin-borrowing-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading overdue books...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/borrowing/overdue', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch overdue books');
        var overdue = await response.json();
        if (overdue.length === 0) { container.innerHTML = '<p class="text-center text-success">No overdue books! \uD83C\uDF89</p>'; return; }
        
        container.innerHTML = overdue.map(function(borrow) {
            return '<div class="management-item overdue">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + borrow.book_title + '</strong> by ' + borrow.author + '<br><small>User: ' + borrow.username + ' (' + borrow.email + ')</small><br><small class="text-danger">Due: ' + new Date(borrow.dueDate).toLocaleDateString() + '</small></div>' +
                '<button class="btn btn-success btn-action" onclick="returnAdminBook(' + borrow.id + ')">Mark Returned</button>' +
                '</div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load overdue books</p>';
    }
}

async function returnAdminBook(borrowId) {
    showConfirmModal('Mark this book as returned?', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/admin/borrowing/' + borrowId + '/return', { method: 'POST', credentials: 'include' });
            var data = await response.json();
            if (response.ok) { showToast('Book marked as returned', 'success'); loadAdminBorrowing(); if (isInventoryVisible()) loadInventory(); }
            else { showToast('Failed to mark as returned: ' + data.error, 'error'); }
        } catch (error) { showToast('Network error. Please try again.', 'error'); }
    }, 'Return');
}

// ─── Book Inventory ─────────────────────────────────────────────────────────
var inventoryRefreshTimer = null;

function isInventoryVisible() {
    var section = document.getElementById('inventory-section');
    return section && section.style.display !== 'none';
}

function startInventoryAutoRefresh() {
    stopInventoryAutoRefresh();
    // Poll every 10s so borrowed/returned copies reflect live while viewing
    inventoryRefreshTimer = setInterval(function() {
        if (isInventoryVisible() && !document.hidden) loadInventory();
    }, 10000);
}

function stopInventoryAutoRefresh() {
    if (inventoryRefreshTimer) { clearInterval(inventoryRefreshTimer); inventoryRefreshTimer = null; }
}

async function loadInventory() {
    var container = document.getElementById('inventory-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading inventory...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/inventory', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch inventory');
        var books = await response.json();
        if (books.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No books in the library yet</p>';
            return;
        }
        container.innerHTML =
            '<div class="console-summary" style="margin-bottom:12px;">' +
            '<span class="console-stat"><i class="fas fa-book text-primary"></i> Titles: <span class="num">' + books.length + '</span></span>' +
            '<span class="console-stat"><i class="fas fa-layer-group text-info"></i> Total copies: <span class="num">' +
            books.reduce(function(sum, b) { return sum + b.physicalCopies; }, 0) + '</span></span>' +
            '<span class="console-stat"><i class="fas fa-check-circle text-success"></i> Available now: <span class="num">' +
            books.reduce(function(sum, b) { return sum + b.availableCopies; }, 0) + '</span></span>' +
            '</div>' +
            books.map(function(book) {
                var outOfStock = book.availableCopies === 0 && book.physicalCopies > 0;
                var digitalOnly = book.physicalCopies === 0;
                var statusBadge = digitalOnly
                    ? '<span class="badge badge-info ml-1">Digital only</span>'
                    : (outOfStock ? '<span class="badge badge-overdue ml-1">All copies out</span>' : '');
                return '<div class="management-item">' +
                    '<div class="d-flex justify-content-between align-items-center flex-wrap">' +
                    '<div><strong>' + (book.title || 'Unknown Title') + '</strong> by ' + (book.author || 'Unknown') + '<br>' +
                    '<small>Total copies: <strong>' + book.physicalCopies + '</strong> | ' +
                    'Currently borrowed: ' + book.activeBorrows + ' | ' +
                    'Available: <strong style="color:' + (book.availableCopies > 0 ? '#1DB954' : '#dc3545') + '">' + book.availableCopies + '</strong></small>' +
                    statusBadge + '</div>' +
                    '<div class="action-buttons">' +
                    '<button class="btn btn-success btn-action" onclick="adjustCopies(' + book.id + ', 1)">+1</button>' +
                    '<button class="btn btn-warning btn-action" onclick="adjustCopies(' + book.id + ', -1)">-1</button>' +
                    '</div></div></div>';
            }).join('');
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center text-danger">Failed to load inventory</p>';
    }
}

async function adjustCopies(bookId, delta) {
    try {
        // Fetch current list to determine new count
        var response = await fetch(API_BASE_URL + '/admin/inventory', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch inventory');
        var books = await response.json();
        var book = books.find(function(b) { return b.id === bookId; });
        if (!book) { showToast('Book not found', 'error'); return; }

        var newCount = Math.max(0, book.physicalCopies + delta);
        if (newCount < book.activeBorrows) {
            showToast('Cannot reduce below the number of currently borrowed copies (' + book.activeBorrows + ')', 'error');
            return;
        }
        var update = await fetch(API_BASE_URL + '/admin/inventory/' + bookId + '/copies', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ physicalCopies: newCount })
        });
        var data = await update.json();
        if (update.ok) {
            showToast('"' + book.title + '" now has ' + newCount + ' physical copies', 'success');
            loadInventory();
        } else {
            showToast('Failed to update: ' + (data.error || 'unknown error'), 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

// ─── Fine Management ────────────────────────────────────────────────────────
async function loadAdminFines() {
    var container = document.getElementById('admin-fines-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/fines', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch fines');
        var fines = await response.json();
        if (fines.length === 0) { container.innerHTML = '<p class="text-center text-muted">No fines found</p>'; return; }
        
        container.innerHTML = fines.map(function(fine) {
            var statusBadge = 'badge-warning';
            var statusText = fine.status;
            if (fine.status === 'paid') { statusBadge = 'badge-success'; }
            else if (fine.status === 'waived') { statusBadge = 'badge-info'; }
            var warningClass = fine.status === 'unpaid' ? 'warning' : '';
            var waiveBtn = fine.status === 'unpaid' ? '<button class="btn btn-warning btn-action" onclick="waiveFine(' + fine.id + ')">Waive</button>' : '';
            return '<div class="management-item ' + warningClass + '">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>GHS ' + parseFloat(fine.amount).toFixed(2) + '</strong> - ' + (fine.reason || '') + '<br>' +
                '<small>User: ' + fine.username + ' (' + fine.email + ')</small><br>' +
                '<small>Book: ' + (fine.book_title || 'N/A') + '</small><br>' +
                '<small>Issued: ' + new Date(fine.issuedAt).toLocaleDateString() + '</small> ' +
                '<span class="badge ' + statusBadge + '">' + statusText + '</span></div>' +
                '<div class="action-buttons">' + waiveBtn + '</div></div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load fines</p>';
    }
}

async function waiveFine(fineId) {
    showConfirmModal('Are you sure you want to waive this fine?', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/admin/fines/' + fineId + '/waive', { method: 'POST', credentials: 'include' });
            var data = await response.json();
            if (response.ok) { showToast('Fine waived successfully', 'success'); loadAdminFines(); }
            else { showToast('Failed to waive fine: ' + data.error, 'error'); }
        } catch (error) { showToast('Network error. Please try again.', 'error'); }
    }, 'Waive');
}

// ─── User Management ────────────────────────────────────────────────────────
async function loadAdminUsers() {
    var container = document.getElementById('admin-users-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/users', { credentials: 'include' });
        
        var text = await response.text();
        var data;
        try { data = JSON.parse(text); } catch (e) { data = { error: text || ('HTTP ' + response.status) }; }
        if (!response.ok) throw new Error((data && data.error) || ('HTTP ' + response.status));
        var users = data;
        if (users.length === 0) { container.innerHTML = '<p class="text-center text-muted">No users found</p>'; return; }

        var isSeedAdmin = window.currentAdminUser && window.currentAdminUser.username === 'admin';
        var currentUserId = window.currentAdminUser ? window.currentAdminUser.id : null;
        
        container.innerHTML = users.map(function(user) {
            var suspendBtn = (user.role === 'suspended' ? 'Unsuspend' : 'Suspend');
            var buttons = '<button class="btn btn-info btn-action" onclick="viewUserActivity(' + user.id + ')">Activity</button>';
            var isProtectedRow = (user.username === 'admin') || (user.id === currentUserId);
            if (!isProtectedRow) {
                buttons += '<button class="btn btn-warning btn-action" onclick="toggleUserStatus(' + user.id + ", '" + user.role + "')" + '">' + suspendBtn + '</button>';
            }
                

            // Seed admin-only controls (Grant/Revoke/Delete)
            if (isSeedAdmin && user.username !== 'admin') {
                if (user.role !== 'admin') {
                    buttons += '<button class="btn btn-success btn-action" onclick="grantAdminRole(' + user.id + ')">Grant Admin</button>';
                } else {
                    buttons += '<button class="btn btn-revoke btn-action" onclick="revokeAdminRole(' + user.id + ')">Revoke Admin</button>';
                }
                buttons += '<button class="btn btn-danger btn-action" onclick="deleteAdminUser(' + user.id + ", '" + user.username.replace(/'/g, "\\'") + "')" + '">Delete</button>';
            } else if (isSeedAdmin && user.username === 'admin') {
                buttons += '<span class="badge badge-success ml-2">Protected</span>';
            }
            
            return '<div class="management-item">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + user.username + '</strong> (' + user.email + ')<br>' +
                '<small>Role: ' + user.role + '</small> | <small>Joined: ' + new Date(user.created_at).toLocaleDateString() + '</small><br>' +
                '<small>Borrows: ' + (user.total_borrows || 0) + ' | Reviews: ' + (user.total_reviews || 0) + ' | Reservations: ' + (user.total_reservations || 0) + '</small><br>' +
                '<small class="text-muted">Last activity: ' + (user.last_activity ? new Date(user.last_activity).toLocaleString() : 'Never') + '</small></div>' +
                '<div class="action-buttons">' + buttons +
                '</div></div></div>';
        }).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
        container.innerHTML = '<p class="text-center text-danger">Failed to load users' + (error && error.message ? ': ' + error.message : '') + '</p>';
    }
}

async function toggleUserStatus(userId, currentRole) {
    var action = currentRole === 'suspended' ? 'unsuspend' : 'suspend';
    showConfirmModal('Are you sure you want to ' + action + ' this user?', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/admin/users/' + userId + '/suspend', { method: 'POST', credentials: 'include' });
            var data = await response.json();
            if (response.ok) { showToast('User ' + action + 'ed successfully', 'success'); loadAdminUsers(); }
            else { showToast('Failed: ' + data.error, 'error'); }
        } catch (error) { showToast('Network error. Please try again.', 'error'); }
    }, currentRole === 'suspended' ? 'Unsuspend' : 'Suspend');
}

async function viewUserActivity(userId) {
    try {
        var response = await fetch(API_BASE_URL + '/admin/users/' + userId + '/activity', { credentials: 'include' });
        var activity = await response.json().catch(function() { return []; });
        if (!activity || activity.length === 0) { showToast('No activity found for this user', 'info'); return; }
        var lines = activity.map(function(a) {
            var desc = formatActivityDescription(a);
            // formatActivityDescription already escapes HTML
            return '[' + new Date(a.createdAt).toLocaleString() + '] ' + desc;
        });
        var escaped = lines.join('<br>').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        showToast('User Activity (Last 100 actions):<br>' + escaped, 'info', 7000);
    } catch (error) {
        showToast('Failed to load activity: ' + (error && error.message ? error.message : 'unknown error'), 'error');
    }
}

// ─── Activity Log Formatting ────────────────────────────────────────────────
function escapeHtmlText(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatActivityDescription(log) {
    var title = log.bookTitle ? '\u201C' + log.bookTitle + '\u201D' : '';
    var d = (log.details && typeof log.details === 'object') ? log.details : {};
    var desc;

    switch (log.type) {
        case 'borrow':
            desc = 'Borrowed ' + (title || 'a book');
            break;
        case 'return': {
            desc = 'Returned ' + (title || 'a book');
            if (d.returnedBy && d.returnedBy !== 'self') desc += ' (processed by admin ' + d.returnedBy + ')';
            if (d.overdue && d.fine) desc += ' \u2014 was overdue, GHS ' + Number(d.fine).toFixed(2) + ' fine applied';
            break;
        }
        case 'reserve':
            desc = 'Joined the waiting list for ' + (title || 'a book');
            break;
        case 'cancel_reservation':
            desc = 'Cancelled their reservation for ' + (title || 'a book');
            break;
        case 'review':
            desc = 'Reviewed ' + (title || 'a book') +
                (log.rating ? ' \u2014 rated it ' + log.rating + '/5' : '');
            break;
        case 'like':
            desc = 'Liked ' + (title || 'a book');
            break;
        case 'dislike':
            desc = 'Disliked ' + (title || 'a book');
            break;
        case 'create_book':
            desc = 'Added a new book to the library' + (title ? ': ' + title : '');
            break;
        case 'suspicious_activity':
            desc = 'Suspicious activity detected' + (d.reason ? ': ' + d.reason : '');
            break;
        default:
            desc = log.type ? log.type.replace(/_/g, ' ') : 'Unknown action';
            if (title) desc += ': ' + title;
    }
    if (log.text && log.type === 'review') desc += ' \u2014 ' + log.text;
    return escapeHtmlText(desc);
}

// ─── Activity Logs ──────────────────────────────────────────────────────────
async function loadAdminActivityLogs() {
    var container = document.getElementById('admin-activity-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/activity?limit=50', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        var logs = await response.json();
        if (logs.length === 0) { container.innerHTML = '<p class="text-center text-muted">No activity logs found</p>'; return; }
        
        container.innerHTML = logs.map(function(log) {
            var severityClass = log.severity === 'positive' ? 'badge-success' : log.severity === 'suspicious' ? 'badge-warning' : log.severity === 'abusive' ? 'badge-danger' : 'badge-info';
            var description = formatActivityDescription(log);
            var username = escapeHtmlText(log.username || 'Unknown user');
            return '<div class="activity-item">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + username + '</strong> &mdash; ' + description + '<br>' +
                '<small class="text-muted">' + new Date(log.createdAt).toLocaleString() + '</small></div>' +
                '<span class="badge ' + severityClass + '">' + (log.severity || 'neutral') + '</span>' +
                '</div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load activity logs</p>';
    }
}

// ─── Export Functions ────────────────────────────────────────────────────────
function exportUsers() {
    var url = API_BASE_URL + '/admin/export/users';
    window.open(url, '_blank');
}

function exportBooks() {
    var url = API_BASE_URL + '/admin/export/books';
    window.open(url, '_blank');
}

function exportActivityLogs() {
    var url = API_BASE_URL + '/admin/export/transactions';
    window.open(url, '_blank');
}

// ─── Utility ────────────────────────────────────────────────────────────────
function getTimeAgo(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    return 'just now';
}

// ─── View Switching ─────────────────────────────────────────────────────────
function showAdminSection(sectionId, navEl) {
    // Hide all top-level sections
    var sections = ['stats-section', 'charts-section', 'lists-section', 'activity-section', 'add-book-section', 'inventory-section', 'management-section'];
    sections.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Show requested section
    var target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';

    // Update sidebar active state
    if (navEl) {
        document.querySelectorAll('.sidebar-nav a').forEach(function(a) { a.classList.remove('active'); });
        navEl.classList.add('active');
    }

    // Load section-specific data
    if (sectionId === 'stats-section') {
        loadStats();
    }
    if (sectionId === 'charts-section') {
        loadGenreChart();
        loadGrowthChart();
        loadRatingChart();
        loadReviewTrendChart();
    }
    if (sectionId === 'lists-section') {
        loadPopularBooks();
        loadTopReviewers();
    }
    if (sectionId === 'activity-section') {
        loadRecentActivity();
        loadBooksWithoutReviews();
        loadFlaggedActivities();
    }
    if (sectionId === 'inventory-section') {
        loadInventory();
        startInventoryAutoRefresh();
    } else {
        stopInventoryAutoRefresh();
    }
    if (sectionId === 'management-section') {
        // Default to first tab when entering console
        switchManagementTab('reservations');
        loadConsoleSummary();
    }
    if (sectionId === 'add-book-section') {
        // Reset form when entering
        clearAddBookFields();
    }

    // Close sidebar on mobile
    document.getElementById('adminSidebar').classList.remove('sidebar-open');
    document.getElementById('sidebarOverlay').classList.remove('show');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Add Book ───────────────────────────────────────────────────────────────
var addBookCoverFile = null;
var addBookPdfFile = null;

function updateAddBookUploadLabel(inputId, labelId, areaId) {
    var input = document.getElementById(inputId);
    var labelText = document.getElementById(labelId);
    var area = document.getElementById(areaId);
    if (!input || !labelText) return;

    if (input.files && input.files[0]) {
        var file = input.files[0];
        var sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        var sizeStr = sizeMB >= 1 ? sizeMB + ' MB' : (file.size / 1024).toFixed(0) + ' KB';
        labelText.innerHTML = file.name + ' <span style="color:#888;font-size:.8em;">(' + sizeStr + ')</span>';
        labelText.style.color = '#fff';
        if (area) { area.style.borderColor = '#1DB954'; area.style.background = 'rgba(29,185,84,0.08)'; }
    } else {
        var isImage = inputId === 'add-book-cover';
        labelText.textContent = isImage ? 'Click to choose an image…' : 'Click to choose a PDF…';
        labelText.style.color = '';
        if (area) { area.style.borderColor = ''; area.style.background = ''; }
    }
}

function clearAddBookFields() {
    ['add-title', 'add-author', 'add-description', 'add-genres', 'add-book-cover', 'add-book-file', 'add-physical-copies'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    updateAddBookUploadLabel('add-book-cover', 'add-cover-label-text', 'add-cover-upload-area');
    updateAddBookUploadLabel('add-book-file', 'add-pdf-label-text', 'add-pdf-upload-area');
    var msgBox = document.getElementById('add-book-messages');
    if (msgBox) msgBox.innerHTML = '';
}

async function submitAddBook() {
    var title = document.getElementById('add-title').value.trim();
    var author = document.getElementById('add-author').value.trim();
    var description = document.getElementById('add-description').value.trim();
    var genres = document.getElementById('add-genres').value.trim();
    var physicalCopies = Math.max(0, parseInt(document.getElementById('add-physical-copies').value) || 1);
    var coverInput = document.getElementById('add-book-cover');
    var pdfInput = document.getElementById('add-book-file');
    var msgBox = document.getElementById('add-book-messages');
    var addBtn = document.getElementById('add-book-btn');

    // Validation
    var errors = [];
    if (!title) errors.push('Book title is required.');
    if (!author) errors.push('Author name is required.');
    if (!pdfInput.files || !pdfInput.files[0]) errors.push('A PDF book file is required.');
    if (errors.length > 0) {
        msgBox.innerHTML = '<div class="alert alert-danger">' + errors.join('<br>') + '</div>';
        return;
    }

    // Show loading
    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading…';
    msgBox.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Uploading… Please wait.</div>';

    try {
        var formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('description', description);
        formData.append('genres', JSON.stringify(genres.split(',').map(function(g) { return g.trim(); }).filter(Boolean)));
        formData.append('physicalCopies', physicalCopies);
        if (coverInput.files[0]) formData.append('cover', coverInput.files[0]);
        formData.append('bookFile', pdfInput.files[0]);

        var response = await fetch(API_BASE_URL + '/books', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        var data = await response.json().catch(function() { return { error: 'Unknown error' }; });

        if (response.ok) {
            // Clear form fields FIRST (clearAddBookFields also wipes the message box),
            // then show the success message so it is not erased immediately.
            var successMsg = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> <strong>"' + (data.book?.title || title) + '"</strong> added successfully!</div>';
            clearAddBookFields();
            msgBox.innerHTML = successMsg;
            showToast('"' + (data.book?.title || title) + '" added successfully!', 'success');
            setTimeout(function() { if (msgBox.innerHTML === successMsg) msgBox.innerHTML = ''; }, 6000);
        } else {
            msgBox.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> ' + (data.error || 'Failed to add book.') + '</div>';
        }
    } catch (error) {
        msgBox.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Network error. Please try again.</div>';
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>Add Book';
    }
}

// ─── User Management (Seed Admin) ─────────────────────────────────────────
async function grantAdminRole(userId) {
    showConfirmModal('Grant admin role to this user?', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/users/' + userId + '/grant-admin', { method: 'POST', credentials: 'include' });
            if (response.ok) { showToast('Admin role granted.', 'success'); loadAdminUsers(); }
            else { showToast('Failed: ' + await response.text(), 'error'); }
        } catch (error) { showToast('Network error.', 'error'); }
    }, 'Grant');
}

async function revokeAdminRole(userId) {
    showConfirmModal('Revoke admin role from this user?', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/users/' + userId + '/revoke-admin', { method: 'POST', credentials: 'include' });
            if (response.ok) { showToast('Admin role revoked.', 'success'); loadAdminUsers(); }
            else { showToast('Failed: ' + await response.text(), 'error'); }
        } catch (error) { showToast('Network error.', 'error'); }
    }, 'Revoke');
}

async function deleteAdminUser(userId, username) {
    showConfirmModal('Delete user "' + username + '"? This cannot be undone.', async function() {
        try {
            var response = await fetch(API_BASE_URL + '/users/' + userId, { method: 'DELETE', credentials: 'include' });
            if (response.ok) { showToast('User deleted.', 'success'); loadAdminUsers(); }
            else { showToast('Failed: ' + await response.text(), 'error'); }
        } catch (error) { showToast('Network error.', 'error'); }
    }, 'Delete');
}

// ─── Initialize Dashboard ───────────────────────────────────────────────────
async function initDashboard() {
    var isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    // Store current user info for seed-admin checks
    try {
        var userRes = await fetch(API_BASE_URL + '/current-user', { credentials: 'include' });
        if (userRes.ok) window.currentAdminUser = await userRes.json();
    } catch (e) { window.currentAdminUser = null; }

    // Show overview by default
    showAdminSection('stats-section', document.querySelector('.sidebar-nav a.active'));
}

document.addEventListener('DOMContentLoaded', initDashboard);
setInterval(function() { loadStats(); loadGrowthChart(); loadReviewTrendChart(); }, 5 * 60 * 1000);