# Booking System Testing Guide

## Overview

This guide provides step-by-step instructions for testing the consolidated booking system. The system now uses a unified MultiGuestBooking architecture that handles both single and multi-guest bookings.

## Prerequisites

### 1. Server Setup
```bash
# Install dependencies
npm install

# Start the server in development mode
npm run start:dev
```

### 2. Database Setup
```bash
# Run migrations (if needed)
npm run migration:run

# Verify database is accessible
npm run migration:show
```

## Testing Scripts Available

### 1. Quick Health Check
**File**: `quick-test.js`
**Purpose**: Basic server and endpoint health check
**Usage**:
```bash
node quick-test.js
```

### 2. Automated Flow Test
**File**: `test-booking-flow-automated.js`
**Purpose**: Complete automated test of all booking workflows
**Usage**:
```bash
node test-booking-flow-automated.js
```

### 3. Step-by-Step Interactive Test
**File**: `test-booking-flow-step-by-step.js`
**Purpose**: Interactive testing with user prompts between steps
**Usage**:
```bash
node test-booking-flow-step-by-step.js
```

### 4. Comprehensive Test Suite
**File**: `test-consolidated-booking-system.js`
**Purpose**: Full system testing including performance and edge cases
**Usage**:
```bash
node test-consolidated-booking-system.js
```

## Testing Flow

### Phase 1: Basic Health Check

1. **Start with Quick Test**
   ```bash
   node quick-test.js
   ```
   
   This will verify:
   - Server is running
   - Basic endpoints are accessible
   - Simple booking creation works

### Phase 2: Automated Flow Testing

2. **Run Automated Flow Test**
   ```bash
   node test-booking-flow-automated.js
   ```
   
   This tests the complete booking workflow:
   - System health check
   - Initial statistics
   - Single guest booking creation
   - Single guest booking retrieval
   - Multi-guest booking creation
   - Multi-guest booking retrieval
   - Pending bookings list
   - Booking approval/confirmation
   - Final statistics
   - Unified booking list

### Phase 3: Comprehensive Testing

3. **Run Comprehensive Test Suite**
   ```bash
   node test-consolidated-booking-system.js
   ```
   
   This includes:
   - All workflow tests
   - Validation rule testing
   - API backward compatibility
   - Performance testing
   - Error handling
   - Data integrity checks

## Manual Testing Endpoints

### Single Guest Booking Endpoints

#### 1. Create Single Guest Booking
```bash
curl -X POST http://localhost:3000/booking-requests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "555-1001",
    "email": "john.doe@test.com",
    "guardianName": "Jane Doe",
    "guardianPhone": "555-1002",
    "course": "Computer Science",
    "institution": "Test University",
    "checkInDate": "2024-02-01",
    "duration": "6",
    "notes": "Test booking",
    "source": "website"
  }'
```

#### 2. Get All Bookings
```bash
curl -X GET http://localhost:3000/booking-requests
```

#### 3. Get Booking by ID
```bash
curl -X GET http://localhost:3000/booking-requests/{booking-id}
```

#### 4. Approve Booking
```bash
curl -X POST http://localhost:3000/booking-requests/{booking-id}/approve \
  -H "Content-Type: application/json" \
  -d '{
    "processedBy": "admin",
    "assignedRoom": "Room 101",
    "createStudent": true
  }'
```

#### 5. Reject Booking
```bash
curl -X POST http://localhost:3000/booking-requests/{booking-id}/reject \
  -H "Content-Type: application/json" \
  -d '{
    "processedBy": "admin",
    "reason": "No available rooms"
  }'
```

### Multi-Guest Booking Endpoints

#### 1. Create Multi-Guest Booking
```bash
curl -X POST http://localhost:3000/booking-requests/multi-guest \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "contactPerson": {
        "name": "Alice Johnson",
        "phone": "555-2001",
        "email": "alice.johnson@test.com"
      },
      "guests": [
        {
          "bedId": "bed1",
          "name": "Bob Johnson",
          "age": 20,
          "gender": "Male"
        },
        {
          "bedId": "bed2",
          "name": "Carol Johnson",
          "age": 18,
          "gender": "Female"
        }
      ],
      "checkInDate": "2024-02-15",
      "duration": "12 months",
      "notes": "Test multi-guest booking",
      "source": "mobile_app"
    }
  }'
```

#### 2. Get All Multi-Guest Bookings
```bash
curl -X GET http://localhost:3000/booking-requests/multi-guest
```

#### 3. Get Multi-Guest Booking by ID
```bash
curl -X GET http://localhost:3000/booking-requests/multi-guest/{booking-id}
```

#### 4. Confirm Multi-Guest Booking
```bash
curl -X POST http://localhost:3000/booking-requests/multi-guest/{booking-id}/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "processedBy": "admin"
  }'
```

#### 5. Cancel Multi-Guest Booking
```bash
curl -X POST http://localhost:3000/booking-requests/multi-guest/{booking-id}/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Cancelled by admin",
    "processedBy": "admin"
  }'
```

### Statistics and Utility Endpoints

#### 1. Get Booking Statistics
```bash
curl -X GET http://localhost:3000/booking-requests/stats
```

#### 2. Get Pending Bookings
```bash
curl -X GET http://localhost:3000/booking-requests/pending
```

#### 3. Get Multi-Guest Statistics
```bash
curl -X GET http://localhost:3000/booking-requests/multi-guest/stats
```

## Expected Response Formats

