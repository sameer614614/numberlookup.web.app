export const faqItems = [
  {
    question: 'How do you keep lookups fast and affordable?',
    answer:
      'Every search is normalized and cached in our datastore. When a number is requested again, we serve the trusted cached record instantly without triggering a paid API call.',
  },
  {
    question: 'Can I enter any format for US or Canadian numbers?',
    answer:
      'Yes. Type 10 digits, numbers that start with 1, or use the +1 international format. We automatically normalize NANPA numbers before running the lookup.',
  },
  {
    question: 'What about international numbers?',
    answer:
      'International lookups require the +country code. If a country is not yet supported by our partners, we show a “Coming Soon” message instead of failing the lookup.',
  },
  {
    question: 'How is my data protected?',
    answer:
      'We only store the normalized phone number and lookup payload, follow GDPR guidelines, and honor deletion requests. Analytics scripts are opt-in so you stay in control.',
  },
];

export default faqItems;
