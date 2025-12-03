import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../students/entities/student.entity";
import { Payment } from "../payments/entities/payment.entity";
import { Invoice, InvoiceStatus } from "../invoices/entities/invoice.entity";
import { Room } from "../rooms/entities/room.entity";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>
  ) {}

  async getDashboardData(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    // Get summary statistics
    const summary = await this.getSummaryStats(hostelId);

    // Get monthly data for the last 6 months
    const monthlyData = await this.getMonthlyData(hostelId);

    // Get guest type data (mock for now)
    const guestTypeData = [
      { name: "Students", value: 85, color: "#07A64F" },
      { name: "Working Professionals", value: 12, color: "#1295D0" },
      { name: "Others", value: 3, color: "#FF6B6B" },
    ];

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(hostelId);

    return {
      summary,
      monthlyData,
      guestTypeData,
      performanceMetrics,
    };
  }

  async getSummaryStats(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    // Count only active (non-deleted) students
    // TypeORM's @DeleteDateColumn auto-excludes soft-deleted records
    const totalStudents = await this.studentRepository.count({
      where: { hostelId }
    });
    const totalRooms = await this.roomRepository.count({
      where: { hostelId }
    });

    // Get total beds from actual bed entities (FIXED)
    const totalBedsResult = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin('room.beds', 'bed')
      .select('COUNT(bed.id)', 'totalBeds')
      .where('room.hostelId = :hostelId', { hostelId })
      .andWhere('room.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    const totalBeds = parseInt(totalBedsResult?.totalBeds) || 0;

    // Count occupied beds from bed entities (FIXED)
    const occupiedBedsResult = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin('room.beds', 'bed')
      .select('COUNT(bed.id)', 'occupiedBeds')
      .where('room.hostelId = :hostelId', { hostelId })
      .andWhere('room.status = :status', { status: 'ACTIVE' })
      .andWhere('bed.status IN (:...statuses)', { statuses: ['Occupied', 'Reserved'] })
      .getRawOne();

    const occupiedBeds = parseInt(occupiedBedsResult?.occupiedBeds) || 0;

    const totalRevenue = await this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin("payment.student", "student")
      .select("SUM(payment.amount)", "total")
      .where("student.hostelId = :hostelId", { hostelId })
      .getRawOne();

    const monthlyRevenue = await this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin("payment.student", "student")
      .select("SUM(payment.amount)", "total")
      .where("payment.paymentDate >= :startDate", {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      })
      .andWhere("student.hostelId = :hostelId", { hostelId })
      .getRawOne();

    // Calculate occupancy rate based on beds, not rooms (FIXED)
    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalStudents,
      totalRooms,
      totalBeds,
      occupiedBeds,
      occupancyRate,
      totalRevenue: parseFloat(totalRevenue?.total || "0"),
      monthlyRevenue: parseFloat(monthlyRevenue?.total || "0"),
      revenueGrowth: 12.5, // Mock data - would calculate from historical data
      bookingsGrowth: 8.3,
      occupancyGrowth: 5.2,
    };
  }

  async getMonthlyData(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const monthlyData = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        1
      );

      const revenue = await this.paymentRepository
        .createQueryBuilder("payment")
        .innerJoin("payment.student", "student")
        .select("SUM(payment.amount)", "total")
        .where(
          "payment.paymentDate >= :startDate AND payment.paymentDate < :endDate",
          {
            startDate: date,
            endDate: nextDate,
          }
        )
        .andWhere("student.hostelId = :hostelId", { hostelId })
        .getRawOne();

      const bookings = await this.studentRepository
        .createQueryBuilder("student")
        .where(
          "student.enrollmentDate >= :startDate AND student.enrollmentDate < :endDate",
          {
            startDate: date,
            endDate: nextDate,
          }
        )
        .andWhere("student.hostelId = :hostelId", { hostelId })
        .getCount();

      monthlyData.push({
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        revenue: parseFloat(revenue?.total || "0"),
        bookings: bookings,
        occupancy: Math.floor(Math.random() * 20) + 70, // Mock occupancy data
      });
    }

    return monthlyData;
  }

  async getMonthlyRevenue(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    return this.getMonthlyData(hostelId);
  }

  async getPerformanceMetrics(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const totalInvoices = await this.invoiceRepository
      .createQueryBuilder("invoice")
      .innerJoin("invoice.student", "student")
      .where("student.hostelId = :hostelId", { hostelId })
      .getCount();
    const paidInvoices = await this.invoiceRepository
      .createQueryBuilder("invoice")
      .innerJoin("invoice.student", "student")
      .where("invoice.status = :status", { status: InvoiceStatus.PAID })
      .andWhere("student.hostelId = :hostelId", { hostelId })
      .getCount();
    const collectionRate =
      totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    // Calculate REAL average stay duration from actual student data
    const avgStayResult = await this.studentRepository
      .createQueryBuilder('student')
      .select('AVG(EXTRACT(DAY FROM (COALESCE(student.updatedAt, NOW()) - student.enrollmentDate)))', 'avgDays')
      .where('student.enrollmentDate IS NOT NULL')
      .andWhere('student.hostelId = :hostelId', { hostelId })
      .getRawOne();

    const averageStayDuration = Math.round(parseFloat(avgStayResult?.avgDays) || 0);
    const customerSatisfaction = 4.2; // Mock data - would come from feedback system

    return {
      collectionRate,
      averageStayDuration,
      customerSatisfaction,
      totalInvoices,
      paidInvoices,
    };
  }
}
