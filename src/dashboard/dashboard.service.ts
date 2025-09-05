import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { BookingRequest, BookingStatus } from '../bookings/entities/booking-request.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(BookingRequest)
    private bookingRepository: Repository<BookingRequest>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomOccupant)
    private roomOccupantRepository: Repository<RoomOccupant>,
  ) {}

  async getDashboardStats() {
    // Get active students count
    const totalStudents = await this.studentRepository.count({
      where: { status: StudentStatus.ACTIVE }
    });

    // Get real room statistics
    const totalRooms = await this.roomRepository.count();
    const activeRooms = await this.roomRepository.count({
      where: { status: 'ACTIVE' }
    });

    // Get accurate bed counts and occupancy
    const bedCountResult = await this.roomRepository
      .createQueryBuilder('room')
      .select('SUM(room.bedCount)', 'totalBeds')
      .where('room.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    const totalBeds = parseInt(bedCountResult?.totalBeds) || 0;

    // Count actual occupied beds from RoomOccupant records
    const occupiedBedsResult = await this.roomOccupantRepository
      .createQueryBuilder('occupant')
      .innerJoin('occupant.room', 'room')
      .select('COUNT(occupant.id)', 'occupiedBeds')
      .where('occupant.status = :status', { status: 'Active' })
      .andWhere('room.status = :roomStatus', { roomStatus: 'ACTIVE' })
      .getRawOne();

    const occupiedBeds = parseInt(occupiedBedsResult?.occupiedBeds) || 0;
    const availableBeds = totalBeds - occupiedBeds;

    // Calculate rooms with available beds
    const roomsWithAvailableBedsResult = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin('room.occupants', 'occupant', 'occupant.status = :occupantStatus', { occupantStatus: 'Active' })
      .select('room.id')
      .addSelect('room.bedCount')
      .addSelect('COUNT(occupant.id)', 'currentOccupancy')
      .where('room.status = :status', { status: 'ACTIVE' })
      .groupBy('room.id, room.bedCount')
      .having('room.bedCount > COUNT(occupant.id)')
      .getRawMany();

    const availableRooms = roomsWithAvailableBedsResult.length;

    // Get this month's revenue
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const thisMonthRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.paymentDate >= :startDate', { startDate: firstDayOfMonth })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const thisMonthRevenue = parseFloat(thisMonthRevenueResult?.total) || 0;

    // Get pending payments count (failed + pending)
    const pendingPayments = await this.paymentRepository.count({
      where: [
        { status: PaymentStatus.PENDING },
        { status: PaymentStatus.FAILED }
      ]
    });

    // Calculate occupancy percentage based on beds, not rooms
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalStudents,
      availableRooms,
      totalRooms,
      activeRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      monthlyRevenue: {
        value: `NPR ${thisMonthRevenue.toLocaleString()}`,
        amount: thisMonthRevenue
      },
      pendingPayments,
      occupancyPercentage
    };
  }

  async getRecentActivity(limit: number = 10) {
    const activities = [];

    // Get recent payments
    const recentPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .orderBy('payment.createdAt', 'DESC')
      .limit(5)
      .getMany();

    recentPayments.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        message: `Payment received from ${payment.student?.name || 'Unknown'} - NPR ${payment.amount.toLocaleString()}`,
        time: this.getRelativeTime(payment.createdAt),
        timestamp: payment.createdAt,
        icon: 'DollarSign',
        color: 'text-green-600'
      });
    });

    // Get recent ledger entries (admin charges, discounts, adjustments)
    const recentLedgerEntries = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.student', 'student')
      .where('ledger.type IN (:...types)', { types: ['Adjustment', 'Discount'] })
      .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
      .orderBy('ledger.createdAt', 'DESC')
      .limit(5)
      .getMany();

    recentLedgerEntries.forEach(entry => {
      const isCharge = entry.debit > 0;
      const amount = isCharge ? entry.debit : entry.credit;
      const actionType = isCharge ? 'charge' : 'discount';
      
      activities.push({
        id: `ledger-${entry.id}`,
        type: actionType,
        message: `${isCharge ? 'Admin charge' : 'Discount'} applied to ${entry.student?.name || 'Unknown'} - NPR ${amount.toLocaleString()}`,
        time: this.getRelativeTime(entry.createdAt),
        timestamp: entry.createdAt,
        icon: isCharge ? 'Plus' : 'Minus',
        color: isCharge ? 'text-red-600' : 'text-blue-600'
      });
    });

    // Get recent student check-ins (new students)
    const recentStudents = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .where('student.status = :status', { status: StudentStatus.ACTIVE })
      .orderBy('student.createdAt', 'DESC')
      .limit(3)
      .getMany();

    recentStudents.forEach(student => {
      activities.push({
        id: `checkin-${student.id}`,
        type: 'checkin',
        message: `New student checked in - ${student.name}${student.room ? ` (Room ${student.room.roomNumber})` : ''}`,
        time: this.getRelativeTime(student.createdAt),
        timestamp: student.createdAt,
        icon: 'Users',
        color: 'text-blue-600'
      });
    });

    // Get recent checkouts (inactive students)
    const recentCheckouts = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .where('student.status = :status', { status: StudentStatus.INACTIVE })
      .orderBy('student.updatedAt', 'DESC')
      .limit(3)
      .getMany();

    recentCheckouts.forEach(student => {
      activities.push({
        id: `checkout-${student.id}`,
        type: 'checkout',
        message: `Student checked out - ${student.name}`,
        time: this.getRelativeTime(student.updatedAt),
        timestamp: student.updatedAt,
        icon: 'LogOut',
        color: 'text-orange-600'
      });
    });

    // Get recent booking requests
    const recentBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status = :status', { status: BookingStatus.PENDING })
      .orderBy('booking.createdAt', 'DESC')
      .limit(2)
      .getMany();

    recentBookings.forEach(booking => {
      activities.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        message: `New booking request from ${booking.name}`,
        time: this.getRelativeTime(booking.createdAt),
        timestamp: booking.createdAt,
        icon: 'Gift',
        color: 'text-purple-600'
      });
    });

    // Get overdue invoices
    const overdueInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.student', 'student')
      .where('invoice.status = :status', { status: InvoiceStatus.OVERDUE })
      .orderBy('invoice.dueDate', 'ASC')
      .limit(2)
      .getMany();

    overdueInvoices.forEach(invoice => {
      activities.push({
        id: `overdue-${invoice.id}`,
        type: 'overdue',
        message: `Payment overdue - ${invoice.student?.name || 'Unknown Student'}`,
        time: this.getRelativeTime(invoice.dueDate),
        timestamp: invoice.dueDate,
        icon: 'DollarSign',
        color: 'text-red-600'
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private getRelativeTime(date: Date): string {
    // Return formatted date instead of relative time
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async getCheckedOutWithDues() {
    const studentsWithDues = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoin('student.ledgerEntries', 'ledger')
      .select([
        'student.id',
        'student.name',
        'student.phone',
        'student.email',
        'room.roomNumber',
        'SUM(CASE WHEN ledger.balanceType = \'Dr\' THEN ledger.balance ELSE -ledger.balance END) as outstandingDues'
      ])
      .where('student.status = :status', { status: StudentStatus.INACTIVE })
      .groupBy('student.id, room.roomNumber')
      .having('SUM(CASE WHEN ledger.balanceType = \'Dr\' THEN ledger.balance ELSE -ledger.balance END) > 0')
      .getRawMany();

    return studentsWithDues.map(student => ({
      studentId: student.student_id,
      studentName: student.student_name,
      roomNumber: student.room_roomNumber,
      phone: student.student_phone,
      email: student.student_email,
      outstandingDues: parseFloat(student.outstandingDues) || 0,
      checkoutDate: student.student_updatedAt, // Assuming checkout updates the student record
      status: 'pending_payment'
    }));
  }

  async getMonthlyRevenue(months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const monthlyData = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'EXTRACT(YEAR FROM payment.paymentDate) as year',
        'EXTRACT(MONTH FROM payment.paymentDate) as month',
        'SUM(payment.amount) as amount'
      ])
      .where('payment.paymentDate >= :startDate', { startDate })
      .andWhere('payment.paymentDate <= :endDate', { endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('EXTRACT(YEAR FROM payment.paymentDate), EXTRACT(MONTH FROM payment.paymentDate)')
      .orderBy('year, month')
      .getRawMany();

    // Format the data
    return monthlyData.map(data => ({
      month: new Date(data.year, data.month - 1).toLocaleDateString('en-US', { month: 'short' }),
      amount: parseFloat(data.amount) || 0
    }));
  }

  async getOverdueInvoices() {
    // Get invoices that are past due date and not paid
    const overdueInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.student', 'student')
      .leftJoinAndSelect('student.room', 'room')
      .where('invoice.dueDate < :currentDate', { currentDate: new Date() })
      .andWhere('invoice.status IN (:...statuses)', { statuses: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] })
      .orderBy('invoice.dueDate', 'ASC')
      .getMany();

    return overdueInvoices.map(invoice => ({
      id: invoice.id,
      studentId: invoice.student?.id,
      studentName: invoice.student?.name,
      roomNumber: invoice.student?.room?.roomNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      dueDate: invoice.dueDate,
      daysPastDue: Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  async getDashboardSummary() {
    const [
      stats,
      recentActivity,
      checkedOutWithDues,
      monthlyRevenue,
      overdueInvoices
    ] = await Promise.all([
      this.getDashboardStats(),
      this.getRecentActivity(6),
      this.getCheckedOutWithDues(),
      this.getMonthlyRevenue(12),
      this.getOverdueInvoices()
    ]);

    return {
      stats,
      recentActivity,
      checkedOutWithDues,
      monthlyRevenue,
      overdueInvoices: overdueInvoices.slice(0, 5) // Limit to top 5 overdue
    };
  }
}