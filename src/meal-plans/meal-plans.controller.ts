import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  HttpStatus, 
  UseGuards,
  NotFoundException,
  BadRequestException,
  Optional
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { MealPlansService } from './meal-plans.service';
import { CreateMealPlanDto, UpdateMealPlanDto, CreateMealTimingDto } from './dto';
import { DayOfWeek } from './entities/meal-plan.entity';
import { GetHostelId, GetOptionalHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { FlexibleHostelAuthGuard } from '../auth/guards/flexible-hostel-auth.guard';
import { PublicBusinessIdGuard } from '../auth/guards/public-business-id.guard';
import { HostelService } from '../hostel/hostel.service';

@ApiTags('meal-plans')
@Controller('meal-plans')
export class MealPlansController {
  constructor(
    private readonly mealPlansService: MealPlansService, 
    private readonly hostelService: HostelService
  ) {}

  // ========================================
  // ADMIN ENDPOINTS (Protected - Uses Token)
  // ========================================

  @Get('admin')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all meal plans (Admin - Token required)' })
  @ApiResponse({ status: 200, description: 'List of meal plans retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getAdminAllMealPlans(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.findAll(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('admin/weekly')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get weekly meal plan (Admin - Token required)' })
  @ApiResponse({ status: 200, description: 'Weekly meal plan retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getAdminWeeklyMealPlan(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.getWeeklyMealPlan(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('admin/day/:day')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get meal plan for a specific day (Admin - Token required)' })
  @ApiParam({ name: 'day', enum: DayOfWeek, description: 'Day of the week' })
  @ApiResponse({ status: 200, description: 'Meal plan for the day retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getAdminMealPlanByDay(
    @GetHostelId() hostelId: string,
    @Param('day') day: DayOfWeek
  ) {
    const result = await this.mealPlansService.findByDay(day, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('admin/:id')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get meal plan by ID (Admin - Token required)' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getAdminMealPlan(
    @GetHostelId() hostelId: string,
    @Param('id') id: string
  ) {
    const result = await this.mealPlansService.findOne(id, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  // ========================================
  // PUBLIC ENDPOINTS (No Token - Uses businessId)
  // ========================================

  @Get('public')
  @UseGuards(PublicBusinessIdGuard)
  @ApiOperation({ summary: 'Get meal plan(s) (Public - businessId required, id optional)' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID for hostel lookup' })
  @ApiQuery({ name: 'id', required: false, description: 'Meal plan ID (optional - if provided, returns single meal plan)' })
  @ApiResponse({ status: 200, description: 'Meal plan(s) retrieved successfully' })
  @ApiResponse({ status: 400, description: 'businessId query parameter is required' })
  @ApiResponse({ status: 404, description: 'Hostel not found for the provided businessId' })
  async getPublicAllMealPlans(
    @GetHostelId() hostelId: string,
    @Query('id') id?: string
  ) {
    if (id) {
      // If id is provided, return single meal plan
      const result = await this.mealPlansService.findOne(id, hostelId);
      return {
        status: HttpStatus.OK,
        result: result
      };
    } else {
      // Return all meal plans with pagination format like rooms
      const result = await this.mealPlansService.findAll(hostelId);
      return {
        status: HttpStatus.OK,
        result: {
          items: result.items,
          mealTimingConfig: result.mealTimingConfig,
          pagination: {
            page: 1,
            limit: 20,
            total: result.total,
            totalPages: Math.ceil(result.total / 20)
          }
        }
      };
    }
  }

  @Get('public/weekly')
  @UseGuards(PublicBusinessIdGuard)
  @ApiOperation({ summary: 'Get weekly meal plan (Public - businessId required)' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID for hostel lookup' })
  @ApiResponse({ status: 200, description: 'Weekly meal plan retrieved successfully' })
  @ApiResponse({ status: 400, description: 'businessId query parameter is required' })
  @ApiResponse({ status: 404, description: 'Hostel not found for the provided businessId' })
  async getPublicWeeklyMealPlan(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.getWeeklyMealPlan(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('public/day/:day')
  @UseGuards(PublicBusinessIdGuard)
  @ApiOperation({ summary: 'Get meal plan for a specific day (Public - businessId required)' })
  @ApiParam({ name: 'day', enum: DayOfWeek, description: 'Day of the week' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID for hostel lookup' })
  @ApiResponse({ status: 200, description: 'Meal plan for the day retrieved successfully' })
  @ApiResponse({ status: 400, description: 'businessId query parameter is required' })
  @ApiResponse({ status: 404, description: 'Hostel not found for the provided businessId' })
  async getPublicMealPlanByDay(
    @GetHostelId() hostelId: string,
    @Param('day') day: DayOfWeek
  ) {
    const result = await this.mealPlansService.findByDay(day, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }



  @Post()
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new meal plan' })
  @ApiResponse({ status: 201, description: 'Meal plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Meal plan for this day already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async createMealPlan(
    @GetHostelId() hostelId: string,
    @Body() createMealPlanDto: CreateMealPlanDto
  ) {
    const result = await this.mealPlansService.create(createMealPlanDto, hostelId);

    return {
      status: HttpStatus.CREATED,
      result: result,
      message: 'Meal plan created successfully'
    };
  }

  @Post('upsert')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update meal plan (upsert)' })
  @ApiResponse({ status: 201, description: 'Meal plan created or updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async upsertMealPlan(
    @GetHostelId() hostelId: string,
    @Body() createMealPlanDto: CreateMealPlanDto
  ) {
    const result = await this.mealPlansService.upsertMealPlan(createMealPlanDto, hostelId);

    return {
      status: HttpStatus.CREATED,
      result: result,
      message: result.action === 'created' ? 'Meal plan created successfully' : 'Meal plan updated successfully'
    };
  }

  @Post('weekly')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update weekly meal plan (bulk operation)' })
  @ApiResponse({ status: 201, description: 'Weekly meal plan processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async createWeeklyMealPlan(
    @GetHostelId() hostelId: string,
    @Body() weeklyPlanData: CreateMealPlanDto[]
  ) {
    const result = await this.mealPlansService.bulkCreateWeeklyPlan(weeklyPlanData, hostelId);

    return {
      status: HttpStatus.CREATED,
      result: result,
      message: 'Weekly meal plan processed successfully'
    };
  }

  @Put(':id')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update meal plan' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  @ApiResponse({ status: 409, description: 'Meal plan for this day already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async updateMealPlan(
    @GetHostelId() hostelId: string,
    @Param('id') id: string,
    @Body() updateMealPlanDto: UpdateMealPlanDto
  ) {
    const result = await this.mealPlansService.update(id, updateMealPlanDto, hostelId);

    return {
      status: HttpStatus.OK,
      result: result,
      message: 'Meal plan updated successfully'
    };
  }

  @Delete(':id')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete meal plan' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async deleteMealPlan(
    @GetHostelId() hostelId: string,
    @Param('id') id: string
  ) {
    const result = await this.mealPlansService.remove(id, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  // ========================================
  // MEAL TIMING ENDPOINTS
  // ========================================

  @Get('timing/admin')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get meal timing (Admin - Token required)' })
  @ApiResponse({ status: 200, description: 'Meal timing retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getAdminMealTiming(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.getMealTiming(hostelId);
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('timing/public')
  @UseGuards(PublicBusinessIdGuard)
  @ApiOperation({ summary: 'Get meal timing (Public - businessId required)' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID for hostel lookup' })
  @ApiResponse({ status: 200, description: 'Meal timing retrieved successfully' })
  async getPublicMealTiming(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.getMealTiming(hostelId);
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Post('timing')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update meal timing (upsert)' })
  @ApiResponse({ status: 201, description: 'Meal timing saved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async upsertMealTiming(
    @GetHostelId() hostelId: string,
    @Body() dto: CreateMealTimingDto
  ) {
    const result = await this.mealPlansService.upsertMealTiming(dto, hostelId);
    return {
      status: HttpStatus.CREATED,
      result: result,
      message: result.action === 'created' ? 'Meal timing created successfully' : 'Meal timing updated successfully'
    };
  }

  @Delete('timing')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete meal timing' })
  @ApiResponse({ status: 200, description: 'Meal timing deleted successfully' })
  @ApiResponse({ status: 404, description: 'Meal timing not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async deleteMealTiming(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.deleteMealTiming(hostelId);
    return {
      status: HttpStatus.OK,
      result: result
    };
  }
}