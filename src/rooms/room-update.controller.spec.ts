import { Test, TestingModule } from '@nestjs/testing';
import { RoomUpdateController } from './room-update.controller';
import { RoomsService } from './rooms.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RoomUpdateController', () => {
  let controller: RoomUpdateController;
  let roomsService: jest.Mocked<RoomsService>;

  const mockRoom = {
    id: 'room-123',
    name: 'Test Room',
    roomNumber: 'R101',
    floor: 1,
    bedCount: 2,
    amenities: ['Wi-Fi', 'AC'],
    status: 'ACTIVE'
  };

  beforeEach(async () => {
    const mockRoomsService = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomUpdateController],
      providers: [
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    }).compile();

    controller = module.get<RoomUpdateController>(RoomUpdateController);
    roomsService = module.get(RoomsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateRoom', () => {
    it('should successfully update room basic info', async () => {
      // Arrange
      const roomId = 'room-123';
      const hostelId = 'hostel-456';
      const updateData = {
        name: 'Updated Room Name',
        floor: 2,
        amenities: ['Wi-Fi', 'AC', 'Desk']
      };

      roomsService.findOne.mockResolvedValue(mockRoom);
      roomsService.update.mockResolvedValue({ ...mockRoom, ...updateData });

      // Act
      const result = await controller.updateRoom(roomId, updateData, hostelId);

      // Assert
      expect(result.status).toBe(200);
      expect(result.message).toBe('Room updated successfully');
      expect(result.updatedFields).toContain('basicInfo');
      expect(result.updatedFields).toContain('amenities');
      expect(roomsService.findOne).toHaveBeenCalledWith(roomId, hostelId);
    });

    it('should throw NotFoundException when room does not exist', async () => {
      // Arrange
      const roomId = 'non-existent-room';
      const hostelId = 'hostel-456';
      const updateData = { name: 'Test' };

      roomsService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.updateRoom(roomId, updateData, hostelId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when roomId is missing', async () => {
      // Arrange
      const roomId = '';
      const hostelId = 'hostel-456';
      const updateData = { name: 'Test' };

      // Act & Assert
      await expect(
        controller.updateRoom(roomId, updateData, hostelId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle amenities update correctly', async () => {
      // Arrange
      const roomId = 'room-123';
      const hostelId = 'hostel-456';
      const updateData = {
        amenities: ['Wi-Fi', 'Power Outlet', 'Study Desk']
      };

      roomsService.findOne.mockResolvedValue(mockRoom);
      roomsService.update.mockResolvedValue({ ...mockRoom, amenities: updateData.amenities });

      // Act
      const result = await controller.updateRoom(roomId, updateData, hostelId);

      // Assert
      expect(result.updatedFields).toContain('amenities');
      expect(roomsService.update).toHaveBeenCalledWith(
        roomId, 
        { amenities: updateData.amenities }, 
        hostelId
      );
    });

    it('should handle layout update correctly', async () => {
      // Arrange
      const roomId = 'room-123';
      const hostelId = 'hostel-456';
      const updateData = {
        layout: {
          dimensions: { width: 400, height: 300 },
          elements: [
            { id: 'bed1', type: 'single-bed', x: 50, y: 50 }
          ]
        }
      };

      roomsService.findOne.mockResolvedValue(mockRoom);
      roomsService.update.mockResolvedValue({ ...mockRoom, layout: updateData.layout });

      // Act
      const result = await controller.updateRoom(roomId, updateData, hostelId);

      // Assert
      expect(result.updatedFields).toContain('layout');
      expect(roomsService.update).toHaveBeenCalledWith(
        roomId, 
        { layout: updateData.layout }, 
        hostelId
      );
    });

    it('should handle pricing updates correctly', async () => {
      // Arrange
      const roomId = 'room-123';
      const hostelId = 'hostel-456';
      const updateData = {
        rent: 5000,
        type: 'Shared'
      };

      roomsService.findOne.mockResolvedValue(mockRoom);
      roomsService.update.mockResolvedValue({ ...mockRoom, monthlyRate: 5000 });

      // Act
      const result = await controller.updateRoom(roomId, updateData, hostelId);

      // Assert
      expect(result.updatedFields).toContain('pricing');
      expect(roomsService.update).toHaveBeenCalledWith(
        roomId, 
        { monthlyRate: 5000, type: 'Shared' }, 
        hostelId
      );
    });

    it('should handle status updates correctly', async () => {
      // Arrange
      const roomId = 'room-123';
      const hostelId = 'hostel-456';
      const updateData = {
        status: 'MAINTENANCE'
      };

      roomsService.findOne.mockResolvedValue(mockRoom);
      roomsService.update.mockResolvedValue({ ...mockRoom, ...updateData });

      // Act
      const result = await controller.updateRoom(roomId, updateData, hostelId);

      // Assert
      expect(result.updatedFields).toContain('status');
      expect(roomsService.update).toHaveBeenCalledWith(
        roomId, 
        { status: 'MAINTENANCE' }, 
        hostelId
      );
    });

    it('should handle multiple update types in single request', async () => {
      // Arrange
      const roomId = 'room-123';
      const hostelId = 'hostel-456';
      const updateData = {
        name: 'Updated Room',
        floor: 3,
        amenities: ['Wi-Fi', 'AC'],
        rent: 6000,
        status: 'ACTIVE'
      };

      roomsService.findOne.mockResolvedValue(mockRoom);
      roomsService.update.mockResolvedValue({ ...mockRoom, ...updateData });

      // Act
      const result = await controller.updateRoom(roomId, updateData, hostelId);

      // Assert
      expect(result.updatedFields).toContain('basicInfo');
      expect(result.updatedFields).toContain('amenities');
      expect(result.updatedFields).toContain('pricing');
      expect(result.updatedFields).toContain('status');
      expect(result.updatedFields).toHaveLength(4);
    });
  });
});