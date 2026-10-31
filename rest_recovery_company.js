/* Company OMA Part A §§7.17.1–7.17.5, screenshots IMG_0842–0843.
   Guarded planning checks only: not an operational flight release. */
'use strict';
const MINUTE=60000, HOUR=3600000;
const valid=(n)=>Number.isFinite(n)&&n>=0;
function companyRestFloor({previousDutyMin,atHomeBase,travelOneWayMin=0,companyAccommodation=false}){
 if(!valid(previousDutyMin)||typeof atHomeBase!=='boolean')return {status:'REVIEW REQUIRED',reason:'Previous duty and base category required'};
 if(!atHomeBase&&!valid(travelOneWayMin))return {status:'REVIEW REQUIRED',reason:'Hotel travel time required'};
 const home=atHomeBase&&!companyAccommodation;
 const floor=Math.max(previousDutyMin,home?720:600);
 const excess=home?0:Math.max(0,travelOneWayMin-60)*2;
 return {status:'MINIMUM FLOOR ONLY',minimumRestMin:floor+excess,baseFloorMin:floor,travelAdditionMin:excess,source:'OMA §§7.17.1–7.17.2'};
}
function companyReducedRest({normalMin,proposedMin,priorRestCompliant}){
 if(!valid(normalMin)||!valid(proposedMin)||typeof priorRestCompliant!=='boolean')return {status:'REVIEW REQUIRED'};
 const reduction=Math.max(0,normalMin-proposedMin);
 if(reduction&& !priorRestCompliant)return {status:'NOT PERMITTED',reason:'Preceding rest not confirmed compliant with §7.17.1(a)'};
 return {status:reduction?'CONDITIONAL — REVIEW REQUIRED':'NO REDUCTION',reductionMin:reduction,nextRestAdditionMin:reduction,nextFdpReductionMin:reduction,nextRestMustNotBeReduced:reduction>0,source:'OMA §7.17.3'};
}
function companyExtendedRecovery({recoveryStart,recoveryEnd,nextRecoveryStart,localNights,disruptiveDuties=0,lateToEarly=false,oneLocalNightBetween=false}){
 const a=Date.parse(recoveryStart),b=Date.parse(recoveryEnd),c=Date.parse(nextRecoveryStart);
 if(![a,b,c].every(Number.isFinite)||a>=b||b>c||!Number.isInteger(localNights)||localNights<0||!Number.isInteger(disruptiveDuties)||disruptiveDuties<0) return {status:'REVIEW REQUIRED',reason:'Complete dated chronology required'};
 const duration=(b-a)/HOUR,gap=(c-b)/HOUR,required=disruptiveDuties>=4?60:36;
 const issues=[];
 if(duration<required)issues.push('Recovery shorter than '+required+' hours');
 if(localNights<2)issues.push('Recovery does not include two local nights');
 if(gap>168)issues.push('More than 168 hours between end of recovery and start of next recovery');
 if(lateToEarly&& !oneLocalNightBetween)issues.push('Late/night-to-early transition lacks one local night');
 return {status:issues.length?'LIMIT / MISSING CONDITION':'CONDITIONAL — REVIEW REQUIRED',issues,recoveryHours:duration,gapHours:gap,requiredHours:required,monthlyTwoLocalDaysAuditRequired:true,source:'OMA §§7.17.4–7.17.5'};
}
window.MYFLIGHT_MANUAL.rest_recovery_company={companyRestFloor,companyReducedRest,companyExtendedRecovery};
