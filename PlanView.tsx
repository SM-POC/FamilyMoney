import React, { useMemo, useState } from 'react';
import { MapIcon, Cog6ToothIcon, BanknotesIcon, CalendarIcon, HomeIcon, RocketLaunchIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, StrategyType, PayoffMonth } from './types';

interface PlanViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
  schedule: PayoffMonth[];
}

const currency = (value: number) => `£${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const PlanView: React.FC<PlanViewProps> = ({ profile, setProfile, schedule }) => {
  const [newIncome, setNewIncome] = useState({ source: '', amount: '' });
  const [newBill, setNewBill] = useState({ description: '', amount: '' });
  const [newEvent, setNewEvent] = useState({ name: '', month: '', budget: '' });

  const totalDebt = useMemo(() => (profile.debts || []).reduce((acc, d) => acc + d.balance, 0), [profile.debts]);
  const totalIncome = useMemo(() => (profile.income || []).reduce((acc, i) => acc + i.amount, 0), [profile.income]);
  const totalRecurring = useMemo(() => (profile.expenses || []).filter(e => e.isRecurring).reduce((acc, e) => acc + e.amount, 0), [profile.expenses]);
  const totalSubs = useMemo(() => (profile.expenses || []).filter(e => e.isRecurring && e.isSubscription).reduce((acc, e) => acc + e.amount, 0), [profile.expenses]);
  const freedomDate = schedule.length ? schedule[schedule.length - 1].monthName : 'N/A';

  const readiness = [
    { label: 'Debts captured', ok: (profile.debts || []).length > 0, detail: 'Add at least one liability' },
    { label: 'Income streams', ok: (profile.income || []).length > 0, detail: 'Log salaries or benefits' },
    { label: 'Recurring bills', ok: (profile.expenses || []).some(e => e.isRecurring), detail: 'Track rent, utilities, subs' },
    { label: 'Special events', ok: (profile.specialEvents || []).length > 0, detail: 'Budget events by month' },
    { label: 'Luxury buffer set', ok: (profile.luxuryBudget || 0) > 0, detail: 'Set monthly lifestyle spend' },
    { label: 'Savings buffer set', ok: (profile.savingsBuffer || 0) > 0, detail: 'Reserve % of leftover' },
    { label: 'Strategy chosen', ok: !!profile.strategy, detail: 'Avalanche vs Snowball' },
  ];

  const gaps = readiness.filter(r => !r.ok);

  const handleSetNumber = (key: 'luxuryBudget' | 'savingsBuffer', value: string) => {
    const parsed = parseFloat(value || '0');
    setProfile(p => ({ ...p, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const handleStrategyChange = (value: StrategyType) => {
    setProfile(p => ({ ...p, strategy: value }));
  };

  const addIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.source || !newIncome.amount) return;
    const amount = parseFloat(newIncome.amount);
    if (isNaN(amount)) return;
    setProfile(p => ({
      ...p,
      income: [...(p.income || []), { id: Math.random().toString(36).substr(2, 9), source: newIncome.source, amount }]
    }));
    setNewIncome({ source: '', amount: '' });
  };

  const addBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.description || !newBill.amount) return;
    const amount = parseFloat(newBill.amount);
    if (isNaN(amount)) return;
    setProfile(p => ({
      ...p,
      expenses: [
        ...(p.expenses || []),
        { id: Math.random().toString(36).substr(2, 9), category: 'Essential', description: newBill.description, amount, isRecurring: true, date: new Date().toISOString().slice(0, 10) }
      ]
    }));
    setNewBill({ description: '', amount: '' });
  };

  const addEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name || newEvent.month === '' || !newEvent.budget) return;
    const budget = parseFloat(newEvent.budget);
    const monthNum = parseInt(newEvent.month, 10);
    if (isNaN(budget) || isNaN(monthNum)) return;
    setProfile(p => ({
      ...p,
      specialEvents: [
        ...(p.specialEvents || []),
        { id: Math.random().toString(36).substr(2, 9), name: newEvent.name, month: monthNum, budget }
      ]
    }));
    setNewEvent({ name: '', month: '', budget: '' });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-500">Debt Freedom Plan</p>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Plan Setup</h1>
          <p className="text-slate-500 max-w-2xl">Gather the essentials so the Future View can project accurately. Fill gaps, set buffers, and pick a repayment style.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-w-[240px]">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Projected freedom</p>
          <p className="text-2xl font-black text-indigo-600 tracking-tight">{freedomDate}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
            <RocketLaunchIcon className="w-4 h-4 text-indigo-500" /> Uses current plan inputs
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><Cog6ToothIcon className="w-5 h-5 text-indigo-500" /> Plan settings</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Feeds the Future View</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Luxury buffer (per month)</p>
              <div className="flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-indigo-500" />
                <input
                  type="number"
                  value={profile.luxuryBudget || ''}
                  onChange={e => handleSetNumber('luxuryBudget', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-black text-sm"
                  placeholder="0"
                  min={0}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Keep lifestyle spend defined</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-white space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Savings buffer (%)</p>
              <input
                type="number"
                value={profile.savingsBuffer || ''}
                onChange={e => handleSetNumber('savingsBuffer', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-black text-sm"
                placeholder="0"
                min={0}
                max={100}
              />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Portion of leftover set aside</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-white space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Repayment strategy</p>
              <select
                value={profile.strategy}
                onChange={e => handleStrategyChange(e.target.value as StrategyType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-[10px] uppercase tracking-widest"
              >
                {Object.values(StrategyType).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Avalanche saves interest; Snowball builds momentum</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Debt balance</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{currency(totalDebt)}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Across all liabilities</p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-100 bg-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Monthly income</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{currency(totalIncome)}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Streams captured</p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-100 bg-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Recurring spend</p>
              <p className="text-xl font-black text-rose-600 tracking-tight">-{currency(totalRecurring)}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Subs: {currency(totalSubs)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"><MapIcon className="w-5 h-5 text-indigo-500" /> Plan readiness</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{gaps.length === 0 ? 'All good' : `${gaps.length} gaps`}</span>
          </div>
          <div className="space-y-3">
            {readiness.map((item, idx) => (
              <div key={idx} className={`p-3 rounded-2xl border flex items-center justify-between ${item.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-2">
                  {item.ok ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />}
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{item.label}</span>
                </div>
                {!item.ok && <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{item.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"><BanknotesIcon className="w-5 h-5 text-indigo-500" /> Quick income</h3>
          <form onSubmit={addIncome} className="space-y-3">
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm" placeholder="Source (e.g. Salary)" value={newIncome.source} onChange={e => setNewIncome({ ...newIncome, source: e.target.value })} />
            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm" placeholder="Amount per month" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-colors">Add income</button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"><HomeIcon className="w-5 h-5 text-indigo-500" /> Quick recurring bill</h3>
          <form onSubmit={addBill} className="space-y-3">
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm" placeholder="Bill name (e.g. Rent)" value={newBill.description} onChange={e => setNewBill({ ...newBill, description: e.target.value })} />
            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm" placeholder="Amount per month" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-colors">Add bill</button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-indigo-500" /> Quick event</h3>
          <form onSubmit={addEvent} className="space-y-3">
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm" placeholder="Event name (e.g. Holiday)" value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })} />
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-[10px] uppercase tracking-widest" value={newEvent.month} onChange={e => setNewEvent({ ...newEvent, month: e.target.value })}>
              <option value="">Select month</option>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm" placeholder="Budget" value={newEvent.budget} onChange={e => setNewEvent({ ...newEvent, budget: e.target.value })} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-colors">Add event</button>
          </form>
        </div>
      </div>
    </div>
  );
};
