import { varietyLabels, type HarvestRecord } from "@/domain/harvest/harvest";

type Props = { record: HarvestRecord; onHome: () => void; onRecords: () => void };
const dateText = (timestamp: number) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(timestamp);

export function HarvestResult({ record, onHome, onRecords }: Props) {
  return (
    <article className="harvest-result" aria-labelledby="harvest-result-title">
      <span className="harvest-eyebrow">수확을 축하해요!</span>
      <h2 id="harvest-result-title">달콤한 열매를 수확했어요!</h2>
      <div className="harvest-art harvest-art-celebrate" role="img" aria-label="오렌지와 강아지가 수확을 축하하는 그림" />
      <p className="variety-name">{varietyLabels[record.varietyId]}</p>
      <dl className="harvest-details">
        <div><dt>원래 최종 목표</dt><dd>{record.originalGoal}</dd></div>
        <div><dt>시작일</dt><dd>{dateText(record.seededAt)}</dd></div>
        <div><dt>수확일</dt><dd>{dateText(record.harvestedAt)}</dd></div>
        <div><dt>획득 품종</dt><dd>{varietyLabels[record.varietyId]}</dd></div>
      </dl>
      <p className="record-saved">이 열매는 기록장에 보관됐어요.</p>
      <div className="harvest-result-actions">
        <button type="button" onClick={onRecords}>기록장으로 가기 →</button>
        <button type="button" onClick={onHome}>홈으로 돌아가기</button>
      </div>
    </article>
  );
}
