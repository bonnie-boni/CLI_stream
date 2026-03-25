# CLI Music Web - Recent Updates

## Overview
The web application has been successfully decoupled from the Python backend stream-cli, updated with a new navbar displaying the app name, and includes a new "Explore More" page featuring CLI tools and social media links.

---

## Changes Made

### 1. **Package Updates**
- **File**: [web/package.json](package.json)
- No external npm dependencies added (yt-dlp npm packages are browser-incompatible)
- Web remains focused on frontend, with optional backend service for yt-dlp operations

### 2. **Navbar Component** ✨
- **File**: [web/components/app-navbar.tsx](components/app-navbar.tsx)
- Displays "cli-music web" with music note icon
- Navigation links to Music (tabs) and Explore More pages
- Responsive design for mobile/tablet/desktop

### 3. **Explore More Page** 🚀
- **File**: [web/app/explore-more.tsx](app/explore-more.tsx)
- Features:
  - **Featured Applications Section**:
    - CLI Music: Terminal-based player with YouTube search and offline downloads
    - Stream CLI: Advanced streaming and audio processing toolkit
  - **Installation Instructions**:
    - NPM commands with copy-to-clipboard functionality
    - WinGet commands for Windows users
    - Warning boxes for each app (requirements, gotchas)
  - **Social Media Links**:
    - GitHub
    - X (Twitter)
    - LinkedIn
    - Instagram
  - Fully responsive layout
  - Beautiful UI with icons and descriptions

### 4. **Updated Root Layout**
- **File**: [web/app/_layout.tsx](app/_layout.tsx)
- Added support for the new `explore-more` route
- Maintains existing modal and tabs navigation

### 5. **Updated Tab Layout**
- **File**: [web/app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)
- Integrated `AppNavbar` component above all tabs
- Responsive styling with proper spacing

### 6. **Enhanced Music API Service**
- **File**: [web/services/music-api.ts](services/music-api.ts)
- Added mock data for offline/demo mode
- Better error handling with fallback data
- Graceful failures when backend API is unavailable
- Documentation for API endpoints

### 7. **YT-DLP Service Wrapper**
- **File**: [web/services/yt-dlp-service.ts](services/yt-dlp-service.ts)
- Created as placeholder for future Node.js backend integration
- Documents limitations of browser environment
- Ready for server-side yt-dlp operations (downloads, format conversion)

---

## Architecture

### Web App (Frontend Only)
```
web/
├── app/
│   ├── (tabs)/          # Main music interface
│   ├── explore-more.tsx # Featured apps & social
│   └── _layout.tsx
├── services/
│   ├── music-api.ts     # API client + offline fallback
│   └── yt-dlp-service.ts # Future backend integration
└── components/
    └── app-navbar.tsx   # Navigation component
```

### Backend (Optional, Python)
```
stream-cli/
├── cli_music/
│   ├── api.py          # FastAPI endpoints
│   ├── downloads.py    # yt-dlp integration
│   └── ... (other modules)
```

---

## Features

### Search & Discovery
- Search for music with live results
- Format: MP3/MP4 selection
- Quality: 64-320kbps options
- Offline demo data fallback

### Download Management
- Task overview modal with progress tracking
- Task history page for completed downloads
- Format and quality tracking

### Featured Apps Page
- Two showcase applications (CLI Music, Stream CLI)
- Installation commands (NPM & WinGet)
- Warning boxes with important notes
- Copy-to-clipboard functionality for commands
- Social media follow links

---

## How to Use

### 1. Start the App
```bash
cd web
pnpm install
pnpm start
```

### 2. (Optional) Enable Backend Services
If you want working downloads, start the Python backend:
```bash
cd stream-cli
pip install -r requirements.txt
python -m cli_music.api
```

### 3. Navigate the App
- **Music Tab**: Search for songs
- **Download Tab**: Choose format/quality and download
- **Tasks Tab**: View download history
- **Explore More**: Discover other CLI tools and follow social media

---

## Social Media Integration

The Explore More page links to:
- **GitHub**: For source code and contributions
- **X (Twitter)**: For announcements and updates
- **LinkedIn**: For professional connections
- **Instagram**: For visual content and updates

*Note: Update the URLs in [web/app/explore-more.tsx](app/explore-more.tsx) with your actual social media handles.*

---

## Backend API Endpoints (Reference)

If running the Python backend on `http://localhost:8765`:

```
GET  /songs/search?q=query&limit=20
GET  /songs/preloaded
GET  /songs/stream?url=youtube_url
POST /songs/download
     { "webpage_url", "title", "format": "mp3|mp4", "quality": 64-320 }
```

---

## Next Steps

1. **Update Social Links**: Add your actual social media URLs in `explore-more.tsx`
2. **Add More Apps**: Extend the `FEATURED_APPS` array with additional tools
3. **Real Backend**: Connect to running Python backend for actual yt-dlp downloads
4. **Persistence**: Add local storage for task history across sessions
5. **Authentication**: Optional user accounts for saved playlists

---

## Tech Stack

- **Frontend**: React Native + Expo Router
- **Backend**: FastAPI + yt-dlp (Python, optional)
- **Styling**: React Native StyleSheet
- **Icons**: Expo Vector Icons (MaterialIcons)
- **Navigation**: Expo Router with tab-based layout

---

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS/macOS)
- Mobile browsers: Optimized responsive UI

---

Generated: March 25, 2026
