# Manual Student Creation UI Components

This folder contains UI components for the manual student creation feature with floor-based bed selection.

## Backend API Endpoints

The following endpoints have been implemented:

### 1. Floor Selection
```
GET /students/manual-create/floors
```
Returns available floors with bed statistics.

### 2. Room Selection  
```
GET /students/manual-create/floors/:floor/rooms
```
Returns available rooms on a specific floor.

### 3. Bed Selection
```
GET /students/manual-create/rooms/:roomId/beds  
```
Returns available beds in a specific room.

### 4. Student Creation
```
POST /students/manual-create
```
Creates a student manually with bed assignment.

## UI Flow

### Step 1: Floor Selection
- Display floors as cards with availability stats
- Show total rooms, available rooms, total beds, available beds
- Only allow selection of floors with available beds

### Step 2: Room Selection  
- Show rooms on selected floor
- Display room number, occupancy, available beds, monthly rate
- Show gender preference if applicable
- Allow back navigation to floor selection

### Step 3: Bed Selection
- Display available beds in selected room as a grid
- Show bed number, identifier, and monthly rate
- Visual bed layout representation
- Allow back navigation to room selection

### Step 4: Student Form
- Comprehensive form with all student details
- Show selected bed summary at top
- Required fields: name, phone, email
- Optional fields: address, guardian info, academic info, ID proof
- Form validation and submission

## Key Features

✅ **Floor-based Navigation**: Hierarchical selection (Floor → Room → Bed)
✅ **Real-time Availability**: Only shows available options at each step
✅ **Visual Feedback**: Clear step indicators and navigation
✅ **Comprehensive Form**: All student information in one place
✅ **Bed Assignment**: Direct bed reservation during creation
✅ **Pending Configuration**: Students appear in existing configuration workflow

## Integration with Existing System

The manual student creation integrates seamlessly with your existing system:

1. **Student Status**: Created with `PENDING_CONFIGURATION` status
2. **Bed Status**: Bed set to `RESERVED` (not `OCCUPIED` yet)
3. **Configuration Flow**: Students appear in existing pending configuration list
4. **Same Workflow**: Admin uses same configuration process as booking-created students
5. **Status Updates**: Configuration API updates to `ACTIVE` status and `OCCUPIED` bed

## Technical Implementation

### Backend (Completed)
- ✅ New DTO: `CreateManualStudentDto`
- ✅ Service methods for floor/room/bed selection
- ✅ Manual student creation with transaction safety
- ✅ Controller endpoints with proper validation
- ✅ Random UUID generation for userId
- ✅ Integration with existing configuration system

### Frontend (Template Provided)
- ✅ HTML/CSS/JS template with modern UI (manual-student-creation.html)
- ✅ Step-by-step wizard interface
- ✅ Responsive design with Tailwind CSS
- ✅ Form validation and error handling
- ✅ Loading states and success feedback
- ✅ Framework-agnostic (works with any backend)

## Usage Instructions

### For Developers:
1. The backend APIs are ready to use
2. Use the HTML template (manual-student-creation.html) as a reference
3. Adapt the API calls to your authentication system (add headers in the JavaScript)
4. Integrate into your existing frontend framework or use as standalone page

### For Admins:
1. Navigate to Manual Student Creation page
2. Select floor with available beds
3. Choose room on selected floor  
4. Pick specific bed in room
5. Fill out student information form
6. Submit to create student
7. Student appears in pending configuration list
8. Use existing configuration process to activate student

## API Response Examples

### Floors Response:
```json
{
  "status": 200,
  "data": [
    {
      "floorNumber": 1,
      "totalRooms": 10,
      "availableRooms": 3,
      "totalBeds": 40,
      "availableBeds": 8
    }
  ]
}
```

### Rooms Response:
```json
{
  "status": 200,
  "data": [
    {
      "roomId": "uuid",
      "roomNumber": "R101",
      "name": "Standard Room",
      "floor": 1,
      "bedCount": 4,
      "occupancy": 2,
      "availableBeds": 2,
      "monthlyRate": 15000,
      "status": "ACTIVE",
      "gender": "Any"
    }
  ]
}
```

### Beds Response:
```json
{
  "status": 200,
  "data": [
    {
      "bedId": "uuid",
      "bedNumber": "bed1",
      "bedIdentifier": "R101-bed1",
      "status": "Available",
      "monthlyRate": 15000,
      "room": {
        "roomId": "uuid",
        "roomNumber": "R101",
        "floor": 1
      }
    }
  ]
}
```

### Student Creation Response:
```json
{
  "status": 201,
  "data": {
    "id": "student-uuid",
    "name": "John Doe",
    "status": "Pending Configuration",
    "bedNumber": "R101-bed1",
    "roomNumber": "R101"
  },
  "message": "Manual student created successfully. Student will appear in pending configuration list."
}
```

## Next Steps

1. **Frontend Integration**: Implement the UI in your frontend framework
2. **Authentication**: Add proper authentication headers to API calls
3. **Styling**: Adapt to your design system
4. **Testing**: Test the complete flow end-to-end
5. **Documentation**: Update user documentation for admins

The backend is fully functional and ready for frontend integration!
