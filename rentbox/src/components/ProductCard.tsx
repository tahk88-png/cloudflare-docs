import React from 'react';
import { Card, Badge, Button, Skeleton } from './ui';

export interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  image_url: string;
  price_hour: number;
  price_day: number;
  deposit?: number;
  availability_status: 'available' | 'limited' | 'unavailable';
  next_available_at?: string; // ISO string
  is_24_7?: boolean;
  onQuickView?: (id: string) => void;
}

// Icons (SVG implementation for zero dependencies)
const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export const ProductCard = ({
  id,
  name,
  short_description,
  image_url,
  price_hour,
  price_day,
  deposit,
  availability_status,
  next_available_at,
  is_24_7,
  onQuickView
}: ProductCardProps) => {
  
  // Logic for badges and colors
  const isAvailable = availability_status === 'available';
  const isLimited = availability_status === 'limited';
  const isUnavailable = availability_status === 'unavailable';

  // Format currency
  const formatMoney = (val: number) => `€${val.toFixed(2)}`;

  // Parse time
  const getNextAvailableText = () => {
    if (isAvailable) return 'Available now';
    if (!next_available_at) return 'Unavailable';
    const date = new Date(next_available_at);
    
    // Simple logic: if today show time, if tomorrow show "Tomorrow HH:MM"
    const now = new Date();
    const isToday = date.getDate() === now.getDate();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return isToday ? `Next free: ${timeStr}` : `Tomorrow ${timeStr}`;
  };

  return (
    <Card className={`group relative flex flex-col overflow-hidden transition-all hover:shadow-lg ${isUnavailable ? 'opacity-90 grayscale-[0.5]' : ''}`}>
      
      {/* Top Section: Image & Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img 
          src={image_url} 
          alt={name} 
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay Badge */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
           {isAvailable && (
             <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm backdrop-blur-sm">
               <CheckCircleIcon className="mr-1 h-3 w-3" /> Available now
             </Badge>
           )}
           {isLimited && (
             <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 shadow-sm backdrop-blur-sm">
               <ClockIcon className="mr-1 h-3 w-3" /> {getNextAvailableText()}
             </Badge>
           )}
           {isUnavailable && (
             <Badge variant="secondary" className="bg-slate-200 text-slate-700 shadow-sm backdrop-blur-sm">
               Fully Booked
             </Badge>
           )}
        </div>

        {/* 24/7 Badge */}
        {is_24_7 && (
          <div className="absolute right-3 top-3 rounded-full bg-slate-900/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
            24/7
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex-1">
          <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{name}</h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{short_description}</p>
        </div>

        {/* Pricing & Availability */}
        <div className="mb-4 space-y-3 border-t border-slate-100 pt-3">
            <div className="flex items-baseline justify-between">
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-slate-900">
                        {formatMoney(price_hour)}
                        <span className="text-sm font-normal text-slate-500">/hr</span>
                    </span>
                    <span className="text-xs text-slate-500">
                        from {formatMoney(price_day)}/day
                    </span>
                </div>
                {deposit && deposit > 0 && (
                    <div className="text-right">
                         <span className="block text-[10px] uppercase tracking-wider text-slate-400">Deposit</span>
                         <span className="text-xs font-medium text-slate-600">{formatMoney(deposit)}</span>
                    </div>
                )}
            </div>
            
            {/* Availability Hint */}
            <div className={`flex items-center text-xs font-medium ${isAvailable ? 'text-emerald-700' : isUnavailable ? 'text-slate-400' : 'text-amber-700'}`}>
                {isAvailable ? '• Available to pick up today' : isUnavailable ? '• Check future availability' : `• ${getNextAvailableText()}`}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-2">
            <Button 
                variant="primary" 
                className={`w-full ${isUnavailable ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : ''}`}
                onClick={() => {}} // Navigate to product
            >
                {isUnavailable ? 'View Availability' : 'View & Book'}
            </Button>
            {onQuickView && (
                <Button variant="outline" className="w-full" onClick={() => onQuickView(id)}>
                    Quick View
                </Button>
            )}
        </div>
      </div>
    </Card>
  );
};

export const SkeletonProductCard = () => {
  return (
    <Card className="flex flex-col overflow-hidden">
        <div className="aspect-[4/3] w-full bg-slate-100">
             <Skeleton className="h-full w-full" />
        </div>
        <div className="p-4">
             <Skeleton className="h-6 w-3/4 mb-2" />
             <Skeleton className="h-4 w-full mb-4" />
             
             <div className="border-t border-slate-100 pt-3 mb-4 space-y-2">
                <div className="flex justify-between">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-4 w-32" />
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
             </div>
        </div>
    </Card>
  );
};
