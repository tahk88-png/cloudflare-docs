// API Service for Rentbox Dashboard
import type { UserDashboard, BookingsResponse, InvoicesResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.rentbox.ee';

// Mock data for development
const MOCK_MODE = import.meta.env.VITE_MOCK_API !== 'false';

// Helper function for API calls
async function fetchAPI<T>(endpoint: string): Promise<T> {
  if (MOCK_MODE) {
    return getMockData(endpoint) as T;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function getAuthToken(): string {
  // In production, get from secure storage or context
  return localStorage.getItem('auth_token') || '';
}

// API Methods
export async function getDashboard(): Promise<UserDashboard> {
  return fetchAPI<UserDashboard>('/api/me/dashboard');
}

export async function getBookings(): Promise<BookingsResponse> {
  return fetchAPI<BookingsResponse>('/api/me/bookings');
}

export async function getInvoices(): Promise<InvoicesResponse> {
  return fetchAPI<InvoicesResponse>('/api/me/invoices');
}

export async function rentAgain(rentalId: string): Promise<{ bookingId: string }> {
  if (MOCK_MODE) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { bookingId: `booking-${Date.now()}` };
  }

  const response = await fetch(`${API_BASE_URL}/api/rentals/${rentalId}/rent-again`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to create rental');
  }

  return response.json();
}

// Mock data for development
function getMockData(endpoint: string): unknown {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (endpoint === '/api/me/dashboard') {
    return {
      summary: {
        activeRentalsCount: 2,
        upcomingRentalsCount: 1,
        pendingInvoicesCount: 1,
        totalSpent: 245.50,
        currency: 'EUR',
      },
      activeRentals: [
        {
          id: 'rental-1',
          itemName: 'Electric Drill Pro 2000',
          itemType: 'Power Tools',
          status: 'active',
          startDate: now.toISOString(),
          endDate: tomorrow.toISOString(),
          lockerLocation: 'Locker A-15, Tallinn Central Station',
          lockerCode: '4782',
          price: 25.00,
          currency: 'EUR',
          imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
        },
        {
          id: 'rental-2',
          itemName: 'Camping Tent 4-Person',
          itemType: 'Outdoor Equipment',
          status: 'active',
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          lockerLocation: 'Locker B-08, Tartu Shopping Mall',
          lockerCode: '9156',
          price: 45.00,
          currency: 'EUR',
          imageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&h=300&fit=crop',
        },
      ],
      upcomingRentals: [
        {
          id: 'rental-3',
          itemName: 'Mountain Bike Premium',
          itemType: 'Sports Equipment',
          status: 'upcoming',
          startDate: nextWeek.toISOString(),
          endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          lockerLocation: 'Locker C-22, Pärnu Beach Center',
          price: 35.00,
          currency: 'EUR',
          imageUrl: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400&h=300&fit=crop',
        },
      ],
      recentInvoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2024-001234',
          rentalId: 'rental-1',
          amount: 25.00,
          currency: 'EUR',
          status: 'pending',
          issueDate: now.toISOString(),
          dueDate: tomorrow.toISOString(),
          downloadUrl: '#',
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-2024-001198',
          rentalId: 'rental-2',
          amount: 45.00,
          currency: 'EUR',
          status: 'paid',
          issueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          paidDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'card',
          downloadUrl: '#',
        },
      ],
    } as UserDashboard;
  }

  if (endpoint === '/api/me/bookings') {
    return {
      active: [
        {
          id: 'rental-1',
          itemName: 'Electric Drill Pro 2000',
          itemType: 'Power Tools',
          status: 'active',
          startDate: now.toISOString(),
          endDate: tomorrow.toISOString(),
          lockerLocation: 'Locker A-15, Tallinn Central Station',
          lockerCode: '4782',
          price: 25.00,
          currency: 'EUR',
        },
        {
          id: 'rental-2',
          itemName: 'Camping Tent 4-Person',
          itemType: 'Outdoor Equipment',
          status: 'active',
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          lockerLocation: 'Locker B-08, Tartu Shopping Mall',
          lockerCode: '9156',
          price: 45.00,
          currency: 'EUR',
        },
      ],
      upcoming: [
        {
          id: 'rental-3',
          itemName: 'Mountain Bike Premium',
          itemType: 'Sports Equipment',
          status: 'upcoming',
          startDate: nextWeek.toISOString(),
          endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          lockerLocation: 'Locker C-22, Pärnu Beach Center',
          price: 35.00,
          currency: 'EUR',
        },
      ],
      past: [
        {
          id: 'rental-4',
          itemName: 'Ladder Extension 6m',
          itemType: 'Tools',
          status: 'completed',
          startDate: lastMonth.toISOString(),
          endDate: new Date(lastMonth.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          price: 15.00,
          currency: 'EUR',
        },
        {
          id: 'rental-5',
          itemName: 'Pressure Washer',
          itemType: 'Tools',
          status: 'completed',
          startDate: new Date(lastMonth.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(lastMonth.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
          price: 30.00,
          currency: 'EUR',
        },
      ],
    } as BookingsResponse;
  }

  if (endpoint === '/api/me/invoices') {
    return {
      invoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2024-001234',
          rentalId: 'rental-1',
          amount: 25.00,
          currency: 'EUR',
          status: 'pending',
          issueDate: now.toISOString(),
          dueDate: tomorrow.toISOString(),
          downloadUrl: '#',
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-2024-001198',
          rentalId: 'rental-2',
          amount: 45.00,
          currency: 'EUR',
          status: 'paid',
          issueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          paidDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'card',
          downloadUrl: '#',
        },
      ],
      agreements: [
        {
          id: 'agr-1',
          rentalId: 'rental-1',
          agreementNumber: 'AGR-2024-001234',
          signedDate: now.toISOString(),
          documentUrl: '#',
          documentType: 'rental_agreement',
        },
        {
          id: 'agr-2',
          rentalId: 'rental-2',
          agreementNumber: 'AGR-2024-001198',
          signedDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          documentUrl: '#',
          documentType: 'rental_agreement',
        },
      ],
    } as InvoicesResponse;
  }

  return {};
}
