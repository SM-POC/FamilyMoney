import React from 'react';
import { UserFinancialProfile, PayoffMonth } from './types';
import { PlanView } from './PlanView';
import { FutureView } from './FutureView';

interface CombinedPlanRoadmapViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
  schedule: PayoffMonth[];
  baseSchedule: PayoffMonth[];
}

// Puts plan setup and roadmap review on a single page for easier debugging.
export const CombinedPlanRoadmapView: React.FC<CombinedPlanRoadmapViewProps> = ({
  profile,
  setProfile,
  schedule,
  baseSchedule
}) => {
  return (
    <div className="space-y-10">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-500">Planning workspace</p>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Plan & Roadmap</h1>
        <p className="text-slate-500 max-w-3xl">Adjust plan inputs and immediately inspect the projected execution roadmap below.</p>
      </div>

      <PlanView profile={profile} setProfile={setProfile} schedule={schedule} baseSchedule={baseSchedule} />
      <FutureView schedule={schedule} profile={profile} setProfile={setProfile} />
    </div>
  );
};
