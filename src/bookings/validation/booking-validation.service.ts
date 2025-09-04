import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bed, BedStatus } from '../../rooms/entities/bed.entity';
import { GuestDto, GuestGender } from '../dto/multi-guest-booking.dto';
import { 
  BedValidationError, 
  GenderCompatibilityError, 
  ValidationErrorDetail 
} from '../dto/validation-error.dto';

export interface BedValidationResult {
  isValid: boolean;
  errors: BedValidationError[];
  genderErrors: GenderCompatibilityError[];
  validationDetails: ValidationErrorDetail[];
}

@Injectable()
export class BookingValidationService {
  constructor(
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
  ) {}

  /**
   * Validates bed availability and guest compatibility for a multi-guest booking
   */
  async validateBookingRequest(guests: GuestDto[]): Promise<BedValidationResult> {
    const result: BedValidationResult = {
      isValid: true,
      errors: [],
      genderErrors: [],
      validationDetails: []
    };

    // Check for duplicate bed assignments
    const bedIds = guests.map(guest => guest.bedId);
    const duplicateBeds = this.findDuplicates(bedIds);
    
    if (duplicateBeds.length > 0) {
      result.isValid = false;
      duplicateBeds.forEach(bedId => {
        result.errors.push({
          bedId,
          reason: 'Duplicate bed assignment within the same booking',
          code: 'DUPLICATE_BED_ASSIGNMENT'
        });
        
        result.validationDetails.push({
          field: 'guests',
          code: 'DUPLICATE_BED_ASSIGNMENT',
          message: `Bed ${bedId} is assigned to multiple guests in the same booking`,
          value: bedId,
          context: { bedId, duplicateCount: bedIds.filter(id => id === bedId).length }
        });
      });
    }

    // Validate bed ID formats
    const invalidBedIds = bedIds.filter(bedId => !/^bed\d+$/.test(bedId));
    if (invalidBedIds.length > 0) {
      result.isValid = false;
      invalidBedIds.forEach(bedId => {
        result.errors.push({
          bedId,
          reason: 'Invalid bed ID format',
          code: 'INVALID_BED_ID_FORMAT'
        });
        
        result.validationDetails.push({
          field: 'guests',
          code: 'INVALID_BED_ID_FORMAT',
          message: `Bed ID ${bedId} must follow the format: bed1, bed2, bed3, etc.`,
          value: bedId,
          context: { bedId, expectedFormat: 'bed{number}' }
        });
      });
    }

    // If basic validation fails, return early
    if (!result.isValid) {
      return result;
    }

    // Fetch bed information from database
    const beds = await this.bedRepository.find({
      where: bedIds.map(bedId => ({ bedIdentifier: bedId })),
      relations: ['room']
    });

    // Check if all beds exist
    const foundBedIds = beds.map(bed => bed.bedIdentifier);
    const missingBeds = bedIds.filter(bedId => !foundBedIds.includes(bedId));
    
    if (missingBeds.length > 0) {
      result.isValid = false;
      missingBeds.forEach(bedId => {
        result.errors.push({
          bedId,
          reason: 'Bed not found',
          code: 'BED_NOT_FOUND'
        });
        
        result.validationDetails.push({
          field: 'guests',
          code: 'BED_NOT_FOUND',
          message: `Bed ${bedId} does not exist`,
          value: bedId,
          context: { bedId }
        });
      });
    }

    // Check bed availability
    const unavailableBeds = beds.filter(bed => bed.status !== BedStatus.AVAILABLE);
    if (unavailableBeds.length > 0) {
      result.isValid = false;
      unavailableBeds.forEach(bed => {
        result.errors.push({
          bedId: bed.bedIdentifier,
          reason: `Bed is currently ${bed.status.toLowerCase()}`,
          code: 'BED_NOT_AVAILABLE',
          currentStatus: bed.status,
          currentOccupant: bed.currentOccupantName
        });
        
        result.validationDetails.push({
          field: 'guests',
          code: 'BED_NOT_AVAILABLE',
          message: `Bed ${bed.bedIdentifier} is currently ${bed.status.toLowerCase()}`,
          value: bed.bedIdentifier,
          context: { 
            bedId: bed.bedIdentifier, 
            currentStatus: bed.status,
            currentOccupant: bed.currentOccupantName,
            roomNumber: bed.room?.roomNumber
          }
        });
      });
    }

    // Check gender compatibility
    const genderIncompatibilities = this.checkGenderCompatibility(guests, beds);
    if (genderIncompatibilities.length > 0) {
      result.isValid = false;
      result.genderErrors = genderIncompatibilities;
      
      genderIncompatibilities.forEach(error => {
        result.validationDetails.push({
          field: 'guests',
          code: 'GENDER_INCOMPATIBILITY',
          message: error.message,
          value: error.bedId,
          context: {
            bedId: error.bedId,
            requiredGender: error.requiredGender,
            guestGender: error.guestGender,
            guestName: error.guestName
          }
        });
      });
    }

    return result;
  }

