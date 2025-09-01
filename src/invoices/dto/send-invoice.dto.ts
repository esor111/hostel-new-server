import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SendMethod {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp'
}

export class SendInvoiceDto {
  @IsEnum(SendMethod)
  method: SendMethod;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  customMessage?: string;
}