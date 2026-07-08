# Bølge 1: Datatab & sync — implementeringsplan

_Skrevet: 2026-07-08 · Ingen kode ændret endnu — dette er kun planen._

## Baggrund / rodårsag

Alle seks fund deler reelt to rodårsager:

1. **`store.get()` kan ikke skelne "fejl" fra "tomt"** (`src/store.js:4-17`). Både en kastet exception og en bekræftet tom række giver `null` tilbage. Alt nedstrøms — migrering, default-oprettelse, localStorage-fallback — behandler derfor enhver netværksfejl som "kontoen er tom", med reel risiko for at overskrive cloud-data.
2. **Der findes intet flag der reelt betyder "vi har et bekræftet, fejlfrit billede af brugerens data".** Nuværende `dataLoaded` (`App.jsx:37`) sættes til `true` ubetinget efter load-IIFE'en er kørt færdig — uanset om alle `store.get()`-kald undervejs fejlede stille. `useDebouncedPersist` bruger kun dette flag som skrive-lås, så en fejlet load kan stadig låse skrivning op.

Punkt 1 (beforeunload-only flush), 2 (auth-refresh reload) og 5 (ubetinget default-oprettelse) er alle symptomer på mangel #2. Punkt 3 er selve mangel #1. Punkt 4 (migrering) er et selvstændigt idempotens-problem, men forværres af mangel #2 (en fejlet migrering-skrivning bliver ikke opdaget). Punkt 6 er en strukturel mangel (ingen versionering) der er ortogonal til de andre, og behandles separat.

---

## 1. Ny kontrakt for `store.get()`/`store.set()`

**Fil:** `src/store.js`

Nuværende returtype er `{value: string} | null` — utvetydigt kun for succes-med-data. Ny returtype for **begge** metoder:

```
{ ok: true,  value: string|null }   // succes — value er null ved bekræftet tom række
{ ok: false, error }                // fejl — netværk, timeout, RLS, parse osv.
```

- **Supabase-grenen:** `maybeSingle()` der returnerer `{data:null, error:null}` ⇒ `{ok:true, value:null}` (bekræftet tomt). Et kastet/afvist promise, eller et PostgREST-svar med `error` sat ⇒ `{ok:false, error}`.
- **`window.storage`-grenen** (native bridge, pt. ubrugt i kodebasen men skal holdes konsistent): en kastet exception ⇒ `{ok:false, error}`; ellers wrap det rå svar i `{ok:true, value}`.
- **localStorage-grenen** (gæstebruger): `getItem`/`setItem` kaster kun i sjældne tilfælde (privat-tilstand, quota). Wrap i try/catch ⇒ `{ok:false, error}` ved kast, ellers `{ok:true, value}` (streng eller `null` hvis nøglen ikke findes — det er en legitim tom-tilstand for en gæst, ikke en fejl).

**Retry før fejl rapporteres** (kun Supabase-grenen, kun for transiente fejl — netværk/timeout, ikke 401/403/RLS-afvisninger som fejler hurtigt uden retry):
- `get`: op til 2 retries (3 forsøg i alt), backoff 400ms → 1200ms.
- `set`: 1 retry, ingen backoff (skal være hurtig af hensyn til flush-vinduet, se afsnit 3).

Alle 9 kaldsteder i `App.jsx` (`store.get("owned")`, `"overrides"`, `"bags"`, `"wishlist"`, `"saleOrder"`, `"saleHistory"`, `"saleLists"`, `"activeSaleListId"`, `"customDiscs"`, `"tournamentHistory"`) skal opdateres til den nye kontrakt. For at undgå at gentage det samme rettede mønster 9 gange (og dermed risikere at en enkelt kopi bliver forkert), samles load-logikken i en lille hjælpefunktion i `App.jsx`:

```
async function loadKey(key, authUser) {
  const res = await store.get(key);
  if (!res.ok) return { ok: false };                 // hård fejl — kald aldrig localStorage-fallback her
  if (res.value == null && authUser) {                // bekræftet tom + logget ind → prøv lokal legacy-migrering
    const lv = localStorage.getItem("md_" + key);
    if (lv) return { ok: true, value: lv, fromLocalFallback: true };
  }
  return { ok: true, value: res.value };
}
```

