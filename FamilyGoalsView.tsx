import React, { useState } from 'react';
import { TrophyIcon, TrashIcon, PlusIcon, CalendarIcon, PencilSquareIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, Goal, GoalType } from './types';

interface FamilyGoalsViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const FamilyGoalsView: React.FC<FamilyGoalsViewProps> = ({ profile, setProfile }) => {
  const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', monthly: '', type: GoalType.SAVINGS, targetDate: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target) return;
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGoal.name,
      type: newGoal.type,
      targetAmount: parseFloat(newGoal.target),
      currentAmount: parseFloat(newGoal.current) || 0,
      targetDate: newGoal.targetDate || undefined,
      category: 'General',
      monthlyContribution: newGoal.monthly ? parseFloat(newGoal.monthly) : undefined
    };
    setProfile(p => ({ ...p, goals: [...(p.goals || []), goal] }));
    setNewGoal({ name: '', target: '', current: '', monthly: '', type: GoalType.SAVINGS, targetDate: '' });
  };

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id);
    setEditValues({ ...goal });
  };

  const saveEdit = () => {
    if (!editValues) return;
    setProfile(p => ({
      ...p,
      goals: p.goals.map(g => g.id === editingId ? { ...editValues, targetAmount: parseFloat(editValues.targetAmount), currentAmount: parseFloat(editValues.currentAmount), monthlyContribution: editValues.monthlyContribution === undefined || editValues.monthlyContribution === null || editValues.monthlyContribution === '' ? undefined : parseFloat(editValues.monthlyContribution) } : g)
    }));
    setEditingId(null);
    setEditValues(null);
  };

  const calculateMonthly = (goal: Goal) => {
    if (goal.monthlyContribution !== undefined && goal.monthlyContribution !== null) {
      const numeric = typeof goal.monthlyContribution === 'string' ? parseFloat(goal.monthlyContribution) : goal.monthlyContribution;
      if (!isNaN(numeric)) return numeric;
    }
    if (!goal.targetDate) return null;
    const target = new Date(goal.targetDate + "-01"); // Force valid start of month
    if (isNaN(target.getTime())) return null;
    
    const now = new Date();
    const diffMonths = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    const remaining = goal.targetAmount - goal.currentAmount;
    
    if (remaining <= 0) return 0;
    if (diffMonths <= 0) return remaining;
    return remaining / diffMonths;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "NO DATE";
    const d = new Date(dateStr + "-01");
    if (isNaN(d.getTime())) return "INVALID DATE";
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Family Goals</h1>
        <p className="text-slate-500 font-medium italic">Define and track what you are saving for.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 h-fit">
          {(profile.goals || []).length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <TrophyIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No savings goals defined.</p>
            </div>
          )}
          {(profile.goals || []).map(goal => {
            const isEditing = editingId === goal.id;
            const targetGoal = isEditing ? editValues : goal;
            const monthly = calculateMonthly(targetGoal);

            return (
              <div key={goal.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><TrophyIcon className="w-6 h-6" /></div>
                      {isEditing ? (
                        <input className="font-black text-slate-900 bg-slate-50 border-none rounded-lg p-1 w-32" value={editValues.name} onChange={e => setEditValues({...editValues, name: e.target.value})} />
                      ) : (
                        <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight">{goal.name}</h3>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{goal.type}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="text-emerald-500 p-1"><CheckIcon className="w-5 h-5" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 p-1"><XMarkIcon className="w-5 h-5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(goal)} className="text-slate-300 hover:text-indigo-500 transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                          <button onClick={() => setProfile(p => ({ ...p, goals: p.goals.filter(g => g.id !== goal.id) }))} className="text-slate-200 hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Progress</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input type="number" className="w-16 bg-slate-50 rounded" value={editValues.currentAmount} onChange={e => setEditValues({...editValues, currentAmount: e.target.value})} />
                          <span>/</span>
                          <input type="number" className="w-16 bg-slate-50 rounded" value={editValues.targetAmount} onChange={e => setEditValues({...editValues, targetAmount: e.target.value})} />
                        </div>
                      ) : (
                        <span>稖{goal.currentAmount.toLocaleString()} / 稖{goal.targetAmount.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Monthly Contribution</p>
                    {isEditing ? (
                      <input
                        type="number"
                        className="text-sm font-black text-slate-900 bg-white rounded px-2 py-1"
                        value={editValues.monthlyContribution ?? ''}
                        onChange={e => setEditValues({ ...editValues, monthlyContribution: e.target.value })}
                        placeholder="Auto-calc"
                      />
                    ) : (
                      <p className="text-xl font-black text-slate-900 tracking-tighter">
                        {monthly !== null ? `稖${monthly.toFixed(2)}` : 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Date</p>
                    {isEditing ? (
                      <input type="month" className="text-[10px] font-bold bg-white rounded p-1" value={editValues.targetDate || ''} onChange={e => setEditValues({...editValues, targetDate: e.target.value})} />
                    ) : (
                      <p className="text-[10px] font-bold text-slate-600 uppercase">{formatDate(goal.targetDate)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl h-fit sticky top-8">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">New Milestone</h3>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <input placeholder="Goal Name (e.g. Dream Holiday)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} />
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Type</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-[10px] uppercase tracking-widest" value={newGoal.type} onChange={e => setNewGoal({...newGoal, type: e.target.value as GoalType})}>
                {Object.values(GoalType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Target (稖)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} />
              <input type="number" placeholder="Started with (稖)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newGoal.current} onChange={e => setNewGoal({...newGoal, current: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Optional Monthly Contribution</label>
              <input type="number" placeholder="稖 per month" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newGoal.monthly} onChange={e => setNewGoal({...newGoal, monthly: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> Target Date</label>
              <input type="month" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm uppercase" value={newGoal.targetDate} onChange={e => setNewGoal({...newGoal, targetDate: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 flex items-center justify-center">
              <PlusIcon className="w-5 h-5 mr-2" /> Save Goal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
