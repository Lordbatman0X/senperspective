import React from "react";
import { User } from "lucide-react";
import { useStore } from "../../store";
import { renderNeutralAvatar } from "../AccountDrawer";

export function HeaderAccountMenu() {
  const {
    readerProfile,
    language,
    notifications,
    setAuthTab,
    setShowSignUpModal,
    setShowProfileDrawer
  } = useStore();

  if (readerProfile) {
    return (
      <button
        onClick={() => setShowProfileDrawer(true)}
        className="flex items-center gap-2 border-l border-zinc-700 pl-3 hover:opacity-90 cursor-pointer"
      >
        <div className="relative">
          <div className="w-4.5 h-4.5 rounded-full overflow-hidden border border-[#E85D42] shrink-0">
            {renderNeutralAvatar(readerProfile.avatarUrl, readerProfile.name, 18)}
          </div>
          {(notifications || []).filter(
            (n) =>
              n.email.toLowerCase() === readerProfile.email.toLowerCase() &&
              !n.isRead
          ).length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full border border-[#111]" />
          )}
        </div>
        <span className="text-[9px] font-black text-white uppercase hidden sm:inline tracking-wider max-w-[90px] truncate">
          {language === "fr" ? "MON COMPTE" : "ACCOUNT"}
        </span>
        <span className="text-[7px] text-[#E85D42] bg-[#E85D42]/10 px-1.5 py-0.2 border border-[#E85D42]/20 font-black tracking-widest hidden sm:inline">
          {readerProfile.email === "kadersdiaz3@gmail.com" ||
          readerProfile.email === "admin@perspective.sn" ||
          readerProfile.email?.toLowerCase().includes("admin")
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
        <User size={10} className="text-zinc-400" />
        <span className="hidden xs:inline">{language === "fr" ? "CONNEXION" : "LOG IN"}</span>
      </button>
      <span className="text-zinc-600 text-xs select-none">/</span>
      <button
        onClick={() => {
          setAuthTab("register");
          setShowSignUpModal(true);
        }}
        className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-[#E85D42] text-white border border-[#E85D42] hover:bg-[#D45037] transition-all cursor-pointer shadow-md rounded-none"
      >
        {language === "fr" ? "S'INSCRIRE" : "SIGN UP"}
      </button>
    </div>
  );
}
