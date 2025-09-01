import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceAllocationDto } from './create-payment.dto';

export class AllocatePaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceAllocationDto)
  invoiceAllocations: InvoiceAllocationDto[];
}