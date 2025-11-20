import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface HostelContext {
  hostelId: string;
  businessId: string; // The businessId from JWT (real hostel identifier from microservice)
  userId: string;
  kahaId: string;
}

export const HostelContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): HostelContext => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.hostelContext) {
      throw new Error('Hostel context not found. Ensure HostelContextMiddleware is applied.');
    }
    
    return request.hostelContext;
  },
);

export const GetHostelId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.hostelContext?.hostelId) {
      throw new Error('Hostel ID not found in context. Ensure HostelContextMiddleware is applied.');
    }
    
    return request.hostelContext.hostelId;
  },
);

export const GetOptionalHostelId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.hostelContext?.hostelId;
  },
);

export const GetBusinessId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.hostelContext?.businessId) {
      throw new Error('Business ID not found in context. Ensure HostelContextMiddleware is applied.');
    }
    
    return request.hostelContext.businessId;
  },
);
