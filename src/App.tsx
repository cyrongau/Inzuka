import React, { useState, useEffect } from 'react';
import { 
  Home, 
  CheckCircle2, 
  ShoppingCart, 
  Layers, 
  Calendar, 
  UtensilsCrossed, 
  Wallet, 
  Plane,
  Settings,
  Bell,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { Toaster } from 'sonner';

// Views
import HubSelector from './components/HubSelector';
import CommunityDashboard from './components/views/community/Dashboard';
import CommunityDetail from './components/views/community/CommunityDetail';
import HubGroups from './components/views/community/HubGroups';
import HubFinance from './components/views/community/HubFinance';
import HubProjects from './components/views/community/HubProjects';
import HubForums from './components/views/community/HubForums';
import SystemAdminDashboard from './components/views/admin/SystemAdmin';
import NotificationDropdown from './components/NotificationDropdown';
import SupportCenter from './components/views/SupportCenter';
import Dashboard from './components/views/Dashboard';
import GrowthHub from './components/views/GrowthHub';
import Shopping from './components/views/Shopping';
import Chores from './components/views/Chores';
import MealPlanning from './components/views/MealPlanning';
import Budget from './components/views/Budget';
import Holidays from './components/views/Holidays';
import Profile from './components/views/Profile';
import WalletView from './components/views/Wallet';
import Chat from './components/views/Chat';
import PublicVerification from './components/views/community/PublicVerification';
import ScheduledNotifications from './components/ScheduledNotifications';
import { useAuth } from './context/AuthContext.tsx';

import { useTheme } from './context/ThemeContext';

const BRAND_LOGO = "/logo.png"; // Place your logo in /public/logo.png

export default function App() {
  const { user, profile, loading, signIn, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeHub, setActiveHub] = useState<'selection' | 'family' | 'community'>('selection');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [selectedForumThreadId, setSelectedForumThreadId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const checkVerification = () => {
      const path = window.location.pathname;
      if (path.startsWith('/verify/')) {
        const id = path.split('/verify/')[1];
        if (id) setVerificationId(id);
      }
    };
    checkVerification();
    window.addEventListener('popstate', checkVerification);
    return () => window.removeEventListener('popstate', checkVerification);
  }, []);

  if (verificationId) {
    return <PublicVerification verificationId={verificationId} />;
  }

  const familyMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'growth', label: 'Growth Hub', icon: CheckCircle2 },
    { id: 'shopping', label: 'Shopping & Lists', icon: ShoppingCart },
    { id: 'chores', label: 'Chores & Cleaning', icon: Layers },
    { id: 'meals', label: 'Meal Planning', icon: UtensilsCrossed },
    { id: 'chat', label: 'Family Lounge', icon: Bell },
    { id: 'wallet', label: 'Digital Wallet', icon: Wallet },
    { id: 'budget', label: 'Budget & Goals', icon: Layers },
    { id: 'holidays', label: 'Holidays', icon: Plane },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'support', label: 'Get Help', icon: HelpCircle },
  ];

  const communityMenuItems = [
    { id: 'dashboard', label: 'Community Hub', icon: Home },
    { id: 'groups', label: 'Networks & Groups', icon: Layers },
    { id: 'finance', label: 'Table Banking', icon: Wallet },
    { id: 'projects', label: 'Community Projects', icon: Layers },
    { id: 'forums', label: 'Forums & Support', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'support', label: 'Report / Get Help', icon: HelpCircle },
  ];

  const menuItems = activeHub === 'community' ? communityMenuItems : familyMenuItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f5f5]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f5] p-4 text-black">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-black/5 text-center">
          <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 overflow-hidden">
            <img 
              src={BRAND_LOGO} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
              }}
              alt="Inzuka"
            />
          </div>
          <h1 className="text-3xl font-black italic serif tracking-tight mb-2">Welcome to Inzuka</h1>
          <p className="text-gray-500 mb-8 font-light">Organize your home, family, and networks in one place.</p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-black text-white rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-black/90 transition-all active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (activeHub === 'selection' && profile) {
    return <HubSelector onSelect={setActiveHub} hasFamily={!!profile.familyId} user={user} />;
  }

  const renderContent = () => {
    if (!profile) {
      return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Loading profile...</p>
        </div>
      );
    }
    
    if (activeTab === 'sysadmin' && profile?.isSystemAdmin) {
      return <SystemAdminDashboard user={user} />;
    }

    if (activeTab === 'support') {
      return <SupportCenter user={user} profile={profile} />;
    }

    if (activeHub === 'community') {
      if (selectedCommunityId && activeTab === 'dashboard') {
        return (
          <CommunityDetail 
            user={user} 
            profile={profile} 
            communityId={selectedCommunityId} 
            onBack={() => setSelectedCommunityId(null)} 
          />
        );
      }

      switch (activeTab) {
        case 'dashboard': return (
          <CommunityDashboard 
            user={user} 
            profile={profile} 
            onSelectCommunity={setSelectedCommunityId} 
            onOpenForum={(id) => {
              setSelectedForumThreadId(id);
              setActiveTab('forums');
            }}
          />
        );
        case 'groups': return <HubGroups user={user} profile={profile} onSelect={setSelectedCommunityId} />;
        case 'finance': return <HubFinance user={user} />;
        case 'projects': return <HubProjects user={user} />;
        case 'forums': return (
          <HubForums 
            user={user} 
            initialThreadId={selectedForumThreadId || undefined} 
          />
        );
        case 'profile': return <Profile user={user} profile={profile} />;
        default: return <div className="p-8 text-center">Development in progress</div>;
      }
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} profile={profile} />;
      case 'growth': return <GrowthHub user={user} profile={profile} />;
      case 'shopping': return <Shopping user={user} profile={profile} />;
      case 'chores': return <Chores user={user} profile={profile} />;
      case 'meals': return <MealPlanning user={user} profile={profile} />;
      case 'chat': return <Chat user={user} profile={profile} />;
      case 'wallet': return <WalletView user={user} profile={profile} />;
      case 'budget': return <Budget user={user} profile={profile} />;
      case 'holidays': return <Holidays user={user} profile={profile} />;
      case 'profile': return <Profile user={user} profile={profile} />;
      default: return <Dashboard user={user} profile={profile} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] dark:bg-zinc-950 text-black dark:text-gray-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-300">
      <ScheduledNotifications user={user} profile={profile} />
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-lg"
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 bg-white dark:bg-zinc-900 border-r border-black/5 dark:border-white/5 transition-all duration-300 lg:translate-x-0 lg:static lg:block relative",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "w-24" : "w-72"
      )}>
        {/* Collapse Toggle Desktop */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:flex absolute -right-4 top-10 w-8 h-8 bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-full items-center justify-center shadow-lg hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all z-50 text-black dark:text-white"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex flex-col h-full p-6">
          <div className={cn("flex items-center gap-3 mb-10 px-2", isSidebarCollapsed && "justify-center")}>
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src={BRAND_LOGO} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
                }}
                alt="Logo"
              />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-xl tracking-tight">Inzuka</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{activeHub} Hub</span>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                  activeTab === item.id 
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-md shadow-black/10 dark:shadow-white/10" 
                    : "text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white",
                  isSidebarCollapsed && "justify-center px-0"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", activeTab === item.id ? "text-white dark:text-black" : "text-gray-400 group-hover:text-black dark:group-hover:text-white")} />
                {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
            
            {profile?.isSystemAdmin && (
              <div className="pt-4 mt-4 border-t border-black/5">
                <button
                  onClick={() => {
                    setActiveTab('sysadmin');
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                    activeTab === 'sysadmin' 
                      ? "bg-red-500 text-white shadow-md shadow-red-500/20" 
                      : "text-red-500 hover:bg-red-50",
                    isSidebarCollapsed && "justify-center px-0"
                  )}
                >
                  <Home className={cn("w-5 h-5 shrink-0", activeTab === 'sysadmin' ? "text-white" : "text-red-400 group-hover:text-red-500")} />
                  {!isSidebarCollapsed && <span className="font-bold">Overwatch (Admin)</span>}
                </button>
              </div>
            )}
          </nav>

          <div className="pt-6 border-t border-black/5 space-y-4">
            <div 
              className={cn(
                "flex items-center gap-3 px-2 cursor-pointer hover:bg-black/5 p-2 rounded-2xl transition-all",
                isSidebarCollapsed && "justify-center"
              )}
              onClick={() => setActiveTab('profile')}
            >
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                className="w-10 h-10 rounded-full border border-black/5 shrink-0" 
                alt="Profile" 
              />
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate text-sm">{user.displayName}</p>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Toaster position="top-right" expand={false} richColors />
        <header className="p-6 lg:px-10 flex items-center justify-between sticky top-0 bg-[#f5f5f5]/80 dark:bg-zinc-950/80 backdrop-blur-md z-30">
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
              {activeTab === 'dashboard' ? `Welcome back, ${user.displayName?.split(' ')[0]}` : menuItems.find(m => m.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            >
              {theme === 'dark' ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400 dark:text-gray-300"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
            </button>
            <button 
              onClick={() => {
                setActiveHub('selection');
                setActiveTab('dashboard');
              }}
              className="px-4 h-10 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-black/80 dark:hover:bg-white/80 transition-colors flex items-center gap-2"
            >
              <Layers className="w-4 h-4" /> Switch Hub
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors relative"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <NotificationDropdown 
                    notifications={notifications} 
                    onClose={() => setShowNotifications(false)} 
                  />
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className={cn(
                "w-10 h-10 bg-white dark:bg-zinc-800 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors",
                activeTab === 'profile' && "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
              )}
            >
              <Settings className={cn("w-5 h-5", activeTab === 'profile' ? "text-white dark:text-black" : "text-gray-600 dark:text-gray-300")} />
            </button>
          </div>
        </header>

        <div className="p-6 lg:px-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
