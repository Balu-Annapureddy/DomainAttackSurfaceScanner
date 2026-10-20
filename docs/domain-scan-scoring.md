# External Hygiene Score (v2)

The External Hygiene Score is a deterministic **0–100 configuration-hygiene summary** based only on completed, evidence-backed public observations. It is **not an exploitability score** and does not replace a penetration test or vulnerability assessment.

## Why v2 replaced the previous model

The previous v1 engine used six coarse dimensions with large deductions (e.g. −20 for unenforced HTTPS, −25 for unavailable TLS). That made a single observation dominate the score and could make otherwise healthy domains appear disproportionately weak.

Version 2 expands to **twelve weighted dimensions** with smaller, evidence-specific deductions. The total possible deduction is **120 points** across all categories, but the score is clamped to a 0–100 range, so partial weaknesses have proportional impact without any single category being able to drive the score below zero.

## Score formula

```
Score = clamp(100 − TotalDeducted, 0, 100)
```

Each dimension is independently capped at its maximum deduction. A failed, pending, or incomplete check category **never deducts points**.

## Dimension weights (v2 — 12 categories)

| # | Dimension | Max deduction |
|---|---|---:|
| 1 | TLS Hygiene | 20 |
| 2 | HTTPS Enforcement | 15 |
| 3 | Web Security Headers | 15 |
| 4 | Email Security (SPF/DMARC) | 10 |
| 5 | DNSSEC Hygiene | 3 |
| 6 | Network Exposure (ports/CVEs) | 15 |
| 7 | Certificate Chain Correctness | 7 |
| 8 | Subdomain Takeover Risk | 15 |
| 9 | Domain & WHOIS Hygiene | 5 |
| 10 | Cookie Security | 5 |
| 11 | CORS Misconfiguration | 5 |
| 12 | Breach Exposure | 5 |
| | **Total theoretical maximum** | **120** |

---

## 1. TLS Hygiene — 20 points

Observations derived from the TLS handshake on port 443:

| Observation | Deduction |
|---|---:|
| TLS service not observed on port 443 (connection refused) | −5 |
| Certificate not authorized by the client trust store | −4 |
| Certificate expires within 7 days | −3 |
| Certificate expires within 8–30 days | −1 |
| Observed legacy TLS protocol below TLS 1.2 | −4 |

Connection timeouts and network failures are treated as **inconclusive** and never deduct points. Deductions only apply when TLS is definitively confirmed absent or a specific weakness is observed.

---

## 2. HTTPS Enforcement — 15 points

| Observation | Deduction |
|---|---:|
| HTTP requests are not redirected to HTTPS (confirmed) | −5 |
| Strict-Transport-Security (HSTS) header not observed | −4 |

HSTS is scored here rather than in Web Security Headers so it cannot be double-counted. An inconclusive HTTP outcome (network failure or timeout) never triggers the redirect deduction.

---

## 3. Web Security Headers — 15 points

| Observation | Deduction |
|---|---:|
| Content-Security-Policy missing | −5 |
| X-Content-Type-Options missing | −3 |
| X-Frame-Options (or equivalent framing control) missing | −3 |
| Referrer-Policy missing | −2 |
| Permissions-Policy missing | −2 |
| Other reported missing security headers | −1 each (capped at dimension max) |

HSTS is excluded from this dimension (it belongs to HTTPS Enforcement above).

---

## 4. Email Security — 10 points

### SPF

| Observation | Deduction |
|---|---:|
| No SPF record observed | −4 |
| SPF uses `+all` (permit all senders) | −4 |
| SPF uses `?all` (neutral) | −2 |
| SPF uses `~all` (softfail) | −1 |
| SPF with strict `-all` | no deduction |

### DMARC

| Observation | Deduction |
|---|---:|
| No DMARC record observed | −4 |
| `p=none` (monitoring only) | −3 |
| `p=quarantine` | −1 |
| `p=reject` | no deduction |

### MX

| Observation | Deduction |
|---|---:|
| No MX records observed | −1 (with explanatory note) |

DKIM is not penalised because the scanner has no selector-independent DKIM observation method.

---

## 5. DNSSEC Hygiene — 3 points

