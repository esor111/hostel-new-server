import { IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SeedCustomDataDto {
  @ApiProperty({ 
    description: 'Custom data to seed into the database, organized by entity type',
    example: {
      "students": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        }
      ],
      "rooms": [
        {
          "roomNumber": "101",
          "type": "Single",
          "capacity": 1
        }
      ]
    },
    additionalProperties: true
  })
  @IsObject()
  students?: any[];

  @ApiProperty({ 
    description: 'Room data to seed',
    required: false
  })
  @IsObject()
  rooms?: any[];

  @ApiProperty({ 
    description: 'Invoice data to seed',
    required: false
  })
  @IsObject()
  invoices?: any[];

  @ApiProperty({ 
    description: 'Payment data to seed',
    required: false
  })
  @IsObject()
  payments?: any[];
}