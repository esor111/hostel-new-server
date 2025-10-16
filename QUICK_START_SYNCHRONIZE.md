# 🚀 Quick Start - Synchronize Mode

## ⚡ TL;DR

**No more migrations!** Just edit entities and restart the server.

---

## 🎯 3-Step Workflow

### 1️⃣ Edit Entity
```typescript
// src/students/entities/student.entity.ts
@Entity()
export class Student {
  @Column()
  newField: string;  // ← Just add this
}
```

### 2️⃣ Restart Server
```bash
npm run start:dev
```

### 3️⃣ Done! ✅
Schema automatically synced. No migration files needed.

---

## 🔴 Critical Rules

```bash
# ✅ Development
NODE_ENV=development npm run start:dev

# ❌ NEVER in Production
NODE_ENV=production  # synchronize is disabled
```

---

## ⚠️ Data Loss Warning

| Action | Result |
|--------|--------|
| Add column | ✅ Safe |
| Remove column | ⚠️ Data lost |
| Rename column | ⚠️ Data lost (seen as drop + create) |
| Rename table | ⚠️ All data lost |
| Change type | ⚠️ Data may be lost |

---

## 📝 Common Commands

```bash
# Start development
npm run start:dev

# Reset database (drop + seed)
npm run db:reset

# Drop all tables
npm run schema:drop

# Seed data only
npm run seed:run
```

---

## 🆘 Troubleshooting

### Server won't start?
```bash
# Check NODE_ENV
echo %NODE_ENV%  # Windows
echo $NODE_ENV   # Linux/Mac

# Should output: development
```

### Schema not syncing?
- Verify `NODE_ENV=development` in `.env`
- Check server logs for SQL errors
- Restart server completely

### Data disappeared?
- Expected behavior when renaming/deleting
- Restore from backup or reseed

---

## 📚 Full Documentation

- **Complete Guide**: `SYNCHRONIZE_MODE_GUIDE.md`
- **Summary**: `MIGRATION_TO_SYNCHRONIZE_SUMMARY.md`
- **Rules**: `.kiro/steering/synchronize-mode-rules.md`

---

## ✅ What Changed

- ❌ Removed: 22 migration files
- ❌ Removed: Migration scripts
- ✅ Added: Auto-sync on restart
- ✅ Added: Development-only mode

---

**Status**: ✅ Active  
**Mode**: Synchronize (Development Only)  
**Last Updated**: January 2025
