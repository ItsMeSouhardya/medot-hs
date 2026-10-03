import Link from "next/link";
import MedotLogo from "@/components/brand/medot-logo";
import Navbar from "@/components/marketing/navbar";
import { repositoryUrl } from "@/components/marketing/site-links";
import HeroIllustration from "@/components/marketing/hero-illustration";
import LanguagePreview from "@/components/marketing/language-preview";
import Icon from "@/components/marketing/icon";
import { homeDemoHref } from "@/lib/home-demo";
import "@/components/marketing/marketing.css";

export const dynamic = "force-dynamic";

const questions = [
  ["Do I need to install an app?", "The clip stores a web address. A compatible phone opens it in the browser; the medicine page requires no sign-in. Tap Read aloud to start speech. Nothing plays automatically."],
  ["What if my phone cannot read NFC?", "The matching QR label opens the same medicine record. NFC support and the location of the phone’s NFC reader vary, so both methods need to be tested with your phone and clip."],
  ["How does a pharmacist prepare a clip?", "An authorized operator selects a medicine, enters the printed batch and expiry and records reviewed instructions. The new tag stays pending until its written URL is independently read back and verified. Corrections require a new token and withdrawal of the old one."],
  ["Which languages are available?", "Patient pages have English, Bengali and Hindi controls. They read the stored instruction in the selected language, or clearly offer English when its translation is missing. Online ElevenLabs and an explicit device-voice choice are implemented. Each stored instruction still needs its own review; live pronunciation and phone testing remain pending."],
  ["What happens if a tag is withdrawn or the network fails?", "A revoked tag no longer shows a medicine identity. If the record cannot be loaded, the page asks you to check your connection and verify the strip with a pharmacist. The current prototype needs a connection to retrieve the record."],
];

