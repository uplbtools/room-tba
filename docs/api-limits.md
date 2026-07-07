# API limits

Public list endpoints cap client-supplied pagination. Invalid numeric params
return `400`; finite values above the max are clamped.

| Endpoint | Default | Max | Notes |
| --- | ---: | ---: | --- |
| `GET /api/classes` | 50 | 100 | Omitted `limit`/`offset` returns the first page, not the full class table. |
| `GET /api/admin/aliases` | 50 | 200 | Editor-only route; uses the same parser. |

`GET /api/classes?room_code=...` still returns the bounded room schedule payload
for one room.
