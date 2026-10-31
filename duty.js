/* MY FLIGHT Duty module — offline, additive; no database schema upgrade. */
const FDP_BASIC=[
['06:00–13:29',[780,750,720,690,660,630,600,570,540]],
['13:30–13:59',[765,735,705,675,645,615,585,555,540]],
['14:00–14:29',[750,720,690,660,630,600,570,540,540]],
['14:30–14:59',[735,705,675,645,615,585,555,540,540]],
['15:00–15:29',[720,690,660,630,600,570,540,540,540]],
['15:30–15:59',[705,675,645,615,585,555,540,540,540]],
['16:00–16:29',[690,660,630,600,570,540,540,540,540]],
['16:30–16:59',[675,645,615,585,555,540,540,540,540]],
['17:00–04:59',[660,630,600,570,540,540,540,540,540]],
['05:00–05:14',[720,690,660,630,600,570,540,540,540]],
['05:15–05:29',[735,705,675,645,615,585,555,540,540]],
['05:30–05:44',[750,720,690,660,630,600,570,540,540]],
['05:45–05:59',[765,735,705,675,645,615,585,555,540,540]]];
const FDP_EXT=[
['06:00–06:14',[null,null,null,null]],['06:15–06:29',[795,765,735,705]],['06:30–06:44',[810,780,750,720]],['06:45–06:59',[825,795,765,735]],['07:00–13:29',[840,810,780,750]],['13:30–13:59',[825,795,765,null]],['14:00–14:29',[810,780,750,null]],['14:30–14:59',[795,765,735,null]],['15:00–15:29',[780,750,720,null]],['15:30–15:59',[765,null,null,null]],['16:00–16:29',[750,null,null,null]],['16:30–16:59',[735,null,null,null]],['17:00–17:29',[720,null,null,null]],['17:30–17:59',[705,null,null,null]],['18:00–18:29',[690,null,null,null]],['18:30–18:59',[675,null,null,null]],['19:00–05:59',[null,null,null,null]]];
const dutyHM=n=>Number.isFinite(n)?`${String(Math.floor(Math.round(n)/60)).padStart(2,'0')}:${String(Math.round(n)%60).padStart(2,'0')}`:'—';
const dutyTime=v=>{const s=String(v||'').replace(/\D/g,'');if(s.length<3||s.length>4)throw Error('Time must be HHMM, for example 0530');const p=s.padStart(4,'0'),h=+p.slice(0,2),m=+p.slice(2);if(h>23||m>59)throw Error('Invalid time: '+v);return `${p.slice(0,2)}:${p.slice(2)}`};
const dutyMinute=t=>+t.slice(0,2)*60+(+t.slice(3));
const dutyDate=(date,time)=>Date.parse(`${date}T${time}:00Z`);
const dutyDateTime=ms=>new Date(ms).toISOString().slice(0,16).replace('T',' ');
const FDP_UNKNOWN=[660,630,600,570,540,540,540,540,540];
const FDP_UNKNOWN_FRM=[720,690,660,630,600,570,540,540,540];
function dutyBand(m){if(m>=360&&m<810)return 0;if(m>=810&&m<840)return 1;if(m>=840&&m<870)return 2;if(m>=870&&m<900)return 3;if(m>=900&&m<930)return 4;if(m>=930&&m<960)return 5;if(m>=960&&m<990)return 6;if(m>=990&&m<1020)return 7;if(m>=1020||m<300)return 8;if(m<315)return 9;if(m<330)return 10;if(m<345)return 11;return 12}
function extBand(m){if(m>=360&&m<375)return 0;if(m>=375&&m<390)return 1;if(m>=390&&m<405)return 2;if(m>=405&&m<420)return 3;if(m>=420&&m<810)return 4;if(m>=810&&m<840)return 5;if(m>=840&&m<870)return 6;if(m>=870&&m<900)return 7;if(m>=900&&m<930)return 8;if(m>=930&&m<960)return 9;if(m>=960&&m<990)return 10;if(m>=990&&m<1020)return 11;if(m>=1020&&m<1050)return 12;if(m>=1050&&m<1080)return 13;if(m>=1080&&m<1110)return 14;if(m>=1110&&m<1140)return 15;return 16}
const dutyEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dutyAllFlights(){const seen=new Set(),out=[];for(const f of [...(cache?.flights||[]),...(cache?.archive||[])]){const key=[f.date,f.fr,f.to,f.dep,f.arr].join('|');if(!seen.has(key)){seen.add(key);out.push(f)}}return out}
function dutyEntries(){return Array.isArray(cache?.duties)?cache.duties:[]}
function dutyFlightOptions(){
 const date=document.getElementById('dutyDate').value;
 const holder=document.getElementById('dutyFlights');
 window.dutyCandidateFlights=[];
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){holder.innerHTML='<p class="hint">Choose a duty date first.</p>';dutyHistory();return;}
 const raw=document.getElementById('dutyReport').value.trim();
 let reportMs=NaN;
 try{if(raw)reportMs=dutyDate(date,dutyTime(raw))-7*3600000}catch(e){}
 if(!Number.isFinite(reportMs)){
  holder.innerHTML='<p class="hint">Enter the actual local reporting time to show eligible flights. Duty duration is not reporting time.</p>';
  dutyHistory();return;
 }
 const flights=dutyAllFlights().filter(f=>{
  try{
   const depMs=dutyDate(f.date,dutyTime(f.dep));
   // Report must precede departure. Overnight UTC flights are included only
   // when they actually depart after the selected local duty report.
   return depMs>=reportMs && depMs<reportMs+18*3600000;
  }catch(e){return false}
 }).sort((a,b)=>dutyDate(a.date,dutyTime(a.dep))-dutyDate(b.date,dutyTime(b.dep)));
 window.dutyCandidateFlights=flights;
 holder.innerHTML=flights.length?flights.map((f,i)=>{
  const local=new Date(dutyDate(f.date,dutyTime(f.dep))+7*3600000).toISOString().slice(0,16).replace('T',' ');
  return `<label class="duty-flight"><input type="checkbox" value="${i}" onchange="dutySelectionChanged()"><span>${dutyEsc(f.date)} · ${dutyEsc(f.fr)} → ${dutyEsc(f.to)} · ${dutyEsc(f.dep)}–${dutyEsc(f.arr)} UTC <small>(local departure ${local})</small></span></label>`;
 }).join(''):'<p class="hint">No flights depart after this reporting time in the next 18 hours. Verify the local duty date and reporting time; older flights are excluded.</p>';
 dutyHistory();
}
function dutySelectionChanged(){const chosen=[...document.querySelectorAll('#dutyFlights input:checked')].map(e=>window.dutyCandidateFlights[+e.value]).filter(Boolean).sort((a,b)=>dutyDate(a.date,dutyTime(a.dep))-dutyDate(b.date,dutyTime(b.dep)));if(!chosen.length)return;document.getElementById('dutySectors').value=String(Math.min(10,chosen.length));const last=chosen.at(-1);document.getElementById('dutyFinal').value=last.arr;document.getElementById('dutyEndAirport').value=last.to;}
function dutySaveReport(){try{const date=document.getElementById('logDutyDate').value;checkDate(date);const report=dutyTime(document.getElementById('logDutyReport').value);const airport=document.getElementById('logDutyAirport').value.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(airport))throw Error('Invalid report airport');if(!cache.dutyReports)cache.dutyReports={};cache.dutyReports[date]={report,airport};writeDB(cache).then(()=>{show('Duty report saved.');document.getElementById('dutyDate').value=date;dutyFlightOptions();dutyLoadReport()}).catch(e=>show(e.message,true));}catch(e){show(e.message,true)}}
function dutyLoadReport(){const result=document.getElementById('dutyResult');if(result)result.innerHTML='<p class="hint">Duty date changed. Enter the reporting time and calculate for this date.</p>';const date=document.getElementById('dutyDate').value;const r=cache?.dutyReports?.[date];document.getElementById('dutyReport').value=r?.report||'';document.getElementById('dutyReportAirport').value=r?.airport||'SGN';document.getElementById('dutyFinal').value='';document.getElementById('dutySectors').value='1';}
function dutyInit(){const d=document.getElementById('dutyDate');if(!d)return;d.value=new Date(Date.now()+7*3600000).toISOString().slice(0,10);document.getElementById('logDutyDate').value=d.value;dutyLoadReport();dutyFlightOptions();dutyHistory();}
function dutyCalculate(save=false){try{
 const date=document.getElementById('dutyDate').value;checkDate(date);
 const report=dutyTime(document.getElementById('dutyReport').value);document.getElementById('dutyReport').value=report;
 const finalInput=document.getElementById('dutyFinal').value;const final=finalInput?dutyTime(finalInput):null;if(final)document.getElementById('dutyFinal').value=final;
 const sectors=+document.getElementById('dutySectors').value;
 const base=document.getElementById('dutyBase').value.toUpperCase().trim();const end=document.getElementById('dutyEndAirport').value.toUpperCase().trim();
 if(!/^[A-Z]{3}$/.test(base)||!/^[A-Z]{3}$/.test(end))throw Error('Use three-letter airport codes');
 const reportMs=dutyDate(date,report)-7*3600000; // local report at Vietnam UTC+7
 let finalMs=final?dutyDate(date,final):NaN;const chosen=[...document.querySelectorAll('#dutyFlights input:checked')].map(e=>window.dutyCandidateFlights[+e.value]);
 const last=chosen.at(-1);if(last){finalMs=dutyDate(last.date,last.arr)+Number(last.extra||0)*86400000;if(finalMs<dutyDate(last.date,last.dep))finalMs+=86400000;}
 else {if(!final)throw Error('Enter final chocks-on or select saved flights');while(finalMs<reportMs)finalMs+=86400000;}
 const finishMs=finalMs+15*60000;const actual=Math.round((finishMs-reportMs)/60000);const actualFdp=Math.round((finalMs-reportMs)/60000);
 if(actual<=0||actual>2400)throw Error('Check date and time basis. Actual duty must be between 0 and 40 hours.');
 if(sectors<1||sectors>10)throw Error('Choose 1–10 sectors');const m=dutyMinute(report),accl=document.getElementById('dutyAccl').value,ix=Math.max(0,sectors-2),b=accl==='unknown'?FDP_UNKNOWN[ix]:accl==='frm'?FDP_UNKNOWN_FRM[ix]:FDP_BASIC[dutyBand(m)][1][ix],ex=accl==='known'&&sectors<=5?FDP_EXT[extBand(m)][1][ix]:null;
 const basicFinish=reportMs+b*60000;const planned=accl!=='known'?'Not assessed for unknown acclimatization':ex==null?'Not allowed by Table 7.7':(sectors>(document.getElementById('dutyWocl').value==='none'?5:document.getElementById('dutyWocl').value==='short'?4:2)?'Not eligible: WOCL sector restriction':'Conditional — requires full extension checks');
 const travel=Number(document.getElementById('dutyTravel').value||0);if(!Number.isFinite(travel)||travel<0||travel>480)throw Error('Travel time must be 0–480 minutes');const rest=Math.max(actual,base===end?720:600)+(base===end?0:2*Math.max(0,travel-60));const earliest=finishMs+rest*60000;
 const manual=window.MYFLIGHT_MANUAL||{};
 const manualBasic=accl==='known'?manual.basic_fdp_company?.basicFdp(report,sectors,true):manual.unknown_acclim_company?.evaluateUnknownAcclim(sectors,accl==='frm');
 const manualRest=manual.rest_recovery_company?.companyRestFloor({previousDutyMin:actual,atHomeBase:base===end,travelOneWayMin:travel});
 const checks=[];
 if(!manualBasic||!Number.isFinite(manualBasic.maxFdpMinutes)||manualBasic.maxFdpMinutes!==b)checks.push('MANUAL TABLE MISMATCH / MISSING: cannot assess FDP against a verified table.');
 if(!manualRest||manualRest.minimumRestMin!==rest)checks.push('MANUAL REST MISMATCH / MISSING: minimum rest needs review.');
 if(accl==='frm')checks.push('FRM applicability must be confirmed; Table 7.6 is not automatically authorized.');if(accl!=='known')checks.push('Unknown acclimatization: planned extension Table 7.7 not evaluated.');if(sectors<1||sectors>10)throw Error('Choose 1–10 sectors');if(chosen.length&&chosen.length!==sectors)throw Error('Sector count does not match selected flights');if(chosen.length&&chosen[0].fr!==document.getElementById('dutyReportAirport').value.toUpperCase().trim())checks.push('Reporting airport differs from first selected departure airport: verify positioning or reporting location.');if(chosen.length&&chosen.length!==sectors)checks.push('Selected flights and sector count differ.');if(!chosen.length)checks.push('Planning calculation: no linked flight records.');checks.push('Reference time assumed Vietnam local (UTC+7); confirm acclimatization and reference-time basis.');checks.push('Basic rest is not a complete next-report authorization: extension-rest, recovery and other adjustments require checking.');if(ex!=null){const wocl=document.getElementById('dutyWocl').value;const cap=wocl==='none'?5:wocl==='short'?4:2;if(sectors>cap)checks.push('Planned extension NOT ELIGIBLE: WOCL encroachment restricts operating sectors to '+cap+' (§7.10.6).');else checks.push('Planned extension remains conditional: advance planning, two-in-seven-days frequency, additional rest and approval must be verified.');}if(chosen.length&&chosen.some((f,i)=>i&&f.fr!==chosen[i-1].to))checks.push('Discontinuous route: positioning or separate duty may be required.');if(chosen.length&&chosen.some(f=>!f.arr||!f.dep))checks.push('Incomplete linked flight times.');
 const html=`<div class="duty-results-grid"><div class="metric"><span>ACTUAL DUTY</span><strong>${dutyHM(actual)}</strong></div><div class="metric"><span>ACTUAL FDP (CHOCKS-ON)</span><strong>${dutyHM(actualFdp)}</strong></div><div class="metric"><span>BASIC MAX FDP</span><strong>${dutyHM(b)}</strong></div><div class="metric"><span>BASIC LATEST FINISH (UTC)</span><strong>${dutyEsc(dutyDateTime(basicFinish))}</strong></div><div class="metric"><span>PLANNED EXTENSION TABLE</span><strong>${ex==null?'NOT ALLOWED':dutyHM(ex)}</strong></div><div class="metric"><span>ACTUAL FINISH (UTC)</span><strong>${dutyEsc(dutyDateTime(finishMs))}</strong></div><div class="metric"><span>EARLIEST BASIC NEXT REPORT (UTC)</span><strong>${dutyEsc(dutyDateTime(earliest))}</strong></div></div><p><b>Duration comparison (actual FDP to final chocks-on vs basic FDP ceiling):</b> ${manualBasic&&manualBasic.maxFdpMinutes===b?(actualFdp<=b?'Within basic FDP duration (other checks outstanding)':'EXCEEDS basic FDP duration'):'UNVERIFIED — manual table requires review'} · <b>Planned extension:</b> ${planned}</p><p><b>Basic rest:</b> ${dutyHM(rest)} (${base===end?'home base':'outstation'}; greater of preceding duty or ${base===end?'12':'10'} hours).</p><ul>${checks.map(x=>`<li>${dutyEsc(x)}</li>`).join('')}</ul><p class="hint">Sources: OM-A Table 7.4 p.7-31, Table 7.7 p.7-33, §7.17 pp.7-57–58, Table 7.9 p.7-43. This is a preliminary planning calculation, NOT an operational eligibility determination.</p>`;
 document.getElementById('dutyResult').innerHTML=html;
 if(save){if(!chosen.length)throw Error('To save an actual duty, link at least one saved flight. Planning calculations are not saved as actual duty.');if(dutyEntries().some(d=>d.flightKeys?.some(k=>chosen.some(f=>k===[f.date,f.fr,f.to,f.dep,f.arr].join('|')))))throw Error('One or more flights are already linked to a saved duty. Delete or edit that duty first.');const entry={actualFdp,id:Date.now()+'-'+Math.random().toString(36).slice(2,7),date,report,accl,reportAirport:document.getElementById('dutyReportAirport').value.toUpperCase().trim()||base,base,end,sectors,reportMs,finalMs,finishMs,actual,travel,flightKeys:chosen.map(f=>[f.date,f.fr,f.to,f.dep,f.arr].join('|'))};if(!Array.isArray(cache.duties))cache.duties=[];cache.duties.push(entry);writeDB(cache).then(()=>{show('Duty saved in offline backup data.');dutyHistory()}).catch(e=>show('Duty save failed: '+e.message,true));}
 }catch(e){show(e.message,true)}}
