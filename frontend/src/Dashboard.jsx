import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';


// Helper hook for debouncing search and slider inputs
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ChurnGuardDashboard() {
  // State for Summary
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [hoveredMapRegion, setHoveredMapRegion] = useState(null);

  // State for Subscribers
  const [subscribers, setSubscribers] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [regionFilter, setRegionFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const debouncedSearch = useDebounce(searchFilter, 500);
  const [subsLoading, setSubsLoading] = useState(true);

  // State for Revenue Impact
  const [retentionRate, setRetentionRate] = useState(40);
  const debouncedRetention = useDebounce(retentionRate, 300);
  const [revenueImpact, setRevenueImpact] = useState(null);
  const [revLoading, setRevLoading] = useState(true);

  // Dark/Light Mode
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Live Ticker State
  const [tickerItems, setTickerItems] = useState([]);
  
  // Gamification & Campaigns
  const [leaderboard, setLeaderboard] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [churnTrend, setChurnTrend] = useState([]);


  // Campaign Manager
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignFormData, setCampaignFormData] = useState({ name: '', risk_tier: '', region: '', package_type: '' });
  const [campaignTargetPreview, setCampaignTargetPreview] = useState(0);
  const [campaignSubs, setCampaignSubs] = useState([]);
  const [campaignSubsLoading, setCampaignSubsLoading] = useState(false);

  // Deep Dive Modal
  const [selectedSubscriberId, setSelectedSubscriberId] = useState(null);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState('Pending');

  useEffect(() => {
    if (selectedSubscriberId) {
      setModalLoading(true);
      fetch(`/api/subscriber/${selectedSubscriberId}`)
        .then(res => res.json())
        .then(data => {
           setSelectedSubscriber(data);
           const storedStatuses = JSON.parse(localStorage.getItem('churnguard_statuses') || '{}');
           setTrackerStatus(storedStatuses[selectedSubscriberId] || 'Pending');
           setModalLoading(false);
        })
        .catch(err => {
           console.error(err);
           setModalLoading(false);
        });
    } else {
      setSelectedSubscriber(null);
    }
  }, [selectedSubscriberId]);


  // State for Forecast
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [showWithoutIntervention, setShowWithoutIntervention] = useState(true);
  const [showWithIntervention, setShowWithIntervention] = useState(true);

  // State for Model Metrics
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // State for Regional Map
  const [regionalData, setRegionalData] = useState([]);
  const [regionalLoading, setRegionalLoading] = useState(true);
  const [hoveredCity, setHoveredCity] = useState(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Demo Add Subscriber State
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [addSubForm, setAddSubForm] = useState({
    subscriber_id: '', region: 'Mumbai', package_type: 'Standard',
    tenure_months: 12, arpu: 350, complaint_count: 2,
    last_active_date: new Date().toISOString().split('T')[0],
    recharge_history: '300,350,280,400,320,310',
  });
  const [addSubLoading, setAddSubLoading] = useState(false);
  const [addSubResult, setAddSubResult] = useState(null);  // null | { ...prediction }
  const [addSubError, setAddSubError] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [readNotifs, setReadNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('churnguard_read_notifs') || '[]'); }
    catch { return []; }
  });
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);

  const API_BASE = '/api';

  const handleAddSubscriber = async () => {
    if (!addSubForm.subscriber_id.trim()) return;
    setAddSubLoading(true);
    setAddSubResult(null);
    setAddSubError(null);
    try {
      const res = await fetch('/api/add-subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addSubForm,
          tenure_months: parseInt(addSubForm.tenure_months),
          arpu: parseFloat(addSubForm.arpu),
          complaint_count: parseInt(addSubForm.complaint_count),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setAddSubResult(data);
        setRefreshTrigger(prev => prev + 1);
      } else {
        setAddSubError(data.message || 'Unknown error');
      }
    } catch (err) {
      setAddSubError('Network error: ' + err.message);
    } finally {
      setAddSubLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        setUploadMessage({ type: 'success', text: `Upload successful! Processed ${data.rows_processed} rows.` });
        setRefreshTrigger(prev => prev + 1);
      } else {
        setUploadMessage({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch (err) {
      console.error(err);
      setUploadMessage({ type: 'error', text: 'An error occurred during upload' });
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // Fetch Summary
  useEffect(() => {
    fetch(`${API_BASE}/summary`)
      .then(res => res.json())
      .then(data => {
        setSummary(data);
        setSummaryLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Model Metrics
  useEffect(() => {
    fetch(`${API_BASE}/model-metrics`)
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setMetricsLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Regional
  useEffect(() => {
    fetch(`${API_BASE}/regional`)
      .then(res => res.json())
      .then(data => {
        setRegionalData(data);
        setRegionalLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Subscribers
  useEffect(() => {
    setSubsLoading(true);
    const params = new URLSearchParams({ page, page_size: 50 });
    if (regionFilter) params.append('region', regionFilter);
    if (packageFilter) params.append('package_type', packageFilter);
    if (tierFilter) params.append('risk_tier', tierFilter);
    if (debouncedSearch) params.append('search', debouncedSearch);

    fetch(`${API_BASE}/subscribers?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setSubscribers(data.data || []);
        setSubTotal(data.total || 0);
        setSubsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setSubsLoading(false);
      });
  }, [page, regionFilter, packageFilter, tierFilter, debouncedSearch, refreshTrigger]);

  // Fetch campaigns
  const fetchCampaigns = () => {
    fetch(`/api/campaigns`)
      .then(res => res.json())
      .then(data => setCampaigns(data))
      .catch(e => console.error(e));
  };

  // Fetch Ticker & Gamification
  useEffect(() => {
    // Mock live alerts for ticker
    fetch(`${API_BASE}/subscribers?risk_tier=High&page_size=5`)
      .then(res => res.json())
      .then(data => {
           setTickerItems(data.data.map(d => ({
             id: d.subscriber_id, 
             text: `ALERT: ${d.subscriber_id} (${d.region}) shows ${(d.churn_probability*100).toFixed(1)}% churn risk`
           })));
      });
      
    // Fetch leaderboard
    fetch(`${API_BASE}/leaderboard`)
      .then(res => res.json())
      .then(data => setLeaderboard(data))
      .catch(e => console.error(e));
      
    // Fetch churn trend
    fetch(`${API_BASE}/churn-trend`)
      .then(res => res.json())
      .then(data => setChurnTrend(data))
      .catch(e => console.error(e));
      
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (isCampaignModalOpen) {
      const params = new URLSearchParams();
      if (campaignFormData.region) params.append('region', campaignFormData.region);
      if (campaignFormData.package_type) params.append('package_type', campaignFormData.package_type);
      if (campaignFormData.risk_tier) params.append('risk_tier', campaignFormData.risk_tier);
      
      fetch(`/api/subscribers?${params.toString()}`)
        .then(res => res.json())
        .then(data => setCampaignTargetPreview(data.total || 0));
    }
  }, [campaignFormData, isCampaignModalOpen]);

  const handleCreateCampaign = () => {
    fetch(`/api/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...campaignFormData,
        status: "Active"
      })
    }).then(res => {
      setIsCampaignModalOpen(false);
      fetchCampaigns();
    });
  };

  const handleDeleteCampaign = (id) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      fetch(`/api/campaigns/${id}`, {
        method: "DELETE"
      }).then(() => {
        fetchCampaigns();
        if (selectedCampaignId === id) setSelectedCampaignId(null);
      });
    }
  };

  const handleViewSubscribers = (id) => {
    setSelectedCampaignId(id);
    setCampaignSubsLoading(true);
    fetch(`/api/campaigns/${id}/subscribers`)
      .then(res => res.json())
      .then(data => {
        setCampaignSubs(data);
        setCampaignSubsLoading(false);
      });
  };

  const updateCampaignStatus = (id, subId, newStatus) => {
      const storedStatuses = JSON.parse(localStorage.getItem('churnguard_statuses') || '{}');
      storedStatuses[subId] = newStatus;
      localStorage.setItem('churnguard_statuses', JSON.stringify(storedStatuses));
      
      let updatePayload = { contacted: 0, retained: 0, churned: 0 };
      if (newStatus === 'Contacted') updatePayload.contacted = 1;
      if (newStatus === 'Offer Accepted') updatePayload.retained = 1;
      if (newStatus === 'Churned') updatePayload.churned = 1;
      
      fetch(`/api/campaigns/${id}/update`, {
         method: "POST",
         headers: {"Content-Type": "application/json"},
         body: JSON.stringify(updatePayload)
      }).then(() => {
         fetchCampaigns();
      });
  };

  // Fetch Forecast
  useEffect(() => {
    fetch(`${API_BASE}/forecast`)
      .then(res => res.json())
      .then(data => {
        setForecastData(data);
        setForecastLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Notifications
  useEffect(() => {
    const fetchNotifs = () => {
      fetch(`${API_BASE}/notifications`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setNotifications(data);
        })
        .catch(err => console.error("Error fetching notifications:", err));
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Fetch Revenue Impact
  useEffect(() => {
    setRevLoading(true);
    fetch(`${API_BASE}/revenue-impact?retention_rate=${debouncedRetention / 100}`)
      .then(res => res.json())
      .then(data => {
        setRevenueImpact(data);
        setRevLoading(false);
      })
      .catch(err => console.error(err));
  }, [debouncedRetention, refreshTrigger]);

  // Handle Export
  const handleExport = async () => {
    const params = new URLSearchParams({ page: 1, page_size: 10000 });
    if (regionFilter) params.append('region', regionFilter);
    if (packageFilter) params.append('package_type', packageFilter);
    if (tierFilter) params.append('risk_tier', tierFilter);
    if (debouncedSearch) params.append('search', debouncedSearch);

    try {
      const res = await fetch(`${API_BASE}/subscribers?${params.toString()}`);
      const data = await res.json();
      
      if (!data.data || data.data.length === 0) {
        alert("No data to export");
        return;
      }

      const keys = Object.keys(data.data[0]);
      const csvContent = [
        keys.join(','),
        ...data.data.map(row => keys.map(k => `"${row[k]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'at_risk_subscribers.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export data");
    }
  };

  const getTierColor = (tier) => {
    if (tier === 'High') return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (tier === 'Medium') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-500 bg-green-500/10 border-green-500/30';
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const renderRiskGauge = (prob) => {
    const radius = 60;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference - (prob * circumference);
    const color = prob > 0.65 ? '#ef4444' : prob > 0.35 ? '#f59e0b' : '#22c55e';
    
    return (
      <div className="flex flex-col items-center justify-center relative w-32 h-20 overflow-hidden">
        <svg viewBox="0 0 140 80" className="w-full h-full transform translate-y-2">
          <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#374151" strokeWidth="12" strokeLinecap="round" />
          <path 
            d="M 10 70 A 60 60 0 0 1 130 70" 
            fill="none" 
            stroke={color} 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 text-2xl font-bold font-syne" style={{color}}>{(prob * 100).toFixed(0)}%</div>
      </div>
    );
  };

  const renderRechargeChart = (historyStr) => {
    if (!historyStr) return null;
    const vals = historyStr.split(',').map(Number);
    if (vals.length === 0) return null;
    
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    
    const width = 300;
    const height = 100;
    const padding = 20;
    
    const points = vals.map((v, i) => {
      const x = padding + (i / (vals.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full flex flex-col items-center">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => {
             const x = padding + (i / (vals.length - 1)) * (width - padding * 2);
             const y = height - padding - ((v - min) / range) * (height - padding * 2);
             return (
               <g key={i}>
                 <circle cx={x} cy={y} r="4" fill="#0f1117" stroke="#2563EB" strokeWidth="2" />
                 <text x={x} y={y - 10} fontSize="10" fill="#9ca3af" textAnchor="middle">₹{v}</text>
               </g>
             );
          })}
        </svg>
        <div className="flex justify-between w-full text-xs text-gray-400 mt-2 px-4">
           <span>T-6 Mo</span>
           <span>Current</span>
        </div>
      </div>
    );
  };

  const cycleStatus = () => {
     const statuses = ['Pending', 'Contacted', 'Offer Accepted', 'Churned'];
     const idx = statuses.indexOf(trackerStatus);
     const next = statuses[(idx + 1) % statuses.length];
     setTrackerStatus(next);
     
     const stored = JSON.parse(localStorage.getItem('churnguard_statuses') || '{}');
     stored[selectedSubscriberId] = next;
     localStorage.setItem('churnguard_statuses', JSON.stringify(stored));
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#0f1117] text-gray-300" : "bg-gray-50 text-gray-800"} font-mono p-6`}>
      {/* Import Fonts */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@600;700;800&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}} />

      {/* 1. HEADER */}
      <header className="flex flex-col gap-4 mb-8 border-b border-gray-800 pb-4">
        {/* LIVE CHURN TICKER */}
        {tickerItems.length > 0 && (
          <div className="bg-[#1a0a0a] border border-red-900/50 text-[#f59e0b] px-4 py-2 flex overflow-hidden relative">
            <div className="absolute left-0 bg-gradient-to-r from-[#1a0a0a] to-transparent w-8 h-full z-10" />
            <div className="absolute right-0 bg-gradient-to-l from-[#1a0a0a] to-transparent w-8 h-full z-10" />
            <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap gap-8 hover:[animation-play-state:paused]">
              {tickerItems.map((item, i) => (
                <span key={i} onClick={() => setSelectedSubscriberId(item.id)} className="font-bold cursor-pointer hover:underline text-sm uppercase">🚨 {item.text}</span>
              ))}
              {tickerItems.map((item, i) => (
                <span key={i+"dup"} onClick={() => setSelectedSubscriberId(item.id)} className="font-bold cursor-pointer hover:underline text-sm uppercase">🚨 {item.text}</span>
              ))}
            </div>
            <style>{`@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }`}</style>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-syne font-bold text-white flex items-center gap-3">
              <span className="text-[#f59e0b]">⚡</span> ChurnGuard
            </h1>
            <p className="text-gray-400 mt-1 uppercase tracking-wider text-sm">DTH Subscriber Intelligence</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="text-2xl hover:scale-110 transition-transform">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* ── DEMO: Add Subscriber Button ── */}
            <button
              id="add-subscriber-btn"
              onClick={() => { setIsAddSubOpen(true); setAddSubResult(null); setAddSubError(null); }}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.03] border border-violet-500/40"
            >
              ✨ Add Demo Subscriber
            </button>
            <label className={`flex items-center gap-2 px-4 py-2 rounded transition-colors cursor-pointer border ${isUploading ? 'bg-gray-800 border-gray-800 text-gray-400' : 'bg-[#1a1d26] border-gray-800 text-gray-300 hover:border-[#f59e0b] hover:text-[#f59e0b]'}`}>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleUpload}
                disabled={isUploading}
              />
              {isUploading ? '⏳ Uploading...' : '📤 Upload Subscriber Data'}
            </label>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 px-4 py-2 rounded transition-colors"
            >
              📥 Download At-Risk List
            </button>
          </div>
        </div>
        {uploadMessage && (
          <div className={`p-3 rounded text-sm ${uploadMessage.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            {uploadMessage.text}
          </div>
        )}
      </header>

      {/* 2. SUMMARY CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Subscribers", value: summaryLoading ? "..." : summary?.total_subscribers?.toLocaleString(), icon: "👥" },
          { label: "High Risk", value: summaryLoading ? "..." : summary?.churn_high_count?.toLocaleString(), color: "text-red-500", icon: "🔴" },
          { label: "Medium Risk", value: summaryLoading ? "..." : summary?.churn_medium_count?.toLocaleString(), color: "text-yellow-500", icon: "🟡" },
          { label: "Revenue at Risk", value: summaryLoading ? "..." : formatCurrency(summary?.total_arpu_at_risk || 0), icon: "💸" },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1a1d26] border border-gray-800 rounded-xl p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</span>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <span className={`text-3xl font-syne font-bold ${stat.color || 'text-white'}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* REGIONAL HEATMAP WITH REAL MAP */}
      <div className="bg-[#1a1d26] border border-gray-800 rounded-xl p-6 mb-8 relative">
        <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">🗺️ Churn Risk by Region</h2>
        {regionalLoading ? (
          <div className="animate-pulse flex items-center justify-center h-[350px]">
            <span className="text-[#f59e0b]">Loading map data...</span>
          </div>
        ) : (
          <div className="relative w-full h-[350px] rounded-xl z-0">
            <MapContainer center={[24.0, 78.9629]} zoom={4.5} style={{ height: "100%", width: "100%", background: "#1a1d26", borderRadius: "0.5rem" }} zoomControl={false} scrollWheelZoom={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              {regionalData.map((data) => {
                const mapCoords = {
                  Delhi: [28.7041, 77.1025],
                  Mumbai: [19.0760, 72.8777],
                  Bangalore: [12.9716, 77.5946],
                  Chennai: [13.0827, 80.2707],
                  Kolkata: [22.5726, 88.3639],
                  Hyderabad: [17.3850, 78.4867],
                  Pune: [18.5204, 73.8567],
                  Ahmedabad: [23.0225, 72.5714],
                  Jaipur: [26.9124, 75.7873],
                  Lucknow: [26.8467, 80.9462],
                };
                const pos = mapCoords[data.region] || [22.5937, 78.9629];
                
                const maxTotal = Math.max(...regionalData.map(d => d.total), 1);
                const r = 8 + ((data.total / maxTotal) * 12);
                
                let fill = '#22c55e'; // green
                if (data.avg_churn_prob > 0.65) fill = '#ef4444'; // red
                else if (data.avg_churn_prob >= 0.35) fill = '#f59e0b'; // amber
                
                return (
                  <CircleMarker
                    key={data.region}
                    center={pos}
                    radius={r}
                    pathOptions={{ color: fill, fillColor: fill, fillOpacity: 0.8, weight: 2 }}
                    eventHandlers={{
                      mouseover: (e) => {
                        setHoveredMapRegion({ data, pos: { x: e.originalEvent.clientX, y: e.originalEvent.clientY } });
                      },
                      mouseout: () => {
                        setHoveredMapRegion(null);
                      },
                      mousemove: (e) => {
                        setHoveredMapRegion(prev => prev ? { ...prev, pos: { x: e.originalEvent.clientX, y: e.originalEvent.clientY } } : null);
                      }
                    }}
                  />
                );
              })}
            </MapContainer>
            {hoveredMapRegion && (
              <div 
                className="fixed z-[1000] bg-[#0f1117] p-2 rounded shadow-xl text-white font-mono text-xs w-48 border border-gray-800 pointer-events-none"
                style={{ left: hoveredMapRegion.pos.x + 15, top: hoveredMapRegion.pos.y + 15 }}
              >
                <div className="font-syne font-bold mb-2 border-b border-gray-800 pb-1">{hoveredMapRegion.data.region}</div>
                <div className="flex justify-between mb-1"><span>Total:</span> <span>{hoveredMapRegion.data.total}</span></div>
                <div className="flex justify-between mb-1 text-red-500"><span>High Risk:</span> <span>{hoveredMapRegion.data.high_risk}</span></div>
                <div className="flex justify-between mb-1 text-yellow-500"><span>Med Risk:</span> <span>{hoveredMapRegion.data.medium_risk}</span></div>
                <div className="flex justify-between mb-1 text-green-500"><span>Low Risk:</span> <span>{hoveredMapRegion.data.low_risk}</span></div>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
                  <span>Avg Churn:</span> <span>{(hoveredMapRegion.data.avg_churn_prob * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHURN TREND GRAPH */}
      <div className="bg-[#1a1d26] border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">📈 Historical vs Predicted Churn & Revenue Impact</h2>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={churnTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis yAxisId="left" stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" stroke="#22c55e" tickFormatter={(v) => `₹${v/1000}k`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f1117', borderColor: '#374151', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line yAxisId="left" type="monotone" dataKey="historical_churn" name="Historical Churn %" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line yAxisId="left" type="monotone" dataKey="predicted_churn" name="Predicted Churn %" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue_saved" name="Cumulative Revenue Saved" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 4. REVENUE IMPACT CALCULATOR */}
        <div className="bg-[#1a1d26] border border-gray-800 rounded-xl p-6 lg:col-span-1 flex flex-col">
          <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">Revenue Impact Calculator</h2>
          
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Target Retention Rate</span>
              <span className="text-[#f59e0b] font-bold">{retentionRate}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={retentionRate} 
              onChange={(e) => setRetentionRate(parseInt(e.target.value))}
              className="w-full accent-[#f59e0b] h-2 bg-gray-800 rounded-xl appearance-none cursor-pointer"
            />
          </div>

          {revLoading ? (
            <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-[#f59e0b]">Calculating...</div></div>
          ) : (
            <div className="flex-1 flex flex-col justify-center bg-[#0f1117] p-4 rounded border border-gray-800">
              <p className="text-gray-400 leading-relaxed mb-4">
                Retaining <strong className="text-white">{retentionRate}%</strong> of High-Risk subscribers saves:
              </p>
              <div className="text-3xl font-syne text-[#22c55e] mb-2 font-bold">
                {formatCurrency(revenueImpact?.revenue_saved || 0)}
              </div>
              <p className="text-sm text-gray-400">
                ({revenueImpact?.retained_subscribers?.toLocaleString()} retained this month)
              </p>
            </div>
          )}
        </div>

        {/* 5. MODEL PERFORMANCE PANEL */}
        <div className="bg-[#1a1d26] border border-gray-800 rounded-xl p-6 lg:col-span-2">
          <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">Model Performance</h2>
          
          {metricsLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Badges */}
              <div className="grid grid-cols-2 gap-4 md:w-1/3">
                {[
                  { l: 'Accuracy', v: `${(metrics.accuracy * 100).toFixed(1)}%` },
                  { l: 'Precision', v: `${(metrics.precision * 100).toFixed(1)}%` },
                  { l: 'Recall', v: `${(metrics.recall * 100).toFixed(1)}%` },
                  { l: 'AUC-ROC', v: metrics.auc_roc.toFixed(3) }
                ].map(m => (
                  <div key={m.l} className="bg-[#0f1117] border border-gray-800 p-3 rounded text-center">
                    <div className="text-xs text-gray-400 uppercase mb-1">{m.l}</div>
                    <div className="text-lg text-white font-bold">{m.v}</div>
                  </div>
                ))}
              </div>

              {/* Feature Importances Bar Chart */}
              <div className="md:w-2/3">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Feature Drivers</h3>
                <div className="space-y-3">
                  {metrics.feature_importances.slice(0, 5).map(f => {
                    const maxImp = Math.max(...metrics.feature_importances.map(m => m.importance));
                    const widthPct = (f.importance / maxImp) * 100;
                    return (
                      <div key={f.feature} className="flex items-center text-sm">
                        <div className="w-1/3 truncate pr-4 text-gray-300">{f.feature}</div>
                        <div className="w-2/3 h-2 bg-gray-800 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute top-0 left-0 h-full bg-[#f59e0b] rounded-full"
                            style={{ width: `${widthPct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GAMIFICATION & CAMPAIGN PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className={`border rounded-xl p-6 ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-[#1a1d26] border-gray-800 shadow-sm"}`}>
          <h2 className={`font-syne text-xl mb-4 border-b pb-2 ${theme === "dark" ? "text-white border-gray-800" : "text-white border-gray-200"}`}>🏆 Top Agents (Gamification)</h2>
          <div className="space-y-3">
            {leaderboard.map((agent, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded border ${theme === "dark" ? (i === 0 ? "bg-[#f59e0b]/10 border-[#f59e0b]/30" : "bg-[#0f1117] border-gray-800") : (i === 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200")}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i===0 ? "bg-[#f59e0b] text-white" : "bg-gray-700 text-white"}`}>
                    {i === 0 ? '👑' : agent.rank}
                  </div>
                  <span className={`font-bold ${theme === "dark" ? "text-white" : "text-white"}`}>{agent.agent_name}</span>
                </div>
                <div className="text-right">
                  <div className="text-green-500 font-bold">₹{(agent.revenue_saved/1000).toFixed(1)}k</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`}>{agent.subscribers_retained} Retained</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`border rounded-xl p-6 ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-[#1a1d26] border-gray-800 shadow-sm"}`}>
          <h2 className={`font-syne text-xl mb-4 border-b pb-2 ${theme === "dark" ? "text-white border-gray-800" : "text-white border-gray-200"}`}>📢 Campaign Manager</h2>
          <div className="space-y-4">
            {campaigns.map((camp, i) => {
               const total = camp.target_count || 1;
               const contacted = camp.contacted || 0;
               const retained = camp.retained || 0;
               return (
                <div key={i} className={`p-4 rounded border ${theme === "dark" ? "bg-[#0f1117] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-bold text-lg ${theme === "dark" ? "text-white" : "text-white"}`}>{camp.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${camp.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>{camp.status}</span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress: {contacted} / {total}</span>
                      <span>{Math.round((contacted/total)*100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#f59e0b] h-full" style={{ width: `${(contacted/total)*100}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-400">
                      <span className="text-green-500 font-bold">{retained}</span> Retained
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleViewSubscribers(camp.id)}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded transition"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 rounded transition"
                        title="Delete Campaign"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
               );
            })}
            <button 
              onClick={() => setIsCampaignModalOpen(true)}
              className="w-full py-3 border border-dashed border-gray-600 rounded text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800/50 transition-colors font-bold"
            >
              + New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* 3. AT-RISK SUBSCRIBER TABLE */}
      <div className="bg-[#1a1d26] border border-gray-800 rounded-xl flex flex-col flex-1 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-800 flex flex-wrap gap-4 items-center bg-[#13151c]">
          <input 
            type="text" 
            placeholder="Search Subscriber ID..." 
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-800 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm flex-1 min-w-[200px]"
          />
          <select 
            value={riskFilter => setTierFilter(e.target.value)}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-800 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm"
          >
            <option value="">All Risks</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
          <select 
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-800 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm"
          >
            <option value="">All Regions</option>
            {/* Hardcoded based on data gen script, or could fetch from /api/regional */}
            {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select 
            value={packageFilter}
            onChange={(e) => { setPackageFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-800 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm"
          >
            <option value="">All Packages</option>
            <option value="Basic">Basic</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
          </select>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#0f1117] border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Rank</th>
                <th className="p-4 font-medium">Subscriber ID</th>
                <th className="p-4 font-medium">Region / Package</th>
                <th className="p-4 font-medium">Risk Tier</th>
                <th className="p-4 font-medium">Churn Prob.</th>
                <th className="p-4 font-medium">Key Drivers</th>
                <th className="p-4 font-medium">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {subsLoading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400">
                    <div className="animate-pulse inline-flex items-center gap-2">
                      <span className="text-[#f59e0b]">⚡</span> Fetching data...
                    </div>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400">No subscribers found matching filters.</td>
                </tr>
              ) : (
                subscribers.map((sub, idx) => (
                  <tr key={sub.subscriber_id} className={`hover:bg-gray-800/20 transition-colors group cursor-pointer ${theme === "dark" ? "hover:bg-gray-800/50" : "hover:bg-gray-100"}`} onClick={() => setSelectedSubscriberId(sub.subscriber_id)}>
                    <td className="p-4 text-gray-400 text-sm">#{(page - 1) * 50 + idx + 1}</td>
                    <td className="p-4 font-medium text-white">{sub.subscriber_id}</td>
                    <td className="p-4 text-sm">
                      <div className="text-gray-300">{sub.region}</div>
                      <div className="text-gray-400 text-xs">{sub.package_type}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTierColor(sub.risk_tier)}`}>
                        {sub.risk_tier}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm w-12 text-right">{(sub.churn_probability * 100).toFixed(1)}%</div>
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${sub.churn_probability > 0.65 ? 'bg-red-500' : sub.churn_probability > 0.35 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${sub.churn_probability * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-400 max-w-[200px] truncate" title={sub.churn_reasons}>
                      {sub.churn_reasons?.split(', ').map((reason, i) => (
                        <span key={i} className="inline-block bg-gray-800 text-gray-300 px-2 py-0.5 rounded mr-1 mb-1 border border-gray-800">
                          {reason}
                        </span>
                      ))}
                    </td>
                    <td className="p-4 text-sm text-[#f59e0b] max-w-[200px] truncate" title={sub.recommended_action}>
                      {sub.recommended_action}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-[#13151c]">
          <div className="text-sm text-gray-400">
            Showing <span className="text-white">{(page - 1) * 50 + 1}</span> to <span className="text-white">{Math.min(page * 50, subTotal)}</span> of <span className="text-white">{subTotal}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-[#0f1117] border border-gray-800 rounded text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              Prev
            </button>
            <button 
              disabled={page * 50 >= subTotal}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-[#0f1117] border border-gray-800 rounded text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Notification Panel Overlay */}
      {isNotifPanelOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-sm" onClick={() => setIsNotifPanelOpen(false)}>
          <div 
            className="w-full max-w-md bg-[var(--bg-secondary)] h-full border-l border-[var(--border-color)] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
              <h2 className="text-xl font-syne font-bold text-[var(--text-[#f59e0b])]">Notifications</h2>
              <div className="flex gap-4 items-center">
                <button 
                  onClick={() => {
                    const allIds = notifications.map(n => n.id);
                    setReadNotifs(allIds);
                    localStorage.setItem('churnguard_read_notifs', JSON.stringify(allIds));
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-white"
                >
                  Mark all read
                </button>
                <button onClick={() => setIsNotifPanelOpen(false)} className="text-xl text-[var(--text-secondary)] hover:text-white">✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center text-[var(--text-secondary)] mt-10">✅ All caught up!</div>
              ) : (
                notifications.map(n => {
                  const isRead = readNotifs.includes(n.id);
                  let borderColor = 'border-gray-500';
                  if (n.type === 'error') borderColor = 'border-red-500';
                  if (n.type === 'warning') borderColor = 'border-yellow-500';
                  if (n.type === 'success') borderColor = 'border-green-500';
                  if (n.type === 'info') borderColor = 'border-blue-500';
                  
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (!isRead) {
                          const newRead = [...readNotifs, n.id];
                          setReadNotifs(newRead);
                          localStorage.setItem('churnguard_read_notifs', JSON.stringify(newRead));
                        }
                        setIsNotifPanelOpen(false);
                        const el = document.getElementById(n.target);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          el.classList.add('ring-2', 'ring-[var(--accent)]', 'ring-offset-4', 'ring-offset-[var(--bg-primary)]', 'transition-all', 'duration-500');
                          setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--accent)]', 'ring-offset-4', 'ring-offset-[var(--bg-primary)]'), 2000);
                        }
                      }}
                      className={`p-3 rounded border-l-4 ${borderColor} ${isRead ? 'bg-[var(--bg-tertiary)] opacity-70' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-md cursor-pointer hover:bg-[var(--bg-tertiary)]'} transition-all`}
                    >
                      <div className="text-sm text-[var(--text-[#f59e0b])]">{n.message}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-2">
                        {new Date(n.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. DEEP DIVE MODAL */}
      {selectedSubscriberId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setSelectedSubscriberId(null)}>
          <div 
            className={`w-full max-w-3xl rounded-xl p-6 relative border shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${theme === "dark" ? "bg-[#0f1117] border-gray-800" : "bg-white border-gray-200"}`}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedSubscriberId(null)} className={`absolute top-4 right-4 text-2xl hover:scale-110 transition-transform ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-white"}`}>
              ✕
            </button>
            
            {modalLoading || !selectedSubscriber ? (
              <div className="flex flex-col items-center justify-center h-64">
                 <div className="animate-spin text-[#f59e0b] text-4xl mb-4">↻</div>
                 <div className="text-gray-400 font-mono">Loading Full Profile...</div>
              </div>
            ) : (
              <>
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#f59e0b] p-1">
                      <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold ${theme === "dark" ? "bg-[#1a1d26] text-white" : "bg-white text-white"}`}>
                        {selectedSubscriber.subscriber_id.substring(0,2)}
                      </div>
                    </div>
                    <div>
                      <h2 className={`font-syne text-3xl font-bold ${theme === "dark" ? "text-white" : "text-white"}`}>{selectedSubscriber.subscriber_id}</h2>
                      <div className="flex gap-2 mt-1">
                         <span className="bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30 px-2 py-0.5 rounded text-xs font-bold">{selectedSubscriber.region}</span>
                         <span className="bg-purple-500/20 text-purple-500 border border-purple-500/30 px-2 py-0.5 rounded text-xs font-bold">{selectedSubscriber.package_type}</span>
                         <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTierColor(selectedSubscriber.risk_tier)}`}>{selectedSubscriber.risk_tier} Risk</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {renderRiskGauge(selectedSubscriber.churn_probability)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* LEFT COLUMN: History & Timeline */}
                  <div className="flex flex-col gap-6">
                    <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <div className="text-gray-400 text-xs uppercase mb-4">Recharge History (Last 6 Months)</div>
                      {renderRechargeChart(selectedSubscriber.recharge_history)}
                    </div>
                    
                    <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <div className="text-gray-400 text-xs uppercase mb-4">Behaviour Timeline</div>
                      <div className="relative border-l-2 border-gray-800 ml-3 space-y-4 pl-4 py-2 text-sm">
                         <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-[#2563EB] rounded-full"></div>
                            <div className={theme === "dark" ? "text-gray-300" : "text-gray-800"}>Joined <strong className="text-white">{selectedSubscriber.tenure_months} months</strong> ago</div>
                         </div>
                         <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-[#2563EB] rounded-full"></div>
                            <div className={theme === "dark" ? "text-gray-300" : "text-gray-800"}>Last active: <strong className="text-white">{selectedSubscriber.days_since_active} days</strong> ago</div>
                         </div>
                         <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className={theme === "dark" ? "text-gray-300" : "text-gray-800"}>Filed <strong className="text-white">{selectedSubscriber.complaint_count} complaints</strong></div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Reasons & Actions */}
                  <div className="flex flex-col gap-6">
                    <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <div className="text-gray-400 text-xs uppercase mb-3">Top Churn Drivers</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubscriber.churn_reasons?.split(', ').map((reason, i) => (
                          <span key={i} className="flex items-center gap-1 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-gray-800 text-sm">
                            <span className="text-red-400">⚠️</span> {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={`p-5 rounded border flex-1 flex flex-col ${theme === "dark" ? "bg-[#1a0a0a] border-red-900/30" : "bg-red-50 border-red-200"}`}>
                       <h3 className="text-red-500 font-bold mb-3 flex items-center gap-2"><span>🎯</span> Recommended Action</h3>
                       <div className={`font-medium mb-6 ${theme === "dark" ? "text-gray-300" : "text-gray-800"}`}>{selectedSubscriber.recommended_action}</div>
                       
                       <div className="mt-auto flex flex-col gap-3">
                         <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-gray-800">
                           <span className="text-sm text-gray-400">Current Status:</span>
                           <span className={`px-2 py-1 rounded text-xs font-bold ${
                             trackerStatus === 'Pending' ? 'bg-gray-500/20 text-gray-400' :
                             trackerStatus === 'Contacted' ? 'bg-blue-500/20 text-blue-400' :
                             trackerStatus === 'Offer Accepted' ? 'bg-green-500/20 text-green-400' :
                             'bg-red-500/20 text-red-400'
                           }`}>{trackerStatus}</span>
                         </div>
                         <button 
                           onClick={cycleStatus} 
                           className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded shadow-lg transition-transform hover:scale-[1.02]"
                         >
                           {trackerStatus === 'Pending' ? 'Mark as Contacted' : 'Update Status'}
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d26] border border-gray-800 p-8 rounded-xl max-w-md w-full relative">
            <button onClick={() => setIsCampaignModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h2 className="font-syne text-2xl text-white mb-6 border-b border-gray-800 pb-2">Create Campaign</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Campaign Name</label>
                <input 
                  type="text" 
                  value={campaignFormData.name}
                  onChange={(e) => setCampaignFormData({...campaignFormData, name: e.target.value})}
                  className="w-full bg-[#0f1117] border border-gray-800 rounded p-2 text-white outline-none focus:border-[#f59e0b]"
                  placeholder="e.g. Q3 Save Mumbai High Risk"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Target Risk Tier</label>
                <select 
                  value={campaignFormData.risk_tier}
                  onChange={(e) => setCampaignFormData({...campaignFormData, risk_tier: e.target.value})}
                  className="w-full bg-[#0f1117] border border-gray-800 rounded p-2 text-white outline-none"
                >
                  <option value="">Any</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Target Region</label>
                <select 
                  value={campaignFormData.region}
                  onChange={(e) => setCampaignFormData({...campaignFormData, region: e.target.value})}
                  className="w-full bg-[#0f1117] border border-gray-800 rounded p-2 text-white outline-none"
                >
                  <option value="">Any</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Pune">Pune</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Jaipur">Jaipur</option>
                  <option value="Lucknow">Lucknow</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Target Package</label>
                <select 
                  value={campaignFormData.package_type}
                  onChange={(e) => setCampaignFormData({...campaignFormData, package_type: e.target.value})}
                  className="w-full bg-[#0f1117] border border-gray-800 rounded p-2 text-white outline-none"
                >
                  <option value="">Any</option>
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
            </div>
            
            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded p-4 mb-6">
              <div className="text-[#f59e0b] font-bold flex items-center gap-2">
                <span>🎯</span> This campaign targets <span className="text-xl">{campaignTargetPreview}</span> subscribers
              </div>
            </div>

            <button 
              onClick={handleCreateCampaign}
              disabled={!campaignFormData.name}
              className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded shadow-lg transition-transform hover:scale-[1.02]"
            >
              Launch Campaign
            </button>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaignId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d26] border border-gray-800 p-6 rounded-xl max-w-4xl w-full h-[80vh] flex flex-col relative">
            <button onClick={() => setSelectedCampaignId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h2 className="font-syne text-2xl text-white mb-6 border-b border-gray-800 pb-2">Campaign Subscribers</h2>
            
            <div className="flex-1 overflow-auto">
              {campaignSubsLoading ? (
                 <div className="text-center text-gray-400 mt-10">Loading subscribers...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase tracking-wider">
                      <th className="p-3">Subscriber</th>
                      <th className="p-3">Risk</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignSubs.map((sub, i) => {
                      const storedStatuses = JSON.parse(localStorage.getItem('churnguard_statuses') || '{}');
                      const currentStatus = storedStatuses[sub.subscriber_id] || 'Pending';
                      return (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{sub.subscriber_id}</div>
                          <div className="text-xs text-gray-400">{sub.region} • {sub.package_type}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${sub.risk_tier === 'High' ? 'bg-red-500/20 text-red-500' : sub.risk_tier === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                            {sub.risk_tier}
                          </span>
                        </td>
                        <td className="p-3">
                          <select 
                            value={currentStatus}
                            onChange={(e) => updateCampaignStatus(selectedCampaignId, sub.subscriber_id, e.target.value)}
                            className={`bg-gray-800 border-none rounded p-1 text-sm outline-none ${
                              currentStatus === 'Pending' ? 'text-gray-400' :
                              currentStatus === 'Contacted' ? 'text-blue-400' :
                              currentStatus === 'Offer Accepted' ? 'text-green-400' :
                              'text-red-400'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Offer Accepted">Offer Accepted</option>
                            <option value="Churned">Churned</option>
                          </select>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
           DEMO ADD SUBSCRIBER MODAL
      ════════════════════════════════════════════════════════════ */}
      {isAddSubOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={() => setIsAddSubOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0f1117] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-900/40 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Decorative gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500" />

            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-syne text-2xl text-white font-bold flex items-center gap-2">
                    <span className="text-2xl">✨</span> Add Demo Subscriber
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Enter details below. The AI model will predict churn risk instantly.</p>
                </div>
                <button
                  onClick={() => setIsAddSubOpen(false)}
                  className="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
                >✕</button>
              </div>

              {/* Result Card — shown after prediction */}
              {addSubResult && (
                <div className={`mb-6 p-5 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  addSubResult.risk_tier === 'High'   ? 'border-red-500/60 bg-red-500/10' :
                  addSubResult.risk_tier === 'Medium' ? 'border-yellow-500/60 bg-yellow-500/10' :
                                                        'border-green-500/60 bg-green-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Prediction Result</div>
                      <div className="font-syne text-xl text-white font-bold">{addSubResult.subscriber_id}</div>
                    </div>
                    <div className={`text-4xl font-syne font-black ${
                      addSubResult.risk_tier === 'High'   ? 'text-red-500' :
                      addSubResult.risk_tier === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {(addSubResult.churn_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-gray-400 text-xs uppercase mb-1">Risk Tier</div>
                      <span className={`font-bold text-base ${
                        addSubResult.risk_tier === 'High'   ? 'text-red-400' :
                        addSubResult.risk_tier === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {addSubResult.risk_tier === 'High' ? '🔴' : addSubResult.risk_tier === 'Medium' ? '🟡' : '🟢'} {addSubResult.risk_tier} Risk
                      </span>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-gray-400 text-xs uppercase mb-1">Days Inactive</div>
                      <span className="text-white font-bold text-base">{addSubResult.days_since_active}d</span>
                    </div>
                  </div>
                  <div className="mt-3 bg-black/30 rounded-lg p-3">
                    <div className="text-gray-400 text-xs uppercase mb-1">Top Churn Drivers</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {addSubResult.churn_reasons?.split(', ').map((r, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full border border-gray-700">⚠️ {r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 bg-black/30 rounded-lg p-3">
                    <div className="text-gray-400 text-xs uppercase mb-1">Recommended Action</div>
                    <div className="text-[#f59e0b] font-medium text-sm">{addSubResult.recommended_action}</div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => { setIsAddSubOpen(false); setSearchFilter(addSubResult.subscriber_id); }}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                      View in Table →
                    </button>
                    <button
                      onClick={() => { setAddSubResult(null); setAddSubForm({ subscriber_id: '', region: 'Mumbai', package_type: 'Standard', tenure_months: 12, arpu: 350, complaint_count: 2, last_active_date: new Date().toISOString().split('T')[0], recharge_history: '300,350,280,400,320,310' }); }}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Add Another
                    </button>
                  </div>
                </div>
              )}

              {addSubError && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-sm">
                  ❌ {addSubError}
                </div>
              )}

              {/* Form — hide once result shown */}
              {!addSubResult && (
                <div className="space-y-5">
                  {/* Row 1: ID */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">
                      Subscriber ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="add-sub-id"
                      type="text"
                      value={addSubForm.subscriber_id}
                      onChange={e => setAddSubForm({...addSubForm, subscriber_id: e.target.value})}
                      placeholder="e.g. SUB-99999"
                      className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                    />
                  </div>

                  {/* Row 2: Region + Package */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Region</label>
                      <select
                        id="add-sub-region"
                        value={addSubForm.region}
                        onChange={e => setAddSubForm({...addSubForm, region: e.target.value})}
                        className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                      >
                        {['Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Package Type</label>
                      <select
                        id="add-sub-package"
                        value={addSubForm.package_type}
                        onChange={e => setAddSubForm({...addSubForm, package_type: e.target.value})}
                        className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                      >
                        <option value="Basic">Basic</option>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Tenure + ARPU */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Tenure (months)</label>
                      <input
                        id="add-sub-tenure"
                        type="number" min="1" max="120"
                        value={addSubForm.tenure_months}
                        onChange={e => setAddSubForm({...addSubForm, tenure_months: e.target.value})}
                        className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">ARPU (₹/month)</label>
                      <input
                        id="add-sub-arpu"
                        type="number" min="0" step="10"
                        value={addSubForm.arpu}
                        onChange={e => setAddSubForm({...addSubForm, arpu: e.target.value})}
                        className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 4: Complaints + Last Active Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Complaint Count</label>
                      <input
                        id="add-sub-complaints"
                        type="number" min="0" max="50"
                        value={addSubForm.complaint_count}
                        onChange={e => setAddSubForm({...addSubForm, complaint_count: e.target.value})}
                        className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Last Active Date</label>
                      <input
                        id="add-sub-last-active"
                        type="date"
                        value={addSubForm.last_active_date}
                        onChange={e => setAddSubForm({...addSubForm, last_active_date: e.target.value})}
                        className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 5: Recharge History */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">
                      Recharge History
                      <span className="text-gray-500 text-xs font-normal ml-2">(comma-separated ₹ amounts, last 6 months)</span>
                    </label>
                    <input
                      id="add-sub-recharge"
                      type="text"
                      value={addSubForm.recharge_history}
                      onChange={e => setAddSubForm({...addSubForm, recharge_history: e.target.value})}
                      placeholder="e.g. 300,350,280,400,320,310"
                      className="w-full bg-[#1a1d26] border border-gray-700 focus:border-violet-500 text-white rounded-lg px-4 py-2.5 outline-none transition-colors text-sm font-mono"
                    />
                    {/* Mini preview bar */}
                    {addSubForm.recharge_history && (
                      <div className="flex gap-1 mt-2 items-end h-6">
                        {addSubForm.recharge_history.split(',').map((v, i) => {
                          const vals = addSubForm.recharge_history.split(',').map(Number).filter(n => !isNaN(n));
                          const max  = Math.max(...vals, 1);
                          const pct  = (parseFloat(v) / max) * 100;
                          return <div key={i} className="flex-1 bg-violet-500/70 rounded-sm transition-all" style={{ height: `${pct}%`, minHeight: '4px' }} />;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    id="add-sub-predict-btn"
                    onClick={handleAddSubscriber}
                    disabled={addSubLoading || !addSubForm.subscriber_id.trim()}
                    className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {addSubLoading ? (
                      <><span className="animate-spin">↻</span> Running AI Prediction...</>
                    ) : (
                      <><span>⚡</span> Predict Risk & Add to List</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

