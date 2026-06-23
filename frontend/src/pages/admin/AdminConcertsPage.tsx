import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MapPin,
  ImagePlus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  createConcert,
  deleteConcert,
  getAdminConcerts,
  removeConcertPoster,
  uploadConcertPoster,
  updateConcert,
  updateConcertStatus,
  type ConcertMutation,
} from '../../api/admin';
import type { ConcertDetail, ConcertStatus, Page } from '../../api/concerts';
import { commandMessage, isRequestCanceled } from '../../api/client';
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/feedback/toast-context';

const statuses: Array<{ value: '' | ConcertStatus; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'ON_SALE', label: 'Đang bán' },
  { value: 'SOLD_OUT', label: 'Hết vé' },
  { value: 'COMPLETED', label: 'Đã kết thúc' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const transitions: Record<ConcertStatus, ConcertStatus[]> = {
  DRAFT: ['ON_SALE', 'CANCELLED'],
  ON_SALE: ['SOLD_OUT', 'COMPLETED', 'CANCELLED'],
  SOLD_OUT: ['ON_SALE', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type ConcertFormState = {
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  doorsOpenAt: string;
  seatMapSvg: string;
};

const emptyForm: ConcertFormState = {
  title: '',
  description: '',
  venueName: '',
  venueAddress: '',
  eventDate: '',
  doorsOpenAt: '',
  seatMapSvg: '',
};

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formFromConcert(concert: ConcertDetail): ConcertFormState {
  return {
    title: concert.title,
    description: concert.description ?? '',
    venueName: concert.venueName,
    venueAddress: concert.venueAddress,
    eventDate: toLocalInput(concert.eventDate),
    doorsOpenAt: toLocalInput(concert.doorsOpenAt),
    seatMapSvg: concert.seatMapSvg ?? '',
  };
}

function toPayload(form: ConcertFormState): ConcertMutation {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    venueName: form.venueName.trim(),
    venueAddress: form.venueAddress.trim(),
    eventDate: new Date(form.eventDate).toISOString(),
    doorsOpenAt: form.doorsOpenAt
      ? new Date(form.doorsOpenAt).toISOString()
      : null,
    seatMapSvg: form.seatMapSvg.trim() || null,
  };
}

function statusLabel(status: ConcertStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

export function AdminConcertsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageData, setPageData] = useState<Page<ConcertDetail> | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<'' | ConcertStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ConcertDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConcertDetail | null>(null);
  const [formOpen, setFormOpen] = useState(searchParams.get('create') === '1');
  const [form, setForm] = useState<ConcertFormState>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingPoster, setRemovingPoster] = useState(false);
  const [busyId, setBusyId] = useState('');

  const loadConcerts = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        setPageData(
          await getAdminConcerts(page, 10, status || undefined, signal),
        );
      } catch (requestError) {
        if (!isRequestCanceled(requestError)) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Không thể tải danh sách concert.',
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadConcerts(controller.signal);
    return () => controller.abort();
  }, [loadConcerts]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setEditing(null);
      setForm(emptyForm);
      setFormOpen(true);
    }
  }, [searchParams]);

  const counts = useMemo(() => {
    const content = pageData?.content ?? [];
    return {
      total: pageData?.totalElements ?? 0,
      onSale: content.filter((concert) => concert.status === 'ON_SALE').length,
      draft: content.filter((concert) => concert.status === 'DRAFT').length,
    };
  }, [pageData]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setPosterFile(null);
    setFormOpen(true);
  }

  function openEdit(concert: ConcertDetail) {
    setEditing(concert);
    setForm(formFromConcert(concert));
    setPosterFile(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setPosterFile(null);
    setSearchParams({}, { replace: true });
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = toPayload(form);
      const result = editing
        ? await updateConcert(editing.id, payload)
        : await createConcert(payload);

      if (posterFile) {
        try {
          await uploadConcertPoster(result.data.id, posterFile);
        } catch (uploadError) {
          closeForm();
          await loadConcerts();
          toast.error(
            uploadError instanceof Error
              ? `Concert đã được lưu nhưng poster chưa tải lên: ${uploadError.message}`
              : 'Concert đã được lưu nhưng poster chưa tải lên.',
          );
          return;
        }
      }

      toast.success(commandMessage(
        result.message,
        editing ? 'Đã cập nhật concert.' : 'Đã tạo concert ở trạng thái bản nháp.',
      ));
      closeForm();
      await loadConcerts();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể lưu concert.');
    } finally {
      setSaving(false);
    }
  }

  function choosePoster(file: File | null) {
    if (!file) {
      setPosterFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Poster phải là ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Poster không được vượt quá 5 MB.');
      return;
    }
    setPosterFile(file);
  }

  async function removePoster() {
    if (!editing?.posterUrl) return;
    setRemovingPoster(true);
    try {
      const result = await removeConcertPoster(editing.id);
      setEditing(result.data);
      toast.success(commandMessage(result.message, 'Đã xóa poster concert.'));
      await loadConcerts();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể xóa poster concert.');
    } finally {
      setRemovingPoster(false);
    }
  }

  async function changeStatus(concert: ConcertDetail, next: ConcertStatus) {
    setBusyId(concert.id);
    try {
      const result = await updateConcertStatus(concert.id, next);
      toast.success(commandMessage(result.message, `Đã chuyển "${concert.title}" sang ${statusLabel(next)}.`));
      await loadConcerts();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể đổi trạng thái concert.');
    } finally {
      setBusyId('');
    }
  }

  async function removeConcert() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const result = await deleteConcert(deleteTarget.id);
      toast.success(commandMessage(result.message, 'Đã xóa concert.'));
      setDeleteTarget(null);
      await loadConcerts();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Chỉ concert bản nháp mới có thể xóa.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Lịch chương trình"
        title="Quản lý concert"
        description="Tạo chương trình, kiểm soát nội dung và chuyển trạng thái theo đúng vòng đời bán vé."
        actions={
          <button className="admin-primary-action" type="button" onClick={openCreate}>
            <Plus aria-hidden="true" size={17} />
            Tạo concert
          </button>
        }
      />

      <section className="admin-inline-stats" aria-label="Tóm tắt concert">
        <div><span>Tổng concert</span><strong>{counts.total}</strong></div>
        <div><span>Đang bán trên trang này</span><strong>{counts.onSale}</strong></div>
        <div><span>Bản nháp trên trang này</span><strong>{counts.draft}</strong></div>
      </section>

      <div className="admin-toolbar">
        <label>
          <span className="sr-only">Lọc theo trạng thái</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as '' | ConcertStatus);
              setPage(0);
            }}
          >
            {statuses.map((item) => (
              <option key={item.value || 'all'} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void loadConcerts()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          Làm mới
        </button>
      </div>

      {error ? <div className="admin-notice error" role="alert">{error}</div> : null}

      <section className="admin-data-panel">
        {loading ? (
          <ConcertRowsSkeleton />
        ) : pageData?.content.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Concert</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Điều phối</th>
                  <th><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {pageData.content.map((concert) => (
                  <tr key={concert.id}>
                    <td>
                      <div className="admin-concert-cell">
                        <div className="admin-concert-poster">
                          {concert.posterUrl ? <img src={concert.posterUrl} alt="" /> : <CalendarPlus size={20} />}
                        </div>
                        <div>
                          <strong>{concert.title}</strong>
                          <span><MapPin size={13} />{concert.venueName}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong className="admin-table-primary">{dateTime.format(new Date(concert.eventDate))}</strong>
                      <span className="admin-table-secondary">{concert.venueAddress}</span>
                    </td>
                    <td><span className={`admin-status status-${concert.status.toLowerCase()}`}>{statusLabel(concert.status)}</span></td>
                    <td>
                      <select
                        aria-label={`Đổi trạng thái ${concert.title}`}
                        value=""
                        disabled={!transitions[concert.status].length || busyId === concert.id}
                        onChange={(event) => void changeStatus(concert, event.target.value as ConcertStatus)}
                      >
                        <option value="">Chuyển trạng thái</option>
                        {transitions[concert.status].map((next) => (
                          <option key={next} value={next}>{statusLabel(next)}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" aria-label={`Sửa ${concert.title}`} onClick={() => openEdit(concert)} disabled={busyId === concert.id || ['COMPLETED', 'CANCELLED'].includes(concert.status)}>
                          <Edit3 size={16} />
                        </button>
                        <button type="button" aria-label={`Xóa ${concert.title}`} onClick={() => setDeleteTarget(concert)} disabled={concert.status !== 'DRAFT' || busyId === concert.id}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CalendarPlus aria-hidden="true" size={28} />
            <h2>Chưa có concert phù hợp</h2>
            <p>Thay đổi bộ lọc hoặc tạo concert đầu tiên.</p>
            <button className="admin-primary-action" type="button" onClick={openCreate}>Tạo concert</button>
          </div>
        )}
      </section>

      {pageData && pageData.totalPages > 1 ? (
        <div className="admin-pagination">
          <span>Trang {pageData.number + 1} / {pageData.totalPages}</span>
          <div>
            <button type="button" aria-label="Trang trước" disabled={pageData.first} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={17} /></button>
            <button type="button" aria-label="Trang sau" disabled={pageData.last} onClick={() => setPage((value) => value + 1)}><ChevronRight size={17} /></button>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <ConcertForm
          form={form}
          editing={editing}
          saving={saving}
          removingPoster={removingPoster}
          posterFile={posterFile}
          onChange={setForm}
          onPosterChange={choosePoster}
          onRemovePoster={() => void removePoster()}
          onClose={closeForm}
          onSubmit={submitForm}
        />
      ) : null}

      {deleteTarget ? (
        <AdminConfirmDialog
          title={`Xóa concert “${deleteTarget.title}”?`}
          description="Concert bản nháp và toàn bộ cấu hình liên quan sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác."
          confirmLabel="Xóa concert"
          loading={busyId === deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void removeConcert()}
        />
      ) : null}
    </>
  );
}

function ConcertRowsSkeleton() {
  return (
    <div className="admin-row-skeleton" aria-label="Đang tải concert" aria-live="polite">
      {[1, 2, 3, 4].map((item) => <span key={item} />)}
    </div>
  );
}

function ConcertForm({
  form,
  editing,
  saving,
  removingPoster,
  posterFile,
  onChange,
  onPosterChange,
  onRemovePoster,
  onClose,
  onSubmit,
}: {
  form: ConcertFormState;
  editing: ConcertDetail | null;
  saving: boolean;
  removingPoster: boolean;
  posterFile: File | null;
  onChange: (form: ConcertFormState) => void;
  onPosterChange: (file: File | null) => void;
  onRemovePoster: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const [selectedPosterPreview, setSelectedPosterPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!posterFile) {
      setSelectedPosterPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(posterFile);
    setSelectedPosterPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [posterFile]);

  const posterPreview = selectedPosterPreview ?? editing?.posterUrl ?? null;

  const field = (name: keyof ConcertFormState) => ({
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [name]: event.target.value }),
  });

  return (
    <div className="admin-dialog-backdrop" role="presentation">
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="concert-form-title">
        <header>
          <div>
            <span>{editing ? 'Chỉnh sửa chương trình' : 'Chương trình mới'}</span>
            <h2 id="concert-form-title">{editing ? editing.title : 'Tạo concert'}</h2>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>Tên concert</span>
              <input required maxLength={500} {...field('title')} />
            </label>
            <label className="admin-field">
              <span>Thời gian diễn ra</span>
              <input required type="datetime-local" {...field('eventDate')} />
            </label>
            <label className="admin-field">
              <span>Giờ mở cửa</span>
              <input type="datetime-local" {...field('doorsOpenAt')} />
            </label>
            <label className="admin-field">
              <span>Địa điểm</span>
              <input required {...field('venueName')} />
            </label>
            <label className="admin-field">
              <span>Địa chỉ</span>
              <input required {...field('venueAddress')} />
            </label>
            <div className="admin-field admin-field-wide">
              <span>Poster concert</span>
              <div className="admin-poster-field">
                <div className="admin-poster-preview">
                  {posterPreview ? <img src={posterPreview} alt="Xem trước poster concert" /> : <ImagePlus aria-hidden="true" size={25} />}
                </div>
                <div className="admin-poster-controls">
                  <label className="admin-secondary-action">
                    <ImagePlus aria-hidden="true" size={16} />
                    {posterPreview ? 'Đổi poster' : 'Chọn poster'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => onPosterChange(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {posterFile ? (
                    <button className="admin-secondary-action" type="button" onClick={() => onPosterChange(null)}>Bỏ ảnh đã chọn</button>
                  ) : editing?.posterUrl ? (
                    <button className="admin-secondary-action" type="button" onClick={onRemovePoster} disabled={removingPoster}>
                      {removingPoster ? 'Đang xóa...' : 'Xóa poster'}
                    </button>
                  ) : null}
                  <small>JPEG, PNG hoặc WebP. Tối đa 5 MB.</small>
                </div>
              </div>
            </div>
            <label className="admin-field admin-field-wide">
              <span>Mô tả</span>
              <textarea rows={4} {...field('description')} />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Seat map SVG</span>
              <textarea rows={5} spellCheck={false} {...field('seatMapSvg')} />
            </label>
          </div>
          <footer>
            <button className="admin-secondary-action" type="button" onClick={onClose}>Hủy</button>
            <button className="admin-primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
