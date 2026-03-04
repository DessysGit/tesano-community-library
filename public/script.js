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


// Define the seed admin username
const seedAdminUsername = 'admin';

// Initialize user role
let userRole = "";

// Ensure the necessary elements are hidden on initial load
document.addEventListener('DOMContentLoaded', async () => {    
    // Show loading state initially
    showLoadingState();
    
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
            // User is not authenticated - redirect to auth page
            window.location.href = 'auth.html';
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
        window.location.href = 'auth.html';
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
    buttonElement.disabled = false;
    buttonElement.classList.remove('loading');
    const originalText = buttonElement.getAttribute('data-original-text') || 'Submit';
    buttonElement.innerHTML = originalText;
    buttonElement.removeAttribute('data-original-text');
}

// Function to show loading state overlay
function showLoadingState() {
    // Create or show loading overlay
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

// Function to check if the user is logged in
function isUserLoggedIn() {
    // Check if a token is present in localStorage
    return localStorage.getItem('authToken') !== null;
}

// Function to handle login
async function login() {
    const emailOrUsername = document.getElementById('login-email-username').value.trim();
    const password = document.getElementById('login-password').value;
    const loginButton = document.querySelector('#login-form .btn-primary');

    // Clear previous messages
    document.getElementById('login-messages').innerHTML = '';

    if (!emailOrUsername || !password) {
        displayMessage('login-messages', 'Please fill in all fields', 'error');
        return;
    }

    // Show spinner immediately
    showButtonSpinner(loginButton, 'Sign In');

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                emailOrUsername: emailOrUsername,
                password: password 
            })
        });

        if (response.ok) {
            const user = await response.json();
            
            // Set user role
            userRole = user.role;

            // Initialize chatbot with username
            window.currentUsername = user.username;
            await initializeChatbot();
            
            // Hide login forms and show main app
            const hamburgerButton = document.getElementById('hamburger-button');
            const searchBooksSection = document.getElementById('search-books');
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const resendModal = document.getElementById('resend-verification-modal');
            const newsletterSection = document.getElementById('newsletter-section');
            const mainContent = document.getElementById('main-content');
            const footer = document.getElementById('footer');

            // Hide forms and show main content
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'none';
            if (resendModal) resendModal.style.display = 'none';
            
            // Show authenticated UI
            if (hamburgerButton) hamburgerButton.style.display = 'block';
            if (searchBooksSection) searchBooksSection.style.display = 'block';
            if (newsletterSection) newsletterSection.style.display = 'block';
            if (mainContent) mainContent.style.display = 'block';
            if (footer) footer.style.display = 'block';

            // Handle admin controls
            if (userRole === 'admin') {
                const sidebarAdminControls = document.getElementById('sidebar-admin-controls');
                if (sidebarAdminControls) {
                    sidebarAdminControls.style.display = 'block';
                }
                
                const addBookLink = document.getElementById('add-book-link');
                const manageUsersLink = document.getElementById('manage-users-link');
                
                if (addBookLink) addBookLink.style.display = 'block';
                if (manageUsersLink) manageUsersLink.style.display = 'block';
            }

            // Update sidebar with user info
            const burgerUsername = document.getElementById('burger-username');
            if (burgerUsername) burgerUsername.innerText = user.username;
            
            // Wait a moment for the session to be fully established
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Now make authenticated requests
            try {
                await refreshProfilePicture();
            } catch (error) {
                // Profile picture refresh failed silently
            }

            // Fetch fresh data
            fetchBooks();
            
            const chatIcon = document.getElementById('chat-icon');
            if (chatIcon) chatIcon.style.display = 'block';
            
            // Clear form
            document.getElementById('login-email-username').value = '';
            document.getElementById('login-password').value = '';
            
        } else {
            const data = await response.json();
            let errorMessage = data.error || data.message || 'Login failed';
            
            // Handle email verification error specifically
            if (data.error === 'Email not verified') {
                errorMessage = data.message + '<br><small><a href="#" onclick="showResendVerificationWithEmail(\'' + data.userEmail + '\')">Click here to resend verification email</a></small>';
            }
            
            displayMessage('login-messages', errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        displayMessage('login-messages', 'Network error. Please try again.', 'error');
    } finally {
        // Always hide spinner
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
    
    // Clear messages
    document.getElementById('resend-messages').innerHTML = '';
}

// Hide resend verification form
function hideResendVerification() {
    const resendModal = document.getElementById('resend-verification-modal');
    const loginForm = document.getElementById('login-form');
    
    if (resendModal) resendModal.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    
    // Clear form and messages
    document.getElementById('resend-email').value = '';
    document.getElementById('resend-messages').innerHTML = '';
}

// Resend verification email
async function resendVerification() {
    const email = document.getElementById('resend-email').value.trim();
    const resendButton = document.querySelector('#resend-verification-modal .btn-success');
    
    // Clear previous messages
    document.getElementById('resend-messages').innerHTML = '';

    if (!email) {
        displayMessage('resend-messages', 'Email is required', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        displayMessage('resend-messages', 'Please enter a valid email address', 'error');
        return;
    }

    // Show spinner immediately
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
            
            // Additional helpful message
            setTimeout(() => {
                displayMessage('resend-messages', 
                    data.message + '<br><br><strong>Remember:</strong><br>• Check your spam folder<br>• The link expires in 24 hours<br>• Come back here to log in after verifying', 
                    'success'
                );
            }, 2000);
            
            // Automatically go back to login after 6 seconds
            setTimeout(() => {
                hideResendVerification();
                displayMessage('login-messages', 'Verification email sent! Please check your email and click the link.', 'info');
            }, 6000);
            
        } else {
            displayMessage('resend-messages', data.message || data.error || 'Failed to resend verification email', 'error');
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        displayMessage('resend-messages', 'Network error. Please try again.', 'error');
    } finally {
        // Always hide spinner
        hideButtonSpinner(resendButton);
    }
}

// Check if we're on the email verification page
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a verification page load
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token && window.location.pathname.includes('verify-email')) {
        // This is handled by the server route /verify-email
        // No additional JavaScript needed
        return;
    }
    
    // Continue with normal page initialization
    checkAuthStatus();
    setupOutsideClickListener();
});

