# Security Checklist for AURAX-2026

Use this checklist to ensure your Firebase project is properly secured.

## Pre-Deployment

- [ ] **Firebase Console > Project Settings > API Keys**
  - [ ] Restricted to your domain only (HTTP referrer)
  - [ ] Only necessary APIs enabled (Auth, Firestore, Storage)
  - [ ] API keys have been regenerated if previously exposed

- [ ] **Firebase Console > Authentication > Sign-in method**
  - [ ] Email/Password enabled
  - [ ] "Email link (passwordless sign-in)" disabled (if not needed)
  - [ ] "Anonymous" disabled (if not needed)

- [ ] **Firebase Console > Firestore > Rules**
  - [ ] Rules match the `firestore.rules` file in this project
  - [ ] Tested rules with Firebase Emulator before deployment

- [ ] **Firebase Console > App Check**
  - [ ] Enabled for Firestore (recommended)
  - [ ] Configured reCAPTCHA v3 for web app

- [ ] **Firebase Console > Hosting**
  - [ ] Social authentication configured (if using social login)
  - [ ] Custom domain SSL certificate is valid (if using custom domain)

## Admin Access

- [ ] **Admin Email Verified**
  - [ ] Admin user's email is verified in Firebase Authentication
  - [ ] Custom claim `admin=true` set via script

- [ ] **Admin Password Strong**
  - [ ] Minimum 12 characters
  - [ ] Contains uppercase, lowercase, numbers, symbols
  - [ ] Not shared or reused from other sites

## Post-Deployment

- [ ] **Verify Domain Restrictions**
  - [ ] Test from unauthorized domain - should fail
  - [ ] Test from authorized domain - should work

- [ ] **Monitor Usage**
  - [ ] Set up billing alerts in Google Cloud Console
  - [ ] Review Firebase Analytics regularly
  - [ ] Check for unusual API call patterns

- [ ] **Test Security Rules**
  - [ ] Try to write to events collection as non-admin
  - [ ] Try to read registrations as anonymous user
  - [ ] Try to create registration for closed event

## Emergency Contacts

| Role | Contact |
|------|---------|
| Firebase Support | https://firebase.google.com/support |
| GCP Billing | https://console.cloud.google.com/billing |
| Report Abuse | https://firebase.google.com/support/abuse |

## Quick Security Test URLs

```
# Test as anonymous user (should fail for admin operations)
https://your-project.web.app/?page=admin

# Test event access (should work)
https://your-project.web.app/

# Test registration (should work for open events)
https://your-project.web.app/?page=events
```

---

**Last Updated**: January 2025
**For AURAX-2026 Project**

