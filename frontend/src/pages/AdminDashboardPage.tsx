import { AdminOverviewPage } from './admin/AdminOverviewPage';

/**
 * Compatibility export for older imports. The routed admin experience now
 * lives under the nested /admin workspace.
 */
export function AdminDashboardPage() {
  return <AdminOverviewPage />;
}
