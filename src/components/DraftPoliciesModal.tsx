import React, { useState } from 'react';
import { ShieldCheck, FileText, X, ChevronRight, Lock, Eye, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../store';
import { DRAFT_SAFE_USE_POLICIES, PolicySection } from '../data/draftPolicies';

interface DraftPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DraftPoliciesModal({ isOpen, onClose }: DraftPoliciesModalProps) {
  const language = useStore((s) => s.language);
  const isFr = language === 'fr';

  const [selectedSectionId, setSelectedSectionId] = useState<string>('cgu_safe_use');

  if (!isOpen) return null;

  const currentSection = DRAFT_SAFE_USE_POLICIES.find(s => s.id === selectedSectionId) || DRAFT_SAFE_USE_POLICIES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-4xl w-full rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-zinc-900/90 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  {isFr ? 'Politiques d’Usage Sécurisé & Protection des Données' : 'Safe Use Policies & Data Governance'}
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider">
                  {isFr ? 'Projet non encore appliqué' : 'Draft Policy - Not yet applied'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isFr
                  ? 'Cadre normatif encadrant l’accès à la plateforme, la géolocalisation consentie et la modération.'
                  : 'Normative framework defining portal access, consented location telemetry, and moderation.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="bg-amber-950/30 border-b border-amber-800/40 px-6 py-2.5 flex items-center gap-2.5 text-amber-200/90 text-xs font-mono">
          <Info size={14} className="shrink-0 text-amber-400" />
          <span>
            {isFr
              ? 'Conformément à votre demande, ces politiques sont rédigées en mode projet (Draft) et ne seront pas appliquées aux utilisateurs tant que vous ne les aurez pas validées.'
              : 'Per your instructions, these draft policies are provided for editorial review and are not yet forcibly applied to readers.'}
          </span>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Sidebar / Section Selector */}
          <div className="md:col-span-4 bg-zinc-900/40 border-r border-zinc-800/80 p-3 space-y-2 overflow-y-auto">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 px-2 block mb-1">
              {isFr ? 'SECTIONS DE LA CHARTE' : 'POLICY SECTIONS'}
            </span>

            {DRAFT_SAFE_USE_POLICIES.map((sec) => {
              const isActive = sec.id === selectedSectionId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1 border ${
                    isActive
                      ? 'bg-[#E85D42]/15 border-[#E85D42]/50 text-white shadow-md'
                      : 'bg-zinc-950/60 hover:bg-zinc-900/80 border-zinc-800/60 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">
                      {isFr ? sec.titleFr : sec.titleEn}
                    </span>
                    <ChevronRight size={14} className={isActive ? 'text-[#E85D42]' : 'opacity-40'} />
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                    {isFr ? sec.summaryFr : sec.summaryEn}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Main Article Body */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-6 text-zinc-200">
            <div>
              <h4 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
                <FileText size={18} className="text-[#E85D42]" />
                <span>{isFr ? currentSection.titleFr : currentSection.titleEn}</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-2 italic font-serif">
                "{isFr ? currentSection.summaryFr : currentSection.summaryEn}"
              </p>
            </div>

            <div className="space-y-4">
              {currentSection.articles.map((art) => (
                <div
                  key={art.num}
                  className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-2 hover:border-zinc-700/80 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-[#E85D42] text-[10px] font-mono font-bold rounded uppercase">
                      {art.num}
                    </span>
                    <span className="text-xs font-bold text-white tracking-wider">
                      {isFr ? art.titleFr : art.titleEn}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans pt-1">
                    {isFr ? art.contentFr : art.contentEn}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-zinc-900/90 px-6 py-3 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <Lock size={13} className="text-emerald-400" />
            <span>{isFr ? 'Statut : Document juridique en attente d’application' : 'Status: Draft legal document pending approval'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            {isFr ? 'Fermer la prévisualisation' : 'Close Preview'}
          </button>
        </div>

      </div>
    </div>
  );
}
