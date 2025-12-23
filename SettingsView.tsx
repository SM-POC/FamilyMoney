
import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  CloudArrowDownIcon, 
  Cog8ToothIcon, 
  ServerIcon, 
  KeyIcon, 
  ArrowPathIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  SignalIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { UserFinancialProfile, SyncConfig } from './types';
import { syncPush, syncPull, testConnection } from './apiService';

interface SettingsViewProps {
  profile: UserFinancialProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserFinancialProfile>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ profile, setProfile }) => {
  const [endpoint, setEndpoint] = useState(profile.syncConfig?.endpoint || '');
  const [apiKey, setApiKey] = useState(profile.syncConfig?.apiKey || '');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | 'warning', msg: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'not_configured' | 'offline'>('offline');
  const [showSchema, setShowSchema] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', month: '0', budget: '' });
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const isSelfHosted = window.location.hostname !== 'localhost';

  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setStatus({ type: 'loading', msg: 'Querying backend...' });
    try {
      const url = window.location.hostname === 'localhost' ? endpoint : '';
      const response = await fetch(`${url}/api/health`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setDbStatus('connected');
        setStatus({ type: 'success', msg: 'System Online & Database Connected.' });
      } else if (data.database === 'not_configured') {
        setDbStatus('not_configured');
        setStatus({ type: 'warning', msg: 'API Online, but no Database found.' });
      } else {
        setDbStatus('offline');
        setStatus({ type: 'error', msg: 'Backend reported an error.' });
      }
    } catch (e) {
      setDbStatus('offline');
      setStatus({ type: 'error', msg: 'Could not reach backend API.' });
    }
  };

  const handleSaveConfig = () => {
    setProfile(p => ({
      ...p,
      syncConfig: { ...p.syncConfig, endpoint, apiKey }
    }));
    handleTestConnection();
  };

  const handlePush = async () => {
    if (dbStatus !== 'connected') {
      alert("Cannot sync: Database is not connected to the backend.");
      return;
    }
    setStatus({ type: 'loading', msg: 'Uploading to Cloud...' });
    try {
      await syncPush(endpoint, apiKey, profile);
      setProfile(p => ({ ...p, syncConfig: { ...p.syncConfig!, lastSynced: new Date().toISOString() } }));
      setStatus({ type: 'success', msg: 'Cloud Update Successful.' });
    } catch (e) {
      setStatus({ type: 'error', msg: 'Push Failed. Check server logs.' });
    }
  };

  const handlePull = async () => {
    if (dbStatus !== 'connected') {
      alert("Cannot sync: Database is not connected to the backend.");
      return;
    }
    if (!confirm("This will replace all data on this device with the Cloud version. Continue?")) return;
    setStatus({ type: 'loading', msg: 'Downloading from Cloud...' });
    try {
      const remoteData = await syncPull(endpoint, apiKey);
      setProfile({ 
        ...remoteData, 
        syncConfig: { ...remoteData.syncConfig, endpoint, apiKey, lastSynced: new Date().toISOString() } 
      });
      setStatus({ type: 'success', msg: 'Device Data Refreshed.' });
    } catch (e) {
      setStatus({ type: 'error', msg: 'Pull Failed. Check server logs.' });
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.budget) return;
    const event = { id: Math.random().toString(36).slice(2, 9), name: newEvent.name, month: parseInt(newEvent.month, 10), budget: parseFloat(newEvent.budget) };
    setProfile(p => ({ ...p, specialEvents: [...(p.specialEvents || []), event] }));
    setNewEvent({ name: '', month: '0', budget: '' });
  };

  const removeEvent = (id: string) => {
    setProfile(p => ({ ...p, specialEvents: (p.specialEvents || []).filter(ev => ev.id !== id) }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 font-medium italic">
            Manage where your family data lives.
          </p>
        </div>
        <div className="flex gap-2">
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
            dbStatus === 'connected' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
            dbStatus === 'not_configured' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
            'bg-rose-50 border-rose-100 text-rose-600'
          }`}>
            <SignalIcon className={`w-4 h-4 ${dbStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {dbStatus === 'connected' ? 'Cloud Sync Ready' : dbStatus === 'not_configured' ? 'API Only (No DB)' : 'Offline / Local'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Storage Explanation */}
          <div className="bg-indigo-50 p-8 rounded-[3rem] border border-indigo-100 flex gap-6">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-indigo-600">
                <InformationCircleIcon className="w-7 h-7" />
             </div>
             <div>
                <h4 className="font-black text-indigo-900 text-sm uppercase tracking-widest mb-2">How your data is stored</h4>
                <p className="text-indigo-700/70 text-xs leading-relaxed italic">
                  By default, all data stays in <strong>this browser</strong> (Local Storage). To sync across multiple devices (e.g. your phone and laptop), you must link this app to a <strong>PostgreSQL Database</strong> via the Cloud Sync panel below.
                </p>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                  <ServerIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Cloud Sync Configuration</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {!isSelfHosted && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Local Development API URL</label>
                  <input 
                    type="url"
                    placeholder="http://localhost:3000" 
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">API Security Token</label>
                <input 
                  type="password"
                  placeholder="Your secure access key" 
                  className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-sm"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSaveConfig}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all shadow-lg"
              >
                Apply & Test Connection
              </button>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Special Event Budgets</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Plan for birthdays, holidays, and school terms.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(profile.specialEvents || []).length === 0 && (
                <p className="text-sm text-slate-400">No events logged. Add budgets to smooth seasonal spend.</p>
              )}
              {(profile.specialEvents || []).map(ev => (
                <div key={ev.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-black text-slate-900">{ev.name}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{monthNames[ev.month] || 'Month'} • £{ev.budget.toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeEvent(ev.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm md:col-span-2"
                placeholder="Event name (e.g. Christmas)"
                value={newEvent.name}
                onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
              />
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm"
                value={newEvent.month}
                onChange={e => setNewEvent({ ...newEvent, month: e.target.value })}
              >
                {monthNames.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-black text-sm"
                placeholder="Budget (£)"
                type="number"
                step="0.01"
                value={newEvent.budget}
                onChange={e => setNewEvent({ ...newEvent, budget: e.target.value })}
              />
              <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all md:col-span-4">
                Save Event Budget
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={handlePush}
              disabled={dbStatus !== 'connected'}
              className={`p-10 rounded-[3rem] border shadow-sm transition-all flex flex-col items-center text-center gap-4 group ${dbStatus === 'connected' ? 'bg-white border-slate-100 hover:shadow-xl' : 'bg-slate-50 opacity-40 cursor-not-allowed'}`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform ${dbStatus === 'connected' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                <CloudArrowUpIcon className="w-10 h-10" />
              </div>
              <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Push to Database</p>
              <p className="text-[10px] text-slate-400">Save browser data to Cloud.</p>
            </button>

            <button 
              onClick={handlePull}
              disabled={dbStatus !== 'connected'}
              className={`p-10 rounded-[3rem] border shadow-sm transition-all flex flex-col items-center text-center gap-4 group ${dbStatus === 'connected' ? 'bg-white border-slate-100 hover:shadow-xl' : 'bg-slate-50 opacity-40 cursor-not-allowed'}`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform ${dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <CloudArrowDownIcon className="w-10 h-10" />
              </div>
              <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Pull from Database</p>
              <p className="text-[10px] text-slate-400">Fetch Cloud data to device.</p>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">System Logs</h3>
            
            {status && (
              <div className={`p-5 rounded-2xl mb-8 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${
                status.type === 'loading' ? 'bg-slate-50 text-slate-400' :
                status.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                status.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {status.type === 'loading' && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                {status.msg}
              </div>
            )}

            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Engine</span>
                <span className="text-[10px] font-bold text-slate-900">{dbStatus === 'connected' ? 'PostgreSQL' : 'None (Ephemeral)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Last Sync</span>
                <span className="text-[10px] font-bold text-slate-900">{profile.syncConfig?.lastSynced ? new Date(profile.syncConfig.lastSynced).toLocaleTimeString() : 'Never'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-6">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><CircleStackIcon className="w-6 h-6" /></div>
             <h4 className="text-sm font-black uppercase tracking-widest">Data Safety</h4>
             <p className="text-[11px] text-slate-400 leading-relaxed italic font-medium">
               "If you are on Google Cloud, ensure you have a Cloud SQL instance running. If you are on Railway, ensure the Postgres plugin is active and the variable link is set."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
