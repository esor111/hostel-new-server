import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ 
    description: 'New status for the invoice',
    enum: InvoiceStatus,
    example: InvoiceStatus.PAID
  })
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @ApiProperty({ 
    description: 'Additional notes about the status change',
    example: 'Payment confirmed via bank transfer',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}