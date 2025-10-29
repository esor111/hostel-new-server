import { Controller, Get, Post, Put, Body, Param, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerV2Service } from '../ledger-v2/services/ledger-v2.service';
import { CreateAdjustmentDto } from './dto/create-ledger-entry.dto';
import { ReversalDto } from './dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('ledger')
@Controller('ledgers')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class LedgerController {
  constructor(private readonly ledgerService: LedgerV2Service) {}

  @Get()
  @ApiOperation({ summary: 'Get all ledger entries' })
  @ApiResponse({ status: 200, description: 'List of ledger entries retrieved successfully' })
  async getAllLedgerEntries(@GetHostelId() hostelId: string, @Query() query: any) {
    const result = await this.ledgerService.findAll(query, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get ledger statistics' })
  @ApiResponse({ status: 200, description: 'Ledger statistics retrieved successfully' })
  async getLedgerStats(@GetHostelId() hostelId: string) {
    const stats = await this.ledgerService.getStats(hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      stats: stats
    };
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get student ledger entries' })
  @ApiResponse({ status: 200, description: 'Student ledger retrieved successfully' })
  async getStudentLedger(@GetHostelId() hostelId: string, @Param('studentId') studentId: string) {
    const entries = await this.ledgerService.findByStudentId(studentId, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: entries
    };
  }

  @Get('student/:studentId/balance')
  @ApiOperation({ summary: 'Get student current balance' })
  @ApiResponse({ status: 200, description: 'Student balance retrieved successfully' })
  async getStudentBalance(@GetHostelId() hostelId: string, @Param('studentId') studentId: string) {
    const balance = await this.ledgerService.getStudentBalance(studentId, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: balance
    };
  }

  @Post('adjustment')
  @ApiOperation({ summary: 'Create balance adjustment entry' })
  @ApiResponse({ status: 201, description: 'Adjustment entry created successfully' })
  async createAdjustment(@GetHostelId() hostelId: string, @Body() adjustmentDto: CreateAdjustmentDto) {
    const entry = await this.ledgerService.createAdjustmentEntry({
      studentId: adjustmentDto.studentId,
      amount: adjustmentDto.amount,
      description: adjustmentDto.description,
      type: adjustmentDto.type
    }, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: entry
    };
  }

  @Post(':entryId/reverse')
  @ApiOperation({ summary: 'Reverse a ledger entry' })
  @ApiResponse({ status: 200, description: 'Ledger entry reversed successfully' })
  async reverseEntry(@GetHostelId() hostelId: string, @Param('entryId') entryId: string, @Body() reversalDto: ReversalDto) {
    const result = await this.ledgerService.reverseEntry(
      entryId,
      reversalDto.reversedBy || 'admin',
      reversalDto.reason || 'Manual reversal',
      hostelId
    );
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post('student-charge-counts')
  @ApiOperation({ summary: 'Get charge counts for multiple students (bulk operation)' })
  @ApiResponse({ status: 200, description: 'Student charge counts retrieved successfully' })
  async getStudentChargeCounts(@GetHostelId() hostelId: string, @Body() body: { studentIds: string[] }) {
    const chargeCounts = await this.ledgerService.getStudentChargeCounts(body.studentIds, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: chargeCounts
    };
  }

  // @Post('fix-undefined-descriptions')
  // @ApiOperation({ summary: 'Fix existing ledger entries with undefined descriptions' })
  // @ApiResponse({ status: 200, description: 'Undefined descriptions fixed successfully' })
  // async fixUndefinedDescriptions() {
  //   // This method is not available in LedgerV2Service
  //   // LedgerV2 ensures proper descriptions from the start
  //   return {
  //     status: HttpStatus.OK,
  //     message: 'LedgerV2 ensures proper descriptions - no fix needed',
  //     data: { fixed: 0, errors: [] }
  //   };
  // }
}