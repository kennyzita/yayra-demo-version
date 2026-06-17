// @ts-nocheck
'use client'
import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const supabase = createClient()

const NJ_COUNTIES = ["Atlantic","Bergen","Burlington","Camden","Cape May","Cumberland","Essex","Gloucester","Hudson","Hunterdon","Mercer","Middlesex","Monmouth","Morris","Ocean","Passaic","Salem","Somerset","Sussex","Union","Warren"];
const PROC_CODES = ["H2016HI","H2021HI","H2021HI22","H2016HI22","H2016","H2021","T2016","T1019","S5125","S5130","H0043","H2015"];
const SERVICE_TYPES = ["Community-Based Services","Community-Based Services Acuity","Individual Support","Individual Support Acuity","Respite","Community Inclusion","Transportation"];
const SERVICE_PROC_MAP = {"Community-Based Services":"H2021HI","Community-Based Services Acuity":"H2021HI22","Individual Support":"H2016HI","Individual Support Acuity":"H2016HI22"};
const SERVICE_RATE_MAP = {"Community-Based Services":9.77,"Community-Based Services Acuity":9.77,"Individual Support":9.85,"Individual Support Acuity":9.85};
const STORAGE_KEY = "billing_mgr_v1";
const BILLING_NAV_STATE_KEY = "billing_mgr_nav_state_v1";
const DEFAULT_PIN = "1234";

function readBillingNavState(){
  if(typeof window==="undefined")return {};
  try{return JSON.parse(sessionStorage.getItem(BILLING_NAV_STATE_KEY)||"{}");}
  catch{return {};}
}

function saveBillingNavState(state){
  if(typeof window==="undefined")return;
  sessionStorage.setItem(BILLING_NAV_STATE_KEY,JSON.stringify(state));
}

const SC_AGENCIES = [
  {company:"1 Able Community LLC",email:"support@1ablecommunity.com"},
  {company:"1 Henlucy Health System",email:"INFO@1Henlucyhealthsystem.org"},
  {company:"A & S Support Services",email:"info@anssupport.org"},
  {company:"A Bright Tomorrow LLC",email:"wsanchez@abrighttomorrow.org"},
  {company:"A Care Connection of New Jersey LLC",email:"brad@accofnj.org"},
  {company:"A Second Touch",email:"sgmyers@asecondtouch.com"},
  {company:"A Simple Leap Support Services LLC",email:"info@asimpleleap.com"},
  {company:"Abilities First LLC",email:"shawn@abilitiesfirstnj.com"},
  {company:"Ability Advocates of New Jersey",email:"info@abilityadvocatesofnj.org"},
  {company:"Access to Community",email:"admin@accesssc.org"},
  {company:"Accessible Community Empowerments",email:"info@acempowerments.com"},
  {company:"Ace Care Support Hand",email:"bolla@acecaresupporthand.org"},
  {company:"Achieving A Better Life",email:"lwatson@achievingabetterlifellc.com"},
  {company:"ADAMS NJ",email:"info@adamsnj.com"},
  {company:"Advanced Disability Management Services LLC",email:"info@admsnj.com"},
  {company:"Advantage Supports",email:"admin@advantagesupports.com"},
  {company:"Agape Healthcare Services LLC",email:"info@agapehealthcs.com"},
  {company:"AIM Support Services LLC",email:"info@aimnj.org"},
  {company:"Alexander's Vision Community Services LLC",email:"kmonaco@alexandersvision.com"},
  {company:"All Heart and Soul LLC",email:"info@allheartandsoul.com"},
  {company:"All Together Support Coordination LLC",email:"info@alltogethersupports.com"},
  {company:"Allied Behavioral Healthcare Therapy Services LLC",email:"Lillians@abctherapyservices.org"},
  {company:"Amazing Strides LLC",email:"info@amazingstrides.com"},
  {company:"Angel Behavioral Care Services LLC",email:"SCNJ@angelbcare.com"},
  {company:"Apex Compassion LLC",email:"info@apexcompassion.com"},
  {company:"Arc of Atlantic County Inc",email:"info@arcatlantic.org"},
  {company:"Arc of Ocean County Inc",email:"Medicaid@arcocean.org"},
  {company:"Attentive Care Inc",email:"info@attentivecareinc.com"},
  {company:"Avenues to Independent Living",email:"billing@Avenuestil.com"},
  {company:"Beautiful and Creative Minds LLC",email:"joanne@beautifulandcreativeminds.com"},
  {company:"Bemi Care Human Services LLC",email:"gpirah@bemicareservices.com"},
  {company:"Bergen County Board of Social Services",email:"supportcoordination@bcbss.com"},
  {company:"Beyond Today",email:"info@beyondtodayedu.com"},
  {company:"Brain Injury Alliance of NJ Inc",email:"bianjsc@bianj.org"},
  {company:"Breaking Barriers Services",email:"info@bbsnj.com"},
  {company:"Bridges Supports Coordination LLC",email:"Jgodown@bridgesnj.com"},
  {company:"Brooks Alternative Agency Inc",email:"sbrooks@brooksalternative.com"},
  {company:"Care Support Services",email:"grace@caresupportservices.org"},
  {company:"Caregivers of New Jersey",email:"cnjsc@njcaregivers.org"},
  {company:"Caring for Families Social Services NJ LLC",email:"vcheco@caringforfamilies.net"},
  {company:"Champion Learning LLC",email:"championlearningllc@gmail.com"},
  {company:"Choice Milestones",email:"info@choicemilestones.com"},
  {company:"Columbus Medical Services LLC",email:"Columbus-NJ@columbusorg.com"},
  {company:"Community Access Unlimited",email:"DDDINFO@caunj.org"},
  {company:"Community Personnel Services",email:"MedicaidCPS@cpsofnj.org"},
  {company:"Community Support Specialists LLC",email:"rclark@ClarkCareNJ.com"},
  {company:"Compassion Home Care",email:"compassion@compassionhomecare.org"},
  {company:"Compassionate Care Givers Inc",email:"information@ccginc.org"},
  {company:"Compassionate Care Services LLC",email:"trustccs.org@gmail.com"},
  {company:"DDSCNJ LLC",email:"admin@ddscnj.com"},
  {company:"Dedicated Home Care LLC",email:"services@dedicatedhomecare.org"},
  {company:"Department for Persons w/ Disabilities Diocese of Paterson",email:"iRecord@dpd.org"},
  {company:"Disability Navigators",email:"hello@dnavigators.com"},
  {company:"Disability Services and Advocacy LLC",email:"williamsengland@dsausa.net"},
  {company:"Employment Network Team of NJ Inc",email:"admin@entjobs.org"},
  {company:"Empowering Lives Through Opportunity",email:"info@empoweringlivesthroughopportunity.com"},
  {company:"Equal Opportunity Support Services",email:"equalopportunityss@gmail.com"},
  {company:"Experienced Support Coordination",email:"mlencovich@experiencedsc.com"},
  {company:"Good Neighbor Support Services",email:"tade@goodneighborsupport.com"},
  {company:"Heat Holistic Lifestyle Program",email:"ajohnson@heatholisticlifestyle.com"},
  {company:"Heightened Independence and Progress",email:"mgonzalezceo@hipcil.org"},
  {company:"Hexagon Network",email:"info@hexagonnetworknj.com"},
  {company:"House of Caring Hands Inc",email:"houseofcaringhands@gmail.com"},
  {company:"Infinity Today",email:"errol@infinitytoday.com"},
  {company:"Iyaho Social Services of New Jersey Inc",email:"NJinfo@iyaho.org"},
  {company:"Jewish Family Services of Metrowest",email:"dcrum@jfsmetrowest.org"},
  {company:"Joyful Frontiers",email:"jfrontiers@joyfulfrontiers.com"},
  {company:"Karing Associates",email:"info@Karing.info"},
  {company:"Keeping Independence Services and Supports",email:"info@kissnj.com"},
  {company:"Keystone Independent Living LLC",email:"scinfo@keycommres.com"},
  {company:"Life Steps LLC",email:"lifesteps13@gmail.com"},
  {company:"Lifestyle for Independence LLC",email:"admin@lifestyleforindependence.com"},
  {company:"Limitless Bounds LLC",email:"sca@limitlessboundsnj.com"},
  {company:"Lotus Sisters LLC",email:"lotussisters50@protonmail.com"},
  {company:"Loving Angels Network",email:"lovingangelsnetwork@mail.com"},
  {company:"Memorable Moments",email:"info@memorablemomentsllc.org"},
  {company:"Mercy Drive Regional Corporation",email:"mercydriveinc@aol.com"},
  {company:"Moceans Center for Independent Living Inc",email:"support.coordination@moceanscil.org"},
  {company:"Multiply Group Inc",email:"info@multiplygroupinc.org"},
  {company:"National Institute for People with Disabilities of NJ",email:"nipdsupports@yai.org"},
  {company:"Navigation Support Coordination LLC",email:"chelsea@navigationsca.com"},
  {company:"Neighbours Inc",email:"cherryoakley@neighbours-inc.com"},
  {company:"New Avenues LLC",email:"admin@newavenuesnj.org"},
  {company:"Nexus Support Coordination",email:"info@NexusSC.net"},
  {company:"NJ Support Services",email:"admin@njsupportservices.com"},
  {company:"NLC Supports LLC",email:"info@nlcsupport.us"},
  {company:"No Limit Life",email:"info@nolimitlife.org"},
  {company:"Owen Health Care Inc",email:"owenhhc@gmail.com"},
  {company:"Partners For Successful Living Inc",email:"charlesbrown@pslpartner.org"},
  {company:"Person First New Jersey LLC",email:"contact@personfirstnj.org"},
  {company:"Price Social Services",email:"cheryl@pricesocialserviceagency.com"},
  {company:"Priority Group Services",email:"segun@prioritygroups.org"},
  {company:"Prism Support Services LLC",email:"igriffiths@prismsupportservices.com"},
  {company:"Progressive Center for Independent Living Inc",email:"scs@pcil.org"},
  {company:"Quality First Support Group",email:"info@qualityfirstsupportgroup.com"},
  {company:"Senior Citizens United Community Services Inc",email:"akreider@scucs.org"},
  {company:"Service Access and Management Inc",email:"samscnj@sam-inc.org"},
  {company:"Shore Direct Care LLC",email:"info@shoredirectcare.com"},
  {company:"Smart of South Jersey LLC",email:"smart@SmartSouthJersey.com"},
  {company:"Solutions for U",email:"lsmith@solutionsforu01.com"},
  {company:"Spectrum Care Management and Counseling LLC",email:"info@spectrumcmc.com"},
  {company:"Support Connection NJ",email:"info@supportconnectionnj.com"},
  {company:"Supportive Choices LLC",email:"info@supportivechoices.com"},
  {company:"The Arc Middlesex County",email:"irecord@arc-middlesex.org"},
  {company:"The Caring Community Center LLC",email:"caringcommcenter@aol.com"},
  {company:"Ties to Tomorrow Care Management LLC",email:"Supportcoordination@tiestomorrow.com"},
  {company:"Values Into Action NJ",email:"info@vianj.org"},
  {company:"Yahalom SCA LLC",email:"info@yahalomsca.com"},].sort((a,b)=>a.company.localeCompare(b.company));

const navy="#1a3a5c",blue="#2563eb",blueL="#dbeafe",teal="#0d9488",tealL="#ccfbf1";
const green="#16a34a",greenL="#dcfce7",yellow="#d97706",yellowL="#fef3c7";
const red="#dc2626",redL="#fee2e2",purple="#7c3aed",purpleL="#ede9fe";
const gray0="#f8fafc",gray1="#f1f5f9",gray2="#e2e8f0";
const gray5="#64748b",gray7="#334155",gray9="#0f172a",white="#ffffff";

