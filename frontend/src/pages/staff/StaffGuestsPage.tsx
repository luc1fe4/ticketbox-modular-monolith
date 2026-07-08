import { type FormEvent, useEffect, useState } from 'react';
import { RefreshCw, Search, UserCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  getStaffConcerts,
  lookupStaffGuest,
  type StaffConcert,
  type StaffGuestLookup,
} from '../../api/admin';
import { isRequestCanceled } from '../../api/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { selectInitialConcert, staffConcertLabel } from './staffPageUtils';

export function StaffGuestsPage() {
  const [searchParams] = useSearchParams();
  const [concerts, setConcerts] = useState<StaffConcert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState('');
  const [loadingConcerts, setLoadingConcerts] = useState(true);
  const [phone, setPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<StaffGuestLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadConcerts() {
      setLoadingConcerts(true);
      setError('');
      try {
        const data = await getStaffConcerts('ON_SALE', controller.signal);
        setConcerts(data.content);
        setSelectedConcertId((current) => current || selectInitialConcert(data.content, searchParams.get('concert')));
      } catch (requestError) {
        if (!isRequestCanceled(requestError)) {
          setError(requestError instanceof Error ? requestError.message : 'Không thể tải danh sách concert.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingConcerts(false);
      }
    }
    void loadConcerts();
    return () => controller.abort();
  }, [searchParams]);

  async function submitLookup(event: FormEvent) {
    event.preventDefault();
    if (!selectedConcertId || !phone.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setError('');
    try {
      setLookupResult(await lookupStaffGuest(selectedConcertId, phone.trim()));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tra cứu khách mời.');
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Guest desk"
        title="Tra cứu khách mời"
        description="Xác minh khách mời tại cổng theo concert và số điện thoại. Danh sách import đầy đủ thuộc workspace admin/organizer."
      />

      {error ? <div className="admin-notice error" role="alert">{error}</div> : null}

      <section className="staff-desk-grid">
        <form className="staff-panel" onSubmit={(event) => void submitLookup(event)}>
          <div className="guest-section-heading">
            <div>
              <span>Lookup</span>
              <h2>Kiểm tra tại cổng</h2>
            </div>
            <UserCheck aria-hidden="true" size={22} />
          </div>

          <label className="admin-field">
            Concert
            <select
              disabled={loadingConcerts || !concerts.length}
              value={selectedConcertId}
              onChange={(event) => {
                setSelectedConcertId(event.target.value);
                setLookupResult(null);
              }}
            >
              {loadingConcerts ? <option>Đang tải concert...</option> : null}
              {!loadingConcerts && !concerts.length ? <option>Không có concert đang bán</option> : null}
              {concerts.map((concert) => (
                <option key={concert.id} value={concert.id}>{staffConcertLabel(concert)}</option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            Số điện thoại
            <input
              inputMode="tel"
              placeholder="VD: 0901234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>

          <button className="admin-primary-action" disabled={!selectedConcertId || !phone.trim() || lookupLoading} type="submit">
            {lookupLoading ? <RefreshCw aria-hidden="true" size={16} /> : <Search aria-hidden="true" size={16} />}
            {lookupLoading ? 'Đang tra cứu' : 'Tra cứu khách'}
          </button>
        </form>

        <div className="staff-panel">
          <div className="guest-section-heading">
            <div>
              <span>Result</span>
              <h2>Kết quả</h2>
            </div>
            <Users aria-hidden="true" size={22} />
          </div>

          {lookupResult ? (
            lookupResult.found ? (
              <GuestCard guest={lookupResult} featured />
            ) : (
              <div className="admin-empty-state staff-empty-compact">
                <Search aria-hidden="true" size={28} />
                <h2>Không tìm thấy khách</h2>
                <p>Số điện thoại này không nằm trong guest list đang kích hoạt của concert đã chọn.</p>
              </div>
            )
          ) : (
            <div className="admin-empty-state staff-empty-compact">
              <UserCheck aria-hidden="true" size={28} />
              <h2>Sẵn sàng tra cứu</h2>
              <p>Nhập số điện thoại của khách mời để xác nhận thông tin trước khi cho vào cổng.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function GuestCard({ guest, featured = false }: { guest: StaffGuestLookup; featured?: boolean }) {
  return (
    <article className={`staff-guest-card ${featured ? 'featured' : ''}`}>
      <div>
        <strong>{guest.fullName ?? 'Khách mời'}</strong>
        <span>{guest.phone ?? 'Chưa có số điện thoại'}</span>
      </div>
      <dl>
        <div><dt>Hạng</dt><dd>{guest.category ?? 'Chưa phân loại'}</dd></div>
        <div><dt>Sponsor</dt><dd>{guest.sponsorName ?? 'Không có'}</dd></div>
        <div><dt>Ghi chú</dt><dd>{guest.notes ?? 'Không có ghi chú'}</dd></div>
      </dl>
    </article>
  );
}
