# Security Best Practices

## Environment Variables & Secrets

### ✅ Do's

1. **Never commit sensitive data**
   - Keep `.env` in `.gitignore` (already configured)
   - Use `.env.example` for templates only
   - Never hardcode credentials in source code

2. **Use strong secrets**
   ```bash
   # Generate secure JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Environment-specific configurations**
   - Development: `.env` (local only)
   - Staging: Platform-specific env vars
   - Production: Platform-specific env vars or secrets manager

4. **Rotate credentials regularly**
   - Change JWT secrets periodically
   - Rotate API keys every 90 days
   - Update Twilio tokens if compromised

### ❌ Don'ts

1. **Never expose in client code**
   - Server-only imports: `$env/static/private`
   - Client-safe imports: `$env/static/public`

2. **Don't share .env files**
   - Never email or Slack .env files
   - Don't commit to git (even private repos)
   - Don't store in cloud storage

3. **Don't use weak secrets**
   - Avoid: "password", "secret", "123456"
   - Avoid: Short strings (<32 characters)

## Phone Number Security

### Current Implementation

The phone number is now stored in:
- **Development**: `.env` file (DEMO_ASHA_PHONE)
- **Not in**: Source code (removed from all files)

### Best Practices

1. **E.164 Format**: Always use international format
   ```
   +[country_code][number]
   Example: +91XXXXXXXXXX
   ```

2. **Validation**: Validate phone numbers before use
   ```typescript
   const isValidPhone = /^\+[1-9]\d{1,14}$/.test(phone);
   ```

3. **Privacy**: Never log full phone numbers in production
   ```typescript
   // ❌ Bad
   console.log('Calling:', phoneNumber);
   
   // ✅ Good
   console.log('Calling:', phoneNumber.slice(-4));
   ```

## Authentication Security

### JWT Tokens

1. **Expiration**: Set reasonable token lifetimes
   - Access tokens: 15-60 minutes
   - Refresh tokens: 7-30 days

2. **Storage**
   - Server: httpOnly cookies (preferred)
   - Client: Memory or sessionStorage (if cookies not possible)
   - Never: localStorage for sensitive tokens

3. **Validation**: Always verify on server
   ```typescript
   const user = await validateJWT(token);
   if (!user) throw new Error('Unauthorized');
   ```

### Password Security

1. **Hashing**: Use bcrypt with salt rounds ≥ 10
   ```typescript
   import bcrypt from 'bcryptjs';
   const hash = await bcrypt.hash(password, 12);
   ```

2. **Requirements**
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers
   - Special characters recommended

## Database Security

### Connection Strings

1. **Never expose publicly**
   ```typescript
   // ❌ Bad
   const db = 'postgresql://user:pass@host/db';
   
   // ✅ Good
   import { DATABASE_URL } from '$env/static/private';
   ```

2. **Use connection pooling**
   - Limits concurrent connections
   - Prevents resource exhaustion

### Data Protection

1. **Encryption at rest**: Enable for production databases
2. **Encryption in transit**: Use SSL/TLS connections
3. **Backups**: Regular automated backups with encryption

## API Security

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Example: 100 requests per 15 minutes
const rateLimit = {
  windowMs: 15 * 60 * 1000,
  max: 100
};
```

### Input Validation

Always validate and sanitize user input:

```typescript
import { z } from 'zod';

const schema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  message: z.string().max(1000)
});
```

### CORS Configuration

Restrict origins in production:

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
};
```

## Twilio Security

### Account Protection

1. **Auth Token**: Keep secret, never expose
2. **Webhook URLs**: Use HTTPS only
3. **Request Validation**: Verify Twilio signatures
   ```typescript
   import twilio from 'twilio';
   const isValid = twilio.validateRequest(
     authToken,
     signature,
     url,
     params
   );
   ```

### Usage Limits

1. **Set budget alerts**: Configure in Twilio console
2. **Monitor usage**: Regular usage audits
3. **Geographic restrictions**: Limit to required countries

## File Upload Security

### Validation

1. **File type**: Whitelist allowed extensions
   ```typescript
   const allowed = ['jpg', 'jpeg', 'png', 'pdf'];
   ```

2. **File size**: Set maximum limits
   ```typescript
   const MAX_SIZE = 10 * 1024 * 1024; // 10MB
   ```

3. **Virus scanning**: Use antivirus API for uploads

### Storage

1. **Separate storage**: Don't store in application directory
2. **Access control**: Use signed URLs for private files
3. **Content-Type**: Validate and set correct headers

## OpenAI API Security

### API Key Protection

1. **Server-side only**: Never expose in client
2. **Environment variables**: Store in `$env/static/private`
3. **Rotation**: Change if compromised

### Usage Controls

1. **Rate limiting**: Implement request limits
2. **Token limits**: Set max_tokens parameter
3. **Content filtering**: Enable moderation API

### Cost Controls

1. **Budget alerts**: Set in OpenAI dashboard
2. **User limits**: Limit requests per user/session
3. **Caching**: Cache common responses

## Production Deployment Checklist

- [ ] All secrets in environment variables (not code)
- [ ] `.env` not committed to git
- [ ] Strong JWT_SECRET generated
- [ ] Database uses SSL/TLS
- [ ] HTTPS enabled for all endpoints
- [ ] CORS configured with specific origins
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose sensitive info
- [ ] Logging excludes sensitive data
- [ ] Regular dependency updates (npm audit)
- [ ] Security headers configured
- [ ] Twilio webhook validation enabled
- [ ] File upload restrictions in place
- [ ] Regular security audits scheduled

## Monitoring & Logging

### What to Log

✅ Log:
- Authentication attempts (success/failure)
- API endpoint usage
- Error messages (sanitized)
- Performance metrics

❌ Don't Log:
- Passwords or tokens
- Full phone numbers
- API keys
- Personal identification data (PII)

### Example Safe Logging

```typescript
// ❌ Unsafe
console.log('User login:', { email, password });

// ✅ Safe
console.log('User login attempt:', {
  email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
  timestamp: new Date().toISOString()
});
```

## Incident Response

### If Credentials are Compromised

1. **Immediately**:
   - Rotate all affected credentials
   - Review access logs
   - Block suspicious IPs

2. **Within 24 hours**:
   - Audit all recent activity
   - Notify affected users if needed
   - Document the incident

3. **Follow-up**:
   - Review security practices
   - Update procedures
   - Implement additional safeguards

## Regular Security Tasks

- **Daily**: Monitor error logs
- **Weekly**: Review access logs
- **Monthly**: Update dependencies (`npm audit fix`)
- **Quarterly**: Rotate secrets and API keys
- **Annually**: Full security audit

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SvelteKit Security](https://kit.svelte.dev/docs/security)
- [Twilio Security Best Practices](https://www.twilio.com/docs/usage/security)
- [OpenAI API Safety](https://platform.openai.com/docs/guides/safety-best-practices)
