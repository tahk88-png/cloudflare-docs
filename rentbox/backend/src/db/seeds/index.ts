import db from '../connection.js';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('Seeding database...');
  
  try {
    // Create products
    const products = [
      {
        name: 'Drill - Makita 18V',
        description: 'Professional cordless drill with 2 batteries',
        category: 'power_tools',
        base_price_hourly: 5.00,
        base_price_daily: 25.00,
        deposit_amount: 50.00,
      },
      {
        name: 'Angle Grinder - Bosch',
        description: '125mm angle grinder, perfect for cutting and grinding',
        category: 'power_tools',
        base_price_hourly: 4.00,
        base_price_daily: 20.00,
        deposit_amount: 40.00,
      },
      {
        name: 'Pressure Washer - Kärcher K5',
        description: 'High-pressure washer for cleaning cars, patios, etc.',
        category: 'cleaning',
        base_price_hourly: 8.00,
        base_price_daily: 40.00,
        deposit_amount: 100.00,
      },
      {
        name: 'Ladder - 3m Aluminum',
        description: 'Lightweight aluminum ladder, extends to 3 meters',
        category: 'access',
        base_price_hourly: 3.00,
        base_price_daily: 15.00,
        deposit_amount: 30.00,
      },
      {
        name: 'Circular Saw - DeWalt',
        description: 'Professional circular saw for wood and metal',
        category: 'power_tools',
        base_price_hourly: 6.00,
        base_price_daily: 30.00,
        deposit_amount: 60.00,
      },
    ];
    
    const productIds: string[] = [];
    
    for (const product of products) {
      const result = await db.query(
        `INSERT INTO products (name, description, category, base_price_hourly, base_price_daily, deposit_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          product.name,
          product.description,
          product.category,
          product.base_price_hourly,
          product.base_price_daily,
          product.deposit_amount,
        ]
      );
      productIds.push(result.rows[0].id);
      console.log(`✓ Created product: ${product.name}`);
    }
    
    // Create compartments (3 lockers with different sized compartments)
    const compartments = [];
    const lockerConfigs = [
      { locker_id: 'LOC-A-001', sizes: ['small', 'small', 'medium', 'large'] },
      { locker_id: 'LOC-B-002', sizes: ['small', 'medium', 'medium', 'large'] },
      { locker_id: 'LOC-C-003', sizes: ['small', 'small', 'small', 'medium', 'large'] },
    ];
    
    const compartmentIds: string[] = [];
    
    for (const config of lockerConfigs) {
      for (let i = 0; i < config.sizes.length; i++) {
        const result = await db.query(
          `INSERT INTO compartments (locker_id, compartment_number, size)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [config.locker_id, i + 1, config.sizes[i]]
        );
        compartmentIds.push(result.rows[0].id);
        console.log(`✓ Created compartment: ${config.locker_id}-${i + 1} (${config.sizes[i]})`);
      }
    }
    
    // Map products to compatible compartments
    const sizeCompatibility: Record<string, string[]> = {
      'Drill - Makita 18V': ['small', 'medium', 'large'],
      'Angle Grinder - Bosch': ['small', 'medium', 'large'],
      'Pressure Washer - Kärcher K5': ['large'],
      'Ladder - 3m Aluminum': ['large'],
      'Circular Saw - DeWalt': ['medium', 'large'],
    };
    
    for (let i = 0; i < products.length; i++) {
      const productName = products[i].name;
      const compatibleSizes = sizeCompatibility[productName];
      
      // Get all compartments that match the compatible sizes
      const compatibleCompartments = await db.query(
        `SELECT id FROM compartments WHERE size = ANY($1)`,
        [compatibleSizes]
      );
      
      for (const compartment of compatibleCompartments.rows) {
        await db.query(
          `INSERT INTO product_compartments (product_id, compartment_id, priority)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, compartment_id) DO NOTHING`,
          [productIds[i], compartment.id, Math.floor(Math.random() * 10)]
        );
      }
      
      console.log(`✓ Mapped ${productName} to ${compatibleCompartments.rows.length} compartments`);
    }
    
    // Create pricing rules
    const pricingRules = [
      {
        name: 'Peak Hours Multiplier',
        rule_type: 'peak_hours',
        conditions: { hours: [8, 9, 10, 11, 16, 17, 18, 19] },
        multiplier: 1.2,
        priority: 10,
      },
      {
        name: 'Weekend Multiplier',
        rule_type: 'weekend',
        conditions: { days: [6, 0] }, // Saturday, Sunday
        multiplier: 1.3,
        priority: 20,
      },
      {
        name: 'Long Rental Discount (3+ days)',
        rule_type: 'duration_discount',
        conditions: { min_days: 3 },
        discount_percentage: 10,
        priority: 5,
      },
      {
        name: 'Long Rental Discount (7+ days)',
        rule_type: 'duration_discount',
        conditions: { min_days: 7 },
        discount_percentage: 20,
        priority: 6,
      },
    ];
    
    for (const rule of pricingRules) {
      await db.query(
        `INSERT INTO pricing_rules (name, rule_type, conditions, multiplier, discount_percentage, priority, active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [
          rule.name,
          rule.rule_type,
          JSON.stringify(rule.conditions),
          rule.multiplier || null,
          rule.discount_percentage || null,
          rule.priority,
        ]
      );
      console.log(`✓ Created pricing rule: ${rule.name}`);
    }
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`   Products: ${products.length}`);
    console.log(`   Compartments: ${compartmentIds.length}`);
    console.log(`   Pricing Rules: ${pricingRules.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
