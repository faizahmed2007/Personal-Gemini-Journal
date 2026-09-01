import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { geminiService } from '../services/geminiService';
import { SecurityTestResult } from '../types';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Lock, 
  Key, 
  Database, 
  Server, 
  FileCode, 
  Eye, 
  Cpu, 
  RefreshCw,
  Layers
} from 'lucide-react';

interface SecurityCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityCenterModal: React.FC<SecurityCenterModalProps> = ({ isOpen, onClose }) => {
  const { user, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditResults, setAuditResults] = useState<SecurityTestResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'threat_model' | 'rules'>('tests');

  if (!isOpen) return null;

  const handleRunSecurityAudit = async () => {
    if (!user) return;
    setIsRunningAudit(true);

    try {
      const token = await getIdToken();
      const res = await geminiService.runSecurityAudit(token);
      setAuditResults(res.results);
      showToast(`Security audit completed: ${res.testsPassed}/${res.totalTests} checks passed!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to run security audit', 'error');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const threatModelMatrix = [
    {
      threat: '1. Authentication Attacks',
      impact: 'High',
      mitigation: 'Firebase Authentication with cryptographically verified session tokens; password hashing handled by Google infrastructure.'
    },
    {
      threat: '2. Broken Access Control',
      impact: 'Critical',
      mitigation: 'Server enforces Bearer auth on all endpoints. Frontend passes validated ID token; server rejects spoofed user identities.'
    },
    {
      threat: '3. Cross-User Firestore Data Leakage',
      impact: 'Critical',
      mitigation: 'Firestore security rules enforce request.auth.uid == userId for all /users/{userId}/** paths. User A cannot read User B data.'
    },
    {
      threat: '4. Gemini API Key Exposure',
      impact: 'Critical',
      mitigation: 'GEMINI_API_KEY is stored server-side via Google Cloud Secret Manager / Cloud Run env; ZERO keys are bundled into frontend JS.'
    },
    {
      threat: '5. Prompt Injection',
      impact: 'Medium',
      mitigation: 'User journal content is framed inside isolated markdown data delimiters and backed by strict system boundary instructions.'
    },
    {
      threat: '6. Malicious Journal Input & Payload Attacks',
      impact: 'Medium',
      mitigation: 'Express JSON body parser limits payload size to 512KB. Client and server input truncation prevents payload exhaustion.'
    },
    {
      threat: '7. Unauthorized Gemini API Usage',
      impact: 'High',
      mitigation: 'All AI routes require valid Firebase Authorization headers. Unauthenticated clients are rejected with HTTP 401.'
    },
    {
      threat: '8. Excessive API Cost & Abuse',
      impact: 'Medium',
      mitigation: 'In-memory sliding window rate limiter restricts each user identity to 35 requests/min. 429 status code on burst abuse.'
    },
    {
      threat: '9. Cross-Site Scripting (XSS)',
      impact: 'High',
      mitigation: 'React escapes rendered variables by default. Markdown rendering is securely processed using ReactMarkdown and standard parsers.'
    },
    {
      threat: '10. Cross-Site Request Forgery (CSRF)',
      impact: 'Medium',
      mitigation: 'APIs rely on explicit Authorization: Bearer headers rather than ambient browser cookies, neutralizing CSRF vectors.'
    },
    {
      threat: '11. Data Enumeration & IDOR',
      impact: 'High',
      mitigation: 'Document IDs are random high-entropy strings; security rules enforce that document paths must match the verified authenticated UID.'
    },
    {
      threat: '12. Session / Token Misuse',
      impact: 'High',
      mitigation: 'Short-lived Firebase ID tokens auto-refresh securely; tokens are verified server-side on every request.'
    },
    {
      threat: '13. Server-Side Secret Exposure',
      impact: 'Critical',
      mitigation: 'Secrets are lazy-initialized on the backend without debug logging of keys or sensitive credential material in logs.'
    },
    {
      threat: '14. Journal Data Privacy Leakage',
      impact: 'High',
      mitigation: 'No journal data is indexed publicly or transmitted to third-party trackers. Data is strictly scoped to the authenticated user.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div 
        id="security-center-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-['Playfair_Display',serif]">
                  Security Architecture & Threat Model Center
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                  Production Grade
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time validation of Firebase Auth, Firestore isolation, and Secret Manager defenses.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'tests'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Live Security Test Suite
          </button>

          <button
            onClick={() => setActiveTab('threat_model')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'threat_model'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            14-Point Threat Model Matrix
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Firestore Rules & Isolation
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* TAB 1: Live Security Tests */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                <div>
                  <h3 className="font-bold text-xs text-blue-950 dark:text-blue-200">
                    Live Runtime Security Verification
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Triggers server-side inspection of auth token headers, rate limiters, and secret protection.
                  </p>
                </div>

                <button
                  id="btn-run-security-suite"
                  onClick={handleRunSecurityAudit}
                  disabled={isRunningAudit}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold text-xs shadow-2xs flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
                  <span>{isRunningAudit ? 'Running...' : 'Run Audit'}</span>
                </button>
              </div>

              {auditResults ? (
                <div className="space-y-3">
                  {auditResults.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 shadow-2xs"
                    >
                      {test.status === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {test.title}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {test.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {test.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Click <strong>"Run Audit"</strong> to execute live validation tests against the server.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Threat Model Matrix */}
          {activeTab === 'threat_model' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Every major threat category from the Security-First Development Constitution is mapped to architectural mitigations below.
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-3 font-bold">Threat Category</th>
                      <th className="p-3 font-bold">Risk</th>
                      <th className="p-3 font-bold">Architectural Defense & Mitigation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {threatModelMatrix.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap align-top">
                          {item.threat}
                        </td>
                        <td className="p-3 align-top">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            item.impact === 'Critical'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : item.impact === 'High'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {item.impact}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed align-top">
                          {item.mitigation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Firestore Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                  Active Firestore Security Rules Specification
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Deployed directly to Firebase project <code className="text-blue-700 dark:text-blue-400 font-mono">igneous-transformer-6ln7n</code>.
                </p>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-blue-300 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /journals/{journalId} {
        allow read, write: if isOwner(userId);

        match /messages/{messageId} {
          allow read, write: if isOwner(userId);
        }
      }

      match /summaries/{summaryId} {
        allow read, write: if isOwner(userId);
      }

      match /settings/{settingId} {
        allow read, write: if isOwner(userId);
      }

      match /insights/{insightId} {
        allow read, write: if isOwner(userId);
      }

      match /actions/{actionId} {
        allow read, write: if isOwner(userId);
      }
    }

    // Default Deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Authenticated User: <strong className="text-slate-800 dark:text-slate-200">{user?.email || 'Anonymous'}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            Close Security Center
          </button>
        </div>
      </div>
    </div>
  );
};
