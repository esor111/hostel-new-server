import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlan, DayOfWeek } from './entities/meal-plan.entity';
import { MealTiming } from './entities/meal-timing.entity';
import { CreateMealPlanDto, UpdateMealPlanDto, CreateMealTimingDto, UpdateMealTimingDto } from './dto';
import { HostelScopedService } from '../common/services/hostel-scoped.service';

@Injectable()
export class MealPlansService extends HostelScopedService<MealPlan> {
  constructor(
    @InjectRepository(MealPlan)
    private mealPlanRepository: Repository<MealPlan>,
    @InjectRepository(MealTiming)
    private mealTimingRepository: Repository<MealTiming>,
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
      
      // Get meal timing configuration for the hostel
      let mealTimingConfig = null;
      if (hostelId) {
        mealTimingConfig = await this.getMealTiming(hostelId);
      }

      // Transform meal plans to include structured timing data
      const itemsWithTiming = mealPlans.map(plan => ({
        ...plan,
        mealTimings: mealTimingConfig ? {
          breakfast: {
            start: mealTimingConfig.breakfastStart || null,
            end: mealTimingConfig.breakfastEnd || null
          },
          lunch: {
            start: mealTimingConfig.lunchStart || null,
            end: mealTimingConfig.lunchEnd || null
          },
          snacks: {
            start: mealTimingConfig.snacksStart || null,
            end: mealTimingConfig.snacksEnd || null
          },
          dinner: {
            start: mealTimingConfig.dinnerStart || null,
            end: mealTimingConfig.dinnerEnd || null
          }
        } : null
      }));
      
      this.logger.debug(`Found ${mealPlans.length} meal plans with timing data`);

      return {
        items: itemsWithTiming,
        total: mealPlans.length,
        mealTimingConfig: mealTimingConfig
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

    // Get meal timing configuration for the hostel
    let mealTimingConfig = null;
    if (hostelId || mealPlan.hostelId) {
      mealTimingConfig = await this.getMealTiming(hostelId || mealPlan.hostelId);
    }

    // Add structured timing data to the meal plan
    const mealPlanWithTiming = {
      ...mealPlan,
      mealTimings: mealTimingConfig ? {
        breakfast: {
          start: mealTimingConfig.breakfastStart || null,
          end: mealTimingConfig.breakfastEnd || null
        },
        lunch: {
          start: mealTimingConfig.lunchStart || null,
          end: mealTimingConfig.lunchEnd || null
        },
        snacks: {
          start: mealTimingConfig.snacksStart || null,
          end: mealTimingConfig.snacksEnd || null
        },
        dinner: {
          start: mealTimingConfig.dinnerStart || null,
          end: mealTimingConfig.dinnerEnd || null
        }
      } : null
    };

    return mealPlanWithTiming;
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

    if (!mealPlan) {
      return null;
    }

    // Get meal timing configuration for the hostel
    let mealTimingConfig = null;
    if (hostelId || mealPlan.hostelId) {
      mealTimingConfig = await this.getMealTiming(hostelId || mealPlan.hostelId);
    }

    // Add structured timing data to the meal plan
    const mealPlanWithTiming = {
      ...mealPlan,
      mealTimings: mealTimingConfig ? {
        breakfast: {
          start: mealTimingConfig.breakfastStart || null,
          end: mealTimingConfig.breakfastEnd || null
        },
        lunch: {
          start: mealTimingConfig.lunchStart || null,
          end: mealTimingConfig.lunchEnd || null
        },
        snacks: {
          start: mealTimingConfig.snacksStart || null,
          end: mealTimingConfig.snacksEnd || null
        },
        dinner: {
          start: mealTimingConfig.dinnerStart || null,
          end: mealTimingConfig.dinnerEnd || null
        }
      } : null
    };

    return mealPlanWithTiming;
  }

  async create(createMealPlanDto: CreateMealPlanDto, hostelId?: string) {
    // If hostelId is not provided, we need to get it from the authenticated user's businessId
    if (!hostelId) {
      throw new Error('Hostel context is required for meal plan creation. Please ensure you are authenticated with a Business Token.');
    }

    // Check if meal plan for this day already exists for this hostel (including inactive ones)
    const existingMealPlan = await this.findMealPlanByDay(createMealPlanDto.day, hostelId, true);
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

  // Internal method to find meal plan by day without timing data (for operations)
  private async findMealPlanByDay(day: DayOfWeek, hostelId: string, includeInactive: boolean = false) {
    const whereCondition: any = { day, hostelId };
    
    if (!includeInactive) {
      whereCondition.isActive = true;
    }

    return await this.mealPlanRepository.findOne({
      where: whereCondition,
      relations: ['hostel']
    });
  }

  async upsertMealPlan(createMealPlanDto: CreateMealPlanDto, hostelId?: string) {
    if (!hostelId) {
      throw new Error('Hostel context is required for meal plan creation. Please ensure you are authenticated with a Business Token.');
    }

    // Check if meal plan for this day already exists for this hostel (including inactive ones)
    const existingMealPlan = await this.findMealPlanByDay(createMealPlanDto.day, hostelId, true);
    
    if (existingMealPlan) {
      // Update existing meal plan
      const updated = await this.update(existingMealPlan.id, createMealPlanDto, hostelId);
      return {
        ...updated,
        action: 'updated'
      };
    } else {
      // Create new meal plan
      const created = await this.create(createMealPlanDto, hostelId);
      return {
        ...created,
        action: 'created'
      };
    }
  }

  async update(id: string, updateMealPlanDto: UpdateMealPlanDto, hostelId?: string) {
    // Find meal plan without timing data for update operations
    const whereCondition: any = { id };
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

    // If updating the day, check for conflicts
    if (updateMealPlanDto.day && updateMealPlanDto.day !== mealPlan.day) {
      const existingMealPlan = await this.findMealPlanByDay(updateMealPlanDto.day, hostelId, true);
      if (existingMealPlan && existingMealPlan.id !== id) {
        throw new ConflictException(`Meal plan for ${updateMealPlanDto.day} already exists for this hostel`);
      }
    }

    // Update the meal plan
    await this.mealPlanRepository.update(id, updateMealPlanDto);

    // Return the updated meal plan with timing data
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

      // Get default timing structure for days without meal plans
      const defaultTiming = allMealPlans.mealTimingConfig ? {
        breakfast: {
          start: allMealPlans.mealTimingConfig.breakfastStart || null,
          end: allMealPlans.mealTimingConfig.breakfastEnd || null
        },
        lunch: {
          start: allMealPlans.mealTimingConfig.lunchStart || null,
          end: allMealPlans.mealTimingConfig.lunchEnd || null
        },
        snacks: {
          start: allMealPlans.mealTimingConfig.snacksStart || null,
          end: allMealPlans.mealTimingConfig.snacksEnd || null
        },
        dinner: {
          start: allMealPlans.mealTimingConfig.dinnerStart || null,
          end: allMealPlans.mealTimingConfig.dinnerEnd || null
        }
      } : null;

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
          isActive: false,
          mealTimings: defaultTiming
        };
      });

