import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SendMethod {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp'
}

export class SendInvoiceDto {
  @ApiProperty({ 
    description: 'Method to send the invoice',
    enum: SendMethod,
    example: SendMethod.EMAIL
  })
  @IsEnum(SendMethod)
  method: SendMethod;

  @ApiProperty({ 
    description: 'Custom message to include with the invoice',
    example: 'Please find your monthly invoice attached',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  customMessage?: string;
}