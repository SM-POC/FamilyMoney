
import React, { useState } from 'react';
import { HandRaisedIcon, PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, LentMoney } from './types';

interface MoneyLentViewProps {
  profile: UserFinancialProfile;
  setProfile?: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const MoneyLentView: React.FC<MoneyLentViewProps> = ({ profile, setProfile }) => {
  const [newLent, setNewLent] = useState({ recipient: '', purpose: '', amount: '', repayment: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);

  const handleAddLent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLent.recipient || !newLent.amount || !setProfile) return;
    const amount = parseFloat(newLent.amount);
    const item: LentMoney = {
      id: Math.random().toString(36).substr(2, 9),
      recipient: newLent.recipient,
      purpose: newLent.purpose || 'General Loan',
      totalAmount: amount,
      remainingBalance: amount,
      defaultRepayment: parseFloat(newLent.repayment) || 0
    };
    setProfile(p => ({ ...p, lentMoney: [...(p.lentMoney || []), item] }));
    setNewLent({ recipient: '', purpose: '', amount: '', repayment: '' });
  };

  const startEditing = (lent: LentMoney) => {
    setEditingId(lent.id);
    setEditValues({ ...lent });
  };

  const saveEdit = () => {
    if (!editValues || !setProfile) return;
    setProfile(p => ({
      ...p,
      lentMoney: p.lentMoney.map(l => l.id === editingId ? { 
        ...editValues, 
        remainingBalance: parseFloat(editValues.remainingBalance), 
        defaultRepayment: parseFloat(editValues.defaultRepayment) 
      } : l)
    }));
    setEditingId(null);
  };

  const removeLent = (id: string) => {
    if (!setProfile) return;
    setProfile(p => ({ ...p, lentMoney: p.lentMoney.filter(l => l.id !== id) }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Money Lent</h1>
        <p className="text-slate-500 font-medium italic">Track money you've lent to friends or family.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {(profile.lentMoney || []).length === 0 && (
            <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <HandRaisedIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">You haven't tracked any loans yet.</p>
            </div>
          )}
          {(profile.lentMoney || []).map(lent => {
            const isEditing = editingId === lent.id;
            return (
              <div key={lent.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center space-x-6">
                  <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><HandRaisedIcon className="w-7 h-7" /></div>
                  <div>
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input className="font-black text-slate-900 text-xl bg-slate-50 rounded" value={editValues.recipient} onChange={e => setEditValues({...editValues, recipient: e.target.value})} />
                        <input className="text-[10px] font-black text-slate-400 bg-slate-50 rounded" value={editValues.purpose} onChange={e => setEditValues({...editValues, purpose: e.target.value})} />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{lent.recipient}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lent.purpose}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="text-right">
                    {isEditing ? (
                      <div className="flex flex-col gap-1 items-end">
                        <input type="number" className="text-3xl font-black text-slate-900 bg-slate-50 rounded w-32 text-right" value={editValues.remainingBalance} onChange={e => setEditValues({...editValues, remainingBalance: e.target.value})} />
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-emerald-500 uppercase">Exp: £</span>
                          <input type="number" className="w-16 bg-slate-50 rounded text-[10px]" value={editValues.defaultRepayment} onChange={e => setEditValues({...editValues, defaultRepayment: e.target.value})} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">£{lent.remainingBalance.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Expected: £{lent.defaultRepayment}/mo</p>
                      </>
                    )}
                  </div>
                  {setProfile && (
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="text-emerald-500"><CheckIcon className="w-6 h-6" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(lent)} className="text-slate-200 hover:text-indigo-500"><PencilSquareIcon className="w-6 h-6" /></button>
                          <button onClick={() => removeLent(lent.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><TrashIcon className="w-6 h-6" /></button>
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
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">New Loan Tracker</h3>
            <form onSubmit={handleAddLent} className="space-y-4">
              <input placeholder="Recipient Name" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newLent.recipient} onChange={e => setNewLent({...newLent, recipient: e.target.value})} />
              <input placeholder="Purpose (e.g. Car repair)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newLent.purpose} onChange={e => setNewLent({...newLent, purpose: e.target.value})} />
              <input type="number" placeholder="Total Amount (£)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newLent.amount} onChange={e => setNewLent({...newLent, amount: e.target.value})} />
              <input type="number" placeholder="Monthly Repayment (£)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newLent.repayment} onChange={e => setNewLent({...newLent, repayment: e.target.value})} />
              <button type="submit" className="w-full bg-amber-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 flex items-center justify-center">
                <PlusIcon className="w-5 h-5 mr-2" /> Save Loan
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
