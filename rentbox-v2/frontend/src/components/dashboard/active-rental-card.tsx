'use client';

import { useState, useEffect } from 'react';
import { format, differenceInSeconds, addMinutes } from 'date-fns';
import { et } from 'date-fns/locale';
import { MapPin, Clock, Key, AlertTriangle, CheckCircle2, RotateCcw, Timer, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Booking, BookingStatus } from '@/types';

interface ActiveRentalCardProps {
  booking: Booking;
  onOpenLocker: () => void;
  onExtend: () => void;
  onReturn: () => void;
  isOpeningLocker?: boolean;
}

/**
 * ActiveRentalCard Component
 * 
 * Displays an active rental with:
 * - Real-time countdown timer
 * - Quick actions (open locker, extend, return)
 * - Status indicators
 * - Access PIN display
 */
export function ActiveRentalCard({
  booking,
  onOpenLocker,
  onExtend,
  onReturn,
  isOpeningLocker = false,
}: ActiveRentalCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
    isUrgent: boolean;
    isOverdue: boolean;
  } | null>(null);

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endAt = new Date(booking.schedule.endAt);
      const totalSeconds = differenceInSeconds(endAt, now);

      if (totalSeconds <= 0) {
        setTimeRemaining({
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          isUrgent: true,
          isOverdue: true,
        });
        return;
      }

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const isUrgent = totalSeconds < 3600; // Less than 1 hour

      setTimeRemaining({
        hours,
        minutes,
        seconds,
        total: totalSeconds,
        isUrgent,
        isOverdue: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [booking.schedule.endAt]);

  // Calculate progress percentage
  const progressPercentage = (() => {
    const startAt = new Date(booking.schedule.startAt);
    const endAt = new Date(booking.schedule.endAt);
    const now = new Date();
    
    const total = differenceInSeconds(endAt, startAt);
    const elapsed = differenceInSeconds(now, startAt);
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  const getStatusBadge = (status: BookingStatus) => {
    const variants: Record<BookingStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Aktiivne' },
      PAID: { variant: 'secondary', label: 'Algab varsti' },
      OVERDUE: { variant: 'destructive', label: 'Tähtaeg ületatud' },
      PENDING: { variant: 'outline', label: 'Ootel' },
      COMPLETED: { variant: 'secondary', label: 'Lõpetatud' },
      CANCELLED: { variant: 'secondary', label: 'Tühistatud' },
      EXPIRED: { variant: 'secondary', label: 'Aegunud' },
    };
    const { variant, label } = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      timeRemaining?.isOverdue && 'border-red-300 bg-red-50',
      timeRemaining?.isUrgent && !timeRemaining?.isOverdue && 'border-yellow-300 bg-yellow-50'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{booking.product.name}</h3>
            <p className="text-sm text-gray-500">
              {booking.bookingNumber}
            </p>
          </div>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-medium">{booking.location.name}</p>
            <p className="text-gray-500">{booking.compartment.lockerName}, Sahtel #{booking.compartment.number}</p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-start gap-2 text-sm">
          <Clock className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
          <div>
            <p>
              {format(new Date(booking.schedule.startAt), 'dd.MM.yyyy HH:mm', { locale: et })}
              {' → '}
              {format(new Date(booking.schedule.endAt), 'HH:mm', { locale: et })}
            </p>
          </div>
        </div>

        {/* Countdown Timer */}
        {booking.status === 'ACTIVE' && timeRemaining && (
          <div className={cn(
            'rounded-lg p-4',
            timeRemaining.isOverdue ? 'bg-red-100' : timeRemaining.isUrgent ? 'bg-yellow-100' : 'bg-gray-100'
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <Timer className="h-4 w-4" />
                {timeRemaining.isOverdue ? 'Tähtaeg ületatud!' : 'Aega jäänud'}
              </span>
              {timeRemaining.isOverdue && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>

            <div className="flex gap-2 justify-center">
              <div className="text-center">
                <div className={cn(
                  'text-3xl font-bold tabular-nums',
                  timeRemaining.isOverdue ? 'text-red-700' : timeRemaining.isUrgent ? 'text-yellow-700' : ''
                )}>
                  {String(timeRemaining.hours).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500">tundi</div>
              </div>
              <div className="text-3xl font-bold">:</div>
              <div className="text-center">
                <div className={cn(
                  'text-3xl font-bold tabular-nums',
                  timeRemaining.isOverdue ? 'text-red-700' : timeRemaining.isUrgent ? 'text-yellow-700' : ''
                )}>
                  {String(timeRemaining.minutes).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500">min</div>
              </div>
              <div className="text-3xl font-bold">:</div>
              <div className="text-center">
                <div className={cn(
                  'text-3xl font-bold tabular-nums',
                  timeRemaining.isOverdue ? 'text-red-700' : timeRemaining.isUrgent ? 'text-yellow-700' : ''
                )}>
                  {String(timeRemaining.seconds).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500">sek</div>
              </div>
            </div>

            <Progress value={progressPercentage} className="mt-3 h-2" />
          </div>
        )}

        {/* Access PIN */}
        {booking.accessPin && booking.status === 'ACTIVE' && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Key className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">PIN-kood (varuvariant)</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{booking.accessPin}</p>
            </div>
          </div>
        )}

        {/* Overdue Warning */}
        {timeRemaining?.isOverdue && (
          <div className="flex items-start gap-2 p-3 bg-red-100 rounded-lg text-red-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Tagastamise tähtaeg on möödunud!</p>
              <p>Hilinemistasu rakendub €{booking.pricing.subtotal}/h × 1.5 alates 30 min pärast tähtaega.</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 bg-gray-50 border-t">
        {/* Open Locker Button */}
        {['ACTIVE', 'PAID'].includes(booking.status) && (
          <Button
            variant="default"
            className="flex-1"
            onClick={onOpenLocker}
            disabled={isOpeningLocker}
          >
            {isOpeningLocker ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Avamine...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Ava kapp
              </span>
            )}
          </Button>
        )}

        {/* Extend Button */}
        {booking.status === 'ACTIVE' && !timeRemaining?.isOverdue && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onExtend}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Pikenda
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pikenda rendiperioodi</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Return Button */}
        {['ACTIVE', 'OVERDUE'].includes(booking.status) && (
          <Button 
            variant={timeRemaining?.isOverdue ? 'destructive' : 'outline'}
            onClick={onReturn}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Tagasta
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
