import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus, PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment date', required: false })
  @IsOptional()
  @IsDateString()
  paymentDate?: Date;

  @ApiProperty({ description: 'Payment reference', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Payment notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ description: 'Transaction ID', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ description: 'Receipt number', required: false })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiProperty({ description: 'Processed by', required: false })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiProperty({ description: 'Bank name (for bank transfers)', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ description: 'Cheque number (for cheque payments)', required: false })
  @IsOptional()
  @IsString()
  chequeNumber?: string;

  @ApiProperty({ description: 'Cheque date (for cheque payments)', required: false })
  @IsOptional()
  @IsDateString()
  chequeDate?: Date;

  @ApiProperty({ description: 'Invoice IDs to allocate payment to', required: false })
  @IsOptional()
  @IsArray()
  invoiceIds?: string[];

  @ApiProperty({ description: 'Payment type for Nepalese billing system', enum: PaymentType, required: false })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiProperty({ description: 'Month covered by payment (for advance payments)', required: false })
  @IsOptional()
  @IsString()
  monthCovered?: string;

  @ApiProperty({ description: 'Flag to identify configuration advance payment (set by system)', required: false })
  @IsOptional()
  @IsBoolean()
  isConfigurationAdvance?: boolean;
}

export class InvoiceAllocationDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsString()
  invoiceId: string;

  @ApiProperty({ description: 'Amount to allocate' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Allocation notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}