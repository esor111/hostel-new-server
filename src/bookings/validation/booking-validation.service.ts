import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Bed, BedStatus } from '../../rooms/entities/bed.entity';
import { Room } from '../../rooms/entities/room.entity';
import { BookingGuest } from '../entities/booking-guest.entity';
import { Student } from '../../students/entities/student.entity';

export interface BedValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validBeds: string[];
  invalidBeds: string[];
}

export interface RoomValidationResult {
  isValid: boolean;
  roomUuid: string | null;
  error?: string;
}

@Injectable()
export class BookingValidationService {
  private readonly logger = new Logger(BookingValidationService.name);

  constructor(
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(BookingGuest)
    private bookingGuestRepository: Repository<BookingGuest>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) { }

  /**
   * Validate bed IDs for booking
   */
  async validateBedIds(bedIds: string[]): Promise<BedValidationResult> {
    const result: BedValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validBeds: [],
      invalidBeds: []
    };

    if (!bedIds || bedIds.length === 0) {
      result.isValid = false;
      result.errors.push('No bed IDs provided');
      return result;
    }

    // Check for duplicates
    const uniqueBedIds = new Set(bedIds);
    if (uniqueBedIds.size !== bedIds.length) {
      result.isValid = false;
      result.errors.push('Duplicate bed IDs found in booking');
    }

    // Validate bed ID format as UUID
    const invalidFormatBeds = bedIds.filter(bedId => !this.isValidBedIdFormat(bedId));
    if (invalidFormatBeds.length > 0) {
      result.isValid = false;
      result.errors.push(`Invalid bed ID format: ${invalidFormatBeds.join(', ')}. Bed IDs must be valid UUIDs.`);
      result.invalidBeds.push(...invalidFormatBeds);
    }

    // Check if beds exist and are available
    try {
      const beds = await this.bedRepository.find({
        where: bedIds.map(bedId => ({ id: bedId })),
        relations: ['room']
      });

      const foundBedIds = beds.map(bed => bed.id);
      const missingBeds = bedIds.filter(bedId => !foundBedIds.includes(bedId));

      if (missingBeds.length > 0) {
        result.isValid = false;
        result.errors.push(`Beds not found: ${missingBeds.join(', ')}`);
        result.invalidBeds.push(...missingBeds);
      }

      // Check bed availability
      const unavailableBeds = beds.filter(bed => bed.status !== BedStatus.AVAILABLE);
      if (unavailableBeds.length > 0) {
        result.isValid = false;
        const bedStatusInfo = unavailableBeds.map(bed => `${bed.id} (${bed.status})`);
        result.errors.push(`Beds not available: ${bedStatusInfo.join(', ')}`);
        result.invalidBeds.push(...unavailableBeds.map(bed => bed.id));
      }

      // Track valid beds
      const availableBeds = beds.filter(bed => bed.status === BedStatus.AVAILABLE);
      result.validBeds = availableBeds.map(bed => bed.id);

    } catch (error) {
      this.logger.error(`Error validating beds: ${error.message}`);
      result.isValid = false;
      result.errors.push(`Database error while validating beds: ${error.message}`);
    }