export default async function Home({ searchParams }: { searchParams?: Promise<{ preview?: string }> }) {
  const href = await homeDemoHref();
  const isLiveDemo = href.startsWith("/m/");
  const preview = (await searchParams)?.preview;
  const initialLanguage = preview === "bn" || preview === "hi" ? preview : "en";
  return (
    <div className="marketing-site">
      <Navbar />
      <main className="marketing-page" id="home-content" tabIndex={-1}>
        <section className="marketing-hero marketing-container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="marketing-eyebrow"><span /> Accessible medicine information</p>
            <h1 id="hero-title">A small touch.<br />A clearer <em>medicine routine.</em></h1>
            <p className="hero-description">Find the raised marker, tap your phone, and hear the medicine details recorded by your pharmacist.</p>
            <div className="marketing-actions"><Link className="marketing-button primary" href="/pharmacy">Open pharmacy portal <Icon name="arrow" /></Link><Link className="marketing-button secondary" href={href}>{isLiveDemo ? "Explore the demo" : "Explore the preview"} <Icon name="arrow" /></Link></div>
            <div className="hero-languages" aria-label="Language interface previews"><span>English</span><span lang="bn">বাংলা</span><span lang="hi">हिन्दी</span><span className="language-note">Three scripts. One idea.</span></div>
            <p className="hero-disclaimer">A hackathon prototype. Multilingual patient controls and voice commands are implemented; live voice and phone checks remain pending.</p>
          </div>
          <HeroIllustration />
        </section>

        <div className="purpose-band">
          <div className="marketing-container purpose-grid">
            <div><Icon name="touch" /><p><strong>Designed to be found</strong><span>A raised dot you can feel.</span></p></div>
            <div><Icon name="sound" /><p><strong>Information you can hear</strong><span>Recorded details, read on request.</span></p></div>
            <div><Icon name="scan" /><p><strong>One strip. One linked record.</strong><span>NFC and QR open the same URL.</span></p></div>
          </div>
        </div>

        <section className="marketing-section marketing-container" id="how-it-works" tabIndex={-1} aria-labelledby="how-title">
          <div className="section-intro"><p className="marketing-eyebrow">From something you feel to something you hear</p><h2 id="how-title">A familiar routine.<br />A little more clarity.</h2><p>The clip connects a physical medicine strip to information prepared by a pharmacist.</p></div>
          <div className="how-grid">{[
            { number: "01", icon: "touch" as const, title: "Find the dot", description: "Feel the raised marker on the reusable clip attached to the strip." },
            { number: "02", icon: "scan" as const, title: "Tap the clip", description: "Hold an NFC-enabled phone near the clip. A matching QR label provides another way in." },
            { number: "03", icon: "sound" as const, title: "Hear the record", description: "Open the linked page and choose Read aloud. The written record stays available to read." },
          ].map(step => <article className="how-card" key={step.number}><div className="how-card-top"><span>{step.number}</span><Icon name={step.icon} /></div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
          <p className="preparation-note"><Icon name="check" /> Prepared first: select, record, review, write, independently read back, then activate.</p>
        </section>

        <section className="audience-section" id="for-pharmacies" tabIndex={-1} aria-label="For people and pharmacies">
          <div className="marketing-container audience-grid">
            <article className="audience-panel patient-panel"><p className="marketing-eyebrow">For people using a medicine strip</p><h2>A record within reach.</h2><p>Keep the medicine identity, recorded instruction and labelled expiry together, with no patient sign-in.</p><ul><li><Icon name="check" /> A tactile starting point</li><li><Icon name="check" /> Written details alongside speech</li><li><Icon name="check" /> Clear pending, revoked and expiry states</li></ul><Link className="marketing-text-link" href={href}>{isLiveDemo ? "Open the fictional demo record" : "See the illustrative interface"} <Icon name="arrow" /></Link></article>
            <article className="audience-panel pharmacy-panel"><p className="marketing-eyebrow">For pharmacies</p><h2>Small steps.<br />Careful connections.</h2><p>Sign in to provision a clip, review its record and verify the physical readback before activation.</p><div className="workflow-chips"><span>Medicine</span><Icon name="arrow" /><span>Review</span><Icon name="arrow" /><span>Readback</span></div><p className="workflow-note">Resume pending work. Withdraw a tag when the recorded details need correcting.</p><Link className="marketing-text-link" href="/pharmacy">Go to the pharmacy workspace <Icon name="arrow" /></Link></article>
          </div>
        </section>

        <section className="marketing-section marketing-container accessibility-grid" id="accessibility" tabIndex={-1} aria-labelledby="accessibility-title">
          <div className="accessibility-copy"><p className="marketing-eyebrow">Clarity, in a familiar script</p><h2 id="accessibility-title">Designed around<br />the person reading.</h2><p>Large controls, readable text and deliberate speech actions keep the medicine record at the centre of the experience.</p><ul className="accessibility-list"><li><Icon name="check" /><span><strong>Read, then listen</strong>Speech starts when you ask. The transcript remains on screen.</span></li><li><Icon name="check" /><span><strong>Instructions stay as recorded</strong>No automatic prescription translation or generated doses.</span></li><li><Icon name="check" /><span><strong>Built for keyboard and screen readers</strong>Named controls, visible focus and structured information. Device testing is still pending.</span></li></ul><p className="language-progress">Patient controls support all three scripts, with explicit English fallback for missing stored translations. This illustration is an interface preview. Interface text is reviewed; stored instructions, live pronunciation and phone behavior require separate checks.</p></div>
          <LanguagePreview key={initialLanguage} initialLanguage={initialLanguage} />
        </section>

        <section className="marketing-container responsible-panel" aria-labelledby="demo-title"><div><p className="marketing-eyebrow">Hackathon demo only</p><h2 id="demo-title">A linked record.<br />A clear boundary.</h2></div><div><p>MEDOT reads information recorded against a strip. It does not verify medicine authenticity, determine a dose or replace a pharmacist’s guidance.</p><p>{isLiveDemo ? "The demo opens an explicitly configured fictional sample. It is not a prescription for a real person." : "No active fictional sample is configured. Explore the local illustration while verified demo records are prepared."}</p><Link className="marketing-text-link" href={href}>{isLiveDemo ? "Explore the fictional demo" : "Explore the interface preview"} <Icon name="arrow" /></Link></div></section>

        <section className="marketing-section marketing-container faq-section" id="faq" tabIndex={-1} aria-labelledby="faq-title"><div className="section-intro"><p className="marketing-eyebrow">A few useful answers</p><h2 id="faq-title">Before the first tap.</h2></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary><span>{question}</span><Icon name="chevron" /></summary><p>{answer}</p></details>)}</div></section>

        <section className="final-cta"><div className="marketing-container"><MedotLogo variant="mark" /><h2>Make the next strip<br />easier to identify.</h2><p>Start with a carefully recorded sample and a verified connection.</p><Link className="marketing-button primary" href="/pharmacy">Open pharmacy portal <Icon name="arrow" /></Link></div></section>
      </main>
      <footer className="marketing-footer marketing-container"><div><Link href="/" aria-label="MEDOT home"><MedotLogo /></Link><p>Accessible information.<br />One medicine strip at a time.</p></div><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><a href={repositoryUrl}>GitHub</a></nav><p className="footer-note">A hackathon prototype.<br />Demo records only. No patient identifiers.</p></footer>
    </div>
  );
}
