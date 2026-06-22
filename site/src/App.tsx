import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

const SECTIONS = [
  {
    id: "intro",
    type: "intro",
    title: "ax-stack",
    bgClass: "bg-zinc-950",
  },
  {
    id: "portfolio",
    type: "standard",
    title: "Portfolio",
    desc: "창의적인 아이디어와 정밀한 구현의 결과물.\n우리가 만들어낸 최고의 디지털 경험들을 확인해보세요.",
    bgClass: "bg-slate-900",
  },
  {
    id: "about",
    type: "standard",
    title: "Company Info",
    desc: "프론트엔드와 백엔드를 아우르는 최신 기술력으로,\n안정적이고 확장 가능한 웹 애플리케이션을 개발합니다.",
    bgClass: "bg-teal-950",
  },
  {
    id: "services",
    type: "standard",
    title: "Services",
    desc: "웹 앱 개발, 3D 웹 인터랙션, 모션 그래픽 등\n다양한 형태의 디지털 퍼블리싱 서비스를 제공합니다.",
    bgClass: "bg-fuchsia-950",
  },
  {
    id: "contact",
    type: "standard",
    title: "Contact",
    desc: "새로운 패러다임을 함께 만들어갈 파트너를 찾고 있습니다.\n언제든 연락주세요.",
    bgClass: "bg-neutral-950",
  }
];

type PortfolioItem = {
  title: string;
  category: string;
  color: string;
  href?: string;
};

// 프로젝트가 아직 없을 때 보여줄 데모 카드 (registry.json 이 비면 폴백).
const DEMO_ITEMS: PortfolioItem[] = [
  { title: "Neon Edge", category: "Web Application", color: "bg-blue-600" },
  { title: "Aero Space", category: "3D Interaction", color: "bg-purple-600" },
  { title: "Fluid Dynamics", category: "Motion Graphics", color: "bg-teal-600" },
  { title: "Lumina XR", category: "Immersive VR", color: "bg-fuchsia-600" },
  { title: "Quantum Pay", category: "Fintech Platform", color: "bg-rose-600" },
];

// registry.json 카드에 순환 적용할 색상 팔레트.
const CARD_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-teal-600",
  "bg-fuchsia-600", "bg-rose-600", "bg-emerald-600", "bg-amber-600",
];

