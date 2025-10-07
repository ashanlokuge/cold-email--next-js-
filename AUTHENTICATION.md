# Authentication Setup Guide

## Overview

This cold email sender application now includes a complete authentication system with the following features:

- **Login-only system** (no signup page - admins create accounts)
- **Role-based access** (admin and user roles)
- **JWT-based authentication** with secure token management
- **User management panel** for admins
- **Protected routes** throughout the application

## Quick Setup

### 1. Install Dependencies

The required authentication packages have been installed:
```bash
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
```

### 2. Environment Configuration

Copy the example environment file:
```bash
copy .env.example .env.local
```

Update the following variables in `.env.local`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=coldemail

# Authentication (IMPORTANT: Change these in production)
JWT_SECRET=your-super-long-random-secret-key-for-jwt-tokens-change-this-in-production
```

### 3. Database Setup

Make sure MongoDB is running, then create the default admin user:
```bash
npm run setup-admin
```

This creates:
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** `admin`

## Features

### Login System

- **Login page:** `/login`
- **No signup page** - accounts are created by admins
- **Demo credentials** are shown on the login page for testing
- **Automatic redirect** to dashboard after successful login
- **Token-based sessions** with 24-hour expiration

### User Management (Admin Only)

Admins can access the "User Management" section to:
- **View all users** with their details and status
- **Create new accounts** with email, password, name, and role
- **Activate/deactivate users** without deleting them
- **Manage roles** (admin/user permissions)

### Security Features

- **Password hashing** using bcryptjs with salt rounds
- **JWT tokens** for stateless authentication
- **Protected routes** using HOC wrapper
- **Role-based access control** for admin features
- **Automatic token verification** on app load
- **Secure logout** with token cleanup

## Usage

### For Admins

1. **Login** with admin credentials
2. **Create user accounts** via User Management section
3. **Share login credentials** with users via email
4. **Manage user access** by activating/deactivating accounts

### For Users

1. **Receive credentials** from admin
2. **Login** at `/login`
3. **Access dashboard** with email campaign features
4. **Logout** when done

### Creating User Accounts

Admins can create accounts in two ways:

#### Via Web Interface:
1. Login as admin
2. Go to "User Management" section
3. Click "Create New User"
4. Fill in user details
5. Share credentials with the user

#### Via API:
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword123",
    "name": "John Doe",
    "role": "user"
  }'
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### User Management (Admin only)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users` - Update user
- `DELETE /api/admin/users` - Deactivate user

## File Structure

```
src/
├── components/
│   ├── Layout.tsx              # Updated with user info and logout
│   ├── Sidebar.tsx             # Updated with admin navigation
│   └── sections/
│       └── UserManagementSection.tsx  # Admin user management
├── lib/
│   ├── auth.tsx               # Authentication context and HOC
│   ├── db.ts                  # Updated with connectDB export
│   └── createAdmin.ts         # Admin user creation utility
├── pages/
│   ├── _app.tsx               # Updated with AuthProvider
│   ├── index.tsx              # Protected with withAuth HOC
│   ├── login.tsx              # Login page
│   └── api/
│       ├── auth/
│       │   ├── login.ts       # Login endpoint
│       │   ├── logout.ts      # Logout endpoint
│       │   └── verify.ts      # Token verification
│       └── admin/
│           └── users.ts       # User management endpoints
├── types/
│   └── index.ts               # Updated with auth types
└── scripts/
    └── setup-admin.js         # Admin setup script
```

## Security Notes

### Production Deployment

1. **Change JWT_SECRET** to a long, random string
2. **Use HTTPS** for all authentication endpoints
3. **Set secure cookie flags** if using cookie-based auth
4. **Implement rate limiting** on login endpoints
5. **Add password complexity requirements**
6. **Enable account lockout** after failed attempts

### Default Credentials

⚠️ **Important:** Change the default admin password immediately after setup!

The default credentials are:
- Email: `admin@example.com`
- Password: `admin123`

## Troubleshooting

### Common Issues

1. **Authentication not working:**
   - Check MongoDB connection
   - Verify JWT_SECRET is set
   - Check browser console for errors

2. **Admin features not showing:**
   - Ensure user has `admin` role in database
   - Clear browser cache and re-login

3. **Token expiration:**
   - Tokens expire after 24 hours
   - Users need to re-login

4. **Database connection issues:**
   - Ensure MongoDB is running
   - Check MONGODB_URI in environment

### Reset Admin Password

If you forget the admin password:

1. Connect to MongoDB
2. Hash a new password:
   ```javascript
   const bcrypt = require('bcryptjs');
   const newPassword = bcrypt.hashSync('newpassword123', 12);
   ```
3. Update the admin user:
   ```javascript
   db.users.updateOne(
     { email: 'admin@example.com' },
     { $set: { password: newPassword } }
   );
   ```

## Next Steps

1. **Test the login system** with default credentials
2. **Create user accounts** for your team
3. **Update environment variables** for your setup
4. **Customize the user interface** as needed
5. **Set up email configuration** for sending campaigns

The authentication system is now fully integrated with your cold email sender application!