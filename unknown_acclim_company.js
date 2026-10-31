/* Company OMA Part A §7.10.3.2–3, Table 7.5–7.6 IMG_0824;
   CAAV VAR 15 §15.025(b), Tables 02–03, as supplementary confirmation.
   Returns a table limit only, not operational clearance. FRM requires explicit approval.
*/
'use strict';
const BASE=['11:00','10:30','10:00','09:30','09:00','09:00','09:00'];
const FRM=['12:00','11:30','11:00','10:30','10:00','09:30','09:00'];
function evaluateUnknownAcclim(sectors,frmApproved=false){
 if(!Number.isInteger(sectors)||sectors<1||sectors>10)return {status:'REVIEW REQUIRED',reason:'Invalid sector count'};
 if(frmApproved!==true&&frmApproved!==false)return {status:'REVIEW REQUIRED',reason:'Confirm whether the operator has relevant FRM approval.'};
 if(sectors>=9)return {status:'NOT ALLOWED',reason:'Company/CAAV unknown-acclimatisation tables do not allow 9 or 10 sectors.'};
 const hhmm=(frmApproved?FRM:BASE)[Math.max(2,sectors)-2];
 return {status:'TABLE LIMIT ONLY',maxFdp:hhmm,maxFdpMinutes:Number(hhmm.slice(0,2))*60+Number(hhmm.slice(3)),source:frmApproved?'OMA Table 7.6 / CAAV Table 03 (FRM approval required)':'OMA Table 7.5 / CAAV Table 02',approvalDependent:frmApproved};
}
window.MYFLIGHT_MANUAL.unknown_acclim_company={evaluateUnknownAcclim,BASE,FRM};
