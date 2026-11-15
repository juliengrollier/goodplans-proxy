// Good Plans: share each phone's learned taste, for the "Together" view.
// 1. Paste this file into the goodplans-appsscript project (new file "taste-sync").
// 2. In doGet(e), right after the secret-key check, add:
//      if (e.parameter.action === 'tasteGet') return gpJson_(gpTasteGet_(e.parameter));
// 3. If the project has no doPost yet, this file's doPost below is enough.
//    If it already has one, add at its top:  if (e.parameter.action === 'tastePut') return gpTastePutPost_(e);
//    and delete the doPost in this file.
// 4. Deploy → Manage deployments → edit → Version: New version → Deploy (the URL stays the same).
// gpJson_ is defined in calendar-sync.gs.

const GP_PEOPLE = ['Julien', 'Theo'];

function gpTasteGet_(p) {
  if (GP_PEOPLE.indexOf(p.who) < 0) return { error: 'Unknown person' };
  const raw = PropertiesService.getScriptProperties().getProperty('taste_' + p.who);
  return raw ? JSON.parse(raw) : { error: 'No taste shared yet' };
}

function gpTastePutPost_(e) {
  const p = e.parameter || {};
  // Same secret as doGet. Replace GP_SECRET with however your doGet reads its key, if different.
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  if (secret && p.key !== secret) return gpJson_({ error: 'Unauthorized' });
  if (GP_PEOPLE.indexOf(p.who) < 0) return gpJson_({ error: 'Unknown person' });
  const body = (e.postData && e.postData.contents) || '';
  if (body.length > 9000) return gpJson_({ error: 'Too large' });
  const d = JSON.parse(body);
  if (!d || typeof d.w !== 'object') return gpJson_({ error: 'Bad taste data' });
  PropertiesService.getScriptProperties().setProperty('taste_' + p.who, body);
  return gpJson_({ ok: true });
}

function doPost(e) {
  if (e.parameter && e.parameter.action === 'tastePut') return gpTastePutPost_(e);
  return gpJson_({ error: 'Unknown action' });
}