Dette er den centrale rettelse: den nuværende betingelse `if (!res?.value && authUser)` (linje 118, 124, 142, 158, 190) reagerer på *fravær af værdi* uanset årsag. Den nye betingelse reagerer kun på *bekræftet tom* (`res.ok && res.value == null`) — en netværksfejl (`res.ok === false`) udløser aldrig localStorage-fallback og aldrig en efterfølgende `store.set`-tilbageskrivning.

---

## 2. `loadConfirmed`-flag og load-livscyklus

**Fil:** `src/App.jsx`

`dataLoaded` (linje 37, 242) omdøbes til `loadConfirmed` og får strammere semantik: det sættes **kun** til `true` hvis samtlige 9 nøgler blev læst med `ok:true` (uanset om værdien var data eller bekræftet tom). Der tilføjes et søster-flag `loadError` (ny state) for UI-feedback.

Ny kontrolflow i load-effekten (linje 110-244):

1. Kør `loadKey(...)` sekventielt for hver af de 9 nøgler, akkumulér resultater.
2. **Stop øjeblikkeligt** ved første `ok:false` — spring resten af load-sekvensen over. Skriv ikke nogen migrerings- eller default-værdier for de nøgler der endnu ikke er nået.
3. Hvis alle 9 lykkedes: kør migrering/default-oprettelse (se afsnit 5 og 6) og kald `setLoadConfirmed(true)`.
4. Hvis et hvilket som helst trin fejlede: `setLoadError(true)`, `setLoadConfirmed(false)`. Vis en ikke-blokerende fejlbanner ("Kunne ikke indlæse dine data — tjek din forbindelse") med en "Prøv igen"-knap der re-trigger load-effekten (fx via en `reloadNonce`-state der lægges til dependency-arrayet og øges ved klik).

`useDebouncedPersist(key, value, loadConfirmed)` (alle 9 kaldesteder, linje 246-254) modtager `loadConfirmed` i stedet for `dataLoaded` — ingen ændring i selve hook-signaturen, kun i hvad der sendes ind, og i hvor pålideligt flaget rent faktisk garanterer "vi har bekræftet data fra kilden".

Dette er selve svaret på "hvornår persistering låses op": **aldrig** før alle 9 nøgler er læst uden fejl. Ikke efter et enkelt IIFE der bare er "kørt til ende" (nuværende adfærd), men efter en eksplicit succes-akkumulering.

---

## 3. Auth-events uden state-genindlæsning

**Fil:** `src/App.jsx`, auth-listener (linje 85-101)

Problemet er ikke kun at load-effekten har `[authUser, authLoading]` som dependency — det er at `setAuthUser(u)` (linje 93) altid skriver et **nyt objekt** ind, også ved `TOKEN_REFRESHED`, hvor `u.id` er uændret. To lag af forsvar:

**Lag 1 — filtrér i selve callbacken**, så der kun opstår en ny `authUser`-reference når bruger-id'et faktisk ændrer sig:

```
supabase.auth.onAuthStateChange((event, session) => {
  const u = session?.user ?? null;
  setUser(u); // modul-niveau reference til store.js — opdateres altid, uden risiko
  if (event === "SIGNED_OUT") {
    setAuthUser(null);
    return; // clearing af owned/bags/etc. sker i load-effekten når authUser bliver null
  }
  setAuthUser(prev => (prev && u && prev.id === u.id) ? prev : u);
});
```

Ved at genbruge `prev` når id'et er identisk, ændrer `setAuthUser` ikke reference — React re-renderer ikke, og load-effekten kører ikke igen. Dette dækker `TOKEN_REFRESHED`, `USER_UPDATED`, og et gentaget `SIGNED_IN` for samme bruger (fx faneskift/refokus) i ét greb, uden at skulle vedligeholde en liste af event-navne der skal ignoreres — kun selve identitets-sammenligningen betyder noget.

**Lag 2 — belt-and-suspenders:** load-effektens dependency-array ændres fra `[authUser, authLoading]` til `[authUser?.id ?? null, authLoading, reloadNonce]`. Selv hvis lag 1 skulle have en fejl et sted, vil effekten stadig kun reagere på en reel id-ændring, ikke på objekt-identitet.

