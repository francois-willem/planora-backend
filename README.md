# Planora Backend

Express.js REST API server for the Planora multi-business scheduling management system. Provides authentication, business management, client management, scheduling, and more.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   
   Create a `.env` file in the root of the backend directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/planora
   # Or for MongoDB Atlas:
   # MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/planora
   
   JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
   PORT=4000
   
   # Email configuration (optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@planora.com
   ```

3. **Create Super Admin account**
   ```bash
   node seedSuperAdmin.js
   ```
   
   Default credentials:
   - Email: `superadmin@planora.com`
   - Password: `SuperSecret123`
   
   **⚠️ Change the default password after first login!**

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The server will run on `http://localhost:4000` (or your configured PORT)

## 📁 Project Structure

```
planora-backend/
├── config/
│   └── db.js                    # MongoDB connection configuration
├── controllers/                 # Route handlers (business logic)
│   ├── authController.js       # Authentication logic
│   ├── businessController.js    # Business management
│   ├── clientController.js      # Client management
│   ├── employeeController.js    # Employee/instructor management
│   ├── instructorController.js  # Instructor-specific logic
│   ├── noteController.js       # Instructor notes
│   ├── registrationController.js # Registration flows
│   ├── scheduleController.js    # Schedule management
│   └── sessionController.js    # Session management
├── middleware/
│   └── auth.js                 # JWT authentication middleware
├── models/                      # Mongoose schemas
│   ├── Business.js
│   ├── BusinessCode.js
│   ├── BusinessInvitation.js
│   ├── Class.js
│   ├── Client.js
│   ├── Employee.js
│   ├── Instructor.js
│   ├── Note.js
│   ├── Notification.js
│   ├── Schedule.js
│   ├── Session.js
│   ├── User.js
│   └── UserBusiness.js
├── routes/                      # API route definitions
│   ├── authRoutes.js
│   ├── business.js
│   ├── classes.js
│   ├── clients.js
│   ├── employees.js
│   ├── instructors.js
│   ├── notes.js
│   ├── schedules.js
│   └── sessions.js
├── utils/                       # Utility functions
│   ├── emailService.js         # Email sending utilities
│   └── userBusinessManager.js  # User-business relationship management
├── scripts/                     # Utility scripts
│   ├── deleteBusinessSimple.js
│   └── permanentDeleteBusiness.js
├── migrations/                  # Database migration scripts
│   └── setPrimaryClients.js
├── server.js                    # Main server file
├── package.json
└── README.md                    # This file
```

## 🛠️ Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon (auto-reload)
- `npm run cleanup` - Run safe database cleanup script
- `npm run cleanup-all` - Run full database cleanup (⚠️ destructive)

## 🔌 API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/register-with-code` - Register with business code
- `POST /api/auth/register-with-invitation` - Register with invitation token
- `POST /api/auth/request-business-access` - Request access to business
- `POST /api/auth/switch-business` - Switch business context
- `GET /api/auth/businesses` - Get user's businesses
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/verify` - Verify email address

### Business Management (`/api/businesses`)

- `GET /api/businesses` - Get all businesses (super admin) or user's businesses
- `POST /api/businesses` - Create new business
- `GET /api/businesses/:id` - Get business details
- `PUT /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Deactivate business
- `GET /api/businesses/discover` - Discover businesses by code
- `POST /api/businesses/validate-code` - Validate business code
- `POST /api/businesses/register` - Register new business

### Client Management (`/api/clients`)

- `GET /api/clients` - Get all clients for business
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get client details
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Deactivate client
- `GET /api/clients/dashboard` - Get client dashboard data
- `PUT /api/clients/profile` - Update client profile
- `GET /api/clients/members` - Get all members for client
- `POST /api/clients/members` - Add member
- `PUT /api/clients/members/:id` - Update member
- `DELETE /api/clients/members/:id` - Remove member

### Class Management (`/api/classes`)

- `GET /api/classes` - Get all classes for business
- `POST /api/classes` - Create new class
- `GET /api/classes/:id` - Get class details
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Schedule Management (`/api/schedules`)

- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create new schedule
- `GET /api/schedules/:id` - Get schedule details
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `POST /api/schedules/:id/enroll` - Enroll client in class

### Session Management (`/api/sessions`)

- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Cancel session

### Employee Management (`/api/employees`)

- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Remove employee

### Notes Management (`/api/notes`)

- `GET /api/notes/client/:clientId` - Get notes for client
- `POST /api/notes` - Create new note
- `GET /api/notes/:id` - Get note details
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Development Endpoints (⚠️ Remove in production)

- `GET /api/test` - Test endpoint (no auth required)
- `GET /api/dev/businesses` - Get all businesses (no auth)
- `PUT /api/dev/businesses/:id` - Update business (no auth)

## 🔐 Authentication & Authorization

### JWT Authentication

