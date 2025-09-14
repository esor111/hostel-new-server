import { Injectable, Logger } from '@nestjs/common';

export interface HostelAuditLog {
  hostelId: string;
  userId?: string;
  operation: string;
  entityType: string;
  entityId?: string;
  details?: any;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface SecurityViolationLog {
  hostelId: string;
  userId?: string;
  violationType: 'CROSS_HOSTEL_ACCESS' | 'UNAUTHORIZED_OPERATION' | 'INVALID_CONTEXT';
  operation: string;
  entityType: string;
  entityId?: string;
  requestedHostelId?: string;
  actualHostelId?: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  details?: any;
}

@Injectable()
export class HostelAuditService {
  private readonly logger = new Logger(HostelAuditService.name);

  /**
   * Log hostel-scoped operation
   */
  logOperation(auditLog: HostelAuditLog): void {
    const logMessage = `Hostel Operation: ${auditLog.operation} on ${auditLog.entityType}`;
    
    const logData = {
      hostelId: auditLog.hostelId,
      userId: auditLog.userId,
      operation: auditLog.operation,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      success: auditLog.success,
      timestamp: auditLog.timestamp.toISOString(),
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      details: auditLog.details,
      errorMessage: auditLog.errorMessage
    };

    if (auditLog.success) {
      this.logger.log(`${logMessage} - SUCCESS`, logData);
    } else {
      this.logger.error(`${logMessage} - FAILED: ${auditLog.errorMessage}`, logData);
    }
  }

  /**
   * Log security violation
   */
  logSecurityViolation(violation: SecurityViolationLog): void {
    const logMessage = `SECURITY VIOLATION: ${violation.violationType} - ${violation.operation} on ${violation.entityType}`;
    
    const logData = {
      violationType: violation.violationType,
      hostelId: violation.hostelId,
      userId: violation.userId,
      operation: violation.operation,
      entityType: violation.entityType,
      entityId: violation.entityId,
      requestedHostelId: violation.requestedHostelId,
      actualHostelId: violation.actualHostelId,
      timestamp: violation.timestamp.toISOString(),
      ip: violation.ip,
      userAgent: violation.userAgent,
      details: violation.details
    };

    this.logger.error(logMessage, logData);

    // In production, you might want to send alerts or store in a security log database
    this.handleSecurityAlert(violation);
  }

  /**
   * Log successful hostel-scoped create operation
   */
  logCreate(
    hostelId: string,
    entityType: string,
    entityId: string,
    userId?: string,
    details?: any
  ): void {
    this.logOperation({
      hostelId,
      userId,
      operation: 'CREATE',
      entityType,
      entityId,
      details,
      timestamp: new Date(),
      success: true
    });
  }

  /**
   * Log successful hostel-scoped read operation
   */
  logRead(
    hostelId: string,
    entityType: string,
    entityId?: string,
    userId?: string,
    details?: any
  ): void {
    this.logOperation({
      hostelId,
      userId,
      operation: 'READ',
      entityType,
      entityId,
      details,
      timestamp: new Date(),
      success: true
    });
  }

  /**
   * Log successful hostel-scoped update operation
   */
  logUpdate(
    hostelId: string,
    entityType: string,
    entityId: string,
    userId?: string,
    details?: any
  ): void {
    this.logOperation({
      hostelId,
      userId,
      operation: 'UPDATE',
      entityType,
      entityId,
      details,
      timestamp: new Date(),
      success: true
    });
  }

  /**
   * Log successful hostel-scoped delete operation
   */
  logDelete(
    hostelId: string,
    entityType: string,
    entityId: string,
    userId?: string,
    details?: any
  ): void {
    this.logOperation({
      hostelId,
      userId,
      operation: 'DELETE',
      entityType,
      entityId,
      details,
      timestamp: new Date(),
      success: true
    });
  }

  /**
   * Log failed operation
   */
  logFailedOperation(
    hostelId: string,
    operation: string,
    entityType: string,
    errorMessage: string,
    entityId?: string,
    userId?: string,
    details?: any
  ): void {
    this.logOperation({
      hostelId,
      userId,
      operation,
      entityType,
      entityId,
      details,
      timestamp: new Date(),
      success: false,
      errorMessage
    });
  }

  /**
   * Log cross-hostel access attempt
   */
  logCrossHostelAccess(
    operation: string,
    entityType: string,
    entityId: string,
    requestedHostelId: string,
    actualHostelId: string,
    userId?: string,
    details?: any
  ): void {
    this.logSecurityViolation({
      violationType: 'CROSS_HOSTEL_ACCESS',
      hostelId: requestedHostelId,
      userId,
      operation,
      entityType,
      entityId,
      requestedHostelId,
      actualHostelId,
      timestamp: new Date(),
      details
    });
  }

  /**
   * Log unauthorized operation attempt
   */
  logUnauthorizedOperation(
    hostelId: string,
    operation: string,
    entityType: string,
    userId?: string,
    entityId?: string,
    details?: any
  ): void {
    this.logSecurityViolation({
      violationType: 'UNAUTHORIZED_OPERATION',
      hostelId,
      userId,
      operation,
      entityType,
      entityId,
      timestamp: new Date(),
      details
    });
  }

  /**
   * Log invalid hostel context
   */
  logInvalidContext(
    operation: string,
    entityType: string,
    userId?: string,
    details?: any
  ): void {
    this.logSecurityViolation({
      violationType: 'INVALID_CONTEXT',
      hostelId: 'UNKNOWN',
      userId,
      operation,
      entityType,
      timestamp: new Date(),
      details
    });
  }

  /**
   * Handle security alert (can be extended for notifications, etc.)
   */
  private handleSecurityAlert(violation: SecurityViolationLog): void {
    // In production, you might want to:
    // 1. Send email/SMS alerts to administrators
    // 2. Store in a dedicated security database
    // 3. Trigger automated security responses
    // 4. Update security metrics/dashboards
    
    this.logger.warn(`Security alert triggered for violation: ${violation.violationType}`);
  }

  /**
   * Get audit summary for a hostel (for admin dashboard)
   */
  getAuditSummary(hostelId: string, timeRange?: { from: Date; to: Date }) {
    // This would typically query a database of audit logs
    // For now, return a placeholder structure
    return {
      hostelId,
      timeRange,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      securityViolations: 0,
      topOperations: [],
      topUsers: []
    };
  }
}