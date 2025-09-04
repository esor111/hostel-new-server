# Booking System Consolidation Migration Guide

## Overview

This guide provides detailed instructions for migrating from the dual booking system (BookingRequest + MultiGuestBooking) to a unified MultiGuestBooking system that handles both single and multi-guest scenarios.

## Migration Components

### 1. Database Migration Script
- **File**: `src/database/migrations/1757000000000-ConsolidateBookingSystems.ts`
- **Purpose**: Consolidates BookingRequest and MultiGuestBooking into unified system
- **Safety**: Includes comprehensive backup and rollback procedures

### 2. Test Script
- **File**: `test-booking-consolidation-migration.js`
- **Purpose**: Validates migration on test environment before production
- **Features**: Tests both migration and rollback scenarios

### 3. Analysis Document
- **File**: `BOOKING_SYSTEM_CONSOLIDATION_ANALYSIS.md`
- **Purpose**: Detailed analysis of current system and migration strategy

## Pre-Migration Checklist

### 1. Environment Preparation
- [ ] Backup production database
- [ ] Ensure sufficient disk space (at least 2x current database size)
- [ ] Verify database connection and permissions
- [ ] Stop all application instances to prevent data conflicts
- [ ] Notify users of maintenance window

### 2. Data Validation
- [ ] Count existing booking_requests: `SELECT COUNT(*) FROM booking_requests;`
- [ ] Count existing multi_guest_bookings: `SELECT COUNT(*) FROM multi_guest_bookings;`
- [ ] Count students with booking_request_id: `SELECT COUNT(*) FROM students WHERE booking_request_id IS NOT NULL;`
- [ ] Verify data integrity of existing bookings

### 3. Application Preparation
- [ ] Deploy updated backend code (without running migration)
- [ ] Ensure all services are stopped
- [ ] Verify migration file is in place
- [ ] Test migration on staging environment

## Migration Execution Steps

### Step 1: Test Migration (Recommended)

```bash
# Run the test script to validate migration
node test-booking-consolidation-migration.js
```

This script will:
- Create a test database copy
- Run the migration
- Validate results
- Test rollback functionality
- Generate a test report

### Step 2: Production Migration

```bash
# 1. Create database backup
pg_dump hostel_management > backup_before_consolidation_$(date +%Y%m%d_%H%M%S).sql

# 2. Run the migration
npm run migration:run

# 3. Verify migration success
npm run migration:show
```

### Step 3: Post-Migration Validation

Run these queries to validate the migration:

```sql
-- 1. Verify backup table exists
SELECT COUNT(*) FROM booking_requests_backup;

-- 2. Verify booking_requests table is dropped
SELECT table_name FROM information_schema.tables WHERE table_name = 'booking_requests';

-- 3. Verify multi_guest_bookings has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'multi_guest_bookings' 
  AND column_name IN ('guardian_name', 'priority_score', 'request_date');

-- 4. Verify data migration
SELECT 
  (SELECT COUNT(*) FROM booking_requests_backup) as original_count,
  (SELECT COUNT(*) FROM multi_guest_bookings WHERE total_guests = 1) as migrated_single_count,
  (SELECT COUNT(*) FROM booking_guests) as total_guests_count;

-- 5. Verify students table cleanup
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'booking_request_id';
```

## Migration Details

### Database Schema Changes

#### 1. Enhanced multi_guest_bookings Table

**New Columns Added:**
```sql
guardian_name VARCHAR(255) NULL
guardian_phone VARCHAR(20) NULL
preferred_room VARCHAR(255) NULL
course VARCHAR(255) NULL
institution VARCHAR(255) NULL
request_date DATE NOT NULL DEFAULT CURRENT_DATE
address TEXT NULL
id_proof_type VARCHAR(50) NULL
id_proof_number VARCHAR(100) NULL
approved_date DATE NULL
rejection_reason TEXT NULL
assigned_room VARCHAR(50) NULL
priority_score INT NOT NULL DEFAULT 0
```

#### 2. Enhanced booking_guests Table

