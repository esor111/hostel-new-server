# Checkout Error Handling Guide

## Improved Error Messages

The checkout process now provides user-friendly error messages that can be displayed in proper popup/alert dialogs.

## Error Response Format

When checkout fails, you'll now receive structured error responses:

```json
{
  "message": "Invalid checkout date. The checkout date (November 13, 2025) must be after the student's enrollment date (December 1, 2025). Please select a valid checkout date.",
  "error": "Checkout Failed",
  "statusCode": 400,
  "code": "INVALID_CHECKOUT_DATE",
  "details": {
    "enrollmentDate": "December 1, 2025",
    "checkoutDate": "November 13, 2025",
    "studentName": "Narayan Chhetri"
  }
}
```

## Error Types

### 1. Invalid Checkout Date
- **Code**: `INVALID_CHECKOUT_DATE`
- **Message**: Shows formatted dates and clear instructions
- **Solution**: Select a checkout date after the enrollment date

### 2. Missing Enrollment Date
- **Code**: `MISSING_ENROLLMENT_DATE`
- **Message**: Instructs to contact admin
- **Solution**: Admin needs to update student enrollment date

### 3. Student Not Found
- **Code**: `STUDENT_NOT_FOUND`
- **Message**: Clear verification instructions
- **Solution**: Verify student ID and hostel context

## Frontend Implementation Example

```javascript
// Example of how to handle these errors in your frontend
async function processCheckout(studentId, checkoutData) {
  try {
    const response = await fetch(`/api/students/${studentId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Show user-friendly popup message
      showErrorPopup({
        title: 'Checkout Failed',
        message: error.message,
        type: 'error',
        details: error.details
      });
      
      return;
    }
    
    const result = await response.json();
    showSuccessPopup('Checkout completed successfully!');
    
  } catch (error) {
    showErrorPopup({
      title: 'System Error',
      message: 'An unexpected error occurred. Please try again.',
      type: 'error'
    });
  }
}

// Example popup function
function showErrorPopup({ title, message, details }) {
  // Use your preferred UI library (SweetAlert, Modal, etc.)
  alert(`${title}\n\n${message}`);
  
  // Or with more details:
  if (details) {
    console.log('Error details:', details);
  }
}
```

## Benefits

1. **User-Friendly Messages**: Clear, actionable error messages
2. **Formatted Dates**: Human-readable date formats
3. **Structured Data**: Additional details for debugging
4. **Error Codes**: Programmatic error handling
5. **Proper Popups**: Easy to display in UI dialogs

## Before vs After

**Before:**
```json
{
  "message": "Failed to calculate settlement: Checkout date must be after enrollment date",
  "error": "Bad Request",
  "statusCode": 400
}
```

**After:**
```json
{
  "message": "Invalid checkout date. The checkout date (November 13, 2025) must be after the student's enrollment date (December 1, 2025). Please select a valid checkout date.",
  "error": "Checkout Failed",
  "statusCode": 400,
  "code": "INVALID_CHECKOUT_DATE",
  "details": {
    "enrollmentDate": "December 1, 2025",
    "checkoutDate": "November 13, 2025",
    "studentName": "Narayan Chhetri"
  }
}
```
