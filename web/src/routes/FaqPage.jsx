import Seo from '../components/Seo.jsx';
import faqs from '../data/faqs.js';

function FaqPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="page faq-page">
      <Seo
        title="Frequently Asked Questions"
        description="Answers about formatting phone numbers, international support, caching, and privacy at CallerID."
        canonical="/faq"
        schema={schema}
      />
      <header className="hero hero--compact">
        <h1>Frequently asked questions</h1>
        <p>Everything you need to know about searching numbers, international support, and your privacy.</p>
      </header>

      <div className="faq-grid">
        {faqs.map((item) => (
          <article key={item.question} className="faq-item">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default FaqPage;
