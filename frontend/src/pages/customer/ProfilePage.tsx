import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../features/auth/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
}

interface OrderItem {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderResponse {
  id: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  status: 'AWAITING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  totalAmount: number;
  expiresAt: string;
  createdAt: string;
  items: OrderItem[];
}

interface TicketResponse {
  id: string;
  orderId: string;
  concertId: string;
  concertTitle: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  qrCode: string;
  status: 'UNUSED' | 'USED' | 'CANCELLED';
  ownerFullName: string;
  ownerPhone: string;
}

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'tickets'>('profile');
  
  // Profile update form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, ordersData, ticketsData] = await Promise.all([
        api.get<any, UserProfile>('/api/users/me/profile'),
        api.get<any, OrderResponse[]>('/api/orders/my'),
        api.get<any, TicketResponse[]>('/api/tickets/my'),
      ]);

      setProfile(profileData);
      setFullName(profileData.fullName);
      setPhone(profileData.phone || '');
      setOrders(ordersData || []);
      setTickets(ticketsData || []);
    } catch (err: any) {
      console.error('Failed to fetch profile details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!fullName.trim() || !phone.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ họ tên và số điện thoại.' });
      return;
    }

    try {
      setActionLoading(true);
      const updated: UserProfile = await api.patch('/api/users/me/profile', {
        fullName,
        phone,
      });
      setProfile(updated);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Cập nhật thông tin cá nhân thành công.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Cập nhật thất bại. Vui lòng thử lại.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1020] py-12 px-4 flex justify-center items-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-white py-12 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-8">Trang cá nhân</h1>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-8 gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 text-sm font-semibold tracking-wide transition cursor-pointer ${
              activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-white'
            }`}
          >
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 text-sm font-semibold tracking-wide transition cursor-pointer ${
              activeTab === 'orders' ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-white'
            }`}
          >
            Lịch sử đơn hàng ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-4 text-sm font-semibold tracking-wide transition cursor-pointer ${
              activeTab === 'tickets' ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-white'
            }`}
          >
            Vé của tôi ({tickets.length})
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

        {/* Tab Contents */}
        {activeTab === 'profile' && profile && (
          <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-xl backdrop-blur">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold">
                {profile.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.fullName}</h2>
                <p className="text-sm text-textMuted">Vai trò: {user?.role}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                  Địa chỉ email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full rounded-xl border border-border bg-bg/50 py-3 px-4 text-textMuted cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full rounded-xl border py-3 px-4 outline-none transition ${
                    isEditing
                      ? 'border-primary bg-bg text-white focus:ring-2 focus:ring-primary/20'
                      : 'border-border bg-bg/50 text-textMuted cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full rounded-xl border py-3 px-4 outline-none transition ${
                    isEditing
                      ? 'border-primary bg-bg text-white focus:ring-2 focus:ring-primary/20'
                      : 'border-border bg-bg/50 text-textMuted cursor-not-allowed'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border/70">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFullName(profile.fullName);
                        setPhone(profile.phone || '');
                      }}
                      className="px-6 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-white/5 cursor-pointer transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-full bg-primary text-sm font-semibold text-white hover:brightness-110 cursor-pointer transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 rounded-full bg-white text-sm font-semibold text-bg hover:bg-gray-200 cursor-pointer transition"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="text-center py-12 rounded-3xl border border-border/70 bg-card/50 text-textMuted">
                Bạn chưa thực hiện bất kỳ đơn hàng nào.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="rounded-3xl border border-border/70 bg-card p-6 shadow-md">
                  <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-border/50">
                    <div>
                      <span className="text-xs text-textMuted font-mono">ĐƠN HÀNG: {order.id.substring(0, 8).toUpperCase()}</span>
                      <h3 className="text-lg font-bold text-white mt-1">{order.concertTitle}</h3>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'PAID'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : order.status === 'AWAITING_PAYMENT'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {order.status === 'PAID'
                        ? 'Đã thanh toán'
                        : order.status === 'AWAITING_PAYMENT'
                        ? 'Chờ thanh toán'
                        : order.status === 'CANCELLED'
                        ? 'Đã hủy'
                        : 'Hết hạn'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-textMuted">
                        <span>
                          {item.ticketTypeName} (x{item.quantity})
                        </span>
                        <span>{(item.unitPrice * item.quantity).toLocaleString()} VND</span>
                      </div>
                    ))}

                    <div className="flex justify-between text-sm font-semibold text-white pt-2 border-t border-border/30">
                      <span>Tổng tiền</span>
                      <span>{order.totalAmount.toLocaleString()} VND</span>
                    </div>

                    <div className="text-xs text-textMuted pt-2">
                      Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')} {new Date(order.createdAt).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="grid gap-6 md:grid-cols-2">
            {tickets.length === 0 ? (
              <div className="col-span-2 text-center py-12 rounded-3xl border border-border/70 bg-card/50 text-textMuted">
                Bạn chưa sở hữu chiếc vé nào.
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-3xl border border-border/70 bg-card p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <span className="text-xs text-textMuted font-mono">MÃ VÉ: {ticket.id.substring(0, 8).toUpperCase()}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          ticket.status === 'UNUSED'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : ticket.status === 'USED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {ticket.status === 'UNUSED' ? 'Chưa sử dụng' : ticket.status === 'USED' ? 'Đã sử dụng' : 'Đã hủy'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mb-1 text-white">{ticket.concertTitle}</h3>
                    <p className="text-sm text-primary font-semibold mb-4">{ticket.ticketTypeName}</p>

                    <div className="text-xs text-textMuted space-y-1 mb-6">
                      <p>Người sở hữu: {ticket.ownerFullName}</p>
                      <p>Số điện thoại: {ticket.ownerPhone}</p>
                    </div>
                  </div>

                  {ticket.status === 'UNUSED' && (
                    <div className="flex justify-center border-t border-border/50 pt-4 bg-white/5 rounded-2xl p-4">
                      <div className="text-center">
                        <div className="bg-white p-2 rounded-xl inline-block mb-2">
                          {/* Emulating a neat QR display */}
                          <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-700 font-mono break-all p-2">
                            {ticket.qrCode}
                          </div>
                        </div>
                        <p className="text-xs text-textMuted">Xuất trình mã QR tại cửa soát vé</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
