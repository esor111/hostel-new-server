# Multi-Hostel Migration Guide

## Overview

This guide covers the database schema migration for adding multi-hostel support to the Kaha Hostel Management System. The migration adds `hostelId` columns to all core entities and establishes proper relationships with the hostel system.

## Migration Details

### File: `1757600000000-AddHostelIdToEntities.ts`

This migration transforms the single-hostel system into a multi-hostel architecture by:

1. **Creating hostel infrastructure** - Ensures `hostel_profiles` table exists
2. **Creating default hostel** - Creates a default hostel for existing data
3. **Adding hostelId columns** - Adds `hostelId` to all core tables
4. **Migrating existing data** - Assigns all existing records to the default hostel
5. **Adding constraints** - Makes `hostelId` non-nullable with foreign key constraints
6. **Adding indexes** - Creates performance indexes on `hostelId` columns
7. **Special handling** - Updates beds table to derive `hostelId` from room relationship

## Affected Tables

The migration adds `hostelId` columns to the following tables:

- `rooms` - Room records scoped by hostel
- `students` - Student records scoped by hostel  
- `beds` - Bed records scoped by hostel (derived from room)
- `multi_guest_bookings` - Booking records scoped by hostel
- `invoices` - Invoice records scoped by hostel
- `payments` - Payment records scoped by hostel
- `ledger_entries` - Ledger entries scoped by hostel
- `discounts` - Discount records scoped by hostel
- `admin_charges` - Admin charge records scoped by hostel
- `reports` - Report records scoped by hostel

## Pre-Migration Checklist

Before running the migration, ensure:

- [ ] Database backup is created
- [ ] Application is stopped or in maintenance mode
- [ ] Database connection is stable
- [ ] Sufficient disk space is available
- [ ] All pending migrations are applied

## Running the Migration

### 1. Test Migration Logic (Recommended)

```bash
# Test the migration logic without executing
node test-migration-logic.js
```

### 2. Test with Sample Data (Optional)

```bash
# Test migration behavior with sample data
node test-migration-with-sample-data.js
```

### 3. Execute Migration

```bash
# Run the migration
npm run migration:run
```

### 4. Verify Migration Success

```bash
# Check migration status
npm run typeorm -- migration:show -d ormconfig.ts
```

## Post-Migration Verification

After running the migration, verify:

### 1. Check Table Structure

```sql
-- Verify hostelId columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rooms' AND column_name = 'hostelId';

-- Check foreign key constraints
SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE constraint_name LIKE 'FK_%_hostelId';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE 'IDX_%_hostelId';
```

### 2. Verify Data Integrity

```sql
-- Check that all records have hostelId
SELECT 'rooms' as table_name, COUNT(*) as total, COUNT("hostelId") as with_hostel_id FROM rooms
UNION ALL
SELECT 'students', COUNT(*), COUNT("hostelId") FROM students
UNION ALL
SELECT 'beds', COUNT(*), COUNT("hostelId") FROM beds;

-- Verify beds hostelId matches room hostelId
SELECT COUNT(*) as mismatched_beds
FROM beds b
JOIN rooms r ON b.room_id = r.id
WHERE b."hostelId" != r."hostelId";
```

### 3. Check Default Hostel

```sql
-- Verify default hostel was created
SELECT id, hostel_name, owner_name 
FROM hostel_profiles 
ORDER BY created_at 
LIMIT 1;
```

## Rollback Procedure

If you need to rollback the migration:

### 1. Backup Current State

```bash
# Create backup before rollback
pg_dump -h localhost -U root -d kaha_hostel_db > backup_before_rollback.sql
```

### 2. Execute Rollback

```bash
# Rollback the migration
npm run migration:revert
```

### 3. Verify Rollback

```sql
-- Verify hostelId columns are removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'rooms' AND column_name = 'hostelId';
```

## Troubleshooting

### Common Issues

#### 1. Foreign Key Constraint Errors

**Error**: `violates foreign key constraint`

**Solution**: Ensure `hostel_profiles` table exists and has records before running migration.

#### 2. Column Already Exists

**Error**: `column "hostelId" of relation "table_name" already exists`

**Solution**: The migration includes checks for existing columns. If this occurs, verify the migration hasn't been partially run.

#### 3. Index Creation Fails

**Error**: `relation "IDX_table_hostelId" already exists`

**Solution**: Drop existing indexes manually or ensure migration rollback was complete.

### Recovery Steps

If migration fails mid-execution:

1. **Check migration status**:
   ```bash
   npm run typeorm -- migration:show -d ormconfig.ts
   ```

2. **Identify failed step** by checking logs

3. **Manual cleanup** if necessary:
   ```sql
   -- Remove partially created constraints/indexes
   DROP INDEX IF EXISTS "IDX_rooms_hostelId";
   ALTER TABLE rooms DROP CONSTRAINT IF EXISTS "FK_rooms_hostelId";
   ALTER TABLE rooms DROP COLUMN IF EXISTS "hostelId";
   ```

4. **Re-run migration** after cleanup

## Performance Considerations

### Expected Impact

- **Migration time**: 5-30 minutes depending on data volume
- **Disk space**: Temporary increase during migration
- **Memory usage**: Moderate increase during constraint creation

### Optimization Tips

- Run during low-traffic periods
- Monitor database performance during migration
- Consider increasing `work_mem` temporarily for large datasets

## Security Considerations

### Data Access

After migration:
- All existing data is assigned to the default hostel
- Cross-hostel data access is prevented at the application level
- Database-level foreign key constraints ensure data integrity

### Backup Strategy

- Create full backup before migration
- Test restore procedure on staging environment
- Verify backup integrity before proceeding

## Integration with Authentication System

This migration prepares the database for the multi-hostel authentication system:

1. **JWT tokens** will contain `businessId` (mapped to `hostelId`)
2. **Service layer** will automatically filter by `hostelId`
3. **API endpoints** will be scoped to the authenticated hostel
4. **Data isolation** is enforced at both application and database levels

## Next Steps

After successful migration:

1. **Update entity classes** to include `hostelId` properties
2. **Implement hostel context middleware** for request scoping
3. **Update service layer** with automatic hostel filtering
4. **Apply authentication guards** to protect endpoints
5. **Test multi-hostel functionality** with real tokens

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review migration logs for specific error messages
3. Verify database state using the verification queries
4. Ensure all prerequisites are met before re-running

---

**⚠️ Important**: Always test migrations on a staging environment before applying to production!