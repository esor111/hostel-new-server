# 🌱 API-Based Database Seeding Guide

This guide explains how to use the API-based seeding system to populate your database with sample data.

## 🎯 Why API-Based Seeding?

- **Test Your APIs**: Seeding through APIs ensures your endpoints work correctly
- **Flexible Data**: Easy to customize and modify seed data
- **Real-world Testing**: Uses the same validation and business logic as production
- **Incremental Seeding**: Seed specific entities without affecting others
- **Development Friendly**: Perfect for development and testing environments

## 🚀 Quick Start

### 1. Start Your Server
```bash
npm run start:dev
```

### 2. Seed All Data at Once
```bash
# Using curl
curl -X POST http://localhost:3001/api/v1/seed/all

# Or test the seeding API
npm run test:seed
```

### 3. Check Seeding Status
```bash
curl http://localhost:3001/api/v1/seed/status
```

## 📋 Available Seeding Endpoints

### Status and Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/seed/status` | GET | Get current seed status and counts |

### Individual Entity Seeding

| Endpoint | Method | Description | Dependencies |
|----------|--------|-------------|--------------|
| `/api/v1/seed/buildings` | POST | Seed building data | None |
| `/api/v1/seed/room-types` | POST | Seed room type definitions | None |
| `/api/v1/seed/amenities` | POST | Seed amenity catalog | None |
| `/api/v1/seed/rooms` | POST | Seed rooms with layouts | Buildings, Room Types, Amenities |
| `/api/v1/seed/students` | POST | Seed student data | Rooms |
| `/api/v1/seed/room-occupants` | POST | Seed room occupancy data | Students, Rooms |
| `/api/v1/seed/discount-types` | POST | Seed discount type definitions | None |
| `/api/v1/seed/invoices` | POST | Seed invoice data | Students |
| `/api/v1/seed/payments` | POST | Seed payment records | Invoices |
| `/api/v1/seed/payment-allocations` | POST | Seed payment-invoice allocations | Payments, Invoices |
| `/api/v1/seed/discounts` | POST | Seed discount data | Students, Discount Types |
| `/api/v1/seed/ledger-entries` | POST | Seed ledger entries | All Financial Entities |
| `/api/v1/seed/bookings` | POST | Seed booking requests | None |

### Bulk Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/seed/all` | POST | Seed all entities in correct order |
| `/api/v1/seed/custom` | POST | Seed custom data (JSON body) |

### Data Management

| Endpoint | Method | Description | Confirmation |
|----------|--------|-------------|--------------|
| `/api/v1/seed/all` | DELETE | Clear all seeded data | `?confirm=yes` |
| `/api/v1/seed/{entity}` | DELETE | Clear specific entity data | `?confirm=yes` |

## 🔧 Usage Examples

### Basic Seeding

```bash
# Seed all data
curl -X POST "http://localhost:3001/api/v1/seed/all"

# Seed with force (overwrite existing)
curl -X POST "http://localhost:3001/api/v1/seed/all?force=true"

# Seed specific entities
curl -X POST "http://localhost:3001/api/v1/seed/students"
curl -X POST "http://localhost:3001/api/v1/seed/rooms?force=true"
```

### Check Status

```bash
# Get current seed status
curl "http://localhost:3001/api/v1/seed/status"

# Response example:
{
  "status": 200,
  "message": "Seed status retrieved successfully",
  "data": {
    "buildings": 2,
    "roomTypes": 3,
    "amenities": 5,
    "rooms": 48,
    "students": 3,
    "invoices": 3,
    "payments": 3,
    "discounts": 2,
    "bookings": 2,
    "reports": 0,
    "lastSeeded": "2024-07-30T10:30:00.000Z"
  }
}
```

### Custom Data Seeding

```bash
# Seed custom student data
curl -X POST "http://localhost:3001/api/v1/seed/custom" \
  -H "Content-Type: application/json" \
  -d '{
    "students": [
      {
        "id": "CUSTOM001",
        "name": "Custom Student",
        "phone": "1234567890",
        "email": "custom@example.com",
        "status": "Active"
      }
    ]
  }'
```

### Data Clearing

```bash
# Clear all data (requires confirmation)
curl -X DELETE "http://localhost:3001/api/v1/seed/all?confirm=yes"

# Clear specific entity data
curl -X DELETE "http://localhost:3001/api/v1/seed/students?confirm=yes"
```

## 🧪 Testing Your Seeding

### Run Seed API Tests
```bash
npm run test:seed
```

This will:
- ✅ Test all seeding endpoints
- ✅ Verify data integrity
- ✅ Check API response formats
- ✅ Test error handling
- ✅ Validate business logic

### Manual Testing Workflow

1. **Start Fresh**
   ```bash
   # Clear existing data
   curl -X DELETE "http://localhost:3001/api/v1/seed/all?confirm=yes"
   ```

