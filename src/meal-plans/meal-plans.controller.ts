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
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('meal-plans')
@Controller('meal-plans')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all meal plans' })
  @ApiResponse({ status: 200, description: 'List of meal plans retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getAllMealPlans(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.findAll(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly meal plan (all 7 days)' })
  @ApiResponse({ status: 200, description: 'Weekly meal plan retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getWeeklyMealPlan(@GetHostelId() hostelId: string) {
    const result = await this.mealPlansService.getWeeklyMealPlan(hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('day/:day')
  @ApiOperation({ summary: 'Get meal plan for a specific day' })
  @ApiParam({ name: 'day', enum: DayOfWeek, description: 'Day of the week' })
  @ApiResponse({ status: 200, description: 'Meal plan for the day retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found for the specified day' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getMealPlanByDay(
    @GetHostelId() hostelId: string,
    @Param('day') day: DayOfWeek
  ) {
    const result = await this.mealPlansService.findByDay(day, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meal plan by ID' })
  @ApiParam({ name: 'id', description: 'Meal plan ID' })
  @ApiResponse({ status: 200, description: 'Meal plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Business token required' })
  async getMealPlan(
    @GetHostelId() hostelId: string,
    @Param('id') id: string
  ) {
    const result = await this.mealPlansService.findOne(id, hostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Post()
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

  @Post('weekly')
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
}