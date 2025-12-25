# Rentbox Booking Calendar - Implementation Guide

This guide helps you integrate the Rentbox Booking Calendar into your application step-by-step.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Backend Setup](#backend-setup)
4. [Frontend Integration](#frontend-integration)
5. [Timezone Handling](#timezone-handling)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ or 20+
- React 18+ or 19+
- Tailwind CSS 3.4+
- TypeScript 5.3+ (recommended)

## Installation

### 1. Install the package

```bash
npm install rentbox-booking-calendar
```

### 2. Install peer dependencies

```bash
npm install react react-dom tailwindcss
```

### 3. Configure Tailwind CSS

Update your `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/rentbox-booking-calendar/dist/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        rentbox: {
          accent: '#1DB954',
          'accent-hover': '#159A46',
          background: '#F7F9F8',
          surface: '#FFFFFF',
          border: '#E2E8E4',
          'text-primary': '#0F172A',
          'text-muted': '#6B7280',
          disabled: '#CBD5CF',
          error: '#DC2626',
        },
      },
    },
  },
  plugins: [],
};
```

### 4. Import Tailwind in your CSS

```css
/* src/index.css or src/App.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Backend Setup

### Database Schema

Create tables for storing bookings and availability:

```sql
-- Compartments table
CREATE TABLE compartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  compartment_id UUID REFERENCES compartments(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent overlapping bookings
  CONSTRAINT no_overlap EXCLUDE USING gist (
    compartment_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

-- Index for faster availability queries
CREATE INDEX idx_bookings_time_range ON bookings(start_time, end_time);
CREATE INDEX idx_bookings_compartment ON bookings(compartment_id);
```

### API Endpoints

#### GET /api/availability

Returns availability data for a given month.

```typescript
// Example with Express.js
import express from 'express';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const router = express.Router();
const TIMEZONE = 'Europe/Tallinn';

router.get('/availability', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Validate inputs
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month required' });
    }
    
    const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);
    
    // Convert to UTC for database query
    const startUTC = zonedTimeToUtc(startDate, TIMEZONE);
    const endUTC = zonedTimeToUtc(endDate, TIMEZONE);
    
    // Query database for bookings in this range
    const bookings = await db.query(`
      SELECT 
        DATE(start_time AT TIME ZONE $3) as booking_date,
        compartment_id,
        start_time,
        end_time
      FROM bookings
      WHERE start_time >= $1 AND start_time <= $2
      AND status = 'confirmed'
    `, [startUTC, endUTC, TIMEZONE]);
    
    // Get total compartments
    const compartments = await db.query(`
      SELECT COUNT(*) as total
      FROM compartments
      WHERE is_active = true
    `);
    const totalCompartments = parseInt(compartments.rows[0].total);
    
    // Generate availability for each day
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const availability = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Count bookings for this day
      const dayBookings = bookings.rows.filter(b => 
        format(new Date(b.booking_date), 'yyyy-MM-dd') === dayStr
      );
      
      // Generate time slots (15-minute intervals)
      const timeSlots = generateTimeSlots(day, dayBookings, totalCompartments);
      
      // Determine status
      const availableSlots = timeSlots.filter(s => s.available).length;
      let status = 'available';
      if (availableSlots === 0) {
        status = 'fully-booked';
      } else if (availableSlots < timeSlots.length) {
        status = 'partially-booked';
      }
      
      return {
        date: day.toISOString(),
        status,
        availableSlots: timeSlots,
        compartmentsAvailable: totalCompartments - dayBookings.length,
        totalCompartments,
      };
    });
    
    res.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Helper function to generate time slots
function generateTimeSlots(date, bookings, totalCompartments) {
  const slots = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      // Check how many compartments are booked at this time
      const slotDateTime = new Date(date);
      slotDateTime.setHours(hour, minute, 0, 0);
      
      const bookedCount = bookings.filter(b => {
        const startTime = new Date(b.start_time);
        const endTime = new Date(b.end_time);
        return slotDateTime >= startTime && slotDateTime < endTime;
      }).length;
      
      const available = bookedCount < totalCompartments;
      
      slots.push({
        time,
        available,
        compartmentsAvailable: totalCompartments - bookedCount,
        totalCompartments,
      });
    }
  }
  
  return slots;
}

