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
  UseGuards 
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
import { CreateMealPlanDto, UpdateMealPlanDto } from './dto';
import { DayOfWeek } from './entities/meal-plan.entity';
import { GetOptionalHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthGuard } from '../auth/guards/hostel-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('meal-plans')
@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all meal plans' })
  @ApiResponse({ status: 200, description: 'List of meal plans retrieved successfully' })
  async getAllMealPlans(@GetOptionalHostelId() hostelId?: string) {
    const result = await this.mealPlansService.findAll(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('weekly')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get weekly meal plan (all 7 days)' })
  @ApiResponse({ status: 200, description: 'Weekly meal plan retrieved successfully' })
  async getWeeklyMealPlan(@GetOptionalHostelId() hostelId?: string) {
    const result = await this.mealPlansService.getWeeklyMealPlan(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('day/:day')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get meal plan for a specific day' })
  @ApiParam({ name: 'day', enum: DayOfWeek, description: 'Day of the week' })
  @ApiResponse({ status: 200, description: 'Meal plan for the day retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found for the specified day' })
  async getMealPlanByDay(
    @Param('day') day: DayOfWeek,
    @GetOptionalHostelId() hostelId?: string
  ) {
    const result = await this.mealPlansService.findByDay(day, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get meal plan by ID' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  async getMealPlan(
    @Param('id') id: string,
    @GetOptionalHostelId() hostelId?: string
  ) {
    const result = await this.mealPlansService.findOne(id, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Post()
  @UseGuards(HostelAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new meal plan' })
  @ApiResponse({ status: 201, description: 'Meal plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Meal plan for this day already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async createMealPlan(
    @Body() createMealPlanDto: CreateMealPlanDto,
    @GetOptionalHostelId() hostelId?: string
  ) {
    const result = await this.mealPlansService.create(createMealPlanDto, hostelId);

    return {
      status: HttpStatus.CREATED,
      result: result,
      message: 'Meal plan created successfully'
    };
  }

  @Post('weekly')
  @UseGuards(HostelAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update weekly meal plan (bulk operation)' })
  @ApiResponse({ status: 201, description: 'Weekly meal plan processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async createWeeklyMealPlan(
    @Body() weeklyPlanData: CreateMealPlanDto[],
    @GetOptionalHostelId() hostelId?: string
  ) {
    const result = await this.mealPlansService.bulkCreateWeeklyPlan(weeklyPlanData, hostelId);

    return {
      status: HttpStatus.CREATED,
      result: result,
      message: 'Weekly meal plan processed successfully'
    };
  }

  @Put(':id')
  @UseGuards(HostelAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update meal plan' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  @ApiResponse({ status: 409, description: 'Meal plan for this day already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async updateMealPlan(
    @Param('id') id: string,
    @Body() updateMealPlanDto: UpdateMealPlanDto,
    @GetOptionalHostelId() hostelId?: string
  ) {
    const result = await this.mealPlansService.update(id, updateMealPlanDto, hostelId);

    return {
      status: HttpStatus.OK,
      result: result,
      message: 'Meal plan updated successfully'
    };
  }

  @Delete(':id')
  @UseGuards(HostelAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete meal plan' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async deleteMealPlan(
    @Param('id') id: string,
    @GetOptionalHostelId() hostelId?: string
  ) {
    const result = await this.mealPlansService.remove(id, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }
}