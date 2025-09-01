import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportType } from './entities/report.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Discount } from '../discounts/entities/discount.entity';
import { BookingRequest } from '../bookings/entities/booking-request.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(Discount)
    private discountRepository: Repository<Discount>,
    @InjectRepository(BookingRequest)
    private bookingRepository: Repository<BookingRequest>,
  ) {}

  async findAll(filters: any = {}) {
    const { 
      page = 1, 
      limit = 50, 
      type,
      status,
      dateFrom,
      dateTo,
      search 
    } = filters;
    
    const queryBuilder = this.reportRepository.createQueryBuilder('report');
    
    // Apply filters
    if (type) {
      queryBuilder.andWhere('report.type = :type', { type });
    }
    
    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }
    
    if (dateFrom) {
      queryBuilder.andWhere('report.createdAt >= :dateFrom', { dateFrom });
    }
    
    if (dateTo) {
      queryBuilder.andWhere('report.createdAt <= :dateTo', { dateTo });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(report.name ILIKE :search OR report.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by creation date
    queryBuilder.orderBy('report.createdAt', 'DESC');
    
    const [reports, total] = await queryBuilder.getManyAndCount();
    
    // Transform to API response format
    const transformedItems = reports.map(report => this.transformToApiResponse(report));
    
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
    const report = await this.reportRepository.findOne({
      where: { id }
    });
    
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    
    return this.transformToApiResponse(report);
  }

  async generateReport(reportType: string, parameters: any = {}) {
    let reportData;
    let reportName;
    let description;

    switch (reportType) {
      case 'occupancy':
        reportData = await this.generateOccupancyReport(parameters);
        reportName = 'Room Occupancy Report';
        description = 'Current room occupancy status and availability';
        break;
      
      case 'financial':
        reportData = await this.generateFinancialReport(parameters);
        reportName = 'Financial Summary Report';
        description = 'Revenue, payments, and outstanding balances';
        break;
      
      case 'student':
        reportData = await this.generateStudentReport(parameters);
        reportName = 'Student Management Report';
        description = 'Student enrollment and status summary';
        break;
      
      case 'payment':
        reportData = await this.generatePaymentReport(parameters);
        reportName = 'Payment Analysis Report';
        description = 'Payment trends and collection analysis';
        break;
      
      case 'ledger':
        reportData = await this.generateLedgerReport(parameters);
        reportName = 'Ledger Summary Report';
        description = 'Detailed ledger entries and balance analysis';
        break;
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Save report metadata
    const report = this.reportRepository.create({
      id: this.generateReportId(),
      name: reportName,
      type: reportType as ReportType,
      description: description,
      parameters: parameters,
      data: reportData,
      status: ReportStatus.COMPLETED,
      generatedBy: parameters.generatedBy || 'system',
      generatedAt: new Date()
    });

    const savedReport = await this.reportRepository.save(report);

    return {
      reportId: savedReport.id,
      name: reportName,
      type: reportType,
      status: ReportStatus.COMPLETED,
      generatedAt: savedReport.generatedAt,
      data: reportData
    };
  }

  async getReportData(id: string) {
    const report = await this.reportRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Re-generate report data based on type and parameters
    let reportData;
    switch (report.type) {
      case ReportType.OCCUPANCY:
        reportData = await this.generateOccupancyReport(report.parameters);
        break;
      case ReportType.FINANCIAL:
        reportData = await this.generateFinancialReport(report.parameters);
        break;
      case ReportType.STUDENT:
        reportData = await this.generateStudentReport(report.parameters);
        break;
      case ReportType.PAYMENT:
        reportData = await this.generatePaymentReport(report.parameters);
        break;
      case ReportType.LEDGER:
        reportData = await this.generateLedgerReport(report.parameters);
        break;
      default:
        throw new Error(`Unsupported report type: ${report.type}`);
    }

    return {
      reportId: report.id,
      name: report.name,
      type: report.type,
      description: report.description,
      generatedAt: report.createdAt,
      parameters: report.parameters,
      data: reportData
    };
  }

  private async generateOccupancyReport(parameters: any) {
    // Get room occupancy data
    const rooms = await this.roomRepository.find({
      relations: ['occupants']
    });

    const occupancyData = rooms.map(room => ({
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      currentOccupants: room.occupants?.length || 0,
      availableBeds: room.capacity - (room.occupants?.length || 0),
      occupancyRate: room.capacity > 0 ? ((room.occupants?.length || 0) / room.capacity) * 100 : 0,
      status: room.status,
      rent: room.rent
    }));

    const summary = {
      totalRooms: rooms.length,
      totalCapacity: rooms.reduce((sum, room) => sum + room.capacity, 0),
      totalOccupied: rooms.reduce((sum, room) => sum + (room.occupants?.length || 0), 0),
      totalAvailable: rooms.reduce((sum, room) => sum + (room.capacity - (room.occupants?.length || 0)), 0),
      overallOccupancyRate: 0
    };

    summary.overallOccupancyRate = summary.totalCapacity > 0 ? 
      (summary.totalOccupied / summary.totalCapacity) * 100 : 0;

    return {
      summary,
      roomDetails: occupancyData,
      generatedAt: new Date()
    };
  }

  private async generateFinancialReport(parameters: any) {
    const { dateFrom, dateTo } = parameters;
    
    // Get financial data
    const invoiceData = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'totalInvoiced')
      .addSelect('SUM(invoice.paidAmount)', 'totalPaid')
      .addSelect('SUM(invoice.total - invoice.paidAmount)', 'totalOutstanding')
      .addSelect('COUNT(*)', 'invoiceCount')
      .where(dateFrom ? 'invoice.issueDate >= :dateFrom' : '1=1', { dateFrom })
      .andWhere(dateTo ? 'invoice.issueDate <= :dateTo' : '1=1', { dateTo })
      .getRawOne();

    const paymentData = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalPayments')
      .addSelect('COUNT(*)', 'paymentCount')
      .addSelect('AVG(payment.amount)', 'averagePayment')
      .where(dateFrom ? 'payment.paymentDate >= :dateFrom' : '1=1', { dateFrom })
      .andWhere(dateTo ? 'payment.paymentDate <= :dateTo' : '1=1', { dateTo })
      .getRawOne();

    // Payment method breakdown
    const paymentMethods = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'method')
      .addSelect('SUM(payment.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where(dateFrom ? 'payment.paymentDate >= :dateFrom' : '1=1', { dateFrom })
      .andWhere(dateTo ? 'payment.paymentDate <= :dateTo' : '1=1', { dateTo })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    return {
      summary: {
        totalInvoiced: parseFloat(invoiceData?.totalInvoiced) || 0,
        totalPaid: parseFloat(invoiceData?.totalPaid) || 0,
        totalOutstanding: parseFloat(invoiceData?.totalOutstanding) || 0,
        totalPayments: parseFloat(paymentData?.totalPayments) || 0,
        invoiceCount: parseInt(invoiceData?.invoiceCount) || 0,
        paymentCount: parseInt(paymentData?.paymentCount) || 0,
        averagePayment: parseFloat(paymentData?.averagePayment) || 0,
        collectionRate: invoiceData?.totalInvoiced > 0 ? 
          (parseFloat(invoiceData.totalPaid) / parseFloat(invoiceData.totalInvoiced)) * 100 : 0
      },
      paymentMethodBreakdown: paymentMethods.map(pm => ({
        method: pm.method,
        total: parseFloat(pm.total),
        count: parseInt(pm.count),
        percentage: paymentData?.totalPayments > 0 ? 
          (parseFloat(pm.total) / parseFloat(paymentData.totalPayments)) * 100 : 0
      })),
      generatedAt: new Date()
    };
  }

  private async generateStudentReport(parameters: any) {
    const students = await this.studentRepository.find({
      relations: ['room', 'academicInfo']
    });

    const statusBreakdown = {};
    const courseBreakdown = {};
    const institutionBreakdown = {};

    students.forEach(student => {
      // Status breakdown
      statusBreakdown[student.status] = (statusBreakdown[student.status] || 0) + 1;
      
      // Course breakdown - get from academic info
      const currentAcademic = student.academicInfo?.find(a => a.isActive);
      if (currentAcademic?.course) {
        courseBreakdown[currentAcademic.course] = (courseBreakdown[currentAcademic.course] || 0) + 1;
      }
      
      // Institution breakdown - get from academic info
      if (currentAcademic?.institution) {
        institutionBreakdown[currentAcademic.institution] = (institutionBreakdown[currentAcademic.institution] || 0) + 1;
      }
    });

    return {
      summary: {
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'Active').length,
        inactiveStudents: students.filter(s => s.status === 'Inactive').length,
        studentsWithRooms: students.filter(s => s.room).length,
        studentsWithoutRooms: students.filter(s => !s.room).length
      },
      breakdowns: {
        byStatus: statusBreakdown,
        byCourse: courseBreakdown,
        byInstitution: institutionBreakdown
      },
      generatedAt: new Date()
    };
  }

  private async generatePaymentReport(parameters: any) {
    const { dateFrom, dateTo } = parameters;
    
    // Monthly payment trends
    const monthlyTrends = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE_TRUNC(\'month\', payment.paymentDate)', 'month')
      .addSelect('SUM(payment.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where(dateFrom ? 'payment.paymentDate >= :dateFrom' : '1=1', { dateFrom })
      .andWhere(dateTo ? 'payment.paymentDate <= :dateTo' : '1=1', { dateTo })
      .groupBy('DATE_TRUNC(\'month\', payment.paymentDate)')
      .orderBy('month', 'ASC')
      .getRawMany();

    // Daily payment trends (last 30 days)
    const dailyTrends = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.paymentDate)', 'date')
      .addSelect('SUM(payment.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('payment.paymentDate >= :thirtyDaysAgo', { 
        thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .groupBy('DATE(payment.paymentDate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      monthlyTrends: monthlyTrends.map(trend => ({
        month: trend.month,
        total: parseFloat(trend.total),
        count: parseInt(trend.count),
        average: parseFloat(trend.total) / parseInt(trend.count)
      })),
      dailyTrends: dailyTrends.map(trend => ({
        date: trend.date,
        total: parseFloat(trend.total),
        count: parseInt(trend.count)
      })),
      generatedAt: new Date()
    };
  }

  private async generateLedgerReport(parameters: any) {
    const { dateFrom, dateTo, studentId } = parameters;
    
    const queryBuilder = this.ledgerRepository.createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.student', 'student');
    
    if (dateFrom) {
      queryBuilder.andWhere('ledger.date >= :dateFrom', { dateFrom });
    }
    
    if (dateTo) {
      queryBuilder.andWhere('ledger.date <= :dateTo', { dateTo });
    }
    
    if (studentId) {
      queryBuilder.andWhere('ledger.studentId = :studentId', { studentId });
    }
    
    queryBuilder.andWhere('ledger.isReversed = :isReversed', { isReversed: false });
    
    const entries = await queryBuilder.getMany();
    
    const summary = {
      totalEntries: entries.length,
      totalDebits: entries.reduce((sum, entry) => sum + entry.debit, 0),
      totalCredits: entries.reduce((sum, entry) => sum + entry.credit, 0),
      netBalance: entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0)
    };

    // Type breakdown
    const typeBreakdown = {};
    entries.forEach(entry => {
      if (!typeBreakdown[entry.type]) {
        typeBreakdown[entry.type] = {
          count: 0,
          totalDebits: 0,
          totalCredits: 0
        };
      }
      typeBreakdown[entry.type].count++;
      typeBreakdown[entry.type].totalDebits += entry.debit;
      typeBreakdown[entry.type].totalCredits += entry.credit;
    });

    return {
      summary,
      typeBreakdown,
      entries: entries.map(entry => ({
        id: entry.id,
        studentId: entry.studentId,
        studentName: entry.student?.name || '',
        date: entry.date,
        type: entry.type,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        balance: entry.balance,
        balanceType: entry.balanceType
      })),
      generatedAt: new Date()
    };
  }

  // Transform normalized data back to exact API format
  private transformToApiResponse(report: Report): any {
    return {
      id: report.id,
      name: report.name,
      type: report.type,
      description: report.description,
      status: report.status,
      parameters: report.parameters,
      generatedBy: report.generatedBy,
      createdAt: report.createdAt
    };
  }

  private generateReportId(): string {
    return `RPT${Date.now()}`;
  }
}