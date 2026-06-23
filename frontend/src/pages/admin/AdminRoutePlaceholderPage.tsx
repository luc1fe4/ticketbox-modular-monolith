import { Construction } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';

export function AdminRoutePlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <AdminPageHeader
        eyebrow="Route skeleton"
        title={title}
        description={description}
      />
      <div className="admin-placeholder">
        <Construction aria-hidden="true" size={28} strokeWidth={1.6} />
        <h2>Không gian đã sẵn sàng</h2>
        <p>Điều hướng và phân quyền đã được nối. Nội dung nghiệp vụ sẽ được triển khai tại route này.</p>
      </div>
    </>
  );
}
