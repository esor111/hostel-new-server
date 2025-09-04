# BookingRequest System Removal Guide

## Overview

This guide provides instructions for safely removing the BookingRequest entity and service after successfully migrating to the unified MultiGuestBooking system. This removal should only be performed after the database migration is complete and the unified system has been thoroughly tested.

## Prerequisites

### 1. Database Migration Completed
- [ ] ConsolidateBookingSystems migration has been run successfully
- [ ] `booking_requests` table has been dropped
- [ ] `booking_requests_backup` table exists with original data
- [ ] `multi_guest_bookings` table contains migrated data
- [ ] `students` table no longer has `booking_request_id` column

### 2. Unified System Validated
- [ ] All API endpoints maintain backward compatibility
- [ ] Single guest booking creation works via unified system
- [ ] Multi-guest booking creation works correctly
- [ ] Booking approval/rejection workflows function properly
- [ ] Statistics and reporting include all booking data
- [ ] Frontend integration works without issues

### 3. Testing Completed
- [ ] API compatibility tests pass
- [ ] Integration tests pass
- [ ] User acceptance testing completed
- [ ] Performance testing shows acceptable results

## Files to be Removed

### Entity and Service Files
```
src/bookings/entities/booking-request.entity.ts
src/bookings/bookings.service.ts
```

### DTO Files
```
src/bookings/dto/create-booking.dto.ts (if not used by unified system)
src/bookings/dto/update-booking.dto.ts
```

## Files to be Modified

### Core Booking Module
- `src/bookings/bookings.module.ts`
  - Remove BookingRequest entity import
  - Remove BookingsService provider
  - Remove BookingRequest from TypeOrmModule.forFeature()

### Controller
- `src/bookings/bookings.controller.ts`
  - Remove BookingsService dependency
  - All methods already updated to use MultiGuestBookingService

### Database Configuration
- `src/database/data-source.ts`
  - Remove BookingRequest from entities array

### Other Modules
- `src/dashboard/dashboard.module.ts`
- `src/dashboard/dashboard.service.ts`
- `src/reports/reports.module.ts`
- `src/reports/reports.service.ts`
- `src/database/seeds/seed.module.ts`
- `src/database/seeds/seed.service.ts`

## Removal Process

### Step 1: Automated Removal Script

Use the provided removal script:

```bash
# Run the automated removal script
node remove-booking-request-system.js
```

The script will:
1. Check prerequisites
2. Create backup of all files
3. Remove BookingRequest files
4. Update all module imports
5. Run tests to verify functionality
6. Generate removal report

### Step 2: Manual Verification

After running the script, manually verify:

```bash
# 1. Check compilation
npm run build

# 2. Run tests
npm test

# 3. Start application
npm run start:dev

# 4. Test API endpoints
node test-unified-booking-api-compatibility.js
```

### Step 3: Code Review

Review the changes made by the script:

```bash
# Check git diff to see all changes
git diff

# Review specific files
git diff src/bookings/bookings.module.ts
git diff src/bookings/bookings.controller.ts
git diff src/database/data-source.ts
```

## Manual Removal Steps (if script fails)

### 1. Remove Entity File

```bash
rm src/bookings/entities/booking-request.entity.ts
```

### 2. Remove Service File

```bash
rm src/bookings/bookings.service.ts
```

### 3. Update Bookings Module

Edit `src/bookings/bookings.module.ts`:

```typescript
// Remove these imports
import { BookingRequest } from './entities/booking-request.entity';
import { BookingsService } from './bookings.service';

// Remove from TypeOrmModule.forFeature()
TypeOrmModule.forFeature([
  // BookingRequest, // Remove this line
  MultiGuestBooking,
  BookingGuest,
  Student,
  Room,
  Bed
]),

// Remove from providers
providers: [
  // BookingsService, // Remove this line
  MultiGuestBookingService, 
  BookingTransformationService
],

// Remove from exports
exports: [
  // BookingsService, // Remove this line
  MultiGuestBookingService, 
  BookingTransformationService
],
```

### 4. Update Bookings Controller

Edit `src/bookings/bookings.controller.ts`:

```typescript
// Remove this import
import { BookingsService } from './bookings.service';

// Remove from constructor
constructor(
  // private readonly bookingsService: BookingsService, // Remove this line
  private readonly multiGuestBookingService: MultiGuestBookingService,
  private readonly transformationService: BookingTransformationService
) {}
```

### 5. Update Data Source

Edit `src/database/data-source.ts`:

```typescript
// Remove this import
import { BookingRequest } from '../bookings/entities/booking-request.entity';

// Remove from entities array
entities: [
  // BookingRequest, // Remove this line
  MultiGuestBooking,
  BookingGuest,
  // ... other entities
],
```

### 6. Update Other Modules

For each module that imports BookingRequest:

```typescript
// Remove BookingRequest imports
import { BookingRequest } from '../bookings/entities/booking-request.entity';

// Remove from TypeOrmModule.forFeature() arrays
BookingRequest,

// Remove from constructor injections
@InjectRepository(BookingRequest)
private bookingRepository: Repository<BookingRequest>,
```

## Validation Steps

### 1. Compilation Check

```bash
npm run build
```

Should complete without errors.

### 2. Test Suite

```bash
npm test
```

All tests should pass.

### 3. API Functionality

```bash
# Start the application
npm run start:dev

# Test all booking endpoints
curl -X GET http://localhost:3000/booking-requests
curl -X GET http://localhost:3000/booking-requests/stats
curl -X GET http://localhost:3000/booking-requests/pending

# Test booking creation
curl -X POST http://localhost:3000/booking-requests \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"1234567890","email":"test@example.com"}'
```

