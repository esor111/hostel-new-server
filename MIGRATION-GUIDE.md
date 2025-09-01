# 🏗️ Database Migration Guide

This guide explains how to use the TypeORM migration system for the Kaha Hostel Management System.

## 📋 Overview

The migration system provides a structured way to:
- Create and modify database schema
- Maintain version control of database changes
- Safely deploy database updates to production
- Rollback changes if needed

## 🚀 Quick Start

### 1. Environment Setup

Ensure your `.env` file contains the database configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kaha_user
DB_PASSWORD=password
DB_NAME=kaha_hostel_db
NODE_ENV=development
```

### 2. Run Migrations

```bash
# Run all pending migrations
npm run migrate run

# Or use the direct command
npm run migration:run
```

### 3. Check Migration Status

```bash
# Check which migrations have been applied
npm run migrate status
```

## 📖 Available Commands

### Migration Runner (Recommended)

```bash
# Run all pending migrations
npm run migrate run

# Revert the last migration
npm run migrate revert

# Show migration status
npm run migrate status

# List available migration files
npm run migrate list

# Generate a new migration
npm run migrate generate AddNewFeature

# Show help
npm run migrate help
```

### Direct TypeORM Commands

```bash
# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate migration from entity changes
npm run migration:generate src/database/migrations/1234567890-MigrationName

# Synchronize schema (development only)
npm run schema:sync

# Drop all tables (DANGEROUS)
npm run schema:drop
```

## 📁 Migration Files

### Current Migrations

1. **InitialSchema** (`1704067200000-InitialSchema.ts`)
   - Creates all base tables
   - Sets up ENUM types
   - Defines basic table structure

2. **AddConstraintsAndIndexes** (`1704067300000-AddConstraintsAndIndexes.ts`)
   - Adds foreign key constraints
   - Creates performance indexes
   - Sets up triggers and functions
   - Adds data validation constraints

### Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1234567890 implements MigrationInterface {
  name = 'MigrationName1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Forward migration - apply changes
    await queryRunner.query(`CREATE TABLE ...`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse migration - undo changes
    await queryRunner.query(`DROP TABLE ...`);
  }
}
```

## 🗄️ Database Schema

### Core Tables

- **students** - Student information and enrollment data
- **rooms** - Room details and occupancy management
- **invoices** - Billing and invoice management
- **payments** - Payment tracking and allocation
- **ledger_entries** - Financial ledger for balance tracking
- **discounts** - Discount management and application
- **booking_requests** - Room booking and approval workflow
- **reports** - Report generation and storage

### Relationship Tables

- **room_amenities** - Room-amenity associations
- **room_occupants** - Current room assignments
- **room_layouts** - Room layout configurations (JSONB)
- **student_contacts** - Student contact information
- **student_academic_info** - Academic details
- **student_financial_info** - Fee structure information
- **payment_invoice_allocations** - Payment-to-invoice mappings

### Reference Tables

- **buildings** - Building information
- **room_types** - Room type definitions
- **amenities** - Available amenities
- **discount_types** - Discount type configurations

## 🔧 Development Workflow

### 1. Making Schema Changes

1. **Modify Entities**: Update TypeORM entity files
2. **Generate Migration**: `npm run migrate generate DescriptiveName`
3. **Review Migration**: Check the generated SQL
4. **Test Migration**: Run on development database
5. **Commit Changes**: Include both entity and migration files

### 2. Entity-First vs Migration-First

**Entity-First (Recommended for Development)**:
```bash
# 1. Modify entity files
# 2. Generate migration
npm run migration:generate src/database/migrations/$(date +%s)-AddNewColumn

# 3. Review and run
npm run migrate run
```

**Migration-First (For Complex Changes)**:
```bash
# 1. Create empty migration
npm run migrate generate ComplexSchemaChange

# 2. Write custom SQL in migration file
# 3. Update entities to match
# 4. Run migration
npm run migrate run
```

## 🚨 Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations tested in staging environment
- [ ] Database backup created
- [ ] Migration rollback plan prepared
- [ ] Downtime window scheduled (if needed)
- [ ] Team notified of deployment

### Deployment Steps

1. **Backup Database**
   ```bash
   pg_dump -h localhost -U kaha_user kaha_hostel_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Migrations**
   ```bash
   NODE_ENV=production npm run migrate run
   ```

3. **Verify Deployment**
   ```bash
   npm run migrate status
   npm run test:api:full
   ```

4. **Rollback (if needed)**
   ```bash
   npm run migrate revert
   ```

## 🔍 Troubleshooting

### Common Issues

**Migration Fails**
```bash
# Check database connection
npm run migrate status

# Review migration file for syntax errors
# Fix issues and try again
npm run migrate run
```

**Schema Out of Sync**
```bash
# In development only
npm run schema:sync

# Or generate migration to fix differences
npm run migration:generate FixSchemaDrift
```

**Foreign Key Constraint Errors**
- Ensure proper order of table creation
- Check that referenced tables exist
- Verify data integrity before adding constraints

### Recovery Procedures

**Corrupted Migration State**
1. Check `typeorm_migrations` table
2. Manually fix migration records if needed
3. Re-run specific migrations

**Data Loss Prevention**
- Always backup before major migrations
- Test migrations on copy of production data
- Use transactions in migration files

## 📊 Performance Considerations

### Index Strategy

The migration system creates indexes for:
- Primary and foreign keys (automatic)
- Frequently queried columns
- Composite indexes for common query patterns
- JSONB indexes for JSON column searches

### Query Optimization

- Use `EXPLAIN ANALYZE` to test query performance
- Monitor slow query logs
- Add indexes based on actual usage patterns

## 🔐 Security

### Database Permissions

Ensure migration user has appropriate permissions:
```sql
-- Grant necessary permissions
GRANT CREATE, ALTER, DROP ON DATABASE kaha_hostel_db TO kaha_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kaha_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kaha_user;
```

### Environment Isolation

- Use separate databases for development/staging/production
- Never run migrations directly on production without testing
- Use environment-specific configuration files

## 📚 Best Practices

### Migration Guidelines

1. **Descriptive Names**: Use clear, descriptive migration names
2. **Atomic Changes**: Keep migrations focused on single changes
3. **Reversible**: Always implement proper `down()` methods
4. **Data Safety**: Use transactions for data modifications
5. **Testing**: Test both up and down migrations

### Code Organization

```
src/database/
├── migrations/           # Migration files
├── seeds/               # Data seeding scripts
├── data-source.ts       # TypeORM configuration
└── database.module.ts   # NestJS database module
```

### Version Control

- Commit migration files with related entity changes
- Never modify existing migration files after deployment
- Use descriptive commit messages for schema changes

## 🆘 Support

For migration-related issues:

1. Check this guide first
2. Review TypeORM documentation
3. Check application logs
4. Contact the development team

## 📝 Migration Log Template

When deploying migrations, use this template:

```
Migration Deployment Log
=======================
Date: YYYY-MM-DD HH:MM:SS
Environment: [development/staging/production]
Migrations Applied:
- 1704067200000-InitialSchema.ts
- 1704067300000-AddConstraintsAndIndexes.ts

Pre-deployment Checks:
- [x] Database backup created
- [x] Staging environment tested
- [x] Rollback plan prepared

Post-deployment Verification:
- [x] Migration status confirmed
- [x] API tests passed
- [x] Application functionality verified

Issues Encountered: None / [Description]
Rollback Required: No / Yes - [Reason]
```