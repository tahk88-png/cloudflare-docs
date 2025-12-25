import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartView } from './components/cart/CartView';
import { CheckoutView } from './components/checkout/CheckoutView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BookingsList } from './components/admin/BookingsList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cart/:cartId" element={<CartViewWrapper />} />
        <Route path="/checkout/:cartId" element={<CheckoutViewWrapper />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/bookings" element={<BookingsList />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

function CartViewWrapper() {
  const cartId = window.location.pathname.split('/').pop() || '';
  return <CartView cartId={cartId} />;
}

function CheckoutViewWrapper() {
  const cartId = window.location.pathname.split('/').pop() || '';
  return <CheckoutView cartId={cartId} />;
}

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Rentbox.ee</h1>
        <p className="mt-2 text-gray-600">24/7 Self-Service Tool Rental</p>
        <div className="mt-8 space-x-4">
          <a
            href="/admin"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
