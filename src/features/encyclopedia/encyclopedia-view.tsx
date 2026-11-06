"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildEncyclopedia } from "@/domain/encyclopedia/encyclopedia";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { indexedDbGoalRepository } from "@/infrastructure/db/indexeddb/goal-repository";

export function EncyclopediaView() {
  const [goals, setGoals] = useState<SavedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    indexedDbGoalRepository.list().then(({ goals: stored, skippedInvalid }) => {
      if (cancelled) return;
      setGoals(stored);
      if (skippedInvalid) setLoadError("일부 기록을 읽을 수 없어요. 나머지 기록은 그대로 보관돼요.");
    }).catch(() => {
      if (!cancelled) setLoadError("이 브라우저의 기록장을 열 수 없어요. 저장 설정을 확인해주세요.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const entries = buildEncyclopedia(goals);
  const totalHarvests = entries.reduce((sum, entry) => sum + entry.count, 0);
  const unlocked = entries.filter((entry) => entry.unlocked).length;

  return (
    <main className="encyclopedia-page">
      <header className="encyclopedia-header">
        <Link href="/" className="encyclopedia-back">← 홈으로</Link>
        <span className="encyclopedia-brand">Oorange</span>
      </header>
      <section className="encyclopedia-intro">
        <span className="harvest-eyebrow">수확한 오렌지 모아보기</span>
        <h1>나의 오렌지 도감</h1>
        <p>하나하나 시작한 시간이 모여 있어요. 같은 품종을 다시 만나도 모두 기록됩니다.</p>
        {!loading && <p className="encyclopedia-count" aria-label="도감 현황">만난 품종 {unlocked} / {entries.length} · 수확한 오렌지 {totalHarvests}개</p>}
      </section>
      {loadError && <p className="encyclopedia-error" role="alert">{loadError}</p>}
      {loading ? <p className="encyclopedia-loading" role="status">도감을 열고 있어요…</p> : (
        <section className="encyclopedia-grid" aria-label="오렌지 품종">
          {entries.map((entry) => (
            <article key={entry.id} className={entry.unlocked ? "encyclopedia-card" : "encyclopedia-card is-unmet"}>
              <div className="encyclopedia-art">
                {entry.id === "basic" ? <Image src="/images/orange-character.png" alt="" width={1536} height={1536} /> : <div className="encyclopedia-sunshine" aria-hidden="true" />}
              </div>
              <span className="encyclopedia-status">{entry.unlocked ? "만났어요" : "아직 만나지 못했어요"}</span>
              <h2>{entry.label}</h2>
              <p>{entry.unlocked ? entry.description : "수확을 이어가다 보면 언젠가 만날 수 있어요."}</p>
              <strong>{entry.unlocked ? `${entry.count}개 수확` : "아직 0개"}</strong>
            </article>
          ))}
        </section>
      )}
      <footer className="encyclopedia-footer">오렌지는 소비되지 않고 도감과 기록장에 남아요.</footer>
    </main>
  );
}
