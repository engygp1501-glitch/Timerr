import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Target, Activity, Users, ArrowRight, Brain, ListTodo, BarChart3, Clock, CheckCircle2, Play, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mockupState, setMockupState] = useState('skeleton');
  const mockupRef = useRef(null);

  useEffect(() => {
    // Single-trigger reveal for the Dashboard Mockup
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setMockupState('populated'), 700);
        observer.disconnect();
      }
    }, { threshold: 0.6 });
    
    if (mockupRef.current) observer.observe(mockupRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Premium Scroll Reveal Engine
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({ x: x * 0.02, y: -y * 0.02 }); // Very subtle 3D tracking
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-card-hover)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: -200, left: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 100, right: -200, width: 800, height: 800, background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />

      {/* Navigation */}
      <nav className="landing-nav" style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226,232,240,0.8)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="animate-fadeIn">
          <img src="/logo.png" alt="Priorix" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
          <span className="metallic-text" style={{ fontSize: '22px' }}>Priorix</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }} className="animate-fadeIn delay-100">
          <Link to="/login" style={{ color: 'var(--text-muted)', fontWeight: '600', textDecoration: 'none', fontSize: '15px', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='#64748b'}>Log In</Link>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '14px' }}>
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <main className="landing-main" style={{ flex: 1, zIndex: 1, position: 'relative' }}>
        
        {/* Hero Section */}
        <section style={{ padding: '80px 48px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="hero-pill" style={{ marginBottom: '24px' }}>
            <div className="hero-pill-inner" style={{ fontSize: '13px' }}>
              <SparklesIcon size={16} color="#2563eb" className="animate-pulse-glow" style={{ borderRadius: '50%' }} /> Meet the future of work management
            </div>
          </div>
          
          <div className="hero-reveal-wrapper" style={{ marginBottom: '24px' }}>
            <div className="hero-stopwatch-tracker">
              <div style={{ background: '#4f46e5', borderRadius: '50%', padding: '12px', boxShadow: '0 0 30px rgba(79,70,229,0.8)' }} className="fast-spin">
                <Clock size={48} color="#ffffff" strokeWidth={2.5} />
              </div>
            </div>
            
            <h1 className="hero-reveal-text metallic-black-text" style={{ fontSize: '72px', fontWeight: '900', lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, paddingBottom: '12px' }}>
              Intelligent Work <br /><span className="metallic-text">Prioritization</span>
            </h1>
          </div>
          
          <p className="animate-fade-in-up delay-200" style={{ fontSize: '20px', color: 'var(--text-muted)', marginBottom: '48px', lineHeight: 1.6, maxWidth: '700px' }}>
            Transform chaos into clarity. Priorix uses AI to automatically prioritize tasks, balance team workloads, and focus your workforce on what matters most.
          </p>
          
          <div className="animate-fade-in-up delay-300" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/login" className="btn-primary" style={{ padding: '16px 36px', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', boxShadow: '0 8px 24px rgba(79,70,229,0.25)' }}>
              Start for Free <ArrowRight size={20} />
            </Link>
            <a href="#walkthrough" className="btn-secondary" style={{ padding: '16px 36px', fontSize: '16px', textDecoration: 'none', background: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              See how it works <Play size={18} fill="#475569" color="#475569" />
            </a>
          </div>
        </section>

        {/* Floating UI Mockup */}
        <section ref={mockupRef} className="reveal-on-scroll" style={{ padding: '0 48px 100px 48px', maxWidth: '1100px', margin: '0 auto', perspective: '1000px' }}
                 onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid rgba(226,232,240,0.8)', padding: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`, transition: 'transform 0.1s ease-out' }}>
            <div style={{ background: 'var(--bg-card-hover)', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
              {/* Fake header */}
              <div style={{ background: 'var(--bg-card)', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '120px', height: '28px', borderRadius: '6px', background: 'var(--bg-card-alt)' }} />
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4f46e5' }} />
                </div>
              </div>
              
              {/* Fake dashboard content */}
              <div className="mockup-grid" style={{ padding: '32px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <SparklesIcon size={20} color="#4f46e5" />
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>Next Best Action</h3>
                  </div>
                  
                  {/* Fake Recommended Task */}
                  <div style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid #eef2ff', borderRadius: '16px', minHeight: '130px', boxShadow: '0 10px 30px rgba(79,70,229,0.05)', overflow: 'hidden' }}>
                    
                    {/* SKELETON LAYER */}
                    <div className={`mockup-layer ${mockupState === 'skeleton' ? 'active' : 'inactive'}`} style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '8px' }}><Target size={20} color="#dc2626" /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div className="skeleton-shimmer" style={{ height: '16px', width: '180px', borderRadius: '4px' }} />
                          <span className="priority-high">High (92)</span>
                        </div>
                        <div className="skeleton-shimmer" style={{ height: '12px', width: '90%', borderRadius: '4px', marginBottom: '8px' }} />
                        <div className="skeleton-shimmer" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
                      </div>
                    </div>

                    {/* POPULATED LAYER */}
                    <div className={`mockup-layer ${mockupState === 'populated' ? 'active' : 'inactive'}`} style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', background: '#fafbff' }}>
                      <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '8px' }}><Target size={20} color="#dc2626" /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px', margin: 0 }}>Fix Auth Session Leak</h4>
                          <span className="priority-high">High (92)</span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px', margin: 0 }}>
                          Critical security patch required on the user-auth microservice to prevent token spillage.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                           <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>A</div>
                           <span style={{ fontSize: '12px', color: '#94a3b8' }}>Due Today</span>
                           <span className="status-in_progress" style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 8px' }}>in progress</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Fake task list */}
                  <div style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', minHeight: '80px', overflow: 'hidden' }}>
                    <div className={`mockup-layer ${mockupState === 'skeleton' ? 'active' : 'inactive'}`} style={{ padding: '16px', opacity: 0.6 }}>
                       <div className="skeleton-shimmer" style={{ height: '14px', width: '140px', borderRadius: '4px', marginBottom: '12px' }} />
                       <div className="skeleton-shimmer" style={{ height: '10px', width: '80%', borderRadius: '4px' }} />
                    </div>
                    <div className={`mockup-layer ${mockupState === 'populated' ? 'active' : 'inactive'}`} style={{ padding: '16px', background: '#fff1f2', border: '1px solid #fda4af', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={18} color="#e11d48" />
                      <div>
                        <span style={{ fontWeight: '600', color: '#e11d48', fontSize: '13px' }}>Missed Deadline: </span>
                        <span style={{ color: '#be123c', fontSize: '13px' }}>Wait, Urvi has overdue tasks.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative', minHeight: '200px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    
                    <div className={`mockup-layer ${mockupState === 'skeleton' ? 'active' : 'inactive'}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                       <div className="skeleton-shimmer" style={{ height: '14px', width: '100px', borderRadius: '4px', marginBottom: '36px' }} />
                       <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flex: 1 }}>
                         <div className="skeleton-shimmer" style={{ flex: 1, height: '100%', borderRadius: '4px' }} />
                         <div className="skeleton-shimmer" style={{ flex: 1, height: '60%', borderRadius: '4px' }} />
                         <div className="skeleton-shimmer" style={{ flex: 1, height: '80%', borderRadius: '4px' }} />
                       </div>
                    </div>

                    <div className={`mockup-layer ${mockupState === 'populated' ? 'active' : 'inactive'}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Team Velocity</h4>
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>+12%</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '24px' }}>Tasks completed over last 30 days</p>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flex: 1 }}>
                         <div style={{ flex: 1, background: 'linear-gradient(to top, #3b82f6, #93c5fd)', height: '100%', borderRadius: '6px 6px 0 0', position: 'relative' }}>
                           <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800', color: '#3b82f6' }}>82</span>
                         </div>
                         <div style={{ flex: 1, background: 'linear-gradient(to top, #10b981, #6ee7b7)', height: '60%', borderRadius: '6px 6px 0 0', position: 'relative' }}>
                           <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800', color: '#10b981' }}>46</span>
                         </div>
                         <div style={{ flex: 1, background: 'linear-gradient(to top, #f59e0b, #fcd34d)', height: '80%', borderRadius: '6px 6px 0 0', position: 'relative' }}>
                           <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800', color: '#f59e0b' }}>71</span>
                         </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Walkthrough Section */}
        <section id="walkthrough" style={{ padding: '100px 48px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }} className="reveal-on-scroll">
              <h2 className="metallic-black-text" style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px' }}>How Priorix Works</h2>
              <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>A seamless workflow from task creation to intelligent execution.</p>
            </div>

            <div className="walkthrough-grid" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {[
                { 
                  step: "01", icon: ListTodo, color: "#3b82f6", bg: "#eff6ff",
                  title: "Add Tasks & Parameters", 
                  desc: "Create tasks with standard fields plus Effort and Impact parameters. Don't worry about manually prioritizing them."
                },
                { 
                  step: "02", icon: Brain, color: "#7c3aed", bg: "#f3e8ff",
                  title: "AI Computes Priority", 
                  desc: "Our proprietary regression engine automatically assigns a 0-100 score based on deadlines, overall workload, and business impact."
                },
                { 
                  step: "03", icon: Users, color: "#10b981", bg: "#d1fae5",
                  title: "Intelligent Rebalancing", 
                  desc: "Priorix monitors team capacity in real-time. If someone is overloaded, the system suggests or auto-reassigns tasks to free up bottlenecks."
                }
              ].map((w, i) => (
                <div key={i} className="reveal-on-scroll" style={{ transitionDelay: `${i*100}ms`, display: 'flex', gap: '32px', alignItems: 'flex-start', background: 'var(--bg-card-hover)', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', transition: 'all 0.3s' }}
                  onMouseOver={e=>e.currentTarget.style.transform='translateX(8px)'} onMouseOut={e=>e.currentTarget.style.transform='translateX(0)'}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: w.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${w.color}40`, position: 'relative' }}>
                    <span style={{ position: 'absolute', top: -12, left: -12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {w.step}
                    </span>
                    <w.icon size={36} color={w.color} />
                  </div>
                  <div>
                    <h3 className="metallic-black-text" style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>{w.title}</h3>
                    <p style={{ color: 'var(--text-muted-darker)', fontSize: '16px', lineHeight: 1.6 }}>{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ padding: '100px 48px', position: 'relative' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }} className="reveal-on-scroll">
              <h2 className="metallic-black-text" style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px' }}>Everything you need to scale</h2>
              <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>Built for high-performance teams that want to eliminate busywork.</p>
            </div>
            
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
              {[
                { icon: Target, title: "AI Priority Engine", desc: "Our algorithm scores tasks out of 100 to ensure the most critical items surface first." },
                { icon: Activity, title: "Overload Prevention", desc: "Detect burnout before it happens with real-time capacity and workload monitoring." },
                { icon: BarChart3, title: "Rich Analytics", desc: "Exportable PDF/CSV reports and beautiful dynamic charts to track team velocity." },
                { icon: Zap, title: "Next Best Action", desc: "Employees see exactly what to work on next, taking the guesswork out of daily routines." },
                { icon: CheckCircle2, title: "Performance History", desc: "Detailed tracking of estimated vs actual time spent to inform future planning." },
                { icon: Clock, title: "Deadline Alerts", desc: "Automated real-time notifications when important tasks approach their deadlines." }
              ].map((f, i) => (
                <div key={i} className="reveal-on-scroll card-static" style={{ transitionDelay: `${(i%3)*100}ms`, padding: '32px', transition: 'all 0.3s', cursor: 'default' }}
                     onMouseOver={e => {e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.08)'}}
                     onMouseOut={e => {e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'}}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #eef2ff, #f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                    <f.icon size={24} color="#4f46e5" />
                  </div>
                  <h3 className="metallic-black-text" style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '14px' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="reveal-on-scroll metallic-bg" style={{ padding: '80px 48px', margin: '40px 48px 100px 48px', borderRadius: '32px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '40%', height: '200%', background: 'rgba(255,255,255,0.1)', transform: 'rotate(25deg)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '24px' }}>Ready to prioritize properly?</h2>
            <p style={{ fontSize: '18px', color: '#e0e7ff', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px auto' }}>Join hundreds of teams transforming their workflows and shipping faster without the stress.</p>
            <Link to="/login" style={{ padding: '16px 40px', fontSize: '16px', background: '#ffffff', color: '#1e40af', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '10px', fontWeight: '700', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}>
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--bg-card-alt)', padding: '60px 48px', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Priorix" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Priorix</span>
          </div>
          <p style={{ fontSize: '14px' }}>© {new Date().getFullYear()} Priorix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function SparklesIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a4.256 4.256 0 0 0 0-8.962L8.5 1.937A2 2 0 0 0 9.937.5l1.582-6.135a4.256 4.256 0 0 0 8.962 0l1.582 6.135a2 2 0 0 0 1.437 1.437l6.135 1.582a4.256 4.256 0 0 0 0 8.962l-6.135 1.582a2 2 0 0 0-1.437 1.437l-1.582 6.135a4.256 4.256 0 0 0-8.962 0z"/>
    </svg>
  );
}
