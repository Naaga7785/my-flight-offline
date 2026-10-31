/* OMA 7.10.8.1, pp 7-37/38: advisory recording; never auto-authorize PIC discretion. */
'use strict';
function assessPicDiscretion(x){
 const issues=[];
 if(x.unexpectedAdverseWeather!==true)issues.push('Company restricts PIC discretion to unexpected adverse-weather circumstances');
 if(x.startedAtOrAfterReport!==true)issues.push('Discretion must arise at or after reporting time');
 if(x.consultedAllCrew!==true)issues.push('PIC must consult all crew on alertness');
 if(x.fatigueSafetyImpactRuledOut!==true)issues.push('PIC must decide against an extension where continued operation negatively affects safety');
 const max=x.augmentedCrew===true?180:120;
 if(!Number.isFinite(x.fdpExtensionMin)||x.fdpExtensionMin<0)issues.push('Actual FDP extension amount required');
 else if(x.fdpExtensionMin>max && x.finalSectorPostTakeoffException!==true)issues.push('FDP extension exceeds ordinary PIC discretion ceiling');
 if(!Number.isFinite(x.restReductionMin)||x.restReductionMin<0)issues.push('Rest reduction amount required');
 else if(x.restReductionMin>0 && (x.outsideHomeBase!==true||!Number.isFinite(x.resultingRestMin)||x.resultingRestMin<600))issues.push('Rest reduction restricted to away from home base and minimum 10-hour rest');
 if(x.reportToDirectorConfirmed!==true)issues.push('PIC report to Flight Operations Director required');
 if((x.fdpExtensionMin>60||x.restReductionMin>60)&&x.caavReportWithin28DaysConfirmed!==true)issues.push('VietJet must send report to CAAV within 28 days for more than one-hour variation');
 return {status:issues.length?'LIMIT / MISSING CONDITION':'PIC DECISION / MANUAL REVIEW ONLY',issues,ordinaryExtensionCapMin:max,neverAutoApprove:true,source:'OMA §7.10.8.1, pp 7-37–7-38'};
}
window.MYFLIGHT_MANUAL.pic_discretion_company={assessPicDiscretion};
