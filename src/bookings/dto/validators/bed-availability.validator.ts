import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  isUUID,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'bedAvailability', async: false })
@Injectable()
export class BedAvailabilityConstraint implements ValidatorConstraintInterface {
  
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
  
  validate(guests: any[], args: ValidationArguments): boolean {
    if (!Array.isArray(guests) || guests.length === 0) {
      return true; // Let other validators handle array validation
    }

    // Check for duplicate bed assignments within the same booking
    const bedIds = guests.map(guest => guest.bedId).filter(Boolean);
    const uniqueBedIds = new Set(bedIds);
    
    if (bedIds.length !== uniqueBedIds.size) {
      return false; // Duplicate bed assignments not allowed
    }

    // Validate each bed ID as UUID
    for (const bedId of bedIds) {
      if (!this.isValidBedId(bedId)) {
        return false; // Invalid bed ID format
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Duplicate bed assignments detected or invalid bed UUID. Each guest must be assigned to a unique bed with valid UUID.';
  }
}

export function HasUniqueBedAssignments(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: BedAvailabilityConstraint,
    });
  };
}