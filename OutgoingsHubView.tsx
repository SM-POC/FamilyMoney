import React, { useEffect, useState } from 'react';
import { HomeIcon, BanknotesIcon, TrashIcon, CursorArrowRaysIcon, ShoppingCartIcon, ScissorsIcon, ExclamationTriangleIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, Expense } from './types';

interface OutgoingsHubViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
  totalSubSpend: number;
}

export const OutgoingsHubView: React.FC<OutgoingsHubViewProps> = ({ profile, setProfile, totalSubSpend }) => {
  const [newBill, setNewBill] = useState({ description: '', amount: '', category: 'Utilities', isSubscription: false, contractEndDate: '', userId: profile.currentUserId || '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);

  useEffect(() => {
    setNewBill(prev => ({ ...prev, userId: prev.userId || profile.currentUserId || '' }));
  }, [profile.currentUserId]);

  const isDebtKeyword = (desc: string) => ['mortgage', 'loan', 'finance', 'credit card', 'visa', 'mastercard', 'barclaycard', 'overdraft'].some(k => desc.toLowerCase().includes(k));

  const daysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.description || !newBill.amount) return;
    const ownerId = newBill.userId || profile.currentUserId || profile.users[0]?.id || '';
    setProfile(p => ({ ...p, expenses: [...p.expenses, { 
      id: Math.random().toString(36).substr(2, 9), 
      description: newBill.description, 
      category: newBill.category, 
      amount: parseFloat(newBill.amount), 
      isRecurring: true, 
      date: '',
      isSubscription: newBill.isSubscription,
      contractEndDate: newBill.contractEndDate || undefined,
      userId: ownerId || undefined
    }] }));
    setNewBill({ description: '', amount: '', category: 'Utilities', isSubscription: false, contractEndDate: '', userId: ownerId });
  };

  const startEditing = (bill: Expense) => {
    setEditingId(bill.id);
    setEditValues({ ...bill });
  };

  const saveEdit = () => {
    if (!editValues) return;
    setProfile(p => ({
      ...p,
      expenses: p.expenses.map(e => e.id === editingId ? { ...editValues, amount: parseFloat(editValues.amount) } : e)
    }));
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Outgoings Hub</h1>
          <p className="text-slate-500 font-medium italic">Managed obligations vs flexible monthly subscriptions.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Potential Savings</p><p className="text-xl font-black text-rose-500">£{totalSubSpend.toFixed(2)}</p></div>
          <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500"><ScissorsIcon className="w-5 h-5" /></div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center space-x-3"><HomeIcon className="w-6 h-6 text-indigo-600" /><h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fixed Obligations</h2></div>
            <div className="space-y-4">
              {profile.expenses.filter(e => e.isRecurring && !e.isSubscription).map(bill => {
                const isEditing = editingId === bill.id;
                const current = isEditing ? editValues : bill;
                const daysLeft = daysUntil(current.contractEndDate);
                const ownerName = current.userId ? profile.users.find(u => u.id === current.userId)?.name : null;
                return (
                  <div key={bill.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center"><BanknotesIcon className="w-6 h-6" /></div>
                      <div>
                        {isEditing ? (
                          <input className="text-lg font-black text-slate-900 bg-slate-50 p-1 rounded" value={editValues.description} onChange={e => setEditValues({...editValues, description: e.target.value})} />
                        ) : (
                          <h3 className="text-lg font-black text-slate-900 tracking-tight">{bill.description}</h3>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">{bill.category}</span>
                          {ownerName && !isEditing && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{ownerName}</span>
                          )}
                          {isEditing && (
                            <select
                              className="text-[9px] font-black uppercase tracking-widest bg-slate-50 rounded px-2 py-1"
                              value={editValues.userId || ''}
                              onChange={e => setEditValues({ ...editValues, userId: e.target.value })}
                            >
                              <option value="">Unassigned</option>
                              {profile.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          )}
                          {current.contractEndDate && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${daysLeft && daysLeft < 90 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                              Ends: {new Date(current.contractEndDate).toLocaleDateString('en-GB')} {daysLeft ? `(${daysLeft}d)` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      {isEditing ? (
                        <input type="number" className="text-2xl font-black text-slate-900 bg-slate-50 p-1 rounded w-24" value={editValues.amount} onChange={e => setEditValues({...editValues, amount: e.target.value})} />
                      ) : (
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">£{bill.amount.toLocaleString()}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} className="text-emerald-500"><CheckIcon className="w-6 h-6" /></button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(bill)} className="text-slate-200 hover:text-indigo-500 transition-colors"><PencilSquareIcon className="w-6 h-6" /></button>
                            <button onClick={() => setProfile(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== bill.id) }))} className="text-slate-200 hover:text-rose-500 transition-colors"><TrashIcon className="w-6 h-6" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center space-x-3"><CursorArrowRaysIcon className="w-6 h-6 text-rose-500" /><h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Flexible Subscriptions</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.expenses.filter(e => e.isRecurring && e.isSubscription).map(sub => {
                const isEditing = editingId === sub.id;
                const current = isEditing ? editValues : sub;
                const ownerName = current.userId ? profile.users.find(u => u.id === current.userId)?.name : null;
                return (
                  <div key={sub.id} className="bg-white p-6 rounded-[2rem] border border-rose-50 shadow-sm flex items-center justify-between group border-l-4 border-l-rose-500">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center"><ShoppingCartIcon className="w-5 h-5" /></div>
                      <div>
                        {isEditing ? (
                          <input className="text-sm font-black text-slate-900 bg-slate-50 p-1 rounded w-32" value={editValues.description} onChange={e => setEditValues({...editValues, description: e.target.value})} />
                        ) : (
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">{sub.description}</h3>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Cancel Anytime</span>
                          {ownerName && !isEditing && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 px-2 py-0.5 rounded">{ownerName}</span>
                          )}
                          {isEditing && (
                            <select
                              className="text-[9px] font-black uppercase tracking-widest bg-slate-50 rounded px-2 py-1"
                              value={editValues.userId || ''}
                              onChange={e => setEditValues({ ...editValues, userId: e.target.value })}
                            >
                              <option value="">Unassigned</option>
                              {profile.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {isEditing ? (
                        <input type="number" className="text-xl font-black text-slate-900 bg-slate-50 p-1 rounded w-20" value={editValues.amount} onChange={e => setEditValues({...editValues, amount: e.target.value})} />
                      ) : (
                        <p className="text-xl font-black text-slate-900 tracking-tighter">£{sub.amount.toLocaleString()}</p>
                      )}
                      <div className="flex items-center space-x-1">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} className="text-emerald-500"><CheckIcon className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(sub)} className="text-slate-200 hover:text-indigo-500 transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                            <button onClick={() => setProfile(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== sub.id) }))} className="text-slate-200 hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl h-fit sticky top-8">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Add Recurring Outgoing</h3>
          <p className="text-[9px] text-slate-400 italic mb-6 leading-tight">Note: Add utility bills and services here. Mortgages and Loans go in the **Debts** tab.</p>
          
          <form onSubmit={handleAddBill} className="space-y-5">
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button type="button" onClick={() => setNewBill({...newBill, isSubscription: false})} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${!newBill.isSubscription ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Fixed Bill</button>
              <button type="button" onClick={() => setNewBill({...newBill, isSubscription: true})} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${newBill.isSubscription ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>Subscription</button>
            </div>

            <div className="relative">
              <input placeholder="Name (e.g. British Gas)" className={`w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm transition-all ${isDebtKeyword(newBill.description) ? 'ring-2 ring-amber-400' : ''}`} value={newBill.description} onChange={e => setNewBill({...newBill, description: e.target.value})} />
              {isDebtKeyword(newBill.description) && (
                <div className="mt-2 p-3 bg-amber-50 rounded-xl flex items-start gap-2 animate-in slide-in-from-top-1">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 mt-0.5" />
                  <p className="text-[9px] font-bold text-amber-700 leading-tight">This sounds like a liability. Consider adding it to the **Debts** tab for accurate payoff tracking.</p>
                </div>
              )}
            </div>
            
            <input type="number" step="0.01" placeholder="Monthly Amount (£)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newBill.amount} onChange={e => setNewBill({...newBill, amount: e.target.value})} />
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-[10px] uppercase tracking-widest" value={newBill.category} onChange={e => setNewBill({...newBill, category: e.target.value})}>
                <option value="Council Tax">Council Tax</option>
                <option value="Utilities">Utilities</option>
                <option value="Insurance">Insurance</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Fitness">Fitness</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {!newBill.isSubscription && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Contract End Date (Optional)</label>
                <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm" value={newBill.contractEndDate} onChange={e => setNewBill({...newBill, contractEndDate: e.target.value})} />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Assign To</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-[10px] uppercase tracking-widest" value={newBill.userId} onChange={e => setNewBill({ ...newBill, userId: e.target.value })}>
                <option value="">Unassigned</option>
                {profile.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            
            <button type="submit" className={`w-full text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 transition-colors ${newBill.isSubscription ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
              Save {newBill.isSubscription ? 'Subscription' : 'Obligation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
