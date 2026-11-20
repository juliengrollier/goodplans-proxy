// Good Plans — extra event sources read by /api/ingest (on top of the Apps Script newsletter feed).
// Principle: civic, community and independent venues; organizers' own pages; no ticket marketplaces.
// off: set a reason to pause a source (it is skipped until the reason is fixed).
// cadence: how often the page is read. horizon: days ahead worth keeping. Add or retire sources here.
export const SOURCES = [
  { id: "nypl", off: "page is rendered by JavaScript (no events in the HTML); needs the NYPL events API", name: "NYPL", url: "https://www.nypl.org/events/calendar", cadence: "daily", horizon: 30, hint: "free library programs: talks, book clubs, classes, film, kids" },
  { id: "bpl", off: "JavaScript calendar (Communico); needs its feed", name: "Brooklyn Public Library", url: "https://www.bklynlibrary.org/calendar", cadence: "daily", horizon: 30, hint: "free library programs in Brooklyn" },
  { id: "metrograph", off: "site blocks server requests (403)", name: "Metrograph", url: "https://metrograph.com/nyc/", cadence: "weekly", horizon: 30, hint: "repertory cinema screenings, Lower East Side" },
  { id: "anthology", off: "page not readable as text by the extractor", name: "Anthology Film Archives", url: "https://anthologyfilmarchives.org/film_screenings/calendar", cadence: "weekly", horizon: 30, hint: "repertory and avant-garde cinema, East Village" },
  { id: "filmforum", name: "Film Forum", url: "https://filmforum.org/", cadence: "weekly", horizon: 30, hint: "repertory cinema, West Village" },
  { id: "smalls", off: "URL gives 404; find the right calendar page", name: "Smalls Jazz Club", url: "https://www.smallslive.com/events/", cadence: "weekly", horizon: 30, hint: "live jazz, West Village" },
  { id: "92ny", off: "JavaScript-rendered; needs its feed", name: "92NY", url: "https://www.92ny.org/events", cadence: "weekly", horizon: 60, hint: "talks, lectures, readings, classes" },
  { id: "brainery", off: "JavaScript-rendered; needs its feed", name: "Brooklyn Brainery", url: "https://brooklynbrainery.com/classes", cadence: "weekly", horizon: 60, hint: "cheap one-off classes" },
  { id: "nycares", off: "JavaScript-rendered; needs its feed", name: "New York Cares", url: "https://www.newyorkcares.org/volunteer", cadence: "weekly", horizon: 30, hint: "volunteering, a good way to meet people" },
  { id: "moma-ps1", name: "MoMA PS1", url: "https://www.momaps1.org/calendar", cadence: "monthly", horizon: 90, hint: "exhibitions and programs, Queens" },
  { id: "whitney-pgm", name: "Whitney Museum programs", url: "https://whitney.org/events", cadence: "monthly", horizon: 90, hint: "talks, tours, free-night programs" },
  { id: "bam", name: "BAM", url: "https://www.bam.org/", cadence: "monthly", horizon: 90, hint: "BAM programs, Fort Greene" },
];
