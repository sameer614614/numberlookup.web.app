import { useEffect, useMemo, useState } from 'react';
import { lookupNumber, checkHealth } from '../apiClient.js';
import LookupResultCard from '../sections/LookupResultCard.jsx';

const defaultFormState = {
  number: '',
};

function LookupPage() {
  const [form, setForm] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then((payload) => {
        if (!cancelled) {
          setHealth(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ status: 'unavailable' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.number.trim()) {
      setError('Enter a phone number to lookup');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = await lookupNumber(form.number.trim());
      setResult(payload);
    } catch (err) {
      setError(err.message || 'Unable to perform lookup');
    } finally {
      setSubmitting(false);
    }
  };

  const sources = useMemo(() => {
    if (!result?.sources?.length) {
      return 'Unknown source';
    }
    return result.sources.join(', ');
  }, [result]);

  return (
    <div className="page lookup-page">
      <section className="hero">
        <h1>Phone number intelligence, reimagined for Firebase.</h1>
        <p>
          Validate and enrich phone numbers using Cloud Functions with caching across Firestore, Realtime
          Database, and Cloud Storage-backed blog content.
        </p>
      </section>

      <section className="card lookup-card">
        <form onSubmit={handleSubmit} className="lookup-form">
          <label className="form-label" htmlFor="number">
            Enter a phone number (international or national format)
          </label>
          <div className="form-row">
            <input
              id="number"
              name="number"
              type="tel"
              placeholder="e.g. +1 415 555 2671"
              value={form.number}
              onChange={handleChange}
              disabled={submitting}
              className="form-input"
              autoComplete="tel"
            />
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Looking up…' : 'Lookup'}
            </button>
          </div>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      {result && (
        <section className="card">
          <header className="card-header">
            <h2>Lookup result</h2>
            <p className="card-subtitle">Sources: {sources}</p>
          </header>
          <LookupResultCard payload={result} />
        </section>
      )}

      <section className="card">
        <header className="card-header">
          <h2>System health</h2>
        </header>
        <dl className="definition-list">
          <div>
            <dt>API</dt>
            <dd className={health?.status === 'ok' ? 'status-ok' : 'status-bad'}>
              {health?.status === 'ok' ? 'Operational' : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt>Cache</dt>
            <dd className={health?.cache === 'ok' ? 'status-ok' : 'status-bad'}>
              {health?.cache === 'ok' ? 'Realtime Database synchronized' : 'Unavailable'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default LookupPage;
