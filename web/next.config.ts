import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers(){return [{source:"/sharing",headers:[{key:"Referrer-Policy",value:"no-referrer"},{key:"Cache-Control",value:"private, no-store"}]},{source:"/caregiver/:path*",headers:[{key:"Referrer-Policy",value:"no-referrer"},{key:"Cache-Control",value:"private, no-store"}]},{source:"/reminders",headers:[{key:"Referrer-Policy",value:"no-referrer"},{key:"Cache-Control",value:"private, no-store"}]},{source:"/sw.js",headers:[{key:"Cache-Control",value:"no-cache, no-store, must-revalidate"},{key:"Content-Type",value:"application/javascript"}]}];},
};

export default nextConfig;
