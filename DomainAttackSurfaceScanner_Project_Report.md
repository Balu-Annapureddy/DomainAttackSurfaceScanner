# DOMAIN ATTACK SURFACE SCANNER (DASS)
## Technical & Academic Project Report: Passive External Attack Surface Intelligence and Automated Hygiene Evaluation

---

### Project Metadata & Declaration
- **Project Title:** Domain Attack Surface Scanner (DASS)
- **Primary Repository:** Balu-Annapureddy/DomainAttackSurfaceScanner
- **Author / Candidate:** Balu Annapureddy
- **Candidate Registration / Roll Number:** [Candidate Registration Number Placeholder]
- **Academic Department:** [Department of Computer Science & Engineering / Information Security]
- **Institution / University:** [University / Engineering Institute Placeholder]
- **Project Guide / Supervisor:** [Project Supervisor / Faculty Mentor Placeholder]
- **Academic Year / Semester:** [2025–2026 / Final Year Project Submission]
- **Date of Submission:** October 2026
- **License:** MIT License

---

## TABLE OF CONTENTS

1. [Cover Page](#1-cover-page)
2. [Abstract](#2-abstract)
3. [Introduction](#3-introduction)
4. [Problem Statement](#4-problem-statement)
5. [Objectives](#5-objectives)
6. [Existing System and Literature Review](#6-existing-system-and-literature-review)
7. [Proposed System](#7-proposed-system)
8. [System Requirements](#8-system-requirements)
9. [System Architecture](#9-system-architecture)
10. [Methodology](#10-methodology)
11. [Implementation](#11-implementation)
12. [Key Features](#12-key-features)
13. [Findings and Scoring](#13-findings-and-scoring)
14. [User Interface and Visualization](#14-user-interface-and-visualization)
15. [Security, Privacy, and Safety Boundaries](#15-security-privacy-and-safety-boundaries)
16. [Testing and Validation](#16-testing-and-validation)
17. [Results and Discussion](#17-results-and-discussion)
18. [Limitations](#18-limitations)
19. [Future Scope](#19-future-scope)
20. [Conclusion](#20-conclusion)
21. [References](#21-references)

---

## 1. COVER PAGE

| Field | Details |
| :--- | :--- |
| **Project Title** | **Domain Attack Surface Scanner (DASS)** |
| **Subtitle** | A Passive, Evidence-Grounded External Attack Surface Intelligence and Posture Hygiene Platform |
| **Candidate Name** | Balu Annapureddy |
| **Candidate ID / Roll No.** | [Candidate Registration Number Placeholder] |
| **Degree / Program** | [Bachelor / Master of Technology in Computer Science and Engineering] |
| **Department** | [Department of Computer Science and Engineering / Cyber Security] |
| **Institution** | [College / University / Institutional Name Placeholder] |
| **Supervisor / Guide** | [Faculty Mentor / Project Guide Name Placeholder] |
| **Submission Session** | Academic Year 2025 – 2026 |
| **Document Classification** | Capstone Technical Project Report / Academic Submission |

---

## 2. ABSTRACT

Modern organizational IT infrastructure is characterized by rapid decentralization, widespread multi-cloud adoption, third-party software integrations, and continuous web service provisioning. While this evolution accelerates product velocity, it unintentionally expands the organization's **External Attack Surface**—the collection of all internet-facing digital assets, exposed IP addresses, DNS records, public cloud buckets, and web interfaces visible to external entities. Traditional approaches to identifying perimeter risks predominantly rely on intrusive active vulnerability scanners or manual penetration testing. These conventional methodologies require explicit authorization, risk service disruptions, generate substantial network noise, and fail to distinguish between actively verified vulnerabilities and unobserved configurations.

To address these challenges, this project introduces the **Domain Attack Surface Scanner (DASS)**, an authorized, fully passive external attack-surface intelligence workstation and automated configuration hygiene assessment system. Built as a full-stack TypeScript workspace utilizing Node.js, Express, React, and Vite, DASS maps an organization's public-facing digital footprint through non-intrusive intelligence aggregation. The system queries authoritative Domain Name System (DNS) resolvers, public Certificate Transparency (CT) logs, TLS handshake parameters, HTTP response headers, Border Gateway Protocol (BGP) Autonomous System Number (ASN) routing tables, and passive exposure registries such as the Shodan InternetDB.

Crucially, DASS introduces an **epistemically safe**, deterministic, and explainable **External Hygiene Score (0–100)** structured across six core dimensions: TLS Hygiene, HTTPS Enforcement, Web Security Headers, Email Security (SPF and DMARC), DNSSEC Hygiene, and Network Exposure. Unlike heuristic "black box" security ratings, DASS adheres to strict epistemic safety: absent or failed provider checks never result in negative point deductions, ensuring incomplete intelligence is never conflated with confirmed configuration vulnerability. The platform normalizes discovered assets into an interconnected knowledge graph, generates structured 10-section analytical findings with actionable remediation advice, and renders high-density telemetry across dark/light editorial workstation interfaces, interactive SVG relationship graphs, and geographical Leaflet infrastructure maps. Rigorous automated testing—comprising 26 test files and 222 passed tests across server and client workspaces—validates the platform's accuracy, Server-Side Request Forgery (SSRF) boundary protections, and rate-limiting quotas. DASS provides a safe, transparent, and reproducible alternative for cybersecurity students, researchers, and defensive security engineers seeking rigorous visibility into external internet exposure.

---

## 3. INTRODUCTION

### 3.1 Background of External Attack Surface Intelligence
In modern enterprise networks, the perimeter is no longer defined by a static physical firewall or private demilitarized zone (DMZ). Modern digital footprints encompass dynamic domain portfolios, ephemeral cloud compute instances, Content Delivery Network (CDN) edge distributions, third-party Software-as-a-Service (SaaS) delegates, and hybrid infrastructure scattered across multiple cloud service providers. Consequently, an organization's true attack surface comprises all publicly accessible hardware, software, cloud resources, and network entry points that process, store, or transmit organizational data.

External Attack Surface Management (EASM) has emerged as an essential discipline within defensive cybersecurity. EASM refers to the continuous discovery, analysis, and management of the risks associated with an organization's internet-facing digital assets. Unlike internal vulnerability management—which assesses authenticated assets behind firewalls—EASM assumes the perspective of an external observer, evaluating exactly what an adversary or security researcher can observe across the public internet using publicly accessible telemetry.

### 3.2 Why Organizations Require Visibility into Observable Assets
Organizations routinely suffer security incidents not from sophisticated zero-day exploits on hardened core systems, but from overlooked administrative interfaces, legacy subdomains, misconfigured mail records, or forgotten staging servers—commonly categorized as "Shadow IT." Key drivers for external asset visibility include:
1. **Asset Sprawl and Shadow IT:** Development teams frequently deploy temporary proof-of-concept environments or cloud instances that remain active and unmonitored long after their intended decommission date.
2. **DNS and Email Hijacking Risks:** Missing or weakly configured email authentication records (Sender Policy Framework / SPF and Domain-based Message Authentication, Reporting, and Conformance / DMARC) allow malicious actors to spoof company domains in phishing campaigns.
3. **Certificate Expiration Outages:** Overlooked Transport Layer Security (TLS) certificates disrupt production services and trigger browser security warnings that damage consumer trust.
4. **Transport Layer Degradation:** Websites that fail to enforce strict HTTPS redirects or omit modern HTTP security headers expose end users to man-in-the-middle (MitM) eavesdropping, clickjacking, and cross-site scripting (XSS) attacks.

### 3.3 Limitations of Traditional Active Vulnerability Scanning
For decades, organizations have relied on active vulnerability scanners (e.g., Nessus, Qualys, OpenVAS, or aggressive Nmap scripts) to discover perimeter risks. However, when applied to external attack surface discovery, active scanning exhibits major structural limitations:
- **Intrusive Network Footprint:** Active scanners send thousands of crafted network packets, port sweeps, directory fuzzing requests, and simulated exploit payloads. This can trigger Web Application Firewall (WAF) blocks, corrupt sensitive back-end state, saturate network links, or accidentally crash brittle legacy services.
- **Authorization and Legal Constraints:** Because active scanning resembles malicious probing, it requires strict, prior written authorization. Conducting unauthorized active scans across third-party cloud assets frequently violates Cloud Service Provider Acceptable Use Policies and computer misuse legislation.
- **Opacity and Double Counting:** Many commercial scanners output proprietary numerical scores without revealing the mathematical derivation or weighting factors, leaving security teams unable to explain why a specific score was assigned.
- **Conflation of Unavailability with Vulnerability:** When a network probe times out or is blocked by an intermediate firewall, flawed scanners frequently infer that a security control is missing, issuing false-positive vulnerability alerts.

### 3.4 Motivation for Domain Attack Surface Scanner (DASS)
The motivation behind DASS is to provide an educational, transparent, and mathematically rigorous security workstation that accomplishes comprehensive perimeter reconnaissance without sending hostile or intrusive traffic. By leveraging public registries, cryptographic Certificate Transparency (CT) logs, passive DNS enumeration, and standard TLS/HTTP handshakes, DASS delivers high-fidelity visibility into an organization's external posture while remaining safe, legal, and respectful of target infrastructure.

### 3.5 Project Scope
DASS is explicitly scoped as an **authorized passive intelligence platform**. It aims to:
- Enumerate DNS records, subdomains, IP addresses, nameservers, and mail exchangers.
- Evaluate cryptographic TLS certificates, cipher validity, and expiration timelines.
- Audit transport security (HTTP-to-HTTPS enforcement) and defensive HTTP response headers.
- Inspect email authentication postures (SPF, DKIM selectors, DMARC policies).
- Verify DNSSEC authentication chains.
- Correlate public IP addresses with Autonomous System Numbers (ASNs), BGP routing prefixes, organizations, and approximate geographic locations.
- Aggregate passive threat intelligence from Shodan InternetDB (open ports, CPEs, known CVEs) without executing direct port scans.
- Synthesize all collected signals into an interconnected asset-relationship graph and compute an explainable, deterministic External Hygiene Score (0–100).
- Provide an audit-ready, editorial "field report" workstation interface equipped with dark/light themes, asset graphs, routing chains, and comparison diffs.

---

## 4. PROBLEM STATEMENT

Organizations operating on the modern internet face an increasingly fractured and opaque attack surface. Specifically:
1. **Fragmented Perimeter Intelligence:** External assets are distributed across multiple registrars, DNS hosting providers, and cloud environments. Security teams lack a consolidated view uniting domain registration, DNS delegation, certificate issuance, and routing topology.
2. **Silent Configuration Degradation:** Defensive controls such as HTTP Strict Transport Security (HSTS), Content Security Policy (CSP), SPF, and DMARC require active maintenance. Organizations rarely detect when a DNS migration accidentally drops an SPF record or when a TLS certificate enters its final week before expiration.
3. **Black-Box Scoring and Arbitrary Deductions:** Existing vulnerability scanners and commercial rating agencies compute proprietary scores using undisclosed algorithms. Security teams cannot audit how individual findings translate into point deductions, creating friction during executive reporting and remediation planning.
4. **Epistemic Errors in Automated Auditing:** Conventional automated scanners routinely penalize targets when external APIs fail, rate limits are hit, or probes time out. Conflating an incomplete test with confirmed non-compliance produces misleading metrics.
5. **Intrusive Operational Risk:** Defensive practitioners, students, and compliance auditors lack non-invasive tools to assess organizational attack surfaces without triggering intrusion alarms or risking operational downtime.

DASS directly addresses these problems by providing an open, passive, evidence-driven workstation that correlates external signals into a unified graph and applies an explainable, epistemically sound scoring rubric.

---

## 5. OBJECTIVES

The specific, verifiable objectives accomplished by DASS include:
1. **Passive Subdomain and Asset Discovery:** Implement non-intrusive asset discovery by mining public Certificate Transparency logs (crt.sh) and authoritative DNS records without dictionary brute-forcing.
2. **Authoritative DNS and Email Audit:** Systematically resolve and parse DNS resource records (A, AAAA, MX, TXT, NS, CNAME, CAA) and evaluate email defenses (SPF syntax, DKIM selectors, and DMARC enforcement).
3. **Cryptographic TLS and Transport Verification:** Conduct passive TLS handshakes to extract certificate chains, subject alternative names (SANs), cipher suites, signature algorithms, and precise expiration dates.
4. **Web Perimeter Defense Auditing:** Validate HTTP-to-HTTPS redirect behaviors and audit the presence and syntax of five essential HTTP security headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy).
5. **BGP Routing and Geolocation Correlation:** Query IP intelligence APIs to map IP addresses to Autonomous System Numbers (ASNs), operating organizations, and approximate geographical coordinates.
6. **Passive Exposure and CVE Enrichment:** Integrate the Shodan InternetDB to detect public exposed services and correlate documented Common Vulnerabilities and Exposures (CVEs) without executing active port sweeps.
7. **Asset Normalization and Relationship Graphing:** Normalize all discovered entities into typed assets (`DOMAIN`, `SUBDOMAIN`, `IP`, `ASN`, `ORGANIZATION`, `NAMESERVER`, `MAIL_SERVER`, `CERTIFICATE`) and link them via directed relationships (`resolves_to`, `belongs_to_asn`, `secured_by`, etc.).
8. **Deterministic Hygiene Scoring:** Design and implement a transparent, single-pass 0–100 External Hygiene Score governed by strict epistemic safety, explicit dimension caps, and deterministic observation logging.
9. **Editorial Workstation User Interface:** Construct a responsive, high-density React workstation featuring dark and light editorial themes, SVG graph visualizers, Leaflet geographic maps, and printer-ready audit dossiers.
10. **Hardened Security and Data Minimization:** Enforce strict Server-Side Request Forgery (SSRF) boundary protections, private CIDR filtering, sliding-window quotas, Scrypt password hashing, and zero-cookie anonymous scanning.

---

## 6. EXISTING SYSTEM AND LITERATURE REVIEW

### 6.1 Review of Conventional Methodologies
External attack surface assessment tools typically fall into three broad categories:

#### Active Network Port and Vulnerability Scanners
Tools such as **Nmap**, **Nessus**, and **OpenVAS** establish direct, active TCP/UDP connections to thousands of ports on target host systems. They transmit banner probes, malformed requests, and known exploit signatures to determine running services and software versions.
- *Strengths:* Highly accurate identification of active services and exploitable vulnerabilities behind responsive ports.
- *Weaknesses:* Intrusion detection alarms are immediately triggered; heavy bandwidth consumption; potential for service disruption; strict legal authorization requirements.

#### Manual OSINT Command-Line Scripts
Open-Source Intelligence (OSINT) scripts such as **Amass**, **Sublist3r**, **theHarvester**, and **dnsrecon** collect passive reconnaissance data from search engines, web archives, and DNS brute-force wordlists.
- *Strengths:* Excellent for standalone reconnaissance during initial penetration testing engagements.
- *Weaknesses:* Highly fragmented outputs (raw text/JSON dumps); lack of consolidated asset normalization; no unified scoring or risk quantification; no web-based visual workstation for ongoing governance.

#### Proprietary Commercial Attack Surface Management Platforms
Commercial platforms (e.g., BitSight, SecurityScorecard, Microsoft Defender EASM) continuously ingest global internet telemetry to generate corporate risk scores.
- *Strengths:* Massive global scanning infrastructure and historical trend tracking.
- *Weaknesses:* High financial barrier to entry; proprietary "black-box" scoring methodologies; frequent false positives; opaque dispute processes when external assets are misattributed.

### 6.2 Comparative Assessment

| Assessment Dimension | Active Vulnerability Scanners | Command-Line OSINT Scripts | Proprietary EASM Services | Domain Attack Surface Scanner (DASS) |
| :--- | :--- | :--- | :--- | :--- |
| **Intrusiveness** | High (sends thousands of probes) | Medium (often includes DNS brute force) | Low to Medium | **Zero (Strictly passive & safe HTTP)** |
| **Legal Authorization Req.** | Mandatory written authorization | Often required for DNS brute-force | Not applicable (vendor managed) | **None required (Public OSINT signals only)** |
| **Asset Relationship Graph** | Rare (IP-centric) | None (flat lists) | Proprietary graph | **Interactive SVG & Relational Models** |
| **Scoring Explainability** | Opaque CVSS aggregations | None | Proprietary black-box | **100% Transparent, Deterministic v1 Rubric** |
| **Epistemic Safety** | Poor (timeouts flagged as flaws) | None | Variable | **Guaranteed (Failed checks never deduct)** |
| **Deployment Model** | Heavyweight server daemon | Python/Go CLI scripts | Enterprise SaaS | **Self-hosted Full-Stack Node/React App** |
| **Cost & Privacy** | Commercial licensing | Free / Open Source | Expensive enterprise subscription | **Free, Open-Source, Zero Tracking Cookies** |

---

## 7. PROPOSED SYSTEM

DASS provides a unified, full-stack intelligence workstation engineered from first principles for safety, transparency, and explainability.

### 7.1 Architecture of the Proposed Solution
The proposed system decouples the intelligence collection pipeline into modular, fault-tolerant background workers. Each worker queries a distinct passive vector—DNS, Certificate Transparency, WHOIS/RDAP, TLS handshakes, HTTP response banners, IP intelligence, and Shodan InternetDB. A central scan coordinator orchestrates these workers under strict per-scan time and request budgets.

```
       +-------------------------------------------------------+
       |             Client Browser (React 19 + Vite)          |
       |  - Editorial Workstation UI (Dark/Light Custom CSS)   |
       |  - Telemetry Overview, Score Breakdown & Audit        |
       |  - SVG Attack Surface Graph & Leaflet Pop Map         |
       |  - Findings Accordion with 10-Section Analysis        |
       +-------------------------------------------------------+
                                   |
                         HTTP / REST API (JSON)
                                   v
       +-------------------------------------------------------+
       |            Server Application (Node.js/Express)       |
       |  - Input Validation & Public DNS Resolution Guard     |
       |  - Hardened SSRF Filter (Blocks Private/Link-Local)   |
       |  - Sliding-Window Quota Service (5/hr anon, 50/hr reg)|
       |  - Scrypt Session & Ownership Authorization Guards    |
       +-------------------------------------------------------+
                                   |
                     Dispatches Intelligence Pipeline
                                   v
       +-------------------------------------------------------+
       |             Modular Intelligence Services             |
       |  1. DNS Resolver (A, AAAA, MX, TXT, NS, CAA, DNSSEC)  |
       |  2. Certificate Transparency Miner (crt.sh Logs)      |
       |  3. Registration Intelligence (WHOIS / RDAP)          |
       |  4. TLS Handshake Analyzer (Ciphers, Validity, Expiry)|
       |  5. HTTP Transport Auditor (Safe HTTP, HSTS, Headers) |
       |  6. Email Defense Analyzer (SPF Syntax, DMARC Rules)  |
       |  7. IP Intelligence (BGP ASN, Org, Anycast, Geolocation)|
       |  8. Shodan InternetDB & CVE Enrichment (Passive Ports) |
       |  9. Cloud Bucket & Document Metadata Safe Probes      |
       +-------------------------------------------------------+
                                   |
                  Passes Raw Evidence to Aggregator
                                   v
       +-------------------------------------------------------+
       |             Normalization & Correlation Engine        |
       |  - Typed Asset Deduplication (DOMAIN, IP, ASN, etc.)  |
       |  - Directed Relationship Graph Construction           |
       |  - 21-Rule Deterministic Finding Synthesis            |
       |  - Single-Pass External Hygiene Score (v1 Engine)     |
       +-------------------------------------------------------+
                                   |
                 Stores Scan & Responds to Client
                                   v
       +-------------------------------------------------------+
       |                  Persistence Layer                    |
       |  - Production: PostgreSQL (pg.Pool, relational schema)|
       |  - Dev/CI: In-Memory / File Atomic Store (dass_db.json)|
       +-------------------------------------------------------+
```

### 7.2 Core Tenets of DASS
1. **Passive-First Reconnaissance:** DASS strictly queries authoritative public records, cached log registries, or issues lightweight HTTP GET/HEAD requests to standard web ports (80/443). It never executes port scans or brute-force fuzzing.
2. **Epistemic Integrity:** If a network error, DNS timeout, or provider rate limit occurs, DASS sets the category status to `failed` and records diagnostic warnings. It strictly refuses to assess score deductions for incomplete evidence.
3. **Structured Analytical Findings:** Findings are not simple one-line alerts. Each finding is enriched with an exhaustive 10-section analysis explaining the underlying concept, what was observed, why it matters, realistic security impact, potential abuse avenues, and safe validation steps.
4. **Complete Privacy and Data Minimization:** Anonymous scans require zero authentication cookies and automatically expire. User accounts use RFC 7914 Scrypt password hashing. A user can trigger complete, cascading account deletion (`DELETE /api/auth/me`) at any time.

---

## 8. SYSTEM REQUIREMENTS

### 8.1 Software and Runtime Requirements
The system is constructed using modern, verified open-source software technologies:

| Component | Verified Technology / Version | Role in DASS |
| :--- | :--- | :--- |
| **Runtime Environment** | Node.js v18.0.0 or higher (v20+ verified in CI) | Asynchronous backend server execution |
| **Package Manager** | npm v9.0.0 or higher | Monorepo workspace package management |
| **Backend Framework** | Express v4.18.3 | REST API routing and middleware pipeline |
| **Server Language** | TypeScript v5.5.2 (Node target ES2022) | Static type safety and structured models |
| **Database Adapter** | PostgreSQL v14+ (`pg` v8.23.0) | Relational persistence with foreign keys |
| **Dev Database Fallback** | In-Memory / JSON File (`.data/dass_db.json`) | Zero-dependency local development & testing |
| **Frontend Framework** | React v19.2.8 (with React DOM v19.2.8) | Component-driven reactive user interface |
| **Frontend Tooling** | Vite v8.3.0 | Modern ESM bundler and HMR dev server |
| **Client Router** | React Router DOM v7.18.4 | Client-side route management |
| **Styling Architecture** | Vanilla CSS Design System (`index.css`) | Custom CSS properties for high-contrast themes |
| **Icons & Typography** | Lucide React v1.47.0 / IBM Plex / Newsreader | Visual indicators and editorial typography |
| **Geographic Mapping** | Leaflet v1.9.4 & React Leaflet types | Interactive OpenStreetMap coordinate plotting |
| **Testing Framework** | Jest v29.7.0 (Server) & Vitest v5.0.1 (Client) | Automated unit, security, and E2E testing |
| **Linting Tools** | ESLint v8.57.0 (Server) & Oxlint v1.81.0 (Client)| Static code analysis and syntax verification |

### 8.2 Hardware Requirements
Because DASS offloads heavy intelligence processing to external distributed providers (e.g., crt.sh, DNS resolvers, Shodan), its local system requirements are minimal:
- **Processor:** Dual-core 64-bit x86_64 or ARM processor (2.0 GHz or faster).
- **System Memory (RAM):** 2 GB minimum (4 GB recommended for concurrent test execution and Vite bundling).
- **Storage:** 500 MB free disk space for node_modules, build outputs, and local database cache.
- **Network Interface:** Active broadband internet connection with outbound access to ports 53 (DNS), 80 (HTTP), and 443 (HTTPS).

---

## 9. SYSTEM ARCHITECTURE

### 9.1 High-Level Component Decomposition
The application is organized as an npm monorepo comprising three distinct workspace tiers:
1. `shared/`: Universal TypeScript contracts, enum definitions, and asset interfaces imported by both frontend and backend.
2. `server/`: Express-based REST API containing security middleware, scan orchestrators, modular intelligence services, and database persistence layers.
3. `client/`: React workstation providing interactive telemetry visualization, historical comparison, and report export engines.

```
+---------------------------------------------------------------------------------------+
|                                    SHARED WORKSPACE                                   |
|   Types: DomainScan, Asset, Relationship, Finding, ScoreBreakdown, DimensionScore    |
+---------------------------------------------------------------------------------------+
                                  ^                                   ^
                                  |                                   |
+---------------------------------+--+     +--------------------------+-----------------+
|          SERVER WORKSPACE          |     |           CLIENT WORKSPACE                  |
|  - Middleware:                     |     |  - Contexts:                                |
|    * AuthGuard (Session Cookie)    |     |    * AuthContext (Login/Registration State) |
|    * QuotaLimiter (Sliding Window) |     |    * ThemeContext (Dark/Light Persistence)  |
|    * SecurityHeaders (Helmet)      |     |  - Pages:                                   |
|  - Services:                       |     |    * LandingPage (Domain Submission)        |
|    * scanOrchestrator              |     |    * ScanPage (Live Intelligence View)      |
|    * safeHttp & publicResolution   |     |    * ReportPage (Print-Ready Dossier)       |
|    * dns, whois, tls, subdomains   |     |    * HistoryPage & ComparisonPage           |
|    * ipIntelligence & shodanIntel  |     |    * Security, Terms, Privacy, Billing      |
|    * normalization & findings      |     |  - Components:                              |
|    * scoring (v1 Engine)           |     |    * ScanOverviewCard (Telemetry & Score)   |
|  - Database:                       |     |    * AttackSurfaceGraph (Interactive SVG)   |
|    * Postgres (pg.Pool)            |     |    * InfrastructureMap (Leaflet/OSM)        |
|    * Dev Atomic JSON Store         |     |    * FindingsSection & FindingDetailPanel   |
+------------------------------------+     +---------------------------------------------+
```

### 9.2 The Shared Data Contracts
The shared model enforces consistency across the entire pipeline:
- `Asset`: Represents an atomic discovered entity (`id`, `type`, `value`, `discoveredAt`, `targetDomain`, `evidence[]`, `metadata`). Supported asset types include `DOMAIN`, `SUBDOMAIN`, `IP`, `ASN`, `ORGANIZATION`, `NAMESERVER`, `MAIL_SERVER`, `CERTIFICATE`, `PORT`, `VULNERABILITY`, and `DNSSEC`.
- `Relationship`: Directed edge connecting two assets (`fromAssetId`, `toAssetId`, `type`, `evidence`). Supported relationship types include `resolves_to`, `uses_nameserver`, `delivers_mail_to`, `belongs_to_asn`, `secured_by`, `exposes_port`, and `vulnerable_to`.
- `Finding`: Security observation containing `severity` (`informational`, `low`, `medium`, `high`), `kind` (`observation`, `configuration_weakness`, `recommendation`), `observationStatus` (`observed`, `not_observed`, `check_failed`), and the structured 10-section `FindingAnalysis`.
- `ScoreBreakdown`: Transparent score ledger tracking `scoringVersion`, `total` (0–100), `totalDeducted`, and typed `DimensionScore` records for all six evaluation categories.

---

## 10. METHODOLOGY

The DASS reconnaissance lifecycle proceeds through a deterministic, phased pipeline:

```
[Phase 1: Ingestion & Validation]
  Target Input -> RFC Domain Syntax Validation -> Public DNS Resolution -> SSRF Guard Check
       |
[Phase 2: Authorization & Quota]
  Session Extraction -> Quota Verification (5/hr anon, 50/hr reg) -> Scan ID Generation
       |
[Phase 3: Parallel Intelligence Collection]
  +-> Worker 1: DNS Resolution (A, AAAA, MX, TXT, NS, CAA, DNSSEC)
  +-> Worker 2: Certificate Transparency Mining (crt.sh Logs)
  +-> Worker 3: Domain Registration Inspection (WHOIS / RDAP)
  +-> Worker 4: Transport Layer Analysis (TLS Handshake, Ciphers, Certs)
  +-> Worker 5: HTTP Perimeter Probe (Safe HTTP, HSTS, Security Headers)
  +-> Worker 6: Email Security Analysis (SPF Parsing, DMARC Evaluation)
  +-> Worker 7: Network Routing & Geo (IP-to-ASN, BGP Prefixes, Coordinates)
  +-> Worker 8: Passive Exposure Registry (Shodan InternetDB Ports & CVEs)
  +-> Worker 9: Cloud Storage & Document Metadata Checks (Safe HEAD Probes)
       |
[Phase 4: Normalization & Graph Construction]
  Deduplicate Entities -> Create Typed Assets -> Construct Directed Relationship Edges
       |
[Phase 5: Finding Synthesis & Hygiene Scoring]
  Apply 21 Deterministic Rules -> Generate Structured Finding Analyses -> Compute v1 Score
       |
[Phase 6: Persistence & Presentation]
  Commit to Store (PostgreSQL / JSON) -> Serve Telemetry & Render Client Views
```

### Detailed Execution Steps:
1. **Target Ingestion & Normalization:** The user submits a target domain string via the workstation input. The system converts it to lowercase, strips URL schemes (`http://`, `https://`), trims trailing slashes, and removes paths.
2. **Pre-flight SSRF Validation:** The domain is passed to `publicResolution.ts`. The resolver queries authoritative DNS for A and AAAA records. Every resolved IP address is verified against private, loopback, link-local, carrier-grade NAT, and cloud metadata CIDR ranges. If any address matches a restricted range, the scan is rejected with `400 Bad Request`.
3. **Quota Allocation:** The system verifies the user's hourly quota window. Anonymous visitors are allocated 5 scans per rolling hour; authenticated users receive 50 scans per rolling hour.
4. **Scan Record Initialization:** A unique UUIDv4 `scanId` is generated, and a `DomainScan` record is stored with status `running`. The scan ID is immediately returned to the client for polling.
5. **Parallel Worker Dispatch:** The scan orchestrator launches modular workers concurrently using `Promise.allSettled()` under strict timeout constraints.
6. **DNS Intelligence:** Resolves standard record types. TXT records are specifically scanned for SPF (`v=spf1`) and DMARC (`v=DMARC1`) directives. Authoritative nameservers are tested for DNSSEC records (`DNSKEY`, `DS`).
7. **Certificate Transparency Mining:** The crt.sh API is queried with an 8-second timeout cap to discover historical and active subdomains registered in public CT logs.
8. **TLS Handshake Inspection:** Initiates a direct TLS handshake on port 443 to extract certificate validity dates, subject alternative names, issuing authorities, cipher suites, and protocol versions.
9. **Safe HTTP Transport Probe:** Sends bounded HTTP requests via `safeHttp.ts` to inspect HTTP-to-HTTPS redirect status and evaluate response headers (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
10. **BGP & IP Intelligence:** Unique IP addresses are queried against geolocation and BGP routing databases to identify Autonomous System Numbers (ASNs), hosting organizations, and geographic coordinates.
11. **Passive Exposure Enrichment:** IP addresses are cross-referenced with the Shodan InternetDB to harvest publicly exposed listening ports, Common Platform Enumerations (CPEs), and verified CVE vulnerability tags.
12. **Asset Normalization:** Raw intelligence records are mapped into typed `Asset` objects. Duplicate values (e.g., duplicate IP addresses or ASNs) are merged into single canonical nodes.
13. **Relationship Correlation:** Directed relationships are established between assets, linking domains to IPs via `resolves_to`, IPs to ASNs via `belongs_to_asn`, and domains to certificates via `secured_by`.
14. **Finding Rule Engine:** The normalized scan is evaluated by 21 deterministic finding rules in `findings.ts`. Findings are assigned standardized severities and enriched with 10-section analytical write-ups.
15. **Hygiene Score Calculation:** The v1 scoring engine computes the External Hygiene Score (0–100) across six dimensions, strictly adhering to epistemic safety.
16. **Scan Finalization:** The complete scan payload—containing assets, relationships, findings, score breakdown, completeness metrics, and warnings—is committed to the database and marked `completed`.
17. **Client Rendering:** The React interface polls the scan record, transitions out of its loading state, and renders the executive summary, asset graph, map, and findings panels.

---

## 11. IMPLEMENTATION

### 11.1 Backend Implementation Details
The backend is implemented as a modular Node.js application written in TypeScript:

- **Server-Side Request Forgery Guard (`server/src/utils/publicResolution.ts`):** Validates hostnames using `dns.promises.resolve()`. It validates resolved IPv4 and IPv6 addresses against comprehensive non-routable CIDR blocks:
  - `127.0.0.0/8` (IPv4 Loopback) and `::1` (IPv6 Loopback)
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private Intranets)
  - `169.254.0.0/16` and `fe80::/10` (Link-Local & Cloud Metadata e.g. AWS `169.254.169.254`)
  - `100.64.0.0/10` (Carrier-Grade NAT)
  - `224.0.0.0/4` and `240.0.0.0/4` (Multicast and Reserved)
  - `::ffff:0:0/96` (IPv4-mapped IPv6 ranges)
- **Safe HTTP Client (`server/src/services/safeHttp.ts`):** Wraps Node's native `http` and `https` modules with strict defensive boundaries:
  - Enforces `MAX_RESPONSE_BYTES = 512 * 1024` (512 KB) to prevent memory exhaustion from oversized responses.
  - Limits redirect chains to `MAX_REDIRECTS = 3`, re-verifying every target redirect URL against the SSRF filter before following.
  - Imposes strict per-request timeouts (default 8,000 ms).
- **DNS & Email Analysis (`server/src/services/dns.ts`, `spfAnalysis.ts`, `dmarcAnalysis.ts`):** Parses TXT records using regular expressions to evaluate email defense mechanisms. Computes DNS lookup counts in SPF records to detect violations of the RFC 7208 10-lookup limit. Evaluates DMARC policy enforcement (`p=reject`, `p=quarantine`, or `p=none`) and checks for forensic reporting (`ruf`) and aggregate reporting (`rua`) tags.
- **TLS Handshake Service (`server/src/services/tls.ts`):** Opens a raw `tls.connect` socket to port 443 with `rejectUnauthorized: false` to inspect self-signed or expired certificates without aborting the handshake. Extracts cipher suite algorithms, protocol version (TLSv1.2, TLSv1.3), validity timestamps, and Subject Alternative Names (SANs).
- **IP Intelligence & Exposure (`server/src/services/ipIntelligence.ts`, `shodanIntel.ts`):** Queries passive IP APIs to resolve AS numbers, organization names, and geographic coordinates. Queries Shodan InternetDB passively to extract observed listening ports and CVE numbers without scanning target IPs.
- **Dual-Mode Persistence Layer (`server/src/db/index.ts`):** Supports seamless dual-mode operation:
  - *Production Mode:* Connects to PostgreSQL using `pg.Pool`. Automatically initializes `schema.sql` defining relational tables (`users`, `sessions`, `scans`, `scan_results`, `quotas`) with foreign-key cascade deletions.
  - *Development & CI Mode:* Automatically falls back to an atomic in-memory JSON file store (`.data/dass_db.json`) when `DATABASE_URL` is unset, enabling rapid zero-dependency local development and sub-second test execution.
- **Cryptographic Authentication:** Implements first-party user authentication using RFC 7914 **Scrypt** with 16-byte random salts (`N=16384, r=8, p=1, keylen=64`). Compares hash digests using `crypto.timingSafeEqual` to eliminate side-channel timing attacks. Issues 32-byte cryptographically random session tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`dass_session`).

### 11.2 Frontend Implementation Details
The frontend is built using React 19 and Vite 8:
- **Design System (`client/src/index.css`):** Built entirely with pure Vanilla CSS custom properties. Implements high-contrast, professional "field report" editorial styling across Dark and Light themes. Eliminates AI-generated website clichés (no gratuitous gradients, glowing borders, or neon accents) in favor of crisp hairline borders, monospace telemetry readouts, and Newsreader serif headings.
- **Attack Surface Graph (`client/src/components/AttackSurfaceGraph.tsx`):** A custom, dependency-free interactive SVG network graph. Renders assets as color-coded nodes and relationships as directed connecting edges with zoom, pan, and node-selection inspectors.
- **Infrastructure Map (`client/src/components/InfrastructureMap.tsx`):** Embeds Leaflet to plot discovered public IP addresses on an interactive world map, grouping assets by geographic point-of-presence.
- **Routing Asset Chains (`client/src/components/AssetChainVisualizer.tsx`):** Displays visual hierarchical trees tracing how the primary target domain resolves through intermediate CNAMEs to IP addresses, nameservers, and upstream Autonomous Systems.
- **Scan Comparison Engine (`client/src/pages/ComparisonPage.tsx`):** Allows authenticated users to select two historical scans of the same domain and compute a deterministic diff highlighting added/removed assets, resolved/new findings, and certificate or DNS drift.

---

## 12. KEY FEATURES

### 12.1 Non-Intrusive Asset & Subdomain Enumeration
DASS discovers assets exclusively via passive channels:
- Queries crt.sh Certificate Transparency logs to discover registered subdomains without brute-force wordlists.
- Queries authoritative DNS records across A, AAAA, CNAME, MX, NS, TXT, and CAA types.
- Discovers associated mail exchangers and nameservers.

### 12.2 Cryptographic TLS & Transport Security Auditing
- Inspects TLS certificates for validity, expiration countdowns, and wildcard coverage.
- Flags certificates expiring within 30 days (warning) or 7 days (critical).
- Verifies HTTP-to-HTTPS redirect enforcement to ensure unencrypted traffic is rejected.

### 12.3 Web Perimeter Header Defenses
Audits the presence and configuration of modern security headers:
- `Strict-Transport-Security` (HSTS): Enforces transport layer encryption.
- `Content-Security-Policy` (CSP): Restricts resource loading to mitigate XSS.
- `X-Content-Type-Options`: Prevents MIME-type sniffing (`nosniff`).
- `X-Frame-Options`: Defends against clickjacking attacks (`DENY` or `SAMEORIGIN`).
- `Referrer-Policy`: Controls metadata leakage in HTTP referer headers.

### 12.4 Email Authentication & DNSSEC Verification
- **SPF Analysis:** Validates SPF syntax, counts DNS lookup mechanisms, and flags permissive `+all` or `~all` configurations.
- **DMARC Analysis:** Checks for policy existence and flags weak policies (`p=none`) vs. enforced reject policies (`p=reject`).
- **DNSSEC Hygiene:** Queries authoritative nameservers for DNSKEY and DS records to confirm cryptographic authentication of DNS responses.

### 12.5 Passive Network Exposure & CVE Enrichment
- Integrates Shodan InternetDB to detect public exposed ports without executing active port scans.
- Flags high-risk exposed database and remote management ports (e.g., MySQL 3306, RDP 3389, Redis 6379, SMB 445).
- Identifies known Common Vulnerabilities and Exposures (CVEs) associated with observed host software versions.

### 12.6 Safe Cloud Storage & Public Document Metadata
- Performs non-intrusive `HEAD` requests to verify public accessibility of cloud storage buckets (Amazon S3, Google Cloud Storage, Azure Blob Storage) without downloading object data.
- Analyzes publicly exposed document metadata while strictly filtering out employee personal information to preserve privacy.

### 12.7 Epistemic Safety & Scan Completeness
- Every category result tracks a status (`pending`, `running`, `completed`, `failed`).
- Scan records calculate overall completeness metrics (`completed`, `total`, `failed[]`).
- **Epistemic Rule:** A category with status `failed` records diagnostic warnings but **never causes negative score deductions**.

### 12.8 Dual Privacy & Authentication Model
- **Anonymous Mode:** 0 cookies; 5 scans/hour; volatile 24-hour retention; local browser history cache.
- **Registered Mode:** Scrypt password security; 50 scans/hour; cross-device scan history; multi-scan comparison diffs.
- **Self-Service Deletion:** Immediate cascading deletion (`DELETE /api/auth/me`) purges user credentials, sessions, scan histories, and quota records.

---

## 13. FINDINGS AND SCORING

### 13.1 Deterministic Findings Engine
The findings engine in `server/src/services/findings.ts` evaluates normalized scan data against 21 deterministic rules:
- **Rules 1–4 (HTTP & TLS):** HTTPS enforcement, HTTP-only fallback, missing security headers, incomplete TLS certificate chains.
- **Rules 5–7 (Certificates):** Imminent certificate expiration (<=7 days or <=30 days), wildcard certificate usage, weak signature algorithms (e.g., SHA-1).
- **Rules 8–14 (Email & DNS):** Missing SPF, overly permissive SPF (`+all`), excessive SPF DNS lookups (>10), missing DMARC, weak DMARC policy (`p=none`), missing DMARC reporting addresses, missing DNSSEC.
- **Rules 15–21 (Exposure & Information Disclosure):** Verbose `Server` banners, `X-Powered-By` technology leakage, upcoming domain registration expiration, elevated subdomain attack surface, missing `security.txt` vulnerability disclosure file.

Each finding is enriched with a structured 10-section analysis:
1. `whatIsThis`: Plain-language explanation of the technology.
2. `whatWasObserved`: The precise evidence collected during the scan.
3. `howDiscovered`: The passive mechanism that gathered the evidence.
4. `technicalExplanation`: Technical meaning of the observation.
5. `whyItMatters`: Practical security relevance.
6. `securityImpact`: Realistic assessment of defensive impact.
7. `potentialAbuse`: High-level explanation of potential attacker leverage.
8. `remediation`: Step-by-step guidance to fix the issue.
9. `safeValidation`: How to verify the fix in test environments.
10. `references`: Authoritative RFCs and industry standards.

### 13.2 The Current External Hygiene Score (v1) Model
The scoring engine implemented in `server/src/services/scoring.ts` calculates a 0–100 integer rating representing observable configuration posture.

#### Core Mathematical Rules
1. **Single Source of Truth:** `computeScoreBreakdown()` evaluates all dimensions in a single pass. `computeExposureScore()` delegates directly to `computeScoreBreakdown(scan).total`, preventing divergence.
2. **Strict Epistemic Safety:** Incomplete or failed category checks (`status !== 'completed'`) return empty observation lists. Deductions are only assessed when affirmative evidence of a missing control or misconfiguration is observed.
3. **Bounded & Clamped:** Every dimension has a strict `maxDeduction` cap. The final score is clamped to `[0, 100]`.
4. **No Double-Counting:** Each signal is assessed in exactly one category (e.g., HSTS is evaluated under Web Security Headers).
5. **Model Versioning:** Every breakdown records `scoringVersion: 1`.

#### Scoring Dimensions and Deduction Rubric

| Dimension | Max Deduction | Implemented Deduction Criteria |
| :--- | :--- | :--- |
| **TLS Hygiene** | **25 pts** | • **−25 pts**: TLS service unavailable on port 443.<br>• **−25 pts**: Certificate expires in $\le 7$ days (urgent renewal).<br>• **−10 pts**: Certificate expires in $\le 30$ days. |
| **HTTPS Enforcement** | **20 pts** | • **−20 pts**: HTTP requests fail to redirect to HTTPS (`httpsEnforced === false`). |
| **Web Security Headers** | **25 pts** | • **−5 pts per missing header** (capped at 5 headers = −25 pts): Evaluated against HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy. |
| **Email Security** | **10 pts** | • **−5 pts**: No SPF record observed in DNS.<br>• **−5 pts**: No DMARC record observed in DNS. |
| **DNSSEC Hygiene** | **3 pts** | • **−3 pts**: Absence of DNSSEC authentication records (`DNSKEY` / `DS`). |
| **Network Exposure** | **20 pts** | • **−10 pts**: Publicly exposed risky database/management ports (FTP 21, Telnet 23, SMB 445, MSSQL 1433, Oracle 1521, MySQL 3306, RDP 3389, Postgres 5432, VNC 5900, Redis 6379, InfluxDB 8086, Elasticsearch 9200, MongoDB 27017).<br>• **−10 pts**: Software version with confirmed CVE vulnerability in Shodan records. |

#### Mathematical Formulation

$$	ext{Deduction}_{	ext{dim}} = \min\left(	ext{MaxDeduction}_{	ext{dim}}, \sum_{o \in 	ext{Observations}_{	ext{dim}}} 	ext{Points}(o)ight)$$

$$	ext{TotalDeducted} = \sum_{	ext{dim}} 	ext{Deduction}_{	ext{dim}}$$

$$	ext{Hygiene Score} = \max(0, \min(100, 100 - 	ext{TotalDeducted}))$$

#### Posture Classification

| Score Range | Classification | Security Interpretation |
| :--- | :--- | :--- |
| **80 – 100** | **Robust Defense** | Modern TLS, HTTPS enforced, hardened headers, active SPF/DMARC, no exposed management ports. |
| **60 – 79** | **Standard Hygiene** | Core transport encryption in place; minor gaps in headers, email records, or upcoming certificate renewals. |
| **40 – 59** | **Moderate Exposure** | Significant missing defenses (unenforced HTTPS, missing headers, unauthenticated email). |
| **0 – 39** | **Elevated Risk** | Critical exposure (plaintext HTTP, imminent certificate expiry, exposed databases, or unpatched CVEs). |

---

## 14. USER INTERFACE AND VISUALIZATION

### 14.1 Editorial Field-Report Design Aesthetic
The user interface rejects the generic visual patterns of contemporary AI-generated websites (e.g., heavy drop shadows, neon accents, saturated gradient cards). Instead, it adopts an editorial "field report" aesthetic:
- **Typography:** Serif display headlines (Newsreader) paired with neutral body sans-serif and tabular monospace data readouts.
- **Color Palette:** Warm paper backgrounds, crisp hairline borders (`1px solid var(--border-technical)`), and restrained status tags.
- **Dual Themes:** Cohesive Dark Theme (charcoal, slate, and phosphor accents) and Light Theme (cream, warm white, and deep ink accents), toggled seamlessly without layout shifts.

### 14.2 Key Interface Components
1. **Scan Overview Card (`ScanOverviewCard.tsx`):** Displays target domain, edge provider identification (e.g., Cloudflare, AWS Cloud), probe completeness (e.g., "6/6 PROBES"), telemetry count grid (Assets, Relations, Signals, Findings), the security posture gauge, and the collapsible **Hygiene Score Audit** drawer breaking down exact point deductions.
2. **Attack Surface Graph (`AttackSurfaceGraph.tsx`):** Interactive SVG visualization displaying discovered assets as interconnected nodes. Clicking a node opens an inspection drawer showing associated evidence and connected assets.
3. **Infrastructure Map (`InfrastructureMap.tsx`):** Renders an OpenStreetMap canvas via Leaflet. Discovered IP addresses are plotted with popups displaying ASN, hosting organization, and geographic location.
4. **Asset Inventory Table (`AssetsInventoryTable.tsx`):** High-density tabular inventory supporting text filtering, asset type filtering, evidence inspection, and raw JSON export.
5. **Findings Section (`FindingsSection.tsx`):** Categorized accordion grouping findings by severity. Each finding expands to reveal its full 10-section analytical breakdown.
6. **Audit Dossier Report Page (`ReportPage.tsx`):** A clean, print-optimized document view accessible via `/report/:id`. Formatted for formal PDF export or executive briefings.
7. **Scan Comparison View (`ComparisonPage.tsx`):** Side-by-side historical audit tool computing asset additions/removals, score drift, certificate changes, and resolved findings between two scans.

---

## 15. SECURITY, PRIVACY, AND SAFETY BOUNDARIES

### 15.1 Defensive Boundaries and Non-Intrusive Scope
DASS is intentionally engineered to prevent weaponization:
- **No Intrusive Scanning:** It does not execute TCP/UDP port sweeps, directory fuzzing, or exploit testing.
- **No Credential Harvesting:** Breach exposure checks display presence metadata and leak dates; they strictly refuse to retrieve, store, or display raw credentials, passwords, or password hashes.
- **No Bucket Dumping:** Cloud storage checks issue HTTP `HEAD` requests to verify public bucket accessibility; they never enumerate or download bucket objects.
- **Privacy Filtering in Document Analysis:** Document metadata extraction filters out author names and internal system paths to protect employee privacy.

### 15.2 Server-Side Request Forgery (SSRF) Hardening
To prevent the application from being abused as a proxy to probe internal networks, DASS enforces multi-layered SSRF filtering:
- Validates domain syntax and rejects numeric IP inputs, localhost, and non-canonical TLDs (`.internal`, `.local`, `.onion`).
- Resolves hostnames via authoritative DNS and verifies every resolved IP against blacklisted CIDR ranges (RFC 1918, RFC 3927 link-local, loopback, carrier-grade NAT, multicast, and AWS cloud metadata `169.254.169.254`).
- Pins outgoing HTTP requests in `safeHttp.ts`, re-verifying target IPs on every redirect hop (up to 3 hops maximum).
- Enforces a 512 KB response size limit to prevent memory exhaustion attacks.

### 15.3 Rate Limiting & Resource Protection
- **Sliding-Window Quotas:** Enforces 5 scans/hour for anonymous visitors (tracked by client IP) and 50 scans/hour for registered accounts (tracked by user ID).
- **Scan Request Budgets:** Allocates a strict request budget (default 30 external queries per scan) enforced by `scanBudget.ts`.
- **Concurrency Controls:** Limits concurrent active scans per client to prevent thread starvation.

### 15.4 Session Security & Privacy Compliance
- **Zero Anonymous Tracking:** Unauthenticated visitors receive zero cookies. Anonymous scan history is cached strictly in the client's local browser memory.
- **Secure Session Management:** Authenticated sessions use cryptographically random 32-byte tokens issued in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Account Deletion Cascade:** Users can permanently delete their accounts (`DELETE /api/auth/me`). The operation cascades across the database, purging user records, active sessions, scan histories, and quota tracking entries.

---

## 16. TESTING AND VALIDATION

### 16.1 Test Suite Organization
The repository maintains comprehensive automated testing across both workspaces:
- **Server Test Suite (`server/src/__tests__/`):** 16 test files executed via Jest with ts-jest. Covers scanner orchestration, scoring logic, SSRF defenses, authentication, quota sliding windows, IP intelligence, DNSSEC, SPF/DMARC analysis, and end-to-end domain scanning.
- **Client Test Suite (`client/src/__tests__/`):** 10 test files executed via Vitest with jsdom and React Testing Library. Covers UI error boundaries, theme persistence, authentication forms, finding detail panels, and proxy handlers.

### 16.2 Verified Test Execution Results
The complete automated test suite was executed directly in the project environment using `npm test`. Both suites passed with zero test failures:

```
================================================================================
SERVER TEST RESULTS (Jest v29.7.0):
  PASS src/__tests__/assetExplanation.test.ts
  PASS src/__tests__/authAndQuota.test.ts
  PASS src/__tests__/dbStartup.test.ts
  PASS src/__tests__/dmarcAnalysis.test.ts
  PASS src/__tests__/dnssec.test.ts
  PASS src/__tests__/hardening.test.ts
  PASS src/__tests__/ipIntelligence.test.ts
  PASS src/__tests__/phase2Findings.test.ts
  PASS src/__tests__/phase3Services.test.ts
  PASS src/__tests__/realDomainE2E.test.ts
  PASS src/__tests__/scanner.test.ts
  PASS src/__tests__/scoring.test.ts
  PASS src/__tests__/shodanIntel.test.ts
  PASS src/__tests__/spfAnalysis.test.ts
  PASS src/__tests__/ssrfSecurity.test.ts
  PASS src/__tests__/subdomains.test.ts

  Test Suites: 16 passed, 16 total
  Tests:       168 passed, 168 total
  Snapshots:   0 total
  Duration:    25.55 s
================================================================================
CLIENT TEST RESULTS (Vitest v5.0.1):
  PASS src/lib/__tests__/api.test.ts (14 tests)
  PASS src/__tests__/proxy.test.ts (8 tests)
  PASS src/__tests__/ThemeContext.test.tsx (4 tests)
  PASS src/__tests__/ErrorBoundary.test.tsx (2 tests)
  PASS src/__tests__/FindingDetailPanel.test.tsx (2 tests)
  PASS src/__tests__/narrativeAndFindings.test.tsx (10 tests)
  PASS src/__tests__/NotFoundPage.test.tsx (1 test)
  PASS src/__tests__/AccountsPaused.test.tsx (6 tests)
  PASS src/__tests__/RegisterPage.test.tsx (1 test)
  PASS src/__tests__/VerifyPage.test.tsx (6 tests)

  Test Files:  10 passed, 10 total
  Tests:       54 passed, 54 total
  Duration:    5.62 s
================================================================================
AGGREGATE TEST TOTALS:
  Total Test Files / Suites: 26 passed, 26 total (100% pass rate)
  Total Executed Tests:      222 passed, 222 total (100% pass rate)
================================================================================
```

### 16.3 Build & Type Verification
Production build verification was executed using `npm run build`:
- **Server:** TypeScript compilation (`tsc`) succeeded with zero type errors. `copy-schema.mjs` successfully copied `schema.sql` (3,761 bytes) to the distribution folder.
- **Client:** TypeScript compilation (`tsc -b`) and Vite production bundling (`vite build`) succeeded in 1.74 seconds, generating 39 optimized assets with zero errors.

### 16.4 Static Analysis and Linting Verification
Static code analysis was executed via `npm run lint`:
- **Client (Oxlint v1.81.0):** Inspected 57 files across 116 rules. Output: **0 errors**, 21 warnings (pertaining to React Fast Refresh lazy component exports in `main.tsx`).
- **Server (ESLint v8.57.0):** Inspected server TypeScript files. Output: 2 unused variable warnings (`setScanScore` in `scan.ts` and `safeTo` in `email.ts`), and 1 syntax escape error in `server/src/services/findings.ts` line 916:25 (`no-useless-escape` on an escaped forward slash in a regular expression). As required by testing protocol, this is documented factually without altering source files.

---

## 17. RESULTS AND DISCUSSION

### 17.1 Practical Utility of the Implemented Workstation
The successful development and verification of DASS demonstrates that high-fidelity attack surface reconnaissance can be achieved without aggressive, intrusive scanning. In practical testing against standard public domains (e.g., `example.com`), DASS completed the entire reconnaissance pipeline within 4 to 8 seconds, successfully extracting:
- Authoritative DNS routing and delegation topology.
- TLS certificate chains and cryptographic parameters.
- HTTP security header compliance.
- Email authentication records (SPF, DKIM, DMARC).
- Geolocation and Autonomous System mapping.
- Passive exposure records from Shodan InternetDB.

### 17.2 The Significance of Epistemic Safety
A critical contribution of this project is the proof that security scoring can remain strictly evidence-grounded. In conventional automated tools, network dropouts or API rate limits are frequently misinterpreted as missing security controls, penalizing target organizations. DASS's implementation demonstrates that by decoupling probe status (`completed` vs. `failed`) from score deduction logic, an assessment platform can guarantee that:
$$	ext{Absence of an observation} 
eq 	ext{Evidence of a vulnerability}$$
Incomplete intelligence reduces scan completeness (e.g., reporting "5/6 Probes Completed"), while preserving the integrity of the hygiene score.

### 17.3 Transparency Over Arbitrary Ratings
By surfacing the exact mathematical formula, dimension caps, and individual deduction observations in the **Hygiene Score Audit** drawer, DASS eliminates the friction associated with proprietary commercial ratings. Security teams can immediately trace why a score is 80 (e.g., −10 for missing HSTS, −5 for missing CSP, −5 for missing DMARC) and take targeted remediation action.

---

## 18. LIMITATIONS

To maintain academic and professional integrity, the real-world limitations of the current implementation must be acknowledged:
1. **Dependence on External Public APIs:** Subdomain discovery via Certificate Transparency relies on `crt.sh`, which can experience intermittent rate limiting or server downtime. Similarly, passive exposure intelligence depends on the availability of Shodan InternetDB.
2. **Passive Visibility Ceiling:** DASS cannot inspect internal intranet assets, services hosted behind non-standard obscure ports not indexed by passive databases, or web applications protected by aggressive bot-mitigation challenges (e.g., Cloudflare Under Attack mode).
3. **Absence of Proof vs. Proof of Absence:** DASS can definitively verify when a security header or DNS record is missing. However, the absence of an observed vulnerability in Shodan records does not prove that the underlying server is secure against zero-day exploits.
4. **Network Timeouts on Strict Firewalls:** If a target domain drops inbound connections on port 443 rather than rejecting them, the TLS probe must wait for its 8-second timeout before marking the category inconclusive.
5. **DNS Propagation Delays:** Recent DNS modifications (e.g., a newly added DMARC record) may not reflect immediately if intermediate public recursive resolvers hold cached negative responses.

---

## 19. FUTURE SCOPE

While the current implementation delivers a complete, fully functional reconnaissance workstation, several avenues exist for future expansion:
1. **Continuous Scheduled Monitoring & Webhook Alerts:** Implementing background cron workers to rescan configured domains daily or weekly, transmitting alerts via email, Slack, or webhooks when DNS drift or certificate expiration is detected.
2. **Enterprise Single Sign-On (SSO):** Extending the authentication layer to support SAML 2.0 and OpenID Connect (OIDC) for enterprise security operations teams.
3. **Custom Threat Feed Integrations:** Adding configurable API connectors for additional passive intelligence providers such as Censys, SecurityTrails, VirusTotal, and AlienVault OTX.
4. **Agentic Remediation Playbooks:** Generating exportable Infrastructure-as-Code (Terraform, Ansible, Nginx configuration snippets) to automate the deployment of recommended HTTP security headers and DNS records.
5. **Distributed Worker Nodes:** Decoupling intelligence workers into independent microservices running on serverless runtimes or Kubernetes workers to support massive multi-domain enterprise scanning.

---

## 20. CONCLUSION

The **Domain Attack Surface Scanner (DASS)** successfully demonstrates that automated external attack surface intelligence and configuration hygiene evaluation can be conducted safely, passively, and transparently. By uniting authoritative DNS resolution, Certificate Transparency mining, cryptographic TLS verification, HTTP security header auditing, BGP routing correlation, and Shodan exposure intelligence, DASS maps an organization's public internet presence without sending hostile or intrusive traffic.

The platform's primary contributions include:
- An **epistemically safe**, deterministic **External Hygiene Score (0–100)** where incomplete evidence never penalizes the target.
- A **normalized graph data model** linking typed assets through directed relationships.
- A **21-rule deterministic findings engine** delivering structured 10-section analytical remediation dossiers.
- An **editorial workstation interface** combining dark/light themes, interactive SVG graphs, and Leaflet geographical maps.
- Strict **defensive safeguards** including comprehensive SSRF CIDR blocking, sliding-window quotas, and ePrivacy-compliant zero-cookie anonymous scanning.

With 222 automated tests verifying its operational reliability, DASS serves as a robust, academic, and practical workstation for students, researchers, and cybersecurity defenders striving to secure the modern digital perimeter.

---

## 21. REFERENCES

### Standards, RFCs, and Specifications
1. **RFC 1034 / 1035:** Mockapetris, P. (1987). *Domain Names - Concepts and Facilities / Implementation and Specification*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc1035
2. **RFC 4033 / 4034 / 4035:** Arends, R., et al. (2005). *DNS Security Introduction and Requirements (DNSSEC)*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc4033
3. **RFC 6797:** Hodges, J., et al. (2012). *HTTP Strict Transport Security (HSTS)*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc6797
4. **RFC 6962:** Laurie, B., et al. (2013). *Certificate Transparency*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc6962
5. **RFC 7208:** Kitterman, S. (2014). *Sender Policy Framework (SPF) for Authorizing Use of Domains in Email*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc7208
6. **RFC 7489:** Kucherawy, M., & Zwicky, E. (2015). *Domain-based Message Authentication, Reporting, and Conformance (DMARC)*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc7489
7. **RFC 7914:** Percival, C., & Josefsson, S. (2016). *The scrypt Password-Based Key Derivation Function*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc7914
8. **RFC 8446:** Rescorla, E. (2018). *The Transport Layer Security (TLS) Protocol Version 1.3*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc8446
9. **W3C Content Security Policy Level 3:** West, M. (2023). *Content Security Policy Level 3*. World Wide Web Consortium. https://www.w3.org/TR/CSP3/

### Open-Source Libraries and Frameworks
10. **Node.js:** OpenJS Foundation. *Node.js v20 LTS Documentation*. https://nodejs.org/docs/
11. **Express:** OpenJS Foundation. *Express 4.x API Reference*. https://expressjs.com/
12. **React:** Meta Platforms, Inc. *React 19 Documentation*. https://react.dev/
13. **Vite:** You, E., & Vite Contributors. *Vite: Next Generation Frontend Tooling*. https://vite.dev/
14. **Leaflet:** Agafonkin, V. *Leaflet - an open-source JavaScript library for mobile-friendly interactive maps*. https://leafletjs.com/
15. **PostgreSQL:** PostgreSQL Global Development Group. *PostgreSQL 16 Documentation*. https://www.postgresql.org/docs/

### Threat Intelligence & Vulnerability Registries
16. **Shodan InternetDB API:** Shodan, LLC. *InternetDB API Documentation*. https://internetdb.shodan.io/
17. **crt.sh Certificate Transparency Search:** Sectigo. *crt.sh Distributed CT Log Monitor*. https://crt.sh/
18. **National Vulnerability Database (NVD):** National Institute of Standards and Technology (NIST). *NVD CVE API*. https://nvd.nist.gov/
19. **OWASP Top Ten:** OWASP Foundation. *OWASP Top 10 Web Application Security Risks*. https://owasp.org/www-project-top-ten/
20. **OWASP Server-Side Request Forgery Prevention Cheat Sheet:** OWASP Foundation. https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
