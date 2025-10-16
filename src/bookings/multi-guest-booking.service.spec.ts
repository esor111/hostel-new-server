import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MultiGuestBookingService } from './multi-guest-booking.service';
import { MultiGuestBooking, MultiGuestBookingStatus } from './entities/multi-guest-booking.entity';
import { BookingGuest, GuestStatus } from './entities/booking-guest.entity';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { CreateMultiGuestBookingDto, GuestGender } from './dto/multi-guest-booking.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MultiGuestBookingService', () => {
  let service: MultiGuestBookingService;
  let multiGuestBookingRepository: Repository<MultiGuestBooking>;
  let bookingGuestRepository: Repository<BookingGuest>;
  let bedRepository: Repository<Bed>;
  let dataSource: DataSource;

  const mockDataSource = {
    transaction: jest.fn()
  };

  const mockMultiGuestBookingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn()
  };

  const mockBookingGuestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  };

  const mockBedRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiGuestBookingService,
        {
          provide: getRepositoryToken(MultiGuestBooking),
          useValue: mockMultiGuestBookingRepository
        },
        {
          provide: getRepositoryToken(BookingGuest),
          useValue: mockBookingGuestRepository
        },
        {
          provide: getRepositoryToken(Bed),
          useValue: mockBedRepository
        },
        {
          provide: DataSource,
          useValue: mockDataSource
        }
      ]
    }).compile();

    service = module.get<MultiGuestBookingService>(MultiGuestBookingService);
    multiGuestBookingRepository = module.get<Repository<MultiGuestBooking>>(
      getRepositoryToken(MultiGuestBooking)
    );
    bookingGuestRepository = module.get<Repository<BookingGuest>>(
      getRepositoryToken(BookingGuest)
    );
    bedRepository = module.get<Repository<Bed>>(getRepositoryToken(Bed));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMultiGuestBooking', () => {
    const createBookingDto: CreateMultiGuestBookingDto = {
      data: {
        contactPerson: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com'
        },
        guests: [
          {
            bedId: 'bed1',
            name: 'Alice Smith',
            age: 25,
            gender: GuestGender.FEMALE
          },
          {
            bedId: 'bed2',
            name: 'Bob Johnson',
            age: 28,
            gender: GuestGender.MALE
          }
        ]
      }
    };

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

    it('should create a multi-guest booking successfully', async () => {
      const mockManager = {
        find: jest.fn().mockResolvedValue(mockBeds),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: 'mock-id' })),
        save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data)),
        update: jest.fn().mockResolvedValue({ affected: 1 })
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      jest.spyOn(service, 'findBookingById').mockResolvedValue({
        id: 'mock-booking-id',
        bookingReference: 'MGB123456',
        contactPerson: createBookingDto.data.contactPerson,
        preferredRoom: 'R101',
        guests: createBookingDto.data.guests.map((guest, index) => ({
          id: `guest-${index}`,
          bedId: guest.bedId,
          name: guest.name,
          age: guest.age,
          gender: guest.gender,
          status: GuestStatus.PENDING,
          assignedRoomNumber: 'R101',
          assignedBedNumber: 'bed1'
        })),
        checkInDate: null,
        duration: null,
        status: MultiGuestBookingStatus.PENDING,
        totalGuests: 2,
        confirmedGuests: 0,
        notes: null,
        emergencyContact: null,
        source: 'mobile_app',
        processedBy: null,
        processedDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.createMultiGuestBooking(createBookingDto);

      expect(result).toBeDefined();
      expect(result.totalGuests).toBe(2);
      expect(result.status).toBe(MultiGuestBookingStatus.PENDING);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should throw error when beds are not found', async () => {
      const mockManager = {
        find: jest.fn().mockResolvedValue([mockBeds[0]]) // Only one bed found
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.createMultiGuestBooking(createBookingDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error when beds are not available', async () => {
      const unavailableBeds = mockBeds.map(bed => ({
        ...bed,
        status: BedStatus.OCCUPIED
      }));

      const mockManager = {
        find: jest.fn().mockResolvedValue(unavailableBeds)
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.createMultiGuestBooking(createBookingDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error for gender mismatch', async () => {
      const genderMismatchBeds = [
        { ...mockBeds[0], gender: 'Male' }, // Female guest trying to book Male bed
        mockBeds[1]
      ];

      const mockManager = {
        find: jest.fn().mockResolvedValue(genderMismatchBeds)
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.createMultiGuestBooking(createBookingDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error for duplicate bed assignments', async () => {
      const duplicateBedDto = {
        ...createBookingDto,
        guests: [
          { bedId: 'bed1', name: 'Alice', age: 25, gender: GuestGender.FEMALE },
          { bedId: 'bed1', name: 'Bob', age: 28, gender: GuestGender.MALE } // Same bed
        ]
      };

      const mockManager = {
        find: jest.fn().mockResolvedValue([mockBeds[0]])
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.createMultiGuestBooking(duplicateBedDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmBooking', () => {
    const mockBooking = {
      id: 'booking-1',
      status: MultiGuestBookingStatus.PENDING,
      totalGuests: 2,
      bookingReference: 'MGB123456',
      guests: [
        { id: 'guest-1', bedId: 'bed1', guestName: 'Alice' },
        { id: 'guest-2', bedId: 'bed2', guestName: 'Bob' }
      ]
    };

    const mockReservedBeds = [
      { bedIdentifier: 'bed1', status: BedStatus.RESERVED },
      { bedIdentifier: 'bed2', status: BedStatus.RESERVED }
    ];

    it('should confirm booking successfully', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockBooking),
        find: jest.fn().mockResolvedValue(mockReservedBeds),
        update: jest.fn().mockResolvedValue({ affected: 1 })
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      const result = await service.confirmBooking('booking-1', 'admin');

      expect(result.success).toBe(true);
      expect(result.confirmedGuests).toBe(2);
      expect(result.bookingId).toBe('booking-1');
    });

    it('should handle partial confirmation when some beds are unavailable', async () => {
      const partiallyAvailableBeds = [
        { bedIdentifier: 'bed1', status: BedStatus.RESERVED },
        { bedIdentifier: 'bed2', status: BedStatus.OCCUPIED } // Not available
      ];

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockBooking),
        find: jest.fn().mockResolvedValue(partiallyAvailableBeds),
        update: jest.fn().mockResolvedValue({ affected: 1 })
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      const result = await service.confirmBooking('booking-1', 'admin');

      expect(result.success).toBe(true);
      expect(result.confirmedGuests).toBe(1);
      expect(result.failedAssignments).toBeDefined();
      expect(result.failedAssignments?.length).toBe(1);
    });

    it('should throw error when booking not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.confirmBooking('non-existent', 'admin'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error when booking is not pending', async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: MultiGuestBookingStatus.CONFIRMED
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(confirmedBooking)
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.confirmBooking('booking-1', 'admin'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBooking', () => {
    const mockBooking = {
      id: 'booking-1',
      status: MultiGuestBookingStatus.PENDING,
      bookingReference: 'MGB123456',
      guests: [
        { id: 'guest-1', bedId: 'bed1' },
        { id: 'guest-2', bedId: 'bed2' }
      ]
    };

    it('should cancel booking successfully', async () => {
      const mockBeds = [
        { bedIdentifier: 'bed1', status: BedStatus.RESERVED },
        { bedIdentifier: 'bed2', status: BedStatus.RESERVED }
      ];

      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(mockBooking)
          .mockResolvedValueOnce(mockBeds[0])
          .mockResolvedValueOnce(mockBeds[1]),
        update: jest.fn().mockResolvedValue({ affected: 1 })
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      const result = await service.cancelBooking('booking-1', 'Customer request', 'admin');

      expect(result.success).toBe(true);
      expect(result.reason).toBe('Customer request');
      expect(result.releasedBeds).toHaveLength(2);
    });

    it('should throw error when booking not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.cancelBooking('non-existent', 'reason', 'admin'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error when booking is already cancelled', async () => {
      const cancelledBooking = {
        ...mockBooking,
        status: MultiGuestBookingStatus.CANCELLED
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(cancelledBooking)
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.cancelBooking('booking-1', 'reason', 'admin'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getBookingStats', () => {
    it('should return booking statistics', async () => {
      mockMultiGuestBookingRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(5)  // confirmed
        .mockResolvedValueOnce(1)  // partially confirmed
        .mockResolvedValueOnce(1)  // cancelled
        .mockResolvedValueOnce(0); // completed

      mockBookingGuestRepository.count
        .mockResolvedValueOnce(25) // total guests
        .mockResolvedValueOnce(20); // confirmed guests

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average: '2.5' })
      };

      mockMultiGuestBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const stats = await service.getBookingStats();

      expect(stats.totalBookings).toBe(10);
      expect(stats.pendingBookings).toBe(3);
      expect(stats.confirmedBookings).toBe(6); // confirmed + partially confirmed
      expect(stats.cancelledBookings).toBe(1);
      expect(stats.totalGuests).toBe(25);
      expect(stats.confirmedGuests).toBe(20);
      expect(stats.confirmationRate).toBe(60); // 6/10 * 100
      expect(stats.averageGuestsPerBooking).toBe(2.5);
    });
  });

  describe('getAllBookings', () => {
    it('should return paginated bookings with filters', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          contactName: 'John Doe',
          status: MultiGuestBookingStatus.PENDING,
          guests: []
        }
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockBookings, 1])
      };

      mockMultiGuestBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getAllBookings({
        page: 1,
        limit: 10,
        status: MultiGuestBookingStatus.PENDING
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('validateMultipleBedAvailability', () => {
    it('should validate bed availability correctly', async () => {
      const mockBeds = [
        { bedIdentifier: 'bed1', status: BedStatus.AVAILABLE },
        { bedIdentifier: 'bed2', status: BedStatus.OCCUPIED }
      ];

      mockBedRepository.find.mockResolvedValue(mockBeds);

      const result = await service.validateMultipleBedAvailability(['bed1', 'bed2', 'bed3']);

      expect(result.available).toEqual(['bed1']);
      expect(result.unavailable).toEqual(['bed2', 'bed3']);
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].reason).toBe('Bed status is Occupied');
      expect(result.conflicts[1].reason).toBe('Bed not found');
    });
  });
});