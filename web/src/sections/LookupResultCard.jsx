import { useMemo, useState } from 'react';

function DetailRow({ label, value }) {
  const display =
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
      ? 'Unknown'
      : value;

  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{display}</dd>
    </div>
  );
}

function StatusBadge({ label }) {
  if (!label) {
    return null;
  }
  return <span className="status-pill">{label}</span>;
}

function LookupResultCard({ payload, meta, shareText, shareLink, comingSoon }) {
  const [copyState, setCopyState] = useState('idle');
  const [shareState, setShareState] = useState('idle');

  const number = payload?.number || {};
  const carrier = payload?.carrier || {};
  const location = payload?.location || {};
  const reputation = payload?.reputation || {};
  const normalized = payload?.normalized || {};
  const countryName = payload?.country?.name || normalized.country_name || 'Unknown country';
  const international = number.international_format || normalized.e164 || 'Unknown number';
  const national = number.national_format || normalized.national;

  const sourceLabel = useMemo(() => {
    if (meta?.fromCache) {
      return 'Served from cache';
    }
    return meta?.isNanp ? 'Verified' : '';
  }, [meta]);

  const handleCopy = async () => {
    if (!shareText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch (_error) {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 3000);
    }
  };

  const handleShare = async () => {
    if (!shareText) {
      return;
    }
    setShareState('pending');
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'CallerID result',
          text: shareText,
          url: shareLink,
        });
        setShareState('shared');
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareLink}`);
        setShareState('copied');
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        setShareState('idle');
        return;
      }
      setShareState('error');
    } finally {
      window.setTimeout(() => setShareState('idle'), 2500);
    }
  };

  return (
    <section className="card lookup-result-card">
      <header className="result-header">
        <div>
          <p className="result-label">Lookup complete</p>
          <h2>{international}</h2>
          <p className="result-subtitle">
            {countryName}
            {meta?.countryCode ? ` · ${meta.countryCode}` : ''}
            {meta?.fromCache ? ' · Cached' : ''}
          </p>
        </div>
        <div className="result-actions">
          <button type="button" className="ghost-button" onClick={handleCopy}>
            {copyState === 'copied' ? 'Copied!' : 'Copy details'}
          </button>
          <button type="button" className="ghost-button" onClick={handleShare}>
            {shareState === 'pending'
              ? 'Sharing…'
              : shareState === 'shared'
                ? 'Shared!'
                : shareState === 'copied'
                  ? 'Link copied!'
                  : 'Share'}
          </button>
        </div>
      </header>

      {comingSoon ? (
        <div className="coming-soon">
          <p>
            International support for this country is coming soon. We saved the normalized number so we can return a
            full profile the next time you search.
          </p>
        </div>
      ) : (
        <div className="lookup-result-grid">
          <section>
            <h3>Number</h3>
            <dl>
              <DetailRow label="International" value={international} />
              <DetailRow label="National" value={national} />
              <DetailRow label="Country" value={countryName} />
              <DetailRow label="Country code" value={number.country_code || normalized.country_code} />
            </dl>
          </section>
          <section>
            <h3>Carrier</h3>
            <dl>
              <DetailRow label="Name" value={carrier.name} />
              <DetailRow label="Type" value={carrier.type} />
            </dl>
          </section>
          <section>
            <h3>Location</h3>
            <dl>
              <DetailRow label="City" value={location.city || normalized.location} />
              <DetailRow label="State/Region" value={location.state || normalized.region_code} />
            </dl>
          </section>
          <section>
            <h3>Reputation</h3>
            <dl>
              <DetailRow label="Spam score" value={reputation.spam_score} />
              <DetailRow label="Last seen" value={reputation.last_seen} />
            </dl>
          </section>
        </div>
      )}

      <footer className="result-footer">
        <div className="footer-meta">
          <StatusBadge label={sourceLabel} />
          {meta?.isNanp ? <StatusBadge label="US/Canada" /> : <StatusBadge label="International" />}
        </div>
      </footer>
    </section>
  );
}

export default LookupResultCard;