  /**
   * Validates individual guest data
   */
  validateGuestData(guest: GuestDto, index: number): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // Validate bed ID format
    if (!/^bed\d+$/.test(guest.bedId)) {
      errors.push({
        field: `guests[${index}].bedId`,
        code: 'INVALID_BED_ID_FORMAT',
        message: 'Bed ID must follow the format: bed1, bed2, bed3, etc.',
        value: guest.bedId,
        context: { guestIndex: index, bedId: guest.bedId }
      });
    }

    // Validate name length
    if (!guest.name || guest.name.trim().length < 2) {
      errors.push({
        field: `guests[${index}].name`,
        code: 'INVALID_NAME_LENGTH',
        message: 'Guest name must be at least 2 characters long',
        value: guest.name,
        context: { guestIndex: index }
      });
    }

    // Validate age range
    if (!guest.age || guest.age < 1 || guest.age > 120) {
      errors.push({
        field: `guests[${index}].age`,
        code: 'INVALID_AGE_RANGE',
        message: 'Guest age must be between 1 and 120 years',
        value: guest.age,
        context: { guestIndex: index }
      });
    }

    // Validate gender enum
    if (!Object.values(GuestGender).includes(guest.gender)) {
      errors.push({
        field: `guests[${index}].gender`,
        code: 'INVALID_GENDER',
        message: 'Gender must be one of: Male, Female, Other',
        value: guest.gender,
        context: { guestIndex: index, validGenders: Object.values(GuestGender) }
      });
    }

    return errors;
  }

  /**
   * Checks gender compatibility between guests and beds
   */
  private checkGenderCompatibility(guests: GuestDto[], beds: Bed[]): GenderCompatibilityError[] {
    const errors: GenderCompatibilityError[] = [];
    
    for (const guest of guests) {
      const bed = beds.find(b => b.bedIdentifier === guest.bedId);
      if (!bed) continue; // Bed not found error handled elsewhere
      
      // Skip compatibility check if bed accepts any gender
      if (bed.gender === 'Any') continue;
      
      // Check if guest gender matches bed requirement
      const guestGenderValue = this.mapGuestGenderToBedGender(guest.gender);
      if (bed.gender !== guestGenderValue) {
        errors.push({
          bedId: guest.bedId,
          requiredGender: bed.gender,
          guestGender: guestGenderValue,
          guestName: guest.name,
          message: `Guest gender ${guestGenderValue} is not compatible with bed requirement ${bed.gender}`
        });
      }
    }
    
    return errors;
  }

  /**
   * Maps GuestGender enum to bed gender string
   */
  private mapGuestGenderToBedGender(guestGender: GuestGender): string {
    switch (guestGender) {
      case GuestGender.MALE:
        return 'Male';
      case GuestGender.FEMALE:
        return 'Female';
      case GuestGender.OTHER:
        return 'Other';
      default:
        return 'Other';
    }
  }

  /**
   * Finds duplicate values in an array
   */
  private findDuplicates<T>(array: T[]): T[] {
    const seen = new Set<T>();
    const duplicates = new Set<T>();
    
    for (const item of array) {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    }
    
    return Array.from(duplicates);
  }

  /**
   * Creates a BadRequestException with detailed validation errors
   */
  createValidationException(result: BedValidationResult): BadRequestException {
    const errorMessage = 'Booking validation failed';
    
    return new BadRequestException({
      status: 400,
      error: 'Validation Error',
      message: errorMessage,
      details: result.validationDetails,
      timestamp: new Date().toISOString(),
      bedErrors: result.errors,
      genderErrors: result.genderErrors
    });
  }
}