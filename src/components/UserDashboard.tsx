import React, { useState, useEffect } from 'react';
import { format, differenceInDays, differenceInHours } from 'date-fns';

// Mock Data Types
type RentalStatus = 'active' | 'upcoming' | 'completed' | 'cancelled';

interface Rental {
  id: string;
  productName: string;
  image: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  location: string;
  lockerCode?: string;
  price: number;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
  downloadUrl: string;
}

interface Agreement {
  id: string;
  title: string;
  signedDate: string;
  downloadUrl: string;
}

interface DashboardData {
  rentals: Rental[];
  invoices: Invoice[];
  agreements: Agreement[];
}

// Mock Data
const MOCK_DATA: DashboardData = {
  rentals: [
    {
      id: 'r1',
      productName: 'City Bike - Model X',
      image: '/placeholder-bike.png',
      status: 'active',
      startDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Started 2 hours ago
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Ends in 2 days
      location: 'Central Station Locker #42',
      lockerCode: '8892',
      price: 25.0,
    },
    {
      id: 'r2',
      productName: 'Camping Gear Set',
      image: '/placeholder-camping.png',
      status: 'upcoming',
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Starts in 5 days
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Downtown Hub',
      price: 45.0,
    },
    {
      id: 'r3',
      productName: 'Electric Scooter',
      image: '/placeholder-scooter.png',
      status: 'completed',
      startDate: '2023-10-01T10:00:00Z',
      endDate: '2023-10-01T14:00:00Z',
      location: 'Beachside Point',
      price: 15.0,
    },
    {
      id: 'r4',
      productName: 'Kayak Explorer',
      image: '/placeholder-kayak.png',
      status: 'completed',
      startDate: '2023-09-15T09:00:00Z',
      endDate: '2023-09-15T18:00:00Z',
      location: 'Riverside Dock',
      price: 35.0,
    },
  ],
  invoices: [
    { id: 'inv-001', date: '2023-10-02', amount: 15.0, status: 'paid', downloadUrl: '#' },
    { id: 'inv-002', date: '2023-09-16', amount: 35.0, status: 'paid', downloadUrl: '#' },
  ],
  agreements: [
    { id: 'agr-001', title: 'Rental Agreement - Electric Scooter', signedDate: '2023-10-01', downloadUrl: '#' },
    { id: 'agr-002', title: 'Liability Waiver - Kayak', signedDate: '2023-09-15', downloadUrl: '#' },
  ],
};

const StatusBadge = ({ status }: { status: RentalStatus }) => {
  const colors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors[status]}`}>
      {status}
    </span>
  );
};

const RentalCard = ({ rental, onRentAgain }: { rental: Rental; onRentAgain?: (rental: Rental) => void }) => {
  const isActive = rental.status === 'active';
  const isUpcoming = rental.status === 'upcoming';
  const timeLeft = isActive
    ? `${differenceInHours(new Date(rental.endDate), new Date())} hours left`
    : isUpcoming
    ? `Starts in ${differenceInDays(new Date(rental.startDate), new Date())} days`
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <StatusBadge status={rental.status} />
          {rental.price && <span className="text-gray-600 dark:text-gray-400 font-medium">€{rental.price.toFixed(2)}</span>}
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{rental.productName}</h3>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span className="font-medium">Location:</span> {rental.location}
          </div>
          <div className="flex items-center gap-2">
             <span className="font-medium">Time:</span> {format(new Date(rental.startDate), 'MMM d, HH:mm')} - {format(new Date(rental.endDate), 'HH:mm')}
          </div>
          
          {isActive && rental.lockerCode && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold uppercase tracking-wider mb-1">Locker Code</p>
              <p className="text-2xl font-mono font-bold text-blue-700 dark:text-blue-100 tracking-widest">{rental.lockerCode}</p>
            </div>
          )}

          {timeLeft && (
             <div className="mt-2 text-orange-600 dark:text-orange-400 font-medium text-sm">
                {timeLeft}
             </div>
          )}
        </div>
      </div>
      
      {onRentAgain && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => onRentAgain(rental)}
            className="w-full py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer"
          >
            Rent Again
          </button>
        </div>
      )}
    </div>
  );
};

const InvoiceList = ({ invoices }: { invoices: Invoice[] }) => (
  <div className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Invoice #{invoice.id}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(invoice.date), 'MMM d, yyyy')}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.status}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">€{invoice.amount.toFixed(2)}</span>
              <a href={invoice.downloadUrl} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium">
                PDF
              </a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const UserDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
        try {
            // In a real app, we would fetch from /api/me/dashboard, /api/me/bookings, etc.
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
            setData(MOCK_DATA);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const handleRentAgain = (rental: Rental) => {
    // In a real app, this would navigate to booking flow or add to cart
    alert(`Starting booking flow for ${rental.productName}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return <div>Error loading dashboard.</div>;

  const activeRentals = data.rentals.filter(r => r.status === 'active');
  const upcomingRentals = data.rentals.filter(r => r.status === 'upcoming');
  const pastRentals = data.rentals.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back! Here's what's happening with your rentals.</p>
      </header>

      {/* Active & Upcoming Section */}
      {(activeRentals.length > 0 || upcomingRentals.length > 0) && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Current & Upcoming</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRentals.map(rental => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
            {upcomingRentals.map(rental => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        </section>
      )}

      {/* Past Rentals Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent History</h2>
        {pastRentals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {pastRentals.slice(0, 3).map(rental => (
               <RentalCard key={rental.id} rental={rental} onRentAgain={handleRentAgain} />
             ))}
          </div>
        ) : (
          <p className="text-gray-500">No past rentals found.</p>
        )}
      </section>

      {/* Documents Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Invoices</h2>
          <InvoiceList invoices={data.invoices} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Signed Agreements</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
             {data.agreements.map(agreement => (
               <div key={agreement.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{agreement.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Signed on {format(new Date(agreement.signedDate), 'MMM d, yyyy')}</p>
                  </div>
                  <a href={agreement.downloadUrl} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium">View</a>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserDashboard;
