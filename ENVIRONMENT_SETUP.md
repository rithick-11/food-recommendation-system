# Environment Configuration Guide

This document provides comprehensive instructions for setting up the environment configuration for the Food Recommendation System.

## Server Environment Variables

### Required Environment Variables

The server requires the following environment variables to be set in `server/.env`:

#### Server Configuration
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production/test)
- `CLIENT_URL`: Frontend application URL for CORS

#### Database Configuration
- `MONGODB_URI`: MongoDB connection string for main database
- `MONGODB_TEST_URI`: MongoDB connection string for test database

#### JWT Configuration
- `JWT_SECRET`: Secret key for JWT token signing (minimum 32 characters)
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)

#### Gemini API Configuration
- `GEMINI_API_KEY`: Google Gemini API key for meal plan generation

#### Security Configuration
- `BCRYPT_SALT_ROUNDS`: Number of salt rounds for password hashing (default: 12)
- `CORS_ORIGIN`: Allowed CORS origin (should match CLIENT_URL)

### Setting Up Server Environment

1. Copy the example environment file:
   ```bash
   cd server
   cp .env.example .env
   ```

2. Update the `.env` file with your actual values:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/food-recommendation-system
   MONGODB_TEST_URI=mongodb://localhost:27017/food-recommendation-test

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
   JWT_EXPIRES_IN=7d

   # Gemini API Configuration
   GEMINI_API_KEY=your-gemini-api-key-here

   # Security Configuration
   BCRYPT_SALT_ROUNDS=12

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173
   ```

## Client Environment Variables

### Required Environment Variables

The client requires the following environment variables to be set in `client/.env`:

#### API Configuration
- `VITE_API_URL`: Backend API base URL

### Setting Up Client Environment

1. Copy the example environment file:
   ```bash
   cd client
   cp .env.example .env
   ```

2. Update the `.env` file with your actual values:
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:5000
   ```

## Production Environment Setup

### Security Considerations

1. **JWT Secret**: Generate a strong, random JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Database Security**: Use MongoDB Atlas or secure your local MongoDB instance
3. **API Keys**: Keep Gemini API key secure and rotate regularly
4. **CORS**: Set specific origins instead of wildcards in production

### Production Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/food-recommendation-system?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-64-characters-minimum
JWT_EXPIRES_IN=7d

# Gemini API Configuration
GEMINI_API_KEY=your-production-gemini-api-key

# Security Configuration
BCRYPT_SALT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
```

## Environment Validation

The application includes built-in validation for critical environment variables:

- **Gemini API Key**: The GeminiClient constructor will throw an error if `GEMINI_API_KEY` is not set
- **JWT Secret**: Authentication functions require `JWT_SECRET` to be set
- **Database URI**: The database connection will fail if `MONGODB_URI` is not properly configured

## Testing Environment

For running tests, ensure you have a separate test database:

```env
NODE_ENV=test
MONGODB_TEST_URI=mongodb://localhost:27017/food-recommendation-test
```

## Deployment Checklist

- [ ] All environment variables are set with production values
- [ ] JWT secret is strong and unique (64+ characters)
- [ ] Database connection string is secure
- [ ] Gemini API key is valid and has appropriate quotas
- [ ] CORS origins are properly configured
- [ ] Environment files are not committed to version control
- [ ] Production database is properly secured
- [ ] SSL/TLS is configured for production deployment

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**: Check MONGODB_URI format and network connectivity
2. **JWT Token Invalid**: Verify JWT_SECRET is consistent across restarts
3. **Gemini API Errors**: Validate API key and check quota limits
4. **CORS Errors**: Ensure CLIENT_URL matches the frontend domain
5. **Port Conflicts**: Change PORT if 5000 is already in use

### Environment Variable Debugging

Add this to your server startup to verify environment variables are loaded:

```javascript
console.log('Environment Check:');
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing');
```