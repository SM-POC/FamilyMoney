import React, { useEffect, useMemo, useState } from 'react';
import { PayoffMonth, UserFinancialProfile } from './types';
import { calculatePayoffSchedule } from './debtCalculator';
import {
  RocketLaunchIcon,
  BanknotesIcon,
  CalendarIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface FutureViewProps {
  schedule: PayoffMonth[];
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

const currency = (value: number) => `£${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const FutureView: React.FC<FutureViewProps> = ({ schedule, profile, setProfile }) => {
  const planScenario = profile.debtPlan;
  const defaultPreferences = { protectLuxury: true, protectSubscriptions: true, avoidPenaltyOverpay: true, keepSavingsBuffer: true };
  const preferences = planScenario?.preferences ?? defaultPreferences;
  const [mode, setMode] = useState<'funds' | 'date'>(planScenario?.mode ?? 'funds');
  const [extraMonthly, setExtraMonthly] = useState<number>(planScenario?.extraMonthly ?? 0);
  const [targetDate, setTargetDate] = useState<string>(planScenario?.targetDate ?? '');
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const planProgress = profile.planProgress || {};

  useEffect(() => {
    if (planScenario) {
      setMode(planScenario.mode ?? 'funds');
      setExtraMonthly(planScenario.extraMonthly ?? 0);
      setTargetDate(planScenario.targetDate ?? '');
    }
  }, [planScenario]);

  const totalDebt = useMemo(() => (profile.debts || []).reduce((acc, d) => acc + d.balance, 0), [profile.debts]);
  const monthlyIncome = useMemo(() => (profile.income || []).reduce((acc, i) => acc + i.amount, 0), [profile.income]);
  const recurringBills = useMemo(() => (profile.expenses || []).filter(e => e.isRecurring && !e.isSubscription).reduce((acc, e) => acc + e.amount, 0), [profile.expenses]);
  const recurringSubs = useMemo(() => (profile.expenses || []).filter(e => e.isRecurring && e.isSubscription).reduce((acc, e) => acc + e.amount, 0), [profile.expenses]);
  const debtMinimums = useMemo(() => (profile.debts || []).reduce((acc, d) => acc + d.minimumPayment, 0), [profile.debts]);
  const lentRepayments = useMemo(() => (profile.lentMoney || []).reduce((acc, l) => acc + Math.min(l.remainingBalance, l.defaultRepayment), 0), [profile.lentMoney]);
  const eventThisMonth = useMemo(() => {
    const monthIndex = new Date().getMonth();
    return (profile.specialEvents || []).filter(e => e.month === monthIndex).reduce((acc, e) => acc + e.budget, 0);
  }, [profile.specialEvents]);

  const luxuryUsed = preferences.protectLuxury ? (profile.luxuryBudget || 0) : 0;
  const subsUsed = preferences.protectSubscriptions ? recurringSubs : 0;
  const baseAvailable = Math.max(0, monthlyIncome + lentRepayments - recurringBills - subsUsed - luxuryUsed - eventThisMonth - debtMinimums);

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

  const calcWithPreferences = (push: number, maxMonths?: number) =>
    calculatePayoffSchedule(profile, {
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

    const baseLength = schedule.length;
    if (baseLength > 0 && baseLength <= monthsBetweenNow) return { required: 0, feasible: true };

    let high = Math.max(totalDebt * 2, 1000);
    let highPlan = calcWithPreferences(high, Math.max(monthsBetweenNow, 360));
    let safetyGuard = 0;
    while (highPlan.length > monthsBetweenNow && safetyGuard < 5) {
      high *= 1.5;
      highPlan = calcWithPreferences(high, Math.max(monthsBetweenNow, 360));
      safetyGuard++;
    }

    if (highPlan.length > monthsBetweenNow) return { required: null, feasible: false };

    let low = 0;
    let best: number | null = null;

    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2;
      const sim = calcWithPreferences(mid, Math.max(monthsBetweenNow, 360));
      const len = sim.length;

      if (len <= monthsBetweenNow) {
        best = mid;
        high = mid;
      } else {
        low = mid;
      }
    }

    return { required: best, feasible: best !== null };
  }, [monthsBetweenNow, profile, schedule.length, totalDebt, preferences.avoidPenaltyOverpay, preferences.protectLuxury, preferences.protectSubscriptions, preferences.keepSavingsBuffer]);

  const activeSchedule = useMemo(() => {
    if (mode === 'date') {
      const boost = targetRequirement.required ?? 0;
      return calcWithPreferences(targetRequirement.feasible ? boost : 0, Math.max(monthsBetweenNow || 0, 360));
    }
    return calcWithPreferences(Math.max(0, extraMonthly));
  }, [extraMonthly, mode, monthsBetweenNow, targetRequirement, preferences.avoidPenaltyOverpay, preferences.protectLuxury, preferences.protectSubscriptions, preferences.keepSavingsBuffer, profile]);

  const summarise = (plan: PayoffMonth[]) => ({
    months: plan.length,
    debtFreeDate: plan.length > 0 ? plan[plan.length - 1].monthName : 'N/A',
    totalInterest: plan.reduce((acc, m) => acc + m.interestPaid, 0),
    totalPaid: plan.reduce((acc, m) => acc + m.totalPayment, 0)
  });

  const baseSummary = useMemo(() => summarise(schedule), [schedule]);
  const planSummary = useMemo(() => summarise(activeSchedule), [activeSchedule]);

  if (totalDebt === 0 && (profile.lentMoney || []).length === 0) {
    return (
      <div className="bg-white p-20 rounded-[3.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
        <SparklesIcon className="w-12 h-12 text-emerald-500" />
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Debt free already.</h2>
        <p className="text-slate-500 max-w-xl">Add liabilities or lent balances to build a freedom roadmap.</p>
      </div>
    );
  }

  const clearedCount = activeSchedule.reduce((acc, m) => acc + m.debtBreakdown.filter(d => d.isNewlyCleared).length, 0);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-500">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-500">Freedom Designer</p>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Debt Planning</h1>
          <p className="text-slate-500 max-w-2xl">Build and review the saved roadmap once, then tweak with extra funds or target dates when you choose to regenerate.</p>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-1 min-w-[220px]">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Balances</p>
          <p className="text-3xl font-black tracking-tight">{currency(totalDebt)}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> {clearedCount} clear points mapped
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setMode('funds')}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${mode === 'funds' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'}`}
            >
              Use Available Funds
            </button>
            <button
              onClick={() => setMode('date')}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${mode === 'date' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'}`}
            >
              Aim for a Target Date
            </button>
          </div>

          {mode === 'funds' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Base monthly room</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{currency(baseAvailable)}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Income + repayments - recurring - subs - lux - debt mins</p>
              </div>
              <div className="p-5 rounded-2xl border border-slate-100 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Add extra push</p>
                <div className="flex items-center gap-2">
                  <BanknotesIcon className="w-5 h-5 text-indigo-500" />
                  <input
                    type="number"
                    value={Number.isNaN(extraMonthly) ? '' : extraMonthly}
                    onChange={e => {
                      const cleaned = (e.target.value || '').replace(/,/g, '');
                      const val = parseFloat(cleaned);
                      setExtraMonthly(isNaN(val) ? 0 : val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-black text-sm"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Per month devoted to debts</p>
              </div>
              <div className="p-5 rounded-2xl border border-slate-100 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Projected freedom</p>
                <p className="text-xl font-black text-indigo-600 tracking-tight">{planSummary.debtFreeDate}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{planSummary.months} months away</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Target debt-free date</p>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-500" />
                  <input
                    type="month"
                    min={minTargetMonth}
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-black text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Months remaining: {monthsBetweenNow !== null ? monthsBetweenNow : 'N/A'}</p>
              </div>
              <div className="p-5 rounded-2xl border border-slate-100 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Required monthly</p>
                {targetRequirement.feasible ? (
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{currency(Math.max(0, targetRequirement.required || 0))}</p>
                ) : (
                  <div className="flex items-center gap-2 text-rose-500">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <p className="text-sm font-black">Target is unreachable with current inputs.</p>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">On top of existing room</p>
              </div>
              <div className="p-5 rounded-2xl border border-slate-100 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Projected freedom</p>
                <p className="text-xl font-black text-indigo-600 tracking-tight">{planSummary.debtFreeDate}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{planSummary.months} months away</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl border border-slate-100 bg-slate-900 text-white space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Base scenario</p>
              <p className="text-2xl font-black tracking-tight">{baseSummary.debtFreeDate}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{baseSummary.months} months | Interest: {currency(baseSummary.totalInterest)}</p>
            </div>
            <div className="p-6 rounded-3xl border border-indigo-100 bg-indigo-50 text-indigo-900 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
                <RocketLaunchIcon className="w-4 h-4" /> Active plan
              </p>
              <p className="text-2xl font-black tracking-tight">{planSummary.debtFreeDate}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{planSummary.months} months | Interest: {currency(planSummary.totalInterest)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Inputs considered</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Everything in one place</h3>
            </div>
            <SparklesIcon className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="flex items-center justify-between">
              <span>Income streams</span>
              <span className="text-slate-900">{currency(monthlyIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recurring bills</span>
              <span className="text-rose-500">- {currency(recurringBills)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subscriptions</span>
              <span className="text-rose-400">- {currency(recurringSubs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Debt minimums</span>
              <span className="text-rose-500">- {currency(debtMinimums)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Luxury buffer</span>
              <span className="text-rose-400">- {currency(profile.luxuryBudget || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Event month budget</span>
              <span className="text-rose-400">- {currency(eventThisMonth)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Lent repayments</span>
              <span className="text-emerald-500">+ {currency(lentRepayments)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Debt strategy</span>
              <span className="text-slate-900">{profile.strategy}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Next 12 months</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Execution roadmap</h3>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clears happen automatically when balances reach zero.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeSchedule.slice(0, 12).map((month, idx) => {
            const cleared = month.debtBreakdown.filter(d => d.isNewlyCleared).map(d => d.debtName);
            const totalPenalty = month.debtBreakdown.reduce((acc, d) => acc + d.penalty, 0);
            const monthKey = month.monthName;
            const completedIds = planProgress[monthKey]?.completedIds || [];
            const isExpanded = expandedMonth === idx;
            const confirmedCount = month.debtBreakdown.filter(d => completedIds.includes(d.debtId)).length;
            return (
              <div key={idx} className="p-5 rounded-3xl border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{month.monthName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Pay {currency(month.totalPayment)}</span>
                    <button
                      onClick={() => setExpandedMonth(isExpanded ? null : idx)}
                      className="p-1 rounded-lg border border-slate-200 bg-white hover:border-indigo-200"
                    >
                      <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight mb-1">{currency(month.remainingBalance)}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance after payments</p>
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interest {currency(month.interestPaid)} | Principal {currency(month.principalPaid)}</p>
                  {totalPenalty > 0 && <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Penalties {currency(totalPenalty)}</p>}
                  {cleared.length > 0 && (
                    <div className="flex items-start gap-2 text-emerald-600 text-xs font-black">
                      <CheckCircleIcon className="w-4 h-4 mt-0.5" />
                      <div>Cleared: {cleared.join(', ')}</div>
                    </div>
                  )}
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmed {confirmedCount}/{month.debtBreakdown.length}</p>
                </div>
                {isExpanded && (
                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                    {month.debtBreakdown.map(debt => {
                      const isDone = completedIds.includes(debt.debtId);
                      return (
                        <div key={debt.debtId} className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-800">{debt.debtName}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Pay {currency(debt.payment)} · Interest {currency(debt.interest)} · Penalty {currency(debt.penalty)}
                            </p>
                          </div>
                          <button
                            onClick={() => setProfile(p => {
                              const progress = { ...(p.planProgress || {}) };
                              const monthProgress = progress[monthKey] || { completedIds: [] };
                              const next = new Set(monthProgress.completedIds);
                              if (next.has(debt.debtId)) next.delete(debt.debtId); else next.add(debt.debtId);
                              return { ...p, planProgress: { ...progress, [monthKey]: { completedIds: Array.from(next) } } };
                            })}
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isDone ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}
                          >
                            {isDone ? 'Confirmed' : 'Mark paid'}
                          </button>
                        </div>
                      );
                    })}
                    {month.lentBreakdown.map(lent => (
                      <div key={lent.lentId} className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-800">Repayment from {lent.recipient}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Received {currency(lent.received)} · Remaining {currency(lent.remaining)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
