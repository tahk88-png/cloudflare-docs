import { useState, useEffect, useMemo } from "react";
import type {
  DashboardData,
  Rental,
  Invoice,
  Agreement,
  RentalStatus,
  PaymentStatus,
} from "./types";
import { mockDashboardData } from "./mockData";

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("et-EE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("et-EE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("et-EE", {
    style: "currency",
    currency,
  }).format(amount);
}

function getTimeRemaining(endDate: string): { days: number; hours: number; minutes: number; expired: boolean } {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, expired: false };
}

function getCountdown(startDate: string): { days: number; hours: number; minutes: number; started: boolean } {
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const diff = start - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, started: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, started: false };
}

// ============================================================================
// Status Badge Components
// ============================================================================

function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const styles: Record<RentalStatus, string> = {
    active: "rb-badge rb-badge-success",
    upcoming: "rb-badge rb-badge-info",
    completed: "rb-badge rb-badge-default",
    cancelled: "rb-badge rb-badge-danger",
  };

  const labels: Record<RentalStatus, string> = {
    active: "Active",
    upcoming: "Upcoming",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return <span className={styles[status]}>{labels[status]}</span>;
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    paid: "rb-badge rb-badge-success",
    pending: "rb-badge rb-badge-warning",
    overdue: "rb-badge rb-badge-danger",
    refunded: "rb-badge rb-badge-info",
  };

  const labels: Record<PaymentStatus, string> = {
    paid: "Paid",
    pending: "Pending",
    overdue: "Overdue",
    refunded: "Refunded",
  };

  return <span className={styles[status]}>{labels[status]}</span>;
}

function LockerSizeBadge({ size }: { size: Rental["lockerSize"] }) {
  const labels: Record<Rental["lockerSize"], string> = {
    small: "S",
    medium: "M",
    large: "L",
    xl: "XL",
  };

  return (
    <span className="rb-badge rb-badge-outline" title={`Size: ${size}`}>
      {labels[size]}
    </span>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function IconLocker() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

function IconLocation() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconInvoice() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg className="rb-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconView() {
  return (
    <svg className="rb-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg className="rb-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="17,1 21,5 17,9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7,23 3,19 7,15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg className="rb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 106 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg className="rb-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
}

// ============================================================================
// Card Components
// ============================================================================

function StatsCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rb-stats-card">
      <div className="rb-stats-icon">{icon}</div>
      <div className="rb-stats-content">
        <p className="rb-stats-value">{value}</p>
        <p className="rb-stats-label">{label}</p>
      </div>
    </div>
  );
}

function TimeDisplay({
  days,
  hours,
  minutes,
  label,
}: {
  days: number;
  hours: number;
  minutes: number;
  label: string;
}) {
  return (
    <div className="rb-time-display">
      <div className="rb-time-units">
        <div className="rb-time-unit">
          <span className="rb-time-value">{days}</span>
          <span className="rb-time-label">d</span>
        </div>
        <span className="rb-time-separator">:</span>
        <div className="rb-time-unit">
          <span className="rb-time-value">{String(hours).padStart(2, "0")}</span>
          <span className="rb-time-label">h</span>
        </div>
        <span className="rb-time-separator">:</span>
        <div className="rb-time-unit">
          <span className="rb-time-value">{String(minutes).padStart(2, "0")}</span>
          <span className="rb-time-label">m</span>
        </div>
      </div>
      <p className="rb-time-caption">{label}</p>
    </div>
  );
}

// ============================================================================
// Rental Card Components
// ============================================================================

