# 🔧 Synchronize Mode - Troubleshooting Guide

## 🎯 Common Issues & Solutions

---

## ❌ Issue: Duplicate Index Error

### Error Message
```
error: relation "IDX_xxxxx" already exists
QueryFailedError: relation "IDX_xxxxx" already exists
```

### Cause
An entity has duplicate `@Index()` decorators on the same column/field combination.

### Example Problem
```typescript
@Entity('meal_plans')
@Index(['hostelId'])  // ← Index at class level
export class MealPlan {
  @Column()
  @Index()  // ← Duplicate index on same field!
  hostelId: string;
}
```

### Solution
Remove one of the duplicate indexes:

```typescript
@Entity('meal_plans')
@Index(['hostelId', 'day'], { unique: true })  // Keep composite indexes
export class MealPlan {
  @Column()
  hostelId: string;  // ← Remove @Index() decorator
}
```

### Quick Fix
1. Find the entity causing the error (check server logs)
2. Remove duplicate `@Index()` decorators
3. Drop database: `npm run schema:drop`
4. Restart server: `npm run start:dev`

---

## ❌ Issue: Server Won't Start After Schema Change

### Error Message
```
Unable to connect to the database. Retrying...
```

### Possible Causes
1. Invalid entity decorator
2. Circular dependency
3. Database connection issue
4. Schema sync conflict

### Solution Steps

#### Step 1: Check Entity Syntax
```typescript
// ✅ Correct
@Entity('table_name')
export class MyEntity extends BaseEntity {
  @Column()
  field: string;
}

// ❌ Wrong - missing decorator
export class MyEntity {
  field: string;
}
```

#### Step 2: Drop Database & Restart
```bash
npm run schema:drop
npm run start:dev
```

#### Step 3: Check Database Connection
```bash
# Test PostgreSQL connection
psql -U kaha-dev -d kaha_hostel_db -c "SELECT 1"
```

#### Step 4: Review .env
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kaha-dev
DB_PASSWORD=kaha-dev
DB_NAME=kaha_hostel_db
```

---

## ❌ Issue: Column Type Mismatch

### Error Message
```
error: column "field_name" cannot be cast automatically to type xxx
```

### Cause
Changed column type in entity, but existing data can't be converted.

### Solution

#### Option 1: Drop & Recreate (Development)
```bash
npm run db:reset
```
**Warning**: All data will be lost!

#### Option 2: Manual Migration (Preserve Data)
```sql
-- Connect to database
psql -U kaha-dev -d kaha_hostel_db

-- Manually alter column
ALTER TABLE table_name 
ALTER COLUMN field_name TYPE new_type 
USING field_name::new_type;
```

---

## ❌ Issue: Foreign Key Constraint Violation

### Error Message
```
error: insert or update on table "xxx" violates foreign key constraint
```

### Cause
Trying to create tables with foreign keys before referenced tables exist.

### Solution
TypeORM handles this automatically, but if you see this error:

1. Drop all tables:
```bash
npm run schema:drop
```

2. Restart server (creates tables in correct order):
```bash
npm run start:dev
```

---

## ❌ Issue: Enum Type Already Exists

### Error Message
```
error: type "public.xxx_enum" already exists
```

### Cause
Enum type exists in database but entity definition changed.

### Solution

#### Quick Fix
```bash
npm run schema:drop
npm run start:dev
```

#### Manual Fix (Preserve Data)
```sql
-- Drop the enum type
DROP TYPE IF EXISTS public.xxx_enum CASCADE;

-- Restart server to recreate
```

---

## ❌ Issue: Table Already Exists

### Error Message
```
error: relation "table_name" already exists
```

### Cause
- Partial schema sync failure
- Manual table creation
- Previous migration remnants

### Solution

#### Option 1: Drop All Tables
```bash
npm run schema:drop
npm run start:dev
```

#### Option 2: Drop Specific Table
```sql
DROP TABLE IF EXISTS table_name CASCADE;
```
Then restart server.

---

## ❌ Issue: Synchronize Not Working

### Symptoms
- Entity changes don't reflect in database
- No SQL queries in logs
- Schema stays the same

### Checklist

#### 1. Verify NODE_ENV
```bash
# Check .env file
cat .env | grep NODE_ENV

# Should show: NODE_ENV=development
```

#### 2. Check data-source.ts
```typescript
// Should be:
synchronize: process.env.NODE_ENV === 'development'

