/* Fully local .xlsx parser; JSZip bundled with the app. No external requests. */
let excelRows=[];
const xe=(n,tag)=>[...n.getElementsByTagName('*')].filter(x=>x.localName===tag);
function xml(s,part='XML'){if(typeof s!=='string')throw Error('Missing Excel component: '+part);const d=new DOMParser().parseFromString(s.replace(/^\uFEFF/,''),'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('Cannot read Excel component: '+part);return d}
function excelDate(v){if(/^\d{4}-\d\d-\d\d$/.test(String(v)))return v;const d=Number(v);if(Number.isFinite(d)&&d>20000&&d<100000)return new Date(Date.UTC(1899,11,30)+d*86400000).toISOString().slice(0,10);const m=String(v).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return null}
async function readXlsx(file){if(!file?.name.toLowerCase().endsWith('.xlsx'))throw Error('Choose an .xlsx file');if(file.size>15000000)throw Error('Excel file too large');const z=await JSZip.loadAsync(await file.arrayBuffer());const read=async p=>z.file(p)?await z.file(p).async('string'):null;const wb=xml(await read('xl/workbook.xml'),'workbook');const rel=xml(await read('xl/_rels/workbook.xml.rels'),'workbook relationships');const links={};for(const r of xe(rel,'Relationship'))links[r.getAttribute('Id')]=r.getAttribute('Target');const shared=await read('xl/sharedStrings.xml');const strings=shared?xe(xml(shared),'si').map(si=>xe(si,'t').map(t=>t.textContent).join('')):[];const sheets=xe(wb,'sheet');const all=[];for(const sheet of sheets){const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');let path=links[rid];if(!path)continue;path=path.replace(/^\//,'');if(!path.startsWith('xl/'))path='xl/'+path.replace(/^\.\.\//,'');const body=await read(path);if(!body)continue;const doc=xml(body),rows=[];for(const row of xe(doc,'row')){const cells=[];for(const c of [...row.children].filter(x=>x.localName==='c')){const ref=c.getAttribute('r')||'A1';let col=0;for(const ch of ref.match(/^[A-Z]+/)?.[0]||'A')col=col*26+ch.charCodeAt(0)-64;const typ=c.getAttribute('t'),v=[...c.children].find(x=>x.localName==='v');const inline=xe(c,'t').map(x=>x.textContent).join('');cells[col-1]=typ==='s'?strings[Number(v?.textContent)]||'':typ==='inlineStr'?inline:(v?.textContent??inline)}rows.push(cells)}all.push({name:sheet.getAttribute('name'),rows})}return all}
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function column(label,id,n,def){return `<label>${label}<select id="${id}">${Array.from({length:n},(_,i)=>`<option value="${i}" ${i===def?'selected':''}>Column ${i+1}</option>`).join('')}</select></label>`}
async function previewExcel(){const box=document.getElementById('excelPreview');box.textContent='Reading workbook locally…';try{const file=document.getElementById('excelFile').files[0];const sheets=await readXlsx(file);if(!sheets.length)throw Error('No readable sheets');window.excelSheets=sheets;const kind=document.getElementById('excelKind').value;box.innerHTML=`<p><b>${h(sheets.length)} worksheet(s) found.</b> Choose the worksheet and map its columns.</p><label>Worksheet<select id="excelSheet" onchange="showExcelSheet()">${sheets.map((s,i)=>`<option value="${i}">${h(s.name)}</option>`).join('')}</select></label><div id="excelSheetArea"></div>`;showExcelSheet()}catch(e){box.textContent='Import preview failed: '+e.message}}
function routeMinutes(v){const s=String(v??'').trim();if(!s)return NaN;if(/^\d{1,2}:\d{2}(?::\d{2})?$/.test(s)){const a=s.split(':').map(Number);return a[0]*60+a[1]+(a[2]||0)/60}const n=Number(s);if(!Number.isFinite(n)||n<=0)return NaN;return n<1?Math.round(n*1440):Number.isInteger(n)&&n<=1440?n:NaN}
/* Layout-independent scanner: locate FIXED headings and associate each time with a nearby airport pair. */
function airport(v){const t=String(v??'').trim().toUpperCase();return /^[A-Z]{3}$/.test(t)?t:null}
function pair(v){const m=String(v??'').trim().toUpperCase().match(/^([A-Z]{3})\s*(?:[-–—→\/]|\bTO\b)\s*([A-Z]{3})$/);return m?[m[1],m[2]]:null}
function scanPair(row,col){
  // A combined city-pair cell or two adjacent airport-code cells.
  for(let i=Math.max(0,col-8);i<col;i++){
    const combined=pair(row[i]);if(combined)return combined;
  }
  for(let i=col-2;i>=Math.max(0,col-8);i--){
    const a=airport(row[i]),b=airport(row[i+1]);
    if(a&&b)return [a,b];
  }
  return null;
}
function extractCompanyRoutes(sheets){
 const candidates=new Map(),issues=[];
 const add=(fr,to,min,sheet,row,col)=>{
   if(!fr||!to||fr===to||!Number.isInteger(min)||min<20||min>900)return;
   const key=fr+'|'+to;
   if(!candidates.has(key))candidates.set(key,[]);
   candidates.get(key).push({fr,to,min,sheet,row,col});
 };
 for(const sheet of sheets){
   const rows=sheet.rows;
   // Find every FIXED heading independently, including repeated side-by-side tables.
   for(let j=0;j<rows.length;j++)for(let c=0;c<(rows[j]||[]).length;c++){
     if(!/\bFIXED\b/i.test(String(rows[j][c]??'')))continue;
     let blanks=0;
     for(let k=j+1;k<rows.length;k++){
       const row=rows[k]||[], min=routeMinutes(row[c]), city=scanPair(row,c);
       if(city&&Number.isInteger(min)){add(city[0],city[1],min,sheet.name,k+1,c+1);blanks=0}
       else if(++blanks>=8)break;
     }
   }
   // Detect rows with a combined city-pair plus nearby time under a FIXED label.
   for(let j=0;j<rows.length;j++){
     const row=rows[j]||[];
     for(let c=0;c<row.length;c++){
       const city=pair(row[c]);if(!city)continue;
       for(let t=c+1;t<=Math.min(c+6,row.length-1);t++){
         const headers=rows.slice(Math.max(0,j-4),j).map(r=>String(r[t]??'')).join(' ');
         if(/\bFIXED\b/i.test(headers))add(city[0],city[1],routeMinutes(row[t]),sheet.name,j+1,t+1);
       }
     }
   }
 }
 const result=[];
 for(const [key,values] of candidates){
   const unique=[...new Set(values.map(v=>v.min))];
   if(unique.length>1){issues.push({key,fr:values[0].fr,to:values[0].to,options:unique.map(min=>({min,sources:values.filter(v=>v.min===min).map(v=>({sheet:v.sheet,row:v.row,col:v.col}))}))});continue}
   result.push({fr:values[0].fr,to:values[0].to,min:unique[0]});
 }
 return {rows:result,issues,conflictCount:issues.length};
}
function parseVacationHeader(value,year){const s=String(value??'').trim();const iso=excelDate(s);if(iso)return iso;const m=s.match(/^(\d{1,2})[- /]([A-Za-z]{3})(?:[- /](\d{2,4}))?$/);if(!m)return null;const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];const month=months.indexOf(m[2].toUpperCase());if(month<0)return null;let y=m[3]?Number(m[3]):year;if(y<100)y+=2000;const day=Number(m[1]);const d=new Date(Date.UTC(y,month,day));return d.getUTCDate()===day?d.toISOString().slice(0,10):null}
function extractCompanyVacation(sheet,staff,startYear){const rows=sheet.rows;const headerIndex=rows.findIndex(r=>String(r[0]||'').trim().toUpperCase()==='ID'&&String(r[1]||'').trim().toUpperCase()==='NAME');if(headerIndex<0)throw Error('Cannot find ID/Name header');const person=rows.find((r,i)=>i>headerIndex&&String(r[0]||'').trim()===String(staff));if(!person)throw Error('Staff '+staff+' not found on this worksheet');const header=rows[headerIndex];let lastMonth=-1,year=Number(startYear);if(!Number.isInteger(year)||year<2020||year>2100)throw Error('Enter schedule starting year');const dates=[];for(let c=5;c<header.length;c++){const raw=String(header[c]||'').trim();const m=raw.match(/^\d{1,2}[- /]([A-Za-z]{3})/);if(m){const idx=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(m[1].toUpperCase());if(lastMonth>=0&&idx<lastMonth)year++;lastMonth=idx}const date=parseVacationHeader(raw,year);if(date&&/^(VAC|V|1)$/i.test(String(person[c]||'').trim()))dates.push(date)}return {days:[...new Set(dates)].sort(),name:String(person[1]||'').trim()}}
/* File-to-file comparison baseline is local to this PWA path, never uploaded. */
const excelBaselineKey='my-flight-company-baseline-v1:'+location.pathname.replace(/[^a-z0-9/_-]/gi,'');
function routeSnapshot(parsed){
 const obj={};
 for(const r of parsed.rows)obj[r.fr+'|'+r.to]=[r.min];
 for(const x of parsed.issues)obj[x.key]=x.options.map(o=>o.min).sort((a,b)=>a-b);
 return obj;
}
function storedCompanyBaseline(){
 try{const b=JSON.parse(localStorage.getItem(excelBaselineKey)||'null');return b&&b.version===1&&b.routes&&typeof b.routes==='object'?b:null}catch{return null}
}
function baselineBanner(){const b=storedCompanyBaseline();return b?'Comparison baseline: '+h(b.filename)+' ('+b.count+' routes). Only changes since this file will be proposed.':'No previous company workbook registered. Register your ORIGINAL company workbook first (this will not change any saved flight or fixed-block times).'}
function showExcelSheet(){
 const kind=document.getElementById('excelKind').value,area=document.getElementById('excelSheetArea'),s=window.excelSheets[Number(document.getElementById('excelSheet').value)];
 excelRows=s.rows;const n=Math.max(3,...s.rows.slice(0,50).map(r=>r.length));
 let controls='';
 if(kind==='routes')controls=`<p>All worksheets and side-by-side route tables are scanned. Changes are compared with the previous company WORKBOOK, not manual route revisions.</p><p id="excelBaselineStatus">${baselineBanner()}</p><button type="button" onclick="registerCompanyBaseline()">Register selected workbook as baseline (no route changes)</button><div class="actions" style="margin:12px 0"><button type="button" onclick="previewInitialRouteImport()">Import Initial Fixed Block Database</button></div><div id="initialRoutePreview"></div><label>Company effective date <input id="exEffective" type="date"></label>`;
 else controls=`<p>The app finds your staff ID automatically on the VAC Data worksheet and reads VAC-marked dates.</p><label>Schedule starting year<input id="exStartYear" type="number" min="2020" max="2100" value="${new Date().getFullYear()}"></label>`;
 area.innerHTML=`<div>${controls}</div><p><b>Worksheet sample (read-only)</b></p><div class="scroll"><table><tbody>${s.rows.slice(0,6).map(r=>'<tr>'+Array.from({length:Math.min(n,12)},(_,i)=>`<td>${h(r[i]??'')}</td>`).join('')+'</tr>').join('')}</tbody></table></div><div class="actions"><button onclick="validateExcelImport()">Validate & Compare</button></div><div id="exValidation"></div>`;
}
function registerCompanyBaseline(){
 const out=document.getElementById('exValidation');try{
  if(document.getElementById('excelKind').value!=='routes')throw Error('Select fixed block times');
  const parsed=extractCompanyRoutes(window.excelSheets);
  if(parsed.rows.length<50)throw Error('Too few routes detected. Baseline not saved.');
  const file=document.getElementById('excelFile').files[0];
  const old=storedCompanyBaseline();
  if(!confirm((old?'REPLACE the existing comparison baseline':'Register this company workbook as your starting comparison baseline')+'?\n\nThis saves only the extracted route/time snapshot locally. It does NOT import or alter any fixed-block times or flights.'))return;
  const routes=routeSnapshot(parsed);
  localStorage.setItem(excelBaselineKey,JSON.stringify({version:1,filename:file?.name||'company workbook',count:Object.keys(routes).length,routes}));
  window.excelPending=null;
  document.getElementById('excelBaselineStatus').innerHTML=baselineBanner();
  out.textContent='Company workbook registered as comparison baseline. No route or flight data was changed. Now choose the updated test workbook and compare.';
 }catch(e){out.textContent='Baseline not saved: '+e.message}
}
async function previewInitialRouteImport(){
 const out=document.getElementById('initialRoutePreview');out.textContent='Checking initial routes…';
 try{
  const base=storedCompanyBaseline();if(!base)throw Error('Register the original company workbook as baseline first.');
  const date=document.getElementById('exEffective').value;
  if(!/^\d{4}-\d\d-\d\d$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Choose a valid company effective date first.');
  const parsed=extractCompanyRoutes(window.excelSheets);
  const snapshot=routeSnapshot(parsed);
  if(JSON.stringify(snapshot)!==JSON.stringify(base.routes))throw Error('Selected workbook does not match the registered original baseline. Select the original workbook.');
  const status=await localCall('initialRoutesStatus',[]);
  if(status.routes||status.history)throw Error('Existing fixed-block data or history detected ('+status.routes+' routes, '+status.history+' history records). Initial import is disabled to prevent duplicates.');
  const rows=parsed.rows;
  if(rows.length<50)throw Error('Too few valid routes detected.');
  window.initialRoutePending={rows,date,signature:JSON.stringify(snapshot)};
  out.innerHTML='<p><b>Initial import preview:</b> '+rows.length+' unambiguous routes will be loaded effective '+h(date)+'. '+parsed.issues.length+' ambiguous routes will be skipped for manual review. No existing flights, salary, vacation or FDP records will be changed. The company comparison baseline will be preserved.</p><button type="button" onclick="confirmInitialRouteImport()">Confirm Initial Database Import</button>';
 }catch(e){window.initialRoutePending=null;out.textContent='Initial import stopped: '+e.message}
}
async function confirmInitialRouteImport(){
 const p=window.initialRoutePending,out=document.getElementById('initialRoutePreview');
 if(!p){out.textContent='Preview the initial import first.';return}
 try{
  const base=storedCompanyBaseline();if(!base||JSON.stringify(base.routes)!==p.signature)throw Error('Baseline changed. Preview again.');
  const parsed=extractCompanyRoutes(window.excelSheets);
  if(JSON.stringify(routeSnapshot(parsed))!==p.signature)throw Error('Workbook changed. Preview again.');
  const date=document.getElementById('exEffective').value;
  if(date!==p.date)throw Error('Effective date changed. Preview again.');
  if(!confirm('Import '+p.rows.length+' initial fixed-block routes effective '+p.date+'? Ambiguous routes will remain unimported. This can only run on an empty Fixed Block database.'))return;
  const result=await localCall('importInitialRoutes',[p.rows,p.date]);
  window.initialRoutePending=null;
  out.textContent='Initial import verified: '+result.count+' routes and '+result.history+' dated history entries saved. Ambiguous routes remain excluded. Baseline unchanged.';
  show('Initial Fixed Block database imported: '+result.count+' routes.');
  call('getState',[],s=>render(s),true);
 }catch(e){out.textContent='Initial import failed: '+e.message;show(e.message,true)}
}
function validateExcelImport(){
 const out=document.getElementById('exValidation'),kind=document.getElementById('excelKind').value;window.excelPending=null;
 try{if(kind==='routes'){
  const e=document.getElementById('exEffective').value;
  if(!/^\d{4}-\d\d-\d\d$/.test(e))throw Error('Choose the effective date');
  const base=storedCompanyBaseline();if(!base)throw Error('Register the original company workbook as your comparison baseline first.');
  const parsed=extractCompanyRoutes(window.excelSheets);
  if(parsed.rows.length<50)throw Error('Too few routes detected; file layout may have changed.');
  const next=routeSnapshot(parsed),old=base.routes;
  const keySet=new Set([...Object.keys(next),...Object.keys(old)]);
  const changedKeys=[...keySet].filter(k=>JSON.stringify(next[k]||null)!==JSON.stringify(old[k]||null));
  const missing=changedKeys.filter(k=>!next[k]);
  // Never silently remove fixed blocks. A missing route is a warning, not a deletion.
  const modified=changedKeys.filter(k=>next[k]);
  const changed=modified.filter(k=>next[k].length===1).map(k=>{const [fr,to]=k.split('|');return {fr,to,min:next[k][0]}});
  const ambiguous=modified.filter(k=>next[k].length>1).map(k=>{const issue=parsed.issues.find(i=>i.key===k);return issue});
  const unchangedConflicts=parsed.issues.length-ambiguous.length;
  const file=document.getElementById('excelFile').files[0];
  window.excelPending={kind,rows:changed,e,conflicts:ambiguous,baseRoutes:old,nextRoutes:next,filename:file?.name||'company workbook',snapshotCount:Object.keys(next).length,missing};
  out.innerHTML=`<p><b>${Object.keys(next).length} routes recognized; ${modified.length} new or modified since the baseline.</b> ${missing.length?'<b>'+missing.length+' routes are missing from the new workbook (not deleted).</b>':''} ${ambiguous.length?'<b>'+ambiguous.length+' changed routes require time selection.</b>':''} ${unchangedConflicts?' '+unchangedConflicts+' pre-existing ambiguous routes remain untouched.':''}</p><div class="scroll"><table><tr><th>Route</th><th>Previous workbook</th><th>New workbook</th></tr>${modified.map(k=>{const [fr,to]=k.split('|');return `<tr><td>${h(fr)} → ${h(to)}</td><td>${old[k]?old[k].map(hm).join(' / '):'NEW'}</td><td>${next[k].map(hm).join(' / ')}</td></tr>`}).join('')}</table></div>${ambiguous.length?'<h3>Resolve changed conflicting routes</h3>'+ambiguous.map((issue,i)=>'<label>'+h(issue.fr)+' → '+h(issue.to)+'<select class="excel-conflict" data-conflict="'+i+'"><option value="">Choose fixed-block time…</option>'+issue.options.map(o=>'<option value="'+o.min+'">'+hm(o.min)+' — '+h(o.sources.map(src=>src.sheet+' row '+src.row).join('; '))+'</option>').join('')+'</select></label>').join(''):''}${modified.length?'<p>Review all proposed changes before confirming.</p><button onclick="applyExcelImport()">Review & Confirm Import</button>':'<p>No new or revised route times to import.</p>'}`;
 }else{
  const staff=String(cache.profile.staff),year=Number(document.getElementById('exStartYear').value);
  const sheet=window.excelSheets.find(s=>s.rows.some(r=>String(r[0]||'').trim().toUpperCase()==='ID'&&String(r[1]||'').trim().toUpperCase()==='NAME'));
  if(!sheet)throw Error('Could not find a vacation data sheet with ID and Name headings');
  const parsed=extractCompanyVacation(sheet,staff,year);if(!parsed.days.length)throw Error('No VAC days detected for staff '+staff);
  window.excelPending={kind,staff,name:parsed.name,days:parsed.days};
  out.innerHTML=`<p><b>${parsed.days.length} vacation days</b> for ${h(parsed.name)} (staff ${h(staff)}). First: ${parsed.days[0]}; last: ${parsed.days.at(-1)}.</p><p>Check the starting year and total against the company schedule.</p><button onclick="applyExcelImport()">Confirm Vacation Import</button>`;
 }}catch(e){out.textContent='Import stopped: '+e.message}
}
async function applyExcelImport(){
 const p=window.excelPending;if(!p)return;
 if(p.kind==='routes'){
  const baseline=storedCompanyBaseline();if(!baseline||JSON.stringify(baseline.routes)!==JSON.stringify(p.baseRoutes)){show('Comparison baseline changed. Preview the workbook again.',true);return}
  if(p.conflicts?.length){const choices=[...document.querySelectorAll('.excel-conflict')];if(choices.some(el=>!el.value)){show('Choose a fixed-block time for every changed conflicting route.',true);return}p.rows=[...p.rows,...p.conflicts.map((issue,i)=>({fr:issue.fr,to:issue.to,min:Number(choices[i].value)}))]}
  if(!p.rows.length){show('No route revisions to import.',true);return}
 }
 if(!confirm('Apply '+(p.kind==='routes'?p.rows.length+' fixed-block route changes':'vacation update')+' effective '+(p.e||'as selected')+'? Have you exported a fresh JSON backup?'))return;
 try{
  const r=p.kind==='routes'?await localCall('importRoutes',[p.rows,p.e]):await localCall('importVacation',[p.staff,p.days,p.name]);
  if(p.kind==='routes'){
   // Move the baseline forward ONLY after a successful import; unchanged ambiguous routes remain unchanged.
   localStorage.setItem(excelBaselineKey,JSON.stringify({version:1,filename:p.filename,count:p.snapshotCount,routes:p.nextRoutes}));
   document.getElementById('excelBaselineStatus').innerHTML=baselineBanner();
  }
  show('Imported '+r.count+' '+(p.kind==='routes'?'routes':'vacation days')+'. Export a new backup.');
  window.excelPending=null;document.getElementById('exValidation').textContent='Import complete.';
  if(p.kind==='vacation')vacation(true);else call('getState',[],s=>render(s),true);
 }catch(e){show(e.message,true)}
}
