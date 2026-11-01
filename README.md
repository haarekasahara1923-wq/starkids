# STAR KIDS Public School - School Management System

A complete, full-featured School Management System built with **Next.js 16**, **Prisma ORM**, **Neon PostgreSQL**, and **Cloudinary**.

## 🌟 Features

- **Student Management** - Admissions, profiles, class management, digital ID cards
- **Fee Collection** - Installment plans, UPI/Cash/Bank receipts with automated reminders
- **Live Analytics** - Real-time revenue, attendance & academic performance dashboards
- **Exams & Tests** - MCQ + descriptive tests, auto evaluation, digital report cards
- **Attendance System** - Daily class attendance, bulk marking, parent WhatsApp alerts
- **AI Question Generator** - Generate MCQs & descriptive questions for any subject
- **WhatsApp Automation** - Fee reminders, attendance alerts & notices
- **Lead / Enquiry CRM** - Enquiries, follow-ups, conversion tracking
- **Teacher Portal** - Staff profiles, homework, attendance & salary management
- **Expense Tracking** - Rent, salary, utilities & P&L reports
- **Transport Management** - Vehicle tracking, route management & driver coordination
- **Role-Based Access** - Admin, Teacher, Student, Parent & Driver - 5 dedicated portals
- **Dooper Admin Panel** - Platform-level super admin to manage school tenants

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon PostgreSQL (via Prisma ORM)
- **File Storage**: Cloudinary
- **Auth**: JWT (access + refresh tokens)
- **UI**: Tailwind CSS v4 + Radix UI
- **Email**: Nodemailer / Resend
- **Payments**: Razorpay
- **Push Notifications**: Web Push (VAPID)
- **AI**: OpenAI / Gemini / Groq

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd starkids
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env.local
```
Fill in your values (Neon DB URL, JWT secrets, Cloudinary, etc.)

### 4. Push DB schema & seed
```bash
npm run db:push
npm run db:seed
```
Copy the printed `Tenant ID` and set it as `NEXT_PUBLIC_SCHOOL_TENANT_ID` in `.env.local`.

### 5. Run development server
```bash
npm run dev
```

### 6. Dooper Admin Setup (first time only)
```
POST /api/dooper-admin/auth/setup
Body: { "setupKey": "starkids-dooper-setup-2026", "email": "...", "password": "...", "name": "..." }
```

## 🔐 Default Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@starkids.school | starkids@super2026 |
| School Admin | admin@starkids.school | starkids@admin2026 |
| Teacher | teacher@starkids.school | teacher@starkids2026 |

> ⚠️ **Change these passwords immediately after first login!**

## 🌐 Deploy to Vercel

1. Push code to GitHub
2. Import repo in Vercel
3. Add all environment variables from `.env.example`
4. Set `DATABASE_URL` and `DIRECT_URL` from your new Neon PostgreSQL instance
5. Deploy!

## 📁 Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # School admin dashboard
│   ├── dooper-admin/  # Platform super admin panel
│   ├── portal/        # Student / Teacher / Parent portals
│   ├── login/         # Auth pages
│   └── school-signup/ # School registration
├── components/        # Reusable UI components
├── contexts/          # React contexts (Auth, etc.)
└── lib/               # Utilities, Prisma client, helpers
prisma/
├── schema.prisma      # Database schema
└── seed.ts            # Database seeder
```

## 📄 License

Copyright © 2026 STAR KIDS Public School. All rights reserved.
Developed by Scalevo.
