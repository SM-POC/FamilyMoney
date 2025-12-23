
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ChartBarIcon, 
  ArrowPathRoundedSquareIcon, 
  ClockIcon, 
  MapIcon, 
  BanknotesIcon, 
  HomeIcon, 
  CreditCardIcon, 
  HandRaisedIcon, 
  TrophyIcon, 
  IdentificationIcon, 
  ShieldCheckIcon,
  UserCircleIcon,
  PowerIcon,
  SparklesIcon,
  UsersIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  SignalIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { 
  Expense, 
  UserFinancialProfile, 
  StrategyType,
  ReceiptReviewState,
  FamilyUser
} from './types';
import { calculatePayoffSchedule } from './debtCalculator';
import { getFinancialAdvice, HAS_AI_ACCESS } from './geminiService';
import { syncPush, syncPull } from './apiService';

// Import Modular Views
import { NavItem, MobileNavItem } from './SharedComponents';
import { DashboardView } from './DashboardView';
import { OutgoingsHubView } from './OutgoingsHubView';
import { DebtManagerView } from './DebtManagerView';
import { SpendLogView } from './SpendLogView';
import { FutureView } from './FutureView';
import { PaymentTrackerView } from './PaymentTrackerView';
import { IncomeHubView } from './IncomeHubView';
import { MoneyLentView } from './MoneyLentView';
import { FamilyGoalsView } from './FamilyGoalsView';
import { FamilyWalletView } from './FamilyWalletView';
import { FamilyManagementView } from './FamilyManagementView';
import { SettingsView } from './SettingsView';

const STORAGE_KEY = 'money_mate_v1_profile';
// Access injected Auth Key from server environment
const AUTH_KEY = (process.env as any).AUTH_KEY || "";

