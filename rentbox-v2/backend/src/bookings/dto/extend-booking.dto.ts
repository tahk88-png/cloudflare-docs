import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendBookingDto {
  @ApiProperty({ description: 'New end time (ISO 8601)', example: '2024-01-15T20:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  newEndAt: string;
}
