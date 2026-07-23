# Tesano Community Library Management System

A modern, full-stack online library management system designed for the **Tesano Community** in Accra, Ghana. This platform enables community members to browse books, borrow physical copies, manage memberships, attend community events, and engage with a digital library experience.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)
![Tests](https://img.shields.io/badge/tests-44-blue)
![License](https://img.shields.io/badge/license-ISC-orange)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Service Setup](#service-setup)
- [Project Structure](#project-structure)
- [Authentication Architecture](#authentication-architecture)
- [PDF Upload & Download Flow](#pdf-upload--download-flow)
- [API Reference](#api-reference)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Security](#security)
- [Deployment](#deployment)
- [Logging](#logging)
- [Troubleshooting](#troubleshooting)
- [Default Admin Account](#default-admin-account)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Features

### For Community Members
- **Browse & Search Books** — Advanced search by title, author, and genre with quick search
- **Review & Rate** — Share thoughts and rate books 1–5 stars
- **Like / Dislike** — Quick reactions synced across all pages
- **AI Recommendations** — Personalised book suggestions powered by HuggingFace
- **Chatbot Assistant** — Interactive helper for finding books and recommendations
- **Download Books** — Access PDF versions stored on Google Cloud Storage or Cloudinary
- **Borrow Physical Books** — Check out physical copies from the Tesano Community Library
- **Library Membership** — Apply for and manage community library membership
- **Community Events** — Register for library-hosted events in the Tesano area
- **User Profile**
  - Real activity feed (reviews, likes, dislikes with relative timestamps)
  - Reviews tab showing all submitted reviews with clickable book links
  - Preferences editor (favourite genres, authors, books)
  - Inline password change with strength indicator
  - Profile picture upload
- **Email Verification** — Secure account activation via email
- **Password Reset** — Token-based recovery via email
- **Newsletter** — Subscribe with email validation and inline feedback

### Community Features
- **Book Reservations** — Join a queue for checked-out books; get notified when available
- **Fine Management** — Overdue fines auto-calculated; pay online or request waiver
- **Reading Challenges** — Join community challenges, track progress, earn badges
- **Leaderboard** — See top readers by books borrowed and badges earned
- **Community Events** — Register for library-hosted events in the Tesano area

### For Admins
- **Analytics Dashboard** — Real-time statistics and interactive charts
  - Total users, books, reviews, and downloads
  - Genre distribution (doughnut chart)
  - User growth trends (30-day line chart)
  - Popular books ranking, recent activity feed, top reviewers leaderboard
- **Book Management** — Full CRUD with inline feedback and upload progress
  - Upload PDF + cover image in one step from the library UI
  - Large-file support via Google Cloud Storage (no size limits)
  - Client-side and server-side validation before any upload attempt
  - Custom styled file-picker with live filename and size display
- **User Management** — Grant/revoke admin, delete users with confirmation modal
- **Membership Management** — Approve/renew library memberships
- **Borrowing Management** — Track checked-out books, due dates, and fines
- **Event Management** — Create and manage community events
- **Delete Books** — Confirmation modal, toast feedback, auto-cleans GCS/Cloudinary storage

### Developer / Architecture Highlights
- **JWT Authentication** — Cross-origin auth between frontend and backend
  - JWT issued at login, stored in `localStorage`
  - Global `fetch` interceptor auto-attaches token to every backend request
  - Session cookie auth retained as same-origin fallback (local dev)
  - Token verified before redirect post-login (eliminates flash-back-to-login bug)
- **Separated Auth Pages** — Dedicated `auth.html` / `auth.js` with smart redirect logic
- **Toast Notification System** — Replaces all `alert()` / `confirm()` / `prompt()` dialogs
- **Confirm Modal** — Styled dark-theme modal for all destructive actions
- **Recommendation Caching** — In-memory cache (10 min TTL) reduces HuggingFace API calls
- **Automated Testing** — 44 tests across 3 suites (Jest + Supertest)
- **Structured Logging** — Winston with file rotation and configurable log levels
- **Secure File Uploads** — MIME + extension validation, size limits, filename sanitisation

---

## Tech Stack

### Backend
- **Runtime**: Node.js (Express.js v5.1.0)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Passport.js (sessions) + JSON Web Tokens (cross-origin)
- **Session Management**: express-session, connect-pg-simple
- **File Upload**: Multer (memory storage)
- **PDF Storage**: Google Cloud Storage (primary) / Cloudinary (fallback)
- **Image Storage**: Cloudinary
- **Email**: Resend / Gmail SMTP / SendGrid / Brevo
- **Logging**: Winston
- **Testing**: Jest, Supertest
- **Validation**: express-validator

### Frontend
- **UI**: Vanilla JavaScript (ES2020+), HTML5, CSS3
- **Styling**: Bootstrap 4, Font Awesome
- **Charts**: Chart.js
- **Auth**: JWT in `localStorage`, global fetch interceptor
- **Design**: Responsive, mobile-first, dark theme with Tesano community colors

### AI / ML
- **Recommendations**: HuggingFace API
- **Chatbot**: Custom rule-based system
- **Python Integration**: Python script for advanced recommendations (`recommend.py`)

### Cloud Services
- **PDF Storage**: Google Cloud Storage
- **Image Storage**: Cloudinary
- **Database**: Supabase (PostgreSQL)
- **Backend Hosting**: Render
- **Frontend Hosting**: Netlify

---

## Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL database (Supabase recommended)
- Cloudinary account (cover image uploads)
- Google Cloud Storage bucket + service account (PDF uploads — optional in dev)
- Email service account (Resend / Gmail / SendGrid / Brevo)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/DessysGit/tesano-community-library.git
# Then create and checkout the new branch:
# git checkout -b tesano-community-library
cd Library_Project
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)
```

**4. Start the development server**
```bash
npm run dev
```

**5. Access the application**

| Page | URL |
|---|---|
| Login / Register | http://localhost:3000/auth.html |
| Main App | http://localhost:3000/index.html |
| Admin Dashboard | http://localhost:3000/admin-dashboard.html |
| Book Details | http://localhost:3000/book-details.html |
| Password Reset | http://localhost:3000/reset-password.html |
| Community Events | http://localhost:3000/events.html |

Tables are created automatically on first server start. A default admin account is seeded from your environment variables.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. The table below lists every variable the app recognises.

### Core (all environments)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
NODE_ENV=development
PORT=3000
SESSION_SECRET=generate_with_crypto_randomBytes_32
JWT_SECRET=another_long_random_string

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=admin@tesanolibrary.com
```

### Cloudinary (cover images)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Google Cloud Storage (PDF uploads — production primary)
```env
# Paste the entire contents of your service account JSON key file as one line
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...", ...}

# Name of your GCS bucket
GOOGLE_STORAGE_BUCKET=your-bucket-name
```

> **GCS Bucket setup:** Create a bucket in [Google Cloud Console](https://console.cloud.google.com) → Cloud Storage.
> Enable **Uniform bucket-level access**. Under Permissions, grant:
> - `allUsers` → **Storage Object Viewer** (public read for downloads)
> - Your service account email → **Storage Object Admin** (upload rights)

### Email Service (choose one)
```env
# Resend (recommended — 3,000 emails/month free)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@tesanolibrary.com

# OR Gmail
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# OR Brevo
BREVO_API_KEY=your_key

# OR SendGrid
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@tesanolibrary.com
```

### Optional
```env
HUGGINGFACE_API_KEY=your_key    # AI recommendations (optional)
LOG_LEVEL=info                  # debug | info | warn | error
ENABLE_FILE_LOGGING=true        # Write logs to file in dev
LOG_SQL_QUERIES=true            # Log DB queries (debug only)
FORCE_CLOUDINARY=true           # Force Cloudinary even in development
RATE_LIMIT_MAX=100              # Max requests per window (default: 100)
RATE_LIMIT_WINDOW=15            # Rate limit window in minutes
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Service Setup

### Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database**
3. Copy the **Session Mode** connection string (port **5432**, not 6543)
4. Set it as `DATABASE_URL` in `.env`
5. Start the server — tables and the admin account are created automatically

### Cloudinary (cover images)

1. Create an account at [cloudinary.com](https://cloudinary.com)
2. Copy **Cloud Name**, **API Key**, and **API Secret** from the dashboard
3. Add them to `.env`
4. Cover images upload automatically when admins add books

### Google Cloud Storage (PDFs)

1. Create a bucket in [Google Cloud Console](https://console.cloud.google.com)
2. Create a service account with **Storage Object Admin** on the bucket
3. Download the JSON key and paste its full contents into `GOOGLE_SERVICE_ACCOUNT_JSON`
4. Set `GOOGLE_STORAGE_BUCKET` to your bucket name
5. Grant `allUsers` the **Storage Object Viewer** role for public downloads

If GCS is not configured, PDFs fall back to Cloudinary chunked uploads (6 MB chunks).

### Email Service

| Provider | Free Tier | Sign Up |
|---|---|---|
| **Resend** (recommended) | 3,000 emails/month | [resend.com](https://resend.com) |
| **Gmail SMTP** | Free with app password | [Google App Passwords](https://myaccount.google.com/apppasswords) |
| **Brevo** | 300 emails/day | [brevo.com](https://www.brevo.com) |
| **SendGrid** | 100 emails/day | [sendgrid.com](https://sendgrid.com) |

Test your configuration:
```bash
npm run test-email your@email.com
```

### Python Recommendations (optional)

For the local Python recommendation fallback:

```bash
pip install -r requirements.txt
```

Requires Python 3 with `flask`, `pandas`, `scikit-learn`, and `psycopg2-binary`. The Node server invokes `recommend.py` when HuggingFace is unavailable.

---

## Project Structure

```
Library_Project/
├── src/
│   ├── config/
│   │   ├── database.js              # PostgreSQL connection pool
│   │   ├── cloudinary.js            # Cloudinary client (image storage)
│   │   ├── googleCloudStorage.js    # GCS client (PDF storage)
│   │   ├── environment.js           # Centralised environment config
│   │   ├── passport.js              # Passport.js local strategy
│   │   └── logger.js                # Winston logger setup
│   ├── middleware/
│   │   ├── auth.js                  # isAuthenticated, isAdmin, isSeedAdmin, optionalAuth
│   │   ├── rateLimiter.js           # Login rate limiting
│   │   ├── requestLogger.js         # HTTP request logging
│   │   └── __tests__/
│   ├── routes/
│   │   ├── auth.js                  # Login, register, JWT issuance, password reset
│   │   ├── books.js                 # Book CRUD, GCS/Cloudinary upload
│   │   ├── reviews.js               # Review system
│   │   ├── users.js                 # User management, profile, activity, my-reviews
│   │   ├── analytics.js             # Admin analytics API
│   │   ├── recommendations.js       # AI recommendations
│   │   ├── chatbot.js               # Chatbot responses
│   │   ├── download.js              # Returns JSON {url, filename} — no proxy
│   │   ├── newsletter.js            # Email subscriptions
│   │   ├── membership.js            # Community library membership management
│   │   ├── borrowing.js             # Physical book borrowing system
│   │   ├── events.js                # Community events management
│   │   ├── reservations.js          # Book reservation queue system
│   │   ├── fines.js                 # Fine management and payments
│   │   ├── challenges.js            # Reading challenges, badges, leaderboard
│   │   └── __tests__/
│   ├── services/
│   │   ├── emailService.js          # Multi-provider email (Resend, Gmail, SendGrid, Brevo)
│   │   └── databaseService.js       # DB seeding, admin creation, rating recalculation
│   ├── utils/
│   │   ├── fileValidation.js        # MIME/extension validation, size limits
│   │   ├── testHelpers.js           # Jest mocks for request/response/user
│   │   ├── helpers.js               # General utility functions (formatDate, truncate, etc.)
│   │   └── __tests__/
│   └── app.js                       # Express app, CORS, sessions, CSP middleware
├── public/
│   ├── auth.html / auth.js          # Standalone login + register page
│   ├── index.html / script.js       # Main authenticated app
│   ├── admin-dashboard.html/.js     # Analytics dashboard (admin only)
│   ├── book-details.html            # Book details + download + reviews
│   ├── events.html                  # Community events page
│   ├── reset-password.html          # Password reset landing page
│   ├── style.css                    # Global dark-theme styles
│   └── chatbot/                     # Chatbot widget (chat.js, chat.css)
├── logs/                            # Winston log files (auto-generated)
├── uploads/                         # Local file storage (dev only)
├── subscribers.txt                  # Newsletter subscription list
├── server.js                        # Application entry point
├── recommend.py                     # Python recommendation script
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
├── jest.setup.js                    # Jest test configuration
├── check-database.js                # DB connection test script
├── verify-production.js             # Production config verification
├── package.json
└── LICENSE
```

### Supporting Scripts

| Script | Purpose |
|---|---|
| `check-database.js` | Test database connectivity |
| `verify-production.js` | Verify production environment config |
| `fix-cloudinary-urls.js` | Migrate/fix Cloudinary URLs in database |
| `migrations/` | Database migration scripts (auto-created) |
| `switch-email.bat` | Quick email provider toggle (Windows) |

---

## Authentication Architecture

The app runs as a **split deployment** — frontend on Netlify, backend on Render.
Browser cross-site cookie policies block session cookies across different domains,
so JWT bridges the two origins.

```
Login POST → Render
    └─ Passport.js validates credentials
    └─ Session saved to PostgreSQL (same-origin / local dev fallback)
    └─ JWT signed (HS256, 24 h expiry) ← returned in JSON response body
           └─ Frontend stores in localStorage
           └─ Global fetch interceptor attaches to every backend request:
                  Authorization: Bearer <token>

Every protected route:
    └─ resolveUser() checks req.isAuthenticated() first  (session)
    └─ Falls back to jwt.verify(token) from Authorization header
    └─ Attaches DB user to req.user either way
```

**Global fetch interceptor (frontend)**
```js
(function injectJwtOnBackendRequests() {
  const _fetch = window.fetch;
  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    if (API_BASE_URL && url.startsWith(API_BASE_URL)) {
      const token = localStorage.getItem('authToken');
      if (token)
        init.headers = Object.assign(
          { 'Authorization': `Bearer ${token}` },
          init.headers || {}
        );
    }
    return _fetch.call(this, input, init);
  };
})();
```

**Authentication flow**
```
User visits site → Not logged in? → auth.html (Login/Register)
                                        ↓
                                    Login Success
                                        ↓
                  Logged in? → Yes → index.html (Main App)
                                        ↓
                                    Logout Click
                                        ↓
                                  auth.html (Login)
```

---

## PDF Upload & Download Flow

### Upload
```
Admin selects PDF in the Add Book form
    → Browser sends multipart/form-data to Render (/books POST)
    → Multer buffers file in memory
    → GCS configured?
        YES → uploadToStorage(buffer, filename)
               → Stored in gs://BUCKET/books/TIMESTAMP-filename.pdf
               → Public via bucket IAM (allUsers = Storage Object Viewer)
               → Returns permanent public URL
        NO  → Cloudinary upload_large() in 6 MB chunks (fallback)
    → URL saved to PostgreSQL books.file column
```

### Download
```
User clicks Download
    → fetch() to Render /download/:id  (JWT auto-injected by interceptor)
    → Render queries DB, returns JSON { url, filename }
    → Frontend opens URL in new tab
    → GCS or Cloudinary CDN serves PDF directly to the browser
```

> **Why JSON instead of a redirect?**
> The HTML5 `download` attribute causes browsers to make a CORS-checked fetch.
> GCS and Cloudinary do not include the Netlify origin in their CORS headers,
> so the download fails silently. Returning JSON and opening the URL in a new
> tab bypasses the CORS check and works for any file size from any backend.

---

## API Reference

All endpoints are relative to `BACKEND_URL`. Protected routes accept either a session cookie (local dev) or `Authorization: Bearer <token>` (production).

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Create a new account |
| `POST` | `/login` | — | Login; returns JWT token |
| `POST` | `/logout` | — | End session |
| `GET` | `/verify-email` | — | Activate account via email token |
| `POST` | `/resend-verification` | — | Resend verification email |
| `POST` | `/request-password-reset` | — | Send password reset email |
| `GET` | `/validate-reset-token/:token` | — | Check if reset token is valid |
| `POST` | `/reset-password` | — | Set new password |
| `GET` | `/current-user` | User | Get logged-in user info |
| `GET` | `/checkAuthStatus` | — | Check authentication status |

### Books & Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/books` | Optional | Search/list books |
| `GET` | `/books/:id` | — | Get book details |
| `POST` | `/books` | Admin | Create book (multipart: cover + PDF) |
| `PUT` | `/books/:id` | Admin | Update book |
| `DELETE` | `/books/:id` | Admin | Delete book |
| `POST` | `/books/:id/like` | User | Like a book |
| `POST` | `/books/:id/dislike` | User | Dislike a book |
| `GET` | `/books/:bookId/reviews` | — | List reviews for a book |
| `POST` | `/books/:bookId/reviews` | User | Submit a review |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users |
| `GET` | `/users/profile` | User | Get own profile |
| `POST` | `/users/updateProfile` | User | Update profile / password |
| `POST` | `/users/upload-profile-picture` | User | Upload profile picture |
| `GET` | `/users/activity` | User | Get activity feed |
| `GET` | `/users/my-reviews` | User | Get own reviews |
| `POST` | `/users/:id/grant-admin` | Seed Admin | Promote user to admin |
| `POST` | `/users/:id/revoke-admin` | Seed Admin | Revoke admin role |
| `DELETE` | `/users/:id` | Seed Admin | Delete user |

### Membership

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/membership/apply` | User | Apply for library membership |
| `GET` | `/membership/status` | User | Check membership status |
| `POST` | `/membership/renew` | User | Renew membership |
| `GET` | `/membership/all` | Admin | List all members |

### Borrowing

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/borrow/:bookId` | User | Checkout a physical book |
| `POST` | `/borrow/return/:borrowId` | User | Return a borrowed book |
| `GET` | `/borrow/my` | User | View my borrowed books |
| `GET` | `/borrow/all` | Admin | View all borrows |
| `POST` | `/borrow/renew/:borrowId` | User | Extend borrowing period |

### Events

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/events` | Admin | Create a community event |
| `GET` | `/events` | — | List upcoming events |
| `GET` | `/events/:id` | — | Get event details |
| `POST` | `/events/:id/register` | User | Register for an event |
| `DELETE` | `/events/:id` | Admin | Delete an event |

### Reservations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/reservations/:bookId` | User | Reserve a checked-out book (join queue) |
| `GET` | `/reservations/my` | User | View my reservations |
| `DELETE` | `/reservations/:id` | User | Cancel a reservation |
| `GET` | `/reservations/all` | Admin | List all reservations |
| `POST` | `/reservations/fulfill/:id` | Admin | Mark reservation as fulfilled (notify user) |

### Fines

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/fines/my` | User | View my fines |
| `GET` | `/fines/summary` | User | Get total unpaid fines |
| `POST` | `/fines/pay/:id` | User | Pay a fine |
| `POST` | `/fines/pay-all` | User | Pay all unpaid fines |
| `GET` | `/fines/all` | Admin | List all fines |
| `POST` | `/fines/waive/:id` | Admin | Waive a fine |

### Reading Challenges

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/challenges` | Admin | Create a reading challenge |
| `GET` | `/challenges` | — | List active challenges |
| `POST` | `/challenges/:id/join` | User | Join a challenge |
| `POST` | `/challenges/:id/progress` | User | Log a book read (increment progress) |
| `GET` | `/challenges/my` | User | View my challenges |
| `GET` | `/challenges/badges` | User | View my badges |
| `GET` | `/challenges/leaderboard` | — | View top readers |

### Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/download/:bookId` | — | Get PDF download URL (JSON) |
| `GET` | `/recommendations` | User | AI book recommendations |
| `POST` | `/subscribe` | User | Newsletter subscription |
| `POST` | `/api/chat` | — | Chatbot message (accepts optional JWT for personalized responses) |
| `POST` | `/api/chat/reset` | — | Reset chatbot session |
| `GET` | `/api/chat/health` | — | Chatbot health check |

### Chatbot Capabilities

The **Tesano LibBot** chatbot is a **context-aware assistant** built specifically for Tesano Community Library:

| Category | What it knows |
|---|---|
| **Books** | Real-time book counts, genre listings, searching by title/author/genre |
| **Account** | Login flow, registration, password reset, email verification |
| **Profile** | How to access/edit profile, favorites, password changes |
| **Downloads** | Download instructions with login context awareness |
| **Reviews** | Rating system (1-5 stars), review submission |
| **Recommendations** | Personalized book suggestions (requires login) |
| **Membership** | How to apply for library membership |
| **Borrowing** | How to borrow and return physical books |
| **Events** | Upcoming community events and registration |

The chatbot:
- Provides **personalized responses** when you're logged in (uses your username)
- Queries the database for **real-time book information**
- Has **security guardrails** to prevent revealing credentials, env vars, or admin backend details
- Offers **multi-line formatted responses** with bold text for better readability

### Analytics (Admin)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/email-health` | Email service health check |
| `GET` | `/analytics/stats` | Overview statistics |
| `GET` | `/analytics/popular-books` | Most popular books |
| `GET` | `/analytics/genre-stats` | Genre distribution |
| `GET` | `/analytics/user-activity` | User growth data |
| `GET` | `/analytics/book-uploads` | Upload trends |
| `GET` | `/analytics/rating-distribution` | Rating breakdown |
| `GET` | `/analytics/review-trends` | Review activity over time |
| `GET` | `/analytics/recent-activity` | Recent platform activity |
| `GET` | `/analytics/top-reviewers` | Top reviewers leaderboard |
| `GET` | `/analytics/books-without-reviews` | Books needing reviews |

---

## Available Scripts

```bash
npm start                          # Production server
npm run dev                        # Dev server with nodemon
npm test                           # Run all tests
npm run test:watch                 # Tests in watch mode
npm run test:coverage              # Coverage report
npm run test:connection            # Test DB connection
npm run diagnose                   # Connection diagnostics
npm run connection-guide             # Display connection setup guide
npm run fix-database                 # Run connection guide and diagnose
npm run test-email your@email.com    # Test email service
npm run test-deployment              # Test deployment connectivity
npm run verify-production            # Verify production configuration
npm run fix-cloudinary               # Fix Cloudinary URLs in database
npm run test-dashboard               # Test dashboard functionality
npm run add-timestamps               # Add created_at timestamps to users
npm run migrate                      # Run database migrations
npm run add-indexes                    # Add database indexes
```

---

## Testing

44 automated tests across 3 suites:

| Suite | Tests | What it covers |
|---|---|---|
| Middleware auth | 8 | isAuthenticated, isAdmin, isSeedAdmin, optionalAuth |
| File validation | 23 | MIME types, extensions, size limits, filename sanitisation |
| Auth routes | 13 | Register, login, logout, email verification, password validation |

```bash
npm test
npm run test:coverage
```

### Writing Tests

Use the test helpers for easier test creation:

```javascript
const { mockRequest, mockResponse, mockUser } = require('./src/utils/testHelpers');
const { isAdmin } = require('./src/middleware/auth');

it('should authenticate admin user', () => {
  const req = mockRequest({
    user: mockUser('admin'),
    isAuthenticated: () => true
  });
  const res = mockResponse();
  const next = jest.fn();

  isAdmin(req, res, next);

  expect(next).toHaveBeenCalled();
});
```

Run a single suite:
```bash
npm test -- auth.test.js
```

---

## Security

| Layer | Mechanism |
|---|---|
| Passwords | bcrypt (salted hash) |
| Sessions | PostgreSQL-backed, HttpOnly cookies |
| Cross-origin auth | JWT (HS256, 24 h expiry) stored in `localStorage` |
| SQL injection | Parameterised queries (`pg`) |
| Input validation | express-validator on all mutation routes |
| Rate limiting | Login endpoint throttled |
| File uploads | MIME + extension validation, 50 MB cap, filename sanitisation |
| Secrets | All in environment variables — none hardcoded |
| Production guard | Server refuses to start with default admin password |

---

## Deployment

### Backend — Render

1. Push code to GitHub
2. Create a **Web Service** on Render, connect the repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add all environment variables (table below)
6. Set `NODE_ENV=production`

### Frontend — Netlify

1. Connect the GitHub repo
2. Publish Directory: `public`
3. No build command needed
4. **Update the backend URL** in these frontend files to match your Render service URL:
   - `public/script.js`
   - `public/auth.js`
   - `public/admin-dashboard.js`
   - `public/reset-password.html`
   - `public/book-details.html` (if deployed separately)
   - `src/app.js` (CSP `connect-src` directive)

   Each file contains an `API_BASE_URL` constant that defaults to the production Render URL. Replace it with your own backend URL.

### Render Environment Variable Checklist

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | ✔ | `production` |
| `DATABASE_URL` | ✔ | Supabase connection string (port 5432) |
| `SESSION_SECRET` | ✔ | Long random string |
| `JWT_SECRET` | ✔ | Long random string |
| `FRONTEND_URL` | ✔ | Exact Netlify URL — no trailing slash |
| `BACKEND_URL` | ✔ | Render service URL |
| `ADMIN_USERNAME` | ✔ | |
| `ADMIN_PASSWORD` | ✔ | Strong password |
| `ADMIN_EMAIL` | ✔ | |
| `CLOUDINARY_CLOUD_NAME` | ✔ | |
| `CLOUDINARY_API_KEY` | ✔ | |
| `CLOUDINARY_API_SECRET` | ✔ | |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✔ | Full JSON key file contents |
| `GOOGLE_STORAGE_BUCKET` | ✔ | GCS bucket name |
| Email service key | ✔ | RESEND / GMAIL / BREVO / SENDGRID |
| `HUGGINGFACE_API_KEY` | Optional | AI recommendations |

---

## Logging

```js
const logger = require('./src/config/logger');

logger.info('User logged in',       { userId: 123 });
logger.warn('Unusual activity',     { userId: 123 });
logger.error('DB error',            { error: err.message });
logger.logAuth('user', 'login',     true, { ip: req.ip });
logger.logFileUpload('book.pdf',    1024000, true);
```

Log files (production): `logs/combined.log`, `logs/error.log`

Configuration:
```env
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_SQL_QUERIES=true    # debug only
```

---

## Troubleshooting

**Books not uploading**
- Confirm `GOOGLE_SERVICE_ACCOUNT_JSON` is valid JSON (paste the full key file)
- Confirm `GOOGLE_STORAGE_BUCKET` matches your bucket name exactly
- Service account must have **Storage Object Admin** on the bucket
- Bucket must have `allUsers` → **Storage Object Viewer** (public read)

**Downloads not working**
- GCS: verify `allUsers = Storage Object Viewer` is in bucket IAM
- Cloudinary: URLs are public by default — check the URL stored in the DB is valid
- Open DevTools → Network, check what `/download/:id` returns

**Login flashes back to auth.html**
- Verify `JWT_SECRET` is set on Render
- Verify `FRONTEND_URL` exactly matches your Netlify URL (no trailing slash)
- Hard-refresh (`Ctrl+Shift+R`) to clear cached JS
- Confirm `API_BASE_URL` in frontend files points to your Render backend

**Database connection errors**
```bash
npm run test:connection
npm run diagnose
```
Use Session Mode port **5432**, not Transaction Mode port 6543 in Supabase.

**Email not sending**
```bash
npm run test-email your@email.com
```
Check API key, look in spam, verify provider dashboard for delivery logs.

**Admin features missing or 403 errors**
- Confirm the logged-in account has `role = 'admin'` in the `users` table
- The seeded admin username must match `ADMIN_USERNAME` exactly

**Server won't start**
- Missing required environment variables (check `.env.example`)
- Using default password in production
- Database connection failed
- Port already in use

**Tests failing**
```bash
npm install --save-dev jest supertest @types/jest
npm test -- auth.test.js
```
Ensure `ADMIN_USERNAME` is set (default: `admin`).

---

## Default Admin Account

| Field | Value |
|---|---|
| Username | `ADMIN_USERNAME` env var (default: `admin`) |
| Password | `ADMIN_PASSWORD` env var |

Created automatically on first server start. **Change the password before deploying.**

---

## License

ISC License — see [LICENSE](LICENSE) file for details.

---

## Acknowledgements

**Backend:** Node.js · Express.js · PostgreSQL · Passport.js · jsonwebtoken · Multer · Winston · Jest · Supertest

**Storage:** Google Cloud Storage · Cloudinary

**Frontend:** Vanilla JS · Bootstrap 4 · Chart.js · Font Awesome

**AI / ML:** HuggingFace · Python

**Hosting:** Render (backend) · Netlify (frontend) · Supabase (database)

**Community:** Built for the Tesano Community, Accra, Ghana

---

*Built with care for the Tesano Community and book lovers everywhere.*