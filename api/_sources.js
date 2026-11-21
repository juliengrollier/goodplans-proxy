// Good Plans — extra event sources read by /api/ingest (on top of the Apps Script newsletter feed).
// Principle: civic, community and independent venues; organizers' own pages; no ticket marketplaces.
// off: set a reason to pause a source (it is skipped until the reason is fixed).
// cadence: how often the page is read. horizon: days ahead worth keeping. Add or retire sources here.
export const SOURCES = [
  { id: "jazzgallery", name: "The Jazz Gallery", kind: "squarespace", url: "https://jazzgallery.org/calendar?format=json", cadence: "daily", horizon: 45, hint: "live jazz, Flatiron" },
  { id: "prospectpark", name: "Prospect Park Alliance", kind: "tribe", hood: "Brooklyn", venue: "Prospect Park", url: "https://www.prospectpark.org/wp-json/tribe/events/v1/events?per_page=50", cadence: "daily", horizon: 30, hint: "park programs, wellness, kids, walks, volunteering" },
  { id: "greenwood", name: "Green-Wood", kind: "tribe", hood: "Brooklyn", venue: "Green-Wood Cemetery", url: "https://www.green-wood.com/wp-json/tribe/events/v1/events?per_page=50", cadence: "daily", horizon: 45, hint: "cemetery tours, walks, kids story hours, concerts" },
  { id: "queensbotanical", name: "Queens Botanical Garden", kind: "tribe", hood: "Queens", venue: "Queens Botanical Garden", url: "https://www.queensbotanical.org/wp-json/tribe/events/v1/events?per_page=50", cadence: "daily", horizon: 30, hint: "garden volunteering, farm hours, family and nature programs" },
  { id: "riversidepark", name: "Riverside Park Conservancy", kind: "tribe", hood: "Manhattan", venue: "Riverside Park", url: "https://riversideparknyc.org/wp-json/tribe/events/v1/events?per_page=50", cadence: "daily", horizon: 30, hint: "pilates, forest bathing, walks, volunteering, kids" },
  { id: "skint", kind: "skint", name: "The Skint", url: "https://theskint.com/feed/", cadence: "daily", horizon: 10, hint: "editors' picks of free and cheap NYC events, all kinds. Each POST title gives the date range (e.g. FRI-MON, 11/20-23) and event lines start with a weekday or day label ('fri 4-8pm', 'sat', 'thru 1/3/2027' means an end date): turn each weekday into its real date inside that range, year 2026 unless stated, and skip days already past. Link in [brackets] after a line is the event page. Skip ticketed arena shows and attractions over $30"},
  { id: "nycparks", name: "NYC Parks", kind: "nycparks", url: "https://www.nycgovparks.org/xml/events_300_rss.json", cadence: "daily", horizon: 14, hint: "official NYC Parks feed: recreation-center classes, runs, volunteering, kids, tours, concerts, movies" },
  { id: "nypl", off: "page is rendered by JavaScript (no events in the HTML); needs the NYPL events API", name: "NYPL", url: "https://www.nypl.org/events/calendar", cadence: "daily", horizon: 30, hint: "free library programs: talks, book clubs, classes, film, kids" },
  { id: "bpl", off: "JavaScript calendar (Communico); needs its feed", name: "Brooklyn Public Library", url: "https://www.bklynlibrary.org/calendar", cadence: "daily", horizon: 30, hint: "free library programs in Brooklyn" },
  { id: "metrograph", off: "site blocks server requests (403)", name: "Metrograph", url: "https://metrograph.com/nyc/", cadence: "weekly", horizon: 30, hint: "repertory cinema screenings, Lower East Side" },
  { id: "anthology", kind: "anthology", name: "Anthology Film Archives", url: "https://www.anthologyfilmarchives.org/rss", cadence: "daily", horizon: 30, hint: "repertory and avant-garde cinema, East Village (feed lists dates only, no showtimes; leave time empty)" },
  { id: "filmforum", name: "Film Forum", url: "https://filmforum.org/", cadence: "weekly", horizon: 30, hint: "repertory cinema, West Village" },
  { id: "smalls", off: "URL gives 404; find the right calendar page", name: "Smalls Jazz Club", url: "https://www.smallslive.com/events/", cadence: "weekly", horizon: 30, hint: "live jazz, West Village" },
  { id: "92ny", off: "JavaScript-rendered; needs its feed", name: "92NY", url: "https://www.92ny.org/events", cadence: "weekly", horizon: 60, hint: "talks, lectures, readings, classes" },
  { id: "brainery", off: "JavaScript-rendered; needs its feed", name: "Brooklyn Brainery", url: "https://brooklynbrainery.com/classes", cadence: "weekly", horizon: 60, hint: "cheap one-off classes" },
  { id: "nycares", off: "JavaScript-rendered; needs its feed", name: "New York Cares", url: "https://www.newyorkcares.org/volunteer", cadence: "weekly", horizon: 30, hint: "volunteering, a good way to meet people" },
  { id: "moma-ps1", name: "MoMA PS1", url: "https://www.momaps1.org/calendar", cadence: "monthly", horizon: 90, hint: "exhibitions and programs, Queens" },
  { id: "whitney-pgm", name: "Whitney Museum programs", url: "https://whitney.org/events", cadence: "monthly", horizon: 90, hint: "talks, tours, free-night programs" },
  { id: "bam", name: "BAM", url: "https://www.bam.org/", cadence: "monthly", horizon: 90, hint: "BAM programs, Fort Greene" },
];
