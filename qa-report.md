# QA-rapport — BagUp

_Genereret: 2026-07-08_
_Agents kørt: qa-brugt-jesse (Jesse), qa-data (Dara), qa-design (Uma), qa-form-dan (Dan), qa-hype-finn (Finn), qa-journalist-charlie (Charlie), qa-mobil-pwa (Mia), qa-ny-bruger (Nina), qa-power-simon (Simon), qa-power-user (Peter), qa-reviewer-rob (Rob), qa-sikkerhed (Sofus)_

## Top 5 vigtigste fund

1. **Persistering læner sig kun på et upålideligt `beforeunload`-flush — ugemte ændringer kan tabes stille ved lukning/baggrund på mobil.** `src/hooks/useDebouncedPersist.js` bruger en 800ms debounce uden `sendBeacon`/`keepalive`, og har ingen `visibilitychange`-fallback. Ramte manifestationer: tabt override efter mold-skift/vægt-redigering, "solgt"-status der springer tilbage til "til salg" ved genåbning. _(fundet af: Peter, Jesse, Simon, Dara — 4 agenter uafhængigt)_
2. **Auth-token-refresh kan tavst overskrive ugemte redigeringer.** `onAuthStateChange` (`src/App.jsx:91-99`) trigger en fuld state-genindlæsning fra serveren ved ethvert auth-event, inkl. periodisk baggrunds-token-refresh — uden merge mod aktuel in-memory state. En redigering foretaget i det smalle vindue inden debounce-flush kan forsvinde sporløst. _(fundet af: Simon, Dara — 2 agenter uafhængigt)_
3. **`/api/scan` er en fuldstændig uautentificeret, gratis proxy til Anthropic API.** Intet auth-tjek, ingen rate-limiting, ingen CORS-restriktion — enhver der kender URL'en kan sende vilkårlige `messages` og generere ubegrænsede API-omkostninger på Kims konto. `api/scan.js:1-27`. _(fundet af: Sofus)_
4. **Flight-tal-overrides (S/G/T/F) gemmes helt uvalideret — fysisk umulige tal fremstår som fakta.** `min`/`max`/`step` er kun kosmetiske HTML-attributter; `onChange` clamper aldrig (`src/components/ui.jsx:115-116`, `DiscScanner.jsx:658-659`). En disc kan gemmes med fx Turn=8/Fade=-3 og vises uændret i Flight Matrix og flight-badges. _(fundet af: Dan, Rob — 2 agenter uafhængigt)_
5. **Salgslistens træk-og-sortér virker slet ikke på touch.** `SalePanel.jsx` bruger HTML5 Drag-and-Drop (`draggable`/`onDragStart` m.fl.), som ikke understøttes af touch på iOS/Android — en kernefunktion er reelt ubrugelig på appens primære platform (mobil/PWA). _(fundet af: Mia)_

---

## KRITISK

- **[`src/hooks/useDebouncedPersist.js`]** Debounced persist flusher kun via `beforeunload` uden `sendBeacon`/`keepalive` og uden `visibilitychange`-fallback — ugemte skrivninger kan tabes ved app-lukning/baggrund på mobil/PWA, hvor `beforeunload` ofte slet ikke fyrer. Ramte flows: override-gemning efter redigering, "markér som solgt" (`App.jsx:436-449`). Reproduktion: rediger vægt på en disc, luk/swipe appen væk inden for 800ms → ændringen forsvinder uden fejl. _(fundet af: qa-power-user, qa-brugt-jesse, qa-power-simon, qa-data)_

- **[`src/App.jsx:91-99, 110-244`]** `onAuthStateChange` sætter et nyt `authUser`-objekt ved ethvert auth-event (inkl. periodisk `TOKEN_REFRESHED`), hvilket trigger load-effekten til at genindlæse al state fra Supabase og overskrive den uden merge mod in-memory state. Reproduktion: lang session, rediger en disc lige inden JWT-refresh fyrer → redigeringen overskrives af serverens (ældre) snapshot. _(fundet af: qa-power-simon, qa-data)_

- **[`api/scan.js:1-27`]** Intet auth-/session-tjek, ingen rate-limiting, ingen CORS-restriktion på `/api/scan`. Kun `model`-prefix og `max_tokens≤2048` valideres. Reproduktion: `curl -X POST https://<domain>/api/scan -d '{"model":"claude-...","messages":[...]}'` kan gentages ubegrænset og generere reelle Anthropic-omkostninger på Kims konto — helt uafhængigt af appens UI-flow. _(fundet af: qa-sikkerhed)_

