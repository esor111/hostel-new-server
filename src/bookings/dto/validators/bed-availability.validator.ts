import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'bedAvailability', async: false })
@Injectable()
export class BedAvailabilityConstraint implements ValidatorConstraintInterface {
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

    // Validate each bed ID format
    for (const bedId of bedIds) {
      if (!/^bed\d+$/.test(bedId)) {
        return false; // Invalid bed ID format
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Duplicate bed assignments detected or invalid bed ID format. Each guest must be assigned to a unique bed with format: bed1, bed2, etc.';
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