// NOT:
synchronize: false
```

#### 3. Restart Server Completely
```bash
# Stop server (Ctrl+C)
# Start again
npm run start:dev
```

#### 4. Check Logs
Look for:
```
query: ALTER TABLE...
query: CREATE TABLE...
```

If you don't see these, synchronize isn't running.

---

## ❌ Issue: Data Disappeared After Restart

### Cause
This is **expected behavior** when:
- Renaming columns
- Renaming tables
- Changing column types
- Removing columns

### Prevention

#### Backup Before Changes
```bash
# Backup database
pg_dump -U kaha-dev kaha_hostel_db > backup.sql

# Restore if needed
psql -U kaha-dev kaha_hostel_db < backup.sql
```

#### Use Seed Scripts
```bash
# Recreate data
npm run seed:run
```

---

## 🔍 Debugging Steps

### Step 1: Enable Verbose Logging
```typescript
// In data-source.ts
logging: true,  // Enable all SQL queries
```

### Step 2: Check Server Logs
Look for:
- SQL queries being executed
- Error messages
- Connection status

### Step 3: Verify Database State
```bash
# Connect to database
psql -U kaha-dev -d kaha_hostel_db

# List tables
\dt

# Describe table
\d table_name

# Check indexes
\di
```

### Step 4: Test Entity Syntax
```bash
# Build project
npm run build

# Check for TypeScript errors
```

---

## 🆘 Nuclear Option: Complete Reset

If nothing works, do a complete reset:

### Step 1: Stop Server
```bash
# Ctrl+C to stop
```

### Step 2: Drop Database
```bash
npm run schema:drop
```

### Step 3: Clear Build Cache
```bash
# Windows
rmdir /s /q dist
rmdir /s /q node_modules\.cache

# Linux/Mac
rm -rf dist
rm -rf node_modules/.cache
```

### Step 4: Rebuild
```bash
npm run build
```

### Step 5: Start Fresh
```bash
npm run start:dev
```

### Step 6: Reseed Data
```bash
npm run seed:run
```

---

## 📊 Health Check Commands

### Check Database Connection
```bash
psql -U kaha-dev -d kaha_hostel_db -c "SELECT version()"
```

### Check Tables
```bash
psql -U kaha-dev -d kaha_hostel_db -c "\dt"
```

### Check Entity Files
```bash
# Windows
dir /s /b src\**\entities\*.entity.ts

# Linux/Mac
find src -name "*.entity.ts"
```

### Check TypeORM Config
```bash
# View current config
cat src/database/data-source.ts
```

---

## 🎓 Best Practices to Avoid Issues

### 1. One Change at a Time
- Make one entity change
- Restart server
- Verify it works
- Then make next change

### 2. Test in Isolation
```typescript
// Create test entity first
@Entity('test_table')
export class TestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  testField: string;
}

// Add to data-source.ts
// Restart and verify
// Then apply to real entities
```

### 3. Keep Backups
```bash
# Daily backup script
pg_dump -U kaha-dev kaha_hostel_db > backup_$(date +%Y%m%d).sql
```

### 4. Use Version Control
```bash
# Commit before major changes
git add .
git commit -m "Before schema change"

# Rollback if needed
git checkout -- .
```

---

## 📞 Getting Help

### Check Logs First
```bash
# Server logs show SQL queries and errors
npm run start:dev
```

### Review Documentation
- [SYNCHRONIZE_MODE_GUIDE.md](./SYNCHRONIZE_MODE_GUIDE.md)
- [QUICK_START_SYNCHRONIZE.md](./QUICK_START_SYNCHRONIZE.md)

### Common Error Patterns

| Error Contains | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| "already exists" | Duplicate index/table | Drop database |
| "cannot be cast" | Type mismatch | Drop & recreate |
| "violates foreign key" | Wrong table order | Drop & recreate |
| "Unable to connect" | DB connection issue | Check .env |
| "synchronize" not working | Wrong NODE_ENV | Check .env |

---

## ✅ Prevention Checklist

Before making entity changes:

- [ ] Backup database (if data is important)
- [ ] Commit current code to git
- [ ] Make one change at a time
- [ ] Test in development first
- [ ] Check for duplicate indexes
- [ ] Verify entity decorators
- [ ] Review foreign key relationships

---

**Last Updated**: January 2025  
**Status**: Active  
**Related**: [SYNCHRONIZE_MODE_GUIDE.md](./SYNCHRONIZE_MODE_GUIDE.md)
