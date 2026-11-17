# Exact dates in the Apps Script extraction

The extraction (Claude call inside the "Good Plans Bridge" script) keeps one record per event.
Add two optional fields to the JSON schema it asks for. Single-date events don't need them.

## 1. Add to the output schema description

```
"dows":  optional. Only when the event runs over several days but only on some weekdays
         (e.g. "Sundays", "Thu-Sun", "weekdays", "closed Mondays").
         Array of weekday numbers, 0=Sunday ... 6=Saturday. Omit if it runs every day of the range.
"dates": optional. Only when the listing names specific dates that are NOT a regular weekday
         pattern (e.g. "Nov 15, 22 and 29", "Nov 6 & Nov 20"). Array of "YYYY-MM-DD", sorted.
         Omit for single-day events and for events that run every day of the range.
```

## 2. Add to the rules

```
- "E" is the first date and "X" the last date the event takes place. Never stretch the range
  to cover days it does not happen: if it happens on Nov 15 and Nov 22 only, return
  E=Nov 15, X=Nov 22 and dates=["2026-11-15","2026-11-22"].
- Use "dows" for a weekly pattern, "dates" for an irregular list. Never both.
- One record per event, even for a multi-date run. Do not output one record per date.
```

## 3. Guard the output (after JSON.parse)

```js
ev.dates = Array.isArray(ev.dates) ? ev.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= ev.E && d <= (ev.X || ev.E)).sort() : undefined;
if (ev.dates && ev.dates.length < 2) ev.dates = undefined;
ev.dows = Array.isArray(ev.dows) ? ev.dows.map(Number).filter(n => n >= 0 && n <= 6) : undefined;
if (ev.dates) ev.dows = undefined;
```

## App side (already in the app)

`evCovers` uses `dates` first, then `dows`, then the text guess (`runDows`) for events without either field,
so nothing changes for the current feed until the script returns the new fields.
