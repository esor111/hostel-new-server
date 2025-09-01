import { Injectable } from "@nestjs/common";
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

  async getDashboardData() {
    // Get summary statistics
    const summary = await this.getSummaryStats();

    // Get monthly data for the last 6 months
    const monthlyData = await this.getMonthlyData();

    // Get guest type data (mock for now)
    const guestTypeData = [
      { name: "Students", value: 85, color: "#07A64F" },
      { name: "Working Professionals", value: 12, color: "#1295D0" },
      { name: "Others", value: 3, color: "#FF6B6B" },
    ];

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics();

    return {
      summary,
      monthlyData,
      guestTypeData,
      performanceMetrics,
    };
  }

  async getSummaryStats() {
    const totalStudents = await this.studentRepository.count();
    const totalRooms = await this.roomRepository.count();
    const occupiedRooms = await this.roomRepository.count({
      where: { occupancy: 1 },
    });

    const totalRevenue = await this.paymentRepository
      .createQueryBuilder("payment")
      .select("SUM(payment.amount)", "total")
      .getRawOne();

    const monthlyRevenue = await this.paymentRepository
      .createQueryBuilder("payment")
      .select("SUM(payment.amount)", "total")
      .where("payment.paymentDate >= :startDate", {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      })
      .getRawOne();

    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
      totalStudents,
      totalRooms,
      occupiedRooms,
      occupancyRate,
      totalRevenue: parseFloat(totalRevenue?.total || "0"),
      monthlyRevenue: parseFloat(monthlyRevenue?.total || "0"),
      revenueGrowth: 12.5, // Mock data - would calculate from historical data
      bookingsGrowth: 8.3,
      occupancyGrowth: 5.2,
    };
  }

  async getMonthlyData() {
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
        .select("SUM(payment.amount)", "total")
        .where(
          "payment.paymentDate >= :startDate AND payment.paymentDate < :endDate",
          {
            startDate: date,
            endDate: nextDate,
          }
        )
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

  async getMonthlyRevenue() {
    return this.getMonthlyData();
  }

  async getPerformanceMetrics() {
    const totalInvoices = await this.invoiceRepository.count();
    const paidInvoices = await this.invoiceRepository.count({
      where: { status: InvoiceStatus.PAID },
    });
    const collectionRate =
      totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    // Calculate REAL average stay duration from actual student data
    const avgStayResult = await this.studentRepository
      .createQueryBuilder('student')
      .select('AVG(EXTRACT(DAY FROM (COALESCE(student.updatedAt, NOW()) - student.enrollmentDate)))', 'avgDays')
      .where('student.enrollmentDate IS NOT NULL')
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
