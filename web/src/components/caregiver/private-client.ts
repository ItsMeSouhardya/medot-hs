"use client";
import { useCallback,useEffect,useRef,useState } from "react";
export async function privateRequest<T>(url:string,signal:AbortSignal,method?:string,body?:unknown):Promise<T>{
  const response=await fetch(url,{signal,cache:"no-store",credentials:"same-origin",...(method?{method,headers:{"Content-Type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})}:{})});
  if(!response.ok)throw new Error("PRIVATE_UNAVAILABLE");return await response.json() as T;
}
// One request generation owns the screen. Blur/visibility clears data and
// aborts pending reads or writes; ignored late responses cannot repopulate it.
export function usePrivateResource<T>(url:string,enabled=true){
  const [data,setData]=useState<T|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const controller=useRef<AbortController|null>(null),generation=useRef(0),inFlight=useRef(false);
  const clear=useCallback(()=>{generation.current++;controller.current?.abort();inFlight.current=false;setData(null);setError(false);setBusy(false);},[]);
  const run=useCallback(async <R,>(operation:(signal:AbortSignal)=>Promise<R>,apply?:(value:R)=>void)=>{
    const version=++generation.current;controller.current?.abort();const current=new AbortController();controller.current=current;inFlight.current=true;setBusy(true);setError(false);
    const timeout=setTimeout(()=>current.abort(),10000);
    try{const result=await operation(current.signal);if(version===generation.current&&!current.signal.aborted)apply?.(result);return version===generation.current&&!current.signal.aborted;}
    catch{if(version===generation.current){setData(null);setError(true);}return false;}
    finally{clearTimeout(timeout);if(version===generation.current){inFlight.current=false;setBusy(false);}}
  },[]);
  const refresh=useCallback(()=>run(signal=>privateRequest<T>(url,signal),setData),[url,run]);
  useEffect(()=>{
    if(!enabled)return;
    const currentGeneration=generation;
    const first=setTimeout(()=>void refresh(),0),interval=setInterval(()=>{if(document.visibilityState!=="hidden"&&!inFlight.current)void refresh();},30000);
    const focus=()=>void refresh(),visibility=()=>{if(document.visibilityState==="hidden")clear();else void refresh();};
    window.addEventListener("focus",focus);window.addEventListener("blur",clear);document.addEventListener("visibilitychange",visibility);
    return()=>{clearTimeout(first);clearInterval(interval);currentGeneration.current++;controller.current?.abort();window.removeEventListener("focus",focus);window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",visibility);};
  },[refresh,clear,enabled]);
  return {data,setData,busy,error,clear,run,refresh};
}
