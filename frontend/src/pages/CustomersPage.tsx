import { useState, useEffect } from 'react';
import { api, Subscriber } from '../api/client';
import { LoadingState } from '../components/ui/LoadingState';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

export function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.getSubscribers({ page, page_size: 25 })
      .then(res => {
        setSubscribers(res.subscribers);
        setTotal(res.total);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [page]);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-0 flex-shrink-0">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">Manage and monitor all your subscribers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search ID..." className="input pl-9 w-64" />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      <div className="card flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <LoadingState text="Loading customers..." />
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] z-10">
                <tr>
                  <th className="px-5 py-3 font-medium text-[#64748B]">Subscriber ID</th>
                  <th className="px-5 py-3 font-medium text-[#64748B]">Region</th>
                  <th className="px-5 py-3 font-medium text-[#64748B]">Package</th>
                  <th className="px-5 py-3 font-medium text-[#64748B]">Tenure</th>
                  <th className="px-5 py-3 font-medium text-[#64748B]">ARPU</th>
                  <th className="px-5 py-3 font-medium text-[#64748B]">Risk Level</th>
                  <th className="px-5 py-3 font-medium text-[#64748B] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {subscribers.map((sub) => (
                  <tr key={sub.subscriber_id} className="hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                    <td className="px-5 py-3 font-medium text-[#0F172A]">{sub.subscriber_id}</td>
                    <td className="px-5 py-3 text-[#64748B]">{sub.region}</td>
                    <td className="px-5 py-3 text-[#64748B]">{sub.package_type}</td>
                    <td className="px-5 py-3 text-[#64748B]">{sub.tenure_months} mo</td>
                    <td className="px-5 py-3 text-[#0F172A] font-medium">{formatCurrency(sub.arpu)}</td>
                    <td className="px-5 py-3">
                      <RiskBadge level={sub.risk_tier} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0] bg-white flex-shrink-0">
          <span className="text-sm text-[#64748B]">
            Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-[#E2E8F0] rounded-md disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page * 25 >= total}
              className="p-1.5 border border-[#E2E8F0] rounded-md disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
