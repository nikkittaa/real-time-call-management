# 📞 Real-Time Call Management System

A comprehensive real-time call management application built with modern technologies, enabling users to make calls, track analytics, and manage call data in real-time.


## 🚀 Features

### Core Functionality
- **🔐 User Authentication** - Secure JWT-based authentication system
- **📞 Call Management** - Make outbound calls via Twilio integration  
- **📊 Real-time Analytics** - Live call statistics and performance metrics
- **📋 Call Logging** - Comprehensive call history with detailed information
- **📝 Call Notes** - Add, edit, and manage notes for individual calls
- **🎵 Call Recording** - Automatic call recording with playback functionality
- **📱 Real-time Updates** - Live call status updates using Server-Sent Events (SSE)

### Analytics & Reporting  
- **📈 Dashboard** - Interactive dashboard with call metrics
- **📊 Advanced Analytics** - Call duration, success rates, and trend analysis
- **📤 Data Export** - Export call logs to CSV format
- **🔍 Advanced Filtering** - Filter calls by date range, status, and phone numbers
- **📋 Call Summary** - Detailed call debug information and summaries

### Technical Features
- **⚡ Real-time Data** - Firebase integration for live data synchronization
- **🗄️ High-Performance Database** - ClickHouse for fast analytics queries  
- **🔒 Security** - JWT authentication, request validation, and secure endpoints
- **📖 API Documentation** - Swagger/OpenAPI integration
- **🐳 Containerization** - Docker support for easy deployment

## 🏗️ Technology Stack

### Backend
- **Framework:** NestJS 11+ (Node.js/TypeScript)
- **Database:** ClickHouse (Analytics) + Firebase (Real-time data)
- **Authentication:** JWT with Passport.js
- **API Integration:** Twilio (Voice calls and webhooks)
- **Documentation:** Swagger/OpenAPI
- **Logging:** Winston with structured logging
- **Testing:** Jest 

### Frontend  
- **Technology:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Custom CSS with modern design principles
- **Real-time:** Server-Sent Events (SSE) for live updates
- **Charts:** Interactive analytics dashboards

### Infrastructure
- **Containerization:** Docker + Docker Compose  
- **Web Server:** Nginx (Frontend proxy)
- **Development:** Hot reload, linting, code formatting

## 📁 Project Structure

