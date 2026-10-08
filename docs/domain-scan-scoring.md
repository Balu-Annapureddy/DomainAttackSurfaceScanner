# External Hygiene Score (v1)

The External Hygiene Score assigns an integer rating from **0 to 100** summarizing observable public-facing configuration posture across passive OSINT signals. It is an explainable configuration hygiene summary, not an active exploitability index.

## Core Architectural Principles

1. **Single Source of Truth**: The integer score and the detailed per-dimension breakdown are computed from a single pass over scan evidence. `computeExposureScore()` delegates directly to `computeScoreBreakdown()`.
2. **Epistemic Safety**: A failed, incomplete, pending, or inconclusive category check **never** deducts points. Deductions are only levied when a category has definitively completed (`status === 'completed'`) and affirmative evidence of a missing control or misconfiguration is observed. Incomplete evidence reduces completeness, not posture.
3. **Bounded & Clamped**: Each dimension is strictly bounded by its defined `maxDeduction`. The total score is clamped to `[0, 100]`.
4. **Deterministic & Explainable**: Every deduction corresponds to an explicit human-readable observation explaining what was missing or observed and how many points were deducted.
5. **No Double-Counting**: Controls are assessed in exactly one category (e.g., HSTS is evaluated once within Web Security Headers).
6. **Model Versioning**: Scans carry `scoringVersion: 1` in `ScoreBreakdown` to allow historical scans to be compared accurately without retrofitting future model weight adjustments.

---

## Dimension Breakdown & Rubric

The score starts at **100 points**. Deductions are subtracted based on observed configuration weaknesses across 6 dimensions:

| Dimension | Max Deduction | Criteria & Point Deductions |
| :--- | :--- | :--- |
| **TLS Hygiene** | **25 pts** | • **−25 pts**: TLS service not available on port 443.<br>• **−25 pts**: TLS certificate expiring within 7 days (urgent renewal required).<br>• **−10 pts**: TLS certificate expiring within 30 days. |
| **HTTPS Enforcement** | **20 pts** | • **−20 pts**: Plain HTTP requests fail to redirect to HTTPS (`httpsEnforced === false`). |
| **Web Security Headers** | **25 pts** | • **−5 pts per missing header** (up to 5 headers, capped at −25 pts): Evaluated against headers like `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`. |
| **Email Security** | **10 pts** | • **−5 pts**: No SPF record observed in DNS.<br>• **−5 pts**: No DMARC record observed in DNS. |
| **DNSSEC Hygiene** | **3 pts** | • **−3 pts**: Absence of DNSSEC authentication records (`DNSKEY` / `DS`). |
| **Network Exposure** | **20 pts** | • **−10 pts**: Publicly exposed risky management or database ports (FTP 21, Telnet 23, SMB 445, MSSQL 1433, Oracle 1521, MySQL 3306, RDP 3389, Postgres 5432, VNC 5900, Redis 6379, InfluxDB 8086, Elasticsearch 9200, MongoDB 27017).<br>• **−10 pts**: Host running software version with confirmed CVE vulnerability in Shodan passive records. |

Total potential deductions across all dimensions: **103 points**. The resulting score is clamped to `[0, 100]`.

---

## Formula

$$\text{Total Deductions} = \sum_{\text{dim} \in \text{Dimensions}} \min(\text{maxDeduction}_{\text{dim}}, \sum \text{Deductions}_{\text{dim}})$$

$$\text{Hygiene Score} = \max(0, \min(100, 100 - \text{Total Deductions}))$$

---

## Posture Classification

| Score Range | Classification | Meaning |
| :--- | :--- | :--- |
| **80 – 100** | **Robust Defense** | Modern TLS, HTTPS enforcement, active email defenses, and hardened security headers with no exposed database/management ports. |
| **60 – 79** | **Standard Hygiene** | Foundational transport security in place; minor gaps in headers, email authentication records, or upcoming certificate renewals. |
| **40 – 59** | **Moderate Exposure** | Significant missing defenses such as unenforced HTTPS, multiple missing protective headers, or unauthenticated email domains. |
| **0 – 39** | **Elevated Risk** | Critical exposure, such as unencrypted traffic, imminent certificate expiration, exposed sensitive administrative ports, or unpatched CVEs. |

