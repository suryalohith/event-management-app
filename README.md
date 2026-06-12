

# AURAX-2026 App

# AURAX-2026 Event Registration Platform

AURAX-2026 is a full-featured event registration and administration platform built for the Andhra University CSE department fest. Developed with React, Firebase, and Cloud Firestore, the application is designed to streamline participant registration, event management, and admin-side control for a large multi-category college event.

The platform supports 36 events across technical, non-technical, sports, and esports categories. It handles both individual and team-based registrations, with support for team sizes ranging up to 15 participants depending on the event. The system is backed by Cloud Firestore for storing event and registration data, while Firebase Hosting is used for deployment and Firebase Authentication secures admin access.

In addition to participant registration workflows, the project includes administrative utilities for managing event data, granting and validating admin access, syncing seeded events, auditing registration-related data, and running load tests for registration workflows. For development convenience, the app also supports a LocalStorage fallback when Firebase environment variables are not configured.

## Features

- Registration support for 36 fest events across multiple categories
- Individual and team registration workflows
- Team size support of up to 15 participants for selected events
- Secure admin login using Firebase Authentication and custom claims
- Firestore-backed storage for `events` and `registrations`
- Firebase Hosting deployment support
- Event seeding and synchronization scripts for setup and maintenance
- Admin utility scripts for access control and session handling
- Load-testing utilities for validating registration performance
- LocalStorage fallback for local development without Firebase configuration

This app is now wired for:
- Firebase Hosting deployment
- Cloud Firestore for `events` and `registrations`
- LocalStorage fallback when Firebase env vars are missing

## Prerequisites

- Node.js
- Firebase CLI (`firebase --version`)

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment variables

Copy values into `.env.local` from Firebase project settings:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

An example template exists in `.env.example`.

## 3) Link this folder to your Firebase project

Your CLI session currently needs re-auth. Run:

```bash
firebase login --reauth
```

Then link the project:

```bash
firebase use --add
```

Or set `.firebaserc` manually by replacing `your-firebase-project-id`.

## 4) Run locally

```bash
npm run dev
```

If Firebase vars are missing, the app will continue with localStorage only.

## Admin authentication

Admin panel now uses Firebase Authentication + custom claim authorization.

1. In Firebase Console, open `Authentication` > `Sign-in method` and enable `Email/Password`.
2. Create at least one admin user in `Authentication` > `Users`.
3. Verify that admin user's email address is marked as verified in Firebase Authentication.
4. Set custom claim `admin=true` using the included script:

```bash
npm run admin:grant -- admin@example.com /absolute/path/serviceAccountKey.json
```

Verify access status:

```bash
npm run admin:check -- admin@example.com /absolute/path/serviceAccountKey.json
```

If `firebase-admin` is missing, install once:

```bash
npm install -D firebase-admin
```

5. If email is not verified yet, open `/?page=admin-login` and use `Verify Email` with the same credentials.
6. After claim + email verification, sign out/sign in again (or wait for token refresh).
7. Login from:

```text
/?page=admin-login
```

## 5) Deploy

Hosting only:

```bash
npm run deploy
```

Hosting + Firestore rules/indexes:

```bash
npm run deploy:all
```

## Important security note

Current `firestore.rules` enforce admin-only writes for events and admin-only access to registration admin data. Public registration create is still enabled (for open events) by design.

## Securing Firebase API Keys

Since Firebase API keys are client-side by design, follow these best practices to minimize risk:

### 1. Restrict API Keys in Firebase Console

1. Go to **Firebase Console** > **Project Settings** > **API Keys**
2. For each API key, click "Edit" and set restrictions:

| Setting | Recommended Value |
|---------|------------------|
| **Application restrictions** | HTTP referrers (web sites) |
| **Website restrictions** | Add your deployed domain (e.g., `aurax2026-au.web.app`) |
| **API restrictions** | Enable only: Firebase Auth, Cloud Firestore, Cloud Storage |

### 2. Enable App Check

App Check helps protect your Firebase services from abuse:

1. Go to **Firebase Console** > **App Check** > **Apps**
2. Register your app with reCAPTCHA v3
3. In your app, set `VITE_APP_CHECK_MODE=recaptcha` in `.env.local`
4. Add the reCAPTCHA site key: `VITE_RECAPTCHA_SITE_KEY=your_site_key`

### 3. Monitor Usage

- Set up billing alerts in Google Cloud Console
- Review Firebase Analytics for suspicious patterns
- Check Firebase Console for unusual API usage

### 4. Rotate Keys If Compromised

If you suspect key exposure:
1. Go to **Project Settings** > **API Keys**
2. Create a new API key
3. Update `.env.local` with new key
4. Redeploy your app
5. Delete the compromised key

---

For more details, see [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys).
