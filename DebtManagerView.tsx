
import React, { useState } from 'react';
import { HomeIcon, CreditCardIcon, BanknotesIcon, TrashIcon, LockClosedIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, DebtType, Debt } from './types';

interface DebtManagerViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const DebtManagerView: React.FC<DebtManagerViewProps> = ({ profile, setProfile }) => {
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', interest: '', minPay: '', type: DebtType.CREDIT_CARD, canOverpay: true, penalty: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.name || !newDebt.balance) return;
    setProfile(p => ({ ...p, debts: [...p.debts, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: newDebt.name, 
      type: newDebt.type,
      balance: parseFloat(newDebt.balance), 
      interestRate: parseFloat(newDebt.interest) || 0,
      minimumPayment: parseFloat(newDebt.minPay) || 0,
      canOverpay: newDebt.canOverpay,
      overpaymentPenalty: parseFloat(newDebt.penalty) || 0
    }] }));
    setNewDebt({ name: '', balance: '', interest: '', minPay: '', type: DebtType.CREDIT_CARD, canOverpay: true, penalty: '' });
  };

  const startEditing = (debt: Debt) => {
    setEditingId(debt.id);
    setEditValues({ ...debt });
  };

  const saveEdit = () => {
    if (!editValues) return;
    setProfile(p => ({
      ...p,
      debts: p.debts.map(d => d.id === editingId ? { 
        ...editValues, 
        balance: parseFloat(editValues.balance), 
        interestRate: parseFloat(editValues.interestRate), 
        minimumPayment: parseFloat(editValues.minimumPayment) 
      } : d)
    }));
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Debt Manager</h1>
        <p className="text-slate-500 font-medium italic">All family liabilities. Mortgages and Loans are tracked here for balance visibility.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {profile.debts.map(debt => {
            const isEditing = editingId === debt.id;
            const d = isEditing ? editValues : debt;
            return (
              <div key={debt.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center space-x-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${d.type === DebtType.MORTGAGE ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-500'}`}>
                    {d.type === DebtType.MORTGAGE ? <HomeIcon className="w-7 h-7" /> : d.type === DebtType.CREDIT_CARD ? <CreditCardIcon className="w-7 h-7" /> : <BanknotesIcon className="w-7 h-7" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      {isEditing ? (
                        <input className="font-black text-slate-900 bg-slate-50 rounded px-1" value={editValues.name} onChange={e => setEditValues({...editValues, name: e.target.value})} />
                      ) : (
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{debt.name}</h3>
                      )}
                      {!d.canOverpay && (
                        <span className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center shadow-sm">
                          <LockClosedIcon className="w-3 h-3 mr-1" /> Locked
                        </span>
                      )}
                      {d.type === DebtType.MORTGAGE && (
                        <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center shadow-sm">Primary</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">{d.type}</span>
                       <div className="flex items-center gap-1">
                         {isEditing ? (
                           <div className="flex items-center gap-1">
                             <input type="number" className="w-10 text-[10px] bg-slate-50 rounded" value={editValues.interestRate} onChange={e => setEditValues({...editValues, interestRate: e.target.value})} />
                             <span className="text-[10px] font-black uppercase">% | £</span>
                             <input type="number" className="w-16 text-[10px] bg-slate-50 rounded" value={editValues.minimumPayment} onChange={e => setEditValues({...editValues, minimumPayment: e.target.value})} />
                           </div>
                         ) : (
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{debt.interestRate}% Interest | £{debt.minimumPayment}/mo min</p>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  {isEditing ? (
                    <input type="number" className="text-3xl font-black text-slate-900 bg-slate-50 rounded w-32 px-1" value={editValues.balance} onChange={e => setEditValues({...editValues, balance: e.target.value})} />
                  ) : (
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">£{debt.balance.toLocaleString()}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} className="text-emerald-500"><CheckIcon className="w-6 h-6" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(debt)} className="text-slate-200 hover:text-indigo-500 transition-colors"><PencilSquareIcon className="w-6 h-6" /></button>
                        <button onClick={() => setProfile(p => ({ ...p, debts: p.debts.filter(d => d.id !== debt.id) }))} className="text-slate-200 hover:text-rose-500 transition-colors"><TrashIcon className="w-6 h-6" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl h-fit sticky top-8">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">New Debt Account</h3>
          <form onSubmit={handleAddDebt} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Debt Type</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-[10px] uppercase tracking-widest" value={newDebt.type} onChange={e => setNewDebt({...newDebt, type: e.target.value as DebtType})}>
                {Object.values(DebtType).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <input placeholder="Provider Name (e.g. Halifax)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Balance (£)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newDebt.balance} onChange={e => setNewDebt({...newDebt, balance: e.target.value})} />
              <input type="number" placeholder="Interest (%)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newDebt.interest} onChange={e => setNewDebt({...newDebt, interest: e.target.value})} />
            </div>
            <input type="number" placeholder="Min Payment (£)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newDebt.minPay} onChange={e => setNewDebt({...newDebt, minPay: e.target.value})} />
            
            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Allow Overpayments?</label>
                 <button type="button" onClick={() => setNewDebt({...newDebt, canOverpay: !newDebt.canOverpay})} className={`w-12 h-6 rounded-full transition-colors relative ${newDebt.canOverpay ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newDebt.canOverpay ? 'right-1' : 'left-1'}`} />
                 </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4">Save Account</button>
          </form>
        </div>
      </div>
    </div>
  );
};
