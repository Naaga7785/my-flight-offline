/* VietJet OMA A §7.10.8.2 pp7-39–41 (IMG_0831–0833).
 * Source-derived delayed report chronology only; not an FDP release.
 * Local datetime values refer to one consistently specified reporting timezone.
 */
'use strict';
function localMinutes(value){
 if(typeof value!=='string'||!/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.test(value))return null;
 const [y,m,d,h,n]=value.replace('T','-').replace(':','-').split('-').map(Number);
 if(m<1||m>12||h>23||n>59)return null;
 const ms=Date.UTC(y,m-1,d,h,n);
 const check=new Date(ms);
 if(check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)return null;
 return ms/60000;
}
function companyDelayedReporting({originalReport,revisedReport,firstNotification,secondNotification,firstDelayedReport,crewAtAccommodation,crewAlreadyTravelling,undisturbedThroughout,firstContactAdvanceAtLeast30Minutes}={}){
 const source='OMA §7.10.8.2, §7.10.8.2.1 pp7-39–41 (IMG_0831–0833)';
 const times={originalReport,revisedReport,firstNotification};
 const parsed={};const missing=[];
 for(const [key,value] of Object.entries(times)){parsed[key]=localMinutes(value);if(parsed[key]===null)missing.push(key+' dated local timestamp');}
 if(typeof crewAtAccommodation!=='boolean')missing.push('crew remains at suitable accommodation');
 if(typeof crewAlreadyTravelling!=='boolean')missing.push('whether crew was already en-route');
 if(missing.length)return {status:'REVIEW REQUIRED',missing,source};
 if(parsed.revisedReport<=parsed.originalReport||parsed.firstNotification>parsed.originalReport)return {status:'NOT DELAYED REPORTING',reason:'Chronology invalid or reporting time not later',source};
 if(crewAlreadyTravelling||!crewAtAccommodation)return {status:'REVIEW REQUIRED',reason:'Crew already travelling/not at suitable accommodation: original reporting or alternate-duty procedure requires dispatch confirmation',source};
 if(parsed.firstNotification>parsed.originalReport-30&&firstContactAdvanceAtLeast30Minutes!==true)return {status:'REVIEW REQUIRED',reason:'Notification less than 30 minutes before original reporting requires confirmed crew call and accommodation status',source};
 if(parsed.revisedReport-parsed.firstNotification>=600)return {status:'REGULAR NOTIFICATION — REVIEW REQUIRED',reason:'Ten hours or more before the informed start is a regular notification under §7.10.8.2.1; reconstruct duty/rest before calculating a new FDP',source};
 const delay=parsed.revisedReport-parsed.originalReport;
 let ceilingBasis=delay<240?'originalReport':'more restrictive of originalReport and revisedReport';
 let fdpStart=parsed.revisedReport;
 if(secondNotification!==undefined&&secondNotification!==null&&secondNotification!==''){
  const second=localMinutes(secondNotification),firstDelay=localMinutes(firstDelayedReport);
  if(second===null||firstDelay===null)return {status:'REVIEW REQUIRED',missing:['dated second notification','dated first delayed report'],source};
  if(second<parsed.firstNotification||second>parsed.revisedReport||firstDelay<parsed.originalReport)return {status:'REVIEW REQUIRED',reason:'Invalid first delay/second notice chronology',source};
  fdpStart=Math.min(second+60,firstDelay);
  ceilingBasis='firstDelayedReport';
 }
 if(delay>=600&&undisturbedThroughout===true)return {status:'REST CONVERSION — REVIEW REQUIRED',reason:'Ten-hour undisturbed delay potentially constitutes rest; evaluate new FDP after rest with confirmed reporting chronology',source};
 return {status:'FDP CLOCK BASIS ONLY',ceilingBasis,fdpStartLocal:new Date(fdpStart*60000).toISOString().slice(0,16),delayMinutes:delay,source,note:'Compute permitted FDP against company time/sector table separately; no approval implied.'};
}
window.MYFLIGHT_MANUAL.delayed_reporting_company={companyDelayedReporting,localMinutes};
