# ATMOSPHERE — Intelligent Weather & Travel Dashboard

> **Full-Stack AI Engineer Technical Assessment**
> Built by **Arjun A** for **🔗 [PM Accelerator on LinkedIn](https://www.linkedin.com/school/pmaccelerator/)**

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![Express.js](https://img.shields.io/badge/Express.js-5-green?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-8-green?logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

---

## 📑 Executive Summary

**ATMOSPHERE** is a production-ready, full-stack weather and travel intelligence dashboard. Moving beyond standard weather applications, it aggregates real-time meteorological data, interactive mapping, and curated travel video guides, synthesizing them with **Groq AI (Llama 3.1)** to deliver contextual, actionable travel insights. 

The application is built on a robust MERN-inspired architecture (MongoDB, Express, React/Vite, Node.js), demonstrating rigorous engineering standards including comprehensive CRUD capabilities, multi-format data exports (JSON, CSV, XML, PDF, Markdown), global error handling, and a highly polished, minimalistic UI design system that is fully mobile responsive.


---

## ✨ Features Developed for Technical Assessment

### 1. Advanced Full CRUD Functionality
- **CREATE (Date Ranges & Procedural Mocking)**: Users can select custom Start and End Dates natively in the search bar. Since the free OpenWeatherMap API does not support historical data (and limits future data to 5 days), a custom **Procedural Mocking Algorithm** was built into the backend. It intercepts date ranges in the deep past or far future and mathematically generates historically plausible weather variations based on the city's current baseline metrics!
- **READ (Direct Database Retrieval)**: The "Recent" sidebar displays your search history grouped cleanly by city. Clicking any item securely hits the `GET /api/weather/:id` REST endpoint to instantly reconstruct the exact dashboard from your MongoDB record, rather than pinging third-party APIs again.
- **UPDATE (Inline Renaming)**: Users can hover over the giant location title on their dashboard and click the "Edit" pencil icon. This allows them to custom-rename the location (e.g. changing "Tokyo, JP" to "My Upcoming Trip") and securely save it directly into the database via `PUT /api/weather/:id`.
- **DELETE (Database Sweeping)**: Every history item in the sidebar features a "Trash" icon. Clicking it hits the `DELETE /api/weather/:id` endpoint. To ensure the UI remains perfectly clean, the backend intelligently sweeps and removes all associated records for that specific city from the database permanently.

### 2. Deep Third-Party Integrations
- **Groq AI Engine**: Migrated from Google Gemini to the lightning-fast Groq API running `llama-3.1-8b-instant`. The backend intelligently constructs a prompt combining the resolved location and real-time weather metrics, prompting the LLM to generate hyper-specific, 2-3 sentence travel and clothing advice.
- **One-Click GPS Geolocation**: A `MapPin` icon in the search bar natively hooks into the browser's Geolocation API. With one click, it securely fetches the user's exact latitude and longitude, keeping the UI completely clean of raw coordinates while instantly pulling hyper-local weather data.
- **YouTube Data API v3**: Contextually searches for `"{Location} travel guide"` and embeds the top video results directly into the UI.
- **Google Maps API**: Embeds interactive, zoomable maps centered mathematically on the exact coordinates resolved during geocoding.

### 3. Comprehensive Data Exporting
Users can instantly export their entire database history across 5 different formats:
- **JSON & XML**: Perfect for developers wanting raw data payloads.
- **CSV**: Automatically flattened and formatted for Excel data analysts.
- **PDF**: Generates a gorgeous, formatted, multi-page visual document for executives.
- **Markdown**: Formats the database into a clean text document.

### 4. High-End UI & UX Architecture
- **Interactive 3D WebGL Earth (Normal Mode)**: The application features a breathtaking, highly-optimized interactive 3D Earth background powered by CesiumJS. It features cinematic auto-rotation and seamlessly executes dynamic camera flights across the globe based on searched locations.
- **Eco-Friendly Lite Mode**: For users on low-end devices or aiming to save battery, an intuitive top-right toggle seamlessly unmounts the resource-heavy WebGL engine. The background gracefully falls back to highly premium, full-viewport dynamic linear gradients that match the current weather condition (e.g., slate for clouds, deep blue for clear skies).
- **Smart Local Timezone Resolution**: When rendering temporal metrics like Sunrise and Sunset, the application dynamically computes and injects the exact UTC timezone offset of the searched destination. Regardless of where the user is physically located, the UI perfectly resolves and presents the accurate local time of the target city.
- **Complete Mobile Responsiveness**: Extensive CSS Flexbox and Grid media queries ensure the dashboard seamlessly collapses into stackable elements on mobile phones, including custom horizontal-scrolling 5-day forecast carousels.
- **Hardware-Accelerated Micro-Animations**: Utilizes CSS `transform: translate3d` and `opacity` transitions for hover states and layout shifts. By offloading these animations directly to the computer's GPU, the UI achieves a buttery-smooth 60FPS render cycle without blocking the React main thread.
- **Premium Glassmorphism Design**: Features beautiful translucent frosted-glass panels (`backdrop-filter: blur`) with dynamic, harmonious styling that automatically adjusts its blur intensity and contrast depending on whether the app is running over the 3D Earth or in Lite Mode.

---

## 🏛️ System Architecture

The application follows a decoupled client-server architecture, communicating via a RESTful API.

```mermaid
graph TD
    %% Frontend Layer
    subgraph Client [Frontend: React + Vite]
        UI[Minimalist UI / Dashboard]
        State[React State Management]
        Export[Export Trigger]
    end

    %% Backend Layer
    subgraph Server [Backend: Node.js + Express]
        API[RESTful API Router]
        Validator[Data Validation Layer]
        Controller[Weather Controller]
        Exporters[Multi-Format Exporters]
        ErrorHandler[Global Error Handler]
    end

    %% Database Layer
    subgraph Database [Database: MongoDB]
        Mongo[(MongoDB / Mongoose)]
    end

    %% Third-Party Integrations
    subgraph External [Third-Party Services]
        OWM[OpenWeatherMap API]
        YT[YouTube Data API]
        GMaps[Google Maps Embed API]
        Groq[Groq AI]
    end

    %% Data Flow
    UI <-->|JSON over HTTP| API
    API --> Validator
    Validator --> Controller
    Controller <--> External
    Controller <--> Mongo
    Export --> Exporters
    Exporters --> Controller
    Controller --> ErrorHandler
```

---

## 🏗️ Production Readiness & Engineering Standards

This project was built to demonstrate seniority in full-stack development, focusing on stability, security, and user experience.

### 1. Rigorous Data Validation
- **Server-Side Validation**: All incoming requests (location strings, date ranges, update objects) are strictly validated using a custom validator utility before hitting the database or external APIs.
- **Coordinate & ZIP Parsing**: The backend intelligently distinguishes between raw text, comma-separated coordinates, and postal codes, routing them to the correct geocoding endpoints.

### 2. Sophisticated Error Handling
- **Global Error Middleware**: The Express backend uses a unified error-handling middleware that intercepts API failures, validation errors, and database timeouts, returning structured JSON error payloads to the client.
- **Graceful Degradation**: If YouTube or Groq AI APIs fail, the core weather functionality continues to operate seamlessly, providing fallback data without crashing the client.

### 3. Code Quality
- **Separation of Concerns**: The backend strictly separates API Routes (`routes/`), Business Logic (`controllers/`), Data Models (`models/`), and Utilities (`utils/`).
- **Security Best Practices**: All sensitive API keys and MongoDB connection URIs are securely managed via `.env` files and completely isolated from the frontend payload.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas Cluster)

### 1. Clone & Install
```bash
git clone <repository-url>
cd pm_accelerator_weather_app

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Environment Setup
Create a `.env` file in the `backend/` directory based on the provided `.env.example`:
```env
MONGO_URI=mongodb://localhost:27017/atmosphere
PORT=5001
OPENWEATHER_API_KEY=your_key_here
YOUTUBE_API_KEY=your_key_here
GOOGLE_MAPS_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

### 3. Run the Application
Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The application will now be running seamlessly at `http://localhost:5173`.