// Function to handle logout
async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, { 
            method: 'POST', 
            credentials: 'include' 
        });
        
        if (response.ok) {
            // Clear form inputs
            const loginUsername = document.getElementById('login-username');
            const loginPassword = document.getElementById('login-password');
            if (loginUsername) loginUsername.value = "";
            if (loginPassword) loginPassword.value = "";

            // Clear only auth-related localStorage items - DON'T use localStorage.clear()
            localStorage.removeItem('authState');
            localStorage.removeItem('userData');

            // Get all UI elements that need to be hidden/shown
            const hamburgerButton = document.getElementById('hamburger-button');
            const searchBooksSection = document.getElementById('search-books');
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const manageUsersLink = document.getElementById('manage-users-link');
            const addBookLink = document.getElementById('add-book-link');
            const adminButton = document.getElementById('admin-button');
            const adminSection = document.getElementById('admin-section');
            const profileSection = document.getElementById('profile-section');
            const addBookSection = document.getElementById('add-book-section');
            const bookList = document.getElementById('book-list');
            const pagination = document.getElementById('pagination');
            const newsletterSection = document.getElementById('newsletter-section');
            const mainContent = document.getElementById('main-content');
            const footer = document.getElementById('footer');
            const sidebar = document.getElementById('sidebar');
            const chatIcon = document.getElementById('chat-icon');

            // Hide authenticated user sections
            if (hamburgerButton) hamburgerButton.style.display = 'none';
            if (searchBooksSection) searchBooksSection.style.display = 'none';
            if (manageUsersLink) manageUsersLink.style.display = 'none';
            if (addBookLink) addBookLink.style.display = 'none';
            if (adminButton) adminButton.style.display = 'none';
            if (adminSection) adminSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';
            if (addBookSection) addBookSection.style.display = 'none';
            if (newsletterSection) newsletterSection.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            if (footer) footer.style.display = 'none';
            if (chatIcon) chatIcon.style.display = 'none';

            // Show login form
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';

            // Clear dynamic content
            if (bookList) bookList.innerHTML = "";
            if (pagination) pagination.innerHTML = "";

            // Close sidebar if open
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }

            // Clear profile picture elements - NO localStorage clearing
            const profilePicture = document.getElementById('profile-picture');
            const burgerProfilePicture = document.getElementById('burger-profile-picture');
            if (profilePicture) profilePicture.src = '';
            if (burgerProfilePicture) burgerProfilePicture.src = '';

            // Reset global variables
            userRole = "";

            // Redirect to auth page
            window.location.href = "auth.html";
        } else {
            alert('Failed to log out');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to log out');
    }
}

// Function to close the sidebar when clicking outside of it
function closeMenuOnClickOutside(event) {
    const sidebar = document.getElementById('sidebar');
    const hamburgerButton = document.getElementById('hamburger-button');
    if (!sidebar.contains(event.target) && !hamburgerButton.contains(event.target)) {
        sidebar.classList.remove('active');
        document.removeEventListener('click', closeMenuOnClickOutside);
    }
}

// Function to set up the outside click listener
function setupOutsideClickListener() {
    document.addEventListener('click', (event) => {
        const sidebar = document.getElementById('sidebar');
        const hamburgerButton = document.getElementById('hamburger-button');

        if (sidebar.classList.contains('active')) {
            const isClickInsideMenu = sidebar.contains(event.target);
            const isClickInsideButton = hamburgerButton.contains(event.target);

            if (!isClickInsideMenu && !isClickInsideButton) {
                sidebar.classList.remove('active');
                document.removeEventListener('click', closeMenuOnClickOutside);
            }
        }
    });
}

