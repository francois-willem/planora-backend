# Planora Business Permanent Deletion Guide

This guide explains how to permanently delete companies/businesses registered on Planora, including all related data.

## ⚠️ WARNING

**Permanent deletion cannot be undone!** Once a business is permanently deleted, all associated data is lost forever. Always use the preview functionality first to understand what will be deleted.

## Available Methods

### 1. Command Line Script (Recommended for Development/Testing)

#### List All Businesses
```bash
cd planora-backend
node scripts/permanentDeleteBusiness.js list
```

#### Preview What Will Be Deleted
```bash
cd planora-backend
node scripts/permanentDeleteBusiness.js preview <businessId>
```

#### Permanently Delete a Business
```bash
cd planora-backend
node scripts/deleteBusinessSimple.js <businessId>
```

**Note:** Use `deleteBusinessSimple.js` for reliable deletion. The original script may have connection issues.

### 2. API Endpoints (For Production Use)

#### Preview Deletion
```bash
GET /api/businesses/:id/deletion-preview
Authorization: Bearer <super-admin-token>
```

This endpoint shows you exactly what will be deleted without actually deleting anything.

#### Permanent Deletion
```bash
DELETE /api/businesses/:id/permanent
Authorization: Bearer <super-admin-token>
```

This endpoint permanently deletes the business and all related data.

### 2. Command Line Script (For Development/Testing)

#### Preview What Will Be Deleted
```bash
cd planora-backend
node scripts/permanentDeleteBusiness.js preview <businessId>
```

#### List All Businesses with Deletion Info
```bash
cd planora-backend
node scripts/permanentDeleteBusiness.js list
```

#### Permanently Delete a Business
```bash
cd planora-backend
node scripts/deleteBusinessSimple.js <businessId>
```

**Note:** If you encounter connection errors with the original script, use the simplified version above.

## What Gets Deleted

When a business is permanently deleted, the following data is removed:

### 1. **Schedules** - All class schedules and enrollments
- Scheduled classes
- Client enrollments
- Waitlist entries
- Class notes

### 2. **Classes** - All class definitions
- Class titles and descriptions
- Capacity settings
- Instructor assignments

### 3. **Clients** - All client records
- Client profiles
- Contact information
- Medical information
- Preferences

### 4. **Employees/Instructors** - All staff records
- Employee profiles
- Certifications
- Availability schedules
- Specializations

### 5. **Business Codes** - All registration codes
- Client registration codes
- Invitation codes
- QR code data

### 6. **Business Invitations** - All pending invitations
- Email invitations
- Invitation tokens
- Invitation status

### 7. **User-Business Associations** - All user connections
- Admin associations
- Employee associations
- Client associations

### 8. **Notes** - All business-related notes
- Client notes
- Class notes
- General business notes

### 9. **Associated Users** - User accounts are deactivated
- Users are NOT deleted (they might have other business associations)
- Users are deactivated and business references are cleared
- Users can be reactivated if they have other business associations

### 10. **Business Record** - The business itself
- Business profile
- Settings
- Subscription information

## Safety Measures

### 1. **Preview Before Deletion**
Always use the preview endpoint/script first to see exactly what will be deleted.

### 2. **Super Admin Only**
Only super administrators can permanently delete businesses.

### 3. **Confirmation Required**
The command-line script requires explicit confirmation to prevent accidental deletion.

### 4. **Comprehensive Logging**
All deletion operations are logged with detailed information about what was deleted.

## Usage Examples

### Using the API

#### 1. Preview Deletion
```javascript
// Get deletion preview
const response = await fetch('/api/businesses/64a1b2c3d4e5f6789012345/deletion-preview', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your-super-admin-token',
    'Content-Type': 'application/json'
  }
});

const preview = await response.json();
console.log('Records to be deleted:', preview.data.totalRecords);
```

#### 2. Permanently Delete
```javascript
// Permanently delete business
const response = await fetch('/api/businesses/64a1b2c3d4e5f6789012345/permanent', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer your-super-admin-token',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Deletion completed:', result.deletedData);
```

### Using the Command Line Script

#### 1. List All Businesses
```bash
cd planora-backend
node scripts/permanentDeleteBusiness.js list
```

#### 2. Preview Deletion
```bash
cd planora-backend
node scripts/permanentDeleteBusiness.js preview 64a1b2c3d4e5f6789012345
```

#### 3. Permanently Delete
```bash
cd planora-backend
node scripts/deleteBusinessSimple.js 64a1b2c3d4e5f6789012345
```

## Response Format

### Preview Response
```json
{
  "success": true,
  "data": {
    "business": {
      "id": "64a1b2c3d4e5f6789012345",
      "name": "Example Business",
      "email": "contact@example.com",
      "businessType": "swimming",
      "status": "active",
      "isActive": true,
      "createdAt": "2023-07-01T00:00:00.000Z"
    },
    "deletionPreview": {
      "schedules": 25,
      "classes": 5,
      "clients": 50,
      "employees": 3,
      "businessCodes": 2,
      "invitations": 1,
      "userBusinesses": 54,
      "notes": 10,
      "associatedUsers": 54
    },
    "totalRecords": 204
  }
}
```

### Deletion Response
```json
{
  "success": true,
  "message": "Business and all related data permanently deleted",
  "deletedData": {
    "schedules": 25,
    "classes": 5,
    "clients": 50,
    "employees": 3,
    "businessCodes": 2,
    "invitations": 1,
    "userBusinesses": 54,
    "notes": 10,
    "deactivatedUsers": 54
  }
}
```

## Best Practices

### 1. **Always Preview First**
Never delete without previewing what will be removed.

### 2. **Backup Important Data**
If you need to preserve any data, export it before deletion.

### 3. **Use Soft Delete When Possible**
Consider using the regular deactivate endpoint (`DELETE /api/businesses/:id`) for temporary suspension instead of permanent deletion.

### 4. **Document Deletion Reasons**
Keep records of why businesses were permanently deleted for audit purposes.

### 5. **Test in Development**
Always test deletion procedures in a development environment first.

## Troubleshooting

### Common Issues

#### 1. **Permission Denied**
- Ensure you're logged in as a super administrator
- Check that your token has the correct permissions

#### 2. **Business Not Found**
- Verify the business ID is correct
- Check that the business hasn't already been deleted

#### 3. **Database Connection Issues**
- Ensure MongoDB is running
- Check database connection string in environment variables

#### 4. **Partial Deletion**
- If deletion fails partway through, some data may be orphaned
- Check the logs for specific error messages
- You may need to manually clean up remaining references

#### 5. **Connection Errors ("Client must be connected")**
- **Cause:** MongoDB connection drops during operation
- **Solution:** Use the simplified script: `node scripts/deleteBusinessSimple.js <businessId>`
- **Alternative:** Wait 5-10 minutes and retry
- **Prevention:** Delete businesses one at a time with breaks between operations

## Recovery

**Important**: Once a business is permanently deleted, it cannot be recovered. The only way to restore the business is to:

1. Recreate the business record
2. Recreate all associated data manually
3. Re-register all users

This is why previewing and backing up important data is crucial before deletion.

## Support

If you encounter issues with business deletion:

1. Check the server logs for detailed error messages
2. Verify database connectivity
3. Ensure proper permissions
4. Contact system administrators for assistance

Remember: **Permanent deletion is irreversible. Use with extreme caution.**
