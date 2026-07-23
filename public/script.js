// Automatic API URL detection based on current environment
const API_BASE_URL = (() => {
  const currentHost = window.location.hostname;
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
  const isNetlify = currentHost.includes('netlify.app');
  
  if (isLocalhost) {
    // Local development
    return ''; // Same origin for local development
  } else if (isNetlify || window.location.protocol === 'https:') {
    // Production (Netlify or any HTTPS site)
    return 'https://library-backend-j90e.onrender.com';
  } else {
    // Fallback to Render for HTTP sites
    return 'https://library-backend-j90e.onrender.com';
  }
})();

// ─── JWT Auto-Inject & 401 Handler ─────────────────────────────────────────
// Intercept every fetch() call. If the request targets our Render backend,
// automatically attach the stored JWT as an Authorization header.
// Also handles 401 responses globally — if the token is expired/invalid,
// clear it and redirect to auth page.
let _sessionExpiredRedirecting = false; // prevents parallel 401s from each triggering a redirect
(function injectJwtOnBackendRequests() {
  const _fetch = window.fetch;
  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    const isBackendCall = API_BASE_URL && url.startsWith(API_BASE_URL);
    if (isBackendCall) {
      const token = localStorage.getItem('authToken');
      if (token) {
        init.headers = Object.assign({ 'Authorization': `Bearer ${token}` }, init.headers || {});
      }
    }
    return _fetch.call(this, input, init).then(response => {
      if (isBackendCall && response.status === 401 && !_sessionExpiredRedirecting) {
        const currentPage = window.location.pathname.split('/').pop();
        // Skip redirect when already on auth page or when the endpoint itself
        // legitimately returns 401 (wrong password, unverified email, etc.)
        const isAuthEndpoint = url.endsWith('/login') || url.endsWith('/register') ||
                               url.endsWith('/resend-verification');
        if (currentPage !== 'auth.html' && !isAuthEndpoint) {
          _sessionExpiredRedirecting = true;
          localStorage.removeItem('authToken');
          localStorage.removeItem('authState');
          localStorage.removeItem('userData');
          // showToast is defined later in this file so guard with typeof
          if (typeof showToast === 'function') {
            showToast('Your session has expired. Please sign in again.', 'info', 2500);
          }
          // Short delay so the user sees the message before the redirect fires
          setTimeout(() => window.location.replace('auth.html'), 2000);
        }
      }
      return response;
    });
  };
})();

// Define the seed admin username
const seedAdminUsername = 'admin';

// Initialize user role
let userRole = "";

// Ensure the necessary elements are hidden on initial load
document.addEventListener('DOMContentLoaded', async () => {    
    // Show loading state initially
    showLoadingState();
    
    // Hide all content initially to prevent flash
    const allSections = document.querySelectorAll('#search-books, #newsletter-section, #footer, #main-content, #hamburger-button, #chat-icon');
    allSections.forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    try {
        // Check authentication status
        const authCheckPromise = checkAuthStatus();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth check timeout')), 10000)
        );

        let isAuthenticated = false;
        try {
            isAuthenticated = await Promise.race([authCheckPromise, timeoutPromise]);
        } catch (error) {
            console.error('Auth check failed or timed out:', error);
            isAuthenticated = false;
        }
        
        // Hide loading state
        hideLoadingState();
        
        if (!isAuthenticated) {
            // User is not authenticated - redirect to auth page immediately
            window.location.replace('auth.html');
            return;
        }
        
        // User is authenticated - show main app
        const hamburgerButton = document.getElementById('hamburger-button');
        const searchBooksSection = document.getElementById('search-books');
        const newsletterSection = document.getElementById('newsletter-section');
        const mainContent = document.getElementById('main-content');
        const footer = document.getElementById('footer');
        const chatIcon = document.getElementById('chat-icon');
        
        if (hamburgerButton) hamburgerButton.style.display = 'block';
        if (searchBooksSection) searchBooksSection.style.display = 'block';
        if (newsletterSection) newsletterSection.style.display = 'block';
        if (mainContent) mainContent.style.display = 'block';
        if (footer) footer.style.display = 'block';
        if (chatIcon) chatIcon.style.display = 'block';
        
        // Fetch books if on main page
        const titleInput = document.getElementById('search-title');
        if (titleInput) {
            try {
                await fetchBooks();
            } catch (error) {
                console.error('Error fetching books:', error);
            }
        }
        
    } catch (error) {
        console.error('Critical error during initialization:', error);
        hideLoadingState();
        // Redirect to auth page on error
        window.location.replace('auth.html');
        return;
    }

    // Set up the outside click listener for the sidebar
    setupOutsideClickListener();
});

// Function to show loading spinner on button
function showButtonSpinner(buttonElement, originalText) {
    buttonElement.disabled = true;
    buttonElement.classList.add('loading');
    buttonElement.setAttribute('data-original-text', originalText);
    buttonElement.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Processing...
    `;
}

// Function to hide loading spinner on button
function hideButtonSpinner(buttonElement) {
    if (!buttonElement) return;
    buttonElement.disabled = false;
    buttonElement.classList.remove('loading');
    const originalText = buttonElement.getAttribute('data-original-text') || 'Submit';
    buttonElement.innerHTML = originalText;
    buttonElement.removeAttribute('data-original-text');
}

// Function to show loading state overlay
function showLoadingState() {
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loader"></div>
                <p>Loading...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
}

// Function to hide loading state overlay
function hideLoadingState() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Helper: get auth headers with JWT token if available
function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Function to check if the user is logged in
function isUserLoggedIn() {
    return localStorage.getItem('authToken') !== null;
}

// Function to handle login
async function login() {
    const emailOrUsername = document.getElementById('login-email-username').value.trim();
    const password = document.getElementById('login-password').value;
    const loginButton = document.querySelector('#login-form .btn-primary');

    document.getElementById('login-messages').innerHTML = '';

    if (!emailOrUsername || !password) {
        displayMessage('login-messages', 'Please fill in all fields', 'error');
        return;
    }

    showButtonSpinner(loginButton, 'Sign In');

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ emailOrUsername, password })
        });

        if (response.ok) {
            const user = await response.json();
            userRole = user.role;
            window.currentUsername = user.username;
            await initializeChatbot();

            const hamburgerButton = document.getElementById('hamburger-button');
            const searchBooksSection = document.getElementById('search-books');
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const resendModal = document.getElementById('resend-verification-modal');
            const newsletterSection = document.getElementById('newsletter-section');
            const mainContent = document.getElementById('main-content');
            const footer = document.getElementById('footer');

            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'none';
            if (resendModal) resendModal.style.display = 'none';
            if (hamburgerButton) hamburgerButton.style.display = 'block';
            if (searchBooksSection) searchBooksSection.style.display = 'block';
            if (newsletterSection) newsletterSection.style.display = 'block';
            if (mainContent) mainContent.style.display = 'block';
            if (footer) footer.style.display = 'block';

            if (userRole === 'admin') {
                const sidebarAdminControls = document.getElementById('sidebar-admin-controls');
                if (sidebarAdminControls) sidebarAdminControls.style.display = 'block';
                const addBookLink = document.getElementById('add-book-link');
                const manageUsersLink = document.getElementById('manage-users-link');
                if (addBookLink) addBookLink.style.display = 'block';
                if (manageUsersLink) manageUsersLink.style.display = 'block';
            }

            const burgerUsername = document.getElementById('burger-username');
            if (burgerUsername) burgerUsername.innerText = user.username;

            await new Promise(resolve => setTimeout(resolve, 500));
            try { await refreshProfilePicture(); } catch (e) {}

            fetchBooks();
            const chatIcon = document.getElementById('chat-icon');
            if (chatIcon) chatIcon.style.display = 'block';
            document.getElementById('login-email-username').value = '';
            document.getElementById('login-password').value = '';

        } else {
            const data = await response.json();
            let errorMessage = data.error || data.message || 'Login failed';
            if (data.error === 'Email not verified') {
                errorMessage = data.message + `<br><small><a href="#" onclick="showResendVerificationWithEmail('${data.userEmail}')">Click here to resend verification email</a></small>`;
            }
            displayMessage('login-messages', errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        displayMessage('login-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(loginButton);
    }
}

// Show resend verification form
function showResendVerification() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const resendModal = document.getElementById('resend-verification-modal');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (resendModal) resendModal.style.display = 'block';
    document.getElementById('resend-messages').innerHTML = '';
}

// Hide resend verification form
function hideResendVerification() {
    const resendModal = document.getElementById('resend-verification-modal');
    const loginForm = document.getElementById('login-form');
    if (resendModal) resendModal.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    document.getElementById('resend-email').value = '';
    document.getElementById('resend-messages').innerHTML = '';
}

// Resend verification email
async function resendVerification() {
    const email = document.getElementById('resend-email').value.trim();
    const resendButton = document.querySelector('#resend-verification-modal .btn-success');
    document.getElementById('resend-messages').innerHTML = '';

    if (!email) { displayMessage('resend-messages', 'Email is required', 'error'); return; }
    if (!isValidEmail(email)) { displayMessage('resend-messages', 'Please enter a valid email address', 'error'); return; }

    showButtonSpinner(resendButton, 'Resend Verification');
    try {
        const response = await fetch(`${API_BASE_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            displayMessage('resend-messages', data.message, 'success');
            document.getElementById('resend-email').value = '';
            setTimeout(() => {
                displayMessage('resend-messages',
                    data.message + '<br><br><strong>Remember:</strong><br>• Check your spam folder<br>• The link expires in 24 hours',
                    'success');
            }, 2000);
            setTimeout(() => {
                hideResendVerification();
                displayMessage('login-messages', 'Verification email sent! Please check your email and click the link.', 'info');
            }, 6000);
        } else {
            displayMessage('resend-messages', data.message || data.error || 'Failed to resend verification email', 'error');
        }
    } catch (error) {
        displayMessage('resend-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(resendButton);
    }
}

