# Security Policy

## Supported versions

Only the deployed production app ([room-tba.uplb.tools](https://room-tba.uplb.tools)) and the latest release receive security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

- Preferred: [GitHub private vulnerability reporting](https://github.com/uplbtools/room-tba/security/advisories/new)
- Or contact the maintainer privately: [stimmie.dev](https://stimmie.dev)

Include steps to reproduce and the affected URL or endpoint. You should hear back within a few days; fixes for confirmed reports ship as fast as the team can manage (this is a volunteer student project).

## Scope notes

- Editor/admin actions are password-gated; report any way to write data without the editor login.
- Donations run through PayMongo checkout; no card or wallet details touch our servers.
- Campus map data is public by design (CC-BY); "data you can read without login" is usually not a vulnerability.
