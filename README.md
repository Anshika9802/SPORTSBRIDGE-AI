1. Database Contents (Cloud SQL PostgreSQL: ai-studio-8972da0b)
Note: Firebase (firebase-applet-config.json) is configured for Google Sign-In Authentication only; Firestore is not provisioned or used for storage. All application records live in Cloud SQL PostgreSQL.
Table Row Counts (11 tables, 43 total rows)
sports — 5 rows (Cricket, Football, Badminton, Athletics, Swimming)
coaches — 8 rows
facilities — 8 rows
competitions — 8 rows
trials — 7 rows
scholarships — 7 rows
users — 0 rows
athlete_profiles — 0 rows
saved_items — 0 rows
applications — 0 rows
listing_reports — 0 rows
Seeded Opportunities (38 records across 6 Indian cities + Pan-India)
Coaches (8):
Coach Rajesh Kulkarni (Football, Bengaluru — ₹1,800)
Coach Farhan Shaikh (Football, Mumbai — ₹1,950)
Coach Arvind Deshmukh (Cricket, Mumbai — ₹2,400)
Coach Suresh Nair (Cricket, Bengaluru — ₹1,600)
Coach Meenakshi Rao (Badminton, Bengaluru — ₹2,200)
Coach Vikramaditya Reddy (Badminton, Hyderabad — ₹2,800)
Coach Harpreet Singh (Athletics, Delhi NCR — ₹1,200)
Coach Ananya Chatterjee (Swimming, Pune — ₹2,100)
Facilities (8):
Kanteerava Outer Football Turf (Football, Bengaluru — ₹900)
Sree Kanteerava 400m Synthetic Track (Athletics, Bengaluru — ₹600)
Padukone-Dravid Centre Public Courts (Badminton, Bengaluru — ₹2,500)
Basavanagudi Aquatic Centre (BAC) (Swimming, Bengaluru — ₹1,400)
Nehru Stadium Turf Nets (Cricket, Chennai — ₹1,500)
Cooperage Youth Football Arena (Football, Mumbai — ₹1,700)
Siri Fort Indoor Badminton Complex (Badminton, Delhi NCR — ₹1,100)
Gachibowli Athletic Bowl (Athletics, Hyderabad — ₹750)
Competitions (8):
KSFA Youth U-17 Inter-Club Cup (Football, Bengaluru — ₹500)
Mumbai Suburban U-16 Harris Shield Open (Cricket, Mumbai — ₹350)
All India Junior Ranking Badminton Open (Badminton, Hyderabad — ₹900)
Delhi NCR Youth Track & Field Meet (Athletics, Delhi NCR — ₹250)
Maharashtra State Age-Group Aquatics (Swimming, Pune — ₹600)
Bengaluru District Sub-Junior Shuttle Cup (Badminton, Bengaluru — ₹400)
Chennai Youth 7s Community League (Football, Chennai — ₹300)
Pune Inter-Academy T20 Development Cup (Cricket, Pune — ₹500)
Trials (7):
Bengaluru FC Youth Academy U-15 & U-17 Trials (Football, Bengaluru — ₹0)
KSCA U-16 & U-19 Zonal Selection Trials (Cricket, Bengaluru — ₹100)
SAI Khelo India Athletics Talent Identification (Athletics, Delhi NCR — ₹0)
Pullela Gopichand Academy Scholarship Trials (Badminton, Hyderabad — ₹200)
Glenmark Aquatic Foundation Talent Camp Trials (Swimming, Mumbai — ₹0)
Mumbai City FC Reliance Youth Trials (Football, Mumbai — ₹0)
TNCA District U-14 Open Talent Hunt (Cricket, Chennai — ₹0)
Scholarships (7):
Khelo India Athlete Support Grant (All sports, Pan-India — ₹120,000)
BridgePlay Grassroots Kit & Coaching Bursary (All sports, Pan-India — ₹36,000)
Reliance Foundation Young Champs Scholarship (Football, Mumbai — ₹180,000)
Tata Trusts Track & Field Merit Aid (Athletics, Bengaluru — ₹60,000)
GoSports Emerging Shuttler Fellowship (Badminton, Bengaluru — ₹95,000)
Dadar Grassroots Cricket Kit & Fee Waiver (Cricket, Mumbai — ₹24,000)
Aquatic Excellence Tuition & Pool Grant (Swimming, Pune — ₹48,000)
2. Project & Source Workspace Contents
Root (/): server.ts (Express + Vite server & API routes), index.html, package.json, vite.config.ts, tsconfig.json, firebase-applet-config.json, metadata.json, .env.example, favicon.ico, and public/.
Source (/src):
App.tsx, main.tsx, index.css, types.ts
assets/ — generated sports photography assets
components/ — reusable UI components (navigation header, Leaflet map, opportunity cards, report modal)
context/ — authentication state provider (AuthContext.tsx)
db/ — Drizzle PostgreSQL schema, DB connection, queries, and seed scripts
lib/ — deterministic matching logic, Gemini explanation/chat helper, Firebase client/admin setup, city/currency utilities
middleware/ — auth middleware
views/ — screens for Landing, Auth, Onboarding, Feed, Search, Detail, Scholarship Checker, AI Chat, Saved & Deadlines, Profile/Settings, and Provider Dashboard
