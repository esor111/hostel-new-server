import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReversalDto {
  @ApiProperty({ 
    description: 'ID of the person who reversed the entry',
    example: 'admin-123',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reversedBy?: string;

  @ApiProperty({ 
    description: 'Reason for reversing the ledger entry',
    example: 'Payment cancelled due to insufficient funds'
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  reason: string;
}