`SIGNED_OUT`-håndteringen (nuværende linje 94-98: nulstil `owned`/`bags`/`overrides`/`wishlist`/`saleLists`/`activeSaleListId`) flyttes til at ske i load-effekten når den ser `authUser === null` efter tidligere at have været sat — dvs. selve ryddet af state og selve (gen)indlæsningen for "ingen bruger"-tilstanden sker ét sted, ikke to.

---

## 4. Flush-strategi

**Fil:** `src/hooks/useDebouncedPersist.js`

**Primær trigger: `visibilitychange`.** Når `document.visibilityState === "hidden"`, betyder det appen bliver baggrundslagt — på mobil sker dette *før* OS'et evt. fryser/dræber JS-konteksten, så et almindeligt `await store.set(...)`-kald typisk når at fuldføre. Dette er langt mere pålideligt end `beforeunload`, som ofte slet ikke fyrer ved app-swipe/baggrund på iOS/Android.

**Sekundær trigger: `pagehide`.** Efterfølgeren til det forældede `unload`-event, fyrer langt mere konsekvent end `beforeunload` ved faktisk navigation/lukning, og er bfcache-venlig (forstyrrer ikke tilbage/frem-navigation i modsætning til `unload`).

**Tertiær/legacy trigger: `beforeunload` bevares** som sidste sikkerhedsnet for desktop-browsere, men er ikke længere den eneste linje.

Alle tre lytter på samme lokale `flush()`-closure — men closuren selv opgraderes til at bruge en "urgent"-skrivevej (se nedenfor) i stedet for det almindelige `store.set`:

```
useEffect(() => {
  if (!loadConfirmed) return;
  const flush = () => {
    if (timeoutRef.current == null) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    store.setUrgent(key, JSON.stringify(valueRef.current)).catch(() => {});
  };
  const onVis = () => { if (document.visibilityState === "hidden") flush(); };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  return () => { /* fjern alle tre */ };
}, [key, loadConfirmed]);
```

**Vurdering af `sendBeacon` mod Supabase REST:**

`navigator.sendBeacon()` kan **ikke** bruges. Beacon-API'et tillader ingen custom headers — kun content-type kan styres via `Blob`-typen. Supabase/PostgREST kræver `apikey`- og `Authorization: Bearer <jwt>`-headers for at RLS-policyen (`auth.uid() = user_id`) kan evalueres, og sendBeacon har ingen måde at levere dem på. At lægge JWT'en i URL'en som workaround er uacceptabelt (lækker token i server-/proxy-logs, caches i browserhistorik). **Konklusion: sendBeacon er udelukket, uanset resten af flush-strategien.**

**Løsning: `fetch(url, {keepalive:true, headers, body})` på flush-stien.** I modsætning til sendBeacon understøtter `fetch` vilkårlige headers, herunder `Authorization`, og `keepalive:true` gør at browseren lader requesten fuldføre i baggrunden selv om siden navigerer væk/lukkes — præcis den garanti vi mangler ved almindelig `beforeunload`.

Da `supabase-js`'s query builder ikke eksponerer `keepalive` per kald (kun en global `fetch`-override ved `createClient(...)`), tilføjes en dedikeret metode i `src/store.js`:

```
async setUrgent(key, value) {
  if (window.storage) { try { return await window.storage.set(key, value); } catch { return { ok:false }; } }
  const user = getUser();
  if (!supabase || !user) { try { localStorage.setItem("md_"+key, value); return {ok:true}; } catch(e) { return {ok:false, error:e}; } }
  const token = getAccessToken();               // ny helper i supabase.js, se nedenfor
  const bytes = new Blob([value]).size;
  if (!token || bytes > 60000) return this.set(key, value); // for stort til keepalive, eller ingen token — fald tilbage til normal (samme risikoprofil som i dag)
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: "POST",
      keepalive: true,
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([{ user_id: user.id, key, value }]),
    });
    return { ok: true };
  } catch (e) { return { ok:false, error:e }; }
}
```

