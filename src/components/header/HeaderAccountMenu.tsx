import React from "react";
import { User } from "lucide-react";
import { useStore, unreadTotalFor } from "../../store";
import { renderNeutralAvatar } from "../AccountDrawer";
import { isAdminProfile } from "../../firebase/auth";

export function HeaderAccountMenu() {
  const {
    readerProfile,
    language,
    notifications,
    directMessages,
    setAuthTab,
    setShowSignUpModal,
    setShowProfileDrawer
  } = useStore();

  // Coherent unread indicator: the exact sum of the drawer sections
  //   unread DMs + Activité + Réseau + Briefing
  // from the shared rule set, so the bubble can never drift from the drawer
  // ribbons or double-count a message (a DM raises both a DM row and a notice).
  const unreadCount = readerProfile
    ? unreadTotalFor(readerProfile.email, notifications || [], directMessages || [])
    : 0;

  if (readerProfile) {
    return (
      <button
        onClick={() => setShowProfileDrawer(true)}
        className="flex items-center gap-2 border-l border-zinc-700 pl-3 hover:opacity-90 cursor-pointer"
      >
        <div className="relative">
          <div className="w-8 h-8 sm:w-4.5 sm:h-4.5 rounded-full overflow-hidden border-2 border-[#E85D42] shrink-0">
            {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 32)}
          </div>
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[13px] h-[13px] bg-red-500 text-white text-[7.5px] font-sans font-bold flex items-center justify-center px-[3px] rounded-full leading-none ring-2 ring-zinc-950 tabular-nums"
              title={
                language === "fr"
                  ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                  : `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              }
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[9px] font-black text-white uppercase hidden sm:inline tracking-wider max-w-[90px] truncate">
          {language === "fr" ? "MON COMPTE" : "ACCOUNT"}
        </span>
        <span className="text-[7px] text-[#E85D42] bg-[#E85D42]/10 px-1.5 py-0.2 border border-[#E85D42]/20 font-black tracking-widest hidden sm:inline">
          {isAdminProfile(readerProfile)
            ? "ADMIN"
            : language === "fr"
              ? "MEMBRE"
              : "MEMBER"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 border-l border-zinc-700 pl-3 font-sans">
      <button
        onClick={() => {
          setAuthTab("login");
          setShowSignUpModal(true);
        }}
        className="text-[9px] font-black uppercase tracking-widest text-[#FFF] hover:text-[#E85D42] transition-colors cursor-pointer flex items-center gap-1"
      >
        <User size={12} className="text-zinc-400 sm:hidden" />
        <span className="hidden sm:inline">{language === "fr" ? "CONNEXION" : "LOG IN"}</span>
        <span className="sm:hidden">{language === "fr" ? "CONNEXION" : "LOG IN"}</span>
      </button>
      <span className="text-zinc-600 text-xs select-none">/</span>
      <button
        onClick={() => {
          setAuthTab("register");
          setShowSignUpModal(true);
        }}
        className="px-2 py-1 sm:py-0.5 text-[8px] sm:text-[8px] font-black uppercase tracking-widest bg-[#E85D42] text-white border border-[#E85D42] hover:bg-[#D45037] transition-all cursor-pointer shadow-md rounded-none"
      >
        {language === "fr" ? "S'INSCRIRE" : "SIGN UP"}
      </button>
    </div>
  );
}