- **[`src/components/ui.jsx:115-116`, `src/components/DiscScanner.jsx:658-659`]** Flight-tal (S/G/T/F) clampes aldrig ved gemning — `min`/`max`/`step` er kun HTML-pynt uden `<form>`-submit til at håndhæve dem. Reproduktion: tast Turn=8, Fade=-3 eller Speed=99 i en disc's flight-editor og gem — værdierne persisteres og vises som om de var reelle specs i Flight Matrix, badges og flight-bane. _(fundet af: qa-form-dan, qa-reviewer-rob)_

- **[`src/components/SalePanel.jsx`]** Salgslistens drag-sortering er implementeret med HTML5 Drag-and-Drop API (`draggable`, `onDragStart`/`onDragOver`/`onDrop`), som ikke virker med touch på mobile browsere. Reproduktion: åbn Salg-fanen på telefon, forsøg at trække en disc til ny position via grip-håndtaget — intet sker. _(fundet af: qa-mobil-pwa)_

- **[`src/components/DiscScanner.jsx:239-317`]** Enhver fetch-fejl ud over `AbortError` (inkl. `TypeError: Failed to fetch` ved manglende netværk) rammer samme catch-gren og viser "Kunne ikke genkende disc'en" — vildledende når problemet reelt er intet netværk. Ingen `navigator.onLine`-tjek findes. _(fundet af: qa-mobil-pwa)_

