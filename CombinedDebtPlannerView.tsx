import React from 'react';
import { UserFinancialProfile, PayoffMonth } from './types';
import { PlanView } from './PlanView';
import { DebtManagerView } from './DebtManagerView';

interface CombinedDebtPlannerViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
  schedule: PayoffMonth[];
  baseSchedule: PayoffMonth[];
}

// Simple composition: keep plan setup and debt manager together on one page
export const CombinedDebtPlannerView: React.FC<CombinedDebtPlannerViewProps> = ({
  profile,
  setProfile,
  schedule,
  baseSchedule
}) => {
  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-500">Debt cockpit</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Plan & Manage Debts</h1>
            <p className="text-slate-500 max-w-3xl">Adjust liabilities and generate the payoff roadmap in one place.</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <PlanView profile={profile} setProfile={setProfile} schedule={schedule} baseSchedule={baseSchedule} />
        <DebtManagerView profile={profile} setProfile={setProfile} />
      </div>
    </div>
  );
};
