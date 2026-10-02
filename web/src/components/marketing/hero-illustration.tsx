import MedotLogo from "../brand/medot-logo";
import Icon from "./icon";

export default function HeroIllustration() {
  return (
    <figure className="hero-illustration" aria-label="Concept illustration of a tactile clip on a medicine strip opening a phone record">
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <div className="illustration-note"><span className="note-dot" /> A little dot. A useful connection.</div>
      <svg className="illustration-strip" viewBox="0 0 280 350" fill="none" aria-hidden="true">
        <rect x="35" y="30" width="195" height="285" rx="20" fill="#f3f4ed" stroke="#97afa3" strokeWidth="2" />
        <rect x="44" y="39" width="177" height="267" rx="14" stroke="#c8d6ce" strokeDasharray="3 4" />
        {[85, 155, 225].flatMap(y => [91, 173].map(x => <g key={`${x}-${y}`}><rect x={x - 26} y={y - 16} width="52" height="32" rx="16" fill="#dce5dd" stroke="#a7b9ad" /><path d={`M${x - 15} ${y - 7}h22`} stroke="white" strokeWidth="4" strokeLinecap="round" /></g>))}
        <path d="M118 277h54" stroke="#849b8e" strokeWidth="3" strokeLinecap="round" />
        <rect x="1" y="61" width="69" height="97" rx="19" fill="#215c50" />
        <path d="M18 137h36V89" stroke="#86b2a1" strokeWidth="3" strokeLinecap="round" />
        <circle cx="36" cy="88" r="12" fill="#e4efbe" />
        <circle cx="33" cy="84" r="4" fill="#f5f8e8" />
      </svg>
      <div className="concept-phone" aria-hidden="true">
        <div className="phone-camera" />
        <div className="phone-content"><MedotLogo /><p className="phone-label">A linked record</p><h3>Medicine<br />information</h3><div className="phone-lines"><span /><span /></div><div className="phone-audio"><Icon name="sound" /> Read aloud</div><div className="phone-detail"><span>Recorded instruction</span><span>Labelled expiry</span></div><p className="phone-demo">Interface illustration</p></div>
      </div>
      <div className="illustration-chip"><Icon name="scan" /> NFC tap + QR fallback</div>
      <figcaption>Concept illustration · one clip, one medicine strip</figcaption>
    </figure>
  );
}
