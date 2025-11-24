import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async create(
    createExpenseDto: CreateExpenseDto,
    hostelId: string,
    createdBy: string,
  ): Promise<Expense> {
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      hostelId,
      createdBy,
      expenseDate: new Date(createExpenseDto.expenseDate),
    });

    return await this.expenseRepository.save(expense);
  }

  async findAll(
    filters: ExpenseFilterDto,
    hostelId: string,
  ): Promise<{ items: Expense[]; pagination: any }> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required');
    }

    const { page = 1, limit = 50, category, startDate, endDate, month } = filters;

    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.hostelId = :hostelId', { hostelId })
      .orderBy('expense.expenseDate', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC');

    // Apply filters
    if (category) {
      queryBuilder.andWhere('expense.category = :category', { category });
    }

    if (month) {
      // YYYY-MM format
      const [year, monthNum] = month.split('-');
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0);
      
      queryBuilder.andWhere('expense.expenseDate >= :startOfMonth', { startOfMonth });
      queryBuilder.andWhere('expense.expenseDate <= :endOfMonth', { endOfMonth });
    } else {
      if (startDate) {
        queryBuilder.andWhere('expense.expenseDate >= :startDate', { 
          startDate: new Date(startDate) 
        });
      }

      if (endDate) {
        queryBuilder.andWhere('expense.expenseDate <= :endDate', { 
          endDate: new Date(endDate) 
        });
      }
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, hostelId: string): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id, hostelId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
    hostelId: string,
  ): Promise<Expense> {
    const expense = await this.findOne(id, hostelId);

    // Convert date string to Date object if provided
    if (updateExpenseDto.expenseDate) {
      updateExpenseDto.expenseDate = new Date(updateExpenseDto.expenseDate) as any;
    }

    Object.assign(expense, updateExpenseDto);
    return await this.expenseRepository.save(expense);
  }

  async remove(id: string, hostelId: string): Promise<void> {
    const expense = await this.findOne(id, hostelId);
    await this.expenseRepository.remove(expense);
  }

  async getCategories(hostelId: string): Promise<string[]> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required');
    }

    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('DISTINCT expense.category', 'category')
      .where('expense.hostelId = :hostelId', { hostelId })
      .orderBy('expense.category', 'ASC')
      .getRawMany();

    return result.map(r => r.category);
  }

  /**
   * Calculate total income for a given month from payments
   */
  async calculateMonthlyIncome(hostelId: string, month: string): Promise<number> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required');
    }

    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);

    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.hostelId = :hostelId', { hostelId })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paymentDate >= :startDate', { startDate })
      .andWhere('payment.paymentDate <= :endDate', { endDate })
      .getRawOne();

    return parseFloat(result?.total) || 0;
  }

  /**
   * Calculate total expenses for a given month
   */
  async calculateMonthlyExpenses(hostelId: string, month: string): Promise<number> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required');
    }

    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);

    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.hostelId = :hostelId', { hostelId })
      .andWhere('expense.expenseDate >= :startDate', { startDate })
      .andWhere('expense.expenseDate <= :endDate', { endDate })
      .getRawOne();

    return parseFloat(result?.total) || 0;
  }

  /**
   * Get dashboard summary with income vs expenses comparison
   */
  async getDashboardSummary(hostelId: string, month?: string) {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required');
    }

    // Default to current month if not provided
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const [income, expenses] = await Promise.all([
      this.calculateMonthlyIncome(hostelId, currentMonth),
      this.calculateMonthlyExpenses(hostelId, currentMonth),
    ]);

    const netProfit = income - expenses;
    const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(2) : '0.00';

    return {
      month: currentMonth,
      totalIncome: income,
      totalExpenses: expenses,
      netProfit,
      profitMargin: parseFloat(profitMargin),
    };
  }
}