### 4. Database Consistency

```sql
-- Verify no references to booking_requests table
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name LIKE '%booking_request%';

-- Should return no results

-- Verify multi_guest_bookings has migrated data
SELECT COUNT(*) FROM multi_guest_bookings WHERE total_guests = 1;

-- Should show count of migrated single-guest bookings
```

## Rollback Procedure

If issues are discovered after removal:

### 1. Restore from Backup

```bash
# Find the backup directory created by the removal script
ls -la booking-request-system-backup-*

# Restore files from backup
cp -r booking-request-system-backup-*/src/* src/
```

### 2. Restore Database (if needed)

```sql
-- Only if database issues occur
CREATE TABLE booking_requests AS SELECT * FROM booking_requests_backup;

-- Restore primary key and constraints
ALTER TABLE booking_requests ADD CONSTRAINT pk_booking_requests PRIMARY KEY (id);

-- Restore students.booking_request_id column
ALTER TABLE students ADD COLUMN booking_request_id varchar;
ALTER TABLE students ADD CONSTRAINT "FK_students_booking_request" 
  FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id);
```

### 3. Revert Code Changes

```bash
# If using git
git checkout -- src/bookings/bookings.module.ts
git checkout -- src/bookings/bookings.controller.ts
git checkout -- src/database/data-source.ts

# Restore service files
git checkout -- src/bookings/bookings.service.ts
git checkout -- src/bookings/entities/booking-request.entity.ts
```

## Post-Removal Tasks

### 1. Update Documentation

- [ ] Update API documentation to reflect unified system
- [ ] Update developer guides
- [ ] Update deployment procedures
- [ ] Update troubleshooting guides

### 2. Clean Up

After 30 days of stable operation:

```bash
# Remove backup directories
rm -rf booking-request-system-backup-*

# Remove backup table from database
DROP TABLE booking_requests_backup;
```

### 3. Monitor

- [ ] Monitor application performance
- [ ] Monitor error rates
- [ ] Monitor user feedback
- [ ] Monitor database performance

## Troubleshooting

### Common Issues

#### 1. Compilation Errors

**Error**: Cannot find module './bookings.service'
**Solution**: Ensure all imports of BookingsService are removed

#### 2. Runtime Errors

**Error**: Cannot resolve dependency BookingsService
**Solution**: Remove BookingsService from all module providers arrays

#### 3. Database Errors

**Error**: relation "booking_requests" does not exist
**Solution**: Ensure all queries have been updated to use multi_guest_bookings

#### 4. API Response Format Issues

**Error**: Frontend expects different response format
**Solution**: Verify BookingTransformationService is working correctly

### Emergency Procedures

#### 1. Immediate Rollback

```bash
# Stop the application
sudo systemctl stop hostel-api

# Restore from backup
cp -r booking-request-system-backup-*/src/* src/

# Restart application
sudo systemctl start hostel-api
```

#### 2. Database Recovery

```bash
# Connect to database
psql hostel_management

# Restore booking_requests table
CREATE TABLE booking_requests AS SELECT * FROM booking_requests_backup;

# Restore constraints and indexes
-- (run the full restoration script)
```

## Success Criteria

### Technical Success
- [ ] Application compiles without errors
- [ ] All tests pass
- [ ] No runtime errors in logs
- [ ] API endpoints respond correctly
- [ ] Database queries execute successfully

### Business Success
- [ ] All booking functionality works as expected
- [ ] No user workflow disruption
- [ ] Performance remains acceptable
- [ ] Data integrity maintained

### Operational Success
- [ ] Deployment process unchanged
- [ ] Monitoring and alerting functional
- [ ] Backup and recovery procedures work
- [ ] Documentation updated

## Support Information

### Key Files Modified
- Bookings module and controller
- Database configuration
- Dashboard and reports modules
- Seed data configuration

### Backup Location
- Automatic backup created by removal script
- Location: `booking-request-system-backup-{timestamp}/`

### Recovery Contact
- Database issues: DBA Team
- Application issues: Backend Development Team
- Emergency: On-call Engineer

## Appendix

### A. Removal Script Output Example

```
🗑️ BookingRequest System Removal Script
=======================================

🔍 Checking prerequisites...
✅ Database migration has been run
✅ booking_requests table has been removed
✅ Unified booking system is working correctly

📦 Creating backup of files to be removed...
✅ Backed up: src/bookings/entities/booking-request.entity.ts
✅ Backed up: src/bookings/bookings.service.ts
📦 Backup created: ./booking-request-system-backup-1757000000000 (8 files)

🗑️ Removing BookingRequest files...
✅ Removed: src/bookings/entities/booking-request.entity.ts
✅ Removed: src/bookings/bookings.service.ts
🗑️ Removed 2 files

🔧 Updating bookings module...
✅ Updated bookings module

🔧 Updating bookings controller...
✅ Updated bookings controller

🔧 Updating data source...
✅ Updated data source

🧪 Running tests to verify removal...
✅ Application compiles successfully
✅ Unified booking system tests pass

🎉 BookingRequest System Removal Completed Successfully!
```

### B. Files Checklist

Before removal:
- [ ] booking-request.entity.ts exists
- [ ] bookings.service.ts exists
- [ ] BookingRequest imported in modules
- [ ] BookingsService used in controller

After removal:
- [ ] booking-request.entity.ts removed
- [ ] bookings.service.ts removed
- [ ] No BookingRequest imports remain
- [ ] No BookingsService dependencies remain
- [ ] Application compiles successfully
- [ ] All tests pass