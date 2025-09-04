import { Injectable, Logger } from '@nestjs/common';
import { MultiGuestBooking, MultiGuestBookingStatus } from './entities/multi-guest-booking.entity';
import { BookingGuest } from './entities/booking-guest.entity';

export interface BookingRequestFormat {
  id: string;
  name: string;
  phone: string;
  email: string;
  guardianName?: string;
  guardianPhone?: string;
  preferredRoom?: string;
  course?: string;
  institution?: string;
  requestDate: Date;
  checkInDate?: Date;
  duration?: string;
  status: string;
  notes?: string;
  emergencyContact?: string;
  address?: string;
  idProofType?: string;
  idProofNumber?: string;
  approvedDate?: Date;
  processedBy?: string;
  rejectionReason?: string;
  assignedRoom?: string;
  priorityScore: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingStatsFormat {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  cancelledBookings: number;
  approvalRate: number;
  sourceBreakdown: Record<string, number>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

@Injectable()
export class BookingTransformationService {
  private readonly logger = new Logger(BookingTransformationService.name);

  /**
   * Transform MultiGuestBooking to BookingRequest format for API compatibility
   */
  transformToBookingRequestFormat(booking: MultiGuestBooking): BookingRequestFormat {
    const primaryGuest = booking.guests?.[0];
    
    // For single guest bookings, prioritize contact person data over guest data
    // For multi-guest bookings, use contact person as primary
    const isMultiGuest = booking.totalGuests > 1;
    
    return {
      id: booking.id,
      name: booking.contactName || primaryGuest?.guestName,
      phone: booking.contactPhone || primaryGuest?.phone,
      email: booking.contactEmail || primaryGuest?.email,
      guardianName: booking.guardianName || primaryGuest?.guardianName,
      guardianPhone: booking.guardianPhone || primaryGuest?.guardianPhone,
      preferredRoom: booking.preferredRoom || primaryGuest?.bedId,
      course: booking.course || primaryGuest?.course,
      institution: booking.institution || primaryGuest?.institution,
      requestDate: booking.requestDate || booking.createdAt,
      checkInDate: booking.checkInDate,
      duration: booking.duration,
      status: this.mapMultiGuestStatusToBookingStatus(booking.status),
      notes: booking.notes,
      emergencyContact: booking.emergencyContact,
      address: booking.address || primaryGuest?.address,
      idProofType: booking.idProofType || primaryGuest?.idProofType,
      idProofNumber: booking.idProofNumber || primaryGuest?.idProofNumber,
      approvedDate: booking.approvedDate,
      processedBy: booking.processedBy,
      rejectionReason: booking.rejectionReason,
      assignedRoom: booking.assignedRoom || primaryGuest?.assignedRoomNumber,
      priorityScore: booking.priorityScore || 0,
      source: booking.source || 'website',
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }

  /**
   * Transform multiple MultiGuestBookings to BookingRequest format
   */
  transformMultipleToBookingRequestFormat(bookings: MultiGuestBooking[]): BookingRequestFormat[] {
    return bookings.map(booking => this.transformToBookingRequestFormat(booking));
  }

  /**
   * Transform MultiGuestBooking stats to BookingRequest stats format
   */
  transformStatsToBookingRequestFormat(multiGuestStats: any): BookingStatsFormat {
    return {
      totalBookings: multiGuestStats.totalBookings || 0,
      pendingBookings: multiGuestStats.pendingBookings || 0,
      approvedBookings: multiGuestStats.approvedBookings || 0,
      rejectedBookings: multiGuestStats.rejectedBookings || 0,
      cancelledBookings: multiGuestStats.cancelledBookings || 0,
      approvalRate: multiGuestStats.approvalRate || 0,
      sourceBreakdown: multiGuestStats.sourceBreakdown || {},
      monthlyTrend: multiGuestStats.monthlyTrend || []
    };
  }

  /**
   * Map MultiGuestBooking status to BookingRequest status
   */
  private mapMultiGuestStatusToBookingStatus(status: MultiGuestBookingStatus): string {
    switch (status) {
      case MultiGuestBookingStatus.PENDING:
        return 'Pending';
      case MultiGuestBookingStatus.CONFIRMED:
      case MultiGuestBookingStatus.PARTIALLY_CONFIRMED:
        return 'Approved';
      case MultiGuestBookingStatus.CANCELLED:
        return 'Rejected';
      case MultiGuestBookingStatus.COMPLETED:
        return 'Approved';
      default:
        return 'Pending';
    }
  }

  /**
   * Map BookingRequest status to MultiGuestBooking status
   */
  mapBookingStatusToMultiGuestStatus(status: string): MultiGuestBookingStatus {
    switch (status.toLowerCase()) {
      case 'pending':
        return MultiGuestBookingStatus.PENDING;
      case 'approved':
        return MultiGuestBookingStatus.CONFIRMED;
      case 'rejected':
      case 'cancelled':
        return MultiGuestBookingStatus.CANCELLED;
      default:
        return MultiGuestBookingStatus.PENDING;
    }
  }

  /**
   * Check if a booking is a single guest booking (for filtering)
   */
  isSingleGuestBooking(booking: MultiGuestBooking): boolean {
    return booking.totalGuests === 1;
  }

  /**
   * Check if a booking is a multi guest booking (for filtering)
   */
  isMultiGuestBooking(booking: MultiGuestBooking): boolean {
    return booking.totalGuests > 1;
  }

  /**
   * Filter bookings by type
   */
  filterBookingsByType(bookings: MultiGuestBooking[], type: 'single' | 'multi' | 'all' = 'all'): MultiGuestBooking[] {
    switch (type) {
      case 'single':
        return bookings.filter(booking => this.isSingleGuestBooking(booking));
      case 'multi':
        return bookings.filter(booking => this.isMultiGuestBooking(booking));
      case 'all':
      default:
        return bookings;
    }
  }

  /**
   * Get booking type label
   */
  getBookingTypeLabel(booking: MultiGuestBooking): string {
    return booking.totalGuests === 1 ? 'Single Guest' : `Multi Guest (${booking.totalGuests})`;
  }

  /**
   * Validate booking data consistency
   */
  validateBookingConsistency(booking: MultiGuestBooking): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check guest count consistency
    if (booking.guests && booking.guests.length !== booking.totalGuests) {
      errors.push(`Guest count mismatch: expected ${booking.totalGuests}, found ${booking.guests.length}`);
    }

    // Check confirmed guest count
    if (booking.guests) {
      const actualConfirmedGuests = booking.guests.filter(guest => guest.status === 'Confirmed').length;
      if (actualConfirmedGuests !== booking.confirmedGuests) {
        errors.push(`Confirmed guest count mismatch: expected ${booking.confirmedGuests}, found ${actualConfirmedGuests}`);
      }
    }

    // Check contact person information
    if (!booking.contactName || !booking.contactPhone || !booking.contactEmail) {
      errors.push('Missing required contact person information');
    }

    // Check booking reference format
    if (!booking.bookingReference || !booking.bookingReference.match(/^MGB\d{6}[A-Z0-9]{6}$/)) {
      errors.push('Invalid booking reference format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate booking summary for reporting
   */
  generateBookingSummary(booking: MultiGuestBooking): any {
    return {
      id: booking.id,
      reference: booking.bookingReference,
      type: this.getBookingTypeLabel(booking),
      contactPerson: booking.contactName,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
      totalGuests: booking.totalGuests,
      confirmedGuests: booking.confirmedGuests,
      status: booking.status,
      source: booking.source,
      requestDate: booking.requestDate,
      checkInDate: booking.checkInDate,
      priorityScore: booking.priorityScore || 0,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }

  /**
   * Log transformation activity
   */
  logTransformation(operation: string, count: number, type?: string): void {
    const typeLabel = type ? ` (${type})` : '';
    this.logger.log(`${operation}: Transformed ${count} booking(s)${typeLabel}`);
  }
}