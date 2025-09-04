import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDetail {
  @ApiProperty({ 
    description: 'Field that failed validation',
    example: 'guests[0].bedId'
  })
  field: string;

  @ApiProperty({ 
    description: 'Validation error code',
    example: 'INVALID_BED_ID_FORMAT'
  })
  code: string;

  @ApiProperty({ 
    description: 'Human-readable error message',
    example: 'Bed ID must follow the format: bed1, bed2, bed3, etc.'
  })
  message: string;

  @ApiProperty({ 
    description: 'The value that failed validation',
    example: 'invalid-bed-id'
  })
  value?: any;

  @ApiProperty({ 
    description: 'Additional context for the error',
    example: { bedId: 'invalid-bed-id', guestIndex: 0 }
  })
  context?: Record<string, any>;
}

export class ValidationErrorResponse {
  @ApiProperty({ 
    description: 'HTTP status code',
    example: 400
  })
  status: number;

  @ApiProperty({ 
    description: 'Error type',
    example: 'Validation Error'
  })
  error: string;

  @ApiProperty({ 
    description: 'General error message',
    example: 'Request validation failed'
  })
  message: string;

  @ApiProperty({ 
    description: 'Detailed validation errors',
    type: [ValidationErrorDetail]
  })
  details: ValidationErrorDetail[];

  @ApiProperty({ 
    description: 'Timestamp of the error',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({ 
    description: 'Request path that caused the error',
    example: '/booking-requests/multi-guest'
  })
  path: string;
}

export class BedValidationError {
  @ApiProperty({ 
    description: 'Bed identifier that failed validation',
    example: 'bed1'
  })
  bedId: string;

  @ApiProperty({ 
    description: 'Reason for validation failure',
    example: 'Bed is already occupied'
  })
  reason: string;

  @ApiProperty({ 
    description: 'Error code for programmatic handling',
    example: 'BED_ALREADY_OCCUPIED'
  })
  code: string;

  @ApiProperty({ 
    description: 'Current bed status',
    example: 'Occupied'
  })
  currentStatus?: string;

  @ApiProperty({ 
    description: 'Current occupant information if available',
    example: 'John Doe'
  })
  currentOccupant?: string;
}

export class GenderCompatibilityError {
  @ApiProperty({ 
    description: 'Bed identifier with gender compatibility issue',
    example: 'bed1'
  })
  bedId: string;

  @ApiProperty({ 
    description: 'Required gender for the bed',
    example: 'Female'
  })
  requiredGender: string;

  @ApiProperty({ 
    description: 'Guest gender that conflicts',
    example: 'Male'
  })
  guestGender: string;

  @ApiProperty({ 
    description: 'Guest name for reference',
    example: 'John Doe'
  })
  guestName: string;

  @ApiProperty({ 
    description: 'Error message',
    example: 'Guest gender Male is not compatible with bed requirement Female'
  })
  message: string;
}