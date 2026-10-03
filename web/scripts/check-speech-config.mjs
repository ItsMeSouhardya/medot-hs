import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const key=process.env.ELEVENLABS_API_KEY,model=process.env.ELEVENLABS_MODEL_ID??"eleven_v3";
const report={keyConfigured:!!key,modelConfigured:model==="eleven_v3",voices:{},modelLookup:null,synthesis:null};
async function request(path,options={}){
  try {return await fetch(`https://api.elevenlabs.io${path}`,{...options,headers:{"xi-api-key":key,...options.headers},signal:AbortSignal.timeout(10000)});}catch{return null;}
}
if(key){
  for(const lang of ["en","bn","hi"]){
    const voice=process.env[`ELEVENLABS_VOICE_ID_${lang.toUpperCase()}`];
    const response=voice?await request(`/v1/voices/${encodeURIComponent(voice)}`):null;
    if(response?.body)await response.body.cancel();
    report.voices[lang]={configured:!!voice,status:response?.status??null};
  }
  const models=await request("/v1/models");report.modelLookup={status:models?.status??null,available:false,languages:[]};
  if(models?.ok){const all=await models.json();const chosen=Array.isArray(all)?all.find(item=>item.model_id===model):null;report.modelLookup.available=!!chosen;report.modelLookup.languages=(chosen?.languages??[]).map(item=>item.language_id).filter(id=>["en","bn","hi"].includes(id));}
  if(process.argv.includes("--synthesize")&&report.modelConfigured&&report.voices.en?.status===200){
    const response=await request(`/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID_EN)}?output_format=mp3_44100_128`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"audio/mpeg"},body:JSON.stringify({text:"MEDOT voice configuration check.",model_id:model,language_code:"en"})});
    report.synthesis={status:response?.status??null,audio:false,bytes:0,errorCode:null};
    if(response?.ok&&response.headers.get("content-type")?.startsWith("audio/mpeg")){
      const reader=response.body?.getReader();let size=0;if(reader){for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2*1024*1024){await reader.cancel();break;}}}
      report.synthesis.bytes=size;report.synthesis.audio=size>0&&size<=2*1024*1024;
    }else if(response){try{const body=await response.json();const status=body?.detail?.status;report.synthesis.errorCode=typeof status==="string"&&/^[a-z_]{1,80}$/.test(status)?status:null;}catch{}}
  }
}
console.log(JSON.stringify(report,null,2));
if(!report.keyConfigured||!report.modelConfigured||Object.keys(report.voices).length!==3||Object.values(report.voices).some(voice=>voice.status!==200)||!report.modelLookup?.available||(process.argv.includes("--synthesize")&&!report.synthesis?.audio))process.exitCode=1;
