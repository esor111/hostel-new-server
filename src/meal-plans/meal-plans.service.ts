import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlan, DayOfWeek } from './entities/meal-plan.entity';
import { CreateMealPlanDto, UpdateMealPlanDto } from './dto';
import { HostelScopedService } from '../common/services/hostel-scoped.service';

@Injectable()
export class MealPlansService extends HostelScopedService<MealPlan> {
  constructor(
    @InjectRepository(MealPlan)
    private mealPlanRepository: Repository<MealPlan>,
  ) {
    super(mealPlanRepository, 'MealPlan');
  }

  async findAll(hostelId?: string) {
    try {
      this.logger.debug(`Finding all meal plans for hostelId: ${hostelId}`);
      
      const queryBuilder = this.mealPlanRepository.createQueryBuilder('mealPlan')
        .leftJoinAndSelect('mealPlan.hostel', 'hostel')
        .where('mealPlan.isActive = :isActive', { isActive: true });

      // Conditional hostel filtering - if hostelId provided, filter by it; if not, return all data
      if (hostelId) {
        queryBuilder.andWhere('mealPlan.hostelId = :hostelId', { hostelId });
      }

      // Order by day of week (Sunday = 0, Monday = 1, etc.)
      queryBuilder.orderBy(
        `CASE mealPlan.day 
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END`,
        'ASC'
      );

      const mealPlans = await queryBuilder.getMany();
      
      this.logger.debug(`Found ${mealPlans.length} meal plans`);

      return {
        items: mealPlans,
        total: mealPlans.length
      };
    } catch (error) {
      this.logger.error(`Error in findAll for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  async findOne(id: string, hostelId?: string) {
    // Build where condition conditionally
    const whereCondition: any = { id, isActive: true };
    if (hostelId) {
      whereCondition.hostelId = hostelId;
    }

    const mealPlan = await this.mealPlanRepository.findOne({
      where: whereCondition,
      relations: ['hostel']
    });

    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    return mealPlan;
  }

  async findByDay(day: DayOfWeek, hostelId?: string, includeInactive: boolean = false) {
    // Build where condition conditionally
    const whereCondition: any = { day };
    
    // Only filter by isActive if we don't want to include inactive records
    if (!includeInactive) {
      whereCondition.isActive = true;
    }
    
    if (hostelId) {
      whereCondition.hostelId = hostelId;
    }

    const mealPlan = await this.mealPlanRepository.findOne({
      where: whereCondition,
      relations: ['hostel']
    });

    return mealPlan;
  }

  async create(createMealPlanDto: CreateMealPlanDto, hostelId?: string) {
    // If hostelId is not provided, we need to get it from the authenticated user's businessId
    if (!hostelId) {
      throw new Error('Hostel context is required for meal plan creation. Please ensure you are authenticated with a Business Token.');
    }

    // Check if meal plan for this day already exists for this hostel (including inactive ones)
    const existingMealPlan = await this.findByDay(createMealPlanDto.day, hostelId, true);
    if (existingMealPlan) {
      throw new ConflictException(`Meal plan for ${createMealPlanDto.day} already exists for this hostel`);
    }

    // Create meal plan entity with hostelId
    // Default isActive to true - only set to false if explicitly passed as false
    const mealPlan = this.mealPlanRepository.create({
      ...createMealPlanDto,
      hostelId: hostelId,
      isActive: createMealPlanDto.isActive === false ? false : true
    });

    const savedMealPlan = await this.mealPlanRepository.save(mealPlan);

    return savedMealPlan;
  }

  async update(id: string, updateMealPlanDto: UpdateMealPlanDto, hostelId?: string) {
    const mealPlan = await this.findOne(id, hostelId);

    // If updating the day, check for conflicts
    if (updateMealPlanDto.day && updateMealPlanDto.day !== mealPlan.day) {
      const existingMealPlan = await this.findByDay(updateMealPlanDto.day, hostelId, true);
      if (existingMealPlan && existingMealPlan.id !== id) {
        throw new ConflictException(`Meal plan for ${updateMealPlanDto.day} already exists for this hostel`);
      }
    }

    // Update the meal plan
    await this.mealPlanRepository.update(id, updateMealPlanDto);

    return this.findOne(id, hostelId);
  }

  async remove(id: string, hostelId?: string) {
    const mealPlan = await this.findOne(id, hostelId);

    // Soft delete by setting isActive to false
    await this.mealPlanRepository.update(id, { isActive: false });

    return { message: 'Meal plan deleted successfully' };
  }

  async getWeeklyMealPlan(hostelId?: string) {
    try {
      this.logger.debug(`Getting weekly meal plan for hostelId: ${hostelId}`);
      
      const allMealPlans = await this.findAll(hostelId);
      
      this.logger.debug(`Found ${allMealPlans.items.length} meal plans`);
      
      // Create a map for easy access by day
      const mealPlanMap = new Map();
      allMealPlans.items.forEach(plan => {
        mealPlanMap.set(plan.day, plan);
      });

      // Create weekly structure with all days
      const weeklyPlan = Object.values(DayOfWeek).map(day => {
        const mealPlan = mealPlanMap.get(day);
        return mealPlan || {
          day,
          breakfast: 'Not planned',
          lunch: 'Not planned',
          snacks: 'Not planned',
          dinner: 'Not planned',
          notes: null,
          isActive: false
        };
      });

      this.logger.debug(`Generated weekly plan with ${weeklyPlan.length} days`);

      return {
        weeklyPlan,
        totalDaysPlanned: allMealPlans.items.length
      };
    } catch (error) {
      this.logger.error(`Error in getWeeklyMealPlan for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  async bulkCreateWeeklyPlan(weeklyPlanData: CreateMealPlanDto[], hostelId?: string) {
    if (!hostelId) {
      throw new Error('Hostel context is required for meal plan creation. Please ensure you are authenticated with a Business Token.');
    }

    const results = [];
    const errors = [];

    for (const dayPlan of weeklyPlanData) {
      try {
        // Check if meal plan for this day already exists (including inactive ones)
        const existingMealPlan = await this.findByDay(dayPlan.day, hostelId, true);
        
        if (existingMealPlan) {
          // Update existing meal plan
          const updated = await this.update(existingMealPlan.id, dayPlan, hostelId);
          results.push({ day: dayPlan.day, action: 'updated', data: updated });
        } else {
          // Create new meal plan
          const created = await this.create(dayPlan, hostelId);
          results.push({ day: dayPlan.day, action: 'created', data: created });
        }
      } catch (error) {
        errors.push({ day: dayPlan.day, error: error.message });
      }
    }

    return {
      results,
      errors,
      totalProcessed: weeklyPlanData.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }
}