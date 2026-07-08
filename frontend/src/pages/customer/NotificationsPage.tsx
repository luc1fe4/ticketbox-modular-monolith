import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../api/notifications';
import { isRequestCanceled } from '../../api/client';

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const page = await getNotifications(0, 30, signal);
      setItems(page.content);
    } catch (requestError) {
      if (!isRequestCanceled(requestError)) {
        setError(requestError instanceof Error ? requestError.message : 'Không thể tải thông báo.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function markRead(item: NotificationItem) {
    if (item.read || savingId) return;
    setSavingId(item.id);
    try {
      const result = await markNotificationRead(item.id);
      setItems((current) => current.map((existing) => (
        existing.id === item.id ? result.data : existing
      )));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="profile-page page-width">
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true"><Bell size={28} /></div>
        <div>
          <p className="eyebrow"><span /> Notification center</p>
          <h1>Thông báo</h1>
          <p>Theo dõi xác nhận thanh toán, nhắc lịch concert và các cập nhật từ TicketBox.</p>
        </div>
      </section>

      {error ? <div className="state-panel compact" role="alert"><p>{error}</p></div> : null}

      <section className="history-list" aria-label="Danh sách thông báo">
        <button className="button button-secondary" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Làm mới
        </button>

        {loading ? (
          <div className="profile-loading" role="status" aria-live="polite">
            <div className="route-spinner" aria-hidden="true" />
            <span>Đang tải thông báo...</span>
          </div>
        ) : items.length ? (
          items.map((item) => (
            <article className="history-item" key={item.id}>
              <div className="history-topline">
                <span>{item.channel} / {item.eventType}</span>
                <span className={`status-chip ${item.read ? 'status-paid' : 'status-awaiting-payment'}`}>
                  {item.read ? 'Đã đọc' : 'Mới'}
                </span>
              </div>
              <h2>{item.subject}</h2>
              <p>{item.body}</p>
              <div className="history-total">
                <span>{dateTime.format(new Date(item.createdAt))}</span>
                {!item.read ? (
                  <button className="button button-secondary" type="button" onClick={() => void markRead(item)} disabled={savingId === item.id}>
                    <CheckCircle2 size={15} />
                    Đánh dấu đã đọc
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="state-panel compact">
            <span className="state-icon" aria-hidden="true">◇</span>
            <h2>Chưa có thông báo</h2>
            <p>Thông báo mua vé và nhắc lịch sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>
    </main>
  );
}
