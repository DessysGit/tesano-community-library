@echo off
REM Email Service Switcher Script for Windows
REM Usage: switch-email.bat [resend|gmail|brevo]

SET SERVICE=%1

IF "%SERVICE%"=="" (
  echo ❌ Please specify which service to use: resend, gmail, or brevo
  echo.
  echo Usage: switch-email.bat [resend^|gmail^|brevo]
  echo.
  echo Example:
  echo   switch-email.bat resend
  exit /b 1
)

echo 🔄 Switching to %SERVICE% email service...
echo.

REM Backup current email service
IF EXIST "src\services\emailService.js" (
  echo 📦 Backing up current emailService.js...
  copy "src\services\emailService.js" "src\services\emailService-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%.js" >nul
  echo ✅ Backup created
)

REM Switch to selected service
IF "%SERVICE%"=="resend" (
  IF EXIST "src\services\emailService-resend.js" (
    copy "src\services\emailService-resend.js" "src\services\emailService.js" >nul
    echo ✅ Switched to Resend
    echo.
    echo 📝 Next steps:
    echo 1. Install package: npm install resend
    echo 2. Get API key from: https://resend.com/
    echo 3. Set environment variables:
    echo    RESEND_API_KEY=re_your_api_key
    echo    EMAIL_FROM=onboarding@resend.dev
  ) ELSE (
    echo ❌ emailService-resend.js not found!
    exit /b 1
  )
) ELSE IF "%SERVICE%"=="gmail" (
  IF EXIST "src\services\emailService-gmail.js" (
    copy "src\services\emailService-gmail.js" "src\services\emailService.js" >nul
    echo ✅ Switched to Gmail SMTP
    echo.
    echo 📝 Next steps:
    echo 1. Enable 2-Step Verification on your Google account
    echo 2. Generate App Password: https://myaccount.google.com/apppasswords
    echo 3. Set environment variables:
    echo    GMAIL_USER=your.email@gmail.com
    echo    GMAIL_APP_PASSWORD=your_16_char_password
    echo    EMAIL_FROM=your.email@gmail.com
  ) ELSE (
    echo ❌ emailService-gmail.js not found!
    exit /b 1
  )
) ELSE IF "%SERVICE%"=="brevo" (
  IF EXIST "src\services\emailService-brevo.js" (
    copy "src\services\emailService-brevo.js" "src\services\emailService.js" >nul
    echo ✅ Switched to Brevo
    echo.
    echo 📝 Next steps:
    echo 1. Install package: npm install @getbrevo/brevo
    echo 2. Get API key from: https://www.brevo.com/
    echo 3. Set environment variables:
    echo    BREVO_API_KEY=your_api_key
    echo    EMAIL_FROM=your.email@yourdomain.com
  ) ELSE (
    echo ❌ emailService-brevo.js not found!
    exit /b 1
  )
) ELSE (
  echo ❌ Unknown service: %SERVICE%
  echo Valid options: resend, gmail, brevo
  exit /b 1
)

echo.
echo 🎉 Email service switched successfully!
echo.
echo ⚠️  Don't forget to:
echo   1. Update your .env file
echo   2. Update environment variables in Render dashboard
echo   3. Restart your server
