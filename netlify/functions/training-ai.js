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
  const {meta}=JSON.parse(raw);if(!meta||typeof meta!=='object')return respond(400,{error:'Hiányzó tervadatok.'});
  const weeks=Number(meta.weeks),days=Number(meta.days),race=Number(meta.race),current=Number(meta.current),long=Number(meta.long);
  if(!Number.isInteger(weeks)||weeks<2||weeks>16||![3,4].includes(days)||!Number.isFinite(race)||race<5||race>43||current<5||current>160||long<2||long>42||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(meta.start||''))return respond(400,{error:'Érvénytelen edzésterv-beállítások.'});
  const prompt=`Készíts magyar nyelvű, személyre szabott futóedzéstervet. Paraméterek: ${JSON.stringify({start:meta.start,weeks,days,race,goal:String(meta.goal||'').slice(0,12),current,long,load:meta.load})}. Minden hétre ${days} edzést adj, a dátumok a kezdődátumtól induló ${weeks} egymást követő 7 napos időszakba essenek. A célverseny az utolsó hét utolsó edzése legyen. Csak egy intenzívebb edzés hetente; fokozatos terhelés, megfelelő regeneráció, verseny előtti taper. Ne írj elő irreális hirtelen távemelést, a jelenlegi heti km és a leghosszabb futás figyelembevételével. Tempókat ne kezeld biztosnak, inkább terhelésérzet alapján adj alternatívát. A principles mezőben magyarul adj külön sorokban könnyű, tempó, hosszú és verseny tempózónákat, edzéselveket, az egyéni bizonytalanságot is jelezve. Minden edzéshez legyen dátum YYYY-MM-DD, név, típus (easy,tempo,long,race,rest), km szám, pace perc/km szöveg és details leírás. JSON objektumot adj vissza.`;
  const ai=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.3,response_format:{type:'json_object'},messages:[{role:'system',content:'Tapasztalt, óvatos futóedző vagy. Kizárólag érvényes JSON objektumot adj, entries tömbbel és principles szöveggel. Ne állíts orvosi diagnózist.'},{role:'user',content:prompt}]})});
  const result=await ai.json();if(!ai.ok)return respond(502,{error:'AI szolgáltatás hiba: '+(result.error?.message||ai.status)});
  const data=JSON.parse(result.choices?.[0]?.message?.content||'{}');if(!Array.isArray(data.entries)||typeof data.principles!=='string')return respond(502,{error:'Az AI nem megfelelő formátumot adott vissza.'});
  return respond(200,{entries:data.entries,principles:data.principles});
 }catch(e){return respond(500,{error:'Szerverhiba: '+e.message})}
};
export const config={path:'/.netlify/functions/training-ai'};
