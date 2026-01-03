# AarogyaSense Documentation

Welcome to the AarogyaSense documentation! This directory contains comprehensive guides for developers working on the project.

## 📚 Documentation Index

### Getting Started
1. **[Quick Reference](./QUICK_REFERENCE.md)** ⚡
   - Commands, API endpoints, and common tasks
   - Best for: Quick lookups and daily development
   - Read time: 5 minutes

2. **[Environment Setup](./ENVIRONMENT_SETUP.md)** 🔧
   - Detailed guide for configuring environment variables
   - Setting up Twilio, OpenAI, and database
   - Best for: Initial setup and troubleshooting configuration
   - Read time: 10 minutes

### Architecture & Organization
3. **[Project Structure](./PROJECT_STRUCTURE.md)** 📁
   - Complete directory structure explanation
   - Code organization guidelines
   - Best for: Understanding the codebase layout
   - Read time: 10 minutes

### Security & Best Practices
4. **[Security Best Practices](./SECURITY.md)** 🔒
   - Environment variable security
   - Authentication and authorization
   - API security, phone number privacy
   - Production deployment checklist
   - Best for: Security audits and production deployment
   - Read time: 15 minutes

### Change History
5. **[Changelog](./CHANGELOG.md)** 📝
   - Recent security updates and improvements
   - Migration guide for team members
   - Best for: Understanding recent changes
   - Read time: 5 minutes

---

## 🚀 Quick Start for New Developers

If you're new to the project, follow this reading order:

1. **Quick Reference** - Get familiar with basic commands
2. **Environment Setup** - Set up your development environment
3. **Project Structure** - Understand how the code is organized
4. **Security** - Learn security best practices

---

## 📖 Documentation by Topic

### Environment & Configuration
- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- [Quick Reference - Environment Variables](./QUICK_REFERENCE.md#-environment-variables-quick-setup)

### Development
- [Quick Reference - Common Commands](./QUICK_REFERENCE.md#-common-commands)
- [Project Structure](./PROJECT_STRUCTURE.md)
- [Quick Reference - API Endpoints](./QUICK_REFERENCE.md#-api-endpoints-quick-reference)

### Security
- [Security Best Practices](./SECURITY.md)
- [Environment Setup - Security](./ENVIRONMENT_SETUP.md#3-security-best-practices)
- [Quick Reference - Security Checklist](./QUICK_REFERENCE.md#-security-checklist)

### Deployment
- [Security - Production Checklist](./SECURITY.md#production-deployment-checklist)
- [Environment Setup - Production Variables](./ENVIRONMENT_SETUP.md#production-only-variables-optional)

---

## 🎯 Common Tasks

### Setting Up Environment Variables
→ [Environment Setup Guide](./ENVIRONMENT_SETUP.md#2-configure-environment-variables)

### Understanding API Endpoints
→ [Quick Reference - API Endpoints](./QUICK_REFERENCE.md#-api-endpoints-quick-reference)

### Securing Sensitive Data
→ [Security - Environment Variables & Secrets](./SECURITY.md#environment-variables--secrets)

### Navigating the Codebase
→ [Project Structure](./PROJECT_STRUCTURE.md#key-directories-explained)

### Deploying to Production
→ [Security - Production Deployment Checklist](./SECURITY.md#production-deployment-checklist)

---

## 🔍 Search by Keyword

| Topic | Documents |
|-------|-----------|
| **Phone Numbers** | [Security](./SECURITY.md#phone-number-security), [Quick Reference](./QUICK_REFERENCE.md#-phone-number-format) |
| **Twilio** | [Environment Setup](./ENVIRONMENT_SETUP.md#twilio-configuration-sms--voice-alerts), [Security](./SECURITY.md#twilio-security) |
| **Database** | [Environment Setup](./ENVIRONMENT_SETUP.md#database-configuration), [Quick Reference](./QUICK_REFERENCE.md#-common-commands) |
| **JWT/Auth** | [Environment Setup](./ENVIRONMENT_SETUP.md#jwt-secret), [Security](./SECURITY.md#authentication-security) |
| **OpenAI** | [Environment Setup](./ENVIRONMENT_SETUP.md#openai-configuration-optional---for-ai-features), [Security](./SECURITY.md#openai-api-security) |
| **API Routes** | [Project Structure](./PROJECT_STRUCTURE.md#api-endpoint-structure), [Quick Reference](./QUICK_REFERENCE.md#-api-endpoints-quick-reference) |
| **File Structure** | [Project Structure](./PROJECT_STRUCTURE.md) |
| **Environment Variables** | [Environment Setup](./ENVIRONMENT_SETUP.md), [Security](./SECURITY.md#environment-variables--secrets) |

---

## 📱 User Role Documentation

### For CHW (Community Health Worker) Interface
- Routes: `/chw`, `/chw/ai`
- [Project Structure - User Roles](./PROJECT_STRUCTURE.md#user-roles--interfaces)

### For ASHA Worker Interface  
- Route: `/asha`
- [Project Structure - User Roles](./PROJECT_STRUCTURE.md#user-roles--interfaces)

### For Clinician Interface
- Route: `/clinician`
- [Project Structure - User Roles](./PROJECT_STRUCTURE.md#user-roles--interfaces)

---

## 🛠️ Tech Stack Reference

| Technology | Documentation |
|------------|---------------|
| **SvelteKit** | [Official Docs](https://kit.svelte.dev/docs) |
| **Prisma** | [Official Docs](https://www.prisma.io/docs) |
| **Tailwind CSS** | [Official Docs](https://tailwindcss.com/docs) |
| **TypeScript** | [Official Docs](https://www.typescriptlang.org/docs) |
| **Twilio** | [Official Docs](https://www.twilio.com/docs) |
| **OpenAI** | [Official Docs](https://platform.openai.com/docs) |

---

## 🆘 Troubleshooting

Common issues and where to find solutions:

| Issue | Solution Location |
|-------|------------------|
| Environment variables not loading | [Environment Setup - Troubleshooting](./ENVIRONMENT_SETUP.md#troubleshooting) |
| Twilio calls not working | [Environment Setup - Twilio Troubleshooting](./ENVIRONMENT_SETUP.md#twilio-not-working), [Quick Reference](./QUICK_REFERENCE.md#-troubleshooting) |
| Database connection errors | [Environment Setup - Database Issues](./ENVIRONMENT_SETUP.md#database-connection-issues) |
| Port already in use | [Quick Reference - Troubleshooting](./QUICK_REFERENCE.md#port-already-in-use) |
| Security concerns | [Security Best Practices](./SECURITY.md) |

---

## 📞 Support

For additional help:
1. Check the relevant documentation above
2. Review the [Changelog](./CHANGELOG.md) for recent changes
3. Search the codebase for examples
4. Contact the development team

---

## 🔄 Keeping Documentation Updated

When making significant changes:
1. Update relevant documentation files
2. Add entry to [Changelog](./CHANGELOG.md)
3. Update this index if adding new docs
4. Verify all links still work

---

## 📋 Documentation Checklist

For new features, ensure you document:
- [ ] Environment variables (if any) in [Environment Setup](./ENVIRONMENT_SETUP.md)
- [ ] API endpoints in [Quick Reference](./QUICK_REFERENCE.md)
- [ ] Security considerations in [Security](./SECURITY.md)
- [ ] File structure changes in [Project Structure](./PROJECT_STRUCTURE.md)
- [ ] Changes in [Changelog](./CHANGELOG.md)

---

**Last Updated**: January 3, 2026  
**Documentation Version**: 1.0.0
