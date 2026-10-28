# SOFTWARE DEVELOPMENT AGREEMENT & STATEMENT OF WORK (SOW)

**Document Reference:** `RQT-AGR-2026-001`  
**Effective Start Date:** 8th October 2026 *(Commencement of Repository Cleanup & Architecture Reset)*  
**Current Date:** 28th October 2026  
**Project Title:** RQuest Hyperlocal Marketplace & Commerce Platform — MVP Development & Launch  

---

### PARTIES
This Software Development Agreement ("Agreement") is entered into by and between:

*   **Service Provider / Developer:**  
    **Name / Entity:** [Developer Name / Agency Name]  
    **Address / Contact:** [Developer Email / Phone Number / City]  
    *(Hereinafter referred to as the "Developer")*

*   **Client:**  
    **Name / Entity:** [Client Full Name / Company Name]  
    **Address / Contact:** [Client Email / Phone Number / City]  
    *(Hereinafter referred to as the "Client")*

---

## 1. PROJECT OBJECTIVE & DETAILED PLATFORM VISION

The objective of this engagement is the engineering, feature completion, optimization, and production deployment of **RQuest** ("*Connect Everywhere Everything*") as a scalable **Minimum Viable Product (MVP)**.

**RQuest** is an **All-in-One Hyperlocal Marketplace, Social Commerce & On-Demand Service Platform** designed to seamlessly connect physical neighborhood merchants, service professionals, local consumers, and delivery fulfillment agents.

### Core Ecosystem Pillars:
1.  **Hyperlocal Geospatial Discovery Engine:** Real-time proximity discovery using PostgreSQL `earthdistance` + `cube` spatial engine, LocationIQ address autocomplete with regional biasing, and interactive Leaflet maps with drag-to-pin accuracy.
2.  **Real-Time Consumer-to-Merchant Chat & Quotation System:** Socket.IO WebSocket streaming for direct communication between shoppers and shopkeepers, including integrated service quotation/estimate flows (`/quotes`).
3.  **Merchant Store Management & Bulk Catalog Ingestion:** Merchant hub for store profile control, dynamic business form schemas (`form_schema`), order tracking, and high-volume product catalog ingestion via CSV parser.
4.  **Customer Storefront, Cart & Order Flow:** Public digital storefronts (`/storefront/:shop_id`), persistent customer cart drawer, order tracking, address book management, and real-time push notifications.
5.  **Delivery Portal & Multi-Role Governance:** Rider delivery dispatch feed (`/delivery_portal`), customer account management, and multi-tier administrative governance (`/admin`).

---

## 2. COMPLETE ROADMAP, DELIVERABLES & MILESTONES

