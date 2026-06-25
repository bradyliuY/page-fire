# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in PageFire, please **do not open a public issue**.

Instead, email: **bradyliuy@gmail.com**

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will respond within 72 hours and aim to patch critical issues within 7 days.

## Scope

Issues in scope:
- Authentication bypass (MCP token validation)
- Path traversal / Zip Slip in file upload
- XSS via SVG or HTML content injection into admin UI
- Denial-of-service via zip bomb or oversized uploads
- Information disclosure (token leakage, directory listing)

Out of scope:
- Content hosted by end users (PageFire intentionally serves user HTML as-is to browsers)
- Issues requiring physical access to the server
