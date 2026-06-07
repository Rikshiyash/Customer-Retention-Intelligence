import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/predictions': 'Predictions',
  '/churn-analysis': 'Churn Analysis',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

interface TopbarProps {
  sidebarCollapsed: boolean;
  notificationCount?: number;
}

export function Topbar({ sidebarCollapsed, notificationCount = 0 }: TopbarProps) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const currentPage = breadcrumbMap[location.pathname] || 'Page';

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-white border-b border-[#E2E8F0] z-20 flex items-center px-6 gap-4"
      style={{ left: sidebarCollapsed ? 64 : 240, transition: 'left 0.2s ease-in-out' }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
        <span className="text-[#64748B]">ChurnGuard</span>
        <span className="text-[#CBD5E1]">/</span>
        <span className="font-semibold text-[#0F172A]">{currentPage}</span>
      </div>

      {/* Search */}
      <div className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150
        ${searchFocused ? 'border-[#2563EB] bg-white ring-2 ring-[#2563EB]/20 w-72' : 'border-[#E2E8F0] bg-[#F8FAFC] w-56'}`}>
        <Search className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none w-full"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[#94A3B8] border border-[#E2E8F0] rounded">
          ⌘K
        </kbd>
      </div>

      {/* Notifications */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-colors">
        <Bell className="w-4 h-4 text-[#64748B]" />
        {notificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full" />
        )}
      </button>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-sm font-medium text-[#0F172A] hidden sm:block">Admin</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-dropdown z-20 py-1">
              <div className="px-3 py-2.5 border-b border-[#E2E8F0]">
                <div className="text-sm font-semibold text-[#0F172A]">Admin User</div>
                <div className="text-xs text-[#64748B]">admin@churnguard.io</div>
              </div>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors">
                <User className="w-4 h-4" />
                Profile
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="border-t border-[#E2E8F0] mt-1 pt-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
