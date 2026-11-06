import type { SavedGoal } from "@/domain/goals/saved-goal";
import { growthStage, progressPercent } from "@/domain/progress/progress";
import { varietyLabels } from "@/domain/harvest/harvest";
import Link from "next/link";

type Props = {
  goals: SavedGoal[];
  selectedId: string | null;
  busy: boolean;
  onSelect: (goal: SavedGoal) => void;
  onFreeze: (goal: SavedGoal) => void;
  onThaw: (goal: SavedGoal) => void;
};

export function GoalVault({ goals, selectedId, busy, onSelect, onFreeze, onThaw }: Props) {
  const active = goals.filter((goal) => goal.status === "active" || goal.status === "awaiting_start");
  const frozen = goals.filter((goal) => goal.status === "frozen");
  const harvested = goals.filter((goal) => goal.status === "harvested" && goal.harvest);

  return (
    <aside className="goal-vault" aria-label="내 오렌지 보관함">
      <div className="vault-heading">
        <h2>내 오렌지 <small>{active.length} / 3</small></h2>
        <p>지금 이어갈 목표를 골라보세요.</p>
      </div>
      {active.length === 0 ? <p className="vault-empty">첫 오렌지를 측정하면 여기에 안전하게 보관돼요.</p> : (
        <ul className="vault-list">
          {active.map((goal) => (
            <li key={goal.id} className={goal.id === selectedId ? "vault-item is-selected" : "vault-item"}>
              <strong>{goal.analysis.originalGoal}</strong>
              <span>{goal.progress ? `${growthStage(goal.progress) === "fruit_ready" ? "열매 준비" : "성장 중"} · ${progressPercent(goal.progress)}%` : goal.seed ? "씨앗 획득" : goal.measurements.length ? "첫 행동 준비 중" : "목표 줄이기 전"}</span>
              {goal.measurements.at(-1)?.currentAction && <small>첫 행동 · {goal.measurements.at(-1)?.currentAction}</small>}
              <div className="vault-actions">
                <button type="button" disabled={busy || goal.id === selectedId} onClick={() => onSelect(goal)}>이어하기</button>
                <button type="button" disabled={busy} onClick={() => onFreeze(goal)}>동결창고에 보관</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="freezer">
        <h3>동결창고 <small>{frozen.length}</small></h3>
        <p>잠시 쉬어도 그대로 보관돼요.</p>
        {frozen.length > 0 && <ul className="vault-list">
          {frozen.map((goal) => (
            <li key={goal.id} className="vault-item">
              <strong>{goal.analysis.originalGoal}</strong>
              <span>{goal.seed ? "씨앗 보관 중" : "첫 행동 보관 중"}</span>
              <div className="vault-actions">
                <button type="button" disabled={busy || active.length >= 3} onClick={() => onThaw(goal)}>다시 활성화</button>
              </div>
            </li>
          ))}
        </ul>}
      </div>
      <div className="record-book" id="record-book">
        <h3>기록장 <small>{harvested.length}</small></h3>
        <p>수확한 오렌지를 오래 보관해요.</p>
        {harvested.length > 0 && <ul className="vault-list">
          {harvested.map((goal) => (
            <li key={goal.id} className="vault-item">
              <strong>{goal.analysis.originalGoal}</strong>
              <span>{varietyLabels[goal.harvest!.varietyId]}</span>
              <div className="vault-actions"><button type="button" disabled={busy || goal.id === selectedId} onClick={() => onSelect(goal)}>수확 기록 보기</button></div>
            </li>
          ))}
        </ul>}
      </div>
      <Link className="encyclopedia-link" href="/encyclopedia">나의 오렌지 도감 보기 →</Link>
      <p className="vault-storage-note">지금은 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 복구할 수 없어요.</p>
    </aside>
  );
}
