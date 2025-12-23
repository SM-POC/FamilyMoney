
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
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  UserCircleIcon,
  PowerIcon,
  UserPlusIcon,
  SparklesIcon,
  UsersIcon,
  Cog6ToothIcon
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

const STORAGE_KEY = 'money_master_v31_gbp_profile';

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
  const [profile, setProfile] = useState<UserFinancialProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.users) parsed.users = [];
        return parsed;
      }
    } catch (e) { console.error(e); }
    return EMPTY_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'payment-tracker' | 'spend-log' | 'income' | 'outgoings' | 'debts' | 'goals' | 'planner' | 'cards' | 'money-lent' | 'family-management' | 'settings'>('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);
  const [receiptReview, setReceiptReview] = useState<ReceiptReviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [regName, setRegName] = useState('');

  const currentUser = useMemo(() => profile.users.find(u => u.id === profile.currentUserId), [profile.users, profile.currentUserId]);
  const isLoggedIn = !!currentUser;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }, [profile]);

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
      setAdvice("Start by adding your income and debts to get personalized AI strategy advice.");
      return;
    }
    setLoadingAdvice(true);
    const res = await getFinancialAdvice(`Total Debt: £${totalDebt}, Total Income: £${totalIncome}, Lent: £${totalLent}, Subs: £${totalSubSpend}`);
    setAdvice(res);
    setLoadingAdvice(false);
  }, [totalDebt, totalIncome, totalLent, totalSubSpend]);

  useEffect(() => { if (isLoggedIn) fetchAdvice(); }, [isLoggedIn]);

  const handleLogout = () => setProfile(p => ({ ...p, currentUserId: undefined }));

  const handleAddUser = (name: string) => {
    if (!name.trim()) return;
    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];
    const newUser: FamilyUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      role: profile.users.length === 0 ? 'Admin' : 'Member',
      avatarColor: colors[profile.users.length % colors.length]
    };
    setProfile(p => ({ ...p, users: [...p.users, newUser], currentUserId: newUser.id }));
    setRegName('');
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
            <p className="text-slate-400 font-medium">Secure Family Gateway</p>
          </div>

          {profile.users.length === 0 ? (
            <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Initial Setup</h2>
                <p className="text-slate-400 text-xs mt-2 italic">Create your primary administrator profile to begin.</p>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Your Name (e.g. David)" 
                  className="w-full bg-slate-900 border-none rounded-2xl p-5 text-white font-black text-sm focus:ring-2 focus:ring-indigo-500"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUser(regName)}
                />
                <button 
                  onClick={() => handleAddUser(regName)}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-500 transition-colors"
                >
                  Create Admin Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {profile.users.map(user => (
                <button 
                  key={user.id}
                  onClick={() => setProfile(p => ({ ...p, currentUserId: user.id }))}
                  className="bg-slate-800 p-8 rounded-[3rem] border border-slate-700 hover:border-indigo-500 transition-all group flex flex-col items-center gap-4"
                >
                  <div className={`w-20 h-20 rounded-full ${user.avatarColor} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform text-white`}>
                    <UserCircleIcon className="w-12 h-12" />
                  </div>
                  <span className="font-black text-white uppercase tracking-widest text-[10px]">{user.name}</span>
                </button>
              ))}
              
              <button 
                onClick={() => {
                  const name = prompt("Family Member Name?");
                  if (name) handleAddUser(name);
                }}
                className="bg-slate-800/50 p-8 rounded-[3rem] border border-dashed border-slate-700 hover:border-indigo-500 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                  <UserPlusIcon className="w-8 h-8 text-slate-400" />
                </div>
                <span className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Add Member</span>
              </button>
            </div>
          )}
          
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-slate-800">
             <div className="flex items-center gap-2">
                <SparklesIcon className={`w-4 h-4 ${HAS_AI_ACCESS ? 'text-amber-400' : 'text-slate-600'}`} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  AI Engine: {HAS_AI_ACCESS ? 'Online (Gemini)' : 'Offline'}
                </p>
             </div>
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.1em]">Family Data is stored locally in this browser.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64 flex flex-col bg-slate-50">
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex-col p-6 z-30 shadow-2xl">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheckIcon className="w-6 h-6 text-white" /></div>
          <span className="font-black text-xl italic tracking-tighter uppercase">MoneyMate</span>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<ChartBarIcon className="w-5 h-5" />} label="Dashboard" />
          <NavItem active={activeTab === 'payment-tracker'} onClick={() => setActiveTab('payment-tracker')} icon={<ArrowPathRoundedSquareIcon className="w-5 h-5" />} label="Live Tracker" />
          <NavItem active={activeTab === 'spend-log'} onClick={() => setActiveTab('spend-log')} icon={<ClockIcon className="w-5 h-5" />} label="Spend Log" />
          <NavItem active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} icon={<MapIcon className="w-5 h-5" />} label="Future View" />
          
          <div className="h-4" />
          <p className="text-[9px] font-black text-slate-500 uppercase px-6 mb-2 tracking-[0.2em]">Setup</p>
          <NavItem active={activeTab === 'income'} onClick={() => setActiveTab('income')} icon={<BanknotesIcon className="w-5 h-5" />} label="Income" />
          <NavItem active={activeTab === 'outgoings'} onClick={() => setActiveTab('outgoings')} icon={<HomeIcon className="w-5 h-5" />} label="Bills & Subs" />
          <NavItem active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} icon={<CreditCardIcon className="w-5 h-5" />} label="Debts" />
          <NavItem active={activeTab === 'money-lent'} onClick={() => setActiveTab('money-lent')} icon={<HandRaisedIcon className="w-5 h-5" />} label="Money Lent" />
          <NavItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<TrophyIcon className="w-5 h-5" />} label="Goals" />
          <NavItem active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<IdentificationIcon className="w-5 h-5" />} label="Cards" />
          
          <div className="h-4" />
          <p className="text-[9px] font-black text-slate-500 uppercase px-6 mb-2 tracking-[0.2em]">Management</p>
          <NavItem active={activeTab === 'family-management'} onClick={() => setActiveTab('family-management')} icon={<UsersIcon className="w-5 h-5" />} label="Family & Users" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Cog6ToothIcon className="w-5 h-5" />} label="Settings & Sync" />
          
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
          {!HAS_AI_ACCESS && (
             <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-rose-500/50 shadow-md" title="AI Offline" />
          )}
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
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Cog6ToothIcon className="w-7 h-7" />} label="Settings" />
      </nav>
    </div>
  );
};

export default App;
