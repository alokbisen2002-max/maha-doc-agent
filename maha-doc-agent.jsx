import { useState, useRef } from "react";

// ─── FONTS & THEME ────────────────────────────────────────────────
const F = "'Noto Serif Devanagari','Noto Sans Devanagari',serif";
const T = {
  bg:"#0d1a0c", surf:"#172515", surf2:"#1e2f1c", bdr:"#2b4229",
  gold:"#c9a84c", goldL:"#e8c96d", goldD:"#c9a84c22",
  cream:"#f0ebe0", dim:"#f0ebe055", dim2:"#f0ebe022",
  green:"#2a5c28", red:"#5c2828", redL:"#ffaaaa",
  inp:"#0a1208", tag:"#c9a84c18"
};

// ─── API ──────────────────────────────────────────────────────────
const claude = async (system, userText, images=[], maxTokens=4000) => {
  const content = [];
  for (const img of images)
    content.push({ type:"image", source:{ type:"base64", media_type:img.mime, data:img.b64 }});
  content.push({ type:"text", text:userText });
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system, messages:[{role:"user",content}]})
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content[0].text;
};
const toB64 = f => new Promise((res,rej)=>{
  const r=new FileReader();
  r.onload=()=>res({b64:r.result.split(",")[1],mime:f.type});
  r.onerror=rej; r.readAsDataURL(f);
});

// ─── DOCUMENT TYPES ───────────────────────────────────────────────
const CATS = [
  {id:"sale",   emoji:"🤝", label:"विक्री करारनामा",   sub:"Sale Agreement"},
  {id:"rent",   emoji:"🏠", label:"भाडेपट्टी करार",    sub:"Rent / Leave & License"},
  {id:"affidavit",emoji:"⚖️",label:"शपथपत्र",         sub:"Affidavit"},
];
const SUBS = {
  sale:[
    {id:"vehicle", label:"🚗 वाहन विक्री करारनामा",       law:"Motor Vehicles Act 1988, Maharashtra Stamp Act"},
    {id:"land",    label:"🌾 जमीन / मालमत्ता विक्री",      law:"Transfer of Property Act, Registration Act 1908"},
    {id:"shop",    label:"🏪 दुकान / व्यवसाय विक्री",      law:"Maharashtra Stamp Act 2019, Contract Act"},
    {id:"goods",   label:"📦 वस्तू / साहित्य विक्री",      law:"Sale of Goods Act 1930"},
  ],
  rent:[
    {id:"residential",  label:"🏠 निवासी Leave & License",  law:"Maharashtra Rent Control Act 1999"},
    {id:"commercial",   label:"🏢 व्यावसायिक भाडेपट्टी",   law:"Maharashtra Rent Control Act 1999"},
    {id:"agricultural", label:"🌾 शेती / कूळ भाडेपट्टी",   law:"Maharashtra Tenancy & Agricultural Lands Act"},
  ],
  affidavit:[
    {id:"name_change",  label:"✏️ नाव बदल"},
    {id:"address",      label:"🏠 पत्ता पुरावा"},
    {id:"income",       label:"💰 उत्पन्न प्रमाण"},
    {id:"age",          label:"📅 वय पुरावा"},
    {id:"unmarried",    label:"💍 अविवाहित / विधवा / विधुर दर्जा"},
    {id:"legal_heir",   label:"👨‍👩‍👧 कायदेशीर वारस"},
    {id:"lost_doc",     label:"🔍 कागदपत्र हरवणे"},
    {id:"domicile",     label:"📍 अधिवास प्रमाण"},
    {id:"caste",        label:"📜 जात / धर्म घोषणापत्र"},
    {id:"noc",          label:"✅ ना-हरकत शपथपत्र"},
    {id:"financial",    label:"🏦 आर्थिक / कर्ज शपथपत्र"},
    {id:"property",     label:"🏡 मालमत्ता घोषणापत्र"},
    {id:"other",        label:"📄 इतर विषय..."},
  ],
};

// ─── SCAN DOC TYPES ───────────────────────────────────────────────
const SCAN_DOCS = [
  {id:"aadh_p1", emoji:"🪪", label:"आधार कार्ड — पक्ष १",         hint:"विक्रेता / भाडेकरू / शपथकर्ता"},
  {id:"aadh_p2", emoji:"🪪", label:"आधार कार्ड — पक्ष २",         hint:"खरेदीदार / भाडेदार / साक्षीदार"},
  {id:"pan_p1",  emoji:"💳", label:"PAN कार्ड — पक्ष १",          hint:""},
  {id:"pan_p2",  emoji:"💳", label:"PAN कार्ड — पक्ष २",          hint:""},
  {id:"rc",      emoji:"🚗", label:"RC Book (वाहन नोंदणी)",        hint:"Vehicle Registration"},
  {id:"doc712",  emoji:"📋", label:"७/१२ उतारा / प्रॉपर्टी कार्ड", hint:""},
  {id:"ration",  emoji:"🗂️", label:"रेशन कार्ड",                   hint:""},
  {id:"other_d", emoji:"📄", label:"इतर कागद",                     hint:"कोणतेही महत्त्वाचे कागद"},
];