// Function to handle newsletter subscription
async function subscribeNewsletter(event) {
    event.preventDefault();
    const email = document.getElementById('subscription-email').value;
    const response = await fetch(`${API_BASE_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
    });
    if (response.ok) {
        alert('Subscribed successfully');
        document.getElementById('subscription-email').value = ""; // Clear the input field
    } else {
        const errorMessage = await response.text();
        alert('Failed to subscribe: ' + errorMessage);
    }
}

// Function to toggle the sidebar menu
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');

    if (sidebar.classList.contains('active')) {
        // ADD THIS LINE - Refresh profile picture when sidebar opens
        refreshProfilePicture();
        document.addEventListener('click', closeMenuOnClickOutside);
    } else {
        document.removeEventListener('click', closeMenuOnClickOutside);
    }
}

// Function to show specific sections
async function showSection(sectionId) {
    const sections = document.querySelectorAll('#register-form, #login-form, #search-books, #profile-section, #admin-section, #add-book-section, .newsletter-section');
    sections.forEach(section => {
        if (section) section.style.display = section.id === sectionId ? 'block' : 'none';
    });

    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset the search inputs when switching sections
    const searchTitle = document.getElementById('search-title');
    const searchAuthor = document.getElementById('search-author');
    const searchGenre = document.getElementById('search-genre');
    const bookList = document.getElementById('book-list');
    const pagination = document.getElementById('pagination');

    if (sectionId === 'search-books') {
        fetchBooks();
    } else {
        if (searchTitle) searchTitle.value = "";
        if (searchAuthor) searchAuthor.value = "";
        if (searchGenre) searchGenre.value = "";
        if (bookList) bookList.innerHTML = "";
        if (pagination) pagination.innerHTML = "";
    }

    // Hide newsletter and footer sections for non-main sections
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
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }

    // Fetch users when the "Manage Users" section is shown
    if (sectionId === 'admin-section') {
        fetchUsers();
    }

    // Refresh profile picture when showing profile section
    if (sectionId === 'profile-section') {
        loadProfileData();
        await refreshProfilePicture();
    }

    // Hide Add Book section if user is not admin
    if (sectionId === 'add-book-section' && userRole !== 'admin') {
        alert('You do not have access to this section.');
        showSection('search-books');
    }
}


// function to runcate text to a specified number of characters while preserving word boundaries
function truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) {
        return text || '';
    }
    
    // Find the last space within the limit to avoid cutting words
    let truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) { // Only cut at word boundary if it's not too far back
        truncated = truncated.substring(0, lastSpaceIndex);
    }
    
    return truncated + '...';
}

// Add a reusable function to handle fetch errors
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
        alert('An error occurred: ' + error.message);
        throw error;
    }
}

// Using fetchWithErrorHandling in fetchBooks
async function fetchBooks(query = "", page = 1) {
    
    const titleInput = document.getElementById('search-title');
    const authorInput = document.getElementById('search-author');
    const genreInput = document.getElementById('search-genre');

    // Check if we're on the correct page with search inputs
    if (!titleInput || !authorInput || !genreInput) {
        return;
    }

    const title = titleInput ? titleInput.value : query;
    const author = authorInput ? authorInput.value : "";
    const genre = genreInput ? genreInput.value : "";

    const limit = 10;
    const searchQuery = `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&genre=${encodeURIComponent(genre)}&page=${page}&limit=${limit}`;

    // Show the searching message
    const searchingMsg = document.getElementById('searching-msg');
    if (searchingMsg) searchingMsg.style.display = 'block';

    try {
        showLoadingSpinner();
        
        const response = await fetch(`${API_BASE_URL}/books?${searchQuery}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const books = data.books || [];
        const totalBooks = data.total || 0;
        const totalPages = Math.ceil(totalBooks / limit);
        const bookList = document.getElementById('book-list');
        const pagination = document.getElementById('pagination');
        const noResultsMessage = document.getElementById('no-results-message');

        // Display message if no books are found
        if (books.length === 0) {
            if (noResultsMessage) noResultsMessage.style.display = 'block';
        } else {
            if (noResultsMessage) noResultsMessage.style.display = 'none';
        }

        // Update the book list
        if (bookList) {
            bookList.innerHTML = "";
            books.forEach(book => {
                // Fix: prepend API_BASE_URL if cover is a relative path
                let coverUrl = book.cover || '';
                if (coverUrl && coverUrl.startsWith('/uploads/')) {
                    coverUrl = API_BASE_URL + coverUrl;
                }

                // Truncate the description for consistent card heights
                // Let CSS handle line clamping instead
                const truncatedDescription = book.description || 'No description available';

                
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
                                <p class="description-text" title="${book.description || 'No description available'}">${truncatedDescription}</p>
                            </div>
                        </div>
                        <div class="like-dislike-ratings">
                            <div class="like-dislike-buttons">
                                <button class="like-button" onclick="handleLikeDislike(${book.id}, 'like')">👍 ${book.likes || 0}</button>
                                <button class="dislike-button" onclick="handleLikeDislike(${book.id}, 'dislike')">👎 ${book.dislikes || 0}</button>
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="showBookDetails(${book.id})">Download</button>
                            <div class="ratings">
                                <span>
                                    <i class="fas fa-star text-warning"></i> 
                                    ${book.averageRating ? book.averageRating.toFixed(1) : 'N/A'} (${book.totalRatings || 0} ratings)
                                </span>
                            </div>
                        </div>
                    </div>
                `;
                bookList.appendChild(bookItem);

                // Highlight the like/dislike buttons based on user action
                const userAction = getUserAction(book.id);
                updateLikeDislikeUI(book.id, book.likes || 0, book.dislikes || 0, userAction);
            });
        }

        // Clear and update the pagination
        if (pagination) {
            pagination.innerHTML = "";
            for (let i = 1; i <= totalPages; i++) {
                const pageItem = document.createElement('li');
                pageItem.classList.add('page-item');
                if (i === page) {
                    pageItem.classList.add('active');
                }
                pageItem.innerHTML = `<button class="page-link" onclick="fetchBooks('${title}', ${i})">${i}</button>`;
                pagination.appendChild(pageItem);
            }
        }
    } catch (error) {
        console.error('Error fetching books:', error);
        const bookList = document.getElementById('book-list');
        if (bookList) {
            bookList.innerHTML = '<p class="text-center text-danger">Error loading books. Please try again.</p>';
        }
    } finally {
        hideLoadingSpinner();
        // Hide the searching message
        if (searchingMsg) searchingMsg.style.display = 'none';
    }

    // Force the page to scroll to the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Function to handle like/dislike actions
function updateLikeDislikeUI(bookId, likes, dislikes, action) {
    const likeButton = document.querySelector(`#book-${bookId} .like-button`);
    const dislikeButton = document.querySelector(`#book-${bookId} .dislike-button`);

    if (likeButton) {
        likeButton.innerHTML = `👍 ${likes}`;
        likeButton.classList.toggle('active', action === 'like'); // Highlight if liked
    }
    if (dislikeButton) {
        dislikeButton.innerHTML = `👎 ${dislikes}`;
        dislikeButton.classList.toggle('active', action === 'dislike'); // Highlight if disliked
    }
}


function getUserAction(bookId) {
    return localStorage.getItem(`book-${bookId}-reaction`);
}

// Function to clear search fields
function clearSearchFields() {
    const searchTitle = document.getElementById('search-title');
    const searchAuthor = document.getElementById('search-author');
    const searchGenre = document.getElementById('search-genre');

    if (searchTitle) searchTitle.value = "";
    if (searchAuthor) searchAuthor.value = "";
    if (searchGenre) searchGenre.value = "";
}

function toggleAdvancedFilters() {
    const filters = document.getElementById('advanced-filters');
    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
  }
  

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
    buttonElement.disabled = false;
    buttonElement.classList.remove('loading');
    const originalText = buttonElement.getAttribute('data-original-text') || 'Submit';
    buttonElement.innerHTML = originalText;
    buttonElement.removeAttribute('data-original-text');
}

// Functions to show/hide a global loading spinner
function showLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

// Function to fetch users and update the user list
async function fetchUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, { credentials: 'include' });
        if (response.ok) {
            const users = await response.json();
            const userList = document.getElementById('user-list');
            if (userList) {
                userList.innerHTML = ""; // Clear the list before rendering
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
  </tr>
`;
                    userList.appendChild(userItem);
                });
            }
        } else {
            console.error('Failed to fetch users:', await response.text());
            alert('Failed to fetch users.');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        alert('An error occurred while fetching users.');
    }
}

// Function to grant admin role to a user
async function grantAdmin(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/grant-admin`, { method: 'POST', credentials: 'include' });
    if (response.ok) {
        fetchUsers(); // Refresh user list after granting admin role
    } else {
        const errorMessage = await response.text();
        alert('Failed to grant admin role: ' + errorMessage);
    }
}

// Function to revoke admin role from a user
async function revokeAdmin(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/revoke-admin`, { method: 'POST', credentials: 'include' });
    if (response.ok) {
        fetchUsers(); // Refresh user list after revoking admin role
    } else {
        const errorMessage = await response.text();
        alert('Failed to revoke admin role: ' + errorMessage);
    }
}

// Function to delete a user
async function deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, { 
        method: 'DELETE',
        credentials: 'include'
    });
    if (response.ok) {
        fetchUsers(); // Refresh user list after deleting user
    } else {
        const errorMessage = await response.text();
        alert('Failed to delete user: ' + errorMessage);
    }
}

function confirmDeleteUser(userId, username) {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        deleteUser(userId);
    }
}

// Function to add a book
async function addBook() {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const description = document.getElementById('description').value;
    const genres = document.getElementById('genres').value.split(",").map(genre => genre.trim());
    const bookCover = document.getElementById('book-cover').files[0];
    const bookFile = document.getElementById('book-file').files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    formData.append('genres', JSON.stringify(genres));

    if (bookCover) formData.append('cover', bookCover); 
    if (bookFile) formData.append('bookFile', bookFile);

    try {
        const response = await fetch(`${API_BASE_URL}/books`, { 
            method: 'POST', 
            body: formData, 
            credentials: 'include' 
        });
        if (response.ok) {
            alert('Book added successfully');
            clearAddBookFields(); // Clear fields after successful addition
            showSection('search-books');
        } else {
            const errorMessage = await response.text();
            alert('Failed to add book: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Failed to add book: ' + error.message);
    }
}


// Function to clear add book fields
function clearAddBookFields() {
    document.getElementById('title').value = "";
    document.getElementById('author').value = "";
    document.getElementById('description').value = "";
    document.getElementById('genres').value = "";
    document.getElementById('book-cover').value = "";
    document.getElementById('book-file').value = "";
}

// Function to edit a book
async function editBook(bookId) {
    const title = prompt('Enter new title:');
    const author = prompt('Enter new author:');
    const description = prompt('Enter new description:');
    if (title && author && description) {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, description })
        });
        if (response.ok) {
            fetchBooks();
        } else {
            const errorMessage = await response.text();
            alert('Failed to edit book: ' + errorMessage);
        }
    }
}

// Function to delete a book
async function deleteBook(bookId) {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, { method: 'DELETE', credentials: 'include' });
    if (response.ok) {
        fetchBooks();
    } else {
        const errorMessage = await response.text();
        alert('Failed to delete book: ' + errorMessage);
    }
}
function confirmDeleteBook(bookId, bookTitle) {
    if (confirm(`Are you sure you want to delete the book "${bookTitle}"?`)) {
        deleteBook(bookId);
    }
}

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Username validation function
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username) && username.length >= 3;
}

function showResendVerificationWithEmail(email) {
    showResendVerification();
    if (email) {
        document.getElementById('resend-email').value = email;
    }
}

// Display message function
function displayMessage(elementId, message, type = 'error') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        let alertClass = 'alert-danger'; // default
        if (type === 'success') alertClass = 'alert-success';
        if (type === 'info') alertClass = 'alert-info';
        
        messageElement.innerHTML = `<div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" onclick="this.parentElement.style.display='none'"></button>
        </div>`;
        
        // Auto-hide success messages after 8 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageElement.innerHTML.includes('alert-success')) {
                    messageElement.innerHTML = '';
                }
            }, 8000);
        }
        
        // Auto-hide info messages after 10 seconds
        if (type === 'info') {
            setTimeout(() => {
                if (messageElement.innerHTML.includes('alert-info')) {
                    messageElement.innerHTML = '';
                }
            }, 10000);
        }
    }
}

// Function to register a new user
async function register() {
    const email = document.getElementById('register-email').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const registerButton = document.querySelector('#register-form .btn-primary');

    // Clear previous messages
    document.getElementById('register-messages').innerHTML = '';

    // Client-side validation
    const errors = [];

    if (!email) {
        errors.push('Email is required');
    } else if (!isValidEmail(email)) {
        errors.push('Please enter a valid email address');
    }

    if (!username) {
        errors.push('Username is required');
    } else if (!isValidUsername(username)) {
        errors.push('Username must be at least 3 characters and contain only letters, numbers, and underscores');
    }

    if (!password) {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (!confirmPassword) {
        errors.push('Please confirm your password');
    } else if (password !== confirmPassword) {
        errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
        displayMessage('register-messages', errors.join('<br>'), 'error');
        return;
    }

    // Show spinner immediately
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
            
            // Clear form
            document.getElementById('register-email').value = '';
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm-password').value = '';
            
            // Show additional message about checking email
            setTimeout(() => {
                displayMessage('register-messages', 
                    data.message + '<br><br><strong>Next steps:</strong><br>1. Check your email inbox (and spam folder)<br>2. Click the verification link<br>3. Return here to log in', 
                    'success'
                );
            }, 1000);
            
            // Automatically show login form after 5 seconds
            setTimeout(() => {
                showLoginForm();
                displayMessage('login-messages', 'Please check your email and click the verification link, then log in here.', 'info');
            }, 5000);
            
        } else {
            if (data.errors && data.errors.length > 0) {
                const errorMessages = data.errors.map(error => error.msg).join('<br>');
                displayMessage('register-messages', errorMessages, 'error');
            } else {
                displayMessage('register-messages', data.error || 'Registration failed', 'error');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        displayMessage('register-messages', 'Network error. Please try again.', 'error');
    } finally {
        // Always hide spinner
        hideButtonSpinner(registerButton);
    }
}

// Function to show the login form
function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const resendModal = document.getElementById('resend-verification-modal');
    const mainContent = document.getElementById('main-content');
    const newsletterSection = document.getElementById('newsletter-section');
    const recommendationsSection = document.getElementById('recommendations-section');
    const hamburgerButton = document.getElementById('hamburger-button');
    const searchBooksSection = document.getElementById('search-books');
    const footer = document.getElementById('footer');
    const adminButton = document.getElementById('admin-button');
    const profileSection = document.getElementById('profile-section');
    const manageUsersLink = document.getElementById('manage-users-link');

    // Show login form and hide others
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (resendModal) resendModal.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (newsletterSection) newsletterSection.style.display = 'none';
    if (recommendationsSection) recommendationsSection.style.display = 'none';
    if (hamburgerButton) hamburgerButton.style.display = 'none';
    if (searchBooksSection) searchBooksSection.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (adminButton) adminButton.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (manageUsersLink) manageUsersLink.style.display = 'none';
    
    // Clear messages
    document.getElementById('login-messages').innerHTML = '';
}

// Function to show the registration form
function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const resendModal = document.getElementById('resend-verification-modal');

    // Show registration form and hide others
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (resendModal) resendModal.style.display = 'none';
    
    // Clear messages
    document.getElementById('register-messages').innerHTML = '';
    
    // Initialize password strength after form is shown
    setTimeout(initializePasswordStrength, 100);
}

// Password strength indicator functionality
function initializePasswordStrength() {
    const passwordInput = document.getElementById('register-password');
    const strengthContainer = passwordInput?.parentElement.querySelector('.password-strength');
    const strengthBar = strengthContainer?.querySelector('.password-strength-bar');

    if (!passwordInput || !strengthContainer || !strengthBar) {
        return;
    }

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        updatePasswordStrengthUI(strengthContainer, strengthBar, strength);
    });
}

function calculatePasswordStrength(password) {
    if (!password) return { level: 'none', score: 0 };

    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1; // lowercase
    if (/[A-Z]/.test(password)) score += 1; // uppercase  
    if (/[0-9]/.test(password)) score += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special characters

    // Determine strength level
    let level = 'weak';
    if (score >= 5) {
        level = 'strong';
    } else if (score >= 3) {
        level = 'medium';
    }

    return { level, score };
}

function updatePasswordStrengthUI(container, bar, strength) {
    // Remove existing strength classes
    container.classList.remove('password-strength-weak', 'password-strength-medium', 'password-strength-strong');
    
    // Add appropriate class based on strength
    if (strength.level !== 'none') {
        container.classList.add(`password-strength-${strength.level}`);
    }

    // Update the visual bar
    const widthPercentage = Math.min((strength.score / 7) * 100, 100);
    bar.style.width = `${widthPercentage}%`;
    
    // Optional: Add color changes
    if (strength.level === 'weak') {
        bar.style.backgroundColor = '#dc3545';
    } else if (strength.level === 'medium') {
        bar.style.backgroundColor = '#ffc107';
    } else if (strength.level === 'strong') {
        bar.style.backgroundColor = '#28a745';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize password strength if register form exists
    if (document.getElementById('register-form')) {
        setTimeout(initializePasswordStrength, 100);
    }
});

// Add enter key support for forms
document.addEventListener('DOMContentLoaded', () => {
    // Login form enter key
    const loginEmailUsername = document.getElementById('login-email-username');
    const loginPassword = document.getElementById('login-password');
    
    if (loginEmailUsername) {
        loginEmailUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
    
    // Register form enter key
    const registerConfirmPassword = document.getElementById('register-confirm-password');
    if (registerConfirmPassword) {
        registerConfirmPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') register();
        });
    }
    
    // Resend verification form enter key
    const resendEmail = document.getElementById('resend-email');
    if (resendEmail) {
        resendEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') resendVerification();
        });
    }
});

// Function to enable profile editing
function enableProfileEditing() {
    document.getElementById('profile-email').disabled = false;
    document.getElementById('profile-genres').disabled = false;
    document.getElementById('profile-authors').disabled = false;
    document.getElementById('profile-books').disabled = false;
    document.getElementById('edit-profile-button').style.display = 'none';
    document.getElementById('save-profile-button').style.display = 'block';
}

// Function to disable profile editing
function disableProfileEditing() {
    document.getElementById('profile-email').disabled = true;
    document.getElementById('profile-genres').disabled = true;
    document.getElementById('profile-authors').disabled = true;
    document.getElementById('profile-books').disabled = true;
    document.getElementById('edit-profile-button').style.display = 'block';
    document.getElementById('save-profile-button').style.display = 'none';
}

// Function to update user profile
async function updateProfile() {
    const email = document.getElementById('profile-email').value;
    const password = document.getElementById('profile-password').value;
    const favoriteGenres = document.getElementById('profile-genres').value;
    const favoriteAuthors = document.getElementById('profile-authors').value;
    const favoriteBooks = document.getElementById('profile-books').value;

    const response = await fetch(`${API_BASE_URL}/users/updateProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, favoriteGenres, favoriteAuthors, favoriteBooks })
    });

    if (response.ok) {
        alert('Profile updated successfully');
        fetchProfile();
        disableProfileEditing();
    } else {
        const errorMessage = await response.text();
        alert('Failed to update profile: ' + errorMessage);
    }
}

