# Sally Dashboard - Electron App

A modern dashboard application built with Next.js and Electron.

## Features

- 🚀 Next.js 14 with React 18
- ⚡ Electron for desktop app functionality
- 🎨 Tailwind CSS for styling
- 🧩 shadcn/ui components
- 📱 Responsive design
- 🔧 TypeScript support

## Development

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Running the App

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run electron-dev
   ```
   This will start both the Next.js dev server and Electron app.

3. **Run Next.js only (web version):**
   ```bash
   npm run dev
   ```

## Building for Production

### Build the Electron App

```bash
# Build and package the app
npm run electron-dist
```

This will create distributable packages in the `dist/` folder:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage` file

### Build for Web Only

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run electron-dev` - Start Electron app in development mode
- `npm run electron` - Run Electron app (requires Next.js to be running)
- `npm run build` - Build Next.js app for production
- `npm run electron-dist` - Build and package Electron app
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/                 # Next.js app directory
├── components/          # React components
├── electron/           # Electron main process
│   └── main.js         # Main Electron process
├── lib/                # Utility functions
├── public/             # Static assets
└── styles/             # Global styles
```

## Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Desktop:** Electron
- **Styling:** Tailwind CSS, shadcn/ui
- **Icons:** Lucide React
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod

## Development Notes

- The app uses static export for Electron compatibility
- Images are unoptimized for better Electron performance
- External links open in the default browser
- DevTools are available in development mode
