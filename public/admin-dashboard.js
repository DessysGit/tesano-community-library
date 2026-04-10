/**
 * Enhanced Admin Dashboard JavaScript
 * Handles data fetching and chart rendering with advanced analytics
 */

const API_BASE_URL = (() => {
    const h = window.location.hostname;
    return (h === 'localhost' || h === '127.0.0.1')
        ? ''
        : 'https://library-backend-j90e.onrender.com';
})();

// ─── JWT Auto-Inject ───────────────────────────────────────────────────────
// Same interceptor as script.js — automatically attaches the stored JWT to
// every fetch that targets the Render backend, so no individual call needs
// to worry about auth headers.
(function injectJwtOnBackendRequests() {
    const _fetch = window.fetch;
    window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input
            : (input instanceof Request ? input.url : String(input));
        const isBackendCall = API_BASE_URL
            ? url.startsWith(API_BASE_URL)
            : url.startsWith('/');
        if (isBackendCall) {
            const token = localStorage.getItem('authToken');
            if (token) {
                init.headers = Object.assign(
                    { 'Authorization': `Bearer ${token}` },
                    init.headers || {}
                );
            }
        }
        return _fetch.call(this, input, init);
    };
})();

// Chart instances
let genreChart = null;
let growthChart = null;
let ratingChart = null;
let reviewTrendChart = null;

// Current time filter
let currentTimeFilter = 'all';