The API uses JSON Web Tokens (JWT) for authentication:

1. User logs in via `/api/auth/login`
2. Server returns JWT token
3. Client includes token in `Authorization` header: `Bearer <token>`
4. Middleware validates token on protected routes

### Authentication Middleware

Use the `auth` middleware from `middleware/auth.js`:

```javascript
const { auth } = require('../middleware/auth');

router.get('/protected-route', auth, (req, res) => {
  // req.user contains authenticated user data
  res.json({ user: req.user });
});
```

### Role-Based Access Control

The system supports multiple roles:
- **superAdmin**: Platform-wide access
- **businessAdmin**: Business-specific admin access
- **instructor**: Limited to assigned classes
- **client**: Personal schedule access

Role checks are performed in controllers based on `req.user.role` and business context.

## 🗄️ Database Models

### Core Models

- **User**: Authentication and user accounts
- **Business**: Business information and settings
- **UserBusiness**: Many-to-many user-business relationships with roles
- **Client**: Customer profiles and preferences
- **Employee**: Staff member profiles
- **Instructor**: Instructor-specific information
- **Class**: Class definitions and pricing
- **Schedule**: Time slots and availability
- **Session**: Individual class sessions
- **Note**: Instructor notes for clients
- **BusinessCode**: 6-character codes for client registration
- **BusinessInvitation**: Invitation tokens for client registration
- **Notification**: System notifications

### Key Relationships

- Users ↔ Businesses: Many-to-many via `UserBusiness`
- Business → Clients: One-to-many
- Business → Classes: One-to-many
- Class → Schedules: One-to-many
- Schedule → Sessions: One-to-many
- Client → Members: One-to-many (parent-child relationships)

## 🔧 Utility Scripts

### Creating Super Admin

```bash
node seedSuperAdmin.js
```

### Creating Manual Admin

```bash
node createManualAdmin.js
```

### Resetting Super Admin Password

```bash
node resetSuperAdminPassword.js
```

### Listing Super Admins

```bash
node listSuperAdmins.js
```

### Database Cleanup

```bash
# Safe cleanup (recommended)
npm run cleanup

# Full cleanup (⚠️ destructive)
npm run cleanup-all
```

### Database Migration

```bash
# Migrate to multi-business architecture
node migrateToMultiBusiness.js
```

## 📧 Email Configuration

Email functionality is optional but recommended. Configure in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@planora.com
```

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use that password in `EMAIL_PASS`

See `EMAIL_SETUP.md` for detailed instructions.

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs with salt rounds
- **Input Validation**: express-validator for request validation
- **CORS Protection**: Configured for frontend integration
- **Role-Based Access**: Granular permissions per role
- **Business Context Isolation**: Users can only access assigned businesses

## 🚀 Deployment

### Environment Setup

1. Set up MongoDB Atlas or production MongoDB instance
2. Configure all environment variables
3. Set strong `JWT_SECRET` (use crypto.randomBytes for production)
4. Configure email service
5. Remove or secure development endpoints

### Production Checklist

- [ ] Change default super admin password
- [ ] Set strong JWT_SECRET
- [ ] Configure production MongoDB URI
- [ ] Set up email service
- [ ] Remove `/api/dev/*` endpoints
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up logging/monitoring
- [ ] Configure rate limiting
- [ ] Set up backup strategy

### Recommended Hosting

- **Backend**: Railway, Render, Heroku, or AWS
- **Database**: MongoDB Atlas
- **Frontend**: Vercel (see frontend README)

## 🐛 Troubleshooting

### Database Connection Issues

- Verify `MONGO_URI` is correct
- Check MongoDB is running (if local)
- Verify network access (if MongoDB Atlas)
- Check firewall settings

### Authentication Issues

- Verify `JWT_SECRET` is set
- Check token expiration settings
- Verify token is being sent in Authorization header
- Check middleware is applied correctly

### Email Issues

- Verify email credentials are correct
- Check SMTP settings
- For Gmail, ensure app password is used (not regular password)
- Check spam folder for test emails

## 📝 Development Notes

- Uses Express 5.x
- Mongoose 8.x for MongoDB ODM
- JWT tokens expire after 7 days (configurable)
- Password hashing uses bcryptjs with 10 salt rounds
- CORS is enabled for all origins (restrict in production)

## 🤝 Contributing

When contributing to the backend:

1. Follow existing code structure and patterns
2. Add input validation for all endpoints
3. Include proper error handling
4. Add authentication middleware where needed
5. Document new endpoints
6. Test with different user roles
7. Follow RESTful API conventions

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Documentation](https://jwt.io/)
- [Frontend README](../planora-frontend/README.md) - Frontend documentation
- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Email configuration guide
- [BUSINESS_DELETION_GUIDE.md](./BUSINESS_DELETION_GUIDE.md) - Business deletion procedures

