import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminChargesService } from './admin-charges.service';
import { CreateAdminChargeDto } from './dto/create-admin-charge.dto';
import { UpdateAdminChargeDto } from './dto/update-admin-charge.dto';
import { AdminChargeStatus } from './entities/admin-charge.entity';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('admin-charges')
@Controller('admin-charges')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class AdminChargesController {
  constructor(private readonly adminChargesService: AdminChargesService) {}

  @Post()
  async create(@GetHostelId() hostelId: string, @Body(ValidationPipe) createAdminChargeDto: CreateAdminChargeDto, @Req() req: any) {
    try {
      // 🔔 NEW: Pass admin JWT for charge notifications
      const adminJwt = req.user; // JWT payload from auth guard
      const result = await this.adminChargesService.create(createAdminChargeDto, hostelId, adminJwt);
      return {
        success: true,
        data: result,
        message: 'Admin charge created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Get()
  async findAll(
    @GetHostelId() hostelId: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: AdminChargeStatus,
    @Query('chargeType') chargeType?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const filters = {
        studentId,
        status,
        chargeType,
        category,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
      };
      
      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );
      
      const result = await this.adminChargesService.findAll(filters, hostelId);
      return {
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Admin charges retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('stats')
  async getStats(@GetHostelId() hostelId: string) {
    try {
      const result = await this.adminChargesService.getChargeStats(hostelId);
      return {
        success: true,
        data: result,
        message: 'Admin charge statistics retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('overdue-students')
  async getOverdueStudents(@GetHostelId() hostelId: string) {
    try {
      const result = await this.adminChargesService.getOverdueStudents(hostelId);
      return {
        success: true,
        data: result,
        message: 'Overdue students retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('today-summary')
  async getTodaySummary(@GetHostelId() hostelId: string) {
    try {
      const result = await this.adminChargesService.getTodaySummary(hostelId);
      return {
        success: true,
        data: result,
        message: 'Today\'s summary retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('student/:studentId')
  async getChargesByStudent(@GetHostelId() hostelId: string, @Param('studentId') studentId: string) {
    try {
      const result = await this.adminChargesService.getChargesByStudent(studentId, hostelId);
      return {
        success: true,
        data: result,
        message: 'Student charges retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND
      };
    }
  }

  @Get(':id')
  async findOne(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      const result = await this.adminChargesService.findOne(id, hostelId);
      return {
        success: true,
        data: result,
        message: 'Admin charge retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND
      };
    }
  }

  @Patch(':id')
  async update(
    @GetHostelId() hostelId: string,
    @Param('id') id: string, 
    @Body(ValidationPipe) updateAdminChargeDto: UpdateAdminChargeDto
  ) {
    try {
      const result = await this.adminChargesService.update(id, updateAdminChargeDto, hostelId);
      return {
        success: true,
        data: result,
        message: 'Admin charge updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Post(':id/apply')
  async applyCharge(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      const result = await this.adminChargesService.applyCharge(id, hostelId);
      return {
        success: true,
        data: result,
        message: 'Admin charge applied successfully'
      };
    } catch (error) {
      throw error; // Let NestJS handle the error properly
    }
  }

  @Post(':id/cancel')
  async cancelCharge(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      const result = await this.adminChargesService.cancelCharge(id, hostelId);
      return {
        success: true,
        data: result,
        message: 'Admin charge cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Delete(':id')
  async remove(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      await this.adminChargesService.remove(id, hostelId);
      return {
        success: true,
        message: 'Admin charge deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Post('apply-to-students')
  async applyChargeToStudents(@GetHostelId() hostelId: string, @Body() applyData: { chargeId: string; studentIds: string[]; notes?: string }) {
    try {
      // For now, we'll apply individual charges to each student
      // This could be enhanced to create a single charge and apply to multiple students
      const results = [];
      for (const studentId of applyData.studentIds) {
        const result = await this.adminChargesService.applyCharge(applyData.chargeId, hostelId);
        results.push(result);
      }
      
      return {
        success: true,
        data: results,
        message: 'Charges applied to students successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Patch('bulk-update')
  async bulkUpdateCharges(@GetHostelId() hostelId: string, @Body() bulkData: { chargeIds: string[]; updateData: UpdateAdminChargeDto }) {
    try {
      const results = [];
      for (const chargeId of bulkData.chargeIds) {
        const result = await this.adminChargesService.update(chargeId, bulkData.updateData, hostelId);
        results.push(result);
      }
      
      return {
        success: true,
        data: results,
        message: 'Charges updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Post('bulk-delete')
  async bulkDeleteCharges(@GetHostelId() hostelId: string, @Body() bulkData: { chargeIds: string[] }) {
    try {
      for (const chargeId of bulkData.chargeIds) {
        await this.adminChargesService.remove(chargeId, hostelId);
      }
      
      return {
        success: true,
        message: 'Charges deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }
}