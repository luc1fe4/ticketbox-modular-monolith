import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  applyArtistBioJob,
  getAdminConcerts,
  getArtistBioJob,
  getArtistBioJobs,
  retryArtistBioJob,
  submitArtistBioJob,
  type ArtistBioJob,
  type ArtistBioJobStatus,
  type ManagementApiScope,
} from '../../api/admin';
import type { ConcertDetail, Page } from '../../api/concerts';
import { commandMessage, isRequestCanceled } from '../../api/client';
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/feedback/toast-context';

const statuses: Array<{ value: '' | ArtistBioJobStatus; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'PROCESSING', label: 'Đang tạo bio' },
  { value: 'DONE', label: 'Sẵn sàng review' },
  { value: 'FAILED', label: 'Thất bại' },
];

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function isActive(status: ArtistBioJobStatus) {
  return status === 'PENDING' || status === 'PROCESSING';
}

function statusLabel(status: ArtistBioJobStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function duration(job: ArtistBioJob) {
  if (!job.startedAt) return 'Chưa bắt đầu';
  if (!job.completedAt) return 'Đang xử lý';
  const seconds = Math.max(0, Math.round(
    (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000,
  ));
  return seconds < 60 ? `${seconds} giây` : `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`;
}

export function AdminArtistBioPage({ apiScope = 'admin' }: { apiScope?: ManagementApiScope }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [concerts, setConcerts] = useState<ConcertDetail[]>([]);
  const [jobs, setJobs] = useState<Page<ArtistBioJob> | null>(null);
  const [loadingConcerts, setLoadingConcerts] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [uploadConcertId, setUploadConcertId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [latestJob, setLatestJob] = useState<ArtistBioJob | null>(null);
  const [selectedJob, setSelectedJob] = useState<ArtistBioJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [applying, setApplying] = useState(false);
  const [overwriteJob, setOverwriteJob] = useState<ArtistBioJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const page = Math.max(0, Math.floor(Number(searchParams.get('page')) || 0));
  const concertFilter = searchParams.get('concertId') ?? '';
  const statusValue = searchParams.get('status') ?? '';
  const statusFilter = statuses.some((item) => item.value === statusValue)
    ? statusValue as '' | ArtistBioJobStatus
    : '';

  const loadConcerts = useCallback(async (signal?: AbortSignal) => {
    setLoadingConcerts(true);
    try {
      const data = await getAdminConcerts(0, 100, undefined, signal, apiScope);
      setConcerts(data.content);
      setUploadConcertId((current) => current || data.content[0]?.id || '');
    } catch (requestError) {
      if (!isRequestCanceled(requestError)) {
        toast.error(requestError instanceof Error ? requestError.message : 'Không thể tải danh sách concert.');
      }
    } finally {
      if (!signal?.aborted) setLoadingConcerts(false);
    }
  }, [apiScope, toast]);

  useEffect(() => {
    const controller = new AbortController();
    void loadConcerts(controller.signal);
    return () => controller.abort();
  }, [loadConcerts]);

  const loadJobs = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) setLoadingJobs(true);
    setJobsError('');
    try {
      setJobs(await getArtistBioJobs({
        page,
        size: 20,
        concertId: concertFilter || undefined,
        status: statusFilter || undefined,
      }, signal, apiScope));
    } catch (requestError) {
      if (!isRequestCanceled(requestError)) {
        setJobsError(requestError instanceof Error ? requestError.message : 'Không thể tải lịch sử AI Artist Bio.');
      }
    } finally {
      if (!signal?.aborted && !silent) setLoadingJobs(false);
    }
  }, [apiScope, concertFilter, page, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void loadJobs(controller.signal);
    return () => controller.abort();
  }, [loadJobs]);

  const hasActiveJob = jobs?.content.some((job) => isActive(job.status)) ?? false;
  useEffect(() => {
    if (!hasActiveJob) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadJobs(undefined, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, loadJobs]);

  useEffect(() => {
    if (!selectedJob || !isActive(selectedJob.status)) return;
    const controller = new AbortController();
    let requestInFlight = false;
    const timer = window.setInterval(async () => {
      if (requestInFlight || document.visibilityState !== 'visible') return;
      requestInFlight = true;
      try {
        const updated = await getArtistBioJob(selectedJob.id, controller.signal, apiScope);
        setSelectedJob(updated);
        setLatestJob((current) => current?.id === updated.id ? updated : current);
        if (!isActive(updated.status)) void loadJobs(undefined, true);
      } catch (requestError) {
        if (!isRequestCanceled(requestError)) {
          toast.error(requestError instanceof Error ? requestError.message : 'Không thể cập nhật AI job.');
        }
      } finally {
        requestInFlight = false;
      }
    }, 3000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [apiScope, loadJobs, selectedJob, toast]);

  useEffect(() => {
    if (!latestJob || !isActive(latestJob.status) || selectedJob?.id === latestJob.id) return;
    const controller = new AbortController();
    let requestInFlight = false;
    const timer = window.setInterval(async () => {
      if (requestInFlight || document.visibilityState !== 'visible') return;
      requestInFlight = true;
      try {
        const updated = await getArtistBioJob(latestJob.id, controller.signal, apiScope);
        setLatestJob(updated);
        if (!isActive(updated.status)) void loadJobs(undefined, true);
      } catch (requestError) {
        if (!isRequestCanceled(requestError)) {
          toast.error(requestError instanceof Error ? requestError.message : 'Không thể cập nhật job gần nhất.');
        }
      } finally {
        requestInFlight = false;
      }
    }, 3000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [apiScope, latestJob, loadJobs, selectedJob?.id, toast]);

  const concertMap = useMemo(
    () => new Map(concerts.map((concert) => [concert.id, concert])),
    [concerts],
  );

  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if (!('page' in values)) next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function chooseFile(nextFile: File | null) {
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!nextFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      toast.error('Chỉ chấp nhận file PDF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (nextFile.size === 0) {
      setFile(null);
      toast.error('File PDF không được để trống.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setFile(null);
      toast.error('File PDF không được vượt quá 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(nextFile);
  }

  async function submitJob(event: FormEvent) {
    event.preventDefault();
    if (!file || !uploadConcertId) return;
    setUploading(true);
    try {
      const result = await submitArtistBioJob(uploadConcertId, file, apiScope);
      toast.success(commandMessage(result.message, 'Đã tiếp nhận PDF để tạo Artist Bio.'));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      try {
        const detail = await getArtistBioJob(result.data.jobId, undefined, apiScope);
        setLatestJob(detail);
        setSelectedJob(detail);
      } catch (detailError) {
        toast.error(detailError instanceof Error
          ? `Job đã được tạo nhưng chưa tải được trạng thái: ${detailError.message}`
          : 'Job đã được tạo nhưng chưa tải được trạng thái.');
      }
      await loadJobs(undefined, true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể tải PDF lên.');
    } finally {
      setUploading(false);
    }
  }

  async function openDetail(job: ArtistBioJob) {
    setSelectedJob(job);
    setDetailLoading(true);
    try {
      setSelectedJob(await getArtistBioJob(job.id, undefined, apiScope));
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể tải chi tiết AI job.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function retryJob(job: ArtistBioJob) {
    setRetrying(true);
    try {
      const result = await retryArtistBioJob(job.id, apiScope);
      toast.success(commandMessage(result.message, 'Đã đưa job vào hàng chờ xử lý lại.'));
      const updated = await getArtistBioJob(result.data.jobId, undefined, apiScope);
      setSelectedJob(updated);
      setLatestJob(updated);
      await loadJobs(undefined, true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể retry AI job.');
    } finally {
      setRetrying(false);
    }
  }

  async function applyJob(job: ArtistBioJob, overwrite: boolean) {
    setApplying(true);
    try {
      const result = await applyArtistBioJob(job.id, overwrite, apiScope);
      toast.success(commandMessage(result.message, overwrite ? 'Đã thay thế Artist Bio của concert.' : 'Đã áp dụng Artist Bio cho concert.'));
      setSelectedJob(result.data);
      setLatestJob((current) => current?.id === result.data.id ? result.data : current);
      setOverwriteJob(null);
      await Promise.all([loadConcerts(), loadJobs(undefined, true)]);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Không thể áp dụng Artist Bio.');
    } finally {
      setApplying(false);
    }
  }

  function requestApply(job: ArtistBioJob) {
    const concert = concertMap.get(job.concertId);
    if (concert?.artistBio?.trim()) {
      setOverwriteJob(job);
    } else {
      void applyJob(job, false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Editorial AI"
        title="AI Artist Bio"
        description="Tạo bản giới thiệu nghệ sĩ từ press kit PDF, review nội dung và chủ động xuất bản lên trang concert."
      />

      <section className="ai-bio-workspace">
        <form className="ai-bio-upload" onSubmit={submitJob}>
          <ToolHeading eyebrow="Tạo nội dung" title="Press kit mới" icon={<Sparkles size={22} />} />
          <label className="admin-field"><span>Concert</span><select value={uploadConcertId} onChange={(event) => setUploadConcertId(event.target.value)} disabled={loadingConcerts || uploading} required>{!concerts.length ? <option value="">Chưa có concert</option> : null}{concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.title}</option>)}</select></label>
          <label className={`ai-pdf-picker ${file ? 'has-file' : ''}`}><FileText aria-hidden="true" size={25} /><span>{file ? file.name : 'Chọn press kit PDF'}</span><small>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF có text · tối đa 10 MB · 50 trang'}</small><input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} disabled={uploading} /></label>
          <button className="admin-primary-action" type="submit" disabled={!file || !uploadConcertId || uploading}><UploadCloud aria-hidden="true" size={17} />{uploading ? 'Đang gửi PDF...' : 'Tạo Artist Bio'}</button>
        </form>

        <div className="ai-bio-latest">
          <ToolHeading eyebrow="Job gần nhất" title="Trạng thái AI" icon={<RefreshCw size={21} />} />
          {latestJob ? <JobSnapshot job={latestJob} concertTitle={concertMap.get(latestJob.concertId)?.title} onOpen={() => void openDetail(latestJob)} /> : <div className="ai-latest-empty"><p>Job vừa tạo sẽ xuất hiện tại đây để bạn theo dõi.</p></div>}
        </div>
      </section>

      <section className="ai-history-section">
        <div className="guest-log-header"><div><span>Lịch sử biên tập</span><h2>Artist Bio jobs</h2></div><button type="button" onClick={() => void loadJobs()} disabled={loadingJobs}><RefreshCw aria-hidden="true" size={16} />Làm mới</button></div>
        <div className="ai-job-filters">
          <label><span>Concert</span><select value={concertFilter} onChange={(event) => updateFilters({ concertId: event.target.value })}><option value="">Tất cả concert</option>{concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.title}</option>)}</select></label>
          <label><span>Trạng thái</span><select value={statusFilter} onChange={(event) => updateFilters({ status: event.target.value })}>{statuses.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}</select></label>
          <button type="button" onClick={() => setSearchParams({}, { replace: true })} disabled={!concertFilter && !statusFilter && page === 0}><RotateCcw aria-hidden="true" size={15} />Xóa bộ lọc</button>
        </div>
        {jobsError ? <div className="admin-notice error" role="alert">{jobsError}</div> : null}
        <div className="admin-data-panel">
          {loadingJobs ? <div className="admin-row-skeleton" aria-label="Đang tải AI jobs" aria-live="polite">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div> : jobs?.content.length ? (
            <div className="admin-table-wrap"><table className="admin-table ai-job-table"><thead><tr><th>PDF</th><th>Concert</th><th>Trạng thái</th><th>Provider</th><th>Thời gian</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{jobs.content.map((job) => <tr key={job.id}><td><strong className="admin-table-primary">{job.originalFileName}</strong><span className="admin-table-secondary">{job.extractedCharCount == null ? job.id.slice(0, 8) : `${job.extractedCharCount.toLocaleString('vi-VN')} ký tự`}</span></td><td><strong className="admin-table-primary">{concertMap.get(job.concertId)?.title ?? 'Concert không xác định'}</strong></td><td><ArtistJobStatus status={job.status} />{job.appliedAt ? <span className="ai-applied-label"><Check size={12} />Đã áp dụng</span> : null}</td><td><strong className="admin-table-primary">{job.provider ?? 'Chưa xác định'}</strong><span className="admin-table-secondary">{job.model ?? 'Đang chờ model'}</span></td><td><strong className="admin-table-primary">{dateTime.format(new Date(job.createdAt))}</strong><span className="admin-table-secondary">{duration(job)}</span></td><td><div className="admin-row-actions"><button type="button" aria-label={`Review ${job.originalFileName}`} onClick={() => void openDetail(job)}><Eye size={16} /></button></div></td></tr>)}</tbody></table></div>
          ) : <div className="admin-empty-state"><Sparkles aria-hidden="true" size={28} /><h2>Chưa có AI job phù hợp</h2><p>Thay đổi bộ lọc hoặc tải press kit đầu tiên để tạo Artist Bio.</p></div>}
        </div>
        {jobs && jobs.totalPages > 1 ? <div className="admin-pagination"><span>Trang {jobs.number + 1} / {jobs.totalPages}</span><div><button type="button" aria-label="Trang trước" disabled={jobs.first} onClick={() => updateFilters({ page: String(page - 1) })}><ChevronLeft size={17} /></button><button type="button" aria-label="Trang sau" disabled={jobs.last} onClick={() => updateFilters({ page: String(page + 1) })}><ChevronRight size={17} /></button></div></div> : null}
      </section>

      {selectedJob ? <ArtistBioReviewDialog job={selectedJob} concert={concertMap.get(selectedJob.concertId)} loading={detailLoading} retrying={retrying} applying={applying} onRetry={() => void retryJob(selectedJob)} onApply={() => requestApply(selectedJob)} onClose={() => setSelectedJob(null)} /> : null}
      {overwriteJob ? <AdminConfirmDialog title={`Thay Artist Bio của “${concertMap.get(overwriteJob.concertId)?.title ?? 'concert'}”?`} description="Concert đã có Artist Bio. Nội dung AI hiện tại sẽ thay thế bản đang được hiển thị công khai và thao tác này không thể tự hoàn tác." confirmLabel="Thay thế bio" destructive={false} loading={applying} onClose={() => setOverwriteJob(null)} onConfirm={() => void applyJob(overwriteJob, true)} /> : null}
    </>
  );
}

function ToolHeading({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: React.ReactNode }) {
  return <div className="guest-section-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div>{icon}</div>;
}

function ArtistJobStatus({ status }: { status: ArtistBioJobStatus }) {
  return <span className={`ai-job-status ai-status-${status.toLowerCase()}`}>{isActive(status) ? <i aria-hidden="true" /> : null}{statusLabel(status)}</span>;
}

function JobSnapshot({ job, concertTitle, onOpen }: { job: ArtistBioJob; concertTitle?: string; onOpen: () => void }) {
  return <div className="ai-job-snapshot"><div><ArtistJobStatus status={job.status} />{job.appliedAt ? <span className="ai-applied-label"><Check size={12} />Đã áp dụng</span> : null}</div>{isActive(job.status) ? <div className="guest-indeterminate" aria-label="AI đang xử lý"><span /></div> : null}<h3>{job.originalFileName}</h3><p>{concertTitle ?? 'Concert không xác định'}</p><dl><div><dt>Provider</dt><dd>{job.provider ?? 'Đang chờ'}</dd></div><div><dt>Ký tự nguồn</dt><dd>{job.extractedCharCount?.toLocaleString('vi-VN') ?? '—'}</dd></div><div><dt>Thời lượng</dt><dd>{duration(job)}</dd></div></dl>{job.errorMessage ? <div className="ai-snapshot-error">{job.errorMessage}</div> : null}<button type="button" onClick={onOpen}>{job.status === 'DONE' ? 'Review nội dung' : 'Xem chi tiết'} <Eye size={15} /></button></div>;
}

function ArtistBioReviewDialog({ job, concert, loading, retrying, applying, onRetry, onApply, onClose }: { job: ArtistBioJob; concert?: ConcertDetail; loading: boolean; retrying: boolean; applying: boolean; onRetry: () => void; onApply: () => void; onClose: () => void }) {
  const busy = retrying || applying;
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && !busy) onClose(); }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  return <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className="admin-dialog ai-review-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-review-title"><header><div><span>Artist Bio review</span><h2 id="ai-review-title">{concert?.title ?? job.originalFileName}</h2></div><button type="button" aria-label="Đóng" onClick={onClose} disabled={busy} autoFocus><X size={20} /></button></header><div className="ai-review-body">{loading ? <div className="batch-detail-loading">Đang tải job mới nhất...</div> : null}<div className="ai-review-meta"><ArtistJobStatus status={job.status} /><span>{job.originalFileName}</span><span>{job.provider ?? 'Chưa có provider'} · {job.model ?? 'chưa có model'}</span></div>{isActive(job.status) ? <div className="guest-indeterminate" aria-label="AI đang xử lý"><span /></div> : null}<dl className="ai-review-facts"><div><dt>Tạo lúc</dt><dd>{dateTime.format(new Date(job.createdAt))}</dd></div><div><dt>Thời lượng</dt><dd>{duration(job)}</dd></div><div><dt>Ký tự trích xuất</dt><dd>{job.extractedCharCount?.toLocaleString('vi-VN') ?? 'Chưa có'}</dd></div><div><dt>Áp dụng</dt><dd>{job.appliedAt ? dateTime.format(new Date(job.appliedAt)) : 'Chưa áp dụng'}</dd></div></dl>{job.resultBio ? <article className="ai-bio-draft"><span>Bản nháp do AI tạo</span><p>{job.resultBio}</p></article> : null}{job.errorMessage ? <div className="batch-error-detail"><span>Job thất bại</span><p>{job.errorMessage}</p></div> : null}</div><footer className="ai-review-actions"><button className="admin-secondary-action" type="button" onClick={onClose} disabled={busy}>Đóng</button>{job.status === 'FAILED' ? <button className="admin-primary-action" type="button" onClick={onRetry} disabled={busy}><RotateCw size={16} />{retrying ? 'Đang retry...' : 'Retry job'}</button> : null}{job.status === 'DONE' && job.resultBio && !job.appliedAt ? <button className="admin-primary-action" type="button" onClick={onApply} disabled={busy}><Sparkles size={16} />{applying ? 'Đang áp dụng...' : 'Áp dụng vào concert'}</button> : null}</footer></section></div>;
}
