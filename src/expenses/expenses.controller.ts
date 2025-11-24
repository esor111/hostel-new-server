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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('expenses')
@Controller('expenses')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  async create(
    @GetHostelId() hostelId: string,
    @Body(ValidationPipe) createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.expensesService.create(
        createExpenseDto,
        hostelId,
        user.id,
      );
      return {
        success: true,
        data: result,
        message: 'Expense created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Get()
  async findAll(
    @GetHostelId() hostelId: string,
    @Query(ValidationPipe) filters: ExpenseFilterDto,
  ) {
    try {
      const result = await this.expensesService.findAll(filters, hostelId);
      return {
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Expenses retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  @Get('categories')
  async getCategories(@GetHostelId() hostelId: string) {
    try {
      const result = await this.expensesService.getCategories(hostelId);
      return {
        success: true,
        data: result,
        message: 'Categories retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  @Get('dashboard/summary')
  async getDashboardSummary(
    @GetHostelId() hostelId: string,
    @Query('month') month?: string,
  ) {
    try {
      const result = await this.expensesService.getDashboardSummary(hostelId, month);
      return {
        success: true,
        data: result,
        message: 'Dashboard summary retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  @Get(':id')
  async findOne(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      const result = await this.expensesService.findOne(id, hostelId);
      return {
        success: true,
        data: result,
        message: 'Expense retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
  }

  @Patch(':id')
  async update(
    @GetHostelId() hostelId: string,
    @Param('id') id: string,
    @Body(ValidationPipe) updateExpenseDto: UpdateExpenseDto,
  ) {
    try {
      const result = await this.expensesService.update(id, updateExpenseDto, hostelId);
      return {
        success: true,
        data: result,
        message: 'Expense updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Delete(':id')
  async remove(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      await this.expensesService.remove(id, hostelId);
      return {
        success: true,
        message: 'Expense deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }
}
