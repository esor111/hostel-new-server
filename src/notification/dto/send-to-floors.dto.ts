import { IsArray, IsString, IsNotEmpty, ArrayMinSize, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendToFloorsDto {
  @ApiProperty({
    description: 'Array of floor numbers to send notification to',
    example: [1, 2, 3],
    type: [Number]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one floor must be selected' })
  @IsNumber({}, { each: true })
  floors: number[];

  @ApiProperty({
    description: 'Notification title',
    example: 'Floor Meeting Announcement'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'All students on floors 1 and 2, please gather in the common area at 6 PM.'
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Optional image URL for notification',
    example: 'https://example.com/image.jpg',
    required: false
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