// Function to handle logout
async function logout() {
    try {
        // Clear session cookie by calling logout endpoint
        await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
        console.error('Logout API error:', error);
    }

    // Clear all stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('authState');
    localStorage.removeItem('userData');
    localStorage.removeItem(`book-${window.currentBookId}-reaction`);

    // Hide all main content sections
    const ids = ['hamburger-button','search-books','manage-users-link','add-book-link',
        'admin-button','admin-section','profile-section','add-book-section',
        'newsletter-section','main-content','footer','chat-icon'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

    // Show login form
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';

    // Clear dynamic content
    const bookList = document.getElementById('book-list');
    const pagination = document.getElementById('pagination');
    if (bookList) bookList.innerHTML = '';
    if (pagination) pagination.innerHTML = '';

    // Close sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) sidebar.classList.remove('active');

    // Clear profile pictures
    const profilePicture = document.getElementById('profile-picture');
    const burgerProfilePicture = document.getElementById('burger-profile-picture');
    if (profilePicture) profilePicture.src = '';
    if (burgerProfilePicture) burgerProfilePicture.src = '';

    // Reset user state
    userRole = '';
    window.currentUsername = '';

    // Redirect to auth page
    window.location.href = 'auth.html';
}

function closeMenuOnClickOutside(event) {
    const sidebar = document.getElementById('sidebar');
    const hamburgerButton = document.getElementById('hamburger-button');
    if (!sidebar.contains(event.target) && !hamburgerButton.contains(event.target)) {
        sidebar.classList.remove('active');
        document.removeEventListener('click', closeMenuOnClickOutside);
    }
}

function setupOutsideClickListener() {
    document.addEventListener('click', (event) => {
        const sidebar = document.getElementById('sidebar');
        const hamburgerButton = document.getElementById('hamburger-button');
        if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(event.target) && !hamburgerButton.contains(event.target)) {
                sidebar.classList.remove('active');
                document.removeEventListener('click', closeMenuOnClickOutside);
            }
        }
    });
}

// Function to handle newsletter subscription
async function subscribeNewsletter(event) {
    event.preventDefault();
    const emailInput = document.getElementById('subscription-email');
    const email      = emailInput.value.trim();
    const btn        = document.getElementById('subscribe-btn');
    const msgBox     = 'newsletter-messages';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        displayMessage(msgBox, 'Please enter a valid email address.', 'error');
        return;
    }

    showButtonSpinner(btn, 'Subscribe');
    document.getElementById(msgBox).innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (response.ok) {
            displayMessage(msgBox, '✅ Subscribed successfully! Check your inbox.', 'success');
            emailInput.value = '';
        } else {
            const errorMessage = await response.text();
            displayMessage(msgBox, 'Failed to subscribe: ' + errorMessage, 'error');
        }
    } catch (error) {
        displayMessage(msgBox, 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(btn);
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        refreshProfilePicture();
        document.addEventListener('click', closeMenuOnClickOutside);
    } else {
        document.removeEventListener('click', closeMenuOnClickOutside);
    }
}

async function showSection(sectionId) {
    const sections = document.querySelectorAll('#register-form, #login-form, #search-books, #profile-section, #admin-section, #add-book-section, #membership-section, #borrowing-section, #reservations-section, #fines-section, #challenges-section, #events-section, .newsletter-section');
    sections.forEach(section => {
        if (section) section.style.display = section.id === sectionId ? 'block' : 'none';
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (sectionId === 'search-books') {
        fetchBooks();
    } else {
        const searchTitle = document.getElementById('search-title');
        const searchAuthor = document.getElementById('search-author');
        const searchGenre = document.getElementById('search-genre');
        const bookList = document.getElementById('book-list');
        const pagination = document.getElementById('pagination');
        if (searchTitle) searchTitle.value = '';
        if (searchAuthor) searchAuthor.value = '';
        if (searchGenre) searchGenre.value = '';
        if (bookList) bookList.innerHTML = '';
        if (pagination) pagination.innerHTML = '';
    }

    const footer = document.getElementById('footer');
    const newsletterSection = document.getElementById('newsletter-section');
    if (sectionId === 'search-books') {
        if (footer) footer.style.display = 'block';
        if (newsletterSection) newsletterSection.style.display = 'block';
    } else {
        if (footer) footer.style.display = 'none';
        if (newsletterSection) newsletterSection.style.display = 'none';
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) sidebar.classList.remove('active');

    if (sectionId === 'admin-section') fetchUsers();
    if (sectionId === 'profile-section') {
        loadProfileData();
        await refreshProfilePicture();
    }

    if (sectionId === 'add-book-section' && userRole !== 'admin') {
        showToast('You do not have access to this section.', 'error');
        showSection('search-books');
    }

    if (sectionId === 'membership-section') {
        checkMembershipStatus();
    }

    if (sectionId === 'borrowing-section') {
        loadBorrowedBooks();
    }

    if (sectionId === 'reservations-section') {
        loadMyReservations();
    }

    if (sectionId === 'fines-section') {
        loadMyFines();
    }

    if (sectionId === 'challenges-section') {
        loadChallenges();
    }

    if (sectionId === 'events-section') {
        loadEvents();
    }

    const addBookMessages = document.getElementById('add-book-messages');
    if (addBookMessages) addBookMessages.innerHTML = '';
}

function truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text || '';
    let truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) truncated = truncated.substring(0, lastSpaceIndex);
    return truncated + '...';
}

async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, options);
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error.message);
        showToast('An error occurred: ' + error.message, 'error');
        throw error;
    }
}

async function fetchBooks(query = '', page = 1) {
    const titleInput  = document.getElementById('search-title');
    const authorInput = document.getElementById('search-author');
    const genreInput  = document.getElementById('search-genre');
    if (!titleInput || !authorInput || !genreInput) return;

    const title  = titleInput.value;
    const author = authorInput.value;
    const genre  = genreInput.value;
    const limit  = 10;
    const searchQuery = `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&genre=${encodeURIComponent(genre)}&page=${page}&limit=${limit}`;

    const searchingMsg = document.getElementById('searching-msg');
    if (searchingMsg) searchingMsg.style.display = 'block';

    try {
        showLoadingSpinner();
        const response = await fetch(`${API_BASE_URL}/books?${searchQuery}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const books = data.books || [];
        const totalPages = Math.ceil((data.total || 0) / limit);
        const bookList = document.getElementById('book-list');
        const pagination = document.getElementById('pagination');
        const noResultsMessage = document.getElementById('no-results-message');

        if (noResultsMessage) noResultsMessage.style.display = books.length === 0 ? 'block' : 'none';

        if (bookList) {
            bookList.innerHTML = '';
            books.forEach(book => {
                let coverUrl = book.cover || '';
                if (coverUrl && coverUrl.startsWith('/uploads/')) coverUrl = API_BASE_URL + coverUrl;

                const bookItem = document.createElement('div');
                bookItem.classList.add('book-item');
                bookItem.id = `book-${book.id}`;
                bookItem.innerHTML = `
                    ${userRole === 'admin' ? `
                        <div class="delete-action">
                            <button class="btn btn-danger btn-sm" onclick="confirmDeleteBook(${book.id}, '${(book.title || '').replace(/'/g, "\\'")}')">Delete</button>
                        </div>
                    ` : ''}
                    <img src="${coverUrl || '/default-book-cover.png'}" alt="Cover Image" onerror="this.src='/default-book-cover.png'">
                    <div class="details">
                        <div class="details-content">
                            <div class="main-info">
                                <h5>${book.title || 'No Title'}</h5>
                                <p><strong>Author: </strong> ${book.author || 'Unknown'}</p>
                                <p class="description-text" title="${book.description || ''}">${book.description || 'No description available'}</p>
                            </div>
                        </div>
                    <div class="like-dislike-ratings">
                        <div class="like-dislike-buttons">
                            <button class="like-button" onclick="handleLikeDislike(${book.id}, 'like')">👍 ${book.likes || 0}</button>
                            <button class="dislike-button" onclick="handleLikeDislike(${book.id}, 'dislike')">👎 ${book.dislikes || 0}</button>
                        </div>
                        ${book.hasPhysicalCopy ? `
                            <button class="btn btn-success btn-sm borrow-btn" onclick="borrowBook(${book.id})" title="Borrow physical copy from library">
                                <i class="fas fa-book-reader"></i> Borrow
                            </button>
                        ` : ''}
                        ${book.hasDigitalCopy ? `
                            <button class="btn btn-info btn-sm download-btn" onclick="showBookDetails(${book.id})" title="Download digital copy">
                                <i class="fas fa-download"></i> Download
                            </button>
                        ` : ''}
                        ${!book.hasPhysicalCopy && !book.hasDigitalCopy ? `
                            <button class="btn btn-secondary btn-sm" onclick="showBookDetails(${book.id})" title="View details">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        ` : ''}
                        <div class="ratings">
                            <span><i class="fas fa-star text-warning"></i> ${book.averageRating ? book.averageRating.toFixed(1) : 'N/A'} (${book.totalRatings || 0} ratings)</span>
                        </div>
                    </div>
                    </div>
                `;
                bookList.appendChild(bookItem);
                updateLikeDislikeUI(book.id, book.likes || 0, book.dislikes || 0, getUserAction(book.id));
            });
        }

        if (pagination) {
            pagination.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const pageItem = document.createElement('li');
                pageItem.classList.add('page-item');
                if (i === page) pageItem.classList.add('active');
                pageItem.innerHTML = `<button class="page-link" onclick="fetchBooks('${title}', ${i})">${i}</button>`;
                pagination.appendChild(pageItem);
            }
        }
    } catch (error) {
        console.error('Error fetching books:', error);
        const bookList = document.getElementById('book-list');
        if (bookList) bookList.innerHTML = '<p class="text-center text-danger">Error loading books. Please try again.</p>';
    } finally {
        hideLoadingSpinner();
        if (searchingMsg) searchingMsg.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateLikeDislikeUI(bookId, likes, dislikes, action) {
    const likeButton    = document.querySelector(`#book-${bookId} .like-button`);
    const dislikeButton = document.querySelector(`#book-${bookId} .dislike-button`);
    if (likeButton)    { likeButton.innerHTML    = `👍 ${likes}`;    likeButton.classList.toggle('active', action === 'like'); }
    if (dislikeButton) { dislikeButton.innerHTML = `👎 ${dislikes}`; dislikeButton.classList.toggle('active', action === 'dislike'); }
}

function getUserAction(bookId) { return localStorage.getItem(`book-${bookId}-reaction`); }

function clearSearchFields() {
    ['search-title','search-author','search-genre'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
}

function toggleAdvancedFilters() {
    const filters = document.getElementById('advanced-filters');
    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
}

function showLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

// ── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function showConfirmModal(message, onConfirm, dangerLabel = 'Delete') {
    const overlay   = document.getElementById('confirm-modal-overlay');
    const msgEl     = document.getElementById('confirm-modal-message');
    const okBtn     = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!overlay) { if (confirm(message)) onConfirm(); return; }

    msgEl.textContent = message;
    okBtn.textContent = dangerLabel;

    const newOk     = okBtn.cloneNode(true);     okBtn.parentNode.replaceChild(newOk, okBtn);
    const newCancel = cancelBtn.cloneNode(true);  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newOk.addEventListener('click',     () => { overlay.classList.remove('active'); onConfirm(); });
    newCancel.addEventListener('click', () => overlay.classList.remove('active'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); }, { once: true });

    overlay.classList.add('active');
}