const fmtUSD=n=>"$"+parseFloat(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtNum=n=>parseInt(n||0).toLocaleString();
const fmtHrs=n=>parseFloat(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

function calcAge(dob){
  if(!dob)return"";
  const d=new Date(dob),now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  if(now.getMonth()-d.getMonth()<0||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))age--;
  return isNaN(age)?"":age;
}
function fmtD(d){return`${d.getUTCMonth()+1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;}
function fmtWeekRange(startStr){const[m,d,y]=startStr.split("/").map(Number);const s=new Date(Date.UTC(y,m-1,d));const e=new Date(s);e.setUTCDate(e.getUTCDate()+6);return`${fmtD(s)} – ${fmtD(e)}`;}
function nowStr(){return new Date().toLocaleString();}
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isDbUuid(id){return typeof id==="string"&&UUID_RE.test(id);}

function genWeeks(s,e,def){
  if(!s||!e)return[];
  const [sy,sm,sd]=s.split("-").map(Number),[ey,em,ed]=e.split("-").map(Number);
  const start=new Date(Date.UTC(sy,sm-1,sd)),end=new Date(Date.UTC(ey,em-1,ed));
  if(start>end)return[];
  const cur=new Date(start);cur.setUTCDate(cur.getUTCDate()-cur.getUTCDay());
  const out=[];
  while(cur<=end){
    const we=new Date(cur);we.setUTCDate(we.getUTCDate()+6);
    const aS=cur<start?start:cur,aE=we>end?end:we;
    const days=Math.round((aE-aS)/864e5)+1;
    out.push({s:fmtD(cur),e:fmtD(we),u:days===7?def:Math.round(def*days/7),
      billed:false,icnPdfUrl:"",paReportUrl:"",
      approved:null,missed:false,unlocked:false,unlockReason:"",unlockTime:""});
    cur.setUTCDate(cur.getUTCDate()+7);
  }
  return out;
}

function mkPA(id){return{id,name:"Community-Based Services",proc:"H2021HI",rate:9.77,uph:4,def:0,
  paS:"",paE:"",pan:"",pau:0,planId:"",evv:"EVV",
  scCompany:"",scEmail:"",scPhone:"",
  scName:"",scIndEmail:"",scIndPhone:"",
  scsName:"",scsEmail:"",scsPhone:"",
  sdrUrl:"",njiSpUrl:"",pcptUrl:"",intakeUrl:"",
  weeks:[]};}
function mkClient(id){return{id,name:"",pid:"",dob:"",sex:"",county:"",mid:"",dx:"",locked:false,pin:DEFAULT_PIN,services:[mkPA(Date.now())]};}
// Name alone (or Medicaid ID alone) isn't enough to safely treat two records as the same
// client — two real clients can share a name, and a typo'd Medicaid ID can collide.
// Require name + DOB + Medicaid ID to all be present and match before auto-suggesting a merge.
function findExactDuplicateClient(rec,clients){
  const name=(rec?.name||"").toLowerCase().trim();
  const dob=rec?.dob||"";
  const mid=rec?.mid||rec?.medicaidId||"";
  if(!name||!dob||!mid)return null;
  return (clients||[]).find(c=>!c.archived&&
    (c.name||"").toLowerCase().trim()===name&&
    (c.dob||"")===dob&&
    (c.mid||"")===mid
  )||null;
}

async function sGet(k){try{const v=typeof localStorage!=="undefined"?localStorage.getItem(k):null;return v?JSON.parse(v):null;}catch{return null;}}
async function sSet(k,v){try{if(typeof localStorage!=="undefined")localStorage.setItem(k,JSON.stringify(v));}catch{}}

// ── Supabase-backed unified storage (clients + staff come from Staff Connect) ──
const STAFF_ROLE_TO_LABEL={dsp:"DSP",supervisor:"Supervisor",behaviour_support:"Behaviour Support",admin:"Admin",office_staff:"Admin"};
const LABEL_TO_STAFF_ROLE={"DSP":"dsp","Supervisor":"supervisor","Behaviour Support":"behaviour_support","Admin":"admin"};

async function loadBillingClients(){
  const { data: cls, error: e1 } = await supabase.from("clients").select("id, full_name").order("full_name");
  if(e1) throw e1;
  const { data: bd, error: e2 } = await supabase.from("billing_client_data").select("client_id, data, archived");
  if(e2) throw e2;
  const byId = new Map((bd||[]).map(r=>[r.client_id,r]));
  return (cls||[]).map(c=>{
    const row = byId.get(c.id);
    const b = (row?.data) || {};
    const base = mkClient(c.id);
    return {
      ...base,
      ...b,
      id: c.id,
      name: b.name || c.full_name || "",
      archived: row?.archived ?? !!b.archived,
    };
  });
}

async function loadBillingStaff(){
  // Query yayracare users table — only DSP and DSP Staff roles
  const { data: usersData, error: e1 } = await supabase
    .from("users")
    .select("id, first_name, last_name, role:roles(name)");
  if(e1) throw e1;
  const dspUsers = (usersData||[]).filter(u=>{
    const rn = Array.isArray(u.role) ? u.role[0]?.name : u.role?.name;
    return rn === "DSP Staff";
  });
  const ids = dspUsers.map(u=>u.id);
  if(!ids.length) return [];
  const [{ data: bd, error: e3 }, { data: asg, error: e4 }] = await Promise.all([
    supabase.from("billing_staff_data").select("staff_id, data, archived").in("staff_id",ids),
    supabase.from("assignments").select("dsp_id, client_id").in("dsp_id",ids),
  ]);
  if(e3) throw e3; if(e4) throw e4;
  const billingById = new Map((bd||[]).map(r=>[r.staff_id,r]));
  const assignByUser = new Map();
  (asg||[]).forEach(a=>{
    const arr = assignByUser.get(a.dsp_id) || [];
    arr.push(a.client_id);
    assignByUser.set(a.dsp_id, arr);
  });
  return dspUsers.map(u=>{
    const row = billingById.get(u.id);
    const b = (row?.data) || {};
    const roleName = Array.isArray(u.role) ? u.role[0]?.name : u.role?.name;
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
    const base = mkStaff(u.id);
    return {
      ...base,
      ...b,
      id: u.id,
      name: b.name || fullName || "",
      role: roleName || b.role || "DSP",
      archived: row?.archived ?? !!b.archived,
      assignedClientIds: assignByUser.get(u.id) || [],
    };
  });
}

async function addAssignment(dspId, clientId){
  if(!isDbUuid(dspId)||!isDbUuid(clientId)) return;
  const { error } = await supabase.from("assignments")
    .insert({ dsp_id: dspId, client_id: clientId });
  if(error && !String(error.message||"").toLowerCase().includes("duplicate")) throw error;
}
async function removeAssignment(dspId, clientId){
  if(!isDbUuid(dspId)||!isDbUuid(clientId)) return;
  const { error } = await supabase.from("assignments")
    .delete().eq("dsp_id", dspId).eq("client_id", clientId);
  if(error) throw error;
}

async function upsertBillingClient(c){
  if(!c?.id) return;
  let saveId = c.id;
  if(!isDbUuid(saveId)){
    const { data: row, error: createError } = await supabase.from("clients")
      .insert({ full_name: c.name || "New Client", dob: c.dob || null })
      .select("id").single();
    if(createError) throw createError;
    saveId = row.id;
  }
  const { id, ...rest } = c;
  const cleanRest = {...rest, id: saveId};
  const { error } = await supabase.from("billing_client_data").upsert(
    { client_id: saveId, data: cleanRest, archived: !!cleanRest.archived, updated_at: new Date().toISOString() },
    { onConflict: "client_id" }
  );
  if(error) throw error;
  return saveId;
}
async function upsertBillingStaff(s){
  if(!s?.id) return;
  if(!isDbUuid(s.id)) return;
  // Strip assignedClientIds — source of truth is the assignments table.
  const { id, assignedClientIds, ...rest } = s;
  const { error } = await supabase.from("billing_staff_data").upsert(
    { staff_id: id, data: rest, archived: !!rest.archived, updated_at: new Date().toISOString() },
    { onConflict: "staff_id" }
  );
  if(error) throw error;
}
async function deleteBillingClientRow(id){
  if(!isDbUuid(id)) return;
  const { error } = await supabase.from("billing_client_data").delete().eq("client_id", id);
  if(error) throw error;
}
async function deleteBillingStaffRow(id){
  if(!isDbUuid(id)) return;
  const { error } = await supabase.from("billing_staff_data").delete().eq("staff_id", id);
  if(error) throw error;
}

async function pdfExtract(file){
  const fd=new FormData();
  fd.append("file",file);
  const res=await fetch("/api/public/extract-pdf",{method:"POST",body:fd});
  const d=await res.json();
  if(!res.ok)throw new Error(d.error||`Server error ${res.status}`);
  return d.data;
}
function parseDriveId(url){const m=url.match(/\/d\/([a-zA-Z0-9_-]+)/)||url.match(/id=([a-zA-Z0-9_-]+)/);return m?m[1]:null;}

// ── Staff data model ──────────────────────────────────────────────────────────
const STAFF_STORAGE_KEY="billing_mgr_staff_v1";
const STAFF_ROLES=["DSP","Supervisor","Behaviour Support","Admin"];
const STAFF_STATUSES=["Active","Inactive","On Leave"];
const FICA_RATE=0.0765, FUTA_RATE=0.006, NJ_SUI_RATE=0.004;

function mkStaff(id){return{id,name:"",role:"DSP",hireDate:"",status:"Active",
  phone:"",email:"",address:"",city:"",state:"NJ",zip:"",
  payRate:0,weeklyHours:0,expenses:[],
  assignedClientIds:[],
  hoursLog:{} // {clientId: [{week:'YYYY-MM-DD', hours, billable}]}
};}

function calcStaffWeek(s,hrsOverride,rateOverride){
  const rate=rateOverride!=null?(parseFloat(rateOverride)||0):(parseFloat(s.payRate)||0);
  const hrs=hrsOverride!=null?(parseFloat(hrsOverride)||0):(parseFloat(s.weeklyHours)||0);
  const gross=rate*hrs;
  const fica=gross*FICA_RATE;
  const futa=gross*FUTA_RATE;
  const sui=gross*NJ_SUI_RATE;
  const expenses=(s.expenses||[]).reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
  const totalTax=fica+futa+sui;
  const totalCost=gross+totalTax+expenses;
  return{gross,fica,futa,sui,totalTax,expenses,totalCost,hrs,rate};
}
function paWeekTotals(client,week){
  let units=0,hours=0,revenue=0,cost=0;
  (client?.services||[]).forEach(pa=>{
    const wk=(pa.weeks||[]).find(x=>x.s===week);
    if(!wk||!wk.billed)return;
    const u=parseFloat(wk.u)||0,uph=parseFloat(pa.uph)||1,rate=parseFloat(pa.rate)||0;
    units+=u;hours+=uph>0?u/uph:0;cost+=u*rate;
    if(wk.approved===true)revenue+=u*rate;
  });
  return{units,hours,revenue,cost};
}
function paActualTotalCostForClients(ids,clients){
  return (ids||[]).reduce((sum,cid)=>{
    const c=clients.find(x=>x.id===cid);if(!c)return sum;
    return sum+(c.services||[]).reduce((a,pa)=>a+(pa.weeks||[]).reduce((x,wk)=>x+((parseFloat(wk.u)||0)*(parseFloat(pa.rate)||0)),0),0);
  },0);
}
function staffLogEntry(s,cid,week){return ((s?.hoursLog||{})[cid]||[]).find(e=>e.week===week);}
function assignedActiveStaffForClient(allStaff,cid){return (allStaff||[]).filter(s=>!s.archived&&(s.assignedClientIds||[]).includes(cid));}
function clientWeekStaffAllocation(client,week,allStaff){
  const pa=paWeekTotals(client,week),assigned=assignedActiveStaffForClient(allStaff,client?.id);
  const allocations={};
  assigned.forEach(s=>{
    const entry=staffLogEntry(s,client.id,week);
    const manual=!!entry;
    const hours=manual?(parseFloat(entry.hours)||0):0;
    const billable=manual?(parseFloat(entry.billable)||0):0;
    const rate=(entry&&entry.rate!=null&&entry.rate!=="")?(parseFloat(entry.rate)||0):(parseFloat(s.payRate)||0);
    const revenue=pa.units>0?pa.revenue*(billable/pa.units):0;
    allocations[s.id]={hours,billable,revenue,manual,rate};
  });
  const totalHours=Object.values(allocations).reduce((a,x)=>a+(parseFloat(x.hours)||0),0);
  return{...pa,allocations,totalHours,over:totalHours>pa.hours+0.01,overBy:Math.max(0,totalHours-pa.hours),staffCount:assigned.length};
}
function staffWeekClientRows(s,clients,allStaff,week){
  const ids=s.assignedClientIds||[];
  const rows=ids.map(cid=>{
    const c=clients.find(x=>x.id===cid);if(!c)return null;
    const wk=clientWeekStaffAllocation(c,week,allStaff),a=wk.allocations[s.id]||{hours:0,billable:0,revenue:0,manual:false,rate:parseFloat(s.payRate)||0};
    return{wk:week,cid,c,hrs:a.hours,billable:a.billable,revenue:a.revenue,manual:a.manual,rate:a.rate,paHours:wk.hours,totalClientHours:wk.totalHours,over:wk.over,overBy:wk.overBy,staffCount:wk.staffCount};
  }).filter(Boolean);
  const weekHrs=rows.reduce((a,r)=>a+r.hrs,0);
  const totalExpenses=parseFloat((s.weeklyExpenses||{})[week])||0;
  // Per-row: actual hours × that row's rate + employer tax + prorated weekly expenses
  return rows.map(r=>{
    const gross=(r.hrs||0)*(r.rate||0);
    const tax=gross*(FICA_RATE+FUTA_RATE+NJ_SUI_RATE);
    const expShare=weekHrs>0?totalExpenses*((r.hrs||0)/weekHrs):0;
    const cost=gross+tax+expShare;
    return{...r,gross,tax,expShare,cost,margin:(r.revenue||0)-cost};
  });
}
function staffAllLogRows(s,clients,allStaff){
  const weeks=new Set();
  (s.assignedClientIds||[]).forEach(cid=>{
    const c=(clients||[]).find(x=>x.id===cid);if(!c)return;
    (c.services||[]).forEach(pa=>(pa.weeks||[]).forEach(wk=>weeks.add(wk.s)));
  });
  return [...weeks].flatMap(wk=>staffWeekClientRows(s,clients||[],allStaff||[],wk));
}
function staffTaxTotals(s,clients,allStaff){
  const rows=staffAllLogRows(s,clients,allStaff);
  const gross=rows.reduce((a,r)=>a+(r.gross||0),0);
  const fica=gross*FICA_RATE,futa=gross*FUTA_RATE,sui=gross*NJ_SUI_RATE;
  const activeWeeks=new Set(rows.filter(r=>(r.hrs||0)>0).map(r=>r.wk)).size;
  const totalHrs=rows.reduce((a,r)=>a+(r.hrs||0),0);
  return{gross,fica,futa,sui,totalTax:fica+futa+sui,activeWeeks,totalHrs,avgWeeklyHrs:activeWeeks>0?totalHrs/activeWeeks:0,avgWeeklyGross:activeWeeks>0?gross/activeWeeks:0};
}
function totalCumulativeEmployerCostForClients(ids,clients,allStaff){
  const weeks=[...new Set((ids||[]).flatMap(cid=>(clients.find(c=>c.id===cid)?.services||[]).flatMap(pa=>(pa.weeks||[]).map(w=>w.s))))];
  const staff=(allStaff||[]).filter(s=>!s.archived&&(s.assignedClientIds||[]).some(cid=>(ids||[]).includes(cid)));
  return staff.reduce((sum,s)=>sum+weeks.reduce((a,wk)=>a+staffWeekClientRows(s,clients,allStaff,wk).filter(r=>(ids||[]).includes(r.cid)).reduce((x,r)=>x+r.cost,0),0),0);
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
const iBase={fontSize:12,padding:"5px 8px",borderRadius:6,border:`1.5px solid ${gray2}`,background:white,color:gray9,width:"100%",outline:"none",boxSizing:"border-box"};
function Inp({value,onChange,type="text",readOnly,placeholder,step,min,onBlur,style}){
  return <input type={type} value={value??""} onChange={onChange} readOnly={readOnly} placeholder={placeholder} step={step} min={min} onBlur={onBlur}
    style={{...iBase,...style,...(readOnly?{background:gray1,color:gray5,cursor:"not-allowed"}:{})}}/>;}
function Sel({value,onChange,children,disabled}){
  return <select value={value??""} onChange={onChange} disabled={disabled}
    style={{...iBase,...(disabled?{background:gray1,color:gray5,cursor:"not-allowed"}:{})}}>{children}</select>;}
function Fld({label,children}){
  return <div style={{display:"flex",flexDirection:"column",gap:3}}>
    <label style={{fontSize:11,fontWeight:800,color:gray7,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>
    {children}
  </div>;}
function Row({cols=4,gap=8,mt=0,children}){
  return <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap,marginTop:mt}}>{children}</div>;}
function Card({title,icon,accent=navy,children,action}){
  return <div style={{background:white,border:`1.5px solid ${gray2}`,borderRadius:10,marginBottom:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
    <div style={{padding:"9px 14px",background:accent,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>{icon&&<span style={{fontSize:14}}>{icon}</span>}
        <span style={{fontSize:12,fontWeight:800,color:white,textTransform:"uppercase",letterSpacing:".07em"}}>{title}</span>
      </div>{action}
    </div>
    <div style={{padding:14}}>{children}</div>
  </div>;}
function Metric({label,val,color=navy,bg=gray1,sub,labelColor,subColor}){
  // Auto-pick high-contrast label/sub colors when the value text is white (dark bg)
  const autoLight=color===white;
  const lc=labelColor||(autoLight?"rgba(255,255,255,0.95)":gray7);
  const sc=subColor||(autoLight?"rgba(255,255,255,0.85)":gray5);
  return <div style={{background:bg,border:`1.5px solid ${gray2}`,borderRadius:8,padding:"10px 12px"}}>
    <div style={{fontSize:10,fontWeight:800,color:lc,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{label}</div>
    <div style={{fontSize:20,fontWeight:900,color}}>{val}</div>
    {sub&&<div style={{fontSize:10,color:sc,marginTop:2,fontWeight:600}}>{sub}</div>}
  </div>;}
function Btn({onClick,children,bg=white,color=gray7,border=gray2,disabled,full,style}){
  return <button onClick={onClick} disabled={disabled}
    style={{padding:"5px 11px",borderRadius:7,border:`1.5px solid ${border}`,background:disabled?gray1:bg,
      color:disabled?gray5:color,cursor:disabled?"not-allowed":"pointer",fontSize:12,fontWeight:600,
      width:full?"100%":undefined,...style}}>{children}</button>;}
function Bar({pct,height=7}){
  const c=pct>=90?red:pct>=60?yellow:teal;
  return <div style={{display:"flex",alignItems:"center",gap:4}}>
    <div style={{flex:1,height,borderRadius:99,background:gray2,overflow:"hidden",minWidth:40}}>
      <div style={{height:"100%",width:`${Math.min(100,Math.max(0,pct))}%`,background:c,borderRadius:99,transition:"width .3s"}}/>
    </div>
    <span style={{fontSize:10,fontWeight:700,color:c,minWidth:28,textAlign:"right"}}>{pct}%</span>
  </div>;}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBarChart({data,color=blue,height=60}){
  if(!data||!data.length)return null;
  const max=Math.max(...data.map(d=>d.val),1);
  return <div style={{display:"flex",alignItems:"flex-end",gap:3,height,paddingTop:4}}>
    {data.map((d,i)=>{
      const h=Math.max(2,Math.round((d.val/max)*height));
      return <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,gap:2}}>
        <div title={`${d.label}: ${d.val}`} style={{width:"100%",height:h,background:color,borderRadius:"3px 3px 0 0",opacity:.85}}/>
        <span style={{fontSize:8,color:gray5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:32}}>{d.label}</span>
      </div>;
    })}
  </div>;}

// ── Doc Attach ────────────────────────────────────────────────────────────────
function DocAttach({label,value,onChange,locked,color=teal,icon="📎",compact=false}){
  const ref=useRef();
  function handleFile(e){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=()=>onChange(r.result);r.readAsDataURL(f);
  }
  const fs=compact?{lbl:9,view:10,none:9,url:9,btn:10,gap:3,colGap:3,inputW:80,pad:"2px 4px"}
                  :{lbl:13,view:13,none:12,url:12,btn:13,gap:6,colGap:6,inputW:110,pad:"4px 6px"};
  function openDoc(e){
    e.preventDefault();
    if(!value)return;
    if(typeof value==="string"&&value.startsWith("data:")){
      try{
        const [meta,b64]=value.split(",");
        const mime=(meta.match(/data:([^;]+)/)||[])[1]||"application/octet-stream";
        const bin=atob(b64);
        const bytes=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
        const blob=new Blob([bytes],{type:mime});
        const url=URL.createObjectURL(blob);
        window.open(url,"_blank","noopener,noreferrer");
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      }catch{window.open(value,"_blank","noopener,noreferrer");}
    }else{window.open(value,"_blank","noopener,noreferrer");}
  }
  return <div style={{display:"flex",flexDirection:"column",gap:fs.colGap,alignItems:"center"}}>
    <div style={{fontSize:fs.lbl,fontWeight:800,color:gray7,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>
    {value
      ?<div style={{display:"flex",gap:fs.gap,alignItems:"center"}}>
        <a href={value} onClick={openDoc} target="_blank" rel="noreferrer" style={{fontSize:fs.view,color,fontWeight:700,textDecoration:"none",cursor:"pointer"}}>{icon} View</a>
        {!locked&&<button onClick={()=>onChange("")} style={{fontSize:fs.view-1,color:red,background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button>}
      </div>
      :<span style={{fontSize:fs.none,color:gray5,fontStyle:"italic"}}>None</span>}
    {!locked&&<div style={{display:"flex",gap:fs.gap-2,alignItems:"center"}}>
      <input value={typeof value==="string"&&value.startsWith("http")?value:""} onChange={e=>onChange(e.target.value)}
        placeholder="URL…" style={{fontSize:fs.url,padding:fs.pad,borderRadius:5,border:`1px solid ${gray2}`,width:fs.inputW,outline:"none",color:gray7}}/>
      <button onClick={()=>{ref.current.value="";ref.current.click();}}
        style={{fontSize:fs.btn,padding:fs.pad,borderRadius:5,border:`1px solid ${gray2}`,background:gray1,color:gray7,cursor:"pointer",flexShrink:0,fontWeight:700}}>⬆</button>
      <input ref={ref} type="file" accept="application/pdf,image/*" style={{display:"none"}} onChange={handleFile}/>
    </div>}
  </div>;}

// ── PIN Modal ─────────────────────────────────────────────────────────────────
function PinModal({title,subtitle,onConfirm,onClose,correctPin}){
  const [val,setVal]=useState("");
  const [err,setErr]=useState("");
  function attempt(){
    if(val===correctPin){onConfirm();onClose();}
    else{setErr("Incorrect PIN. Try again.");setVal("");}
  }
  return <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.65)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:white,borderRadius:12,padding:24,width:340,boxShadow:"0 8px 40px rgba(0,0,0,.25)"}}>
      <div style={{fontSize:28,textAlign:"center",marginBottom:8}}>🔒</div>
      <div style={{fontWeight:800,fontSize:15,color:navy,textAlign:"center",marginBottom:4}}>{title}</div>
      <div style={{fontSize:12,color:gray5,textAlign:"center",marginBottom:16}}>{subtitle}</div>
      <input type="password" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()}
        placeholder="Enter PIN" autoFocus style={{...iBase,fontSize:16,textAlign:"center",letterSpacing:"0.3em",marginBottom:8}}/>
      {err&&<div style={{fontSize:11,color:red,textAlign:"center",marginBottom:8}}>{err}</div>}
      <div style={{display:"flex",gap:8,marginTop:4}}>
        <Btn onClick={attempt} bg={navy} color={white} border={navy} full>Unlock</Btn>
        <Btn onClick={onClose} full>Cancel</Btn>
      </div>
      <div style={{fontSize:10,color:gray5,textAlign:"center",marginTop:10}}>Default PIN: 1234</div>
    </div>
  </div>;}

// ── Unlock Row Modal ──────────────────────────────────────────────────────────
function UnlockRowModal({week,onConfirm,onClose}){
  const [reason,setReason]=useState("");
  return <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.65)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:white,borderRadius:12,padding:24,width:400,boxShadow:"0 8px 40px rgba(0,0,0,.25)"}}>
      <div style={{fontSize:28,textAlign:"center",marginBottom:8}}>⚠️</div>
      <div style={{fontWeight:800,fontSize:15,color:red,textAlign:"center",marginBottom:4}}>Unlock Approved Week</div>
      <div style={{fontSize:12,color:gray5,textAlign:"center",marginBottom:4}}>Week: <b style={{color:navy}}>{week.s} – {week.e}</b></div>
      <div style={{fontSize:12,color:gray7,textAlign:"center",marginBottom:16}}>Provide a reason to unlock this approved week for amendment.</div>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for amendment…" rows={3}
        style={{...iBase,resize:"vertical",marginBottom:8}}/>
      {reason.trim().length>0&&reason.trim().length<10&&<div style={{fontSize:11,color:yellow,marginBottom:6}}>Min 10 characters required.</div>}
      <div style={{display:"flex",gap:8,marginTop:4}}>
        <Btn onClick={()=>{if(reason.trim().length>=10)onConfirm(reason.trim());}} bg={red} color={white} border={red} disabled={reason.trim().length<10} full>Unlock for Amendment</Btn>
        <Btn onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  </div>;}

// ── Print View ────────────────────────────────────────────────────────────────
function PrintView({cl,onClose}){
  function doPrint(){window.print();}
  return <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.7)",zIndex:60,overflowY:"auto",padding:24}}>
    <style>{`@media print{.no-print{display:none!important}.print-area{box-shadow:none!important;margin:0!important;padding:16px!important}}`}</style>
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div className="no-print" style={{display:"flex",gap:8,marginBottom:16,justifyContent:"flex-end"}}>
        <Btn onClick={doPrint} bg={navy} color={white} border={navy}>🖨️ Print / Save PDF</Btn>
        <Btn onClick={onClose}>✕ Close</Btn>
      </div>
      <div className="print-area" style={{background:white,borderRadius:12,padding:32,boxShadow:"0 4px 24px rgba(0,0,0,.15)"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`2px solid ${navy}`,paddingBottom:12,marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:navy}}>RCS Billing Record</div>
            <div style={{fontSize:12,color:gray5,marginTop:2}}>Printed: {new Date().toLocaleDateString()}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:800,color:navy}}>{cl.name||"Unnamed Client"}</div>
            <div style={{fontSize:11,color:gray5}}>Medicaid ID: {cl.mid||"—"} &nbsp;|&nbsp; DOB: {cl.dob||"—"} &nbsp;|&nbsp; County: {cl.county||"—"}</div>
            <div style={{fontSize:11,color:gray5}}>Dx: {cl.dx||"—"} &nbsp;|&nbsp; Program: RCS</div>
          </div>
        </div>

        {cl.services.map((pa,pi)=>{
          const tU=pa.weeks.reduce((a,w)=>a+w.u,0);
          const tC=tU*pa.rate;
          const approvedU=pa.weeks.filter(w=>w.approved===true).reduce((a,w)=>a+w.u,0);
          const paR=Math.max(0,(parseInt(pa.pau)||0)-approvedU);
          return <div key={pa.id} style={{marginBottom:28}}>
            <div style={{background:navy,color:white,padding:"6px 12px",borderRadius:"6px 6px 0 0",fontSize:13,fontWeight:800}}>
              PA {pi+1}{pa.pan?" — "+pa.pan:""}{pa.planId?" | Plan "+pa.planId:""}
              <span style={{float:"right",fontSize:11,fontWeight:400,opacity:.8}}>{pa.name} · {pa.proc}</span>
            </div>
            <div style={{border:`1px solid ${gray2}`,borderTop:"none",borderRadius:"0 0 6px 6px",padding:12}}>
              {pa.scCompany&&<div style={{fontSize:11,color:gray5,marginBottom:6}}>
                SC Agency: <b style={{color:gray9}}>{pa.scCompany}</b>
                {pa.scName&&<> &nbsp;|&nbsp; SC: <b style={{color:gray9}}>{pa.scName}</b></>}
                {pa.scsName&&<> &nbsp;|&nbsp; SCS: <b style={{color:gray9}}>{pa.scsName}</b></>}
              </div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
                {[["PA Period",`${pa.paS||"—"} → ${pa.paE||"—"}`],["Approved Units",fmtNum(pa.pau)],["Total Units",fmtNum(tU)],["PA Remaining",fmtNum(paR)],["Total Hours",fmtHrs(pa.uph>0?tU/pa.uph:0)],["Rate",fmtUSD(pa.rate)],["Total Cost",fmtUSD(tC)],["Approved Units",fmtNum(approvedU)]].map(([l,v])=>(
                  <div key={l} style={{background:gray0,borderRadius:6,padding:"6px 8px"}}>
                    <div style={{fontSize:9,fontWeight:700,color:gray5,textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:navy}}>{v}</div>
                  </div>
                ))}
              </div>
              {pa.weeks.length>0&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:gray1}}>
                    {["#","Week","Units","Hours","Cost","Cumul.","Billed","ICN","Approved","Missed"].map(h=>(
                      <th key={h} style={{padding:"4px 6px",textAlign:h==="Week"||h==="#"?"left":"center",fontSize:9,fontWeight:800,color:gray5,borderBottom:`1px solid ${gray2}`,textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pa.weeks.map((w,wi)=>{
                    const cum=pa.weeks.slice(0,wi+1).reduce((a,x)=>a+x.u,0);
                    return <tr key={wi} style={{borderBottom:`1px solid ${gray1}`,background:wi%2===0?white:gray0}}>
                      <td style={{padding:"3px 6px",color:gray5,fontSize:10}}>{wi+1}</td>
                      <td style={{padding:"3px 6px",fontSize:10,color:navy,fontWeight:500,whiteSpace:"nowrap"}}>{w.s}–{w.e}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10}}>{w.u}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10,color:gray5}}>{fmtHrs(w.u/(pa.uph||4))}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10,color:green}}>{fmtUSD(w.u*pa.rate)}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10,color:blue,fontWeight:700}}>{fmtNum(cum)}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10}}>{w.billed?"✓":""}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10,color:blue}}>{w.icnPdfUrl?"📄":""}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10,fontWeight:700,color:w.approved===true?green:w.approved===false?red:gray5}}>
                        {w.approved===true?"✓ Approved":w.approved===false?"✗ Denied":"⏳"}
                      </td>
                      <td style={{padding:"3px 6px",textAlign:"center",fontSize:10,color:w.missed?red:gray5}}>{w.missed?"⚠":""}</td>
                    </tr>;
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:navy,color:white,fontWeight:700}}>
                    <td colSpan={2} style={{padding:"4px 6px",fontSize:11}}>Total</td>
                    <td style={{padding:"4px 6px",textAlign:"center",fontSize:11}}>{fmtNum(tU)}</td>
                    <td style={{padding:"4px 6px",textAlign:"center",fontSize:11}}>{fmtHrs(pa.uph>0?tU/pa.uph:0)}</td>
                    <td style={{padding:"4px 6px",textAlign:"center",fontSize:11}}>{fmtUSD(tC)}</td>
                    <td colSpan={5} style={{padding:"4px 6px",textAlign:"center",fontSize:10,color:"rgba(255,255,255,.6)"}}>
                      {pa.weeks.filter(w=>w.approved===true).length} approved · {pa.weeks.filter(w=>w.missed).length} missed
                    </td>
                  </tr>
                </tfoot>
              </table>}
            </div>
          </div>;
        })}
        <div style={{marginTop:24,paddingTop:12,borderTop:`1px solid ${gray2}`,fontSize:10,color:gray5,textAlign:"center"}}>
          RCS Billing Management · Confidential · Generated {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  </div>;}

// ── Summary Dashboard ─────────────────────────────────────────────────────────
function Dashboard({clients,staff=[],onSelect,onOpenArchive,archivedCount=0}){
  const [tab,setTab]=useState("overview");
  const allPAs=clients.flatMap(c=>c.services);
  const tU=allPAs.reduce((a,p)=>a+p.weeks.reduce((b,w)=>b+w.u,0),0);
  const tC=allPAs.reduce((a,p)=>a+p.weeks.reduce((b,w)=>b+w.u,0)*p.rate,0);
  const tMissed=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.missed).length,0);
  const tApproved=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===true).length,0);
  const tPending=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.billed&&w.approved===null).length,0);
  const tDenied=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===false).length,0);
  const tPAU=allPAs.reduce((a,p)=>a+Math.max(0,parseInt(p.pau)||0),0);
  const tPACost=allPAs.reduce((a,p)=>a+Math.max(0,parseInt(p.pau)||0)*(p.rate||0),0);
  const tApprovedU=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===true).reduce((b,w)=>b+w.u,0),0);
  const tBilledU=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.billed).reduce((b,w)=>b+w.u,0),0);
  const tBilledC=allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.billed).reduce((b,w)=>b+w.u*p.rate,0),0);
  const anyBilled=tBilledU>0;

  // Per-client stats for breakdown table
  const clientStats=clients.map(c=>{
    const pas=c.services;
    const u=pas.reduce((a,p)=>a+p.weeks.reduce((b,w)=>b+w.u,0),0);
    const approvedU=pas.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===true).reduce((b,w)=>b+w.u,0),0);
    const pau=pas.reduce((a,p)=>a+Math.max(0,parseInt(p.pau)||0),0);
    const cost=pas.reduce((a,p)=>a+p.weeks.reduce((b,w)=>b+w.u,0)*p.rate,0);
    const missed=pas.reduce((a,p)=>a+p.weeks.filter(w=>w.missed).length,0);
    const approved=pas.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===true).length,0);
    const pending=pas.reduce((a,p)=>a+p.weeks.filter(w=>w.billed&&w.approved===null).length,0);
    const pct=pau>0?Math.min(100,Math.round(approvedU/pau*100)):0;
    return{id:c.id,name:c.name,mid:c.mid,county:c.county,u,approvedU,pau,cost,missed,approved,pending,pct,locked:c.locked};
  });

  // Mini chart data — top 8 clients by cost
  const chartData=[...clientStats].sort((a,b)=>b.cost-a.cost).slice(0,8).map(c=>({
    label:(c.name||"?").slice(0,6),val:Math.round(c.cost)
  }));

  const tabStyle=active=>({
    padding:"7px 16px",borderRadius:"7px 7px 0 0",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
    background:active?white:"transparent",color:active?navy:gray5,
    borderBottom:active?`2px solid ${blue}`:"2px solid transparent",
  });

  return <div style={{padding:20}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <div style={{width:4,height:22,background:blue,borderRadius:99}}/>
      <div style={{fontSize:20,fontWeight:900,color:navy}}>Summary Dashboard</div>
      <span style={{fontSize:11,padding:"2px 9px",borderRadius:99,background:blueL,color:blue,fontWeight:700}}>{clients.length} clients</span>
      <button onClick={onOpenArchive}
        style={{marginLeft:"auto",fontSize:11,padding:"6px 12px",borderRadius:7,border:`1px solid ${yellow}`,
          background:archivedCount>0?yellowL:white,color:archivedCount>0?yellow:gray5,cursor:"pointer",fontWeight:800}}>
        🗄 Archive Folder ({archivedCount})
      </button>
    </div>

    {/* Top metrics — show PA totals until anything is billed */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      <Metric label="Active clients" val={clients.length} color={blue} bg={blueL}/>
      <Metric label={anyBilled?"Total units billed":"Total PA units"}
        val={fmtNum(anyBilled?tBilledU:tPAU)} color={teal} bg={tealL}
        sub={anyBilled?`of ${fmtNum(tPAU)} authorized`:"nothing billed yet"}/>
      <Metric label={anyBilled?"Total billed cost":"Total PA cost"}
        val={fmtUSD(anyBilled?tBilledC:tPACost)} color={green} bg={greenL}
        sub={anyBilled?`of ${fmtUSD(tPACost)} authorized`:"nothing billed yet"}/>
      <Metric label="PA utilization" val={`${tPAU>0?Math.min(100,Math.round(tApprovedU/tPAU*100)):0}%`} color={purple} bg={purpleL} sub={`${fmtNum(tApprovedU)} approved units`}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(1,1fr)",gap:10,marginBottom:20}}>
      <Metric label="Missed visits" val={tMissed} color={tMissed>0?red:teal} bg={tMissed>0?redL:tealL}/>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${gray2}`,marginBottom:0}}>
      {[["overview","📋 Client Overview"],["chart","📊 Cost Breakdown"],["status","⚡ PA Status"]].map(([key,label])=>(
        <button key={key} style={tabStyle(tab===key)} onClick={()=>setTab(key)}>{label}</button>
      ))}
    </div>

    <div style={{background:white,border:`1.5px solid ${gray2}`,borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>

      {/* Overview tab */}
      {tab==="overview"&&<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:gray1}}>
              {["Client","Medicaid ID","County","PAs","Units","Approved Units","PA Utilization","Cost","Pending","Approved","Missed"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:800,fontSize:10,color:gray5,
                  borderBottom:`1.5px solid ${gray2}`,whiteSpace:"nowrap",textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientStats.map((c,i)=>{
              const bg=i%2===0?white:gray0;
              return <tr key={c.id} onClick={()=>onSelect(c.id)} style={{cursor:"pointer",background:bg,borderBottom:`1px solid ${gray1}`}}
                onMouseEnter={e=>e.currentTarget.style.background=blueL}
                onMouseLeave={e=>e.currentTarget.style.background=bg}>
                <td style={{padding:"8px 10px",fontWeight:700,color:navy}}>{c.name||"Unnamed"}{c.locked&&" 🔒"}</td>
                <td style={{padding:"8px 10px",color:gray5}}>{c.mid||"—"}</td>
                <td style={{padding:"8px 10px",color:gray5}}>{c.county||"—"}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontWeight:600}}>{clients.find(cl=>cl.id===c.id)?.services.length||0}</td>
                <td style={{padding:"8px 10px",fontWeight:600}}>{c.u>0?fmtNum(c.u):"—"}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:green}}>{c.approvedU>0?fmtNum(c.approvedU):"—"}</td>
                <td style={{padding:"8px 10px",minWidth:130}}>
                  {c.pau>0?<Bar pct={c.pct} height={6}/>:<span style={{color:gray5,fontSize:11}}>—</span>}
                </td>
                <td style={{padding:"8px 10px",fontWeight:700,color:green}}>{c.u>0?fmtUSD(c.cost):"—"}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontWeight:600,color:c.pending>0?yellow:gray5}}>{c.pending||"—"}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontWeight:600,color:teal}}>{c.approved||"—"}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:c.missed>0?red:green}}>{c.missed>0?`⚠ ${c.missed}`:"✓ 0"}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr style={{background:navy,color:white,fontWeight:800}}>
              <td colSpan={4} style={{padding:"7px 10px",fontSize:12}}>Totals</td>
              <td style={{padding:"7px 10px",fontSize:12}}>{fmtNum(tU)}</td>
              <td style={{padding:"7px 10px",fontSize:12,color:"#86efac"}}>{fmtNum(tApprovedU)}</td>
              <td style={{padding:"7px 10px",fontSize:12,color:"rgba(255,255,255,.6)"}}>{tPAU>0?Math.min(100,Math.round(tApprovedU/tPAU*100)):0}%</td>
              <td style={{padding:"7px 10px",fontSize:12,color:"#86efac"}}>{fmtUSD(tC)}</td>
              <td style={{padding:"7px 10px",textAlign:"center",fontSize:12,color:tMissed>0?"#fca5a5":"rgba(255,255,255,.5)"}}>{tPending||"—"}</td>
              <td style={{padding:"7px 10px",textAlign:"center",fontSize:12}}>{tApproved}</td>
              <td style={{padding:"7px 10px",textAlign:"center",fontSize:12,color:tMissed>0?"#fca5a5":"rgba(255,255,255,.6)"}}>{tMissed>0?`⚠ ${tMissed}`:"✓ 0"}</td>
            </tr>
          </tfoot>
        </table>
      </div>}

      {/* Chart tab */}
      {tab==="chart"&&<div style={{padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:navy,marginBottom:12}}>Top clients by billed cost</div>
            <MiniBarChart data={chartData} color={blue} height={80}/>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:navy,marginBottom:12}}>PA utilization by client</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {clientStats.filter(c=>c.pau>0).slice(0,8).map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:90,fontSize:10,color:gray7,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name||"Unnamed"}</div>
                  <div style={{flex:1}}><Bar pct={c.pct} height={10}/></div>
                </div>
              ))}
              {clientStats.filter(c=>c.pau>0).length===0&&<div style={{fontSize:12,color:gray5,fontStyle:"italic"}}>No authorized units set yet.</div>}
            </div>
          </div>
        </div>
        <div style={{marginTop:20,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          <div style={{background:greenL,border:`1px solid ${green}`,borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:10,fontWeight:800,color:green,textTransform:"uppercase",marginBottom:4}}>Approved cost</div>
            <div style={{fontSize:18,fontWeight:900,color:green}}>{fmtUSD(allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===true).reduce((b,w)=>b+w.u*p.rate,0),0))}</div>
          </div>
          <div style={{background:yellowL,border:`1px solid ${yellow}`,borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:10,fontWeight:800,color:yellow,textTransform:"uppercase",marginBottom:4}}>Pending cost</div>
            <div style={{fontSize:18,fontWeight:900,color:yellow}}>{fmtUSD(allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.billed&&w.approved===null).reduce((b,w)=>b+w.u*p.rate,0),0))}</div>
          </div>
          <div style={{background:redL,border:`1px solid ${red}`,borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:10,fontWeight:800,color:red,textTransform:"uppercase",marginBottom:4}}>Denied cost</div>
            <div style={{fontSize:18,fontWeight:900,color:red}}>{fmtUSD(allPAs.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===false).reduce((b,w)=>b+w.u*p.rate,0),0))}</div>
          </div>
        </div>
      </div>}

      {/* PA Status tab */}
      {tab==="status"&&<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:gray1}}>
              {["Client","PA #","Plan ID","Service","Proc","PA Period","Approved Units","Used Units","Remaining","Utilization","Status"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"8px 10px",fontWeight:800,fontSize:10,color:gray5,
                  borderBottom:`1.5px solid ${gray2}`,whiteSpace:"nowrap",textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.flatMap(c=>c.services.map((pa,pi)=>{
              const approvedU=pa.weeks.filter(w=>w.approved===true).reduce((a,w)=>a+w.u,0);
              const pau=Math.max(0,parseInt(pa.pau)||0);
              const paR=Math.max(0,pau-approvedU);
              const pct=pau>0?Math.min(100,Math.round(approvedU/pau*100)):0;
              const exhausted=pct>=100,critical=pct>=90,warn=pct>=60;
              const statusColor=exhausted?red:critical?red:warn?yellow:green;
              const statusBg=exhausted?redL:critical?redL:warn?yellowL:greenL;
              const statusLabel=exhausted?"Exhausted":critical?"Critical":warn?"Warning":"On Track";
              const rowKey=`${c.id}-${pa.id}`;
              return <tr key={rowKey} onClick={()=>onSelect(c.id)} style={{cursor:"pointer",borderBottom:`1px solid ${gray1}`}}
                onMouseEnter={e=>e.currentTarget.style.background=blueL}
                onMouseLeave={e=>e.currentTarget.style.background=white}>
                <td style={{padding:"8px 10px",fontWeight:700,color:navy}}>{c.name||"Unnamed"}</td>
                <td style={{padding:"8px 10px",color:blue,fontWeight:600}}>{pa.pan||`PA ${pi+1}`}</td>
                <td style={{padding:"8px 10px",color:purple,fontWeight:600}}>{pa.planId||"—"}</td>
                <td style={{padding:"8px 10px",fontSize:11,color:gray7,maxWidth:120,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{pa.name}</td>
                <td style={{padding:"8px 10px",fontSize:11}}><span style={{background:blueL,color:blue,borderRadius:4,padding:"2px 5px",fontWeight:700,fontSize:10}}>{pa.proc}</span></td>
                <td style={{padding:"8px 10px",fontSize:11,whiteSpace:"nowrap",color:gray5}}>{pa.paS||"—"} → {pa.paE||"—"}</td>
                <td style={{padding:"8px 10px",fontWeight:700}}>{fmtNum(pau)}</td>
                <td style={{padding:"8px 10px",fontWeight:700,color:blue}}>{fmtNum(approvedU)}</td>
                <td style={{padding:"8px 10px",fontWeight:700,color:paR<pau*.1?red:paR<pau*.3?yellow:green}}>{fmtNum(paR)}</td>
                <td style={{padding:"8px 10px",minWidth:120}}>{pau>0?<Bar pct={pct} height={6}/>:<span style={{color:gray5,fontSize:11}}>—</span>}</td>
                <td style={{padding:"8px 10px"}}>
                  <span style={{background:statusBg,color:statusColor,borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{statusLabel}</span>
                </td>
              </tr>;
            }))}
          </tbody>
        </table>
      </div>}
    </div>
  </div>;}

// ── PA Table ──────────────────────────────────────────────────────────────────
function PATable({pa,updPA,paIdx,totalPAs,onRemove,minimized,onToggleMinimize,clientLocked,onPrint,clientPin}){
  const [unlockRow,setUnlockRow]=useState(null);
  const [showArchivePin,setShowArchivePin]=useState(false);
  const [showUnarchivePin,setShowUnarchivePin]=useState(false);
  const [serviceMin,setServiceMin]=useState(false);
  const archived=!!pa.archived;
  const hasActivity=pa.weeks.some(w=>w.billed||w.approved!==null);

  const tU=pa.weeks.reduce((a,w)=>a+w.u,0);
  const tH=pa.uph>0?tU/pa.uph:0;
  const tC=tU*pa.rate;
  const pau=Math.max(0,parseInt(pa.pau)||0);
  const approvedU=pa.weeks.filter(w=>w.approved===true).reduce((a,w)=>a+w.u,0);
  const paR=Math.max(0,pau-approvedU);
  const oPct=pau>0?Math.min(100,Math.round(approvedU/pau*100)):0;
  const statusLabel=oPct>=100?"🔴 Exhausted":oPct>=90?"⚠️ Nearly exhausted":oPct>=60?"🔔 Over halfway":"✅ On track";
  const statusColor=oPct>=90?red:oPct>=60?yellow:teal;
  const statusBg=oPct>=90?redL:oPct>=60?yellowL:tealL;

  function updWeek(i,patch){updPA({weeks:pa.weeks.map((w,j)=>j===i?{...w,...patch}:w)});}
  function rb(p={}){const m={...pa,...p};updPA({...p,weeks:genWeeks(m.paS,m.paE,m.def)});}

  const missedCount=pa.weeks.filter(w=>w.missed).length;
  const approvedCount=pa.weeks.filter(w=>w.approved===true).length;
  const pendingCount=pa.weeks.filter(w=>w.billed&&w.approved===null).length;
  const deniedCount=pa.weeks.filter(w=>w.approved===false).length;

  function handleApprovalChange(i,w,newVal){
    if(w.approved===true&&!w.unlocked){setUnlockRow(i);}
    else{updWeek(i,{approved:newVal==="pending"?null:newVal==="yes"});}
  }

  const COLS=["#","Week","Units","Hrs","Cost","Cum.","Rem.","Progress","Billed?","ICN","PA Report","Approved?","Missed?"];

  const lockEdits=clientLocked||archived;

  return <>
    {unlockRow!==null&&<UnlockRowModal week={pa.weeks[unlockRow]}
      onConfirm={reason=>{updWeek(unlockRow,{unlocked:true,unlockReason:reason,unlockTime:nowStr(),approved:null,billed:true});setUnlockRow(null);}}
      onClose={()=>setUnlockRow(null)}/>}
    {showArchivePin&&<PinModal title="Archive PA" subtitle="Enter PIN to archive this PA. It will be locked for audit and cannot be edited."
      correctPin={clientPin||DEFAULT_PIN}
      onConfirm={()=>{setShowArchivePin(false);updPA({archived:true,archivedAt:nowStr()});}}
      onClose={()=>setShowArchivePin(false)}/>}
    {showUnarchivePin&&<PinModal title="Unarchive PA" subtitle="Enter PIN to unlock this archived PA for editing."
      correctPin={clientPin||DEFAULT_PIN}
      onConfirm={()=>{setShowUnarchivePin(false);updPA({archived:false});}}
      onClose={()=>setShowUnarchivePin(false)}/>}



    <Card title={`PA ${paIdx+1}${pa.pan?" — "+pa.pan:""}${pa.planId?" | Plan "+pa.planId:""}${archived?" 🗄 ARCHIVED":""}`} icon="📋" accent={archived?gray5:blue}
      action={<div style={{display:"flex",gap:5,alignItems:"center"}}>
        {archived&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"rgba(255,255,255,.2)",color:white,fontWeight:700}}>🔒 Locked for audit</span>}
        {missedCount>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:redL,color:red,fontWeight:700}}>⚠ {missedCount}</span>}
        {deniedCount>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:yellowL,color:yellow,fontWeight:700}}>✗ {deniedCount}</span>}
        {approvedCount>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:greenL,color:green,fontWeight:700}}>✓ {approvedCount}</span>}
        <button onClick={onToggleMinimize} style={{fontSize:11,padding:"2px 9px",borderRadius:6,border:"none",background:"rgba(255,255,255,.2)",color:white,cursor:"pointer",fontWeight:700}}>
          {minimized?"▼ Expand":"▲ Minimize"}</button>
        {archived
          ?<button onClick={()=>setShowUnarchivePin(true)} style={{fontSize:11,padding:"2px 9px",borderRadius:6,border:"none",background:"rgba(255,193,7,.3)",color:"#fcd34d",cursor:"pointer",fontWeight:700}}>🔓 Unarchive</button>
          :hasActivity
            ?<button onClick={()=>setShowArchivePin(true)} title="Exhausted/active PAs cannot be removed — archive preserves them for audit"
              style={{fontSize:11,padding:"2px 9px",borderRadius:6,border:"none",background:"rgba(255,255,255,.15)",color:white,cursor:"pointer",fontWeight:700}}>🗄 Archive</button>
            :totalPAs>1&&<button onClick={onRemove} style={{fontSize:11,padding:"2px 9px",borderRadius:6,border:"none",background:"rgba(255,255,255,.15)",color:white,cursor:"pointer",fontWeight:700}}>Remove</button>}
      </div>}>

      {minimized
        ?<div style={{display:"flex",gap:16,fontSize:12,color:gray5,flexWrap:"wrap",padding:"2px 0"}}>
          {pa.pan&&<span>PA#: <b style={{color:navy}}>{pa.pan}</b></span>}
          {pa.planId&&<span>Plan: <b style={{color:purple}}>{pa.planId}</b></span>}
          <span>Units: <b style={{color:blue}}>{fmtNum(tU)} / {fmtNum(pau)}</b></span>
          <span>Cost: <b style={{color:green}}>{fmtUSD(tC)}</b></span>
          <span>Remaining: <b style={{color:paR<pau*.1?yellow:teal}}>{fmtNum(paR)}</b></span>
          <span>Progress: <b style={{color:statusColor}}>{oPct}%</b></span>
          {pa.paS&&<span>Start: <b style={{color:gray7}}>{pa.paS}</b></span>}
          {pa.paE&&<span>End: <b style={{color:gray7}}>{pa.paE}</b></span>}
        </div>
        :<>
          {/* SC / SCS */}
          <div style={{background:gray0,border:`1.5px solid ${gray2}`,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:800,color:navy,textTransform:"uppercase",letterSpacing:".07em",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>🏢</span><span>Support Coordinator Agency</span>
            </div>
            <Row cols={3} gap={8}>
              <Fld label="Agency">
                <select value={pa.scCompany||""} disabled={lockEdits}
                  onChange={e=>{const agency=SC_AGENCIES.find(a=>a.company===e.target.value);updPA({scCompany:e.target.value,scEmail:agency?agency.email:pa.scEmail});}}
                  style={{...iBase,fontWeight:600}}>
                  <option value="">— Select agency —</option>
                  {SC_AGENCIES.map(a=><option key={a.company} value={a.company}>{a.company}</option>)}
                </select>
              </Fld>
              <Fld label="Agency Email"><Inp value={pa.scEmail||""} readOnly={lockEdits} type="email" placeholder="agency@email.com" onChange={e=>updPA({scEmail:e.target.value})} style={{fontWeight:600}}/></Fld>
              <Fld label="Agency Phone"><Inp value={pa.scPhone||""} readOnly={lockEdits} placeholder="(555) 000-0000" onChange={e=>updPA({scPhone:e.target.value})}/></Fld>
            </Row>
            <div style={{fontSize:11,fontWeight:800,color:blue,textTransform:"uppercase",letterSpacing:".07em",marginTop:12,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>👤</span><span>Support Coordinator (SC)</span>
            </div>
            <Row cols={3} gap={8}>
              <Fld label="SC Name"><Inp value={pa.scName||""} readOnly={lockEdits} placeholder="Coordinator name" onChange={e=>updPA({scName:e.target.value})} style={{fontWeight:600}}/></Fld>
              <Fld label="SC Email"><Inp value={pa.scIndEmail||""} readOnly={lockEdits} type="email" placeholder="sc@email.com" onChange={e=>updPA({scIndEmail:e.target.value})}/></Fld>
              <Fld label="SC Phone"><Inp value={pa.scIndPhone||""} readOnly={lockEdits} placeholder="(555) 000-0000" onChange={e=>updPA({scIndPhone:e.target.value})}/></Fld>
            </Row>
            <div style={{fontSize:11,fontWeight:800,color:purple,textTransform:"uppercase",letterSpacing:".07em",marginTop:12,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>👤</span><span>SC Supervisor (SCS)</span>
            </div>
            <Row cols={3} gap={8}>
              <Fld label="SCS Name"><Inp value={pa.scsName||""} readOnly={lockEdits} placeholder="Supervisor name" onChange={e=>updPA({scsName:e.target.value})} style={{fontWeight:600}}/></Fld>
              <Fld label="SCS Email"><Inp value={pa.scsEmail||""} readOnly={lockEdits} type="email" placeholder="scs@email.com" onChange={e=>updPA({scsEmail:e.target.value})}/></Fld>
              <Fld label="SCS Phone"><Inp value={pa.scsPhone||""} readOnly={lockEdits} placeholder="(555) 000-0000" onChange={e=>updPA({scsPhone:e.target.value})}/></Fld>
            </Row>
          </div>

          {!archived&&<Card title={`Authorization & Service Details — PA ${paIdx+1}${pa.name?" · "+pa.name:""}`} icon="📎" accent={blue}
            action={<button onClick={()=>setServiceMin(m=>!m)} style={{fontSize:11,padding:"2px 9px",borderRadius:6,border:"none",background:"rgba(255,255,255,.2)",color:white,cursor:"pointer",fontWeight:700}}>
              {serviceMin?"▼ Expand":"▲ Minimize"}
            </button>}>
            <div style={{background:gray0,border:`1.5px solid ${gray2}`,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:800,color:teal,textTransform:"uppercase",letterSpacing:".07em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14}}>📎</span><span>Authorization Documents</span>
              </div>
              <div style={{display:"flex",gap:36,flexWrap:"wrap",fontSize:15}}>
                <DocAttach label="SDR" value={pa.sdrUrl||""} onChange={v=>updPA({sdrUrl:v})} locked={lockEdits||!!pa.sdrUrl} color={teal}/>
                <DocAttach label="NJISP" value={pa.njiSpUrl||""} onChange={v=>updPA({njiSpUrl:v})} locked={lockEdits||!!pa.njiSpUrl} color={purple}/>
                <DocAttach label="PCPT" value={pa.pcptUrl||""} onChange={v=>updPA({pcptUrl:v})} locked={lockEdits||!!pa.pcptUrl} color={yellow}/>
                <DocAttach label="Client Intake Form" value={pa.intakeUrl||""} onChange={v=>updPA({intakeUrl:v})} locked={lockEdits||!!pa.intakeUrl} color={blue} icon="📋"/>
              </div>
            </div>
            {serviceMin
              ?<div style={{display:"flex",gap:16,fontSize:12,color:gray5,flexWrap:"wrap",padding:"2px 0"}}>
                <span>Service: <b style={{color:navy}}>{pa.name||"—"}</b></span>
                <span>Proc: <b style={{color:blue}}>{pa.proc||"—"}</b></span>
                <span>UPH: <b style={{color:navy}}>{pa.uph}</b></span>
                <span>Rate: <b style={{color:green}}>{fmtUSD(pa.rate)}</b></span>
                <span>Default/wk: <b style={{color:navy}}>{pa.def}</b></span>
              </div>
              :<>
                <Row cols={3} gap={8}>
                  <Fld label="Service type"><Sel value={pa.name} disabled={lockEdits} onChange={e=>{const name=e.target.value;updPA({name,proc:SERVICE_PROC_MAP[name]||pa.proc,rate:SERVICE_RATE_MAP[name]||pa.rate});}}>{SERVICE_TYPES.map(t=><option key={t}>{t}</option>)}</Sel></Fld>
                  <Fld label="Procedure code"><Sel value={pa.proc} disabled={lockEdits} onChange={e=>updPA({proc:e.target.value})}>{PROC_CODES.map(p=><option key={p}>{p}</option>)}</Sel></Fld>
                  <Fld label="Units per hour"><Inp type="number" value={pa.uph} readOnly={lockEdits} onChange={e=>updPA({uph:parseInt(e.target.value)||1})}/></Fld>
                </Row>
                <Row cols={4} gap={8} mt={8}>
                  <Fld label="PA start"><Inp type="date" value={pa.paS} readOnly={lockEdits} onChange={e=>rb({paS:e.target.value})}/></Fld>
                  <Fld label="PA end"><Inp type="date" value={pa.paE} readOnly={lockEdits} onChange={e=>rb({paE:e.target.value})}/></Fld>
                  <Fld label="Default units/week"><Inp type="number" value={pa.def} readOnly={lockEdits} onChange={e=>updPA({def:parseInt(e.target.value)||0})} onBlur={()=>rb()}/></Fld>
                  <Fld label="PA number"><Inp value={pa.pan} readOnly={lockEdits} onChange={e=>updPA({pan:e.target.value})}/></Fld>
                </Row>
                <Row cols={4} gap={8} mt={8}>
                  <Fld label="Total units"><Inp type="number" min="0" value={pa.pau} readOnly={lockEdits} onChange={e=>updPA({pau:Math.max(0,parseInt(e.target.value)||0)})}/></Fld>
                  <Fld label="Rate ($/unit)"><Inp type="number" step="0.01" value={pa.rate} readOnly={lockEdits} onChange={e=>updPA({rate:parseFloat(e.target.value)||0})}/></Fld>
                  <Fld label="Plan ID"><Inp value={pa.planId||""} readOnly={lockEdits} placeholder="e.g. 8.1" onChange={e=>updPA({planId:e.target.value})}/></Fld>
                  <Fld label="EVV Status">
                    <Sel value={pa.evv||"EVV"} disabled={lockEdits} onChange={e=>updPA({evv:e.target.value})}>
                      <option value="EVV">EVV</option>
                      <option value="Non-EVV">Non-EVV</option>
                    </Sel>
                  </Fld>
                </Row>
                <Row cols={4} gap={8} mt={10}>
                  <Metric label="Total units" val={fmtNum(tU)} color={blue} bg={blueL}/>
                  <Metric label="Total hours" val={fmtHrs(tH)} color={teal} bg={tealL}/>
                  <Metric label="Total cost" val={fmtUSD(tC)} color={green} bg={greenL}/>
                  <Metric label="PA remaining" val={fmtNum(paR)} color={paR<=0?red:paR<pau*.1?yellow:green} bg={paR<=0?redL:paR<pau*.1?yellow:greenL}/>
                </Row>
                {pau>0&&<div style={{margin:"8px 0 0",padding:"8px 12px",borderRadius:8,background:statusBg,border:`1.5px solid ${statusColor}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:statusColor,marginBottom:4}}>
                      {statusLabel} — {fmtNum(paR)} units remaining ({fmtNum(approvedU)} approved of {fmtNum(pau)})
                    </div>
                    <Bar pct={oPct}/>
                  </div>
                  <div style={{fontSize:22,fontWeight:900,color:statusColor}}>{oPct}%</div>
                </div>}
              </>}
          </Card>}

          {/* Weekly Table */}
          {pa.weeks.length>0&&<div style={{marginTop:10,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,tableLayout:"auto"}}>
              <thead>
                <tr style={{background:gray1}}>
                  {COLS.map(h=>(
                    <th key={h} style={{textAlign:["#","Week"].includes(h)?"left":"center",padding:"5px 5px",
                      fontWeight:700,fontSize:9,color:gray5,borderBottom:`1.5px solid ${gray2}`,
                      whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".03em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pa.weeks.map((w,i)=>{
                  const isApproved=w.approved===true;
                  const isLocked=archived||(isApproved&&!w.unlocked);
                  const cum=pa.weeks.slice(0,i+1).reduce((a,x)=>a+x.u,0);
                  const rem=tU-cum;
                  const pct=tU>0?Math.round(cum/tU*100):0;
                  const remC=rem===0?green:rem<tU*.1?red:rem<tU*.4?yellow:gray7;
                  const rowBg=isLocked?greenL:w.unlocked?"#fdf4ff":w.missed?redL:w.approved===false?yellowL:i%2===0?white:gray0;
                  return <tr key={i} style={{borderBottom:`1px solid ${gray1}`,background:rowBg,verticalAlign:"top"}}>
                    <td style={{padding:"4px 5px",color:gray5,fontWeight:600,fontSize:10}}>{i+1}</td>
                    <td style={{padding:"4px 5px",whiteSpace:"nowrap",fontWeight:500,color:navy,fontSize:10}}>
                      {w.s}–{w.e}
                      {w.unlocked&&<div style={{fontSize:8,color:purple,fontStyle:"italic"}}>🔓 {w.unlockTime}</div>}
                    </td>
                    <td style={{padding:"4px 5px",textAlign:"center"}}>
                      {isLocked?<span style={{fontWeight:700,color:green,fontSize:11}}>{w.u}</span>
                        :<input type="number" min="0" value={w.u} onChange={e=>updWeek(i,{u:parseInt(e.target.value)||0})}
                          style={{width:44,fontSize:11,padding:"2px 3px",borderRadius:5,border:`1.5px solid ${gray2}`,background:"transparent",color:gray9,textAlign:"center",outline:"none"}}/>}
                    </td>
                    <td style={{padding:"4px 5px",textAlign:"center",color:gray5,fontSize:10}}>{fmtHrs(w.u/pa.uph)}</td>
                    <td style={{padding:"4px 5px",textAlign:"center",color:green,fontWeight:600,fontSize:10}}>{fmtUSD(w.u*pa.rate)}</td>
                    <td style={{padding:"4px 5px",textAlign:"center",color:blue,fontWeight:700,fontSize:10}}>{fmtNum(cum)}</td>
                    <td style={{padding:"4px 5px",textAlign:"center",fontWeight:700,color:remC,fontSize:10}}>{fmtNum(rem)}</td>
                    <td style={{padding:"4px 5px",minWidth:80}}><Bar pct={pct}/></td>
                    <td style={{padding:"4px 5px",textAlign:"center"}}>
                      {isLocked?<span style={{fontSize:10,fontWeight:700,color:green}}>✓</span>
                        :<button onClick={()=>updWeek(i,{billed:!w.billed,approved:!w.billed?null:w.approved})}
                          style={{padding:"2px 7px",borderRadius:99,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:w.billed?greenL:gray1,color:w.billed?green:gray5}}>
                          {w.billed?"✓":"No"}</button>}
                    </td>
                    <td style={{padding:"4px 5px",minWidth:100,textAlign:"center"}}>
                      {w.billed
                        ?<DocAttach label="ICN PDF" value={w.icnPdfUrl||""} onChange={v=>updWeek(i,{icnPdfUrl:v})} locked={isLocked} color={blue} icon="📄" compact/>
                        :<span style={{fontSize:9,color:gray2}}>—</span>}
                    </td>
                    <td style={{padding:"4px 5px",minWidth:95,textAlign:"center"}}>
                      <DocAttach label="PA Report" value={w.paReportUrl||""} onChange={v=>updWeek(i,{paReportUrl:v})} locked={isLocked} color={green} compact/>
                    </td>
                    <td style={{padding:"4px 5px",textAlign:"center"}}>
                      {w.billed
                        ?isLocked
                          ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                            <span style={{fontSize:10,fontWeight:700,color:green}}>✓ Approved</span>
                            <button onClick={()=>setUnlockRow(i)} style={{fontSize:8,padding:"1px 5px",borderRadius:4,border:`1px solid ${purple}`,background:purpleL,color:purple,cursor:"pointer",fontWeight:700}}>🔓 Amend</button>
                          </div>
                          :<select value={w.approved===null?"pending":w.approved?"yes":"no"}
                              onChange={e=>handleApprovalChange(i,w,e.target.value)}
                              style={{fontSize:10,padding:"2px 4px",borderRadius:5,border:`1.5px solid ${gray2}`,
                                background:w.approved===true?greenL:w.approved===false?yellowL:blueL,
                                color:w.approved===true?green:w.approved===false?yellow:blue,fontWeight:700,cursor:"pointer",outline:"none"}}>
                              <option value="pending">⏳</option>
                              <option value="yes">✓ Approved</option>
                              <option value="no">✗ Denied</option>
                            </select>
                        :<span style={{fontSize:9,color:gray2}}>—</span>}
                    </td>
                    <td style={{padding:"4px 5px",textAlign:"center"}}>
                      {isLocked?<span style={{fontSize:9,color:gray5}}>—</span>
                        :<button onClick={()=>updWeek(i,{missed:!w.missed})}
                          style={{padding:"2px 7px",borderRadius:99,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:w.missed?redL:gray1,color:w.missed?red:gray5}}>
                          {w.missed?"⚠":"No"}</button>}
                    </td>
                  </tr>;
                })}
              </tbody>
              <tfoot>
                <tr style={{background:navy,color:white,fontWeight:700}}>
                  <td colSpan={2} style={{padding:"5px 6px",fontSize:11}}>Total</td>
                  <td style={{padding:"5px 6px",textAlign:"center",fontSize:11}}>{fmtNum(tU)}</td>
                  <td style={{padding:"5px 6px",textAlign:"center",fontSize:11}}>{fmtHrs(tH)}</td>
                  <td style={{padding:"5px 6px",textAlign:"center",fontSize:11}}>{fmtUSD(tC)}</td>
                  <td style={{padding:"5px 6px",textAlign:"center",fontSize:11}}>{fmtNum(tU)}</td>
                  <td style={{padding:"5px 6px",textAlign:"center",color:"rgba(255,255,255,.5)",fontSize:11}}>0</td>
                  <td colSpan={6} style={{padding:"5px 6px",textAlign:"center",fontSize:10,color:"rgba(255,255,255,.6)"}}>
                    {pendingCount} pending · {approvedCount} approved · {deniedCount} denied · {missedCount} missed
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>}
        </>}
    </Card>
  </>;
}

// ── Client Form ───────────────────────────────────────────────────────────────
function CForm({cl,upd,onDel,onPDF,onDrive,allStaff=[],onToggleStaff=()=>{},onOpenStaff=()=>{}}){
  const [del,setDel]=useState(false);
  const [minimized,setMinimized]=useState({});
  const [showPin,setShowPin]=useState(false);
  const [pinAction,setPinAction]=useState(null);
  const [showPrint,setShowPrint]=useState(false);

  function requestPin(action){setPinAction(action);setShowPin(true);}
  function updPA(sid,patch){upd({services:cl.services.map(s=>s.id===sid?{...s,...patch}:s)});}
  function addPA(){
    const newMin={};cl.services.forEach(s=>newMin[s.id]=true);
    setMinimized(newMin);
    upd({services:[...cl.services,mkPA(Date.now())]});
  }
  function delPA(sid){if(cl.services.length===1)return;upd({services:cl.services.filter(s=>s.id!==sid)});}
  function toggleMin(sid){setMinimized(p=>({...p,[sid]:!p[sid]}));}
  const isLocked=!!cl.locked||!!cl.archived;

  return <div style={{padding:20,maxWidth:1200}}>
    {showPrint&&<PrintView cl={cl} onClose={()=>setShowPrint(false)}/>}
    {showPin&&<PinModal
      title={pinAction==="unlock"?"Unlock Client Record":pinAction==="archive"?"Archive Client":"Unarchive Client"}
      subtitle={pinAction==="unlock"?"Enter PIN to edit this client's information.":pinAction==="archive"?"Enter PIN to archive this client. All records will be preserved (read-only) for audit purposes.":"Enter PIN to restore this client to active status."}
      correctPin={cl.pin||DEFAULT_PIN}
      onConfirm={()=>{
        if(pinAction==="unlock")upd({locked:false});
        if(pinAction==="archive"){upd({archived:true,archivedAt:nowStr(),locked:true});onDel&&onDel();}
        if(pinAction==="unarchive")upd({archived:false,locked:false});
      }}
      onClose={()=>setShowPin(false)}/>}

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:6,
      padding:"12px 16px",background:cl.archived?gray5:navy,borderRadius:10,boxShadow:"0 2px 8px rgba(0,0,0,.15)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{width:36,height:36,borderRadius:99,background:cl.archived?gray7:blue,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:15,fontWeight:800,color:white,flexShrink:0}}>
          {(cl.name||"?")[0].toUpperCase()}</div>
        <input value={cl.name} onChange={e=>!isLocked&&upd({name:e.target.value})} placeholder="Client name" readOnly={isLocked}
          style={{fontSize:16,fontWeight:700,border:"none",background:"transparent",color:white,outline:"none",width:200,cursor:isLocked?"not-allowed":"text"}}/>
        {cl.mid&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,.15)",color:white,fontWeight:600}}>ID: {cl.mid}</span>}
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",fontWeight:600}}>{cl.services.length} PA{cl.services.length!==1?"s":""}</span>
        {cl.archived&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,.25)",color:white,fontWeight:700}}>🗄 ARCHIVED{cl.archivedAt?` · ${cl.archivedAt}`:""}</span>}
        {isLocked&&!cl.archived&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,193,7,.25)",color:"#fcd34d",fontWeight:700}}>🔒 Locked</span>}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <Btn onClick={()=>setShowPrint(true)} bg="rgba(255,255,255,.15)" color={white} border="rgba(255,255,255,.3)">🖨️ Print</Btn>
        <Btn onClick={onPDF} bg={teal} color={white} border={teal}>📄 PDF</Btn>
        <Btn onClick={onDrive} bg="rgba(255,255,255,.15)" color={white} border="rgba(255,255,255,.3)">🔗 Drive</Btn>
        {cl.archived
          ?<Btn onClick={()=>{setPinAction("unarchive");setShowPin(true);}} bg="rgba(255,193,7,.25)" color="#fcd34d" border="#fcd34d">🔓 Unarchive</Btn>
          :<>{isLocked
              ?<Btn onClick={()=>requestPin("unlock")} bg="rgba(255,193,7,.2)" color="#fcd34d" border="#fcd34d">🔓 Unlock</Btn>
              :<><Btn onClick={()=>upd({locked:true})} bg="rgba(255,255,255,.1)" color={white} border="rgba(255,255,255,.2)">🔒 Lock</Btn>
                 <Btn onClick={addPA} bg={blue} color={white} border={blue}>+ Prior Authorization</Btn></>}
            {del
              ?<><Btn onClick={()=>setDel(false)} bg="transparent" color={white} border="rgba(255,255,255,.3)">Cancel</Btn>
                 <Btn onClick={()=>requestPin("archive")} bg={yellowL} color={yellow} border={yellow}>🗄 Confirm archive</Btn></>
              :<Btn onClick={()=>setDel(true)} bg="transparent" color="rgba(255,255,255,.7)" border="rgba(255,255,255,.3)" title="Records are preserved for audit">🗄 Archive</Btn>}</>}
      </div>
    </div>
    {cl.archived&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:yellowL,border:`1.5px solid ${yellow}`,fontSize:12,color:yellow,fontWeight:600}}>
      🔒 This client is archived for audit purposes. All PAs, billing history, and documents are preserved as read-only. Click <b>Unarchive</b> (PIN required) to restore.
    </div>}

    <Card title={`Patient Information ${isLocked?"🔒":""}`} icon="👤"
      action={isLocked?<button onClick={()=>requestPin("unlock")} style={{fontSize:10,padding:"2px 8px",borderRadius:5,border:"none",background:"rgba(255,193,7,.3)",color:"#fcd34d",cursor:"pointer",fontWeight:700}}>🔓 Unlock to edit</button>:null}>
      <Row cols={4} gap={8}>
        <Fld label="Patient ID"><Inp value={cl.pid} readOnly={isLocked} onChange={e=>upd({pid:e.target.value})}/></Fld>
        <Fld label="DOB"><Inp type="date" value={cl.dob} readOnly={isLocked} onChange={e=>upd({dob:e.target.value})}/></Fld>
        <Fld label="Age"><Inp value={calcAge(cl.dob)} readOnly/></Fld>
        <Fld label="Sex"><Sel value={cl.sex} disabled={isLocked} onChange={e=>upd({sex:e.target.value})}><option value="">Select</option><option>M</option><option>F</option></Sel></Fld>
      </Row>
      <Row cols={3} gap={8} mt={8}>
        <Fld label="County"><Sel value={cl.county} disabled={isLocked} onChange={e=>upd({county:e.target.value})}><option value="">Select county</option>{NJ_COUNTIES.map(n=><option key={n}>{n}</option>)}</Sel></Fld>
        <Fld label="Medicaid ID"><Inp value={cl.mid} readOnly={isLocked} onChange={e=>upd({mid:e.target.value})}/></Fld>
        <Fld label="Primary Dx"><Inp value={cl.dx} readOnly={isLocked} onChange={e=>upd({dx:e.target.value})} placeholder="e.g. F84.0"/></Fld>
      </Row>
      {!isLocked&&<div style={{marginTop:10,padding:"8px 10px",borderRadius:7,background:yellowL,border:`1px solid ${yellow}`,fontSize:11,color:yellow,fontWeight:600}}>
        💡 Lock this record after verifying patient information to prevent accidental edits.
        <button onClick={()=>upd({locked:true})} style={{marginLeft:10,fontSize:10,padding:"2px 8px",borderRadius:5,border:`1px solid ${yellow}`,background:"transparent",color:yellow,cursor:"pointer",fontWeight:700}}>Lock now</button>
      </div>}
    </Card>

    <AssignedStaffSection clientId={cl.id} allStaff={allStaff} onToggle={sid=>onToggleStaff(sid,cl.id)} onOpenStaff={onOpenStaff}/>

    {cl.services.map((pa,i)=>(
      <PATable key={pa.id} pa={pa} updPA={p=>updPA(pa.id,p)} paIdx={i}
        totalPAs={cl.services.length} onRemove={()=>delPA(pa.id)}
        minimized={!!minimized[pa.id]} onToggleMinimize={()=>toggleMin(pa.id)}
        clientLocked={isLocked} clientPin={cl.pin||DEFAULT_PIN}/>
    ))}
  </div>;
}

// ── Import Modal ──────────────────────────────────────────────────────────────
function IModal({state,data,err,target,onApply,onClose,driveUrl,setDriveUrl,onDrive,clients,iTgt}){
  const [confirmMerge,setConfirmMerge]=useState(false);
  useEffect(()=>{setConfirmMerge(false);},[data]);
  if(!state)return null;
  const fields=[["Client name","name"],["Patient ID","patientId"],["DOB","dob"],["Sex","sex"],["County","county"],["Medicaid ID","medicaidId"],["Diagnosis","dx"],["Service name","serviceName"],["Service location","serviceLocation"],["Proc code","procCode"],["Rate","rate"],["Total Units","totalUnits"],["Total Hours","totalHours"],["Total Cost","totalCost"],["Unit type","unitType"],["Frequency","frequency"],["PA number","paNumber"],["PA approved","paApproved"],["PA start","paStart"],["PA end","paEnd"],["Plan ID","planId"],["EVV Status","evv"],["SC Agency","scCompany"],["Agency Email","scEmail"],["Agency Phone","scPhone"],["SC Name","scName"],["SC Email","scIndEmail"],["SC Phone","scIndPhone"],["SCS Name","scsName"],["SCS Email","scsEmail"],["SCS Phone","scsPhone"]];
  // Detect duplicate only when uploading for a new client (no explicit target).
  // Requires name + DOB + Medicaid ID to all match — a shared name or a typo'd
  // Medicaid ID alone is not enough to safely auto-merge two billing records.
  const duplicate=(!iTgt)?findExactDuplicateClient({name:data?.name,dob:data?.dob,mid:data?.medicaidId},clients):null;
  const canApply=!duplicate||confirmMerge;
  return <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,.6)",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:white,borderRadius:12,border:`1.5px solid ${gray2}`,padding:20,width:560,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,.22)"}}>
      {(state==="uploading"||state==="extracting")&&<div style={{textAlign:"center",padding:"2.5rem 0"}}>
        <div style={{fontSize:40,marginBottom:12}}>{state==="uploading"?"📄":"🤖"}</div>
        <div style={{fontWeight:800,fontSize:16,color:navy,marginBottom:6}}>{state==="uploading"?"Reading PDF…":"Extracting with AI…"}</div>
        <div style={{fontSize:12,color:gray5}}>This takes a few seconds</div>
      </div>}
      {state==="drive"&&<div>
        <div style={{fontWeight:800,fontSize:15,color:navy,marginBottom:4}}>📎 Import from Google Drive</div>
        <div style={{fontSize:12,color:gray5,marginBottom:12}}>File must be shared as <b>Anyone with the link</b>.</div>
        <Inp value={driveUrl} onChange={e=>setDriveUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…"/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn onClick={onDrive} bg={blue} color={white} border={blue} disabled={!driveUrl.trim()}>Import</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>}
      {state==="error"&&<div>
        <div style={{fontWeight:800,fontSize:15,color:red,marginBottom:6}}>Import failed</div>
        <div style={{fontSize:12,color:gray5,marginBottom:12,wordBreak:"break-word"}}>{err}</div>
        <Btn onClick={onClose}>Close</Btn>
      </div>}
      {state==="review"&&data&&<div>
        <div style={{fontWeight:800,fontSize:15,color:navy,marginBottom:4}}>Review extracted data</div>
        <div style={{fontSize:12,color:gray5,marginBottom:12}}>Importing into: <b style={{color:navy}}>{target}</b></div>
        {duplicate&&<div style={{background:yellowL,border:`1px solid ${yellow}`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
            <span style={{fontSize:15,flexShrink:0}}>⚠️</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#92400e"}}>Possible existing client match</div>
              <div style={{fontSize:11,color:"#78350f",marginTop:2}}>Name, DOB, and Medicaid ID all match an existing record. Verify below before merging — this cannot be undone.</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11,marginBottom:8}}>
            <div style={{background:"rgba(255,255,255,.6)",borderRadius:6,padding:"6px 8px"}}>
              <div style={{fontWeight:700,color:"#92400e",marginBottom:3}}>Existing record</div>
              <div>Name: <b>{duplicate.name}</b></div><div>DOB: <b>{duplicate.dob||"—"}</b></div><div>Medicaid ID: <b>{duplicate.mid||"—"}</b></div>
            </div>
            <div style={{background:"rgba(255,255,255,.6)",borderRadius:6,padding:"6px 8px"}}>
              <div style={{fontWeight:700,color:"#92400e",marginBottom:3}}>From this import</div>
              <div>Name: <b>{data.name||"—"}</b></div><div>DOB: <b>{data.dob||"—"}</b></div><div>Medicaid ID: <b>{data.medicaidId||"—"}</b></div>
            </div>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:7,fontSize:11,fontWeight:600,color:"#78350f",cursor:"pointer"}}>
            <input type="checkbox" checked={confirmMerge} onChange={e=>setConfirmMerge(e.target.checked)}/>
            Yes, this is the same client — merge this PA into their existing record
          </label>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
          {fields.map(([lbl,k])=>{const v=data[k];return(
            <div key={k} style={{background:v?gray0:redL,borderRadius:7,padding:"6px 8px",border:`1px solid ${v?gray2:red}`}}>
              <div style={{fontSize:9,color:gray5,fontWeight:700,textTransform:"uppercase",marginBottom:1}}>{lbl}</div>
              <div style={{fontSize:12,fontWeight:600,color:v?gray9:red,fontStyle:v?"normal":"italic"}}>{v!=null?String(v):"Not found"}</div>
            </div>);})}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>onApply({forceNew:false})} bg={blue} color={white} border={blue} disabled={!canApply}>✓ {duplicate?"Merge into existing client":"Import data"}</Btn>
          {duplicate&&<Btn onClick={()=>onApply({forceNew:true})} bg={white} color={gray7} border={gray2}>Create as separate new client</Btn>}
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>}
    </div>
  </div>;}

// ── Archive Folder ────────────────────────────────────────────────────────────
function ArchiveFolder({clients,staff,onDeleteClient,onDeleteStaff,onRestoreClient,onRestoreStaff}){
  const [pinFor,setPinFor]=useState(null); // {kind:'client'|'staff', id, name}
  const archClients=clients.filter(c=>c.archived);
  const archStaff=staff.filter(s=>s.archived);
  const total=archClients.length+archStaff.length;

  return <div style={{padding:20}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
      <div style={{width:4,height:22,background:yellow,borderRadius:99}}/>
      <div style={{fontSize:20,fontWeight:900,color:navy}}>🗄 Archive Folder</div>
      <span style={{fontSize:11,padding:"2px 9px",borderRadius:99,background:yellowL,color:yellow,fontWeight:700}}>{total} archived</span>
    </div>
    <div style={{fontSize:12,color:gray5,marginBottom:16}}>
      Archived records are preserved for audit. <b>Permanent deletion requires PIN</b> and cannot be undone.
    </div>

    <div style={{background:white,border:`1.5px solid ${gray2}`,borderRadius:10,padding:16,marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:800,color:navy,marginBottom:10}}>Archived clients ({archClients.length})</div>
      {archClients.length===0?<div style={{fontSize:12,color:gray5,fontStyle:"italic"}}>No archived clients.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {archClients.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",border:`1px solid ${gray2}`,borderRadius:8,background:gray0}}>
              <div style={{width:30,height:30,borderRadius:99,background:gray5,color:white,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12}}>{(c.name||"?")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:navy,fontSize:13}}>{c.name||"Unnamed"}</div>
                <div style={{fontSize:10,color:gray5}}>{c.mid||"No Medicaid ID"} · archived {c.archivedAt||"—"} · {c.services?.length||0} PA(s)</div>
              </div>
              <Btn onClick={()=>onRestoreClient(c.id)} bg={white} color={navy} border={gray2}>↩ Restore</Btn>
              <Btn onClick={()=>setPinFor({kind:"client",id:c.id,name:c.name||"Unnamed"})} bg={red} color={white} border={red}>🗑 Delete</Btn>
            </div>
          ))}
        </div>}
    </div>

    <div style={{background:white,border:`1.5px solid ${gray2}`,borderRadius:10,padding:16}}>
      <div style={{fontSize:13,fontWeight:800,color:navy,marginBottom:10}}>Archived staff ({archStaff.length})</div>
      {archStaff.length===0?<div style={{fontSize:12,color:gray5,fontStyle:"italic"}}>No archived staff.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {archStaff.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",border:`1px solid ${gray2}`,borderRadius:8,background:gray0}}>
              <div style={{width:30,height:30,borderRadius:99,background:gray5,color:white,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12}}>{(s.name||"?")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:navy,fontSize:13}}>{s.name||"Unnamed"}</div>
                <div style={{fontSize:10,color:gray5}}>{s.role||"—"} · archived {s.archivedAt||"—"}</div>
              </div>
              <Btn onClick={()=>onRestoreStaff(s.id)} bg={white} color={navy} border={gray2}>↩ Restore</Btn>
              <Btn onClick={()=>setPinFor({kind:"staff",id:s.id,name:s.name||"Unnamed"})} bg={red} color={white} border={red}>🗑 Delete</Btn>
            </div>
          ))}
        </div>}
    </div>

    {pinFor&&<PinModal
      title={`Permanently delete ${pinFor.name}`}
      subtitle="This will remove the record and all its data. This cannot be undone."
      correctPin="1234"
      onConfirm={()=>{pinFor.kind==="client"?onDeleteClient(pinFor.id):onDeleteStaff(pinFor.id);}}
      onClose={()=>setPinFor(null)}/>}
  </div>;
}
// ── Staff Form ────────────────────────────────────────────────────────────────
function StaffForm({st,upd,onDel,clients,allStaff}){
  const [tab,setTab]=useState("info");
  const [del,setDel]=useState(false);
  const [showPin,setShowPin]=useState(false);
  const taxTotals=staffTaxTotals(st,clients,allStaff);
  const numClients=(st.assignedClientIds||[]).length;
  const wEst=calcStaffWeek(st,taxTotals.avgWeeklyHrs);
  const perClient=numClients>0?wEst.totalCost/numClients:0;


  function addExpense(){upd({expenses:[...(st.expenses||[]),{id:Date.now(),label:"",amount:0}]});}
  function updExpense(id,p){upd({expenses:(st.expenses||[]).map(e=>e.id===id?{...e,...p}:e)});}
  function delExpense(id){upd({expenses:(st.expenses||[]).filter(e=>e.id!==id)});}

  function toggleClient(cid){
    const cur=st.assignedClientIds||[];
    const willAssign=!cur.includes(cid);
    upd({assignedClientIds:willAssign?[...cur,cid]:cur.filter(x=>x!==cid)});
    (willAssign?addAssignment(st.id,cid):removeAssignment(st.id,cid))
      .catch(e=>toast.error("Assignment sync failed: "+(e?.message||String(e))));
  }

  // Build week list from assigned clients' PA weeks (union of weeks)
  const allWeeks=new Set();
  (st.assignedClientIds||[]).forEach(cid=>{
    const c=clients.find(x=>x.id===cid);if(!c)return;
    c.services.forEach(pa=>pa.weeks.forEach(wk=>allWeeks.add(wk.s)));
  });
  const weekList=[...allWeeks].sort((a,b)=>new Date(a)-new Date(b));

  function getLog(cid,week){return ((st.hoursLog||{})[cid]||[]).find(e=>e.week===week);}
  function setLog(cid,week,patch){
    const log={...(st.hoursLog||{})};
    const arr=[...(log[cid]||[])];
    const idx=arr.findIndex(e=>e.week===week);
    if(idx>=0)arr[idx]={...arr[idx],...patch};
    else arr.push({week,hours:0,billable:0,...patch});
    log[cid]=arr;upd({hoursLog:log});
    const client=clients.find(x=>x.id===cid);
    if(client){
      const previewStaff={...st,hoursLog:log};
      const previewAll=(allStaff||[]).map(s=>s.id===st.id?previewStaff:s);
      const wk=clientWeekStaffAllocation(client,week,previewAll);
      if(wk.over)toast.warning(`${client.name||"Client"} ${week}: assigned staff hours exceed PA weekly hours by ${fmtHrs(wk.overBy)} hrs.`);
    }
  }
  function setWeeklyExpense(week,amount){
    const map={...(st.weeklyExpenses||{})};
    if(amount===""||amount==null||isNaN(parseFloat(amount)))delete map[week];
    else map[week]=parseFloat(amount)||0;
    upd({weeklyExpenses:map});
  }
  function clearLog(cid,week){
    const log={...(st.hoursLog||{})};
    log[cid]=[...(log[cid]||[])].filter(e=>e.week!==week);
    upd({hoursLog:log});
  }

  const statusColor=st.status==="Active"?green:st.status==="On Leave"?yellow:gray5;
  const statusBg=st.status==="Active"?greenL:st.status==="On Leave"?yellowL:gray1;

  const archived=!!st.archived;
  const [pinAct,setPinAct]=useState("archive");

  return <div style={{padding:20,maxWidth:1200,opacity:archived?.95:1}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:6,
      padding:"12px 16px",background:archived?gray5:purple,borderRadius:10,boxShadow:"0 2px 8px rgba(0,0,0,.15)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{width:36,height:36,borderRadius:99,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:15,fontWeight:800,color:white,flexShrink:0}}>
          {(st.name||"?")[0].toUpperCase()}</div>
        <input value={st.name} onChange={e=>!archived&&upd({name:e.target.value})} placeholder="Staff name" readOnly={archived}
          style={{fontSize:16,fontWeight:700,border:"none",background:"transparent",color:white,outline:"none",width:200,cursor:archived?"not-allowed":"text"}}/>
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,.18)",color:white,fontWeight:700}}>{st.role}</span>
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:statusBg,color:statusColor,fontWeight:700}}>{st.status}</span>
        {archived&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,.25)",color:white,fontWeight:700}}>🗄 ARCHIVED · FORMER STAFF{st.archivedAt?` · ${st.archivedAt}`:""}</span>}
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",fontWeight:600}}>
          {numClients} client{numClients!==1?"s":""}</span>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {archived
          ?<Btn onClick={()=>{setPinAct("unarchive");setShowPin(true);}} bg="rgba(255,193,7,.25)" color="#fcd34d" border="#fcd34d">🔓 Unarchive</Btn>
          :del
            ?<><Btn onClick={()=>setDel(false)} bg="transparent" color={white} border="rgba(255,255,255,.3)">Cancel</Btn>
               <Btn onClick={()=>{setPinAct("archive");setShowPin(true);}} bg={yellowL} color={yellow} border={yellow}>🗄 Confirm archive</Btn></>
            :<Btn onClick={()=>setDel(true)} bg="transparent" color="rgba(255,255,255,.7)" border="rgba(255,255,255,.3)" title="Records preserved for audit">🗄 Archive</Btn>}
      </div>
    </div>
    {archived&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:yellowL,border:`1.5px solid ${yellow}`,fontSize:12,color:yellow,fontWeight:600}}>
      🔒 This staff member is archived (former employee). All hours logs, pay history, and client assignments are preserved as read-only for audit purposes.
    </div>}
    {showPin&&<PinModal
      title={pinAct==="archive"?"Archive Staff Member":"Unarchive Staff Member"}
      subtitle={pinAct==="archive"?"Enter PIN to archive. All hours, pay history, and assignments will be preserved (read-only) for audit.":"Enter PIN to restore this staff member to active status."}
      correctPin={st.pin||DEFAULT_PIN}
      onConfirm={()=>{
        setShowPin(false);
        if(pinAct==="archive"){upd({archived:true,archivedAt:nowStr(),status:"Inactive"});setDel(false);onDel&&onDel();}
        else upd({archived:false});
      }}
      onClose={()=>setShowPin(false)}/>}

    {/* Tabs */}
    <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`2px solid ${gray2}`}}>
      {[["info","👤 Staff Info"],["pay","💵 Pay & Earnings"],["hours","⏱ Hours Log"],["assign","🔗 Client Assignments"]].map(([k,lbl])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",border:"none",background:"transparent",
          color:tab===k?purple:gray5,fontSize:12,fontWeight:700,cursor:"pointer",
          borderBottom:`3px solid ${tab===k?purple:"transparent"}`,marginBottom:-2}}>{lbl}</button>
      ))}
    </div>

    {tab==="info"&&<Card title="Personal Information" icon="👤" accent={purple}>
      <Row cols={4} gap={8}>
        <Fld label="Full Name"><Inp value={st.name} onChange={e=>upd({name:e.target.value})}/></Fld>
        <Fld label="Role"><Sel value={st.role} onChange={e=>upd({role:e.target.value})}>
          {STAFF_ROLES.map(r=><option key={r}>{r}</option>)}</Sel></Fld>
        <Fld label="Hire Date"><Inp type="date" value={st.hireDate} onChange={e=>upd({hireDate:e.target.value})}/></Fld>
        <Fld label="Status"><Sel value={st.status} onChange={e=>upd({status:e.target.value})}>
          {STAFF_STATUSES.map(r=><option key={r}>{r}</option>)}</Sel></Fld>
      </Row>
      <Row cols={4} gap={8} mt={8}>
        <Fld label="Phone"><Inp value={st.phone} onChange={e=>upd({phone:e.target.value})} placeholder="(555) 555-5555"/></Fld>
        <Fld label="Email"><Inp type="email" value={st.email} onChange={e=>upd({email:e.target.value})}/></Fld>
        <Fld label="Address"><Inp value={st.address} onChange={e=>upd({address:e.target.value})}/></Fld>
        <Fld label="City"><Inp value={st.city} onChange={e=>upd({city:e.target.value})}/></Fld>
      </Row>
      <Row cols={4} gap={8} mt={8}>
        <Fld label="State"><Inp value={st.state} onChange={e=>upd({state:e.target.value})}/></Fld>
        <Fld label="ZIP"><Inp value={st.zip} onChange={e=>upd({zip:e.target.value})}/></Fld>
      </Row>
    </Card>}

    {tab==="pay"&&<>
      <Card title="Default Pay Rate" icon="💵" accent={purple}>
        <Row cols={3} gap={8}>
          <Fld label="Pay rate ($/hr)"><Inp type="number" step="0.01" min="0" value={st.payRate} onChange={e=>upd({payRate:e.target.value})}/></Fld>
          <Fld label="Total logged hours (from log)"><Inp value={`${fmtHrs(taxTotals.totalHrs)} hrs · ${taxTotals.activeWeeks} wk`} readOnly/></Fld>
          <Fld label="Total gross (from log)"><Inp value={fmtUSD(taxTotals.gross)} readOnly/></Fld>
        </Row>
        <div style={{fontSize:10,color:gray5,fontStyle:"italic",marginTop:6}}>Per-week rate can be overridden in the Hours Log. Tax burden below is computed from actual logged hours × the rate on each log row.</div>
      </Card>

      <Card title="Employer Tax Burden (auto-calculated from Hours Log)" icon="🏛" accent={navy}>
        <Row cols={4} gap={8}>
          <Metric label="FICA (7.65%)" val={fmtUSD(taxTotals.fica)} color={navy} bg={blueL} sub={`SS 6.2% + Medicare 1.45% · ${taxTotals.activeWeeks} wk`}/>
          <Metric label="FUTA (0.6%)" val={fmtUSD(taxTotals.futa)} color={navy} bg={blueL} sub="Federal unemployment"/>
          <Metric label="NJ SUI (0.4%)" val={fmtUSD(taxTotals.sui)} color={navy} bg={blueL} sub="State unemployment"/>
          <Metric label="Total tax" val={fmtUSD(taxTotals.totalTax)} color={white} bg={navy} sub={`Gross ${fmtUSD(taxTotals.gross)} · ${fmtHrs(taxTotals.totalHrs)} hrs total`}/>
        </Row>
      </Card>


      <Card title="Cumulative Expenses (from Hours Log)" icon="🧾" accent={yellow}>
        {(()=>{
          const ids=(st.assignedClientIds||[]);
          const assignedStaffExp=(allStaff||[]).filter(s=>!s.archived&&(s.assignedClientIds||[]).some(cid=>ids.includes(cid)));
          const cumNetExpense=assignedStaffExp.reduce((tot,sm)=>tot+Object.values(sm.weeklyExpenses||{}).reduce((a,v)=>a+(parseFloat(v)||0),0),0);
          const myCum=Object.values(st.weeklyExpenses||{}).reduce((a,v)=>a+(parseFloat(v)||0),0);
          const myWeeks=Object.keys(st.weeklyExpenses||{}).filter(w=>(parseFloat(st.weeklyExpenses[w])||0)>0).length;
          return <Row cols={2} gap={8}>
            <Metric label={`${st.name||"This staff"} · Cumulative Expenses`} val={fmtUSD(myCum)} color={yellow} bg={yellowL||"#fef3c7"} sub={`Entered weekly in the Hours Log · ${myWeeks} wk`}/>
            <Metric label={`All assigned staff · Cumulative Net Expense`} val={fmtUSD(cumNetExpense)} color={white} bg={yellow} sub={`Auto across ${assignedStaffExp.length} assigned staff`}/>
          </Row>;
        })()}
      </Card>

      {(()=>{
        const ids=(st.assignedClientIds||[]);
        const billedWeeks=weekList.filter(wk=>staffWeekClientRows(st,clients,allStaff,wk).some(r=>r.hrs>0||r.billable>0)).length;
        const totalWeeks=weekList.length;
        const cumCost=weekList.reduce((sum,wk)=>sum+staffWeekClientRows(st,clients,allStaff,wk).reduce((a,r)=>a+r.cost,0),0);
        const assignedStaffAll=(allStaff||[]).filter(s=>!s.archived&&(s.assignedClientIds||[]).some(cid=>ids.includes(cid)));
        const cumNetMargin=assignedStaffAll.reduce((tot,sm)=>tot+weekList.reduce((sum,wk)=>sum+staffWeekClientRows(sm,clients,allStaff,wk).filter(r=>ids.includes(r.cid)).reduce((a,r)=>a+(r.margin||0),0),0),0);
        const marginColor=cumNetMargin>=0?green:red;
        const marginBg=cumNetMargin>=0?greenL:redL;
        const paTotalCost=paActualTotalCostForClients(ids,clients);
        const assignedStaff=(allStaff||[]).filter(s=>!s.archived&&(s.assignedClientIds||[]).some(cid=>ids.includes(cid)));
        const totalCumCost=totalCumulativeEmployerCostForClients(ids,clients,allStaff);
        const projectedProfit=paTotalCost-totalCumCost;
        const profitColor=projectedProfit>=0?green:red;
        return <Card title="Total Employer Cost" icon="📊" accent={teal}>
          <Row cols={3} gap={8}>
            <Metric label="Gross + Taxes + Expenses" val={fmtUSD(cumCost)} color={white} bg={teal}
              sub={`Billed to date · ${billedWeeks}/${totalWeeks||0} wk with assigned hours`}/>
            <Metric label="Cumulative weekly Net Margin" val={fmtUSD(cumNetMargin)} color={marginColor} bg={marginBg} sub={`Auto: Σ (Client revenue − DSP cost) across ${assignedStaffAll.length} staff · ${billedWeeks}/${totalWeeks||0} wk`}/>
            <Metric label="Projected profit" val={fmtUSD(projectedProfit)} color={profitColor} bg={gray1} sub={`PA total ${fmtUSD(paTotalCost)} − Total cum. cost ${fmtUSD(totalCumCost)} (${assignedStaff.length} staff)`}/>
          </Row>
        </Card>;
      })()}
    </>}



    {tab==="hours"&&(()=>{
      // Precompute rows + per-week allocations based on each client's billed PA weekly hours shared across assigned staff
      const rows=[];
      let totalCost=0,totalRev=0,totalMargin=0,cumCost=0;
      weekList.forEach(wk=>{
        const weekRows=staffWeekClientRows(st,clients,allStaff,wk);
        const weekCostUsed=weekRows.reduce((a,r)=>a+r.cost,0);
        weekRows.forEach(r=>{totalCost+=r.cost;totalRev+=r.revenue;totalMargin+=r.margin;rows.push({...r,cum:0});});
        cumCost+=weekCostUsed;
        // assign cumulative to all rows of this week (same value)
        if(weekRows.length)rows.slice(-weekRows.length).forEach(r=>{r.cum=cumCost;});
      });
      const overWarnings=rows.filter(r=>r.over).filter((r,i,a)=>a.findIndex(x=>x.wk===r.wk&&x.cid===r.cid)===i);

      return <Card title="Weekly Hours Log" icon="⏱" accent={purple}>
        {(st.assignedClientIds||[]).length===0
          ?<div style={{fontSize:12,color:gray5,fontStyle:"italic",padding:8}}>No clients assigned. Use the Client Assignments tab.</div>
          :weekList.length===0
            ?<div style={{fontSize:12,color:gray5,fontStyle:"italic",padding:8}}>Assigned clients have no PA weeks set up yet.</div>
            :<>
              <div style={{fontSize:11,color:gray5,fontStyle:"italic",marginBottom:6,padding:"6px 10px",background:tealL,borderRadius:6,border:`1px solid ${teal}`}}>
                ⚡ Hours and Billable units auto-fill from each billed client PA week and are shared across assigned staff. Edit a staff row when hours need to be split differently.
              </div>
              {overWarnings.length>0&&<div style={{fontSize:11,color:red,marginBottom:6,padding:"7px 10px",background:redL,borderRadius:6,border:`1.5px solid ${red}`,fontWeight:800}}>
                ⚠ Weekly PA hour limit exceeded: {overWarnings.map(w=>`${w.c.name||"Client"} ${w.wk} is over by ${fmtHrs(w.overBy)} hrs`).join(" · ")}
              </div>}
              <div style={{overflowX:"hidden",border:`1px solid ${gray2}`,borderRadius:10,background:white,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <table style={{width:"100%",tableLayout:"fixed",borderCollapse:"collapse",borderSpacing:0,fontSize:10,fontVariantNumeric:"tabular-nums"}}>
                  <colgroup>
                    <col style={{width:"14%"}}/>
                    <col style={{width:"11%"}}/>
                    <col style={{width:"7%"}}/>
                    <col style={{width:"7%"}}/>
                    <col style={{width:"9%"}}/>
                    <col style={{width:"9%"}}/>
                    <col style={{width:"9%"}}/>
                    <col style={{width:"9%"}}/>
                    <col style={{width:"13%"}}/>
                    <col style={{width:"12%"}}/>
                  </colgroup>
                  <thead>
                    <tr style={{background:gray7}}>
                      {["Week","Hours","Rate","Gross","Tax","Expenses","Billable","DSP cost","Revenue","Margin"].map((h,i)=>
                        <th key={h} style={{padding:"8px 6px",textAlign:i===0?"left":"right",fontSize:9,fontWeight:700,color:"rgba(255,255,255,.85)",textTransform:"uppercase",letterSpacing:"0.03em",borderBottom:"none",whiteSpace:"normal",lineHeight:1.2,overflowWrap:"anywhere"}}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r,idx)=>{
                      if(!r.c)return null;
                      const prev=idx>0?rows[idx-1]:null;
                      const showWk=!prev||prev.wk!==r.wk;
                      const zebra=idx%2===1?"#f8fafc":white;
                      const cellBase={padding:"7px 6px",textAlign:"right",fontSize:10,borderBottom:`1px solid ${gray2}`,background:zebra,verticalAlign:"middle",overflow:"hidden",transition:"background .15s ease"};
                      const bigCell={...cellBase,fontSize:11};
                      return <tr key={`${r.wk}-${r.cid}`} style={{cursor:"default"}} onMouseEnter={e=>{e.currentTarget.style.background="#eef2ff";}} onMouseLeave={e=>{e.currentTarget.style.background=zebra;}}>
                        <td style={{...cellBase,textAlign:"left",color:gray9,fontWeight:700,borderLeft:showWk?`3px solid ${purple}`:`3px solid transparent`,paddingLeft:showWk?10:6}}>{showWk?fmtWeekRange(r.wk).replace(/\/20/g,"/"):""}{r.over&&<div style={{fontSize:8,color:red,fontWeight:700,marginTop:3}}>⚠ {fmtHrs(r.totalClientHours)} / {fmtHrs(r.paHours)} hrs</div>}</td>
                        <td style={cellBase}><Inp type="number" step="0.25" min="0" value={fmtHrs(r.hrs)} onChange={e=>setLog(r.cid,r.wk,{hours:parseFloat(e.target.value)||0})} style={{width:"100%",textAlign:"right",fontSize:12,fontWeight:700,color:r.over?red:gray9,padding:"5px 6px",minWidth:0,borderRadius:4,border:`1px solid ${gray2}`}}/></td>
                        <td style={cellBase}><Inp type="number" step="0.01" min="0" value={Math.round((parseFloat(r.rate)||0)*100)/100} onChange={e=>setLog(r.cid,r.wk,{rate:parseFloat(e.target.value)||0})} style={{width:"100%",textAlign:"right",fontSize:10,fontWeight:600,color:gray9,padding:"5px 4px",minWidth:0,borderRadius:4,border:`1px solid ${gray2}`}}/></td>
                        <td style={{...cellBase,color:gray9,fontWeight:700}}>{fmtUSD(r.gross)}</td>
                        <td style={{...bigCell,color:navy,fontWeight:600}}>{fmtUSD(r.tax)}</td>
                        <td style={{...bigCell,color:yellow,fontWeight:600}}>{showWk?<Inp type="number" step="0.01" min="0" value={(st.weeklyExpenses||{})[r.wk]??""} onChange={e=>setWeeklyExpense(r.wk,e.target.value)} placeholder="0.00" style={{width:"100%",textAlign:"right",fontSize:10,fontWeight:600,color:yellow,padding:"5px 4px",minWidth:0,borderRadius:4,border:`1px solid ${gray2}`}}/>:<span style={{fontSize:9,color:gray5,fontStyle:"italic"}}>{fmtUSD(r.expShare||0)}</span>}</td>
                        <td style={bigCell}><div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:3}}><Inp type="number" step="1" min="0" value={Math.round((parseFloat(r.billable)||0)*100)/100} onChange={e=>setLog(r.cid,r.wk,{billable:parseFloat(e.target.value)||0})} style={{width:"100%",textAlign:"right",fontSize:10,fontWeight:700,color:blue,padding:"5px 4px",minWidth:0,borderRadius:4,border:`1px solid ${gray2}`}}/>{r.manual&&<button onClick={()=>clearLog(r.cid,r.wk)} title="Return to auto split" style={{border:"none",background:"transparent",color:purple,cursor:"pointer",fontSize:10,fontWeight:700,padding:0,lineHeight:1}}>↺</button>}</div></td>
                        <td style={{...bigCell,color:red,fontWeight:600}}>{fmtUSD(r.cost)}</td>
                        <td style={{...bigCell,color:green,fontWeight:600}}>{fmtUSD(r.revenue)}</td>
                        <td style={{...bigCell,fontWeight:700,color:r.margin>=0?green:red}}>{fmtUSD(r.margin)}</td>
                      </tr>;
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:navy,color:white,fontWeight:700}}>
                      <td colSpan={3} style={{padding:"9px 6px",fontSize:9,textTransform:"uppercase",letterSpacing:"0.03em",fontWeight:700}}>Totals</td>
                      <td style={{padding:"9px 6px",textAlign:"right",fontSize:10}}>{fmtUSD(rows.reduce((a,r)=>a+(r.gross||0),0))}</td>
                      <td style={{padding:"9px 6px",textAlign:"right",fontSize:11}}>{fmtUSD(rows.reduce((a,r)=>a+(r.tax||0),0))}</td>
                      <td style={{padding:"9px 6px",textAlign:"right",fontSize:11,color:"#fde68a"}}>{fmtUSD(rows.reduce((a,r)=>a+(r.expShare||0),0))}</td>
                      <td style={{padding:"9px 6px"}}></td>
                      <td style={{padding:"9px 6px",textAlign:"right",fontSize:11}}>{fmtUSD(totalCost)}</td>
                      <td style={{padding:"9px 6px",textAlign:"right",fontSize:11}}>{fmtUSD(totalRev)}</td>
                      <td style={{padding:"9px 6px",textAlign:"right",fontSize:11,color:totalMargin>=0?"#86efac":"#fca5a5"}}>{fmtUSD(totalMargin)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>}
      </Card>;
    })()}

    {tab==="assign"&&<Card title="Client Assignments" icon="🔗" accent={purple}>
      {clients.length===0
        ?<div style={{fontSize:12,color:gray5,fontStyle:"italic",padding:8}}>No clients exist yet.</div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
          {clients.map(c=>{
            const checked=(st.assignedClientIds||[]).includes(c.id);
            return <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
              borderRadius:8,border:`1.5px solid ${checked?purple:gray2}`,background:checked?purpleL:white,cursor:"pointer"}}>
              <input type="checkbox" checked={checked} onChange={()=>toggleClient(c.id)} style={{cursor:"pointer"}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:gray9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||"Unnamed"}</div>
                <div style={{fontSize:10,color:gray5}}>{c.mid||"No Medicaid ID"} · {c.services.length} PA{c.services.length!==1?"s":""}</div>
              </div>
            </label>;
          })}
        </div>}
    </Card>}
  </div>;
}

// ── Assigned Staff Section (rendered inside CForm) ────────────────────────────
function AssignedStaffSection({clientId,allStaff,onToggle,onOpenStaff}){
  const assigned=allStaff.filter(s=>(s.assignedClientIds||[]).includes(clientId));
  const [min,setMin]=useState(false);
  return <Card title="Assigned Staff" icon="👷" accent={purple}
    action={<button onClick={()=>setMin(m=>!m)} style={{fontSize:11,padding:"2px 9px",borderRadius:6,border:"none",background:"rgba(255,255,255,.2)",color:white,cursor:"pointer",fontWeight:700}}>
      {min?`▼ Expand (${assigned.length})`:"▲ Minimize"}</button>}>
    {min
      ?<div style={{fontSize:12,color:gray5,padding:"2px 0"}}>{assigned.length} staff assigned</div>
      :assigned.length===0
      ?<div style={{fontSize:12,color:gray5,fontStyle:"italic",padding:8}}>No staff assigned to this client yet.</div>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
        {assigned.map(s=>{
          const numClients=(s.assignedClientIds||[]).length;
          const logEntries=((s.hoursLog||{})[clientId])||[];
          const activeEntries=logEntries.filter(e=>(parseFloat(e.hours)||0)>0);
          const totalHrs=activeEntries.reduce((a,e)=>a+(parseFloat(e.hours)||0),0);
          const weeklyCost=activeEntries.reduce((a,e)=>a+calcStaffWeek(s,parseFloat(e.hours)||0,e.rate).totalCost,0);
          const perClientCost=numClients>0?weeklyCost/numClients:0;
          return <div key={s.id} style={{padding:"10px 12px",borderRadius:8,border:`1.5px solid ${purple}`,background:purpleL}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <button onClick={()=>onOpenStaff(s.id)} style={{fontSize:13,fontWeight:800,color:purple,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>{s.name||"Unnamed"}</button>
            </div>
            <div style={{fontSize:10,color:gray5,marginBottom:4}}>{s.role} · {fmtUSD(s.payRate)}/hr · {fmtHrs(totalHrs)} hrs logged ({activeEntries.length} wk)</div>
            <div style={{fontSize:10,color:gray7}}>Total cost to this client: <b style={{color:red}}>{fmtUSD(perClientCost)}</b></div>
          </div>;
        })}
      </div>}
  </Card>;
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App({ sidebarExtra }: { sidebarExtra?: React.ReactNode } = {}){
  const restoredNavState = readBillingNavState();
  const [clients,setClients]=useState([]);
  const [staff,setStaff]=useState([]);
  const [aid,setAid]=useState(restoredNavState.aid||null);
  const [sid,setSid]=useState(restoredNavState.sid||null);
  const [view,setView]=useState(restoredNavState.view||"dash"); // dash | form | staff
  const [mode,setMode]=useState(restoredNavState.mode||"clients"); // clients | staff (sidebar list)
  const [ready,setReady]=useState(false);
  const [navOpen,setNavOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [theme,setTheme]=useState(()=>{
    if(typeof window==="undefined")return "light";
    return localStorage.getItem("billing-theme")||(window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light");
  });
  const [search,setSearch]=useState("");
  const [showArchived,setShowArchived]=useState(!!restoredNavState.showArchived);
  useEffect(()=>{localStorage.setItem("billing-theme",theme);},[theme]);
  useEffect(()=>{saveBillingNavState({view,mode,aid,sid,showArchived});},[view,mode,aid,sid,showArchived]);
  useEffect(()=>{
    const mq=window.matchMedia("(max-width: 767px)");
    const on=()=>setIsMobile(mq.matches);
    on(); mq.addEventListener("change",on);
    return ()=>mq.removeEventListener("change",on);
  },[]);
  const [iState,setIS]=useState(null);
  const [iData,setID]=useState(null);
  const [iErr,setIE]=useState("");
  const [iTgt,setIT]=useState(null);
  const [driveUrl,setDriveUrl]=useState("");
  const [apiKey,setApiKey]=useState("");
  const [showKeyInput,setShowKeyInput]=useState(false);
  const fileRef=useRef();

  const router = useRouter();

  async function refreshAll(){
    try{
      const [cs, ss] = await Promise.all([loadBillingClients(), loadBillingStaff()]);
      // Seed the diff refs so the debounced save effect doesn't treat the
      // initial load (or a realtime-triggered reload) as user edits.
      lastClientsRef.current = cs;
      lastStaffRef.current = ss;
      setClients(cs);
      setStaff(ss);
      setAid(prev => (prev && cs.some(c=>c.id===prev)) ? prev : (cs[0]?.id || null));
      setSid(prev => (prev && ss.some(s=>s.id===prev)) ? prev : (ss[0]?.id || null));
    }catch(e){
      toast.error("Failed to load billing data: " + (e?.message||String(e)));
    }
  }

  useEffect(()=>{
    (async()=>{
      await refreshAll();
      setReady(true);
    })();
    // Realtime: refresh when clients / profiles change in Staff Connect
    const ch = supabase.channel("billing-sync")
      .on("postgres_changes",{event:"*",schema:"public",table:"clients"},()=>refreshAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"users"},()=>refreshAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"assignments"},()=>refreshAll())
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[]);

  const [savedAt,setSavedAt]=useState(null);
  const [saving,setSaving]=useState(false);
  // Debounced upsert per modified client
  const lastClientsRef = useRef([]);
  useEffect(()=>{
    if(!ready)return;
    setSaving(true);
    const prev = lastClientsRef.current;
    const t=setTimeout(async()=>{
      try{
        const changed = clients.filter(c=>{
          const old = prev.find(p=>p.id===c.id);
          return !old || JSON.stringify(old) !== JSON.stringify(c);
        });
        let nextClients = clients;
        for(const c of changed){
          const savedId = await upsertBillingClient(c);
          if(savedId && savedId !== c.id){
            nextClients = nextClients.map(item=>item.id===c.id?{...item,id:savedId}:item);
            setAid(prev=>prev===c.id?savedId:prev);
          }
        }
        if(nextClients !== clients){
          lastClientsRef.current = nextClients;
          setClients(nextClients);
          await refreshAll();
          return;
        }
        lastClientsRef.current = nextClients;
        setSavedAt(new Date());
      }catch(e){ toast.error("Save failed: "+(e?.message||String(e))); }
      finally{ setSaving(false); }
    },500);
    return()=>clearTimeout(t);
  },[clients,ready]);

  const lastStaffRef = useRef([]);
  useEffect(()=>{
    if(!ready)return;
    setSaving(true);
    const prev = lastStaffRef.current;
    const t=setTimeout(async()=>{
      try{
        const changed = staff.filter(s=>{
          const old = prev.find(p=>p.id===s.id);
          return !old || JSON.stringify(old) !== JSON.stringify(s);
        });
        for(const s of changed){ await upsertBillingStaff(s); }
        lastStaffRef.current = staff;
        setSavedAt(new Date());
      }catch(e){ toast.error("Save failed: "+(e?.message||String(e))); }
      finally{ setSaving(false); }
    },500);
    return()=>clearTimeout(t);
  },[staff,ready]);

  const active=clients.find(c=>c.id===aid);
  const activeStaff=staff.find(s=>s.id===sid);

  function addC(){
    router.push("/admin/clients/new");
  }
  function updC(id,p){setClients(prev=>prev.map(c=>c.id===id?{...c,...p}:c));}
  // Soft-archive only: data preserved for audit. The form sets archived flag via upd().
  function delC(id){
    setClients(prev=>prev.map(c=>c.id===id?{...c,archived:true,archivedAt:c.archivedAt||nowStr(),locked:true}:c));
  }

  function addStaff(){
    router.push("/admin/assignments");
  }
  function updStaff(id,p){setStaff(prev=>prev.map(s=>s.id===id?{...s,...p}:s));}
  function delStaff(id){
    setStaff(prev=>prev.map(s=>s.id===id?{...s,archived:true,archivedAt:s.archivedAt||nowStr(),status:"Inactive"}:s));
  }
  // Permanent (PIN-gated) deletes from Archive Folder — removes BILLING record only.
  // The underlying client / staff stays in Staff Connect (manage there to fully remove).
  async function hardDelClient(id){
    try{ await deleteBillingClientRow(id); }catch(e){ toast.error(e?.message||String(e)); return; }
    setClients(prev=>{const next=prev.filter(c=>c.id!==id);if(aid===id)setAid(next[0]?.id||null);return next;});
    toast.success("Billing record removed. Client still exists in Staff Connect.");
  }
  async function hardDelStaff(id){
    try{ await deleteBillingStaffRow(id); }catch(e){ toast.error(e?.message||String(e)); return; }
    setStaff(prev=>{const next=prev.filter(s=>s.id!==id);if(sid===id)setSid(next[0]?.id||null);return next;});
    toast.success("Billing record removed. Staff still exists in Staff Connect.");
  }
  function restoreClient(id){setClients(prev=>prev.map(c=>c.id===id?{...c,archived:false,locked:false}:c));}
  function restoreStaff(id){setStaff(prev=>prev.map(s=>s.id===id?{...s,archived:false,status:"Active"}:s));}
  function toggleStaffOnClient(staffId,clientId){
    let willAssign=false;
    setStaff(prev=>prev.map(s=>{
      if(s.id!==staffId)return s;
      const cur=s.assignedClientIds||[];
      willAssign=!cur.includes(clientId);
      return {...s,assignedClientIds:willAssign?[...cur,clientId]:cur.filter(x=>x!==clientId)};
    }));
    (willAssign?addAssignment(staffId,clientId):removeAssignment(staffId,clientId))
      .catch(e=>toast.error("Assignment sync failed: "+(e?.message||String(e))));
  }
  function openStaff(id){setSid(id);setMode("staff");setView("staff");}

  async function processFile(file){
    setIS("extracting");
    try{setID(await pdfExtract(file));setIS("review");}
    catch(e){setIE(e?.message||String(e));setIS("error");}
  }
  async function handleFile(e){
    const f=e.target.files[0];if(!f)return;
    setIS("uploading");setIE("");
    await processFile(f);
  }
  async function handleDrive(){
    setIS("uploading");setIE("");
    try{
      const id=parseDriveId(driveUrl);if(!id)throw new Error("Invalid Google Drive link.");
      const res=await fetch(`https://drive.google.com/uc?export=download&id=${id}`);
      if(!res.ok)throw new Error("Could not fetch. Ensure shared as 'Anyone with the link'.");
      const blob=await res.blob();
      await processFile(blob);
    }catch(e){setIE(e.message||"Google Drive fetch failed.");setIS("error");}
  }
  function exportToDrive(){
    // Browsers can't push directly to Drive without OAuth, so we download a JSON
    // snapshot and open Drive so the user can drop it in. One click, no auth setup.
    const payload={exportedAt:new Date().toISOString(),app:"RCS Billing Management",clients,staff};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`rcs-billing-export-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    window.open("https://drive.google.com/drive/my-drive","_blank","noopener");
  }
  async function applyImport(opts){
    const forceNew=!!opts?.forceNew;
    const d=iData;
    const pa={...mkPA(Date.now()),name:d.serviceName||"Community-Based Services",
      proc:d.procCode||"H2021HI",rate:d.rate||9.77,paS:d.paStart||"",paE:d.paEnd||"",
      pan:d.paNumber||"",pau:Math.max(0,parseInt(d.totalUnits)||parseInt(d.paApproved)||0),
      planId:d.planId||"",evv:(d.evv==="Non-EVV"?"Non-EVV":"EVV"),
      scCompany:d.scCompany||"",scEmail:d.scEmail||"",scPhone:d.scPhone||"",
      scName:d.scName||"",scIndEmail:d.scIndEmail||"",scIndPhone:d.scIndPhone||"",
      scsName:d.scsName||"",scsEmail:d.scsEmail||"",scsPhone:d.scsPhone||""};
    pa.weeks=genWeeks(pa.paS,pa.paE,0);
    const cp={name:d.name||"",pid:d.patientId||"",dob:d.dob||"",sex:d.sex||"",
      county:NJ_COUNTIES.includes(d.county)?d.county:"",mid:d.medicaidId||"",dx:d.dx||""};
    if(iTgt){updC(iTgt,{...cp,services:[pa]});setAid(iTgt);}
    else{
      const duplicate=forceNew?null:findExactDuplicateClient(cp,clients);
      if(duplicate){
        // Merge: append new PA to existing client; backfill any blank profile fields
        updC(duplicate.id,{
          pid:    duplicate.pid    ||cp.pid,
          dob:    duplicate.dob    ||cp.dob,
          sex:    duplicate.sex    ||cp.sex,
          county: duplicate.county ||cp.county,
          mid:    duplicate.mid    ||cp.mid,
          dx:     duplicate.dx     ||cp.dx,
          services:[...duplicate.services,pa],
        });
        setAid(duplicate.id);
        toast.success(`New PA merged into existing client: ${duplicate.name}`);
      }else{
        // Create a real client row in Staff Connect first so we get a UUID,
        // otherwise upsert into billing_client_data fails (client_id is UUID).
        try{
          const { data: row, error } = await supabase.from("clients")
            .insert({ full_name: cp.name || "New Client", dob: cp.dob || null })
            .select("id").single();
          if(error) throw error;
          const nc={...mkClient(row.id),...cp,services:[pa]};
          setClients(prev=>[...prev,nc]);
          setAid(nc.id);
        }catch(e){
          toast.error("Could not create client: "+(e?.message||String(e)));
          return;
        }
      }
    }
    setMode("clients");setView("form");setIS(null);setID(null);setDriveUrl("");
  }

  function triggerPDF(tgt){setIT(tgt||null);fileRef.current.value="";fileRef.current.click();}
  function triggerDrive(tgt){setIT(tgt||null);setDriveUrl("");setIS("drive");}
  function closeModal(){setIS(null);setID(null);setDriveUrl("");}

  const matchSearch=(c,fields)=>fields.some(v=>(v||"").toLowerCase().includes(search.toLowerCase()));
  const filteredClients=clients.filter(c=>(showArchived||!c.archived)&&matchSearch(c,[c.name,c.pid,c.mid]));
  const filteredStaff=staff.filter(s=>(showArchived||!s.archived)&&matchSearch(s,[s.name,s.role,s.email]));
  const archivedClientCount=clients.filter(c=>c.archived).length;
  const archivedStaffCount=staff.filter(s=>s.archived).length;
  const tgtName=iTgt?(clients.find(c=>c.id===iTgt)?.name||"selected client"):"new client";

  if(!ready)return <div style={{padding:20,color:gray5,fontFamily:"system-ui"}}>Loading…</div>;

  const sidebarStyle = isMobile ? {
    position:"fixed", top:0, left:0, bottom:0, zIndex:60,
    width:260, display:"flex", flexDirection:"column", background:navy,
    transform: navOpen ? "translateX(0)" : "translateX(-100%)",
    transition:"transform .25s ease",
    boxShadow: navOpen ? "0 10px 40px rgba(0,0,0,.4)" : "none",
  } : {
    width:220, display:"flex", flexDirection:"column", background:navy, flexShrink:0,
  };

  const selectClient=(id)=>{setAid(id);setView("form");if(isMobile)setNavOpen(false);};
  const selectStaff=(id)=>{setSid(id);setView("staff");if(isMobile)setNavOpen(false);};
  const goDash=()=>{setView("dash");if(isMobile)setNavOpen(false);};

  return <div style={{filter:theme==="dark"?"invert(1) hue-rotate(180deg)":"none",background:theme==="dark"?"#0f172a":"transparent",minHeight:"100vh"}}>
  <div style={{display:"flex",height:"100vh",fontFamily:"system-ui,sans-serif",fontSize:13,color:gray9,position:"relative"}}>
    {/* Mobile top bar */}
    {isMobile && <div style={{position:"fixed",top:0,left:0,right:0,zIndex:40,display:"flex",alignItems:"center",gap:10,
      padding:"10px 12px",background:navy,color:white,borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <button onClick={()=>setNavOpen(true)} aria-label="Open menu"
        style={{background:"rgba(255,255,255,.12)",border:"none",color:white,
          borderRadius:8,padding:"7px 10px",fontSize:16,cursor:"pointer",lineHeight:1}}>☰</button>
      <div style={{fontWeight:800,fontSize:14}}>RCS Billing Management</div>
      <div style={{marginLeft:"auto",fontSize:11,opacity:.6}}>{view==="dash"?"Dashboard":mode==="staff"?"Staff":"Client"}</div>
    </div>}

    {/* Backdrop */}
    {isMobile && navOpen && <div onClick={()=>setNavOpen(false)}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:55}}/>}

    <div style={sidebarStyle}>
      <div style={{padding:"16px 12px 8px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:1,gap:6}}>
          <div style={{fontWeight:900,fontSize:16,color:white}}>RCS Billing Management</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme" title="Toggle theme"
              style={{background:"rgba(255,255,255,.12)",border:"none",color:white,borderRadius:99,width:28,height:28,cursor:"pointer",fontSize:13,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {theme==="dark"?"☀":"☾"}
            </button>
            {isMobile && <button onClick={()=>setNavOpen(false)} aria-label="Close menu"
              style={{background:"transparent",border:"none",color:white,fontSize:18,cursor:"pointer",lineHeight:1,padding:4}}>✕</button>}
          </div>
        </div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.55)",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:6,height:6,borderRadius:99,background:saving?"#fbbf24":"#34d399",boxShadow:saving?"0 0 6px #fbbf24":"0 0 6px #34d399"}}/>
          {saving?"Autosaving…":savedAt?`Autosaved · ${savedAt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:"Autosave on"}
        </div>
        <a href="https://www.njmmis.com/default.aspx?err=logoff" target="_blank" rel="noopener noreferrer"
          style={{display:"block",width:"100%",fontSize:11,padding:"7px 9px",borderRadius:7,border:"none",
            background:"rgba(255,255,255,.12)",color:"#93c5fd",textDecoration:"none",marginBottom:8,
            boxSizing:"border-box",fontWeight:700}}>
          🌐 NJMMIS Portal
        </a>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${mode}…`}
          style={{width:"100%",fontSize:11,padding:"7px 9px",borderRadius:7,border:"none",
            background:"rgba(255,255,255,.12)",color:white,outline:"none",boxSizing:"border-box"}}/>
        {(archivedClientCount+archivedStaffCount)>0&&<button onClick={()=>setShowArchived(p=>!p)}
          title="Archived records are preserved for audit and cannot be deleted"
          style={{marginTop:6,width:"100%",fontSize:10,padding:"6px 8px",borderRadius:7,border:"none",cursor:"pointer",fontWeight:700,
            background:showArchived?"rgba(255,193,7,.25)":"rgba(255,255,255,.06)",color:showArchived?"#fcd34d":"rgba(255,255,255,.6)"}}>
          🗄 {showArchived?"Hide":"Show"} archived ({mode==="clients"?archivedClientCount:archivedStaffCount})
        </button>}
      </div>
      {sidebarExtra ? <div style={{padding:"0 7px 7px"}}>{sidebarExtra}</div> : null}
      <div style={{padding:"3px 7px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
        <button onClick={goDash} style={{width:"100%",textAlign:"left",padding:"8px 9px",borderRadius:7,border:"none",
          background:view==="dash"?"rgba(255,255,255,.15)":"transparent",color:white,cursor:"pointer",fontSize:12,fontWeight:700}}>
          📊 Dashboard</button>
      </div>

      {/* Mode toggle: Clients / Staff */}
      <div style={{display:"flex",gap:4,padding:"7px 7px 4px"}}>
        <button onClick={()=>setMode("clients")} style={{flex:1,padding:"7px 8px",borderRadius:7,border:"none",
          background:mode==="clients"?"rgba(255,255,255,.18)":"rgba(255,255,255,.05)",color:white,cursor:"pointer",fontSize:11,fontWeight:700}}>
          👥 Clients ({clients.length})</button>
        <button onClick={()=>setMode("staff")} style={{flex:1,padding:"7px 8px",borderRadius:7,border:"none",
          background:mode==="staff"?"rgba(124,58,237,.4)":"rgba(255,255,255,.05)",color:white,cursor:"pointer",fontSize:11,fontWeight:700}}>
          👷 Staff ({staff.length})</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:7}}>
        {mode==="clients"&&filteredClients.map(c=>{
          const pas=c.services;
          const u=pas.reduce((a,p)=>a+p.weeks.filter(w=>w.approved===true).reduce((b,w)=>b+w.u,0),0);
          const pau=pas.reduce((a,p)=>a+(Math.max(0,parseInt(p.pau)||0)),0);
          const pct=pau>0?Math.min(100,Math.round(u/pau*100)):0;
          const missed=pas.reduce((a,p)=>a+p.weeks.filter(w=>w.missed).length,0);
          const isAct=c.id===aid&&view==="form";
          return <div key={c.id} onClick={()=>selectClient(c.id)}
            style={{padding:"9px 10px",borderRadius:9,marginBottom:3,cursor:"pointer",opacity:c.archived?.55:1,
              background:isAct?"rgba(255,255,255,.18)":"transparent",
              border:`1px solid ${isAct?"rgba(255,255,255,.3)":c.archived?"rgba(255,193,7,.25)":"transparent"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
              <div style={{width:26,height:26,borderRadius:99,background:c.archived?gray5:blue,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:11,fontWeight:800,color:white,flexShrink:0}}>
                {(c.name||"?")[0].toUpperCase()}</div>
              <div style={{fontWeight:700,fontSize:12,color:white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textDecoration:c.archived?"line-through":"none"}}>{c.name||"Unnamed"}</div>
              {c.archived&&<span style={{fontSize:9,color:"#fcd34d"}}>🗄</span>}
              {c.locked&&!c.archived&&<span style={{fontSize:9,color:"#fcd34d"}}>🔒</span>}
              {missed>0&&<span style={{fontSize:9,color:red,fontWeight:800}}>⚠{missed}</span>}
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginBottom:pau>0?4:0}}>{c.mid||"No Medicaid ID"} · {pas.length} PA{pas.length!==1?"s":""}</div>
            {pau>0&&<div style={{height:3,borderRadius:99,background:"rgba(255,255,255,.12)"}}>
              <div style={{height:"100%",width:`${pct}%`,borderRadius:99,background:pct>=90?red:pct>=60?yellow:teal,transition:"width .3s"}}/>
            </div>}
          </div>;
        })}
        {mode==="staff"&&filteredStaff.map(s=>{
          const isAct=s.id===sid&&view==="staff";
          const numClients=(s.assignedClientIds||[]).length;
          const stColor=s.status==="Active"?"#86efac":s.status==="On Leave"?"#fcd34d":"rgba(255,255,255,.4)";
          return <div key={s.id} onClick={()=>selectStaff(s.id)}
            style={{padding:"9px 10px",borderRadius:9,marginBottom:3,cursor:"pointer",opacity:s.archived?.55:1,
              background:isAct?"rgba(124,58,237,.35)":"transparent",
              border:`1px solid ${isAct?"rgba(124,58,237,.6)":s.archived?"rgba(255,193,7,.25)":"transparent"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
              <div style={{width:26,height:26,borderRadius:99,background:s.archived?gray5:purple,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:11,fontWeight:800,color:white,flexShrink:0}}>
                {(s.name||"?")[0].toUpperCase()}</div>
              <div style={{fontWeight:700,fontSize:12,color:white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textDecoration:s.archived?"line-through":"none"}}>{s.name||"Unnamed"}</div>
              {s.archived&&<span style={{fontSize:9,color:"#fcd34d"}}>🗄</span>}
              <span style={{fontSize:8,color:stColor,fontWeight:800}}>●</span>
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>{s.archived?"Former":s.role} · {numClients} client{numClients!==1?"s":""}</div>
          </div>;
        })}
        {mode==="staff"&&filteredStaff.length===0&&<div style={{fontSize:11,color:"rgba(255,255,255,.4)",padding:10,fontStyle:"italic"}}>No staff yet. Click "+ Add staff" below.</div>}
      </div>
      <div style={{padding:8,borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column",gap:5}}>
        {mode==="clients"
          ?<><Btn onClick={addC} bg={blue} color={white} border={blue} full>+ Add client</Btn>
             <Btn onClick={()=>triggerPDF(null)} bg="rgba(255,255,255,.1)" color={white} border="rgba(255,255,255,.2)" full>📄 Upload PDF</Btn>
             <Btn onClick={()=>triggerDrive(null)} bg="rgba(255,255,255,.1)" color={white} border="rgba(255,255,255,.2)" full>📥 Drive Import</Btn>
             <Btn onClick={exportToDrive} bg="rgba(255,255,255,.1)" color={white} border="rgba(255,255,255,.2)" full>📤 Drive Export</Btn>
             </>

          :<Btn onClick={addStaff} bg={purple} color={white} border={purple} full>+ Add staff</Btn>}
        <input ref={fileRef} type="file" accept="application/pdf" style={{display:"none"}} onChange={handleFile}/>
      </div>
    </div>

    <div style={{flex:1,overflowY:"auto",background:gray0,position:"relative",paddingTop:isMobile?44:0}}>
      <IModal state={iState} data={iData} err={iErr} target={tgtName}
        onApply={applyImport} onClose={closeModal} driveUrl={driveUrl} setDriveUrl={setDriveUrl} onDrive={handleDrive}
        clients={clients} iTgt={iTgt}/>
      {view==="archive"
        ?<ArchiveFolder clients={clients} staff={staff}
            onDeleteClient={hardDelClient} onDeleteStaff={hardDelStaff}
            onRestoreClient={restoreClient} onRestoreStaff={restoreStaff}/>
        :view==="dash"
        ?<Dashboard clients={clients} staff={staff}
            archivedCount={archivedClientCount+archivedStaffCount}
            onOpenArchive={()=>setView("archive")}
            onSelect={id=>{setAid(id);setMode("clients");setView("form");}}/>
        :view==="staff"
          ?activeStaff
            ?<StaffForm st={activeStaff} upd={p=>updStaff(activeStaff.id,p)} onDel={()=>delStaff(activeStaff.id)}
                clients={clients} allStaff={staff}/>
            :<div style={{padding:20,color:gray5}}>Select a staff member or add a new one.</div>
          :active
            ?<CForm cl={active} upd={p=>updC(active.id,p)} onDel={()=>delC(active.id)}
                onPDF={()=>triggerPDF(active.id)} onDrive={()=>triggerDrive(active.id)}
                allStaff={staff} onToggleStaff={toggleStaffOnClient} onOpenStaff={openStaff}/>
            :<div style={{padding:20,color:gray5}}>Select a client or add a new one.</div>}
    </div>
  </div>
  </div>;
}
