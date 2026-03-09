# Des2 Library Management System

A modern, full-stack library management application with AI-powered recommendations, real-time analytics dashboard, structured logging, and comprehensive automated testing.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![License](https://img.shields.io/badge/license-ISC-orange)

---

## Features

### For Users
- **Browse & Search Books** - Advanced search by title, author, and genre
- **Review & Rate** - Share your thoughts and rate books 1-5 stars
- **AI Recommendations** - Get personalized book suggestions powered by HuggingFace
- **Chatbot Assistant** - Interactive helper for finding books and getting recommendations
- **Download Books** - Access PDF versions of books (stored in Cloudinary)
- **Email Verification** - Secure account with email verification system
- **Password Reset** - Easy password recovery via email

### For Admins
- **Analytics Dashboard** - Real-time statistics and insights
  - Total users, books, reviews, and downloads
  - Genre distribution charts
  - User growth trends (30-day view)
  - Popular books ranking
  - Recent activity feed
  - Top reviewers leaderboard
  - Books needing reviews
- **Book Management** - Full CRUD operations for books
- **User Management** - View and manage user accounts
- **Cloud Storage** - Automatic file upload to Cloudinary

### Developer Features
- **Separated Authentication** - Dedicated auth pages for clean user experience
  - Separate login/register page (`auth.html`) with smart footer visibility
  - Protected routes - automatic redirect for unauthenticated users
  - Clean separation between public and authenticated content
- **Automated Testing** - Comprehensive test suite with Jest
  - 8 middleware authentication tests
  - 23 file validation utility tests
  - 16 authentication route integration tests
  - Full test coverage for critical security functions
- **Structured Logging** - Winston logger with file rotation and log levels
- **Secure File Uploads** - MIME type + extension validation, size limits, filename sanitization
- **Environment-based Config** - No hardcoded values, production safety checks
- **Security Hardened** - Input validation, rate limiting, session management

---

## Tech Stack

### Backend
- **Runtime**: Node.js (Express.js v5.1.0)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Passport.js, bcrypt
- **Session Management**: express-session, connect-pg-simple
- **File Upload**: Multer, Cloudinary
- **Email**: Resend / Gmail SMTP / SendGrid / Brevo
- **Logging**: Winston (structured logging)
- **Testing**: Jest, Supertest
- **Validation**: express-validator

### Frontend
- **UI**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Bootstrap 4, Font Awesome
- **Charts**: Chart.js
- **Design**: Responsive, mobile-first

### AI/ML
- **Recommendations**: HuggingFace API
- **Chatbot**: Custom rule-based system
- **Python Integration**: Python script for advanced recommendations

### Cloud Services
- **File Storage**: Cloudinary (production)
- **Database Hosting**: Supabase
- **Backend Hosting**: Render
- **Frontend Hosting**: Netlify

---

## Quick Start

### Prerequisites
- Node.js v18 or higher
- PostgreSQL database (Supabase recommended)
- Cloudinary account (for file uploads)
- Email service account (Resend/Gmail/SendGrid/Brevo)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Library_Project.git
cd Library_Project
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
NODE_ENV=development
PORT=3000
SESSION_SECRET=your_secret_key_here  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password  # Change this!
ADMIN_EMAIL=admin@yourlibrary.com

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service (choose one)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com

# Logging (optional)
LOG_LEVEL=info  # debug, info, warn, error
```

See `.env.example` for all available options and detailed comments.

4. **Run tests** (optional but recommended)
```bash
npm test
```

5. **Start the development server**
```bash
npm run dev
```

6. **Access the application**
- Authentication: http://localhost:3000/auth.html (login/register)
- Main App: http://localhost:3000/index.html (after login)
- Admin Dashboard: http://localhost:3000/admin-dashboard.html (admin only)

---

## Available Scripts

### Development
- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-restart)

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

### Database
- `npm run test:connection` - Test database connection
- `npm run diagnose` - Run connection diagnostics
- `npm run migrate` - Run database migrations
- `npm run add-indexes` - Add database indexes for performance

### Utilities
- `npm run test-email` - Test email service
- `npm run test-dashboard` - Test analytics endpoints
- `npm run verify-production` - Verify production configuration
- `npm run fix-cloudinary` - Fix Cloudinary URLs

---

## Project Structure

```
Library_Project/
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection
│   │   ├── cloudinary.js        # Cloudinary setup
│   │   ├── environment.js       # Environment config
│   │   ├── passport.js          # Authentication strategy
│   │   └── logger.js            # Winston logging config
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── rateLimiter.js       # Rate limiting
│   │   ├── requestLogger.js     # HTTP request logging
│   │   └── __tests__/           # Middleware tests
│   ├── routes/
│   │   ├── auth.js              # Login, register, password reset
│   │   ├── books.js             # Book CRUD operations
│   │   ├── reviews.js           # Review system
│   │   ├── users.js             # User management
│   │   ├── analytics.js         # Admin analytics API
│   │   ├── recommendations.js   # AI recommendations
│   │   ├── chatbot.js           # Chatbot responses
│   │   ├── download.js          # File downloads
│   │   ├── newsletter.js        # Email subscriptions
│   │   └── __tests__/           # Route integration tests
│   ├── services/
│   │   ├── emailService.js      # Email sending
│   │   └── databaseService.js   # Database utilities
│   ├── utils/
│   │   ├── fileValidation.js    # Secure file upload validation
│   │   ├── testHelpers.js       # Testing utilities
│   │   └── __tests__/           # Utility tests
│   └── app.js                   # Express app configuration
├── public/
│   ├── auth.html                # Authentication page (login/register)
│   ├── auth.js                  # Authentication logic
│   ├── index.html               # Main application (authenticated users)
│   ├── admin-dashboard.html     # Analytics dashboard
│   ├── book-details.html        # Book details page
│   ├── reset-password.html      # Password reset page
│   ├── script.js                # Main frontend logic
│   ├── admin-dashboard.js       # Dashboard logic
│   ├── style.css                # Global styles
│   └── chatbot/                 # Chatbot interface
├── migrations/                  # Database migration scripts
├── logs/                        # Log files (auto-generated)
├── uploads/                     # Local file storage (dev only)
├── coverage/                    # Test coverage reports
├── server.js                    # Application entry point
├── recommend.py                 # Python recommendation script
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
├── jest.setup.js                # Jest configuration
└── package.json
```

---

## Testing

This project includes comprehensive automated testing with Jest:

```bash
# Run all tests
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- Authentication middleware (8 tests)
  - User authentication checks
  - Admin authorization
  - Seed admin verification
- File validation utilities (23 tests)
  - Filename sanitization
  - File type validation
  - Size limit enforcement
  - Security checks
- Authentication routes (16 tests)
  - User registration
  - Login/logout
  - Email verification
  - Password validation

### Writing Tests

Use the test helpers for easier test creation:

```javascript
const { mockRequest, mockResponse, mockUser } = require('./src/utils/testHelpers');

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

---

## Logging

The application uses Winston for structured logging:

```javascript
const logger = require('./src/config/logger');

// Different log levels
logger.info('User logged in', { userId: 123, username: 'john' });
logger.warn('Unusual activity detected', { userId: 123 });
logger.error('Database connection failed', { error: err.message });

// Helper methods
logger.logAuth('john_doe', 'login', true, { ip: '192.168.1.1' });
logger.logError(error, { userId: req.user?.id, action: 'book_upload' });
logger.logFileUpload('book.pdf', 1024000, true);
```

**Log Levels:** debug, info, warn, error

**Log Files** (production only):
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

**Configuration:**
```env
LOG_LEVEL=info                    # Set log level
ENABLE_FILE_LOGGING=true          # Enable file logging in dev
LOG_SQL_QUERIES=true              # Log database queries (debug only)
```

---

## Security Features

### File Upload Security
- **MIME type validation** - Checks actual file type, not just extension
- **Extension validation** - Ensures file extension matches content
- **Size limits** - 2MB for images, 50MB for PDFs
- **Filename sanitization** - Prevents directory traversal attacks
- **Rejected file types** - Executables, scripts, and other dangerous files

### Authentication & Authorization
- **Password hashing** - bcrypt with salt rounds
- **Session management** - PostgreSQL-backed sessions
- **Email verification** - Required for account activation
- **Role-based access** - Admin vs. User permissions
- **Password reset** - Secure token-based recovery

### Environment Security
- **Production checks** - Server won't start with weak defaults
- **No hardcoded secrets** - All sensitive data in environment variables
- **Environment validation** - Missing required variables cause startup failure

### Other Security
- **Rate limiting** - Prevents brute force attacks
- **CSRF protection** - SameSite cookie policy
- **SQL injection prevention** - Parameterized queries
- **Input validation** - express-validator for user inputs

---

## Key Features Explained

### 1. Authentication & Page Separation
Clean, secure authentication flow with separated pages:
- **Dedicated Auth Page** (`auth.html`)
  - Login form with email/username support
  - Registration with email verification
  - Forgot password functionality
  - Resend verification email option
  - Smart footer visibility (shown on login/register, hidden on password reset)
- **Protected Routes**
  - Unauthenticated users automatically redirected to `auth.html`
  - Authenticated users cannot access `auth.html` (redirected to `index.html`)
  - Session-based authentication with automatic checks
- **Clean User Experience**
  - No mixed content when site is down or during navigation
  - Separate concerns: authentication vs. application
  - Professional, production-ready flow

**Authentication Flow:**
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

### 2. Admin Analytics Dashboard
Real-time insights with interactive visualizations:
- **Statistics Cards**: Total users, books, reviews, downloads
- **Charts**: Genre distribution (doughnut), user growth (line)
- **Data Tables**: Popular books, recent activity, top reviewers
- **Auto-refresh**: Updates every 5 minutes

### 3. AI-Powered Recommendations
Multiple recommendation strategies:
- **Content-based filtering**: Based on genres and authors
- **Collaborative filtering**: Based on user behavior
- **HuggingFace integration**: Advanced ML recommendations
- **Python fallback**: Local recommendation script

### 4. Email System
Flexible email service with multiple provider options:
- **Verification emails**: Secure account activation
- **Password reset**: Token-based recovery
- **Templates**: Beautiful HTML email templates
- **Multi-provider support**: 
  - Resend (recommended, 3,000 emails/month free)
  - Gmail SMTP (100% free with app password)
  - SendGrid (100 emails/day free)
  - Brevo (300 emails/day free)

---

## Configuration

### Database Setup (Supabase)

1. Create a Supabase project at https://supabase.com
2. Go to Project Settings → Database
3. Use **Session Mode** connection string (port 5432, not 6543)
4. Copy the connection string
5. Add to `.env` as `DATABASE_URL`

Tables are created automatically on first run.

### Cloudinary Setup

1. Create account at https://cloudinary.com
2. Go to Dashboard → Account Details
3. Copy Cloud Name, API Key, and API Secret
4. Add credentials to `.env`
5. Files are uploaded automatically when adding books

### Email Service Setup

**Option 1: Resend (Recommended)**
- Free tier: 3,000 emails/month
- Sign up: https://resend.com
- Create API key
- Add `RESEND_API_KEY` to `.env`
- Use `onboarding@resend.dev` for testing

**Option 2: Gmail**
- 100% free
- Enable 2-Step Verification: https://myaccount.google.com/security
- Generate App Password: https://myaccount.google.com/apppasswords
- Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to `.env`

**Option 3: Brevo (formerly Sendinblue)**
- Free tier: 300 emails/day
- Sign up: https://www.brevo.com
- Create API key
- Add `BREVO_API_KEY` to `.env`

**Option 4: SendGrid**
- Free tier: 100 emails/day
- Sign up: https://sendgrid.com
- Create API key
- Add `SENDGRID_API_KEY` to `.env`

---

## Default Admin Account

**Username**: Set in `.env` (`ADMIN_USERNAME`, default: `admin`)  
**Password**: Set in `.env` (`ADMIN_PASSWORD`)

**Important:** Change the default password before deployment!

The admin account is created automatically on first server start.

---

## Troubleshooting

### Database Connection Issues

```bash
# Test your connection
npm run test:connection

# Run diagnostics
npm run diagnose
```

**Common fixes:**
- Use Session Mode (port 5432), not Transaction Mode (port 6543)
- Check Supabase project is not paused
- Verify `DATABASE_URL` is correct in `.env`
- Ensure no firewall blocking the connection

### Email Not Sending

```bash
# Test email service
npm run test-email your.email@example.com
```

**Common fixes:**
- Verify API keys are correct
- Check email service is properly configured
- Look in spam/junk folder
- Check service provider dashboard for errors

### File Upload Failing

**Check:**
- File type is allowed (images: JPG/PNG/WebP, documents: PDF)
- File size is within limits (2MB for covers, 50MB for PDFs)
- Cloudinary credentials are correct
- Check server logs for detailed error

### Tests Failing

```bash
# Install test dependencies if missing
npm install --save-dev jest supertest @types/jest

# Run specific test
npm test -- auth.test.js

# Check for environment issues
# Make sure ADMIN_USERNAME is set (default: 'admin')
```

### Server Won't Start

**Common issues:**
- Missing required environment variables (check `.env.example`)
- Using default password in production
- Database connection failed
- Port already in use

Check logs for specific error messages.

---

## Analytics Dashboard Access

1. Login as admin
2. Click hamburger menu
3. Select "Analytics Dashboard"
4. View real-time statistics and charts

**Dashboard Features:**
- Statistics overview (users, books, reviews, downloads)
- Genre distribution pie chart
- User growth trend (last 30 days)
- Popular books table
- Recent activity feed
- Top reviewers leaderboard
- Books without reviews list

---

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add all environment variables from `.env`
6. Set `NODE_ENV=production`
7. Deploy

### Frontend (Netlify)

1. Connect GitHub repository
2. Configure:
   - Build Command: (none)
   - Publish Directory: `public`
3. Add environment variables if needed
4. Deploy

### Environment Variables for Production

**Required:**
- `NODE_ENV=production`
- `DATABASE_URL` (production database)
- `SESSION_SECRET` (strong random string)
- `ADMIN_PASSWORD` (strong password, not default)
- `CLOUDINARY_*` credentials
- Email service credentials
- `FRONTEND_URL` and `BACKEND_URL`

**Optional:**
- `LOG_LEVEL=info`
- `HUGGINGFACE_API_KEY`

**Security:** Never use default passwords or secrets in production!

---

## Future Enhancements

Potential features to add:
- Book borrowing system with due dates
- Advanced search with filters
- Progressive Web App (PWA)
- Download tracking and analytics
- Reading lists/collections
- Social sharing features
- Discussion forums
- Mobile app (React Native/Flutter)
- Book reservations
- Fine management system
- Multi-language support
- Dark mode

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Run tests (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

**Code Standards:**
- Write tests for new features
- Follow existing code style
- Update documentation
- Ensure all tests pass

---

## License

ISC License - see LICENSE file for details

---

## Contact

For questions or support:
- Open an issue on GitHub
- Email: [Your Email]
- Website: [Your Website]

---

## Acknowledgments

**Technologies:**
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express.js](https://expressjs.com/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Supabase](https://supabase.com/) - Database hosting
- [Cloudinary](https://cloudinary.com/) - File storage
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Jest](https://jestjs.io/) - Testing framework

**UI Libraries:**
- [Bootstrap](https://getbootstrap.com/) - CSS framework
- [Chart.js](https://www.chartjs.org/) - Charts
- [Font Awesome](https://fontawesome.com/) - Icons

**AI/ML:**
- [HuggingFace](https://huggingface.co/) - AI models

**Hosting:**
- [Render](https://render.com/) - Backend
- [Netlify](https://www.netlify.com/) - Frontend

---

## Project Stats

- **Lines of Code**: ~15,000+
- **Test Coverage**: 47 tests across 3 test suites
- **File Upload Security**: MIME + Extension validation
- **Logging**: Structured with Winston
- **Authentication**: Passport.js + bcrypt
- **Database**: PostgreSQL with connection pooling
- **Real-time Analytics**: Admin dashboard
- **AI Recommendations**: HuggingFace integration

---

**Built with care for book lovers and developers**
