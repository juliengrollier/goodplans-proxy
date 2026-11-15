// Good Plans: mirror saved events into Google Calendar.
// 1. Paste this file into the goodplans-appsscript project (new file "calendar-sync").
// 2. In doGet(e), right after the secret-key check, add these two lines:
//      if (e.parameter.action === 'calAdd')    return gpJson_(gpCalAdd_(e.parameter));
//      if (e.parameter.action === 'calRemove') return gpJson_(gpCalRemove_(e.parameter));
// 3. Deploy → Manage deployments → edit → Version: New version → Deploy (the URL stays the same).

const GP_TZ = 'America/New_York';

function gpCal_() {
  return CalendarApp.getDefaultCalendar();
}

function gpCalAdd_(p) {
  try {
    if (!p.title || !p.start) return { error: 'Missing title or start' };
    const cal = gpCal_();
    const opts = { location: p.loc || '', description: p.desc || '' };
    let ev;
    if (p.allDay === '1') {
      ev = cal.createAllDayEvent(p.title, Utilities.parseDate(p.start, GP_TZ, 'yyyy-MM-dd'), opts);
    } else {
      const s = Utilities.parseDate(p.start, GP_TZ, "yyyy-MM-dd'T'HH:mm");
      const e = Utilities.parseDate(p.end || p.start, GP_TZ, "yyyy-MM-dd'T'HH:mm");
      ev = cal.createEvent(p.title, s, e > s ? e : new Date(s.getTime() + 2 * 3600e3), opts);
    }
    ev.setTag('goodplans', p.gpid || '');
    return { ok: true, gid: ev.getId() };
  } catch (err) {
    return { error: 'calAdd: ' + err.message };
  }
}

function gpCalRemove_(p) {
  try {
    const ev = p.gid ? gpCal_().getEventById(p.gid) : null;
    if (ev) ev.deleteEvent();
    return { ok: true };
  } catch (err) {
    return { error: 'calRemove: ' + err.message };
  }
}

function gpJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
