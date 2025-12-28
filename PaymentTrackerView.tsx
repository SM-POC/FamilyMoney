
import React from 'react';
import { 
  CheckCircleIcon, 
  BanknotesIcon, 
  HomeIcon, 
  CreditCardIcon, 
  HandRaisedIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';
import { UserFinancialProfile } from './types';

interface PaymentTrackerViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const PaymentTrackerView: React.FC<PaymentTrackerViewProps> = ({ profile, setProfile }) => {
  const currentMonth = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const planProgress = profile.planProgress || {};
  const currentProgress = planProgress[currentMonth] || { completedIds: [] };
  const completedIds = new Set(currentProgress.completedIds || []);

  const toggleItem = (id: string) => {
    setProfile(p => {
      const nextProgress = { ...(p.planProgress || {}) };
      const month = nextProgress[currentMonth] || { completedIds: [] };
      const next = new Set(month.completedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      nextProgress[currentMonth] = { completedIds: Array.from(next) };
      return { ...p, planProgress: nextProgress };
    });
  };

  const trackerItems = [
    ...(profile.income || []).map(i => ({ id: i.id, label: i.source, amount: i.amount, type: 'Income', icon: <BanknotesIcon className="w-5 h-5 text-emerald-500" /> })),
    ...(profile.expenses || []).filter(e => e.isRecurring).map(e => ({ id: e.id, label: e.description, amount: e.amount, type: 'Bill', icon: <HomeIcon className="w-5 h-5 text-rose-500" /> })),
    ...(profile.debts || []).map(d => ({ id: d.id, label: `${d.name} (Min)`, amount: d.minimumPayment, type: 'Debt', icon: <CreditCardIcon className="w-5 h-5 text-indigo-500" /> })),
    ...(profile.lentMoney || []).map(l => ({ id: l.id, label: `From ${l.recipient}`, amount: l.defaultRepayment, type: 'Repayment', icon: <HandRaisedIcon className="w-5 h-5 text-amber-500" /> }))
  ];

  const totalTasks = trackerItems.length;
  const completedTasks = trackerItems.filter(item => completedIds.has(item.id)).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Live Tracker</h1>
          <p className="text-slate-500 font-medium italic">Monitor the cycle for {currentMonth}.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cycle Progress</p>
            <p className="text-2xl font-black text-slate-900">{completedTasks} <span className="text-slate-300">/</span> {totalTasks}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-8 border-slate-50 relative flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-t-transparent animate-spin-slow opacity-20" />
             <p className="text-[10px] font-black">{Math.round(progressPercent)}%</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trackerItems.length === 0 ? (
          <div className="lg:col-span-2 bg-white p-20 rounded-[3.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
             <CircleStackIcon className="w-12 h-12 text-slate-200 mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest">No recurring items to track.</p>
             <p className="text-slate-300 text-xs mt-2 italic">Add Income, Bills, or Debts to populate your live tracker.</p>
          </div>
        ) : (
          trackerItems.map((item) => {
            const isDone = completedIds.has(item.id);
            return (
              <div 
                key={item.id} 
                onClick={() => toggleItem(item.id)}
                className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer flex items-center justify-between group ${isDone ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="flex items-center space-x-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDone ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>
                    {isDone ? <CheckCircleIcon className="w-6 h-6" /> : item.icon}
                  </div>
                  <div>
                    <h3 className={`font-black text-lg tracking-tight transition-all ${isDone ? 'text-indigo-900 line-through opacity-50' : 'text-slate-900'}`}>{item.label}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.type}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={`text-xl font-black tracking-tighter transition-all ${isDone ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {item.type === 'Income' || item.type === 'Repayment' ? '+' : '-'}£{item.amount.toLocaleString()}
                   </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {trackerItems.length > 0 && (
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12">
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight">Cycle Finalisation</h3>
            <p className="text-slate-400 text-sm italic">Completing all tasks ensures your balances update for the next month projection.</p>
          </div>
          <button 
            disabled={progressPercent < 100}
            className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${progressPercent === 100 ? 'bg-indigo-600 text-white shadow-2xl hover:bg-indigo-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
          >
            Finalise {currentMonth}
          </button>
        </div>
      )}
    </div>
  );
};
