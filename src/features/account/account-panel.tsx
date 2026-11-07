type Props = {
  hasSeed: boolean;
  configured: boolean;
  connected: boolean;
  syncing: boolean;
  error: string;
  onConnect: () => void;
  onSync: () => void;
};

export function AccountPanel({ hasSeed, configured, connected, syncing, error, onConnect, onSync }: Props) {
  if (!hasSeed) return null;
  return (
    <section className="account-panel" aria-label="계정 연결">
      <h3>기록 이어가기</h3>
      {connected ? (
        <>
          <p>{syncing ? "기록을 동기화하고 있어요…" : "Google 계정이 연결됐어요."}</p>
          <button type="button" onClick={onSync} disabled={syncing}>지금 동기화하기</button>
        </>
      ) : (
        <>
          <p>Google 계정을 연결하면 다른 기기에서도 기록을 이어갈 수 있어요. 지금은 연결하지 않아도 괜찮아요.</p>
          {configured && <button type="button" onClick={onConnect}>Google 계정 연결하기</button>}
          {!configured && <p>계정 연결을 준비 중이에요.</p>}
        </>
      )}
      {error && <p className="account-error" role="alert">{error}</p>}
    </section>
  );
}
