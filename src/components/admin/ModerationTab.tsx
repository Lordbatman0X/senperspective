import React, { useState, useEffect } from 'react';
import { useStore, UserAccount, UserInteraction } from '../../store';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Trash2, ShieldAlert, Key, UserCheck, Activity, Search, Shield, Eye, EyeOff, AlertTriangle, Award, Lock, Plus, UserPlus } from 'lucide-react';
import { renderNeutralAvatar } from '../AccountDrawer';
import { db, safeOnSnapshot } from '../../lib/firebase';
import { collection, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';

export function ModerationTab() {
  const { language, users: storeUsers, interactions, deleteUser, updateUserRole } = useStore();
  const { allUsers, registerWithEmail } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);

  // Firestore direct listener for users
  const [firestoreUsers, setFirestoreUsers] = useState<any[]>([]);

  // Modal state for adding a user manually
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('Perspective2026!');
  const [newRole, setNewRole] = useState('Member');
  const [addLoading, setAddLoading] = useState(false);

  // New subtab toggle & reports state
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'reports'>('directory');
  const [reports, setReports] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  // Real-time synchronization with Firestore users collection
  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribeUsers = safeOnSnapshot(usersRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        list.push({
          email: data.email || docSnap.id,
          name: data.name || "Anonymous",
          avatarUrl: data.avatarUrl || "preset-male",
          role: data.role || "Member",
          authType: data.authType || "password"
        });
      });
      setFirestoreUsers(list);
    }, (err) => {
      console.warn("Firestore users sync notice:", err);
    });

    return () => unsubscribeUsers();
  }, []);

  // Real-time safety reports list
  useEffect(() => {
    const reportsRef = collection(db, "reports");
    const unsubscribe = safeOnSnapshot(reportsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setReports(list);
    }, (err) => {
      console.warn("Error loading reports list:", err);
    });
    return () => unsubscribe();
  }, []);

  // Local persistent state for deleted emails
  const [deletedEmails, setDeletedEmails] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('perspective_deleted_user_emails');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combine store, AuthContext, and Firestore snapshot users cleanly with default seed users
  const defaultAdminUsers = [
    {
      email: 'kadersdiaz3@gmail.com',
      name: 'Kader Diaz',
      role: 'Admin',
      authType: 'password',
      avatarUrl: 'preset-male'
    },
    {
      email: 'admin@perspective.sn',
      name: 'Admin Direction',
      role: 'Admin',
      authType: 'password',
      avatarUrl: 'preset-male'
    },
    {
      email: 'contact@perspective.sn',
      name: 'Rédaction Perspective',
      role: 'Admin',
      authType: 'password',
      avatarUrl: 'preset-female'
    }
  ];

  const userMap = new Map<string, any>();
  defaultAdminUsers.forEach(u => userMap.set(u.email.toLowerCase().trim(), u));
  (storeUsers || []).forEach(u => userMap.set(u.email.toLowerCase().trim(), u));
  (allUsers || []).forEach(u => userMap.set(u.email.toLowerCase().trim(), u));
  (firestoreUsers || []).forEach(u => userMap.set(u.email.toLowerCase().trim(), u));

  const mergedUsers = Array.from(userMap.values()).filter(u => {
    const clean = u.email ? u.email.toLowerCase().trim() : '';
    return clean && !deletedEmails.includes(clean);
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    setAddLoading(true);

    try {
      await registerWithEmail(newEmail, newPassword, newName, newRole, 'preset-male', 'password');
      setSuccessMsg(language === 'fr' ? `Utilisateur ${newName} créé avec succès.` : `User ${newName} created successfully.`);
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Error creating user:", err);
      // Fallback: save directly to Firestore users collection
      try {
        const cleanEmail = newEmail.toLowerCase().trim();
        await setDoc(doc(db, "users", cleanEmail), {
          email: cleanEmail,
          name: newName,
          role: newRole,
          avatarUrl: 'preset-male',
          authType: 'password',
          password: newPassword,
          registeredAt: new Date().toISOString()
        }, { merge: true });
        setSuccessMsg(language === 'fr' ? `Utilisateur ${newName} enregistré dans la base de données.` : `User ${newName} saved to Database.`);
        setShowAddModal(false);
        setNewEmail('');
        setNewName('');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (fsErr) {
        console.error("Fallback setDoc error:", fsErr);
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, "reports", reportId));
      setSuccessMsg(language === 'fr' ? 'Signalement ignoré.' : 'Report dismissed.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBanReportedUser = async (reportId: string, email: string) => {
    try {
      // Delete user account
      deleteUser(email);
      // Dismiss all reports for this user
      const userReports = reports.filter(r => r.reportedUser.toLowerCase() === email.toLowerCase());
      for (const rep of userReports) {
        await deleteDoc(doc(db, "reports", rep.id));
      }
      setSuccessMsg(language === 'fr' ? 'Utilisateur banni et tickets fermés.' : 'User banned and all related tickets resolved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const t = {
    title: language === 'fr' ? 'Gestion des Utilisateurs & Rôles' : 'User & Access Control',
    subtitle: language === 'fr' ? 'Gérer les comptes utilisateurs, l\'attribution des rôles et les signalements' : 'Manage user profiles, permissions, and security reports',
    searchPlaceholder: language === 'fr' ? 'Rechercher par nom ou par email...' : 'Search members by name or email...',
    rolesLabel: language === 'fr' ? 'Rôle' : 'Role Filter',
    totalUsers: language === 'fr' ? 'Utilisateurs Enregistrés' : 'Total Accounts',
    adminCount: language === 'fr' ? 'Administrateurs' : 'Administrators',
    memberCount: language === 'fr' ? 'Membres Standard' : 'Standard Members',
    username: language === 'fr' ? 'Nom d\'utilisateur' : 'Username',
    authType: language === 'fr' ? 'Authentification' : 'Auth Method',
    role: language === 'fr' ? 'Rôle' : 'Role',
    actions: language === 'fr' ? 'Actions' : 'Actions',
    deleteConfirm: language === 'fr' ? 'Supprimer définitivement ce compte ?' : 'Permanently delete this account?',
    logTitle: language === 'fr' ? 'Journal d\'Activité' : 'Audit Activity Log',
    logSubtitle: language === 'fr' ? 'Dernières actions enregistrées sur le site' : 'Real-time site engagement log',
    emptyLogs: language === 'fr' ? 'Aucune activité enregistrée.' : 'No recorded interactions.'
  };

  const handleRoleChange = (email: string, newRole: string) => {
    updateUserRole(email, newRole);
    setSuccessMsg(language === 'fr' ? `Rôle de ${email} changé en ${newRole}` : `Role for ${email} updated to ${newRole}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteClick = async (email: string) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    if (confirmDeleteEmail === cleanEmail) {
      const updatedDeleted = Array.from(new Set([...deletedEmails, cleanEmail]));
      setDeletedEmails(updatedDeleted);
      try {
        localStorage.setItem('perspective_deleted_user_emails', JSON.stringify(updatedDeleted));
      } catch (e) {
        console.error("Error writing deleted user emails to localStorage:", e);
      }

      deleteUser(cleanEmail);

      try {
        await deleteDoc(doc(db, "users", cleanEmail));
      } catch (err) {
        console.error("Error deleting user from Firestore:", err);
      }

      setConfirmDeleteEmail(null);
      setSuccessMsg(language === 'fr' ? `Compte ${email} supprimé avec succès.` : `Account ${email} removed successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setConfirmDeleteEmail(cleanEmail);
    }
  };

  const filteredUsers = mergedUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-3 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-100">{t.title}</h2>
          <p className="text-xs text-zinc-200 font-mono">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-md shadow-md"
        >
          <UserPlus size={16} />
          <span>{language === 'fr' ? 'Créer un Utilisateur' : 'Add New User'}</span>
        </button>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold uppercase text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#E85D42]" />
                {language === 'fr' ? 'Nouveau Compte Utilisateur' : 'Create User Account'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-200 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Nom Complet / Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ex: Mamadou Ndiaye"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Adresse Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="m.ndiaye@example.sn"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Mot de Passe Initial</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Rôle / Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md text-xs font-bold"
                >
                  <option value="Member">Membre (Standard)</option>
                  <option value="Author">Auteur (Author)</option>
                  <option value="Editor">Éditeur (Editor)</option>
                  <option value="Admin">Administrateur (Admin)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-zinc-800 text-zinc-300 py-2 rounded-md text-xs font-bold uppercase"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-[#E85D42] hover:bg-[#c94931] text-white py-2 rounded-md text-xs font-bold uppercase transition-all"
                >
                  {addLoading ? '...' : (language === 'fr' ? 'Enregistrer' : 'Save User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl rounded-lg border-l-4 border-l-[#E85D42]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">{t.totalUsers}</span>
            <Users size={20} className="text-[#E85D42]" />
          </div>
          <p className="text-3xl font-black text-zinc-100">{mergedUsers.length}</p>
        </div>

        <div className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl rounded-lg border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">{t.adminCount}</span>
            <Shield size={20} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-zinc-100">
            {mergedUsers.filter(u => u.role === 'Admin').length}
          </p>
        </div>

        <div className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl rounded-lg border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">{t.memberCount}</span>
            <UserCheck size={20} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-zinc-100">
            {mergedUsers.filter(u => u.role !== 'Admin').length}
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-mono font-bold uppercase tracking-wider px-4 py-3 shadow-md rounded-md">
          ✓ {successMsg}
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer bg-transparent ${
            activeSubTab === 'directory'
              ? 'border-[#E85D42] text-[#E85D42]'
              : 'border-transparent text-zinc-200 hover:text-zinc-100'
          }`}
        >
          {language === 'fr' ? 'Annuaire des Utilisateurs' : 'User Directory'}
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer bg-transparent flex items-center gap-2 ${
            activeSubTab === 'reports'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-zinc-200 hover:text-zinc-100'
          }`}
        >
          <AlertTriangle size={14} />
          <span>{language === 'fr' ? `Signalements Sécurité (${reports.length})` : `Security Reports (${reports.length})`}</span>
        </button>
      </div>

      {activeSubTab === 'directory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Directory Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md p-4 border border-zinc-800 rounded-lg flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xl">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-3 text-zinc-200" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-zinc-100 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#E85D42] rounded-md placeholder-zinc-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold uppercase text-zinc-300 whitespace-nowrap">{t.rolesLabel}:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-2 text-xs font-semibold focus:outline-none focus:border-[#E85D42] rounded-md"
                >
                  <option value="all">{language === 'fr' ? 'Tous les rôles' : 'All Roles'}</option>
                  <option value="Admin">Admin</option>
                  <option value="Author">{language === 'fr' ? 'Auteur' : 'Author'}</option>
                  <option value="Editor">{language === 'fr' ? 'Éditeur' : 'Editor'}</option>
                  <option value="Member">{language === 'fr' ? 'Membre' : 'Member'}</option>
                </select>
              </div>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
              <div className="divide-y divide-zinc-800">
                {filteredUsers.map(user => (
                  <div key={user.email} className="p-4 sm:p-5 hover:bg-zinc-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {user.avatarUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#E85D42] shrink-0">
                          {renderNeutralAvatar(user.avatarUrl, user.name, 40)}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-extrabold uppercase text-zinc-100 shrink-0">
                          {user.name.substring(0, 1)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-2">
                          {user.name}
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs border ${
                            user.role === 'Admin' 
                              ? 'bg-red-950/80 text-red-300 border-red-700' 
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}>
                            {user.role}
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-200 font-mono mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    {/* Actions Area */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-200 font-bold">{language === 'fr' ? 'Rôle' : 'Role'}</span>
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.email, e.target.value)}
                          className="bg-zinc-950 border border-zinc-700/80 text-zinc-100 p-1.5 text-xs font-bold focus:outline-none focus:border-[#E85D42] rounded-md"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Author">{language === 'fr' ? 'Auteur' : 'Author'}</option>
                          <option value="Editor">{language === 'fr' ? 'Éditeur' : 'Editor'}</option>
                          <option value="Member">{language === 'fr' ? 'Membre' : 'Member'}</option>
                        </select>
                      </div>

                      {confirmDeleteEmail === user.email?.toLowerCase().trim() ? (
                        <button
                          onClick={() => handleDeleteClick(user.email)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse transition-all cursor-pointer border-none rounded-md"
                        >
                          {language === 'fr' ? 'CONFIRMER ?' : 'CONFIRM?'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteClick(user.email)}
                          disabled={user.role === 'Admin' && mergedUsers.filter(u => u.role === 'Admin').length <= 1}
                          className="p-2 text-zinc-200 hover:text-red-400 hover:bg-red-950/40 transition-all rounded-md disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none"
                          title="Supprimer le compte"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center text-zinc-200 font-bold text-xs uppercase tracking-wider bg-zinc-900/60">
                    {language === 'fr' ? 'Aucun membre trouvé.' : 'No members found.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Interaction Audit Logs Column */}
          <div className="space-y-6">
            <div className="bg-zinc-950 p-6 border border-zinc-800 rounded-lg shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="text-[#E85D42]" size={20} />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">{t.logTitle}</h3>
              </div>
              <p className="text-xs text-zinc-200">{t.logSubtitle}</p>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg max-h-[500px] overflow-y-auto divide-y divide-zinc-800 shadow-xl">
              {(interactions || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-200 font-bold uppercase tracking-wider">
                  {t.emptyLogs}
                </div>
              ) : (
                (interactions || []).map(log => (
                  <div key={log.id} className="p-3.5 hover:bg-zinc-800/50 transition-colors space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-zinc-200 font-mono">
                      <span className="font-bold text-zinc-200 truncate max-w-[140px]">{log.email}</span>
                      <span>{log.date}</span>
                    </div>
                    <p className="text-zinc-300 font-medium">
                      {language === 'fr' ? log.detail.fr : log.detail.en}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Security reports tickets */}
          {reports.length === 0 ? (
            <div className="p-12 text-center text-zinc-200 font-bold text-xs uppercase tracking-wider bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl">
              {language === 'fr' ? 'Aucun signalement actif de sécurité.' : 'No active security reports recorded.'}
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
                      <span className="text-rose-300 bg-rose-950/80 px-2 py-0.5 border border-rose-800 rounded-xs">
                        {report.reason}
                      </span>
                      <span className="text-zinc-200">
                        {report.date}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-zinc-100">
                      {language === 'fr' ? 'Utilisateur signalé :' : 'Reported User :'} <span className="font-mono text-xs text-[#E85D42]">{report.reportedUser}</span>
                    </h4>
                    <p className="text-xs text-zinc-200 font-mono">
                      {language === 'fr' ? 'Signalé par :' : 'Reported by :'} {report.reportedBy}
                    </p>
                    {report.details && (
                      <p className="p-3 bg-zinc-950 text-xs italic text-zinc-300 border-l-2 border-zinc-600 rounded-r-md mt-2">
                        "{report.details}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 hover:bg-zinc-700 cursor-pointer border-none rounded-md transition-colors"
                    >
                      {language === 'fr' ? 'Ignorer' : 'Dismiss'}
                    </button>
                    <button
                      onClick={() => handleBanReportedUser(report.id, report.reportedUser)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 cursor-pointer border-none rounded-md transition-colors"
                    >
                      {language === 'fr' ? 'Bannir l\'utilisateur' : 'Ban User'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