      this.logger.debug(`Generated weekly plan with ${weeklyPlan.length} days`);

      return {
        weeklyPlan,
        totalDaysPlanned: allMealPlans.items.length,
        mealTimingConfig: allMealPlans.mealTimingConfig
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
        const existingMealPlan = await this.findMealPlanByDay(dayPlan.day, hostelId, true);
        
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

  // ========================================
  // MEAL TIMING METHODS
  // ========================================

  async getMealTiming(hostelId: string) {
    this.logger.debug(`Getting meal timing for hostelId: ${hostelId}`);
    
    const timing = await this.mealTimingRepository.findOne({
      where: { hostelId }
    });

    this.logger.debug(`Meal timing found: ${JSON.stringify(timing)}`);

    if (!timing) {
      // Return default timing structure if not set
      this.logger.debug(`No meal timing found for hostelId: ${hostelId}, returning defaults`);
      return {
        breakfastStart: null,
        breakfastEnd: null,
        lunchStart: null,
        lunchEnd: null,
        snacksStart: null,
        snacksEnd: null,
        dinnerStart: null,
        dinnerEnd: null,
        isActive: false,
        hostelId
      };
    }

    return timing;
  }

  async upsertMealTiming(dto: CreateMealTimingDto, hostelId: string) {
    if (!hostelId) {
      throw new Error('Hostel context is required. Please ensure you are authenticated with a Business Token.');
    }

    // Clean the DTO - convert empty strings to null
    const cleanedDto = {
      breakfastStart: dto.breakfastStart && dto.breakfastStart.trim() !== '' ? dto.breakfastStart : null,
      breakfastEnd: dto.breakfastEnd && dto.breakfastEnd.trim() !== '' ? dto.breakfastEnd : null,
      lunchStart: dto.lunchStart && dto.lunchStart.trim() !== '' ? dto.lunchStart : null,
      lunchEnd: dto.lunchEnd && dto.lunchEnd.trim() !== '' ? dto.lunchEnd : null,
      snacksStart: dto.snacksStart && dto.snacksStart.trim() !== '' ? dto.snacksStart : null,
      snacksEnd: dto.snacksEnd && dto.snacksEnd.trim() !== '' ? dto.snacksEnd : null,
      dinnerStart: dto.dinnerStart && dto.dinnerStart.trim() !== '' ? dto.dinnerStart : null,
      dinnerEnd: dto.dinnerEnd && dto.dinnerEnd.trim() !== '' ? dto.dinnerEnd : null,
      isActive: dto.isActive !== false
    };

    // Check if timing already exists for this hostel
    const existing = await this.mealTimingRepository.findOne({
      where: { hostelId }
    });

    if (existing) {
      // Update existing
      await this.mealTimingRepository.update(existing.id, cleanedDto);
      return {
        ...(await this.mealTimingRepository.findOne({ where: { id: existing.id } })),
        action: 'updated'
      };
    } else {
      // Create new
      const timing = this.mealTimingRepository.create({
        ...cleanedDto,
        hostelId
      });
      const saved = await this.mealTimingRepository.save(timing);
      return {
        ...saved,
        action: 'created'
      };
    }
  }

  async deleteMealTiming(hostelId: string) {
    const timing = await this.mealTimingRepository.findOne({
      where: { hostelId }
    });

    if (!timing) {
      throw new NotFoundException('Meal timing not found for this hostel');
    }

    await this.mealTimingRepository.update(timing.id, { isActive: false });
    return { message: 'Meal timing deleted successfully' };
  }
}