// Function to upload profile picture
async function uploadProfilePicture() {
    const fileInput = document.getElementById('profile-picture-input');
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('profilePicture', fileInput.files[0]);
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/upload-profile-picture`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                let profilePictureUrl = data.profilePicture;
                
                // Only modify local URLs, not Cloudinary URLs
                if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
                    profilePictureUrl = API_BASE_URL + profilePictureUrl;
                }
                
                // Add timestamp cache-busting
                const timestamp = '?timestamp=' + new Date().getTime();
                document.getElementById('profile-picture').src = profilePictureUrl + timestamp;
                document.getElementById('burger-profile-picture').src = profilePictureUrl + timestamp;
                
                alert('Profile picture uploaded successfully.');
            } else {
                const errorMessage = await response.text();
                alert('Failed to upload profile picture: ' + errorMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to upload profile picture: ' + error.message);
        }
    } else {
        alert('Please select a profile picture to upload.');
    }
}

// Add event listener to profile picture input for automatic upload
const profilePictureInput = document.getElementById('profile-picture-input');
if (profilePictureInput) {
    profilePictureInput.addEventListener('change', uploadProfilePicture);
}

// function to refresh profile picture from database
async function refreshProfilePicture() {
    // Default SVG image for users without profile pictures
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23444" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="32" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();

            // Use default if no profile picture
            let profilePictureUrl = user.profilePicture || defaultImage;

            // Add timestamp to prevent caching
            const timestamp = '?t=' + new Date().getTime();

            // Handle relative URLs (local uploads)
            if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
                profilePictureUrl = API_BASE_URL + profilePictureUrl;
            }

            const profilePic = document.getElementById('profile-picture');
            const burgerProfilePic = document.getElementById('burger-profile-picture');

            // Update both profile pictures
            if (profilePic) {
                profilePic.src = profilePictureUrl.includes('data:') ? profilePictureUrl : profilePictureUrl + timestamp;
                profilePic.onerror = function() {
                    this.src = defaultImage;
                };
            }

            if (burgerProfilePic) {
                burgerProfilePic.src = profilePictureUrl.includes('data:') ? profilePictureUrl : profilePictureUrl + timestamp;
                burgerProfilePic.onerror = function() {
                    this.src = defaultImage;
                };
            }

        } else {
            console.warn('Failed to fetch profile, using default image');
            setDefaultProfilePictures();
        }
    } catch (error) {
        console.error('Error refreshing profile picture:', error);
        setDefaultProfilePictures();
    }
}

// Helper function to set default profile pictures
function setDefaultProfilePictures() {
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23444" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="32" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';
    const defaultImageLarge = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23444" width="120" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="48" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';

    const profilePic = document.getElementById('profile-picture');
    const burgerProfilePic = document.getElementById('burger-profile-picture');

    if (profilePic) profilePic.src = defaultImageLarge;
    if (burgerProfilePic) burgerProfilePic.src = defaultImage;
}

// Function to fetch user profile and display it
async function fetchProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            
            // Update form fields
            document.getElementById('profile-email').value = user.email || '';
            document.getElementById('profile-genres').value = user.favoriteGenres || '';
            document.getElementById('profile-authors').value = user.favoriteAuthors || '';
            document.getElementById('profile-books').value = user.favoriteBooks || '';
            
            // RESTORE: Handle profile picture with timestamp like the old working code
            if (user.profilePicture) {
                let profilePictureUrl = user.profilePicture;
                if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
                    profilePictureUrl = API_BASE_URL + profilePictureUrl;
                }
                const timestamp = '?timestamp=' + new Date().getTime();
                document.getElementById('profile-picture').src = profilePictureUrl + timestamp;
                document.getElementById('burger-profile-picture').src = profilePictureUrl + timestamp;
            }
        } else {
            alert('Failed to fetch profile');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        alert('Failed to fetch profile');
    }
}

// Function to show the user profile section
function showProfileSection() {
    document.getElementById('profile-section').style.display = 'block';
    fetchProfile();
    disableProfileEditing();
}

// Function to check initial auth status
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            userRole = user.role;

            window.currentUsername = user.username;
            // Initialize chatbot for authenticated users
            await initializeChatbot();

            // Show authenticated UI elements
            const loginForm = document.getElementById('login-form');
            const mainContent = document.getElementById('main-content');
            const newsletterSection = document.getElementById('newsletter-section');
            const hamburgerButton = document.getElementById('hamburger-button');
            const searchBooksSection = document.getElementById('search-books');
            const footer = document.getElementById('footer');
            const profileSection = document.getElementById('profile-section');
            const addBookSection = document.getElementById('add-book-section');
            const burgerUsername = document.getElementById('burger-username');

            // Update UI elements
            if (loginForm) loginForm.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (newsletterSection) newsletterSection.style.display = 'block';
            if (hamburgerButton) hamburgerButton.style.display = 'block';
            if (searchBooksSection) searchBooksSection.style.display = 'block';
            if (footer) footer.style.display = 'block';

            // Hide other sections by default
            if (addBookSection) addBookSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';

            // Update sidebar with user info
            if (burgerUsername) burgerUsername.innerText = user.username;
            
            // Always refresh profile picture from database instead of relying on session
            await refreshProfilePicture();

            // Handle admin-specific UI elements
            if (userRole === 'admin') {
                // Show the admin controls container
                const sidebarAdminControls = document.getElementById('sidebar-admin-controls');
                if (sidebarAdminControls) {
                    sidebarAdminControls.style.display = 'block';
                }
                
                // Show individual admin links
                const addBookLink = document.getElementById('add-book-link');
                const manageUsersLink = document.getElementById('manage-users-link');
                
                if (addBookLink) addBookLink.style.display = 'block';
                if (manageUsersLink) manageUsersLink.style.display = 'block';
            } else {
                // Hide admin controls for non-admin users
                const sidebarAdminControls = document.getElementById('sidebar-admin-controls');
                if (sidebarAdminControls) {
                    sidebarAdminControls.style.display = 'none';
                }
            }

            const chatIcon = document.getElementById('chat-icon');
            if (chatIcon) chatIcon.style.display = 'block';
            
            return true;
        } else {
            // Not authenticated
            const chatIcon = document.getElementById('chat-icon');
            if (chatIcon) chatIcon.style.display = 'none';
            return false;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        const chatIcon = document.getElementById('chat-icon');
        if (chatIcon) chatIcon.style.display = 'none';
        return false;
    }
}

// Store authentication state in localStorage for faster initial load
function setAuthState(isAuthenticated, userData = null) {
    if (isAuthenticated && userData) {
        localStorage.setItem('authState', 'authenticated');
        localStorage.setItem('userData', JSON.stringify({
            username: userData.username,
            role: userData.role,
            profilePicture: userData.profilePicture
        }));
    } else {
        localStorage.removeItem('authState');
        localStorage.removeItem('userData');
    }
}

function getStoredAuthState() {
    return {
        isAuthenticated: localStorage.getItem('authState') === 'authenticated',
        userData: JSON.parse(localStorage.getItem('userData') || 'null')
    };
}

// Function to handle like and dislike actions
async function handleLikeDislike(bookId, action) {
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}/${action}`, { method: 'POST', credentials: 'include' });
        if (response.ok) {
            const { likes, dislikes } = await response.json();

            // Update the like/dislike counts on the book-details page
            if (document.getElementById('like-count') && document.getElementById('dislike-count')) {
                document.getElementById('like-count').innerText = likes;
                document.getElementById('dislike-count').innerText = dislikes;
            }

            // Update the like/dislike UI on the main page dynamically
            syncLikeDislikeAcrossPages(bookId, likes, dislikes, action);
        } else {
            const errorMessage = await response.text();
            console.error('Failed to update like/dislike:', errorMessage);
            alert('Failed to update like/dislike: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update like/dislike. Please check your server connection.');
    }
}

