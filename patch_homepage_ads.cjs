const fs = require('fs');

let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf-8');

// Replace activeBetweenAd declaration
content = content.replace(
  "const activeBetweenAd = ads?.find(a => a.active && a.position === 'homepage-between');",
  "const activeBetweenAds = ads?.filter(a => a.active && a.position === 'homepage-between') || [];"
);

// Replace the render logic
const oldLogic = `                // Insert dynamic horizontally structured ad banner exactly in-between (after 4 items)
                if (idx === 3 && activeBetweenAd) {
                  elements.push(
                    <div className="col-span-1 sm:col-span-2 pt-3 pb-3" key="horizontal-mid-ad">
                      <div className="bg-[#E85D42]/5 text-zinc-955 dark:text-zinc-200 border border-[#E85D42]/20 p-4 relative overflow-hidden group font-sans">
                        <span className="absolute right-3 top-2.5 text-[7px] bg-[#E85D42]/10 text-[#E85D42] font-black px-1.5 tracking-widest uppercase" style={{ color: currentSettings.accentColor, backgroundColor: currentSettings.accentColor + '1a' }}>
                          {language === 'fr' ? 'SPONSORISÉ DE L\\'ÉDITION' : 'EDITION SPONSOR'}
                        </span>
                        
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
                          <div className="flex gap-4 items-center flex-1 min-w-0">
                            {activeBetweenAd.imageUrl && activeBetweenAd.imageUrl.trim() !== '' && (
                              <img 
                                src={activeBetweenAd.imageUrl} 
                                alt="" 
                                className="w-12 h-12 object-cover border border-brand-border shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="text-left flex-1 min-w-0">
                              <h4 className="font-black text-xs uppercase tracking-widest text-[#E85D42] truncate" style={{ color: currentSettings.accentColor }}>
                                {activeBetweenAd.name}
                              </h4>
                              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed mt-0.5 line-clamp-2">
                                {typeof activeBetweenAd.description === 'object'
                                  ? ((activeBetweenAd.description as any)[language] || (activeBetweenAd.description as any).fr || (activeBetweenAd.description as any).en || '')
                                  : (activeBetweenAd.description || activeBetweenAd.targetUrl)}
                              </p>
                            </div>
                          </div>
                          <a 
                            href={activeBetweenAd.targetUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-4 bg-[#E85D42] text-white text-[9px] font-black py-2 uppercase tracking-widest hover:opacity-90 shrink-0 transition-colors"
                            style={{ backgroundColor: currentSettings.accentColor }}
                          >
                            {activeBetweenAd.ctaText || (language === 'fr' ? 'DÉCOUVRIR' : 'DISCOVER')}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }`;

const newLogic = `                // Insert dynamic horizontally structured ad banner up to 5 times (every 4 items)
                if ((idx + 1) % 4 === 0 && activeBetweenAds.length > 0) {
                  const adIndex = Math.floor((idx + 1) / 4) - 1;
                  
                  if (adIndex < 5) { // up to 5 ads
                    const currentAd = activeBetweenAds[adIndex % activeBetweenAds.length];
                    elements.push(
                      <div className="col-span-1 sm:col-span-2 pt-3 pb-3" key={\`horizontal-mid-ad-\${adIndex}\`}>
                        <div className="bg-[#E85D42]/5 text-zinc-955 dark:text-zinc-200 border border-[#E85D42]/20 p-4 relative overflow-hidden group font-sans">
                          <span className="absolute right-3 top-2.5 text-[7px] bg-[#E85D42]/10 text-[#E85D42] font-black px-1.5 tracking-widest uppercase" style={{ color: currentSettings.accentColor, backgroundColor: currentSettings.accentColor + '1a' }}>
                            {language === 'fr' ? 'SPONSORISÉ DE L\\'ÉDITION' : 'EDITION SPONSOR'}
                          </span>
                          
                          <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
                            <div className="flex gap-4 items-center flex-1 min-w-0">
                              {currentAd.imageUrl && currentAd.imageUrl.trim() !== '' && (
                                <img 
                                  src={currentAd.imageUrl} 
                                  alt="" 
                                  className="w-12 h-12 object-cover border border-brand-border shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="text-left flex-1 min-w-0">
                                <h4 className="font-black text-xs uppercase tracking-widest text-[#E85D42] truncate" style={{ color: currentSettings.accentColor }}>
                                  {currentAd.name}
                                </h4>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed mt-0.5 line-clamp-2">
                                  {typeof currentAd.description === 'object'
                                    ? ((currentAd.description as any)[language] || (currentAd.description as any).fr || (currentAd.description as any).en || '')
                                    : (currentAd.description || currentAd.targetUrl)}
                                </p>
                              </div>
                            </div>
                            <a 
                              href={currentAd.targetUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-4 bg-[#E85D42] text-white text-[9px] font-black py-2 uppercase tracking-widest hover:opacity-90 shrink-0 transition-colors"
                              style={{ backgroundColor: currentSettings.accentColor }}
                            >
                              {currentAd.ctaText || (language === 'fr' ? 'DÉCOUVRIR' : 'DISCOVER')}
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }`;

if(content.indexOf("if (idx === 3 && activeBetweenAd) {") !== -1) {
  content = content.replace(oldLogic, newLogic);
  fs.writeFileSync('src/pages/HomePage.tsx', content, 'utf-8');
  console.log('Patched HomePage.tsx for multiple ads!');
} else {
  console.log('Could not find old logic in HomePage.tsx!');
}
