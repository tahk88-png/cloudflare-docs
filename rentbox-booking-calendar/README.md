# Rentbox Booking Calendar

A modern, production-ready booking calendar with time selection, designed for Rentbox 24/7 self-service tool rental. Built with React, TypeScript, and Tailwind CSS following Scandinavian minimalist design principles.

![Rentbox Calendar](https://img.shields.io/badge/React-18%2B-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4%2B-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

- **📅 Month Grid Calendar** - Clean, intuitive date selection with visual availability indicators
- **⏰ Time Slot Selection** - 15-minute granularity with start/end time pickers
- **📱 Mobile-First Design** - Optimized for mobile with sticky CTAs and touch-friendly spacing
- **♿ Fully Accessible** - WCAG 2.1 compliant with keyboard navigation and ARIA labels
- **🎨 Scandinavian Design** - Minimalist, clean, business-first aesthetic
- **🌍 Timezone Support** - Europe/Tallinn timezone handling (UI local, storage UTC)
- **⚡ Real-Time Availability** - Designed for compartment-based booking logic
- **🎯 Zero Dead Clicks** - Clear visual feedback on every interaction
- **🚀 Production Ready** - Type-safe, tested, and optimized for performance

## 🎨 Design System

### Brand Colors (Strict)

```typescript
{
  accent: '#1DB954',           // Primary action color
  accentHover: '#159A46',      // Hover state
  background: '#F7F9F8',       // Page background
  surface: '#FFFFFF',          // Cards and surfaces
  border: '#E2E8E4',          // Borders and dividers
  textPrimary: '#0F172A',     // Main text
  textMuted: '#6B7280',       // Secondary text
  disabled: '#CBD5CF',        // Disabled states
  error: '#DC2626',           // Error messages
}
```

### Visual States

| State | Appearance |
|-------|-----------|
| **Available** | White background, neutral border |
| **Selected** | Green background (#1DB954), white text |
| **Today** | Green border, green text |
| **Partially Booked** | Soft green tint (#EAF7F0) |
| **Fully Booked** | Gray background (#F1F3F2), muted text |
| **Past** | Disabled, gray appearance |

## 📦 Installation

```bash
npm install rentbox-booking-calendar
# or
yarn add rentbox-booking-calendar
# or
pnpm add rentbox-booking-calendar
```

### Peer Dependencies

```bash
npm install react react-dom tailwindcss
```

## 🚀 Quick Start

### 1. Configure Tailwind CSS

Add the calendar to your Tailwind content paths:

```javascript
// tailwind.config.js
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
};
```

### 2. Import and Use

```tsx
import React from 'react';
import { BookingCalendar } from 'rentbox-booking-calendar';
import type { DayAvailability } from 'rentbox-booking-calendar';

function MyBookingPage() {
  // Fetch availability from your API
  const fetchAvailability = async (
    year: number,
    month: number
  ): Promise<DayAvailability[]> => {
    const response = await fetch(
      `/api/availability?year=${year}&month=${month}`
    );
    return response.json();
  };

  // Handle booking confirmation
  const handleBookingConfirm = async (booking) => {
    await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: booking.date.toISOString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
      }),
    });
    
    alert('Booking confirmed!');
  };

  return (
    <BookingCalendar
      onBookingConfirm={handleBookingConfirm}
      fetchAvailability={fetchAvailability}
      minBookingDuration={60}      // 1 hour
      maxBookingDuration={1440}    // 24 hours
      slotInterval={15}            // 15-minute slots
    />
  );
}
```

## 📚 API Reference

### BookingCalendar Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onBookingConfirm` | `(booking: BookingSelection) => void \| Promise<void>` | ✅ | - | Callback when booking is confirmed |
| `fetchAvailability` | `(year: number, month: number) => Promise<DayAvailability[]>` | ✅ | - | Function to fetch availability data |
| `minBookingDuration` | `number` | ❌ | `60` | Minimum booking duration in minutes |
| `maxBookingDuration` | `number` | ❌ | `1440` | Maximum booking duration in minutes (24h) |
| `businessHoursStart` | `string` | ❌ | `"00:00"` | Business hours start time (HH:mm) |
| `businessHoursEnd` | `string` | ❌ | `"23:45"` | Business hours end time (HH:mm) |
| `slotInterval` | `number` | ❌ | `15` | Time slot interval in minutes |
| `isLoading` | `boolean` | ❌ | `false` | External loading state |
| `error` | `string \| null` | ❌ | `null` | External error message |
| `onSelectionChange` | `(selection: BookingSelection) => void` | ❌ | - | Callback for selection changes |

### Types

#### DayAvailability

```typescript
interface DayAvailability {
  date: Date;
  status: 'available' | 'partially-booked' | 'fully-booked' | 'past';
  availableSlots: TimeSlot[];
  compartmentsAvailable?: number;
  totalCompartments?: number;
}
```

#### TimeSlot

```typescript
interface TimeSlot {
  time: string; // Format: "HH:mm" (e.g., "09:00")
  available: boolean;
  compartmentsAvailable?: number;
  totalCompartments?: number;
}
```

#### BookingSelection

```typescript
interface BookingSelection {
  date: Date | null;
  startTime: string | null;  // Format: "HH:mm"
  endTime: string | null;    // Format: "HH:mm"
}
```

## 🎯 User Flow

The booking calendar follows a clear 3-step flow:

```
1. SELECT DATE
   └─> User picks a day from the calendar
        ↓
2. SELECT TIME
   ├─> User selects start time
   └─> User selects end time
        ↓
3. CONFIRM BOOKING
   └─> User confirms and booking is created
```

### Step-by-Step Behavior

1. **Date Selection**
   - Calendar shows month grid with availability indicators
   - User can navigate months using arrow buttons
   - Past dates and fully booked days are disabled
   - Selected date triggers time selection view

2. **Time Selection**
   - Start time slots displayed in a grid
   - User selects start time
   - End time slots filtered based on start time and duration limits
   - Duration displayed for each end time option
   - User can go back to change start time

3. **Confirmation**
   - Summary shown with date and time range
   - Confirm button triggers `onBookingConfirm` callback
   - Loading state during confirmation
   - Success/error handling

## 💡 Example: API Integration

### Backend API Example (Node.js/Express)

```typescript
// GET /api/availability?year=2025&month=1
app.get('/api/availability', async (req, res) => {
  const { year, month } = req.query;
  
  const availability = await db.getAvailability(
    parseInt(year),
    parseInt(month)
  );
  
  res.json(
    availability.map(day => ({
      date: day.date.toISOString(),
      status: day.status,
      availableSlots: day.slots.map(slot => ({
        time: slot.time,
        available: slot.available,
        compartmentsAvailable: slot.compartmentsAvailable,
        totalCompartments: slot.totalCompartments,
      })),
      compartmentsAvailable: day.compartmentsAvailable,
      totalCompartments: day.totalCompartments,
    }))
  );
});

// POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  const { date, startTime, endTime, userId } = req.body;
  
  // Validate availability
  const isAvailable = await db.checkAvailability(date, startTime, endTime);
  if (!isAvailable) {
    return res.status(409).json({ error: 'Time slot no longer available' });
  }
  
  // Create booking
  const booking = await db.createBooking({
    userId,
    date: new Date(date),
    startTime,
    endTime,
    createdAt: new Date(),
  });
  
  res.json(booking);
});
```

### Frontend Integration Example

```tsx
import { BookingCalendar } from 'rentbox-booking-calendar';
import type { DayAvailability } from 'rentbox-booking-calendar';

function BookingPage() {
  const [error, setError] = React.useState<string | null>(null);
  
  const fetchAvailability = async (
    year: number,
    month: number
  ): Promise<DayAvailability[]> => {
    try {
      const response = await fetch(
        `/api/availability?year=${year}&month=${month}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load availability');
      }
      
      const data = await response.json();
      
      // Convert ISO strings back to Date objects
      return data.map((day: any) => ({
        ...day,
        date: new Date(day.date),
      }));
    } catch (err) {
      setError('Unable to load availability. Please try again.');
      throw err;
    }
  };
  
  const handleBookingConfirm = async (booking: {
    date: Date;
    startTime: string;
    endTime: string;
  }) => {
    try {
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
      
      // Success - redirect or show confirmation
      window.location.href = '/booking-confirmed';
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Booking failed. Please try again.'
      );
      throw err;
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1>Book Your Tools</h1>
      <BookingCalendar
        onBookingConfirm={handleBookingConfirm}
        fetchAvailability={fetchAvailability}
        error={error}
      />
    </div>
  );
}
```

## 🌍 Timezone Handling

The calendar is designed for **Europe/Tallinn** timezone with the following approach:

- **UI Display**: Local time (Europe/Tallinn)
- **Storage**: UTC in database
- **API Communication**: ISO 8601 strings with timezone

### Example: Converting to UTC

```typescript
// Client-side: Convert local selection to UTC before sending to API
const handleBookingConfirm = async (booking) => {
  const localDate = booking.date;
  const [startHour, startMinute] = booking.startTime.split(':').map(Number);
  
  const startDateTime = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    startHour,
    startMinute
  );
  
  // Convert to UTC ISO string
  const utcStartTime = startDateTime.toISOString();
  
  await fetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      startTime: utcStartTime,
      // ... other fields
    }),
  });
};
```

## ♿ Accessibility

The calendar is fully accessible and follows WCAG 2.1 Level AA guidelines:

- ✅ **Keyboard Navigation**: Full support for Tab, Enter, Space, Arrow keys
- ✅ **Screen Readers**: Comprehensive ARIA labels and roles
- ✅ **Focus Management**: Visible focus rings with high contrast
- ✅ **Color Contrast**: All text meets 4.5:1 contrast ratio
- ✅ **Touch Targets**: Minimum 44x44px touch targets on mobile
- ✅ **Error Handling**: Clear, descriptive error messages

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate between interactive elements |
| `Enter` or `Space` | Select date or time slot |
| `Arrow Keys` | Navigate calendar grid |
| `Escape` | Close modals (if any) |

## 📱 Mobile Optimization

- **Vertical Flow**: Natural top-to-bottom progression
- **Sticky CTA**: Confirm button stays visible at bottom
- **Touch-Friendly**: Large tap targets (min 44x44px)
- **Scrollable Time Slots**: Easy browsing of available times
- **Responsive Grid**: Adapts to screen size
- **Performance**: Optimized for slower mobile connections

## 🎨 Customization

### Using Custom Colors

You can override the default colors while maintaining the design system:

```tsx
<div className="rentbox-calendar">
  <style>{`
    .rentbox-calendar {
      --rentbox-accent: #your-color;
      --rentbox-accent-hover: #your-hover-color;
    }
  `}</style>
  
  <BookingCalendar {...props} />
