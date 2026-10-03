import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{return {
  name:"MEDOT",short_name:"MEDOT",description:"Accessible medicine records and your chosen reminders.",
  start_url:"/reminders",display:"standalone",background_color:"#edf4ef",theme_color:"#215c50",
  icons:[{src:"/brand/medot-192.png",sizes:"192x192",type:"image/png"},{src:"/brand/medot-512.png",sizes:"512x512",type:"image/png"}],
};}
