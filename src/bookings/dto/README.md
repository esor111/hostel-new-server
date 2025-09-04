# Multi-Guest Booking DTOs and Validation

This directory contains Data Transfer Objects (DTOs) and validation logic for the multi-guest booking system.

## Overview

The multi-guest booking system allows users to book multiple beds for different guests in a single booking request. The system includes comprehensive validation to ensure data integrity and business rule compliance.

## DTOs

### CreateMultiGuestBookingDto

Main DTO for creating multi-guest bookings.

```typescript
{
  contactPerson: ContactPersonDto,
  guests: GuestDto[],
  checkInDate?: string,
  duration?: string,
  notes?: string,
  emergencyContact?: string,
  source?: string
}
```

**Validation Rules:**
- `contactPerson`: Required, must be valid ContactPersonDto
- `guests`: Required array, minimum 1 guest, maximum 10 guests
- `checkInDate`: Optional, must be valid ISO date string
- `duration`: Optional, 1-50 characters
- `notes`: Optional, maximum 1000 characters
- `emergencyContact`: Optional, valid phone number format
- `source`: Optional, 1-50 characters

### ContactPersonDto

Contact person information for the booking.

```typescript
{
  name: string,
  phone: string,
  email: string
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters, trimmed
- `phone`: Required, 10-15 characters, valid phone format
- `email`: Required, valid email format, 5-100 characters, lowercase

### GuestDto

Individual guest information.

```typescript
{
  bedId: string,
  name: string,
  age: number,
  gender: GuestGender,
  idProofType?: string,
  idProofNumber?: string,
  emergencyContact?: string,
  notes?: string
}
```

**Validation Rules:**
- `bedId`: Required, must match format `bed\d+` (bed1, bed2, etc.)
- `name`: Required, 2-100 characters, trimmed
- `age`: Required, 1-120 years, converted to number
- `gender`: Required, must be Male, Female, or Other
- `idProofType`: Optional, 2-50 characters
- `idProofNumber`: Optional, 5-50 characters
- `emergencyContact`: Optional, valid phone format
- `notes`: Optional, maximum 500 characters

### QueryMultiGuestBookingDto

DTO for filtering and paginating booking queries.

```typescript
{
  status?: BookingStatus,
  contactName?: string,
  contactEmail?: string,
  contactPhone?: string,
  source?: string,
  minGuests?: number,
  maxGuests?: number,
  checkInDateFrom?: string,
  checkInDateTo?: string,
  page?: number,
  limit?: number,
  sortBy?: BookingSortBy,
  sortOrder?: SortOrder
}
```

### ConfirmBookingDto

DTO for confirming bookings.

```typescript
{
  processedBy?: string,
  notes?: string
}
```

### CancelBookingDto

DTO for cancelling bookings.

```typescript
{
  reason: string,
  processedBy?: string,
  notes?: string
}
```

## Enums

### GuestGender

```typescript
enum GuestGender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}
```

### BookingStatus

```typescript
enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PARTIALLY_CONFIRMED = 'Partially_Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed'
}
```

## Custom Validators

### @HasUniqueBedAssignments

Validates that each guest is assigned to a unique bed within the same booking.

```typescript
@HasUniqueBedAssignments({ message: 'Each guest must be assigned to a unique bed' })
guests: GuestDto[];
```

### @IsGenderCompatible

Validates that guest assignments are compatible with bed requirements (basic structure validation).

```typescript
@IsGenderCompatible({ message: 'Guest assignments must be compatible with bed requirements' })
guests: GuestDto[];
```

## Validation Service

The `BookingValidationService` provides comprehensive validation for booking requests:

### Key Methods

#### validateBookingRequest(guests: GuestDto[]): Promise<BedValidationResult>

Validates a complete booking request including:
- Duplicate bed assignment detection
- Bed ID format validation
- Bed existence verification
- Bed availability checking
- Gender compatibility validation

#### validateGuestData(guest: GuestDto, index: number): ValidationErrorDetail[]

Validates individual guest data structure.

#### createValidationException(result: BedValidationResult): BadRequestException

Creates a structured exception with detailed validation errors.

### Validation Result Structure

```typescript
interface BedValidationResult {
  isValid: boolean;
  errors: BedValidationError[];
  genderErrors: GenderCompatibilityError[];
  validationDetails: ValidationErrorDetail[];
}
```

## Error Handling

### Validation Error Response

```typescript
{
  status: 400,
  error: "Validation Error",
  message: "Request validation failed",
  details: [
    {
      field: "guests[0].bedId",
      code: "INVALID_BED_ID_FORMAT",
      message: "Bed ID must follow the format: bed1, bed2, bed3, etc.",
      value: "invalid-bed-id",
      context: { guestIndex: 0, bedId: "invalid-bed-id" }
    }
  ],
  timestamp: "2024-01-15T10:30:00.000Z",
  path: "/booking-requests/multi-guest"
}
```

### Error Codes

- `DUPLICATE_BED_ASSIGNMENT`: Same bed assigned to multiple guests
- `INVALID_BED_ID_FORMAT`: Bed ID doesn't match required format
- `BED_NOT_FOUND`: Bed doesn't exist in database
- `BED_NOT_AVAILABLE`: Bed is occupied, reserved, or under maintenance
- `GENDER_INCOMPATIBILITY`: Guest gender doesn't match bed requirements
- `INVALID_NAME_LENGTH`: Name too short or too long
- `INVALID_AGE_RANGE`: Age outside valid range
- `INVALID_GENDER`: Gender not in allowed enum values

## Usage Examples

### Creating a Valid Booking Request

```typescript
const bookingRequest: CreateMultiGuestBookingDto = {
  contactPerson: {
    name: "John Doe",
    phone: "+1234567890",
    email: "john.doe@example.com"
  },
  guests: [
    {
      bedId: "bed1",
      name: "Alice Smith",
      age: 25,
      gender: GuestGender.FEMALE
    },
    {
      bedId: "bed2",
      name: "Bob Johnson",
      age: 30,
      gender: GuestGender.MALE
    }
  ],
  checkInDate: "2024-01-15",
  duration: "1 month",
  notes: "Group booking for conference attendees",
  source: "mobile_app"
};
```

### Handling Validation Errors

```typescript
try {
  const booking = await bookingService.createMultiGuestBooking(dto);
  return booking;
} catch (error) {
  if (error instanceof BadRequestException) {
    const response = error.getResponse();
    // Handle validation errors
    console.log('Validation errors:', response.details);
  }
  throw error;
}
```

## Testing

All DTOs and validators include comprehensive test coverage:

- `multi-guest-booking.dto.spec.ts`: Tests for DTO validation
- `booking-validation.service.spec.ts`: Tests for validation service

Run tests with:
```bash
npm test -- --testPathPattern=multi-guest-booking.dto.spec.ts
npm test -- --testPathPattern=booking-validation.service.spec.ts
```

## Integration

The DTOs are used by:
- Multi-guest booking controller endpoints
- Multi-guest booking service for business logic
- Validation service for comprehensive validation
- API documentation (Swagger) for endpoint specifications

## Future Enhancements

Potential improvements:
- Real-time bed availability validation
- Advanced gender compatibility rules
- Booking conflict resolution
- Automated bed assignment suggestions
- Integration with payment validation
- Multi-language error messages