function ActiveRentalCard({ rental }: { rental: Rental }) {
  const timeLeft = getTimeRemaining(rental.endDate);

  return (
    <div className="rb-rental-card rb-rental-card-active">
      <div className="rb-rental-header">
        <div className="rb-rental-title">
          <IconLocker />
          <span className="rb-locker-number">{rental.lockerNumber}</span>
          <LockerSizeBadge size={rental.lockerSize} />
        </div>
        <RentalStatusBadge status={rental.status} />
      </div>

      <div className="rb-rental-body">
        <div className="rb-rental-location">
          <IconLocation />
          <div>
            <p className="rb-location-name">{rental.location.name}</p>
            <p className="rb-location-address">{rental.location.address}, {rental.location.city}</p>
          </div>
        </div>

        {rental.accessCode && (
          <div className="rb-access-code">
            <IconKey />
            <div>
              <p className="rb-access-label">Access Code</p>
              <p className="rb-access-value">{rental.accessCode}</p>
            </div>
          </div>
        )}

        <div className="rb-rental-dates">
          <IconClock />
          <div>
            <p className="rb-dates-range">
              {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
            </p>
          </div>
        </div>

        {!timeLeft.expired && (
          <TimeDisplay
            days={timeLeft.days}
            hours={timeLeft.hours}
            minutes={timeLeft.minutes}
            label="Time remaining"
          />
        )}
      </div>

      <div className="rb-rental-footer">
        <span className="rb-rental-price">{formatCurrency(rental.price, rental.currency)}</span>
      </div>
    </div>
  );
}

function UpcomingRentalCard({ rental }: { rental: Rental }) {
  const countdown = getCountdown(rental.startDate);

  return (
    <div className="rb-rental-card rb-rental-card-upcoming">
      <div className="rb-rental-header">
        <div className="rb-rental-title">
          <IconLocker />
          <span className="rb-locker-number">{rental.lockerNumber}</span>
          <LockerSizeBadge size={rental.lockerSize} />
        </div>
        <RentalStatusBadge status={rental.status} />
      </div>

      <div className="rb-rental-body">
        <div className="rb-rental-location">
          <IconLocation />
          <div>
            <p className="rb-location-name">{rental.location.name}</p>
            <p className="rb-location-address">{rental.location.address}, {rental.location.city}</p>
          </div>
        </div>

        {rental.accessCode && (
          <div className="rb-access-code rb-access-code-upcoming">
            <IconKey />
            <div>
              <p className="rb-access-label">Access Code (available at start)</p>
              <p className="rb-access-value rb-access-hidden">••••</p>
            </div>
          </div>
        )}

        <div className="rb-rental-dates">
          <IconClock />
          <div>
            <p className="rb-dates-range">
              Starts {formatDateTime(rental.startDate)}
            </p>
          </div>
        </div>

        {!countdown.started && (
          <TimeDisplay
            days={countdown.days}
            hours={countdown.hours}
            minutes={countdown.minutes}
            label="Starts in"
          />
        )}
      </div>

      <div className="rb-rental-footer">
        <span className="rb-rental-price">{formatCurrency(rental.price, rental.currency)}</span>
      </div>
    </div>
  );
}

function PastRentalCard({ rental, onRentAgain }: { rental: Rental; onRentAgain: (rental: Rental) => void }) {
  return (
    <div className="rb-rental-card rb-rental-card-past">
      <div className="rb-rental-header">
        <div className="rb-rental-title">
          <IconLocker />
          <span className="rb-locker-number">{rental.lockerNumber}</span>
          <LockerSizeBadge size={rental.lockerSize} />
        </div>
        <RentalStatusBadge status={rental.status} />
      </div>

      <div className="rb-rental-body">
        <div className="rb-rental-location">
          <IconLocation />
          <div>
            <p className="rb-location-name">{rental.location.name}</p>
            <p className="rb-location-address">{rental.location.address}, {rental.location.city}</p>
          </div>
        </div>

        <div className="rb-rental-dates">
          <IconClock />
          <div>
            <p className="rb-dates-range">
              {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="rb-rental-footer rb-rental-footer-past">
        <span className="rb-rental-price">{formatCurrency(rental.price, rental.currency)}</span>
        <button
          className="rb-btn rb-btn-secondary rb-btn-sm"
          onClick={() => onRentAgain(rental)}
        >
          <IconRepeat />
          Rent Again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Invoice & Agreement Components
// ============================================================================

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <div className="rb-list-row">
      <div className="rb-list-row-main">
        <div className="rb-list-row-icon">
          <IconInvoice />
        </div>
        <div className="rb-list-row-content">
          <p className="rb-list-row-title">{invoice.invoiceNumber}</p>
          <p className="rb-list-row-subtitle">{formatDate(invoice.issuedDate)}</p>
        </div>
      </div>
      <div className="rb-list-row-end">
        <div className="rb-list-row-meta">
          <span className="rb-list-row-amount">{formatCurrency(invoice.amount, invoice.currency)}</span>
          <PaymentStatusBadge status={invoice.status} />
        </div>
        <a
          href={invoice.downloadUrl}
          className="rb-btn rb-btn-icon"
          title="Download Invoice"
          download
        >
          <IconDownload />
        </a>
      </div>
    </div>
  );
}

function AgreementRow({ agreement }: { agreement: Agreement }) {
  return (
    <div className="rb-list-row">
      <div className="rb-list-row-main">
        <div className="rb-list-row-icon">
          <IconDocument />
        </div>
        <div className="rb-list-row-content">
          <p className="rb-list-row-title">{agreement.title}</p>
          <p className="rb-list-row-subtitle">Signed {formatDate(agreement.signedDate)}</p>
        </div>
      </div>
      <div className="rb-list-row-end">
        <a
          href={agreement.viewUrl}
          className="rb-btn rb-btn-icon"
          title="View Agreement"
        >
          <IconView />
        </a>
        <a
          href={agreement.downloadUrl}
          className="rb-btn rb-btn-icon"
          title="Download Agreement"
          download
        >
          <IconDownload />
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Section Components
// ============================================================================

function Section({
  title,
  icon,
  children,
  empty,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <section className="rb-section">
      <h2 className="rb-section-title">
        {icon}
        {title}
      </h2>
      {empty ? (
        <div className="rb-empty-state">
          <p>{emptyMessage || "No items to display"}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// ============================================================================
// Tab Navigation
// ============================================================================

type TabId = "overview" | "invoices" | "agreements";

function TabNav({
  activeTab,
  onTabChange,
  invoiceCount,
  agreementCount,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  invoiceCount: number;
  agreementCount: number;
}) {
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "invoices", label: "Invoices", count: invoiceCount },
    { id: "agreements", label: "Agreements", count: agreementCount },
  ];

  return (
    <nav className="rb-tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`rb-tab ${activeTab === tab.id ? "rb-tab-active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="rb-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface UserDashboardProps {
  /** Initial data to render (for SSR) */
  initialData?: DashboardData;
  /** API base URL */
  apiBaseUrl?: string;
  /** Use mock data instead of API */
  useMockData?: boolean;
}

export default function UserDashboard({
  initialData,
  apiBaseUrl = "/api/me",
  useMockData = true,
}: UserDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Fetch data on mount
  useEffect(() => {
    if (initialData) return;

    async function fetchData() {
      if (useMockData) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setData(mockDashboardData);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/dashboard`);
        if (!response.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [apiBaseUrl, initialData, useMockData]);

  // Categorize rentals
  const { activeRentals, upcomingRentals, pastRentals } = useMemo(() => {
    if (!data) return { activeRentals: [], upcomingRentals: [], pastRentals: [] };

    return {
      activeRentals: data.rentals.filter((r) => r.status === "active"),
      upcomingRentals: data.rentals.filter((r) => r.status === "upcoming"),
      pastRentals: data.rentals.filter(
        (r) => r.status === "completed" || r.status === "cancelled"
      ),
    };
  }, [data]);

  // Handle "Rent Again" action
  const handleRentAgain = (rental: Rental) => {
    // In a real app, this would navigate to the booking flow
    // with the location pre-selected
    const bookingUrl = `/book?location=${rental.location.id}&size=${rental.lockerSize}`;
    window.location.href = bookingUrl;
  };

  // Loading state
  if (loading) {
    return (
      <div className="rb-dashboard">
        <div className="rb-loading">
          <div className="rb-loading-spinner" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rb-dashboard">
        <div className="rb-error">
          <p>Unable to load dashboard</p>
          <p className="rb-error-detail">{error}</p>
          <button
            className="rb-btn rb-btn-primary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="rb-dashboard">
        <div className="rb-empty-state">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rb-dashboard">
      {/* Header */}
      <header className="rb-header">
        <div className="rb-header-content">
          <h1 className="rb-header-title">Welcome back, {data.user.name.split(" ")[0]}</h1>
          <p className="rb-header-subtitle">Here's your rental overview</p>
        </div>
      </header>

      {/* Stats */}
      <div className="rb-stats-grid">
        <StatsCard
          label="Active Rentals"
          value={data.stats.activeRentals}
          icon={<IconLocker />}
        />
        <StatsCard
          label="Total Rentals"
          value={data.stats.totalRentals}
          icon={<IconHistory />}
        />
        <StatsCard
          label="Total Spent"
          value={formatCurrency(data.stats.totalSpent, data.stats.currency)}
          icon={<IconInvoice />}
        />
      </div>

      {/* Tab Navigation */}
      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        invoiceCount={data.invoices.length}
        agreementCount={data.agreements.length}
      />

      {/* Tab Content */}
      <div className="rb-tab-content">
        {activeTab === "overview" && (
          <>
            {/* Active Rentals */}
            <Section
              title="Active Rentals"
              icon={<IconLocker />}
              empty={activeRentals.length === 0}
              emptyMessage="You have no active rentals"
            >
              <div className="rb-rental-grid">
                {activeRentals.map((rental) => (
                  <ActiveRentalCard
                    key={rental.id}
                    rental={rental}
                  />
                ))}
              </div>
            </Section>

            {/* Upcoming Rentals */}
            <Section
              title="Upcoming Rentals"
              icon={<IconClock />}
              empty={upcomingRentals.length === 0}
              emptyMessage="No upcoming rentals scheduled"
            >
              <div className="rb-rental-grid">
                {upcomingRentals.map((rental) => (
                  <UpcomingRentalCard key={rental.id} rental={rental} />
                ))}
              </div>
            </Section>

            {/* Past Rentals */}
            <Section
              title="Rental History"
              icon={<IconHistory />}
              empty={pastRentals.length === 0}
              emptyMessage="No rental history yet"
            >
              <div className="rb-rental-grid">
                {pastRentals.map((rental) => (
                  <PastRentalCard
                    key={rental.id}
                    rental={rental}
                    onRentAgain={handleRentAgain}
                  />
                ))}
              </div>
            </Section>
          </>
        )}

        {activeTab === "invoices" && (
          <Section
            title="Invoices & Payments"
            icon={<IconInvoice />}
            empty={data.invoices.length === 0}
            emptyMessage="No invoices yet"
          >
            <div className="rb-list">
              {data.invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
          </Section>
        )}

        {activeTab === "agreements" && (
          <Section
            title="Signed Agreements"
            icon={<IconDocument />}
            empty={data.agreements.length === 0}
            emptyMessage="No signed agreements"
          >
            <div className="rb-list">
              {data.agreements.map((agreement) => (
                <AgreementRow key={agreement.id} agreement={agreement} />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Quick Action: Book New Locker */}
      <div className="rb-quick-action">
        <a href="/book" className="rb-btn rb-btn-primary rb-btn-lg">
          Book a New Locker
          <IconChevronRight />
        </a>
      </div>
    </div>
  );
}
