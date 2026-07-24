import React, { useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  FileSpreadsheet, 
  X, 
  ExternalLink, 
  Plus,
  Layers,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  FolderOpen,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Project, Transaction, BillingItem } from '../types';
import { DEFAULT_SHEET_INCOME, DEFAULT_SHEET_BILLING } from '../data/mockData';
import { 
  createFolderSheetsSeparatedByProjects, 
  TARGET_DRIVE_FOLDER_URL, 
  TARGET_DRIVE_FOLDER_ID 
} from '../lib/googleSheetsService';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  transactions?: Transaction[];
  billingItems?: BillingItem[];
  googleAccessToken?: string | null;
  onGoogleSignIn?: () => void;
  onSheetsCreated?: (incomeUrl: string, billingUrl: string, incomeId: string, billingId: string, projectUrls?: Record<string, { incomeUrl: string, billingUrl: string }>) => void;
  incomeSheetId?: string | null;
  billingSheetId?: string | null;
  onPullFromSheets?: () => Promise<void>;
  onUpdateSheetIds?: (incomeId: string, billingId: string) => void;
  db: any;
  googleUser: any;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  projects,
  transactions = [],
  billingItems = [],
  googleAccessToken,
  onGoogleSignIn,
  onSheetsCreated,
  incomeSheetId,
  billingSheetId,
  onPullFromSheets,
  onUpdateSheetIds,
  db,
  googleUser
}) => {
  const [activeTab, setActiveTab] = useState<'income' | 'billing'>('income');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [manualIncomeUrl, setManualIncomeUrl] = useState<string>('');
  const [manualBillingUrl, setManualBillingUrl] = useState<string>('');
  const [recentSheets, setRecentSheets] = useState<{income: string[], billing: string[]}>({income: [], billing: []});
  const [createMsg, setCreateMsg] = useState<{ 
    success: boolean; 
    msg: string; 
    incomeUrl?: string; 
    billingUrl?: string; 
  } | null>(null);

  React.useEffect(() => {
    const fetchRecentSheets = async () => {
      if (googleUser) {
        const configDoc = doc(db, 'users', googleUser.uid, 'config', 'recentSheets');
        const docSnap = await getDoc(configDoc);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRecentSheets({
            income: data.income || (incomeSheetId ? [incomeSheetId] : []),
            billing: data.billing || (billingSheetId ? [billingSheetId] : [])
          });
        } else {
          // Fallback to local
          const savedIncome = localStorage.getItem('pp_recent_income_sheets');
          const savedBilling = localStorage.getItem('pp_recent_billing_sheets');
          setRecentSheets({
            income: savedIncome ? JSON.parse(savedIncome) : (incomeSheetId ? [incomeSheetId] : []),
            billing: savedBilling ? JSON.parse(savedBilling) : (billingSheetId ? [billingSheetId] : [])
          });
        }
      } else {
        // Not logged in, use local
        const savedIncome = localStorage.getItem('pp_recent_income_sheets');
        const savedBilling = localStorage.getItem('pp_recent_billing_sheets');
        setRecentSheets({
          income: savedIncome ? JSON.parse(savedIncome) : (incomeSheetId ? [incomeSheetId] : []),
          billing: savedBilling ? JSON.parse(savedBilling) : (billingSheetId ? [billingSheetId] : [])
        });
      }
    };
    fetchRecentSheets();
    setManualIncomeUrl(incomeSheetId || '');
    setManualBillingUrl(billingSheetId || '');
  }, [isOpen, incomeSheetId, billingSheetId, googleUser, db]);

  if (!isOpen) return null;

  const currentSheetUrl = activeTab === 'income'
    ? (incomeSheetId ? `https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit` : DEFAULT_SHEET_INCOME)
    : (billingSheetId ? `https://docs.google.com/spreadsheets/d/${billingSheetId}/edit` : DEFAULT_SHEET_BILLING);

  // Convert standard /edit link to preview/pubhtml if embedding
  const embedUrl = currentSheetUrl.includes('/edit')
    ? currentSheetUrl.replace(/\/edit.*$/, '/preview')
    : currentSheetUrl;

  const handleCreateFolderSheets = async () => {
    if (!googleAccessToken) {
      if (onGoogleSignIn) onGoogleSignIn();
      return;
    }

    setIsExporting(true);
    setCreateMsg(null);

    const res = await createFolderSheetsSeparatedByProjects(
      googleAccessToken,
      projects,
      transactions,
      billingItems,
      TARGET_DRIVE_FOLDER_ID
    );

    setIsExporting(false);

    if (res.success && res.incomeSheetUrl && res.billingSheetUrl) {
      setCreateMsg({
        success: true,
        msg: `สร้าง 2 ไฟล์ Google Sheets แยกตามโครงการ ในโฟลเดอร์ Google Drive สำเร็จแล้ว!`,
        incomeUrl: res.incomeSheetUrl,
        billingUrl: res.billingSheetUrl
      });

      if (onSheetsCreated && res.incomeSheetId && res.billingSheetId) {
        onSheetsCreated(res.incomeSheetUrl, res.billingSheetUrl, res.incomeSheetId, res.billingSheetId, res.projectUrls);
      }
    } else {
      setCreateMsg({
        success: false,
        msg: res.message || 'ไม่สามารถสร้างไฟล์ในโฟลเดอร์ Google Drive ได้'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-[95vw] max-w-[1600px] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/90 border-b border-slate-700 gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-950 rounded-xl border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Google Sheets Viewer & Drive Integrator
              </h3>
              <p className="text-xs text-slate-400">
                แยกไฟล์วางบิลและรายรับรายจ่าย พร้อมแยกชีตตามชื่อโครงการ บันทึกอัตโนมัติลง Google Drive
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Project Selector Bar & Auto-Sync Notification */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-semibold">เลือกชีตที่ต้องการดู:</span>

            {/* Sheet Type Switcher */}
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 ml-1">
              <button
                onClick={() => setActiveTab('income')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeTab === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                รายรับ-รายจ่าย
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeTab === 'billing' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                การวางบิล
              </button>
            </div>

            {/* Direct Open in Google Sheets button */}
            <a
              href={currentSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2 py-1 rounded-lg transition-all shadow-sm ml-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>เปิดบน Sheets</span>
            </a>

            {/* Sync Pull Data Button */}
            {onPullFromSheets && (
              <button
                onClick={async () => {
                  setIsPulling(true);
                  await onPullFromSheets();
                  setIsPulling(false);
                }}
                disabled={isPulling}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-lg transition-all shadow-md active:scale-95 ml-1 disabled:opacity-50"
                title="ดึงข้อมูลล่าสุดที่แก้ไขบน Google Sheets มาอัปเดตในเว็บ"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                <span>{isPulling ? 'กำลังซิงค์...' : 'ดึงข้อมูลจาก Sheets'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg mt-2 sm:mt-0">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">ระบบบันทึกข้อมูลอัตโนมัติแยกตามชีตชื่อโครงการเมื่อกดบันทึก</span>
            <span className="sm:hidden">บันทึกอัตโนมัติ</span>
          </div>
        </div>

        {/* Create Msg Notification */}
        {createMsg && (
          <div className={`p-3 px-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
            createMsg.success ? 'bg-emerald-950 text-emerald-300 border-b border-emerald-500/30' : 'bg-red-950 text-red-300 border-b border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {createMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{createMsg.msg}</span>
            </div>
            <div className="flex items-center gap-2">
              {createMsg.incomeUrl && (
                <a
                  href={createMsg.incomeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-400"
                >
                  <span>เปิดชีตรายรับรายจ่าย</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {createMsg.billingUrl && (
                <a
                  href={createMsg.billingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-500 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-400"
                >
                  <span>เปิดชีตการวางบิล</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Embedded Iframe Preview */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center p-6 text-center">
          {embedUrl ? (
            <div className="w-full h-full relative flex flex-col">
              <iframe
                src={embedUrl}
                title="Google Sheets Live Frame"
                className="w-full flex-1 border-0"
                allow="autoplay; encrypted-media"
              />
              <div className="bg-slate-900 border-t border-slate-800 p-2 text-left flex items-center justify-between text-xs text-slate-400">
                <span>หากต้องการเปลี่ยนลิงก์ Google Sheet เดิม สามารถวางลิงก์ใหม่ได้ที่นี่</span>
                <details className="cursor-pointer">
                  <summary className="text-amber-400 font-bold hover:underline">🔗 เชื่อมต่อ Sheet เดิม / เปลี่ยนลิงก์</summary>
                  <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-700 flex flex-col gap-2 w-80">
                    <input 
                      type="text" 
                      value={manualIncomeUrl}
                      onChange={(e) => setManualIncomeUrl(e.target.value)}
                      placeholder="ลิงก์ Sheet รายรับ-รายจ่าย..."
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                      list="recent-income"
                    />
                    <datalist id="recent-income">
                      {recentSheets.income.map(id => <option key={id} value={id} />)}
                    </datalist>
                    <input 
                      type="text" 
                      value={manualBillingUrl}
                      onChange={(e) => setManualBillingUrl(e.target.value)}
                      placeholder="ลิงก์ Sheet การวางบิล..."
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                      list="recent-billing"
                    />
                    <datalist id="recent-billing">
                      {recentSheets.billing.map(id => <option key={id} value={id} />)}
                    </datalist>
                    <button
                      onClick={() => {
                        if (onUpdateSheetIds && (manualIncomeUrl || manualBillingUrl)) {
                          onUpdateSheetIds(manualIncomeUrl, manualBillingUrl);
                          if (manualIncomeUrl || manualBillingUrl) {
                            const newIncomeSheets = manualIncomeUrl 
                              ? [...new Set([manualIncomeUrl, ...recentSheets.income])].slice(0, 5)
                              : recentSheets.income;
                            const newBillingSheets = manualBillingUrl
                              ? [...new Set([manualBillingUrl, ...recentSheets.billing])].slice(0, 5)
                              : recentSheets.billing;
                            
                            setRecentSheets({ income: newIncomeSheets, billing: newBillingSheets });
  
                            if (googleUser) {
                              setDoc(doc(db, 'users', googleUser.uid, 'config', 'recentSheets'), {
                                income: newIncomeSheets,
                                billing: newBillingSheets
                              }, { merge: true });
                            }
                            
                            // Still save locally for fallback
                            localStorage.setItem('pp_recent_income_sheets', JSON.stringify(newIncomeSheets));
                            localStorage.setItem('pp_recent_billing_sheets', JSON.stringify(newBillingSheets));
                          }
                          setCreateMsg({ success: true, msg: 'อัปเดตลิงก์ Google Sheet สำเร็จแล้ว!' });
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1 rounded text-[11px]"
                    >
                      บันทึก Sheet นี้
                    </button>
                  </div>
                </details>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 max-w-md mx-auto p-4">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-50" />
              <h3 className="text-lg font-bold text-slate-300 mb-2">ยังไม่มีการเชื่อมต่อ Google Sheets</h3>
              <p className="text-sm mb-4">
                คุณสามารถสร้างไฟล์ใหม่ใน Google Drive หรือนำลิงก์ Google Sheet เดิมที่เคยทำไว้มาเชื่อมต่อได้ทันที
              </p>
              
              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={handleCreateFolderSheets}
                  disabled={isExporting}
                  className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 mx-auto w-full"
                >
                  <FolderPlus className="w-5 h-5" />
                  <span>{isExporting ? 'กำลังสร้างไฟล์ใน Drive...' : '📁 สร้างไฟล์ใหม่และเชื่อมต่อ Sheets'}</span>
                </button>

                <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-left">
                  <h4 className="text-xs font-bold text-amber-400 mb-2">🔗 ใช้ Google Sheet เดิม (จาก AI Studio หรือ Drive)</h4>
                  <div className="space-y-2 mb-2">
                    <input 
                      type="text" 
                      value={manualIncomeUrl}
                      onChange={(e) => setManualIncomeUrl(e.target.value)}
                      placeholder="วางลิงก์ Sheet รายรับ-รายจ่าย..."
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      list="recent-income"
                    />
                    <datalist id="recent-income">
                      {recentSheets.income.map(id => <option key={id} value={id} />)}
                    </datalist>
                    <input 
                      type="text" 
                      value={manualBillingUrl}
                      onChange={(e) => setManualBillingUrl(e.target.value)}
                      placeholder="วางลิงก์ Sheet การวางบิล..."
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      list="recent-billing"
                    />
                    <datalist id="recent-billing">
                      {recentSheets.billing.map(id => <option key={id} value={id} />)}
                    </datalist>
                  </div>
                  <button
                    onClick={() => {
                      if (onUpdateSheetIds && (manualIncomeUrl || manualBillingUrl)) {
                        onUpdateSheetIds(manualIncomeUrl, manualBillingUrl);
                        if (manualIncomeUrl || manualBillingUrl) {
                          const newIncomeSheets = manualIncomeUrl 
                            ? [...new Set([manualIncomeUrl, ...recentSheets.income])].slice(0, 5)
                            : recentSheets.income;
                          const newBillingSheets = manualBillingUrl
                            ? [...new Set([manualBillingUrl, ...recentSheets.billing])].slice(0, 5)
                            : recentSheets.billing;
                          
                          setRecentSheets({ income: newIncomeSheets, billing: newBillingSheets });

                          if (googleUser) {
                            setDoc(doc(db, 'users', googleUser.uid, 'config', 'recentSheets'), {
                              income: newIncomeSheets,
                              billing: newBillingSheets
                            }, { merge: true });
                          }
                          
                          // Still save locally for fallback
                          localStorage.setItem('pp_recent_income_sheets', JSON.stringify(newIncomeSheets));
                          localStorage.setItem('pp_recent_billing_sheets', JSON.stringify(newBillingSheets));
                        }
                        setCreateMsg({ success: true, msg: 'อัปเดตลิงก์ Google Sheet สำเร็จแล้ว!' });
                      }
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-xs transition-all"
                  >
                    เชื่อมต่อ Sheet เดิมนี้
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