// ── displayMessage ─────────────────────────────────────────────────────────────
function displayMessage(elementId, message, type = 'error') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        let alertClass = 'alert-danger';
        if (type === 'success') alertClass = 'alert-success';
        if (type === 'info')    alertClass = 'alert-info';
        messageElement.innerHTML = `<div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" onclick="this.parentElement.style.display='none'"></button>
        </div>`;
        if (type === 'success') setTimeout(() => { if (messageElement.innerHTML.includes('alert-success')) messageElement.innerHTML = ''; }, 8000);
        if (type === 'info')    setTimeout(() => { if (messageElement.innerHTML.includes('alert-info'))    messageElement.innerHTML = ''; }, 10000);
    }
}

// Fetch users
async function fetchUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, { credentials: 'include' });
        if (response.ok) {
            const users = await response.json();
            const userList = document.getElementById('user-list');
            if (userList) {
                userList.innerHTML = '';
                users.forEach(user => {
                    const userItem = document.createElement('tr');
                    userItem.innerHTML = `
  <tr>
    <td>${user.username}</td>
    <td>${user.role}</td>
    <td class="text-center">
      ${user.username !== seedAdminUsername ? `
        ${user.role !== 'admin' ? `
          <button class="btn btn-success btn-sm mb-1" onclick="grantAdmin(${user.id})">Grant Admin</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser(${user.id}, '${user.username}')">Delete</button>
        ` : `
          <button class="btn btn-revoke btn-sm" onclick="revokeAdmin(${user.id})">Revoke Admin</button>
        `}
      ` : '<span class="text-muted">Protected</span>'}
    </td>
  </tr>`;
                    userList.appendChild(userItem);
                });
            }
        } else {
            displayMessage('users-messages', 'Failed to load users. Please try again.', 'error');
        }
    } catch (error) {
        displayMessage('users-messages', 'An error occurred while fetching users.', 'error');
    }
}

async function grantAdmin(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/grant-admin`, { method: 'POST', credentials: 'include' });
    if (response.ok) { showToast('✅ Admin role granted.', 'success'); fetchUsers(); }
    else { showToast('Failed to grant admin: ' + await response.text(), 'error'); }
}

async function revokeAdmin(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/revoke-admin`, { method: 'POST', credentials: 'include' });
    if (response.ok) { showToast('✅ Admin role revoked.', 'success'); fetchUsers(); }
    else { showToast('Failed to revoke admin: ' + await response.text(), 'error'); }
}

async function deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE', credentials: 'include' });
    if (response.ok) { showToast('✅ User deleted.', 'success'); fetchUsers(); }
    else { showToast('Failed to delete user: ' + await response.text(), 'error'); }
}

function confirmDeleteUser(userId, username) {
    showConfirmModal(
        `Are you sure you want to delete "${username}"? This action cannot be undone.`,
        () => deleteUser(userId),
        'Delete User'
    );
}

// Add book
async function addBook() {
    const title       = document.getElementById('title').value.trim();
    const author      = document.getElementById('author').value.trim();
    const description = document.getElementById('description').value.trim();
    const genresRaw   = document.getElementById('genres').value.trim();
    const bookCover   = document.getElementById('book-cover').files[0];
    const bookFile    = document.getElementById('book-file').files[0];
    const addBtn      = document.getElementById('add-book-btn');
    const msgBox      = 'add-book-messages';

    const errors = [];
    if (!title)    errors.push('Book title is required.');
    if (!author)   errors.push('Author name is required.');
    if (!bookFile) errors.push('A PDF book file is required.');
    else if (bookFile.type !== 'application/pdf' && !bookFile.name.endsWith('.pdf'))
        errors.push('Book file must be a PDF.');
    if (bookCover && !bookCover.type.startsWith('image/'))
        errors.push('Cover must be an image file (JPG, PNG, etc.).');

    if (errors.length > 0) { displayMessage(msgBox, errors.join('<br>'), 'error'); return; }

    document.getElementById(msgBox).innerHTML = '';
    showButtonSpinner(addBtn, '<i class="fas fa-plus-circle mr-2"></i>Add Book');
    displayMessage(msgBox,
        '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading… Please wait, this may take a moment for large files.',
        'info'
    );

    const genres = genresRaw ? genresRaw.split(',').map(g => g.trim()).filter(Boolean) : [];
    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    formData.append('genres', JSON.stringify(genres));
    if (bookCover) formData.append('cover', bookCover);
    formData.append('bookFile', bookFile);

    try {
        const response = await fetch(`${API_BASE_URL}/books`, { method: 'POST', body: formData, credentials: 'include' });
        const data = await response.json().catch(() => null);
        if (response.ok) {
            displayMessage(msgBox, `✅ <strong>"${data?.book?.title || title}"</strong> added successfully!`, 'success');
            clearAddBookFields();
            setTimeout(() => showSection('search-books'), 1800);
        } else {
            displayMessage(msgBox, data?.error || 'Failed to add book. Please try again.', 'error');
        }
    } catch (error) {
        displayMessage(msgBox, 'Network error. Check your connection and try again.', 'error');
    } finally {
        hideButtonSpinner(addBtn);
    }
}

function updateUploadLabel(inputId, labelId, areaId) {
    const input     = document.getElementById(inputId);
    const labelText = document.getElementById(labelId);
    const area      = document.getElementById(areaId);
    if (!input || !labelText) return;

    if (input.files && input.files[0]) {
        const file   = input.files[0];
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const sizeStr = sizeMB >= 1 ? `${sizeMB} MB` : `${(file.size / 1024).toFixed(0)} KB`;
        labelText.innerHTML = `${file.name} <span style="color:#888;font-size:.8em;">(${sizeStr})</span>`;
        labelText.style.color = '#fff';
        if (area) { area.style.borderColor = '#1DB954'; area.style.background = 'rgba(29,185,84,0.08)'; }
        const msgBox = document.getElementById('add-book-messages');
        if (msgBox && inputId === 'book-file' && file.size > 10 * 1024 * 1024) {
            displayMessage('add-book-messages', `⚠️ Large file detected (${sizeMB} MB). Upload will take longer — please be patient and don't close the tab.`, 'info');
        } else if (msgBox && inputId === 'book-file') {
            msgBox.innerHTML = '';
        }
    } else {
        const isImage = inputId === 'book-cover';
        labelText.textContent = isImage ? 'Click to choose an image…' : 'Click to choose a PDF…';
        labelText.style.color = '';
        if (area) { area.style.borderColor = ''; area.style.background = ''; }
    }
}

function clearAddBookFields() {
    ['title','author','description','genres'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('book-cover').value = '';
    document.getElementById('book-file').value = '';
    updateUploadLabel('book-cover', 'cover-label-text', 'cover-upload-area');
    updateUploadLabel('book-file',  'pdf-label-text',   'pdf-upload-area');
}

function editBook(bookId) { window.location.href = `book-details.html?bookId=${bookId}`; }

async function deleteBook(bookId) {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, { method: 'DELETE', credentials: 'include' });
    if (response.ok) { showToast('✅ Book deleted.', 'success'); fetchBooks(); }
    else { showToast('Failed to delete book: ' + await response.text(), 'error'); }
}

function confirmDeleteBook(bookId, bookTitle) {
    showConfirmModal(
        `Are you sure you want to delete "${bookTitle}"?`,
        () => deleteBook(bookId),
        'Delete Book'
    );
}

function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function isValidUsername(username) { return /^[a-zA-Z0-9_]+$/.test(username) && username.length >= 3; }
function showResendVerificationWithEmail(email) { showResendVerification(); if (email) document.getElementById('resend-email').value = email; }

