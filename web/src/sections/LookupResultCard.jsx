function DetailRow({ label, value }) {
  if (!value) {
    return null;
  }
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function LookupResultCard({ payload }) {
  const number = payload?.number || {};
  const carrier = payload?.carrier || {};
  const location = payload?.location || {};
  const reputation = payload?.reputation || {};
  const normalized = payload?.normalized || {};

  return (
    <div className="lookup-result">
      <section>
        <h3>Number</h3>
        <dl>
          <DetailRow label="International" value={number.international_format} />
          <DetailRow label="National" value={number.national_format} />
          <DetailRow label="Country" value={payload?.country?.name || normalized.country_name} />
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
  );
}

export default LookupResultCard;
