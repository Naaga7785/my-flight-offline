/* MY FLIGHT: fully local engine. Existing IndexedDB name and schema retained. */
const DB_NAME='my-flight-offline-v1';let db,cache;
const clone=x=>JSON.parse(JSON.stringify(x));
function openDB(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('store'))q.result.createObjectStore('store')};q.onerror=()=>reject(q.error);q.onsuccess=()=>{db=q.result;resolve()}})}
function readDB(){return new Promise((resolve,reject)=>{const q=db.transaction('store','readonly').objectStore('store').get('data');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
function writeDB(v){return new Promise((resolve,reject)=>{const tx=db.transaction('store','readwrite');tx.objectStore('store').put(v,'data');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
const clean=s=>String(s||'').trim().toUpperCase(),iso=()=>new Date().toISOString().slice(0,10),pad=n=>String(n).padStart(2,'0');
const hm=n=>n==null?'—':(n<0?'-':'')+pad(Math.floor(Math.abs(Math.round(n))/60))+':'+pad(Math.abs(Math.round(n))%60);
function mins(s){const m=String(s||'').match(/^(\d{1,2}):(\d{2})$/)||String(s||'').match(/^(\d{1,2})(\d{2})$/);if(!m||+m[1]>23||+m[2]>59)throw Error('Enter UTC time as 09:00');return +m[1]*60+(+m[2])}
function checkDate(d){if(!/^\d{4}-\d\d-\d\d$/.test(d)||!Number.isFinite(Date.parse(d+'T12:00:00Z'))||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d)throw Error('Invalid date')}
function atRoute(fr,to,date){checkDate(date);const matches=cache.history.filter(r=>r.fr===fr&&r.to===to&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date<=date).sort((a,b)=>a.date.localeCompare(b.date)||(a.order||0)-(b.order||0));return matches.at(-1)||null}
/* Pay month denotes the month money is received. The qualifying duty period
   starts on day 26 two calendar months earlier and ends before day 26 of the
   preceding calendar month, using fixed Ho Chi Minh City UTC+07:00 time. */
function salaryWindow(paymentMonth){
 const match=String(paymentMonth).match(/^(\d{4})-(0[1-9]|1[0-2])(?:-01)?$/);
 if(!match)throw Error('Invalid salary payment month');
 const y=+match[1],m=+match[2];
 const start=Date.UTC(y,m-3,25,17,0,0); // 26th 00:00 Saigon = previous day 17:00 UTC
 const end=Date.UTC(y,m-2,25,17,0,0);   // exclusive: next local 26th 00:00
 const localStart=new Date(start+7*3600000).toISOString().slice(0,10);
 const localEnd=new Date(end+7*3600000-86400000).toISOString().slice(0,10);
 return {start,end,localStart,localEnd,paymentMonth:match[1]+'-'+match[2]};
}
function departureUtcMs(f){checkDate(f.date);return Date.parse(f.date+'T00:00:00Z')+mins(f.dep)*60000}
function inSalaryCycle(f,paymentMonth){const w=salaryWindow(paymentMonth),t=departureUtcMs(f);return t>=w.start&&t<w.end}
function currentSalaryFlights(){return cache.flights.map((f,j)=>({...f,_index:j})).filter(f=>inSalaryCycle(f,cache.profile.month))}
function nextPaymentMonth(paymentMonth){const m=salaryWindow(paymentMonth).paymentMonth;return new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),1)).toISOString().slice(0,7)+'-01'}
function state(){const p=cache.profile,flights=cache.flights.filter(f=>inSalaryCycle(f,p.month)).map(f=>{const actual=mins(f.arr)-mins(f.dep)+(+f.extra)*1440+(+f.extra===0&&mins(f.arr)<mins(f.dep)?1440:0),r=atRoute(f.fr,f.to,f.date),fixed=r?r.min:null;return {...f,actual,fixed,diff:fixed==null?null:actual-fixed}}),actual=flights.reduce((a,f)=>a+f.actual,0),fixed=flights.reduce((a,f)=>a+(f.fixed||0),0);return {profile:clone(p),flights,totals:{sectors:flights.length,actual:hm(actual),fixed:hm(fixed),diffMinutes:flights.some(f=>f.fixed==null)?null:actual-fixed,base:p.base,sectorPay:flights.length*p.sectorRate,hourPay:fixed*p.hourRate/60,total:p.base+flights.length*p.sectorRate+fixed*p.hourRate/60,missingFixed:flights.filter(f=>f.fixed==null).length}}}
function archiveReport(month){const a=cache.archive.filter(x=>x.month===month);if(!a.length)throw Error('No archived flights for '+month);const salaries=[...new Set(a.map(x=>x.salary).filter(x=>x!=null))];if(salaries.length>1)throw Error('Conflicting saved salary snapshots');const flights=a.map(x=>({...x,diff:x.actual-x.fixed})),actual=a.reduce((n,f)=>n+f.actual,0),fixed=a.reduce((n,f)=>n+f.fixed,0);return {month,flights,totals:{sectors:a.length,actual:hm(actual),fixed:hm(fixed),diffMinutes:actual-fixed,salary:salaries[0]??null},profile:clone(cache.profile)}}
function vac(staff){let rows=cache.vacation[staff],person=cache.vacRaw.find(r=>r.staff===staff),name=person?.name||cache.profile.name;if(!rows&&person){const days=person.days.map(i=>cache.vacHeaders[i]).filter(s=>/^\d{4}-\d\d-\d\d$/.test(s)).sort(),groups=[];for(const day of days){const last=groups.at(-1);if(last&&(Date.parse(day+'T12:00:00Z')-Date.parse(last.end+'T12:00:00Z'))===86400000){last.end=day;last.days++}else groups.push({start:day,end:day,days:1})}const fmt=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}),mon=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'});rows=groups.map((g,i)=>({month:(mon(g.start)===mon(g.end)?mon(g.start):mon(g.start)+'/'+mon(g.end))+' '+g.end.slice(0,4),dates:fmt(g.start)+' – '+fmt(g.end),days:g.days,between:i?Math.round((Date.parse(g.start+'T12:00:00Z')-Date.parse(groups[i-1].end+'T12:00:00Z'))/86400000)-1:'—'}))}if(!rows?.length)throw Error('Vacation schedule unavailable for staff '+staff);return {staff,name,periods:rows,total:rows.reduce((a,x)=>a+x.days,0)}}
async function localCall(fn,args=[]){let out,save=false;switch(fn){
case 'getState':return state();
case 'saveProfile':{const p=args[0];if(!/^(0[1-9]|1[0-2])\/\d{4}$/.test(p.month))throw Error('Month must be MM/YYYY');const old=clone(cache.profile);cache.profile={staff:String(p.staff),name:p.name,rank:p.rank,month:p.month.slice(3)+'-'+p.month.slice(0,2)+'-01',base:+p.base,sectorRate:+p.sectorRate,hourRate:+p.hourRate};try{await writeDB(cache)}catch(e){cache.profile=old;throw e}return state()}
case 'saveFlight':{const f=args[0],p=cache.profile;checkDate(f.date);if(!inSalaryCycle(f,p.month))throw Error('Departure UTC falls outside the selected salary payment cycle (Saigon UTC+7).');if(!/^[A-Z]{3}$/.test(clean(f.fr))||!/^[A-Z]{3}$/.test(clean(f.to))||clean(f.fr)===clean(f.to))throw Error('Use different three-letter airport codes');if(!Number.isInteger(+f.extra)||+f.extra<0||+f.extra>2)throw Error('Arrival days must be 0–2');let duration=mins(f.arr)-mins(f.dep)+(+f.extra)*1440;if(+f.extra===0&&duration<0)duration+=1440;if(duration<=0||duration>1440)throw Error('Check UTC times and arrival day');if(cache.flights.length>=101)throw Error('Flight log full');cache.flights.push({...f,fr:clean(f.fr),to:clean(f.to),dep:hm(mins(f.dep)),arr:hm(mins(f.arr)),extra:+f.extra});save=true;out=state();break}
case 'deleteFlight':{const i=Number(args[0]),monthly=currentSalaryFlights();if(!Number.isInteger(i)||!monthly[i])throw Error('Flight not found');cache.flights.splice(monthly[i]._index,1);save=true;out=state();break}
case 'editFlight':{
 const i=Number(args[0]),patch=args[1],monthly=currentSalaryFlights();
 if(!Number.isInteger(i)||!monthly[i])throw Error('Flight not found');
 const old=monthly[i],date=patch.date??old.date,fr=clean(patch.fr??old.fr),to=clean(patch.to??old.to);
 checkDate(date);
 if(!/^[A-Z]{3}$/.test(fr)||!/^[A-Z]{3}$/.test(to)||fr===to)throw Error('Use different three-letter FROM and TO airports');
 if(!Number.isInteger(patch.extra)||patch.extra<0||patch.extra>2)throw Error('Arrival days must be 0–2');
 const dep=hm(mins(patch.dep)),arr=hm(mins(patch.arr));
 let duration=mins(arr)-mins(dep)+patch.extra*1440;
 if(patch.extra===0&&duration<0)duration+=1440;
 if(duration<=0||duration>1440)throw Error('Invalid flight duration');
 Object.assign(cache.flights[old._index],{date,fr,to,dep,arr,extra:patch.extra});
 save=true;out=state();break
}
case 'initialRoutesStatus':return {routes:cache.routes.length,history:cache.history.length};
case 'importInitialRoutes':{
 const [rows,effective]=args;checkDate(effective);
 if(!Array.isArray(rows)||rows.length<50||rows.length>5000)throw Error('Invalid initial route set');
 if(cache.routes.length||cache.history.length)throw Error('Fixed Block already contains routes or history. Initial import is only allowed on an empty database.');
 const seen=new Set();
 for(const r of rows){if(!/^[A-Z]{3}$/.test(r.fr)||!/^[A-Z]{3}$/.test(r.to)||r.fr===r.to||!Number.isInteger(r.min)||r.min<20||r.min>900)throw Error('Invalid initial route');const k=r.fr+'|'+r.to;if(seen.has(k))throw Error('Duplicate initial route: '+k);seen.add(k)}
 const old=clone(cache);
 try{
  cache.routes=rows.map(r=>({fr:r.fr,to:r.to,min:r.min,source:'Company initial import'}));
  cache.history=rows.map((r,i)=>({fr:r.fr,to:r.to,min:r.min,date:effective,source:'Company initial import',order:i+1}));
  await writeDB(cache);
  const verify=await readDB();
  if(verify.routes.length!==rows.length||verify.history.length!==rows.length)throw Error('Initial route import verification failed');
 }catch(e){cache=old;try{await writeDB(old)}catch{}throw e}
 return {count:rows.length,history:cache.history.length};
}
case 'importRoutes':{const [rows,effective]=args;checkDate(effective);if(!Array.isArray(rows)||!rows.length||rows.length>5000)throw Error('Invalid routes');const seen=new Set();for(const r of rows){if(!/^[A-Z]{3}$/.test(r.fr)||!/^[A-Z]{3}$/.test(r.to)||!Number.isInteger(r.min)||r.min<=0||r.min>1440)throw Error('Invalid route row');const k=r.fr+'|'+r.to;if(seen.has(k))throw Error('Duplicate route: '+k);seen.add(k)}const old=clone(cache);try{for(const r of rows){cache.routes=cache.routes.filter(x=>x.fr!==r.fr||x.to!==r.to);cache.routes.push({...r,source:'Excel import'});cache.history.push({...r,date:effective,source:'Excel import',order:cache.history.length+1001})}await writeDB(cache)}catch(e){cache=old;throw e}return {count:rows.length}}
case 'importVacation':{const [staff,days,name]=args;if(!/^\d+$/.test(staff)||!Array.isArray(days)||!days.length||days.length>400)throw Error('Invalid vacation data');days.forEach(checkDate);const unique=[...new Set(days)].sort();const old=clone(cache);try{const headers=[...cache.vacHeaders];const indices=unique.map(d=>{let i=headers.indexOf(d);if(i<0){i=headers.length;headers.push(d)}return i});cache.vacHeaders=headers;cache.vacRaw=cache.vacRaw.filter(r=>r.staff!==staff);cache.vacRaw.push({staff,name:name||cache.profile.name,days:indices});delete cache.vacation[staff];await writeDB(cache)}catch(e){cache=old;throw e}return {count:unique.length}}
case 'searchRoutes':{const [fr,to,asOf]=args;if(asOf)checkDate(asOf);const lookupDate=asOf||iso(),keys=new Set(cache.routes.map(x=>x.fr+'|'+x.to).concat(cache.history.map(x=>x.fr+'|'+x.to)));return [...keys].filter(k=>k.split('|')[0].includes(clean(fr))&&k.split('|')[1].includes(clean(to))).map(k=>{const [f,t]=k.split('|'),r=atRoute(f,t,lookupDate);return r?{fr:f,to:t,min:r.min,source:r.source,effectiveDate:r.date}:null}).filter(Boolean).sort((a,b)=>(a.fr+a.to).localeCompare(b.fr+b.to)).slice(0,100)}
case 'routeHistory':{const [fr,to]=args;const f=clean(fr),t=clean(to);const rows=cache.history.filter(r=>r.fr===f&&r.to===t).sort((a,b)=>a.date.localeCompare(b.date)||(a.order||0)-(b.order||0));return rows.map(r=>({date:r.date,fr:r.fr,to:r.to,min:r.min,source:r.source}))}
case 'reviseRoute':{let [fr,to,time,date]=args;fr=clean(fr);to=clean(to);checkDate(date);const min=mins(time);if(!/^[A-Z]{3}$/.test(fr)||!/^[A-Z]{3}$/.test(to))throw Error('Invalid route');if(cache.history.some(x=>x.fr===fr&&x.to===to&&x.date===date&&x.min===min))throw Error('This exact revision is already recorded');cache.history.push({fr,to,min,date,source:'Manual revision',order:cache.history.length+1000});save=true;out={ok:true};break}
case 'archivedMonths':return [...new Set(cache.archive.map(x=>x.month))].sort().reverse();
case 'archivedReport':return archiveReport(args[0]);
case 'extractVacation':return vac(String(args[0]));
case 'startNewMonth':{const s=state(),p=cache.profile;if(!s.flights.length)throw Error('No flights to archive');if(s.flights.some(f=>f.fixed==null))throw Error('Resolve missing fixed routes first');const month=p.month.slice(0,7);if(cache.archive.some(f=>f.month===month))throw Error('This month already exists in archive');const salary=s.totals.total;cache.archive.push(...s.flights.map(f=>({month,date:f.date,fr:f.fr,to:f.to,dep:f.dep,arr:f.arr,extra:f.extra,actual:f.actual,fixed:f.fixed,salary})));cache.flights=cache.flights.filter(f=>!inSalaryCycle(f,month));cache.profile.month=nextPaymentMonth(month);save=true;out=state();break}
case 'importExcel':throw Error('Excel import is not available offline. Existing routes and vacation data are retained.');
default:throw Error('Unsupported offline operation: '+fn)}if(save)await writeDB(cache);return out}
function localDownload(filename,content,mime='application/json'){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function backupAll(){if(!cache)throw Error('Database not ready');localDownload('MY_FLIGHT_OFFLINE_BACKUP_'+iso()+'.json',JSON.stringify({app:'MY FLIGHT Offline',backupVersion:1,created:new Date().toISOString(),data:cache}));show('Backup created. Save a copy in Files outside the app.')}
async function restoreAll(input){const f=input.files?.[0];if(!f)throw Error('Choose a JSON backup first');const x=JSON.parse(await f.text());if(x.app!=='MY FLIGHT Offline'||x.backupVersion!==1||!x.data||!Array.isArray(x.data.archive)||!Array.isArray(x.data.routes)||!Array.isArray(x.data.history)||!Array.isArray(x.data.flights)||!x.data.profile||typeof x.data.vacation!=='object')throw Error('Invalid or incompatible offline backup');if(!confirm('Replace ALL current MY FLIGHT data with this backup?'))return false;await writeDB(x.data);cache=clone(x.data);return true}
function reportHtml(title,subtitle,heads,rows,summary,details=[],warning=''){const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:13px -apple-system,Arial,sans-serif;color:#142d53;margin:0}.toolbar{display:none}.sheet{padding:20px}h1{font-size:23px;color:#183965}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #ccd8e7}th{background:#183965;color:white}tr:nth-child(odd) td{background:#edf3fb}.foot{margin-top:18px;font-weight:bold;font-size:15px}.salary-details{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:14px}.salary-details div{background:#eaf1fa;padding:12px;border:1px solid #d6e0ef;border-radius:6px}.salary-details strong{display:block;margin-top:6px;font-size:16px}.warning{color:#a43b20;background:#fff1ec;padding:10px;margin-top:14px;font-weight:bold}@media print{.sheet{padding:0}}</style></head><body><div class="sheet"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p><table><tr>${heads.map(h=>'<th>'+esc(h)+'</th>').join('')}</tr>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')}</table><div class="foot">${esc(summary)}</div>${details.length?'<div class="salary-details">'+details.map(d=>'<div><span>'+esc(d[0])+'</span><strong>'+esc(d[1])+'</strong></div>').join('')+'</div>':''}${warning?'<div class="warning">'+esc(warning)+'</div>':''}</div></body></html>`}
function localPdf(type,month){const s=type==='vac'?vac(String(el('vacstaff').value)):type==='archive'?archiveReport(month):state();let html;if(type==='vac')html=reportHtml('VACATION SCHEDULE','Staff '+s.staff+' | '+s.name,['Month','Vacation Dates','Vacation Days','Days Between'],s.periods.map(p=>[p.month,p.dates,p.days,p.between]),'Total Vacation Days: '+s.total);else{const p=s.profile,t=s.totals,missing=s.flights.filter(f=>f.fixed==null).length,isArchive=type==='archive',money=n=>'$'+Number(n).toFixed(2),total=isArchive?t.salary:t.total,warning=missing?'INCOMPLETE: '+missing+' flight(s) missing an effective fixed-block rate. Salary shown is a subtotal, not final.':'',details=isArchive?[['Sectors',t.sectors],['Actual block',t.actual],['Fixed block',t.fixed],['Saved salary',total==null?'Unavailable':money(total)]]:[['Base pay',money(t.base)],['Sector pay',money(t.sectorPay)],['Known fixed-block pay',money(t.hourPay)],[missing?'Subtotal (incomplete)':'Total salary',money(t.total)]];html=reportHtml(isArchive?'ARCHIVED SALARY CYCLE REPORT':'FLIGHT & SALARY CYCLE REPORT',p.name+' | Staff '+p.staff+' | '+p.rank+' | Payment '+(isArchive?month:p.month.slice(0,7))+' | Saigon cycle '+salaryWindow(isArchive?month:p.month).localStart+' to '+salaryWindow(isArchive?month:p.month).localEnd,['Date','FROM','TO','DEP UTC','ARR UTC','Actual','Fixed','Diff'],s.flights.map(f=>[f.date.slice(8)+'/'+f.date.slice(5,7)+'/'+f.date.slice(0,4),f.fr,f.to,f.dep,f.arr+(+f.extra?' +'+f.extra+'d':mins(f.arr)<mins(f.dep)?' +1d':''),hm(f.actual),f.fixed==null?'MISSING':hm(f.fixed),hm(f.diff)]),'Sectors: '+t.sectors+' | Actual: '+t.actual+' | Known fixed: '+t.fixed+' | Difference: '+hm(t.diffMinutes),details,warning)}showReport(html)}
let activeReportHtml='';
function showReport(html){activeReportHtml=html;const frame=el('reportFrame');frame.srcdoc=html;el('reportView').classList.remove('hidden');el('mainView').classList.add('hidden');window.scrollTo(0,0)}
function closeReport(){el('reportView').classList.add('hidden');el('mainView').classList.remove('hidden');el('reportFrame').removeAttribute('srcdoc');activeReportHtml='';window.scrollTo(0,0)}
/* Self-contained PDF writer: no online libraries, popups or print dialogs required. */
function buildReportPdf(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const title=doc.querySelector('h1')?.textContent||'MY FLIGHT REPORT',subtitle=doc.querySelector('.sheet p')?.textContent||'',summary=doc.querySelector('.foot')?.textContent||'',warning=doc.querySelector('.warning')?.textContent||'';
 const table=[...doc.querySelectorAll('table tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(c=>c.textContent||''));
 const details=[...doc.querySelectorAll('.salary-details div')].map(d=>[d.querySelector('span')?.textContent||'',d.querySelector('strong')?.textContent||'']);
 const ascii=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/[^\x20-\x7e]/g,'?');
 const pdfEscape=v=>ascii(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const W=842,H=595,m=32,usable=W-2*m,cols=table[0]?.length===8?[.145,.08,.08,.13,.13,.12,.12,.195]:[.2,.35,.2,.25];
 let pages=[],ops=[],y=H-46;
 const rect=(x,b,w,h,color)=>ops.push(color+' rg '+x.toFixed(2)+' '+b.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');
 const txt=(x,b,v,size=10,bold=false,color='0.09 0.18 0.32')=>ops.push(color+' rg BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x.toFixed(2)+' '+b.toFixed(2)+' Tm ('+pdfEscape(v)+') Tj ET');
 const header=()=>{rect(m,H-82,usable,47,'0.10 0.22 0.41');txt(m+13,H-58,title,17,true,'1 1 1');y=H-102;txt(m,y,subtitle,9,false);y-=24};
 const newPage=()=>{if(ops.length)pages.push(ops.join('\n'));ops=[];header()};
 const row=(r,isHead=false,index=0)=>{if(y<95){newPage();if(table.length&&!isHead)row(table[0],true)}const h=isHead?29:26;rect(m,y-h+7,usable,h,isHead?'0.10 0.22 0.41':index%2?'0.92 0.95 0.99':'1 1 1');let x=m;for(let i=0;i<r.length;i++){const w=usable*(cols[i]||.12),max=Math.max(3,Math.floor((w-10)/(isHead?5.3:5.0))),v=ascii(r[i]);txt(x+7,y-10,v.length>max?v.slice(0,max-1)+'~':v,isHead?9:9,isHead,isHead?'1 1 1':'0.09 0.18 0.32');x+=w}y-=h};
 newPage();if(table.length){row(table[0],true);table.slice(1).forEach((r,i)=>row(r,false,i))}y-=18;
 if(y<105)newPage();txt(m,y,summary,10,true);y-=29;
 if(details.length){const gap=9,w=(usable-gap*(details.length-1))/details.length;details.forEach((d,i)=>{const x=m+i*(w+gap);rect(x,y-45,w,52,'0.91 0.95 0.99');txt(x+9,y-15,d[0],9);txt(x+9,y-35,d[1],14,true)});y-=64}
 if(warning){if(y<65)newPage();rect(m,y-34,usable,42,'1 0.94 0.91');txt(m+10,y-12,warning.slice(0,112),10,true,'0.60 0.19 0.10');y-=48}
 pages.push(ops.join('\n'));
 const objects=['','<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
 const kids=[];for(const content of pages){const pageId=objects.length,streamId=pageId+1;kids.push(pageId+' 0 R');objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents '+streamId+' 0 R >>');objects.push('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream')}
 objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
 let out='%PDF-1.4\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=out.length;out+=i+' 0 obj\n'+objects[i]+'\nendobj\n'}const xref=out.length;out+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';out+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return new Blob([out],{type:'application/pdf'});
}
function saveCurrentReportPdf(){try{if(!activeReportHtml)throw Error('Open a report first');const title=new DOMParser().parseFromString(activeReportHtml,'text/html').querySelector('h1')?.textContent||'REPORT';const filename='MY_FLIGHT_'+title.replace(/[^A-Za-z0-9]+/g,'_')+'_'+iso()+'.pdf';const url=URL.createObjectURL(buildReportPdf(activeReportHtml));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);show('PDF created. Check Downloads or Files to keep a copy.')}catch(e){show('PDF save failed: '+e.message,true)}}
/* Full destructive reset. Clear the entire app object store (not just its
   primary data key), re-seed, then independently verify persisted contents. */
async function resetAllMyFlightData(){
 if(!db || !cache)throw Error('Database is not ready');
 const fresh=clone(window.MY_FLIGHT_SEED);
 if(!fresh || !Array.isArray(fresh.flights) || !Array.isArray(fresh.history) ||
    !Array.isArray(fresh.routes) || !Array.isArray(fresh.archive))
   throw Error('Clean app template unavailable');
 await new Promise((resolve,reject)=>{
   const tx=db.transaction('store','readwrite');
   const store=tx.objectStore('store');
   store.clear();
   store.put(fresh,'data');
   tx.oncomplete=resolve;
   tx.onerror=()=>reject(tx.error||Error('Reset transaction failed'));
   tx.onabort=()=>reject(tx.error||Error('Reset transaction aborted'));
 });
 // The workbook comparison snapshot lives outside IndexedDB.
 for(let i=localStorage.length-1;i>=0;i--){
   const key=localStorage.key(i);
   if(key && key.startsWith('my-flight-company-baseline-v1:'))localStorage.removeItem(key);
 }
 const saved=await readDB();
 const empty=['flights','routes','history','archive','vacRaw','vacHeaders'];
 if(!saved || empty.some(k=>!Array.isArray(saved[k])||saved[k].length!==0) ||
    !saved.vacation || Object.keys(saved.vacation).length!==0 ||
    (saved.profile && (saved.profile.staff||saved.profile.name)))
   throw Error('Reset verification failed: saved records remain');
 cache=clone(saved);
 return true;
}
async function bootOffline(){await openDB();cache=await readDB();if(!cache){cache=clone(window.MY_FLIGHT_SEED);await writeDB(cache)}render(state());loadArchiveMonths();set('vacstaff',cache.profile.staff);vacation(true);if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{})}