// Register
async function register() {
    const email           = document.getElementById('register-email').value.trim();
    const username        = document.getElementById('register-username').value.trim();
    const password        = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const registerButton  = document.querySelector('#register-form .btn-primary');

    document.getElementById('register-messages').innerHTML = '';
    const errors = [];
    if (!email)    errors.push('Email is required');
    else if (!isValidEmail(email)) errors.push('Please enter a valid email address');
    if (!username) errors.push('Username is required');
    else if (!isValidUsername(username)) errors.push('Username must be at least 3 characters and contain only letters, numbers, and underscores');
    if (!password) errors.push('Password is required');
    else if (password.length < 6) errors.push('Password must be at least 6 characters long');
    if (!confirmPassword) errors.push('Please confirm your password');
    else if (password !== confirmPassword) errors.push('Passwords do not match');
    if (errors.length > 0) { displayMessage('register-messages', errors.join('<br>'), 'error'); return; }

    showButtonSpinner(registerButton, 'Create Account');
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            displayMessage('register-messages', data.message, 'success');
            ['register-email','register-username','register-password','register-confirm-password'].forEach(id => { document.getElementById(id).value = ''; });
            setTimeout(() => { displayMessage('register-messages', data.message + '<br><br><strong>Next steps:</strong><br>1. Check your email inbox (and spam folder)<br>2. Click the verification link<br>3. Return here to log in', 'success'); }, 1000);
            setTimeout(() => { showLoginForm(); displayMessage('login-messages', 'Please check your email and click the verification link, then log in here.', 'info'); }, 5000);
        } else {
            if (data.errors && data.errors.length > 0) displayMessage('register-messages', data.errors.map(e => e.msg).join('<br>'), 'error');
            else displayMessage('register-messages', data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        displayMessage('register-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(registerButton);
    }
}

function showLoginForm() {
    ['main-content','newsletter-section','hamburger-button','search-books','footer','admin-button','profile-section','manage-users-link'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    document.getElementById('login-messages').innerHTML = '';
}

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    document.getElementById('register-messages').innerHTML = '';
    setTimeout(initializePasswordStrength, 100);
}

function initializePasswordStrength() {
    const passwordInput = document.getElementById('register-password');
    const strengthContainer = passwordInput?.parentElement.querySelector('.password-strength');
    const strengthBar = strengthContainer?.querySelector('.password-strength-bar');
    if (!passwordInput || !strengthContainer || !strengthBar) return;
    passwordInput.addEventListener('input', function() {
        const strength = calculatePasswordStrength(this.value);
        updatePasswordStrengthUI(strengthContainer, strengthBar, strength);
    });
}

function calculatePasswordStrength(password) {
    if (!password) return { level: 'none', score: 0 };
    let score = 0;
    if (password.length >= 6)  score++;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return { level: score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak', score };
}

function updatePasswordStrengthUI(container, bar, strength) {
    container.classList.remove('password-strength-weak','password-strength-medium','password-strength-strong');
    if (strength.level !== 'none') container.classList.add(`password-strength-${strength.level}`);
    bar.style.width = `${Math.min((strength.score / 7) * 100, 100)}%`;
    bar.style.backgroundColor = strength.level === 'strong' ? '#28a745' : strength.level === 'medium' ? '#ffc107' : '#dc3545';
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('register-form')) setTimeout(initializePasswordStrength, 100);
});

document.addEventListener('DOMContentLoaded', () => {
    const loginEmailUsername = document.getElementById('login-email-username');
    const loginPassword      = document.getElementById('login-password');
    if (loginEmailUsername) loginEmailUsername.addEventListener('keypress', e => { if (e.key === 'Enter') login(); });
    if (loginPassword)      loginPassword.addEventListener('keypress',      e => { if (e.key === 'Enter') login(); });
    const registerConfirmPassword = document.getElementById('register-confirm-password');
    if (registerConfirmPassword) registerConfirmPassword.addEventListener('keypress', e => { if (e.key === 'Enter') register(); });
    const resendEmail = document.getElementById('resend-email');
    if (resendEmail) resendEmail.addEventListener('keypress', e => { if (e.key === 'Enter') resendVerification(); });
});

function enableProfileEditing() {
    ['profile-email','profile-genres','profile-authors','profile-books'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
    const editBtn = document.getElementById('edit-profile-button'); if (editBtn) editBtn.style.display = 'none';
    const saveBtn = document.getElementById('save-profile-button'); if (saveBtn) saveBtn.style.display = 'block';
}

function disableProfileEditing() {
    ['profile-email','profile-genres','profile-authors','profile-books'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
    const editBtn = document.getElementById('edit-profile-button'); if (editBtn) editBtn.style.display = 'block';
    const saveBtn = document.getElementById('save-profile-button'); if (saveBtn) saveBtn.style.display = 'none';
}

// updateProfile superseded by savePreferences + changePassword in the new UI.

async function uploadProfilePicture() {
    const fileInput = document.getElementById('profile-picture-input');
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('profilePicture', fileInput.files[0]);
        try {
            const response = await fetch(`${API_BASE_URL}/users/upload-profile-picture`, { method: 'POST', body: formData, credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                let url = data.profilePicture;
                if (url && url.startsWith('/uploads/')) url = API_BASE_URL + url;
                const ts = '?timestamp=' + new Date().getTime();
                document.getElementById('profile-picture').src = url + ts;
                document.getElementById('burger-profile-picture').src = url + ts;
                showToast('✅ Profile picture updated!', 'success');
            } else {
                showToast('Failed to upload profile picture: ' + await response.text(), 'error');
            }
        } catch (error) {
            showToast('Failed to upload profile picture: ' + error.message, 'error');
        }
    } else {
        showToast('Please select a profile picture first.', 'info');
    }
}

const profilePictureInput = document.getElementById('profile-picture-input');
if (profilePictureInput) profilePictureInput.addEventListener('change', uploadProfilePicture);

async function refreshProfilePicture() {
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23444" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="32" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            let url = user.profilePicture || defaultImage;
            const ts = '?t=' + new Date().getTime();
            if (url && url.startsWith('/uploads/')) url = API_BASE_URL + url;
            const profilePic      = document.getElementById('profile-picture');
            const burgerProfilePic = document.getElementById('burger-profile-picture');
            const src = url.includes('data:') ? url : url + ts;
            if (profilePic)       { profilePic.src = src;       profilePic.onerror       = function() { this.src = defaultImage; }; }
            if (burgerProfilePic) { burgerProfilePic.src = src; burgerProfilePic.onerror = function() { this.src = defaultImage; }; }
        } else { setDefaultProfilePictures(); }
    } catch (error) { setDefaultProfilePictures(); }
}

function setDefaultProfilePictures() {
    const d = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23444" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="32" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';
    const p = document.getElementById('profile-picture');       if (p) p.src = d;
    const b = document.getElementById('burger-profile-picture'); if (b) b.src = d;
}

async function fetchProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            const el = id => document.getElementById(id);
            if (el('profile-email'))   el('profile-email').value   = user.email || '';
            if (el('profile-genres'))  el('profile-genres').value  = user.favoriteGenres || '';
            if (el('profile-authors')) el('profile-authors').value = user.favoriteAuthors || '';
            if (el('profile-books'))   el('profile-books').value   = user.favoriteBooks || '';
            if (user.profilePicture) {
                let url = user.profilePicture;
                if (url && url.startsWith('/uploads/')) url = API_BASE_URL + url;
                const ts = '?timestamp=' + new Date().getTime();
                if (el('profile-picture'))        el('profile-picture').src = url + ts;
                if (el('burger-profile-picture')) el('burger-profile-picture').src = url + ts;
            }
        }
    } catch (error) { console.error('Error fetching profile:', error); }
}

function showProfileSection() { document.getElementById('profile-section').style.display = 'block'; fetchProfile(); disableProfileEditing(); }

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            userRole = user.role;
            window.currentUsername = user.username;
            await initializeChatbot();

            const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'block'; };
            const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none';  };

            hide('login-form');
            show('main-content'); show('newsletter-section'); show('hamburger-button');
            show('search-books'); show('footer');
            hide('add-book-section'); hide('profile-section');

            const burgerUsername = document.getElementById('burger-username');
            if (burgerUsername) burgerUsername.innerText = user.username;

            await refreshProfilePicture();

            if (userRole === 'admin') {
                show('sidebar-admin-controls');
                show('add-book-link');
                show('manage-users-link');
            } else {
                hide('sidebar-admin-controls');
            }

            show('chat-icon');
            return true;
        } else {
            hide('chat-icon');
            return false;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        return false;
    }

    function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    function show(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
}

function setAuthState(isAuthenticated, userData = null) {
    if (isAuthenticated && userData) {
        localStorage.setItem('authState', 'authenticated');
        localStorage.setItem('userData', JSON.stringify({ username: userData.username, role: userData.role, profilePicture: userData.profilePicture }));
    } else {
        localStorage.removeItem('authState');
        localStorage.removeItem('userData');
    }
}

function getStoredAuthState() {
    return { isAuthenticated: localStorage.getItem('authState') === 'authenticated', userData: JSON.parse(localStorage.getItem('userData') || 'null') };
}

