
import React from 'react';
import { PayoffMonth } from './types';

interface FutureViewProps {
  schedule: PayoffMonth[];
}

export const FutureView: React.FC<FutureViewProps> = ({ schedule }) => (
  <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-500">
     <header className="text-center py-10"><h1 className="text-6xl font-black text-slate-900 tracking-tighter">The Path to Freedom</h1></header>
     <div className="max-w-4xl mx-auto space-y-12">
        {schedule.slice(0, 24).map((month, idx) => (
          <div key={idx} className="flex items-start gap-10">
             <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center border-4 border-slate-50 font-black text-[10px] text-slate-400">{month.monthName.slice(0,3)}</div>
             <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">{month.monthName}</h3></div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">£{month.remainingBalance.toLocaleString()}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Projected Net Liability</p>
                </div>
             </div>
          </div>
        ))}
     </div>
  </div>
);
