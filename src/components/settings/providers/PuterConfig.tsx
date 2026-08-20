import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { getChatProvider } from '@/lib/providers';
import type { AIModel } from '@/lib/types';
import puter from '@heyputer/puter.js';

export function PuterConfig() {
  const credentials = useSettingsStore((s) => s.credentials);
  const setCredential = useSettingsStore((s) => s.setCredential);
  const removeCredential = useSettingsStore((s) => s.removeCredential);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const selectedImageModel = useSettingsStore((s) => s.selectedImageModel);
  const setSelectedImageModel = useSettingsStore((s) => s.setSelectedImageModel);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const refreshUsage = () => {
    setLoadingUsage(true);
    puter.auth.getMonthlyUsage?.()
      .then((data: any) => setUsage(data))
      .catch((err: any) => console.error('Failed to fetch usage:', err))
      .finally(() => setLoadingUsage(false));
  };

  useEffect(() => {
    const signedIn = puter.auth.isSignedIn();
    setIsSignedIn(signedIn);
    
    if (signedIn && !credentials.puter?.signedIn) {
      setCredential('puter', { signedIn: true });
    } else if (!signedIn && credentials.puter?.signedIn) {
      removeCredential('puter');
    }

    if (signedIn) {
      refreshUsage();

      const provider = getChatProvider('puter');
      if (provider) {
        provider.listModels().then(setModels);
      }
    } else {
      setModels([]);
      setUsage(null);
    }
  }, [credentials.puter?.signedIn, setCredential, removeCredential]);

  const handleSignIn = async () => {
    try {
      await puter.auth.signIn();
      const signedIn = puter.auth.isSignedIn();
      setIsSignedIn(signedIn);
      if (signedIn) {
        setCredential('puter', { signedIn: true });
        useUIStore.getState().addToast({ type: 'success', message: 'Signed in to Puter.' });
      }
    } catch (error) {
      console.error('Puter sign in error', error);
      useUIStore.getState().addToast({ type: 'error', message: 'Failed to sign in to Puter.' });
    }
  };

  const handleSignOut = () => {
    try {
      puter.auth.signOut();
      setIsSignedIn(false);
      removeCredential('puter');
      setModels([]);
      useUIStore.getState().addToast({ type: 'success', message: 'Signed out of Puter.' });
    } catch (error) {
      console.error('Puter sign out error', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Puter Cloud (GPT-5.6)
        </h3>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        Access GPT-5.6 Luna natively. Puter uses a user-pays model where your usage is tied to your free Puter account—no API keys required.
      </p>
      <div className="space-y-3">
        {!isSignedIn ? (
          <button
            onClick={handleSignIn}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:scale-105 active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            Sign in with Puter
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
              <CheckCircle size={15} />
              <span>Signed in to Puter successfully!</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs self-start transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Sign out
            </button>

            {models.length > 0 && (
              <div className="mt-2 mb-2">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                  Default Model
                </label>
                <select
                  value={selectedModels.puter || ''}
                  onChange={(e) => setSelectedModel('puter', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Select a model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-2">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Default Image Model
              </label>
              <select
                value={selectedImageModel || 'openai/gpt-image-1-mini'}
                onChange={(e) => setSelectedImageModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="openai/gpt-image-1-mini">GPT Image 1 Mini</option>
                <option value="openai/gpt-image-2">GPT Image 2</option>
              </select>
            </div>
            
            {/* USAGE SECTION */}
            {loadingUsage && !usage ? (
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Fetching usage...</span>
              </div>
            ) : usage && usage.allowanceInfo ? (
              (function () {
                const allowance = usage?.allowanceInfo?.monthUsageAllowance || 0;
                const remaining = usage?.allowanceInfo?.remaining || 0;
                const used = Math.max(0, allowance - remaining);
                let percentage = 0;
                if (allowance > 0) {
                    percentage = (used / allowance) * 100;
                }

                const formatNum = (val: any) => typeof val === 'number' && Number.isFinite(val) ? val.toLocaleString() : '—';
                const formatMoney = (val: any) => typeof val === 'number' && Number.isFinite(val) ? `$${(val / 100000000).toFixed(6)}` : '—';

                return (
                  <div className="mt-6 border" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '14px', padding: '25px', borderColor: 'var(--border)' }}>
                    
                    <div style={{ paddingBottom: '22px', borderBottom: '1px solid var(--border)', marginBottom: '25px' }}>
                        <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold' }}>Usage</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0' }}>Current monthly usage for this Puter account</p>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '15px' }}>Resources</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          {Math.round(percentage)}% &middot; {formatNum(used)} used of {formatNum(allowance)} Credits
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, percentage)}%`, background: 'var(--warning)', borderRadius: '10px', transition: 'width .5s' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                      <button
                        onClick={refreshUsage}
                        disabled={loadingUsage}
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: loadingUsage ? 'not-allowed' : 'pointer', opacity: loadingUsage ? 0.5 : 1 }}
                        title="Refresh Usage"
                      >
                        <RefreshCw size={16} className={loadingUsage ? "animate-spin" : ""} />
                      </button>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {loadingUsage ? 'Loading usage...' : 'Updated successfully.'}
                      </div>
                    </div>

                    <div>
                      <h2 style={{ fontSize: '15px', marginBottom: '15px', color: 'var(--text-primary)' }}>Usage Details</h2>
                      <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '14px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                          <thead>
                            <tr>
                              <th style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Model</th>
                              <th style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Credits Used</th>
                              <th style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Calls</th>
                              <th style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              if (!usage?.usage || Object.keys(usage.usage).length === 0) {
                                return <tr><td colSpan={4} style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'left', fontSize: '14px' }}>No API usage recorded yet.</td></tr>;
                              }
                              
                              const combined: Record<string, any> = {
                                'DeepSeek V4 Flash': { cost: 0, count: 0, units: 0 },
                                'DeepSeek V4 Flash:free': { cost: 0, count: 0, units: 0 },
                                'GPT-5.6 Luna': { cost: 0, count: 0, units: 0 },
                                'GPT Image 1 Mini': { cost: 0, count: 0, units: 0 },
                                'GPT Image 2': { cost: 0, count: 0, units: 0 }
                              };

                              Object.entries(usage.usage).forEach(([apiName, stats]: [string, any]) => {
                                const lower = String(apiName).toLowerCase();
                                
                                let itemCost = 0, itemCount = 0, itemUnits = 0;
                                
                                if (typeof stats === 'object' && stats !== null) {
                                  itemCost = Number(stats.cost ?? stats.billedUsage ?? stats.credits ?? 0);
                                  itemCount = Number(stats.count ?? stats.requests ?? stats.calls ?? 0);
                                  itemUnits = Number(stats.units ?? stats.tokens ?? 0);
                                } else {
                                  const val = Number(stats) || 0;
                                  if (lower.includes('count') || lower.includes('request') || lower.includes('call')) {
                                    itemCount = val;
                                  } else if (lower.includes('unit') || lower.includes('token')) {
                                    itemUnits = val;
                                  } else {
                                    itemCost = val;
                                  }
                                }
                                
                                if (lower.includes('v4-flash:free')) {
                                  combined['DeepSeek V4 Flash:free'].cost += itemCost;
                                  combined['DeepSeek V4 Flash:free'].count += itemCount;
                                  combined['DeepSeek V4 Flash:free'].units += itemUnits;
                                } else if (lower.includes('v4-flash')) {
                                  combined['DeepSeek V4 Flash'].cost += itemCost;
                                  combined['DeepSeek V4 Flash'].count += itemCount;
                                  combined['DeepSeek V4 Flash'].units += itemUnits;
                                } else if (lower.includes('luna')) {
                                  combined['GPT-5.6 Luna'].cost += itemCost;
                                  combined['GPT-5.6 Luna'].count += itemCount;
                                  combined['GPT-5.6 Luna'].units += itemUnits;
                                } else if (lower.includes('image-2') || lower.includes('gpt image 2')) {
                                  combined['GPT Image 2'].cost += itemCost;
                                  combined['GPT Image 2'].count += itemCount;
                                  combined['GPT Image 2'].units += itemUnits;
                                } else if (lower.includes('image') || lower.includes('txt2img')) {
                                  combined['GPT Image 1 Mini'].cost += itemCost;
                                  combined['GPT Image 1 Mini'].count += itemCount;
                                  combined['GPT Image 1 Mini'].units += itemUnits;
                                }
                              });
                              
                              const finalUsage = Object.entries(combined);
                              
                              if (finalUsage.length === 0) {
                                return <tr><td colSpan={4} style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'left', fontSize: '14px' }}>No model usage recorded yet.</td></tr>;
                              }
                              
                              return finalUsage
                                .sort((a: any, b: any) => (b[1]?.cost || 0) - (a[1]?.cost || 0))
                                .map(([apiName, stats]: [string, any], index, array) => (
                                  <tr key={apiName}>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid var(--border)' }}>{apiName}</td>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid var(--border)', color: 'var(--success)', fontWeight: 'bold' }}>{formatNum(stats.cost)}</td>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid var(--border)' }}>{formatNum(stats.count)}</td>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid var(--border)' }}>{formatNum(stats.units)}</td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}

          </div>
        )}
      </div>
    </div>
  );
}
