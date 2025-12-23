
import React, { useEffect, useState } from 'react';
import { IdentificationIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, Card } from './types';

interface FamilyWalletViewProps {
  profile: UserFinancialProfile;
  setProfile?: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const FamilyWalletView: React.FC<FamilyWalletViewProps> = ({ profile, setProfile }) => {
  const [newCard, setNewCard] = useState({ name: '', last4: '', owner: '', userId: profile.currentUserId || '' });

  useEffect(() => {
    setNewCard(prev => ({ ...prev, userId: prev.userId || profile.currentUserId || '' }));
  }, [profile.currentUserId]);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.name || !newCard.last4 || !setProfile) return;
    const ownerUser = profile.users.find(u => u.id === newCard.userId);
    const card: Card = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCard.name,
      last4: newCard.last4.slice(-4),
      owner: newCard.owner || ownerUser?.name,
      userId: newCard.userId || undefined
    };
    setProfile(p => ({ ...p, cards: [...(p.cards || []), card] }));
    setNewCard({ name: '', last4: '', owner: '', userId: newCard.userId });
  };

  const removeCard = (id: string) => {
    if (!setProfile) return;
    setProfile(p => ({ ...p, cards: p.cards.filter(c => c.id !== id) }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Family Wallet</h1>
          <p className="text-slate-500 font-medium italic">Manage household cards for easier receipt tracking.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
          {(profile.cards || []).length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <IdentificationIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No cards added yet.</p>
            </div>
          )}
          {(profile.cards || []).map(card => (
            <div key={card.id} className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="mb-10 flex justify-between items-start">
                 <IdentificationIcon className="w-10 h-10 text-indigo-400" />
                 <div className="flex items-center space-x-3">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                     {card.userId ? (profile.users.find(u => u.id === card.userId)?.name || card.owner || "Shared") : (card.owner || "Shared")}
                   </p>
                   {setProfile && (
                     <button onClick={() => removeCard(card.id)} className="text-slate-500 hover:text-rose-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                   )}
                 </div>
              </div>
              <p className="text-2xl font-mono tracking-widest mb-2">•••• •••• •••• {card.last4}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.name}</p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            </div>
          ))}
        </div>

        {setProfile && (
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl h-fit">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Register New Card</h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <input placeholder="Card Nickname (e.g. Daily Debit)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} />
              <input placeholder="Last 4 Digits" maxLength={4} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newCard.last4} onChange={e => setNewCard({...newCard, last4: e.target.value})} />
              <input placeholder="Owner Name (Optional)" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" value={newCard.owner} onChange={e => setNewCard({...newCard, owner: e.target.value})} />
              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-[10px] uppercase tracking-widest" value={newCard.userId} onChange={e => setNewCard({ ...newCard, userId: e.target.value })}>
                <option value="">Assign to user (optional)</option>
                {profile.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 flex items-center justify-center">
                <PlusIcon className="w-5 h-5 mr-2" /> Save Card
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
