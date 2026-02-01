# Environment Setup Guide

## Required Environment Variables

This application requires several environment variables to function properly. Follow the steps below to configure your environment.

### 1. Create Your .env File

Copy the `.env.example` file to create your local `.env` file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

#### Database Configuration
```env
DATABASE_URL="file:./prisma/dev.db"
```
- For development, SQLite is used (default configuration)
- For production, use PostgreSQL or MySQL connection string

#### JWT Secret
```env
JWT_SECRET="your-secret-key-here"
```
Generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Twilio Configuration (SMS & Voice Alerts)

1. Sign up at [Twilio Console](https://www.twilio.com/console)
2. Get your credentials from the dashboard:

```env
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"
```

#### Demo ASHA Worker Phone (for Testing)
```env
DEMO_ASHA_PHONE="+91XXXXXXXXXX"
```
- Used for testing alert notifications
- Must be in E.164 format (e.g., +[country_code][number])
- Change this to your test phone number

#### OpenAI Configuration (Optional - for AI features)
```env
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### 3. Security Best Practices

⚠️ **IMPORTANT**: Never commit your `.env` file to version control!

- The `.env` file is already in `.gitignore`
- Keep your credentials secret
- Use different values for development and production
- Rotate credentials regularly
- Use environment-specific configurations for different deployments

### 4. Verify Configuration

After setting up your `.env` file, verify the configuration:

```bash
npm run dev
```

Check the console logs to ensure all services are initialized properly.

## Environment Variables Reference

### Required Variables
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Secret key for JWT token generation

### Optional Variables
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number for sending SMS/calls
- `DEMO_ASHA_PHONE` - Test phone number for demo alerts
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `OPENAI_MODEL` - OpenAI model to use (default: gpt-4o-mini)

### Production-Only Variables (Optional)
- `REDIS_URL` - Redis connection for caching
- `AWS_ACCESS_KEY_ID` - AWS credentials for S3 uploads
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_REGION` - AWS region
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `SENTRY_DSN` - Sentry error tracking DSN
- `GOOGLE_ANALYTICS_ID` - Google Analytics tracking ID

## Troubleshooting

### Twilio Not Working
- Verify your Twilio credentials are correct
- Check that your phone number is in E.164 format
- Ensure your Twilio account has sufficient balance
- Check Twilio console logs for detailed error messages

### Database Connection Issues
- Verify the DATABASE_URL format
- For SQLite: ensure write permissions in the prisma directory
- For PostgreSQL/MySQL: verify network connectivity and credentials

### AI Features Not Working
- Verify your OpenAI API key is valid
- Check your OpenAI account has available credits
- Ensure the model name is correct
