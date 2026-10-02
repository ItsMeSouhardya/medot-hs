const stages = ["Medicine", "Batch and expiry", "Instructions", "Physical review", "Write and activate"];
export default function ProvisionProgress({ current }: { current: number }) {
  return <ol className="provision-progress" aria-label="Provisioning progress">{stages.map((label, index) => <li key={label} aria-current={current === index ? "step" : undefined} className={index < current ? "is-complete" : ""}><span className="step-number" aria-hidden="true">{index + 1}</span><span>{label}</span></li>)}</ol>;
}
