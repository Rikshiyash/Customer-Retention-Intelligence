import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  TrendingDown,
  Brain,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/predictions', label: 'Predictions', icon: Brain },
  { path: '/churn-analysis', label: 'Churn Analysis', icon: TrendingDown },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-full bg-white border-r border-[#E2E8F0] z-30 flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#E2E8F0] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold text-[#0F172A] text-base tracking-tight">ChurnGuard</span>
                <div className="text-[10px] font-medium text-[#2563EB] tracking-wide uppercase">Enterprise</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);

          return (
            <NavLink key={path} to={path}>
              <div
                className={cn(
                  'nav-item relative group',
                  isActive && 'nav-item-active',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#2563EB] rounded-r-full" />
                )}
                <Icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F172A] text-white text-xs rounded whitespace-nowrap
                                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {label}
                  </div>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#E2E8F0] p-3 flex-shrink-0">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-2 py-2 rounded-lg mb-2"
          >
            <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#0F172A] truncate">Admin</div>
              <div className="text-[10px] text-[#64748B] truncate">admin@churnguard.io</div>
            </div>
          </motion.div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}

