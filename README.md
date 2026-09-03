# Lifeline — Comprehensive Setup & Development Guide

**Lifeline** is a real-time emergency response, medical aid, and SOS system designed to connect users in critical situations directly with nearby hospitals, emergency responders, and emergency contacts.

---

## 📋 Table of Contents

* [Prerequisites](#-prerequisites)
* [System & Environment Setup](#-system--environment-setup)
* [Project Installation](#-project-installation)
* [Environment Variables Configuration](#-environment-variables-configuration)
* [Running the Application](#-running-the-application)
* [Building & Deployment (EAS)](#-building--deployment-eas)
* [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
* [Troubleshooting & Common Issues](#-troubleshooting--common-issues)

---

## 🛠 Prerequisites

Ensure your development environment meets the following specifications before installing Lifeline:

### Required Software
| Dependency | Minimum Version | Recommended Version | Download Link |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.x` | `v20.x` (LTS) | [nodejs.org](https://nodejs.org/) |
| **npm** / **yarn** | `v9.x` / `v1.22.x` | `v10.x` / `v3.x` | Included with Node / [yarnpkg.com](https://yarnpkg.com/) |
| **Git** | `v2.30+` | Latest | [git-scm.com](https://git-scm.com/) |
| **Expo CLI** | `v0.18+` | Latest | Bundled via `npx expo` |

### Device & Emulator Requirements
* **Physical Device (Quick Testing):** Download **Expo Go** from the [iOS App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).
* **Android Emulator:**
  * Install **Android Studio** (Electric Eel or newer).
  * Configure Android SDK (API Level 31+) and set up a Pixel AVD with Google Play Services.
  * Add `ANDROID_HOME` to your system environment variables.
* **iOS Simulator (macOS only):**
  * Install **Xcode** (v15+).
  * Run `xcode-select --install` in terminal to set up Command Line Tools.

---

## ⚙️ System & Environment Setup

### 1. Environment Variable Verification (Windows PowerShell / macOS Terminal)

**Windows (PowerShell):**
```powershell
node -v
npm -v
git --version
```

**macOS / Linux (Bash/Zsh):**
```bash
node -v
npm -v
git --version
```

---

## 📥 Project Installation

Follow these sequential steps to clone the repository, install native dependencies, and verify your local environment.

<Sequence>
  <Step subtitle="Fetch codebase from Git provider" title="Clone the Repository">

```bash
git clone https://github.com/your-org/lifeline.git
cd lifeline
```
  </Step>

  <Step subtitle="Use exact lockfile versions to avoid peer conflict" title="Install Project Dependencies">

```bash
# Using npm
npm install

# OR using Yarn
yarn install
```
  </Step>

  <Step subtitle="Ensure local Expo version alignment" title="Verify Expo CLI Tooling">

```bash
npx expo doctor
```
  </Step>
</Sequence>

---

## 🔑 Environment Variables Configuration

Lifeline requires configuration keys for backend services, map tiles, and emergency API endpoints.

1. Create a `.env` file in the project root directory:

```bash
cp .env.example .env
```

2. Populate `.env` with your service credentials:

```env
# Application Settings
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://api.lifeline-emergency.com/v1

# Location & Mapping Services
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1I...

# Firebase / Supabase Authentication & Realtime Alerts
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=lifeline-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=lifeline-app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Emergency SOS Gateway
EXPO_PUBLIC_TWILIO_SOS_WEBHOOK_URL=https://api.lifeline-emergency.com/v1/sos/trigger
```

---

## 🚀 Running the Application

Start the Expo local development server (Metro Bundler) with optional cache-clearing flags.

### 1. Start Metro Bundler

```bash
# Standard start
npx expo start

# Clear cache (Recommended if encountering bundling errors)
npx expo start -c
```

### 2. Run on Target Platform

| Platform | Command / Action |
| :--- | :--- |
| **Android Emulator** | Press `a` in Metro terminal or run `npx expo run:android` |
| **iOS Simulator** | Press `i` in Metro terminal or run `npx expo run:ios` |
| **Physical Device (Expo Go)** | Open Expo Go on device and scan the QR code displayed in the terminal |
| **Web Browser** | Press `w` in Metro terminal |

---

## 📦 Building & Deployment (EAS)

Lifeline uses **Expo Application Services (EAS)** for generating standalone APK, AAB, and IPA binary builds.

### 1. Install EAS CLI & Authenticate

```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS Build

```bash
eas build:configure
```

### 3. Trigger Production Builds

```bash
# Build Android APK / AAB
eas build --platform android --profile production

# Build iOS App Store Package (IPA)
eas build --platform ios --profile production
```

---

## 📂 Project Architecture & Directory Structure

```text
lifeline/
├── app/                  # Expo Router file-based route definitions
│   ├── (auth)/           # Authentication flows (Login, Register, OTP)
│   ├── (tabs)/           # Core navigation tabs (Home, Map, Medical ID, Settings)
│   ├── sos/              # Active SOS trigger screen & countdown modal
│   └── _layout.tsx       # Root layout, providers, and global splash screen
├── assets/               # Fonts, audio alerts, icons, and static images
├── components/           # Reusable UI components (Buttons, Modals, MapOverlay)
├── constants/            # Theme colors, thresholds, emergency numbers
├── hooks/                # Custom React hooks (useLocation, useSOSState)
├── services/             # API services (Location tracking, SMS Gateway, Sockets)
├── store/                # Global state management (Zustand / Redux Toolkit)
├── types/                # TypeScript interfaces and schema types
├── app.json              # Expo configuration manifest
└── package.json          # Dependency specs and npm scripts
```

---

## 🔍 Troubleshooting & Common Issues

* **Location Permissions Denied:**
  * Ensure location access is set to **"Always Allow"** in device OS settings for background emergency tracking to function correctly.
* **Metro Bundler Cache Stale Error:**
  * Run `npx expo start -c` and delete the `.expo` cache directory in your project root.
* **Android Emulator Not Detected:**
  * Launch Android Studio, open **Virtual Device Manager**, start an AVD, and retry `npx expo run:android`.

---

<FollowUp label="Want me to save this detailed setup guide as README.md in your project root?" query="Save this comprehensive setup guide to README.md in the root directory."/>
