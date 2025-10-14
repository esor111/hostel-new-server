# Room Number Constraint Fix

## Problem

When creating a room, the following error occurred:

```
duplicate key value violates unique constraint "UQ_e38efca75345af077ed83d53b6f"
QueryFailedError: duplicate key value violates unique constraint "UQ_e38efca75345af077ed83d53b6f"
```

### Root Cause

The `roomNumber` field in the `rooms` table had a **global unique constraint**, meaning:
- Room number "123" could only exist ONCE across ALL hostels in the database
- This is incorrect because different hostels should be able to use the same room numbers

Example of the problem:
```
Hostel A: Room 123 ✅ (first one created)
Hostel B: Room 123 ❌ (fails with duplicate key error)
```

## Solution

Changed the constraint from **globally unique** to **unique per hostel**:

### 1. Updated Entity Definition

**Before:**
```typescript
@Entity('rooms')
@Index(['roomNumber'], { unique: true }) // ❌ Global unique
export class Room extends BaseEntity {
  @Column({ length: 20, unique: true }) // ❌ Global unique
  roomNumber: string;
}
```

**After:**
```typescript
@Entity('rooms')
@Index(['roomNumber', 'hostelId'], { unique: true }) // ✅ Unique per hostel
export class Room extends BaseEntity {
  @Column({ length: 20 }) // ✅ No global unique
  roomNumber: string;
}
```

### 2. Created Migration

Created migration `1760083000000-UpdateRoomNumberConstraint.ts` that:
1. Drops the old global unique constraint `UQ_e38efca75345af077ed83d53b6f`
2. Creates new composite unique index on `(roomNumber, hostelId)`

### 3. Migration Executed

```bash
npm run migration:run
```

Result:
```
✅ Updated room number constraint: now unique per hostel instead of globally
Migration UpdateRoomNumberConstraint1760083000000 has been executed successfully.
```

## Impact

### Before Fix
```
Hostel A: Room 101, 102, 103 ✅
Hostel B: Room 101 ❌ (duplicate key error)
Hostel B: Room 201, 202, 203 ✅
```

### After Fix
```
Hostel A: Room 101, 102, 103 ✅
Hostel B: Room 101, 102, 103 ✅ (now allowed!)
Hostel C: Room 101, 102, 103 ✅ (now allowed!)
```

Each hostel can now have its own room numbering system!

## Testing

### Test Case 1: Create Room in Different Hostels
```bash
# Hostel A - Create Room 123
POST /rooms
{
  "roomNumber": "123",
  "hostelId": "hostel-a-id",
  ...
}
# Result: ✅ Success

# Hostel B - Create Room 123
POST /rooms
{
  "roomNumber": "123",
  "hostelId": "hostel-b-id",
  ...
}
# Result: ✅ Success (previously would fail)
```

### Test Case 2: Duplicate Room in Same Hostel
```bash
# Hostel A - Create Room 123 (first time)
POST /rooms
{
  "roomNumber": "123",
  "hostelId": "hostel-a-id",
  ...
}
# Result: ✅ Success

# Hostel A - Create Room 123 (second time)
POST /rooms
{
  "roomNumber": "123",
  "hostelId": "hostel-a-id",
  ...
}
# Result: ❌ Duplicate key error (expected behavior)
```

## Files Modified

1. `src/rooms/entities/room.entity.ts` - Updated entity definition
2. `src/migrations/1760083000000-UpdateRoomNumberConstraint.ts` - Created migration

## Database Changes

### Constraint Removed
```sql
ALTER TABLE "rooms" 
DROP CONSTRAINT "UQ_e38efca75345af077ed83d53b6f"
```

### New Index Created
```sql
CREATE UNIQUE INDEX "IDX_room_number_hostel" 
ON "rooms" ("roomNumber", "hostelId")
```

## Verification

To verify the fix is working:

1. **Check the constraint:**
```sql
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'rooms'::regclass
AND conname LIKE '%room%';
```

2. **Check the index:**
```sql
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'rooms'
AND indexname LIKE '%room%';
```

Expected result:
```
indexname: IDX_room_number_hostel
indexdef: CREATE UNIQUE INDEX ... ON rooms USING btree ("roomNumber", "hostelId")
```

## Related Issues

This fix also resolves:
- Multi-tenant hostel management
- Room numbering flexibility
- Hostel-specific room organization

## Notes

- This is a **breaking change** if you had duplicate room numbers across hostels
- The migration will fail if you have existing duplicate room numbers
- If migration fails, you need to manually update duplicate room numbers first

## Rollback

If you need to rollback:

```bash
npm run migration:revert
```

This will:
1. Drop the composite unique index
2. Restore the global unique constraint

⚠️ **Warning:** Rollback will fail if you have duplicate room numbers across hostels.
