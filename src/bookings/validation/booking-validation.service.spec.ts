import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingValidationService } from './booking-validation.service';
import { Bed, BedStatus } from '../../rooms/entities/bed.entity';
import { GuestDto, GuestGender } from '../dto/multi-guest-booking.dto';

describe('BookingValidationService', () => {
  let service: BookingValidationService;
  let bedRepository: Repository<Bed>;

  const mockBedRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingValidationService,
        {
          provide: getRepositoryToken(Bed),
          useValue: mockBedRepository,
        },
      ],
    }).compile();

    service = module.get<BookingValidationService>(BookingValidationService);
    bedRepository = module.get<Repository<Bed>>(getRepositoryToken(Bed));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBookingRequest', () => {
    it('should validate a valid booking request', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'bed1',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        },
        {
          bedId: 'bed2',
          name: 'Bob Johnson',
          age: 30,
          gender: GuestGender.MALE
        }
      ];

      const mockBeds = [
        {
          id: '1',
          bedIdentifier: 'bed1',
          status: BedStatus.AVAILABLE,
          gender: 'Female',
          room: { roomNumber: 'R101' }
        },
        {
          id: '2',
          bedIdentifier: 'bed2',
          status: BedStatus.AVAILABLE,
          gender: 'Male',
          room: { roomNumber: 'R102' }
        }
      ];

      mockBedRepository.find.mockResolvedValue(mockBeds);

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.genderErrors).toHaveLength(0);
      expect(result.validationDetails).toHaveLength(0);
    });

    it('should detect duplicate bed assignments', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'bed1',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        },
        {
          bedId: 'bed1', // Duplicate
          name: 'Bob Johnson',
          age: 30,
          gender: GuestGender.MALE
        }
      ];

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DUPLICATE_BED_ASSIGNMENT');
      expect(result.errors[0].bedId).toBe('bed1');
    });

    it('should detect invalid bed ID formats', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'invalid-bed-id',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        }
      ];

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_BED_ID_FORMAT');
      expect(result.errors[0].bedId).toBe('invalid-bed-id');
    });

    it('should detect missing beds', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'bed1',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        },
        {
          bedId: 'bed2',
          name: 'Bob Johnson',
          age: 30,
          gender: GuestGender.MALE
        }
      ];

      // Only return bed1, bed2 is missing
      const mockBeds = [
        {
          id: '1',
          bedIdentifier: 'bed1',
          status: BedStatus.AVAILABLE,
          gender: 'Female',
          room: { roomNumber: 'R101' }
        }
      ];

      mockBedRepository.find.mockResolvedValue(mockBeds);

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('BED_NOT_FOUND');
      expect(result.errors[0].bedId).toBe('bed2');
    });

    it('should detect unavailable beds', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'bed1',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        }
      ];

      const mockBeds = [
        {
          id: '1',
          bedIdentifier: 'bed1',
          status: BedStatus.OCCUPIED,
          gender: 'Female',
          currentOccupantName: 'John Doe',
          room: { roomNumber: 'R101' }
        }
      ];

      mockBedRepository.find.mockResolvedValue(mockBeds);

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('BED_NOT_AVAILABLE');
      expect(result.errors[0].bedId).toBe('bed1');
      expect(result.errors[0].currentStatus).toBe(BedStatus.OCCUPIED);
      expect(result.errors[0].currentOccupant).toBe('John Doe');
    });

    it('should detect gender incompatibility', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'bed1',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        }
      ];

      const mockBeds = [
        {
          id: '1',
          bedIdentifier: 'bed1',
          status: BedStatus.AVAILABLE,
          gender: 'Male', // Female guest trying to book Male bed
          room: { roomNumber: 'R101' }
        }
      ];

      mockBedRepository.find.mockResolvedValue(mockBeds);

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(false);
      expect(result.genderErrors).toHaveLength(1);
      expect(result.genderErrors[0].bedId).toBe('bed1');
      expect(result.genderErrors[0].requiredGender).toBe('Male');
      expect(result.genderErrors[0].guestGender).toBe('Female');
      expect(result.genderErrors[0].guestName).toBe('Alice Smith');
    });

    it('should allow any gender beds', async () => {
      const guests: GuestDto[] = [
        {
          bedId: 'bed1',
          name: 'Alice Smith',
          age: 25,
          gender: GuestGender.FEMALE
        }
      ];

      const mockBeds = [
        {
          id: '1',
          bedIdentifier: 'bed1',
          status: BedStatus.AVAILABLE,
          gender: 'Any', // Accepts any gender
          room: { roomNumber: 'R101' }
        }
      ];

      mockBedRepository.find.mockResolvedValue(mockBeds);

      const result = await service.validateBookingRequest(guests);

      expect(result.isValid).toBe(true);
      expect(result.genderErrors).toHaveLength(0);
    });
  });

  describe('validateGuestData', () => {
    it('should validate valid guest data', () => {
      const guest: GuestDto = {
        bedId: 'bed1',
        name: 'Alice Smith',
        age: 25,
        gender: GuestGender.FEMALE
      };

      const errors = service.validateGuestData(guest, 0);

      expect(errors).toHaveLength(0);
    });

    it('should detect invalid bed ID format', () => {
      const guest: GuestDto = {
        bedId: 'invalid-bed-id',
        name: 'Alice Smith',
        age: 25,
        gender: GuestGender.FEMALE
      };

      const errors = service.validateGuestData(guest, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_BED_ID_FORMAT');
      expect(errors[0].field).toBe('guests[0].bedId');
    });

    it('should detect invalid name length', () => {
      const guest: GuestDto = {
        bedId: 'bed1',
        name: 'A',
        age: 25,
        gender: GuestGender.FEMALE
      };

      const errors = service.validateGuestData(guest, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_NAME_LENGTH');
      expect(errors[0].field).toBe('guests[0].name');
    });

    it('should detect invalid age range', () => {
      const guest: GuestDto = {
        bedId: 'bed1',
        name: 'Alice Smith',
        age: 0,
        gender: GuestGender.FEMALE
      };

      const errors = service.validateGuestData(guest, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_AGE_RANGE');
      expect(errors[0].field).toBe('guests[0].age');
    });
  });

  describe('createValidationException', () => {
    it('should create a BadRequestException with validation details', () => {
      const result = {
        isValid: false,
        errors: [
          {
            bedId: 'bed1',
            reason: 'Bed not found',
            code: 'BED_NOT_FOUND'
          }
        ],
        genderErrors: [],
        validationDetails: [
          {
            field: 'guests',
            code: 'BED_NOT_FOUND',
            message: 'Bed bed1 does not exist',
            value: 'bed1',
            context: { bedId: 'bed1' }
          }
        ]
      };

      const exception = service.createValidationException(result);

      expect(exception.getStatus()).toBe(400);
      expect(exception.getResponse()).toMatchObject({
        status: 400,
        error: 'Validation Error',
        message: 'Booking validation failed',
        details: result.validationDetails,
        bedErrors: result.errors,
        genderErrors: result.genderErrors
      });
    });
  });
});