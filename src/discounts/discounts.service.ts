import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount, DiscountStatus } from './entities/discount.entity';
import { DiscountType, DiscountCategory } from './entities/discount-type.entity';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(Discount)
    private discountRepository: Repository<Discount>,
    @InjectRepository(DiscountType)
    private discountTypeRepository: Repository<DiscountType>,
    private ledgerService: LedgerService,
  ) {}

  async findAll(filters: any = {}) {
    const { 
      page = 1, 
      limit = 50, 
      studentId, 
      status,
      dateFrom,
      dateTo,
      search 
    } = filters;
    
    const queryBuilder = this.discountRepository.createQueryBuilder('discount')
      .leftJoinAndSelect('discount.student', 'student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('discount.discountType', 'discountType');
    
    // Apply filters
    if (studentId) {
      queryBuilder.andWhere('discount.studentId = :studentId', { studentId });
    }
    
    if (status) {
      queryBuilder.andWhere('discount.status = :status', { status });
    }
    
    if (dateFrom) {
      queryBuilder.andWhere('discount.date >= :dateFrom', { dateFrom });
    }
    
    if (dateTo) {
      queryBuilder.andWhere('discount.date <= :dateTo', { dateTo });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(student.name ILIKE :search OR discount.reason ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by date
    queryBuilder.orderBy('discount.date', 'DESC');
    
    const [discounts, total] = await queryBuilder.getManyAndCount();
    
    // Transform to API response format
    const transformedItems = discounts.map(discount => this.transformToApiResponse(discount));
    
    return {
      items: transformedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const discount = await this.discountRepository.findOne({
      where: { id },
      relations: ['student', 'student.room', 'discountType']
    });
    
    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
    
    return this.transformToApiResponse(discount);
  }

  async findByStudentId(studentId: string) {
    const discounts = await this.discountRepository.find({
      where: { studentId },
      relations: ['student', 'student.room', 'discountType'],
      order: { date: 'DESC' }
    });
    
    return discounts.map(discount => this.transformToApiResponse(discount));
  }

  async create(createDiscountDto: any) {
    // Find or create discount type if provided
    let discountType = null;
    if (createDiscountDto.discountType) {
      discountType = await this.discountTypeRepository.findOne({ 
        where: { name: createDiscountDto.discountType } 
      });
      
      if (!discountType) {
        // Create basic discount type if it doesn't exist
        discountType = await this.discountTypeRepository.save({
          name: createDiscountDto.discountType,
          category: DiscountCategory.PROMOTIONAL, // Default category
          description: `Auto-created discount type: ${createDiscountDto.discountType}`,
          isActive: true
        });
      }
    }

    // Calculate discount amount if percentage
    let finalAmount = createDiscountDto.amount;
    if (createDiscountDto.isPercentage && createDiscountDto.percentageValue) {
      // This would need base amount calculation - simplified for now
      finalAmount = createDiscountDto.baseAmount * (createDiscountDto.percentageValue / 100);
      if (createDiscountDto.maxAmount && finalAmount > createDiscountDto.maxAmount) {
        finalAmount = createDiscountDto.maxAmount;
      }
    }

    // Generate custom discount ID if not provided
    const discountId = createDiscountDto.id || this.generateDiscountId();

    // Create discount entity
    const discount = this.discountRepository.create({
      id: discountId,
      studentId: createDiscountDto.studentId,
      discountTypeId: discountType?.id,
      amount: finalAmount,
      reason: createDiscountDto.reason,
      notes: createDiscountDto.notes,
      appliedBy: createDiscountDto.appliedBy || 'Admin',
      date: createDiscountDto.date || new Date(),
      status: createDiscountDto.status || DiscountStatus.ACTIVE,
      appliedTo: createDiscountDto.appliedTo || 'ledger',
      validFrom: createDiscountDto.validFrom,
      validTo: createDiscountDto.validTo,
      isPercentage: createDiscountDto.isPercentage || false,
      percentageValue: createDiscountDto.percentageValue,
      maxAmount: createDiscountDto.maxAmount,
      referenceId: createDiscountDto.referenceId
    });

    const savedDiscount = await this.discountRepository.save(discount);

    // Create ledger entry if applied to ledger
    if (savedDiscount.appliedTo === 'ledger') {
      await this.ledgerService.createDiscountEntry(savedDiscount);
    }

    return this.findOne(savedDiscount.id);
  }

  async update(id: string, updateDiscountDto: any) {
    const discount = await this.findOne(id);
    
    // Update main discount entity
    await this.discountRepository.update(id, {
      amount: updateDiscountDto.amount,
      reason: updateDiscountDto.reason,
      notes: updateDiscountDto.notes,
      status: updateDiscountDto.status,
      validFrom: updateDiscountDto.validFrom,
      validTo: updateDiscountDto.validTo
    });

    return this.findOne(id);
  }

  async applyDiscount(studentId: string, discountData: any) {
    // Apply discount and create ledger entry in one transaction
    const discount = await this.create({
      ...discountData,
      studentId,
      appliedTo: 'ledger'
    });

    return {
      success: true,
      discount: discount,
      message: `Discount of ${discountData.amount} applied successfully`
    };
  }

  async expireDiscount(id: string, expiredBy: string = 'system') {
    await this.discountRepository.update(id, {
      status: DiscountStatus.EXPIRED
    });

    return {
      success: true,
      message: 'Discount expired successfully'
    };
  }

  async getStats() {
    const totalDiscounts = await this.discountRepository.count();
    const activeDiscounts = await this.discountRepository.count({ 
      where: { status: DiscountStatus.ACTIVE } 
    });
    const expiredDiscounts = await this.discountRepository.count({ 
      where: { status: DiscountStatus.EXPIRED } 
    });
    
    const amountResult = await this.discountRepository
      .createQueryBuilder('discount')
      .select('SUM(discount.amount)', 'totalAmount')
      .addSelect('AVG(discount.amount)', 'averageAmount')
      .addSelect('COUNT(DISTINCT discount.studentId)', 'studentsWithDiscounts')
      .where('discount.status = :status', { status: DiscountStatus.ACTIVE })
      .getRawOne();

    // Discount type breakdown
    const typeResult = await this.discountRepository
      .createQueryBuilder('discount')
      .leftJoin('discount.discountType', 'discountType')
      .select('discountType.name', 'typeName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(discount.amount)', 'amount')
      .where('discount.status = :status', { status: DiscountStatus.ACTIVE })
      .groupBy('discountType.name')
      .getRawMany();

    const discountTypes = {};
    typeResult.forEach(row => {
      discountTypes[row.typeName || 'Other'] = {
        count: parseInt(row.count),
        amount: parseFloat(row.amount)
      };
    });

    return {
      totalDiscounts,
      activeDiscounts,
      expiredDiscounts,
      cancelledDiscounts: totalDiscounts - activeDiscounts - expiredDiscounts,
      totalAmount: parseFloat(amountResult?.totalAmount) || 0,
      averageDiscountAmount: parseFloat(amountResult?.averageAmount) || 0,
      studentsWithDiscounts: parseInt(amountResult?.studentsWithDiscounts) || 0,
      discountTypes
    };
  }

  async getDiscountTypes() {
    const discountTypes = await this.discountTypeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });

    return discountTypes.map(type => ({
      id: type.id,
      name: type.name,
      category: type.category,
      description: type.description,
      defaultAmount: type.defaultAmount,
      isPercentage: type.isPercentage,
      percentageValue: type.percentageValue,
      maxAmount: type.maxAmount,
      requiresApproval: type.requiresApproval,
      autoApply: type.autoApply
    }));
  }

  // Transform normalized data back to exact API format
  private transformToApiResponse(discount: Discount): any {
    return {
      id: discount.id,
      studentId: discount.studentId,
      studentName: discount.student?.name || '',
      room: discount.student?.room?.roomNumber || '',
      amount: parseFloat(discount.amount?.toString() || '0'),
      reason: discount.reason,
      notes: discount.notes,
      appliedBy: discount.appliedBy,
      date: discount.date,
      status: discount.status,
      appliedTo: discount.appliedTo,
      discountType: discount.discountType?.name || null,
      validFrom: discount.validFrom,
      validTo: discount.validTo,
      isPercentage: discount.isPercentage,
      percentageValue: discount.percentageValue ? parseFloat(discount.percentageValue.toString()) : null,
      maxAmount: discount.maxAmount ? parseFloat(discount.maxAmount.toString()) : null,
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt
    };
  }

  private generateDiscountId(): string {
    return `DSC${Date.now()}`;
  }
}