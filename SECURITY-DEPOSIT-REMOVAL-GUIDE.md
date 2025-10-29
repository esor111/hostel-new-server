# 🛠️ Security Deposit Removal - Database Migration Guide

## 🚨 ISSUE DESCRIPTION

After removing the `SECURITY_DEPOSIT` enum value from the code, the database contains existing records with `fee_type = 'security_deposit'`. TypeORM cannot synchronize the schema because of this data constraint violation.

## ✅ SOLUTION STEPS

### Step 1: Stop the Application
Make sure your NestJS application is not running.

### Step 2: Run the Data Cleanup Script
Execute the migration script to remove existing security deposit data:

```bash
cd hostel-new-server
npm run migration:remove-security-deposit
```

This script will:
- ✅ Count existing security deposit records
- ✅ Create a backup table (`security_deposit_backup`)
- ✅ Remove all security deposit records
- ✅ Verify the removal was successful
- ✅ Show remaining fee types

### Step 3: Start the Application
After the script completes successfully, start your application:

```bash
npm run start:dev
```

TypeORM will now be able to synchronize the schema without errors.

## 🔍 WHAT THE SCRIPT DOES

### Before Migration:
```sql
-- Example existing data
SELECT fee_type, COUNT(*) FROM student_financial_info GROUP BY fee_type;
-- Results might show:
-- base_monthly: 50
-- laundry: 30
-- security_deposit: 25  ← This causes the error
```

### After Migration:
```sql
-- After cleanup
SELECT fee_type, COUNT(*) FROM student_financial_info GROUP BY fee_type;
-- Results will show:
-- base_monthly: 50
-- laundry: 30
-- (security_deposit records removed)
```

## 🛡️ SAFETY MEASURES

### Backup Created
The script automatically creates a backup table:
```sql
-- Backup table structure
security_deposit_backup (
  -- All original columns
  -- + backup_created_at timestamp
)
```

### Recovery (If Needed)
If you need to restore the data for any reason:
```sql
-- Manual recovery query (if needed)
INSERT INTO student_financial_info (
  id, created_at, updated_at, student_id, fee_type, amount, 
  effective_from, effective_to, is_active, notes
)
SELECT 
  id, created_at, updated_at, student_id, fee_type, amount, 
  effective_from, effective_to, is_active, notes
FROM security_deposit_backup;
```

## 🎯 EXPECTED OUTPUT

When you run the migration script, you should see:
```
🚀 Starting security deposit data removal script...
✅ Database connection established
📊 Checking for existing security deposit records...
Found 25 security deposit records
💾 Creating backup of security deposit data...
✅ Backup created successfully
🗑️ Removing security deposit records...
✅ Removed 25 security deposit records
✅ All security deposit records successfully removed
📋 Remaining fee types:
   - base_monthly: 50 records
   - food: 30 records
   - laundry: 45 records
   - maintenance: 20 records
   - utilities: 15 records

🎉 Security deposit data removal completed successfully!
✅ You can now start the application - TypeORM schema sync will work
🔌 Database connection closed
✅ Script completed successfully
```

## ❓ TROUBLESHOOTING

### If the script fails:
1. **Check database connection**: Ensure your `.env` file has correct database credentials
2. **Check permissions**: Ensure the database user has DELETE and CREATE TABLE permissions
3. **Check existing connections**: Make sure no other applications are using the database

### If you get permission errors:
```bash
# Make sure the script is executable
chmod +x scripts/remove-security-deposit-data.ts
```

### If TypeORM still fails after migration:
1. Verify no security deposit records remain:
   ```sql
   SELECT COUNT(*) FROM student_financial_info WHERE fee_type = 'security_deposit';
   ```
2. If count is 0, restart the application
3. If issues persist, check the application logs for other errors

## 🎉 SUCCESS CONFIRMATION

After successful migration:
- ✅ Application starts without database errors
- ✅ Student configuration works without security deposit fields
- ✅ Existing students retain all other fee configurations
- ✅ New students can be configured with remaining fee types

The security deposit feature has been completely and safely removed from your system!