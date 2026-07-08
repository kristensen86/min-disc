---
description: Kør hele QA-boardet af persona-subagents mod BagUp og saml deres fund i qa-report.md
---

Du skal køre et fuldt QA-board mod den nuværende kodebase i `src/` (og relevante rod-filer som `api/scan.js`, `supabase/schema.sql`) og samle resultatet i én rapport. Følg disse trin præcist:

## 1. Find og kør alle QA-agents

Find **dynamisk** alle agent-definitioner i `.claude/agents/` hvis filnavn starter med `qa-` (fx via `ls .claude/agents/qa-*.md`) — kør ikke en hardkodet liste, da nye QA-personaer kan være tilføjet siden sidst. For hver fundet fil, brug filnavnet uden `.md` som `subagent_type` i et Task-kald.

Start dem **parallelt** (flere Task-kald i samme svar) medmindre værktøjet/miljøet kun tillader sekventiel kørsel — i så fald køres de sekventielt, men uden at vente unødvendigt mellem dem. Giv hver agent samme kontekst: at de skal læse relevant kode i `src/` (og `api/scan.js`/`supabase/` hvor relevant for deres fokus) og aflevere en prioriteret fundliste (KRITISK/HØJ/MELLEM/LAV) med fil-reference og konkret reproduktion eller kodested, og at de **ikke** må ændre kode.

## 2. Saml og deduplikér fund

Når alle agents er færdige:

- Saml alle fund i én liste, og notér for hvert fund hvilken agent (persona-navn, fx "Reviewer-Rob"/`qa-reviewer-rob`) der fandt det.
- Deduplikér fund der reelt beskriver samme underliggende problem (samme fil/kodested og samme grundårsag), selvom flere agents har fundet det fra hver deres vinkel — slå dem sammen til ét fund, men behold en liste over **alle** agents der pegede på det (flere personaer der uafhængigt finder samme problem er selv et signal om alvorlighed — nævn det ved sammenlægning).
- Behold den højeste prioritet blandt de sammenlagte fund, hvis flere agents vurderede samme fund forskelligt.

## 3. Skriv qa-report.md

Skriv en samlet rapport til **`qa-report.md` i repo-roden** (opret filen hvis den ikke findes, overskriv hvis den gør) med denne struktur:

```markdown
# QA-rapport — BagUp

_Genereret: <dato>_
_Agents kørt: <liste over alle qa-*-agents der indgik i denne kørsel>_

## Top 5 vigtigste fund

1. ... _(fundet af: <persona(er)>)_
2. ...
3. ...
4. ...
5. ...

## KRITISK

- **[fil:linje]** Beskrivelse — reproduktion/kodested _(fundet af: <persona(er)>)_

## HØJ

...

## MELLEM

...

## LAV

...
```

Sortér fund efter prioritet (KRITISK øverst), og inden for hver prioritet efter hvor konkret/handlingsbar reproduktionen er. Angiv altid hvilke(n) agent(s)/persona(er) der fandt hvert enkelt fund, så det er sporbart hvilken vinkel der opdagede det.

## 4. Afrapportér til brugeren

Efter rapporten er skrevet, giv brugeren en kort opsummering i chatten (ikke hele rapporten) — antal fund pr. prioritet, og de 5 vigtigste fund i kort form, med reference til at den fulde rapport ligger i `qa-report.md`.
