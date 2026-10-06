<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UX wskazówki właściciela

- Po wyborze godziny na osi pokaż od razu pogodę dla tego czasu bezpośrednio poniżej. Widzialność, chmury i wiatr nie powinny wymagać dodatkowego kliknięcia ani być za formularzem.
- Używaj naturalnego języka dla początkującego pasażera. Kody TEMPO/BECMG i surowe komunikaty mogą pozostać w opcjonalnych objaśnieniach.
- Oś jest głównym widokiem. Oceny na niej przekazuj wysokością, kolorem i ikonami; pomoc pozostaje domyślnie schowana.
- Upraszczaj podstawowe zadania i ograniczaj liczbę kliknięć. Formularz czasu, przypomnienia i informacje techniczne mają wspierać odczyt pogody.
