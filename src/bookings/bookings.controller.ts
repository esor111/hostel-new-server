import { Controller, Get, Post, Put, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { MultiGuestBookingService } from './multi-guest-booking.service';
import { CreateBookingDto, ApproveBookingDto, RejectBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateMultiGuestBookingDto } from './dto/multi-guest-booking.dto';

@ApiTags('bookings')
@Controller('booking-requests')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly multiGuestBookingService: MultiGuestBookingService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all booking requests' })
  @ApiResponse({ status: 200, description: 'List of booking requests retrieved successfully' })
  async getAllBookingRequests(@Query() query: any) {
    const result = await this.bookingsService.findAll(query);
    
    // Return format expected by frontend
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({ status: 200, description: 'Booking statistics retrieved successfully' })
  async getBookingStats() {
    const stats = await this.bookingsService.getStats();
    
    // Return format expected by frontend
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending booking requests' })
  @ApiResponse({ status: 200, description: 'Pending bookings retrieved successfully' })
  async getPendingBookings() {
    const bookings = await this.bookingsService.getPendingBookings();
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: bookings
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
  async confirmMultiGuestBooking(@Param('id') id: string, @Body() body: { processedBy?: string }) {
    const result = await this.multiGuestBookingService.confirmBooking(id, body.processedBy);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post('multi-guest/:id/cancel')
  @ApiOperation({ summary: 'Cancel multi-guest booking' })
  @ApiResponse({ status: 200, description: 'Multi-guest booking cancelled successfully' })
  async cancelMultiGuestBooking(@Param('id') id: string, @Body() body: { reason: string; processedBy?: string }) {
    const result = await this.multiGuestBookingService.cancelBooking(id, body.reason, body.processedBy);
    
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
    const booking = await this.bookingsService.findOne(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: booking
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking request' })
  @ApiResponse({ status: 201, description: 'Booking request created successfully' })
  async createBookingRequest(@Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsService.create(createBookingDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: booking
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update booking request' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  async updateBookingRequest(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    const booking = await this.bookingsService.update(id, updateBookingDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: booking
    };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve booking request' })
  @ApiResponse({ status: 200, description: 'Booking approved successfully' })
  async approveBookingRequest(@Param('id') id: string, @Body() approvalDto: ApproveBookingDto) {
    const result = await this.bookingsService.approveBooking(id, approvalDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject booking request' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully' })
  async rejectBookingRequest(@Param('id') id: string, @Body() rejectionDto: RejectBookingDto) {
    const result = await this.bookingsService.rejectBooking(id, rejectionDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }


}