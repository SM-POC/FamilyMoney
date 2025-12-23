
import React from 'react';
import { CreditCardIcon, HandRaisedIcon, BanknotesIcon, FlagIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { StatCard } from './SharedComponents';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardViewProps {
  totalDebt: number;
  totalLent: number;
  surplus: number;
  freedomDate: string;
  cardSpendData: any[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  totalDebt, totalLent, surplus, freedomDate, cardSpendData 
}) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div><h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Command</h1><p className="text-slate-500 font-medium italic">Tracking household towards zero debt.</p></div>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard title="Total Debt" value={`£${totalDebt.toLocaleString()}`} icon={<CreditCardIcon className="w-6 h-6" />} color="bg-rose-50 text-rose-600" />
      <StatCard title="Total Lent" value={`£${totalLent.toLocaleString()}`} icon={<HandRaisedIcon className="w-6 h-6" />} color="bg-amber-50 text-amber-600" />
      <StatCard title="Oxygen (Surplus)" value={`£${surplus.toLocaleString()}`} icon={<BanknotesIcon className="w-6 h-6" />} color="bg-emerald-50 text-emerald-600" />
      <StatCard title="Freedom Date" value={freedomDate} icon={<FlagIcon className="w-6 h-6" />} color="bg-indigo-50 text-indigo-600" />
    </div>
    <div className="grid grid-cols-1 gap-8">
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
        <h3 className="text-xl font-black mb-10 flex items-center"><UserGroupIcon className="w-6 h-6 mr-3 text-indigo-500" /> Family Spending Mix</h3>
        <div className="h-72 flex items-center gap-12">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cardSpendData} dataKey="amount" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {cardSpendData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-64 space-y-4">
            {cardSpendData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase">{d.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">£{d.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
