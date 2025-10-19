import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { lookupNumber, listPosts } from '../apiClient.js';
import faqItems from '../data/faqs.js';
import LookupResultCard from '../sections/LookupResultCard.jsx';
import { analyzePhoneInput, buildShareMessage } from '../utils/phone.js';

const FAQ_PREVIEW = faqItems.slice(0, 4);

function LookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const [comingSoon, setComingSoon] = useState(false);
  const [highlightPosts, setHighlightPosts] = useState([]);

  const lastQueriedRef = useRef('');
  const debounceRef = useRef(null);
  const hasAppliedPresetRef = useRef(false);

  useEffect(() => {
    if (hasAppliedPresetRef.current) {
      return;
    }
    const preset = searchParams.get('number');
    if (preset) {
      setInputValue(preset);
    }
    hasAppliedPresetRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadHighlights() {
      try {
        const posts = await listPosts();
        if (!cancelled) {
          setHighlightPosts((posts || []).slice(0, 4));
        }
      } catch (_error) {
        if (!cancelled) {
          setHighlightPosts([]);
        }
      }
    }
    loadHighlights();
    return () => {
      cancelled = true;
    };
  }, []);

  const analysis = useMemo(() => analyzePhoneInput(inputValue), [inputValue]);

  const performLookup = useCallback(
    async (value, mode = 'manual') => {
      if (!value) {
        return;
      }
      window.clearTimeout(debounceRef.current);
      setStatus('loading');
      if (mode === 'manual') {
        setLookupResult(null);
      }
      setError(null);

      try {
        const payload = await lookupNumber(value);
        lastQueriedRef.current = value;

        const normalized = payload?.normalized ?? {};
        const number = payload?.number ?? {};
        const countryCode = normalized.country_code || number.country_code || '';
        const isNanp = countryCode === '+1';
        const hasDetail =
          Boolean(payload?.carrier?.name) ||
          Boolean(payload?.carrier?.type) ||
          Boolean(payload?.location?.city) ||
          Boolean(payload?.location?.state) ||
          payload?.reputation?.spam_score !== undefined;
        const sources = payload?.sources || [];
        const fromCache = sources.includes('cache') || sources.includes('database');

        const shareLink = `${window.location.origin}/?number=${encodeURIComponent(
          normalized.e164 || value,
        )}`;

        setLookupResult({
          payload,
          shareText: buildShareMessage(payload),
          shareLink,
          meta: {
            isNanp,
            countryCode,
            fromCache,
            comingSoon: !isNanp && !hasDetail,
            sources,
          },
        });
        setComingSoon(!isNanp && !hasDetail);
        setStatus('success');
        setSearchParams({ number: normalized.e164 || value }, { replace: true });
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Unable to perform lookup');
      }
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (analysis.type === 'empty') {
      setError(null);
      return;
    }
    if (!analysis.ready) {
      setError(analysis.reason);
      return;
    }
    setError(null);

    if (analysis.sanitized === lastQueriedRef.current) {
      return;
    }

    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      performLookup(analysis.sanitized, 'auto');
    }, 500);

    return () => {
      window.clearTimeout(debounceRef.current);
    };
  }, [analysis, performLookup]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!analysis.ready) {
      setError(analysis.reason || 'Enter a valid phone number');
      return;
    }
    performLookup(analysis.sanitized, 'manual');
  };

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const heroSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: 'https://callerid.web.app/',
    name: 'CallerID',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://callerid.web.app/?number={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="page lookup-page">
      <Seo
        title="Instant phone intelligence"
        description="Check US and international phone numbers instantly. Auto-format NANPA numbers, require +country codes abroad, and cache every lookup for lightning fast results."
        canonical="/"
        schema={heroSchema}
      />

      <section className="hero hero--home">
        <p className="eyebrow">GDPR ready · Sub-second lookups · Cached to save API spend</p>
        <h1>Instant phone intelligence for US &amp; global numbers.</h1>
        <p>
          Enter any US or Canadian number in any format—or use the +country code for international lookups. CallerID
          normalizes, verifies, and caches every search so your next lookup is instant.
        </p>
      </section>

      <section className="card lookup-card">
        <form onSubmit={handleSubmit} className="lookup-form">
          <label className="form-label" htmlFor="number">
            Search a phone number
          </label>
          <div className="form-row">
            <input
              id="number"
              name="number"
              type="tel"
              placeholder="Try +1 415 555 2671 or +91 9876543210"
              value={inputValue}
              onChange={handleChange}
              className="form-input"
              autoComplete="tel"
              aria-describedby="number-hint number-error"
            />
            <button type="submit" className="primary-button" disabled={status === 'loading'}>
              {status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>
        {analysis.ready && (
          <p id="number-hint" className="form-hint">
            We'll lookup <strong>{analysis.sanitized}</strong>{' '}
            {analysis.type === 'nanp' ? 'as a US/Canada number.' : 'using the international gateway.'}
          </p>
        )}
        {!analysis.ready && analysis.reason && (
          <p id="number-error" className="form-error">
            {analysis.reason}
          </p>
        )}
        {status === 'error' && error && !analysis.reason && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {status === 'success' && lookupResult && (
        <LookupResultCard
          payload={lookupResult.payload}
          meta={lookupResult.meta}
          shareText={lookupResult.shareText}
          shareLink={lookupResult.shareLink}
          comingSoon={comingSoon}
        />
      )}

      <section className="card highlights-card">
        <header className="card-header">
          <h2>Latest guides &amp; FAQs</h2>
          <p className="card-subtitle">Stay informed about number portability, spam trends, and compliance.</p>
        </header>
        <div className="highlight-grid">
          {highlightPosts.map((post) => (
            <article key={post.slug} className="highlight-item">
              <Link to={`/blog/${post.slug}`} className="highlight-link">
                <h3>{post.title}</h3>
                {post.summary && <p>{post.summary}</p>}
                <span className="highlight-meta">
                  {post.date ? new Date(post.date).toLocaleDateString() : 'Read more'}
                </span>
              </Link>
            </article>
          ))}
          {highlightPosts.length === 0 &&
            FAQ_PREVIEW.map((faq) => (
              <article key={faq.question} className="highlight-item">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
        </div>
        <div className="highlight-footer">
          <Link to="/blog" className="text-link">
            Explore the blog
          </Link>
          <Link to="/faq" className="text-link">
            Read FAQs
          </Link>
        </div>
      </section>

      <section className="faq-preview">
        <h2>Quick answers</h2>
        <div className="faq-grid">
          {FAQ_PREVIEW.map((item) => (
            <article key={item.question} className="faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LookupPage;