// Check if user is admin
async function checkAdminAccess() {
    try {
        const response = await fetch(`${API_BASE_URL}/current-user`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'index.html';
            return false;
        }
        
        const user = await response.json();
        
        if (user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// Set time filter
function setTimeFilter(filter) {
    currentTimeFilter = filter;
    
    // Update button states - Remove active from all buttons first
    document.querySelectorAll('.time-filter-inline .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Reload only the data that uses time filters
    loadStats();
    loadGrowthChart();
    loadReviewTrendChart();
}

// Fetch and display overall statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/stats?timeFilter=${currentTimeFilter}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();
        
        // Update stat cards with animation
        animateValue('total-users', 0, stats.totalUsers || 0, 1000);
        animateValue('total-books', 0, stats.totalBooks || 0, 1000);
        animateValue('total-reviews', 0, stats.totalReviews || 0, 1000);
        animateValue('active-users', 0, stats.activeUsers || 0, 1000);
        
        // Update change indicators
        const usersChange = document.getElementById('users-change');
        const booksChange = document.getElementById('books-change');
        
        if (stats.recentUsers > 0) {
            usersChange.classList.add('positive');
            usersChange.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${stats.recentUsers} this month</span>`;
        } else {
            usersChange.classList.remove('positive');
            usersChange.innerHTML = `<i class="fas fa-minus"></i> <span>No new users</span>`;
        }
        
        if (stats.recentBooks > 0) {
            booksChange.classList.add('positive');
            booksChange.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${stats.recentBooks} this month</span>`;
        } else {
            booksChange.classList.remove('positive');
            booksChange.innerHTML = `<i class="fas fa-minus"></i> <span>No new books</span>`;
        }
        
        // Update average rating
        document.getElementById('avg-rating').textContent = 
            `Avg: ${(stats.averageRating || 0).toFixed(1)} ⭐`;
        
        // Update last updated time
        const now = new Date();
        document.getElementById('last-updated').textContent = 
            `Last updated: ${now.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load statistics');
    }
}

// Animate number counting
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// Load and render genre distribution chart
async function loadGenreChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/genre-stats`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch genre stats');
        
        const genres = await response.json();
        
        const ctx = document.getElementById('genreChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (genreChart) {
            genreChart.destroy();
        }
        
        if (genres.length === 0) {
            document.getElementById('genreChart').parentElement.innerHTML = 
                '<p class="text-center text-muted">No genre data available</p>';
            return;
        }
        
        genreChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: genres.map(g => g.genre),
                datasets: [{
                    data: genres.map(g => g.count),
                    backgroundColor: [
                        '#1DB954', '#667eea', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                        '#ffc107', '#17a2b8', '#764ba2', '#fa709a'
                    ],
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
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 11
                            },
                            color: '#fff'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} books (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading genre chart:', error);
        document.getElementById('genreChart').parentElement.innerHTML = 
            '<p class="text-center text-muted">Failed to load chart</p>';
    }
}

// Load and render growth chart (Users + Books over time)
async function loadGrowthChart() {
    try {
        // Check if canvas exists
        const canvas = document.getElementById('growthChart');
        if (!canvas) {
            console.log('Growth chart canvas not found, skipping...');
            return;
        }
        
        const [usersResponse, booksResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/analytics/user-activity?timeFilter=${currentTimeFilter}`, {
                credentials: 'include'
            }),
            fetch(`${API_BASE_URL}/analytics/book-uploads?timeFilter=${currentTimeFilter}`, {
                credentials: 'include'
            })
        ]);
        
        if (!usersResponse.ok || !booksResponse.ok) {
            throw new Error('Failed to fetch growth data');
        }
        
        const userActivity = await usersResponse.json();
        const bookUploads = await booksResponse.json();
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (growthChart) {
            growthChart.destroy();
        }
        
        // Handle empty data
        if (userActivity.length === 0 && bookUploads.length === 0) {
            const container = canvas.parentElement;
            if (container) {
                container.innerHTML = '<p class="text-center text-muted">No growth data available for selected time period</p>';
            }
            return;
        }
        
        // Merge and sort dates
        const allDates = [...new Set([
            ...userActivity.map(a => a.date),
            ...bookUploads.map(b => b.date)
        ])].sort();
        
        // Create data arrays
        const userData = allDates.map(date => {
            const entry = userActivity.find(a => a.date === date);
            return entry ? entry.count : 0;
        });
        
        const bookData = allDates.map(date => {
            const entry = bookUploads.find(b => b.date === date);
            return entry ? entry.count : 0;
        });
        
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allDates.map(date => new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                })),
                datasets: [{
                    label: 'New Users',
                    data: userData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, {
                    label: 'New Books',
                    data: bookData,
                    borderColor: '#1DB954',
                    backgroundColor: 'rgba(29, 185, 84, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#1DB954',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#fff',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#aaa'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading growth chart:', error);
        const canvas = document.getElementById('growthChart');
        if (canvas && canvas.parentElement) {
            canvas.parentElement.innerHTML = 
                '<p class="text-center text-muted">Failed to load chart</p>';
        }
    }
}

// Load and render rating distribution chart
async function loadRatingChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/rating-distribution`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch rating distribution');
        
        const ratings = await response.json();
        
        const ctx = document.getElementById('ratingChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (ratingChart) {
            ratingChart.destroy();
        }
        
        // Create array for all ratings 1-5
        const ratingData = [1, 2, 3, 4, 5].map(rating => {
            const found = ratings.find(r => r.rating === rating);
            return found ? found.count : 0;
        });
        
        ratingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['⭐ 1 Star', '⭐⭐ 2 Stars', '⭐⭐⭐ 3 Stars', '⭐⭐⭐⭐ 4 Stars', '⭐⭐⭐⭐⭐ 5 Stars'],
                datasets: [{
                    label: 'Number of Reviews',
                    data: ratingData,
                    backgroundColor: [
                        '#ff6b6b',
                        '#ffa502',
                        '#ffc107',
                        '#26de81',
                        '#20bf6b'
                    ],
                    borderColor: '#0f0f0f',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                                return `${context.parsed.y} reviews (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#aaa'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading rating chart:', error);
        document.getElementById('ratingChart').parentElement.innerHTML = 
            '<p class="text-center text-muted">Failed to load chart</p>';
    }
}

// Load and render review trend chart
async function loadReviewTrendChart() {
    try {
        // Check if canvas exists
        const canvas = document.getElementById('reviewTrendChart');
        if (!canvas) {
            console.log('Review trend chart canvas not found, skipping...');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/analytics/review-trends?timeFilter=${currentTimeFilter}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch review trends');
        
        const trends = await response.json();
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (reviewTrendChart) {
            reviewTrendChart.destroy();
        }
        
        if (trends.length === 0) {
            const container = canvas.parentElement;
            if (container) {
                container.innerHTML = 
                    '<p class="text-center text-muted">No review data available for selected time period</p>';
            }
            return;
        }
        
        reviewTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.map(t => new Date(t.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                })),
                datasets: [{
                    label: 'Reviews Posted',
                    data: trends.map(t => t.count),
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
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#aaa'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading review trend chart:', error);
        const canvas = document.getElementById('reviewTrendChart');
        if (canvas && canvas.parentElement) {
            canvas.parentElement.innerHTML = 
                '<p class="text-center text-muted">Failed to load chart</p>';
        }
    }
}

// Load popular books
async function loadPopularBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/popular-books`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch popular books');
        
        const books = await response.json();
        
        const container = document.getElementById('popular-books');
        
        if (books.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No books found</p>';
            return;
        }
        
        container.innerHTML = books.slice(0, 10).map((book, index) => `
            <div class="book-card">
                <img src="${book.cover || 'https://via.placeholder.com/60x90?text=No+Cover'}" 
                     alt="${book.title}" 
                     onerror="this.src='https://via.placeholder.com/60x90?text=No+Cover'">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${index + 1}. ${book.title}</h6>
                    <p class="mb-1 text-muted small">by ${book.author}</p>
                    <div class="d-flex align-items-center">
                        <span class="badge badge-success mr-2">
                            ${book.reviewCount} reviews
                        </span>
                        <span class="badge badge-warning">
                            ⭐ ${(book.avgRating || 0).toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading popular books:', error);
        document.getElementById('popular-books').innerHTML = 
            '<p class="text-center text-danger">Failed to load popular books</p>';
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/recent-activity`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch recent activity');
        
        const activities = await response.json();
        
        const container = document.getElementById('recent-activity');
        
        if (activities.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No recent activity</p>';
            return;
        }
        
        container.innerHTML = activities.map(activity => {
            const date = new Date(activity.createdAt);
            const timeAgo = getTimeAgo(date);
            
            let content = '';
            let iconClass = 'fa-info-circle';
            let iconColor = '#1DB954';
            
            if (activity.type === 'review') {
                content = `
                    <strong style="color: #1DB954;">${activity.username}</strong> reviewed 
                    <em style="color: #4facfe;">${activity.book_title}</em>
                    <div class="mt-1">
                        <span class="badge badge-warning">⭐ ${activity.rating}/5</span>
                        <small class="text-muted ml-2">${timeAgo}</small>
                    </div>
                `;
                iconClass = 'fa-star';
                iconColor = '#ffc107';
            } else if (activity.type === 'user') {
                content = `
                    New user <strong style="color: #1DB954;">${activity.username}</strong> joined
                    <div class="mt-1">
                        <small class="text-muted">${timeAgo}</small>
                    </div>
                `;
                iconClass = 'fa-user-plus';
                iconColor = '#667eea';
            } else if (activity.type === 'book') {
                content = `
                    New book added: <em style="color: #4facfe;">${activity.title}</em> by ${activity.author}
                    <div class="mt-1">
                        <small class="text-muted">${timeAgo}</small>
                    </div>
                `;
                iconClass = 'fa-book';
                iconColor = '#f093fb';
            }
            
            return `
                <div class="activity-item">
                    <div class="d-flex align-items-start">
                        <div style="margin-right: 15px;">
                            <i class="fas ${iconClass}" style="color: ${iconColor}; font-size: 20px;"></i>
                        </div>
                        <div class="flex-grow-1">
                            ${content}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recent-activity').innerHTML = 
            '<p class="text-center text-danger">Failed to load activity</p>';
    }
}

// Load top reviewers
async function loadTopReviewers() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/top-reviewers`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch top reviewers');
        
        const reviewers = await response.json();
        
        const container = document.getElementById('top-reviewers');
        
        if (reviewers.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No reviewers yet</p>';
            return;
        }
        
        container.innerHTML = reviewers.map((reviewer, index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = index < 3 ? medals[index] : `#${index + 1}`;
            
            return `
            <div class="d-flex align-items-center justify-content-between mb-3 p-3 rounded"
                 style="background: rgba(40, 40, 40, 0.6); border-left: 4px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#1DB954'};">
                <div class="d-flex align-items-center">
                    <div class="mr-3">
                        <span style="font-size: 1.5rem;">
                            ${medal}
                        </span>
                    </div>
                    <div>
                        <h6 class="mb-0" style="color: #1DB954;">${reviewer.username}</h6>
                        <small class="text-muted">${reviewer.email}</small>
                    </div>
                </div>
                <div class="text-right">
                    <div><strong style="color: #fff;">${reviewer.reviewCount}</strong> <small class="text-muted">reviews</small></div>
                    <small class="text-muted">Avg: ${reviewer.avgRating} ⭐</small>
                </div>
            </div>
        `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading top reviewers:', error);
        document.getElementById('top-reviewers').innerHTML = 
            '<p class="text-center text-danger">Failed to load top reviewers</p>';
    }
}

// Load books without reviews
async function loadBooksWithoutReviews() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/books-without-reviews`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch books without reviews');
        
        const books = await response.json();
        
        const container = document.getElementById('books-without-reviews');
        
        if (books.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: #1DB954;">All books have reviews! 🎉</p>';
            return;
        }
        
        container.innerHTML = books.map(book => {
            return `
            <div class="book-card">
                <img src="${book.cover || 'https://via.placeholder.com/60x90?text=No+Cover'}" 
                     alt="${book.title}"
                     onerror="this.src='https://via.placeholder.com/60x90?text=No+Cover'">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${book.title}</h6>
                    <p class="mb-0 text-muted small">by ${book.author}</p>
                    <small class="text-warning">
                        <i class="fas fa-exclamation-triangle"></i> Needs reviews
                    </small>
                </div>
            </div>
        `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading books without reviews:', error);
        document.getElementById('books-without-reviews').innerHTML = 
            '<p class="text-center text-danger">Failed to load books</p>';
    }
}

// Utility function to calculate time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
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

// Show error message
function showError(message) {
    console.error(message);
}

// Initialize dashboard
async function initDashboard() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;
    
    // Load all data
    await Promise.all([
        loadStats(),
        loadGenreChart(),
        loadGrowthChart(),
        loadRatingChart(),
        loadReviewTrendChart(),
        loadPopularBooks(),
        loadRecentActivity(),
        loadTopReviewers(),
        loadBooksWithoutReviews()
    ]);
}

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', initDashboard);

// Refresh data every 5 minutes
setInterval(initDashboard, 5 * 60 * 1000);
