import React from 'react';
import { ProductCard, SkeletonProductCard, ProductCardProps } from './ProductCard';

// Example Usage
const EXAMPLE_PRODUCTS: ProductCardProps[] = [
    {
        id: '1',
        slug: 'heavy-duty-drill',
        name: 'Makita XGT 40V Max Hammer Drill',
        short_description: 'Professional grade hammer drill for concrete and masonry work.',
        image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=800',
        price_hour: 5.50,
        price_day: 25.00,
        deposit: 50.00,
        availability_status: 'available',
        is_24_7: true
    },
    {
        id: '2',
        slug: 'carpet-cleaner',
        name: 'Kärcher Puzzi 10/1 Carpet Cleaner',
        short_description: 'Deep clean carpets and upholstery. Includes detergent.',
        image_url: 'https://images.unsplash.com/photo-1558317374-a35186516d22?auto=format&fit=crop&q=80&w=800',
        price_hour: 8.00,
        price_day: 35.00,
        deposit: 100.00,
        availability_status: 'limited',
        next_available_at: new Date(Date.now() + 3600 * 1000 * 4).toISOString(), // 4 hours from now
        is_24_7: true
    },
    {
        id: '3',
        slug: 'pressure-washer',
        name: 'High Pressure Washer 150bar',
        short_description: 'Ideal for patios, cars, and garden furniture.',
        image_url: 'https://images.unsplash.com/photo-1605615951806-745a30e8c85c?auto=format&fit=crop&q=80&w=800',
        price_hour: 6.50,
        price_day: 28.00,
        deposit: 50.00,
        availability_status: 'unavailable',
        next_available_at: new Date(Date.now() + 3600 * 1000 * 24).toISOString(), // Tomorrow
        is_24_7: false
    }
];

export const CategoryGrid = ({ title = "Popular Tools", isLoading = false }: { title?: string, isLoading?: boolean }) => {
    return (
        <section className="py-8 bg-slate-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                    <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800">View all &rarr;</a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonProductCard key={i} />
                        ))
                    ) : (
                        EXAMPLE_PRODUCTS.map(product => (
                            <ProductCard 
                                key={product.id} 
                                {...product} 
                                onQuickView={(id) => console.log('Quick view', id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};