const PortfolioModal = ({ onClose, items }: { onClose: () => void; items: PortfolioItem[] }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const xPos = useRef(0);
  const velocity = useRef(-1); 
  const baseVelocity = -1;

  useEffect(() => {
    let ctx = gsap.context(() => {
      const track = trackRef.current;
      
      // 마우스 휠 — 현재 속도감이 적절하므로 그대로 유지.
      Observer.create({
        target: window,
        type: "wheel",
        onChange: (self) => {
          velocity.current += (self.deltaY + self.deltaX) * -0.05;
        },
      });

      // 손가락 스와이프(터치) / 포인터 드래그 — 휠과 deltaX 부호가 반대라 방향이 뒤집힘.
      // 부호를 반전(+)하고 게인을 키워(0.05 → 0.22) 더 시원하게 반응하도록 분리.
      Observer.create({
        target: window,
        type: "touch,pointer",
        onChange: (self) => {
          velocity.current += (self.deltaX + self.deltaY) * 0.22;
        },
      });

      const tick = () => {
        velocity.current += (baseVelocity - velocity.current) * 0.05; // ease back to base
        xPos.current += velocity.current;

        if (track) {
          const totalWidth = track.scrollWidth;
          const halfWidth = totalWidth / 2;
          
          if (xPos.current <= -halfWidth) {
             xPos.current += halfWidth;
          } else if (xPos.current > 0) {
             xPos.current -= halfWidth;
          }
          
          gsap.set(track, { x: xPos.current });
        }
      };

      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
      };
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-auto">
      <button 
        className="absolute top-8 right-8 text-white opacity-60 hover:opacity-100 p-4 z-[60] cursor-pointer"
        onClick={onClose}
      >
        <span className="text-sm tracking-[0.2em] uppercase font-mono">Close ✕</span>
      </button>
      
      <div className="w-full overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
         <div 
           ref={trackRef}
           className="flex w-max"
         >
            {[...items, ...items].map((item, idx) => (
              <a
                key={idx}
                href={item.href || "#"}
                target={item.href ? "_blank" : undefined}
                rel={item.href ? "noopener noreferrer" : undefined}
                className="w-[140px] md:w-[225px] h-[190px] md:h-[275px] shrink-0 mr-4 md:mr-8 rounded-[1.5rem] p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/30 transition-all duration-500 cursor-pointer no-underline"
              >
                 {/* Hover Color Overlay */}
                 <div className={`absolute inset-0 ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-700`}></div>
                 
                 {/* Decorative top-right circle */}
                 <div className={`absolute -top-8 -right-8 w-24 h-24 ${item.color} rounded-full blur-[40px] opacity-20 group-hover:opacity-60 transition-all duration-700 scale-50 group-hover:scale-100`}></div>
                 
                 <div className="relative z-10 text-white/50 text-[8px] md:text-[10px] font-mono tracking-widest uppercase transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500 delay-100">{item.category}</div>
                 <div className="relative z-10 text-xl md:text-2xl font-extrabold tracking-tighter text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  {item.title}
                 </div>
              </a>
            ))}
         </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(DEMO_ITEMS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isPortfolioOpenRef = useRef(isPortfolioOpen);
  const gotoSectionRef = useRef<(idx: number) => void>();

  useEffect(() => {
    isPortfolioOpenRef.current = isPortfolioOpen;
  }, [isPortfolioOpen]);

  // 테마: 최초 1회 localStorage에서 로드, 변경 시 저장.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ax-stack-theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem('ax-stack-theme', theme); } catch { /* noop */ }
  }, [theme]);

  // 섹션 이동 + 모바일 메뉴 닫기 헬퍼.
  const navTo = (idx: number) => { gotoSectionRef.current?.(idx); setIsMenuOpen(false); };

  // registry.json(외부 nginx가 /registry.json 으로 서빙) 을 읽어 실제 프로젝트를 카드로.
  // 비어있으면 DEMO_ITEMS 폴백 유지.
  useEffect(() => {
    fetch("/registry.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ id: string; name: string; url?: string; path?: string }>) => {
        if (Array.isArray(list) && list.length > 0) {
          setPortfolioItems(
            list.map((p, i) => ({
              title: p.name || p.id,
              category: p.id,
              color: CARD_COLORS[i % CARD_COLORS.length],
              // 서브도메인 기반: url 명시 우선 → 레거시 path → 기본 <id>.ax-stack.com
              href: p.url || p.path || `https://${p.id}.ax-stack.com`,
            }))
          );
        }
      })
      .catch(() => { /* 폴백 유지 */ });
  }, []);

  useEffect(() => {
    let ctx = gsap.context(() => {
      let currentIndex = 0;
      let isAnimating = false;
      let trembleTimeout: ReturnType<typeof setTimeout>;

      const sections = gsap.utils.toArray<HTMLElement>('.section-panel');

      // Initialize sections: hide all except the first one
      gsap.set(sections, { autoAlpha: 0, zIndex: 0 });
      gsap.set(sections[0], { autoAlpha: 1, zIndex: 1 });

      const applyTremble = () => {
        if (currentIndex !== 0) return;
        gsap.to(".intro-char", {
          keyframes: [
            { x: -2, y: 2, rotation: -1, duration: 0.03 },
            { x: 2, y: -2, rotation: 1, duration: 0.03 },
            { x: -2, y: -1, rotation: -1, duration: 0.03 },
            { x: 2, y: 1, rotation: 1, duration: 0.03 },
            { x: 0, y: 0, rotation: 0, duration: 0.03 }
          ],
          stagger: 0.03, // rapid front-to-back wave
          onComplete: () => {
            if (currentIndex === 0) {
              trembleTimeout = setTimeout(applyTremble, gsap.utils.random(2000, 5000));
            }
          }
        });
      };

      // Run Intro animation on initial load
      gsap.fromTo(
        ".intro-char",
        { y: "100%", autoAlpha: 0 },
        { 
          y: "0%", 
          autoAlpha: 1, 
          duration: 1.5, 
          ease: "elastic.out(1, 0.4)", 
          stagger: 0.05, 
          delay: 0.3,
          onComplete: () => {
            trembleTimeout = setTimeout(applyTremble, gsap.utils.random(2000, 5000));
          }
        }
      );
      gsap.to(".intro-subtitle", { autoAlpha: 1, duration: 1.5, ease: "power2.out", delay: 1.0 });

      const gotoSection = (index: number) => {
        if (isAnimating) return;
        isAnimating = true;
        clearTimeout(trembleTimeout);

        const current = sections[currentIndex];
        const next = sections[index];

        // Bring next section behind the current one (temporarily) so fade looks seamless
        gsap.set(next, { zIndex: 1 });
        gsap.set(current, { zIndex: 0 });

        const tl = gsap.timeline({
          onComplete: () => {
            currentIndex = index;
            setActiveIndex(index);
            isAnimating = false;
          }
        });

        // Fade transition: current fades out, next fades in simultaneously
        tl.to(current, { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" })
          .to(next, { autoAlpha: 1, duration: 0.9, ease: "power2.inOut" }, "<");

        // Element animations inside the incoming section
        if (SECTIONS[index].type === 'intro') {
            gsap.fromTo(
              next.querySelectorAll(".intro-char"),
              { y: "100%", autoAlpha: 0 },
              { 
                y: "0%", 
                autoAlpha: 1, 
                duration: 1.5, 
                ease: "elastic.out(1, 0.4)", 
                stagger: 0.05, 
                delay: 0.2,
                onComplete: () => {
                  trembleTimeout = setTimeout(applyTremble, gsap.utils.random(2000, 5000));
                }
              }
            );
            const subtitle = next.querySelector(".intro-subtitle");
            if (subtitle) {
              gsap.fromTo(subtitle, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5, ease: "power2.out", delay: 0.8 });
            }
        } else {
            const title = next.querySelector(".content-title");
            const desc = next.querySelector(".content-desc");
            const btn = next.querySelector(".content-btn");
            const elements = [title, desc, btn].filter(Boolean);
            if (elements.length > 0) {
              gsap.fromTo(
                elements,
                { y: 60, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 1.2, ease: "power3.out", stagger: 0.15, delay: 0.3 }
              );
            }
        }
      };

      gotoSectionRef.current = gotoSection;

      // 풀페이지 슬라이드 Observer (휠 + 터치).
      // deltaY 부호는 휠과 터치가 반대라 모바일에서 방향이 어긋남 → GSAP의 방향 정규화
      // 콜백(onUp/onDown)을 사용하고 wheelSpeed:-1 로 휠과 터치를 일치시킨다.
      //   onUp   = 위로 스와이프 / 휠 다운  → 다음 섹션
      //   onDown = 아래로 스와이프 / 휠 업   → 이전 섹션
      Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        wheelSpeed: -1,
        onUp: () => {
          if (isPortfolioOpenRef.current) return;
          if (currentIndex < SECTIONS.length - 1) gotoSection(currentIndex + 1);
        },
        onDown: () => {
          if (isPortfolioOpenRef.current) return;
          if (currentIndex > 0) gotoSection(currentIndex - 1);
        },
        tolerance: 30,      // 작은 움직임 무시 (오작동 방지)
        preventDefault: true, // 모바일 네이티브 스크롤/바운스 차단
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} w-screen h-screen bg-[#f4f4f5] text-zinc-900 dark:bg-[#080808] dark:text-[#e0e0e0] font-sans flex flex-col relative overflow-hidden select-none selection:bg-black/10 dark:selection:bg-white/20 transition-colors duration-500`}>
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/20 dark:bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] rounded-full bg-purple-400/20 dark:bg-purple-900/10 blur-[120px]"></div>
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]" style={{ backgroundImage: `radial-gradient(${theme === 'dark' ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Navigation Header */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-6 md:px-16 pt-8 md:pt-12 pointer-events-auto">
        <div 
          onClick={() => gotoSectionRef.current?.(0)}
          className="text-xl font-bold tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
        >
          ax<span className="text-blue-500 underline underline-offset-8 decoration-1 mx-0.5">-</span>stack
        </div>
        <div className="hidden md:flex gap-12 text-[10px] uppercase tracking-[0.4em] font-medium opacity-60">
          <button onClick={() => navTo(1)} className="hover:opacity-100 transition-opacity cursor-pointer">Portfolio</button>
          <button onClick={() => navTo(2)} className="hover:opacity-100 transition-opacity cursor-pointer">About</button>
          <button onClick={() => navTo(4)} className="hover:opacity-100 transition-opacity cursor-pointer">Contact</button>
        </div>
        {/* Hamburger — 데스크톱 메뉴가 사라지는 모바일에서만 표시. 클릭 시 아래로 드롭다운. */}
        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={isMenuOpen}
          className="md:hidden w-8 h-8 flex flex-col justify-center items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
        >
          <div className={`w-6 h-[1.5px] bg-zinc-900 dark:bg-white transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-y-[3.75px] rotate-45' : ''}`}></div>
          <div className={`w-6 h-[1.5px] bg-zinc-900 dark:bg-white transition-transform duration-300 ease-out ${isMenuOpen ? '-translate-y-[3.75px] -rotate-45' : ''}`}></div>
        </button>
      </nav>

      {/* Mobile Dropdown Menu — 햄버거 아래로 스르르 펼쳐짐(전체화면 X). 항상 DOM에 두고 클래스로 열고닫음. */}
      <div
        className={`md:hidden absolute right-6 top-[72px] z-30 origin-top-right transition-all duration-300 ease-out ${
          isMenuOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-end gap-2.5">
          {([['Portfolio', 1], ['About', 2], ['Services', 3], ['Contact', 4]] as const).map(([label, idx]) => (
            <button
              key={label}
              onClick={() => navTo(idx)}
              className="text-[12px] font-semibold uppercase tracking-[0.25em] opacity-80 hover:opacity-100 hover:text-blue-500 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content (Sections) */}
      <div className="flex-1 relative z-10 w-full h-full">
        {SECTIONS.map((section, idx) => (
          <section
            key={section.id}
            className={`section-panel absolute inset-0 flex flex-col items-center justify-center bg-transparent`}
          >
            {section.type === 'intro' ? (
              <div className="relative flex flex-col items-center">
                {/* Abstract Drop Decoration */}
                <div className="absolute -top-24 -left-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h1 className="flex gap-1 md:gap-2 overflow-hidden pb-4 pr-4 md:pr-6 relative z-10">
                  {section.title.split('').map((char, charIdx) => (
                    char === ' ' ? 
                      <span key={charIdx} className="inline-block mx-2 md:mx-4" /> : 
                      <span 
                        key={charIdx} 
                        className={`intro-char inline-block text-[clamp(2.4rem,9vw,120px)] font-extrabold tracking-tighter leading-none ${
                          charIdx > 2 ? 'italic font-light text-blue-400 transform translate-y-0' : 'transform translate-y-0'
                        }`}
                      >
                        {char}
                      </span>
                  ))}
                </h1>
                {/* Subtitle/State Metadata */}
                <div className="mt-4 md:mt-8 flex items-center justify-center gap-4 relative z-10 opacity-0 intro-subtitle">
                  <div className="hidden md:block h-[1px] w-12 bg-zinc-900/20 dark:bg-white/20 shrink-0"></div>
                  <p className="text-[11px] md:text-[13px] tracking-[0.08em] md:tracking-[0.12em] font-light opacity-60 px-4 text-center max-w-[20rem] md:max-w-none leading-relaxed">
                    <span className="whitespace-nowrap">코드 너머의 맥락</span>
                    <span className="opacity-40">{" · "}</span>
                    <span className="whitespace-nowrap">맥락 너머의 숨결</span>
                    <span className="opacity-40">{" · "}</span>
                    <span className="whitespace-nowrap">AI Transformation 전문기업</span>
                  </p>
                  <div className="hidden md:block h-[1px] w-12 bg-zinc-900/20 dark:bg-white/20 shrink-0"></div>
                </div>
              </div>
            ) : (
              <div className="max-w-6xl px-6 md:px-12 text-center flex flex-col items-center">
                <h2 className="content-title text-[clamp(3rem,8vw,7rem)] font-extrabold mb-4 md:mb-8 tracking-tighter shrink-0 text-zinc-900 dark:text-[#e0e0e0]">
                  {section.title}
                </h2>
                <p className="content-desc text-[clamp(1rem,1.8vw,1.5rem)] text-zinc-900/60 dark:text-[#e0e0e0]/60 font-light leading-relaxed max-w-2xl whitespace-pre-line shrink-0">
                  {section.desc}
                </p>
                {section.id === 'portfolio' && (
                  <button
                    onClick={() => setIsPortfolioOpen(true)}
                    className="content-btn mt-12 px-10 py-5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-[10px] md:text-[12px] font-mono tracking-[0.2em] uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-500 backdrop-blur-md pointer-events-auto cursor-pointer"
                  >
                    Explore Projects
                  </button>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Side Pagination (Vertical) */}
      <div className="absolute left-4 md:left-16 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-8 items-center pointer-events-none">
        <div className="hidden md:flex flex-col items-center gap-4">
          <div className="text-[10px] font-mono rotate-90 mb-4 opacity-40">SCROLL</div>
          <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-zinc-900/40 dark:via-white/40 to-transparent"></div>
        </div>
        <div className="flex flex-col gap-4 md:gap-6 pointer-events-auto">
          {SECTIONS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => gotoSectionRef.current?.(idx)}
              className={`nav-item text-[9px] md:text-[11px] font-mono transition-colors duration-700 ease-in-out cursor-pointer hover:text-blue-400 ${
                activeIndex === idx ? 'text-blue-500 opacity-100' : 'opacity-20'
              }`}
            >
              0{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Interface Elements */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex flex-col md:flex-row justify-between items-center md:items-end px-6 md:px-16 pb-6 md:pb-12 pointer-events-none gap-6">
        <div className="max-w-xs text-center md:text-left">
          <p className="text-[8px] md:text-[10px] leading-relaxed opacity-40 tracking-wider">
            BASED IN SEOUL. EXPLORING THE INTERSECTION OF MOTION, <br className="hidden md:inline"/>
            INTERACTIVITY, AND AESTHETIC PRECISION.
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-4 pointer-events-auto">
          {/* 다크/화이트 테마 토글 */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? '화이트 모드로 전환' : '다크 모드로 전환'}
            title={theme === 'dark' ? '화이트 모드' : '다크 모드'}
            className="w-10 h-10 rounded-full border border-black/15 dark:border-white/15 flex items-center justify-center hover:border-black/50 dark:hover:border-white/50 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            {theme === 'dark' ? (
              /* 해(현재 다크 → 화이트로 전환) */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              /* 달(현재 화이트 → 다크로 전환) */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
          <div className="text-[8px] md:text-[9px] font-mono opacity-30 mt-2">EST. 2026 / AX-STACK®</div>
        </div>
      </footer>

      {/* Corner Accents */}
      <div className="absolute top-0 right-0 w-[150px] md:w-[300px] h-[150px] md:h-[300px] pointer-events-none z-10 opacity-50 md:opacity-100 text-zinc-900/20 dark:text-white/20 dark:mix-blend-screen">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <path d="M 90 10 L 100 10 M 90 10 L 90 0" stroke="currentColor" fill="none" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-[150px] md:w-[300px] h-[150px] md:h-[300px] pointer-events-none z-10 opacity-50 md:opacity-100 text-zinc-900/20 dark:text-white/20 dark:mix-blend-screen">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <path d="M 10 90 L 0 90 M 10 90 L 10 100" stroke="currentColor" fill="none" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Portfolio Marquee Modal */}
      {isPortfolioOpen && <PortfolioModal onClose={() => setIsPortfolioOpen(false)} items={portfolioItems} />}
    </div>
  );
}
