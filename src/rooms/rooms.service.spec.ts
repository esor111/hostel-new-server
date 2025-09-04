import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { Amenity } from './entities/amenity.entity';
import { RoomAmenity } from './entities/room-amenity.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { RoomOccupant } from './entities/room-occupant.entity';
import { Student } from '../students/entities/student.entity';
import { Bed, BedStatus } from './entities/bed.entity';
import { BedSyncService } from './bed-sync.service';

describe('RoomsService - Hybrid Integration', () => {
  let service: RoomsService;
  let roomRepository: Repository<Room>;
  let bedSyncService: BedSyncService;

  const mockRoom = {
    id: 'room-1',
    name: 'Test Room',
    roomNumber: 'R001',
    bedCount: 2,
    occupancy: 1,
    status: 'ACTIVE',
    beds: [
      {
        id: 'bed-1',
        bedIdentifier: 'bed1',
        status: BedStatus.OCCUPIED,
        currentOccupantId: 'student-1',
        currentOccupantName: 'John Doe',
        roomId: 'room-1'
      },
      {
        id: 'bed-2',
        bedIdentifier: 'bed2',
        status: BedStatus.AVAILABLE,
        currentOccupantId: null,
        currentOccupantName: null,
        roomId: 'room-1'
      }
    ],
    layout: {
      layoutData: {
        bedPositions: [
          { id: 'bed1', x: 1, y: 1, width: 2, height: 4, rotation: 0 },
          { id: 'bed2', x: 4, y: 1, width: 2, height: 4, rotation: 0 }
        ]
      }
    },
    occupants: [],
    amenities: [],
    roomType: null,
    building: null
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: getRepositoryToken(Room),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[mockRoom], 1])
            })),
            update: jest.fn(),
            save: jest.fn(),
            count: jest.fn()
          }
        },
        {
          provide: BedSyncService,
          useValue: {
            mergeBedDataIntoPositions: jest.fn().mockImplementation((positions, beds) => {
              return positions.map(pos => {
                const bed = beds.find(b => b.bedIdentifier === pos.id);
                return bed ? {
                  ...pos,
                  status: bed.status,
                  occupantId: bed.currentOccupantId,
                  occupantName: bed.currentOccupantName
                } : pos;
              });
            }),
            syncBedsFromLayout: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: getRepositoryToken(RoomType),
          useValue: { findOne: jest.fn(), save: jest.fn() }
        },
        {
          provide: getRepositoryToken(Amenity),
          useValue: { findOne: jest.fn(), save: jest.fn() }
        },
        {
          provide: getRepositoryToken(RoomAmenity),
          useValue: { save: jest.fn(), update: jest.fn() }
        },
        {
          provide: getRepositoryToken(RoomLayout),
          useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn() }
        },
        {
          provide: getRepositoryToken(RoomOccupant),
          useValue: { count: jest.fn().mockResolvedValue(1), findOne: jest.fn(), save: jest.fn(), update: jest.fn() }
        },
        {
          provide: getRepositoryToken(Student),
          useValue: { findOne: jest.fn(), update: jest.fn() }
        },

      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomRepository = module.get<Repository<Room>>(getRepositoryToken(Room));
    bedSyncService = module.get<BedSyncService>(BedSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne with bed data', () => {
    it('should include bed data in room response', async () => {
      // Mock the repository to return room with beds
      jest.spyOn(roomRepository, 'findOne').mockResolvedValue(mockRoom as any);

      const result = await service.findOne('room-1');

      // Verify that beds are included in the response
      expect(result.beds).toBeDefined();
      expect(result.beds).toHaveLength(2);
      expect(result.beds[0].bedIdentifier).toBe('bed1');
      expect(result.beds[1].bedIdentifier).toBe('bed2');
    });

    it('should calculate occupancy from bed data', async () => {
      jest.spyOn(roomRepository, 'findOne').mockResolvedValue(mockRoom as any);

      const result = await service.findOne('room-1');

      // Occupancy should be calculated from bed status (1 occupied bed)
      expect(result.occupancy).toBe(1);
      expect(result.availableBeds).toBe(1);
    });

    it('should enhance bedPositions with bed entity data', async () => {
      jest.spyOn(roomRepository, 'findOne').mockResolvedValue(mockRoom as any);

      const result = await service.findOne('room-1');

      // Check that bedPositions are enhanced with bed data
      expect(result.layout.bedPositions).toBeDefined();
      expect(result.layout.bedPositions[0]).toMatchObject({
        id: 'bed1',
        status: BedStatus.OCCUPIED,
        occupantId: 'student-1',
        occupantName: 'John Doe'
      });
      expect(result.layout.bedPositions[1]).toMatchObject({
        id: 'bed2',
        status: BedStatus.AVAILABLE,
        occupantId: null,
        occupantName: null
      });
    });
  });

  describe('findAll with bed data', () => {
    it('should include bed data in room list response', async () => {
      const result = await service.findAll();

      // Verify the query builder includes beds relation
      expect(roomRepository.createQueryBuilder).toHaveBeenCalled();
      
      // Verify response structure
      expect(result.items).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].beds).toBeDefined();
    });
  });

  describe('getAvailableRooms with bed data', () => {
    it('should filter rooms based on bed availability', async () => {
      jest.spyOn(roomRepository, 'find').mockResolvedValue([mockRoom as any]);

      const result = await service.getAvailableRooms();

      // Should include the room since it has available beds
      expect(result).toHaveLength(1);
      expect(result[0].availableBeds).toBe(1);
    });
  });
});