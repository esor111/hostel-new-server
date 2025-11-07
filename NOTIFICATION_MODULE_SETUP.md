# 🔔 Notification Module Setup Guide

## ✅ What We Created

A new **Notification Module** in the Hostel Backend to communicate with the Express Notification Server.

### **Files Created:**
```
src/notification/
├── notification.module.ts           ✅ Module definition
├── notification.service.ts          ✅ HTTP service to call Express server
├── notification.controller.ts       ✅ API endpoint for admin
└── dto/
    └── send-to-students.dto.ts      ✅ Request validation
```

---

## 🎯 What It Does

### **Endpoint:**
```
POST /notification/send-to-students
```

### **Purpose:**
Admin can send custom notifications to multiple students.

### **Request:**
```json
{
  "studentIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ],
  "title": "Important Notice",
  "message": "Hostel will be closed on 25th December for maintenance",
  "imageUrl": ""  // Optional
}
```

### **Response:**
```json
{
  "success": true,
  "sent": 5,
  "failed": 0,
  "skipped": 1,
  "details": {
    "sentTo": [
      { "studentId": "student_123", "userId": "user_abc", "name": "John Doe" }
    ],
    "skipped": [
      { "studentId": "student_789", "name": "Bob", "reason": "No userId" }
    ]
  }
}
```

---

## 🔧 Setup Instructions

### **Step 1: Add Environment Variable**

Add to your `.env` file:
```env
NOTIFICATION_SERVER_URL=http://localhost:3007
```

### **Step 2: Install Dependencies (if needed)**

The module uses `@nestjs/axios` which should already be installed. If not:
```bash
npm install @nestjs/axios axios
```

### **Step 3: Start the Express Notification Server**

```bash
cd d:\shared-code\code\notifications-projects\notification-express-server
npm install
npm start
```

Server should start on port 3007.

### **Step 4: Start the Hostel Backend**

```bash
cd d:\shared-code\code\oh-hostel\hostel-new-server
npm run start:dev
```

---

## 🧪 Testing

### **Test with cURL:**

```bash
curl -X POST http://localhost:3001/notification/send-to-students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "studentIds": ["student-uuid-1", "student-uuid-2"],
    "title": "Test Notification",
    "message": "This is a test message"
  }'
```

### **Test with Postman:**

1. **Method:** POST
2. **URL:** `http://localhost:3001/notification/send-to-students`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_JWT_TOKEN`
4. **Body (JSON):**
```json
{
  "studentIds": ["student-uuid-1", "student-uuid-2"],
  "title": "Test Notification",
  "message": "This is a test message"
}
```

### **Test from Frontend:**

Update `notificationApiService.ts`:
```typescript
async sendToStudents(studentIds: string[], title: string, message: string) {
  const response = await axios.post(
    'http://localhost:3001/notification/send-to-students',
    { studentIds, title, message },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
```

---

## 📊 Flow Diagram

```
Frontend (Admin Panel)
    ↓
    POST /notification/send-to-students
    Body: { studentIds, title, message }
    ↓
Hostel Backend (NestJS) - NotificationController
    ↓
NotificationService
    ↓
    HTTP POST to Express Server
    ↓
Express Notification Server (Port 3007)
    ↓
    1. Query Hostel Backend for userIds
    2. Query Old Server for FCM tokens
    3. Send to Firebase
    ↓
Firebase → Student Mobile Apps
```

---

## 🔍 Troubleshooting

### **Error: "Notification server is not available"**
- ✅ Make sure Express server is running on port 3007
- ✅ Check `NOTIFICATION_SERVER_URL` in `.env`

### **Error: "Cannot find module '@nestjs/axios'"**
```bash
npm install @nestjs/axios axios
```

### **Error: "Unauthorized"**
- ✅ Make sure you're sending valid JWT token
- ✅ Check `HostelAuthWithContextGuard` is working

### **No notifications received on mobile**
- ✅ Check Express server logs
- ✅ Verify students have `userId` in database
- ✅ Verify users have FCM tokens registered

---

## 🚀 Next Steps

Once this works, we can add more notification methods:

1. ✅ `notifyPaymentReceived(studentId, amount)`
2. ✅ `notifyInvoiceGenerated(studentId, invoiceNumber)`
3. ✅ `notifyStudentEnrollment(studentId)`
4. ✅ `notifyMaintenanceCompleted(studentId, requestId)`
5. ✅ And more...

---

## 📝 Notes

- Module is already registered in `app.module.ts`
- Service is exported so other modules can inject it
- Controller uses `HostelAuthWithContextGuard` for security
- All requests are validated with DTOs

**Ready to test!** 🎉
