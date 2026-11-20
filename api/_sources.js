// Good Plans — extra event sources read by /api/ingest (on top of the Apps Script newsletter feed).
// Principle: civic, community and independent venues; organizers' own pages; no ticket marketplaces.
// cadence: how often the page is read. horizon: days ahead worth keeping. Add or retire sources here.
export const SOURCES = [
  { id: "nypl", name: "NYPL", url: "https://www.nypl.org/events/calendar", cadence: "daily", horizon: 30, hint: "free library programs: talks, book clubs, classes, film, kids" },
  { id: "bpl", name: "Brooklyn Public Library", url: "https://www.bklynlibrary.org/calendar", cadence: "daily", horizon: 30, hint: "free library programs in Brooklyn" },
  { id: "metrograph", name: "Metrograph", url: "https://metrograph.com/nyc/", cadence: "weekly", horizon: 30, hint: "repertory cinema screenings, Lower East Side" },
  { id: "anthology", name: "Anthology Film Archives", url: "https://anthologyfilmarchives.org/film_screenings/calendar", cadence: "weekly", horizon: 30, hint: "repertory and avant-garde cinema, East Village" },
  { id: "filmforum", name: "Film Forum", url: "https://filmforum.org/", cadence: "weekly", horizon: 30, hint: "repertory cinema, West Village" },
  { id: "smalls", name: "Smalls Jazz Club", url: "https://www.smallslive.com/events/", cadence: "weekly", horizon: 30, hint: "live jazz, West Village" },
  { id: "92ny", name: "92NY", url: "https://www.92ny.org/events", cadence: "weekly", horizon: 60, hint: "talks, lectures, readings, classes" },
  { id: "brainery", name: "Brooklyn Brainery", url: "https://brooklynbrainery.com/classes", cadence: "weekly", horizon: 60, hint: "cheap one-off classes" },
  { id: "nycares", name: "New York Cares", url: "https://www.newyorkcares.org/volunteer", cadence: "weekly", horizon: 30, hint: "volunteering, a good way to meet people" },
  { id: "moma-ps1", name: "MoMA PS1", url: "https://www.momaps1.org/calendar", cadence: "monthly", horizon: 90, hint: "exhibitions and programs, Queens" },
  { id: "whitney-pgm", name: "Whitney Museum programs", url: "https://whitney.org/events", cadence: "monthly", horizon: 90, hint: "talks, tours, free-night programs" },
  { id: "bam-free", name: "BAM free programs", url: "https://www.bam.org/", cadence: "monthly", horizon: 90, hint: "BAM programs, Fort Greene" },
];
