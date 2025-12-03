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
  ) { }

  async findAll(filters: any = {}, hostelId?: string) {
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

    // Conditional hostel filtering - if hostelId provided, filter by it; if not, return all data
    if (hostelId) {
      queryBuilder.andWhere('report.hostelId = :hostelId', { hostelId });
    }

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

  async findOne(id: string, hostelId: string) {
    const report = await this.reportRepository.findOne({
      where: { id, hostelId }
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.transformToApiResponse(report);
  }

  async generateReport(reportType: string, parameters: any = {}, hostelId?: string) {
    let reportData;
    let reportName;
    let description;

    switch (reportType) {
      case 'occupancy':
        reportData = await this.generateOccupancyReport(parameters, hostelId);
        reportName = 'Room Occupancy Report';
        description = 'Current room occupancy status and availability';
        break;

      case 'financial':
        reportData = await this.generateFinancialReport(parameters, hostelId);
        reportName = 'Financial Summary Report';
        description = 'Revenue, payments, and outstanding balances';
        break;

      case 'student':
        reportData = await this.generateStudentReport(parameters, hostelId);
        reportName = 'Student Management Report';
        description = 'Student enrollment and status summary';
        break;

      case 'payment':
        reportData = await this.generatePaymentReport(parameters, hostelId);
        reportName = 'Payment Analysis Report';
        description = 'Payment trends and collection analysis';
        break;

      case 'ledger':
        reportData = await this.generateLedgerReport(parameters, hostelId);
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
      generatedAt: new Date(),
      hostelId: hostelId
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

  async getReportData(id: string, hostelId: string) {
    const report = await this.reportRepository.findOne({ where: { id, hostelId } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Re-generate report data based on type and parameters
    let reportData;
    switch (report.type) {
      case ReportType.OCCUPANCY:
        reportData = await this.generateOccupancyReport(report.parameters, hostelId);
        break;
      case ReportType.FINANCIAL:
        reportData = await this.generateFinancialReport(report.parameters, hostelId);
        break;
      case ReportType.STUDENT:
        reportData = await this.generateStudentReport(report.parameters, hostelId);
        break;
      case ReportType.PAYMENT:
        reportData = await this.generatePaymentReport(report.parameters, hostelId);
        break;
      case ReportType.LEDGER:
        reportData = await this.generateLedgerReport(report.parameters, hostelId);
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

  private async generateOccupancyReport(parameters: any, hostelId?: string) {
    // Get room occupancy data
    const queryBuilder = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.occupants', 'occupants');

    if (hostelId) {
      queryBuilder.where('room.hostelId = :hostelId', { hostelId });
    }

    const rooms = await queryBuilder.getMany();

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

  private async generateFinancialReport(parameters: any, hostelId?: string) {
    const { dateFrom, dateTo } = parameters;

    // Get financial data
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'totalInvoiced')
      .addSelect('SUM(invoice.paidAmount)', 'totalPaid')
      .addSelect('SUM(invoice.total - invoice.paidAmount)', 'totalOutstanding')
      .addSelect('COUNT(*)', 'invoiceCount')
      .where(dateFrom ? 'invoice.issueDate >= :dateFrom' : '1=1', { dateFrom })
      .andWhere(dateTo ? 'invoice.issueDate <= :dateTo' : '1=1', { dateTo });

    if (hostelId) {
      queryBuilder.andWhere('invoice.hostelId = :hostelId', { hostelId });
    }

    const invoiceData = await queryBuilder.getRawOne();

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






  private async generateStudentReport(parameters: any, hostelId?: string) {
    // TypeORM's @DeleteDateColumn auto-excludes soft-deleted students
    const queryBuilder = this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('student.academicInfo', 'academicInfo');

    if (hostelId) {
      queryBuilder.where('student.hostelId = :hostelId', { hostelId });
    }

    const students = await queryBuilder.getMany();

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

  private async generatePaymentReport(parameters: any, hostelId?: string) {
    const { dateFrom, dateTo } = parameters;

    const queryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student');

    if (dateFrom) {
      queryBuilder.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('payment.paymentDate <= :dateTo', { dateTo });
    }
    if (hostelId) {
      queryBuilder.andWhere('payment.hostelId = :hostelId', { hostelId });
    }

    const payments = await queryBuilder.getMany();

    const methodBreakdown = {};
    const statusBreakdown = {};
    let totalAmount = 0;

    payments.forEach(payment => {
      totalAmount += parseFloat(payment.amount?.toString() || '0');
      methodBreakdown[payment.paymentMethod] = (methodBreakdown[payment.paymentMethod] || 0) + parseFloat(payment.amount?.toString() || '0');
      statusBreakdown[payment.status] = (statusBreakdown[payment.status] || 0) + 1;
    });

    return {
      summary: {
        totalPayments: payments.length,
        totalAmount,
        averagePayment: payments.length > 0 ? totalAmount / payments.length : 0
      },
      breakdowns: {
        byMethod: methodBreakdown,
        byStatus: statusBreakdown
      },
      generatedAt: new Date()
    };
  }

  private async generateLedgerReport(parameters: any, hostelId?: string) {
    const { dateFrom, dateTo } = parameters;

    const queryBuilder = this.ledgerRepository.createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.student', 'student');

    if (dateFrom) {
      queryBuilder.andWhere('ledger.date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('ledger.date <= :dateTo', { dateTo });
    }
    if (hostelId) {
      queryBuilder.andWhere('ledger.hostelId = :hostelId', { hostelId });
    }

    const entries = await queryBuilder.getMany();

    const typeBreakdown = {};
    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach(entry => {
      totalDebits += parseFloat(entry.debit?.toString() || '0');
      totalCredits += parseFloat(entry.credit?.toString() || '0');
      typeBreakdown[entry.type] = (typeBreakdown[entry.type] || 0) + 1;
    });

    return {
      summary: {
        totalEntries: entries.length,
        totalDebits,
        totalCredits,
        netBalance: totalDebits - totalCredits
      },
      breakdowns: {
        byType: typeBreakdown
      },
      generatedAt: new Date()
    };
  }

  private transformToApiResponse(report: Report) {
    return {
      id: report.id,
      name: report.name,
      type: report.type,
      description: report.description,
      status: report.status,
      generatedBy: report.generatedBy,
      generatedAt: report.generatedAt,
      createdAt: report.createdAt,
      parameters: report.parameters
    };
  }

  private generateReportId(): string {
    return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}