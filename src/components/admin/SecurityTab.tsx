import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShieldCheck, Lock, Key, Mail, User, Eye, EyeOff, RefreshCw, CheckCircle2, 
  AlertTriangle, Shield, UserPlus, Edit3, Trash2, ShieldAlert, Check, Sparkles, Sliders
} from 'lucide-react';
import { db, safeOnSnapshot, collection, doc, setDoc, deleteDoc } from '../../lib/mongodb';

export function SecurityTab() {
  const { language, siteSettings, updateSiteSettings, readerProfile, users: storeUsers, updateUserPassword, updateUserRole, deleteUser } = useStore();
  const { user: firebaseUser, resetUserPassword, registerWithEmail } = useAuth();

  // Firestore real-time users state
  const [firestoreUsers, setFirestoreUsers] = useState<any[]>([]);

  // Modals & Active Action States
  const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<any | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Current Logged-in Admin Password Change Form State
  const [myCurrentPassword, setMyCurrentPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [showMyPassword, setShowMyPassword] = useState(false);
  const [myPasswordLoading, setMyPasswordLoading] = useState(false);

  // Add New Admin Account Modal State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminName, setAddAdminName] = useState('');
  const [addAdminRole, setAddAdminRole] = useState<'Admin' | 'Éditeur' | 'Modérateur'>('Admin');
  const [addAdminPassword, setAddAdminPassword] = useState('');
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  // Security Policy State
  const [require2FA, setRequire2FA] = useState(() => {
    return localStorage.getItem('perspective_security_require_2fa') !== 'false';
  });
  const [sessionTimeout, setSessionTimeout] = useState(() => {
    return localStorage.getItem('perspective_security_session_timeout') || '24h';
  });

  // Notification Toast State
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync users list from Firestore
  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = safeOnSnapshot(usersRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          email: data.email || docSnap.id,
          name: data.name || "Admin",
          role: data.role || "Admin",
          authType: data.authType || "password",
          registeredAt: data.registeredAt || new Date().toISOString(),
          password: data.password || ''
        });
      });
      setFirestoreUsers(list);
    }, (err) => {
      console.warn("Firestore users sync notice:", err);
    });
    return () => unsubscribe();
  }, []);

  // Default seed admin accounts to ensure administrators are always present and manageable
  const seedAdmins = [
    { email: 'admin@perspective.sn', name: 'Admin Direction', role: 'Admin', authType: 'password' },
    { email: 'kadersdiaz3@gmail.com', name: 'Kader Diaz (Super Admin)', role: 'Admin', authType: 'password' },
    { email: 'contact@perspective.sn', name: 'Rédaction Perspective', role: 'Admin', authType: 'password' },
    { email: 'editor@perspective.sn', name: 'Éditeur en Chef', role: 'Éditeur', authType: 'password' }
  ];

  // Merge admin users
  const adminMap = new Map<string, any>();
  seedAdmins.forEach(a => adminMap.set(a.email.toLowerCase(), a));
  (storeUsers || []).forEach(u => {
    if (u.role === 'Admin' || u.role === 'Éditeur' || u.role === 'Abonné' || u.email.includes('admin') || u.email.includes('perspective')) {
      adminMap.set(u.email.toLowerCase(), {
        email: u.email,
        name: u.name || u.email.split('@')[0],
        role: u.role || 'Admin',
        authType: u.authType || 'password'
      });
    }
  });
  (firestoreUsers || []).forEach(u => {
    if (u.role === 'Admin' || u.role === 'Éditeur' || u.email.includes('admin') || u.email.includes('perspective')) {
      adminMap.set(u.email.toLowerCase(), {
        email: u.email,
        name: u.name || u.email.split('@')[0],
        role: u.role || 'Admin',
        authType: u.authType || 'password'
      });
    }
  });

  const allAdminsList = Array.from(adminMap.values());
  const currentAdminEmail = readerProfile?.email || firebaseUser?.email || 'admin@perspective.sn';

  // Helper to generate a random secure password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Handle updating password for any targeted admin account
  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminForPassword) return;

    if (newPasswordValue.length < 6) {
      showToast(
        language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères.' : 'Password must be at least 6 characters long.',
        'error'
      );
      return;
    }

    if (newPasswordValue !== confirmPasswordValue) {
      showToast(
        language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.',
        'error'
      );
      return;
    }

    setIsUpdatingPassword(true);
    const targetEmail = selectedAdminForPassword.email.toLowerCase().trim();

    try {
      // 1. Update in Local Zustand Store
      updateUserPassword(targetEmail, newPasswordValue);

      // 2. Update in Firestore users collection
      await setDoc(doc(db, "users", targetEmail), {
        email: targetEmail,
        password: newPasswordValue,
        passwordUpdatedAt: new Date().toISOString()
      }, { merge: true });

      // 3. Update via backend Express MongoDB endpoint
      await fetch('/api/mongodb/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: newPasswordValue })
      });

      showToast(
        language === 'fr' 
          ? `Mot de passe mis à jour avec succès pour ${targetEmail}` 
          : `Password successfully updated for ${targetEmail}`
      );

      setSelectedAdminForPassword(null);
      setNewPasswordValue('');
      setConfirmPasswordValue('');
    } catch (err: any) {
      console.error("Error updating admin password:", err);
      showToast(
        err?.message || (language === 'fr' ? 'Erreur lors de la mise à jour du mot de passe.' : 'Error updating password.'),
        'error'
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle updating password for the currently logged-in active admin
  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (myNewPassword.length < 6) {
      showToast(
        language === 'fr' ? 'Le nouveau mot de passe doit comporter au moins 6 caractères.' : 'New password must be at least 6 characters.',
        'error'
      );
      return;
    }

    if (myNewPassword !== myConfirmPassword) {
      showToast(
        language === 'fr' ? 'Les nouveaux mots de passe ne correspondent pas.' : 'New passwords do not match.',
        'error'
      );
      return;
    }

    setMyPasswordLoading(true);

    try {
      // Update in Local Zustand Store
      updateUserPassword(currentAdminEmail, myNewPassword);

      // Update in Firestore
      await setDoc(doc(db, "users", currentAdminEmail.toLowerCase().trim()), {
        email: currentAdminEmail.toLowerCase().trim(),
        password: myNewPassword,
        passwordUpdatedAt: new Date().toISOString()
      }, { merge: true });

      // Update via Express server
      await fetch('/api/mongodb/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentAdminEmail, password: myNewPassword })
      });

      showToast(
        language === 'fr' 
          ? 'Votre mot de passe administrateur a été mis à jour avec succès !' 
          : 'Your admin password has been updated successfully!'
      );

      setMyCurrentPassword('');
      setMyNewPassword('');
      setMyConfirmPassword('');
    } catch (err: any) {
      console.error("Error updating current admin password:", err);
      showToast(
        err?.message || (language === 'fr' ? 'Échec de la mise à jour.' : 'Update failed.'),
        'error'
      );
    } finally {
      setMyPasswordLoading(false);
    }
  };

  // Handle Adding a new Admin Account
  const handleCreateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAdminEmail || !addAdminName || !addAdminPassword) {
      showToast(
        language === 'fr' ? 'Veuillez remplir tous les champs.' : 'Please fill all fields.',
        'error'
      );
      return;
    }

    setAddAdminLoading(true);
    const cleanEmail = addAdminEmail.toLowerCase().trim();

    try {
      // 1. Register with AuthContext / Firebase
      await registerWithEmail(cleanEmail, addAdminPassword, addAdminName, addAdminRole, 'preset-male', 'password');

      // 2. Save directly in Firestore
      await setDoc(doc(db, "users", cleanEmail), {
        email: cleanEmail,
        name: addAdminName,
        role: addAdminRole,
        password: addAdminPassword,
        authType: 'password',
        registeredAt: new Date().toISOString()
      }, { merge: true });

      // 3. Save via backend Express
      await fetch('/api/mongodb/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: addAdminPassword, name: addAdminName })
      });

      showToast(
        language === 'fr'
          ? `Compte administrateur ${addAdminName} (${cleanEmail}) créé avec succès !`
          : `Admin account ${addAdminName} (${cleanEmail}) created successfully!`
      );

      setShowAddAdminModal(false);
      setAddAdminEmail('');
      setAddAdminName('');
      setAddAdminPassword('');
    } catch (err: any) {
      console.error("Error creating admin account:", err);
      // Fallback
      await setDoc(doc(db, "users", cleanEmail), {
        email: cleanEmail,
        name: addAdminName,
        role: addAdminRole,
        password: addAdminPassword,
        authType: 'password',
        registeredAt: new Date().toISOString()
      }, { merge: true });

      showToast(
        language === 'fr' ? `Compte ${addAdminName} enregistré.` : `Account ${addAdminName} registered.`,
        'success'
      );
      setShowAddAdminModal(false);
      setAddAdminEmail('');
      setAddAdminName('');
      setAddAdminPassword('');
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleToggle2FA = (val: boolean) => {
    setRequire2FA(val);
    localStorage.setItem('perspective_security_require_2fa', String(val));
    showToast(
      language === 'fr' 
        ? `Double authentification 2FA ${val ? 'activée' : 'désactivée'}.` 
        : `2FA requirement ${val ? 'enabled' : 'disabled'}.`
    );
  };

  const handleTimeoutChange = (val: string) => {
    setSessionTimeout(val);
    localStorage.setItem('perspective_security_session_timeout', val);
    showToast(
      language === 'fr' ? `Inactivité de session réglée sur ${val}.` : `Session timeout set to ${val}.`
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Toast alert message */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 shadow-2xl font-mono text-xs font-black uppercase tracking-widest border border-white/20 animate-pulse ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <ShieldCheck size={24} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-400">
              {language === 'fr' ? 'SÉCURITÉ ET ACCÈS ADM' : 'ADMIN SECURITY & CREDENTIALS'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-100">
            {language === 'fr' ? 'Mots de passe & Accès Administrateurs' : 'Admin Passwords & Access Control'}
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            {language === 'fr'
              ? 'Gérer en toute sécurité les identifiants, réinitialiser les mots de passe des adresses admin et configurer les règles d’authentification.'
              : 'Securely manage admin credentials, update passwords for staff emails, and configure authentication rules.'}
          </p>
        </div>

        <button
          onClick={() => {
            setAddAdminPassword(generateRandomPassword());
            setShowAddAdminModal(true);
          }}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-lg shadow-md"
        >
          <UserPlus size={16} />
          <span>{language === 'fr' ? 'Ajouter un Compte Admin' : 'Add Admin Account'}</span>
        </button>
      </div>

      {/* Security Status KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 uppercase text-[10px] block mb-1">
              {language === 'fr' ? 'Comptes Administrateurs' : 'Admin Accounts'}
            </span>
            <span className="text-2xl font-black text-white">{allAdminsList.length}</span>
          </div>
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg">
            <Shield size={22} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 uppercase text-[10px] block mb-1">
              {language === 'fr' ? 'Charte / CGU Pied de Page' : 'Footer Safe Use Policies'}
            </span>
            <span className={`text-base font-black ${siteSettings?.showDraftPoliciesInFooter ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {siteSettings?.showDraftPoliciesInFooter 
                ? (language === 'fr' ? 'AFFICHÉE' : 'VISIBLE') 
                : (language === 'fr' ? 'MASQUÉE' : 'HIDDEN')}
            </span>
          </div>
          <div className={`p-3 border rounded-lg ${
            siteSettings?.showDraftPoliciesInFooter ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}>
            <Lock size={22} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 uppercase text-[10px] block mb-1">
              {language === 'fr' ? 'Expiration de Session' : 'Session Timeout'}
            </span>
            <span className="text-2xl font-black text-white">{sessionTimeout}</span>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg">
            <Key size={22} />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Admin Emails Password Manager (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                  <Mail size={18} className="text-orange-500" />
                  {language === 'fr' ? 'Mise à jour des Mots de Passe Admins' : 'Admin Email Password Manager'}
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {language === 'fr' 
                    ? 'Sélectionnez une adresse e-mail administrateur pour modifier immédiatement son mot de passe d’accès.'
                    : 'Select an admin email address to immediately update or override its access password.'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-500 font-mono uppercase text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Email / Administrateur</th>
                    <th className="p-3">Rôle</th>
                    <th className="p-3">Auth</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {allAdminsList.map((adm) => {
                    const isSelf = adm.email.toLowerCase() === currentAdminEmail.toLowerCase();
                    return (
                      <tr key={adm.email} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-500/40 text-orange-400 font-bold flex items-center justify-center text-xs">
                              {adm.name ? adm.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                                <span>{adm.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.2 border border-orange-500/30 rounded font-mono">
                                    {language === 'fr' ? 'Vous' : 'You'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-zinc-400">{adm.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-mono">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                            adm.role === 'Admin' 
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          }`}>
                            {adm.role}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-[10px] uppercase text-zinc-400">
                          {adm.authType || 'Password'}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedAdminForPassword(adm);
                              setNewPasswordValue('');
                              setConfirmPasswordValue('');
                            }}
                            className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border border-zinc-700 hover:border-orange-500 transition-all cursor-pointer"
                          >
                            <Key size={13} />
                            <span>{language === 'fr' ? 'Modifier Mot de Passe' : 'Change Password'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Policy & Security Parameters */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wide border-b border-zinc-800 pb-3">
              <Sliders size={18} className="text-orange-500" />
              {language === 'fr' ? 'Politique de Sécurité & Sessions' : 'Security Policy & Session Rules'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-200 uppercase">
                    {language === 'fr' ? 'Bouton Charte & CGU (Pied de Page)' : 'Safe Use Policies Footer Button'}
                  </span>
                  <input
                    type="checkbox"
                    checked={!!siteSettings?.showDraftPoliciesInFooter}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSiteSettings({ showDraftPoliciesInFooter: val });
                      showToast(
                        language === 'fr'
                          ? `Bouton Charte de Sécurité & CGU ${val ? 'activé' : 'masqué du pied de page'}.`
                          : `Safe Use Policies button ${val ? 'shown in' : 'hidden from'} footer.`
                      );
                    }}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-zinc-400">
                  {language === 'fr'
                    ? 'Affiche ou masque le lien "Charte de Sécurité & CGU (Projet)" dans le pied de page du site.'
                    : 'Shows or hides the "Safe Use Policies (Draft)" link in the site footer.'}
                </p>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-200 uppercase">
                    {language === 'fr' ? 'Inactivité de Session' : 'Session Inactivity'}
                  </span>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => handleTimeoutChange(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 p-1 text-xs font-bold rounded"
                  >
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 heure</option>
                    <option value="12h">12 heures</option>
                    <option value="24h">24 heures</option>
                  </select>
                </div>
                <p className="text-[10px] text-zinc-400">
                  {language === 'fr'
                    ? 'Déconnecte automatiquement les sessions administrateur inactives.'
                    : 'Automatically logs out inactive administrator sessions.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Update My Current Active Password Form (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                <Lock size={18} className="text-orange-500" />
                {language === 'fr' ? 'Mon Mot de Passe Actuel' : 'Change My Admin Password'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {language === 'fr' 
                  ? `Compte actif : ${currentAdminEmail}` 
                  : `Active session: ${currentAdminEmail}`}
              </p>
            </div>

            <form onSubmit={handleChangeMyPassword} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] font-bold mb-1">
                  {language === 'fr' ? 'Nouveau Mot de Passe' : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showMyPassword ? 'text' : 'password'}
                    required
                    value={myNewPassword}
                    onChange={(e) => setMyNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyPassword(!showMyPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                  >
                    {showMyPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] font-bold mb-1">
                  {language === 'fr' ? 'Confirmer le Nouveau Mot de Passe' : 'Confirm New Password'}
                </label>
                <input
                  type={showMyPassword ? 'text' : 'password'}
                  required
                  value={myConfirmPassword}
                  onChange={(e) => setMyConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={myPasswordLoading}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  {myPasswordLoading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  <span>{language === 'fr' ? 'Mettre à Jour Mon Mot de Passe' : 'Update My Password'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-orange-400 uppercase text-[11px]">
              <ShieldAlert size={16} />
              <span>{language === 'fr' ? 'Recommandations de Sécurité' : 'Security Best Practices'}</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
              {language === 'fr'
                ? 'Utilisez au moins 10 caractères incluant des majuscules, des chiffres et des symboles. Ne partagez jamais les accès administrateur.'
                : 'Use at least 10 characters with uppercase, digits, and symbols. Never share admin credentials.'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Update Specific Targeted Admin Password */}
      {selectedAdminForPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-orange-500">
                <Key size={18} />
                <h3 className="font-bold text-sm text-zinc-100 uppercase">
                  {language === 'fr' ? 'Modifier le Mot de Passe' : 'Update Admin Password'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAdminForPassword(null)}
                className="text-zinc-500 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-950 p-3 border border-zinc-800 rounded font-mono text-xs">
              <div className="text-zinc-400 text-[10px] uppercase">{language === 'fr' ? 'Compte Admin Cible :' : 'Target Admin Email:'}</div>
              <div className="text-zinc-100 font-bold">{selectedAdminForPassword.email}</div>
            </div>

            <form onSubmit={handleUpdateAdminPassword} className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-400 uppercase text-[10px] font-bold">
                    {language === 'fr' ? 'Nouveau Mot de Passe' : 'New Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateRandomPassword();
                      setNewPasswordValue(gen);
                      setConfirmPasswordValue(gen);
                    }}
                    className="text-[10px] text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>{language === 'fr' ? 'Générer' : 'Generate'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] font-bold mb-1">
                  {language === 'fr' ? 'Confirmer le Mot de Passe' : 'Confirm Password'}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPasswordValue}
                  onChange={(e) => setConfirmPasswordValue(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAdminForPassword(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-xs rounded transition-colors cursor-pointer"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase text-xs rounded transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdatingPassword ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>{language === 'fr' ? 'Enregistrer' : 'Save Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Admin Account */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-orange-500">
                <UserPlus size={18} />
                <h3 className="font-bold text-sm text-zinc-100 uppercase">
                  {language === 'fr' ? 'Ajouter un Administrateur' : 'Create Admin Account'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="text-zinc-500 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdminAccount} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 uppercase text-[10px] font-bold mb-1">
                  {language === 'fr' ? 'Adresse E-mail Admin' : 'Admin Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={addAdminEmail}
                  onChange={(e) => setAddAdminEmail(e.target.value)}
                  placeholder="direction@perspective.sn"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] font-bold mb-1">
                  {language === 'fr' ? 'Nom complet / Fonction' : 'Full Name / Title'}
                </label>
                <input
                  type="text"
                  required
                  value={addAdminName}
                  onChange={(e) => setAddAdminName(e.target.value)}
                  placeholder="Directeur de la Rédaction"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase text-[10px] font-bold mb-1">
                  {language === 'fr' ? 'Rôle' : 'Role'}
                </label>
                <select
                  value={addAdminRole}
                  onChange={(e) => setAddAdminRole(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="Admin">Admin (Accès Complet)</option>
                  <option value="Éditeur">Éditeur (Gestion des contenus)</option>
                  <option value="Modérateur">Modérateur (Commentaires & Rôles)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-400 uppercase text-[10px] font-bold">
                    {language === 'fr' ? 'Mot de passe Initial' : 'Initial Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddAdminPassword(generateRandomPassword())}
                    className="text-[10px] text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>{language === 'fr' ? 'Générer' : 'Generate'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={addAdminPassword}
                  onChange={(e) => setAddAdminPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded text-zinc-100 font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-xs rounded transition-colors cursor-pointer"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addAdminLoading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase text-xs rounded transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {addAdminLoading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>{language === 'fr' ? 'Créer le Compte' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