```
real-time-call-management/
├── 📄 docker-compose.yml              # Docker orchestration configuration
├── 📄 README.md                       # Project documentation
│
├── 📂 backend/                        # Node.js/NestJS Backend
│   ├── 📂 dist/                       # Compiled JavaScript files
│   │
│   ├── 📂 src/                        # Source code
│   │   ├── 📄 main.ts                 # Application entry point
│   │   ├── 📄 app.module.ts           # Root application module
│   │   ├── 📄 app.controller.ts       # Root controller
│   │   ├── 📄 app.service.ts          # Root service
│   │   │
│   │   ├── 📂 common/                 # Shared utilities and interfaces
│   │   │   ├── 📂 decorators/         # Custom decorators
│   │   │   │   └── get-jwt-payload.decorator.ts
│   │   │   ├── 📂 enums/              # Application enums
│   │   │   │   └── call-status.enum.ts
│   │   │   ├── 📂 filters/            # Exception filters
│   │   │   │   └── http-exception.filter.ts
│   │   │   └── 📂 interfaces/         # TypeScript interfaces
│   │   │       ├── call-debug-info.interface.ts
│   │   │       ├── call-logs.interface.ts
│   │   │       ├── calldata-firebase.interface.ts
│   │   │       ├── jwt-payload.interface.ts
│   │   │       ├── twilio-callevent.interface.ts
│   │   │       └── twilio-recordingevent.interface.ts
│   │   │
│   │   ├── 📂 modules/                # Feature modules
│   │   │   ├── 📂 auth/               # Authentication module
│   │   │   │   ├── auth.controller.ts # Authentication endpoints
│   │   │   │   ├── auth.service.ts    # Authentication business logic
│   │   │   │   ├── auth.module.ts     # Authentication module config
│   │   │   │   ├── 📂 dto/            # Data Transfer Objects
│   │   │   │   │   └── sign-in.dto.ts
│   │   │   │   └── 📂 strategies/     # Passport strategies
│   │   │   │       └── jwt.strategy.ts
│   │   │   │
│   │   │   ├── 📂 calls/              # Call management module
│   │   │   │   ├── call.controller.ts # Call endpoints
│   │   │   │   ├── calls.service.ts   # Call business logic
│   │   │   │   ├── calls.module.ts    # Call module config
│   │   │   │   └── 📂 dto/            # Call-related DTOs
│   │   │   │       ├── analytic.dto.ts
│   │   │   │       ├── callEvent.dto.ts
│   │   │   │       ├── create-notes.dto.ts
│   │   │   │       ├── debugInfo.dto.ts
│   │   │   │       ├── export-call.dto.ts
│   │   │   │       └── get-call-logs.dto.ts
│   │   │   │
│   │   │   ├── 📂 clickhouse/         # ClickHouse database module
│   │   │   │   ├── clickhouse.service.ts # Database operations
│   │   │   │   └── clickhouse.module.ts
│   │   │   │
│   │   │   ├── 📂 firebase/           # Firebase integration
│   │   │   │   ├── firebase.service.ts # Real-time database ops
│   │   │   │   └── firebase.module.ts
│   │   │   │
│   │   │   ├── 📂 twilio/             # Twilio integration module
│   │   │   │   ├── twilio.controller.ts # Twilio webhooks & calls
│   │   │   │   ├── twilio.service.ts  # Twilio API operations
│   │   │   │   └── twilio.module.ts
│   │   │   │
│   │   │   ├── 📂 users/              # User management module
│   │   │   │   ├── users.controller.ts # User endpoints
│   │   │   │   ├── users.service.ts   # User business logic
│   │   │   │   ├── users.module.ts    # User module config
│   │   │   │   ├── user.entity.ts     # User entity definition
│   │   │   │   └── 📂 dto/
│   │   │   │       └── create-user.dto.ts
│   │   │   │
│   │   │   ├── 📂 callDebug/          # Call debugging module
│   │   │   │   ├── callDebug.service.ts
│   │   │   │   └── callDebug.module.ts
│   │   │   │
│   │   │   └── 📂 logger/             # Logging module
│   │   │       └── logger.module.ts
│   │   │
│   │   ├── 📂 health/                 # Health check endpoints
│   │   │   └── health.controller.ts
│   │   │
│   │   └── 📂 utils/                  # Utility functions
│   │       └── formatDatefoClickhouse.ts
│   │
│   ├── 📂 test/                       # Test files
│   │   ├── app.e2e-spec.ts  
|   |   |__ call-management.e2e.spec.ts        
│   │   └── jest-e2e.json          
│   │
│   ├── 📄 package.json                # NPM dependencies and scripts
│   ├── 📄 package-lock.json          # Dependency lock file
│   ├── 📄 tsconfig.json              # TypeScript configuration
│   ├── 📄 tsconfig.build.json        # Build TypeScript config
│   ├── 📄 nest-cli.json              # NestJS CLI configuration
│   ├── 📄 jest.config.js             # Jest test configuration
│   ├── 📄 eslint.config.mjs          # ESLint configuration
│   ├── 📄 Dockerfile.dev             # Development Docker image
│   └── 📄 real-time-firebase.json    # Firebase service account key
│
└── 📂 frontend/                       # Frontend Application
    ├── 📄 index.html                  # Login/Home page
    ├── 📄 signup.html                 # User registration page
    ├── 📄 dashboard.html              # Main dashboard
    ├── 📄 call_logs.html              # Call history view
    ├── 📄 call_summary.html           # Individual call details
    ├── 📄 analytics.html              # Analytics dashboard
    ├── 📄 nginx.conf                  # Nginx configuration
    ├── 📄 Dockerfile.dev              # Frontend Docker image
    │
    ├── 📂 css/                        # Stylesheets
    │   ├── style.css                  # Main application styles
    │   ├── dashboard.css              # Dashboard-specific styles
    │   ├── callLogs.css               # Call logs page styles
    │   ├── analytics.css              # Analytics page styles
    │   └── debug.css                  # Debug page styles
    │
    └── 📂 js/                         # JavaScript modules
        ├── 📄 auth.js                 # Authentication logic
        │
        ├── 📂 dashboard/              # Dashboard functionality
        │   ├── dashboard.js           # Main dashboard logic
        │   ├── callActions.js         # Call action handlers
        │   ├── callStream.js          # Real-time call streaming
        │   └── utils.js               # Dashboard utilities
        │
        ├── 📂 call_logs/              # Call logs functionality
        │   ├── callLogs.js            # Call logs display logic
        │   ├── notes.js               # Notes management
        │   └── utils.js               # Call logs utilities
        │
        ├── 📂 analytics/              # Analytics functionality
        │   └── analytics.js           # Analytics dashboard logic
        │
        └── 📂 debug/                  # Debug functionality
            └── debug.js               # Call debugging interface
```

### Key Directories Explained:

