import Link from "next/link";
import MedotLogo from "@/components/brand/medot-logo";
export default function NotFound(){return <main className="patient-page"><Link className="page-brand" href="/" aria-label="MEDOT home"><MedotLogo/></Link><p className="eyebrow">Page unavailable</p><h1>We could not find this page.</h1><p>Check the address, or return to MEDOT. To identify a medicine, open the link from its MEDOT tag.</p><Link className="button-link" href="/">Return to MEDOT</Link></main>;}
