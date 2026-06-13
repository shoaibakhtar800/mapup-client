# 🗺️ MapUp GeoFence Client (Next.js Dashboard)

A beautiful, interactive real-time dashboard for managing fleet telemetry, designing geofences, and monitoring geofence crossings and entry/exit alerts.

---

## 🎨 Premium Features

- **Interactive Maps Engine**: Built with Leaflet Maps (`react-leaflet`). Visualizes active geofences, live vehicle coordinates with status markers, and real-time custom boundaries.
- **Polygon Drawing Canvas**: Directly click on the map to draw polygons with visual nodes, complete with controls to **Undo**, **Clear**, or **Cancel** mid-drawing.
- **Live Notification Feed**: Integrates with the WebSocket channel of the Go backend to display a scrolling sidebar of real-time alerts.
- **Fleet Telemetry Simulator**: Select a vehicle and click anywhere on the map to instantly simulate location updates, triggering PostGIS calculations on the backend.
- **Design & UX**: Styled with modern typography, harmonic color palettes, glassmorphism, responsive grids, and subtle micro-animations.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v20+) installed on your local machine.

### 1. Configure the Client Environment
Create a `.env` file in the `client/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```
- **`NEXT_PUBLIC_API_URL`**: Point this to your backend server URL.

### 2. Install Dependencies
Run this command to install all packages:
```bash
npm install
```

### 3. Run the Development Server
Launch the Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
To bundle and optimize the application for production:
```bash
npm run build
npm run start
```

---

## 🏗️ Folder Structure & Core Components

```
client/src/
├── app/
│   └── page.tsx              # Main Dashboard shell, manages coordinate selection states
├── components/
│   ├── GeofenceManager.tsx   # Geofence forms, category filters, and drawing controls
│   ├── VehicleManager.tsx    # Fleet listing, registration, and simulation selectors
│   ├── AlertConfigurator.tsx # Binds triggers (entry/exit) to zones and vehicles
│   ├── ViolationHistory.tsx  # Filterable database list of past crossing logs
│   ├── AlertNotificationFeed.tsx # WebSocket listener and scrolling alert sidebar
│   ├── MapDashboard.tsx      # Leaflet Map container handling render layers and events
│   └── ui/                   # Shared design system components (buttons, badges, inputs)
```

---

## 🐳 Docker Deployment

The client contains a custom multi-stage Dockerfile that builds the production asset and hosts it on an Nginx server.

### 1. Build Client Docker Image
```bash
docker build -t mapup-frontend:latest .
```

### 2. Run Client Container
```bash
docker run -d -p 3000:80 mapup-frontend:latest
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).
