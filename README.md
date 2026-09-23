# Domain Attack Surface Scanner

Domain Attack Surface Scanner is a passive reconnaissance dashboard for understanding a
domain's publicly visible internet footprint. It reads public WHOIS/RDAP data, DNS records,
Certificate Transparency records, live TLS certificates, HTTP responses, and intentionally
published web metadata.

It does not brute-force, exploit, bypass authentication, or probe private systems. Only public
domain names are accepted, and the scanner rejects IP addresses, localhost, and common internal
hostname patterns.

## Features

- Asynchronous `POST /api/scan` jobs with polling through `GET /api/scan/:scanId`
- WHOIS/RDAP ownership dates, registrar data, nameservers, and privacy status
- A, AAAA, MX, TXT, NS, and CNAME DNS records
- Certificate Transparency subdomain discovery via `crt.sh`
- Live TLS certificate details, validity, SANs, protocol, and authorization state
- HTTP and HTTPS headers, redirect behavior, server signals, and security-header gaps
- Passive checks for `robots.txt`, `sitemap.xml`, and `/.well-known/security.txt`
- Explainable 0-100 external hygiene score
- Browser-local scan history
- In-memory results with a 24-hour TTL

## Project layout

```text
client/       React, TypeScript, Vite, Tailwind CSS
server/       Node.js, TypeScript, Express
shared/       Request and response contracts
docs/         Architecture, security, testing, deployment, and scoring notes
```

## Getting started

Requirements: Node.js 18 or newer and npm 9 or newer.

```bash
npm install
npm run dev
```

The client runs on `http://localhost:5173` and the API runs on `http://localhost:3001`.
Copy `.env.example` to `.env` when changing the default port or client origin.

## Validation

```bash
npm run build
npm test
npm run lint
```

## Responsible use

Scan domains you own or are authorized to assess. The data sources are public and the checks are
deliberately limited to passive lookups and ordinary web responses.
