import React from 'react';
import { BookingCalendar } from '../src';
import type { DayAvailability, TimeSlot } from '../src';
import { generateTimeSlots } from '../src';

/**
 * Example App demonstrating Rentbox Booking Calendar usage
 */
function App() {
  // Mock availability data fetcher
  const fetchAvailability = async (year: number, month: number): Promise<DayAvailability[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock data for the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const availability: DayAvailability[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const isPast = date < new Date();
      
      if (isPast) {
        availability.push({
          date,
          status: 'past',
          availableSlots: [],
        });
        continue;
      }
      
      // Random availability for demo
      const random = Math.random();
      let status: DayAvailability['status'];
      let slots: TimeSlot[];
      
      if (random > 0.8) {
        // 20% fully booked
        status = 'fully-booked';
        slots = generateTimeSlots('00:00', '23:45', 15).map(time => ({
          time,
          available: false,
        }));
      } else if (random > 0.5) {
        // 30% partially booked
        status = 'partially-booked';
        slots = generateTimeSlots('00:00', '23:45', 15).map(time => ({
          time,
          available: Math.random() > 0.3, // 70% of slots available
          compartmentsAvailable: Math.floor(Math.random() * 3) + 1,
          totalCompartments: 5,
        }));
      } else {
        // 50% fully available
        status = 'available';
        slots = generateTimeSlots('00:00', '23:45', 15).map(time => ({
          time,
          available: true,
          compartmentsAvailable: 5,
          totalCompartments: 5,
        }));
      }
      
      availability.push({
        date,
        status,
        availableSlots: slots,
        compartmentsAvailable: status === 'partially-booked' ? 3 : status === 'available' ? 5 : 0,
        totalCompartments: 5,
      });
    }
    
    return availability;
  };
  
  // Handle booking confirmation
  const handleBookingConfirm = async (booking: {
    date: Date;
    startTime: string;
    endTime: string;
  }) => {
    console.log('Booking confirmed:', booking);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show success message
    alert(
      `Booking confirmed!\n\n` +
      `Date: ${booking.date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}\n` +
      `Time: ${booking.startTime} - ${booking.endTime}`
    );
  };
  
  // Optional: Track selection changes
  const handleSelectionChange = (selection: any) => {
    console.log('Selection changed:', selection);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F9F8] to-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0F172A] mb-3">
            Rentbox Tool Rental
          </h1>
          <p className="text-lg text-[#6B7280]">
            24/7 self-service booking • Book your tools anytime, anywhere
          </p>
        </div>
        
        {/* Calendar */}
        <BookingCalendar
          onBookingConfirm={handleBookingConfirm}
          fetchAvailability={fetchAvailability}
          minBookingDuration={60} // 1 hour minimum
          maxBookingDuration={1440} // 24 hours maximum
          businessHoursStart="00:00" // 24/7 operation
          businessHoursEnd="23:45"
          slotInterval={15} // 15-minute slots
          onSelectionChange={handleSelectionChange}
        />
        
        {/* Info footer */}
        <div className="mt-12 text-center text-sm text-[#6B7280]">
          <p className="mb-2">
            Need help? Contact us at{' '}
            <a href="mailto:support@rentbox.com" className="text-[#1DB954] hover:text-[#159A46] underline">
              support@rentbox.com
            </a>
          </p>
          <p>Timezone: Europe/Tallinn (EET/EEST)</p>
        </div>
      </div>
    </div>
  );
}

export default App;