function syncLikeDislikeAcrossPages(bookId, likes, dislikes, action) {
    const likeButton = document.querySelector(`#book-${bookId} .like-button`);
    const dislikeButton = document.querySelector(`#book-${bookId} .dislike-button`);

    if (likeButton) {
        likeButton.innerHTML = `👍 ${likes}`;
        likeButton.classList.toggle('active', action === 'like'); // Highlight if liked
    }
    if (dislikeButton) {
        dislikeButton.innerHTML = `👎 ${dislikes}`;
        dislikeButton.classList.toggle('active', action === 'dislike'); // Highlight if disliked
    }
}

// Function to fetch and display detailed information about a selected book
function showBookDetails(bookId) {
  if (!bookId || bookId === "undefined" || isNaN(Number(bookId))) {
    alert('Book ID is missing or invalid!');
    return;
  }
  window.location.href = `book-details.html?bookId=${bookId}`;
}

async function saveBookDetails() {
    const adminEditFields = document.getElementById('admin-edit-fields');
    const bookId = adminEditFields.getAttribute('data-book-id');
    if (!bookId) {
        alert('Book ID is missing!');
        return;
    }

    const updatedDetails = {
        title: document.getElementById('edit-title').value,
        author: document.getElementById('edit-author').value,
        genres: document.getElementById('edit-genres').value,
        summary: document.getElementById('edit-summary').value,
        description: document.getElementById('edit-description').value,
    };

    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDetails),
        });

        if (response.ok) {
            alert('Book details updated successfully.');
            const updatedBook = await response.json();

            // Update the book details on the main page dynamically
            const bookItem = document.getElementById(`book-${bookId}`);
            if (bookItem) {
                bookItem.querySelector('.details h5').innerText = updatedBook.title;
                bookItem.querySelector('.details p:nth-child(2)').innerHTML = `<strong>Author: </strong> ${updatedBook.author}`;
                bookItem.querySelector('.details p:nth-child(3)').innerText = updatedBook.description;
            }

            // Update the book details on the current page
            document.getElementById('book-details-title').innerText = updatedBook.title;
            document.getElementById('book-details-author').innerText = updatedBook.author;
            document.getElementById('book-details-genres').innerText = updatedBook.genres;
            document.getElementById('book-details-summary').innerText = updatedBook.summary;
        } else {
            alert('Failed to update book details.');
        }
    } catch (error) {
        console.error('Error updating book details:', error);
        alert('An error occurred while updating book details.');
    }
}

