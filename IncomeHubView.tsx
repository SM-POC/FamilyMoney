
import React, { useState } from 'react';
import { BanknotesIcon, PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, Income } from './types';

interface IncomeHubViewProps {
  profile: UserFinancialProfile;
  setProfile?: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const IncomeHubView: React.FC<IncomeHubViewProps> = ({ profile, setProfile }) => {
  const [newIncome, setNewIncome] = useState({ source: '', amount: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.source || !newIncome.amount || !setProfile) return;
    const item: Income = {
      id: Math.random().toString(36).substr(2, 9),
      source: newIncome.source,
      amount: parseFloat(newIncome.amount)
    };
    setProfile(p => ({ ...p, income: [...(p.income || []), item] }));
    setNewIncome({ source: '', amount: '' });
  };

  const startEditing = (inc: Income) => {
    setEditingId(inc.id);
    setEditValues({ ...inc });
  };

  const saveEdit = () => {
    if (!editValues || !setProfile) return;
    setProfile(p => ({
      ...p,
      income: p.income.map(i => i.id === editingId ? { ...editValues, amount: parseFloat(editValues.amount) } : i)
    }));
    setEditingId(null);
  };

  const removeIncome = (id: string) => {
    if (!setProfile) return;
    setProfile(p => ({ ...p, income: p.income.filter(i => i.id !== id) }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Income Hub</h1>
        <p className="text-slate-500 font-medium italic">Track all household income streams.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {(profile.income || []).length === 0 && (
            <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <BanknotesIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No income sources added yet.</p>
            </div>
          )}
          {(profile.income || []).map(inc => {
            const isEditing = editingId === inc.id;
            return (
              <div key={inc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center space-x-6">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><BanknotesIcon className="w-7 h-7" /></div>
                  <div>
                    {isEditing ? (
                      <input className="font-black text-slate-900 text-xl bg-slate-50 rounded px-2" value={editValues.source} onChange={e => setEditValues({...editValues, source: e.target.value})} />
                    ) : (
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{inc.source}</h3>
                    )}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Monthly</p>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  {isEditing ? (
                    <input type="number" className="text-3xl font-black text-slate-900 bg-slate-50 rounded px-2 w-32" value={editValues.amount} onChange={e => setEditValues({...editValues, amount: e.target.value})} />
                  ) : (
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">£{inc.amount.toLocaleString()}</p>
                  )}
                  {setProfile && (
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="text-emerald-500"><CheckIcon className="w-6 h-6" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(inc)} className="text-slate-300 hover:text-indigo-500"><PencilSquareIcon className="w-6 h-6" /></button>
                          <button onClick={() => removeIncome(inc.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><TrashIcon className="w-6 h-6" /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {setProfile && (
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl h-fit">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Add Income Stream</h3>
            <form onSubmit={handleAddIncome} className="space-y-4">
              <input placeholder="Source (e.g. Salary, Side Hustle)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newIncome.source} onChange={e => setNewIncome({...newIncome, source: e.target.value})} />
              <input type="number" placeholder="Net Amount (£)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newIncome.amount} onChange={e => setNewIncome({...newIncome, amount: e.target.value})} />
              <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 flex items-center justify-center">
                <PlusIcon className="w-5 h-5 mr-2" /> Save Income
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
