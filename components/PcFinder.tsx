"use client";

import { useMemo, useState } from "react";
import {
  Answers,
  deviceTypeOptions,
  gamingLevelOptions,
  lifespanOptions,
  useCaseOptions
} from "@/lib/questions";
import { matchProducts, ScoredProduct } from "@/lib/scoring";
import { Product } from "@/lib/products";

type StepId = "useCase" | "gamingLevel" | "deviceType" | "mobility" | "budget" | "lifespan" | "result";

const BASE_STEPS: StepId[] = ["useCase", "deviceType", "mobility", "budget", "lifespan", "result"];

export default function PcFinder({ products }: { products: Product[] }) {
  const [answers, setAnswers] = useState<Partial<Answers>>({
    mobilityImportance: 3,
    budget: 800
  });
  const [stepIndex, setStepIndex] = useState(0);

  // Die Gaming-Level-Frage blenden wir nur ein, wenn "Gaming" gewählt wurde.
  const steps = useMemo<StepId[]>(() => {
    if (answers.useCase === "gaming") {
      const withGaming = [...BASE_STEPS];
      withGaming.splice(1, 0, "gamingLevel");
      return withGaming;
    }
    return BASE_STEPS;
  }, [answers.useCase]);

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
      default:
        return true;
    }
  };

  let results: ScoredProduct[] = [];
  if (isResultStep) {
    const completeAnswers: Answers = {
      useCase: answers.useCase ?? "office",
      gamingLevel: answers.gamingLevel,
      deviceType: answers.deviceType ?? "egal",
      mobilityImportance: answers.mobilityImportance ?? 3,
      budget: answers.budget ?? 800,
      lifespan: answers.lifespan ?? "kurz"
    };
    results = matchProducts(products, completeAnswers).slice(0, 3);
  }

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

      {currentStep === "mobility" && (
        <div className="card">
          <h2 className="question-title">Wie wichtig ist dir Mobilität?</h2>
          <p className="question-sub">
            Also: möglichst leicht, lange Akkulaufzeit, überall einsatzbereit.
          </p>
          <div className="slider-wrap">
            <div className="slider-value">{answers.mobilityImportance ?? 3} / 5</div>
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

      {isResultStep && <ResultView results={results} onRestart={restart} />}
    </div>
  );
}

function ResultView({ results, onRestart }: { results: ScoredProduct[]; onRestart: () => void }) {
  return (
    <div>
      <div className="results-intro">
        <h2>Das passt zu dir</h2>
        <p>Basierend auf deinen Antworten sind das unsere Top-Empfehlungen.</p>
      </div>
      <div className="result-list">
        {results.map((r, idx) => (
          <div key={r.product.id} className={`result-card ${idx === 0 ? "top" : ""}`}>
            {idx === 0 && <span className="badge">Beste Wahl für dich</span>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.product.imageUrl} alt={r.product.name} referrerPolicy="no-referrer" />
            <div>
              <h3>{r.product.name}</h3>
              <div className="result-price">{r.product.price.toLocaleString("de-DE")} €</div>
              <p className="result-pitch">{r.product.shortPitch}</p>
              <ul className="reasons">
                {r.reasons.slice(0, 3).map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <a
                className="cta"
                href={r.product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
              >
                Zum Angebot
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="restart-row">
        <button className="btn btn-ghost" onClick={onRestart}>
          Nochmal von vorn
        </button>
      </div>
      <p className="disclosure">
        Für einige Links auf dieser Seite erhält Computerwissen mit Chris ggf. eine kleine
        Provision, wenn du darüber einkaufst – für dich entstehen dadurch keine Mehrkosten.
      </p>
    </div>
  );
}
