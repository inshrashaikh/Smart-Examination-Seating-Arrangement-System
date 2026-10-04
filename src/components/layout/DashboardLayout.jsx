import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PageTransition from './PageTransition';
import useMediaQuery from '../../hooks/useMediaQuery';
import cn from '../../utils/cn';

/**
 * Authenticated shell: collapsible sidebar + sticky topbar + animated page.
 * Collapsed state is remembered for the session.
 */
export default function DashboardLayout({ children, title, subtitle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={isDesktop && collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div
        className={cn(
          'transition-[padding] duration-300',
          isDesktop && (collapsed ? 'lg:pl-[76px]' : 'lg:pl-[268px]')
        )}
      >
        <Topbar
          title={title}
          subtitle={subtitle}
          onOpenSidebar={() => setMobileOpen(true)}
        />

        <AnimatePresence mode="wait">
          <PageTransition key={title}>
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </PageTransition>
        </AnimatePresence>
      </div>
    </div>
  );
}

export { DashboardLayout };
