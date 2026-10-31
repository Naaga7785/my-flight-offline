MY FLIGHT — INTEGRATED OFFLINE BUILD (30 OCT 2026)

This is a downloadable, integrated app build, not a certification of FTL compliance.

What works:
- Existing Flight Log, salary-cycle calculation, Fixed Block, Vacation, Backup/Restore and Excel import remain present.
- Easier flight entry: accepts HHMM, uppercases airports, suggests next FROM after saving, retains date, supports calendar and airport swap.
- New Duty Reporting in Flight Log; Duty tab links flight sectors across adjacent UTC dates.
- Basic FDP Table 7.4 and planned-extension Table 7.7 lookup, normal flight duty finish (+15 minutes), basic home-base/outstation rest, additional travel adjustment, recorded rolling totals and duty history.
- Existing IndexedDB database name and schema are retained. Backup exports include the new duty fields.

CRITICAL LIMITATIONS:
- The Duty tab is a planning/reference tool ONLY. It does NOT determine operational legality or authorize a planned/PIC extension.
- WOCL, acclimatization changes, delayed reporting, positioning, standby, reserve, split duty, in-flight rest, recurrent recovery, FRM and some exceptions are not fully automated.
- All reference times are treated as Vietnam local UTC+7; this is not suitable for all overseas reporting locations.
- Rolling totals are recorded data only, not validated remaining regulatory allowances; 365-day is not 12 consecutive calendar months.
- Normal flight post-duty +15 minutes is not appropriate for every duty type.
- Existing records lacking reporting time cannot be reconstructed automatically.

SAFETY / DEPLOYMENT:
1. Keep your existing production app untouched until a separate test is completed.
2. Export BACKUP ALL DATA from your CURRENT production app and save the JSON outside the browser.
3. Test this version under a DIFFERENT URL/path first, not by replacing production files.
4. An app opened from file:// may not persist offline storage or register the service worker; host over HTTPS.
5. Do not clear Safari website data or remove the home-screen app.
6. Verify existing flights, salary cycles, vacation data and backups before considering any production deployment.

This build was syntax checked, not end-to-end tested on your iPad or certified against all OM-A rules.