export default router;
```

#### POST /api/bookings

Creates a new booking.

```typescript
router.post('/bookings', async (req, res) => {
  try {
    const { date, startTime, endTime, userId } = req.body;
    
    // Validate inputs
    if (!date || !startTime || !endTime || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Construct datetime objects
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    // Convert to UTC
    const startUTC = zonedTimeToUtc(startDateTime, TIMEZONE);
    const endUTC = zonedTimeToUtc(endDateTime, TIMEZONE);
    
    // Find available compartment
    const availableCompartment = await db.query(`
      SELECT c.id
      FROM compartments c
      WHERE c.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.compartment_id = c.id
        AND b.status = 'confirmed'
        AND tstzrange(b.start_time, b.end_time) && tstzrange($1, $2)
      )
      LIMIT 1
    `, [startUTC, endUTC]);
    
    if (availableCompartment.rows.length === 0) {
      return res.status(409).json({ 
        error: 'No compartments available for selected time' 
      });
    }
    
    // Create booking
    const booking = await db.query(`
      INSERT INTO bookings (
        user_id,
        compartment_id,
        start_time,
        end_time,
        status
      ) VALUES ($1, $2, $3, $4, 'confirmed')
      RETURNING *
    `, [userId, availableCompartment.rows[0].id, startUTC, endUTC]);
    
    res.json({
      id: booking.rows[0].id,
      startTime: startUTC.toISOString(),
      endTime: endUTC.toISOString(),
      status: 'confirmed',
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    if (error.code === '23P01') { // Exclusion constraint violation
      return res.status(409).json({ 
        error: 'This time slot was just booked. Please select another time.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create booking' });
  }
});
```

## Frontend Integration

### Basic Integration

```tsx
// BookingPage.tsx
import React from 'react';
import { BookingCalendar } from 'rentbox-booking-calendar';
import type { DayAvailability } from 'rentbox-booking-calendar';

function BookingPage() {
  const fetchAvailability = async (
    year: number,
    month: number
  ): Promise<DayAvailability[]> => {
    const response = await fetch(
      `/api/availability?year=${year}&month=${month}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to load availability');
    }
    
    const data = await response.json();
    
    // Convert ISO strings to Date objects
    return data.map((day: any) => ({
      ...day,
      date: new Date(day.date),
    }));
  };
  
  const handleBookingConfirm = async (booking: {
    date: Date;
    startTime: string;
    endTime: string;
  }) => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: booking.date.toISOString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    // Redirect to confirmation page
    window.location.href = '/booking-confirmed';
  };
  
  return (
    <div className="container mx-auto p-4">
      <BookingCalendar
        onBookingConfirm={handleBookingConfirm}
        fetchAvailability={fetchAvailability}
      />
    </div>
  );
}

export default BookingPage;
```

### Advanced Integration with State Management

```tsx
// With React Context or Redux
import { useBooking } from './hooks/useBooking';

function BookingPage() {
  const { createBooking, isLoading, error } = useBooking();
  
  const handleBookingConfirm = async (booking) => {
    await createBooking(booking);
    // Handle success (show notification, redirect, etc.)
  };
  
  return (
    <BookingCalendar
      onBookingConfirm={handleBookingConfirm}
      fetchAvailability={fetchAvailability}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

## Timezone Handling

### Client-Side Conversion

The calendar displays times in Europe/Tallinn timezone. Convert to UTC before sending to API:

```typescript
import { zonedTimeToUtc } from 'date-fns-tz';

const TIMEZONE = 'Europe/Tallinn';

function convertToUTC(localDate: Date, timeString: string) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const dateTime = new Date(localDate);
  dateTime.setHours(hours, minutes, 0, 0);
  
  return zonedTimeToUtc(dateTime, TIMEZONE);
}
```

### Server-Side Conversion

Convert UTC back to Europe/Tallinn for display:

```typescript
import { utcToZonedTime, format } from 'date-fns-tz';

const TIMEZONE = 'Europe/Tallinn';

function formatForDisplay(utcDate: Date) {
  const zonedDate = utcToZonedTime(utcDate, TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd HH:mm', { timeZone: TIMEZONE });
}
```

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingCalendar } from 'rentbox-booking-calendar';

describe('BookingCalendar', () => {
  it('loads and displays availability', async () => {
    const mockFetch = jest.fn().mockResolvedValue([
      {
        date: new Date('2025-01-15'),
        status: 'available',
        availableSlots: [
          { time: '09:00', available: true },
          { time: '10:00', available: true },
        ],
      },
    ]);
    
    render(
      <BookingCalendar
        onBookingConfirm={jest.fn()}
        fetchAvailability={mockFetch}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument();
    });
  });
  
  it('completes full booking flow', async () => {
    const onConfirm = jest.fn();
    
    render(
      <BookingCalendar
        onBookingConfirm={onConfirm}
        fetchAvailability={mockFetchAvailability}
      />
    );
    
    // Select date
    fireEvent.click(screen.getByLabelText(/15/));
    
    // Select start time
    await waitFor(() => screen.getByText('09:00'));
    fireEvent.click(screen.getByText('09:00'));
    
    // Select end time
    await waitFor(() => screen.getByText('10:00'));
    fireEvent.click(screen.getByText('10:00'));
    
    // Confirm
    fireEvent.click(screen.getByText('Confirm Booking'));
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        date: expect.any(Date),
        startTime: '09:00',
        endTime: '10:00',
      });
    });
  });
});
```

### Integration Tests

Test the full flow with your backend:

```typescript
// e2e/booking.test.ts
import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/booking');
  
  // Wait for calendar to load
  await page.waitForSelector('[aria-label*="January"]');
  
  // Select date
  await page.click('[aria-label*="January 15"]');
  
  // Select start time
  await page.click('text=09:00');
  
  // Select end time
  await page.click('text=10:00');
  
  // Confirm booking
  await page.click('text=Confirm Booking');
  
  // Verify redirect to confirmation
  await expect(page).toHaveURL('/booking-confirmed');
});
```

## Deployment

### Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:pass@host:5432/rentbox
TIMEZONE=Europe/Tallinn
API_BASE_URL=https://api.rentbox.com
```

### Production Checklist

- [ ] Database indexes created
- [ ] API endpoints secured with authentication
- [ ] Rate limiting implemented
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics tracking added
- [ ] CDN configured for static assets
- [ ] Database backups automated
- [ ] Monitoring dashboards set up

## Troubleshooting

### Common Issues

#### Calendar not displaying

**Problem**: Calendar shows blank or crashes

**Solution**: 
- Check that Tailwind CSS is properly configured
- Verify `content` paths in `tailwind.config.js`
- Ensure CSS is imported in your app

#### Times showing in wrong timezone

**Problem**: Times display in UTC instead of Europe/Tallinn

**Solution**:
- Install `date-fns-tz` for timezone conversion
- Convert UTC timestamps on the frontend
- Ensure backend returns ISO strings with timezone

#### Bookings overlap

**Problem**: Multiple users can book the same time

**Solution**:
- Use database exclusion constraints
- Implement optimistic locking
- Add retry logic for conflict resolution

#### Slow availability loading

**Problem**: Calendar takes too long to load

**Solution**:
- Add database indexes on booking times
- Implement caching (Redis)
- Use pagination for large datasets
- Optimize database queries

### Debug Mode

Enable detailed logging:

```typescript
<BookingCalendar
  {...props}
  onSelectionChange={(selection) => {
    console.log('Selection changed:', selection);
  }}
/>
```

## Support

For issues or questions:

- 📧 Email: dev-support@rentbox.com
- 📖 Documentation: https://docs.rentbox.com
- 🐛 Bug reports: GitHub Issues

---

**Last Updated**: December 2025
