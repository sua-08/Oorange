import type { ReactNode } from "react";

type Props = { originalGoal: string; busy: boolean; error: string; onHarvest: () => void; correctionPanel: ReactNode };

export function HarvestReady({ originalGoal, busy, error, onHarvest, correctionPanel }: Props) {
  return (
    <section className="harvest-ready" aria-labelledby="harvest-ready-title">
      <div className="harvest-ready-copy">
        <span className="harvest-eyebrow">열매 준비 · 100%</span>
        <h2 id="harvest-ready-title">드디어 목표가<br />완료됐어요!</h2>
        <p className="harvest-goal-label">원래 최종 목표</p>
        <strong className="harvest-goal">{originalGoal}</strong>
        <p>처음 세운 목표를 끝까지 해냈어요. 준비된 열매를 직접 수확해 보세요.</p>
      </div>
      <div className="harvest-art harvest-art-tree" role="img" aria-label="오렌지 열매가 열린 나무와 친구들" />
      <button className="harvest-cta" type="button" disabled={busy} onClick={onHarvest}>
        {busy ? "열매를 보관하고 있어요…" : "수확하기"} <span aria-hidden="true">→</span>
      </button>
      {error && <p className="harvest-error" role="alert">{error}</p>}
      <details className="harvest-correction"><summary>수확 전에 진행 상태를 다시 맞추기</summary>{correctionPanel}</details>
    </section>
  );
}
