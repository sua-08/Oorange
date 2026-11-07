"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { type AnalysisRequest, type AnalysisResult } from "@/domain/goal-analysis/ai-schema";
import { canAddActiveGoal, canThawGoal, type SavedGoal } from "@/domain/goals/saved-goal";
import { indexedDbGoalRepository } from "@/infrastructure/db/indexeddb/goal-repository";
import { analyzeGoal } from "./analyze-goal-client";
import { GoalVault } from "./goal-vault";
import { ProgressPanel } from "./progress-panel";
import { useStartSession } from "./use-start-session";
import type { Progress } from "@/domain/progress/progress";
import { canHarvest } from "@/domain/harvest/harvest";
import { HarvestReady } from "@/features/harvest/harvest-ready";
import { HarvestResult } from "@/features/harvest/harvest-result";
import { suggestGoalAction } from "./suggest-action-client";
import { AccountPanel } from "@/features/account/account-panel";
import { useCloudAccount } from "@/features/account/use-cloud-account";

export function GoalAnalyzer() {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzedContext, setAnalyzedContext] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [measurements, setMeasurements] = useState<AnalysisResult[]>([]);
  const [actionHint, setActionHint] = useState("");
  const [starterCelebrated, setStarterCelebrated] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [pending, setPending] = useState<"goal" | "action" | null>(null);
  const requestRevision = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const harvestLock = useRef(false);
  const suggestionController = useRef<AbortController | null>(null);
  const [suggestingGoalId, setSuggestingGoalId] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<{ goalId: string; message: string } | null>(null);
  const startSession = useStartSession();
  const { startDeadline, deferred, seed, secondsLeft } = startSession;
  const [savedGoals, setSavedGoals] = useState<SavedGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageBusy, setStorageBusy] = useState(false);
  const [storageError, setStorageError] = useState("");
  const account = useCloudAccount(setSavedGoals);
  const selectedGoal = savedGoals.find((item) => item.id === selectedGoalId);
  const harvestReady = selectedGoal ? canHarvest(selectedGoal) : false;
  const restoreSeed = startSession.restore;

  useEffect(() => {
    let cancelled = false;
    indexedDbGoalRepository.list().then(({ goals, skippedInvalid }) => {
      if (cancelled) return;
      setSavedGoals(goals);
      if (skippedInvalid) setStorageError("일부 보관된 목표를 읽을 수 없어요. 나머지 목표는 그대로 보관했어요.");
      const first = goals.find((item) => item.status !== "frozen");
      if (first) {
        setSelectedGoalId(first.id);
        setGoal(first.analysis.originalGoal);
        setContext(first.context);
        setAnalyzedContext(first.context);
        setAnalysis(first.analysis);
        setMeasurements(first.measurements);
        restoreSeed(first.seed);
      }
    }).catch(() => {
      if (!cancelled) setStorageError("이 브라우저에서는 목표를 저장하거나 복원할 수 없어요. 브라우저 저장 설정을 확인해주세요.");
    }).finally(() => { if (!cancelled) setStorageReady(true); });
    return () => { cancelled = true; };
  }, [restoreSeed]);

  async function saveGoal(record: SavedGoal) {
    setStorageBusy(true);
    try {
      await indexedDbGoalRepository.put(record);
      setSavedGoals((previous) => [record, ...previous.filter((item) => item.id !== record.id)]);
      void account.syncAfterWrite();
      setStorageError("");
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "수확 기록은 변경할 수 없어요.") {
        setStorageError("다른 화면에서 이미 수확한 목표예요. 새로고침해 기록을 확인해주세요.");
        return false;
      }
      setSavedGoals((previous) => [record, ...previous.filter((item) => item.id !== record.id)]);
      setStorageError("브라우저에 저장하지 못했어요. 지금은 계속 사용할 수 있지만 새로고침하면 이 목표가 사라질 수 있어요.");
      return true;
    } finally {
      setStorageBusy(false);
    }
  }

  function showSavedGoal(record: SavedGoal) {
    requestRevision.current += 1;
    requestController.current?.abort();
    setPending(null);
    setRequestError("");
    setSelectedGoalId(record.id);
    setGoal(record.analysis.originalGoal);
    setContext(record.context);
    setAnalyzedContext(record.context);
    setAnalysis(record.analysis);
    setMeasurements(record.measurements);
    setActionInput("");
    setActionHint("");
    setStarterCelebrated(false);
    restoreSeed(record.seed);
  }

  async function freezeGoal(record: SavedGoal) {
    if (storageBusy || record.status === "harvested" || !(await saveGoal({ ...record, status: "frozen", updatedAt: Date.now() }))) return;
    if (selectedGoalId === record.id) closeResult();
  }

  async function thawGoal(record: SavedGoal) {
    if (storageBusy || !canThawGoal(savedGoals, record.id)) return;
    const restored = { ...record, status: record.seed ? "active" as const : "awaiting_start" as const, updatedAt: Date.now() };
    if (await saveGoal(restored)) showSavedGoal(restored);
  }

  async function refreshRecommendation(record: SavedGoal) {
    if (record.status !== "active" || !record.seed || suggestionController.current || storageBusy) return;
    const controller = new AbortController();
    suggestionController.current = controller;
    setSuggestingGoalId(record.id);
    setSuggestionError(null);
    const timeout = window.setTimeout(() => controller.abort(), 16_000);
    try {
      const action = await suggestGoalAction({
        originalGoal: record.analysis.originalGoal,
        context: record.context,
        previousAction: record.recommendation?.action ?? record.seed.starterAction,
      }, controller.signal);
      await saveGoal({ ...record, recommendation: { action, updatedAt: Date.now() }, updatedAt: Date.now() });
    } catch (error) {
      setSuggestionError({
        goalId: record.id,
        message: controller.signal.aborted ? "추천 응답이 늦어지고 있어요. 다시 눌러주세요." : error instanceof Error ? error.message : "지금은 새 행동을 추천하기 어려워요.",
      });
    } finally {
      window.clearTimeout(timeout);
      suggestionController.current = null;
      setSuggestingGoalId(null);
    }
  }

  function closeResult() {
    requestRevision.current += 1;
    requestController.current?.abort();
    requestController.current = null;
    setPending(null);
    setRequestError("");
    setSelectedGoalId(null);
    setAnalysis(null);
    setMeasurements([]);
    setActionInput("");
    setActionHint("");
    setStarterCelebrated(false);
    startSession.reset();
  }

  const currentMeasurement = measurements.at(-1);
  const currentSize = currentMeasurement?.orangeSizeCm ?? analysis?.orangeSizeCm;
  const seedReady = analysis?.isFinite && (currentMeasurement?.canCompleteWithinThreeMinutes ?? false);
  const suggestions = currentMeasurement?.suggestedActions ?? analysis?.suggestedActions ?? [];
  const starterSuggestion = currentMeasurement?.starterAction ?? analysis?.starterAction;
  const orangeScale = analysis && typeof currentSize === "number" && typeof analysis.orangeSizeCm === "number"
    ? Math.max(0.38, Math.min(1, Math.sqrt(currentSize / analysis.orangeSizeCm)))
    : 1;

  async function requestAnalysis(input: AnalysisRequest): Promise<AnalysisResult | null> {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const revision = ++requestRevision.current;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 16_000);
    setPending(input.mode);
    setRequestError("");
    try {
      const result = await analyzeGoal(input, controller.signal);
      return revision === requestRevision.current ? result : null;
    } catch (error) {
      if (revision === requestRevision.current && (!controller.signal.aborted || timedOut)) {
        setRequestError(timedOut ? "응답이 늦어지고 있어요. 다시 측정해볼까요?" : error instanceof Error ? error.message : "지금은 분석이 어려워요. 잠시 뒤 다시 시도해주세요.");
      }
      return null;
    } finally {
      window.clearTimeout(timeout);
      if (revision === requestRevision.current) {
        setPending(null);
        requestController.current = null;
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal.trim() || pending || storageBusy || !storageReady) return;
    if (!canAddActiveGoal(savedGoals)) {
      setStorageError("활성 목표는 3개까지 둘 수 있어요. 하나를 동결창고에 보관한 뒤 다시 측정해주세요.");
      return;
    }

    const result = await requestAnalysis({ mode: "goal", originalGoal: goal.trim(), context: context.trim() });
    if (!result) return;
    const now = Date.now();
    const record: SavedGoal = {
      id: crypto.randomUUID(), context: context.trim(), analysis: result, measurements: [], seed: null,
      status: "awaiting_start", createdAt: now, updatedAt: now,
    };
    if (!(await saveGoal(record))) return;
    setSelectedGoalId(record.id);
    setAnalysis(result);
    setAnalyzedContext(context);
    setActionInput("");
    setMeasurements([]);
    setActionHint("");
    setStarterCelebrated(false);
    startSession.reset();
  }

  async function handleActionMeasure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysis || typeof currentSize !== "number" || !actionInput.trim() || pending || storageBusy) return;

    const next = await requestAnalysis({ mode: "action", originalGoal: analysis.originalGoal, context: analyzedContext, currentAction: actionInput.trim(), previousSize: currentSize });
    if (!next) return;
    if (!next.isFinite || typeof next.orangeSizeCm !== "number") {
      setActionHint("최종 목표의 완료 기준을 먼저 확인해주세요.");
      return;
    }
    if (next.orangeSizeCm >= currentSize) {
      setActionHint("지금 오렌지보다 더 작게, 대상과 양을 한 번만 좁혀볼까요?");
      return;
    }

    if (selectedGoal && !(await saveGoal({ ...selectedGoal, measurements: [...measurements, next], updatedAt: Date.now() }))) return;
    setMeasurements((previous) => [...previous, next]);
    setActionInput("");
    setActionHint("");
  }

  function beginOneMinute() {
    if (!analysis?.isFinite || !currentMeasurement?.canCompleteWithinThreeMinutes || seed) return;
    startSession.begin();
  }

  async function confirmStart() {
    if (!analysis?.isFinite || !currentMeasurement?.canCompleteWithinThreeMinutes || seed || startDeadline === null) return;
    const acquired = startSession.confirm(analysis.originalGoal, currentMeasurement.currentAction!);
    if (acquired && selectedGoal) {
      setStarterCelebrated(false);
      await saveGoal({
        ...selectedGoal,
        seed: acquired,
        recommendation: { action: acquired.starterAction, updatedAt: acquired.acquiredAt },
        status: "active",
        updatedAt: Date.now(),
      });
    }
  }

  async function saveProgress(next: Progress) {
    if (!selectedGoal?.seed || selectedGoal.status !== "active" || storageBusy || suggestionController.current) return;
    const saved = await saveGoal({
      ...selectedGoal,
      progress: next,
      progressHistory: [...(selectedGoal.progressHistory ?? []), {
        previous: selectedGoal.progress ?? null,
        next,
        changedAt: Date.now(),
      }],
      updatedAt: Date.now(),
    });
    if (!saved) throw new Error("이미 수확된 목표는 변경할 수 없어요. 새로고침해 기록을 확인해주세요.");
  }

  async function harvestSelectedGoal() {
    if (!selectedGoal || !canHarvest(selectedGoal) || harvestLock.current || suggestionController.current) return;
    harvestLock.current = true;
    setStorageBusy(true);
    try {
      const harvested = await indexedDbGoalRepository.harvest(selectedGoal.id, Date.now(), Math.random(), crypto.randomUUID());
      if (harvested) {
        setSavedGoals((previous) => [harvested, ...previous.filter((item) => item.id !== harvested.id)]);
        void account.syncAfterWrite();
        setStorageError("");
        showSavedGoal(harvested);
      } else {
        setStorageError("이미 수확한 목표일 수 있어요. 새로고침해 기록을 확인해주세요.");
      }
    } catch {
      setStorageError("수확 기록을 보관하지 못했어요. 저장 설정을 확인하고 다시 눌러주세요.");
    } finally {
      harvestLock.current = false;
      setStorageBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="brand" aria-label="Orange Task Farm">
        <span className="brand-wordmark">Oorange</span>
        <span className="brand-tagline">Small Start, Big You.</span>
        <nav className="site-nav" aria-label="주요 메뉴">
          <Link href="/">홈</Link>
          <a href="#goal">목표</a>
          <a href="#record-book">기록장</a>
          <Link href="/encyclopedia">도감</Link>
        </nav>
      </header>

      <section className={`workspace ${analysis ? "has-result" : ""} ${selectedGoal?.harvest ? "is-harvested" : harvestReady ? "is-harvest-ready" : ""}`}>
        <div className="intro-column">
          <div className="eyebrow"><span>STEP 01</span><i /> 시작을 가볍게</div>
          <h1>
            오늘의 큰일을<br />
            <em>오렌지로 재볼까요?</em>
          </h1>
          <p className="intro-copy">
            완벽하게 계획하지 않아도 괜찮아요.<br />
            지금 떠오르는 목표를 편하게 적어주세요.
          </p>

          <form className="goal-form" onSubmit={handleSubmit}>
            <label htmlFor="goal">
              최종 목표 <span>필수</span>
            </label>
            <input
              id="goal"
              name="goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="예: 이번 달에 책 한 권 읽기"
              required
            />

            <label htmlFor="context">
              지금 상황은 어떤가요? <small>선택</small>
            </label>
            <textarea
              id="context"
              name="context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="예: 계속 미루고 있어서 첫 장도 못 폈어요"
              rows={4}
            />

            <button className="measure-button" type="submit" disabled={pending !== null || storageBusy || !storageReady}>
              <span>{pending === "goal" ? "오렌지를 측정하고 있어요…" : "오렌지 측정하기"}</span>
              <b aria-hidden="true">→</b>
            </button>
            <p className="form-note">AI가 목표와 지금 상황을 살펴보고 있어요.</p>
            {requestError && <p className="action-hint" role="alert">{requestError}</p>}
            {storageError && <p className="action-hint" role="alert">{storageError}</p>}
          </form>
        </div>

        <div className="visual-column" aria-live="polite">
          {selectedGoal?.harvest ? (
            <HarvestResult
              record={selectedGoal.harvest}
              onHome={closeResult}
              onRecords={() => document.getElementById("record-book")?.scrollIntoView({ behavior: "smooth" })}
            />
          ) : harvestReady && selectedGoal ? (
            <HarvestReady
              originalGoal={selectedGoal.analysis.originalGoal}
              busy={storageBusy || suggestingGoalId !== null}
              error={storageError}
              onHarvest={harvestSelectedGoal}
              correctionPanel={<ProgressPanel
                key={selectedGoal.id}
                progress={selectedGoal.progress ?? null}
                recommendedUnit={selectedGoal.analysis.progressUnitLabel}
                recommendationReason={selectedGoal.analysis.progressUnitReason}
                saving={storageBusy || suggestingGoalId !== null}
                onSave={saveProgress}
              />}
            />
          ) : analysis ? (
            <article className="result-card">
              <button
                className="close-result"
                type="button"
                aria-label="측정 결과 닫기"
                onClick={closeResult}
              >
                ×
              </button>
              <div className="result-image-wrap">
                <div className="size-badge">
                  <small>{currentMeasurement ? "지금 행동의 크기" : "지금 목표의 크기"}</small>
                  <strong>{currentSize === "infinity" ? "∞" : currentSize}<span>cm</span></strong>
                </div>
                <div className="result-orange-frame">
                  <Image
                    src="/images/orange-character.png"
                    alt="웃으며 손을 흔드는 손그림 오렌지"
                    width={2048}
                    height={2048}
                    priority
                    className="result-orange"
                    style={{ transform: `scale(${orangeScale})` }}
                  />
                </div>
              </div>
              <div className="result-content">
                <p className="result-label">변하지 않는 최종 목표</p>
                <h2>{analysis.originalGoal}</h2>

                <div className="reason-box">
                  <span aria-hidden="true">⌁</span>
                  <div>
                    <h3>{currentMeasurement ? "지금 행동을 이렇게 측정했어요" : "이렇게 크게 느껴지는 이유"}</h3>
                    <p>{currentMeasurement?.reason ?? analysis.reason}</p>
                  </div>
                </div>

                {!currentMeasurement && (
                  <div className="action-box">
                    <span className="action-icon" aria-hidden="true">☝</span>
                    <div>
                      <p>작게 시작하는 행동 예시</p>
                      <strong>{analysis.starterAction}</strong>
                    </div>
                  </div>
                )}

                {currentMeasurement && (
                  <div className="current-action">
                    <span>현재 고른 행동</span>
                    <strong>{currentMeasurement.currentAction}</strong>
                  </div>
                )}

                {!analysis.isFinite ? (
                  <div className="seed-ready" role="status">
                    <span aria-hidden="true">∞</span>
                    <div>
                      <strong>끝을 정하면 씨앗을 얻을 수 있어요</strong>
                      <p>완료 기준이 정해지기 전에는 시작 확인을 할 수 없어요.</p>
                      <p>추천 목표: {analysis.suggestedFiniteGoal}</p>
                      <button type="button" className="quiet-button" onClick={() => {
                        setGoal(analysis.suggestedFiniteGoal);
                        setAnalysis(null);
                        setMeasurements([]);
                      }}>이 목표로 다시 측정하기</button>
                    </div>
                  </div>
                ) : seedReady ? (
                  <>
                    <div className="seed-ready" role="status">
                      <span aria-hidden="true">✦</span>
                      <div>
                        <strong>씨앗 크기에 도달했어요!</strong>
                        <p>이 행동은 3분 안에 마칠 수 있어요. 최종 목표를 위한 첫 행동으로 골라두었어요.</p>
                      </div>
                    </div>
                    {seed ? (
                      <>
                      <div className="seed-earned" role="status">
                        <span className="seed-symbol" aria-hidden="true">✦</span>
                        <div>
                          <strong>씨앗을 얻었어요!</strong>
                          <p>이 씨앗이 자라서 이루어갈 목표</p>
                          <span className="seed-goal">{seed.finalGoal}</span>
                          <p>첫 행동: {seed.starterAction}</p>
                          {starterCelebrated ? (
                            <p className="starter-celebration" role="status">첫 행동도 마쳤네요! 최종 목표의 진행은 아래에서 따로 기록할 수 있어요.</p>
                          ) : (
                            <button type="button" className="starter-finish-button" onClick={() => setStarterCelebrated(true)}>마쳤어요</button>
                          )}
                        </div>
                      </div>
                      {selectedGoal?.seed && <ProgressPanel
                        key={selectedGoal.id}
                        progress={selectedGoal.progress ?? null}
                        recommendedUnit={analysis.progressUnitLabel}
                        recommendationReason={analysis.progressUnitReason}
                        saving={storageBusy || suggestingGoalId !== null}
                        onSave={saveProgress}
                      />}
                      </>
                    ) : startDeadline === null ? (
                      <div className="start-panel">
                        {deferred && <p className="start-note">괜찮아요. 준비되면 같은 행동으로 시작할 수 있어요.</p>}
                        <button type="button" className="start-button" onClick={beginOneMinute}>
                          1분 안에 시작하기 <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    ) : secondsLeft > 0 ? (
                      <div className="start-panel">
                        <p className="start-note">작은 행동에 손을 대본 뒤 알려주세요. 마칠 필요는 없어요.</p>
                        <p className="countdown" role="timer" aria-label="시작까지 남은 시간">
                          {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                        </p>
                        <button type="button" className="start-button" onClick={confirmStart}>시작했어요!</button>
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={startSession.defer}
                        >
                          다음에 시작할게요
                        </button>
                      </div>
                    ) : (
                      <div className="start-panel">
                        <p className="start-note">아직 시작하지 않아도 괜찮아요. 편한 때 다시 준비해요.</p>
                        <button type="button" className="start-button" onClick={beginOneMinute}>한 번 더 준비할래요</button>
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={startSession.defer}
                        >
                          다음에 시작할게요
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <section className="reduction-loop" aria-labelledby="reduce-title">
                    <h3 id="reduce-title">오렌지를 더 줄여볼까요?</h3>
                    <p>작은 행동을 하나 골라 다시 측정해보세요.</p>
                    <form className="action-form" onSubmit={handleActionMeasure}>
                      <label htmlFor="smaller-action">지금 시작할 작은 행동</label>
                      <input
                        id="smaller-action"
                        value={actionInput}
                        disabled={pending !== null || storageBusy}
                        onChange={(event) => {
                          setActionInput(event.target.value);
                          setActionHint("");
                        }}
                        placeholder="예: 첫 단계 이름 하나 적기"
                        required
                      />
                      <div className="suggestion-bubble">
                        <span>작게 시작할 행동 · 누르면 입력돼요</span>
                        <div className="suggestion-list">
                          {starterSuggestion && starterSuggestion !== currentMeasurement?.currentAction && !suggestions.some((item) => item.action === starterSuggestion) && (
                            <button
                              type="button"
                              className="suggestion-button starter-suggestion"
                              disabled={pending !== null || storageBusy}
                              onClick={() => {
                                setActionInput(starterSuggestion);
                                setActionHint("");
                              }}
                            >
                              <span aria-hidden="true">☝</span> {starterSuggestion}
                              <small>3분 후보</small>
                            </button>
                          )}
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.action}
                              type="button"
                              className="suggestion-button"
                              disabled={pending !== null || storageBusy}
                              onClick={() => {
                                setActionInput(suggestion.action);
                                setActionHint("");
                              }}
                            >
                              <span aria-hidden="true">☝</span> {suggestion.action}
                            </button>
                          ))}
                        </div>
                      </div>
                      {actionHint && <p className="action-hint" role="status">{actionHint}</p>}
                      <button type="submit" disabled={pending !== null || storageBusy}>{pending === "action" ? "다시 측정하고 있어요…" : "이 행동 다시 측정하기"} <span aria-hidden="true">→</span></button>
                    </form>
                  </section>
                )}
                {measurements.length > 0 && (
                  <p className="shrink-history" aria-label="오렌지 크기 변화">
                    {analysis.orangeSizeCm}cm
                    {measurements.map((step, index) => (
                      <span key={index}> → {step.orangeSizeCm}cm</span>
                    ))}
                  </p>
                )}
              </div>
            </article>
          ) : (
            <div className="orange-stage" aria-hidden="true">
              <span className="orbit orbit-one" />
              <span className="orbit orbit-two" />
              <span className="floating-dot dot-one" />
              <span className="floating-dot dot-two" />
              <Image
                src="/images/orange-character.png"
                alt=""
                width={2048}
                height={2048}
                priority
                className="hero-orange"
              />
              <p>크기가 어떻든,<br /><strong>시작은 아주 작게.</strong></p>
            </div>
          )}
        </div>
        <GoalVault
          goals={savedGoals}
          selectedId={selectedGoalId}
          busy={storageBusy || pending !== null || suggestingGoalId !== null}
          suggestingGoalId={suggestingGoalId}
          suggestionError={suggestionError}
          onSelect={showSavedGoal}
          onFreeze={freezeGoal}
          onThaw={thawGoal}
          onRefreshRecommendation={refreshRecommendation}
          cloudConnected={account.connected && !account.error}
        />
        <AccountPanel
          hasSeed={savedGoals.some((item) => !!item.seed)}
          configured={account.configured}
          connected={account.connected}
          syncing={account.syncing}
          error={account.error}
          onConnect={() => void account.connect()}
          onSync={() => void account.syncAfterWrite()}
        />
      </section>

      <footer>
        <span>완료보다 시작을 먼저 응원해요.</span>
        <span className="footer-fruit" aria-hidden="true">●</span>
      </footer>
    </main>
  );
}
