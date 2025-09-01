import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminCharge, AdminChargeStatus } from "./entities/admin-charge.entity";
import { CreateAdminChargeDto } from "./dto/create-admin-charge.dto";
import { UpdateAdminChargeDto } from "./dto/update-admin-charge.dto";
import { Student } from "../students/entities/student.entity";
import { LedgerService } from "../ledger/ledger.service";
import { LedgerEntryType } from "../ledger/entities/ledger-entry.entity";

@Injectable()
export class AdminChargesService {
  constructor(
    @InjectRepository(AdminCharge)
    private adminChargeRepository: Repository<AdminCharge>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private ledgerService: LedgerService
  ) {}

  async create(
    createAdminChargeDto: CreateAdminChargeDto
  ): Promise<AdminCharge> {
    // Verify student exists
    const student = await this.studentRepository.findOne({
      where: { id: createAdminChargeDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createAdminChargeDto.studentId} not found`
      );
    }

    const adminCharge = this.adminChargeRepository.create({
      ...createAdminChargeDto,
      dueDate: createAdminChargeDto.dueDate
        ? new Date(createAdminChargeDto.dueDate)
        : null,
    });

    return await this.adminChargeRepository.save(adminCharge);
  }

  async findAll(filters?: {
    studentId?: string;
    status?: AdminChargeStatus;
    chargeType?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: AdminCharge[]; pagination: any }> {
    const { page = 1, limit = 50 } = filters || {};

    const queryBuilder = this.adminChargeRepository
      .createQueryBuilder("charge")
      .leftJoinAndSelect("charge.student", "student")
      .orderBy("charge.createdAt", "DESC");

    if (filters?.studentId) {
      queryBuilder.andWhere("charge.studentId = :studentId", {
        studentId: filters.studentId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere("charge.status = :status", {
        status: filters.status,
      });
    }

    if (filters?.chargeType) {
      queryBuilder.andWhere("charge.chargeType = :chargeType", {
        chargeType: filters.chargeType,
      });
    }

    if (filters?.category) {
      queryBuilder.andWhere("charge.category = :category", {
        category: filters.category,
      });
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

  async findOne(id: string): Promise<AdminCharge> {
    const adminCharge = await this.adminChargeRepository.findOne({
      where: { id },
      relations: ["student"],
    });

    if (!adminCharge) {
      throw new NotFoundException(`Admin charge with ID ${id} not found`);
    }

    return adminCharge;
  }

  async update(
    id: string,
    updateAdminChargeDto: UpdateAdminChargeDto
  ): Promise<AdminCharge> {
    const adminCharge = await this.findOne(id);

    // If updating due date, convert to Date object
    if (updateAdminChargeDto.dueDate) {
      updateAdminChargeDto.dueDate = new Date(
        updateAdminChargeDto.dueDate
      ) as any;
    }

    // If updating applied date, convert to Date object
    if (updateAdminChargeDto.appliedDate) {
      updateAdminChargeDto.appliedDate = new Date(
        updateAdminChargeDto.appliedDate
      ) as any;
    }

    Object.assign(adminCharge, updateAdminChargeDto);
    return await this.adminChargeRepository.save(adminCharge);
  }

  async remove(id: string): Promise<void> {
    const adminCharge = await this.findOne(id);

    if (adminCharge.status === AdminChargeStatus.APPLIED) {
      throw new BadRequestException(
        "Cannot delete an applied charge. Cancel it first."
      );
    }

    await this.adminChargeRepository.remove(adminCharge);
  }

  async applyCharge(id: string): Promise<AdminCharge> {
    const adminCharge = await this.findOne(id);

    if (adminCharge.status !== AdminChargeStatus.PENDING) {
      throw new BadRequestException("Only pending charges can be applied");
    }

    try {
      // Create ledger entry using the existing createAdjustmentEntry method
      await this.ledgerService.createAdjustmentEntry(
        adminCharge.studentId,
        adminCharge.amount,
        `Admin Charge: ${adminCharge.title}${adminCharge.description ? " - " + adminCharge.description : ""}`,
        "debit"
      );

      // Update charge status
      adminCharge.status = AdminChargeStatus.APPLIED;
      adminCharge.appliedDate = new Date();

      const updatedCharge = await this.adminChargeRepository.save(adminCharge);
      return updatedCharge;
    } catch (error) {
      throw new BadRequestException(`Failed to apply charge: ${error.message}`);
    }
  }

  async cancelCharge(id: string): Promise<AdminCharge> {
    const adminCharge = await this.findOne(id);

    if (adminCharge.status === AdminChargeStatus.APPLIED) {
      throw new BadRequestException(
        "Cannot cancel an applied charge. Create a credit entry instead."
      );
    }

    adminCharge.status = AdminChargeStatus.CANCELLED;
    return await this.adminChargeRepository.save(adminCharge);
  }

  async getChargesByStudent(studentId: string): Promise<AdminCharge[]> {
    const result = await this.findAll({ studentId });
    return result.items;
  }

  async getChargeStats(): Promise<{
    totalCharges: number;
    pendingCharges: number;
    appliedCharges: number;
    cancelledCharges: number;
    totalPendingAmount: number;
    totalAppliedAmount: number;
  }> {
    const [totalCharges, pendingCharges, appliedCharges, cancelledCharges] =
      await Promise.all([
        this.adminChargeRepository.count(),
        this.adminChargeRepository.count({
          where: { status: AdminChargeStatus.PENDING },
        }),
        this.adminChargeRepository.count({
          where: { status: AdminChargeStatus.APPLIED },
        }),
        this.adminChargeRepository.count({
          where: { status: AdminChargeStatus.CANCELLED },
        }),
      ]);

    const pendingAmount = await this.adminChargeRepository
      .createQueryBuilder("charge")
      .select("SUM(CAST(charge.amount AS DECIMAL))", "total")
      .where("charge.status = :status", { status: AdminChargeStatus.PENDING })
      .getRawOne();

    const appliedAmount = await this.adminChargeRepository
      .createQueryBuilder("charge")
      .select("SUM(CAST(charge.amount AS DECIMAL))", "total")
      .where("charge.status = :status", { status: AdminChargeStatus.APPLIED })
      .getRawOne();

    return {
      totalCharges,
      pendingCharges,
      appliedCharges,
      cancelledCharges,
      totalPendingAmount: parseFloat(pendingAmount?.total || "0"),
      totalAppliedAmount: parseFloat(appliedAmount?.total || "0"),
    };
  }

  async getOverdueStudents(): Promise<any[]> {
    // Get students with overdue balances from ledger
    const overdueStudents = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoin('student.ledgerEntries', 'ledger')
      .select([
        'student.id',
        'student.name',
        'student.phone',
        'student.email',
        'room.roomNumber',
        'SUM(ledger.debit - ledger.credit) as currentBalance'
      ])
      .where('student.status = :status', { status: 'Active' })
      .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
      .groupBy('student.id, room.roomNumber')
      .having('SUM(ledger.debit - ledger.credit) > 0')
      .getRawMany();

    return overdueStudents.map(student => {
      const balance = parseFloat(student.currentBalance) || 0;
      const daysOverdue = Math.floor(balance / 100); // Rough calculation
      const suggestedLateFee = Math.min(balance * 0.1, 500); // 10% of balance, max 500

      return {
        id: student.student_id,
        name: student.student_name,
        phone: student.student_phone,
        email: student.student_email,
        roomNumber: student.room_roomNumber,
        currentBalance: balance,
        daysOverdue: Math.max(1, daysOverdue),
        suggestedLateFee: Math.round(suggestedLateFee)
      };
    });
  }

  async getTodaySummary(): Promise<{
    totalCharges: number;
    totalAmount: number;
    studentsCharged: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCharges = await this.adminChargeRepository
      .createQueryBuilder('charge')
      .where('charge.createdAt >= :today', { today })
      .andWhere('charge.createdAt < :tomorrow', { tomorrow })
      .getMany();

    const totalCharges = todayCharges.length;
    const totalAmount = todayCharges.reduce((sum, charge) => sum + parseFloat(charge.amount?.toString() || '0'), 0);
    const studentsCharged = new Set(todayCharges.map(charge => charge.studentId)).size;

    return {
      totalCharges,
      totalAmount,
      studentsCharged
    };
  }
}