#### Backend Structure:
- **`src/modules/`** - Feature-based modules following NestJS architecture
- **`src/common/`** - Shared utilities, interfaces, and decorators used across modules
- **`src/health/`** - Application health monitoring endpoints
- **`test/`** - Comprehensive test suites for API endpoints

#### Frontend Structure:
- **Root HTML files** - Individual pages for different application views
- **`css/`** - Modular stylesheets for each page/component
- **`js/`** - Organized JavaScript modules by feature area

#### Configuration Files:
- **`docker-compose.yml`** - Multi-service container orchestration
- **`package.json`** - Dependencies, scripts, and project metadata
- **TypeScript configs** - Compilation and build settings
- **Test configs** - Jest and E2E testing configurations

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** 18+ and **npm** 
- **Docker** and **Docker Compose**
- **Twilio Account** (for call functionality)
- **Firebase Project** (for real-time features)

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd real-time-call-management
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=call_management
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Twilio Configuration  
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# Application Configuration
NODE_ENV=development
PORT=3002
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Generate a service account key
3. Add the credentials to your `.env` file
4. Set up Firebase Realtime Database

### 4. Twilio Setup

1. Sign up at [Twilio Console](https://console.twilio.com/)
2. Get your Account SID, Auth Token, and phone number
3. Configure webhooks for call events:
   - Voice URL: `http://your-domain.com/twilio/voice`
   - Status Callback URL: `http://your-domain.com/twilio/events`
   - Recording Status Callback: `http://your-domain.com/twilio/recording-events`

### 5. Run with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs  
docker-compose logs -f

# Stop services
docker-compose down
```

### 6. Manual Installation (Alternative)

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (if needed)
cd ../frontend  
# No npm dependencies for vanilla frontend

# Start ClickHouse (requires separate installation)
# Start backend
cd ../backend
npm run start:dev

# Serve frontend (use any web server)
cd ../frontend
python -m http.server 8080  # or use nginx
```

## 🖥️ Usage

### Accessing the Application

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3002  
- **API Documentation:** http://localhost:3002/api
- **ClickHouse UI:** http://localhost:8123

### Basic Workflow

1. **Sign Up/Login:** Create an account or login at the main page
2. **Dashboard:** View your call analytics and real-time data
3. **Make Calls:** Use the interface to initiate outbound calls
4. **Monitor Calls:** Watch real-time call status updates
5. **Manage Data:** View call logs, add notes, and export data
6. **Analytics:** Analyze call performance and trends

### API Endpoints

#### Authentication
```http
POST /auth/signin           # User login
GET  /auth/validate-token   # Validate JWT token
```

#### Call Management  
```http
GET    /calls              # Get filtered calls
GET    /calls/analytics    # Get call analytics
GET    /calls/export       # Export calls to CSV
GET    /calls/summary      # Get call debug info
GET    /calls/stream       # Real-time call updates (SSE)
```

#### Call Operations
```http
POST   /twilio/make        # Initiate outbound call
POST   /twilio/voice       # TwiML response endpoint
POST   /twilio/events      # Twilio webhook for call events
POST   /twilio/recording-events  # Recording status updates
```

#### Call Notes
```http
GET    /calls/:callSid/notes    # Get call notes  
PATCH  /calls/:id/notes         # Update call notes
DELETE /calls/:id/notes         # Delete call notes
```



### Test Categories

- **Unit Tests:** Individual component testing
- **E2E Tests:** Full application flow testing including:
  - Authentication flows
  - Call management operations
  - Security validation
 

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

- **Local:** http://localhost:3002/api
- **Features:** 
  - Complete endpoint documentation
  - Request/response schemas  
  - Interactive testing interface
  - Authentication examples

### Example API Usage

```javascript
// Login
const loginResponse = await fetch('/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' })
});
const { accessToken } = await loginResponse.json();

// Make a call
const callResponse = await fetch('/twilio/make', {
  method: 'POST', 
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ to: '+1234567890' })
});

// Get call analytics
const analytics = await fetch('/calls/analytics', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```


## Security Considerations

- **JWT Authentication:** Secure token-based authentication
- **Input Validation:** Request validation using class-validator
- **CORS Configuration:** Proper cross-origin resource sharing
- **Environment Variables:** Sensitive data stored securely

## Monitoring & Logging

### Logging Features
- **Structured Logging:** logs with Winston
- **Log Levels:** Debug, info, warn, error classification
- **Context Logging:** Request correlation and tracing


### Development Setup

```bash
# Install dependencies
npm install

# Set up git hooks
npm run prepare

# Start development
npm run start:dev

# Run linting
npm run lint

# Format code
npm run format
```





