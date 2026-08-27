"use client";

import { glossarySections } from "@/lib/glossary";

export default function GlossaryModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Prozessor, Grafikkarte &amp; Co. einfach erklärt</h2>
          <button className="btn-close" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        <p className="modal-intro">
          Kurze Erklärungen zu den wichtigsten Komponenten – inklusive Richtwerten, an denen du
          dich orientieren kannst.
        </p>
        <div className="glossary-list">
          {glossarySections.map((section) => (
            <div key={section.key} className="glossary-section">
              <h3>{section.title}</h3>
              <p>{section.intro}</p>
              <ul>
                {section.reference.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
