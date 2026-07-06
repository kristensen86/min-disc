# BagUp — Udviklingsstatus Juli 2026

## App overview

BagUp er en premium disc golf disc management app. Navnet kommer fra "bag up" —
processen med at vælge og pakke sin disc bag. Appen er gratis og bruges af Kim
og vennerne.

## Tech stack

- React + Vite, komponent-struktur i `src/components/`
- Supabase — auth (email/password) + cloud data
- localStorage — fallback når ikke logget ind
- Vercel — hosting, auto-deploy fra GitHub (`kristensen86/min-disc`)
- discit-api.fly.dev — disc-database (~1000+ molds)
- Claude Vision API — disc-scanner (`VITE_ANTHROPIC_API_KEY`)
- lucide-react — ikoner
- PWA — installerbar på hjemmeskærm

## Design system

- Mørk jade/naturlig palet
- Baggrund: `#0a0f0a` · Surface: `#111811` · Raised: `#182018`
- Accent/brand: `#4ade80` (jade grøn)
- Tekst: `#e8f0e8` · Muted: `#6b8f6b`
- Putter: `#93c5fd` · Midrange: `#86efac` · Fairway: `#fdba74` · Distance: `#fca5a5`
- Font: DM Sans · Logo: Pacifico
- Bottom navigation med central grøn kamera-FAB (60px)
- Type-farverne bruges konsekvent som datasignal på tværs af FlightBadge/StatsPanel/CollectorStatus — Midrange skelnes via outline-stil (i stedet for solid glow) for at undgå forveksling med brand-grøn
- Signatur-motiv: flyvebane-kurve (`src/components/FlightArc.jsx`) — genbruges som baggrundsmotiv, sektions-flourish og loading-spinner

## Navigation

`[Søg] [Mine] [📷 FAB] [Bags] [Mere]`
Mere-menu: Salg, Stats, Ønskeliste, Del app

## Bygget — kernefunktioner

**Samling**
- Disc-database 1000+ discs (søg, filtrer type/mærke)
- Ejet samling med unikke disc-instanser (samme mold kan ejes flere gange)
- Opret egen disc hvis ikke i databasen
- Bekræftelse ved sletning
- Skift disc-mold på en ejet instans direkte fra edit-visningen (til rettelse hvis scanneren fandt forkert disc) — uid og overrides bevares
- Tryk på en disc-card/markør andre steder i appen (Flight Matrix, bag-sammenligning m.fl.) hopper til Mine-fanen og folder redigeringen ud på det korrekte kort — rydder evt. aktivt søgefilter og scroller kortet i view automatisk

**Bags**
- Flere navngivne bags
- Listevisning med søg + type-filter ved tilføjelse
- Flueben-toggle (tilføj/fjern fra bag)
- Flight Matrix integreret i bags (tabs: Discs / Flight)
- Sammenlign to bags side om side

**Flight Matrix**
- Speed (lodret) × Stability/Turn+Fade (vandret)
- Disc-fotos som markører (rundt crop)
- Gruppe-markør med tal-badge ved overlap
- Smart label collision avoidance
- Dropdown til bag-valg · Del-knap

**Disc data per instans**
- Flight-tal override (S/G/T/F)
- Farve, vægt, plast, note
- Plasttype-felt med autocomplete (`PlasticCombobox.jsx` + `src/data/plastics.js`) — forslag er strengt afgrænset til discens eget mærke når mærket er kendt, ellers fallback til den flade tværgående liste; fritekst virker altid uden tvang til at vælge fra listen — plastik-listen (38 mærker) er kurateret manuelt af Kim ud fra en Excel-oversigt, ikke autogenereret
- Slid-status slider 0-10 med tekst
- Eget foto med rundt auto-crop
- Flight-bane pop-up ved tryk på type-badge
- Flight-tal vises i eget spec-sheet-layout (`FlightNumberQuad` i `ui.jsx`, brugt af FlightEditor + CreateDiscForm) med monospace-tal
- Delt typografisk skala i `ui.jsx` (`textDisplay`/`textTitle`/`dataMono`/`textCaption`) for konsekvent hierarki på tværs af komponenter

**AI features**
- Disc-scanner (kamera) — Claude Vision genkender disc
- Auto-crop via bbox-koordinater

**Salg**
- Salgsliste med drag-sortering
- MP + BIN prisfelter (BIN altid påkrævet)
- Automatisk prisforslag (type + condition)
- Tilstandsslider 0-10
- Automatisk X.Y nummerering baseret på grid-position
- Salgsbillede 16:9 grid (5 disc pr. række)
- Tekst-eksport til Facebook
- Direkte deling via Web Share API
- Salgshistorik med total omsætning

**Ønskeliste**
- Disc-finder med similarity score og gap-analyse
- Marker som købt → flyttes til samlingen

**Statistik**
- Antal pr. mærke, type, farve, plast
- Samlerstatus — % af mærkets lineup ejet

**Auth + data**
- Login/signup via Supabase
- localStorage fallback
- Migration fra localStorage ved første login

## Datamodel
ownedInstances: [{ uid, discId }]
overrides: { [uid]: { speed?, glide?, turn?, fade?,
  pColor?, pWeight?, pPlastic?, pNote?, pWear?,
  pPhoto?, forSale?, condition?, hasInk?,
  saleMP?, saleBIN?, saleNote? }}
bags: [{ id, name, bagEntries: [{ entryId, instanceId }] }]
wishlist: [discId]
saleHistory: [{ discId, name, price, date, buyer? }]

## Miljøvariabler

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY

## Backlog — prioriteret

1. AI foto-forbedring ved upload
2. Disc Quiz — gæt disc fra animeret flight-bane
3. Tabt disc-mode
4. Vejrbaseret bag-forslag
5. CSV import af samling

6. QR-kode på disc
7. Bag-historik — gem snapshots over tid
8. Eksportér samlings-statistik som billede
9. Disc-duel — head-to-head animerede flight-baner

## Kendte issues

- Flight labels kan overlappe ved mange tætte discs

## Arbejdsflow

- Planlægning og prompts: Claude.ai-projektet
- Implementering: Claude Code i WSL2/Ubuntu terminal
  cd ~/min-disc && claude --dangerously-skip-permissions
- Vercel auto-deployer ved push til GitHub main
