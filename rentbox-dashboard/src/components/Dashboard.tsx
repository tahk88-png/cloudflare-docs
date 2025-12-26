import { useState, useEffect } from 'react';
import { Home, Package, Clock, History, FileText, FileSignature } from 'lucide-react';
import { getDashboard, getBookings, getInvoices, rentAgain } from '../services/api';
import type { UserDashboard, BookingsResponse, InvoicesResponse } from '../types';
import { DashboardSummary } from './DashboardSummary';
import { RentalCard } from './RentalCard';
import { InvoiceCard } from './InvoiceCard';
import { AgreementCard } from './AgreementCard';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState } from './EmptyState';

type TabType = 'overview' | 'bookings' | 'invoices' | 'agreements';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dashboardData, setDashboardData] = useState<UserDashboard | null>(null);
  const [bookingsData, setBookingsData] = useState<BookingsResponse | null>(null);
  const [invoicesData, setInvoicesData] = useState<InvoicesResponse | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dashboard, bookings, invoices] = await Promise.all([
        getDashboard(),
        getBookings(),
        getInvoices(),
      ]);
      
      setDashboardData(dashboard);
      setBookingsData(bookings);
      setInvoicesData(invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRentAgain = async (rentalId: string) => {
    try {
      const result = await rentAgain(rentalId);
      alert(`Rental created successfully! Booking ID: ${result.bookingId}`);
      // Reload data to show updated state
      loadDashboardData();
    } catch (err) {
      alert('Failed to create rental. Please try again.');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'bookings', label: 'Bookings', icon: Package },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'agreements', label: 'Agreements', icon: FileSignature },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your rentals, invoices, and agreements
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[88px] sm:top-[96px] z-10">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-2 sm:gap-4 overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6 sm:space-y-8">
            <DashboardSummary summary={dashboardData.summary} />

            {/* Active Rentals */}
            {dashboardData.activeRentals.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-success-600" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Active Rentals</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.activeRentals.map((rental) => (
                    <RentalCard key={rental.id} rental={rental} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Rentals */}
            {dashboardData.upcomingRentals.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Rentals</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.upcomingRentals.map((rental) => (
                    <RentalCard key={rental.id} rental={rental} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Invoices */}
            {dashboardData.recentInvoices.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Invoices</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.recentInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'bookings' && bookingsData && (
          <div className="space-y-6 sm:space-y-8">
            {/* Active */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-success-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Active Rentals ({bookingsData.active.length})
                </h2>
              </div>
              {bookingsData.active.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookingsData.active.map((rental) => (
                    <RentalCard key={rental.id} rental={rental} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <EmptyState message="No active rentals at the moment" />
                </div>
              )}
            </section>

            {/* Upcoming */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Upcoming Rentals ({bookingsData.upcoming.length})
                </h2>
              </div>
              {bookingsData.upcoming.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookingsData.upcoming.map((rental) => (
                    <RentalCard key={rental.id} rental={rental} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <EmptyState message="No upcoming rentals scheduled" />
                </div>
              )}
            </section>

            {/* Past */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Past Rentals ({bookingsData.past.length})
                </h2>
              </div>
              {bookingsData.past.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookingsData.past.map((rental) => (
                    <RentalCard 
                      key={rental.id} 
                      rental={rental} 
                      showActions={true}
                      onRentAgain={handleRentAgain}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <EmptyState message="No rental history yet" />
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'invoices' && invoicesData && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                All Invoices ({invoicesData.invoices.length})
              </h2>
            </div>
            {invoicesData.invoices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invoicesData.invoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                <EmptyState message="No invoices found" icon={<FileText className="w-8 h-8 text-gray-400" />} />
              </div>
            )}
          </section>
        )}

        {activeTab === 'agreements' && invoicesData && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Signed Agreements ({invoicesData.agreements.length})
              </h2>
            </div>
            {invoicesData.agreements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invoicesData.agreements.map((agreement) => (
                  <AgreementCard key={agreement.id} agreement={agreement} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                <EmptyState 
                  message="No signed agreements found" 
                  icon={<FileSignature className="w-8 h-8 text-gray-400" />} 
                />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
