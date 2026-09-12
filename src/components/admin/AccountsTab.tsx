import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldAlert, UserCog, Trash2, RefreshCw, Ban, CheckCircle, Crown } from 'lucide-react';
import {
  AppUserProfile,
  fetchAllUsers,
  setUserRole,
  setUserSuspended,
  deleteUserProfile,
} from '../../firebase/auth';

/** The ONLY account allowed to use this section and to never be touched. */
export const SUPER_ADMIN_EMAIL = 'kadersdiaz3@gmail.com';

const ROLES = ['Admin', 'Éditeur', 'Journaliste', 'Membre'];

interface Props {
  language: 'fr' | 'en';
  showToast: (msg: string) => void;
}

export default function AccountsTab({ language, showToast }: Props) {
  const isFr = language === 'fr';
  const [users, setUsers] = useState<AppUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const list = await fetchAllUsers();
    setUsers(list || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter(u => !q || (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.email === SUPER_ADMIN_EMAIL ? -1 : b.email === SUPER_ADMIN_EMAIL ? 1 : 0));
  }, [users, search]);

  const isProtected = (u: AppUserProfile) =>
    (u.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL;

  const handleRoleChange = async (u: AppUserProfile, role: string) => {
    if (isProtected(u)) { showToast(isFr ? 'Le compte Super Admin est protégé.' : 'The Super Admin account is protected.'); return; }
    await setUserRole(u.uid || u.email, role);
    setUsers(prev => prev.map(x => (x.uid === u.uid ? { ...x, role } : x)));
    showToast((isFr ? 'Rôle mis à jour : ' : 'Role updated: ') + `${u.email} → ${role}`);
  };

  const handleSuspendToggle = async (u: AppUserProfile) => {
    if (isProtected(u)) { showToast(isFr ? 'Le compte Super Admin est protégé.' : 'The Super Admin account is protected.'); return; }
    const next = !(u.suspended === true);
    await setUserSuspended(u.uid || u.email, next);
    setUsers(prev => prev.map(x => (x.uid === u.uid ? { ...x, suspended: next } : x)));
    showToast((isFr ? (next ? 'Compte suspendu : ' : 'Compte rétabli : ') : (next ? 'Account suspended: ' : 'Account restored: ')) + u.email);
  };

  const handleDelete = async (u: AppUserProfile) => {
    if (isProtected(u)) { showToast(isFr ? 'Le compte Super Admin est protégé.' : 'The Super Admin account is protected.'); return; }
    await deleteUserProfile(u.uid || u.email);
    setUsers(prev => prev.filter(x => x.uid !== u.uid));
    setConfirmDelete(null);
    showToast((isFr ? 'Compte supprimé : ' : 'Account deleted: ') + u.email);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div className="border-b border-zinc-800 pb-5">
        <h2 className="text-xl font-black uppercase tracking-wider text-orange-500 flex items-center gap-2">
          <UserCog size={22} />
          {isFr ? 'Gestion des Comptes' : 'Account Management'}
        </h2>
        <p className="text-[11px] text-zinc-400 font-mono mt-1 uppercase tracking-wider">
          {isFr
            ? 'Section Super Admin — attribution des rôles, suspension et suppression des comptes.'
            : 'Super Admin section — role attribution, suspension and account removal.'}
        </p>
        <span className="inline-flex items-center gap-1.5 mt-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Crown size={12} /> {isFr ? 'Réservé à Kader S. Diaz (Super Admin)' : 'Reserved for Kader S. Diaz (Super Admin)'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isFr ? 'Rechercher par email ou nom…' : 'Search by email or name…'}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono pl-9 pr-3 py-2.5 rounded-lg outline-none focus:border-orange-600"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-orange-600 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-2.5 rounded-lg cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {isFr ? 'Actualiser' : 'Refresh'}
        </button>
      </div>
      {loading ? (
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest py-10 text-center">
          {isFr ? 'Chargement des comptes…' : 'Loading accounts…'}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest py-10 text-center">
          {isFr ? 'Aucun compte trouvé.' : 'No accounts found.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const suspended = u.suspended === true;
            const prot = isProtected(u);
            const key = u.uid || u.email;
            return (
              <div
                key={key}
                className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-lg border ${
                  prot ? 'border-amber-500/40 bg-amber-500/5' : suspended ? 'border-rose-800/60 bg-rose-950/20' : 'border-zinc-800 bg-zinc-900/60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-100 truncate">{u.name || u.email}</span>
                    {prot && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        SUPER ADMIN
                      </span>
                    )}
                    {suspended && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-400 border border-rose-600/40">
                        {isFr ? 'SUSPENDU' : 'SUSPENDED'}
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] font-mono text-zinc-500 truncate">{u.email}</span>
                  {u.createdAt && (
                    <span className="block text-[9px] font-mono text-zinc-600 mt-0.5">
                      {isFr ? 'Inscrit' : 'Registered'} {String(u.createdAt).slice(0, 10)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={u.role || 'Membre'}
                    onChange={e => handleRoleChange(u, e.target.value)}
                    disabled={prot}
                    className={`bg-zinc-950 border border-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded outline-none focus:border-orange-600 ${prot ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  <button
                    onClick={() => handleSuspendToggle(u)}
                    disabled={prot}
                    title={suspended ? (isFr ? 'Rétablir le compte' : 'Restore account') : (isFr ? 'Suspendre le compte' : 'Suspend account')}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      prot ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-600'
                        : suspended ? 'border-emerald-700 text-emerald-400 hover:bg-emerald-950/40'
                        : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400'
                    }`}
                  >
                    {suspended ? <CheckCircle size={14} /> : <Ban size={14} />}
                  </button>

                  {confirmDelete === key ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white px-2 py-1.5 rounded cursor-pointer"
                      >
                        {isFr ? 'CONFIRMER' : 'CONFIRM'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[9px] font-black uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1.5 rounded cursor-pointer"
                      >
                        {isFr ? 'ANNULER' : 'CANCEL'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(key)}
                      disabled={prot}
                      title={isFr ? 'Supprimer définitivement' : 'Delete permanently'}
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        prot ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-600'
                          : 'border-zinc-700 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800'
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 text-[10px] text-zinc-500 font-mono">
        <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <span>
          {isFr
            ? 'Compte protégé : kadersdiaz3@gmail.com ne peut être ni suspendu, ni supprimé, ni rétrogradé. Les comptes suspendus sont bloqués à leur prochaine tentative de connexion.'
            : 'Protected account: kadersdiaz3@gmail.com can never be suspended, deleted or downgraded. Suspended accounts are blocked at their next login attempt.'}
        </span>
      </div>

    </div>
  );
}