**New Columns Added:**
```sql
guardian_name VARCHAR(255) NULL
guardian_phone VARCHAR(20) NULL
course VARCHAR(255) NULL
institution VARCHAR(255) NULL
address TEXT NULL
id_proof_type VARCHAR(50) NULL
id_proof_number VARCHAR(100) NULL
phone VARCHAR(20) NULL
email VARCHAR(255) NULL
```

#### 3. Students Table Changes

**Removed:**
- `booking_request_id` column
- Foreign key constraint to booking_requests

### Data Migration Process

#### 1. BookingRequest → MultiGuestBooking Mapping

```typescript
// Status mapping
BookingStatus.PENDING → MultiGuestBookingStatus.PENDING
BookingStatus.APPROVED → MultiGuestBookingStatus.CONFIRMED
BookingStatus.REJECTED → MultiGuestBookingStatus.CANCELLED
BookingStatus.CANCELLED → MultiGuestBookingStatus.CANCELLED
BookingStatus.EXPIRED → MultiGuestBookingStatus.CANCELLED
```

#### 2. Single Guest Creation

For each BookingRequest:
1. Create MultiGuestBooking with contact person = guest
2. Create BookingGuest with guest details
3. Set total_guests = 1
4. Set confirmed_guests based on status

#### 3. Booking Reference Generation

Format: `MGB{timestamp}{random}`
- timestamp: Last 6 digits of creation timestamp
- random: 6-character uppercase alphanumeric

## Rollback Procedure

If migration fails or issues are discovered:

### Automatic Rollback

```bash
# Revert the migration
npm run migration:revert
```

### Manual Rollback (if needed)

```sql
-- 1. Restore booking_requests table
CREATE TABLE booking_requests AS SELECT * FROM booking_requests_backup;

-- 2. Restore primary key and indexes
ALTER TABLE booking_requests ADD CONSTRAINT pk_booking_requests PRIMARY KEY (id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
-- ... other indexes

-- 3. Restore students.booking_request_id column
ALTER TABLE students ADD COLUMN booking_request_id VARCHAR;
ALTER TABLE students ADD CONSTRAINT "FK_students_booking_request" 
  FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id);

-- 4. Remove migrated data from multi_guest_bookings
DELETE FROM booking_guests WHERE booking_id IN (
  SELECT id FROM multi_guest_bookings WHERE total_guests = 1 AND source != 'mobile_app'
);
DELETE FROM multi_guest_bookings WHERE total_guests = 1 AND source != 'mobile_app';

-- 5. Remove added columns (optional)
ALTER TABLE multi_guest_bookings DROP COLUMN guardian_name;
-- ... other columns
```

## Performance Considerations

### Migration Performance
- **Estimated Time**: 1-5 minutes per 1000 booking records
- **Disk Space**: Requires 2x current database size during migration
- **Memory**: Standard PostgreSQL memory requirements

### Post-Migration Performance
- **New Indexes**: Created for optimal query performance
- **Query Impact**: Minimal impact on existing queries
- **API Response**: Same response times expected

## Monitoring and Validation

### Key Metrics to Monitor

1. **Data Integrity**
   ```sql
   -- Verify no data loss
   SELECT COUNT(*) FROM booking_requests_backup;
   SELECT COUNT(*) FROM multi_guest_bookings WHERE total_guests = 1;
   ```

2. **Application Health**
   - API response times
   - Error rates
   - Database connection pool usage

3. **User Experience**
   - Booking creation success rate
   - Admin panel functionality
   - Report generation

### Validation Queries

```sql
-- 1. Check for orphaned records
SELECT COUNT(*) FROM booking_guests bg 
LEFT JOIN multi_guest_bookings mgb ON bg.booking_id = mgb.id 
WHERE mgb.id IS NULL;

-- 2. Verify status consistency
SELECT status, COUNT(*) FROM multi_guest_bookings GROUP BY status;

-- 3. Check guest count accuracy
SELECT 
  mgb.total_guests,
  COUNT(bg.id) as actual_guests
FROM multi_guest_bookings mgb
LEFT JOIN booking_guests bg ON mgb.id = bg.booking_id
GROUP BY mgb.id, mgb.total_guests
HAVING mgb.total_guests != COUNT(bg.id);
```

## Troubleshooting

### Common Issues

