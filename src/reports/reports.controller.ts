import { Controller, Get, Post, Body, Param, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { 
  GenerateReportDto, 
  GenerateOccupancyReportDto, 
  GenerateFinancialReportDto, 
  GenerateStudentReportDto, 
  GeneratePaymentReportDto, 
  GenerateLedgerReportDto 
} from './dto/generate-report.dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reports' })
  @ApiResponse({ status: 200, description: 'List of reports retrieved successfully' })
  async getAllReports(@GetHostelId() hostelId: string, @Query() query: any) {
    const result = await this.reportsService.findAll(query, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportById(@GetHostelId() hostelId: string, @Param('id') id: string) {
    const report = await this.reportsService.findOne(id, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: report
    };
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Get report data by ID' })
  @ApiResponse({ status: 200, description: 'Report data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportData(@GetHostelId() hostelId: string, @Param('id') id: string) {
    const reportData = await this.reportsService.getReportData(id, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: reportData
    };
  }

  @Post()
  @ApiOperation({ summary: 'Generate new report' })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  async generateReport(@GetHostelId() hostelId: string, @Body() generateReportDto: GenerateReportDto) {
    const report = await this.reportsService.generateReport(
      generateReportDto.type,
      generateReportDto.parameters || {},
      hostelId
    );
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: report
    };
  }

  @Post('generate/occupancy')
  @ApiOperation({ summary: 'Generate occupancy report' })
  @ApiResponse({ status: 200, description: 'Occupancy report generated successfully' })
  async generateOccupancyReport(@GetHostelId() hostelId: string, @Body() parameters: GenerateOccupancyReportDto = {}) {
    const report = await this.reportsService.generateReport('occupancy', parameters, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: report
    };
  }

  @Post('generate/financial')
  @ApiOperation({ summary: 'Generate financial report' })
  @ApiResponse({ status: 200, description: 'Financial report generated successfully' })
  async generateFinancialReport(@GetHostelId() hostelId: string, @Body() parameters: GenerateFinancialReportDto = {}) {
    const report = await this.reportsService.generateReport('financial', parameters, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: report
    };
  }

  @Post('generate/student')
  @ApiOperation({ summary: 'Generate student report' })
  @ApiResponse({ status: 200, description: 'Student report generated successfully' })
  async generateStudentReport(@GetHostelId() hostelId: string, @Body() parameters: GenerateStudentReportDto = {}) {
    const report = await this.reportsService.generateReport('student', parameters, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: report
    };
  }

  @Post('generate/payment')
  @ApiOperation({ summary: 'Generate payment report' })
  @ApiResponse({ status: 200, description: 'Payment report generated successfully' })
  async generatePaymentReport(@GetHostelId() hostelId: string, @Body() parameters: GeneratePaymentReportDto = {}) {
    const report = await this.reportsService.generateReport('payment', parameters, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: report
    };
  }

  @Post('generate/ledger')
  @ApiOperation({ summary: 'Generate ledger report' })
  @ApiResponse({ status: 200, description: 'Ledger report generated successfully' })
  async generateLedgerReport(@GetHostelId() hostelId: string, @Body() parameters: GenerateLedgerReportDto = {}) {
    const report = await this.reportsService.generateReport('ledger', parameters, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: report
    };
  }
}