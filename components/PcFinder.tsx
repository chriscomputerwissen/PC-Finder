"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Answers,
  deviceTypeOptions,
  gamingLevelOptions,
  lifespanOptions,
  mobilityImportanceLabels,
  osOptions,
  useCaseOptions
} from "@/lib/questions";
import { ScoredProduct } from "@/lib/scoring";
import { getMatches } from "@/app/actions";
import GlossaryModal from "./GlossaryModal";

const WINDOWS_INSTALL_URL = "https://cfc-digital.de/kapitel-2";
const WINDOWS_BASICS_URL = "https://cfc-digital.de/kapitel-1";
const BUDGET_STEP = 50;

// Amazon-Partner-Tag (cfc-digital-21). Da kein Produktabgleich mit Amazon
// stattfindet (keine PA-API-Anbindung, siehe Projekt-Doku), verlinken wir
// bewusst nur auf eine Amazon-Suche mit dem exakten Produktnamen statt auf
// eine konkrete Produktseite – wir kennen die ASIN des Geräts nicht.
const AMAZON_ASSOCIATE_TAG = "cfc-digital-21";

function buildAmazonSearchUrl(productName: string): string {
  return `https://www.amazon.de/s?k=${encodeURIComponent(productName)}&tag=${AMAZON_ASSOCIATE_TAG}`;
}

type StepId = "useCase" | "gamingLevel" | "deviceType" | "os" | "mobility" | "budget" | "lifespan" | "result";

const BASE_STEPS: StepId[] = ["useCase", "deviceType", "os", "mobility", "budget", "lifespan", "result"];

