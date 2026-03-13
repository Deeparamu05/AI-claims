import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle, MessageSquare,
  TrendingUp, Clock, Shield, Zap, Users, Building, Activity,
  ChevronRight, Send, LogOut, User, Lock, Mail,
  BarChart, Scan, ArrowRight,
  Star, ShieldAlert, ShieldCheck
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const ClaimsAssistantApp = () => {
  const [view, setViewState] = useState('landing');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [claims, setClaims] = useState([]);
  const [adminClaims, setAdminClaims] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminComment, setAdminComment] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "Hello! I'm your professional AI claims assistant. How can I facilitate your request today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authData, setAuthData] = useState({ username: '', password: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [policyData, setPolicyData] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const benefitsRef = useRef(null);
  const contactRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchPolicyIntelligence = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/policy/intelligence`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPolicyData(data);
      }
    } catch {
      // Ignore transient policy fetch failures during app initialization.
    }
  }, [token]);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/claims`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUser({ role: localStorage.getItem('role') || 'patient' });
      }
    } catch {
      // Ignore profile fetch errors and rely on auth flow to recover.
    }
  }, [token]);

  const fetchAdminClaims = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/claims`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminClaims(data);
      }
    } catch (error) {
      console.error('Error fetching admin claims:', error);
    }
  }, [token]);

  const fetchAdminUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  }, [token]);

  const fetchClaims = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/claims`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClaims(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setToken(null);
        setUser(null);
        setClaims([]);
        setAdminClaims([]);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchClaims();
      fetchProfile();
      fetchPolicyIntelligence();
    }
  }, [token, fetchClaims, fetchProfile, fetchPolicyIntelligence]);

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      fetchAdminClaims();
      fetchAdminUsers();
    }
  }, [activeTab, user, fetchAdminClaims, fetchAdminUsers]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'login') {
        const formData = new FormData();
        formData.append('username', authData.username);
        formData.append('password', authData.password);

        console.log('Sending login request to:', `${API_BASE_URL}/token`);
        const response = await fetch(`${API_BASE_URL}/token`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('token', data.access_token);
          const role = authData.username === 'admin' ? 'admin' : 'patient';
          localStorage.setItem('role', role);
          setToken(data.access_token);
          setUser({ role });
        } else {
          alert(data.detail || 'Login failed');
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/register?username=${authData.username}&email=${authData.email}&password=${authData.password}`, {
          method: 'POST'
        });
        if (response.ok) {
          setAuthMode('login');
          alert('Registration successful! Please login.');
        } else {
          const data = await response.json();
          alert(data.detail || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Auth error detail:', error);
      alert('Connection to server failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
    setClaims([]);
    setAdminClaims([]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    try {
      const claimRes = await fetch(`${API_BASE_URL}/claims?type=General&amount=0`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const claim = await claimRes.json();

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`${API_BASE_URL}/claims/${claim.id}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }
      fetchClaims();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleValidateClaim = async (claimId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/claims/${claimId}/validate?status=${status}&comment=${adminComment}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAdminComment('');
        fetchAdminClaims();
        alert(`Claim ${status} successfully`);
      }
    } catch {
      alert('Validation failed');
    }
  };

  const handleValidateUser = async (userId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/validate?status=${status}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchAdminUsers();
        alert(`User ${status} successfully`);
      }
    } catch {
      alert('User validation failed');
    }
  };

  const handleSendMessage = async () => {
    if (chatInput.trim()) {
      const userMessage = chatInput;
      setChatMessages([...chatMessages, { role: 'user', text: userMessage }]);
      setChatInput('');
      setIsTyping(true);

      try {
        const response = await fetch(`${API_BASE_URL}/ai/chat?query=${encodeURIComponent(userMessage)}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
      } catch {
        setChatMessages(prev => [...prev, { role: 'assistant', text: "Systems offline. Unable to reach neural network." }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  if (!token && view === 'landing') {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans overflow-x-hidden">
        {/* Sticky Navigation */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100 p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 accent-gradient rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold brand-font tracking-tight">Claim<span className="accent-text">AI</span></span>
            </div>

            <div className="hidden md:flex items-center space-x-10">
              <button onClick={() => scrollToSection(featuresRef)} className="nav-link text-sm font-semibold">Features</button>
              <button onClick={() => scrollToSection(howItWorksRef)} className="nav-link text-sm font-semibold">How It Works</button>
              <button onClick={() => scrollToSection(benefitsRef)} className="nav-link text-sm font-semibold">Benefits</button>
              <button onClick={() => scrollToSection(contactRef)} className="nav-link text-sm font-semibold">Contact</button>
              <button
                onClick={() => setViewState('auth')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm"
              >
                Login
              </button>
            </div>
          </div>
        </nav>

        <main>
          {/* Hero Section */}
          <section className="pt-40 pb-24 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-bold uppercase tracking-wider">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Powered by Generative AI</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold brand-font leading-[1.1] tracking-tight text-slate-900">
                Transform Medical <br />Insurance Claims with <br />
                <span className="accent-text">AI Intelligence</span>
              </h1>
              <p className="text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
                Automate claim processing, reduce manual work, and deliver faster approvals with our Gen AI-powered platform for insurance companies, hospitals, and TPAs.
              </p>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setViewState('auth')}
                  className="w-full sm:w-auto px-8 py-4 accent-gradient text-white rounded-xl font-bold shadow-xl shadow-blue-200 hover:scale-105 transition-all flex items-center justify-center"
                >
                  <span>Get Started</span>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
                <button className="w-full sm:w-auto btn-secondary px-8 py-4">
                  Request Demo
                </button>
              </div>
            </div>

            <div className="relative hidden lg:block animate-float">
              <div className="absolute inset-0 bg-blue-400/10 rounded-full blur-[100px] -z-10"></div>
              <div className="space-y-6">
                <div className="glass-card p-6 border-l-4 border-l-emerald-500 max-w-sm ml-auto">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-emerald-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Claim #12345</div>
                      <div className="text-sm font-bold text-slate-800">Approved Successfully</div>
                    </div>
                  </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-l-amber-500 max-w-sm mr-auto translate-x-[-10%]">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Clock className="text-amber-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing</div>
                      <div className="text-sm font-bold text-slate-800">Claim ID #12346</div>
                    </div>
                  </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-l-blue-500 max-w-sm ml-auto">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="text-blue-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Extraction</div>
                      <div className="text-sm font-bold text-slate-800">Documents Analyzed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Challenges Section */}
          <section className="py-24 bg-white px-6">
            <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold brand-font tracking-tight">The Challenge in Medical Claims</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Traditional claim processing is slow, manual, and prone to errors.</p>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 glass-card bg-rose-50 border-rose-100 hover:border-rose-200">
                <ShieldAlert className="w-12 h-12 text-rose-500 mb-6" />
                <h3 className="text-xl font-bold mb-3">Processing Delays</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Manual document review leads to weeks of waiting time, frustrating patients and providers alike.</p>
              </div>
              <div className="p-8 glass-card bg-orange-50 border-orange-100 hover:border-orange-200">
                <FileText className="w-12 h-12 text-orange-500 mb-6" />
                <h3 className="text-xl font-bold mb-3">Missing Documents</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Claims get rejected due to incomplete documentation, requiring multiple resubmissions.</p>
              </div>
              <div className="p-8 glass-card bg-amber-50 border-amber-100 hover:border-amber-200">
                <Activity className="w-12 h-12 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold mb-3">Lack of Transparency</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Patients have no visibility into claim status, leading to constant follow-up calls.</p>
              </div>
            </div>
          </section>

          {/* AI-Powered Solution section */}
          <section ref={featuresRef} className="py-24 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white px-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-12">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold brand-font tracking-tight">AI-Powered Solution</h2>
                  <p className="text-blue-200 font-light">Combining OCR, NLP, and Generative AI to revolutionize claims processing</p>
                </div>

                <div className="space-y-8">
                  {[
                    { icon: Scan, title: "Intelligent Document Extraction", desc: "Advanced OCR automatically extracts data from bills, prescriptions, and discharge summaries." },
                    { icon: ShieldCheck, title: "Policy Validation", desc: "AI cross-references claims against policy coverage in real-time to ensure accuracy." },
                    { icon: MessageSquare, title: "Conversational AI Assistant", desc: "24/7 support for patients to check status, understand coverage, and get instant answers." }
                  ].map((item, i) => (
                    <div key={i} className="flex space-x-6">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
                        <item.icon className="text-blue-400 w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-1">{item.title}</h4>
                        <p className="text-blue-100/70 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { label: "Processing Time", value: "87% Faster", color: "text-emerald-400" },
                  { label: "Claim Accuracy", value: "95%+", color: "text-blue-400" },
                  { label: "Admin Cost Reduction", value: "60%", color: "text-teal-400" }
                ].map((stat, i) => (
                  <div key={i} className="glass-card bg-white/5 border-white/10 p-8 flex justify-between items-center group hover:bg-white/10">
                    <span className="text-white/60 font-medium">{stat.label}</span>
                    <span className={`text-4xl font-black ${stat.color} group-hover:scale-105 transition-transform`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section ref={howItWorksRef} className="py-24 bg-white px-6">
            <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold brand-font tracking-tight">How It Works</h2>
              <p className="text-slate-600">Simple, automated, and intelligent</p>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "01", icon: Upload, title: "Upload Documents", desc: "Submit bills, prescriptions, and medical records" },
                { step: "02", icon: FileText, title: "AI Extraction", desc: "OCR and NLP extract all relevant data automatically" },
                { step: "03", icon: ShieldCheck, title: "Policy Validation", desc: "AI checks coverage and identifies missing documents" },
                { step: "04", icon: TrendingUp, title: "Review & Approval", desc: "Track status and get instant approvals" }
              ].map((step, i) => (
                <div key={i} className="relative group">
                  <div className="p-8 glass-card border-none bg-slate-50 hover:bg-white hover:shadow-xl h-full flex flex-col items-center text-center">
                    <span className="text-6xl font-black text-slate-100 absolute top-4 group-hover:text-blue-50 transition-colors">{step.step}</span>
                    <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center mb-6 relative z-10">
                      <step.icon className="text-blue-600 w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold mb-3 relative z-10">{step.title}</h4>
                    <p className="text-slate-500 text-sm leading-relaxed relative z-10">{step.desc}</p>
                  </div>
                  {i < 3 && <ArrowRight className="hidden lg:block absolute top-[40%] right-[-10%] text-blue-200 w-8 h-8 z-20" />}
                </div>
              ))}
            </div>
          </section>

          {/* Powerful Features section */}
          <section className="py-24 bg-slate-50 px-6">
            <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold brand-font tracking-tight">Powerful Features</h2>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: FileText, title: "Document OCR", desc: "Extract data from any medical document with 99% accuracy" },
                { icon: ShieldCheck, title: "Policy Coverage Check", desc: "Instant validation against policy terms and conditions" },
                { icon: AlertCircle, title: "Missing Document Detection", desc: "AI identifies gaps before submission" },
                { icon: MessageSquare, title: "AI Chat Support", desc: "24/7 conversational assistant for all queries" },
                { icon: Clock, title: "Real-time Tracking", desc: "Live updates on claim processing status" },
                { icon: BarChart, title: "Analytics Dashboard", desc: "Insights and metrics for better decision-making" }
              ].map((feat, i) => (
                <div key={i} className="p-8 glass-card border-none bg-white hover:shadow-lg flex flex-col items-start text-left">
                  <feat.icon className="text-blue-600 w-10 h-10 mb-6" />
                  <h4 className="text-lg font-bold mb-2">{feat.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Benefits Section */}
          <section ref={benefitsRef} className="py-24 bg-white px-6">
            <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold brand-font tracking-tight">Benefits for Everyone</h2>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-10 glass-card bg-slate-50/50 border-slate-200 space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Users className="text-blue-600 w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold">For Patients</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "Faster claim approvals and reimbursements",
                    "Complete transparency with real-time tracking",
                    "24/7 AI support for instant answers",
                    "Fewer rejections due to missing documents"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <CheckCircle className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                      <span className="text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 glass-card bg-slate-50/50 border-slate-200 space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Building className="text-emerald-600 w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold">For Insurers & Hospitals</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "87% reduction in processing time",
                    "60% lower administrative costs",
                    "Improved accuracy and compliance",
                    "Better customer satisfaction and retention"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <CheckCircle className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                      <span className="text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section ref={contactRef} className="py-24 px-6 bg-slate-50">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold brand-font tracking-tight">Ready to Transform Your Claims Process?</h2>
                <p className="text-slate-600">Schedule a demo and see how AI can revolutionize your workflow</p>
              </div>

              <div className="glass-card p-10 bg-white border-slate-100 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                    <input type="text" placeholder="John Doe" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                    <input type="email" placeholder="john@example.com" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organization</label>
                    <input type="text" placeholder="Your Insurer / Hospital Name" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Message</label>
                    <textarea rows="4" placeholder="How can we help you?" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"></textarea>
                  </div>
                </div>
                <button className="w-full btn-primary py-4 shadow-xl shadow-blue-200">
                  Send Message
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="py-12 px-6 border-t border-slate-100 bg-white text-center">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 accent-gradient rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold brand-font tracking-tight">Claim<span className="accent-text">AI</span></span>
            </div>
            <p className="text-slate-400 text-sm">Automating medical insurance claims with intelligence.</p>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em] pt-8">
              &copy; 2026 CLAIMAI PROTOCOL &bull; ENCRYPT_LEVEL_7 &bull; ALL RIGHTS RESERVED
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-6 relative overflow-hidden">
        <button
          onClick={() => setViewState('landing')}
          className="absolute top-8 left-8 text-slate-500 hover:text-white transition-colors flex items-center space-x-2 text-sm font-bold uppercase tracking-widest z-50"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>Back to Intel</span>
        </button>

        <div className="w-full max-w-md animate-fade-in relative z-10">
          <div className="text-center mb-10 space-y-4">
            <div className="inline-flex items-center space-x-3 group justify-center cursor-pointer" onClick={() => setViewState('landing')}>
              <div className="w-14 h-14 accent-gradient rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Shield className="text-white w-8 h-8" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white brand-font tracking-tighter uppercase">
              {authMode === 'login' ? 'Access Portal' : 'Register Node'}
            </h1>
            <p className="text-slate-500 text-sm font-light tracking-wide">
              {authMode === 'login' ? 'Decrypt your dashboard access' : 'Initialize your claim network presence'}
            </p>
          </div>

          <div className="premium-card p-10 space-y-8 bg-white/5 border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 accent-gradient opacity-50"></div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">Identity Tag</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Enter username"
                    className="w-full bg-[#0d1420] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-blue-500/30 transition-all font-medium"
                    value={authData.username}
                    onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">Network Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="email"
                      placeholder="Enter email address"
                      className="w-full bg-[#0d1420] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-blue-500/30 transition-all font-medium"
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">Access Protocol</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="password"
                    placeholder="Enter password"
                    className="w-full bg-[#0d1420] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-blue-500/30 transition-all font-medium"
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full accent-gradient py-5 rounded-2xl font-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center space-x-3"
              >
                {loading ? (
                  <Activity className="animate-spin w-5 h-5" />
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'INITIALIZE SESSION' : 'AUTHORIZE ACCOUNT'}</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-4">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-slate-500 text-xs font-bold hover:text-blue-400 transition-colors uppercase tracking-[0.2em]"
              >
                {authMode === 'login' ? 'Need network access?' : 'Already have credentials?'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-200">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-[#1e1b4b] border-r border-white/5 hidden lg:flex flex-col z-50">
        <div className="p-8 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 accent-gradient rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white brand-font tracking-tight">ClaimAI</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'upload', icon: Upload, label: 'Upload Module' },
            { id: 'status', icon: Activity, label: 'Live Tracking' },
            { id: 'coverage', icon: Shield, label: 'Policy Intelligence' },
            { id: 'chat', icon: MessageSquare, label: 'AI Specialist' },
            (user?.role === 'admin' || localStorage.getItem('role') === 'admin') && { id: 'admin', icon: Shield, label: 'Validate Claims' }
          ].filter(Boolean).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-blue-400' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-4 px-6 py-4 rounded-2xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen p-8 lg:p-12">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 brand-font">
              {activeTab === 'upload' && "Document Submission"}
              {activeTab === 'status' && "Case Management"}
              {activeTab === 'coverage' && "Policy Intelligence"}
              {activeTab === 'chat' && "AI Specialist"}
              {activeTab === 'admin' && "Internal Validation"}
            </h1>
            <p className="text-slate-500 font-light">Precision claims management via neural infrastructure</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-white">Advanced Tier</div>
              <div className="text-xs text-blue-400/70 uppercase tracking-widest font-bold">Verified Provider</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </header>

        {activeTab === 'upload' && (
          <div className="max-w-5xl animate-fade-in">
            <div className="premium-card p-12 bg-white/5 border-white/5 text-center mb-12 group transition-all">
              <div className="w-24 h-24 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-2xl">
                <Upload className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4 brand-font">Ingest Medical Infrastructure</h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-10 font-light">Securely transmit prescriptions, radiological reports, and hospital abstracts into our neural analyzer.</p>

              <input type="file" id="real-upload" multiple className="hidden" onChange={handleFileUpload} />
              <label
                htmlFor="real-upload"
                className="inline-flex items-center px-10 py-5 accent-gradient text-white font-bold rounded-2xl shadow-xl hover:shadow-blue-500/20 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                Initiate Secure Upload
                <ChevronRight className="ml-2 w-5 h-5" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Shield, label: 'HIPAA Compliant', val: 'Encrypted' },
                { icon: Zap, label: 'OCR Extraction', val: '99.8% Success' },
                { icon: Activity, label: 'Validation', val: 'Real-time' }
              ].map((stat, i) => (
                <div key={i} className="premium-card p-6 bg-white/5 border-white/5 flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">{stat.label}</div>
                    <div className="text-lg font-bold text-white">{stat.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="premium-card p-8 bg-blue-600/10 border-blue-500/20">
                <div className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-2">Active Cases</div>
                <div className="text-5xl font-bold text-white mb-4">{claims.length}</div>
                <div className="h-1 w-full bg-blue-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-2/3"></div>
                </div>
              </div>

              <div className="premium-card p-8 bg-teal-600/10 border-teal-500/20">
                <div className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-2">Total Value</div>
                <div className="text-5xl font-bold text-white mb-4">₹{(claims.reduce((acc, c) => acc + c.amount, 0)).toLocaleString()}</div>
                <div className="h-1 w-full bg-teal-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 w-full"></div>
                </div>
              </div>

              <div className="premium-card p-8 bg-purple-600/10 border-purple-500/20">
                <div className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">System Health</div>
                <div className="text-5xl font-bold text-white mb-4">Optimal</div>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">AI</div>)}
                </div>
              </div>
            </div>

            <div className="premium-card overflow-hidden bg-white/5 border-white/5">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Case ID</th>
                    <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Classification</th>
                    <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Valuation</th>
                    <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Deployment</th>
                    <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-6 text-blue-400 font-mono font-bold tracking-tighter">{claim.claim_id_str}</td>
                      <td className="p-6 font-medium text-white">{claim.type}</td>
                      <td className="p-6 text-white font-bold">₹{claim.amount.toLocaleString()}</td>
                      <td className="p-6 text-slate-400 text-sm">{new Date(claim.date).toLocaleDateString()}</td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${claim.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          claim.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {claims.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-20 text-center text-slate-500 font-light italic">No claims infrastructure detected initialized.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'coverage' && (
          <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="premium-card p-10 bg-gradient-to-br from-blue-600/20 to-teal-500/20 border-blue-500/30">
                <Shield className="w-12 h-12 text-blue-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2 brand-font">Enterprise Coverage</h3>
                <div className="text-4xl font-bold text-white mb-4">₹{policyData?.coverage_limit?.toLocaleString() || '5,00,000'}</div>
                <p className="text-slate-400 text-sm font-light">Total verifiable liquidity for medical infrastructure coverage.</p>
              </div>
              <div className="premium-card p-10 bg-white/5 border-white/5">
                <Building className="w-12 h-12 text-teal-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-6 brand-font">Active Enclaves</h3>
                <div className="space-y-3">
                  {policyData?.active_benefits?.map((benefit, i) => (
                    <div key={i} className="flex items-center space-x-3 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">{benefit}</span>
                    </div>
                  )) || (
                      <div className="text-slate-500 italic">Initializing benefit protocols...</div>
                    )}
                </div>
              </div>
            </div>

            <div className="premium-card p-10 bg-white/5 border-white/5">
              <h3 className="text-xl font-bold text-white mb-8 brand-font">Policy Governance Guidelines</h3>
              <div className="space-y-6">
                {policyData?.guidelines?.map((guide, i) => (
                  <div key={i} className="flex items-start space-x-4 group">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold group-hover:scale-110 transition-transform">{i + 1}</div>
                    <p className="text-slate-400 pt-1 font-light leading-relaxed">{guide}</p>
                  </div>
                )) || (
                    <div className="text-slate-500 italic">Decrypting governance protocols...</div>
                  )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (user?.role === 'admin' || localStorage.getItem('role') === 'admin') && (
          <div className="animate-fade-in space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-8 brand-font">User Access Management</h2>
              <div className="premium-card overflow-hidden bg-white/5 border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Username</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Email</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Status</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.filter(u => u.username !== 'admin').map((u, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-6 text-white font-medium">{u.username}</td>
                        <td className="p-6 text-slate-400">{u.email}</td>
                        <td className="p-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${u.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            u.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-6">
                          {u.status === 'pending' && (
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleValidateUser(u.id, 'approved')}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-bold transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleValidateUser(u.id, 'rejected')}
                                className="px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded-xl text-xs font-bold transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {adminUsers.length <= 1 && (
                      <tr>
                        <td colSpan="4" className="p-20 text-center text-slate-500 italic">No pending registration requests.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-8 brand-font">Administrative Review Queue</h2>
              <div className="premium-card overflow-hidden bg-white/5 border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">User ID</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Claim ID</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Amount</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Status</th>
                      <th className="p-6 text-slate-500 uppercase text-xs font-bold tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminClaims.map((claim, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-6 text-slate-400">User #{claim.owner_id}</td>
                        <td className="p-6 text-blue-400 font-mono font-bold">{claim.claim_id_str}</td>
                        <td className="p-6 text-white font-bold">₹{claim.amount.toLocaleString()}</td>
                        <td className="p-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${claim.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            claim.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="p-6">
                          {claim.status === 'processing' && (
                            <div className="flex items-center space-x-4">
                              <input
                                type="text"
                                placeholder="Comment..."
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/30"
                                onChange={(e) => setAdminComment(e.target.value)}
                              />
                              <button
                                onClick={() => handleValidateClaim(claim.id, 'approved')}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-bold transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleValidateClaim(claim.id, 'rejected')}
                                className="px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded-xl text-xs font-bold transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {claim.admin_comment && (
                            <div className="text-xs text-slate-500 italic mt-1">Note: {claim.admin_comment}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {adminClaims.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-20 text-center text-slate-500 italic">No claims pending review.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl h-[calc(100vh-250px)] flex flex-col premium-card bg-white/5 border-white/5 overflow-hidden animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 accent-gradient rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0a0f18] rounded-full"></div>
                </div>
                <div>
                  <div className="text-white font-bold brand-font">ClaimAI Specialist</div>
                  <div className="text-xs text-blue-400/70 font-bold uppercase tracking-widest">Neural Network Enabled</div>
                </div>
              </div>
              <Activity className="w-5 h-5 text-slate-600 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-6 rounded-3xl ${msg.role === 'user'
                    ? 'accent-gradient text-white shadow-xl shadow-blue-500/10'
                    : 'bg-white/5 text-slate-200 border border-white/5'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 text-slate-400 p-4 rounded-2xl border border-white/5 animate-pulse">
                    AI is processing...
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-white/5 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Inquire about claim architecture, policy parity, or case status..."
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-8 pr-20 text-white placeholder-slate-500 focus:border-blue-500/30 outline-none transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 accent-gradient rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ClaimsAssistantApp;
