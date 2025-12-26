import { IsUUID, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Product ID to book',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Compartment ID for the booking',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  compartmentId: string;

  @ApiProperty({
    description: 'Start time in ISO 8601 format',
    example: '2024-01-16T10:00:00+02:00',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    description: 'End time in ISO 8601 format',
    example: '2024-01-16T18:00:00+02:00',
  })
  @IsISO8601()
  endAt: string;

  @ApiPropertyOptional({
    description: 'Timezone for display purposes',
    example: 'Europe/Tallinn',
    default: 'Europe/Tallinn',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
