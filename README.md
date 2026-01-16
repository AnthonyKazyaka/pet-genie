## Pet Genie - Pet Sitting Business Manager

A comprehensive Angular application for managing pet sitting appointments, workload analytics, and business operations. Built with Angular 17, Firebase, and Google Calendar integration.

## Overview

Pet Genie helps pet sitting professionals manage their business by:
- Syncing appointments from Google Calendar
- Analyzing workload and capacity
- Managing clients and pets
- Exporting visit records for invoicing
- Tracking business analytics

## Features

- **Google Calendar Integration**: Connect your Google Calendar to import pet sitting appointments
- **Firebase/Firestore Backend**: Secure, scalable data storage for clients, pets, and visit records
- **Workload Analytics**: Visual dashboard showing daily/weekly workload with customizable thresholds
- **Client Management**: Track client information, pets, and visit history
- **Export Tools**: Generate invoices and reports from visit records
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Customizable appearance

## Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AnthonyKazyaka/pet-genie.git
cd pet-genie
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:4200`

### Google Calendar Setup

**Simple Setup (Recommended):**
1. In Pet Genie, go to Settings → Calendar
2. Click "Connect Google Calendar" (default Client ID is pre-configured)
3. Authorize the app to access your calendar
4. Select which calendars to sync

**Advanced Setup (Use Your Own OAuth App):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized JavaScript origins:
   - `http://localhost:4200` (for development)
   - `https://anthonykazyaka.github.io` (for production)
4. Copy your Client ID and paste it in Pet Genie Settings → Calendar
5. Connect and authorize

### Firebase Configuration

Firebase is pre-configured in this application. The configuration is in:
- `src/environments/environment.ts` (production)
- `src/environments/environment.development.ts` (development)

Firebase services used:
- **Firestore**: Document database for clients, pets, and visit records
- **Analytics**: Usage tracking (production only)

## Deployment

### GitHub Pages

The application is automatically deployed to GitHub Pages via GitHub Actions when you push to the `main` branch.

View the live app at: `https://anthonykazyaka.github.io/pet-genie/`

### Build for Production

```bash
npm run build
```

Build artifacts will be in `dist/amplify-angular-template/browser/`

## Project Structure

```
src/
├── app/
│   ├── core/          # Services, guards, utilities
│   ├── features/      # Feature modules (calendar, clients, analytics, etc.)
│   ├── layout/        # App shell and layout components
│   ├── models/        # TypeScript interfaces and models
│   └── shared/        # Shared components and dialogs
├── assets/            # Static assets
├── environments/      # Environment configurations
└── styles/            # Global styles and themes
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run watch` - Build in watch mode

## Technologies

- **Angular 17** - Frontend framework
- **Angular Material** - UI component library
- **Firebase/Firestore** - Backend database
- **Google Calendar API** - Calendar integration
- **RxJS** - Reactive programming
- **date-fns** - Date manipulation
- **Chart.js** - Analytics charts

## Configuration

### Workload Thresholds

Customize your workload comfort levels in Settings → Workload:
- **Comfortable**: Light workload (default: up to 4 hours/day, 20 hours/week)
- **Busy**: Moderate workload (default: 4-6 hours/day, 20-30 hours/week)
- **High**: Heavy workload (default: 6-8 hours/day, 30-40 hours/week)
- **Burnout**: Excessive workload (default: above 8 hours/day, 40 hours/week)

### Display Preferences

- Time format (12h/24h)
- Week start day
- Travel time calculations
- Theme (light/dark)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.