2. **Seed Step by Step (Proper Dependency Order)**
   ```bash
   # 1. Independent entities first
   curl -X POST "http://localhost:3001/api/v1/seed/buildings"
   curl -X POST "http://localhost:3001/api/v1/seed/room-types"
   curl -X POST "http://localhost:3001/api/v1/seed/amenities"
   
   # 2. Rooms depend on buildings, room types, and amenities
   curl -X POST "http://localhost:3001/api/v1/seed/rooms"
   
   # 3. Students depend on rooms
   curl -X POST "http://localhost:3001/api/v1/seed/students"
   
   # 4. Room occupants depend on students and rooms
   curl -X POST "http://localhost:3001/api/v1/seed/room-occupants"
   
   # 5. Discount types before discounts
   curl -X POST "http://localhost:3001/api/v1/seed/discount-types"
   
   # 6. Financial entities
   curl -X POST "http://localhost:3001/api/v1/seed/invoices"
   curl -X POST "http://localhost:3001/api/v1/seed/payments"
   curl -X POST "http://localhost:3001/api/v1/seed/payment-allocations"
   
   # 7. Discounts depend on students and discount types
   curl -X POST "http://localhost:3001/api/v1/seed/discounts"
   
   # 8. Ledger entries depend on all financial entities
   curl -X POST "http://localhost:3001/api/v1/seed/ledger-entries"
   
   # 9. Bookings are independent
   curl -X POST "http://localhost:3001/api/v1/seed/bookings"
   ```

3. **Verify Each Step**
   ```bash
   curl "http://localhost:3001/api/v1/seed/status"
   ```

4. **Test Your APIs**
   ```bash
   npm run test:api:full
   ```

## 📊 Sample Data Overview

### Buildings (2 items)
- Main Building (4 floors, 50 rooms)
- Annex Building (3 floors, 30 rooms)

### Room Types (3 items)
- Single AC (₹8,000/month)
- Double AC (₹6,000/month)
- Triple Non-AC (₹4,000/month)

### Amenities (5 items)
- Air Conditioning
- WiFi
- Study Table
- Wardrobe
- Ceiling Fan

### Rooms (48 items)
- 48 rooms across 4 floors
- Mixed AC/Non-AC rooms
- Gender-specific floors
- Complete with amenities and layouts

### Students (3 items)
- John Doe (Room 101, Single AC)
- Jane Smith (Room 301, Female floor)
- Mike Johnson (Room 205, Double AC)

### Financial Data
- 3 invoices (July 2024)
- 3 payments (various methods)
- 2 discounts (early payment, hardship)

### Booking Requests (2 items)
- 1 pending request
- 1 approved request

## 🔄 Integration with Development Workflow

### Development Setup
```bash
# 1. Set up database schema
npm run db:setup  # Choose migration or sync mode

# 2. Seed data via API
curl -X POST "http://localhost:3001/api/v1/seed/all"

# 3. Test your changes
npm run test:api:full
```

### Testing New Features
```bash
# 1. Clear test data
curl -X DELETE "http://localhost:3001/api/v1/seed/students?confirm=yes"

# 2. Seed fresh test data
curl -X POST "http://localhost:3001/api/v1/seed/students?force=true"

# 3. Test your feature
# ... your testing here ...
```

### Custom Test Scenarios
```bash
# Seed specific test data for your feature
curl -X POST "http://localhost:3001/api/v1/seed/custom" \
  -H "Content-Type: application/json" \
  -d '{
    "students": [
      {
        "id": "TEST001",
        "name": "Test Student",
        "phone": "0000000000",
        "email": "test@test.com",
        "status": "Active"
      }
    ]
  }'
```

## 🚨 Important Notes

### Force Parameter
- Use `?force=true` to overwrite existing data
- Without force, seeding skips if data already exists
- Useful for development iterations

### Dependencies
- Some entities depend on others (e.g., students need rooms)
- The seeding service handles dependencies automatically
- Use `/api/v1/seed/all` for proper dependency order

### Data Validation
- All seeded data goes through the same validation as regular API calls
- Invalid data will be rejected with proper error messages
- This ensures your validation logic is working correctly

### Performance
- Seeding large amounts of data may take time
- Consider seeding in smaller batches for large datasets
- Monitor API response times during seeding

## 🛠️ Customizing Seed Data

### Modify Seed Service
Edit `src/database/seeds/seed.service.ts` to:
- Change default data values
- Add more sample records
- Modify business logic
- Add new entity types

### Add Custom Endpoints
Add new seeding endpoints in `src/database/seeds/seed.controller.ts`:
```typescript
@Post('my-custom-data')
async seedMyCustomData() {
  // Your custom seeding logic
}
```

## 📚 Best Practices

1. **Always Test**: Run `npm run test:seed` after changes
2. **Use Force Wisely**: Only use `?force=true` when needed
3. **Check Dependencies**: Ensure required data exists before seeding
4. **Validate Responses**: Check API responses for errors
5. **Clean Up**: Clear test data after testing
6. **Document Changes**: Update this guide when adding new seed data

## 🆘 Troubleshooting

### Common Issues

**Seeding Fails with Validation Errors**
- Check your entity validation rules
- Ensure required fields are provided
- Verify data types match entity definitions

**Dependency Errors**
- Seed dependencies first (buildings → rooms → students)
- Use `/api/v1/seed/all` for automatic dependency handling

**Server Not Responding**
- Ensure server is running: `npm run start:dev`
- Check server logs for errors
- Verify database connection

**Data Not Appearing**
- Check API response for errors
- Verify database connection
- Check entity relationships

### Getting Help

1. Check server logs: `npm run start:dev`
2. Test individual endpoints: `npm run test:seed`
3. Verify database schema: `npm run migrate status`
4. Check API documentation: Visit `/api/docs` when server is running

## 🎉 Success!

Once seeding is complete, you should have:
- ✅ Sample buildings and room types
- ✅ Rooms with amenities and layouts
- ✅ Students with complete profiles
- ✅ Financial records (invoices, payments)
- ✅ Discount and booking data
- ✅ A fully functional API ready for testing

Your database is now ready for development and testing! 🚀