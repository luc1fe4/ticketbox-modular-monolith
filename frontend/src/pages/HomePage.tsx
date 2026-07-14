export function HomePage() {
  return (
    <article className="page">
      <header className="page-header">
        <p className="page-kicker">Environment</p>
        <h1 className="page-title">TicketBox development workspace</h1>
        <p className="page-copy">
          Modular monolith API, React web client, mobile scanner shell, and local service
          dependencies are ready for the next implementation stage.
        </p>
      </header>

      <section className="status-grid" aria-label="Project status">
        <div className="status-card">
          <p className="metric-label">Backend</p>
          <p className="metric-value">Spring Boot</p>
        </div>
        <div className="status-card">
          <p className="metric-label">Frontend</p>
          <p className="metric-value">React Vite</p>
        </div>
        <div className="status-card">
          <p className="metric-label">Services</p>
          <p className="metric-value">Postgres Redis MQ</p>
        </div>
      </section>
    </article>
  );
}