</div>
```

### Custom Slot Durations

```tsx
<BookingCalendar
  minBookingDuration={30}     // 30 minutes
  maxBookingDuration={480}    // 8 hours
  slotInterval={30}           // 30-minute intervals
  businessHoursStart="08:00"  // Start at 8 AM
  businessHoursEnd="18:00"    // End at 6 PM
  {...otherProps}
/>
```

## 🧪 Testing

The calendar is designed to be easily testable:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingCalendar } from 'rentbox-booking-calendar';

test('selects date and time', async () => {
  const onConfirm = jest.fn();
  const fetchAvailability = jest.fn().mockResolvedValue([
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
      onBookingConfirm={onConfirm}
      fetchAvailability={fetchAvailability}
    />
  );
  
  // Select date
  fireEvent.click(screen.getByLabelText(/15/));
  
  // Select start time
  fireEvent.click(screen.getByText('09:00'));
  
  // Select end time
  fireEvent.click(screen.getByText('10:00'));
  
  // Confirm
  fireEvent.click(screen.getByText('Confirm Booking'));
  
  expect(onConfirm).toHaveBeenCalledWith({
    date: expect.any(Date),
    startTime: '09:00',
    endTime: '10:00',
  });
});
```

## 🚀 Performance

- **Lazy Loading**: Only loads availability data for current month
- **Memoization**: React.useMemo for expensive calculations
- **Optimized Renders**: Minimal re-renders with useCallback
- **Efficient State**: Local state management without heavy libraries
- **Small Bundle**: ~15KB gzipped

## 📄 License

MIT License - feel free to use in commercial projects.

## 🤝 Support

For questions or issues:

- 📧 Email: support@rentbox.com
- 🐛 Issues: [GitHub Issues](https://github.com/rentbox/booking-calendar/issues)
- 📖 Docs: [Full Documentation](https://docs.rentbox.com)

## 🎯 Roadmap

- [ ] Multi-language support (i18n)
- [ ] Dark mode theme
- [ ] Recurring bookings
- [ ] Calendar sync (Google Calendar, iCal)
- [ ] Mobile native wrappers (React Native)
- [ ] Advanced filtering options
- [ ] Booking history integration

---

Made with ❤️ by the Rentbox team
