# 🔄 TypeORM Synchronize Mode - Development Guide

## 📋 Overview

This project is now running in **TypeORM Synchronize Mode** for development. This means the database schema automatically syncs with your entity definitions on every application start - **no migrations needed**.

---

## ✅ What Changed

### Before (Migration-Based)
- ❌ Had to create migration files for every schema change
- ❌ Had to run migrations manually
- ❌ Migration files cluttered the codebase
- ❌ Extra steps for simple entity updates

### Now (Synchronize Mode)
- ✅ Just update your entities and restart the server
- ✅ Schema automatically syncs with entities
- ✅ Zero migration hassle during development
- ✅ Faster iteration and prototyping

---

## 🚀 How It Works

### Configuration
Located in: `src/database/data-source.ts`

```typescript
synchronize: process.env.NODE_ENV === 'development'
```

- **Development**: `synchronize: true` - Auto-sync enabled
- **Production**: `synchronize: false` - Auto-sync disabled (safety)

### What Happens on Server Start
1. TypeORM reads all entity definitions
2. Compares with current database schema
3. Automatically creates/modifies tables and columns
4. Server starts with synced schema

---

## 🛠️ Development Workflow

### Making Schema Changes

1. **Update your entity file**
   ```typescript
   // Example: Add a new column
   @Entity()
   export class Student {
     @Column()
     newField: string; // Just add this
   }
   ```

2. **Restart the server**
   ```bash
   npm run start:dev
   ```

3. **Done!** The column is automatically added to the database.

### No Need To:
- ❌ Generate migration files
- ❌ Run migration commands
- ❌ Manually alter database tables
- ❌ Keep track of migration history

---

## ⚠️ CRITICAL RULES & WARNINGS

### 🔴 NEVER Use in Production
```typescript
// WRONG - DANGEROUS!
synchronize: true  // in production

// RIGHT - SAFE
synchronize: process.env.NODE_ENV === 'development'
```

**Why?** Synchronize can:
- Drop columns with data
- Delete tables
- Cause data loss
- Break production systems

### 🟡 Data Loss Scenarios

#### Renaming Columns
```typescript
// Before
@Column()
oldName: string;

// After - TypeORM sees this as: DROP oldName, CREATE newName
@Column()
newName: string;  // ⚠️ Data in oldName is LOST!
```

**Solution**: Manually rename in database first, or accept data loss in dev.

#### Renaming Tables
```typescript
// Before
@Entity('old_table')
export class MyEntity {}

// After - TypeORM: DROP old_table, CREATE new_table
@Entity('new_table')
export class MyEntity {}  // ⚠️ All data LOST!
```

**Solution**: Manually rename table in database, or recreate data.

#### Changing Column Types
```typescript
// Before
@Column('varchar')
age: string;

// After - TypeORM: DROP column, CREATE new column
@Column('int')
age: number;  // ⚠️ Data conversion may fail or lose data
```

**Solution**: Be careful with type changes, backup data if needed.

---

## 📝 Best Practices

### ✅ DO

1. **Use for rapid development**
   - Perfect for prototyping
   - Great for early-stage projects
   - Ideal for local development

2. **Keep backups of dev data**
   ```bash
   # Backup your dev database regularly
   pg_dump kaha_hostel_db > backup.sql
   ```

3. **Test entity changes in isolation**
   - Make one entity change at a time
   - Restart and verify
   - Check database schema

4. **Document breaking changes**
   - If you rename/delete columns, inform team
   - Note any data that needs to be recreated

### ❌ DON'T

1. **Don't use in production**
   - Always set `NODE_ENV=production`
   - Use migrations for production deployments

2. **Don't rely on data persistence**
   - Schema changes can wipe data
   - Keep seed scripts handy

3. **Don't rename entities carelessly**
   - Renaming = drop + create = data loss
   - Plan renames carefully

4. **Don't forget to set NODE_ENV**
   ```bash
   # Always set this
   NODE_ENV=development npm run start:dev
   ```

---

## 🔄 Switching Back to Migrations (Future)

When you're ready for production or need migration control:

### Step 1: Disable Synchronize
```typescript
// src/database/data-source.ts
synchronize: false,
migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
migrationsRun: true,
```

### Step 2: Generate Initial Migration
```bash
npm run typeorm migration:generate -- -n InitialSchema
```

### Step 3: Run Migration
```bash
npm run typeorm migration:run
```

---

## 🧪 Testing Schema Changes

### Quick Test Workflow
```bash
# 1. Make entity change
# 2. Restart server
npm run start:dev

# 3. Check logs for schema changes
# Look for: "query: ALTER TABLE..." or "query: CREATE TABLE..."

# 4. Verify in database
psql -d kaha_hostel_db -c "\d table_name"
```

---

## 🔍 Troubleshooting

### Server Won't Start After Entity Change
```bash
# Check TypeORM logs
# Look for SQL errors in console

# Common issues:
# - Invalid column type
# - Constraint violations
# - Foreign key issues
```

**Solution**: Revert entity change, fix issue, try again.

### Schema Not Syncing
```bash
# Verify NODE_ENV
echo $NODE_ENV  # Should be 'development'

# Check data-source.ts
# Ensure: synchronize: process.env.NODE_ENV === 'development'
```

### Data Disappeared
```bash
# Restore from backup
psql -d kaha_hostel_db < backup.sql

# Or reseed data
npm run seed
```

---

## 📊 Environment Variables

### Required Settings
```env
# .env file
NODE_ENV=development  # CRITICAL: Enables synchronize mode

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kaha_user
DB_PASSWORD=password
DB_NAME=kaha_hostel_db
```

### Production Settings
```env
# .env.production
NODE_ENV=production  # CRITICAL: Disables synchronize mode

# ... other DB settings
```

---

## 🎯 Summary

### Current Setup
- ✅ All migration files removed
- ✅ Synchronize mode enabled for development
- ✅ Auto-sync on server restart
- ✅ Safe for development only

### Key Takeaways
1. **Fast Development**: Just edit entities and restart
2. **No Migrations**: Zero migration file management
3. **Development Only**: Never use in production
4. **Data Loss Risk**: Be aware of rename/delete operations
5. **Easy Rollback**: Can switch back to migrations anytime

---

## 📞 Need Help?

### Common Questions

**Q: Can I use this in staging?**
A: Not recommended. Use migrations for any environment with important data.

**Q: What if I need to preserve data during a rename?**
A: Manually rename in database first, or use a migration for that specific change.

**Q: How do I know what changed?**
A: Check server logs on startup - TypeORM logs all SQL queries.

**Q: Can I mix synchronize and migrations?**
A: No, choose one approach. Mixing them causes conflicts.

---

## 🔗 Related Files

- `src/database/data-source.ts` - TypeORM configuration
- `.env` - Environment variables
- `src/**/entities/*.entity.ts` - All entity definitions

---

**Last Updated**: January 2025  
**Mode**: Development (Synchronize Enabled)  
**Status**: ✅ Active
