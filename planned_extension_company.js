/* OMA Part A §7.10.6 Table 7.7, screenshot IMG_0825, p7-33.
   Source-confirmed planned extension ceiling; never grants operational approval.
   Minutes since midnight and operating sector count. Null = explicitly not allowed. */
(function(root){
const rows=[
[360,374,[null,null,null,null]],
[375,389,[795,765,735,705]],
[390,404,[810,780,750,720]],
[405,419,[825,795,765,735]],
[420,809,[840,810,780,750]],
[810,839,[825,795,765,null]],
[840,869,[810,780,750,null]],
[870,899,[795,765,735,null]],
[900,929,[780,750,720,null]],
[930,959,[765,null,null,null]],
[960,989,[750,null,null,null]],
[990,1019,[735,null,null,null]],
[1020,1049,[720,null,null,null]],
[1050,1079,[705,null,null,null]],
[1080,1109,[690,null,null,null]],
[1110,1139,[675,null,null,null]],
[1140,1439,[null,null,null,null]],
[0,359,[null,null,null,null]]
];
function plannedExtensionCompany({reportMinutes,sectors,acclimatised,planned,previous7DaysExtensions,woclMinutes,otherExtension,recoveryRestVerified}={}){
 const reject=(status,reason)=>({status,reason,source:'OMA Part A §7.10.6 Table 7.7 / IMG_0825–0826'});
 if(!Number.isInteger(reportMinutes)||reportMinutes<0||reportMinutes>1439||!Number.isInteger(sectors)||sectors<1||sectors>5)return reject('REVIEW REQUIRED','Valid reporting clock and 1–5 operating sectors required');
 if(acclimatised!==true||planned!==true||!Number.isInteger(previous7DaysExtensions)||woclMinutes==null||otherExtension==null||recoveryRestVerified==null)return reject('REVIEW REQUIRED','Acclimatisation, advance planning, 7-day extension history, WOCL encroachment, combination and required extra rest need confirmation');
 const row=rows.find(r=>reportMinutes>=r[0]&&reportMinutes<=r[1]);const value=row[2][Math.max(0,sectors-2)];
 if(value==null)return reject('NOT ALLOWED','Company Table 7.7 forbids planned extension for this time/sector count');
 if(previous7DaysExtensions>=2)return reject('NOT ALLOWED','Maximum two extensions in seven consecutive days');
 if(otherExtension)return reject('NOT ALLOWED','Cannot combine with split duty or in-flight-rest extension');
 if(!Number.isInteger(woclMinutes)||woclMinutes<0)return reject('REVIEW REQUIRED','WOCL encroachment must be verified in minutes');
 if(sectors>(woclMinutes===0?5:woclMinutes<=120?4:2))return reject('NOT ALLOWED','WOCL sector cap exceeded');
 if(recoveryRestVerified!==true)return reject('REVIEW REQUIRED','Additional pre/post flight rest remains unverified');
 return {status:'TABLE CEILING ONLY',maximumFdpMinutes:value,source:'OMA Part A §7.10.6 Table 7.7 / IMG_0825–0826',note:'Still check the basic FDP extension limit and the remaining operational conditions.'};
}
root.plannedExtensionCompany=plannedExtensionCompany;root.companyExtensionRows=rows;
})(window.MYFLIGHT_MANUAL);