- **Ny helper `getAccessToken()` i `src/supabase.js`**, symmetrisk med den eksisterende `getUser()`: en modul-niveau variabel opdateret i auth-listeneren ved *ethvert* auth-event (inkl. `TOKEN_REFRESHED` — her skal selve token-værdien opdateres, i modsætning til `authUser`-referencen i afsnit 3, som bevidst *ikke* skal skifte reference ved token-refresh). De to ting er ortogonale: React-state-identitet (`authUser`) må ikke ændre sig ved refresh, men den rå token-streng brugt til raw fetch-kald skal altid være den nyeste.
- **Størrelsesgrænse ~60KB:** keepalive-fetch har en praktisk payload-grænse (typisk ~64KB samlet for alle igangværende keepalive-requests i Chromium). Er en nøgles JSON-payload (fx `overrides` for en power-user med 200+ discs) større end denne grænse, falder `setUrgent` tilbage til almindelig `store.set` (samme fire-and-forget-adfærd som i dag) — **kun** for de sjældne, store payloads er restrisikoen fra afsnit 1 (KRITISK-fundet) uændret; alle mindre nøgler (langt de fleste, og alle for almindelige brugere) får den fulde keepalive-garanti.
- **Beslutning:** `setUrgent` bruges **udelukkende** fra flush-stien (`visibilitychange`/`pagehide`/`beforeunload`) — den almindelige 800ms-debounce fortsætter med at bruge `store.set` uændret, da der ikke er noget nedluknings-scenarie at forsvare sig imod midt i normal brug.

---

## 5. Idempotent legacy-migrering

**Filer:** `src/App.jsx` (linje 119-138 og 145-150), `src/utils.js` (ny hjælpefunktion)

Roden til problemet: `genId()` (tidsstempel + random) giver et **nyt** uid hver gang migreringskoden kører, fordi selve betingelsen for at genkende "gammelt format" (`typeof raw[0] === "string"`) er sand igen og igen, indtil skrivningen af det nye format rent faktisk lander. Kører migreringen to gange (to faner, en fejlet skrivning efterfulgt af et nyt forsøg, to enheder der logger ind samtidig), får man to forskellige uid-sæt for de samme fysiske discs — og `overrides` beregnet mod det ene sæt bliver forældreløst når det andet sæt vinder skrivekapløbet.

**Løsning: deterministisk uid i stedet for tilfældig, for netop denne migreringssti.** Tilføj i `utils.js`:

```
export function legacyUid(discId, index) { return `legacy-${discId}-${index}`; }
```

Brug denne i stedet for `genId()` de to steder migrering sker fra en flad `discId[]`/streng-liste (linje 122 og 148), med `index` = positionen blandt entries med samme `discId` (håndterer at samme mold kan eje flere eksemplarer). Resultatet: **uanset hvor mange gange eller hvor samtidigt** migreringskoden kører, producerer den identisk output — sidste-skriver-vinder er nu harmløst, fordi alle skrivere skriver det samme. Ingen distribueret lås nødvendig.

Dette ændrer kun adfærd for brugere der reelt stadig sidder med det gamle, ren-streng `owned`-format (kun Kim/vennernes allerældste testdata, hvis nogen) — brugere der allerede er migreret (format er `{uid,discId}`-objekter) rammer aldrig denne kodesti.

**Eksplicit invariant:** `legacyUid()` kaldes **udelukkende** inde i den gren der tjekker `typeof raw[0] === "string"` (linje 121) og i den tilsvarende gamle `"bag"`-nøgle-migrering (linje 145-150) — dvs. kun når det rå `owned`-payload fra `store.get` reelt *er* et fladt array af `discId`-strenge. Der findes ingen kodesti hvor et allerede-tildelt, tilfældigt uid på et eksisterende `{uid, discId}`-objekt læses, genereres om eller erstattes af et deterministisk uid. En konto der allerede er migreret, rammer denne gren aldrig (betingelsen på linje 121 er falsk), og dens eksisterende tilfældige uid'er forbliver fuldstændig urørte af denne ændring — hverken ved læsning, ved en almindelig gemning, eller ved en fremtidig re-kørsel af load-effekten.

Migreringsskrivningerne (`store.set("owned",...)` linje 137, `store.set("overrides",...)` linje 138, `store.set("owned",...)` linje 149) flyttes desuden til kun at ske **efter** at hele load-kæden er bekræftet (se afsnit 2) — ikke inline midt i en load der senere kan vise sig at fejle på en efterfølgende nøgle.

---

## 6. Guard mod destruktive writes