async function handleLikeDislike(bookId, action) {
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}/${action}`, { method: 'POST', credentials: 'include' });
        if (response.ok) {
            const { likes, dislikes } = await response.json();
            const likeCount    = document.getElementById('like-count');
            const dislikeCount = document.getElementById('dislike-count');
            if (likeCount)    likeCount.innerText    = likes;
            if (dislikeCount) dislikeCount.innerText = dislikes;
            syncLikeDislikeAcrossPages(bookId, likes, dislikes, action);
        } else {
            showToast('Failed to update: ' + await response.text(), 'error');
        }
    } catch (error) {
        showToast('Failed to update. Check your connection.', 'error');
    }
}

function syncLikeDislikeAcrossPages(bookId, likes, dislikes, action) {
    const likeButton    = document.querySelector(`#book-${bookId} .like-button`);
    const dislikeButton = document.querySelector(`#book-${bookId} .dislike-button`);
    if (likeButton)    { likeButton.innerHTML    = `👍 ${likes}`;    likeButton.classList.toggle('active',    action === 'like'); }
    if (dislikeButton) { dislikeButton.innerHTML = `👎 ${dislikes}`; dislikeButton.classList.toggle('active', action === 'dislike'); }
}

function showBookDetails(bookId) {
    if (!bookId || bookId === 'undefined' || isNaN(Number(bookId))) { showToast('Book ID is missing or invalid.', 'error'); return; }
    window.location.href = `book-details.html?bookId=${bookId}`;
}

// Stubs — real versions live as inline scripts in book-details.html
function saveBookDetails()   {}
function editBookDetails()   {}
function deleteBookDetails() {}

function showForgotPasswordForm() {
    const loginForm = document.getElementById('login-form');
    const modal     = document.getElementById('forgot-password-modal');
    if (loginForm) loginForm.style.display = 'none';
    if (modal)     modal.style.display     = 'block';
    document.getElementById('forgot-password-messages').innerHTML = '';
}

function hideForgotPasswordForm() {
    const modal     = document.getElementById('forgot-password-modal');
    const loginForm = document.getElementById('login-form');
    if (modal)     modal.style.display     = 'none';
    if (loginForm) loginForm.style.display = 'block';
    document.getElementById('forgot-password-email').value = '';
    document.getElementById('forgot-password-messages').innerHTML = '';
}

