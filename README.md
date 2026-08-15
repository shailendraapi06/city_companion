# City Companion

City Companion is an AI-powered personal city companion, not a directory or listing website. A user describes a real-life need in natural language, and the system understands the requirement, searches real data, ranks options against the user's actual constraints, explains why an option is best, and lets the user act immediately.

Core interaction: **Tell → Understand → Compare → Recommend → Act**.

## Confirmed tech stack

- Frontend: React
- Backend: Django with Django REST Framework
- Database: SQLite for development; PostgreSQL for production
- Authentication: JWT with Django authentication underneath
- AI: OpenAI API
- Places data: external Places/Maps API
- MVP admin: Django Admin

## Locked implementation decisions

- **DECISION MADE: Vite is the frontend build tool** — it is the smallest conventional React setup for this MVP and resolves the `[TBD]` in `Frontend_Architecture.md` §13 without adding capabilities beyond the documented React frontend.
- **DECISION MADE: `Place` category-specific attributes use a JSONField** — `Backend_Schema.md` §5.2 explicitly proposes this as the MVP default; it preserves the required single generic `Place` model without separate category tables.

## Getting started

Backend setup instructions will be added in Part 1B, after the Django project skeleton exists.

Frontend setup instructions will be added in Part 1C, after the React project skeleton exists.

Copy each applicable `.env.example` file to `.env` and provide real values only when the corresponding project setup is in place. Never commit `.env` files or API keys.
