# 🚀 Quick Database Setup Guide

This guide provides quick commands to set up your database using either migrations or synchronization mode.

## 🎯 Quick Start Options

### Option 1: Interactive Setup (Recommended)
```bash
npm run db:setup
```
This will guide you through the setup process with an interactive menu.

### Option 2: Quick Commands

#### Migration Mode (Production-Ready)
```bash
# Run migrations + seed data
npm run db:migrate

# Or step by step:
npm run migration:run    # Run migrations
npm run seed:run         # Add sample data
```

#### Synchronization Mode (Development Only)
```bash
# Sync schema + seed data
npm run db:sync

# Or step by step:
npm run schema:sync      # Sync entities to database
npm run seed:run         # Add sample data
```

#### Reset Database (Development Only)
```bash
# Drop all tables, recreate schema, and seed data
npm run db:reset
```

## 📋 Available Commands

| Command | Description | Mode |
|---------|-------------|------|
| `npm run db:setup` | Interactive setup wizard | Both |
| `npm run db:migrate` | Run migrations + seed | Migration |
| `npm run db:sync` | Sync schema + seed | Sync |
| `npm run db:reset` | Drop + recreate + seed | Sync |
| `npm run migration:run` | Run pending migrations | Migration |
| `npm run migration:revert` | Revert last migration | Migration |
| `npm run schema:sync` | Sync entities to DB | Sync |
| `npm run schema:drop` | Drop all tables | Both |
| `npm run seed:run` | Add sample data | Both |

## 🔧 Manual Migration Management

```bash
# Migration runner with options
npm run migrate help
npm run migrate run
npm run migrate status
npm run migrate revert
```

## 🧪 Testing Your Setup

```bash
# Test API endpoints
npm run test:api:full

# Start development server
npm run start:dev
```

## ⚙️ Environment Setup

Make sure your `.env` file exists:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kaha_user
DB_PASSWORD=password
DB_NAME=kaha_hostel_db
NODE_ENV=development
```

## 🚨 Important Notes

- **Migration Mode**: Safe for production, version controlled
- **Sync Mode**: Development only, can cause data loss
- **Always backup** before running in production
- **Test thoroughly** after any database changes

## 🆘 Troubleshooting

1. **Database connection fails**: Check your `.env` file
2. **Migration errors**: Check migration files for syntax
3. **Sync issues**: Try `npm run db:reset` in development
4. **Permission errors**: Ensure database user has proper permissions

## 📚 More Information

- See `MIGRATION-GUIDE.md` for detailed migration documentation
- Check entity files in `src/*/entities/` for schema definitions
- Review migration files in `src/database/migrations/`