# Rentbox.ee User Dashboard

A clean, modern user dashboard for managing rentals, invoices, and agreements.

## Features

- **Active Rentals**: View current rentals with status, time remaining, and locker location
- **Upcoming Rentals**: See upcoming bookings with countdown timers
- **Past Rentals**: Browse rental history
- **Invoices & Payments**: Track all invoices and payment status
- **Signed Agreements**: View and download rental agreements
- **Rent Again**: Quick one-click action to re-rent previously used items

## Tech Stack

- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- date-fns for date manipulation
- lucide-react for icons

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Endpoints

The dashboard integrates with the following API endpoints:

- `GET /api/me/dashboard` - Dashboard summary data
- `GET /api/me/bookings` - User bookings (active, upcoming, past)
- `GET /api/me/invoices` - User invoices and payments

## Design Principles

- **Mobile-first**: Optimized for mobile devices
- **Clean & Calm**: Minimalist design with clear hierarchy
- **Status-driven**: Color-coded badges for quick understanding
- **Secure**: No admin data leakage, user-scoped data only
