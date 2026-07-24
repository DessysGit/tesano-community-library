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
    
    var tabMap = { events: 'events-management', reservations: 'reservations-management', borrowing: 'borrowing-management', fines: 'fines-management', users: 'users-management', activity: 'activity-management' };
    var sectionId = tabMap[tab];
    if (sectionId) document.getElementById(sectionId).style.display = 'block';
    
    var activeLink = document.querySelector('#managementTabs .nav-link[onclick*="' + tab + '"]');
    if (activeLink) activeLink.classList.add('active');
    
    if (tab === 'events') loadAdminEvents();
    if (tab === 'reservations') loadAdminReservations();
    if (tab === 'borrowing') loadAdminBorrowing();
    if (tab === 'fines') loadAdminFines();
    if (tab === 'users') loadAdminUsers();
    if (tab === 'activity') loadAdminActivityLogs();
}

// ─── Event Management ───────────────────────────────────────────────────────
async function loadAdminEvents() {
    var container = document.getElementById('events-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/events', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch events');
        var events = await response.json();
        if (events.length === 0) { container.innerHTML = '<p class="text-center text-muted">No events found</p>'; return; }
        
        container.innerHTML = events.map(function(event) {
            return '<div class="management-item">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + event.title + '</strong><p class="mb-1">' + (event.description || '') + '</p><small class="text-muted">Date: ' + new Date(event.eventDate).toLocaleString() + '</small><br><small class="text-muted">Location: ' + (event.location || 'TBA') + '</small><br><small class="text-muted">Created by: ' + event.created_by_name + '</small></div>' +
                '<div class="action-buttons">' +
                '<button class="btn btn-danger btn-action" onclick="deleteAdminEvent(' + event.id + ", '" + event.title.replace(/'/g, "\\'") + "')" + '">Delete</button>' +
                '</div></div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load events</p>';
    }
}

function showCreateEventModal() { $('#createEventModal').modal('show'); }

async function createEvent() {
    var title = document.getElementById('event-title').value.trim();
    var description = document.getElementById('event-description').value.trim();
    var eventDate = document.getElementById('event-date').value;
    var location = document.getElementById('event-location').value.trim();
    var maxAttendees = document.getElementById('event-max-attendees').value;
    
    if (!title || !eventDate) { alert('Title and event date are required'); return; }
    
    try {
        var response = await fetch(API_BASE_URL + '/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: title, description: description, eventDate: eventDate, location: location, maxAttendees: maxAttendees || null })
        });
        var data = await response.json();
        if (response.ok) { alert('Event created successfully!'); $('#createEventModal').modal('hide'); loadAdminEvents(); }
        else { alert('Failed to create event: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
}

async function deleteAdminEvent(eventId, eventTitle) {
    if (!confirm("Are you sure you want to delete \"" + eventTitle + "\"?")) return;
    try {
        var response = await fetch(API_BASE_URL + '/admin/events/' + eventId, { method: 'DELETE', credentials: 'include' });
        var data = await response.json();
        if (response.ok) { alert('Event deleted successfully'); loadAdminEvents(); }
        else { alert('Failed to delete event: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
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
        if (response.ok) { alert('Reservation marked as fulfilled'); loadAdminReservations(); }
        else { alert('Failed to fulfill reservation: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
}

async function cancelAdminReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
        var response = await fetch(API_BASE_URL + '/admin/reservations/' + reservationId, { method: 'DELETE', credentials: 'include' });
        var data = await response.json();
        if (response.ok) { alert('Reservation cancelled'); loadAdminReservations(); }
        else { alert('Failed to cancel reservation: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
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
    if (!confirm('Mark this book as returned?')) return;
    try {
        var response = await fetch(API_BASE_URL + '/admin/borrowing/' + borrowId + '/return', { method: 'POST', credentials: 'include' });
        var data = await response.json();
        if (response.ok) { alert('Book marked as returned'); loadAdminBorrowing(); }
        else { alert('Failed to mark as returned: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
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
    if (!confirm('Are you sure you want to waive this fine?')) return;
    try {
        var response = await fetch(API_BASE_URL + '/admin/fines/' + fineId + '/waive', { method: 'POST', credentials: 'include' });
        var data = await response.json();
        if (response.ok) { alert('Fine waived successfully'); loadAdminFines(); }
        else { alert('Failed to waive fine: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
}

// ─── User Management ────────────────────────────────────────────────────────
async function loadAdminUsers() {
    var container = document.getElementById('admin-users-list');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        var response = await fetch(API_BASE_URL + '/admin/users', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch users');
        var users = await response.json();
        if (users.length === 0) { container.innerHTML = '<p class="text-center text-muted">No users found</p>'; return; }
        
        container.innerHTML = users.map(function(user) {
            var suspendBtn = (user.role === 'suspended' ? 'Unsuspend' : 'Suspend');
            return '<div class="management-item">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + user.username + '</strong> (' + user.email + ')<br>' +
                '<small>Role: ' + user.role + '</small> | <small>Joined: ' + new Date(user.created_at).toLocaleDateString() + '</small><br>' +
                '<small>Borrows: ' + (user.total_borrows || 0) + ' | Reviews: ' + (user.total_reviews || 0) + ' | Reservations: ' + (user.total_reservations || 0) + '</small><br>' +
                '<small class="text-muted">Last activity: ' + (user.last_activity ? new Date(user.last_activity).toLocaleString() : 'Never') + '</small></div>' +
                '<div class="action-buttons">' +
                '<button class="btn btn-info btn-action" onclick="viewUserActivity(' + user.id + ')">Activity</button>' +
                '<button class="btn btn-warning btn-action" onclick="toggleUserStatus(' + user.id + ", '" + user.role + "')" + '">' + suspendBtn + '</button>' +
                '</div></div></div>';
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load users</p>';
    }
}

async function toggleUserStatus(userId, currentRole) {
    var action = currentRole === 'suspended' ? 'unsuspend' : 'suspend';
    if (!confirm('Are you sure you want to ' + action + ' this user?')) return;
    try {
        var response = await fetch(API_BASE_URL + '/admin/users/' + userId + '/suspend', { method: 'POST', credentials: 'include' });
        var data = await response.json();
        if (response.ok) { alert('User ' + action + 'ed successfully'); loadAdminUsers(); }
        else { alert('Failed: ' + data.error); }
    } catch (error) { alert('Network error. Please try again.'); }
}

async function viewUserActivity(userId) {
    var response = await fetch(API_BASE_URL + '/admin/users/' + userId + '/activity', { credentials: 'include' });
    var activity = await response.json().catch(function() { return []; });
    var lines = activity.map(function(a) { return '[' + new Date(a.createdAt).toLocaleString() + '] ' + a.type + ': ' + (a.bookTitle || a.text || ''); });
    alert('User Activity (Last 100 actions):\n\n' + (lines.join('\n') || 'No activity found'));
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
            return '<div class="activity-item">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div><strong>' + log.username + '</strong> - ' + log.type.replace(/_/g, ' ') + '<br>' +
                '<small class="text-muted">' + new Date(log.createdAt).toLocaleString() + '</small>' +
                (log.bookTitle ? '<br><small>Book: ' + log.bookTitle + '</small>' : '') + '</div>' +
                '<span class="badge ' + severityClass + '">' + log.severity + '</span>' +
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

// ─── Initialize Dashboard ───────────────────────────────────────────────────
async function initDashboard() {
    var isAdmin = await checkAdminAccess();
    if (!isAdmin) return;
    
    loadStats();
    loadGenreChart();
    loadGrowthChart();
    loadRatingChart();
    loadReviewTrendChart();
    loadPopularBooks();
    loadRecentActivity();
    loadTopReviewers();
    loadBooksWithoutReviews();
    loadFlaggedActivities();
}

document.addEventListener('DOMContentLoaded', initDashboard);
setInterval(function() { loadStats(); loadGrowthChart(); loadReviewTrendChart(); }, 5 * 60 * 1000);