// Function to edit book details (admin only)
function editBookDetails() {
    const bookId = document.getElementById('admin-actions').getAttribute('data-book-id');
    const newTitle = prompt('Enter new title:');
    const newAuthor = prompt('Enter new author:');
    const newSummary = prompt('Enter new summary:');
    const newDescription = prompt('Enter new description:');
    if (newTitle && newAuthor && newSummary && newDescription) {
        fetch(`${API_BASE_URL}/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, author: newAuthor, summary: newSummary, description: newDescription })
        })
            .then(response => {
                if (response.ok) {
                    alert('Book details updated successfully.');
                    showBookDetails(bookId);
                } else {
                    alert('Failed to update book details.');
                }
            })
            .catch(error => {
                console.error('Error updating book details:', error);
                alert('An error occurred while updating book details.');
            });
    }
}

// Function to delete book details (admin only)
function deleteBookDetails() {
    const bookId = document.getElementById('admin-actions').getAttribute('data-book-id');
    if (confirm('Are you sure you want to delete this book?')) {
        fetch(`${API_BASE_URL}/books/${bookId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Book deleted successfully.');
                    showSection('search-books');
                    fetchBooks();
                } else {
                    alert('Failed to delete book.');
                }
            })
            .catch(error => {
                console.error('Error deleting book:', error);
                alert('An error occurred while deleting the book.');
            });
    }
}

// Show forgot password form
function showForgotPasswordForm() {
    const loginForm = document.getElementById('login-form');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    
    if (loginForm) loginForm.style.display = 'none';
    if (forgotPasswordModal) forgotPasswordModal.style.display = 'block';
    
    // Clear previous messages
    document.getElementById('forgot-password-messages').innerHTML = '';
}

// Hide forgot password form
function hideForgotPasswordForm() {
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const loginForm = document.getElementById('login-form');
    
    if (forgotPasswordModal) forgotPasswordModal.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    
    // Clear form and messages
    document.getElementById('forgot-password-email').value = '';
    document.getElementById('forgot-password-messages').innerHTML = '';
}

// Request password reset
async function requestPasswordReset() {
    const email = document.getElementById('forgot-password-email').value.trim();
    const resetButton = document.querySelector('#forgot-password-modal .btn-danger');
    
    // Clear previous messages
    document.getElementById('forgot-password-messages').innerHTML = '';

    if (!email) {
        displayMessage('forgot-password-messages', 'Email is required', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        displayMessage('forgot-password-messages', 'Please enter a valid email address', 'error');
        return;
    }

    // Show spinner
    showButtonSpinner(resetButton, 'Send Reset Link');

    try {
        const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            displayMessage('forgot-password-messages', data.message, 'success');
            document.getElementById('forgot-password-email').value = '';
            
            // Show additional helpful message
            setTimeout(() => {
                displayMessage('forgot-password-messages', 
                    data.message + '<br><br><strong>Next steps:</strong><br>• Check your email inbox (and spam folder)<br>• Click the reset link within 1 hour<br>• Create a new password', 
                    'success'
                );
            }, 1500);
            
            // Automatically return to login after 6 seconds
            setTimeout(() => {
                hideForgotPasswordForm();
                displayMessage('login-messages', 'Password reset email sent! Please check your email.', 'info');
            }, 6000);
            
        } else {
            displayMessage('forgot-password-messages', data.message || data.error || 'Failed to send reset email', 'error');
        }
    } catch (error) {
        console.error('Password reset request error:', error);
        displayMessage('forgot-password-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(resetButton);
    }
}

// Add enter key support for forgot password form
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordEmail = document.getElementById('forgot-password-email');
    if (forgotPasswordEmail) {
        forgotPasswordEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') requestPasswordReset();
        });
    }
});

// Initialize chatbot when user logs in or page loads
async function initializeChatbot() {
    try {
        // Fetch current user to get username
        const response = await fetch(`${API_BASE_URL}/current-user`, { 
            credentials: 'include' 
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Set global username for chatbot
            window.currentUsername = user.username || 'Guest';
            
            // Update burger menu username if it exists
            const burgerUsername = document.getElementById('burger-username');
            if (burgerUsername) {
                burgerUsername.innerText = user.username;
            }
        }
    } catch (error) {
        console.error('⚠️ Could not initialize chatbot username:', error.message);
        window.currentUsername = 'Guest';
    }
}

// Call the necessary functions on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check initial auth status and handle burger menu
    checkAuthStatus();
    setupOutsideClickListener();
});

