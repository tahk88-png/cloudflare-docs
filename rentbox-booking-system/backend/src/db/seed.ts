// ═══════════════════════════════════════════════════════════════════════════
// DATABASE SEED DATA
// ═══════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { pool, query } from './index.js';

async function seed() {
  console.log('Seeding database...\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating products...');
  
  const products = [
    {
      name: 'Bosch Professional Hammer Drill',
      description: 'Powerful 800W hammer drill for concrete and masonry work',
      category: 'power-tools',
      base_price_per_hour: 3.50,
      base_price_per_day: 15.00,
      deposit_amount: 50.00,
      image_url: '/images/products/hammer-drill.jpg',
      specifications: JSON.stringify({
        power: '800W',
        max_drilling_concrete: '26mm',
        weight: '2.9kg',
        includes: ['carrying case', 'side handle', '3 drill bits'],
      }),
    },
    {
      name: 'Makita Circular Saw',
      description: '185mm circular saw for precise wood cutting',
      category: 'power-tools',
      base_price_per_hour: 4.00,
      base_price_per_day: 18.00,
      deposit_amount: 60.00,
      image_url: '/images/products/circular-saw.jpg',
      specifications: JSON.stringify({
        blade_diameter: '185mm',
        cutting_depth: '65mm',
        power: '1400W',
        includes: ['blade', 'guide rail'],
      }),
    },
    {
      name: 'DeWalt Angle Grinder',
      description: '125mm angle grinder for cutting and grinding metal',
      category: 'power-tools',
      base_price_per_hour: 2.50,
      base_price_per_day: 12.00,
      deposit_amount: 40.00,
      image_url: '/images/products/angle-grinder.jpg',
      specifications: JSON.stringify({
        disc_diameter: '125mm',
        power: '1000W',
        speed: '11000rpm',
        includes: ['guard', 'handle', 'cutting disc'],
      }),
    },
    {
      name: 'Kärcher Pressure Washer K5',
      description: 'High-pressure washer for outdoor cleaning',
      category: 'cleaning',
      base_price_per_hour: 5.00,
      base_price_per_day: 25.00,
      deposit_amount: 80.00,
      image_url: '/images/products/pressure-washer.jpg',
      specifications: JSON.stringify({
        pressure: '145 bar',
        flow_rate: '500 l/h',
        includes: ['hose', 'lance', 'detergent tank'],
      }),
    },
    {
      name: 'Stihl Chainsaw MS 170',
      description: 'Compact chainsaw for light cutting work',
      category: 'garden',
      base_price_per_hour: 6.00,
      base_price_per_day: 30.00,
      deposit_amount: 100.00,
      image_url: '/images/products/chainsaw.jpg',
      specifications: JSON.stringify({
        engine: '30cc',
        bar_length: '35cm',
        weight: '4.1kg',
        includes: ['chain oil', 'protective gear'],
      }),
    },
    {
      name: 'Hilti Rotary Hammer TE 30',
      description: 'Professional rotary hammer for heavy-duty drilling',
      category: 'power-tools',
      base_price_per_hour: 8.00,
      base_price_per_day: 40.00,
      deposit_amount: 150.00,
      image_url: '/images/products/rotary-hammer.jpg',
      specifications: JSON.stringify({
        energy: '3.3J',
        max_drilling: '32mm',
        weight: '4.7kg',
        includes: ['case', 'SDS bits set'],
      }),
    },
    {
      name: 'Festool Orbital Sander',
      description: 'Professional random orbital sander for fine finishing',
      category: 'power-tools',
      base_price_per_hour: 3.00,
      base_price_per_day: 14.00,
      deposit_amount: 45.00,
      image_url: '/images/products/orbital-sander.jpg',
      specifications: JSON.stringify({
        pad_diameter: '150mm',
        orbit: '5mm',
        dust_extraction: 'yes',
        includes: ['dust bag', 'sanding discs'],
      }),
    },
    {
      name: 'Bosch Jigsaw GST 150',
      description: 'Precision jigsaw for curved cuts',
      category: 'power-tools',
      base_price_per_hour: 2.50,
      base_price_per_day: 12.00,
      deposit_amount: 35.00,
      image_url: '/images/products/jigsaw.jpg',
      specifications: JSON.stringify({
        power: '780W',
        stroke_depth: '26mm',
        includes: ['blade set', 'dust blower'],
      }),
    },
  ];

  for (const product of products) {
    await query(`
      INSERT INTO products (
        name, description, category, base_price_per_hour, 
        base_price_per_day, deposit_amount, image_url, specifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [
      product.name,
      product.description,
      product.category,
      product.base_price_per_hour,
      product.base_price_per_day,
      product.deposit_amount,
      product.image_url,
      product.specifications,
    ]);
  }
  console.log(`  ✓ Created ${products.length} products`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCKERS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating lockers...');

  const lockers = [
    {
      name: 'Rentbox Tallinn Center',
      location: 'Viru Keskus',
      address: 'Viru väljak 4, 10111 Tallinn',
      latitude: 59.4369,
      longitude: 24.7535,
    },
    {
      name: 'Rentbox Tartu',
      location: 'Tasku Keskus',
      address: 'Turu 2, 51014 Tartu',
      latitude: 58.3780,
      longitude: 26.7290,
    },
    {
      name: 'Rentbox Pärnu',
      location: 'Port Artur 2',
      address: 'Lai 9, 80010 Pärnu',
      latitude: 58.3859,
      longitude: 24.4971,
    },
  ];

  const lockerIds: string[] = [];
  
  for (const locker of lockers) {
    const result = await query<{ id: string }>(`
      INSERT INTO lockers (name, location, address, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [locker.name, locker.location, locker.address, locker.latitude, locker.longitude]);
    
    if (result.rows[0]) {
      lockerIds.push(result.rows[0].id);
    }
  }
  console.log(`  ✓ Created ${lockers.length} lockers`);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARTMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating compartments...');

  // Get product IDs
  const productRows = await query<{ id: string; name: string }>('SELECT id, name FROM products');
  const productIds = productRows.rows;

  // Get locker IDs if not created above
  if (lockerIds.length === 0) {
    const lockerRows = await query<{ id: string }>('SELECT id FROM lockers');
    lockerIds.push(...lockerRows.rows.map(r => r.id));
  }

  let compartmentCount = 0;
  
  for (const lockerId of lockerIds) {
    // Create 2 compartments for each product in each locker
    for (let i = 0; i < productIds.length; i++) {
      for (let copy = 1; copy <= 2; copy++) {
        const compartmentNumber = `${String.fromCharCode(65 + Math.floor(i / 3))}${(i % 3) + 1}-${copy}`;
        
        await query(`
          INSERT INTO compartments (locker_id, product_id, compartment_number, size)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [lockerId, productIds[i].id, compartmentNumber, 'standard']);
        
        compartmentCount++;
      }
    }
  }
  console.log(`  ✓ Created ${compartmentCount} compartments`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING RULES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating pricing rules...');

  const pricingRules = [
    {
      name: 'Summer Special',
      description: '10% off all rentals in summer months',
      rule_type: 'seasonal',
      conditions: JSON.stringify({ months: [6, 7, 8] }),
      multiplier: 0.90,
      priority: 10,
      valid_from: new Date('2025-06-01'),
      valid_until: new Date('2025-08-31'),
    },
    {
      name: 'First-time User Discount',
      description: '15% off for first-time users',
      rule_type: 'user_segment',
      conditions: JSON.stringify({ first_booking: true }),
      multiplier: 0.85,
      priority: 20,
    },
    {
      name: 'Professional Tools Premium',
      description: '10% extra for professional-grade tools',
      rule_type: 'category',
      conditions: JSON.stringify({ categories: ['professional'] }),
      multiplier: 1.10,
      priority: 5,
    },
  ];

  for (const rule of pricingRules) {
    await query(`
      INSERT INTO pricing_rules (
        name, description, rule_type, conditions, multiplier, 
        priority, valid_from, valid_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [
      rule.name,
      rule.description,
      rule.rule_type,
      rule.conditions,
      rule.multiplier,
      rule.priority,
      rule.valid_from || null,
      rule.valid_until || null,
    ]);
  }
  console.log(`  ✓ Created ${pricingRules.length} pricing rules`);

  console.log('\nSeeding completed successfully!');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => pool.end());
