import { Controller, Post, Get, Delete, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { SeedCustomDataDto } from './dto';

@ApiTags('database-seeding')
@Controller('api/v1/seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('status')
  async getSeedStatus() {
    try {
      const status = await this.seedService.checkSeedStatus();
      return {
        status: 200,
        message: 'Seed status retrieved successfully',
        data: status
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to get seed status',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('all')
  async seedAll(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedAll(forceReseed);
      
      return {
        status: 201,
        message: 'Database seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed database',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('buildings')
  async seedBuildings(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedBuildings(forceReseed);
      
      return {
        status: 201,
        message: 'Buildings seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed buildings',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('room-types')
  async seedRoomTypes(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedRoomTypes(forceReseed);
      
      return {
        status: 201,
        message: 'Room types seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed room types',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('amenities')
  async seedAmenities(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedAmenities(forceReseed);
      
      return {
        status: 201,
        message: 'Amenities seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed amenities',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('rooms')
  async seedRooms(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedRooms(forceReseed);
      
      return {
        status: 201,
        message: 'Rooms seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed rooms',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('students')
  async seedStudents(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedStudents(forceReseed);
      
      return {
        status: 201,
        message: 'Students seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed students',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('invoices')
  async seedInvoices(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedInvoices(forceReseed);
      
      return {
        status: 201,
        message: 'Invoices seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed invoices',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('payments')
  async seedPayments(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedPayments(forceReseed);
      
      return {
        status: 201,
        message: 'Payments seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed payments',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('discounts')
  async seedDiscounts(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedDiscounts(forceReseed);
      
      return {
        status: 201,
        message: 'Discounts seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed discounts',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('room-occupants')
  async seedRoomOccupants(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedRoomOccupants(forceReseed);
      
      return {
        status: 201,
        message: 'Room occupants seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed room occupants',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('discount-types')
  async seedDiscountTypes(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedDiscountTypes(forceReseed);
      
      return {
        status: 201,
        message: 'Discount types seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed discount types',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('payment-allocations')
  async seedPaymentAllocations(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedPaymentAllocations(forceReseed);
      
      return {
        status: 201,
        message: 'Payment allocations seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed payment allocations',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ledger-entries')
  async seedLedgerEntries(@Query('force') force?: string) {
    try {
      const forceReseed = force === 'true';
      const result = await this.seedService.seedLedgerEntries(forceReseed);
      
      return {
        status: 201,
        message: 'Ledger entries seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed ledger entries',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Temporarily disabled during BookingRequest entity removal
  // @Post('bookings')
  // async seedBookings(@Query('force') force?: string) {
  //   try {
  //     const forceReseed = force === 'true';
  //     const result = await this.seedService.seedBookings(forceReseed);
  //     
  //     return {
  //       status: 201,
  //       message: 'Booking requests seeded successfully',
  //       data: result
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         status: 500,
  //         message: 'Failed to seed booking requests',
  //         error: error.message
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR
  //     );
  //   }
  // }

  @Post('custom')
  @ApiOperation({ summary: 'Seed custom data into the database' })
  @ApiResponse({ status: 201, description: 'Custom data seeded successfully' })
  async seedCustomData(@Body() seedData: SeedCustomDataDto) {
    try {
      const result = await this.seedService.seedCustomData(seedData);
      
      return {
        status: 201,
        message: 'Custom data seeded successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to seed custom data',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('all')
  async clearAllData(@Query('confirm') confirm?: string) {
    if (confirm !== 'yes') {
      throw new HttpException(
        {
          status: 400,
          message: 'Please add ?confirm=yes to confirm data deletion',
          error: 'Confirmation required'
        },
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const result = await this.seedService.clearAllData();
      
      return {
        status: 200,
        message: 'All data cleared successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: 'Failed to clear data',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':entity')
  async clearEntityData(@Query('entity') entity: string, @Query('confirm') confirm?: string) {
    if (confirm !== 'yes') {
      throw new HttpException(
        {
          status: 400,
          message: 'Please add ?confirm=yes to confirm data deletion',
          error: 'Confirmation required'
        },
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const result = await this.seedService.clearEntityData(entity);
      
      return {
        status: 200,
        message: `${entity} data cleared successfully`,
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 500,
          message: `Failed to clear ${entity} data`,
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}