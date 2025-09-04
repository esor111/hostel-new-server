export { CreateBookingDto } from './create-booking.dto';
export { UpdateBookingDto } from './update-booking.dto';
export { ApprovalDto } from './approval.dto';
export { RejectionDto } from './rejection.dto';
export { 
  CreateMultiGuestBookingDto, 
  ContactPersonDto, 
  GuestDto, 
  GuestGender 
} from './multi-guest-booking.dto';
export { ConfirmBookingDto } from './confirm-booking.dto';
export { CancelBookingDto } from './cancel-booking.dto';
export { 
  QueryMultiGuestBookingDto, 
  BookingStatus, 
  BookingSortBy, 
  SortOrder 
} from './query-multi-guest-booking.dto';
export { 
  ValidationErrorDetail,
  ValidationErrorResponse,
  BedValidationError,
  GenderCompatibilityError
} from './validation-error.dto';
export { IsGenderCompatible } from './validators/gender-compatibility.validator';
export { HasUniqueBedAssignments } from './validators/bed-availability.validator';