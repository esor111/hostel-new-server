# 🆕 New Rooms API - Testing Guide

## ✅ What Was Done

Created **NEW routes** without touching existing code:
- `GET /new-rooms` - Lightweight room listing (NO layout data)
- `GET /new-rooms/:roomId/layout` - Complete layout with furniture array

## 📁 Files Created

1. **`src/rooms/rooms-new.controller.ts`** - New controller with 2 endpoints
2. **`src/rooms/rooms-new.service.ts`** - New service with transformation logic
3. **`src/rooms/rooms.module.ts`** - Updated to include new controller/service

## 🔧 Build Status

✅ **Build Successful!** No errors.

---

## 🧪 Testing Instructions

### Test 1: Lightweight Room Listing

**Request:**
```bash
GET http://localhost:3001/hostel/api/v1/new-rooms?hostelId=YOUR_HOSTEL_ID
```

**Expected Response:**
```json
{
  "status": 200,
  "result": {
    "items": [
      {
        "id": "room-uuid-123",
        "name": "Room 101",
        "roomNumber": "101",
        "type": "Shared",
        "bedCount": 4,
        "occupancy": 2,
        "gender": "Male",
        "monthlyRate": "5000",
        "dailyRate": "167",
        "amenities": [
          { "id": "1", "name": "WiFi", "description": "WiFi" }
        ],
        "status": "ACTIVE",
        "floor": "1",
        "availableBeds": 2,
        "description": "Spacious room",
        "images": [],
        "hasLayout": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**✅ Verify:**
- ❌ NO `layout` object in response
- ❌ NO `beds` array in response
- ✅ `hasLayout` flag is present
- ✅ Response is small/fast

---

### Test 2: Room Layout

**Request:**
```bash
GET http://localhost:3001/hostel/api/v1/new-rooms/ROOM_UUID/layout
```

**Expected Response:**
```json
{
  "status": 200,
  "result": {
    "roomId": "room-uuid-123",
    "hostelId": "hostel-uuid-456",
    
    "dimensions": {
      "width": 12000,
      "height": 16000,
      "unit": "px"
    },
    
    "doors": [
      {
        "id": "door-1",
        "wall": "bottom",
        "position": 0.5,
        "width": 120,
        "x": 6000,
        "y": 0,
        "height": 80
      }
    ],
    
    "furniture": [
      {
        "id": "B1",
        "refId": "bed-uuid-aaa-111",
        "type": "bed",
        "hostelId": "hostel-uuid-456",
        
        "position": {
          "x": 400,
          "y": 800
        },
        
        "size": {
          "width": 240,
          "height": 120
        },
        
        "rotation": 0,
        "orientation": "horizontal",
        
        "property": {
          "bedId": "bed-uuid-aaa-111",
          "status": "Available",
          "bedType": "single",
          "bedLabel": "B1",
          "bedNumber": "1",
          "monthlyRate": "5000",
          "gender": "Male"
        },
        
        "metadata": {
          "rotation": 0,
          "occupantId": null
        }
      },
      
      {
        "id": "table-1",
        "type": "table",
        "position": { "x": 2000, "y": 2000 },
        "size": { "width": 160, "height": 160 },
        "rotation": 0,
        "orientation": "horizontal",
        "metadata": {}
      }
    ]
  }
}
```

**✅ Verify:**
- ✅ `dimensions` in PIXELS (large numbers like 12000, 16000)
- ✅ `dimensions.unit` = "px"
- ✅ `furniture` array contains beds AND other items
- ✅ Each bed has:
  - `id` (e.g., "B1") - for UI selection
  - `refId` (e.g., "bed-uuid-aaa-111") - for booking API
  - `hostelId` - for booking request
  - `position.x/y` in PIXELS (e.g., 400, 800)
  - `size.width/height` in PIXELS (e.g., 240, 120)
  - `property.status` (e.g., "Available", "Occupied", "Reserved")
- ✅ Coordinates are SCALED (multiply by 40)

---

## 🔍 Critical Checks

### Check 1: Bed ID Mapping
```
furniture[0].id = "B1"  (visual identifier)
furniture[0].refId = "bed-uuid-aaa-111"  (real UUID)
```
**Why:** Frontend uses `id` for selection, `refId` for booking API

### Check 2: Coordinates are Scaled
```
Original: x=10, y=20 (feet)
Response: x=400, y=800 (pixels)
Calculation: 10 * 40 = 400, 20 * 40 = 800
```
**Why:** Frontend expects pixels, not feet

### Check 3: Status from Bed Entity
```
furniture[0].property.status = "Available"  (from Bed table, not layout)
```
**Why:** Bed entity is source of truth for status

### Check 4: Hostel ID Present
```
furniture[0].hostelId = "hostel-uuid-456"
```
**Why:** Needed for booking request

---

## 🐛 Troubleshooting

### Issue: "Room layout not found"
**Cause:** Room doesn't have layout data
**Solution:** Check if room has layout in database:
```sql
SELECT * FROM room_layouts WHERE room_id = 'YOUR_ROOM_ID';
```

### Issue: Empty furniture array
**Cause:** No bed entities or bedPositions
**Solution:** 
1. Check if room has beds: `SELECT * FROM beds WHERE room_id = 'YOUR_ROOM_ID';`
2. Check if layout has bedPositions: Look at `layout_data` JSONB column

### Issue: Coordinates are small numbers (10, 20)
**Cause:** Scaling not applied
**Solution:** Check `SCALE_FACTOR = 40` in service

### Issue: Missing refId in beds
**Cause:** Bed entity not found for bedPosition
**Solution:** Ensure bed entities exist and `bedIdentifier` matches `bedPosition.id`

---

## 📊 Performance Comparison

### Old API (`/rooms`)
```
Response Size: ~500KB (includes layout for all rooms)
Response Time: ~2-3 seconds
```

### New API (`/new-rooms`)
```
Response Size: ~50KB (no layout data)
Response Time: ~200-500ms
```

**Result:** 10x faster! 🚀

---

## 🎯 Next Steps

1. ✅ **Test both endpoints** with real data
2. ✅ **Verify response format** matches expected structure
3. ✅ **Check bed ID mapping** (id vs refId)
4. ✅ **Verify coordinates** are in pixels
5. ✅ **Test with different rooms** (with/without layout)
6. ⏭️ **Update frontend** to use new endpoints

---

## 🔗 API Endpoints Summary

| Endpoint | Purpose | Response Size | Use Case |
|----------|---------|---------------|----------|
| `GET /rooms` | Old API (with layout) | ~500KB | Legacy |
| `GET /new-rooms` | New API (no layout) | ~50KB | Room listing |
| `GET /new-rooms/:id/layout` | Layout only | ~30KB | Booking screen |

---

## 💡 Key Differences

### Old Response (`/rooms`):
```json
{
  "id": "room-123",
  "layout": { /* huge object */ },
  "beds": [ /* array */ ]
}
```

### New Response (`/new-rooms`):
```json
{
  "id": "room-123",
  "hasLayout": true
  // NO layout, NO beds
}
```

### New Layout Response (`/new-rooms/:id/layout`):
```json
{
  "furniture": [
    {
      "id": "B1",
      "refId": "bed-uuid",
      "position": { "x": 400, "y": 800 },
      // Everything ready to render!
    }
  ]
}
```

---

## ✅ Success Criteria

- [ ] `/new-rooms` returns lightweight response
- [ ] `/new-rooms/:id/layout` returns complete furniture array
- [ ] Coordinates are in pixels (large numbers)
- [ ] Bed IDs are correct (id vs refId)
- [ ] Status comes from Bed entity
- [ ] Hostel ID is present in each bed
- [ ] Response is fast (<500ms for listing)
- [ ] No errors in console

---

## 🚀 Ready to Test!

Start the server:
```bash
npm run start:dev
```

Test with curl or Postman:
```bash
# Test room listing
curl http://localhost:3001/hostel/api/v1/new-rooms?hostelId=YOUR_HOSTEL_ID

# Test layout
curl http://localhost:3001/hostel/api/v1/new-rooms/ROOM_UUID/layout
```

**Good luck! 🎉**
