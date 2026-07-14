export function HomePage() {
  return (
    <article className="page">
      <header className="page-header">
        <p className="page-kicker">Môi trường</p>
        <h1 className="page-title">Không gian phát triển TicketBox</h1>
        <p className="page-copy">
          API modular monolith, web client React, khung scanner mobile và các dịch vụ local đã sẵn
          sàng cho giai đoạn triển khai tiếp theo.
        </p>
      </header>

      <section className="status-grid" aria-label="Trạng thái dự án">
        <div className="status-card">
          <p className="metric-label">Máy chủ</p>
          <p className="metric-value">Spring Boot</p>
        </div>
        <div className="status-card">
          <p className="metric-label">Giao diện</p>
          <p className="metric-value">React Vite</p>
        </div>
        <div className="status-card">
          <p className="metric-label">Dịch vụ</p>
          <p className="metric-value">Postgres Redis MQ</p>
        </div>
      </section>
    </article>
  );
}