#### 1. Migration Fails with Constraint Error
**Cause**: Existing data violates new constraints
**Solution**: 
```sql
-- Check for problematic data
SELECT * FROM booking_requests WHERE name IS NULL OR phone IS NULL;
-- Clean up data before re-running migration
```

#### 2. Rollback Fails
**Cause**: Backup table missing or corrupted
**Solution**: Use external database backup
```bash
psql hostel_management < backup_before_consolidation_YYYYMMDD_HHMMSS.sql
```

#### 3. Performance Degradation
**Cause**: Missing indexes after migration
**Solution**: Recreate indexes
```sql
CREATE INDEX CONCURRENTLY idx_multi_guest_bookings_priority_score 
ON multi_guest_bookings(priority_score);
```

#### 4. API Compatibility Issues
**Cause**: Frontend expecting old response format
**Solution**: Verify transformation layer is working
```typescript
// Check BookingTransformationService
const transformed = transformationService.transformToBookingRequestFormat(booking);
```

### Emergency Procedures

#### 1. Immediate Rollback Required
```bash
# Stop all services
sudo systemctl stop hostel-api

# Rollback migration
npm run migration:revert

# Restore from backup if needed
psql hostel_management < backup_before_consolidation_YYYYMMDD_HHMMSS.sql

# Restart services
sudo systemctl start hostel-api
```

#### 2. Data Corruption Detected
```bash
# Stop services
sudo systemctl stop hostel-api

# Restore from backup
dropdb hostel_management
createdb hostel_management
psql hostel_management < backup_before_consolidation_YYYYMMDD_HHMMSS.sql

# Restart services
sudo systemctl start hostel-api
```

## Post-Migration Tasks

### 1. Cleanup (After 30 days)
```sql
-- Remove backup table (only after confirming everything works)
DROP TABLE booking_requests_backup;
```

### 2. Update Documentation
- [ ] Update API documentation
- [ ] Update user manuals
- [ ] Update developer guides

### 3. Monitor for 1 Week
- [ ] Daily data integrity checks
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Error log analysis

## Success Criteria

### Technical Success
- [ ] All existing API endpoints return expected data
- [ ] No data loss during migration
- [ ] Performance within acceptable limits
- [ ] All tests pass

### Business Success
- [ ] Booking creation works for both single and multi-guest
- [ ] Admin can manage all bookings in unified interface
- [ ] Reports include all booking data
- [ ] No user workflow disruption

## Support Contacts

- **Database Issues**: DBA Team
- **Application Issues**: Backend Development Team
- **User Issues**: Support Team
- **Emergency**: On-call Engineer

## Appendix

### A. Sample Test Data

```sql
-- Create test booking requests for validation
INSERT INTO booking_requests (id, name, phone, email, status, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Test User 1', '1111111111', 'test1@example.com', 'Pending', NOW(), NOW()),
  (gen_random_uuid(), 'Test User 2', '2222222222', 'test2@example.com', 'Approved', NOW(), NOW()),
  (gen_random_uuid(), 'Test User 3', '3333333333', 'test3@example.com', 'Rejected', NOW(), NOW());
```

### B. Useful Queries

```sql
-- Get migration statistics
SELECT 
  'booking_requests_backup' as table_name,
  COUNT(*) as record_count
FROM booking_requests_backup
UNION ALL
SELECT 
  'multi_guest_bookings' as table_name,
  COUNT(*) as record_count
FROM multi_guest_bookings
UNION ALL
SELECT 
  'booking_guests' as table_name,
  COUNT(*) as record_count
FROM booking_guests;

-- Check for data inconsistencies
SELECT 
  mgb.id,
  mgb.total_guests,
  COUNT(bg.id) as actual_guests,
  mgb.confirmed_guests,
  COUNT(CASE WHEN bg.status = 'Confirmed' THEN 1 END) as actual_confirmed
FROM multi_guest_bookings mgb
LEFT JOIN booking_guests bg ON mgb.id = bg.booking_id
GROUP BY mgb.id, mgb.total_guests, mgb.confirmed_guests
HAVING mgb.total_guests != COUNT(bg.id) 
    OR mgb.confirmed_guests != COUNT(CASE WHEN bg.status = 'Confirmed' THEN 1 END);
```