---
inclusion: always
---

# TypeORM Synchronize Mode - Development Rules

## 🎯 Current Mode: SYNCHRONIZE (Development Only)

### Quick Facts
- **Migrations**: REMOVED - No migration files needed
- **Schema Sync**: AUTOMATIC - On every server restart
- **Environment**: Development only (NODE_ENV=development)

---

## 🚨 CRITICAL RULES

### 1. NEVER Enable in Production
```typescript
// ❌ WRONG
synchronize: true

// ✅ RIGHT
synchronize: process.env.NODE_ENV === 'development'
```

### 2. Understand Data Loss Scenarios
- **Renaming columns** = DROP old + CREATE new = DATA LOST
- **Renaming tables** = DROP old + CREATE new = DATA LOST
- **Changing types** = DROP + CREATE = DATA MAY BE LOST

### 3. Always Set NODE_ENV
```bash
# Development
NODE_ENV=development npm run start:dev

# Production (synchronize disabled)
NODE_ENV=production npm run start:prod
```

---

## ✅ Development Workflow

### Making Entity Changes
1. Edit entity file (add/remove columns, change types)
2. Restart server: `npm run start:dev`
3. Schema automatically syncs
4. Done!

### No Need To:
- Generate migrations
- Run migration commands
- Manually alter database

---

## 📝 Best Practices

### DO
- ✅ Keep dev database backups
- ✅ Test entity changes one at a time
- ✅ Check server logs for schema changes
- ✅ Use seed scripts to recreate data

### DON'T
- ❌ Use in production/staging
- ❌ Rename entities without backing up data
- ❌ Rely on data persistence during schema changes
- ❌ Forget to set NODE_ENV

---

## 🔄 Available Scripts

```bash
# Start development server (auto-sync enabled)
npm run start:dev

# Drop all tables and reseed
npm run db:reset

# Drop all tables only
npm run schema:drop

# Run seed data
npm run seed:run
```

---

## 🆘 Emergency: Switch Back to Migrations

If you need migrations back:

1. Update `src/database/data-source.ts`:
   ```typescript
   synchronize: false,
   migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
   ```

2. Generate initial migration:
   ```bash
   npm run typeorm migration:generate -- -n InitialSchema
   ```

---

## 📚 Full Documentation

See: `SYNCHRONIZE_MODE_GUIDE.md` for complete details.