| Observation | Deduction |
|---|---:|
| No DNSSEC (DNSKEY/DS) cryptographic records observed | −3 |

---

## 6. Network Exposure — 15 points

Passive Shodan InternetDB data is used; no active port scanning is performed.

| Observation | Deduction |
|---|---:|
| Potentially risky database/management ports observed on public hosts | −5 |
| One or more distinct CVE identifiers in passive exposure data | −5 |
| Exposure signals across three or more public hosts | −3 |

Risky ports include: 21 (FTP), 23 (Telnet), 445 (SMB), 1433 (MSSQL), 1521 (Oracle), 3306 (MySQL), 3389 (RDP), 5432 (PostgreSQL), 5900 (VNC), 6379 (Redis), 8086 (InfluxDB), 9200 (Elasticsearch), 27017 (MongoDB).

---

## 7. Certificate Chain Correctness — 7 points

| Observation | Deduction |
|---|---:|
| TLS certificate SANs do not cover the target domain (hostname mismatch) | −5 |
| TLS certificate chain is incomplete (intermediate CA not served by host) | −2 |

Only evaluated when TLS is confirmed available.

---

## 8. Subdomain Takeover Risk — 15 points

| Observation | Deduction |
|---|---:|
| Confirmed subdomain takeover: dangling CNAME pointing to unclaimed external resource | −15 |

Only confirmed takeovers (not candidate signals) trigger this deduction.

---

## 9. Domain & WHOIS Hygiene — 5 points

These are **soft signals** — individually they are not confirmed problems, and are labeled as such in the UI.

| Observation | Deduction |
|---|---:|
| Domain registered within the last 30 days | −2 |
| Registrant contact details publicly visible (no privacy proxy/redaction) | −3 |

---

## 10. Cookie Security — 5 points

Applied to session-like cookies (heuristically detected by name patterns such as `session`, `token`, `auth`):

| Observation | Deduction |
|---|---:|
| Session cookie missing `Secure` flag | −2 per cookie |
| Session cookie missing `HttpOnly` flag | −2 per cookie |
| Session cookie missing `SameSite` attribute | −1 per cookie |

The dimension cap (5 pts) prevents a single poorly-configured application from dominating the score.

---

## 11. CORS Misconfiguration — 5 points

| Observation | Deduction |
|---|---:|
| `Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true` | −5 |

This specific combination is the only CORS pattern scored, as it is a confirmed dangerous misconfiguration (browsers reject this combination; origin-reflected CORS with credentials is more dangerous but requires active probing).

---

## 12. Breach Exposure — 5 points

| Observation | Deduction |
|---|---:|
| Historical public breach records observed for domain | −5 |

This is a **context signal**, not a current vulnerability indicator.

---

## Epistemic safety principles

A failed, pending, or incomplete category **never produces a deduction**.

> **Failure to observe a control is not automatically evidence that the control is absent.**

Specific protections:
- Connection timeouts and network errors → inconclusive, zero deduction
- Missing or unknown data fields → no deduction
- Soft signals (WHOIS age, contact privacy) → ≤3 pts, explicitly labeled as soft in the UI
- Unknown is never treated as absent

---

## Determinism and explainability

Every deduction contains a human-readable observation string. The UI can answer *why* a domain received its score without hiding the calculation behind an opaque model.

`computeExposureScore()` delegates directly to `computeScoreBreakdown()`, so the displayed integer score and detailed audit breakdown are guaranteed to be consistent.

---

## Scoring version

Current model: **`scoringVersion: 2`**

Historical scans retain their original `scoringVersion` so future rule changes do not silently rewrite historical scores.

---

## Score interpretation

| Score | Classification |
|---:|---|
| 90–100 | Excellent |
| 75–89 | Good |
| 60–74 | Fair |
| 40–59 | Needs Improvement |
| 0–39 | Poor |

These labels describe **observable external configuration hygiene**, not guaranteed security or exploitability.

---

## Important limitation

The scoring model evaluates only signals the current scanner actually collects. It deliberately does not fabricate deductions for controls whose underlying data is unavailable (CAA, DKIM, full HSTS values, etc.).