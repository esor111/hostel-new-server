import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingRequest, BookingStatus } from './entities/booking-request.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingRequest)
    private bookingRepository: Repository<BookingRequest>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async findAll(filters: any = {}) {
    const { 
      page = 1, 
      limit = 50, 
      status,
      dateFrom,
      dateTo,
      search 
    } = filters;
    
    const queryBuilder = this.bookingRepository.createQueryBuilder('booking');
    
    // Apply filters
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }
    
    if (dateFrom) {
      queryBuilder.andWhere('booking.requestDate >= :dateFrom', { dateFrom });
    }
    
    if (dateTo) {
      queryBuilder.andWhere('booking.requestDate <= :dateTo', { dateTo });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(booking.name ILIKE :search OR booking.phone ILIKE :search OR booking.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by request date
    queryBuilder.orderBy('booking.requestDate', 'DESC');
    
    const [bookings, total] = await queryBuilder.getManyAndCount();
    
    // Transform to API response format
    const transformedItems = bookings.map(booking => this.transformToApiResponse(booking));
    
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
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['student']
    });
    
    if (!booking) {
      throw new NotFoundException('Booking request not found');
    }
    
    return this.transformToApiResponse(booking);
  }

  async create(createBookingDto: any) {
    // Create booking request entity
    const booking = this.bookingRepository.create({
      id: createBookingDto.id || this.generateBookingId(),
      name: createBookingDto.name,
      phone: createBookingDto.phone,
      email: createBookingDto.email,
      guardianName: createBookingDto.guardianName,
      guardianPhone: createBookingDto.guardianPhone,
      preferredRoom: createBookingDto.preferredRoom,
      course: createBookingDto.course,
      institution: createBookingDto.institution,
      requestDate: createBookingDto.requestDate || new Date(),
      checkInDate: createBookingDto.checkInDate,
      duration: createBookingDto.duration,
      status: createBookingDto.status || BookingStatus.PENDING,
      notes: createBookingDto.notes,
      emergencyContact: createBookingDto.emergencyContact,
      address: createBookingDto.address,
      idProofType: createBookingDto.idProofType,
      idProofNumber: createBookingDto.idProofNumber,
      source: createBookingDto.source || 'website',
      priorityScore: this.calculatePriorityScore(createBookingDto)
    });

    const savedBooking = await this.bookingRepository.save(booking);
    return this.findOne(savedBooking.id);
  }

  async update(id: string, updateBookingDto: any) {
    const booking = await this.findOne(id);
    
    // Update booking request entity
    await this.bookingRepository.update(id, {
      name: updateBookingDto.name,
      phone: updateBookingDto.phone,
      email: updateBookingDto.email,
      guardianName: updateBookingDto.guardianName,
      guardianPhone: updateBookingDto.guardianPhone,
      preferredRoom: updateBookingDto.preferredRoom,
      course: updateBookingDto.course,
      institution: updateBookingDto.institution,
      checkInDate: updateBookingDto.checkInDate,
      duration: updateBookingDto.duration,
      notes: updateBookingDto.notes,
      emergencyContact: updateBookingDto.emergencyContact,
      address: updateBookingDto.address,
      idProofType: updateBookingDto.idProofType,
      idProofNumber: updateBookingDto.idProofNumber
    });

    return this.findOne(id);
  }

  async approveBooking(id: string, approvalData: any) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking request not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Only pending bookings can be approved');
    }

    // Update booking status
    await this.bookingRepository.update(id, {
      status: BookingStatus.APPROVED,
      approvedDate: new Date(),
      processedBy: approvalData.processedBy || 'admin',
      assignedRoom: approvalData.assignedRoom
    });

    // Create student record if auto-create is enabled
    if (approvalData.createStudent) {
      const student = await this.createStudentFromBooking(booking, approvalData);
      
      // Link booking to student
      await this.bookingRepository.update(id, {
        // This will be handled by the student creation process
      });
    }

    return {
      success: true,
      message: 'Booking approved successfully',
      bookingId: id,
      approvedDate: new Date()
    };
  }

  async rejectBooking(id: string, rejectionData: any) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking request not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Only pending bookings can be rejected');
    }

    // Update booking status
    await this.bookingRepository.update(id, {
      status: BookingStatus.REJECTED,
      processedBy: rejectionData.processedBy || 'admin',
      rejectionReason: rejectionData.reason
    });

    return {
      success: true,
      message: 'Booking rejected successfully',
      bookingId: id,
      reason: rejectionData.reason
    };
  }

  async getStats() {
    const totalBookings = await this.bookingRepository.count();
    const pendingBookings = await this.bookingRepository.count({ 
      where: { status: BookingStatus.PENDING } 
    });
    const approvedBookings = await this.bookingRepository.count({ 
      where: { status: BookingStatus.APPROVED } 
    });
    const rejectedBookings = await this.bookingRepository.count({ 
      where: { status: BookingStatus.REJECTED } 
    });
    
    // Source breakdown
    const sourceBreakdown = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('booking.source')
      .getRawMany();

    const sources = {};
    sourceBreakdown.forEach(row => {
      sources[row.source] = parseInt(row.count);
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DATE_TRUNC(\'month\', booking.requestDate)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('booking.requestDate >= :sixMonthsAgo', { 
        sixMonthsAgo: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) 
      })
      .groupBy('DATE_TRUNC(\'month\', booking.requestDate)')
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      totalBookings,
      pendingBookings,
      approvedBookings,
      rejectedBookings,
      cancelledBookings: totalBookings - pendingBookings - approvedBookings - rejectedBookings,
      approvalRate: totalBookings > 0 ? (approvedBookings / totalBookings) * 100 : 0,
      sourceBreakdown: sources,
      monthlyTrend: monthlyTrend.map(row => ({
        month: row.month,
        count: parseInt(row.count)
      }))
    };
  }

  async getPendingBookings() {
    const pendingBookings = await this.bookingRepository.find({
      where: { status: BookingStatus.PENDING },
      order: { priorityScore: 'DESC', requestDate: 'ASC' }
    });
    
    return pendingBookings.map(booking => this.transformToApiResponse(booking));
  }

  // Transform normalized data back to exact API format
  private transformToApiResponse(booking: BookingRequest): any {
    return {
      id: booking.id,
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      guardianName: booking.guardianName,
      guardianPhone: booking.guardianPhone,
      preferredRoom: booking.preferredRoom,
      course: booking.course,
      institution: booking.institution,
      requestDate: booking.requestDate,
      checkInDate: booking.checkInDate,
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      emergencyContact: booking.emergencyContact,
      address: booking.address,
      idProofType: booking.idProofType,
      idProofNumber: booking.idProofNumber,
      approvedDate: booking.approvedDate,
      processedBy: booking.processedBy
    };
  }

  private async createStudentFromBooking(booking: BookingRequest, approvalData: any) {
    // This would create a student record from the booking data
    // Implementation would involve calling the StudentService
    const studentData = {
      id: this.generateStudentId(),
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      guardianName: booking.guardianName,
      guardianPhone: booking.guardianPhone,
      emergencyContact: booking.emergencyContact,
      address: booking.address,
      course: booking.course,
      institution: booking.institution,
      idProofType: booking.idProofType,
      idProofNumber: booking.idProofNumber,
      enrollmentDate: new Date(),
      status: 'Active',
      roomNumber: approvalData.assignedRoom,
      bookingRequestId: booking.id
    };

    // This would be handled by StudentService in a real implementation
    return studentData;
  }

  private calculatePriorityScore(bookingData: any): number {
    let score = 0;
    
    // Early application bonus
    const daysUntilCheckIn = bookingData.checkInDate ? 
      Math.floor((new Date(bookingData.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysUntilCheckIn > 30) score += 10;
    else if (daysUntilCheckIn > 7) score += 5;
    
    // Complete information bonus
    if (bookingData.guardianName && bookingData.guardianPhone) score += 5;
    if (bookingData.emergencyContact) score += 3;
    if (bookingData.idProofType && bookingData.idProofNumber) score += 5;
    
    // Duration bonus (longer stays get priority)
    if (bookingData.duration > 12) score += 10;
    else if (bookingData.duration > 6) score += 5;
    
    return score;
  }

  private generateBookingId(): string {
    return `BKG${Date.now()}`;
  }

  private generateStudentId(): string {
    return `STU${Date.now()}`;
  }
}