// Mock data for development and demonstration
import type { DashboardData, Rental, Invoice, Agreement } from "./types";

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const lastMonth = new Date(today);
lastMonth.setMonth(lastMonth.getMonth() - 1);
const twoMonthsAgo = new Date(today);
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

export const mockRentals: Rental[] = [
  {
    id: "r-001",
    lockerNumber: "A-127",
    lockerSize: "medium",
    location: {
      id: "loc-001",
      name: "Tallinn Keskus",
      address: "Viru väljak 4",
      city: "Tallinn",
    },
    status: "active",
    startDate: yesterday.toISOString(),
    endDate: nextWeek.toISOString(),
    accessCode: "4829",
    price: 15.0,
    currency: "EUR",
  },
  {
    id: "r-002",
    lockerNumber: "B-043",
    lockerSize: "large",
    location: {
      id: "loc-002",
      name: "Tartu Kaubamaja",
      address: "Riia 1",
      city: "Tartu",
    },
    status: "upcoming",
    startDate: tomorrow.toISOString(),
    endDate: new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    accessCode: "7156",
    price: 25.0,
    currency: "EUR",
  },
  {
    id: "r-003",
    lockerNumber: "C-089",
    lockerSize: "small",
    location: {
      id: "loc-001",
      name: "Tallinn Keskus",
      address: "Viru väljak 4",
      city: "Tallinn",
    },
    status: "completed",
    startDate: twoMonthsAgo.toISOString(),
    endDate: lastMonth.toISOString(),
    price: 8.0,
    currency: "EUR",
  },
  {
    id: "r-004",
    lockerNumber: "A-015",
    lockerSize: "xl",
    location: {
      id: "loc-003",
      name: "Pärnu Rannapark",
      address: "Ranna pst 3",
      city: "Pärnu",
    },
    status: "completed",
    startDate: new Date(twoMonthsAgo.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(twoMonthsAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    price: 35.0,
    currency: "EUR",
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "RB-2024-0127",
    rentalId: "r-001",
    amount: 15.0,
    currency: "EUR",
    status: "paid",
    issuedDate: yesterday.toISOString(),
    dueDate: nextWeek.toISOString(),
    paidDate: yesterday.toISOString(),
    downloadUrl: "/invoices/RB-2024-0127.pdf",
  },
  {
    id: "inv-002",
    invoiceNumber: "RB-2024-0128",
    rentalId: "r-002",
    amount: 25.0,
    currency: "EUR",
    status: "pending",
    issuedDate: today.toISOString(),
    dueDate: tomorrow.toISOString(),
    downloadUrl: "/invoices/RB-2024-0128.pdf",
  },
  {
    id: "inv-003",
    invoiceNumber: "RB-2024-0089",
    rentalId: "r-003",
    amount: 8.0,
    currency: "EUR",
    status: "paid",
    issuedDate: twoMonthsAgo.toISOString(),
    dueDate: lastMonth.toISOString(),
    paidDate: twoMonthsAgo.toISOString(),
    downloadUrl: "/invoices/RB-2024-0089.pdf",
  },
  {
    id: "inv-004",
    invoiceNumber: "RB-2024-0075",
    rentalId: "r-004",
    amount: 35.0,
    currency: "EUR",
    status: "paid",
    issuedDate: new Date(twoMonthsAgo.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(twoMonthsAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    paidDate: new Date(twoMonthsAgo.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    downloadUrl: "/invoices/RB-2024-0075.pdf",
  },
];

export const mockAgreements: Agreement[] = [
  {
    id: "agr-001",
    rentalId: "r-001",
    title: "Rental Agreement - Tallinn Keskus A-127",
    signedDate: yesterday.toISOString(),
    downloadUrl: "/agreements/agr-001.pdf",
    viewUrl: "/agreements/agr-001/view",
  },
  {
    id: "agr-002",
    rentalId: "r-002",
    title: "Rental Agreement - Tartu Kaubamaja B-043",
    signedDate: today.toISOString(),
    downloadUrl: "/agreements/agr-002.pdf",
    viewUrl: "/agreements/agr-002/view",
  },
  {
    id: "agr-003",
    rentalId: "r-003",
    title: "Rental Agreement - Tallinn Keskus C-089",
    signedDate: twoMonthsAgo.toISOString(),
    downloadUrl: "/agreements/agr-003.pdf",
    viewUrl: "/agreements/agr-003/view",
  },
  {
    id: "agr-004",
    rentalId: "r-004",
    title: "Rental Agreement - Pärnu Rannapark A-015",
    signedDate: new Date(twoMonthsAgo.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    downloadUrl: "/agreements/agr-004.pdf",
    viewUrl: "/agreements/agr-004/view",
  },
];

export const mockDashboardData: DashboardData = {
  user: {
    name: "Mari Mets",
    email: "mari.mets@example.ee",
  },
  stats: {
    activeRentals: 1,
    totalRentals: 4,
    totalSpent: 83.0,
    currency: "EUR",
  },
  rentals: mockRentals,
  invoices: mockInvoices,
  agreements: mockAgreements,
};