// ========================================
// PROFILE PAGE FUNCTIONS
// ========================================

// Switch between profile tabs
function switchProfileTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.profile-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab and content
    const selectedTab = Array.from(document.querySelectorAll('.profile-tab'))
        .find(tab => tab.getAttribute('onclick').includes(tabName));
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const selectedContent = document.getElementById(`tab-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Load data based on tab
    if (tabName === 'activity') {
        loadUserActivity();
        loadUserReviews();
    }
}

// Enable preferences editing
function enablePreferencesEdit() {
    document.getElementById('profile-genres').disabled = false;
    document.getElementById('profile-authors').disabled = false;
    document.getElementById('profile-books').disabled = false;
    document.getElementById('edit-preferences-btn').style.display = 'none';
    document.getElementById('preferences-actions').style.display = 'flex';
}

// Cancel preferences editing
function cancelPreferencesEdit() {
    document.getElementById('profile-genres').disabled = true;
    document.getElementById('profile-authors').disabled = true;
    document.getElementById('profile-books').disabled = true;
    document.getElementById('edit-preferences-btn').style.display = 'block';
    document.getElementById('preferences-actions').style.display = 'none';
    
    // Reload profile data to revert changes
    loadProfileData();
}

// Save preferences
async function savePreferences() {
    const favoriteGenres = document.getElementById('profile-genres').value.trim();
    const favoriteAuthors = document.getElementById('profile-authors').value.trim();
    const favoriteBooks = document.getElementById('profile-books').value.trim();

    try {
        const response = await fetch(`${API_BASE_URL}/users/updateProfile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                favoriteGenres, 
                favoriteAuthors, 
                favoriteBooks 
            })
        });

        if (response.ok) {
            // Disable editing mode
            document.getElementById('profile-genres').disabled = true;
            document.getElementById('profile-authors').disabled = true;
            document.getElementById('profile-books').disabled = true;
            document.getElementById('edit-preferences-btn').style.display = 'block';
            document.getElementById('preferences-actions').style.display = 'none';
            
            // Show success message
            alert('✅ Preferences updated successfully!');
            
            // Update favorites count
            updateFavoritesCount(favoriteGenres, favoriteAuthors, favoriteBooks);
        } else {
            const errorMessage = await response.text();
            alert('❌ Failed to update preferences: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error updating preferences:', error);
        alert('❌ Failed to update preferences. Please try again.');
    }
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('⚠️ Please fill in all password fields');
        return;
    }

    if (newPassword.length < 6) {
        alert('⚠️ New password must be at least 6 characters long');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('⚠️ New passwords do not match');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/updateProfile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                password: newPassword,
                currentPassword: currentPassword 
            })
        });

        if (response.ok) {
            alert('✅ Password updated successfully!');
            // Clear password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
        } else {
            const errorMessage = await response.text();
            alert('❌ Failed to update password: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error updating password:', error);
        alert('❌ Failed to update password. Please try again.');
    }
}

// Load profile data into the new UI
async function loadProfileData() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { 
            credentials: 'include' 
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Update header info
            const profileUsername = document.getElementById('profile-username');
            const profileEmailDisplay = document.getElementById('profile-email-display');
            if (profileUsername) profileUsername.innerText = user.username || 'User';
            if (profileEmailDisplay) profileEmailDisplay.innerText = user.email || '';
            
            // Update preferences
            const profileGenres = document.getElementById('profile-genres');
            const profileAuthors = document.getElementById('profile-authors');
            const profileBooks = document.getElementById('profile-books');
            if (profileGenres) profileGenres.value = user.favoriteGenres || '';
            if (profileAuthors) profileAuthors.value = user.favoriteAuthors || '';
            if (profileBooks) profileBooks.value = user.favoriteBooks || '';
            
            // Update profile picture
            if (user.profilePicture) {
                let profilePictureUrl = user.profilePicture;
                if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
                    profilePictureUrl = API_BASE_URL + profilePictureUrl;
                }
                const timestamp = '?t=' + new Date().getTime();
                const profilePic = document.getElementById('profile-picture');
                if (profilePic) profilePic.src = profilePictureUrl + timestamp;
            } else {
                setDefaultProfilePicture();
            }
            
            // Update stats
            updateFavoritesCount(user.favoriteGenres, user.favoriteAuthors, user.favoriteBooks);
            
            // Update account info
            const accountCreatedDate = document.getElementById('account-created-date');
            if (user.createdAt && accountCreatedDate) {
                const createdDate = new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                accountCreatedDate.innerText = createdDate;
            }
            
            const lastLoginDate = document.getElementById('last-login-date');
            if (lastLoginDate) {
                if (user.lastLogin) {
                    const lastLogin = new Date(user.lastLogin).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    lastLoginDate.innerText = lastLogin;
                } else {
                    lastLoginDate.innerText = 'Just now';
                }
            }
            
        } else {
            console.error('Failed to load profile data');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update favorites count in stats
function updateFavoritesCount(genres, authors, books) {
    let count = 0;
    if (genres && genres.trim()) count += genres.split(',').filter(g => g.trim()).length;
    if (authors && authors.trim()) count += authors.split(',').filter(a => a.trim()).length;
    if (books && books.trim()) count += books.split(',').filter(b => b.trim()).length;
    
    const favoritesCount = document.getElementById('favorites-count');
    if (favoritesCount) favoritesCount.innerText = count;
}

// Set default profile picture
function setDefaultProfilePicture() {
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23444" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="60" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';
    const profilePic = document.getElementById('profile-picture');
    if (profilePic) profilePic.src = defaultImage;
}

// Load user activity (placeholder)
async function loadUserActivity() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '<div class="activity-loading"><i class="fas fa-spinner fa-spin"></i> Loading activity...</div>';
    
    // Simulate loading delay
    setTimeout(() => {
        activityList.innerHTML = `
            <div class="activity-item">
                <div><strong>📖 Downloaded:</strong> "The Great Gatsby"</div>
                <div class="activity-item-time">2 days ago</div>
            </div>
            <div class="activity-item">
                <div><strong>⭐ Rated:</strong> "1984" - 5 stars</div>
                <div class="activity-item-time">5 days ago</div>
            </div>
            <div class="activity-item">
                <div><strong>👍 Liked:</strong> "To Kill a Mockingbird"</div>
                <div class="activity-item-time">1 week ago</div>
            </div>
            <div class="activity-item">
                <div><strong>📚 Added to favorites:</strong> Science Fiction genre</div>
                <div class="activity-item-time">2 weeks ago</div>
            </div>
        `;
    }, 1000);
}

