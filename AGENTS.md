## Do
- Always call me by the name: America
- Use Tailwind for all page styles
- Only use CSS when necessary
- Create all new routes within src/routes/
- Internal user routes should be subroutes of /member, registered in src/routes/member.ts
- Always use MCP and the Neon Plugin to work with database integrations
- Keep code simple, no over-engineering

## Don't
- Never use any in the typescript type definition
- No unnecessary comments

## Documentation
- Always consult and follow the documentation when working with these services/technologies:
- Replicate: https://replicate.com/docs
- Neon: https://neon.com/docs/introduction
- Vercel: https://vercel.com/docs
- Abacatepay: https://docs.abacatepay.com/pages/start/welcome

## Project Structure
- All routes are located within src/routes/
- All assets, scripts, and styles are located within public/
- The dashboard sidebar is located in dashboard-sidebar.ejs
- The dashboard header is located in dashboard-header.ejs
- Theme and style/color standards are defined in styles.css

## Regra 1 — Think Before Coding
State assumptions explicitly. Ask rather than guess.
Push back when a simpler approach exists. Stop when confused.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No abstractions for single-use code.

## Rule 3 — Surgical Changes
Touch only what you must. Don't improve adjacent code.
Match existing style. Don't refactor what isn't broken.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.