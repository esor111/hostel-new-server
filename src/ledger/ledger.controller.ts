import { Controller, Get, Post, Put, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { CreateAdjustmentDto } from './dto/create-ledger-entry.dto';
import { ReversalDto } from './dto';

@ApiTags('ledger')
@Controller('ledgers')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all ledger entries' })
  @ApiResponse({ status: 200, description: 'List of ledger entries retrieved successfully' })
  async getAllLedgerEntries(@Query() query: any) {
    const result = await this.ledgerService.findAll(query);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get ledger statistics' })
  @ApiResponse({ status: 200, description: 'Ledger statistics retrieved successfully' })
  async getLedgerStats() {
    const stats = await this.ledgerService.getStats();
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      stats: stats
    };
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get student ledger entries' })
  @ApiResponse({ status: 200, description: 'Student ledger retrieved successfully' })
  async getStudentLedger(@Param('studentId') studentId: string) {
    const entries = await this.ledgerService.findByStudentId(studentId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: entries
    };
  }

  @Get('student/:studentId/balance')
  @ApiOperation({ summary: 'Get student current balance' })
  @ApiResponse({ status: 200, description: 'Student balance retrieved successfully' })
  async getStudentBalance(@Param('studentId') studentId: string) {
    const balance = await this.ledgerService.getStudentBalance(studentId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: balance
    };
  }

  @Post('adjustment')
  @ApiOperation({ summary: 'Create balance adjustment entry' })
  @ApiResponse({ status: 201, description: 'Adjustment entry created successfully' })
  async createAdjustment(@Body() adjustmentDto: CreateAdjustmentDto) {
    const entry = await this.ledgerService.createAdjustmentEntry(
      adjustmentDto.studentId,
      adjustmentDto.amount,
      adjustmentDto.description,
      adjustmentDto.type
    );
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: entry
    };
  }

  @Post(':entryId/reverse')
  @ApiOperation({ summary: 'Reverse a ledger entry' })
  @ApiResponse({ status: 200, description: 'Ledger entry reversed successfully' })
  async reverseEntry(@Param('entryId') entryId: string, @Body() reversalDto: ReversalDto) {
    const result = await this.ledgerService.reverseEntry(
      entryId,
      reversalDto.reversedBy,
      reversalDto.reason
    );
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }
}