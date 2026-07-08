---
description: Kør hele QA-boardet af persona-subagents mod BagUp og saml deres fund i qa-report.md
---

Du skal køre et fuldt QA-board mod den nuværende kodebase i `src/` (og relevante rod-filer som `api/scan.js`, `supabase/schema.sql`) og samle resultatet i én rapport. Følg disse trin præcist:

## 1. Kør alle QA-agents

Kør følgende 6 agents via Task-tool'et, med `subagent_type` sat til agentens navn:

- `qa-ny-bruger`
- `qa-power-user`
- `qa-mobil-pwa`
- `qa-sikkerhed`
- `qa-data`
- `qa-design`

Start dem **parallelt** (flere Task-kald i samme svar) medmindre værktøjet/miljøet kun tillader sekventiel kørsel — i så fald køres de sekventielt, men uden at vente unødvendigt mellem dem. Giv hver agent samme kontekst: at de skal læse relevant kode i `src/` og aflevere en prioriteret fundliste (KRITISK/HØJ/MELLEM/LAV) med fil-reference og konkret reproduktion eller kodested, og at de **ikke** må ændre kode.

## 2. Saml og deduplikér fund

Når alle agents er færdige:

- Saml alle fund i én liste.
- Deduplikér fund der reelt beskriver samme underliggende problem (samme fil/kodested og samme grundårsag), selvom flere agents har fundet det fra hver deres vinkel — slå dem sammen til ét fund, men nævn hvilke perspektiver der pegede på det hvis det er relevant for prioriteringen.
- Behold den højeste prioritet blandt de sammenlagte fund, hvis flere agents vurderede samme fund forskelligt.

## 3. Skriv qa-report.md

Skriv en samlet rapport til **`qa-report.md` i repo-roden** (opret filen hvis den ikke findes, overskriv hvis den gør) med denne struktur:

```markdown
# QA-rapport — BagUp

_Genereret: <dato>_

## Top 5 vigtigste fund

1. ...
2. ...
3. ...
4. ...
5. ...

## KRITISK

- **[fil:linje]** Beskrivelse — reproduktion/kodested

## HØJ

...

## MELLEM

...

## LAV

...
```

Sortér fund efter prioritet (KRITISK øverst), og inden for hver prioritet efter hvor konkret/handlingsbar reproduktionen er.

## 4. Afrapportér til brugeren

Efter rapporten er skrevet, giv brugeren en kort opsummering i chatten (ikke hele rapporten) — antal fund pr. prioritet, og de 5 vigtigste fund i kort form, med reference til at den fulde rapport ligger i `qa-report.md`.
