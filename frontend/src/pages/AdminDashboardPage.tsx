import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface ConcertSummary {
  id: string;
  title: string;
  artist: string;
}

interface PageResponse<T> {
  content: T[];
}

interface BatchLog {
  id: string;
  jobName: string;
  status: 'COMPLETED' | 'FAILED' | 'STARTED';
  startTime: string;
  endTime: string;
  readCount: number;
  writeCount: number;
  skipCount: number;
  errorMessage?: string;
}

interface Guest {
  id: string;
  concertId: string;
  fullName: string;
  phone: string;
  ticketTypeName: string;
  quantity: number;
  isActive: boolean;
}

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'guestlist' | 'batchlogs'>('overview');
  
  // Concerts state
  const [concerts, setConcerts] = useState<ConcertSummary[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState('');
  
  // Guest list state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [file, setFile] = useState<File | null>(null);
  
  // Batch logs state
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConcerts();
    fetchBatchLogs();
  }, []);

  const fetchConcerts = async () => {
    try {
      const data = await api.get<any, PageResponse<ConcertSummary>>('/api/concerts');
      if (data && data.content) {
        setConcerts(data.content);
        if (data.content.length > 0) {
          setSelectedConcertId(data.content[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load concerts', err);
    }
  };

  const fetchBatchLogs = async () => {
    try {
      const logs = await api.get<any, BatchLog[]>('/api/admin/batch-logs');
      setBatchLogs(logs || []);
    } catch (err) {
      console.error('Failed to load batch logs', err);
    }
  };

  const fetchGuests = async (concertId: string) => {
    if (!concertId) return;
    try {
      setLoading(true);
      const guestList = await api.get<any, Guest[]>(`/api/admin/concerts/${concertId}/guest-lists`);
      setGuests(guestList || []);
    } catch (err) {
      console.error('Failed to load guests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedConcertId && activeTab === 'guestlist') {
      fetchGuests(selectedConcertId);
    }
  }, [selectedConcertId, activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadGuestList = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedConcertId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn sự kiện.' });
      return;
    }

    if (!file) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file CSV để nhập.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setActionLoading(true);
      await api.post(`/api/admin/concerts/${selectedConcertId}/guest-lists/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage({ type: 'success', text: 'Khởi chạy tiến trình nhập danh sách khách mời thành công!' });
      setFile(null);
      
      // Clear file input
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh guest list and batch logs
      fetchGuests(selectedConcertId);
      fetchBatchLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi tải lên file khách mời.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerScanner = async () => {
    setMessage(null);
    try {
      setActionLoading(true);
      const res: any = await api.post('/api/admin/batch-jobs/guest-list-import/run');
      setMessage({ type: 'success', text: res.message || 'Đã kích hoạt quét thư mục import khách mời tự động.' });
      // Refresh logs after brief delay
      setTimeout(fetchBatchLogs, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể chạy tiến trình quét tự động.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-white py-12 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-display font-bold">Quản trị Hệ thống</h1>
            <p className="text-sm text-textMuted mt-1">Hệ thống quản lý vé và khách mời NovaStage</p>
          </div>
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-white/5 cursor-pointer transition"
          >
            Quay về trang chủ
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-8 gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-semibold tracking-wide transition cursor-pointer ${
              activeTab === 'overview' ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-white'
            }`}
          >
            Tổng quan chỉ số
          </button>
          <button
            onClick={() => setActiveTab('guestlist')}
            className={`pb-4 text-sm font-semibold tracking-wide transition cursor-pointer ${
              activeTab === 'guestlist' ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-white'
            }`}
          >
            Danh sách Khách mời
          </button>
          <button
            onClick={() => setActiveTab('batchlogs')}
            className={`pb-4 text-sm font-semibold tracking-wide transition cursor-pointer ${
              activeTab === 'batchlogs' ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-white'
            }`}
          >
            Nhật ký Tiến trình Batch
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm ${
              message.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-md backdrop-blur">
                <span className="text-3xl">💰</span>
                <h3 className="text-sm font-semibold text-textMuted mt-4">Doanh thu vé</h3>
                <p className="text-2xl font-bold mt-1 text-green-400">1,280,000,000 VND</p>
              </div>

              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-md backdrop-blur">
                <span className="text-3xl">🎫</span>
                <h3 className="text-sm font-semibold text-textMuted mt-4">Số lượng vé bán ra</h3>
                <p className="text-2xl font-bold mt-1 text-primary">842 vé</p>
              </div>

              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-md backdrop-blur">
                <span className="text-3xl">🎤</span>
                <h3 className="text-sm font-semibold text-textMuted mt-4">Sự kiện hoạt động</h3>
                <p className="text-2xl font-bold mt-1 text-white">12 sự kiện</p>
              </div>

              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-md backdrop-blur">
                <span className="text-3xl">⚡</span>
                <h3 className="text-sm font-semibold text-textMuted mt-4">Hệ thống</h3>
                <p className="text-2xl font-bold mt-1 text-blue-400">Hoạt động bình thường</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-md">
              <h2 className="text-xl font-bold mb-4">Mô tả và Hướng dẫn quản trị</h2>
              <p className="text-textMuted leading-7 mb-4">
                Trang quản trị cho phép nhà quản lý theo dõi giao dịch bán vé trực tuyến của hệ thống. Bạn có thể sử dụng các chức năng nhập danh sách khách mời đặc biệt (VIP, Ban tổ chức) qua file CSV bằng Spring Batch Job để hệ thống tự động ghi nhận vé hợp lệ.
              </p>
              <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-sm">
                📌 Định dạng file CSV khách mời hợp lệ: <code className="bg-bg px-2 py-0.5 rounded text-white text-xs">fullName, phone, ticketTypeName, quantity</code>
              </div>
            </div>
          </div>
        )}

        {/* Guest List Import Tab */}
        {activeTab === 'guestlist' && (
          <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
            {/* Import Form */}
            <div className="rounded-3xl border border-border/70 bg-card p-6 h-fit">
              <h2 className="text-lg font-bold mb-6">Nhập danh sách khách mời</h2>
              
              <form onSubmit={handleUploadGuestList} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                    Chọn sự kiện
                  </label>
                  <select
                    value={selectedConcertId}
                    onChange={(e) => setSelectedConcertId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg py-3 px-4 text-white outline-none focus:border-primary"
                  >
                    {concerts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                    Chọn File CSV
                  </label>
                  <input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full text-sm text-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-primary text-sm font-semibold text-white hover:brightness-110 cursor-pointer transition disabled:opacity-50"
                >
                  {actionLoading ? 'Đang nhập tiến trình...' : 'Bắt đầu Import (Batch)'}
                </button>
              </form>
            </div>

            {/* Guest list Table */}
            <div className="rounded-3xl border border-border/70 bg-card p-6 overflow-hidden">
              <h2 className="text-lg font-bold mb-6">Danh sách khách mời đã duyệt</h2>
              
              {loading ? (
                <div className="text-center py-12 text-textMuted">Đang tải khách mời...</div>
              ) : guests.length === 0 ? (
                <div className="text-center py-12 text-textMuted">Chưa có khách mời nào trong sự kiện này.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-textMuted font-semibold">
                        <th className="pb-3">Họ và tên</th>
                        <th className="pb-3">Số điện thoại</th>
                        <th className="pb-3">Hạng vé</th>
                        <th className="pb-3 text-center">Số lượng</th>
                        <th className="pb-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guests.map((g) => (
                        <tr key={g.id} className="border-b border-border/30 hover:bg-white/5 transition">
                          <td className="py-3 font-semibold">{g.fullName}</td>
                          <td className="py-3 font-mono text-textMuted">{g.phone}</td>
                          <td className="py-3 text-primary font-semibold">{g.ticketTypeName}</td>
                          <td className="py-3 text-center font-bold">{g.quantity}</td>
                          <td className="py-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Batch Logs Tab */}
        {activeTab === 'batchlogs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-3xl border border-border">
              <div>
                <h2 className="text-lg font-bold">Nhật ký tiến trình Spring Batch</h2>
                <p className="text-sm text-textMuted mt-1">Giám sát hiệu suất đọc, ghi, bỏ qua và lỗi của các tác vụ tải tệp khách mời</p>
              </div>

              <button
                onClick={handleTriggerScanner}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-full bg-primary text-sm font-semibold hover:brightness-110 cursor-pointer transition disabled:opacity-50"
              >
                Kích hoạt quét thư mục import
              </button>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-6 overflow-hidden">
              {batchLogs.length === 0 ? (
                <div className="text-center py-12 text-textMuted">Chưa có nhật ký tiến trình nào.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-textMuted font-semibold">
                        <th className="pb-3">Job ID/Name</th>
                        <th className="pb-3">Trạng thái</th>
                        <th className="pb-3">Đã đọc</th>
                        <th className="pb-3">Đã ghi</th>
                        <th className="pb-3">Bỏ qua</th>
                        <th className="pb-3">Thời gian</th>
                        <th className="pb-3 text-right">Chi tiết lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border/30 hover:bg-white/5 transition">
                          <td className="py-3">
                            <p className="font-semibold text-white">{log.jobName}</p>
                            <p className="text-[10px] text-textMuted font-mono mt-0.5">{log.id}</p>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                log.status === 'COMPLETED'
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : log.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold">{log.readCount}</td>
                          <td className="py-3 font-mono font-bold text-green-400">{log.writeCount}</td>
                          <td className="py-3 font-mono font-bold text-yellow-400">{log.skipCount}</td>
                          <td className="py-3 text-textMuted text-xs">
                            {new Date(log.startTime).toLocaleTimeString()} - {log.endTime ? new Date(log.endTime).toLocaleTimeString() : '...'}
                          </td>
                          <td className="py-3 text-right max-w-xs truncate text-red-400 font-mono text-xs">
                            {log.errorMessage || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
