import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface HostelContext {
  hostelId: string;
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
    
    // Return hostelId if available, otherwise return undefined
    return request.hostelContext?.hostelId;
  },
);