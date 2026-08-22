# Vegan Tools — Project Roadmap & Vision

This document outlines the development status, completed milestones on the active feature branch, and strategic future vision for **Vegan Tools**.

---

## 🗺️ 1. Interactive Map & Discovery (`/map`)

Status: **Phase 1 to 4 Complete & Optimized** (Branch: `feature/interactive-map`).

### 🌟 Completed Features:
- **High-Precision Map Rendering (Leaflet + OpenStreetMap + CARTO Voyager)**:
  - Pixel-perfect pin anchoring (`iconAnchor: [width/2, height]`) with zero drift on zooming.
  - Contextual restaurant labels visible at `zoom >= 14` and smoothly hidden when zoomed out.
  - Curated initial pins per geographic region for instant zero-latency discovery.
- **Smart Universal Search & Soft Proximity (Geoapify Places API + Komoot Photon + Nominatim)**:
  - Commercial name and street search ("Desoriente", "Teresa Carles", "Purezza") with proximity ranking.
  - Automatic **420ms debounce** to prevent wasteful queries.
- **Restaurant Details & Action Row (`RestaurantDetailPane`)**:
  - Exact walking distance calculated (`350 m`, `1.4 km`) from current location.
  - Clean action row: `<Utensils /> Menu`, `<Globe /> Website`, `<Navigation /> Directions`.
  - Adaptive routing: `geo:lat,lng` protocol on mobile devices and Google Maps Directions on desktop.
- **Instant Menu Caching (`RestaurantMenuCache`)**:
  - Instant response (< 5ms) when reopening previously analyzed restaurant menus.
- **URL Deep-Linking**: State synchronization via URL query parameters (`/map?place=id`) and full browser history back-button support.
- **Marker Clustering**: Dynamic clustering for dense urban areas with smooth spiderfy animations.
- **Responsive Mobile Bottom Sheet**: 3-position touch drawer (`collapsed`, `half`, `expanded`) with swipe gestures.
- **Multi-Filter Bar**: Combined AND/OR filtering (`🍃 4+ leaves`, `🕒 Open now`, `🌱 100% Vegan`, `🍽️ Restaurant`, `☕ Cafe & Bakery`, `🍝 Italian`, `🥢 Asian`, `🍔 Burgers`, `🌾 Gluten-Free`, `🍦 Ice Cream`).

### 🔜 Upcoming Map Milestones:
- [ ] **Community Crowdsourced Tags**: Allow users to vote on verified restaurant features (`🌱 100% Vegan`, `🌾 Gluten-Free options`, `☀️ Outdoor Terrace`, `🐾 Pet-friendly`, `☕ Plant milk without surcharge`, `♿ Wheelchair Accessible`).
- [ ] **Expanded Ethical Categories**: Add dedicated map layers for **Animal Sanctuaries** and **Vegan Cooking Classes & Workshops**.
- [ ] **Filter Customization**: Allow users to reorder and pin their favorite dietary pills to the quick-filter bar.

---

## 🍳 2. Recipe Veganizer & Hub (`/recipes`)

Status: **Smart Veganizer active; Recipe Hub expansion planned**.

### 🌟 Current Capabilities:
- **Rule-Based & AI Veganizer**: Automatic replacement of animal ingredients (including egg whites, yolks, dairy, meats, gelatins) with accurate culinary alternatives.
- **One-Click Clipboard Export** and curated Catalan & International examples (Pancakes, Canelons, Crema Catalana, Sponge Cake, Cookies).

### 🚀 Expansion Plans (The Default Vegan Recipe Hub):
- [ ] **Curated Plant-Based Master Recipes**:
  - Transform `/recipes` into an authoritative culinary hub with tested staple recipes:
    1. 🧀 **Artisanal Vegan Cheeses** (macadamia fresh cheese, fermented cashew parmesan, tapioca melting mozzarella).
    2. 🍲 **Traditional Comfort Foods** (Catalan escudella, rich seitan stews, wild mushroom mountain rice).
    3. 🍰 **Egg-free & Dairy-free Bakery** (aquafaba chocolate mousse, classic cakes, pastry cream).
    4. 🥗 **High-Protein Fast Meals** (crispy marinated tofu, glazed tempeh, spiced grain bowls).
- [ ] **Cooking Mode**: Step-by-step full-screen instructions with integrated timers.
- [ ] **Dietary & Allergen Filtering**: Filter by preparation time, difficulty, nut-free, and gluten-free tags.

---

## 📚 3. Resources, Guides & Advocacy (`/resources`)

Status: **New Section in Design**.

### 🎯 Goal:
Provide an accessible, evidence-based, compassionate, and positive guide for anyone curious about plant-based nutrition, ethics, or animal advocacy.

### 📑 Planned Content:
1. **Evidence-Based Nutrition Guide**:
   - Vitamin B12 supplementation guidelines (dosage and frequency).
   - Key sources for iron, calcium, plant proteins, iodine, and omega-3 fatty acids.
   - Practical transition strategies for sustainable long-term habits.
2. **Documentaries & Books**:
   - Curated media library (*Earthlings*, *Dominion*, *Cowspiracy*, *The Game Changers*) with direct streaming links.
3. **Common Questions & Ethical FAQ**:
   - Clear, constructive answers to frequent concerns ("Where do you get protein?", "What about cultural traditions?", "Is veganism expensive?").
4. **Animal Sanctuaries Directory**:
   - Verified map and directory of animal sanctuaries in Catalonia, Spain, and Europe for volunteering or educational visits.

---

## 🎨 4. Design System & UX Polish

Status: **Continuous Iteration**.

- [ ] **Unified Botanical Design System**:
  - Cohesive earthy color palette (deep forest greens, warm neutrals, crisp typography).
  - Fluid micro-interactions (smooth skeleton loaders, tactile bottom sheets).
- [ ] **Dark Mode / Light Mode**: Seamless theme switching honoring operating system preferences.

---

## 👥 5. Community Reviews & Social Verification

Status: **Architecturally Designed**.

### 🎯 Core Principles:
1. **100% Anonymous & Open Browsing**:
   - No login is ever required to browse maps, inspect menus, scan barcodes, or read recipes.
   - Authentication is strictly optional, required only when writing a review or submitting evidence.
2. **Delegated Security (Supabase Auth)**:
   - Zero password storage on custom servers; 100% managed via Argon2id encryption and PostgreSQL Row-Level Security (RLS).
   - Frictionless 1-click login: Google OAuth, Apple Sign-In, and Magic Email Links.
3. **5-Leaf Rating System (🍃 1 to 5)**:
   - Dedicated vegan-specific rating measuring variety, staff dietary awareness, and kitchen cross-contamination protocols.

---

## 🔒 6. Privacy, GDPR & "Zero Cookie Banners"

- **Zero Third-Party Trackers**: No advertising pixels (Meta, TikTok), no invasive analytics scripts.
- **No Cookie Banner Required**: Because we store zero commercial profiling data, no intrusive cookie banners are legally required under GDPR/ePrivacy directives.
- **Ephemeral Geolocation**: User GPS coordinates are processed solely in client-side memory to calculate distances and are never recorded in databases.

---

## 🛡️ Reference Documentation
- **Architecture Guide**: [`docs/architecture.md`](./architecture.md)
- **Bug & Incident Tracker**: [`docs/bugs.md`](./bugs.md)
- **Market Research**: [`docs/market-research.md`](./market-research.md)
- **Reliability Methodology**: [`docs/reliability.md`](./reliability.md)