// ─── FIELD LABELS ─────────────────────────────────────────────────
const FIELD_LABELS = {
  p1_naam_hi:"पक्ष १ — नाव (मराठी/हिंदी)", p1_naam_en:"पक्ष १ — नाव (इंग्रजी)",
  p1_aadhaar_no:"पक्ष १ — आधार क्र.", p1_pan_no:"पक्ष १ — PAN",
  p1_dob:"पक्ष १ — जन्मतारीख", p1_age:"पक्ष १ — वय",
  p1_gender:"पक्ष १ — लिंग", p1_father_naam:"पक्ष १ — वडिलांचे/पतीचे नाव",
  p1_address_full:"पक्ष १ — पूर्ण पत्ता", p1_pincode:"पक्ष १ — पिनकोड",
  p1_village:"पक्ष १ — गाव/मोहल्ला", p1_taluka:"पक्ष १ — तालुका", p1_jila:"पक्ष १ — जिल्हा",
  p2_naam_hi:"पक्ष २ — नाव (मराठी/हिंदी)", p2_naam_en:"पक्ष २ — नाव (इंग्रजी)",
  p2_aadhaar_no:"पक्ष २ — आधार क्र.", p2_pan_no:"पक्ष २ — PAN",
  p2_dob:"पक्ष २ — जन्मतारीख", p2_age:"पक्ष २ — वय",
  p2_father_naam:"पक्ष २ — वडिलांचे/पतीचे नाव",
  p2_address_full:"पक्ष २ — पूर्ण पत्ता", p2_pincode:"पक्ष २ — पिनकोड",
  p2_village:"पक्ष २ — गाव", p2_taluka:"पक्ष २ — तालुका", p2_jila:"पक्ष २ — जिल्हा",
  v_vehicle_no:"वाहन नोंदणी क्र.", v_vehicle_make_model:"वाहन प्रकार/मॉडेल",
  v_vehicle_year:"वाहन वर्ष", v_engine_no:"इंजिन क्र.", v_chassis_no:"चेसिस क्र.",
  prop_survey_no:"सर्व्हे/गट क्र.", prop_area_hectare:"क्षेत्र (हेक्टर)",
  prop_area_guntha:"क्षेत्र (गुंठे)", prop_mauza:"मौजा/गाव", prop_taluka:"तालुका",
  prop_jila:"जिल्हा", prop_malik_naam:"मूळ मालकाचे नाव",
  amount:"रक्कम — अंकात (₹)", amount_words:"रक्कम — शब्दात",
  rent_amount:"मासिक भाडे (₹)", deposit_amount:"डिपॉझिट/अनामत (₹)",
  duration:"कालावधी", place:"करार स्थान",
};

// ─── VISION EXTRACTION SYSTEM ─────────────────────────────────────
const VISION_SYS = `You are a precision document data extractor for Indian legal documents.
Extract ALL visible text from the image and return ONLY a valid JSON object — no markdown, no explanation, no extra text.
Use these exact keys (empty string if not found):
{
  "naam_hi":"","naam_en":"","aadhaar_no":"","pan_no":"","dob":"","age":"","gender":"",
  "father_naam":"","mother_naam":"","spouse_naam":"","address_full":"","pincode":"",
  "village":"","taluka":"","jila":"","state":"",
  "vehicle_no":"","vehicle_make_model":"","vehicle_year":"","engine_no":"","chassis_no":"",
  "survey_no":"","gat_no":"","area_hectare":"","area_guntha":"","mauza":"","malik_naam":"",
  "khata_no":"","ration_no":"","extra":""
}`;

