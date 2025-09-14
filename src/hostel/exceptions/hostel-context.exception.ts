import { HttpException, HttpStatus } from '@nestjs/common';

export class HostelContextException extends HttpException {
    constructor(message: string = 'Hostel context required for this operation') {
        super(message, HttpStatus.FORBIDDEN);
    }
}

export class CrossHostelAccessException extends HttpException {
    constructor(
        entityType: string,
        entityId: string,
        requestedHostelId: string,
        actualHostelId: string
    ) {
        const message = `Access denied: ${entityType} ${entityId} belongs to hostel ${actualHostelId}, not ${requestedHostelId}`;
        super(message, HttpStatus.FORBIDDEN);
    }
}

export class InvalidHostelException extends HttpException {
    constructor(businessId: string) {
        super(`Invalid or inactive hostel: ${businessId}`, HttpStatus.FORBIDDEN);
    }
}

export class HostelNotConfiguredException extends HttpException {
    constructor(businessId: string) {
        super(`Hostel not configured: ${businessId}`, HttpStatus.PRECONDITION_FAILED);
    }
}