Med `loadConfirmed` (afsnit 2) som eneste, strengt håndhævede skrive-lås er hovedgarden allerede på plads: `useDebouncedPersist` kan aldrig skrive før alle 9 nøgler er bekræftet indlæst uden fejl — så en fejlet/delvis load kan aldrig resultere i at et tomt lokalt state-objekt (`[]`/`{}`) skrives tilbage og overskriver en ikke-tom cloud-værdi.

**Ekstra "belt-and-suspenders"-tjek (anbefalet, lav kompleksitet):** gem en `initialSnapshotRef` pr. nøgle i `useDebouncedPersist` — den værdi der var gældende da `loadConfirmed` først blev `true`. Hvis den *første* debounce-cyklus efter load forsøger at skrive en tom/falsy værdi (`[]`, `{}`, `null`) mens `initialSnapshotRef.current` var ikke-tom, log en `console.warn` og **spring den ene skrivning over** (næste reelle brugerhandling vil naturligt trigge en ny, korrekt skrivning). Dette fanger en snæver men reel restrisiko: en bug andetsteds i render-rækkefølgen der nulstiller lokal state til tomt *efter* `loadConfirmed` er sat, men *før* brugeren har foretaget en ægte handling.

Dette tjek er en engangs-guard (kun relevant for den allerførste skrivning efter load) og tilføjes ikke som en permanent begrænsning på senere, legitime tømninger (fx brugeren sletter bevidst alle sine discs) — kun den første post-load-cyklus er mistænkelig.

---

## 7. Default-oprettelse kun efter bekræftet load

**Fil:** `src/App.jsx`, linje 161-165 (default bag) og 215-224 (default salgsliste)

Begge steder skifter betingelsen fra "værdi mangler" til "bekræftet tom": `bagsList === null` (linje 161) opstår i dag både ved reelt tom konto og ved en fejlet `store.get("bags")` — med den nye `loadKey`-kontrakt (afsnit 1) returnerer et fejlet kald `{ok:false}` og load-sekvensen stopper allerede før dette punkt (afsnit 2, punkt 2), så `bagsList === null` herefter **kun** kan betyde "bekræftet tom konto". Samme ræsonnement for `saleListsData` (linje 215). Ingen selvstændig kodeændring ud over det som allerede følger af afsnit 1+2 — nævnes eksplicit her fordi det er et af de seks fund, og for at gøre eksplicit at der ikke er brug for en tredje, separat guard.

---

## 8. Beslutning om fund #6 (versionering / two-tab konflikt)

**Beslutning: minimal, additiv `updated_at`-kolonne landes nu; egentlig konflikt-afvisning udskydes eksplicit til en senere bølge.**

**Hvad der landes nu (`supabase/schema.sql`):**
```sql
alter table public.user_data
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_user_data_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_user_data_updated_at on public.user_data;
create trigger trg_user_data_updated_at
  before insert or update on public.user_data
  for each row execute function public.set_user_data_updated_at();
```
Dette er rent additivt (ny kolonne med default, ny trigger) — ingen eksisterende læse-/skrivesti brydes, og ingen klientkode-ændring er påkrævet for at dette virker. Værdien: giver os for første gang et tidsstempel at fejlsøge fremtidige datatabsrapporter ud fra ("hvornår blev denne nøgle sidst skrevet, af hvem"), uden at kræve en RPC eller ekstra netværkskald i det kritiske skrive-flow vi lige har gjort mere pålideligt.

**Hvorfor reel last-write-wins-afvisning udskydes:**
1. En rigtig compare-and-swap (afvis skrivning hvis serverens `updated_at` er nyere end det klienten sidst så) kræver enten en Postgres-funktion/RPC (`upsert ... where updated_at <= $forventet`) eller et ekstra læse-kald før hver skrivning. Sidstnævnte fordobler nøjagtig den netværkstrafik vi i afsnit 3-4 arbejder på at gøre sjældnere/mere robust — det er den forkerte retning at optimere i lige nu.
2. To-faner/to-enheder-samtidighed er et lavfrekvent scenarie for en gratis app brugt af Kim og et par venner, sammenlignet med de mobil-enkelttilfælde (baggrundslukning, auth-refresh, migrering) som resten af denne bølge retter — de har langt højere hyppighed og alvorlighed i QA-rapporten (4 uafhængige agent-fund vs. 1).
3. At skynde en halvfærdigt testet konflikt-mekanisme ind i præcis det delsystem vi lige har stabiliseret, er en unødvendig risiko for at introducere nye bugs oven i fixet.

