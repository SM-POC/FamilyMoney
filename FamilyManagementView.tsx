
import React, { useState } from 'react';
import { UserCircleIcon, UserPlusIcon, TrashIcon, ShieldCheckIcon, IdentificationIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { UserFinancialProfile, FamilyUser } from './types';

interface FamilyManagementViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const FamilyManagementView: React.FC<FamilyManagementViewProps> = ({ profile, setProfile }) => {
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordEdits, setPasswordEdits] = useState<Record<string, string>>({});

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (newPassword.trim().length < 6) {
      alert("Please choose a password with at least 6 characters.");
      return;
    }
    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];
    const newUser: FamilyUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      role: 'Member',
      avatarColor: colors[profile.users.length % colors.length],
      password: newPassword.trim()
    };
    setProfile(p => ({ ...p, users: [...p.users, newUser] }));
    setNewName('');
    setNewPassword('');
  };

  const removeMember = (id: string) => {
    if (id === profile.currentUserId) {
      alert("You cannot remove yourself while logged in.");
      return;
    }
    if (!confirm("Are you sure you want to remove this family member? Their name will remain on history but their profile will be gone.")) return;
    setProfile(p => ({ ...p, users: p.users.filter(u => u.id !== id) }));
  };

  const updatePassword = (id: string) => {
    const next = (passwordEdits[id] || '').trim();
    if (next.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setProfile(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, password: next } : u) }));
    setPasswordEdits(p => ({ ...p, [id]: '' }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Family & Users</h1>
        <p className="text-slate-500 font-medium italic">Manage household access and roles.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.users.map(user => {
              const isMe = user.id === profile.currentUserId;
              return (
                <div key={user.id} className={`bg-white p-8 rounded-[2.5rem] border ${isMe ? 'border-indigo-200 ring-2 ring-indigo-50 shadow-lg' : 'border-slate-100 shadow-sm'} transition-all flex flex-col justify-between group relative overflow-hidden`}>
                  <div className="flex items-center space-x-6 relative z-10">
                    <div className={`w-16 h-16 rounded-full ${user.avatarColor} flex items-center justify-center shadow-xl text-white shrink-0`}>
                      <UserCircleIcon className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {user.name} {isMe && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full ml-1">YOU</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${user.role === 'Admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      {user.role === 'Admin' ? (
                        <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <IdentificationIcon className="w-5 h-5 text-slate-300" />
                      )}
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Family Identity</p>
                    </div>
                    {!isMe && (
                      <button 
                        onClick={() => removeMember(user.id)}
                        className="p-3 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Remove Member"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-6 space-y-2 relative z-10">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Password</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder={user.password ? "Update password" : "Set password"} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm"
                        value={passwordEdits[user.id] ?? ''}
                        onChange={e => setPasswordEdits(p => ({ ...p, [user.id]: e.target.value }))}
                      />
                      <button 
                        type="button"
                        onClick={() => updatePassword(user.id)}
                        className="px-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                    {!user.password && (
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">No password set yet.</p>
                    )}
                  </div>
                  
                  {isMe && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl h-fit sticky top-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
            <UserPlusIcon className="w-7 h-7" />
          </div>
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Add Family Member</h3>
          <p className="text-[10px] text-slate-400 italic mb-6 leading-tight">New members will appear at the login gateway. They can have their own income and expenses tracked.</p>
          
          <form onSubmit={handleAddMember} className="space-y-4">
            <input 
              placeholder="Full Name" 
              className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
            />
            <input 
              type="password"
              placeholder="Password (min 6 characters)" 
              className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
            />
            
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlusIcon className="w-5 h-5" />
              Register Member
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-100">
             <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-slate-400" />
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">Switch users by clicking **Sign Out** in the sidebar.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