The project commenced on **8th October 2026** with codebase stabilization and foundation engineering. The remaining MVP development spans a **2-month core delivery window**, followed by user acceptance testing, cloud deployment, and final settlement.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             RQUEST PROJECT ROADMAP                               │
├───────────────────┬──────────────────┬─────────────────────┬─────────────────────┤
│   MILESTONE 0     │   MILESTONE 1    │     MILESTONE 2     │     MILESTONE 3     │
│ (Oct 8 - Oct 28)  │    (Month 1)     │      (Month 2)      │     (Post-MVP)      │
├───────────────────┼──────────────────┼─────────────────────┼─────────────────────┤
│ • Repo Cleanup &  │ • Real WhatsApp  │ • Real AI Workflow  │ • User Acceptance   │
│   App Reset       │   & SMS Auth     │   (LLM API Engine)  │   Testing (UAT)     │
│ • Database Models │ • Product        │ • UI/UX Overhaul &  │ • Production Cloud  │
│   & Self-Healing  │   Catalog Engine │   Mobile Polish     │   Deployment        │
│ • LocationIQ & Map│ • Redis In-Mem   │ • Code Optimization │ • Final Handover &  │
│ • Store Admin     │   Cache Setup    │ • MVP Launch Prep   │   Sign-off          │
│ • CSV Bulk Parser │ • Cart & Orders  │ • Security Audit    │                     │
├───────────────────┼──────────────────┼─────────────────────┼─────────────────────┤
│ ₹30,000           │ ₹30,000          │ ₹30,000             │ ₹30,000 - ₹50,000   │
│ [Separate Invoice]│ [NET 30]         │ [NET 60]            │ [Sign-off]          │
└───────────────────┴──────────────────┴─────────────────────┴─────────────────────┘
```

---

### Detailed Deliverable Specifications

### Milestone 0: Foundation, Architecture Reset & Core Modules *(Completed)*
*   **Timeline:** 8th October 2026 – 28th October 2026
*   **Commercial Fee:** **₹30,000**
*   **Billing Note:** Billed under **Separate Invoice (`INV-RQT-001`)**, payable upon execution of this Agreement.
*   **Delivered Capabilities:**
    1.  **Monorepo Cleanup & Full Architectural Reset:** Cleaned legacy artifacts, updated dependencies to Vite 5 and React 17, eliminated dead code and broken builds, standardized build scripts.
    2.  **Database & Relational Model Sync:** PostgreSQL schemas with Sequelize ORM: `users`, `roles`, `shops`, `categories`, `sub_categories`, `products`, `shop_listings`, `chats`, `orders`, `order_items`, `quotes`, and `addresses`. Implemented database self-healing checks on startup (e.g. `form_schema` column validation).
    3.  **Geospatial & LocationIQ Engine:** Integrated LocationIQ reverse geocoding and regional autocomplete bounded within 150km with in-memory caching and fallback to OpenStreetMap.
    4.  **Merchant Store Management:** Built multi-tab store dashboard (`manage_store.jsx`) featuring live storefront links, store status toggling, catalog listings, incoming customer orders, and custom store settings.
    5.  **Bulk Catalog Ingestion Engine:** Developed client-side CSV parsing engine (`ImportProductCsvModal.jsx` / `csv_helper.js`) with column mapping, header validation, batch parsing, and database synchronization.
    6.  **Real-Time Chat & Socket Stabilization:** Socket.IO gateway with in-memory presence tracking, floating launcher FAB, direct store conversation threads, unread message badges, and initial push notification hooks.

---

### Milestone 1: Live Authentication & Advanced Catalog Engine *(Month 1)*
*   **Timeline:** Month 1 (Weeks 1 – 4 following Milestone 0 sign-off)
*   **Commercial Fee:** **₹30,000**
*   **Scope & Deliverables:**
    1.  **Production WhatsApp Business & SMS OTP Authentication:**
        *   Replace temporary password credentials with real passwordless mobile number verification.
        *   Integration with official WhatsApp Business API / SMS gateway (e.g., MSG91, Fast2SMS, Twilio, or Meta Cloud API).
        *   Cryptographic 6-digit OTP generation, Redis/database throttling, TTL expiration, and SMS fallback when WhatsApp is unavailable.
        *   Secure JWT token issuance, session refresh handling, and role-based route guards (`user`, `client`, `admin`).
    2.  **Full Product Catalog & Variant Engine:**
        *   Multi-tier taxonomy integration (`Category` $\rightarrow$ `SubCategory` $\rightarrow$ `Products`).
        *   Dynamic variant management (sizes, weights, colors, custom pricing, and inventory availability).
        *   High-resolution product media handling with S3 / Cloudflare R2 bucket storage and auto-resizing.
        *   Advanced search, multi-facet filtering (in-stock, price range, distance, category tags), and sorting algorithms.
    3.  **Redis Caching & Cart Performance:**
        *   Redis cache integration for instant session lookups, OTP rate-limiting, and cached shop/catalog queries.
        *   Cart and checkout state synchronization between client-side Zustand store and server-side order drafting.

---

### Milestone 2: Real AI Flow, UI/UX Overhaul & MVP Readiness *(Month 2)*
*   **Timeline:** Month 2 (Weeks 5 – 8)
*   **Commercial Fee:** **₹30,000**
*   **Scope & Deliverables:**
    1.  **Real AI Flow & Semantic Search Integration:**
        *   Upgrade existing client-side regex prompts (`AiSearchModal.jsx`, `AiRecommendationCard.jsx`) into a **live LLM backend pipeline** (OpenAI GPT-4o-mini / Gemini 1.5 Flash / Anthropic Claude).
        *   Natural language intent parsing (e.g., *"Urgent electrician under ₹500 within 3km"*, *"pharmacy with baby formula nearby"*).
        *   Automated product tagging, catalog categorization suggestions, and AI-assisted conversational search responses.
        *   Backend prompt caching, token optimization, and API rate-limiting to prevent excessive consumption costs.
    2.  **Comprehensive UI/UX Modernization & Mobile First Polish:**
        *   Complete responsive overhaul for mobile devices, PWA touch interactions, and fluid drawer transitions.
        *   Standardized design system (consistent typography, Ant Design v5 palette, modern micro-interactions, skeleton loaders, and error boundary handling).
        *   Enhanced Storefront Screen (`/storefront/:shop_id`) and unified Customer Order Tracking page.
    3.  **Code-Level Hardening, Security & End-to-End Testing:**
        *   CORS origin restrictions, SQL injection prevention, input sanitization, and brute-force protection.
        *   Database connection pooling, indexing audit, and client bundle size optimization.
        *   End-to-end testing of core user journeys: Search $\rightarrow$ Discover Store $\rightarrow$ Chat/Quote $\rightarrow$ Cart $\rightarrow$ Order Placement $\rightarrow$ Delivery Notification.

---

### Milestone 3: Post-MVP Handover, Deployment & Final Settlement
*   **Timeline:** Post-MVP Launch & Acceptance (Weeks 9 – 10)
*   **Commercial Fee:** **₹30,000 to ₹50,000** *(determined based on client satisfaction, agreed final feature adjustments, and scope fulfillment)*
*   **Scope & Deliverables:**
    1.  **User Acceptance Testing (UAT):** 14-day dedicated window for client verification and immediate edge-case bug fixes.
    2.  **Production Cloud Deployment:** Full production setup of API server, PostgreSQL database, Redis instance, and frontend CDN.
    3.  **Domain, DNS & SSL Configuration:** Cloudflare DNS, SSL/TLS certificates, CDN caching rules, and HTTP security headers.
    4.  **Handover & Documentation:** Transfer of source code repositories, deployment scripts, environment variable runbooks, and a 1-on-1 administrative walkthrough.

---

## 3. COMMERCIAL SUMMARY & PAYMENT SCHEDULE

| Milestone / Phase | Deliverable Summary | Target Timeline | Amount (INR) | Payment Terms & Status |
| :--- | :--- | :--- | :--- | :--- |
| **Milestone 0** | Repo Reset, DB Models, LocationIQ, Store Admin & CSV Ingestion | Oct 8 – Oct 28, 2026 | ₹30,000 | **Billed via Separate Invoice (`INV-RQT-001`)** *(Due on signing)* |
| **Milestone 1** | Real WhatsApp/SMS Auth, Product Catalog Engine, Redis Setup | Month 1 End | ₹30,000 | Payable upon milestone delivery |
| **Milestone 2** | Real AI Workflow, UI/UX Overhaul, Code Hardening, MVP Completion | Month 2 End | ₹30,000 | Payable upon milestone delivery |
| **Milestone 3** | UAT, Cloud Deployment, Final Polish & Handover | Post-MVP (Month 2.5) | ₹30,000 – ₹50,000 | Final settlement upon sign-off |
| **TOTAL** | **Full End-to-End MVP Delivery** | **~2.5 Months** | **₹1,20,000 – ₹1,40,000** | — |

> **Payment Terms:**
> *   **Milestone 0** work completed to date is billed under **Separate Invoice #INV-RQT-001** for ₹30,000 and is due upon execution of this Agreement.
> *   Subsequent milestone payments are due within 7 business days following milestone demonstration and deliverable review.
> *   The final settlement (₹30,000 – ₹50,000) will be finalized mutually prior to final production cut-over based on client satisfaction and any bonus/feature scope additions.

---

## 4. VALUE PROPOSITION: MARKET COST COMPARISON

To illustrate the exceptional cost efficiency and value of this direct full-stack engagement:

| Item / Service | Standard Software Agency Rate | Typical Mid-Level Freelancers | **This Agreement Offering** |
| :--- | :--- | :--- | :--- |
| **Custom Full-Stack Architecture** (Node.js/PostgreSQL/Redis/Socket.IO) | ₹1,50,000 – ₹2,50,000 | ₹80,000 – ₹1,20,000 | **Included** |
| **Real WhatsApp Business API & SMS Gateway OTP Auth** | ₹40,000 – ₹60,000 | ₹25,000 – ₹35,000 | **Included** |
| **Hyperlocal Geospatial Engine & LocationIQ Integration** | ₹50,000 – ₹80,000 | ₹30,000 – ₹45,000 | **Included** |
| **Real-Time WebSocket Chat & Direct Messaging System** | ₹60,000 – ₹90,000 | ₹35,000 – ₹55,000 | **Included** |
| **Product Catalog Engine & Bulk CSV Parsing Ingestion** | ₹80,000 – ₹1,20,000 | ₹40,000 – ₹60,000 | **Included** |
| **Live AI Workflow (LLM Semantic Search & Suggestions)** | ₹1,00,000 – ₹2,00,000 | ₹60,000 – ₹90,000 | **Included** |
| **Modern UI/UX Responsive Redesign & PWA Polish** | ₹60,000 – ₹1,00,000 | ₹35,000 – ₹50,000 | **Included** |
| **Production Cloud Deployment, Redis & DevOps Setup** | ₹40,000 – ₹70,000 | ₹20,000 – ₹35,000 | **Included** |
| **TOTAL ESTIMATED VALUE** | **₹5,80,000 – ₹9,70,000+** | **₹3,25,000 – ₹4,90,000** | **₹1,20,000 – ₹1,40,000** |
| **Client Cost Savings** | — | — | **~70% – 78% Savings** |

### Why This Is Extremely Cost-Effective:
1.  **Zero Agency Bloat:** No overhead for account managers, non-technical project managers, or corporate sales markups.
2.  **Single Direct Full-Stack Engineer:** Rapid communication, direct problem-solving, and immediate turnaround on adjustments.
3.  **Modern, Open Standards:** Built on industry-standard React, Express, and PostgreSQL—no proprietary vendor locks.

---

## 5. CLOUD INFRASTRUCTURE & DEPLOYMENT COST ESTIMATION
*(Targeting 500 – 1,000 Active Users)*

The infrastructure is architected for **maximum efficiency and rock-bottom operating costs** during the MVP and early traction stage:

```
                      [Cloudflare CDN & DDoS Protection] (Free)
                                     │
                                     ▼
                [Application Server: DigitalOcean / Hetzner / AWS EC2]
                   (Node.js API + Static React Assets)
                     │                             │
                     ▼                             ▼
       [PostgreSQL Managed Database]        [In-Memory Redis Cache]
         (Catalog & User Data)               (Sessions, OTPs, Limits)
                     │                             │
                     ▼                             ▼
       [Cloudflare R2 / AWS S3]             [Third-Party Services]
         (Product Media Files)               (WhatsApp / SMS / AI API)
