import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

// Import all entities
import { Student, StudentStatus } from "../../students/entities/student.entity";
import {
  StudentContact,
  ContactType,
} from "../../students/entities/student-contact.entity";
import { StudentAcademicInfo } from "../../students/entities/student-academic-info.entity";
import {
  StudentFinancialInfo,
  FeeType,
} from "../../students/entities/student-financial-info.entity";

import {
  Room,
  RoomStatus,
  MaintenanceStatus,
  Gender,
} from "../../rooms/entities/room.entity";
import { Building } from "../../rooms/entities/building.entity";
import { RoomType } from "../../rooms/entities/room-type.entity";
import { Amenity } from "../../rooms/entities/amenity.entity";
import { RoomAmenity } from "../../rooms/entities/room-amenity.entity";
import { RoomLayout } from "../../rooms/entities/room-layout.entity";
import { RoomOccupant } from "../../rooms/entities/room-occupant.entity";

import { Invoice, InvoiceStatus } from "../../invoices/entities/invoice.entity";
import {
  InvoiceItem,
  InvoiceItemCategory,
} from "../../invoices/entities/invoice-item.entity";

import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "../../payments/entities/payment.entity";
import { PaymentInvoiceAllocation } from "../../payments/entities/payment-invoice-allocation.entity";

import {
  LedgerEntry,
  LedgerEntryType,
  BalanceType,
} from "../../ledger/entities/ledger-entry.entity";

import {
  Discount,
  DiscountStatus,
  DiscountApplication,
} from "../../discounts/entities/discount.entity";
import {
  DiscountType,
  DiscountCategory,
} from "../../discounts/entities/discount-type.entity";

// import {
//   BookingRequest,
//   BookingStatus,
// } from "../../bookings/entities/booking-request.entity"; // Removed in transition

