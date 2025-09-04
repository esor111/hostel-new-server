import { Controller, Get, Post, Put, Body, Param, Query, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { MultiGuestBookingService } from './multi-guest-booking.service';
import { BookingTransformationService } from './booking-transformation.service';
import { CreateBookingDto, ApproveBookingDto, RejectBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateMultiGuestBookingDto } from './dto/multi-guest-booking.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@ApiTags('bookings')
@Controller('booking-requests')
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly multiGuestBookingService: MultiGuestBookingService,
    private readonly transformationService: BookingTransformationService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all booking requests' })
  @ApiResponse({ status: 200, description: 'List of booking requests retrieved successfully' })
  async getAllBookingRequests(@Query() query: any) {
    this.logger.log('Getting all booking requests via unified system');
    
    // Use MultiGuestBookingService internally but return in BookingRequest format
    const result = await this.multiGuestBookingService.getAllBookings(query);
    
    // Transform to BookingRequest format for backward compatibility
    const transformedItems = result.items.map(booking => 
      this.transformationService.transformToBookingRequestFormat(booking)
    );
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: {
        items: transformedItems,
        pagination: result.pagination
      }
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({ status: 200, description: 'Booking statistics retrieved successfully' })
  async getBookingStats() {
    this.logger.log('Getting booking statistics via unified system');
    
    // Use enhanced stats from MultiGuestBookingService
    const multiGuestStats = await this.multiGuestBookingService.getEnhancedBookingStats();
    
    // Transform to BookingRequest stats format for backward compatibility
    const transformedStats = this.transformationService.transformStatsToBookingRequestFormat(multiGuestStats);
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: transformedStats
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending booking requests' })
  @ApiResponse({ status: 200, description: 'Pending bookings retrieved successfully' })
  async getPendingBookings() {
    this.logger.log('Getting pending bookings via unified system');
    
    // Use MultiGuestBookingService internally
    const pendingBookings = await this.multiGuestBookingService.getPendingBookings();
    
    // Transform to BookingRequest format for backward compatibility
    const transformedBookings = pendingBookings.map(booking => 
      this.transformationService.transformToBookingRequestFormat(booking)
    );
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: transformedBookings
    };
  }

  // Multi-Guest Booking Endpoints (must come before parameterized routes)
  @Post('multi-guest')
  @ApiOperation({ summary: 'Create multi-guest booking request' })
  @ApiResponse({ status: 201, description: 'Multi-guest booking created successfully' })
  async createMultiGuestBooking(@Body() createDto: CreateMultiGuestBookingDto) {
    const booking = await this.multiGuestBookingService.createMultiGuestBooking(createDto);
    
    return {
      status: HttpStatus.CREATED,
      data: booking
    };
  }

  @Get('multi-guest/stats')
  @ApiOperation({ summary: 'Get multi-guest booking statistics' })
  @ApiResponse({ status: 200, description: 'Multi-guest booking statistics retrieved successfully' })
  async getMultiGuestBookingStats() {
    const stats = await this.multiGuestBookingService.getBookingStats();
    
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('multi-guest')
  @ApiOperation({ summary: 'Get all multi-guest bookings' })
  @ApiResponse({ status: 200, description: 'Multi-guest bookings retrieved successfully' })
  async getAllMultiGuestBookings(@Query() query: any) {
    const result = await this.multiGuestBookingService.getAllBookings(query);
    
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
    const result = await this.multiGuestBookingService.cancelBooking(id, cancelDto.reason, cancelDto.processedBy);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking request by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingRequestById(@Param('id') id: string) {
    this.logger.log(`Getting booking by ID: ${id} via unified system`);
    
    // Get the raw entity for transformation to BookingRequest format
    const booking = await this.multiGuestBookingService.findBookingEntityById(id);
    
    // Transform to BookingRequest format for backward compatibility
    const transformedBooking = this.transformationService.transformToBookingRequestFormat(booking);
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: transformedBooking
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking request' })
  @ApiResponse({ status: 201, description: 'Booking request created successfully' })
  async createBookingRequest(@Body() createBookingDto: CreateBookingDto) {
    this.logger.log(`Creating single guest booking for ${createBookingDto.name} via unified system`);
    
    // Use MultiGuestBookingService for single guest bookings
    const booking = await this.multiGuestBookingService.createSingleGuestBooking(createBookingDto);
    
    // booking is already in BookingRequest format from createSingleGuestBooking
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.CREATED,
      data: booking
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update booking request' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  async updateBookingRequest(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    this.logger.log(`Updating booking ${id} via unified system`);
    
    // For now, fall back to original service for updates
    // TODO: Implement update functionality in MultiGuestBookingService
    const booking = await this.bookingsService.update(id, updateBookingDto);
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: booking
    };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve booking request' })
  @ApiResponse({ status: 200, description: 'Booking approved successfully' })
  async approveBookingRequest(@Param('id') id: string, @Body() approvalDto: ApproveBookingDto) {
    this.logger.log(`Approving booking ${id} via unified system`);
    
    // Use MultiGuestBookingService for approval
    const result = await this.multiGuestBookingService.approveBooking(id, approvalDto);
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject booking request' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully' })
  async rejectBookingRequest(@Param('id') id: string, @Body() rejectionDto: RejectBookingDto) {
    this.logger.log(`Rejecting booking ${id} via unified system`);
    
    // Use MultiGuestBookingService for rejection
    const result = await this.multiGuestBookingService.rejectBooking(id, rejectionDto);
    
    // Return EXACT same format as original BookingRequest API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }


}