```

### Estimated Monthly Cloud & Service Run-Rate

| Infrastructure Component | Recommended Provider & Tier | Estimated Cost (USD) | Estimated Cost (INR) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Application Server** | DigitalOcean Basic Droplet / Hetzner Cloud (2 vCPU, 4GB RAM) | $12 – $20 / mo | ₹1,000 – ₹1,700 / mo | Runs API server & handles 1k+ users comfortably |
| **Database (PostgreSQL)** | Managed PostgreSQL (DigitalOcean / Neon / Supabase) or optimized self-hosted container | $15 – $25 / mo | ₹1,200 – ₹2,100 / mo | Automated daily backups, SSL enabled |
| **Redis Cache** | Co-hosted Docker Redis or Upstash serverless | $0 – $10 / mo | ₹0 – ₹850 / mo | Free tier or low-cost serverless caching |
| **Asset Storage (Media)** | Cloudflare R2 / AWS S3 + Cloudflare CDN | $2 – $5 / mo | ₹150 – ₹400 / mo | Zero egress fees with Cloudflare R2 |
| **SMS & WhatsApp OTP** | Fast2SMS / MSG91 / Meta Cloud API (pay-as-you-go) | $10 – $20 / mo | ₹800 – ₹1,700 / mo | ~₹0.15–₹0.25 per SMS, pay only per OTP sent |
| **AI API Consumption** | OpenAI / Gemini API (pay-as-you-go per token) | $15 – $30 / mo | ₹1,200 – ₹2,500 / mo | Cached prompt calls to prevent token wastage |
| **Total Estimated Run-Rate** | **Full Production Deployment** | **~$54 – $110 / month** | **₹4,350 – ₹9,250 / month** | *Can start as low as ₹3,500/mo on lean setup* |

> **Hosting & Third-Party API Responsibility:**
> *   All recurring infrastructure costs (Cloud hosting, domain, SMS/WhatsApp credits, and AI tokens) are paid directly by the Client via their billing credentials.
> *   The Developer will configure and optimize all services to minimize usage fees and avoid unexpected spikes.

---

## 6. INTELLECTUAL PROPERTY & OWNERSHIP

1.  **Ownership of Deliverables:** Upon complete payment of all agreed milestones (including the initial invoice and final settlement), all custom source code, documentation, designs, and intellectual property developed specifically for this project shall become the exclusive property of the Client.
2.  **Open Source & Third-Party Libraries:** Standard open-source libraries (React, Express, Sequelize, AntD, etc.) remain subject to their respective open-source licenses (MIT, Apache 2.0).
3.  **Developer Portfolio:** The Developer reserves the non-exclusive right to reference the project name and high-level description in personal portfolios or case studies, without exposing confidential business metrics or proprietary algorithms.

---

## 7. CHANGE MANAGEMENT & OUT-OF-SCOPE WORK

1.  **Scope Boundary:** Features not explicitly detailed in Section 2 (e.g., custom payment gateway integrations with escrow/split disbursements, native iOS/Android binary store submissions, multi-language localization) are considered Out of Scope for this MVP agreement.
2.  **Change Requests (CR):** Any new feature requests made during development will be documented, estimated for additional timeline and cost, and executed only upon mutual written agreement (or deferred to Phase 2 post-MVP).

---

## 8. POST-LAUNCH WARRANTY & SUPPORT

*   **Included Warranty Window:** The Developer provides a **14-day bug-fix warranty** starting immediately upon production deployment.
*   **Warranty Scope:** Includes resolving reproducible crashes, breaking errors, or regressions within the agreed scope at zero additional cost.
*   **Ongoing Maintenance (Optional):** Following the warranty window, monthly maintenance, feature additions, or server administration can be contracted under a separate Retainer Agreement (e.g., ₹15,000 – ₹25,000/month or hourly).

---

## 9. ACCEPTANCE & SIGNATURES

By signing below, both parties acknowledge and agree to the scope, milestones, commercials, and terms set forth in this Agreement.

\
**For the Client:**

Signature: ___________________________________________  
Name: _______________________________________________  
Title: ________________________________________________  
Date: ________________________________________________  

\
**For the Service Provider (Developer):**

Signature: ___________________________________________  
Name: _______________________________________________  
Title: Lead Full-Stack Developer  
Date: 28th October 2026  
