# EcoWatch 🌿
### Intelligent Campus Waste Management System
**Veermata Jijabai Technological Institute (VJTI)**

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%7C%20Auth%20%7C%20Storage%20%7C%20Realtime-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-Multimodal%20Vision%20AI-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![MapLibre](https://img.shields.io/badge/MapLibre%20GL-3D%20Campus%20Twin-396B99?style=flat&logo=mapbox&logoColor=white)](https://maplibre.org/)
[![Language](https://img.shields.io/badge/Languages-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%82%E0%A4%A6%E0%A4%BE%20(Hindi)-orange?style=flat)]()

---

## 📖 Overview

**EcoWatch** is an AI-powered municipal & campus waste intelligence system engineered for **Veermata Jijabai Technological Institute (VJTI)**. It transitions campus environmental stewardship from reactive, uncoordinated collections to an automated, data-driven closed-loop workflow.

By pairing **Google Gemini Multimodal Vision**, **Supabase Realtime WebSockets**, **3D Spatial GIS (MapLibre GL)**, and **Human-Computer Interaction (HCI)** best practices, EcoWatch provides:
1. **Automated Verification**: Zero-shot AI visual inspection of bin fill levels and after-cleaning proof-of-work.
2. **Student Identity Gatekeeper**: OCR-based validation of official VJTI Student ID cards and `@vjti.ac.in` domain verification.
3. **Explainable Spatial Intelligence**: Maximum coverage optimization with 3D ghost pins, explainability cards, and direct-manipulation what-if simulation sliders.
4. **Inclusive Worker Ergonomics**: Hands-free bilingual push-to-talk voice assistant (English & हिंदी) and color-blind safe triple-redundancy markers.

---

## 🌟 Key Features

### 1. 🪪 Student Gatekeeper & VJTI ID Verification
- **Official VJTI Email Validation**: Client and server-side verification enforcing `@vjti.ac.in` or departmental subdomains (`@it.vjti.ac.in`).
- **3-Step Registration Pipeline**:
  1. *Account Information*: Name, official email, and credentials.
  2. *Live ID Card Scan*: WebRTC camera stream with visual framing guides (or photo upload).
  3. *AI Diagnostic Review ("Is this you?")*: Gemini Vision OCR extracts the 9-digit roll number (e.g. `241080023`), degree (`B. Tech`), department (`Information Technology`), DOB, and validity year (`2028`), checking against institutional markers (`ESTD 1887`, vertical red `VJTI` banner).
- **Role Isolation**: Only students register publicly; sanitation staff and facility administrators are provisioned via administrative invitation.

### 2. 🗺️ Spatial Intelligence & Bin Placement Simulator
- **Unbiasing Campus Demand Data**:
  - **"Report Bin Fill"**: Standard visual fill inspection of existing bins.
  - **"Overflow Outside"**: Flags capacity strain when garbage spills outside the container.
  - **"Request Bin Here"**: Enables students to drop a GPS pin in unserviced areas, signaling demand hotspots where no bin currently exists.
- **Explainable Ghost Pins on 3D Map**:
  - The campus is discretized into $20\text{m} \times 20\text{m}$ grid cells scored with recency decay:
    $$D_k = \sum (\text{fill} \times W_{\text{decay}}) + W_{\text{prior}} + N_{\text{requests}} \times 2.0$$
  - Proposed bin locations appear as pulsing ghost pins with plain-language explainability rationale:
    > *"Add 2 bins near Cafeteria: 16 overflow reports in last 10 days, peak 12:30–2:15 PM, nearest bin is 82m away."*
- **Direct-Manipulation What-If Simulator**:
  - Facility managers can adjust **Bin Budget** ($1 \leftrightarrow 5$ bins) and **Walk Radius** ($30\text{m} \leftrightarrow 70\text{m}$) sliders to view real-time coverage projections ($62\% - 98\%$).
  - One-click **"Approve & Deploy"** commits the proposed bin directly into production.

### 3. 🎙️ Bilingual Hands-Free Voice Assistant (English & हिंदी)
- **Situational Impairment Design**: Field sanitation workers wear heavy gloves, carry tools, and operate under bright outdoor sunlight.
- **Push-to-Talk Ergonomics**: A large full-screen button avoids false triggers in noisy environments.
- **Bimodal Speech Recognition & Synthesis**:
  - Recognizes commands in English and Hindi (`hi-IN` / `en-IN`):
    - *"अगला स्टॉप"* / *"Next stop"* $\rightarrow$ Announces nearest receptacle, location, and fill percentage.
    - *"काम शुरू करो"* / *"Start task"* $\rightarrow$ Commences active cleaning.
    - *"सफाई हो गई"* / *"Verify cleaning"* $\rightarrow$ Automatically triggers the verification camera.
    - *"कितने काम बाकी हैं"* / *"How many tasks"* $\rightarrow$ Reads aloud pending tasks in queue.
  - Generates spoken voice responses via browser `speechSynthesis`.

### 4. 👁️ Color-Blind Safe Triple-Redundancy Accessibility
- Replaced ambiguous shades of green with high-contrast, color-blind safe Viridis/Tol semantics with geometric shape redundancy:
  - 🟢 **Low / Normal Severity**: Smooth Circle (`●`) in Forest Green (`#15803d`).
  - 🟡 **Medium Urgency**: Warning Diamond / Triangle (`◆`) in Amber Orange (`#d97706`).
  - 🔴 **Critical Overflow**: Urgent Octagon with exclamation mark (`🛑 !`) in Crimson Red (`#dc2626`).
  - 🟣 **AI Proposed Site**: Pulsing Dashed Marker (`📍`) in Indigo (`#6366f1`).

### 5. 🤖 Double-Ended Closed-Loop AI Verification
- **Entry Gate**: Gemini Vision estimates fill percentage ($0\% - 100\%$) and classifies waste type (*Plastic*, *Food Waste*, *Mixed*). If $< 30\%$, the report is rejected to prevent spam.
- **Exit Gate**: Upon cleaning, workers must submit an after-cleaning photo. Gemini inspects the image; if residual waste exceeds $30\%$, the task completion is blocked with actionable feedback (*"Bin is 45% full. Must be less than 30% to be considered clean"*).

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  React 18  •  Vite  •  Tailwind CSS (Editorial Theme)  •  Lucide Icons │
│  MapLibre GL (3D Campus Twin)  •  Recharts (Velocity & Sector Trends)  │
│  Bilingual Engine (English & हिंदी)  •  LanguageToggle Component      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         APPLICATION LOGIC                              │
│  • AuthContext (Role-Based Access: user, worker, admin)                │
│  • LanguageContext (Persistence, Translations & Speech Synthesis)      │
│  • aiService.js (Gemini 3.5 Flash Lite OCR & Cleanliness Audit)        │
│  • predictionEngine.js (Temporal Pattern Grouping & Fill Forecasting)  │
│  • routeOptimizer.js (Haversine & Priority-Weighted TSP Heuristic)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                      BACKEND-AS-A-SERVICE (SUPABASE)                   │
│  • PostgreSQL DB with PostGIS extensions & UUIDs                       │
│  • Row-Level Security (RLS) policies                                  │
│  • Realtime WebSocket Channels (live task & report push)               │
│  • Object Storage (waste-images bucket for evidence images)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
EcoWatch/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI modules
│   │   ├── LanguageToggle.jsx   # EN | हिंदी switch pill
│   │   └── ProtectedRoute.jsx   # Role-based route guard
│   ├── contexts/           # Global reactive state
│   │   ├── AuthContext.jsx      # Supabase authentication & user profile
│   │   └── LanguageContext.jsx  # Bilingual translations & speech engine
│   ├── lib/                # Computational engines
│   │   ├── aiService.js         # Google Gemini Vision OCR & verification
│   │   ├── predictionEngine.js  # Linear regression & demand patterns
│   │   ├── routeOptimizer.js    # Haversine distance & TSP heuristics
│   │   └── supabase.js          # Supabase client initialization
│   ├── pages/              # Role dashboards & views
│   │   ├── AdminDashboard.jsx   # Command Center & 3D Spatial Simulator
│   │   ├── Landing.jsx          # Public platform homepage
│   │   ├── Login.jsx            # Account authentication
│   │   ├── Register.jsx         # 3-step VJTI ID card registration
│   │   ├── UserDashboard.jsx    # Citizen reporter interface
│   │   └── WorkerDashboard.jsx  # Field worker itinerary & voice assistant
│   ├── App.jsx             # Router definition & providers
│   ├── index.css           # Tailwind custom editorial theme styles
│   └── main.jsx            # React root mount
├── .env.example            # Environment template
├── package.json            # Node dependencies & build scripts
├── supabase_schema.sql     # PostgreSQL database schema & triggers
├── historical_data.sql     # Seed data for campus demonstration
└── vite.config.js          # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Active [Supabase](https://supabase.com/) project
- [Google AI Studio](https://aistudio.google.com/) API Key (Gemini)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/EcoWatch.git
cd EcoWatch
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key

# VJTI Campus Coordinates (Defaults to VJTI Matunga)
VITE_CAMPUS_CENTER_LAT=19.0222
VITE_CAMPUS_CENTER_LNG=72.8561
```

### 4. Database Setup
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Run the contents of [`supabase_schema.sql`](supabase_schema.sql) to provision tables, triggers, and Row-Level Security (RLS) policies.
3. (Optional) Run [`historical_data.sql`](historical_data.sql) to populate sample VJTI bins and 5-day historical report records.
4. Create a public storage bucket named `waste-images` under **Storage**.

### 5. Start Development Server
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000/`**.

### 6. Build for Production
```bash
npm run build
```

---

## 👥 Role Workflows

| Persona | Primary Role | Accessible Routes | Key Actions |
| :--- | :--- | :--- | :--- |
| **Student / Citizen Reporter** | Campus Community | `/user` | • Upload photo for AI fill inspection<br>• Report overflow outside container<br>• Drop GPS pin to request a new bin<br>• Track personal report log |
| **Field Sanitation Worker** | Housekeeping Staff | `/worker` | • View priority-ordered route sequence (Stops 1, 2...)<br>• Use hands-free push-to-talk voice assistant (en/hi)<br>• Accept, start, and finalize tasks<br>• Submit photo for strict AI cleaning verification |
| **Facility Administrator** | Sustainability Director | `/admin` | • Inspect 3D campus digital twin with severity pins<br>• Adjust What-If sliders (Budget & Walk Radius)<br>• Review explainable AI ghost pins & deploy new bins<br>• Formulate and batch-dispatch daily cleaning schedules |

---

## 🔬 Human-Computer Interaction (HCI) Principles

EcoWatch was designed from the ground up incorporating foundational HCI laws and usability heuristics:

1. **Nielsen's 10 Usability Heuristics**:
   - *Visibility of System Status*: Real-time spinners, animated fill level meters, live GPS coordinates, and status chips (`SYS_OK`, `Live Grid`).
   - *Match Between System & Real World*: Physical campus terminology (*"Field Operations"*, *"Stop 1"*, *"Cafeteria"*, *"Library"*) and real-world 3D spatial alignment.
   - *User Control & Freedom*: Clear emergency exits (Cancel / Retake buttons) at every stage of image capture and multi-parameter sorting dropdowns.
   - *Error Prevention*: Client-side file size constraints ($< 5\text{MB}$), automatic GPS fallback to campus center, and duplicate task guards.
   - *Recognition over Recall*: Automatic nearest bin identification via GPS distance calculations; side-by-side photographic review.
2. **Fitts's Law ($T = a + b \log_2(2D/W)$)**:
   - Maximized touch target widths for mobile field staff buttons (*"Hold to Speak"*, *"Capture Image"*, *"Commence Work"*).
3. **Hick-Hyman Law ($T = b \log_2(n + 1)$)**:
   - Role-partitioned dashboards reduce decision fatigue by showing only immediate relevant actions per user type.
4. **Norman's Design Principles**:
   - Clear affordances on buttons, natural mapping of 3D campus vectors, and closed-loop auditory/visual feedback.

---

## 📄 License

This project is developed for educational and academic research purposes at **Veermata Jijabai Technological Institute (VJTI)**.
Distributed under the MIT License.

