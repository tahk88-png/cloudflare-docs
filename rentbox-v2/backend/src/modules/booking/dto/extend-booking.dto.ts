import { IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendBookingDto {
  @ApiProperty({
    description: 'New end time in ISO 8601 format',
    example: '2024-01-16T22:00:00+02:00',
  })
  @IsISO8601()
  newEndAt: string;
}
