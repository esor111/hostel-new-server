@echo off
REM Script to run database migration via SSH tunnel (Windows)
REM Usage: run-migration.bat

echo.
echo Running database migration for booking system enhancements...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo Error: .env file not found
    exit /b 1
)

REM Load database credentials from .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="DB_USERNAME" set DB_USERNAME=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
    if "%%a"=="DB_DATABASE" set DB_DATABASE=%%b
)

echo Loaded database credentials from .env
echo.

REM Set PGPASSWORD for psql
set PGPASSWORD=%DB_PASSWORD%

echo Executing migration: add-booking-id-to-students.sql
echo.

REM Run migration (assuming psql is in PATH)
psql -h localhost -p 5432 -U %DB_USERNAME% -d %DB_DATABASE% -f migrations\add-booking-id-to-students.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Migration completed successfully!
    echo.
    echo Summary of changes:
    echo   - Added 'booking_id' column to students table
    echo   - Added foreign key constraint linking students to bookings
    echo   - Added index on students.booking_id
    echo   - Added 'phone' column to booking_guests table
    echo   - Added 'email' column to booking_guests table
    echo   - Added indexes on booking_guests email, phone
    echo.
) else (
    echo.
    echo Migration failed! Check error messages above.
    exit /b 1
)

pause
