/* Push only: never cache medicine records, audio, credentials or private pages. */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
const messages={
  en:["MEDOT reminder","It is time for your chosen reminder. Open MEDOT to review your recorded medicine information."],
  bn:["MEDOT মনে করিয়ে দিচ্ছে","আপনার নির্ধারিত মনে করানোর সময় হয়েছে। ওষুধের সংরক্ষিত তথ্য দেখতে MEDOT খুলুন।"],
  hi:["MEDOT अनुस्मारक","आपके चुने हुए अनुस्मारक का समय हो गया है। दवा की दर्ज जानकारी देखने के लिए MEDOT खोलें।"],
};
self.addEventListener("push",event=>{
  let language="en";try{const requested=event.data?.json()?.language;if(["en","bn","hi"].includes(requested))language=requested;}catch{}
  const [title,body]=messages[language];
  event.waitUntil(self.registration.showNotification(title,{body,icon:"/brand/medot-192.png",badge:"/brand/medot-192.png",lang:language,data:{url:"/reminders"}}));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();const url=new URL("/reminders",self.location.origin).href;
  event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const existing=clients.find(client=>client.url===url);
    if(existing)return existing.focus();return self.clients.openWindow(url);
  })());
});