- **[`src/components/DiscScanner.jsx:218-318`, `App.jsx:906-907`]** `AbortController` for scan-kald (og `photoEnhance.js`'s egen) er en lokal variabel uden `useEffect`-cleanup ved unmount — lukkes scanneren midt i et kald, kører requesten videre i baggrunden. Reproduktion: åbn scanner → tag billede → luk med det samme → gentag 30x hurtigt → op til 30 ikke-annullerede kald mod `/api/scan` kører videre samtidigt. _(fundet af: qa-power-simon)_

- **[`src/store.js:9-15`, `src/App.jsx:117-244`]** `store.get()` fanger enhver exception (netværksfejl, timeout, RLS-fejl) og returnerer `null`, umuligt at skelne fra "ingen data" — udløser stille fallback til (evt. forældet) localStorage ved **hvert** app-load, ikke kun ved første migrering. Kan efterfølgende overskrive cloud-data via debounced persist. _(fundet af: qa-data)_

- **[`src/App.jsx:119-138`]** Legacy-migrering af `owned` (streng-array → `{uid,discId}`) genererer nye tilfældige uid'er ved hvert kørsel og er ikke idempotent — samtidige logins/delvis fejl kan gøre `overrides` forældreløse mod et uid-batch der aldrig committes. _(fundet af: qa-data)_

- **[`src/App.jsx:698-726`]** "Mine discs"-listen renderer alle 200+ `DiscCard`-instanser uden virtualisering/paginering, og ingen komponent i kodebasen bruger `React.memo` — enhver state-ændring re-renderer alle synlige kort. _(fundet af: qa-power-user)_

- **[`src/components/PlasticCombobox.jsx:19`, `src/data/plastics.js:1-40`]** Plast-forslag falder tilbage til hele den tværgående liste for en lang række reelle mærker pga. navne-mismatch mellem disc-databasens mærkenavne og `PLASTICS_BY_BRAND`-nøgler (fx "Axiom Discs" vs. "Axiom", "Legacy" vs. "Legacy Discs"). Modsiger CLAUDE.md's garanti om mærke-afgrænsede forslag. _(fundet af: qa-reviewer-rob)_

- **[`src/components/FlightEditor.jsx:248`, `DiscScanner.jsx:830-836`, `App.jsx:922-927,952`]** BIN håndhæves reelt ikke ved "til salg"-markering trods CLAUDE.md's krav om at BIN altid er påkrævet — en disc kan lægges i salgslisten uden BIN-pris sat. _(fundet af: qa-brugt-jesse)_

- **[`src/App.jsx:373-380`]** Genaktivering af en arkiveret salgsdisc med "reducér BIN 10%" justerer kun BIN, aldrig MP — kan skabe MP > BIN uden nogen advarsel eller sammenligning i koden. _(fundet af: qa-brugt-jesse)_

- **[`src/components/DiscScanner.jsx:252-270`]** Vision-prompten instruerer ikke Claude om at signalere "ukendt mold"/lav-konfidens for helt nye molds — confidence er ren selvvurdering uden nogen liste af kendte molds at validere imod, så hallucinerede men plausible specs kan komme ind med "høj" konfidens. _(fundet af: qa-hype-finn)_

- **[`src/App.jsx:932-943`]** "Tilføj til min samling" (direct-add) fabrikerer stille standardtal (Speed 7/Glide 5/Turn 0/Fade 2) når Claude ærligt returnerer `null` for flight-tal på en ukendt mold — uden nogen markering af at tallene er gættet/default fremfor faktiske specs. _(fundet af: qa-hype-finn)_

- **[`src/components/FlightEditor.jsx:171`, `DiscScanner.jsx:757`]** Slid (condition) er kun synligt/redigerbart hvis discen er markeret "til salg" — der findes intet `pWear`-felt (nævnt i CLAUDE.md's datamodel) i koden; kun `condition` findes, hardkodet til salgskonteksten. En disc i bag'en, der ikke er til salg, har ingen måde at få registreret slid. _(fundet af: qa-form-dan)_

- **[`src/components/DiscCard.jsx`, `BagDetail.jsx`, `BagComparison.jsx`, `FlightMatrix.jsx`]** Midrange-typens dokumenterede "outline i stedet for solid glow"-regel (`typeSignalStyle` i `constants.js`) følges kun af `FlightBadge` — alle andre steder (disc-kort, bag-visning, Flight Matrix-markører) bruger solid glow/fyld for alle typer inkl. Midrange, i strid med CLAUDE.md's dokumenterede designregel. _(fundet af: qa-design)_

- **[`src/components/RoundTracker.jsx:4-8`]** Filen definerer sit eget farve-/komponent-system (`C`-objekt med afvigende brand-farve #f2c14e i stedet for #0cb9a7, egen `btn()`/`NumberField`/`Empty`) helt uafhængigt af `constants.js`/`ui.jsx` — en reelt separat visuel identitet i samme app. _(fundet af: qa-design)_

- **[`ImageAdjuster.jsx:78,157`, `DiscScanner.jsx:121`, `constants.js:2`]** Hardkodet `"#182018"` for raised-baggrund matcher ikke længere den faktiske `C.raised` (`#18201c`) — beviser at farve-literals allerede er drevet ud af sync med designsystemets kilde. _(fundet af: qa-design)_

- **[`src/App.jsx:560`]** Med `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` sat (som i produktion) blokerer `LoginScreen` fuldstændigt uden konto — der findes intet reelt "prøv uden login"-flow, i modsætning til hvad CLAUDE.md's "localStorage som fallback" antyder. Kræver desuden emailbekræftelse før login. _(fundet af: qa-ny-bruger)_

## HØJ

- **[`supabase/schema.sql`, `src/photoStorage.js:5-19`]** Storage-bucket "disc-photos" har ingen synlige/versionsstyrede RLS-policies i schemaet — kan ikke auditeres om upload/læs/slet er korrekt bundet til `auth.uid()`. _(fundet af: qa-sikkerhed)_
- **[`api/scan.js`]** Ingen CORS/origin-restriktion betyder en ondsindet tredjeparts-side kan få en besøgendes browser til at POST'e til `/api/scan` og udløse omkostninger, selv uden at kunne læse svaret. _(fundet af: qa-sikkerhed)_
- **[`src/utils.js:79-91`, `DiscCard.jsx:122`, `CreateDiscForm.jsx:7-14`, `App.jsx:935`]** Stabilitets-pille og type-badge genberegnes aldrig ud fra opdaterede turn/fade-overrides — fryser til oprettelses-/katalogtidspunktet, selvom flight-bane-visningen for samme disc korrekt bruger de nye tal. Samme stabilitetsformel er desuden duplikeret tre uafhængige steder i kodebasen (risiko for drift). _(fundet af: qa-form-dan, qa-reviewer-rob)_
- **[`src/components/DiscScanner.jsx:209-216,661`]** "Std: X"-referencen i scanneren opdateres ikke når brugeren vælger en anden disc via Navn/Mærke-autocomplete — viser stadig det oprindelige (evt. fejlscannede) gæts fabrikstal. _(fundet af: qa-form-dan)_
- **[`src/components/FlightMatrix.jsx:37-118`]** Gruppe-/label-collision-beregning kører fuldt ud på hver render uden `useMemo` — O(groups²)-agtigt mønster der bliver mærkbart med 150-200+ grupper (typisk for en samler med mange varianter af samme mold). _(fundet af: qa-power-user)_
- **[`src/components/SalePanel.jsx:133-140`]** `orderedDiscs` bruger indlejrede `.find()/.some()/.includes()` i stedet for et Map-opslag på uid — O(n·m)-mønster ved mange til-salg-discs. _(fundet af: qa-power-user)_
- **[`src/components/BagDetail.jsx`]** Ingen memoization overhovedet (i modsætning til `BagComparison.jsx`, som gør det korrekt) — `resolvedOwned`/`filtered`/`entryDiscs` genberegnes fra bunden ved hvert tastetryk i søgefeltet, med `.find()` i loop for hver bag-entry. _(fundet af: qa-power-user)_
- **[`src/utils.js:5-18,47`, `DiscScanner.jsx:267,332`]** `hexToRgb`/`nearestStdColor` antager altid rent 6-cifret hex; et ugyldigt format fra AI-scanneren (aldrig valideret før gemning) giver `NaN`-afstande, hvor loopet aldrig opdaterer `best` — disc'en tælles stille som "rødt" i Stats uanset faktisk farve. _(fundet af: qa-journalist-charlie)_
- **[`src/components/StatsPanel.jsx:39,51`, `CreateDiscForm.jsx:35`]** Mærke- og plastoptælling fragmenteres af fritekst/store-og-små-bogstaver uden normalisering — "Star" og "star" tælles som to separate rækker. _(fundet af: qa-journalist-charlie)_
- **[`src/components/FlightEditor.jsx:208,234`, `DiscScanner.jsx:788,817`]** MP/BIN-validering er kun kosmetisk (rød fejltekst) — hverken "Gem" eller "Tilføj til min samling" blokeres af en ugyldig MP-uden-BIN-kombination. _(fundet af: qa-brugt-jesse)_
- **[`src/components/SaleTextGenerator.jsx:29-39`]** Facebook-tekst-eksporten matcher ikke grid-nummereringen (X.Y) fra salgsbilledet — en køber kan ikke matche "nummer 2.3" til AI-teksten, som desuden ikke garanterer at alle discs er med. _(fundet af: qa-brugt-jesse)_
- **[`src/App.jsx:436-449`]** `markAsSold` gemmer altid udbudsprisen (BIN), aldrig den faktiske aftalte pris — enhver forhandling giver en for høj `totalRevenue` i salgshistorikken. _(fundet af: qa-brugt-jesse)_
- **[`src/App.jsx:457-467`]** Sletning af en custom disc renser ikke ønskelisten — en ghost-reference bliver siddende permanent i `wishlist`-state og inflaterer wishlist-badge uden nogen UI-vej til at fjerne den. _(fundet af: qa-hype-finn)_
- **[`src/App.jsx:912-914`]** Auto-match mod databasen i scan-flowet er kun exact-match (ikke fuzzy som i redigeringsformens autocomplete) — mindre afvigelser i Vision-gættet skaber overflødige `custom_`-duplikater. _(fundet af: qa-hype-finn)_
- **[`src/App.jsx:938-939`]** Tomt navn/mærke fra Vision bliver på direct-add-stien stille til en permanent "Ukendt disc"/"Ukendt"-post, som forurener mærke-statistikken uden advarsel. _(fundet af: qa-hype-finn)_
- **[`src/components/ui.jsx`]** Den delte typografiske skala (`textTitle`/`textCaption`) bruges næsten ingen steder — overskrifter/labels på tværs af appen er ad hoc og matcher ikke skalaen. _(fundet af: qa-design)_
- **[`ui.jsx:65-79`, `MoldPickerModal.jsx:51-59`, `BagDetail.jsx`]** Type-filter-chips/pills implementeret tre forskellige gange med forskellig padding/radius/vægt for samme interaktionsmønster. _(fundet af: qa-design)_
- **[`DiscCard.jsx:186-192`, `LoginScreen.jsx:73-77`]** Intet defineret success/info-token — feedback-beskeder låner vilkårligt farve fra type-paletten (`C.brand` vs. `C.midrange` for samme UI-rolle). _(fundet af: qa-design)_
- **[`CollectorStatus.jsx:67,71`, `FlightBadge.jsx:11`]** Monospace-typografi hardkodes ad hoc i stedet for at bruge den allerede eksporterede `dataMono()`. _(fundet af: qa-design)_
- **[`src/data/plastics.js`]** Store, udbredte mærker (bl.a. Infinite Discs) mangler helt fra `PLASTICS_BY_BRAND` — falder til den flade tværgående liste. _(fundet af: qa-reviewer-rob)_
- **[`CreateDiscForm.jsx`, `DiscScanner.jsx:640-647`]** `type` er et frit valg helt afkoblet fra `speed`-værdien ved oprettelse/redigering — Speed 13 kan gemmes med Type "Putter" uden advarsel. _(fundet af: qa-reviewer-rob)_
- **[`src/App.jsx:583-585,906-967`]** Efter et scan hopper appen ikke til "Mine"-fanen — ingen synlig bekræftelse på at discen blev gemt. _(fundet af: qa-ny-bruger)_
- **[`src/components/BagDetail.jsx:118-122`]** Tom-bag "Discs"-visning giver ingen handling/henvisning til Søg-fanen, i modsætning til alle andre tomme tilstande i appen. _(fundet af: qa-ny-bruger)_
- **[`index.html:9`, mangler `env(safe-area-inset-top)`]** `black-translucent` statusbar uden top-safe-area — header-indhold kan overlappes af notch/Dynamic Island i den installerede PWA. _(fundet af: qa-mobil-pwa)_
- **[`DiscScanner.jsx:433-435`, `MoldPickerModal.jsx:35-37`, `OverflowMenu.jsx:60-62`, `ImageAdjuster.jsx:311-313`]** Luk-krydser på fuldskærms-overlays har kun ~26-28px klikbart areal, under anbefalet 44×44px. _(fundet af: qa-mobil-pwa)_
- **[`src/components/DiscCard.jsx:17-21`, `FlightEditor.jsx:19-32`]** `handleChangeMold` kalder `onChangeMold` uden først at gemme — `FlightEditor` remountes ved moldskift og alle ugemte lokale ændringer (vægt, note, farve, foto) går tabt i selve klik-øjeblikket. _(fundet af: qa-power-simon)_
- **[`src/App.jsx:517-518`, `BagDetail.jsx:184-190`]** `addInstanceToBag` tjekker ikke om instansen allerede er i bagen, og "+"-knappen har ingen debounce — hurtigt dobbeltklik kan skabe duplikerede bag-entries for samme disc. _(fundet af: qa-power-simon)_
- **[`api/scan.js`, `DiscScanner.jsx:277,313-317`]** Ingen 429/retry-håndtering — alle fejl (inkl. rate-limits ved bulk-scanning) viser samme generiske besked uden backoff eller cooldown. _(fundet af: qa-power-simon)_
- **[`src/App.jsx` — mangler `delete overrides[uid]`]** `removeFromOwned`/`deleteCustomDisc` fjerner aldrig den tilhørende `overrides[uid]`-post — permanent lækage i JSON-blob'en, og race med igangværende foto-upload kan efterlade et forældreløst foto i Storage uden nogen reference der peger på det. _(fundet af: qa-data)_
- **[`src/App.jsx:327-331`]** `removeFromOwned` renser aldrig `bags[].bagEntries` — permanente ghost-entries og forkert (for højt) disc-antal vist i bag-listen. _(fundet af: qa-data)_

## MELLEM

- **[`supabase/schema.sql:4-9`]** `user_data.value` har ingen størrelses-/skemavalidering — kun ejerskab håndhæves via RLS, ikke indholdets gyldighed. _(fundet af: qa-sikkerhed)_
- **[`src/App.jsx:116-244`]** Migrations-flowet stoler blindt på klient-kontrolleret localStorage-struktur uden typetjek af nøstede felter. _(fundet af: qa-sikkerhed)_
- **[`ui.jsx` `FlightNumberQuad`]** Intet felt/prop for slid/condition ved siden af flight-tallene — de vises aldrig samtidig i UI'et. _(fundet af: qa-form-dan)_
- **[`constants.js:34`, `FlightBadge.jsx:37-45`]** Dødt "kategorisk slid"-koncept (ny/brugt/beat-in, `WearBadge`) er fuldt implementeret men aldrig renderet nogen steder. _(fundet af: qa-form-dan)_
- **[`ui.jsx:116` vs. `DiscScanner.jsx:659`]** Inkonsistent håndtering af tomt tal-felt — én formular bevarer `""`, den anden gør et tømt felt til `0`. _(fundet af: qa-form-dan)_
- **[`src/App.jsx:660,891`]** Ejerskabstælling pr. disc i søg/ønskeliste bruger lineær `.filter()` i stedet for en forudberegnet Map, selvom mønsteret allerede findes andre steder i samme fil. _(fundet af: qa-power-user)_
- **[`FlightMatrix.jsx:39-44,210-212,371-372`]** Gruppering sker på afrundede flyvetal, ikke uid — flere fysiske eksemplarer af samme mold kan visuelt "arve" foto/farve fra kun den først-indsatte instans (`gd[0]`). _(fundet af: qa-power-user)_
- **[`BagDetail.jsx:32-41`]** Ingen paginering i "tilføj disc til bag"-listen, i modsætning til `MoldPickerModal`'s korrekte `visibleCount`-mønster. _(fundet af: qa-power-user)_
- **[`StatsPanel.jsx:47,51`]** Farve-/plast-sektioner dropper stille discs uden data sat, uden forbehold-tekst (i modsætning til Ø Vægt-sektionen, som viser "X registreret"). _(fundet af: qa-journalist-charlie)_
- **[`StatsPanel.jsx:52`]** Plast-typer afkortes til top 8 uden "+X andre"-indikator. _(fundet af: qa-journalist-charlie)_
- **[`src/utils.js:128-135`]** Prisforslagets condition-multiplikator er en trappefunktion med skarpe spring (fx 33% hop fra 7→8), uden gradvis justering svarende til sliderens 0-10-opløsning. _(fundet af: qa-brugt-jesse)_
- **[`src/utils.js:103-107`]** Dødt/ubrugt nummereringssystem (`saleGroup`/`salePos`) i datamodellen — reel nummerering kommer udelukkende fra grid-position. _(fundet af: qa-brugt-jesse)_
- **[`src/App.jsx` — ingen oprydning]** Orphanede custom discs ryddes aldrig automatisk op, selvom antal ejede instanser når 0 — de forbliver synlige i søgning/mærke-dropdown for evigt. _(fundet af: qa-hype-finn)_
- **[`CreateDiscForm.jsx`]** Mærke-feltet ved oprettelse har ingen autocomplete mod kendte mærker (i modsætning til scannerens redigeringsform) — stavefejl skaber separate mærke-bøtter i Stats. _(fundet af: qa-hype-finn)_
- **[`DiscScanner.jsx:582-586`, `App.jsx:961-966`]** "Søg manuelt"-fallback taber alt AI-genereret data, inkl. selve foto'et — `CreateDiscForm` prælægges ikke og har intet foto-felt. _(fundet af: qa-hype-finn)_
- **[`SaleGrid.jsx`]** Hardkoder palettefarver som literal-strenge i canvas-kode i stedet for at bruge `C`/`TYPE_COLOR`, selvom filen allerede importerer `C`. _(fundet af: qa-design)_
- **[`DiscScanner.jsx:15`]** Konfidens-indikatorens "medium"-farve genbruger `C.fairway`s værdi uden reference, til et semantisk helt andet formål. _(fundet af: qa-design)_
- **[`FlightMatrix.jsx:171,336`]** Opdigtet, ikke-palette-farve (`#2a3e2a`) for nedtonede akse-labels. _(fundet af: qa-design)_
- **[`StatsPanel.jsx:22,68,149`]** Inkonsistent card-padding for visuelt ensartede "surface card"-elementer i samme fil. _(fundet af: qa-design)_
- **[`DiscTournament.jsx:36-79`]** Introducerer en konkurrerende visuel signatur (canvas-konfetti) uden nogen reference til det etablerede flyvebane-kurve-motiv (`FlightArc.jsx`). _(fundet af: qa-design)_
- **[`FlightEditor.jsx:139`, `CreateDiscForm.jsx:96-100`]** Vægt-felter uden reel clamping-håndhævelse, og inkonsistente min/max-grænser mellem de to formularer. _(fundet af: qa-reviewer-rob)_
- **[`constants.js:37,46`]** `typeFromSpeed`-cutoffet (>8 ⇒ Distance) klassificerer kendte fairway-drivere (fx Dynamic Discs Escape, speed 9) som "Distance", i strid med producentens egen markedsføring. _(fundet af: qa-reviewer-rob)_
- **[`FlightBadge.jsx`, `constants.js`, `DiscCard.jsx`]** Flight-tal/stabilitetstermer og "Claude Vision" nævnes/vises uden forklaring nogen steder i UI'et for en bruger uden domæneviden. _(fundet af: qa-ny-bruger)_
- **[`DiscCard.jsx:44-66`]** Foto-cirklen på et disc-kort er en skjult, interaktiv knap uden visuel affordance (ser ud som statisk billede). _(fundet af: qa-ny-bruger)_
- **[`DiscScanner.jsx:699-716`, `FlightEditor.jsx:120-133`]** Farve-swatches (26×26px) er for tætpakkede/små til præcis finger-brug ved en hyppig handling. _(fundet af: qa-mobil-pwa)_
- **[`BagDetail.jsx:172-190`]** Bag-tilføj/fjern-flueben er kun 32×32px — under anbefalet touch-target for en hyppig handling. _(fundet af: qa-mobil-pwa)_
- **[`FlightMatrix.jsx:25`]** Flight Matrix-markører er kun ~20px i diameter, svære at ramme præcist ved overlap. _(fundet af: qa-mobil-pwa)_
- **[`src/App.jsx:560`]** Login-skærmen blokerer fuldstændig adgang hvis Supabase-sessionen ikke kan genoprettes offline, uden nogen "du er offline"-forklaring. _(fundet af: qa-mobil-pwa)_
- **[`App.jsx:999-1015`]** `UpdateBanner` og photo-fejl-banneret kan overlappe fuldstændigt (samme position/z-index). _(fundet af: qa-mobil-pwa)_
- **[`BagDetail.jsx:43-49`]** Fjern-fra-bag-animation bruger ét delt `removingUid`-state uden oprydning — hurtige klik på forskellige discs desynkroniserer den visuelle "fjernes"-indikator. _(fundet af: qa-power-simon)_
- **[`src/App.jsx:955-959`]** Gæstebrugeres base64-fotos i localStorage kan stille ramme quota ved bulk-scanning — alle persist-fejl sluges tavst uden brugerfeedback. _(fundet af: qa-power-simon)_
- **[`supabase/schema.sql`, `store.js:23-28`]** Ingen `updated_at`/versionskolonne og ingen realtime-subscription — to faner/enheder på samme konto kan overskrive hinandens ændringer (last-write-wins) uden konflikthåndtering. _(fundet af: qa-data)_
- **[`src/App.jsx:894`]** Ønskeliste renses ikke automatisk når en disc købes/tilføjes til samlingen — intet atomisk "marker som købt"-flow. _(fundet af: qa-data)_
- **[`src/App.jsx:436-449`]** Solgte discs fjernes ikke fra `owned`/`bags` — forbliver synlige i Mine/Flight Matrix/statistik indtil manuel sletning. _(fundet af: qa-data)_

## LAV

- **[`api/scan.js`, `SaleTextGenerator.jsx`, `App.jsx:470-484`]** Ingen XSS-fund i brugertekst-rendering (React auto-escaper alle relevante felter) — bekræfter at hovedrisikoen ligger i adgangskontrol, ikke markup-injektion. _(fundet af: qa-sikkerhed)_
- **[`FlightEditor.jsx:139`, `DiscScanner.jsx:724-725`]** Vægt-feltet har samme manglende clamping som flight-tallene. _(fundet af: qa-form-dan)_
- **[`src/utils.js:84-91`]** `computeStability`s ±1/±3-tommelfingerregel tager ikke højde for speed. _(fundet af: qa-form-dan)_
- **[`src/App.jsx:176-181`]** Én-gangs bag-migreringslogik er O(bags·entries·owned) uden Map-opslag — kortvarig hængning ved første login efter migrering. _(fundet af: qa-power-user)_
- **[`StatsPanel.jsx:34-57` vs. `CollectorStatus.jsx:7-31`]** Blandet disciplin omkring memoization i samme mappe — kosmetisk inkonsistens snarere end reelt problem ved nuværende datamængder. _(fundet af: qa-power-user)_
- **[`CLAUDE.md` vs. `App.jsx:436-449`]** Dokumenteret `saleHistory`-datamodel (`discId`) matcher ikke den faktiske implementering (intet `discId` gemmes) — dokumentations-drift, ikke en kodefejl. _(fundet af: qa-journalist-charlie)_
- **[`SaleHistory.jsx:8` vs. `:54`]** Inkonsistent talkonvertering mellem sum (`Number(...)||0`) og enkeltpost-visning (rå `{item.price}`). _(fundet af: qa-journalist-charlie)_
- **[`src/utils.js:95`]** `conditionText`s laveste trin ("Ødelagt" for 0-1) er semantisk hårdere end det danske brugtmarked typisk mener ved "meget slidt men kastbar". _(fundet af: qa-brugt-jesse)_
- **[`SaleGrid.jsx:17,110-129`]** Fejlede fotoindlæsninger skjules stille bag samme fallback som "intet foto uploadet". _(fundet af: qa-brugt-jesse)_
- **[`DiscCard.jsx`, `FlightBadge.jsx`]** Ingen persistent markør for "AI-gættet/ubekræftet" vs. manuelt indtastet custom disc. _(fundet af: qa-hype-finn)_
- **[`DiscScanner.jsx:610-632`]** Intet eksplicit "ingen match — opret ny disc"-hint når dropdown-forslag forsvinder. _(fundet af: qa-hype-finn)_
- **[`src/App.jsx:106-107` vs. `227-235`]** Custom discs har intet fallback-sikkerhedsnet svarende til katalogets `FALLBACK`-liste ved fetch-fejl. _(fundet af: qa-hype-finn)_
- **[`CLAUDE.md` vs. `constants.js:1-4`]** Dokumenteret palet (bg/surface/raised/brand/muted) matcher ikke længere de faktiske hex-værdier i koden. _(fundet af: qa-design)_
- **[`FlightBadge.jsx:37-45` vs. `constants.js:34`]** Wear-farver duplikeret i stedet for delt fra samme kilde; `StabilityPill` introducerer desuden en helt ny, ikke-palette lilla farve. _(fundet af: qa-design)_
- **[`App.jsx:544`, `LoginScreen.jsx:39`, `SharedBagView.jsx:10`]** Font-loading af Pacifico+DM Sans duplikeret og let divergerende tre steder. _(fundet af: qa-design)_
- **[`src/App.jsx:583-585`]** "0 discs"-tælleren ved første åbning kan fejlagtigt læses som en indlæsningsfejl. _(fundet af: qa-ny-bruger)_
- **[`App.jsx:662-666`, `DiscCard.jsx:88-107`]** Ikon-kun handlinger (+ / hjerte) har kun `aria-label`, ingen synlig tekstlabel. _(fundet af: qa-ny-bruger)_
- **[`ui.jsx:20-24`, `ImageAdjuster.jsx:291-295`]** `iconBtn` (40×40px) og retningsknapper (36×36px) ligger lige under anbefalet touch-target, mærkbart når flere sidder tæt sammen. _(fundet af: qa-mobil-pwa)_
- **[`public/sw.js:21-32`]** Service workeren cacher alle cross-origin GET-requests uden udløb/versionering — kan vokse ubegrænset og vise forældede fotos offline. _(fundet af: qa-mobil-pwa)_
- **[`DiscScanner.jsx:346-368`]** Ingen guard mod dobbelt-tilføjelse ved hurtigt dobbeltklik på "Tilføj til min samling". _(fundet af: qa-power-simon)_
- **[`src/utils.js:65`]** `genId()` er ikke kollisionssikker ved meget hurtig bulk-scanning inden for samme millisekund. _(fundet af: qa-data)_
- **[`src/App.jsx:161-165,215-224`]** Default-bag/salgsliste oprettes ubetinget når tilhørende Supabase-række er tom — kan i kombination med forbigående netværksfejl skabe en tom default, der senere overskriver reel data. _(fundet af: qa-data)_
