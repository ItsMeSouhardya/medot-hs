// Local static visual review only. No app records, auth bypass, or API routes.
import { createServer } from "node:http";
import { readFile,readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const web=fileURLToPath(new URL("../",import.meta.url)),views=resolve(web,"../.superpowers/sdd/2026-10-02-medot-feature-expansion");
const html=new Map();
for(const directory of ["views","ui-views"]){for(const filename of await readdir(resolve(views,directory)).catch(()=>[]))if(/^[a-zA-Z0-9_-]+\.html$/.test(filename))html.set("/"+filename,resolve(views,directory,filename));}
const styles=new Map([["/globals.css",resolve(web,"src/app/globals.css")],["/pharmacy.css",resolve(web,"src/components/pharmacy/pharmacy.css")]]);
createServer(async(request,response)=>{try{
  const pathname=new URL(request.url,"http://localhost:3113").pathname;
  let path=html.get(pathname)??styles.get(pathname),type=pathname.endsWith(".html")?"text/html; charset=utf-8":"text/css; charset=utf-8";
  if(/^\/fonts\/(manrope|noto-sans-bengali|noto-sans-devanagari)\.ttf$/.test(pathname)){path=resolve(web,"public"+pathname);type="font/ttf";}
  if(!path){response.writeHead(404);response.end("Unknown software fixture");return;}
  let bytes=await readFile(path);
  if(pathname.endsWith(".html")&&!bytes.toString().includes("FixtureManrope"))bytes=Buffer.from(bytes.toString().replace("</head>","<style>@font-face{font-family:FixtureManrope;src:url('/fonts/manrope.ttf')}body{--font-heading:FixtureManrope}</style></head>"));
  response.writeHead(200,{"Content-Type":type,"Cache-Control":"no-store"});response.end(bytes);
}catch{response.writeHead(404);response.end("Run the visual fixture export first.");}}).listen(3113,"localhost",()=>console.log(`Static UI fixture review: ${html.size} fixtures at localhost:3113. No application API.`));