// Support legacy saved records whose reportMs was absent or stored as text.
function dutyRecordStart(d){
 const direct=Number(d.reportMs);
 if(d.reportMs!=null&&d.reportMs!==''&&Number.isFinite(direct)&&direct>946684800000)return direct;
 try{if(d.date&&d.report)return dutyDate(d.date,dutyTime(d.report))-7*3600000;
 if(d.date)return Date.parse(d.date+'T00:00:00Z')-7*3600000;}catch(e){}
 return NaN;
}
function dutyHistory(){const h=document.getElementById('dutyHistory');if(!h)return;const duties=dutyEntries().slice().sort((a,b)=>dutyRecordStart(b)-dutyRecordStart(a));h.innerHTML=duties.length?duties.map(d=>`<div class="duty-history-row"><span>${dutyEsc(d.date)} · ${dutyEsc(d.reportAirport)} → ${dutyEsc(d.end)} · ${dutyHM(d.actual)} duty</span><button class="alt" onclick="dutyRemove('${dutyEsc(d.id)}')">Delete</button></div>`).join(''):'<p class="hint">No saved duty periods yet. Older flights without report times cannot be counted as complete duty records.</p>';
 const selectedDate=document.getElementById('dutyDate')?.value;
 const referenceDate=/^\d{4}-\d{2}-\d{2}$/.test(selectedDate||'')?selectedDate:new Date().toISOString().slice(0,10);
 // The selected local calendar day is inclusive; periods end at the following local midnight.
 const endMs=Date.parse(referenceDate+'T00:00:00Z')-7*3600000+86400000;
 const startMs=days=>endMs-days*86400000;
 const sum=days=>duties.filter(d=>{const t=dutyRecordStart(d);return Number.isFinite(t)&&t<endMs&&t>=startMs(days)}).reduce((total,d)=>total+(Number(d.actual)||0),0);
 const flightMin=days=>dutyAllFlights().filter(f=>{const t=dutyDate(f.date,f.dep);return t<endMs&&t>=startMs(days)}).reduce((total,f)=>{try{let v=dutyMinute(dutyTime(f.arr))-dutyMinute(dutyTime(f.dep))+(+f.extra||0)*1440;if(v<0)v+=1440;return total+v}catch{return total}},0);
 document.getElementById('dutyTotals').innerHTML=`<p class="hint"><b>As of ${dutyEsc(referenceDate)} (Vietnam local date)</b></p><div class="duty-results-grid"><div class="metric"><span>7-DAY RECORDED DUTY</span><strong>${dutyHM(sum(7))} / 60:00</strong></div><div class="metric"><span>14-DAY RECORDED DUTY</span><strong>${dutyHM(sum(14))} / 110:00</strong></div><div class="metric"><span>28-DAY RECORDED DUTY</span><strong>${dutyHM(sum(28))} / 190:00</strong></div><div class="metric"><span>28-DAY RECORDED FLIGHT</span><strong>${dutyHM(flightMin(28))} / 100:00</strong></div><div class="metric"><span>12 CALENDAR MONTH FLIGHT (RECORDED)</span><strong>${dutyHM(dutyCalendarFlight(referenceDate))} / 1000:00</strong></div></div><p class="hint">Recorded totals only, not certified remaining allowances. Missing duty periods, positioning, standby, simulator and archived time data can make totals incomplete. 12 consecutive calendar months use the selected calendar month and preceding 11 calendar months; partial records can understate totals.</p>`;
}
function dutyRemove(id){if(!confirm('Delete this duty record? Flight records are unaffected.'))return;cache.duties=dutyEntries().filter(x=>x.id!==id);writeDB(cache).then(()=>{dutyHistory();show('Duty record deleted.')}).catch(e=>show(e.message,true))}

function dutyCalendarFlight(referenceDate){const now=new Date((referenceDate||new Date().toISOString().slice(0,10))+'T12:00:00Z'),start=Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11,1)-7*3600000,end=Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)-7*3600000;return dutyAllFlights().filter(f=>{const t=dutyDate(f.date,f.dep);return t>=start&&t<end}).reduce((sum,f)=>{try{let v=dutyMinute(dutyTime(f.arr))-dutyMinute(dutyTime(f.dep))+(Number(f.extra)||0)*1440;if(v<0)v+=1440;return sum+v}catch{return sum}},0)}
