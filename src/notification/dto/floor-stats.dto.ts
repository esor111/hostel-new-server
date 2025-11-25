import { ApiProperty } from '@nestjs/swagger';

export class FloorStatsDto {
  @ApiProperty({
    description: 'Floor number',
    example: 1
  })
  floor: number;

  @ApiProperty({
    description: 'Number of active students on this floor',
    example: 15
  })
  studentCount: number;

  @ApiProperty({
    description: 'Number of rooms on this floor',
    example: 8
  })
  roomCount: number;
}

export class FloorStatsResponseDto {
  @ApiProperty({
    description: 'Array of floor statistics',
    type: [FloorStatsDto]
  })
  floors: FloorStatsDto[];

  @ApiProperty({
    description: 'Total number of active students across all floors',
    example: 58
  })
  totalStudents: number;
}
