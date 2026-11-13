export default async (request) => {
 const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method!=='POST')return respond(405,{error:'Csak POST kérés engedélyezett.'});
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return respond(401,{error:'Bejelentkezés szükséges.'});
 const supa=process.env.SUPABASE_URL||'https://dlqinyhxpemzdrgwqsxk.supabase.co';
 const anon=process.env.SUPABASE_ANON_KEY;
 const apiKey=process.env.OPENAI_API_KEY;
 if(!anon||!apiKey)return respond(503,{error:'A szerveroldali OPENAI_API_KEY és SUPABASE_ANON_KEY beállítása szükséges a Netlify környezeti változókban.'});
 try{
  const auth=await fetch(`${supa}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:anon}});
  if(!auth.ok)return respond(401,{error:'Érvénytelen vagy lejárt bejelentkezés.'});
  const raw=await request.text();if(raw.length>12000)return respond(413,{error:'Túl nagy kérés.'});
  const input=JSON.parse(raw);const language=['hu','en','fr','de'].includes(input.language)?input.language:'hu';
   const languageName={hu:'Hungarian',en:'English',fr:'French',de:'German'}[language];
   if(input.action==='translate'){
     const items=input.entries;
     if(!Array.isArray(items)||items.length>80||items.some(e=>typeof e.name!=='string'||typeof e.details!=='string'||typeof e.pace!=='string'))return respond(400,{error:'Invalid translation input'});
     const prompt='Translate the following running workout fields into '+languageName+'. Preserve workout order, numeric quantities, dates, distances and pace values. Return a JSON object with entries array, each item having name, details, pace. Do not add or omit workouts. Input: '+JSON.stringify(items);
     const ai=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a precise sports training translator. Return only valid JSON. Never alter numerical training prescriptions.'},{role:'user',content:prompt}]})});
     const result=await ai.json();if(!ai.ok)return respond(502,{error:result.error?.message||'AI translation failed'});
     const parsed=JSON.parse(result.choices?.[0]?.message?.content||'{}');if(!Array.isArray(parsed.entries)||parsed.entries.length!==items.length)return respond(502,{error:'Invalid translation response'});
     return respond(200,{entries:parsed.entries.map(e=>({name:String(e.name||''),details:String(e.details||''),pace:String(e.pace||'')}))});
   }
   const {meta}=input;if(!meta||typeof meta!=='object')return respond(400,{error:'Hiányzó tervadatok.'});
  const weeks=Number(meta.weeks),days=Number(meta.days),race=Number(meta.race),current=Number(meta.current),long=Number(meta.long);
  if(!Number.isInteger(weeks)||weeks<2||weeks>16||![3,4].includes(days)||!Number.isFinite(race)||race<5||race>43||current<5||current>160||long<2||long>42||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(meta.start||''))return respond(400,{error:'Érvénytelen edzésterv-beállítások.'});
  // Each invocation generates at most two weeks. The browser combines chunks after all succeed.
  const chunkStart=Number(input.chunkStart??0),chunkWeeks=Number(input.chunkWeeks??weeks);
  if(!Number.isInteger(chunkStart)||!Number.isInteger(chunkWeeks)||chunkStart<0||chunkWeeks<1||chunkWeeks>2||chunkStart+chunkWeeks>weeks)return respond(400,{error:'Érvénytelen AI tervrészlet.'});
  const startDate=new Date(meta.start+'T12:00:00Z');
  if(Number.isNaN(startDate.getTime()))return respond(400,{error:'Érvénytelen kezdődátum.'});
  startDate.setUTCDate(startDate.getUTCDate()+chunkStart*7);
  const chunkDate=startDate.toISOString().slice(0,10);
  const prompt=`Készíts ${languageName} nyelvű, személyre szabott futóedzéstervet. Minden szöveges mező ${languageName} nyelvű legyen. Paraméterek: ${JSON.stringify({start:meta.start,weeks,days,race,goal:String(meta.goal||'').slice(0,12),current,long,load:meta.load})}. Minden hétre ${days} edzést adj, a dátumok a kezdődátumtól induló ${weeks} egymást követő 7 napos időszakba essenek. A célverseny kizárólag a TELJES terv utolsó hetének utolsó edzése legyen, más tervrészletben ne legyen verseny. Csak egy intenzívebb edzés hetente; fokozatos terhelés, megfelelő regeneráció, verseny előtti taper. Ne írj elő irreális hirtelen távemelést, a jelenlegi heti km és a leghosszabb futás figyelembevételével. Tempókat ne kezeld biztosnak, inkább terhelésérzet alapján adj alternatívát. A principles mezőben ${languageName} nyelven adj külön sorokban könnyű, tempó, hosszú és verseny tempózónákat, edzéselveket, az egyéni bizonytalanságot is jelezve. Minden edzéshez legyen dátum YYYY-MM-DD, név, típus (easy,tempo,long,race,rest), km szám, pace perc/km szöveg és details leírás. Minden futóedzéshez adj külön paceFrom és paceTo mezőt mm:ss formátumban, perc/km egységben (például 5:30 és 6:00), és pace mezőt is pontosan '5:30–6:00' formában. A paceFrom a gyorsabb (kisebb), a paceTo a lassabb (nagyobb) tempó; a két érték legyen életszerű tartomány, az edzés típusához és a célidőhöz igazítva. Könnyű, hosszú, tempó és versenyfutásra eltérő, reális tartományokat adj. Pihenőnél a paceFrom, paceTo és pace legyen üres karakterlánc.  A details mező minden egyes edzésnél legyen konkrét, önmagában is végrehajtható edzői útmutató ${languageName} nyelven (javasolt 250–650 karakter, maximum 1800). A könnyű futásoknál röviden írd le az intenzitást, a tempó vagy beszédteszt alapú végrehajtást és a célt. Tempó-, résztávos és hosszú edzéseknél külön sorokban, egyértelműen add meg a bemelegítést, fő részt és levezetést, a szakaszok távját, céltempóját vagy érzékelt erőfeszítését és az edzés célját. A szakaszok távolságainak összege pontosan a km mező értéke legyen; ne adj hozzá plusz kilométereket vagy ismétléseket. Versenynél adj visszafogott rajt- és frissítési tanácsot, de ne növeld meg a versenytávot. Minden edzés leírása az adott naphoz és az előző/következő napok terheléséhez igazodjon, ne legyen sablonos. Ne írj elő egészségügyi kockázatot növelő túlterhelést; szükség esetén ajánlj pihenést vagy csökkentett intenzitást. A details csak az edzésre vonatkozó szöveg legyen, ne HTML és ne Markdown-tábla. JSON objektumot adj vissza.`;
     // Generate and validate the entire plan; retry once with targeted feedback if incomplete.
   const expected=chunkWeeks*days;
   const requestPlan=async(messages)=>{
     const ai=await fetch('https://api.openai.com/v1/chat/completions',{
       method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
       body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.3,
         response_format:{type:'json_object'},messages})
     });
     const result=await ai.json();
     if(!ai.ok)throw new Error('AI szolgáltatás hiba: '+(result.error?.message||ai.status));
     const choice=result.choices?.[0];
     if(choice?.finish_reason==='length')return {data:null,reason:'A válasz túl hosszú volt és megszakadt.'};
     try{return {data:JSON.parse(choice?.message?.content||'{}'),reason:''};}
     catch{return {data:null,reason:'Az AI válasza nem volt érvényes JSON.'};}
   };
   const invalid=(data)=>{
     if(!data||!Array.isArray(data.entries)||typeof data.principles!=='string')return 'Hiányzó entries tömb vagy principles szöveg.';
     const validPace=v=>typeof v==='string'&&/^\\d{1,2}:[0-5]\\d$/.test(v)&&Number(v.split(':')[0])*60+Number(v.split(':')[1])>=180;
     const toSeconds=v=>Number(v.split(':')[0])*60+Number(v.split(':')[1]);
     if(data.entries.length!==expected)return `Az edzések száma ${data.entries.length}, elvárt ${expected}.`;
     const bad=data.entries.map((e,i)=>!e||typeof e.details!=='string'||e.details.trim().length<45||e.details.length>2000?i+1:null).filter(Boolean);
     if(bad.length)return `Hiányzó vagy túl rövid/hosszú részletes leírás az edzéseknél: ${bad.join(', ')}.`;
     const badPace=data.entries.map((e,i)=>e?.type==='rest'?null:(!validPace(e?.paceFrom)||!validPace(e?.paceTo)||toSeconds(e.paceFrom)>toSeconds(e.paceTo)?i+1:null)).filter(Boolean);
     return badPace.length?`Hiányzó vagy hibás céltempó-tartomány az edzéseknél: ${badPace.join(', ')}.`:'';
   };
   const messages=[
     {role:'system',content:'Tapasztalt, óvatos futóedző vagy. Kizárólag érvényes JSON objektumot adj, entries tömbbel és principles szöveggel. Ne állíts orvosi diagnózist. Minden egyes edzéshez legalább 45 karakter hosszú details szükséges.'},
     {role:'user',content:prompt+` Most KIZÁRÓLAG a teljes terv ${chunkStart+1}. hetétől a ${chunkStart+chunkWeeks}. hetéig dolgozz ki ${chunkWeeks} hetet, a részlet kezdete ${chunkDate}, minden héten ${days} futónappal. A többi hét edzéseit ne add vissza. A fokozatos terhelést a teljes ${weeks} hetes terv és az aktuális hét sorszáma alapján tervezd. Pontosan ${expected} edzést adj. Minden entries elemhez add meg a date, name, type, km, paceFrom, paceTo, pace és details mezőket. A JSON válasz legyen tömör, de minden details legyen önállóan végrehajtható, legalább 45 karakter.`}
   ];
   let response=await requestPlan(messages);
   let issue=response.reason||invalid(response.data);
   if(issue){
     // One corrective generation; do not modify or save any existing plan on failure.
     const correction=`Az előző válasz nem megfelelő: ${issue} Készítsd el újra a TELJES tervet. Pontosan ${expected} edzés szükséges, mindegyikhez 45–900 karakteres konkrét details leírással. Válasz: JSON objektum entries és principles mezőkkel; minden futóedzésnél érvényes paceFrom és paceTo mezővel.`;
     response=await requestPlan([...messages,{role:'user',content:correction}]);
     issue=response.reason||invalid(response.data);
   }
   if(issue)return respond(502,{error:'Az AI kétszeri próbálkozás után sem adott teljes edzéstervet: '+issue+' A meglévő terv nem változott.'});
   const data=response.data;
return respond(200,{entries:data.entries,principles:data.principles,chunkStart,chunkWeeks});
 }catch(e){return respond(500,{error:'Szerverhiba: '+e.message})}
};
export const config={path:'/.netlify/functions/training-ai'};
