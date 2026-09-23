# Domain exposure scoring

The scanner assigns a 0-100 exposure score to summarize the domain's public-facing hygiene. The score is intentionally heuristic and designed for presentation: it is a pragmatic summary of passive signals, not a vulnerability rating.

## Formula

- Start at 100
- Subtract 6 points for each missing key security header from the HTTPS response (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Subtract 15 points if HTTPS is not available or if the site does not redirect from plain HTTP to HTTPS
- Subtract 20 points if no valid TLS certificate is available or if the certificate is expired
- Subtract 10 points if the certificate expires within 30 days, or 25 points if it expires within 7 days
- Subtract up to 10 points for a large number of discovered subdomains, as a non-threatening informational signal
- Subtract 5 points when WHOIS data is heavily redacted or privacy-protected, because the ownership footprint is less transparent
- Clamp the final value to 0-100

This keeps the metric simple, explainable, and useful for a student-facing security dashboard while remaining honest that it is based on passive observations rather than active exploitation testing.