`updated_at`-kolonnen er den nødvendige forudsætning for en senere CAS-løsning, så intet af arbejdet her går til spilde — det er bevidst sekventeret, ikke droppet.

---

## 9. Risikovurdering ved udrulning

| Risiko | Vurdering | Afbødning |
|---|---|---|
| Retry/backoff gør load langsommere på i forvejen dårligt netværk | Lav-mellem — kun transiente fejl retries, hurtige fejl (401/403) fejler uden delay | Test manuelt med DevTools "Slow 3G"-preset før udrulning |
| `authUser`-id-sammenligning overser en legitim kontoskift-situation | Lav — sammenligning er på `user.id`, ikke event-navn, så enhver reel identitetsændring udløser stadig reload uanset hvilket Supabase-event der bærer den | Manuel test: log ud, log ind som anden bruger i samme browserfane |
| Omdøbning `dataLoaded`→`loadConfirmed` rammer et overset kaldested | Lav — kun 9 kaldesteder, alle i `App.jsx`, mekanisk grep-verificerbart | `grep -rn "dataLoaded" src` efter ændring, skal give 0 hits |
| Deterministisk legacy-uid ændrer uid-værdier for brugere midt i (endnu ikke committed) migrering | Meget lav — rammer kun brugere der stadig har rent streng-array `owned`-format; alle allerede-migrerede brugere rammer aldrig denne sti | Ingen særskilt afbødning nødvendig, men verificér med en test-bruger der bevidst sættes tilbage til gammelt format |
| `visibilitychange`/`pagehide` fyrer oftere end forventet og øger antal Supabase-writes | Lav — kun relevant når `loadConfirmed` er sat og der reelt er en pending debounce-timer at flushe; ingen ændring i skrivefrekvens ved normal brug | Overvåg Supabase-forbrug/requests efter udrulning i en uge |
| Raw `fetch`-kald i `setUrgent` afviger fra `supabase-js`'s interne request-format (fx manglende header, forkert `Prefer`-værdi) og fejler stille | Lav-mellem — ny, ikke-triviel kodesti der bypasser et velafprøvet bibliotek | Verificér med DevTools Network-fanen (checklistepunkt 9) at requesten rent faktisk returnerer 2xx, ikke kun at den afsendes |
| `getAccessToken()` returnerer en udløbet token i det korte vindue lige omkring en refresh | Lav — `setUrgent` falder tilbage til normal `store.set` hvis token mangler; et udløbet-men-tilstedeværende token vil give et 401 fra PostgREST, som fanges og logges, ikke crashe | Ingen retry på `setUrgent` (bevidst — flush skal være hurtig); accepteret restrisiko, dækkes af næste normale debounce-skrivning hvis appen forbliver åben |
| `schema.sql`-ændringen skal køres manuelt af Kim i Supabase SQL Editor — vi kan ikke selv anvende den mod produktions-databasen | Middel (proces-risiko, ikke teknisk) | Eksplicit besked til Kim med kør-instruktion, samme workflow som eksisterende `schema.sql`-kommentar øverst i filen |

### Manuel verifikationstjekliste i produktion (efter udrulning)

