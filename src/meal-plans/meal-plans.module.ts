import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { MealPlan } from './entities/meal-plan.entity';
import { MealTiming } from './entities/meal-timing.entity';
import { HostelModule } from '../hostel/hostel.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealPlan, MealTiming]),
    HostelModule,
    AuthModule
  ],
  controllers: [MealPlansController],
  providers: [MealPlansService],
  exports: [MealPlansService]
})
export class MealPlansModule {}