const EMPTY_PROFILE: UserFinancialProfile = {
  users: [],
  debts: [],
  lentMoney: [],
  expenses: [],
  income: [],
  specialEvents: [],
  goals: [],
  cards: [],
  paymentLogs: [],
  luxuryBudget: 0,
  savingsBuffer: 0,
  strategy: StrategyType.AVALANCHE,
};

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserFinancialProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payment-tracker' | 'spend-log' | 'income' | 'outgoings' | 'debts' | 'goals' | 'planner' | 'cards' | 'money-lent' | 'family-management' | 'settings'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [receiptReview, setReceiptReview] = useState<ReceiptReviewState | null>(null);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [selectedLoginUser, setSelectedLoginUser] = useState<FamilyUser | null>(null);
  const [passwordEntry, setPasswordEntry] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const currentUser = useMemo(() => profile.users.find(u => u.id === profile.currentUserId), [profile.users, profile.currentUserId]);
  const isLoggedIn = !!currentUser;

  // Initial Data Pull - Primary source of users
  const refreshFromDb = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('loading');
    setConnectionError(null);
    try {
      console.log("[MoneyMate] Pulling with key security...");
      const remote = await syncPull('', AUTH_KEY); 
      if (remote) {
        setProfile(p => ({ ...p, ...remote }));
        setConnectionStatus('success');
      }
    } catch (e: any) { 
      console.error("[MoneyMate] Pull failed:", e.message); 
      setConnectionStatus('failed');
      setConnectionError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromDb();
  }, [refreshFromDb]);

  // Automated Real-time Sync for all planner entries
  useEffect(() => {
    if (!isLoggedIn || profile.users.length === 0) return;

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await syncPush('', AUTH_KEY, profile);
        console.log("[MoneyMate] Cloud state updated.");
      } catch (e: any) { 
        console.error("[MoneyMate] Sync failed:", e.message); 
      } finally { 
        setIsSyncing(false); 
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [profile, isLoggedIn]);

  const schedule = useMemo(() => calculatePayoffSchedule(profile), [profile]);
  const totalDebt = (profile.debts || []).reduce((acc, d) => acc + d.balance, 0);
  const totalLent = (profile.lentMoney || []).reduce((acc, l) => acc + l.remainingBalance, 0);
  const totalIncome = (profile.income || []).reduce((acc, i) => acc + i.amount, 0);
  const totalBills = (profile.expenses || []).filter(e => e.isRecurring).reduce((acc, e) => acc + e.amount, 0);
  const totalSubSpend = (profile.expenses || []).filter(e => e.isRecurring && e.isSubscription).reduce((acc, e) => acc + e.amount, 0);
  const totalDebtMins = (profile.debts || []).reduce((acc, d) => acc + d.minimumPayment, 0);
  const surplus = Math.max(0, totalIncome - totalBills - totalDebtMins - (profile.luxuryBudget || 0));
  const freedomDate = schedule.length > 0 ? schedule[schedule.length - 1].monthName : 'N/A';

  const cardSpendData = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string }> = {};
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
    (profile.cards || []).forEach((c, i) => {
      map[c.id] = { name: c.owner || c.name, amount: 0, color: colors[i % colors.length] };
    });
    (profile.expenses || []).filter(e => !e.isRecurring && e.cardId).forEach(e => {
      if (map[e.cardId!]) map[e.cardId!].amount += e.amount;
    });
    return Object.values(map).filter(d => d.amount > 0);
  }, [profile.expenses, profile.cards]);

  const fetchAdvice = useCallback(async () => {
    if (!HAS_AI_ACCESS) return;
    if (totalIncome === 0 && totalDebt === 0) {
      setAdvice("Enter your financial details to receive AI tips.");
      return;
    }
    setLoadingAdvice(true);
    const res = await getFinancialAdvice(`Debt: £${totalDebt}, Income: £${totalIncome}, Subs: £${totalSubSpend}`);
    setAdvice(res);
    setLoadingAdvice(false);
  }, [totalDebt, totalIncome, totalSubSpend]);

  useEffect(() => { if (isLoggedIn) fetchAdvice(); }, [isLoggedIn, fetchAdvice]);

  const handleLogout = () => {
    setProfile(p => ({ ...p, currentUserId: undefined }));
    setSelectedLoginUser(null);
    setPasswordEntry('');
    setLoginError(null);
  };

  const handlePasswordSubmit = () => {
    if (!selectedLoginUser) return;
    const storedPassword = (selectedLoginUser.password || '').trim();
    if (!storedPassword) {
      setLoginError('This account does not have a password yet. Ask an admin to set one.');
      return;
    }

    if (passwordEntry === storedPassword) {
      setProfile(p => ({ ...p, currentUserId: selectedLoginUser.id }));
      setLoginError(null);
      setPasswordEntry('');
    } else {
      setLoginError('Invalid password. Please try again.');
      setPasswordEntry('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[128px]" />
        </div>
        
        <div className="w-full max-w-lg space-y-8 relative z-10 animate-in fade-in zoom-in duration-700">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2.5rem] shadow-2xl mb-4">
              <ShieldCheckIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">MoneyMate</h1>
            <p className="text-slate-400 font-medium tracking-wide">Family Financial Planner</p>
            
            <div className="flex justify-center gap-2 mt-4">
              {connectionStatus === 'success' && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  Database Online
                </div>
              )}
              {connectionStatus === 'failed' && (
                <div className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full border border-rose-500/20 text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                  <NoSymbolIcon className="w-3.5 h-3.5" />
                  Auth / Pull Failure
                </div>
              )}
              {connectionStatus === 'loading' && (
                <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest animate-pulse">
                  <WifiIcon className="w-3.5 h-3.5" />
                  Linking Vault...
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl space-y-8 min-h-[400px] flex flex-col justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-6 text-white">
                <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-500" />
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Querying Engine</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Authenticating with PostgreSQL...</p>
                </div>
              </div>
            ) : connectionStatus === 'failed' ? (
              <div className="text-center space-y-6 animate-in zoom-in">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ExclamationCircleIcon className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">Access Denied</h2>
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">System Error: {connectionError || "Unknown failure"}</p>
                  <p className="text-slate-400 text-[10px] mt-2 italic leading-relaxed px-4">Ensure your Railway AUTH_KEY is correct. The app failed to pull the user list.</p>
                </div>
                <button 
                  onClick={refreshFromDb}
                  className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/20"
                >
                  Retry Connection
                </button>
              </div>
            ) : selectedLoginUser ? (
              <div className="text-center space-y-8 animate-in slide-in-from-bottom-4">
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-24 h-24 rounded-full ${selectedLoginUser.avatarColor} flex items-center justify-center shadow-xl text-white ring-4 ring-slate-700 ring-offset-4 ring-offset-slate-800`}>
                     <UserCircleIcon className="w-16 h-16" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-white uppercase tracking-widest">{selectedLoginUser.name}</h2>
                     <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Enter account password to continue</p>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }} 
                  className="space-y-4"
                >
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 font-black text-sm text-white text-center tracking-[0.3em]"
                    value={passwordEntry}
                    onChange={e => { setPasswordEntry(e.target.value); if (loginError) setLoginError(null); }}
                    autoFocus
                  />
                  {loginError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{loginError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => { setSelectedLoginUser(null); setPasswordEntry(''); setLoginError(null); }} 
                      className="h-16 bg-slate-800 rounded-2xl text-rose-500 font-black text-[10px] uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="h-16 bg-indigo-600 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-sm"
                    >
                      Unlock
                    </button>
                  </div>
                </form>

                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Passwords are stored per user and synced to the database.
                </p>
              </div>
            ) : profile.users.length === 0 ? (
              <div className="text-center space-y-6 animate-in zoom-in">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircleIcon className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest text-emerald-400">Handshake Success</h2>
                  <p className="text-slate-400 text-[10px] italic leading-relaxed px-4">Connected to Railway Postgres. Table is currently empty. Register users via DB or contact Admin.</p>
                </div>
                <button 
                  onClick={refreshFromDb}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-xl"
                >
                  <ArrowPathIcon className="w-4 h-4 inline mr-2" />
                  Refresh Vault
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {profile.users.map(user => (
                  <button 
                    key={user.id}
                    onClick={() => { 
                      setSelectedLoginUser(user);
                      setPasswordEntry('');
                      setLoginError(null);
                    }}
                    className="bg-slate-900/50 p-8 rounded-[3rem] border border-slate-700 hover:border-indigo-500 hover:bg-slate-800/80 transition-all group flex flex-col items-center gap-4 relative shadow-sm"
                  >
                    <LockClosedIcon className="absolute top-4 right-4 w-4 h-4 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                    <div className={`w-20 h-20 rounded-full ${user.avatarColor} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform text-white`}>
                      <UserCircleIcon className="w-12 h-12" />
                    </div>
                    <span className="font-black text-white uppercase tracking-widest text-[11px] mt-2">{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-slate-800 text-center">
             <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500 animate-pulse' : connectionStatus === 'failed' ? 'bg-rose-500' : 'bg-slate-600'}`} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
                  Security Status: {connectionStatus === 'success' ? 'Linked & Encrypted' : connectionStatus === 'failed' ? 'Auth Failure' : 'Linking...'}
                </p>
             </div>
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.1em] italic">System Ready.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64 flex flex-col bg-slate-50">
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex-col p-6 z-30 shadow-2xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheckIcon className="w-6 h-6 text-white" /></div>
            <span className="font-black text-xl italic tracking-tighter uppercase">MoneyMate</span>
          </div>
          {isSyncing && <CloudArrowUpIcon className="w-5 h-5 text-indigo-400 animate-bounce" title="Pushing entries..." />}
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<ChartBarIcon className="w-5 h-5" />} label="Dashboard" />
          <NavItem active={activeTab === 'payment-tracker'} onClick={() => setActiveTab('payment-tracker')} icon={<ArrowPathRoundedSquareIcon className="w-5 h-5" />} label="Live Tracker" />
          <NavItem active={activeTab === 'spend-log'} onClick={() => setActiveTab('spend-log')} icon={<ClockIcon className="w-5 h-5" />} label="Spend Log" />
          <NavItem active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} icon={<MapIcon className="w-5 h-5" />} label="Future View" />
          
          <div className="h-4" />
          <p className="text-[9px] font-black text-slate-500 uppercase px-6 mb-2 tracking-[0.2em]">Data Hub</p>
          <NavItem active={activeTab === 'income'} onClick={() => setActiveTab('income')} icon={<BanknotesIcon className="w-5 h-5" />} label="Income" />
          <NavItem active={activeTab === 'outgoings'} onClick={() => setActiveTab('outgoings')} icon={<HomeIcon className="w-5 h-5" />} label="Bills & Subs" />
          <NavItem active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} icon={<CreditCardIcon className="w-5 h-5" />} label="Debts" />
          <NavItem active={activeTab === 'money-lent'} onClick={() => setActiveTab('money-lent')} icon={<HandRaisedIcon className="w-5 h-5" />} label="Money Lent" />
          
          <div className="h-4" />
          <p className="text-[9px] font-black text-slate-500 uppercase px-6 mb-2 tracking-[0.2em]">Management</p>
          <NavItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<TrophyIcon className="w-5 h-5" />} label="Goals" />
          <NavItem active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<IdentificationIcon className="w-5 h-5" />} label="Cards" />
          <NavItem active={activeTab === 'family-management'} onClick={() => setActiveTab('family-management')} icon={<UsersIcon className="w-5 h-5" />} label="Users" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Cog6ToothIcon className="w-5 h-5" />} label="Database" />
          
          <button onClick={handleLogout} className="w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-rose-400 hover:text-white hover:bg-rose-900 transition-all group mt-auto">
            <PowerIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </nav>

        <div className="mt-6 pt-6 border-t border-slate-800 flex items-center space-x-3 px-2">
          <div className={`w-10 h-10 rounded-full ${currentUser?.avatarColor} flex items-center justify-center shrink-0 shadow-lg border-2 border-slate-700`}>
            <UserCircleIcon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate">{currentUser?.name}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{currentUser?.role}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {activeTab === 'dashboard' && <DashboardView totalDebt={totalDebt} totalLent={totalLent} surplus={surplus} freedomDate={freedomDate} cardSpendData={cardSpendData} advice={advice} loadingAdvice={loadingAdvice} onRefreshAdvice={fetchAdvice} />}
        {activeTab === 'outgoings' && <OutgoingsHubView profile={profile} setProfile={setProfile} totalSubSpend={totalSubSpend} />}
        {activeTab === 'debts' && <DebtManagerView profile={profile} setProfile={setProfile} />}
        {activeTab === 'spend-log' && <SpendLogView profile={profile} setProfile={setProfile} setReceiptReview={setReceiptReview} isScanning={isScanning} setIsScanning={setIsScanning} expandedReceiptId={expandedReceiptId} setExpandedReceiptId={setExpandedReceiptId} />}
        {activeTab === 'planner' && <FutureView schedule={schedule} />}
        {activeTab === 'payment-tracker' && <PaymentTrackerView profile={profile} setProfile={setProfile} />}
        {activeTab === 'income' && <IncomeHubView profile={profile} setProfile={setProfile} />}
        {activeTab === 'money-lent' && <MoneyLentView profile={profile} setProfile={setProfile} />}
        {activeTab === 'goals' && <FamilyGoalsView profile={profile} setProfile={setProfile} />}
        {activeTab === 'cards' && <FamilyWalletView profile={profile} setProfile={setProfile} />}
        {activeTab === 'family-management' && <FamilyManagementView profile={profile} setProfile={setProfile} />}
        {activeTab === 'settings' && <SettingsView profile={profile} setProfile={setProfile} />}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-4 z-40 shadow-inner">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<ChartBarIcon className="w-7 h-7" />} label="Home" />
        <MobileNavItem active={activeTab === 'spend-log'} onClick={() => setActiveTab('spend-log')} icon={<ClockIcon className="w-7 h-7" />} label="Log" />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Cog6ToothIcon className="w-7 h-7" />} label="DB" />
      </nav>
    </div>
  );
};

export default App;
