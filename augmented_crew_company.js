/* VietJet OMA Part A §7.10.7, pp 7-35–37 (IMG_0827–0829).
 * Table 7.8 has eight FDP bands and 3 rest-facility classes.
 * Table ceiling only; not a flight release or FRMS authorization. */
'use strict';
const AUGMENTED_BANDS=[870,900,930,960,990,1020,1050,1080];
const AUGMENTED_REST=[
 [90,90,90],[105,120,140],[120,140,160],[135,160,180],
 [155,180,null],[180,205,null],[205,null,null],[230,null,null]
];
const AUGMENTED_MAX={1:{1:960,2:900,3:840},2:{1:1020,2:960,3:900}};
function companyAugmentedCrew(input){
 const {additionalCrew,facilityClass,fdpMinutes,sectorCount,continuousFlightMinutes,
  individualContinuousRestMinutes,landingCrewRestMinutes,restDuringCruise,
  actualRestFacility,restAtDestinationMinutes,precedingDutyMinutes,
  seatAssignmentConfirmed,landingRestCompletedAtLeast60BeforeLanding}=input||{};
 const missing=[];
 if(!Number.isInteger(additionalCrew)||![1,2].includes(additionalCrew))missing.push('number of additional qualified cockpit crew (1 or 2)');
 if(!Number.isInteger(facilityClass)||![1,2,3].includes(facilityClass))missing.push('qualified rest facility class (1–3)');
 if(!Number.isFinite(fdpMinutes)||fdpMinutes<=0)missing.push('dated FDP duration');
 if(!Number.isInteger(sectorCount)||sectorCount<1)missing.push('operating sector count');
 if(!Number.isFinite(continuousFlightMinutes)||continuousFlightMinutes<0)missing.push('maximum continuous flight period');
 if(!Number.isFinite(individualContinuousRestMinutes)||individualContinuousRestMinutes<0)missing.push('minimum actual continuous rest of every cockpit crew member');
 if(!Number.isFinite(landingCrewRestMinutes)||landingCrewRestMinutes<0)missing.push('continuous rest of cockpit crew operating the landing');
 if(!Number.isFinite(precedingDutyMinutes)||precedingDutyMinutes<0)missing.push('preceding duty duration');
 if(!Number.isFinite(restAtDestinationMinutes)||restAtDestinationMinutes<0)missing.push('destination rest duration');
 for(const [v,k] of [[restDuringCruise,'in-flight rest during cruise'],[actualRestFacility,'rest facility suitability'],[seatAssignmentConfirmed,'rest seats allocated'],[landingRestCompletedAtLeast60BeforeLanding,'landing-crew rest ended >=60 min before landing']])if(typeof v!=='boolean')missing.push(k);
 if(missing.length)return {status:'REVIEW REQUIRED',missing};
 const problems=[];
 if(sectorCount>4)problems.push('Maximum four operating sectors for augmented FDP');
 if(!restDuringCruise)problems.push('In-flight rest must be during cruise');
 if(!actualRestFacility||!seatAssignmentConfirmed)problems.push('Rest facility and designated seats must be confirmed');
 if(!landingRestCompletedAtLeast60BeforeLanding)problems.push('Landing crew rest must end at least one hour before actual landing');
 if(individualContinuousRestMinutes<90)problems.push('Every crew member must receive at least 90 continuous minutes of in-flight rest');
 if(landingCrewRestMinutes<120)problems.push('Each pilot at controls for landing requires two consecutive hours of rest');
 if(restAtDestinationMinutes<Math.max(840,precedingDutyMinutes))problems.push('Destination rest must be at least the preceding duty or 14h, whichever is greater');
 let max=AUGMENTED_MAX[additionalCrew][facilityClass];
 if(sectorCount===1&&continuousFlightMinutes>540)max+=60;
 if(fdpMinutes>max)problems.push('FDP exceeds company augmented crew ceiling');
 const ix=AUGMENTED_BANDS.findIndex(b=>fdpMinutes<=b);
 const required=ix>=0?AUGMENTED_REST[ix][facilityClass-1]:null;
 if(required===null)problems.push('FDP/facility combination prohibited by company Table 7.8');
 else if(individualContinuousRestMinutes<required)problems.push('Each crew member requires at least '+required+' continuous rest minutes under Table 7.8');
 return {status:problems.length?'LIMIT / MISSING CONDITION':'TABLE CONDITIONS MET — OPERATIONAL REVIEW REQUIRED',maximumFdpMinutes:max,minimumIndividualRestMinutes:required,problems,source:'OMA §7.10.7; Table 7.8 pp.7-35–7-37'};
}
if(typeof module!=='undefined')window.MYFLIGHT_MANUAL.augmented_crew_company={companyAugmentedCrew,AUGMENTED_BANDS,AUGMENTED_REST,AUGMENTED_MAX};
