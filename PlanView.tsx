import React, { useMemo, useState } from 'react';
import { MapIcon, Cog6ToothIcon, BanknotesIcon, CalendarIcon, HomeIcon, RocketLaunchIcon, CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, StrategyType, PayoffMonth, DebtPlanPreferences } from './types';
import { calculatePayoffSchedule } from './debtCalculator';
import { getFinancialAdvice, HAS_AI_ACCESS } from './geminiService';

interface PlanViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
  schedule: PayoffMonth[];
  baseSchedule: PayoffMonth[];
}

const currency = (value: number) => `£${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const PlanView: React.FC<PlanViewProps> = ({ profile, setProfile, schedule, baseSchedule }) => {
  const [newIncome, setNewIncome] = useState({ source: '', amount: '' });
  const [newBill, setNewBill] = useState({ description: '', amount: '' });
  const [newEvent, setNewEvent] = useState({ name: '', month: '', budget: '' });
  const existingPlan = profile.debtPlan;
  const [mode, setMode] = useState<'funds' | 'date'>(existingPlan?.mode ?? 'funds');
  const [extraMonthly, setExtraMonthly] = useState<number>(
    existingPlan?.mode === 'date'
      ? (existingPlan?.requiredMonthly ?? existingPlan?.extraMonthly ?? 0)
      : (existingPlan?.extraMonthly ?? 0)
  );
  const [targetDate, setTargetDate] = useState<string>(existingPlan?.targetDate ?? '');
  const [preferences, setPreferences] = useState<DebtPlanPreferences>(existingPlan?.preferences ?? {
    protectLuxury: true,
    protectSubscriptions: true,
    avoidPenaltyOverpay: true,
    keepSavingsBuffer: true,
  });
  const [userIntent, setUserIntent] = useState(existingPlan?.userIntent ?? '');
  const [interpretedIntent, setInterpretedIntent] = useState(existingPlan?.interpretedIntent ?? '');
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);

  const totalDebt = useMemo(() => (profile.debts || []).reduce((acc, d) => acc + d.balance, 0), [profile.debts]);
  const totalIncome = useMemo(() => (profile.income || []).reduce((acc, i) => acc + i.amount, 0), [profile.income]);
  const totalRecurring = useMemo(() => (profile.expenses || []).filter(e => e.isRecurring).reduce((acc, e) => acc + e.amount, 0), [profile.expenses]);
  const totalSubs = useMemo(() => (profile.expenses || []).filter(e => e.isRecurring && e.isSubscription).reduce((acc, e) => acc + e.amount, 0), [profile.expenses]);
  const freedomDate = schedule.length ? schedule[schedule.length - 1].monthName : 'N/A';

  const safeParseNumber = (value: string) => {
    const parsed = parseFloat(value || '0');
    return isNaN(parsed) ? 0 : parsed;
  };

  const monthsBetweenNow = useMemo(() => {
    if (!targetDate) return null;
    const target = new Date(`${targetDate}-01`);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  }, [targetDate]);

  const minTargetMonth = useMemo(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const buildSchedule = (push: number, maxMonths = 360) => calculatePayoffSchedule(profile, {
    monthlyOverpayment: Math.max(0, push),
    maxMonths,
    respectLuxuries: preferences.protectLuxury,
    respectSubscriptions: preferences.protectSubscriptions,
    avoidPenaltyOverpay: preferences.avoidPenaltyOverpay,
    respectSavingsBuffer: preferences.keepSavingsBuffer
  });

  const targetRequirement = useMemo(() => {
    if (monthsBetweenNow === null) return { required: null as number | null, feasible: false };
    if (monthsBetweenNow <= 0) return { required: 0, feasible: true };

    const baseLength = baseSchedule.length;
    if (baseLength > 0 && baseLength <= monthsBetweenNow) return { required: 0, feasible: true };

    let high = Math.max(totalDebt * 2, 1000);
    let highPlan = buildSchedule(high, Math.max(monthsBetweenNow, 360));
    let safety = 0;
    while (highPlan.length > monthsBetweenNow && safety < 5) {
      high *= 1.5;
      highPlan = buildSchedule(high, Math.max(monthsBetweenNow, 360));
      safety++;
    }

    if (highPlan.length > monthsBetweenNow) return { required: null, feasible: false };

    let low = 0;
    let best: number | null = null;
    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2;
      const sim = buildSchedule(mid, Math.max(monthsBetweenNow, 360));
      const len = sim.length;
      if (len <= monthsBetweenNow) {
        best = mid;
        high = mid;
      } else {
        low = mid;
      }
    }

    return { required: best, feasible: best !== null };
  }, [monthsBetweenNow, baseSchedule.length, preferences.avoidPenaltyOverpay, preferences.protectLuxury, preferences.protectSubscriptions, preferences.keepSavingsBuffer, totalDebt, profile]);

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
    const parsed = safeParseNumber(value);
    setProfile(p => ({ ...p, [key]: parsed }));
  };

  const handleStrategyChange = (value: StrategyType) => {
    setProfile(p => ({ ...p, strategy: value }));
  };

  const handleInterpretIntent = async () => {
    if (!userIntent.trim()) return;
    if (!HAS_AI_ACCESS) {
      setPlanError('AI interpretation is unavailable. Add an API key to use this feature.');
      return;
    }
    setIsInterpreting(true);
    setPlanError(null);
    try {
      const advice = await getFinancialAdvice(userIntent);
      setInterpretedIntent(advice);
    } catch (err: any) {
      setPlanError(err.message || 'Failed to interpret intent.');
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setPlanError(null);
    setPlanSuccess(null);
    try {
      let monthlyPush = Math.max(0, extraMonthly);
      let requiredMonthly: number | null = null;
      let maxMonths = 360;

      if (mode === 'date') {
        if (monthsBetweenNow === null) throw new Error('Choose a valid future month.');
        const requirement = targetRequirement;
        if (!requirement.feasible || requirement.required === null) throw new Error('Target is unreachable with current inputs.');
        monthlyPush = requirement.required;
        requiredMonthly = requirement.required;
        maxMonths = Math.max(monthsBetweenNow, 360);
      }

      const planSchedule = buildSchedule(monthlyPush, maxMonths);
      const effectiveMonthly = monthlyPush;

      await setProfile(p => ({
        ...p,
        debtPlan: {
          mode,
          extraMonthly: effectiveMonthly,
          targetDate,
          userIntent,
          interpretedIntent,
          generatedAt: new Date().toISOString(),
          requiredMonthly: mode === 'date' ? requiredMonthly : null,
          preferences,
          schedule: planSchedule
        }
      }));
      setPlanSuccess('Debt plan generated and saved.');
    } catch (err: any) {
      setPlanError(err.message || 'Failed to generate plan.');
    } finally {
      setIsGenerating(false);
    }
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
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-500">Debt Planning</p>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Plan Setup</h1>
          <p className="text-slate-500 max-w-2xl">Capture priorities, buffers, and constraints. Generate the roadmap once and reuse it until you decide to regenerate.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-w-[240px]">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Projected freedom</p>
          <p className="text-2xl font-black text-indigo-600 tracking-tight">{freedomDate}</p>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
            <RocketLaunchIcon className="w-4 h-4 text-indigo-500" /> {existingPlan ? 'Using saved debt plan' : 'Using live profile'}
          </div>
          {existingPlan && (
            <p className="text-[9px] text-slate-400 mt-1">Generated: {new Date(existingPlan.generatedAt).toLocaleString()}</p>
          )}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-slate-100 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preferences</p>
                <SparklesIcon className="w-5 h-5 text-indigo-500" />
              </div>
              <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Protect luxury spend</span>
                <input type="checkbox" checked={preferences.protectLuxury} onChange={e => setPreferences(p => ({ ...p, protectLuxury: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Protect subscriptions</span>
                <input type="checkbox" checked={preferences.protectSubscriptions} onChange={e => setPreferences(p => ({ ...p, protectSubscriptions: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Avoid penalty overpay</span>
                <input type="checkbox" checked={preferences.avoidPenaltyOverpay} onChange={e => setPreferences(p => ({ ...p, avoidPenaltyOverpay: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Keep savings buffer</span>
                <input type="checkbox" checked={preferences.keepSavingsBuffer} onChange={e => setPreferences(p => ({ ...p, keepSavingsBuffer: e.target.checked }))} />
              </label>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intent (optional)</p>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm"
                  rows={3}
                  placeholder="e.g. Keep streaming services, avoid penalties, debt-free before Dec 2026"
                  value={userIntent}
                  onChange={e => setUserIntent(e.target.value)}
                />
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  <button
                    type="button"
                    onClick={handleInterpretIntent}
                    disabled={isInterpreting || !userIntent.trim()}
                    className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${isInterpreting ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500'}`}
                  >
                    {isInterpreting ? 'Interpreting…' : 'Interpret intent (AI)'}
                  </button>
                  {!HAS_AI_ACCESS && <span className="text-amber-500">Add API key to use AI.</span>}
                </div>
                {interpretedIntent && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                    <p className="font-black uppercase tracking-widest text-[9px] text-indigo-500 mb-1">Interpreted</p>
                    <p className="whitespace-pre-wrap">{interpretedIntent}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-100 bg-indigo-50 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Generate plan</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('funds')}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${mode === 'funds' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                  >
                    Use funds
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('date')}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${mode === 'date' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                  >
                    Target date
                  </button>
                </div>
              </div>

              {mode === 'funds' ? (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Extra push per month</label>
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="w-5 h-5 text-indigo-500" />
                    <input
                      type="number"
                      min={0}
                      value={Number.isNaN(extraMonthly) ? '' : extraMonthly}
                      onChange={e => setExtraMonthly(safeParseNumber(e.target.value))}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-3 font-black text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Target debt-free month</label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    <input
                      type="month"
                      min={minTargetMonth}
                      value={targetDate}
                      onChange={e => setTargetDate(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-3 font-black text-sm"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Requires: {targetRequirement.feasible && targetRequirement.required !== null ? currency(Math.max(0, targetRequirement.required || 0)) : 'Unreachable with current inputs'}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGenerating || (mode === 'date' && (!targetDate || !targetRequirement.feasible))}
                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${isGenerating ? 'bg-slate-300 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-200'}`}
              >
                {isGenerating ? 'Generating…' : 'Generate Debt Plan'}
              </button>
              {planError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{planError}</p>}
              {planSuccess && <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">{planSuccess}</p>}
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
