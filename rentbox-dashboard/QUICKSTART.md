# Quick Start Guide

Get the Rentbox.ee Dashboard up and running in minutes!

## 🚀 Installation

```bash
cd /workspace/rentbox-dashboard
npm install
```

## 🏃 Run Development Server

```bash
npm run dev
```

Open your browser to `http://localhost:3000`

## 📦 What You'll See

The dashboard starts with **mock data** enabled, so you can explore all features immediately:

### Active Rentals
- Electric Drill Pro 2000 (ending tomorrow)
- Camping Tent 4-Person (3 days left)

### Upcoming Rentals
- Mountain Bike Premium (next week)

### Past Rentals
- Ladder Extension 6m
- Pressure Washer

### Invoices
- 1 pending invoice
- 1 paid invoice

### Agreements
- 2 signed rental agreements

## 🎯 Navigation

The dashboard has 4 main tabs:

1. **Overview** - Quick summary with active rentals, upcoming bookings, and recent invoices
2. **Bookings** - All rentals organized by status (Active, Upcoming, Past)
3. **Invoices** - All invoices with payment status
4. **Agreements** - All signed documents with view/download options

## ✨ Key Features to Try

### 1. Time Remaining
Look at active rentals - they show dynamic time remaining with color coding:
- 🟢 Green: More than 48 hours left
- 🟡 Yellow: Less than 48 hours left
- 🔴 Red: Less than 24 hours left

### 2. Locker Information
Active rentals display:
- 📍 Locker location
- 🔒 Access code (in a monospace box)

### 3. Rent Again
Go to the **Bookings** tab → **Past Rentals** section:
- Click "Rent Again" button on any past rental
- See confirmation message with new booking ID

### 4. Download Documents
Try downloading:
- **Invoices**: Go to Invoices tab → Click "Download Invoice"
- **Agreements**: Go to Agreements tab → Click "View" or "Download"

### 5. Status Badges
Notice the color-coded status badges throughout:
- 🟢 **Active** (green)
- 🔵 **Upcoming** (blue)
- ⚪ **Completed** (gray)
- 🟡 **Pending** (yellow - for invoices)
- 🟢 **Paid** (green - for invoices)

## 📱 Mobile Testing

Test the responsive design:

```bash
# Chrome DevTools
1. Press F12 or Cmd+Opt+I
2. Click device toolbar icon (or Cmd+Shift+M)
3. Select iPhone or Android device
4. See mobile-optimized layout
```

Try different screen sizes:
- 📱 Mobile: 375px (iPhone)
- 📱 Mobile Large: 414px (iPhone Pro Max)
- 📲 Tablet: 768px (iPad)
- 💻 Desktop: 1024px+

## 🔌 Connecting to Your API

### Step 1: Update Environment Variables

Edit `.env`:

```bash
VITE_API_BASE_URL=https://api.rentbox.ee
VITE_MOCK_API=false
```

### Step 2: Implement Authentication

Update `src/services/api.ts`:

```typescript
function getAuthToken(): string {
  // Replace with your auth logic
  return localStorage.getItem('auth_token') || '';
}
```

### Step 3: Verify API Endpoints

Ensure these endpoints are available:
- `GET /api/me/dashboard`
- `GET /api/me/bookings`
- `GET /api/me/invoices`
- `POST /api/rentals/{id}/rent-again`

See [API_INTEGRATION.md](./API_INTEGRATION.md) for detailed specs.

## 🏗️ Building for Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

The build output will be in the `dist/` folder.

## 📂 Project Structure

```
rentbox-dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main dashboard component
│   │   ├── RentalCard.tsx   # Rental display card
│   │   ├── InvoiceCard.tsx  # Invoice display card
│   │   ├── AgreementCard.tsx # Agreement display card
│   │   ├── StatusBadge.tsx  # Status badge component
│   │   └── ...
│   ├── services/            # API service layer
│   │   └── api.ts           # API calls and mock data
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   ├── dateUtils.ts     # Date formatting
│   │   └── formatters.ts    # Number/currency formatting
│   ├── styles/              # CSS styles
│   │   └── index.css        # Tailwind imports
│   ├── App.tsx              # Root component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Dependencies
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite configuration
```

## 🎨 Customization

### Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: { /* Your brand colors */ },
      success: { /* Your success colors */ },
      // ...
    }
  }
}
```

### Currency

Default is EUR. To change, update mock data in `src/services/api.ts` or ensure your API returns the correct currency code.

### Date Format

Date formatting uses `date-fns`. Modify formats in `src/utils/dateUtils.ts`.

## 🐛 Troubleshooting

### Port already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- --port 3001
```

### TypeScript errors

```bash
# Check types
npm run check

# Build (includes type checking)
npm run build
```

### Styling not working

```bash
# Ensure Tailwind is configured
# Check src/styles/index.css imports
# Verify tailwind.config.js content paths
```

### API not connecting

1. Check `.env` file exists and has correct values
2. Verify API URL is correct
3. Check browser console for CORS errors
4. Ensure authentication token is valid

## 📚 Documentation

- [README.md](./README.md) - Project overview
- [FEATURES.md](./FEATURES.md) - Complete feature list
- [API_INTEGRATION.md](./API_INTEGRATION.md) - API specification
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

## 💡 Tips

1. **Use Mock Data First**: Test all features with mock data before connecting to real API
2. **Check Console**: Browser console shows useful debugging information
3. **Mobile First**: Always test on mobile devices or simulators
4. **Type Safety**: TypeScript will catch many errors during development
5. **Hot Reload**: Changes auto-reload in dev mode

## 🎯 Next Steps

1. ✅ Explore the dashboard with mock data
2. ✅ Test on different screen sizes
3. ✅ Review the code structure
4. ⬜ Connect to your API
5. ⬜ Customize styling
6. ⬜ Add authentication
7. ⬜ Deploy to production

## 🆘 Need Help?

- Check documentation files in this directory
- Review TypeScript types in `src/types/index.ts`
- Examine mock data in `src/services/api.ts`
- Test with browser DevTools open

---

**Ready to start?**

```bash
npm run dev
```

Then open `http://localhost:3000` and explore! 🎉