// Load user reviews (placeholder)
async function loadUserReviews() {
    const reviewsList = document.getElementById('user-reviews-list');
    if (!reviewsList) return;
    
    reviewsList.innerHTML = '<div class="reviews-loading"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</div>';
    
    // Simulate loading delay
    setTimeout(() => {
        reviewsList.innerHTML = `
            <div class="review-item">
                <div><strong>⭐⭐⭐⭐⭐ "1984" by George Orwell</strong></div>
                <div style="color: #ccc; margin-top: 0.5rem;">A masterpiece that remains relevant today. Orwell's vision of a dystopian future is both terrifying and thought-provoking.</div>
                <div class="review-item-time">Reviewed 5 days ago</div>
            </div>
            <div class="review-item">
                <div><strong>⭐⭐⭐⭐ "The Great Gatsby" by F. Scott Fitzgerald</strong></div>
                <div style="color: #ccc; margin-top: 0.5rem;">Beautifully written tale of the American Dream. The prose is stunning and the characters are unforgettable.</div>
                <div class="review-item-time">Reviewed 2 weeks ago</div>
            </div>
        `;
        
        // Update reviews count
        const reviewsCount = document.getElementById('reviews-count');
        if (reviewsCount) reviewsCount.innerText = '2';
    }, 1000);
}

// Password strength indicator for new password in profile
(function initProfilePasswordStrength() {
    document.addEventListener('DOMContentLoaded', () => {
        const newPasswordInput = document.getElementById('new-password');
        const strengthBar = document.getElementById('new-password-strength-bar');
        
        if (newPasswordInput && strengthBar) {
            newPasswordInput.addEventListener('input', function() {
                const password = this.value;
                const strength = calculatePasswordStrength(password);
                
                // Update strength bar
                const widthPercentage = Math.min((strength.score / 7) * 100, 100);
                strengthBar.style.width = `${widthPercentage}%`;
                
                if (strength.level === 'weak') {
                    strengthBar.style.backgroundColor = '#dc3545';
                } else if (strength.level === 'medium') {
                    strengthBar.style.backgroundColor = '#ffc107';
                } else if (strength.level === 'strong') {
                    strengthBar.style.backgroundColor = '#28a745';
                }
            });
        }
    });
})();

// ==========================================
// NEW HERO SEARCH FUNCTIONALITY
// ==========================================

// Toggle Advanced Search Panel
function toggleAdvancedSearch() {
    const advancedFilters = document.getElementById('advanced-filters');
    const toggleBtn = document.getElementById('advanced-toggle');
    
    if (advancedFilters.classList.contains('show')) {
        advancedFilters.classList.remove('show');
        toggleBtn.classList.remove('active');
    } else {
        advancedFilters.classList.add('show');
        toggleBtn.classList.add('active');
    }
}

// Quick Search Function - Searches across all fields using OR logic
async function quickSearch() {
    const quickSearchInput = document.getElementById('quick-search-input');
    const searchTerm = quickSearchInput.value.trim();
    
    if (!searchTerm) {
        // If empty, just load all books
        fetchBooks();
        return;
    }
    
    // Show the searching message
    const searchingMsg = document.getElementById('searching-msg');
    if (searchingMsg) searchingMsg.style.display = 'block';
    
    try {
        showLoadingSpinner();
        
        // Perform three separate searches and combine results
        const [titleResults, authorResults, genreResults] = await Promise.all([
            fetch(`${API_BASE_URL}/books?title=${encodeURIComponent(searchTerm)}&author=&genre=&page=1&limit=100`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.json()),
            fetch(`${API_BASE_URL}/books?title=&author=${encodeURIComponent(searchTerm)}&genre=&page=1&limit=100`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.json()),
            fetch(`${API_BASE_URL}/books?title=&author=&genre=${encodeURIComponent(searchTerm)}&page=1&limit=100`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.json())
        ]);
        
        // Combine and deduplicate results by book ID
        const allBooks = [...titleResults.books, ...authorResults.books, ...genreResults.books];
        const uniqueBooks = Array.from(new Map(allBooks.map(book => [book.id, book])).values());
        
        // Display the combined results
        displayQuickSearchResults(uniqueBooks);
        
    } catch (error) {
        console.error('Error in quick search:', error);
        const bookList = document.getElementById('book-list');
        if (bookList) {
            bookList.innerHTML = '<p class="text-center text-danger">Error loading books. Please try again.</p>';
        }
    } finally {
        hideLoadingSpinner();
        if (searchingMsg) searchingMsg.style.display = 'none';
    }
}

// Display quick search results
function displayQuickSearchResults(books) {
    const bookList = document.getElementById('book-list');
    const noResultsMessage = document.getElementById('no-results-message');
    const pagination = document.getElementById('pagination');
    
    // Clear pagination for quick search
    if (pagination) pagination.innerHTML = '';
    
    if (books.length === 0) {
        if (noResultsMessage) noResultsMessage.style.display = 'block';
        if (bookList) bookList.innerHTML = '';
        return;
    }
    
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    
    if (bookList) {
        bookList.innerHTML = '';
        books.forEach(book => {
            // Fix: prepend API_BASE_URL if cover is a relative path
            let coverUrl = book.cover || '';
            if (coverUrl && coverUrl.startsWith('/uploads/')) {
                coverUrl = API_BASE_URL + coverUrl;
            }

            const truncatedDescription = book.description || 'No description available';

            const bookItem = document.createElement('div');
            bookItem.classList.add('book-item');
            bookItem.id = `book-${book.id}`;
            bookItem.innerHTML = `
                ${userRole === 'admin' ? `
                    <div class="delete-action">
                        <button class="btn btn-danger btn-sm" onclick="confirmDeleteBook(${book.id}, '${(book.title || '').replace(/'/g, "\\'")}')">
                            Delete
                        </button>
                    </div>
                ` : ''}
                <img src="${coverUrl || '/default-book-cover.png'}" alt="Cover Image" onerror="this.src='/default-book-cover.png'">
                <div class="details">
                    <div class="details-content">
                        <div class="main-info">
                            <h5>${book.title || 'No Title'}</h5>
                            <p><strong>Author: </strong> ${book.author || 'Unknown'}</p>
                            <p class="description-text" title="${book.description || 'No description available'}">${truncatedDescription}</p>
                        </div>
                    </div>
                    <div class="like-dislike-ratings">
                        <div class="like-dislike-buttons">
                            <button class="like-button" onclick="handleLikeDislike(${book.id}, 'like')">👍 ${book.likes || 0}</button>
                            <button class="dislike-button" onclick="handleLikeDislike(${book.id}, 'dislike')">👎 ${book.dislikes || 0}</button>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="showBookDetails(${book.id})">Download</button>
                        <div class="ratings">
                            <span>
                                <i class="fas fa-star text-warning"></i> 
                                ${book.averageRating ? book.averageRating.toFixed(1) : 'N/A'} (${book.totalRatings || 0} ratings)
                            </span>
                        </div>
                    </div>
                </div>
            `;
            bookList.appendChild(bookItem);

            // Highlight the like/dislike buttons based on user action
            const userAction = getUserAction(book.id);
            updateLikeDislikeUI(book.id, book.likes || 0, book.dislikes || 0, userAction);
        });
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear All Filters
function clearFilters() {
    document.getElementById('search-title').value = '';
    document.getElementById('search-author').value = '';
    document.getElementById('search-genre').value = '';
    document.getElementById('quick-search-input').value = '';
    
    // Fetch all books
    fetchBooks();
    
    // Show success message
    const filterActions = document.querySelector('.filter-actions');
    const clearMsg = document.createElement('div');
    clearMsg.textContent = 'Filters cleared!';
    clearMsg.style.cssText = 'color: #1DB954; font-size: 0.85rem; margin-top: 0.5rem; text-align: center;';
    filterActions.appendChild(clearMsg);
    
    setTimeout(() => clearMsg.remove(), 2000);
}