export default function PcFinder() {
  const [answers, setAnswers] = useState<Partial<Answers>>({
    mobilityImportance: 3,
    budget: 800
  });
  const [stepIndex, setStepIndex] = useState(0);

  // Die Gaming-Level-Frage blenden wir nur ein, wenn "Gaming" gewählt wurde.
  // Die Mobilitäts-Frage ergibt bei einem gewünschten Desktop-PC keinen Sinn
  // und wird dann übersprungen.
  const steps = useMemo<StepId[]>(() => {
    let s = [...BASE_STEPS];
    if (answers.useCase === "gaming") {
      s.splice(1, 0, "gamingLevel");
    }
    if (answers.deviceType === "desktop") {
      s = s.filter((step) => step !== "mobility");
    }
    return s;
  }, [answers.useCase, answers.deviceType]);

  const currentStep = steps[stepIndex];
  const isResultStep = currentStep === "result";
  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 100);

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function restart() {
    setAnswers({ mobilityImportance: 3, budget: 800 });
    setStepIndex(0);
  }

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case "useCase":
        return !!answers.useCase;
      case "gamingLevel":
        return !!answers.gamingLevel;
      case "deviceType":
        return !!answers.deviceType;
      case "os":
        return !!answers.os;
      default:
        return true;
    }
  };

  const [results, setResults] = useState<ScoredProduct[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Das eigentliche Matching läuft jetzt serverseitig über eine Server
  // Action (app/actions.ts), statt direkt im Browser gegen eine als Prop
  // übergebene Produktliste zu rechnen. Grund: seit Otto/Cyberport zum
  // Awin-Feed dazugekommen sind, umfasst der Katalog ca. 44.000 Produkte –
  // den kompletten Katalog an den Client zu übergeben würde die Seite
  // unbrauchbar groß machen (siehe PC-Finder-Konzept.md, achte Runde).
  useEffect(() => {
    if (!isResultStep) return;

    const completeAnswers: Answers = {
      useCase: answers.useCase ?? "office",
      gamingLevel: answers.gamingLevel,
      deviceType: answers.deviceType ?? "egal",
      os: answers.os ?? "egal",
      mobilityImportance: answers.mobilityImportance ?? 3,
      budget: answers.budget ?? 800,
      lifespan: answers.lifespan ?? "kurz"
    };

    let cancelled = false;
    setIsMatching(true);
    setMatchError(null);

    getMatches(completeAnswers)
      .then((matched) => {
        if (!cancelled) setResults(matched);
      })
      .catch(() => {
        if (!cancelled) {
          setMatchError("Die Empfehlung konnte gerade nicht geladen werden. Versuch es bitte nochmal.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsMatching(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isResultStep,
    answers.useCase,
    answers.gamingLevel,
    answers.deviceType,
    answers.os,
    answers.mobilityImportance,
    answers.budget,
    answers.lifespan
  ]);

  return (
    <div>
      {!isResultStep && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {currentStep === "useCase" && (
        <div className="card">
          <h2 className="question-title">Wofür wird der PC hauptsächlich gebraucht?</h2>
          <p className="question-sub">Wähl das, was am ehesten zutrifft – der Rest ergibt sich daraus.</p>
          <div className="option-grid">
            {useCaseOptions.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${answers.useCase === opt.value ? "selected" : ""}`}
                onClick={() => update("useCase", opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === "gamingLevel" && (
        <div className="card">
          <h2 className="question-title">Wie anspruchsvoll wird gezockt?</h2>
          <p className="question-sub">Das entscheidet, ob eine starke Grafikkarte nötig ist.</p>
          <div className="option-grid">
            {gamingLevelOptions.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${answers.gamingLevel === opt.value ? "selected" : ""}`}
                onClick={() => update("gamingLevel", opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === "deviceType" && (
        <div className="card">
          <h2 className="question-title">Laptop oder Desktop-PC?</h2>
          <p className="question-sub">Falls unsicher, zeigen wir dir gleich beide Varianten.</p>
          <div className="option-grid">
            {deviceTypeOptions.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${answers.deviceType === opt.value ? "selected" : ""}`}
                onClick={() => update("deviceType", opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === "os" && (
        <div className="card">
          <h2 className="question-title">Welches Betriebssystem soll es sein?</h2>
          <p className="question-sub">
            Windows läuft auf den meisten Geräten, macOS nur auf Apple-Geräten. Ohne
            Betriebssystem ist meist günstiger.
          </p>
          <div className="option-grid">
            {osOptions.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${answers.os === opt.value ? "selected" : ""}`}
                onClick={() => update("os", opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === "mobility" && (
        <div className="card">
          <h2 className="question-title">Wie wichtig ist dir Mobilität?</h2>
          <p className="question-sub">
            Also: möglichst leicht, lange Akkulaufzeit, überall einsatzbereit.
          </p>
          <div className="slider-wrap">
            <div className="slider-value">
              {mobilityImportanceLabels[answers.mobilityImportance ?? 3]} ({answers.mobilityImportance ?? 3}/5)
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={answers.mobilityImportance ?? 3}
              onChange={(e) => update("mobilityImportance", Number(e.target.value) as Answers["mobilityImportance"])}
            />
          </div>
        </div>
      )}

      {currentStep === "budget" && (
        <div className="card">
          <h2 className="question-title">Wie viel möchtest du ungefähr ausgeben?</h2>
          <p className="question-sub">Kein Problem, das später noch etwas anzupassen.</p>
          <div className="slider-wrap">
            <div className="slider-value">{(answers.budget ?? 800).toLocaleString("de-DE")} €</div>
            <input
              type="range"
              min={300}
              max={2500}
              step={50}
              value={answers.budget ?? 800}
              onChange={(e) => update("budget", Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {currentStep === "lifespan" && (
        <div className="card">
          <h2 className="question-title">Wie lange soll der PC durchhalten?</h2>
          <p className="question-sub">Das beeinflusst, wie viel Leistungsreserve sinnvoll ist.</p>
          <div className="option-grid">
            {lifespanOptions.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${answers.lifespan === opt.value ? "selected" : ""}`}
                onClick={() => update("lifespan", opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isResultStep && (
        <div className="nav-row">
          <button className="btn btn-ghost" onClick={goBack} disabled={stepIndex === 0}>
            Zurück
          </button>
          <button className="btn btn-primary" onClick={goNext} disabled={!canAdvance()}>
            Weiter
          </button>
        </div>
      )}

      {isResultStep && matchError && (
        <div className="card">
          <p>{matchError}</p>
          <button className="btn btn-ghost" onClick={restart}>
            Nochmal von vorn
          </button>
        </div>
      )}

      {isResultStep && !matchError && isMatching && results.length === 0 && (
        <div className="card">
          <p>Wir suchen die passenden Geräte für dich …</p>
        </div>
      )}

      {isResultStep && !matchError && results.length > 0 && (
        <ResultView
          results={results}
          isRefreshing={isMatching}
          onRestart={restart}
          budget={answers.budget ?? 800}
          onBudgetChange={(newBudget) => update("budget", newBudget)}
        />
      )}
    </div>
  );
}

function ResultView({
  results,
  isRefreshing,
  onRestart,
  budget,
  onBudgetChange
}: {
  results: ScoredProduct[];
  isRefreshing: boolean;
  onRestart: () => void;
  budget: number;
  onBudgetChange: (newBudget: number) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const topResult = results[0];
  const hasFullMatch = !!topResult?.fullMatch;

  // Wenn wirklich JEDE angezeigte Empfehlung über dem Budget liegt, bringt es
  // nichts, das nur pro Karte einzeln anzuzeigen – stattdessen ein zentraler,
  // gut sichtbarer Hinweis samt Regler, um das Budget direkt hier anzupassen
  // (Nutzer-Feedback 28.08.2026: "nichts für den Preis gefunden, ändere dein
  // Budget" statt zurück zum Anfang der Fragen zu müssen).
  const allOverBudget = results.length > 0 && results.every((r) => r.product.price > budget);

  return (
    <div>
      <div className="results-intro">
        <h2>{hasFullMatch ? "Das passt zu dir" : "Keine 100%-Übereinstimmung gefunden"}</h2>
        {hasFullMatch ? (
          <p>Basierend auf deinen Antworten sind das unsere Top-Empfehlungen.</p>
        ) : (
          <p>
            Kein Gerät im Katalog erfüllt aktuell wirklich alle deine Wünsche. Hier die besten
            Alternativen, sortiert nach Gesamtpunktzahl und Preis:
          </p>
        )}
        <button className="btn-link" onClick={() => setGlossaryOpen(true)}>
          ⓘ Was bedeuten Prozessor, Grafikkarte &amp; Co.?
        </button>
        {isRefreshing && <p className="data-note">Aktualisiere Empfehlung …</p>}
      </div>

      <div className="budget-editor">
        {allOverBudget ? (
          <p className="budget-editor-title budget-editor-title-warning">
            ⚠ Für {budget.toLocaleString("de-DE")} € haben wir nichts Passendes gefunden – ändere
            dein Budget:
          </p>
        ) : (
          <p className="budget-editor-title">Dein Budget</p>
        )}
        <div className="slider-wrap">
          <div className="slider-value">{budget.toLocaleString("de-DE")} €</div>
          <input
            type="range"
            min={300}
            max={2500}
            step={BUDGET_STEP}
            value={budget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="result-list">
        {results.map((r, idx) => {
          const isOpen = expandedId === r.product.id;
          const topReasons = r.reasons.slice(0, 3);
          const overBudget = r.product.price > budget;
          const suggestedBudget = Math.ceil(r.product.price / BUDGET_STEP) * BUDGET_STEP;
          return (
            <div key={r.product.id} className={`result-card ${idx === 0 ? "top" : ""}`}>
              {idx === 0 && (
                <span className="badge">
                  {hasFullMatch ? "Beste Wahl für dich" : "Beste verfügbare Alternative"}
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.product.imageUrl} alt={r.product.name} referrerPolicy="no-referrer" />
              <div>
                <h3>{r.product.name}</h3>
                <div className="result-price">{r.product.price.toLocaleString("de-DE")} €</div>
                <div className="shop-line">Erhältlich bei {r.product.shop}</div>
                {r.product.alternativeOffers && r.product.alternativeOffers.length > 0 && (
                  <div className="price-compare">
                    ✓ Preisvergleich: bei {r.product.alternativeOffers[0].shop} aktuell{" "}
                    {r.product.alternativeOffers[0].price.toLocaleString("de-DE")} € – hier sparst du{" "}
                    {(r.product.alternativeOffers[0].price - r.product.price).toLocaleString("de-DE")} €.
                  </div>
                )}
                <div className="match-score">
                  Gesamtwertung: {Math.round((r.totalScore / r.maxScore) * 100)}% Übereinstimmung
                </div>
                {overBudget && (
                  <div className="budget-warning">
                    <p className="budget-warning-text">
                      ⚠ Liegt {(r.product.price - budget).toLocaleString("de-DE")} € über deinem
                      Budget von {budget.toLocaleString("de-DE")} €.
                    </p>
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => onBudgetChange(suggestedBudget)}
                    >
                      Budget auf {suggestedBudget.toLocaleString("de-DE")} € erhöhen
                    </button>
                  </div>
                )}
                <p className="result-pitch">{r.product.shortPitch}</p>
                {r.product.os === "ohne" && (
                  <div className="os-hint">
                    <p className="os-hint-text">
                      Dieses Gerät kommt ohne Betriebssystem. Mit meinem
                      Schritt-für-Schritt-Assistenten installierst du Windows kinderleicht:
                    </p>
                    <a className="cfc-link" href={WINDOWS_INSTALL_URL} target="_blank" rel="noopener noreferrer">
                      → Windows installieren (Assistent)
                    </a>
                  </div>
                )}
                {r.product.os === "windows" && (
                  <div className="os-hint">
                    <p className="os-hint-text">Noch nicht vertraut mit Windows 11?</p>
                    <a className="cfc-link" href={WINDOWS_BASICS_URL} target="_blank" rel="noopener noreferrer">
                      → Ich erkläre dir die Grundlagen
                    </a>
                  </div>
                )}
                <ul className="reasons">
                  {topReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <div className="card-actions">
                  <a
                    className="cta"
                    href={r.product.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                  >
                    Zum Angebot
                  </a>
                  <a
                    className="btn btn-ghost btn-small"
                    href={buildAmazonSearchUrl(r.product.name)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                  >
                    Bei Amazon vergleichen
                  </a>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => setExpandedId(isOpen ? null : r.product.id)}
                  >
                    {isOpen ? "Details ausblenden" : "Warum genau passt das?"}
                  </button>
                </div>
                {isOpen && (
                  <div className="detail-breakdown">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Kriterium</th>
                          <th>Bewertung</th>
                          <th>Begründung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.assessments.map((a) => (
                          <tr key={a.key}>
                            <td className="detail-label" data-th="Kriterium">
                              {a.label}
                            </td>
                            <td data-th="Bewertung">
                              <span className={`score-pill verdict-${a.verdict}`}>{a.scoreOutOf5}/5</span>
                            </td>
                            <td className="detail-text" data-th="Begründung">
                              {a.detail}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="restart-row">
        <button className="btn btn-ghost" onClick={onRestart}>
          Nochmal von vorn
        </button>
      </div>
      <p className="disclosure">
        Wir vergleichen automatisch mehrere Händler und zeigen dir das jeweils günstigste Angebot –
        unabhängig davon, ob wir dort eine Provision bekommen. Für einige Links auf dieser Seite
        erhält Computerwissen mit Chris ggf. eine kleine Provision, wenn du darüber einkaufst – für
        dich entstehen dadurch keine Mehrkosten.
      </p>

      {glossaryOpen && <GlossaryModal onClose={() => setGlossaryOpen(false)} />}
    </div>
  );
}
