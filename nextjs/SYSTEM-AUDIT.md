# Systemgranskning - Fullstack CRM

> Genererad: 2026-04-09
> Syfte: Identifiera frånkopplade moduler, saknade kopplingar och föreslagna nya funktioner

---

## Innehåll

1. [Systemöversikt](#1-systemöversikt)
2. [Helt isolerade modeller](#2-helt-isolerade-modeller)
3. [Underkopplade modeller](#3-underkopplade-modeller)
4. [Saknade korskopplingar](#4-saknade-korskopplingar-mellan-moduler)
5. [Saknad CRUD-funktionalitet](#5-saknad-crud-funktionalitet)
6. [Föreslagna kopplingar](#6-föreslagna-kopplingar-mellan-befintliga-moduler)
7. [10 nya funktionsförslag](#7-10-nya-funktionsförslag)

---

## 1. Systemöversikt

Systemet är ett svenskspråkigt CRM- och affärshanteringssystem byggt med Next.js 16, Prisma ORM och MySQL. Det har en separat Fastify-mikrotjänst för web scraping (Bolagsfakta Pipeline).

### Modulkarta

```
HUVUD
  └── Dashboard (översikt med KPI:er och senaste aktivitet)

CRM
  ├── Kunder (/kunder) - kundregister med detaljvy och flikar
  ├── Prospekts (/prospekts) - Kanban-tavla för säljpipeline
  ├── Kontakter (/kontakter) - kontaktpersoner kopplade till kunder
  └── Bolagsfakta Pipeline (/pipelines) - scraping av företagsdata + redlist

AFFÄR
  ├── Offerter (/offerter) - offerthantering med rader och statusflöde
  ├── Avtal (/avtal) - avtalshantering kopplad till offerter och mallar
  ├── Fakturor (/fakturor) - fakturering med rader och betalningsspårning
  └── Projekt (/projekt) - projekthantering med features, board och ekonomi

ARBETE
  ├── Uppgifter (/uppgifter) - Kanban-tavla (TODO → IN_PROGRESS → REVIEW → DONE)
  ├── Möten (/moten) - kommande och tidigare möten
  └── Support (/support) - supportärenden med kommentarer

SYSTEM
  ├── Rapporter (/rapporter) - KPI-dashboard (intäkter, fakturor, CRM, support)
  ├── Systemloggar (/systemloggar) - auditlogg med paginering
  └── Inställningar (/installningar) - företagsuppgifter och dokumentprefix
```

### Prisma-schema: 57 modeller totalt

**Kärnmodeller (2):** User, Customer
**CRM (7):** Contact, ProspectStage, ProspectStageHistory, Activity, CustomerFlowNote, CustomerFlowOccurredAtOverride, Outreach
**Försäljning (4):** Quote, QuoteLineItem, Contract, ContractTemplate
**Fakturering (3):** Invoice, InvoiceLineItem, Payment
**Filer (1):** File
**E-post (3):** EmailTemplate, OutboundEmail, EmailContact
**Uppgifter (2):** Task, TaskComment
**Support (2):** SupportTicket, TicketComment
**Möten (2):** Meeting, MeetingAttendee
**Dokument (1):** Document
**Notifikationer (1):** Notification
**Rapporter (1):** Report
**Integrationer (1):** Integration
**Inställningar (1):** SystemSetting
**Team (1):** TeamMember
**Kostnader (1):** Expense
**Kampanjer (1):** Campaign
**Kunskapsbas (1):** KnowledgeBase
**Systembehov (4):** SystemRequirement, SystemFeature, SystemSubtask, SystemUpdate
**Bolagsfakta (5):** BolagsfaktaBransch, BolagsfaktaPipeline, BolagsfaktaForetag, BolagsfaktaRedlistEntry, BolagsfaktaData
**Projekt (7):** Project, ProjectCustomer, ProjectLink, ProjectFeature, ProjectSubtask, ProjectBoardColumn, ProjectBoardCard, ProjectFinanceEntry

---

## 2. Helt isolerade modeller

Dessa modeller finns definierade i Prisma-schemat men har **varken API-endpoints eller UI-sidor**. De är helt oanvända i systemet.

| # | Modell | FK-relationer | Beskrivning | Problem |
|---|--------|---------------|-------------|---------|
| 1 | **EmailTemplate** | Inga | E-postmallar med variabler | Helt isolerad - ingen koppling till OutboundEmail eller Outreach |
| 2 | **Integration** | Inga | Konfiguration för tredjepartstjänster (API-nycklar, webhooks) | Helt isolerad - ingen CRUD, ingen UI |
| 3 | **KnowledgeBase** | Inga | Artiklar med kategorier, taggar och publicering | Helt isolerad - ingen UI-sida, inget API |
| 4 | **Document** | Customer, User | Dokumenthantering med versioner och kategorier | Har FK men ingen API eller UI-sida |
| 5 | **File** | Customer | Fillagring med MIME-typ, storlek och mappar | Har FK men ingen API eller UI-sida |
| 6 | **Report** (modellen) | User | Sparade rapporter med parametrar och data | Rapportsidan (/rapporter) använder direkta Prisma-queries - Report-modellen används aldrig |
| 7 | **Notification** | User | Notifikationer med typ, läs-status och länkar | Fullständig modell med 11 typer men ingen UI (ingen notifikationsklocka) |
| 8 | **TeamMember** | User | Avdelning, titel och anställningsdatum | Har FK till User men ingen UI eller API |
| 9 | **Campaign** | Customer | Marknadsföringskampanjer med budget och status | Har FK till Customer men ingen dedikerad sida |
| 10 | **Expense** | projectId (EJ FK!) | Kostnadshantering med godkännandeflöde | `projectId` är en sträng - inte en Prisma-relation till Project |
| 11 | **Payment** | Invoice | Betalningsregistrering med metod och referens | Har FK till Invoice men ingen API eller UI - betalningar kan inte registreras |

---

## 3. Underkopplade modeller

Dessa modeller fungerar i systemet men saknar viktiga kopplingar till resten.

### 3.1 Task (Uppgift)

**Problem:** Task-modellen har bara en FK till User (assignee). Den saknar koppling till:
- Customer (ingen uppgift kan kopplas till en kund)
- Project (ingen uppgift kan kopplas till ett projekt)
- Quote/Invoice/Contract (inga affärsentiteter)

**Konsekvens:** Uppgiftstavlan (/uppgifter) är en helt isolerad Kanban-tavla utan koppling till affärsverksamheten.

**Schema idag:**
```prisma
model Task {
  assignedTo String?      // FK till User
  // Saknas: customerId, projectId
}
```

### 3.2 Meeting (Möte)

**Problem:** Meeting-modellen har inga FK till Customer eller Project. Den kopplar bara till User/Contact via MeetingAttendee.

**Konsekvens:** Möten kan inte filtreras eller visas per kund eller projekt. De dyker inte upp i kundvyn.

**Schema idag:**
```prisma
model Meeting {
  // Saknas: customerId, projectId
  attendees MeetingAttendee[]  // Enda kopplingen
}
```

### 3.3 ContractTemplate (Avtalsmall)

**Problem:** Modellen finns och refereras av Contract, men det finns ingen UI för att skapa, redigera eller lista avtalsmallar.

**Konsekvens:** Avtalssystemet har mallstöd i databasen men det går inte att använda det.

### 3.4 Expense (Kostnad)

**Problem:** Expense har ett `projectId`-fält av typen `String?`, men det är **inte en Prisma FK-relation** till Project-modellen.

**Konsekvens:** Prisma kan inte göra joins eller include/cascade mellan Expense och Project. Projektvyn (/projekt/[id]) har en ekonomiflik men den använder `ProjectFinanceEntry` - inte `Expense`.

---

## 4. Saknade korskopplingar mellan moduler

Följande kopplingar saknas helt mellan befintliga moduler:

| # | Från | Till | Saknas | Konsekvens |
|---|------|------|--------|------------|
| 1 | **Quote** (Offert) | **Invoice** (Faktura) | Ingen FK `quoteId` på Invoice | Kan inte skapa faktura från accepterad offert |
| 2 | **Task** (Uppgift) | **Customer** (Kund) | Ingen FK `customerId` på Task | Kan inte koppla uppgifter till kunder |
| 3 | **Task** (Uppgift) | **Project** (Projekt) | Ingen FK `projectId` på Task | Kan inte koppla uppgifter till projekt |
| 4 | **Meeting** (Möte) | **Customer** (Kund) | Ingen FK `customerId` på Meeting | Möten visas inte i kundflödet |
| 5 | **Meeting** (Möte) | **Project** (Projekt) | Ingen FK `projectId` på Meeting | Kan inte koppla möten till projekt |
| 6 | **Project** (Projekt) | **Invoice** (Faktura) | Ingen FK | Projektekonomi är separat från fakturering |
| 7 | **Outreach** | **EmailTemplate** | Ingen FK | Outreach-meddelanden kan inte använda e-postmallar |
| 8 | **SupportTicket** | **Project** (Projekt) | Ingen FK | Kan inte koppla supportärenden till projekt |

---

## 5. Saknad CRUD-funktionalitet

Följande moduler har UI-sidor men saknar fullständig funktionalitet:

| Modul | Läsa | Skapa | Redigera | Ta bort | Saknas |
|-------|------|-------|----------|---------|--------|
| **Möten** (/moten) | Ja (server-side) | Nej | Nej | Nej | Helt saknar API - bara läsvy |
| **Avtal** (/avtal) | Ja | Nej (ingen /avtal/ny) | Ja | Ja | Saknar "skapa nytt avtal"-sida |
| **Avtalsmallar** | Nej | Nej | Nej | Nej | Ingen UI alls |
| **Betalningar** | Via faktura | Nej | Nej | Nej | Kan inte registrera betalningar |
| **Faktura-detalj** | Ja (/fakturor/[id]) | - | Delvis | - | Saknar API-route för PATCH |
| **Uppgiftskommentarer** | Nej | Nej | Nej | Nej | TaskComment har ingen API |
| **Supportkommentarer** | Via sida | Nej | Nej | Nej | TicketComment har ingen API |

---

## 6. Föreslagna kopplingar mellan befintliga moduler

Baserat på analyserna ovan föreslås följande kopplingar för att göra systemet mer sammanhängande:

### Prioritet: Hög

#### 6.1 Koppla Task till Customer och Project
**Ändring i schema:**
```prisma
model Task {
  customerId String?
  projectId  String?
  customer   Customer? @relation(...)
  project    Project?  @relation(...)
}
```
**Effekt:** Uppgifter kan filtreras per kund/projekt. Visas i kundvyn och projektvyn.

#### 6.2 Koppla Meeting till Customer
**Ändring i schema:**
```prisma
model Meeting {
  customerId String?
  customer   Customer? @relation(...)
}
```
**Effekt:** Möten visas i kundflödet (/kunder/[id] → Flöde-flik). Kan filtreras per kund.

#### 6.3 Koppla Invoice till Quote (offert → faktura)
**Ändring i schema:**
```prisma
model Invoice {
  quoteId String?
  quote   Quote? @relation(...)
}
```
**Effekt:** "Skapa faktura från offert"-knapp på accepterade offerter. Rader kopieras automatiskt.

#### 6.4 Lägg till Payment-API och UI
**Effekt:** Användare kan registrera betalningar direkt på en faktura. Betalningsmetod, belopp och referens sparas.

### Prioritet: Medel

#### 6.5 Koppla Meeting till Project
**Effekt:** Projektmöten visas i projektöversikten.

#### 6.6 Koppla Outreach till EmailTemplate
**Effekt:** Outreach-meddelanden kan byggas från mallar istället för att skrivas från scratch.

#### 6.7 Koppla SupportTicket till Project
**Effekt:** Supportärenden som rör specifika projekt kan spåras.

#### 6.8 Fixa Expense ↔ Project FK-relation
**Ändring i schema:**
```prisma
model Expense {
  projectId String?
  project   Project? @relation(...)
}
```
**Effekt:** Kostnader kan kopplas ordentligt till projekt med Prisma includes/joins.

### Prioritet: Låg

#### 6.9 Skapa CRUD för ContractTemplate
**Effekt:** Användare kan hantera avtalsmallar i UI, använda dem vid avtalsskapande.

#### 6.10 Koppla Campaign till Outreach
**Effekt:** Kampanjer kan innehålla planerade outreach-aktiviteter.

---

## 7. 10 nya funktionsförslag

### 1. Global sökning
**Prioritet:** Hög
**Beskrivning:** En sökruta i topbar som söker över alla moduler - kunder, kontakter, offerter, fakturor, projekt, uppgifter och supportärenden. Resultaten grupperas per modul med snabblänkar.
**Berörda modeller:** Customer, Contact, Quote, Invoice, Project, Task, SupportTicket
**Komplexitet:** Medel - kräver en ny API-endpoint som söker i flera tabeller parallellt, plus en sökkomponent i topbar.

---

### 2. Kalendervy
**Prioritet:** Hög
**Beskrivning:** En visuell kalender (månads-/vecko-/dagsvy) som visar alla tidsrelaterade händelser: möten, uppgifter med deadline, planerad outreach, förfallodatum på fakturor och offerter.
**Berörda modeller:** Meeting, Task, Outreach, Invoice, Quote
**Komplexitet:** Medel - ny sida /kalender med kalenderkomponent, hämtar data från flera modeller.

---

### 3. E-postklient
**Prioritet:** Hög
**Beskrivning:** Faktiskt skicka e-post via SMTP direkt från systemet. Använder befintlig EmailTemplate-modell för mallar. Loggar alla skickade mail i OutboundEmail. Integreras med Outreach och kundvyn.
**Berörda modeller:** EmailTemplate (aktiveras), OutboundEmail (aktiveras), EmailContact (aktiveras), Outreach
**Komplexitet:** Hög - kräver SMTP-konfiguration, mallrenderare med variabler, och skicka-funktionalitet.

---

### 4. Notifikationscenter
**Prioritet:** Hög
**Beskrivning:** En notifikationsklocka i topbar som visar olästa aviseringar. Använder befintlig Notification-modell. Triggas av händelser som: ny uppgift tilldelad, offert accepterad, faktura betald, supportärende skapat, möte snart.
**Berörda modeller:** Notification (aktiveras)
**Komplexitet:** Medel - notifikationsmodellen finns redan, behöver API-endpoints + UI-komponent + trigger-logik.

---

### 5. PDF-generering
**Prioritet:** Hög
**Beskrivning:** Generera professionella PDF-dokument av offerter, fakturor och avtal. Använder företagsuppgifter från SystemSetting. Inkluderar logotyp, rader, summor, villkor.
**Berörda modeller:** Quote, Invoice, Contract, SystemSetting
**Komplexitet:** Medel - kräver PDF-bibliotek (t.ex. Puppeteer/html-to-pdf), HTML-mallar och nedladdnings-endpoint.

---

### 6. Import/Export
**Prioritet:** Medel
**Beskrivning:** Importera kunder och kontakter från CSV/Excel-filer. Exportera rapporter, kundlistor och fakturor till CSV/Excel. Mappning av kolumner vid import.
**Berörda modeller:** Customer, Contact, Invoice, Report
**Komplexitet:** Medel - kräver fil-upload, parsning (Papa Parse/SheetJS), validering och bulk-insert.

---

### 7. Kundinsikter (Customer 360-vy)
**Prioritet:** Medel
**Beskrivning:** En aggregerad insiktsvy per kund som visar: total intäkt (betalda fakturor), öppna offerter, aktiva projekt, kommande möten, öppna supportärenden, pågående uppgifter, och en tidslinje med all interaktion.
**Berörda modeller:** Customer, Invoice, Quote, Project, Meeting, SupportTicket, Task, Activity
**Komplexitet:** Medel - dashboard-komponent på kunddetaljsidan med aggregerade queries. Förutsätter att kopplingar från sektion 6 implementeras först.

---

### 8. Automatiserade arbetsflöden
**Prioritet:** Medel
**Beskrivning:** Automatiska åtgärder baserade på händelser:
- Offert accepterad → Skapa fakturautkast automatiskt
- Faktura förfallen → Skicka påminnelsenotifikation
- Nytt supportärende → Notifiera ansvarig användare
- Prospekt byter steg → Skapa uppföljningsuppgift
**Berörda modeller:** Quote, Invoice, Notification, Task, SupportTicket, ProspectStageHistory
**Komplexitet:** Hög - kräver en event-/hook-motor som reagerar på databasändringar.

---

### 9. Kunskapsbas-portal
**Prioritet:** Låg
**Beskrivning:** Använd befintlig KnowledgeBase-modell för att skapa ett internt wiki/hjälpsystem. Artiklar med kategorier, taggar och publicering. Sökbar. Kan användas för intern dokumentation, processbeskrivningar eller kundvänlig FAQ.
**Berörda modeller:** KnowledgeBase (aktiveras)
**Komplexitet:** Medel - ny sida /kunskapsbas med CRUD, kategorinavigation, sökfunktion och publicering.

---

### 10. Aktivitets-dashboard med teamöversikt
**Prioritet:** Medel
**Beskrivning:** En utökad dashboard som visar teamets arbetsbelastning: vem har flest uppgifter, vem har möten idag, vilka fakturor är förfallna, vilka offerter väntar på svar. Inkluderar trenddiagram (intäkter per månad, nya kunder per vecka).
**Berörda modeller:** User, TeamMember (aktiveras), Task, Meeting, Invoice, Quote, Customer, Activity
**Komplexitet:** Medel-Hög - kräver aggregerade queries och enkel diagramkomponent (t.ex. Recharts).

---

## Sammanfattning

| Kategori | Antal |
|----------|-------|
| Helt isolerade modeller | 11 |
| Underkopplade modeller | 4 |
| Saknade korskopplingar | 8 |
| Saknad CRUD-funktionalitet | 6 moduler |
| Föreslagna kopplingar | 10 |
| Nya funktionsförslag | 10 |

### Prioriterad ordning för implementation

**Fas 1 - Kopplingar (grund):**
1. Task ↔ Customer/Project (6.1)
2. Meeting ↔ Customer (6.2)
3. Invoice ↔ Quote (6.3)
4. Payment API + UI (6.4)

**Fas 2 - Nya funktioner (hög prioritet):**
5. Global sökning (7.1)
6. Notifikationscenter (7.4)
7. PDF-generering (7.5)
8. Kalendervy (7.2)

**Fas 3 - Nya funktioner (medel/låg):**
9. E-postklient (7.3)
10. Kundinsikter 360 (7.7)
11. Import/Export (7.6)
12. Automatiserade arbetsflöden (7.8)
13. Aktivitets-dashboard (7.10)
14. Kunskapsbas-portal (7.9)
