import { 
  Controller, 
  Put, 
  Body, 
  Param, 
  HttpStatus, 
  UseGuards, 
  BadRequestException,
  NotFoundException 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { UpdateRoomDto } from './dto/update-room.dto';

@ApiTags('room-updates')
@Controller('rooms')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class RoomUpdateController {
  constructor(private readonly roomsService: RoomsService) {
    console.log('🔄 RoomUpdateController initialized');
  }

  @Put(':id/update')
  @ApiOperation({ summary: 'Update room with organized sub-methods' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  async updateRoom(
    @Param('id') roomId: string,
    @Body() updateData: UpdateRoomDto,
    @GetHostelId() hostelId: string
  ) {
    console.log('🔄 RoomUpdateController.updateRoom - Starting update process');
    console.log('🏠 Room ID:', roomId);
    console.log('🏨 Hostel ID:', hostelId);
    console.log('📝 Update data received:', JSON.stringify(updateData, null, 2));

    try {
      // Validate inputs
      if (!roomId) {
        throw new BadRequestException('Room ID is required');
      }
      if (!hostelId) {
        throw new BadRequestException('Hostel context is required');
      }

      // Check if room exists
      const existingRoom = await this.roomsService.findOne(roomId, hostelId);
      if (!existingRoom) {
        throw new NotFoundException(`Room with ID ${roomId} not found`);
      }

      console.log('✅ Room found:', existingRoom.name);

      // Process updates through organized sub-methods
      const updateResult = await this.processRoomUpdate(roomId, updateData, hostelId);

      return {
        status: HttpStatus.OK,
        message: 'Room updated successfully',
        data: updateResult,
        updatedFields: this.getUpdatedFields(updateData)
      };

    } catch (error) {
      console.error('❌ Room update failed:', error.message);
      throw error;
    }
  }

  /**
   * Main update processing method that coordinates all sub-updates
   */
  private async processRoomUpdate(
    roomId: string, 
    updateData: UpdateRoomDto, 
    hostelId: string
  ): Promise<any> {
    console.log('🔄 Processing room update with organized sub-methods');

    const updateResults = {
      basicInfo: null,
      amenities: null,
      layout: null,
      pricing: null,
      status: null
    };

    // 1. Update basic room information
    if (this.hasBasicInfoUpdates(updateData)) {
      console.log('📝 Processing basic info updates');
      updateResults.basicInfo = await this.updateBasicInfo(roomId, updateData, hostelId);
    }

    // 2. Update amenities
    if (updateData.amenities !== undefined) {
      console.log('🛠️ Processing amenities updates');
      updateResults.amenities = await this.updateAmenities(roomId, updateData.amenities, hostelId);
    }

    // 3. Update layout
    if (updateData.layout !== undefined) {
      console.log('📐 Processing layout updates');
      updateResults.layout = await this.updateLayout(roomId, updateData.layout, hostelId);
    }

    // 4. Update pricing
    if (this.hasPricingUpdates(updateData)) {
      console.log('💰 Processing pricing updates');
      updateResults.pricing = await this.updatePricing(roomId, updateData, hostelId);
    }

    // 5. Update status
    if (this.hasStatusUpdates(updateData)) {
      console.log('📊 Processing status updates');
      updateResults.status = await this.updateStatus(roomId, updateData, hostelId);
    }

    // Get final updated room
    const updatedRoom = await this.roomsService.findOne(roomId, hostelId);

    return {
      room: updatedRoom,
      updateResults: updateResults
    };
  }

  /**
   * Update basic room information (name, roomNumber, floor, etc.)
   */
  private async updateBasicInfo(
    roomId: string, 
    updateData: UpdateRoomDto, 
    hostelId: string
  ): Promise<any> {
    console.log('📝 Updating basic room information');

    const basicUpdates: any = {};

    // Extract basic info fields
    if (updateData.name !== undefined) {
      basicUpdates.name = updateData.name;
      console.log('  ✅ Name:', updateData.name);
    }

    if (updateData.roomNumber !== undefined) {
      basicUpdates.roomNumber = updateData.roomNumber;
      console.log('  ✅ Room Number:', updateData.roomNumber);
    }

    if (updateData.floor !== undefined) {
      basicUpdates.floor = updateData.floor;
      console.log('  ✅ Floor:', updateData.floor);
    }

    if (updateData.gender !== undefined) {
      basicUpdates.gender = updateData.gender;
      console.log('  ✅ Gender:', updateData.gender);
    }

    if (updateData.description !== undefined) {
      basicUpdates.description = updateData.description;
      console.log('  ✅ Description updated');
    }

    if (updateData.images !== undefined) {
      basicUpdates.images = updateData.images;
      console.log('  ✅ Images:', updateData.images?.length || 0, 'items');
    }

    if (updateData.capacity !== undefined) {
      basicUpdates.bedCount = updateData.capacity;
      console.log('  ✅ Bed Count:', updateData.capacity);
    }

    // Apply basic updates
    if (Object.keys(basicUpdates).length > 0) {
      await this.roomsService.update(roomId, basicUpdates, hostelId);
      console.log('✅ Basic info updated successfully');
      return { updated: true, fields: Object.keys(basicUpdates) };
    }

    return { updated: false, message: 'No basic info updates needed' };
  }

  /**
   * Update room amenities
   */
  private async updateAmenities(roomId: string, amenities: string[], hostelId: string): Promise<any> {
    console.log('🛠️ Updating room amenities');
    console.log('  📝 New amenities:', amenities);

    try {
      // Use the service's amenities update method with proper hostelId
      await this.roomsService.update(roomId, { amenities }, hostelId);

      console.log('✅ Amenities updated successfully');
      return { 
        updated: true, 
        amenities: amenities,
        count: amenities.length 
      };
    } catch (error) {
      console.error('❌ Amenities update failed:', error.message);
      throw new BadRequestException(`Failed to update amenities: ${error.message}`);
    }
  }

  /**
   * Update room layout
   */
  private async updateLayout(roomId: string, layout: any, hostelId: string): Promise<any> {
    console.log('📐 Updating room layout');
    console.log('  📊 Layout elements:', layout?.elements?.length || 0);
    console.log('  📏 Layout dimensions:', layout?.dimensions);

    try {
      // Use the service's layout update method with proper hostelId
      await this.roomsService.update(roomId, { layout }, hostelId);

      console.log('✅ Layout updated successfully');
      return { 
        updated: true, 
        elementsCount: layout?.elements?.length || 0,
        dimensions: layout?.dimensions,
        bedPositions: layout?.bedPositions?.length || 0
      };
    } catch (error) {
      console.error('❌ Layout update failed:', error.message);
      throw new BadRequestException(`Failed to update layout: ${error.message}`);
    }
  }

  /**
   * Update room pricing
   */
  private async updatePricing(roomId: string, updateData: UpdateRoomDto, hostelId: string): Promise<any> {
    console.log('💰 Updating room pricing');

    const pricingUpdates: any = {};

    if (updateData.rent !== undefined) {
      pricingUpdates.monthlyRate = updateData.rent;
      console.log('  💵 Monthly Rate:', updateData.rent);
    }

    if (updateData.type !== undefined) {
      pricingUpdates.type = updateData.type;
      console.log('  🏷️ Room Type:', updateData.type);
    }

    if (Object.keys(pricingUpdates).length > 0) {
      await this.roomsService.update(roomId, pricingUpdates, hostelId);
      console.log('✅ Pricing updated successfully');
      return { updated: true, fields: Object.keys(pricingUpdates) };
    }

    return { updated: false, message: 'No pricing updates needed' };
  }

  /**
   * Update room status
   */
  private async updateStatus(roomId: string, updateData: UpdateRoomDto, hostelId: string): Promise<any> {
    console.log('📊 Updating room status');

    const statusUpdates: any = {};

    if (updateData.status !== undefined) {
      statusUpdates.status = updateData.status;
      console.log('  📊 Status:', updateData.status);
    }

    // Note: maintenanceStatus, occupancy, lastCleaned not in DTO
    // These would need to be added to UpdateRoomDto if needed

    if (Object.keys(statusUpdates).length > 0) {
      await this.roomsService.update(roomId, statusUpdates, hostelId);
      console.log('✅ Status updated successfully');
      return { updated: true, fields: Object.keys(statusUpdates) };
    }

    return { updated: false, message: 'No status updates needed' };
  }

  /**
   * Helper methods to check what type of updates are needed
   */
  private hasBasicInfoUpdates(updateData: UpdateRoomDto): boolean {
    return !!(
      updateData.name !== undefined ||
      updateData.roomNumber !== undefined ||
      updateData.floor !== undefined ||
      updateData.gender !== undefined ||
      updateData.description !== undefined ||
      updateData.images !== undefined ||
      updateData.capacity !== undefined ||
      false // bedCount not in DTO, using capacity instead
    );
  }

  private hasPricingUpdates(updateData: UpdateRoomDto): boolean {
    return !!(
      updateData.rent !== undefined ||
      false || // monthlyRate not in DTO, using rent instead
      false || // dailyRate not in DTO
      updateData.type !== undefined
    );
  }

  private hasStatusUpdates(updateData: UpdateRoomDto): boolean {
    return !!(
      updateData.status !== undefined ||
      false || // maintenanceStatus not in DTO
      false || // occupancy not in DTO  
      false // lastCleaned not in DTO
    );
  }

  /**
   * Get list of fields that were updated
   */
  private getUpdatedFields(updateData: UpdateRoomDto): string[] {
    const fields: string[] = [];

    if (this.hasBasicInfoUpdates(updateData)) {
      fields.push('basicInfo');
    }
    if (updateData.amenities !== undefined) {
      fields.push('amenities');
    }
    if (updateData.layout !== undefined) {
      fields.push('layout');
    }
    if (this.hasPricingUpdates(updateData)) {
      fields.push('pricing');
    }
    if (this.hasStatusUpdates(updateData)) {
      fields.push('status');
    }

    return fields;
  }
}