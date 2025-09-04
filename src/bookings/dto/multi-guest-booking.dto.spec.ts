import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { 
  CreateMultiGuestBookingDto, 
  ContactPersonDto, 
  GuestDto, 
  GuestGender 
} from './multi-guest-booking.dto';

describe('Multi-Guest Booking DTOs', () => {
  describe('ContactPersonDto', () => {
    it('should validate a valid contact person', async () => {
      const contactData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john.doe@example.com'
      };

      const contactDto = plainToClass(ContactPersonDto, contactData);
      const errors = await validate(contactDto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid email', async () => {
      const contactData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'invalid-email'
      };

      const contactDto = plainToClass(ContactPersonDto, contactData);
      const errors = await validate(contactDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation for short name', async () => {
      const contactData = {
        name: 'J',
        phone: '+1234567890',
        email: 'john.doe@example.com'
      };

      const contactDto = plainToClass(ContactPersonDto, contactData);
      const errors = await validate(contactDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation for invalid phone format', async () => {
      const contactData = {
        name: 'John Doe',
        phone: 'invalid-phone',
        email: 'john.doe@example.com'
      };

      const contactDto = plainToClass(ContactPersonDto, contactData);
      const errors = await validate(contactDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('phone');
    });
  });

  describe('GuestDto', () => {
    it('should validate a valid guest', async () => {
      const guestData = {
        bedId: 'bed1',
        name: 'Jane Smith',
        age: 25,
        gender: GuestGender.FEMALE
      };

      const guestDto = plainToClass(GuestDto, guestData);
      const errors = await validate(guestDto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid bed ID format', async () => {
      const guestData = {
        bedId: 'invalid-bed-id',
        name: 'Jane Smith',
        age: 25,
        gender: GuestGender.FEMALE
      };

      const guestDto = plainToClass(GuestDto, guestData);
      const errors = await validate(guestDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('bedId');
    });

    it('should fail validation for invalid age', async () => {
      const guestData = {
        bedId: 'bed1',
        name: 'Jane Smith',
        age: 0,
        gender: GuestGender.FEMALE
      };

      const guestDto = plainToClass(GuestDto, guestData);
      const errors = await validate(guestDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('age');
    });

    it('should fail validation for invalid gender', async () => {
      const guestData = {
        bedId: 'bed1',
        name: 'Jane Smith',
        age: 25,
        gender: 'InvalidGender' as any
      };

      const guestDto = plainToClass(GuestDto, guestData);
      const errors = await validate(guestDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('gender');
    });

    it('should transform age from string to number', async () => {
      const guestData = {
        bedId: 'bed1',
        name: 'Jane Smith',
        age: '25',
        gender: GuestGender.FEMALE
      };

      const guestDto = plainToClass(GuestDto, guestData);
      const errors = await validate(guestDto);

      expect(errors).toHaveLength(0);
      expect(guestDto.age).toBe(25);
      expect(typeof guestDto.age).toBe('number');
    });
  });

  describe('CreateMultiGuestBookingDto', () => {
    it('should validate a valid booking request', async () => {
      const bookingData = {
        contactPerson: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com'
        },
        guests: [
          {
            bedId: 'bed1',
            name: 'Jane Smith',
            age: 25,
            gender: GuestGender.FEMALE
          },
          {
            bedId: 'bed2',
            name: 'Bob Johnson',
            age: 30,
            gender: GuestGender.MALE
          }
        ],
        checkInDate: '2024-01-15',
        duration: '1 month',
        notes: 'Group booking for conference',
        emergencyContact: '+1234567891',
        source: 'mobile_app'
      };

      const bookingDto = plainToClass(CreateMultiGuestBookingDto, bookingData);
      const errors = await validate(bookingDto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation for empty guests array', async () => {
      const bookingData = {
        contactPerson: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com'
        },
        guests: []
      };

      const bookingDto = plainToClass(CreateMultiGuestBookingDto, bookingData);
      const errors = await validate(bookingDto);

      expect(errors.length).toBeGreaterThan(0);
      const guestsError = errors.find(error => error.property === 'guests');
      expect(guestsError).toBeDefined();
    });

    it('should fail validation for too many guests', async () => {
      const guests = Array.from({ length: 11 }, (_, i) => ({
        bedId: `bed${i + 1}`,
        name: `Guest ${i + 1}`,
        age: 25,
        gender: GuestGender.MALE
      }));

      const bookingData = {
        contactPerson: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com'
        },
        guests
      };

      const bookingDto = plainToClass(CreateMultiGuestBookingDto, bookingData);
      const errors = await validate(bookingDto);

      expect(errors.length).toBeGreaterThan(0);
      const guestsError = errors.find(error => error.property === 'guests');
      expect(guestsError).toBeDefined();
    });

    it('should fail validation for duplicate bed assignments', async () => {
      const bookingData = {
        contactPerson: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com'
        },
        guests: [
          {
            bedId: 'bed1',
            name: 'Jane Smith',
            age: 25,
            gender: GuestGender.FEMALE
          },
          {
            bedId: 'bed1', // Duplicate bed ID
            name: 'Bob Johnson',
            age: 30,
            gender: GuestGender.MALE
          }
        ]
      };

      const bookingDto = plainToClass(CreateMultiGuestBookingDto, bookingData);
      const errors = await validate(bookingDto);

      expect(errors.length).toBeGreaterThan(0);
      const guestsError = errors.find(error => error.property === 'guests');
      expect(guestsError).toBeDefined();
    });

    it('should validate optional fields', async () => {
      const bookingData = {
        contactPerson: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com'
        },
        guests: [
          {
            bedId: 'bed1',
            name: 'Jane Smith',
            age: 25,
            gender: GuestGender.FEMALE,
            idProofType: 'Passport',
            idProofNumber: 'A12345678',
            emergencyContact: '+1234567891',
            notes: 'Vegetarian diet'
          }
        ]
      };

      const bookingDto = plainToClass(CreateMultiGuestBookingDto, bookingData);
      const errors = await validate(bookingDto);

      expect(errors).toHaveLength(0);
    });

    it('should transform and trim string values', async () => {
      const bookingData = {
        contactPerson: {
          name: '  John Doe  ',
          phone: '  +1234567890  ',
          email: '  JOHN.DOE@EXAMPLE.COM  '
        },
        guests: [
          {
            bedId: '  BED1  ',
            name: '  Jane Smith  ',
            age: 25,
            gender: GuestGender.FEMALE
          }
        ]
      };

      const bookingDto = plainToClass(CreateMultiGuestBookingDto, bookingData);
      const errors = await validate(bookingDto);

      expect(errors).toHaveLength(0);
      expect(bookingDto.contactPerson.name).toBe('John Doe');
      expect(bookingDto.contactPerson.phone).toBe('+1234567890');
      expect(bookingDto.contactPerson.email).toBe('john.doe@example.com');
      expect(bookingDto.guests[0].bedId).toBe('bed1');
      expect(bookingDto.guests[0].name).toBe('Jane Smith');
    });
  });
});