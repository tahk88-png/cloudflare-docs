# Rentbox v2 Documentation Index

## 📚 Documentation Files

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md)
**Complete system architecture and design**
- Core principles
- Technology stack
- Module architecture (12 modules)
- Database schema (detailed)
- API contracts
- State transitions
- Guardrails & edge cases
- Example JSON payloads
- Security considerations

**Read this first** to understand the overall system design.

---

### 2. [SUMMARY.md](./SUMMARY.md)
**High-level overview of what's built**
- What has been completed ✅
- What remains to be done 🚧
- Project structure
- Core principles enforcement
- Technology choices rationale
- Quick start guide

**Read this** for a quick understanding of current status.

---

### 3. [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
**Step-by-step guide for completing remaining modules**
- Current status breakdown
- Detailed implementation steps for each module
- Code examples and patterns
- Database migrations needed
- Testing strategy
- Deployment checklist
- Critical path items

**Read this** when ready to implement remaining features.

---

### 4. [API_EXAMPLES.md](./API_EXAMPLES.md)
**Practical API usage examples**
- Authentication flow
- Booking operations (create, extend, cancel)
- Calendar queries
- Locker access
- Error responses
- Rate limiting info

**Read this** when integrating with the API.

---

### 5. [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**Quick lookup for common operations**
- SQL queries
- Redis commands
- cURL examples
- Environment variables checklist
- Common issues & solutions
- Status codes
- Monitoring queries

**Bookmark this** for daily development.

---

### 6. [README.md](./README.md)
**Project setup and getting started**
- Prerequisites
- Installation steps
- Running the project
- Core features list
- Key principles

**Read this** to get started with the project.

---

## 🗂️ Code Organization

### Backend (`/backend/`)

**Core Modules:**
- `src/bookings/` - ✅ Booking engine (complete)
- `src/calendar/` - ✅ Calendar system (complete)
- `src/lockers/` - ✅ Locker access (complete)
- `src/auth/` - ✅ Authentication (complete)
- `src/products/` - 🚧 Stub (needs implementation)
- `src/contracts/` - 🚧 Stub (needs implementation)
- `src/returns/` - 🚧 Stub (needs implementation)
- `src/notifications/` - 🚧 Stub (needs implementation)
- `src/incidents/` - 🚧 Stub (needs implementation)
- `src/content/` - 🚧 Stub (needs implementation)
- `src/audit/` - 🚧 Stub (needs implementation)

**Infrastructure:**
- `src/prisma/` - Database service
- `src/redis/` - Redis service
- `src/mqtt/` - MQTT service
- `src/main.ts` - Application entry point
- `src/app.module.ts` - Root module

**Database:**
- `prisma/schema.prisma` - Complete database schema
- `prisma/migrations/` - Database migrations

---

### Frontend (`/frontend/`)

**Pages:**
- `src/app/page.tsx` - Homepage
- `src/app/dashboard/page.tsx` - ✅ User dashboard
- `src/app/tools/` - 🚧 Product listing (needs implementation)
- `src/app/checkout/` - 🚧 Checkout flow (needs implementation)

**Components:**
- `src/components/booking/BookingCard.tsx` - ✅ Booking display

**Lib:**
- `src/lib/api.ts` - API client
- `src/lib/types.ts` - TypeScript types

---

## 🎯 Quick Navigation

### I want to...

**Understand the system:**
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review [SUMMARY.md](./SUMMARY.md)

**Start developing:**
1. Read [README.md](./README.md)
2. Follow [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

**Use the API:**
1. Check [API_EXAMPLES.md](./API_EXAMPLES.md)
2. Visit Swagger docs: http://localhost:3001/api/docs

**Debug issues:**
1. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. Review error logs
3. Check database constraints

**Add a feature:**
1. Review [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
2. Check existing module patterns
3. Follow NestJS best practices

---

## 📋 Documentation by Role

### For Architects
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [SUMMARY.md](./SUMMARY.md) - Overview

### For Backend Developers
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Implementation steps
- [API_EXAMPLES.md](./API_EXAMPLES.md) - API usage
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - SQL/Redis queries

### For Frontend Developers
- [API_EXAMPLES.md](./API_EXAMPLES.md) - API integration
- [SUMMARY.md](./SUMMARY.md) - Current features
- Frontend code in `/frontend/src/`

### For DevOps
- [README.md](./README.md) - Setup instructions
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Deployment checklist
- Environment variables in `.env.example` files

### For QA/Testers
- [API_EXAMPLES.md](./API_EXAMPLES.md) - API test cases
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Testing checklist
- Swagger docs for API testing

---

## 🔍 Finding Information

### Database Schema
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - Database Schema section
→ `backend/prisma/schema.prisma` - Prisma schema file

### API Endpoints
→ [API_EXAMPLES.md](./API_EXAMPLES.md) - Examples
→ Swagger UI: http://localhost:3001/api/docs
→ `backend/src/*/controllers.ts` - Controller files

### Business Logic
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - Module descriptions
→ `backend/src/*/services.ts` - Service files

### Frontend Components
→ `frontend/src/components/` - Component files
→ `frontend/src/app/` - Page files

### Configuration
→ `backend/.env.example` - Backend env vars
→ `frontend/.env.example` - Frontend env vars
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Environment checklist

---

## 📝 Document Maintenance

**When to update:**

- **ARCHITECTURE.md** - When system design changes
- **SUMMARY.md** - When features are completed
- **IMPLEMENTATION_GUIDE.md** - When implementation patterns change
- **API_EXAMPLES.md** - When API changes
- **QUICK_REFERENCE.md** - When adding new queries/commands
- **README.md** - When setup process changes

---

## 🆘 Getting Help

1. **Check documentation** - Most answers are here
2. **Review code** - Well-commented and structured
3. **Check Swagger** - API documentation
4. **Review error messages** - Descriptive and actionable
5. **Check logs** - Backend logs show detailed errors

---

**Documentation Index v1.0**
*Last updated: 2024*
