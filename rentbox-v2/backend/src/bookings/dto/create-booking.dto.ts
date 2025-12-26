import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Compartment ID' })
  @IsUUID()
  @IsNotEmpty()
  compartmentId: string;

  @ApiProperty({ description: 'Booking start time (ISO 8601)', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startAt: string;

  @ApiProperty({ description: 'Booking end time (ISO 8601)', example: '2024-01-15T18:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endAt: string;
}
