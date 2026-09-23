# Security boundaries

The scanner is intentionally passive:

- It accepts public domain names, not IP addresses or internal hostnames.
- It rejects localhost and common private naming patterns before any outbound request.
- It uses public WHOIS/RDAP, DNS, Certificate Transparency, TLS, and ordinary HTTP responses.
- It only requests `robots.txt`, `sitemap.xml`, and `/.well-known/security.txt` as published metadata.
- It does not brute-force names, enumerate private networks, submit attack payloads, or attempt
  authentication.
- Helmet and restricted CORS are enabled at the API boundary.
- Scan creation is limited to 10 requests per IP per hour.
- Category failures are isolated and returned as explicit unavailable states.

Users should scan only domains they own or are authorized to assess. Public availability of a
data source does not grant permission to misuse the resulting information.
