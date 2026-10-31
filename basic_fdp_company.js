/* Company OMA Part A §7.10.3.1, Table 7.4, IMG_0823, 07 Jul 2025.
   This module calculates TABLE ceilings only, not a legality clearance.
   Report time is reference-local time, sector count operating sectors only.
*/
'use strict';
const TABLE=[
['06:00','13:29',['13:00','12:30','12:00','11:30','11:00','10:30','10:00','09:30','09:00']],
['13:30','13:59',['12:45','12:15','11:45','11:15','10:45','10:15','09:45','09:15','09:00']],
['14:00','14:29',['12:30','12:00','11:30','11:00','10:30','10:00','09:30','09:00','09:00']],
['14:30','14:59',['12:15','11:45','11:15','10:45','10:15','09:45','09:15','09:00','09:00']],
['15:00','15:29',['12:00','11:30','11:00','10:30','10:00','09:30','09:00','09:00','09:00']],
['15:30','15:59',['11:45','11:15','10:45','10:15','09:45','09:15','09:00','09:00','09:00']],
['16:00','16:29',['11:30','11:00','10:30','10:00','09:30','09:00','09:00','09:00','09:00']],
['16:30','16:59',['11:15','10:45','10:15','09:45','09:15','09:00','09:00','09:00','09:00']],
['17:00','04:59',['11:00','10:30','10:00','09:30','09:00','09:00','09:00','09:00','09:00']],
['05:00','05:14',['12:00','11:30','11:00','10:30','10:00','09:30','09:00','09:00','09:00']],
['05:15','05:29',['12:15','11:45','11:15','10:45','10:15','09:45','09:15','09:00','09:00']],
['05:30','05:44',['12:30','12:00','11:30','11:00','10:30','10:00','09:30','09:00','09:00']],
['05:45','05:59',['12:45','12:15','11:45','11:15','10:45','10:15','09:45','09:15','09:00']]
];
function minutes(value){if(!/^\d{2}:\d{2}$/.test(value))return null;const [h,m]=value.split(':').map(Number);return h<=23&&m<=59?h*60+m:null}
function basicFdp(reportTime,sectors,acclimatised){
 const time=minutes(reportTime);if(time===null||!Number.isInteger(sectors)||sectors<1||acclimatised!==true)return {status:'REVIEW REQUIRED',reason:'Valid reference time, operating sector count and confirmed acclimatisation required.'};
 if(sectors>10)return {status:'REVIEW REQUIRED',reason:'Outside Table 7.4 sector range.'};
 const r=TABLE.find(([a,b])=>{const start=minutes(a),end=minutes(b);return start<=end?time>=start&&time<=end:time>=start||time<=end});
 if(!r)return {status:'REVIEW REQUIRED',reason:'No table row found.'};
 const ceiling=r[2][Math.max(2,sectors)-2];return {status:'TABLE LIMIT ONLY',maxFdpMinutes:minutes(ceiling),maxFdp:ceiling,source:'OMA 7.10.3.1 Table 7.4, IMG_0823',referenceBand:r[0]+'–'+r[1]};
}
window.MYFLIGHT_MANUAL.basic_fdp_company={basicFdp,TABLE,minutes};