// ─── DOC GENERATION SYSTEM ────────────────────────────────────────
const docSys = (cat, sub) => {
  const laws = {
    vehicle:`Motor Vehicles Act 1988 sec 50 (transfer of ownership), Maharashtra Stamp Act 2019 Art 5(g-a), RTO Form 29/30`,
    land:`Transfer of Property Act 1882, Registration Act 1908, Maharashtra Stamp Act 2019`,
    shop:`Maharashtra Stamp Act 2019, Indian Contract Act 1872`,
    goods:`Sale of Goods Act 1930, Indian Contract Act 1872`,
    residential:`Maharashtra Rent Control Act 1999, Leave & License Agreement norms`,
    commercial:`Maharashtra Rent Control Act 1999, Maharashtra Shops & Establishment Act`,
    agricultural:`Maharashtra Tenancy & Agricultural Lands Act 1948`,
    name_change:`Notary Act 1952, Indian Evidence Act sec 45`,
    address:`Notary Act 1952, Indian Evidence Act`,
    income:`Notary Act 1952`,
    age:`Notary Act 1952, Births, Deaths and Marriages Registration Act`,
    unmarried:`Notary Act 1952, Indian Evidence Act`,
    legal_heir:`Hindu Succession Act 1956, Indian Succession Act 1925`,
    lost_doc:`Notary Act 1952, First Information Report procedure`,
    domicile:`Maharashtra State Domicile Certificate Rules`,
    caste:`Maharashtra Scheduled Castes, Denotified Tribes Rules`,
    noc:`Indian Contract Act, Notary Act 1952`,
    financial:`Notary Act 1952, SARFAESI Act`,
    property:`Notary Act 1952, Transfer of Property Act`,
    other:`Notary Act 1952, Indian Evidence Act`,
  };
  return `You are a senior Maharashtra legal document expert and advocate.
Write complete, enforceable legal documents in formal Marathi (Devanagari). Use Hindi where Marathi is not standard.
Applicable laws: ${laws[sub] || "Notary Act 1952, Indian Contract Act 1872"}

STRICT RULES:
1. Begin DIRECTLY with document title/heading — no intro from you
2. Write in formal legal Marathi throughout
3. Include ALL mandatory clauses for ${cat}-${sub} valid in Maharashtra courts
4. Signature blanks: __________________________
5. Date blanks: दिनांक: __________ / __________
6. Notary/Court stamp area: [नोटरी शिक्का / न्यायालय शिक्का]
7. Include proper witnessess (साक्षीदार) section at end
8. For affidavits: include proper oath text per Notary Act 1952
9. For agreements: include penalty clause, jurisdiction (maharashtra courts), stamp duty paid clause
10. Document must be ready to sign — professional, complete, legally sound`;
};

// ─── FIELD GROUPING FOR DISPLAY ───────────────────────────────────
const FIELD_GROUPS = {
  sale: {
    "पक्ष १ (विक्रेता)":["p1_naam_hi","p1_father_naam","p1_age","p1_dob","p1_aadhaar_no","p1_pan_no","p1_address_full","p1_village","p1_taluka","p1_jila","p1_pincode"],
    "पक्ष २ (खरेदीदार)":["p2_naam_hi","p2_father_naam","p2_age","p2_dob","p2_aadhaar_no","p2_pan_no","p2_address_full","p2_village","p2_taluka","p2_jila","p2_pincode"],
    "वाहन / मालमत्ता":["v_vehicle_no","v_vehicle_make_model","v_vehicle_year","v_engine_no","v_chassis_no","prop_survey_no","prop_area_hectare","prop_area_guntha","prop_mauza","prop_taluka","prop_jila"],
    "व्यवहार":["amount","amount_words","place"],
  },
  rent: {
    "भाडेदार (Licensor)":["p1_naam_hi","p1_father_naam","p1_age","p1_aadhaar_no","p1_pan_no","p1_address_full","p1_village","p1_taluka","p1_jila"],
    "भाडेकरू (Licensee)":["p2_naam_hi","p2_father_naam","p2_age","p2_aadhaar_no","p2_pan_no","p2_address_full","p2_village","p2_taluka","p2_jila"],
    "मालमत्ता":["prop_survey_no","prop_mauza","prop_taluka","prop_jila"],
    "भाडे तपशील":["rent_amount","deposit_amount","duration","place"],
  },
  affidavit: {
    "शपथकर्ता":["p1_naam_hi","p1_naam_en","p1_father_naam","p1_age","p1_dob","p1_gender","p1_aadhaar_no","p1_pan_no","p1_address_full","p1_village","p1_taluka","p1_jila","p1_pincode"],
    "इतर":["place"],
  },
};

// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [step,   setStep]   = useState("home");
  const [cat,    setCat]    = useState(null);
  const [stype,  setStype]  = useState(null);
  const [otherTopic, setOtherTopic] = useState("");
  const [scanned, setScanned] = useState([]);
  const [flds,   setFlds]   = useState({});
  const [clauses,setClauses]= useState([]);
  const [newC,   setNewC]   = useState("");
  const [docTxt, setDocTxt] = useState("");
  const [loading,setLoading]= useState(false);
  const [loadMsg,setLoadMsg]= useState("");
  const [err,    setErr]    = useState("");
  const [scanId, setScanId] = useState(null);
  const fileRefs = useRef({});

  // ── helpers ────────────────────────────────────────────────────
  const mergeScanned = arr => {
    const m = {};
    for (const s of arr) {
      const pfx = s.id.includes("p2") ? "p2_"
        : s.id==="rc"      ? "v_"
        : s.id==="doc712"  ? "prop_"
        : "p1_";
      for (const [k,v] of Object.entries(s.fields||{}))
        if (v) m[pfx+k] = v;
    }
    return m;
  };

  const doScan = async (stype, file) => {
    setScanId(stype.id); setErr("");
    try {
      const img = await toB64(file);
      const preview = URL.createObjectURL(file);
      const raw = await claude(VISION_SYS, `Document hint: ${stype.label}. Extract carefully.`, [img], 1200);
      let extracted = {};
      try { extracted = JSON.parse(raw.replace(/```json|```/g,"").trim()); }
      catch { extracted = { extra: raw }; }
      const upd = [...scanned.filter(s=>s.id!==stype.id),
        {id:stype.id, label:stype.label, emoji:stype.emoji, fields:extracted, preview}];
      setScanned(upd);
      setFlds(prev => ({...prev, ...mergeScanned(upd)}));
    } catch(e) { setErr("स्कॅन अयशस्वी: "+e.message); }
    setScanId(null);
  };

  const generate = async () => {
    setLoading(true); setErr("");
    setLoadMsg("दस्तावेज़ तयार होत आहे... कृपया ५-१० सेकंद प्रतीक्षा करा...");
    try {
      const fText = Object.entries(flds).filter(([,v])=>v)
        .map(([k,v])=>`${FIELD_LABELS[k]||k}: ${v}`).join("\n");
      const clauseTxt = clauses.length
        ? `\nक्लायंटच्या विशेष अटी (या अटी दस्तावेज़ात समाविष्ट कराव्यात):\n`+clauses.map((c,i)=>`${i+1}. ${c}`).join("\n")
        : "";
      const subObj = (SUBS[cat]||[]).find(s=>s.id===stype);
      const subLabel = stype==="other" ? otherTopic : (subObj?.label||stype);
      const prompt = `दस्तावेज़ प्रकार: ${CATS.find(c=>c.id===cat)?.label} — ${subLabel}

पक्ष / मालमत्ता माहिती:
${fText||"(माहिती उपलब्ध नाही — रिकाम्या जागा __________ सोडाव्यात)"}
${clauseTxt}

संपूर्ण, सही करण्यास तयार, कायदेशीर दस्तावेज़ लिहा. महाराष्ट्र न्यायालयात वैध असावे.`;
      const result = await claude(docSys(cat,stype), prompt, [], 4000);
      setDocTxt(result); setStep("preview");
    } catch(e) { setErr("दस्तावेज़ तयार करण्यात चूक: "+e.message); }
    setLoading(false);
  };

  const printDoc = () => {
    const catLabel = CATS.find(c=>c.id===cat)?.label||"";
    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html lang="mr"><head>
<meta charset="UTF-8"><title>${catLabel}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e8e0d0;font-family:'Noto Serif Devanagari',serif}
.controls{padding:12px;text-align:center;background:#fff;border-bottom:1px solid #ccc;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.controls button{padding:8px 22px;font-size:12pt;cursor:pointer;border:none;border-radius:6px;font-family:inherit;font-weight:600}
.print-btn{background:#c9a84c;color:#111}
.close-btn{background:#eee;color:#333}
.page{
  width:21cm;min-height:29.7cm;margin:8px auto;background:white;
  padding-top:18.5cm;
  padding-left:2.5cm;
  padding-right:1.5cm;
  padding-bottom:0.5in;
  border:1px solid #ccc;
}
.doc{font-size:12pt;line-height:2.1;color:#111;text-align:justify;white-space:pre-wrap}
.ruler{position:fixed;top:0;right:0;background:rgba(200,168,76,.9);color:#111;padding:4px 8px;font-size:10pt;border-radius:0 0 0 6px}
@media print{
  body{background:white}
  .controls,.ruler{display:none}
  .page{margin:0;border:none;width:100%}
  @page{size:A4;margin:0}
}
</style>
</head><body>
<div class="controls">
  <button class="print-btn" onclick="window.print()">🖨️ प्रिंट करा (A4 स्टांप पेपर)</button>
  <button class="close-btn" onclick="window.close()">✕ बंद करा</button>
</div>
<div class="ruler">↑ वरून 18.5 cm (प्री-प्रिंटेड स्टांप) → टेक्स्ट येथून सुरू</div>
<div class="page">
  <div class="doc">${docTxt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
</div>
</body></html>`);
    win.document.close();
  };

  // ── Shared style helpers ───────────────────────────────────────
  const Btn = ({children, onClick, sec, sm, disabled, style:sx={}}) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm?"6px 12px":"10px 22px", fontSize:sm?"11px":"14px",
      background: disabled?"#1e2f1c" : sec?"transparent":T.gold,
      color: disabled?"#4a6a48" : sec?T.gold:"#111",
      border: sec?`1px solid ${T.gold}`:"none",
      borderRadius:"8px", cursor:disabled?"default":"pointer",
      fontFamily:F, fontWeight:700, transition:"all .2s", opacity:disabled?.7:1, ...sx
    }}>{children}</button>
  );

  const Card = ({children, onClick, active, style:sx={}}) => (
    <div onClick={onClick} style={{
      background: active?T.surf2:T.surf,
      border:`1.5px solid ${active?T.gold:T.bdr}`,
      borderRadius:"12px", padding:"16px 14px",
      cursor:onClick?"pointer":"default", transition:"all .2s", ...sx
    }}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.border=`1.5px solid ${T.gold}`;e.currentTarget.style.background=T.surf2}}}
    onMouseLeave={e=>{if(onClick&&!active){e.currentTarget.style.border=`1.5px solid ${T.bdr}`;e.currentTarget.style.background=T.surf}}}
    >{children}</div>
  );

  const Inp = ({value,onChange,placeholder,multiline,style:sx={}}) => {
    const base = {
      padding:"9px 12px", background:T.inp, border:`1px solid ${T.bdr}`,
      borderRadius:"8px", color:T.cream, fontFamily:F, fontSize:"13px",
      width:"100%", outline:"none", ...sx
    };
    return multiline
      ? <textarea value={value} onChange={onChange} placeholder={placeholder}
          style={{...base, resize:"vertical", minHeight:"60px"}} />
      : <input value={value} onChange={onChange} placeholder={placeholder} style={base} />;
  };

  const Label = ({children}) => (
    <div style={{color:T.gold+"99",fontSize:"10px",marginBottom:"4px",letterSpacing:".5px"}}>{children}</div>
  );

  const ErrBox = () => err ? (
    <div style={{background:T.red,color:T.redL,padding:"10px 14px",borderRadius:"8px",margin:"10px 0",fontSize:"12px"}}>
      ⚠️ {err}
    </div>
  ) : null;

  // ─────────────────────────────────────────────────────────────────
  // ── SCREEN: HOME ─────────────────────────────────────────────────
  if (step==="home") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:F}}>
      <div style={{fontSize:"48px",marginBottom:"10px"}}>⚖️</div>
      <h1 style={{color:T.gold,fontSize:"24px",fontWeight:700,margin:"0 0 4px",textAlign:"center"}}>महाराष्ट्र दस्तावेज़ एजंट</h1>
      <p style={{color:T.dim,fontSize:"12px",marginBottom:"4px",textAlign:"center"}}>Vision Scanner • AI Document Writer • Stamp Paper Format</p>
      <div style={{display:"flex",gap:"8px",margin:"6px 0 30px",flexWrap:"wrap",justifyContent:"center"}}>
        {["📷 फोटो स्कॅन","🤖 AI दस्तावेज़","🖨️ प्रिंट-रेडी","⚖️ महाराष्ट्र कायदा"].map(t=>(
          <span key={t} style={{background:T.goldD,color:T.gold,padding:"3px 10px",borderRadius:"20px",fontSize:"11px"}}>{t}</span>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"14px",maxWidth:"500px",width:"100%"}}>
        {CATS.map(c=>(
          <Card key={c.id} onClick={()=>{setCat(c.id);setStep("subtype");}}>
            <div style={{fontSize:"30px",marginBottom:"10px",textAlign:"center"}}>{c.emoji}</div>
            <div style={{color:T.gold,fontWeight:600,fontSize:"14px",textAlign:"center",lineHeight:1.4}}>{c.label}</div>
            <div style={{color:T.dim,fontSize:"10px",textAlign:"center",marginTop:"4px"}}>{c.sub}</div>
          </Card>
        ))}
      </div>
      <p style={{color:T.dim2,fontSize:"10px",marginTop:"28px",textAlign:"center"}}>
        आधार, PAN, RC Book, ७/१२ स्कॅन → AI दस्तावेज़ तयार → स्टांप पेपरवर प्रिंट
      </p>
    </div>
  );

  // ── SCREEN: SUBTYPE ───────────────────────────────────────────────
  if (step==="subtype") return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"0",fontFamily:F,color:T.cream}}>
      <div style={{background:T.surf,borderBottom:`1px solid ${T.bdr}`,padding:"14px 18px",display:"flex",gap:"12px",alignItems:"center"}}>
        <Btn sec sm onClick={()=>setStep("home")}>← मागे</Btn>
        <div>
          <div style={{color:T.gold,fontWeight:600,fontSize:"15px"}}>{CATS.find(c=>c.id===cat)?.label}</div>
          <div style={{color:T.dim,fontSize:"11px"}}>प्रकार निवडा</div>
        </div>
      </div>
      <div style={{maxWidth:"560px",margin:"0 auto",padding:"20px 16px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {(SUBS[cat]||[]).map(s=>(
            <Card key={s.id} onClick={()=>{setStype(s.id);setStep("scan");}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{flex:1,fontSize:"15px",color:T.cream}}>{s.label}</div>
                {s.law && <div style={{fontSize:"9px",color:T.gold+"66",maxWidth:"140px",textAlign:"right"}}>{s.law}</div>}
                <div style={{color:T.gold,fontSize:"18px",marginLeft:"4px"}}>›</div>
              </div>
            </Card>
          ))}
        </div>
        {cat==="affidavit" && stype==="other" && (
          <div style={{marginTop:"18px"}}>
            <Label>शपथपत्राचा विषय लिहा:</Label>
            <Inp value={otherTopic} onChange={e=>setOtherTopic(e.target.value)} placeholder="उदा: मालमत्ता हस्तांतरण, बँक खाते..." />
          </div>
        )}
      </div>
    </div>
  );

  // ── SCREEN: SCAN ──────────────────────────────────────────────────
  if (step==="scan") return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:F,color:T.cream}}>
      <div style={{background:T.surf,borderBottom:`1px solid ${T.bdr}`,padding:"12px 16px",display:"flex",gap:"12px",alignItems:"center"}}>
        <Btn sec sm onClick={()=>setStep("subtype")}>← मागे</Btn>
        <div>
          <div style={{color:T.gold,fontWeight:600,fontSize:"14px"}}>📷 कागदपत्रे स्कॅन करा</div>
          <div style={{color:T.dim,fontSize:"11px"}}>फोटो काढा — AI माहिती आपोआप काढेल</div>
        </div>
      </div>

      <div style={{maxWidth:"580px",margin:"0 auto",padding:"16px"}}>
        <ErrBox/>

        {/* How it works */}
        <div style={{background:T.goldD,border:`1px solid ${T.gold}33`,borderRadius:"10px",padding:"12px 16px",marginBottom:"16px",fontSize:"12px",color:T.cream+"bb",lineHeight:1.8}}>
          📸 जो कागद स्कॅन करायचा त्याचा <b style={{color:T.gold}}>📷 स्कॅन</b> बटण दाबा → फोटो काढा → AI माहिती काढेल → नंतर <b style={{color:T.gold}}>पुढे</b> बटण दाबा
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px"}}>
          {SCAN_DOCS.map(sd=>{
            const done = scanned.find(s=>s.id===sd.id);
            const isScanning = scanId===sd.id;
            const fieldCount = done ? Object.values(done.fields||{}).filter(v=>v).length : 0;
            return (
              <div key={sd.id} style={{
                background: done?T.surf2:T.surf,
                border:`1.5px solid ${done?T.gold:T.bdr}`,
                borderRadius:"12px", padding:"12px 14px",
                display:"flex", alignItems:"center", gap:"12px"
              }}>
                {done
                  ? <img src={done.preview} style={{width:"48px",height:"48px",borderRadius:"8px",objectFit:"cover",flexShrink:0}} />
                  : <div style={{width:"48px",height:"48px",borderRadius:"8px",background:T.inp,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",flexShrink:0}}>{sd.emoji}</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"13px",color:done?T.gold:T.cream,fontWeight:done?600:400}}>{sd.label}</div>
                  {done && <div style={{fontSize:"10px",color:"#7fc97f",marginTop:"2px"}}>✓ {fieldCount} माहिती मिळाली</div>}
                  {!done && sd.hint && <div style={{fontSize:"10px",color:T.dim}}>{sd.hint}</div>}
                </div>
                <div style={{flexShrink:0}}>
                  {isScanning
                    ? <div style={{color:T.gold,fontSize:"12px",minWidth:"80px",textAlign:"center"}}>⏳ स्कॅन...</div>
                    : <>
                        <input type="file" accept="image/*" capture="environment"
                          ref={el=>fileRefs.current[sd.id]=el}
                          style={{display:"none"}}
                          onChange={e=>{if(e.target.files[0]) doScan(sd,e.target.files[0]); e.target.value="";}}
                        />
                        <Btn sm onClick={()=>fileRefs.current[sd.id]?.click()}
                          style={{background:done?T.bdr:T.gold, color:done?T.cream:"#111"}}>
                          {done?"🔄 बदला":"📷 स्कॅन"}
                        </Btn>
                      </>
                  }
                </div>
              </div>
            );
          })}
        </div>

        <div style={{textAlign:"center",paddingBottom:"24px"}}>
          <Btn onClick={()=>{setStep("fields");}}>
            पुढे → माहिती तपासा {scanned.length>0?`(${scanned.length} स्कॅन)` : ""}
          </Btn>
          <div style={{color:T.dim,fontSize:"11px",marginTop:"8px"}}>स्कॅन न करताही पुढे जाता येते — माहिती हाताने भरता येते</div>
        </div>
      </div>
    </div>
  );

  // ── SCREEN: FIELDS ────────────────────────────────────────────────
  if (step==="fields") {
    const groups = FIELD_GROUPS[cat] || FIELD_GROUPS.affidavit;
    const allGroupKeys = Object.values(groups).flat();
    const extraKeys = Object.keys(flds).filter(k=>!allGroupKeys.includes(k));

    return (
      <div style={{minHeight:"100vh",background:T.bg,fontFamily:F,color:T.cream}}>
        <div style={{background:T.surf,borderBottom:`1px solid ${T.bdr}`,padding:"12px 16px",display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap"}}>
          <Btn sec sm onClick={()=>setStep("scan")}>← मागे</Btn>
          <div style={{flex:1}}>
            <div style={{color:T.gold,fontWeight:600,fontSize:"14px"}}>माहिती तपासा</div>
            <div style={{color:T.dim,fontSize:"11px"}}>स्कॅन केलेली माहिती बदलता येते • रिकामे ठेवल्यास blank येईल</div>
          </div>
          <Btn onClick={generate} disabled={loading} style={{padding:"8px 18px",fontSize:"13px"}}>
            {loading ? "⏳ "+loadMsg.slice(0,20)+"..." : "⚡ दस्तावेज़ तयार करा"}
          </Btn>
        </div>

        <div style={{maxWidth:"680px",margin:"0 auto",padding:"16px"}}>
          <ErrBox/>

          {/* Field groups */}
          {Object.entries(groups).map(([grpLabel,keys])=>(
            <div key={grpLabel} style={{marginBottom:"20px"}}>
              <div style={{color:T.gold,fontSize:"13px",fontWeight:600,marginBottom:"10px",
                padding:"6px 14px",background:T.goldD,borderRadius:"6px",display:"inline-block"}}>
                {grpLabel}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                {keys.map(k=>(
                  <div key={k}>
                    <Label>{FIELD_LABELS[k]||k}</Label>
                    <Inp value={flds[k]||""} onChange={e=>setFlds({...flds,[k]:e.target.value})}
                      placeholder={FIELD_LABELS[k]||k} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Extra scanned fields */}
          {extraKeys.length>0 && (
            <div style={{marginBottom:"20px"}}>
              <div style={{color:T.gold,fontSize:"13px",fontWeight:600,marginBottom:"10px",
                padding:"6px 14px",background:T.goldD,borderRadius:"6px",display:"inline-block"}}>
                स्कॅनमधील इतर माहिती
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                {extraKeys.filter(k=>flds[k]).map(k=>(
                  <div key={k}>
                    <Label>{k}</Label>
                    <Inp value={flds[k]||""} onChange={e=>setFlds({...flds,[k]:e.target.value})} placeholder={k} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom clauses */}
          <div style={{background:T.surf,border:`1px solid ${T.bdr}`,borderRadius:"12px",padding:"16px",marginBottom:"20px"}}>
            <div style={{color:T.gold,fontSize:"13px",fontWeight:600,marginBottom:"4px"}}>📌 विशेष अटी — क्लायंट नुसार</div>
            <div style={{color:T.dim,fontSize:"11px",marginBottom:"12px"}}>या अटी AI दस्तावेज़ात योग्य ठिकाणी समाविष्ट करेल</div>
            {clauses.map((c,i)=>(
              <div key={i} style={{display:"flex",gap:"8px",marginBottom:"8px",alignItems:"flex-start"}}>
                <div style={{flex:1,background:T.inp,border:`1px solid ${T.bdr}`,borderRadius:"8px",padding:"8px 12px",fontSize:"12px",color:T.cream,lineHeight:1.7}}>
                  <span style={{color:T.gold,fontSize:"10px"}}>अट {i+1}: </span>{c}
                </div>
                <button onClick={()=>setClauses(clauses.filter((_,j)=>j!==i))}
                  style={{background:T.red,color:T.redL,border:"none",borderRadius:"6px",padding:"6px 10px",cursor:"pointer",fontSize:"14px",flexShrink:0}}>✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
              <Inp value={newC} onChange={e=>setNewC(e.target.value)} multiline
                placeholder="उदा: वाहनावरील सर्व देणी विक्रेत्याने भरावीत / भाड्याची रक्कम दर महिन्याच्या ५ तारखेला द्यावी..." />
              <Btn onClick={()=>{if(newC.trim()){setClauses([...clauses,newC.trim()]);setNewC("")}}}
                style={{alignSelf:"flex-start",padding:"8px 14px",flexShrink:0}}>
                + जोडा
              </Btn>
            </div>
          </div>

          <div style={{textAlign:"center",paddingBottom:"30px"}}>
            <Btn onClick={generate} disabled={loading} style={{padding:"14px 36px",fontSize:"15px"}}>
              {loading ? "⏳ "+loadMsg : "⚡ दस्तावेज़ तयार करा"}
            </Btn>
            {loading && <div style={{color:T.dim,fontSize:"11px",marginTop:"8px",animation:"pulse 1.5s infinite"}}>कृपया प्रतीक्षा करा...</div>}
            {err && <div style={{color:T.redL,fontSize:"12px",marginTop:"10px"}}>⚠️ {err}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: PREVIEW ───────────────────────────────────────────────
  if (step==="preview") return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:F,color:T.cream}}>
      <div style={{background:T.surf,borderBottom:`1px solid ${T.bdr}`,padding:"12px 16px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
        <Btn sec sm onClick={()=>setStep("fields")}>← संपादित करा</Btn>
        <Btn sec sm onClick={()=>setStep("home")}>🏠 होम</Btn>
        <Btn sec sm onClick={generate} disabled={loading} style={{fontSize:"11px"}}>🔄 पुन्हा तयार करा</Btn>
        <div style={{flex:1}}/>
        <div style={{color:T.dim,fontSize:"10px",textAlign:"right"}}>
          प्रिंट: A4 स्टांप पेपर<br/>वरून 18.5cm सोडले जाईल
        </div>
        <Btn onClick={printDoc} style={{padding:"10px 24px",fontSize:"14px"}}>
          🖨️ प्रिंट / डाउनलोड
        </Btn>
      </div>

      {/* Stamp paper preview hint */}
      <div style={{maxWidth:"720px",margin:"12px auto 0",padding:"0 16px"}}>
        <div style={{background:T.goldD,border:`1px solid ${T.gold}44`,borderRadius:"10px",padding:"10px 16px",
          display:"flex",gap:"12px",alignItems:"center",fontSize:"12px",color:T.cream+"bb"}}>
          <div style={{fontSize:"20px"}}>📄</div>
          <div>
            <b style={{color:T.gold}}>स्टांप पेपर फॉर्मेट:</b> प्रिंट केल्यावर वरचे <b>18.5 cm</b> रिकामे राहील (तिथे आधीच स्टांप छापलेला असतो) • खाली <b>0.5 inch</b> मार्जिन • <b>A4</b> आकार
          </div>
        </div>
      </div>

      <div style={{maxWidth:"720px",margin:"0 auto",padding:"16px"}}>
        <div style={{background:"#fffef9",border:`1px solid ${T.bdr}`,borderRadius:"12px",padding:"24px",
          color:"#1a1a1a",fontFamily:F,fontSize:"13px",lineHeight:2.1,whiteSpace:"pre-wrap",
          maxHeight:"70vh",overflowY:"auto"}}>
          <div style={{background:"#f0e8d0",padding:"8px 16px",borderRadius:"6px",marginBottom:"20px",
            fontSize:"10px",color:"#666",textAlign:"center",fontStyle:"italic"}}>
            ↑ वरील 18.5 cm — प्री-प्रिंटेड स्टांप पेपर (रिकामे राहील) ↑
          </div>
          {docTxt}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );

  return null;
}
