import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlaygroundService, PlaygroundDataMode } from './playground.service';

@ApiTags('Playground')
@Controller('playground')
export class PlaygroundController {
  constructor(private readonly playgroundService: PlaygroundService) {}

  @Get('beds/with-hostels')
  @ApiOperation({ summary: 'Preview beds + hostels via sample or real dataset' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['sample', 'real'],
    description: 'Force sample data or fetch real DB data when available'
  })
  @ApiResponse({
    status: 200,
    description: 'Available beds and hostels retrieved successfully'
  })
  async getBedsWithHostels(@Query('mode') mode?: PlaygroundDataMode) {
    const data = await this.playgroundService.getBedsWithHostels({ mode });
    return {
      status: HttpStatus.OK,
      data
    };
  }
}