async function requestPasswordReset() {
    const email       = document.getElementById('forgot-password-email').value.trim();
    const resetButton = document.querySelector('#forgot-password-modal .btn-danger');
    document.getElementById('forgot-password-messages').innerHTML = '';
    if (!email)              { displayMessage('forgot-password-messages', 'Email is required', 'error'); return; }
    if (!isValidEmail(email)){ displayMessage('forgot-password-messages', 'Please enter a valid email address', 'error'); return; }

    showButtonSpinner(resetButton, 'Send Reset Link');
    try {
        const response = await fetch(`${API_BASE_URL}/request-password-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const data = await response.json();
        if (response.ok) {
            displayMessage('forgot-password-messages', data.message, 'success');
            document.getElementById('forgot-password-email').value = '';
            setTimeout(() => { displayMessage('forgot-password-messages', data.message + '<br><br>• Check your inbox (and spam)<br>• Click the reset link within 1 hour', 'success'); }, 1500);
            setTimeout(() => { hideForgotPasswordForm(); displayMessage('login-messages', 'Password reset email sent! Please check your email.', 'info'); }, 6000);
        } else { displayMessage('forgot-password-messages', data.message || data.error || 'Failed to send reset email', 'error'); }
    } catch (error) { displayMessage('forgot-password-messages', 'Network error. Please try again.', 'error'); }
    finally { hideButtonSpinner(resetButton); }
}

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordEmail = document.getElementById('forgot-password-email');
    if (forgotPasswordEmail) forgotPasswordEmail.addEventListener('keypress', e => { if (e.key === 'Enter') requestPasswordReset(); });
});

async function initializeChatbot() {
    try {
        const response = await fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            window.currentUsername = user.username || 'Guest';
            const burgerUsername = document.getElementById('burger-username');
            if (burgerUsername) burgerUsername.innerText = user.username;
        }
    } catch (error) {
        window.currentUsername = 'Guest';
    }
}

document.addEventListener('DOMContentLoaded', () => { setupOutsideClickListener(); });

// ── Profile tab functions ────────────────────────────────────────────────────
function switchProfileTab(tabName) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
    const selectedTab = Array.from(document.querySelectorAll('.profile-tab')).find(t => t.getAttribute('onclick').includes(tabName));
    if (selectedTab) selectedTab.classList.add('active');
    const selectedContent = document.getElementById(`tab-${tabName}`);
    if (selectedContent) selectedContent.classList.add('active');
    if (tabName === 'activity') { loadUserActivity(); loadUserReviews(); }
}

function enablePreferencesEdit() {
    ['profile-genres','profile-authors','profile-books'].forEach(id => { document.getElementById(id).disabled = false; });
    document.getElementById('edit-preferences-btn').style.display = 'none';
    document.getElementById('preferences-actions').style.display = 'flex';
}

function cancelPreferencesEdit() {
    ['profile-genres','profile-authors','profile-books'].forEach(id => { document.getElementById(id).disabled = true; });
    document.getElementById('edit-preferences-btn').style.display = 'block';
    document.getElementById('preferences-actions').style.display = 'none';
    loadProfileData();
}

async function savePreferences() {
    const favoriteGenres  = document.getElementById('profile-genres').value.trim();
    const favoriteAuthors = document.getElementById('profile-authors').value.trim();
    const favoriteBooks   = document.getElementById('profile-books').value.trim();

    const saveBtn = document.getElementById('save-preferences-btn');
    if (saveBtn) showButtonSpinner(saveBtn, '<i class="fas fa-save"></i> Save Changes');
    document.getElementById('preferences-messages').innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/users/updateProfile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ favoriteGenres, favoriteAuthors, favoriteBooks })
        });
        if (response.ok) {
            ['profile-genres','profile-authors','profile-books'].forEach(id => { document.getElementById(id).disabled = true; });
            document.getElementById('edit-preferences-btn').style.display = 'block';
            document.getElementById('preferences-actions').style.display = 'none';
            displayMessage('preferences-messages', '✅ Preferences saved!', 'success');
            updateFavoritesCount(favoriteGenres, favoriteAuthors, favoriteBooks);
            setTimeout(() => { const m = document.getElementById('preferences-messages'); if (m) m.innerHTML = ''; }, 3000);
        } else {
            displayMessage('preferences-messages', 'Failed to save preferences: ' + await response.text(), 'error');
        }
    } catch (error) {
        displayMessage('preferences-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(document.getElementById('save-preferences-btn'));
    }
}

async function changePassword() {
    const currentPassword    = document.getElementById('current-password').value;
    const newPassword        = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const msgBox = 'password-messages';
    const pwdBtn = document.getElementById('change-password-btn');

    if (!currentPassword || !newPassword || !confirmNewPassword) { displayMessage(msgBox, 'Please fill in all password fields.', 'error'); return; }
    if (newPassword.length < 6)          { displayMessage(msgBox, 'New password must be at least 6 characters.', 'error'); return; }
    if (newPassword !== confirmNewPassword) { displayMessage(msgBox, 'New passwords do not match.', 'error'); return; }

    showButtonSpinner(pwdBtn, '<i class="fas fa-key"></i> Update Password');
    document.getElementById(msgBox).innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/users/updateProfile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password: newPassword, currentPassword })
        });
        if (response.ok) {
            displayMessage(msgBox, '✅ Password updated successfully!', 'success');
            ['current-password','new-password','confirm-new-password'].forEach(id => { document.getElementById(id).value = ''; });
            setTimeout(() => { const m = document.getElementById(msgBox); if (m) m.innerHTML = ''; }, 4000);
        } else {
            displayMessage(msgBox, 'Failed to update password: ' + await response.text(), 'error');
        }
    } catch (error) {
        displayMessage(msgBox, 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(pwdBtn);
    }
}

async function loadProfileData() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            const el = id => document.getElementById(id);
            if (el('profile-username'))     el('profile-username').innerText     = user.username || 'User';
            if (el('profile-email-display')) el('profile-email-display').innerText = user.email || '';
            if (el('profile-genres'))  el('profile-genres').value  = user.favoriteGenres || '';
            if (el('profile-authors')) el('profile-authors').value = user.favoriteAuthors || '';
            if (el('profile-books'))   el('profile-books').value   = user.favoriteBooks || '';

            if (user.profilePicture) {
                let url = user.profilePicture;
                if (url && url.startsWith('/uploads/')) url = API_BASE_URL + url;
                const profilePic = el('profile-picture');
                if (profilePic) profilePic.src = url + '?t=' + new Date().getTime();
            } else { setDefaultProfilePicture(); }

            updateFavoritesCount(user.favoriteGenres, user.favoriteAuthors, user.favoriteBooks);

            const accountCreatedDate = el('account-created-date');
            if (user.createdAt && accountCreatedDate) {
                accountCreatedDate.innerText = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            const lastLoginDate = el('last-login-date');
            if (lastLoginDate) {
                lastLoginDate.innerText = user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Just now';
            }
        }
    } catch (error) { console.error('Error loading profile:', error); }
}

function updateFavoritesCount(genres, authors, books) {
    let count = 0;
    if (genres  && genres.trim())  count += genres.split(',').filter(g => g.trim()).length;
    if (authors && authors.trim()) count += authors.split(',').filter(a => a.trim()).length;
    if (books   && books.trim())   count += books.split(',').filter(b => b.trim()).length;
    const favoritesCount = document.getElementById('favorites-count');
    if (favoritesCount) favoritesCount.innerText = count;
}

function setDefaultProfilePicture() {
    const d = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23444" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="60" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';
    const p = document.getElementById('profile-picture'); if (p) p.src = d;
}

// Load real user activity from the API
async function loadUserActivity() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;
    activityList.innerHTML = '<div class="activity-loading"><i class="fas fa-spinner fa-spin"></i> Loading activity...</div>';
    try {
        const response = await fetch(`${API_BASE_URL}/users/activity`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed');
        const activities = await response.json();

        if (activities.length === 0) {
            activityList.innerHTML = `<div class="activity-item" style="border-left-color:#888;"><div style="color:#aaa;text-align:center;padding:1rem;"><i class="fas fa-history" style="font-size:2rem;opacity:.3;"></i><p class="mt-2 mb-0">No activity yet. Start exploring books!</p></div></div>`;
            return;
        }

        activityList.innerHTML = activities.map(item => {
            const timeAgo  = getTimeAgo(new Date(item.createdAt));
            const bookLink = `<a href="book-details.html?bookId=${item.bookId}" style="color:#1DB954;">${item.bookTitle}</a>`;
            if (item.type === 'review')   return `<div class="activity-item"><div><strong>📝 Reviewed:</strong> ${bookLink}</div><div style="color:#ffd700;margin-top:4px;">${'⭐'.repeat(item.rating)} ${item.rating}/5</div><div class="activity-item-time">${timeAgo}</div></div>`;
            if (item.type === 'like')     return `<div class="activity-item" style="border-left-color:#1DB954;"><div><strong>👍 Liked:</strong> ${bookLink}</div><div class="activity-item-time">${timeAgo}</div></div>`;
            if (item.type === 'dislike')  return `<div class="activity-item" style="border-left-color:#dc3545;"><div><strong>👎 Disliked:</strong> ${bookLink}</div><div class="activity-item-time">${timeAgo}</div></div>`;
            return '';
        }).join('');
    } catch (error) {
        activityList.innerHTML = '<div class="activity-loading" style="color:#dc3545;">Failed to load activity.</div>';
    }
}

function getTimeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60)    return 'just now';
    const m = Math.floor(s / 60);   if (m < 60)  return `${m} minute${m > 1 ? 's' : ''} ago`;
    const h = Math.floor(m / 60);   if (h < 24)  return `${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);   if (d < 30)  return `${d} day${d > 1 ? 's' : ''} ago`;
    const mo = Math.floor(d / 30);  if (mo < 12) return `${mo} month${mo > 1 ? 's' : ''} ago`;
    const yr = Math.floor(mo / 12); return `${yr} year${yr > 1 ? 's' : ''} ago`;
}

// Load real user reviews from the API
async function loadUserReviews() {
    const reviewsList = document.getElementById('user-reviews-list');
    if (!reviewsList) return;
    reviewsList.innerHTML = '<div class="reviews-loading"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</div>';
    try {
        const response = await fetch(`${API_BASE_URL}/users/my-reviews`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed');
        const reviews = await response.json();

        const reviewsCount = document.getElementById('reviews-count');
        if (reviewsCount) reviewsCount.innerText = reviews.length;

        if (reviews.length === 0) {
            reviewsList.innerHTML = `<div class="review-item" style="border-left-color:#888;"><div style="color:#aaa;text-align:center;padding:1rem;"><i class="fas fa-star" style="font-size:2rem;opacity:.3;"></i><p class="mt-2 mb-0">No reviews yet. Share your thoughts on a book!</p></div></div>`;
            return;
        }

        reviewsList.innerHTML = reviews.map(r => {
            const stars    = '⭐'.repeat(r.rating);
            const timeAgo  = getTimeAgo(new Date(r.createdAt));
            const bookLink = `<a href="book-details.html?bookId=${r.bookId}" style="color:#1DB954;">${r.bookTitle}</a>`;
            const preview  = r.text.length > 120 ? r.text.slice(0, 120) + '…' : r.text;
            return `<div class="review-item"><div><strong>${stars} ${bookLink}</strong><small style="color:#888;"> by ${r.author}</small></div><div style="color:#ccc;margin-top:.5rem;font-size:.9rem;">${preview}</div><div class="review-item-time">${timeAgo}</div></div>`;
        }).join('');
    } catch (error) {
        reviewsList.innerHTML = '<div class="reviews-loading" style="color:#dc3545;">Failed to load reviews.</div>';
    }
}

(function initProfilePasswordStrength() {
    document.addEventListener('DOMContentLoaded', () => {
        const newPasswordInput = document.getElementById('new-password');
        const strengthBar      = document.getElementById('new-password-strength-bar');
        if (newPasswordInput && strengthBar) {
            newPasswordInput.addEventListener('input', function() {
                const strength = calculatePasswordStrength(this.value);
                strengthBar.style.width = `${Math.min((strength.score / 7) * 100, 100)}%`;
                strengthBar.style.backgroundColor = strength.level === 'strong' ? '#28a745' : strength.level === 'medium' ? '#ffc107' : '#dc3545';
            });
        }
    });
})();

// ── Hero search ──────────────────────────────────────────────────────────────
function toggleAdvancedSearch() {
    const advancedFilters = document.getElementById('advanced-filters');
    const toggleBtn       = document.getElementById('advanced-toggle');
    if (advancedFilters.classList.contains('show')) {
        advancedFilters.classList.remove('show'); toggleBtn.classList.remove('active');
    } else {
        advancedFilters.classList.add('show'); toggleBtn.classList.add('active');
    }
}

async function quickSearch() {
    const searchTerm = document.getElementById('quick-search-input').value.trim();
    if (!searchTerm) { fetchBooks(); return; }
    const searchingMsg = document.getElementById('searching-msg');
    if (searchingMsg) searchingMsg.style.display = 'block';
    try {
        showLoadingSpinner();
        const [titleResults, authorResults, genreResults] = await Promise.all([
            fetch(`${API_BASE_URL}/books?title=${encodeURIComponent(searchTerm)}&author=&genre=&page=1&limit=100`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${API_BASE_URL}/books?title=&author=${encodeURIComponent(searchTerm)}&genre=&page=1&limit=100`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${API_BASE_URL}/books?title=&author=&genre=${encodeURIComponent(searchTerm)}&page=1&limit=100`, { credentials: 'include' }).then(r => r.json())
        ]);
        const allBooks    = [...titleResults.books, ...authorResults.books, ...genreResults.books];
        const uniqueBooks = Array.from(new Map(allBooks.map(b => [b.id, b])).values());
        const booksWithFlags = uniqueBooks.map(book => ({
            ...book,
            hasPhysicalCopy: book.hasPhysicalCopy || false,
            hasDigitalCopy: book.hasDigitalCopy || false
        }));
        displayQuickSearchResults(booksWithFlags);
    } catch (error) {
        const bookList = document.getElementById('book-list');
        if (bookList) bookList.innerHTML = '<p class="text-center text-danger">Error loading books. Please try again.</p>';
    } finally {
        hideLoadingSpinner();
        if (searchingMsg) searchingMsg.style.display = 'none';
    }
}

function displayQuickSearchResults(books) {
    const bookList        = document.getElementById('book-list');
    const noResultsMessage = document.getElementById('no-results-message');
    const pagination      = document.getElementById('pagination');
    if (pagination) pagination.innerHTML = '';
    if (books.length === 0) { if (noResultsMessage) noResultsMessage.style.display = 'block'; if (bookList) bookList.innerHTML = ''; return; }
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    if (bookList) {
        bookList.innerHTML = '';
        books.forEach(book => {
            let coverUrl = book.cover || '';
            if (coverUrl && coverUrl.startsWith('/uploads/')) coverUrl = API_BASE_URL + coverUrl;
            const bookItem = document.createElement('div');
            bookItem.classList.add('book-item');
            bookItem.id = `book-${book.id}`;
            bookItem.innerHTML = `
                ${userRole === 'admin' ? `<div class="delete-action"><button class="btn btn-danger btn-sm" onclick="confirmDeleteBook(${book.id}, '${(book.title || '').replace(/'/g, "\\'")}')">Delete</button></div>` : ''}
                <img src="${coverUrl || '/default-book-cover.png'}" alt="Cover Image" onerror="this.src='/default-book-cover.png'">
                <div class="details">
                    <div class="details-content"><div class="main-info">
                        <h5>${book.title || 'No Title'}</h5>
                        <p><strong>Author: </strong> ${book.author || 'Unknown'}</p>
                        <p class="description-text">${book.description || 'No description available'}</p>
                    </div></div>
                    <div class="like-dislike-ratings">
                        <div class="like-dislike-buttons">
                            <button class="like-button" onclick="handleLikeDislike(${book.id}, 'like')">👍 ${book.likes || 0}</button>
                            <button class="dislike-button" onclick="handleLikeDislike(${book.id}, 'dislike')">👎 ${book.dislikes || 0}</button>
                        </div>
                        ${book.hasPhysicalCopy ? `
                            <button class="btn btn-success btn-sm borrow-btn" onclick="borrowBook(${book.id})" title="Borrow physical copy from library">
                                <i class="fas fa-book-reader"></i> Borrow
                            </button>
                        ` : ''}
                        ${book.hasDigitalCopy ? `
                            <button class="btn btn-info btn-sm download-btn" onclick="showBookDetails(${book.id})" title="Download digital copy">
                                <i class="fas fa-download"></i> Download
                            </button>
                        ` : ''}
                        ${!book.hasPhysicalCopy && !book.hasDigitalCopy ? `
                            <button class="btn btn-secondary btn-sm" onclick="showBookDetails(${book.id})" title="View details">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        ` : ''}
                        <div class="ratings"><span><i class="fas fa-star text-warning"></i> ${book.averageRating ? book.averageRating.toFixed(1) : 'N/A'} (${book.totalRatings || 0} ratings)</span></div>
                    </div>
                </div>`;
            bookList.appendChild(bookItem);
            updateLikeDislikeUI(book.id, book.likes || 0, book.dislikes || 0, getUserAction(book.id));
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrowBook(bookId) {
    if (!isUserLoggedIn()) {
        showToast('Please log in to borrow books.', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/borrow/borrow/${bookId}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message || 'Book borrowed successfully!', 'success');
            loadBorrowedBooks();
        } else {
            showToast(data.error || 'Failed to borrow book.', 'error');
        }
    } catch (error) {
        console.error('Error borrowing book:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

function clearFilters() {
    ['search-title','search-author','search-genre','quick-search-input'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    fetchBooks();
    const filterActions = document.querySelector('.filter-actions');
    if (filterActions) {
        const clearMsg = document.createElement('div');
        clearMsg.textContent = 'Filters cleared!';
        clearMsg.style.cssText = 'color:#1DB954;font-size:.85rem;margin-top:.5rem;text-align:center;';
        filterActions.appendChild(clearMsg);
        setTimeout(() => clearMsg.remove(), 2000);
    }
}
// ─── Book Reservation Functions ──────────────────────────────────────────
async function reserveBook(bookId) {
    if (!isUserLoggedIn()) { showToast('Please log in to reserve books.', 'error'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${bookId}`, { method: 'POST', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success', 4000); }
        else { showToast(data.error || 'Failed to reserve book.', 'error'); }
    } catch (error) { showToast('Network error. Please try again.', 'error'); }
}

async function loadMyReservations() {
    const listDiv = document.getElementById('reservations-list');
    if (!listDiv) return;
    listDiv.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/my`, { headers: getAuthHeaders() });
        const reservations = await response.json();
        if (reservations.length === 0) {
            listDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-clock" style="font-size:2rem;opacity:.3;"></i><p class="mt-2 text-muted">No reservations yet.</p></div>'; return;
        }
        listDiv.innerHTML = reservations.map(r => {
            const badge = r.status === 'waiting' ? '<span class="badge badge-warning">In Queue</span>' : r.status === 'fulfilled' ? '<span class="badge badge-success">Ready</span>' : '<span class="badge badge-secondary">Cancelled</span>';
            return `<div class="p-3 mb-2 rounded" style="border-left:4px solid #f0ad4e;background:#1e1e1e;">
                <div class="d-flex justify-content-between align-items-center">
                    <div><strong>${r.title}</strong><br><small class="text-muted">by ${r.author}</small><br><small>Position: <strong>#${r.queuePosition}</strong></small></div>
                    <div class="text-right">${badge}<br>${r.status === 'waiting' ? `<button class="btn btn-danger btn-sm mt-1" onclick="cancelReservation(${r.id})"><i class="fas fa-times"></i> Cancel</button>` : ''}</div>
                </div>
                <small class="text-muted">Reserved: ${new Date(r.reservedAt).toLocaleDateString()}</small></div>`;
        }).join('');
    } catch (error) { listDiv.innerHTML = '<div class="text-center text-danger">Failed to load.</div>'; }
}

async function cancelReservation(id) {
    if (!confirm('Cancel this reservation?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success'); loadMyReservations(); }
        else { showToast(data.error || 'Failed.', 'error'); }
    } catch (error) { showToast('Network error.', 'error'); }
}

// ─── Fine Management Functions ───────────────────────────────────────────
async function loadMyFines() {
    const listDiv = document.getElementById('fines-list');
    const summaryDiv = document.getElementById('fines-summary');
    if (!listDiv) return;
    try {
        const [finesRes, summaryRes] = await Promise.all([
            fetch(`${API_BASE_URL}/fines/my`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE_URL}/fines/summary`, { headers: getAuthHeaders() })
        ]);
        const fines = await finesRes.json();
        const summary = await summaryRes.json();
        if (summaryDiv) {
            summaryDiv.innerHTML = summary.count > 0
                ? `<div class="alert alert-warning"><strong>Total Unpaid:</strong> GHS ${parseFloat(summary.total).toFixed(2)} (${summary.count} fine${summary.count > 1 ? 's' : ''}) <button class="btn btn-success btn-sm float-right" onclick="payAllFines()"><i class="fas fa-credit-card"></i> Pay All</button></div>`
                : '<div class="alert alert-success">No unpaid fines. Great job!</div>';
        }
        if (fines.length === 0) { listDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-check-circle" style="font-size:2rem;color:#1DB954;"></i><p class="mt-2">No fines.</p></div>'; return; }
        listDiv.innerHTML = fines.map(f => {
            const sClass = f.status === 'paid' ? 'success' : f.status === 'waived' ? 'info' : 'danger';
            const sText = f.status === 'paid' ? 'Paid' : f.status === 'waived' ? 'Waived' : 'Unpaid';
            return `<div class="p-3 mb-2 rounded" style="border-left:4px solid ${f.status === 'unpaid' ? '#dc3545' : '#28a745'};background:#1e1e1e;">
                <div class="d-flex justify-content-between align-items-center">
                    <div><strong>GHS ${parseFloat(f.amount).toFixed(2)}</strong>${f.bookTitle ? `<br><small>Book: ${f.bookTitle}</small>` : ''}<br><small>${f.reason || ''}</small></div>
                    <div class="text-right"><span class="badge badge-${sClass}">${sText}</span><br>${f.status === 'unpaid' ? `<button class="btn btn-success btn-sm mt-1" onclick="payFine(${f.id})"><i class="fas fa-credit-card"></i> Pay</button>` : ''}</div>
                </div>
                <small class="text-muted">Issued: ${new Date(f.issuedAt).toLocaleDateString()}</small>
                ${f.paidAt ? `<br><small class="text-success">Paid: ${new Date(f.paidAt).toLocaleDateString()}</small>` : ''}</div>`;
        }).join('');
    } catch (error) { listDiv.innerHTML = '<div class="text-center text-danger">Failed to load fines.</div>'; }
}

async function payFine(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/fines/pay/${id}`, { method: 'POST', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success'); loadMyFines(); }
        else { showToast(data.error || 'Failed.', 'error'); }
    } catch (error) { showToast('Network error.', 'error'); }
}

async function payAllFines() {
    if (!confirm('Pay all unpaid fines?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/fines/pay-all`, { method: 'POST', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success'); loadMyFines(); }
        else { showToast(data.error || 'Failed.', 'error'); }
    } catch (error) { showToast('Network error.', 'error'); }
}

// ─── Reading Challenge Functions ─────────────────────────────────────────
async function loadChallenges() {
    const listDiv = document.getElementById('challenges-list');
    const myDiv = document.getElementById('my-challenges');
    const badgesDiv = document.getElementById('badges-list');
    const leaderboardDiv = document.getElementById('leaderboard-list');
    try {
        // Active challenges
        if (listDiv) {
            const response = await fetch(`${API_BASE_URL}/challenges`, { headers: getAuthHeaders() });
            const challenges = await response.json();
            if (challenges.length === 0) { listDiv.innerHTML = '<div class="text-center py-4"><p class="text-muted">No active challenges.</p></div>'; }
            else {
                listDiv.innerHTML = challenges.map(c => `<div class="p-3 mb-2 rounded" style="border-left:4px solid #5bc0de;background:#1e1e1e;">
                    <div class="d-flex justify-content-between"><div><strong>${c.title}</strong><p class="mb-1"><small>${c.description || ''}</small></p><small class="text-muted">Goal: ${c.goalBooks} books | ${c.participants} participants</small></div>
                    <div><button class="btn btn-primary btn-sm" onclick="joinChallenge(${c.id})"><i class="fas fa-plus"></i> Join</button></div></div></div>`).join('');
            }
        }
        // My challenges
        if (myDiv) {
            const response = await fetch(`${API_BASE_URL}/challenges/my`, { headers: getAuthHeaders() });
            const my = await response.json();
            if (my.length === 0) { myDiv.innerHTML = '<div class="text-center py-4"><p class="text-muted">No challenges joined.</p></div>'; }
            else {
                myDiv.innerHTML = my.map(uc => {
                    const pct = Math.round((uc.booksRead / uc.goalBooks) * 100);
                    return `<div class="p-3 mb-2 rounded" style="border-left:4px solid ${uc.completedAt ? '#28a745' : '#f0ad4e'};background:#1e1e1e;">
                        <div class="d-flex justify-content-between"><div><strong>${uc.title}</strong><div class="progress mt-2" style="height:10px;"><div class="progress-bar ${uc.completedAt ? 'bg-success' : 'bg-warning'}" style="width:${Math.min(pct,100)}%">${Math.min(pct,100)}%</div></div><small>${uc.booksRead}/${uc.goalBooks} books read</small></div>
                        <div>${uc.completedAt ? '<span class="badge badge-success">🎉 Done!</span>' : `<button class="btn btn-sm btn-success" onclick="updateChallengeProgress(${uc.challengeId})"><i class="fas fa-book"></i> Log Book</button>`}</div></div></div>`;
                }).join('');
            }
        }
        // Badges
        if (badgesDiv) {
            const response = await fetch(`${API_BASE_URL}/challenges/badges`, { headers: getAuthHeaders() });
            const badges = await response.json();
            if (badges.length === 0) { badgesDiv.innerHTML = '<div class="text-center py-4"><p class="text-muted">No badges yet. Complete challenges!</p></div>'; }
            else {
                badgesDiv.innerHTML = badges.map(b => `<div class="text-center p-2 m-1 d-inline-block" style="background:#2a2a2a;border-radius:8px;min-width:100px;"><div style="font-size:2rem;">${b.icon || '🏆'}</div><strong><small>${b.name}</small></strong></div>`).join('');
            }
        }
        // Leaderboard
        if (leaderboardDiv) {
            const response = await fetch(`${API_BASE_URL}/challenges/leaderboard`, { headers: getAuthHeaders() });
            const leaders = await response.json();
            const medals = ['🥇','🥈','🥉'];
            if (leaders.length === 0) { leaderboardDiv.innerHTML = '<div class="text-center py-4"><p class="text-muted">No data.</p></div>'; }
            else {
                leaderboardDiv.innerHTML = leaders.map((l,i) => `<div class="p-2 mb-1 rounded d-flex justify-content-between" style="background:#1e1e1e;"><span>${medals[i] || `${i+1}.`} <strong>${l.username}</strong></span><span>${l.booksBorrowed} books | ${l.badges} badges</span></div>`).join('');
            }
        }
    } catch (error) { console.error('Error:', error); }
}

async function joinChallenge(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/${id}/join`, { method: 'POST', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success'); loadChallenges(); }
        else { showToast(data.error || 'Failed.', 'error'); }
    } catch (error) { showToast('Network error.', 'error'); }
}

async function updateChallengeProgress(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/${id}/progress`, { method: 'POST', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success', 4000); loadChallenges(); }
        else { showToast(data.error || 'Failed.', 'error'); }
    } catch (error) { showToast('Network error.', 'error'); }
}

function switchChallengeTab(tab) {
    ['challenges-list', 'my-challenges', 'badges-list', 'leaderboard-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.querySelectorAll('#challengesTabs .nav-link').forEach(l => l.classList.remove('active'));
    const activeTab = document.getElementById(tab === 'active' ? 'challenges-list' : tab === 'my' ? 'my-challenges' : tab === 'badges' ? 'badges-list' : 'leaderboard-list');
    if (activeTab) activeTab.style.display = 'block';
    const activeLink = document.querySelector(`#challengesTabs .nav-link[onclick*="'${tab}'"]`);
    if (activeLink) activeLink.classList.add('active');
    loadChallenges();
}

// ─── Membership Functions ─────────────────────────────────────────────────
async function checkMembershipStatus() {
    const statusDiv = document.getElementById('membership-status');
    const detailsDiv = document.getElementById('membership-details');
    const applyDiv = document.getElementById('membership-apply');

    try {
        const response = await fetch(`${API_BASE_URL}/membership/status`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!response.ok) {
            statusDiv.style.display = 'none';
            applyDiv.style.display = 'block';
            return;
        }

        const data = await response.json();

        statusDiv.style.display = 'none';

        if (data.isMember) {
            document.getElementById('membership-card-number').textContent = data.cardNumber || 'N/A';
            document.getElementById('membership-type').textContent = data.membershipType || 'Standard';
            document.getElementById('membership-end-date').textContent = new Date(data.endDate).toLocaleDateString();
            document.getElementById('membership-status-text').textContent = data.status || 'Active';
            detailsDiv.style.display = 'block';
            applyDiv.style.display = 'none';
        } else {
            applyDiv.style.display = 'block';
            detailsDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking membership:', error);
        statusDiv.innerHTML = '<div class="alert alert-danger">Failed to load membership status. Please try again.</div>';
    }
}

async function applyForMembership() {
    const membershipType = document.getElementById('membership-type-select').value;
    const messagesDiv = document.getElementById('membership-messages');

    try {
        const response = await fetch(`${API_BASE_URL}/membership/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ membershipType })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success', 3000);
            checkMembershipStatus();
        } else {
            messagesDiv.innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to apply for membership'}</div>`;
        }
    } catch (error) {
        console.error('Error applying for membership:', error);
        messagesDiv.innerHTML = '<div class="alert alert-danger">Network error. Please try again.</div>';
    }
}

async function renewMembership() {
    try {
        const response = await fetch(`${API_BASE_URL}/membership/renew`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success', 3000);
            checkMembershipStatus();
        } else {
            document.getElementById('membership-messages').innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to renew membership'}</div>`;
        }
    } catch (error) {
        console.error('Error renewing membership:', error);
        document.getElementById('membership-messages').innerHTML = '<div class="alert alert-danger">Network error. Please try again.</div>';
    }
}

// ─── Borrowing Functions ──────────────────────────────────────────────────
async function loadBorrowedBooks() {
    const statusDiv = document.getElementById('borrowing-status');
    const listDiv = document.getElementById('borrowed-books-list');
    const noBooksDiv = document.getElementById('no-borrowed-books');
    const notMemberDiv = document.getElementById('not-a-member-message');

    try {
        // First check if user is a member
        const membershipResponse = await fetch(`${API_BASE_URL}/membership/status`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!membershipResponse.ok) {
            statusDiv.style.display = 'none';
            listDiv.style.display = 'none';
            noBooksDiv.style.display = 'none';
            notMemberDiv.style.display = 'block';
            return;
        }

        const membershipData = await membershipResponse.json();

        if (!membershipData.isMember) {
            statusDiv.style.display = 'none';
            listDiv.style.display = 'none';
            noBooksDiv.style.display = 'none';
            notMemberDiv.style.display = 'block';
            return;
        }

        // Load borrowed books
        const booksResponse = await fetch(`${API_BASE_URL}/borrow/my`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!booksResponse.ok) {
            throw new Error('Failed to load borrowed books');
        }

        const borrowedBooks = await booksResponse.json();

        statusDiv.style.display = 'none';
        notMemberDiv.style.display = 'none';

        if (borrowedBooks.length === 0) {
            listDiv.style.display = 'none';
            noBooksDiv.style.display = 'block';
            return;
        }

        const tbody = document.getElementById('borrowed-books-tbody');
        tbody.innerHTML = '';

        borrowedBooks.forEach(borrow => {
            const borrowDate = new Date(borrow.borrowDate).toLocaleDateString();
            const dueDate = new Date(borrow.dueDate).toLocaleDateString();
            const isOverdue = new Date(borrow.dueDate) < new Date() && borrow.status === 'borrowed';
            const statusBadge = isOverdue ? '<span class="badge badge-danger">Overdue</span>' :
                               borrow.status === 'borrowed' ? '<span class="badge badge-warning">Borrowed</span>' :
                               '<span class="badge badge-success">Returned</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${borrow.title}</strong><br>
                    <small class="text-muted">by ${borrow.author}</small>
                </td>
                <td>${borrowDate}</td>
                <td>${dueDate}</td>
                <td>${statusBadge}</td>
                <td>
                    ${borrow.status === 'borrowed' ? `
                        <button class="btn btn-sm btn-success" onclick="returnBook(${borrow.id})" title="Return Book">
                            <i class="fas fa-undo"></i> Return
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="renewBook(${borrow.id})" title="Extend Due Date">
                            <i class="fas fa-sync-alt"></i> Renew
                        </button>
                    ` : `<span class="text-muted">Returned on ${new Date(borrow.returnDate).toLocaleDateString()}</span>`}
                </td>
            `;
            tbody.appendChild(row);
        });

        listDiv.style.display = 'block';
        noBooksDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading borrowed books:', error);
        statusDiv.innerHTML = '<div class="alert alert-danger">Failed to load borrowed books. Please try again.</div>';
    }
}

async function returnBook(borrowId) {
    if (!confirm('Are you sure you want to return this book?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/borrow/return/${borrowId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success', 3000);
            loadBorrowedBooks();
        } else {
            document.getElementById('borrowing-messages').innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to return book'}</div>`;
        }
    } catch (error) {
        console.error('Error returning book:', error);
        document.getElementById('borrowing-messages').innerHTML = '<div class="alert alert-danger">Network error. Please try again.</div>';
    }
}

async function renewBook(borrowId) {
    try {
        const response = await fetch(`${API_BASE_URL}/borrow/renew/${borrowId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success', 3000);
            loadBorrowedBooks();
        } else {
            document.getElementById('borrowing-messages').innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to renew book'}</div>`;
        }
    } catch (error) {
        console.error('Error renewing book:', error);
        document.getElementById('borrowing-messages').innerHTML = '<div class="alert alert-danger">Network error. Please try again.</div>';
    }
}

// ─── Events Functions ─────────────────────────────────────────────────────
async function loadEvents() {
    const listDiv = document.getElementById('events-list');
    if (!listDiv) return;
    listDiv.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Loading events...</div>';
    try {
        const response = await fetch(`${API_BASE_URL}/events`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch events');
        const events = await response.json();
        if (events.length === 0) {
            listDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-calendar-alt" style="font-size:2rem;opacity:.3;"></i><p class="mt-2 text-muted">No upcoming events.</p></div>';
            return;
        }
        listDiv.innerHTML = events.map(e => `
            <div class="p-3 mb-2 rounded" style="border-left:4px solid #5bc0de;background:#1e1e1e;">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${e.title}</strong>
                        <p class="mb-1">${e.description || ''}</p>
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt"></i> ${e.location || 'TBA'} | 
                            <i class="fas fa-clock"></i> ${new Date(e.eventDate).toLocaleString()} | 
                            <i class="fas fa-users"></i> ${e.attendeeCount || 0}/${e.maxAttendees || '∞'}
                        </small>
                    </div>
                    <div>
                        ${e.isRegistered ? '<span class="badge badge-success">Registered</span>' : `<button class="btn btn-primary btn-sm" onclick="registerForEvent(${e.id})">Register</button>`}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = '<div class="text-center text-danger">Failed to load events.</div>';
    }
}

async function registerForEvent(eventId) {
    if (!isUserLoggedIn()) { showToast('Please log in to register for events.', 'error'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, { method: 'POST', headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok) { showToast(data.message, 'success'); loadEvents(); }
        else { showToast(data.error || 'Failed to register.', 'error'); }
    } catch (error) { showToast('Network error.', 'error'); }
}
