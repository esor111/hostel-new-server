import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  isUUID,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'genderCompatibility', async: true })
@Injectable()
export class GenderCompatibilityConstraint implements ValidatorConstraintInterface {
  
  /**
   * Validate bed ID is a valid UUID
   */
  private isValidBedId(bedId: string): boolean {
    // Accept auto-assign for single guest bookings
    if (bedId === 'auto-assign') {
      return true;
    }
    
    // Validate as UUID
    return isUUID(bedId, 4);
  }
  
  async validate(guests: any[], args: ValidationArguments): Promise<boolean> {
    if (!Array.isArray(guests) || guests.length === 0) {
      return true; // Let other validators handle array validation
    }

    // Check for duplicate bed assignments
    const bedIds = guests.map(guest => guest.bedId).filter(Boolean);
    const uniqueBedIds = new Set(bedIds);
    
    if (bedIds.length !== uniqueBedIds.size) {
      return false; // Duplicate bed assignments
    }

    // For now, we'll implement basic validation
    // Gender compatibility with actual bed data will be handled in the service layer
    // This validator ensures the data structure is correct
    
    for (const guest of guests) {
      if (!guest.bedId || !guest.gender || !guest.name || !guest.age) {
        return false;
      }
      
      // Validate bed ID as UUID
      if (!this.isValidBedId(guest.bedId)) {
        return false;
      }
      
      // Validate gender enum
      if (!['Male', 'Female', 'Other'].includes(guest.gender)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Guest assignments are invalid. Check for duplicate bed assignments, invalid bed UUIDs, or missing required fields.';
  }
}

export function IsGenderCompatible(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: GenderCompatibilityConstraint,
    });
  };
}