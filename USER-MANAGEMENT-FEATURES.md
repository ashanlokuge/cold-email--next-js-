# User Management Features Guide 🎯

## ✅ Complete Feature Set

Your User Management system now has full CRUD operations:

### 1. **Create User** ✨
- Click "Create New User" button
- Fill in: Email, Name, Password, Role (Admin/User)
- Password is automatically hashed (bcrypt)
- User gets immediate access with provided credentials

### 2. **Edit User** ✏️
- Click the **Edit** icon (pencil) in Actions column
- Modify: Email, Name, Role
- Changes take effect immediately
- User may need to re-login if email/role changed
- **Note:** You cannot edit your own account from this panel

### 3. **Activate/Deactivate** 🔄
- Click the **Toggle** icon (slash/checkmark) in Actions column
- **Deactivate** (orange): Prevents user from logging in (soft delete)
- **Activate** (green): Restores login access
- User data is preserved when deactivated
- **Note:** You cannot deactivate your own account

### 4. **Delete User** 🗑️
- Click the **Delete** icon (trash) in Actions column
- Confirmation modal appears with warning
- **Permanent deletion** - cannot be undone
- User and all associated data removed from database
- **Note:** You cannot delete your own account

---

## 🎨 UI Features

### Action Buttons
Each user row has 3 action buttons:
1. **📝 Edit (Blue)** - Pencil icon
2. **🔄 Toggle (Orange/Green)** - Slash/Checkmark icon
3. **🗑️ Delete (Red)** - Trash icon

### Safety Features
- ✅ All actions on your own account are **disabled** (grayed out)
- ✅ Delete requires **confirmation modal** with user details
- ✅ Warning messages for irreversible actions
- ✅ Visual tooltips on hover explaining each action

### Status Badges
- 🟣 **Purple badge** = Admin role
- 🔵 **Blue badge** = User role
- 🟢 **Green badge** = Active status
- 🔴 **Red badge** = Inactive status

---

## 📡 API Endpoints

### GET `/api/admin/users`
- Fetches all users
- Returns: Array of users (passwords excluded)
- Dates normalized to ISO strings

### POST `/api/admin/users`
- Creates new user
- Required: `email`, `name`, `password`
- Optional: `role` (default: 'user')
- Password automatically hashed

### PUT `/api/admin/users`
- Updates existing user
- Required: `userId`, `updates` object
- Can update: `name`, `email`, `role`, `isActive`
- Supports ObjectId or string _id matching

### DELETE `/api/admin/users`
- Deletes or deactivates user
- Required: `userId`
- Optional: `permanent` (boolean)
  - `true` = Permanent deletion
  - `false` = Soft delete (deactivate)

---

## 🔐 Security Features

### Password Security
- **Bcrypt hashing** with 12 salt rounds
- Never stored in plain text
- Never returned in API responses

### Self-Protection
- Admins cannot edit/deactivate/delete their own account
- Prevents accidental lockout
- UI buttons disabled + tooltips explain why

### Role-Based Access
- Only admins see User Management section
- Regular users cannot access admin panel
- Authorization enforced at UI and API level

---

## 💡 Usage Examples

### Example 1: Change User Role
1. Navigate to **User Management**
2. Find the user in the table
3. Click **Edit** (pencil icon)
4. Change Role dropdown from "User" to "Admin"
5. Click "Update User"
6. ✅ User now has admin privileges

### Example 2: Temporarily Suspend Access
1. Find the user
2. Click **Deactivate** (orange slash icon)
3. Status changes to "Inactive" (red badge)
4. User cannot login
5. Later: Click **Activate** to restore access

### Example 3: Permanently Remove User
1. Find the user
2. Click **Delete** (red trash icon)
3. Confirmation modal appears with user details
4. Review the warning: "This action cannot be undone"
5. Click "Yes, Delete User"
6. ✅ User permanently removed from system

---

## 🐛 Troubleshooting

### "Failed to update user"
- **Cause:** Invalid user ID or user not found
- **Solution:** Refresh the page and try again

### "Failed to delete user"
- **Cause:** User already deleted or invalid ID
- **Solution:** Refresh user list

### Edit/Delete buttons are grayed out
- **Cause:** You're trying to modify your own account
- **Solution:** Have another admin edit your account, or use settings panel

### "Unknown" in Created date
- **Cause:** Old user records without valid createdAt
- **Solution:** This is normal for legacy data, doesn't affect functionality

---

## 📊 Current User Table

You currently have these users:

| User | Email | Role | Status |
|------|-------|------|--------|
| Admin | admin@example.com | admin | Inactive |
| Ashan Lokuge | ashanlokuge10@gmail.com | admin | Active |
| Ashan Lokuge | ashanlokuge10@gmail.com | admin | Active |
| Test | testone@gmail.com | user | Inactive |

**Note:** You have duplicate "Ashan Lokuge" entries. You can safely delete one using the new Delete feature.

---

## 🚀 Best Practices

### Creating Users
1. ✅ Use strong temporary passwords
2. ✅ Tell users to change password after first login
3. ✅ Assign appropriate roles (most should be "user")
4. ✅ Use company email addresses

### Managing Roles
1. ✅ Give admin role only to trusted team members
2. ✅ Review admin list regularly
3. ✅ Demote users who no longer need admin access

### Deleting Users
1. ✅ Try deactivating first (reversible)
2. ✅ Only delete if you're sure you won't need the data
3. ✅ Export user data before permanent deletion if needed

### Account Security
1. ✅ Regularly review active users
2. ✅ Deactivate accounts of departing team members
3. ✅ Delete test accounts when no longer needed

---

## 🎬 Quick Actions

### Remove Duplicate User
```
1. Go to User Management
2. Find the duplicate "Ashan Lokuge" row (the one with "Never" last login)
3. Click Delete icon (red trash)
4. Confirm deletion
✅ Duplicate removed
```

### Make Someone an Admin
```
1. Find their user row
2. Click Edit icon (blue pencil)
3. Change Role to "Admin"
4. Click "Update User"
✅ They now have admin access
```

### Revoke Access (Temporarily)
```
1. Find their user row
2. Click Deactivate icon (orange slash)
3. Status turns Inactive (red)
✅ They cannot login until reactivated
```

---

**Last Updated:** October 7, 2025  
**Features:** Create, Edit, Activate/Deactivate, Delete  
**Status:** ✅ All features working