import { Report } from "../../reports/entities/report.entity";
import { AdminCharge, AdminChargeType, AdminChargeStatus } from "../../admin-charges/entities/admin-charge.entity";
import { Hostel } from "../../hostel/entities/hostel.entity";

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    // Student repositories
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentContact)
    private studentContactRepository: Repository<StudentContact>,
    @InjectRepository(StudentAcademicInfo)
    private studentAcademicRepository: Repository<StudentAcademicInfo>,
    @InjectRepository(StudentFinancialInfo)
    private studentFinancialRepository: Repository<StudentFinancialInfo>,

    // Room repositories
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Building)
    private buildingRepository: Repository<Building>,
    @InjectRepository(RoomType)
    private roomTypeRepository: Repository<RoomType>,
    @InjectRepository(Amenity)
    private amenityRepository: Repository<Amenity>,
    @InjectRepository(RoomAmenity)
    private roomAmenityRepository: Repository<RoomAmenity>,
    @InjectRepository(RoomLayout)
    private roomLayoutRepository: Repository<RoomLayout>,
    @InjectRepository(RoomOccupant)
    private roomOccupantRepository: Repository<RoomOccupant>,

    // Financial repositories
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentInvoiceAllocation)
    private paymentAllocationRepository: Repository<PaymentInvoiceAllocation>,
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,

    // Discount repositories
    @InjectRepository(Discount)
    private discountRepository: Repository<Discount>,
    @InjectRepository(DiscountType)
    private discountTypeRepository: Repository<DiscountType>,

    // Booking repository (commented out during transition)
    // @InjectRepository(BookingRequest)
    // private bookingRepository: Repository<BookingRequest>,

    // Report repository
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,

    // Admin charges repository
    @InjectRepository(AdminCharge)
    private adminChargeRepository: Repository<AdminCharge>,

    // Hostel repository
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>
  ) { }

  async checkSeedStatus() {
    const status = {
      buildings: await this.buildingRepository.count(),
      roomTypes: await this.roomTypeRepository.count(),
      amenities: await this.amenityRepository.count(),
      rooms: await this.roomRepository.count(),
      roomOccupants: await this.roomOccupantRepository.count(),
      students: await this.studentRepository.count(),
      studentContacts: await this.studentContactRepository.count(),
      studentAcademic: await this.studentAcademicRepository.count(),
      studentFinancial: await this.studentFinancialRepository.count(),
      discountTypes: await this.discountTypeRepository.count(),
      discounts: await this.discountRepository.count(),
      invoices: await this.invoiceRepository.count(),
      invoiceItems: await this.invoiceItemRepository.count(),
      payments: await this.paymentRepository.count(),
      paymentAllocations: await this.paymentAllocationRepository.count(),
      ledgerEntries: await this.ledgerRepository.count(),
      adminCharges: await this.adminChargeRepository.count(),
      // bookings: await this.bookingRepository.count(), // Commented out during transition
      reports: await this.reportRepository.count(),
      lastSeeded: new Date().toISOString(),
    };

    this.logger.log("Seed status checked", status);
    return status;
  }

  async seedAll(force = false) {
    this.logger.log("Starting complete database seeding...");

    try {
      // If force is true, clear all data first in proper order
      if (force) {
        await this.clearAllData();
      }

      // Get or create a default hostel for seeding
      let defaultHostel = await this.hostelRepository.findOne({
        where: { businessId: 'default-hostel' }
      });

      if (!defaultHostel) {
        defaultHostel = await this.hostelRepository.save({
          businessId: 'default-hostel',
          name: 'Default Hostel for Seeding',
          isActive: true
        });
        this.logger.log(`Created default hostel: ${defaultHostel.id}`);
      }

      // Use the existing seedAllWithHostelId method which handles all hostel-aware seeding
      return await this.seedAllWithHostelId(defaultHostel.id, false);

    } catch (error) {
      this.logger.error("Error during complete seeding:", error);
      throw error;
    }
  }

  async seedAllWithHostelId(hostelId: string, force = false) {
    this.logger.log(`Starting complete database seeding with hostel ID: ${hostelId}...`);

    try {
      // If force is true, clear all data first in proper order
      if (force) {
        await this.clearAllData();
      }

      // Seed in proper dependency order with hostel ID
      const results = {
        // 1. Independent entities first (these don't need hostel ID)
        buildings: await this.seedBuildings(false),
        roomTypes: await this.seedRoomTypes(false),
        amenities: await this.seedAmenities(false),

        // 2. Rooms depend on buildings, room types, and amenities (with hostel ID)
        rooms: await this.seedRoomsWithHostelId(hostelId, false),

        // 3. Students depend on rooms (with hostel ID)
        students: await this.seedStudentsWithHostelId(hostelId, false),

        // 4. Room occupants depend on students and rooms
        roomOccupants: await this.seedRoomOccupants(false),

        // 5. Discount types before discounts
        discountTypes: await this.seedDiscountTypes(false),

        // 6. Financial entities
        invoices: await this.seedInvoices(false),
        payments: await this.seedPayments(false),
        paymentAllocations: await this.seedPaymentAllocations(false),

        // 7. Discounts depend on students and discount types
        discounts: await this.seedDiscounts(false),

        // 8. Admin charges depend on students
        adminCharges: await this.seedAdminCharges(false),

        // 9. Ledger entries depend on all financial entities
        ledgerEntries: await this.seedLedgerEntriesWithHostelId(hostelId, false),

        // 10. Bookings are temporarily disabled during transition
        // bookings: await this.seedBookings(false),
      };

      this.logger.log(`Complete database seeding with hostel ID ${hostelId} finished`, results);
      return results;
    } catch (error) {
      this.logger.error(`Error during complete seeding with hostel ID ${hostelId}:`, error);
      throw error;
    }
  }

  async seedBuildings(force = false) {
    if (!force && (await this.buildingRepository.count()) > 0) {
      return {
        message: "Buildings already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    const buildings = [
      {
        name: "Main Building",
        address: "123 Hostel Street, City",
        floors: 4,
        totalRooms: 50,
        isActive: true,
      },
      {
        name: "Annex Building",
        address: "456 Hostel Avenue, City",
        floors: 3,
        totalRooms: 30,
        isActive: true,
      },
    ];

    if (force) {
      await this.buildingRepository.createQueryBuilder().delete().execute();
    }

    const savedBuildings = await this.buildingRepository.save(buildings);
    this.logger.log(`Seeded ${savedBuildings.length} buildings`);

    return { count: savedBuildings.length, data: savedBuildings };
  }

  async seedRoomTypes(force = false) {
    if (!force && (await this.roomTypeRepository.count()) > 0) {
      return {
        message: "Room types already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    const roomTypes = [
      {
        name: "Single AC",
        description: "Single occupancy room with air conditioning",
        defaultBedCount: 1,
        maxOccupancy: 1,
        baseMonthlyRate: 8000,
        baseDailyRate: 267,
        pricingModel: "monthly",
        isActive: true,
      },
      {
        name: "Double AC",
        description: "Double occupancy room with air conditioning",
        defaultBedCount: 2,
        maxOccupancy: 2,
        baseMonthlyRate: 6000,
        baseDailyRate: 200,
        pricingModel: "monthly",
        isActive: true,
      },
      {
        name: "Triple Non-AC",
        description: "Triple occupancy room without air conditioning",
        defaultBedCount: 3,
        maxOccupancy: 3,
        baseMonthlyRate: 4000,
        baseDailyRate: 133,
        pricingModel: "monthly",
        isActive: true,
      },
    ];

    if (force) {
      await this.roomTypeRepository.createQueryBuilder().delete().execute();
    }

    const savedRoomTypes = await this.roomTypeRepository.save(roomTypes);
    this.logger.log(`Seeded ${savedRoomTypes.length} room types`);

    return { count: savedRoomTypes.length, data: savedRoomTypes };
  }

  async seedAmenities(force = false) {
    if (!force && (await this.amenityRepository.count()) > 0) {
      return {
        message: "Amenities already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    const amenities = [
      {
        name: "Air Conditioning",
        category: "UTILITIES",
        description: "Split AC unit for room cooling",
        isActive: true,
      },
      {
        name: "WiFi",
        category: "UTILITIES",
        description: "High-speed internet connection",
        isActive: true,
      },
      {
        name: "Study Table",
        category: "FURNITURE",
        description: "Wooden study table with drawers",
        isActive: true,
      },
      {
        name: "Wardrobe",
        category: "FURNITURE",
        description: "3-door wooden wardrobe",
        isActive: true,
      },
      {
        name: "Ceiling Fan",
        category: "UTILITIES",
        description: "High-speed ceiling fan",
        isActive: true,
      },
    ];

    if (force) {
      await this.amenityRepository.createQueryBuilder().delete().execute();
    }

    const savedAmenities = await this.amenityRepository.save(amenities);
    this.logger.log(`Seeded ${savedAmenities.length} amenities`);

    return { count: savedAmenities.length, data: savedAmenities };
  }

  async seedRooms(force = false) {
    if (!force && (await this.roomRepository.count()) > 0) {
      return {
        message: "Rooms already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure dependencies exist
    await this.seedBuildings(false);
    await this.seedRoomTypes(false);
    await this.seedAmenities(false);

    // Get first building and room type for simplicity
    const building = await this.buildingRepository.findOne({ where: {} });
    const roomType = await this.roomTypeRepository.findOne({ where: {} });

    const rooms = [
      {
        name: "Room 101",
        roomNumber: "101",
        bedCount: 2,
        occupancy: 0,
        gender: "Male",
        status: "ACTIVE",
        maintenanceStatus: "Good",
        description: "Double occupancy room on first floor",
        buildingId: building?.id,
        roomTypeId: roomType?.id,
      },
      {
        name: "Room 102",
        roomNumber: "102",
        bedCount: 2,
        occupancy: 1,
        gender: "Male",
        status: "ACTIVE",
        maintenanceStatus: "Good",
        description: "Double occupancy room on first floor",
        buildingId: building?.id,
        roomTypeId: roomType?.id,
      },
      {
        name: "Room 201",
        roomNumber: "201",
        bedCount: 1,
        occupancy: 0,
        gender: "Female",
        status: "ACTIVE",
        maintenanceStatus: "Excellent",
        description: "Single occupancy room on second floor",
        buildingId: building?.id,
        roomTypeId: roomType?.id,
      },
    ];

    if (force) {
      await this.roomRepository.createQueryBuilder().delete().execute();
    }

    const savedRooms = await this.roomRepository.save(rooms);
    this.logger.log(`Seeded ${savedRooms.length} rooms`);

    return { count: savedRooms.length, data: savedRooms };
  }

  async seedRoomsWithHostelId(hostelId: string, force = false) {
    if (!force && (await this.roomRepository.count({ where: { hostelId } })) > 0) {
      return {
        message: `Rooms for hostel ${hostelId} already exist, use ?force=true to reseed`,
        count: 0,
      };
    }

    // Ensure dependencies exist
    await this.seedBuildings(false);
    await this.seedRoomTypes(false);
    await this.seedAmenities(false);

    // Get first building and room type for simplicity
    const building = await this.buildingRepository.findOne({ where: {} });
    const roomType = await this.roomTypeRepository.findOne({ where: {} });

    const rooms = [
      {
        name: "Room 101",
        roomNumber: "101",
        bedCount: 2,
        occupancy: 0,
        gender: "Male",
        status: "ACTIVE",
        maintenanceStatus: "Good",
        description: "Double occupancy room on first floor",
        buildingId: building?.id,
        roomTypeId: roomType?.id,
        hostelId: hostelId,
      },
      {
        name: "Room 102",
        roomNumber: "102",
        bedCount: 2,
        occupancy: 1,
        gender: "Male",
        status: "ACTIVE",
        maintenanceStatus: "Good",
        description: "Double occupancy room on first floor",
        buildingId: building?.id,
        roomTypeId: roomType?.id,
        hostelId: hostelId,
      },
      {
        name: "Room 201",
        roomNumber: "201",
        bedCount: 1,
        occupancy: 0,
        gender: "Female",
        status: "ACTIVE",
        maintenanceStatus: "Excellent",
        description: "Single occupancy room on second floor",
        buildingId: building?.id,
        roomTypeId: roomType?.id,
        hostelId: hostelId,
      },
    ];

    if (force) {
      await this.roomRepository.createQueryBuilder()
        .delete()
        .where("hostelId = :hostelId", { hostelId })
        .execute();
    }

    const savedRooms = await this.roomRepository.save(rooms);
    this.logger.log(`Seeded ${savedRooms.length} rooms for hostel ${hostelId}`);

    return { count: savedRooms.length, data: savedRooms };
  }

  async seedStudents(force = false) {
    if (!force && (await this.studentRepository.count()) > 0) {
      return {
        message: "Students already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure rooms exist (don't force dependencies)
    await this.seedRooms(false);

    const students = [
      {
        name: "Ishwor",
        phone: "+9779841234567",
        email: "ishwor@example.com",
        enrollmentDate: new Date("2024-01-15"),
        status: StudentStatus.ACTIVE,
        address: "Kathmandu, Nepal",
      },
      {
        name: "Ayush",
        phone: "+9779841234568",
        email: "ayush@example.com",
        enrollmentDate: new Date("2024-01-20"),
        status: StudentStatus.ACTIVE,
        address: "Pokhara, Nepal",
      },
      {
        name: "Ajay",
        phone: "+9779841234569",
        email: "ajay@example.com",
        enrollmentDate: new Date("2024-02-01"),
        status: StudentStatus.ACTIVE,
        address: "Lalitpur, Nepal",
      },
      {
        name: "Prashun Thapa",
        phone: "+9779841234570",
        email: "prashun.thapa@example.com",
        enrollmentDate: new Date("2024-02-10"),
        status: StudentStatus.ACTIVE,
        address: "Bhaktapur, Nepal",
      },
      {
        name: "Bhuwan Adhikari",
        phone: "+9779841234571",
        email: "bhuwan.adhikari@example.com",
        enrollmentDate: new Date("2024-02-15"),
        status: StudentStatus.ACTIVE,
        address: "Chitwan, Nepal",
      },
      {
        name: "Sabina Shrestha",
        phone: "+9779841234572",
        email: "sabina.shrestha@example.com",
        enrollmentDate: new Date("2024-02-20"),
        status: StudentStatus.ACTIVE,
        address: "Biratnagar, Nepal",
      },
      {
        name: "John Doe",
        phone: "+1234567890",
        email: "john.doe@example.com",
        enrollmentDate: new Date("2024-03-01"),
        status: StudentStatus.ACTIVE,
        address: "123 Main Street, City",
      },
      {
        name: "Jane Smith",
        phone: "+1234567891",
        email: "jane.smith@example.com",
        enrollmentDate: new Date("2024-03-05"),
        status: StudentStatus.ACTIVE,
        address: "456 Oak Avenue, City",
      },
      {
        name: "Mike Johnson",
        phone: "+1234567892",
        email: "mike.johnson@example.com",
        enrollmentDate: new Date("2024-03-10"),
        status: StudentStatus.ACTIVE,
        address: "789 Pine Road, City",
      },
    ];

    if (force) {
      await this.studentFinancialRepository
        .createQueryBuilder()
        .delete()
        .execute();
      await this.studentAcademicRepository
        .createQueryBuilder()
        .delete()
        .execute();
      await this.studentContactRepository
        .createQueryBuilder()
        .delete()
        .execute();
      await this.studentRepository.createQueryBuilder().delete().execute();
    }

    const savedStudents = await this.studentRepository.save(students);

    // Add contacts
    const contacts = [];
    const guardianData = [
      { name: "Ram Bahadur", phone: "+9779841234500" },
      { name: "Sita Devi", phone: "+9779841234501" },
      { name: "Krishna Prasad", phone: "+9779841234502" },
      { name: "Gita Thapa", phone: "+9779841234503" },
      { name: "Hari Adhikari", phone: "+9779841234504" },
      { name: "Maya Shrestha", phone: "+9779841234505" },
      { name: "Robert Doe", phone: "+1234567800" },
      { name: "Mary Smith", phone: "+1234567801" },
      { name: "David Johnson", phone: "+1234567802" },
    ];

    savedStudents.forEach((student, index) => {
      const guardian = guardianData[index] || guardianData[0];
      contacts.push(
        {
          studentId: student.id,
          type: ContactType.EMERGENCY,
          name: guardian.name,
          phone: guardian.phone,
          relationship: "Guardian",
          isActive: true,
        },
        {
          studentId: student.id,
          type: ContactType.GUARDIAN,
          name: student.name,
          phone: student.phone,
          email: student.email,
          relationship: "Self",
          isActive: true,
        }
      );
    });
    await this.studentContactRepository.save(contacts);

    // Add academic info
    const academicData = [
      {
        course: "Computer Science",
        institution: "Tribhuvan University",
        academicYear: "2023-2024",
        semester: "4th",
        studentIdNumber: "CS2022001",
      },
      {
        course: "Information Technology",
        institution: "Kathmandu University",
        academicYear: "2022-2025",
        semester: "5th",
        studentIdNumber: "IT2022002",
      },
      {
        course: "Business Administration",
        institution: "Pokhara University",
        academicYear: "2021-2024",
        semester: "6th",
        studentIdNumber: "BBA2021003",
      },
      {
        course: "Civil Engineering",
        institution: "Pulchowk Campus",
        academicYear: "2023-2027",
        semester: "3rd",
        studentIdNumber: "CE2023004",
      },
      {
        course: "Electrical Engineering",
        institution: "IOE Thapathali",
        academicYear: "2022-2026",
        semester: "4th",
        studentIdNumber: "EE2022005",
      },
      {
        course: "Pharmacy",
        institution: "KU School of Pharmacy",
        academicYear: "2023-2027",
        semester: "2nd",
        studentIdNumber: "PHARM2023006",
      },
      {
        course: "Computer Science",
        institution: "Tech University",
        academicYear: "2023-2024",
        semester: "4th",
        studentIdNumber: "CS2022007",
      },
      {
        course: "Business Administration",
        institution: "Business College",
        academicYear: "2021-2024",
        semester: "6th",
        studentIdNumber: "BA2021008",
      },
      {
        course: "Mechanical Engineering",
        institution: "Engineering College",
        academicYear: "2023-2027",
        semester: "2nd",
        studentIdNumber: "ME2023009",
      },
    ];

    const academicInfo = savedStudents.map((student, index) => ({
      studentId: student.id,
      ...academicData[index],
      isActive: true,
    }));
    await this.studentAcademicRepository.save(academicInfo);

    // Add financial info
    const financialData = [
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 8000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 7500,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 6000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 6500,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 7000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 5500,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 8000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 6000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 6000,
        effectiveFrom: new Date("2024-07-01"),
      },
    ];

    const financialInfo = savedStudents.map((student, index) => ({
      studentId: student.id,
      ...financialData[index],
      isActive: true,
    }));
    await this.studentFinancialRepository.save(financialInfo);

    this.logger.log(
      `Seeded ${savedStudents.length} students with contacts, academic, and financial info`
    );

    return {
      count: savedStudents.length,
      data: {
        students: savedStudents.length,
        contacts: contacts.length,
        academic: academicInfo.length,
        financial: financialInfo.length,
      },
    };
  }

  async seedStudentsWithHostelId(hostelId: string, force = false) {
    if (!force && (await this.studentRepository.count({ where: { hostelId } })) > 0) {
      return {
        message: `Students for hostel ${hostelId} already exist, use ?force=true to reseed`,
        count: 0,
      };
    }

    // Ensure rooms exist with hostel ID
    await this.seedRoomsWithHostelId(hostelId, false);

    const students = [
      {
        name: "Ishwor",
        phone: "+9779841234567",
        email: "ishwor@example.com",
        enrollmentDate: new Date("2024-01-15"),
        status: StudentStatus.ACTIVE,
        address: "Kathmandu, Nepal",
        hostelId: hostelId,
      },
      {
        name: "Ayush",
        phone: "+9779841234568",
        email: "ayush@example.com",
        enrollmentDate: new Date("2024-01-20"),
        status: StudentStatus.ACTIVE,
        address: "Pokhara, Nepal",
        hostelId: hostelId,
      },
      {
        name: "Ajay",
        phone: "+9779841234569",
        email: "ajay@example.com",
        enrollmentDate: new Date("2024-02-01"),
        status: StudentStatus.ACTIVE,
        address: "Lalitpur, Nepal",
        hostelId: hostelId,
      },
      {
        name: "Prashun Thapa",
        phone: "+9779841234570",
        email: "prashun.thapa@example.com",
        enrollmentDate: new Date("2024-02-10"),
        status: StudentStatus.ACTIVE,
        address: "Bhaktapur, Nepal",
        hostelId: hostelId,
      },
      {
        name: "Bhuwan Adhikari",
        phone: "+9779841234571",
        email: "bhuwan.adhikari@example.com",
        enrollmentDate: new Date("2024-02-15"),
        status: StudentStatus.ACTIVE,
        address: "Chitwan, Nepal",
        hostelId: hostelId,
      },
      {
        name: "Sabina Shrestha",
        phone: "+9779841234572",
        email: "sabina.shrestha@example.com",
        enrollmentDate: new Date("2024-02-20"),
        status: StudentStatus.ACTIVE,
        address: "Biratnagar, Nepal",
        hostelId: hostelId,
      },
    ];

    if (force) {
      await this.studentFinancialRepository
        .createQueryBuilder()
        .delete()
        .where("studentId IN (SELECT id FROM students WHERE hostelId = :hostelId)", { hostelId })
        .execute();
      await this.studentAcademicRepository
        .createQueryBuilder()
        .delete()
        .where("studentId IN (SELECT id FROM students WHERE hostelId = :hostelId)", { hostelId })
        .execute();
      await this.studentContactRepository
        .createQueryBuilder()
        .delete()
        .where("studentId IN (SELECT id FROM students WHERE hostelId = :hostelId)", { hostelId })
        .execute();
      await this.studentRepository.createQueryBuilder()
        .delete()
        .where("hostelId = :hostelId", { hostelId })
        .execute();
    }

    const savedStudents = await this.studentRepository.save(students);

    // Add contacts
    const contacts = [];
    const guardianData = [
      { name: "Ram Bahadur", phone: "+9779841234500" },
      { name: "Sita Devi", phone: "+9779841234501" },
      { name: "Krishna Prasad", phone: "+9779841234502" },
      { name: "Gita Thapa", phone: "+9779841234503" },
      { name: "Hari Adhikari", phone: "+9779841234504" },
      { name: "Maya Shrestha", phone: "+9779841234505" },
    ];

    savedStudents.forEach((student, index) => {
      const guardian = guardianData[index] || guardianData[0];
      contacts.push(
        {
          studentId: student.id,
          type: ContactType.EMERGENCY,
          name: guardian.name,
          phone: guardian.phone,
          relationship: "Guardian",
          isActive: true,
        },
        {
          studentId: student.id,
          type: ContactType.GUARDIAN,
          name: student.name,
          phone: student.phone,
          email: student.email,
          relationship: "Self",
          isActive: true,
        }
      );
    });
    await this.studentContactRepository.save(contacts);

    // Add academic info
    const academicData = [
      {
        course: "Computer Science",
        institution: "Tribhuvan University",
        academicYear: "2023-2024",
        semester: "4th",
        studentIdNumber: "CS2022001",
      },
      {
        course: "Information Technology",
        institution: "Kathmandu University",
        academicYear: "2022-2025",
        semester: "5th",
        studentIdNumber: "IT2022002",
      },
      {
        course: "Business Administration",
        institution: "Pokhara University",
        academicYear: "2021-2024",
        semester: "6th",
        studentIdNumber: "BBA2021003",
      },
      {
        course: "Civil Engineering",
        institution: "Pulchowk Campus",
        academicYear: "2023-2027",
        semester: "3rd",
        studentIdNumber: "CE2023004",
      },
      {
        course: "Electrical Engineering",
        institution: "IOE Thapathali",
        academicYear: "2022-2026",
        semester: "4th",
        studentIdNumber: "EE2022005",
      },
      {
        course: "Pharmacy",
        institution: "KU School of Pharmacy",
        academicYear: "2023-2027",
        semester: "2nd",
        studentIdNumber: "PHARM2023006",
      },
    ];

    const academicInfo = savedStudents.map((student, index) => ({
      studentId: student.id,
      ...academicData[index],
      isActive: true,
    }));
    await this.studentAcademicRepository.save(academicInfo);

    // Add financial info
    const financialData = [
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 8000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 7500,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 6000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 6500,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 7000,
        effectiveFrom: new Date("2024-07-01"),
      },
      {
        feeType: FeeType.BASE_MONTHLY,
        amount: 5500,
        effectiveFrom: new Date("2024-07-01"),
      },
    ];

    const financialInfo = savedStudents.map((student, index) => ({
      studentId: student.id,
      ...financialData[index],
      isActive: true,
    }));
    await this.studentFinancialRepository.save(financialInfo);

    this.logger.log(
      `Seeded ${savedStudents.length} students with contacts, academic, and financial info for hostel ${hostelId}`
    );

    return {
      count: savedStudents.length,
      data: {
        students: savedStudents.length,
        contacts: contacts.length,
        academic: academicInfo.length,
        financial: financialInfo.length,
      },
    };
  }

  async seedInvoices(force = false) {
    if (!force && (await this.invoiceRepository.count()) > 0) {
      return {
        message: "Invoices already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure students exist
    await this.seedStudents(force);

    // Get actual student IDs
    const students = await this.studentRepository.find({ take: 3 });
    if (students.length < 3) {
      throw new Error("Not enough students found for invoice seeding");
    }

    const invoiceData = [
      {
        month: "2024-07",
        dueDate: new Date("2024-07-31"),
        total: 8500,
        status: InvoiceStatus.PAID,
        notes: "Monthly rent and utilities",
        generatedBy: "admin",
      },
      {
        month: "2024-07",
        dueDate: new Date("2024-07-31"),
        total: 6200,
        status: InvoiceStatus.PAID,
        notes: "Monthly rent and utilities",
        generatedBy: "admin",
      },
      {
        month: "2024-07",
        dueDate: new Date("2024-07-31"),
        total: 6200,
        status: InvoiceStatus.PARTIALLY_PAID,
        notes: "Monthly rent and utilities",
        generatedBy: "admin",
      },
    ];

    const invoices = invoiceData.map((invoice, index) => ({
      ...invoice,
      studentId: students[index].id,
      hostelId: students[index].hostelId, // Get hostelId from the student
    }));

    if (force) {
      await this.invoiceItemRepository.createQueryBuilder().delete().execute();
      await this.invoiceRepository.createQueryBuilder().delete().execute();
    }

    const savedInvoices = await this.invoiceRepository.save(invoices);

    // Add invoice items using actual invoice IDs
    const invoiceItemsData = [
      // Invoice 1 items
      [
        {
          description: "Room Rent - Single AC",
          quantity: 1,
          unitPrice: 8000,
          amount: 8000,
          category: InvoiceItemCategory.ACCOMMODATION,
        },
        {
          description: "Electricity Charges",
          quantity: 1,
          unitPrice: 500,
          amount: 500,
          category: InvoiceItemCategory.UTILITIES,
        },
      ],
      // Invoice 2 items
      [
        {
          description: "Room Rent - Double AC",
          quantity: 1,
          unitPrice: 6000,
          amount: 6000,
          category: InvoiceItemCategory.ACCOMMODATION,
        },
        {
          description: "Maintenance Fee",
          quantity: 1,
          unitPrice: 200,
          amount: 200,
          category: InvoiceItemCategory.SERVICES,
        },
      ],
      // Invoice 3 items
      [
        {
          description: "Room Rent - Double AC",
          quantity: 1,
          unitPrice: 6000,
          amount: 6000,
          category: InvoiceItemCategory.ACCOMMODATION,
        },
        {
          description: "Maintenance Fee",
          quantity: 1,
          unitPrice: 200,
          amount: 200,
          category: InvoiceItemCategory.SERVICES,
        },
      ],
    ];

    const invoiceItems = [];
    savedInvoices.forEach((invoice, invoiceIndex) => {
      invoiceItemsData[invoiceIndex]?.forEach((itemData) => {
        invoiceItems.push({
          ...itemData,
          invoiceId: invoice.id,
        });
      });
    });

    const savedItems = await this.invoiceItemRepository.save(invoiceItems);

    this.logger.log(
      `Seeded ${savedInvoices.length} invoices with ${savedItems.length} items`
    );

    return {
      count: savedInvoices.length,
      data: {
        invoices: savedInvoices.length,
        items: savedItems.length,
      },
    };
  }

  async seedPayments(force = false) {
    if (!force && (await this.paymentRepository.count()) > 0) {
      return {
        message: "Payments already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure invoices exist
    await this.seedInvoices(force);

    // Get actual student IDs
    const students = await this.studentRepository.find({ take: 3 });
    if (students.length < 3) {
      throw new Error("Not enough students found for payment seeding");
    }

    const paymentData = [
      {
        amount: 8500,
        paymentDate: new Date("2024-07-05"),
        paymentMethod: PaymentMethod.UPI,
        transactionId: "UPI123456789",
        referenceNumber: "REF001",
        status: PaymentStatus.COMPLETED,
        notes: "Payment for July 2024",
        processedBy: "admin",
      },
      {
        amount: 6200,
        paymentDate: new Date("2024-07-03"),
        paymentMethod: PaymentMethod.CASH,
        transactionId: null,
        referenceNumber: "CASH001",
        status: PaymentStatus.COMPLETED,
        notes: "Cash payment for July 2024",
        processedBy: "admin",
      },
      {
        amount: 3000,
        paymentDate: new Date("2024-07-10"),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionId: "TXN987654321",
        referenceNumber: "NEFT001",
        status: PaymentStatus.COMPLETED,
        notes: "Partial payment for July 2024",
        processedBy: "admin",
        bankName: "State Bank",
      },
    ];

    const payments = paymentData.map((payment, index) => ({
      ...payment,
      studentId: students[index].id,
      hostelId: students[index].hostelId, // Get hostelId from the student
    }));

    if (force) {
      await this.paymentRepository.createQueryBuilder().delete().execute();
    }

    const savedPayments = await this.paymentRepository.save(payments);

    this.logger.log(`Seeded ${savedPayments.length} payments`);

    return { count: savedPayments.length, data: savedPayments };
  }

  async seedDiscounts(force = false) {
    if (!force && (await this.discountRepository.count()) > 0) {
      return {
        message: "Discounts already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure students and discount types exist
    await this.seedStudents(false);
    await this.seedDiscountTypes(false);

    // Get actual student and discount type IDs
    const students = await this.studentRepository.find({ take: 3 });
    const discountTypes = await this.discountTypeRepository.find({ take: 2 });
    const invoices = await this.invoiceRepository.find({ take: 3 });

    if (
      students.length < 2 ||
      discountTypes.length < 2 ||
      invoices.length < 2
    ) {
      throw new Error("Not enough entities found for discount seeding");
    }

    // Then seed actual discounts
    const discounts = [
      {
        id: `DSC${Date.now()}001`,
        studentId: students[0].id,
        hostelId: students[0].hostelId, // Get hostelId from the student
        discountTypeId: discountTypes[0].id,
        amount: 200,
        reason: "Early payment for July 2024",
        notes: "Paid 5 days before due date",
        appliedBy: "admin",
        date: new Date("2024-07-05"),
        status: DiscountStatus.ACTIVE,
        appliedTo: DiscountApplication.LEDGER,
        validFrom: new Date("2024-07-01"),
        validTo: new Date("2024-07-31"),
        isPercentage: false,
        percentageValue: null,
        maxAmount: null,
        referenceId: invoices[0].id,
      },
      {
        id: `DSC${Date.now()}002`,
        studentId: students[2].id,
        hostelId: students[2].hostelId, // Get hostelId from the student
        discountTypeId: discountTypes[1].id,
        amount: 600,
        reason: "Financial hardship assistance",
        notes: "Approved by management for financial difficulties",
        appliedBy: "manager",
        date: new Date("2024-07-01"),
        status: DiscountStatus.ACTIVE,
        appliedTo: DiscountApplication.LEDGER,
        validFrom: new Date("2024-07-01"),
        validTo: new Date("2024-12-31"),
        isPercentage: true,
        percentageValue: 10,
        maxAmount: 1000,
        referenceId: invoices[2].id,
      },
    ];

    if (force) {
      await this.discountRepository.createQueryBuilder().delete().execute();
    }

    const savedDiscounts = await this.discountRepository.save(discounts);

    this.logger.log(`Seeded ${savedDiscounts.length} discounts`);

    return {
      count: savedDiscounts.length,
      data: savedDiscounts,
    };
  }

  async seedRoomOccupants(force = false) {
    if (!force && (await this.roomOccupantRepository.count()) > 0) {
      return {
        message: "Room occupants already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure students and rooms exist
    await this.seedStudents(false);
    await this.seedRooms(false);

    // Get actual student and room IDs
    const students = await this.studentRepository.find({ take: 3 });
    const rooms = await this.roomRepository.find({ take: 3 });

    if (students.length < 3 || rooms.length < 3) {
      throw new Error(
        "Not enough students or rooms found for occupant seeding"
      );
    }

    const roomOccupantData = [
      {
        checkInDate: new Date("2024-01-15"),
        bedNumber: "1",
        status: "Active",
        notes: "Primary occupant",
        assignedBy: "admin",
      },
      {
        checkInDate: new Date("2024-01-20"),
        bedNumber: "1",
        status: "Active",
        notes: "Primary occupant",
        assignedBy: "admin",
      },
      {
        checkInDate: new Date("2024-02-01"),
        bedNumber: "1",
        status: "Active",
        notes: "Primary occupant",
        assignedBy: "admin",
      },
    ];

    const roomOccupants = roomOccupantData.map((occupant, index) => ({
      ...occupant,
      roomId: rooms[index].id,
      studentId: students[index].id,
    }));

    if (force) {
      await this.roomOccupantRepository.createQueryBuilder().delete().execute();
    }

    const savedOccupants =
      await this.roomOccupantRepository.save(roomOccupants);

    // Update room occupancy counts using actual room IDs
    for (let i = 0; i < Math.min(rooms.length, 3); i++) {
      await this.roomRepository.update(rooms[i].id, { occupancy: 1 });
    }

    this.logger.log(`Seeded ${savedOccupants.length} room occupants`);

    return { count: savedOccupants.length, data: savedOccupants };
  }

  async seedDiscountTypes(force = false) {
    if (!force && (await this.discountTypeRepository.count()) > 0) {
      return {
        message: "Discount types already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    const discountTypes = [
      {
        name: "Early Payment Discount",
        category: DiscountCategory.PROMOTIONAL,
        description: "Discount for payments made before due date",
        defaultAmount: 200,
        isPercentage: false,
        percentageValue: null,
        maxAmount: 500,
        requiresApproval: false,
        autoApply: false,
        isActive: true,
      },
      {
        name: "Student Hardship",
        category: DiscountCategory.FINANCIAL_HARDSHIP,
        description: "Financial assistance for students in need",
        defaultAmount: null,
        isPercentage: true,
        percentageValue: 10,
        maxAmount: 1000,
        requiresApproval: true,
        autoApply: false,
        isActive: true,
      },
      {
        name: "Sibling Discount",
        category: DiscountCategory.PROMOTIONAL,
        description: "Discount for students with siblings in the hostel",
        defaultAmount: null,
        isPercentage: true,
        percentageValue: 5,
        maxAmount: 300,
        requiresApproval: false,
        autoApply: true,
        isActive: true,
      },
    ];

    if (force) {
      await this.discountTypeRepository.createQueryBuilder().delete().execute();
    }

    const savedDiscountTypes =
      await this.discountTypeRepository.save(discountTypes);

    this.logger.log(`Seeded ${savedDiscountTypes.length} discount types`);

    return { count: savedDiscountTypes.length, data: savedDiscountTypes };
  }

  async seedPaymentAllocations(force = false) {
    if (!force && (await this.paymentAllocationRepository.count()) > 0) {
      return {
        message: "Payment allocations already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure payments and invoices exist
    await this.seedPayments(false);
    await this.seedInvoices(false);

    // Get actual payment and invoice IDs
    const payments = await this.paymentRepository.find({ take: 3 });
    const invoices = await this.invoiceRepository.find({ take: 3 });

    if (payments.length < 3 || invoices.length < 3) {
      throw new Error(
        "Not enough payments or invoices found for allocation seeding"
      );
    }

    const paymentAllocationData = [
      {
        allocatedAmount: 8500,
        allocationDate: new Date("2024-07-05"),
        notes: "Full payment allocation for July 2024",
      },
      {
        allocatedAmount: 6200,
        allocationDate: new Date("2024-07-03"),
        notes: "Full payment allocation for July 2024",
      },
      {
        allocatedAmount: 3000,
        allocationDate: new Date("2024-07-10"),
        notes: "Partial payment allocation for July 2024",
      },
    ];

    const paymentAllocations = paymentAllocationData.map(
      (allocation, index) => ({
        ...allocation,
        paymentId: payments[index].id,
        invoiceId: invoices[index].id,
      })
    );

    if (force) {
      await this.paymentAllocationRepository
        .createQueryBuilder()
        .delete()
        .execute();
    }

    const savedAllocations =
      await this.paymentAllocationRepository.save(paymentAllocations);

    this.logger.log(`Seeded ${savedAllocations.length} payment allocations`);

    return { count: savedAllocations.length, data: savedAllocations };
  }

  async seedLedgerEntries(force = false) {
    if (!force && (await this.ledgerRepository.count()) > 0) {
      return {
        message: "Ledger entries already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure all financial entities exist
    await this.seedInvoices(false);
    await this.seedPayments(false);
    await this.seedDiscounts(false);

    // Get actual entity IDs
    const students = await this.studentRepository.find({ take: 3 });
    const invoices = await this.invoiceRepository.find({ take: 3 });
    const payments = await this.paymentRepository.find({ take: 3 });
    const discounts = await this.discountRepository.find({ take: 2 });

    if (students.length < 3 || invoices.length < 3 || payments.length < 3) {
      throw new Error("Not enough entities found for ledger seeding");
    }

    const ledgerEntries = [
      // Student 1 - Invoice entry
      {
        studentId: students[0].id,
        type: LedgerEntryType.INVOICE,
        date: new Date("2024-07-01"),
        description: "Monthly rent and utilities - July 2024",
        referenceId: invoices[0].id,
        debit: 8500,
        credit: 0,
        balance: 8500,
        balanceType: BalanceType.DR,
        notes: "Invoice generated for July 2024",
      },
      // Student 1 - Payment entry
      {
        studentId: students[0].id,
        type: LedgerEntryType.PAYMENT,
        date: new Date("2024-07-05"),
        description: "Payment received - July 2024",
        referenceId: payments[0].id,
        debit: 0,
        credit: 8500,
        balance: 0,
        balanceType: BalanceType.NIL,
        notes: "Full payment received",
      },
      // Student 2 - Invoice entry
      {
        studentId: students[1].id,
        type: LedgerEntryType.INVOICE,
        date: new Date("2024-07-01"),
        description: "Monthly rent and utilities - July 2024",
        referenceId: invoices[1].id,
        debit: 6200,
        credit: 0,
        balance: 6200,
        balanceType: BalanceType.DR,
        notes: "Invoice generated for July 2024",
      },
      // Student 2 - Payment entry
      {
        studentId: students[1].id,
        type: LedgerEntryType.PAYMENT,
        date: new Date("2024-07-03"),
        description: "Payment received - July 2024",
        referenceId: payments[1].id,
        debit: 0,
        credit: 6200,
        balance: 0,
        balanceType: BalanceType.NIL,
        notes: "Full payment received",
      },
      // Student 3 - Invoice entry
      {
        studentId: students[2].id,
        type: LedgerEntryType.INVOICE,
        date: new Date("2024-07-01"),
        description: "Monthly rent and utilities - July 2024",
        referenceId: invoices[2].id,
        debit: 6200,
        credit: 0,
        balance: 6200,
        balanceType: BalanceType.DR,
        notes: "Invoice generated for July 2024",
      },
      // Student 3 - Payment entry
      {
        studentId: students[2].id,
        type: LedgerEntryType.PAYMENT,
        date: new Date("2024-07-10"),
        description: "Partial payment received - July 2024",
        referenceId: payments[2].id,
        debit: 0,
        credit: 3000,
        balance: 3200,
        balanceType: BalanceType.DR,
        notes: "Partial payment received",
      },
    ];

    // Add discount entries if available
    if (discounts.length > 0) {
      ledgerEntries.push({
        studentId: students[0].id,
        type: LedgerEntryType.DISCOUNT,
        date: new Date("2024-07-05"),
        description: "Early payment discount",
        referenceId: discounts[0].id,
        debit: 0,
        credit: 200,
        balance: -200,
        balanceType: BalanceType.CR,
        notes: "Early payment discount applied",
      });

      if (discounts.length > 1) {
        ledgerEntries.push({
          studentId: students[2].id,
          type: LedgerEntryType.DISCOUNT,
          date: new Date("2024-07-01"),
          description: "Financial hardship assistance",
          referenceId: discounts[1].id,
          debit: 0,
          credit: 600,
          balance: 2600,
          balanceType: BalanceType.DR,
          notes: "Financial hardship discount applied",
        });
      }
    }

    if (force) {
      await this.ledgerRepository.createQueryBuilder().delete().execute();
    }

    const savedEntries = await this.ledgerRepository.save(ledgerEntries);

    this.logger.log(`Seeded ${savedEntries.length} ledger entries`);

    return { count: savedEntries.length, data: savedEntries };
  }
  async seedLedgerEntriesWithHostelId(hostelId: string, force = false) {
    if (!force && (await this.ledgerRepository.count()) > 0) {
      return {
        message: "Ledger entries already exist, use ?force=true to reseed",
        count: 0,
      };
    }

    // Ensure all financial entities exist
    await this.seedInvoices(false);
    await this.seedPayments(false);
    await this.seedDiscounts(false);

    // Get actual entity IDs
    const students = await this.studentRepository.find({ take: 3 });
    const invoices = await this.invoiceRepository.find({ take: 3 });
    const payments = await this.paymentRepository.find({ take: 3 });
    const discounts = await this.discountRepository.find({ take: 2 });

    if (students.length < 3 || invoices.length < 3 || payments.length < 3) {
      throw new Error("Not enough entities found for ledger seeding");
    }

    const ledgerEntries = [
      // Student 1 - Invoice entry
      {
        studentId: students[0].id,
        hostelId: hostelId,
        type: LedgerEntryType.INVOICE,
        date: new Date("2024-07-01"),
        description: "Monthly rent and utilities - July 2024",
        referenceId: invoices[0].id,
        debit: 8500,
        credit: 0,
        balance: 8500,
        balanceType: BalanceType.DR,
        notes: "Invoice generated for July 2024",
      },
      // Student 1 - Payment entry
      {
        studentId: students[0].id,
        hostelId: hostelId,
        type: LedgerEntryType.PAYMENT,
        date: new Date("2024-07-05"),
        description: "Payment received - July 2024",
        referenceId: payments[0].id,
        debit: 0,
        credit: 8500,
        balance: 0,
        balanceType: BalanceType.NIL,
        notes: "Full payment received",
      },
      // Student 2 - Invoice entry
      {
        studentId: students[1].id,
        hostelId: hostelId,
        type: LedgerEntryType.INVOICE,
        date: new Date("2024-07-01"),
        description: "Monthly rent and utilities - July 2024",
        referenceId: invoices[1].id,
        debit: 6200,
        credit: 0,
        balance: 6200,
        balanceType: BalanceType.DR,
        notes: "Invoice generated for July 2024",
      },
      // Student 2 - Payment entry
      {
        studentId: students[1].id,
        hostelId: hostelId,
        type: LedgerEntryType.PAYMENT,
        date: new Date("2024-07-03"),
        description: "Payment received - July 2024",
        referenceId: payments[1].id,
        debit: 0,
        credit: 6200,
        balance: 0,
        balanceType: BalanceType.NIL,
        notes: "Full payment received",
      },
      // Student 3 - Invoice entry
      {
        studentId: students[2].id,
        hostelId: hostelId,
        type: LedgerEntryType.INVOICE,
        date: new Date("2024-07-01"),
        description: "Monthly rent and utilities - July 2024",
        referenceId: invoices[2].id,
        debit: 6200,
        credit: 0,
        balance: 6200,
        balanceType: BalanceType.DR,
        notes: "Invoice generated for July 2024",
      },
      // Student 3 - Payment entry
      {
        studentId: students[2].id,
        hostelId: hostelId,
        type: LedgerEntryType.PAYMENT,
        date: new Date("2024-07-10"),
        description: "Partial payment received - July 2024",
        referenceId: payments[2].id,
        debit: 0,
        credit: 3000,
        balance: 3200,
        balanceType: BalanceType.DR,
        notes: "Partial payment - balance remaining",
      },
    ];

    // Add discount entries if available
    if (discounts.length > 0) {
      ledgerEntries.push(
        {
          studentId: students[0].id,
          hostelId: hostelId,
          type: LedgerEntryType.DISCOUNT,
          date: new Date("2024-07-02"),
          description: "Early payment discount",
          referenceId: discounts[0].id,
          debit: 0,
          credit: 500,
          balance: 8000,
          balanceType: BalanceType.DR,
          notes: "5% early payment discount applied",
        }
      );
    }

    const savedEntries = await this.ledgerRepository.save(ledgerEntries);

    this.logger.log(`Seeded ${savedEntries.length} ledger entries with hostel ID ${hostelId}`);

    return {
      message: "Ledger entries seeded successfully with hostel ID",
      count: savedEntries.length,
      hostelId: hostelId,
    };
  }

  // Temporarily disabled during BookingRequest entity removal
  // async seedBookings(force = false) {
  //   if (!force && (await this.bookingRepository.count()) > 0) {
  //     return {
  //       message: "Booking requests already exist, use ?force=true to reseed",
  //       count: 0,
  //     };
  //   }
  // ... (booking seed data commented out)
  // }

  async seedAdminCharges(force = false) {
    this.logger.log("Seeding admin charges...");

    if (!force && (await this.adminChargeRepository.count()) > 0) {
      return {
        message: "Admin charges already exist, skipping seeding",
        count: await this.adminChargeRepository.count(),
      };
    }

    // Get some students to create charges for
    const students = await this.studentRepository.find({ take: 5 });

    if (students.length === 0) {
      this.logger.warn("No students found, cannot seed admin charges");
      return { count: 0, data: [] };
    }

    const adminCharges = [];

    // Create charges based on available students
    if (students.length > 0) {
      adminCharges.push({
        studentId: students[0].id,
        hostelId: students[0].hostelId, // Get hostelId from the student
        title: "Late Payment Penalty",
        description: "Penalty for late payment of monthly fees",
        amount: 500.00,
        chargeType: AdminChargeType.ONE_TIME,
        status: AdminChargeStatus.PENDING,
        dueDate: new Date('2025-02-15'),
        category: "Penalty",
        createdBy: "admin",
        adminNotes: "Applied due to payment delay of 15 days"
      });
    }

    if (students.length > 1) {
      adminCharges.push({
        studentId: students[1].id,
        hostelId: students[1].hostelId, // Get hostelId from the student
        title: "Room Damage Charge",
        description: "Charge for damaged window in room",
        amount: 2500.00,
        chargeType: AdminChargeType.ONE_TIME,
        status: AdminChargeStatus.APPLIED,
        appliedDate: new Date('2025-01-10'),
        category: "Maintenance",
        createdBy: "admin",
        adminNotes: "Window replacement cost"
      });
    }

    if (students.length > 2) {
      adminCharges.push({
        studentId: students[2].id,
        hostelId: students[2].hostelId, // Get hostelId from the student
        title: "Extra Laundry Service",
        description: "Additional laundry service charges",
        amount: 300.00,
        chargeType: AdminChargeType.MONTHLY,
        status: AdminChargeStatus.PENDING,
        isRecurring: true,
        recurringMonths: 6,
        category: "Service",
        createdBy: "admin",
        adminNotes: "Premium laundry service for 6 months"
      });
    }

    // Add more charges using the first student if we have at least one
    if (students.length > 0) {
      adminCharges.push({
        studentId: students[0].id,
        hostelId: students[0].hostelId, // Get hostelId from the student
        title: "Guest Stay Charge",
        description: "Charge for guest staying overnight",
        amount: 200.00,
        chargeType: AdminChargeType.DAILY,
        status: AdminChargeStatus.APPLIED,
        appliedDate: new Date('2025-01-08'),
        category: "Guest",
        createdBy: "admin",
        adminNotes: "Guest stayed for 2 nights"
      });

      adminCharges.push({
        studentId: students[0].id,
        hostelId: students[0].hostelId, // Get hostelId from the student
        title: "Key Replacement",
        description: "Replacement of lost room key",
        amount: 150.00,
        chargeType: AdminChargeType.ONE_TIME,
        status: AdminChargeStatus.CANCELLED,
        category: "Miscellaneous",
        createdBy: "admin",
        adminNotes: "Cancelled as key was found"
      });
    }

    if (force) {
      await this.adminChargeRepository.createQueryBuilder().delete().execute();
    }

    const savedCharges = await this.adminChargeRepository.save(adminCharges);

    this.logger.log(`Seeded ${savedCharges.length} admin charges`);

    return { count: savedCharges.length, data: savedCharges };
  }

  async seedCustomData(seedData: any) {
    this.logger.log("Seeding custom data", seedData);

    const results = {};

    for (const [entityType, data] of Object.entries(seedData)) {
      try {
        switch (entityType) {
          case "students":
            results[entityType] = await this.studentRepository.save(data);
            break;
          case "rooms":
            results[entityType] = await this.roomRepository.save(data);
            break;
          case "invoices":
            results[entityType] = await this.invoiceRepository.save(data);
            break;
          case "payments":
            results[entityType] = await this.paymentRepository.save(data);
            break;
          // Add more cases as needed
          default:
            this.logger.warn(`Unknown entity type: ${entityType}`);
        }
      } catch (error) {
        this.logger.error(`Failed to seed ${entityType}:`, error);
        results[entityType] = { error: error.message };
      }
    }

    return results;
  }

  async clearAllData() {
    this.logger.log("Clearing all seeded data...");

    // Clear in proper order to handle foreign key constraints
    const results: any = {};

    try {
      // Clear child tables first (most dependent entities first)
      results.reports = await this.reportRepository
        .createQueryBuilder()
        .delete()
        .execute();
      // results.bookings = await this.bookingRepository // Commented out during transition
      //   .createQueryBuilder()
      //   .delete()
      //   .execute();
      results.ledgerEntries = await this.ledgerRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.adminCharges = await this.adminChargeRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.discounts = await this.discountRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.paymentAllocations = await this.paymentAllocationRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.payments = await this.paymentRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.invoiceItems = await this.invoiceItemRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.invoices = await this.invoiceRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.roomOccupants = await this.roomOccupantRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.studentFinancial = await this.studentFinancialRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.studentAcademic = await this.studentAcademicRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.studentContacts = await this.studentContactRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.students = await this.studentRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.roomLayouts = await this.roomLayoutRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.roomAmenities = await this.roomAmenityRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.rooms = await this.roomRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.discountTypes = await this.discountTypeRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.amenities = await this.amenityRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.roomTypes = await this.roomTypeRepository
        .createQueryBuilder()
        .delete()
        .execute();
      results.buildings = await this.buildingRepository
        .createQueryBuilder()
        .delete()
        .execute();
    } catch (error) {
      this.logger.error("Error clearing data:", error);
      throw error;
    }

    this.logger.log("All data cleared successfully");
    return results;
  }

  async clearEntityData(entityType: string) {
    this.logger.log(`Clearing ${entityType} data...`);

    let result;
    switch (entityType.toLowerCase()) {
      case "students":
        result = await this.studentRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "rooms":
        result = await this.roomRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "room-occupants":
        result = await this.roomOccupantRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "buildings":
        result = await this.buildingRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "room-types":
        result = await this.roomTypeRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "amenities":
        result = await this.amenityRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "invoices":
        result = await this.invoiceRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "payments":
        result = await this.paymentRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "payment-allocations":
        result = await this.paymentAllocationRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "ledger-entries":
        result = await this.ledgerRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "discounts":
        result = await this.discountRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "discount-types":
        result = await this.discountTypeRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      case "bookings":
        // result = await this.bookingRepository // Commented out during transition
        //   .createQueryBuilder()
        //   .delete()
        //   .execute();
        throw new Error(`Bookings entity temporarily disabled during transition`);
        break;
      case "reports":
        result = await this.reportRepository
          .createQueryBuilder()
          .delete()
          .execute();
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    this.logger.log(`${entityType} data cleared successfully`);
    return result;
  }
}
