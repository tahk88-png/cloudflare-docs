import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('api/products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/slots')
  async getSlots(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('step_minutes') stepMinutes: string = '60',
    @Query('duration_minutes') durationMinutes: string = '240',
    @Query('tz') tz: string = 'Europe/Tallinn',
  ) {
    return this.productsService.getSlots(
      id,
      date,
      parseInt(stepMinutes),
      parseInt(durationMinutes),
      tz,
    );
  }
}
