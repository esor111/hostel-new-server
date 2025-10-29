import { Controller, Get, Post, Put, Body, Param, Query, HttpStatus, Logger, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
// Removed: import { BookingsService } from './bookings.service';
import { MultiGuestBookingService } from './multi-guest-booking.service';
// Removed: import { BookingTransformationService } from './booking-transformation.service';
import { CreateBookingDto, ApproveBookingDto, RejectBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateMultiGuestBookingDto } from './dto/multi-guest-booking.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { GetMyBookingsDto, MyBookingsResponseDto, CancelMyBookingDto } from './dto/my-bookings.dto';
import { BookingRequirementsResponseDto } from './dto/booking-requirements.dto';
import { BedService } from '../rooms/bed.service';
import { HostelService } from '../hostel/hostel.service';

@ApiTags('bookings')
@Controller('booking-requests')
// @UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(
    // Removed: private readonly bookingsService: BookingsService,
    private readonly multiGuestBookingService: MultiGuestBookingService,
    // Removed: private readonly transformationService: BookingTransformationService
    private readonly bedService: BedService,
    private readonly hostelService: HostelService,
  ) { }

  @Get('requirements')
  @ApiOperation({
    summary: 'Get all IDs required for booking request',
    description: 'Returns available beds with their IDs, room info, and hostel info - everything needed to create a booking request in one call'
  })
  @ApiResponse({
    status: 200,
    description: 'Booking requirements retrieved successfully',
    type: BookingRequirementsResponseDto
  })
  async getBookingRequirements(
    @Query('hostelId') hostelId?: string,
    @Query('gender') gender?: string,
    @Query('limit') limit?: string
  ): Promise<{ status: number; data: BookingRequirementsResponseDto }> {
    this.logger.log('Getting booking requirements (available beds and hostel info)');

    try {
      // Get all available beds with room and hostel details
      const availableBeds = await this.bedService.findAvailableBedsForBooking(
        undefined, // roomId - get from all rooms
        gender,
        limit ? parseInt(limit) : undefined,
        hostelId
      );

      // Get all hostels
      const hostels = await this.hostelService.findAllWithBusinessData();

      // Transform beds data to include all necessary information
      const bedsWithDetails = availableBeds.map(bed => ({
        id: bed.id,
        bedIdentifier: bed.bedIdentifier,
        roomId: bed.roomId,
        roomNumber: bed.room?.roomNumber || 'N/A',
        roomName: bed.room?.name || 'N/A',
        bedType: 'standard', // Default bed type since not in entity
        gender: bed.gender || 'Any',
        floor: 1, // Default floor since not directly in room entity
        hostelId: bed.hostelId || bed.room?.hostelId || '',
        hostelName: bed.hostel?.name || bed.room?.hostel?.name || 'N/A'
      }));

      // Calculate statistics
      const bedsByGender = {
        Male: bedsWithDetails.filter(b => b.gender === 'Male').length,
        Female: bedsWithDetails.filter(b => b.gender === 'Female').length,
        Any: bedsWithDetails.filter(b => b.gender === 'Any').length
      };

      const bedsByHostel = bedsWithDetails.reduce((acc, bed) => {
        acc[bed.hostelId] = (acc[bed.hostelId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Transform hostels data
      const hostelsInfo = hostels.map(hostel => ({
        id: hostel.id,
        name: hostel.name,
        businessId: hostel.businessId,
        availableBeds: bedsByHostel[hostel.id] || 0
      }));

      const response: BookingRequirementsResponseDto = {
        availableBeds: bedsWithDetails,
        hostels: hostelsInfo,
        totalAvailableBeds: bedsWithDetails.length,
        bedsByGender,
        bedsByHostel
      };

      return {
        status: HttpStatus.OK,
        data: response
      };
    } catch (error) {
      this.logger.error('Error getting booking requirements:', error);
      throw new BadRequestException('Failed to retrieve booking requirements');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all booking requests' })
  @ApiResponse({ status: 200, description: 'List of booking requests retrieved successfully' })
  async getAllBookingRequests(@Query() query: any, @GetHostelId() hostelId: string) {
    this.logger.log(`Getting all booking requests for hostelId: ${hostelId}`);

    // Use MultiGuestBookingService with hostel context filtering
    const result = await this.multiGuestBookingService.getAllBookings(query, hostelId);

    // Return direct response in the expected format
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({ status: 200, description: 'Booking statistics retrieved successfully' })
  async getBookingStats(@GetHostelId() hostelId: string) {
    this.logger.log(`Getting booking statistics for hostelId: ${hostelId}`);

    // Use enhanced stats from MultiGuestBookingService with hostel context
    const stats = await this.multiGuestBookingService.getEnhancedBookingStats(hostelId);

    // Return direct response
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending booking requests' })
  @ApiResponse({ status: 200, description: 'Pending bookings retrieved successfully' })
  async getPendingBookings(@GetHostelId() hostelId: string) {
    this.logger.log(`Getting pending bookings for hostelId: ${hostelId}`);

    // Use MultiGuestBookingService with hostel context filtering
    const pendingBookings = await this.multiGuestBookingService.getPendingBookings(hostelId);

    // Return direct response
    return {
      status: HttpStatus.OK,
      data: pendingBookings
    };
  }

  // Multi-Guest Booking Endpoints (must come before parameterized routes)
  @Post('multi-guest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create multi-guest booking request (Authenticated)' })
  @ApiResponse({ status: 201, description: 'Multi-guest booking created successfully' })
  async createMultiGuestBooking(@Body() createDto: CreateMultiGuestBookingDto, @Request() req) {
    // Extract hostel ID from the booking data
    const hostelId = createDto.data.hostelId;
    const userId = req.user.id; // Extract user ID from JWT token

    this.logger.log(`User ${userId} creating multi-guest booking${hostelId ? ` for hostel: ${hostelId}` : ' with default hostel'}`);

    const booking = await this.multiGuestBookingService.createMultiGuestBooking(createDto, hostelId, userId);

    return {
      status: HttpStatus.CREATED,
      data: booking
    };
  }

  @Get('multi-guest/stats')
  @ApiOperation({ summary: 'Get multi-guest booking statistics' })
  @ApiResponse({ status: 200, description: 'Multi-guest booking statistics retrieved successfully' })
  async getMultiGuestBookingStats(@GetHostelId() hostelId: string) {
    const stats = await this.multiGuestBookingService.getBookingStats(hostelId);

    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('multi-guest')
  @ApiOperation({ summary: 'Get all multi-guest bookings' })
  @ApiResponse({ status: 200, description: 'Multi-guest bookings retrieved successfully' })
  async getAllMultiGuestBookings(@Query() query: any, @GetHostelId() hostelId: string) {
    const result = await this.multiGuestBookingService.getAllBookings(query, hostelId);

    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('multi-guest/:id')
  @ApiOperation({ summary: 'Get multi-guest booking by ID' })
  @ApiResponse({ status: 200, description: 'Multi-guest booking retrieved successfully' })
  async getMultiGuestBookingById(@Param('id') id: string) {
    const booking = await this.multiGuestBookingService.findBookingById(id);

    return {
      status: HttpStatus.OK,
      data: booking
    };
  }

  @Post('multi-guest/:id/confirm')
  @ApiOperation({ summary: 'Confirm multi-guest booking' })
  @ApiResponse({ status: 200, description: 'Multi-guest booking confirmed successfully' })
  async confirmMultiGuestBooking(@Param('id') id: string, @Body() confirmDto: ConfirmBookingDto) {
    const result = await this.multiGuestBookingService.confirmBooking(id, confirmDto.processedBy);

    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post('multi-guest/:id/cancel')
  @ApiOperation({ summary: 'Cancel multi-guest booking' })
  @ApiResponse({ status: 200, description: 'Multi-guest booking cancelled successfully' })
  async cancelMultiGuestBooking(@Param('id') id: string, @Body() cancelDto: CancelBookingDto) {
    const result = await this.multiGuestBookingService.cancelBooking(id, cancelDto.reason);

    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  // User booking endpoints (MUST come before parameterized routes)
  @Get('debug/all-bookings')
  @ApiOperation({
    summary: 'Debug: Get all bookings in system',
    description: 'Debug endpoint to view all bookings in the system. For development and troubleshooting only.'
  })
  @ApiResponse({ status: 200, description: 'All bookings retrieved for debugging' })
  async debugAllBookings() {
    this.logger.log('Debug: Getting all bookings in system');

    try {
      const result = await this.multiGuestBookingService.getAllBookings({});

      return {
        status: HttpStatus.OK,
        message: 'All bookings for debugging',
        data: result.items || result || [],
        total: result.pagination?.total || result.length || 0
      };
    } catch (error) {
      this.logger.error('Debug endpoint error:', error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Debug endpoint error',
        error: error.message,
        data: [],
        total: 0
      };
    }
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user\'s bookings (Authenticated)',
    description: 'Retrieves bookings for the authenticated user based on JWT token.'
  })
  @ApiResponse({ status: 200, description: 'User bookings retrieved successfully', type: MyBookingsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  async getMyBookings(
    @Query() query: GetMyBookingsDto,
    @Request() req
  ) {
    const userId = req.user.id; // Extract user ID from JWT token
    this.logger.log(`Getting bookings for authenticated user: ${userId}`);

    const result = await this.multiGuestBookingService.getUserBookings(userId, query);

    return {
      status: HttpStatus.OK,
      message: 'User bookings retrieved successfully',
      ...result
    };
  }

  @Post('my-bookings/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel user\'s booking (Authenticated)',
    description: 'Allows authenticated users to cancel their own bookings.'
  })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Booking not found or user does not have permission' })
  async cancelMyBooking(
    @Param('id') bookingId: string,
    @Body() cancelDto: CancelMyBookingDto,
    @Request() req
  ) {
    const userId = req.user.id; // Extract user ID from JWT token
    this.logger.log(`User ${userId} cancelling booking ${bookingId}`);

    const result = await this.multiGuestBookingService.cancelUserBooking(bookingId, userId, cancelDto.reason);

    return {
      status: HttpStatus.OK,
      message: 'Booking cancelled successfully',
      data: result
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking request by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingRequestById(@Param('id') id: string) {
    this.logger.log(`Getting booking by ID: ${id} via unified multi-guest system`);

    // Get booking directly from MultiGuestBookingService
    const booking = await this.multiGuestBookingService.findBookingById(id);

    // Return direct response
    return {
      status: HttpStatus.OK,
      data: booking
    };
  }



  @Put(':id')
  @ApiOperation({ summary: 'Update booking request' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  async updateBookingRequest(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    this.logger.log(`Updating booking ${id} via unified multi-guest system`);

    // Use MultiGuestBookingService for updates
    const booking = await this.multiGuestBookingService.updateBooking(id, updateBookingDto);

    // Return direct response
    return {
      status: HttpStatus.OK,
      data: booking
    };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve booking request' })
  @ApiResponse({ status: 200, description: 'Booking approved successfully' })
  async approveBookingRequest(@Param('id') id: string, @Body() approvalDto: ApproveBookingDto) {
    this.logger.log(`Approving booking ${id} via unified multi-guest system`);

    // Use MultiGuestBookingService confirmBooking method
    const result = await this.multiGuestBookingService.confirmBooking(id, approvalDto.processedBy || 'admin');

    // Return direct response
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject booking request' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully' })
  async rejectBookingRequest(@Param('id') id: string, @Body() rejectionDto: RejectBookingDto) {
    this.logger.log(`Rejecting booking ${id} via unified multi-guest system`);

    // Use MultiGuestBookingService rejectBooking method instead of cancelBooking
    const result = await this.multiGuestBookingService.rejectBooking(id, rejectionDto.reason, rejectionDto.processedBy || 'admin');

    // Return direct response
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

}