import { PushNotificationTypeEnum } from '../enums/notification-types.enum';

export interface NotificationTemplate {
  title: string;
  message: string;
  variables?: string[];
}

export const BOOKING_NOTIFICATION_MESSAGES: Record<string, NotificationTemplate> = {
  [PushNotificationTypeEnum.BOOKING_REQUEST]: {
    title: "New Booking Request",
    message: "New booking request from {contactName} for {checkInDate}. {guestCount} guest(s) requesting accommodation.",
    variables: ['contactName', 'checkInDate', 'guestCount']
  },
  
  [PushNotificationTypeEnum.BOOKING_APPROVED]: {
    title: "Booking Approved ✅",
    message: "Great news! Your booking has been approved for {checkInDate}. Welcome to {hostelName}! Check-in details will be shared shortly.",
    variables: ['checkInDate', 'hostelName']
  },
  
  [PushNotificationTypeEnum.BOOKING_REJECTED]: {
    title: "Booking Update",
    message: "We regret to inform you that your booking request for {checkInDate} could not be approved. Reason: {reason}",
    variables: ['checkInDate', 'reason']
  },
  
  [PushNotificationTypeEnum.BOOKING_CONFIRMED]: {
    title: "Booking Confirmed 🎉",
    message: "Your group booking for {guestCount} guests has been confirmed! Check-in date: {checkInDate}. Welcome to {hostelName}!",
    variables: ['guestCount', 'checkInDate', 'hostelName']
  },
  
  [PushNotificationTypeEnum.BOOKING_CANCELLED]: {
    title: "Booking Cancelled",
    message: "Your booking for {checkInDate} has been cancelled. Reason: {reason}. Please contact us for any queries.",
    variables: ['checkInDate', 'reason']
  }
};

/**
 * Replace template variables with actual values
 * @param template - The notification template
 * @param variables - Key-value pairs for variable replacement
 * @returns Formatted message with variables replaced
 */
export function formatNotificationMessage(
  template: NotificationTemplate,
  variables: Record<string, string | number>
): { title: string; message: string } {
  let formattedTitle = template.title;
  let formattedMessage = template.message;
  
  // Replace variables in both title and message
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    formattedTitle = formattedTitle.replace(new RegExp(placeholder, 'g'), String(value));
    formattedMessage = formattedMessage.replace(new RegExp(placeholder, 'g'), String(value));
  });
  
  return {
    title: formattedTitle,
    message: formattedMessage
  };
}