### Single Guest Booking Response
```json
{
  "status": 201,
  "data": {
    "id": "booking-id",
    "name": "John Doe",
    "phone": "555-1001",
    "email": "john.doe@test.com",
    "status": "Pending",
    "guardianName": "Jane Doe",
    "course": "Computer Science",
    "institution": "Test University",
    "checkInDate": "2024-02-01",
    "duration": "6",
    "priorityScore": 10,
    "source": "website",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Multi-Guest Booking Response
```json
{
  "status": 201,
  "data": {
    "id": "booking-id",
    "bookingReference": "MGB123456ABCDEF",
    "contactPerson": {
      "name": "Alice Johnson",
      "phone": "555-2001",
      "email": "alice.johnson@test.com"
    },
    "guests": [
      {
        "id": "guest-id-1",
        "bedId": "bed1",
        "name": "Bob Johnson",
        "age": 20,
        "gender": "Male",
        "status": "Pending"
      },
      {
        "id": "guest-id-2",
        "bedId": "bed2",
        "name": "Carol Johnson",
        "age": 18,
        "gender": "Female",
        "status": "Pending"
      }
    ],
    "totalGuests": 2,
    "confirmedGuests": 0,
    "status": "Pending",
    "checkInDate": "2024-02-15",
    "duration": "12 months",
    "source": "mobile_app",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Statistics Response
```json
{
  "status": 200,
  "data": {
    "totalBookings": 25,
    "pendingBookings": 5,
    "approvedBookings": 18,
    "rejectedBookings": 2,
    "cancelledBookings": 0,
    "singleGuestBookings": 20,
    "multiGuestBookings": 5,
    "approvalRate": 72.0,
    "sourceBreakdown": {
      "website": 15,
      "mobile_app": 8,
      "phone": 2
    },
    "monthlyTrend": [
      { "month": "2024-01-01", "count": 12 },
      { "month": "2024-02-01", "count": 13 }
    ]
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Server Not Starting
**Error**: Connection refused
**Solution**: 
```bash
# Check if server is running
npm run start:dev

# Check for compilation errors in the logs
```

#### 2. TypeScript Compilation Errors
**Error**: Property does not exist on type
**Solution**: 
```bash
# Check entity definitions match service usage
# Ensure all imports are correct
# Run type checking
npm run build
```

#### 3. Database Connection Issues
**Error**: Database connection failed
**Solution**:
```bash
# Check database is running
# Verify connection string in .env
# Run migrations
npm run migration:run
```

#### 4. API Response Format Issues
**Error**: Unexpected response structure
**Solution**:
- Check transformation service is working
- Verify controller response format
- Test with simple curl commands

### Debugging Steps

1. **Check Server Logs**
   ```bash
   # Look for compilation errors
   # Check for runtime errors
   # Verify database connections
   ```

2. **Test Individual Endpoints**
   ```bash
   # Start with simple GET requests
   curl -X GET http://localhost:3000/booking-requests
   
   # Test POST with minimal data
   curl -X POST http://localhost:3000/booking-requests \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","phone":"123","email":"test@test.com"}'
   ```

3. **Check Database State**
   ```sql
   -- Verify tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Check booking data
   SELECT * FROM multi_guest_bookings LIMIT 5;
   SELECT * FROM booking_guests LIMIT 5;
   ```

## Test Data Templates

### Minimal Single Guest Booking
```json
{
  "name": "Test User",
  "phone": "555-0000",
  "email": "test@example.com"
}
```

### Complete Single Guest Booking
```json
{
  "name": "John Doe",
  "phone": "555-1001",
  "email": "john.doe@test.com",
  "guardianName": "Jane Doe",
  "guardianPhone": "555-1002",
  "preferredRoom": "Room A101",
  "course": "Computer Science",
  "institution": "Test University",
  "checkInDate": "2024-02-01",
  "duration": "6",
  "notes": "Test booking",
  "emergencyContact": "555-1003",
  "address": "123 Test St",
  "idProofType": "Passport",
  "idProofNumber": "P123456789",
  "source": "website"
}
```

### Parent Booking for Children
```json
{
  "data": {
    "contactPerson": {
      "name": "Parent Name",
      "phone": "555-3001",
      "email": "parent@example.com"
    },
    "guests": [
      {
        "bedId": "bed3",
        "name": "Child One",
        "age": 17,
        "gender": "Female"
      },
      {
        "bedId": "bed4",
        "name": "Child Two",
        "age": 19,
        "gender": "Male"
      }
    ],
    "checkInDate": "2024-03-01",
    "duration": "1 academic year",
    "notes": "Parent booking for children",
    "emergencyContact": "555-3002",
    "source": "website"
  }
}
```

## Success Criteria

### ✅ All Tests Should Pass
- System health check
- Single guest booking workflow
- Multi-guest booking workflow
- Parent booking workflow
- API backward compatibility
- Data integrity validation

### ✅ Performance Benchmarks
- API response time < 500ms for simple requests
- API response time < 1000ms for complex requests
- Database queries complete within acceptable limits

### ✅ Functional Requirements
- Single guest bookings work as before
- Multi-guest bookings support multiple guests
- Parent-booking-for-children workflow functions
- All existing API endpoints maintain compatibility
- Statistics include all booking types

## Next Steps

After successful testing:

1. **Deploy to Staging**
   - Run full test suite on staging
   - Perform user acceptance testing
   - Validate with real data

2. **Production Deployment**
   - Run database migration
   - Deploy updated code
   - Monitor system performance
   - Validate all functionality

3. **Post-Deployment**
   - Monitor error rates
   - Check performance metrics
   - Gather user feedback
   - Plan cleanup of old system components