
import React from 'react';
import { ArchiveBoxIcon, CameraIcon, IdentificationIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, CheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, ReceiptReviewState, Expense } from './types';
import { scanReceipt, HAS_AI_ACCESS } from './geminiService';

interface SpendLogViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
  receiptReview: ReceiptReviewState | null;
  setReceiptReview: (review: ReceiptReviewState | null) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  expandedReceiptId: string | null;
  setExpandedReceiptId: (id: string | null) => void;
}

export const SpendLogView: React.FC<SpendLogViewProps> = ({ 
  profile, setProfile, receiptReview, setReceiptReview, isScanning, setIsScanning, expandedReceiptId, setExpandedReceiptId 
}) => {
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editCategory, setEditCategory] = React.useState<string>("");
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = React.useState<string | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (receiptReview) {
      const match = profile.cards.find(c => c.last4 === receiptReview.cardLast4);
      setSelectedCardId(match?.id || profile.cards[0]?.id);
      setSelectedUserId(profile.currentUserId || profile.users[0]?.id);
    } else {
      setSelectedCardId(undefined);
      setSelectedUserId(undefined);
    }
  }, [receiptReview, profile.cards, profile.currentUserId, profile.users]);

  const groupedSpendLog = React.useMemo(() => {
    // Show only discretionary/one-off spend (exclude bills/subscriptions; require explicit false)
    const nonRecurring = profile.expenses.filter(e => e.isRecurring === false && e.isSubscription === false);
    const groups: Record<string, { merchant: string; date: string; total: number; cardId?: string; cardLast4?: string; cardOwner?: string; items: Expense[]; isReceipt: boolean }> = {};
    nonRecurring.forEach(exp => {
      const card = profile.cards.find(c => c.id === exp.cardId);
      if (exp.receiptId) {
        if (!groups[exp.receiptId]) {
          groups[exp.receiptId] = { 
            merchant: exp.merchant || 'Retailer', 
            date: exp.date, 
            total: 0, 
            cardId: exp.cardId, 
            cardLast4: exp.cardLast4 || card?.last4, 
            cardOwner: card?.owner,
            items: [], 
            isReceipt: true 
          };
        }
        groups[exp.receiptId].total += exp.amount;
        groups[exp.receiptId].items.push(exp);
      } else {
        groups[exp.id] = { 
          merchant: exp.merchant || exp.category, 
          date: exp.date, 
          total: exp.amount, 
          cardId: exp.cardId, 
          cardLast4: exp.cardLast4 || card?.last4, 
          cardOwner: card?.owner,
          items: [exp], 
          isReceipt: false 
        };
      }
    });
    return Object.entries(groups).sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime());
  }, [profile.expenses, profile.cards]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if(!f) return;
    setIsScanning(true);
    setScanError(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await scanReceipt(ev.target?.result as string);
        if (!res || !Array.isArray(res.items) || res.items.length === 0) {
          throw new Error("No line items returned from AI.");
        }
        setReceiptReview({ ...res, items: res.items.map((i: any) => ({ ...i, id: Math.random().toString() })) });
      } catch(err) {
        console.error("Scan failed:", err);
        setScanError("Receipt scan failed. Please try again or enter manually.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const updateItemCategory = (itemId: string) => {
    setProfile(p => ({
      ...p,
      expenses: p.expenses.map(e => e.id === itemId ? { ...e, category: editCategory } : e)
    }));
    setEditingItemId(null);
  };

  const updateReceiptItemCategory = (itemId: string, category: string) => {
    setReceiptReview(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, category } : i) } : prev);
  };

  const saveReceiptToExpenses = () => {
    if (!receiptReview) return;
    const receiptId = `rcpt-${Date.now()}`;
    const card = profile.cards.find(c => c.id === selectedCardId) || profile.cards.find(c => c.last4 === receiptReview.cardLast4);
    const date = receiptReview.date || new Date().toISOString().slice(0, 10);
    const ownerId = selectedUserId || profile.currentUserId || profile.users[0]?.id;

    const newExpenses: Expense[] = receiptReview.items.map(item => ({
      id: `exp-${Math.random().toString(36).slice(2, 9)}`,
      category: item.category || 'Uncategorized',
      description: item.description,
      amount: Number(item.amount) || 0,
      isRecurring: false,
      date,
      merchant: receiptReview.merchant,
      receiptId,
      cardId: card?.id,
      cardLast4: card?.last4 || receiptReview.cardLast4 || undefined,
      isSubscription: false,
      userId: ownerId || undefined
    }));

    setProfile(p => ({ ...p, expenses: [...p.expenses, ...newExpenses] }));
    setReceiptReview(null);
    setSelectedCardId(undefined);
    setExpandedReceiptId(receiptId);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8"><h1 className="text-4xl font-black text-slate-900 tracking-tight">Spend Log</h1></header>

      {receiptReview && (
        <div className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Receipt ready to save</p>
              <h3 className="text-2xl font-black text-slate-900">{receiptReview.merchant || 'Receipt'}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{receiptReview.date}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReceiptReview(null)} className="px-4 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Discard
              </button>
              <button onClick={saveReceiptToExpenses} className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500">
                Save to Spend Log
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payment Card</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm"
                value={selectedCardId || ''}
                onChange={e => setSelectedCardId(e.target.value || undefined)}
              >
                <option value="">No card</option>
                {profile.cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name} •••• {c.last4}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detected last4</label>
              <input
                value={receiptReview.cardLast4 || 'N/A'}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Spender</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm"
                value={selectedUserId || ''}
                onChange={e => setSelectedUserId(e.target.value || undefined)}
              >
                <option value="">Unassigned</option>
                {profile.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Line items</p>
            {receiptReview.items.map(item => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-50 rounded-2xl p-4">
                <div className="flex-1">
                  <p className="font-black text-slate-900">{item.description}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">£{Number(item.amount).toFixed(2)}</p>
                </div>
                <input
                  className="w-full md:w-48 bg-white border border-slate-200 rounded-2xl p-3 font-black text-sm"
                  value={item.category || ''}
                  onChange={e => updateReceiptItemCategory(item.id, e.target.value)}
                  placeholder="Category"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          {groupedSpendLog.length === 0 && (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
              <ArchiveBoxIcon className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest">No spend logged yet.</p>
            </div>
          )}
          {groupedSpendLog.map(([groupId, group]) => {
            const isExpanded = expandedReceiptId === groupId;
            return (
              <div key={groupId} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
                <div onClick={() => setExpandedReceiptId(isExpanded ? null : groupId)} className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-400"><ArchiveBoxIcon className="w-6 h-6" /></div>
                    <div><p className="font-black text-slate-900 text-lg tracking-tight">{group.merchant}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{group.date}</p></div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <p className="font-black text-slate-900 text-xl">£{group.total.toFixed(2)}</p>
                    {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-50 space-y-4 animate-in slide-in-from-top-2">
                    {group.cardLast4 && (
                      <div className="flex items-center space-x-2 text-slate-500 bg-slate-50 p-3 rounded-2xl">
                        <IdentificationIcon className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Paid with Card •••• {group.cardLast4} {group.cardOwner ? `(${group.cardOwner})` : ''}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Line Items</p>
                      {group.items.map((item) => (
                        <div key={item.id} className="bg-slate-50/50 p-4 rounded-2xl flex justify-between items-center group/item">
                          <div>
                            <p className="font-bold text-sm text-slate-700">{item.description}</p>
                            {editingItemId === item.id ? (
                              <div className="flex items-center mt-1 gap-2">
                                <input 
                                  className="text-[9px] font-black uppercase p-1 rounded border border-indigo-200" 
                                  value={editCategory} 
                                  onChange={e => setEditCategory(e.target.value)} 
                                  autoFocus
                                />
                                <button onClick={() => updateItemCategory(item.id)} className="text-emerald-600"><CheckIcon className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.category}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingItemId(item.id); setEditCategory(item.category); }} 
                                  className="opacity-0 group-hover/item:opacity-100 transition-opacity text-slate-300 hover:text-indigo-500"
                                >
                                  <PencilIcon className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="font-black text-slate-900">£{item.amount.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl h-fit sticky top-8">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Capture Spend</h3>
          
          {HAS_AI_ACCESS ? (
            <>
              <label className={`w-full ${isScanning ? 'bg-slate-400' : 'bg-slate-900'} text-white py-5 rounded-[1.5rem] flex items-center justify-center font-black text-xs cursor-pointer shadow-lg hover:bg-slate-800 transition-colors`}>
                <CameraIcon className={`w-6 h-6 mr-3 ${isScanning ? 'animate-pulse' : ''}`} />
                {isScanning ? 'Processing UK Receipt...' : 'Scan UK Receipt'}
                <input type="file" accept="image/*" className="hidden" onChange={handleScan} disabled={isScanning} />
              </label>
              <div className="mt-6 p-4 bg-indigo-50 rounded-2xl">
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">AI Ready</p>
                 <p className="text-[10px] text-indigo-900 italic leading-tight">Scanning receipts automatically categorises items and detects the card used for the purchase.</p>
                 {scanError && <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest mt-2">{scanError}</p>}
              </div>
            </>
          ) : (
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 text-center space-y-4">
              <ShieldExclamationIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Restricted</p>
              <p className="text-[9px] text-slate-400 italic">Enable Gemini API to unlock automated receipt OCR and intelligence features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
