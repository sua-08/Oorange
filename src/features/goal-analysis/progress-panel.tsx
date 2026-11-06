import { FormEvent, useState } from "react";
import { addProgress, growthStage, progressPercent, ProgressSchema, type Progress } from "@/domain/progress/progress";

const stageLabels = {
  seed: "씨앗",
  sprout: "새싹",
  tree: "나무",
  flower: "꽃",
  fruit_ready: "열매 준비",
} as const;

type Props = {
  progress: Progress | null;
  recommendedUnit?: string;
  recommendationReason?: string;
  saving: boolean;
  onSave: (progress: Progress) => Promise<void>;
};

export function ProgressPanel({ progress, recommendedUnit, recommendationReason, saving, onSave }: Props) {
  const [unitLabel, setUnitLabel] = useState(progress?.unitLabel ?? recommendedUnit ?? "");
  const [targetAmount, setTargetAmount] = useState(progress?.targetAmount?.toString() ?? "");
  const [currentAmount, setCurrentAmount] = useState(progress?.currentAmount?.toString() ?? "0");
  const [message, setMessage] = useState("");
  const percent = progress ? progressPercent(progress) : 0;
  const stage = progress ? growthStage(progress) : "seed";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = ProgressSchema.safeParse({
      unitLabel, targetAmount: Number(targetAmount), currentAmount: Number(currentAmount),
    });
    if (!parsed.success) {
      setMessage("단위와 전체 범위를 확인해주세요. 진행량은 0부터 전체 범위까지의 정수로 적어주세요.");
      return;
    }
    try {
      await onSave(parsed.data);
      setMessage(progress ? "진행 상태를 다시 맞췄어요." : "진행 방식을 정했어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "진행 상태를 저장하지 못했어요.");
    }
  }

  async function addOne() {
    if (!progress || saving || progress.currentAmount >= progress.targetAmount) return;
    const next = addProgress(progress);
    try {
      await onSave(next);
      setCurrentAmount(String(next.currentAmount));
      setMessage("한 단위를 더 기록했어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "진행 상태를 저장하지 못했어요.");
    }
  }

  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="progress-heading">
        <div>
          <span>원래 최종 목표의 진행 상태</span>
          <h3 id="progress-title">{stageLabels[stage]}</h3>
        </div>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label="최종 목표 진행률" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {stage === "fruit_ready" && <p className="progress-note">열매가 준비됐어요. 원할 때 직접 수확할 수 있어요.</p>}
      <p className="progress-note">첫 행동을 시작한 것만으로 진행률이 오르지는 않아요. 쉬는 날에도 줄어들지 않습니다.</p>
      {!progress && recommendedUnit && <p className="progress-recommendation">추천 단위: {recommendedUnit}{recommendationReason ? ` · ${recommendationReason}` : ""} <span>직접 바꿀 수 있어요.</span></p>}
      <form className="progress-form" onSubmit={submit}>
        <label htmlFor="progress-unit">같은 비중으로 셀 단위</label>
        <input id="progress-unit" value={unitLabel} maxLength={30} onChange={(event) => setUnitLabel(event.target.value)} placeholder="예: 페이지, 강의, 참여 일수" required />
        <div className="progress-numbers">
          <label htmlFor="progress-current">지금까지</label>
          <label htmlFor="progress-target">전체 범위</label>
          <input id="progress-current" type="number" min={0} step={1} value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} required />
          <input id="progress-target" type="number" min={1} step={1} value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="예: 10" required />
        </div>
        <div className="progress-actions">
          <button type="submit" disabled={saving}>진행 상태 저장</button>
          {progress && <button type="button" disabled={saving || progress.currentAmount >= progress.targetAmount} onClick={addOne}>한 단위 더했어요 +1</button>}
        </div>
        {message && <p className="progress-feedback" role="status">{message}</p>}
      </form>
    </section>
  );
}
