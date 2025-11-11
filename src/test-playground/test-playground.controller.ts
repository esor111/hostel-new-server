import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TestPlaygroundService } from './test-playground.service';

@ApiTags('Test Playground')
@Controller('test-playground')
export class TestPlaygroundController {
  constructor(private readonly testPlaygroundService: TestPlaygroundService) {}

  @Get('beds/with-hostels')
  @ApiOperation({ summary: 'Get all available beds with hostel information (Test Endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Available beds and hostels retrieved successfully'
  })
  async getBedsWithHostels() {
    const data = await this.testPlaygroundService.getAllBedsWithHostels();
    return {
      status: HttpStatus.OK,
      data
    };
  }
}