    return result;
  }

  /**
   * Gender validation removed - any guest can book any bed
   * This method is kept for backward compatibility but always returns valid
   */
  async validateGenderCompatibility(guestAssignments: { bedId: string; gender: string }[]): Promise<BedValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      validBeds: guestAssignments.map(a => a.bedId),
      invalidBeds: []
    };
  }

  /**
   * Validate room number and convert to UUID
   */
  async validateAndConvertRoomNumber(roomNumber: string): Promise<RoomValidationResult> {
    if (!roomNumber) {
      return {
        isValid: false,
        roomUuid: null,
        error: 'Room number is required'
      };
    }

    try {
      const room = await this.roomRepository.findOne({
        where: { roomNumber: roomNumber }
      });

      if (!room) {
        return {
          isValid: false,
          roomUuid: null,
          error: `Room not found: ${roomNumber}`
        };
      }

      return {
        isValid: true,
        roomUuid: room.id
      };
    } catch (error) {
      this.logger.error(`Error validating room number ${roomNumber}: ${error.message}`);
      return {
        isValid: false,
        roomUuid: null,
        error: `Database error while validating room: ${error.message}`
      };
    }
  }

  /**
   * Validate bed ID format as UUID
   */
  private isValidBedIdFormat(bedId: string): boolean {
    // Accept auto-assign for single guest bookings
    if (bedId === 'auto-assign') {
      return true;
    }

    // Check if it's a valid UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(bedId);
  }

  /**
   * Validate booking data completeness
   */
  validateBookingData(bookingData: any): BedValidationResult {
    const result: BedValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validBeds: [],
      invalidBeds: []
    };

    // Validate contact person
    if (!bookingData.contactPerson) {
      result.isValid = false;
      result.errors.push('Contact person information is required');
    } else {
      if (!bookingData.contactPerson.name) {
        result.isValid = false;
        result.errors.push('Contact person name is required');
      }
      if (!bookingData.contactPerson.phone) {
        result.isValid = false;
        result.errors.push('Contact person phone is required');
      }
      if (!bookingData.contactPerson.email) {
        result.isValid = false;
        result.errors.push('Contact person email is required');
      }
    }

    // Validate guests
    if (!bookingData.guests || bookingData.guests.length === 0) {
      result.isValid = false;
      result.errors.push('At least one guest is required');
    } else {
      bookingData.guests.forEach((guest: any, index: number) => {
        if (!guest.name) {
          result.isValid = false;
          result.errors.push(`Guest ${index + 1}: Name is required`);
        }
        if (!guest.bedId) {
          result.isValid = false;
          result.errors.push(`Guest ${index + 1}: Bed ID is required`);
        }
        if (!guest.gender) {
          result.isValid = false;
          result.errors.push(`Guest ${index + 1}: Gender is required`);
        }
        if (!guest.age || guest.age < 1 || guest.age > 120) {
          result.isValid = false;
          result.errors.push(`Guest ${index + 1}: Valid age is required (1-120)`);
        }
        // Validate guest contact information (phone is required, email is optional)
        if (!guest.phone) {
          result.isValid = false;
          result.errors.push(`Guest ${index + 1}: Phone number is required`);
        }
        // Email is optional - will fallback to contact person email if not provided
      });
    }

    return result;
  }

  /**
   * Create comprehensive validation error message
   */
  createValidationErrorMessage(results: BedValidationResult[]): string {
    const allErrors = results.flatMap(result => result.errors);
    const allWarnings = results.flatMap(result => result.warnings);

    let message = 'Booking validation failed:\n';

    if (allErrors.length > 0) {
      message += 'Errors:\n' + allErrors.map(error => `  - ${error}`).join('\n');
    }

    if (allWarnings.length > 0) {
      message += '\nWarnings:\n' + allWarnings.map(warning => `  - ${warning}`).join('\n');
    }

    return message;
  }

  /**
   * Validate guest contact uniqueness
   * Check ONLY phone (not email, since students share parent email)
   */
  async validateGuestContactUniqueness(guests: Array<{ phone: string; email: string }>): Promise<BedValidationResult> {
    const result: BedValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validBeds: [],
      invalidBeds: []
    };

    for (const guest of guests) {
      // Skip email check - multiple students can have same contact person email
      
      // Check if phone already exists in students table (exclude soft-deleted students)
      // Note: TypeORM's @DeleteDateColumn auto-excludes soft-deleted, but we're explicit here
      const existingStudentByPhone = await this.studentRepository.findOne({
        where: { phone: guest.phone, deletedAt: IsNull() }
      });

      if (existingStudentByPhone) {
        result.isValid = false;
        result.errors.push(`Phone ${guest.phone} is already registered to another student`);
      }

      // Skip email check for pending booking guests
      
      // Check if phone exists in pending booking guests
      const existingGuestByPhone = await this.bookingGuestRepository.findOne({
        where: { phone: guest.phone }
      });

      if (existingGuestByPhone) {
        result.warnings.push(`Phone ${guest.phone} is already used in another pending booking`);
      }
    }

    // Check for duplicate PHONES within the current booking (skip emails)
    const phones = guests.map(g => g.phone);

    const duplicatePhones = phones.filter((phone, index) => phones.indexOf(phone) !== index);
    if (duplicatePhones.length > 0) {
      result.isValid = false;
      result.errors.push(`Duplicate phone numbers in booking: ${[...new Set(duplicatePhones)].join(', ')}`);
    }

    return result;
  }
}