1. **Normal load:** log ind som eksisterende bruger med data → samling/bags/wishlist vises korrekt, ingen fejlbanner.
2. **Fejlet load simuleres:** DevTools → Network → "Offline" lige efter login, før data er hentet → forvent fejlbanner med "Prøv igen", **ikke** en tom samling; slå netværk til igen og tryk "Prøv igen" → data loader korrekt.
3. **Auth-refresh under redigering:** rediger en discs vægt, åbn DevTools-konsollen og tving et `TOKEN_REFRESHED`-event (eller vent den naturlige refresh-periode igennem, typisk ~1 time) → redigeringen må ikke forsvinde eller UI'et flimre/nulstille.
4. **Mobil baggrundslukning:** på telefon (installeret PWA), rediger en disc, tryk hjemmeknap/skift app inden for et par sekunder, genåbn efter 10-15 sek → tjek i Supabase-dashboardet at ændringen er gemt (og at `updated_at` er opdateret).
5. **Gæstebruger (ingen konto):** uden login, tilføj en disc, genindlæs siden → data bevares fra localStorage som hidtil (ingen regression).
6. **Første-login migrering:** en bruger med eksisterende localStorage-data logger ind for første gang → data migreres til Supabase; log ud og ind igen → uid'er er uændrede (ingen ny migrering kører, ingen forældreløse overrides).
7. **Allerede-migreret konto uændret:** find/opret en konto hvor `owned` allerede er i `{uid,discId}`-format (dvs. enhver bruger der har brugt appen siden objekt-formatet blev indført) → notér den fulde liste af uid'er (fx via Supabase-dashboardets tabel-view på `user_data`, nøgle `"owned"`, før opdatering) → deploy ændringen → log ind igen → uid-listen skal være **byte-for-byte identisk** med før. Ingen regenerering, ingen nye `legacy-...`-uid'er, `overrides` forbliver koblet til de samme uid'er som før.
8. **Fejlet skrivning:** bloker netværk midt i en redigering (efter load er bekræftet) → forvent en synlig, ikke-blokerende "kunne ikke gemme"-besked; slå netværk til, foretag en ny (eller samme) redigering → den gemmes korrekt.
9. **Keepalive-flush virker:** rediger en disc, brug DevTools → Network for at bekræfte at et `fetch`-kald med `keepalive:true` og korrekt `Authorization`-header afsendes ved fanebytte (`visibilitychange`) — ikke kun ved faktisk lukning. Bekræft desuden at en kunstigt stor payload (fx en testkonto med 200+ overrides, hvis muligt) korrekt falder tilbage til normal `store.set` uden fejl.
10. **`schema.sql`:** anvend migrations-SQL'en i et Supabase-udviklingsprojekt (ikke direkte i produktion) først, bekræft `updated_at`-kolonnen findes og triggeren opdaterer den ved et manuelt test-write, før den køres i produktion.

---

## 10. Filer der ændres

- `src/store.js` — ny `{ok, value|error}`-kontrakt for `get`/`set`, retry-med-backoff, konsistent wrapping af alle tre grene (Supabase/window.storage/localStorage); ny `setUrgent(key,value)`-metode der bruger rå `fetch` med `keepalive:true` mod Supabase REST (med fallback til normal `set` ved manglende token eller for stor payload).
- `src/supabase.js` — ny `getAccessToken()`-helper (modul-niveau, symmetrisk med eksisterende `getUser()`), opdateret ved ethvert auth-event inkl. `TOKEN_REFRESHED`, brugt af `store.setUrgent`.
- `src/hooks/useDebouncedPersist.js` — flush udvides til `visibilitychange` + `pagehide` (ud over eksisterende `beforeunload`); flush-closuren bruger `store.setUrgent` i stedet for `store.set`; parameter fortsat kaldt `dataLoaded` i signaturen men modtager nu `loadConfirmed`-værdien fra `App.jsx`.
- `src/App.jsx` — auth-listener omskrevet til identitets-baseret filtrering (afsnit 3); load-effekt omskrevet omkring `loadKey`-hjælper, `loadConfirmed`/`loadError`-state, sekventielt stop ved første fejl, default-oprettelse kun ved bekræftet tom (afsnit 2, 5, 6, 7); `dataLoaded` omdøbt til `loadConfirmed` alle 9 steder; ny fejlbanner-UI med "Prøv igen".
- `src/utils.js` — ny `legacyUid(discId, index)`-hjælpefunktion til idempotent migrering, brugt **udelukkende** i legacy-streng-array-grenen (se eksplicit invariant i afsnit 5).
- `supabase/schema.sql` — additiv `updated_at`-kolonne + trigger (afsnit 8). **Kræver manuel kørsel af Kim i Supabase SQL Editor** — vi kan ikke anvende dette selv mod produktionsdatabasen.

Ingen ændringer i denne bølge til: `src/photoStorage.js`, `src/hooks/useServiceWorkerUpdate.js` (bemærk: SW-genindlæsning kalder `window.location.reload()` uden eksplicit flush først — relateret, men uden for denne bølges seks fund; kandidat til en senere bølge).
