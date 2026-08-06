import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  Building2, 
  Smartphone, 
  Bell, 
  ExternalLink,
  Plus,
  Users,
  Sliders
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';
import { 
  Project, 
  Transaction, 
  BillingItem, 
  BillingStatus 
} from './types';
import { 
  INITIAL_PROJECTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_BILLING_ITEMS,
  DEFAULT_SHEET_INCOME,
  DEFAULT_SHEET_BILLING
} from './data/mockData';
import { HeaderBanner } from './components/HeaderBanner';
import { MobileQuickForm } from './components/MobileQuickForm';
import { MonthlyDashboard } from './components/MonthlyDashboard';
import { TransactionList } from './components/TransactionList';
import { BillingManager } from './components/BillingManager';
import { ProjectManager } from './components/ProjectManager';
import { LaborWagesManager } from './components/LaborWagesManager';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { BillingPdfModal } from './components/BillingPdfModal';
import { TransactionPdfModal } from './components/TransactionPdfModal';
import { SheetPasswordModal } from './components/SheetPasswordModal';
import { initAuth, googleSignIn, logoutGoogle, getAccessToken, db } from './lib/firebase';
import { 
  autoSyncTransactionToSheet, 
  autoSyncBillingToSheet, 
  deleteSheetTab, 
  ensureSheetTabExists, 
  updateProjectDetailsSheet,
  saveProjectsToProjectListSheet,
  updateBillingStatusInSheet, 
  deleteTransactionInSheet, 
  deleteBillingInSheet,
  pullDataFromGoogleSheets,
  extractSpreadsheetId,
  createNewGoogleSheet
} from './lib/googleSheetsService';

const DEFAULT_EXPENSE_CATS = [
  'ค่าวัสดุก่อสร้าง',
  'ค่าแรงคนงาน',
  'ค่าน้ำมัน',
  'ค่าเดินทาง',
  'ค่าทางด่วน',
  'ค่าเครื่องจักรและอุปกรณ์',
  'ค่าซ่อมเครื่องมือ'
];

const DEFAULT_INCOME_CATS = [
  'เงินสำรองหน้างาน'
];
import { User } from 'firebase/auth';

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'billing' | 'projects' | 'labor-wages'>('dashboard');

  // Firebase Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(getAccessToken());

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      alert(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleAccessToken(null);
  };

  // Core Data States (Initialized from localStorage or mock data)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pp_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('pp_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [billingItems, setBillingItems] = useState<BillingItem[]>(() => {
    const saved = localStorage.getItem('pp_billing');
    return saved ? JSON.parse(saved) : INITIAL_BILLING_ITEMS;
  });

  // Category States
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('pp_expense_categories');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        const hasOldDefaults = parsed.includes('ค่าแรงงาน') || parsed.includes('ค่าผู้รับเหมาช่วง') || parsed.includes('ค่าสาธารณูปโภค/เชื้อเพลิง');
        if (!hasOldDefaults) {
          if (!parsed.includes('ค่าแรงคนงาน')) {
            parsed.splice(1, 0, 'ค่าแรงคนงาน');
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_EXPENSE_CATS;
  });

  const [incomeCategories, setIncomeCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('pp_income_categories');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        const hasOldDefaults = parsed.includes('ค่างวดงานก้าวหน้า') || parsed.includes('เงินมัดจำ/เบิกล่วงหน้า') || parsed.includes('รายรับอื่นๆ');
        if (!hasOldDefaults) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_INCOME_CATS;
  });

  // Google Folder Sheets Tracking
  const DEFAULT_INCOME_SHEET_ID = '1hx4fB50VHf2ZhgIWCnQBFdvrKbFL0hwXwl1JnTyT9nM';
  const DEFAULT_BILLING_SHEET_ID = '11tcrfaiDgg_BNLUKtT3qgGmRSoT26GCQ0wJv3zXmKUE';

  const [incomeSheetId, setIncomeSheetId] = useState<string | null>(
    () => localStorage.getItem('pp_income_sheet_id') || DEFAULT_INCOME_SHEET_ID
  );
  const [billingSheetId, setBillingSheetId] = useState<string | null>(
    () => localStorage.getItem('pp_billing_sheet_id') || DEFAULT_BILLING_SHEET_ID
  );

  // Modal States
  const [isMobileFormOpen, setIsMobileFormOpen] = useState<boolean>(false);
  const [mobileFormInitialTab, setMobileFormInitialTab] = useState<'income' | 'expense' | 'billing'>('expense');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isSheetViewerOpen, setIsSheetViewerOpen] = useState<boolean>(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isTxPdfModalOpen, setIsTxPdfModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [selectedBillingForPdf, setSelectedBillingForPdf] = useState<BillingItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [lastPulledAt, setLastPulledAt] = useState<string | null>(null);

  const isAdmin = googleUser?.email?.trim().toLowerCase() === 'ppconcc4@gmail.com';

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('pp_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('pp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('pp_billing', JSON.stringify(billingItems));
  }, [billingItems]);

  useEffect(() => {
    localStorage.setItem('pp_expense_categories', JSON.stringify(expenseCategories));
    if (isAdmin) {
      setDoc(doc(db, 'global', 'config'), { expenseCategories }, { merge: true });
    }
  }, [expenseCategories, isAdmin]);

  useEffect(() => {
    localStorage.setItem('pp_income_categories', JSON.stringify(incomeCategories));
    if (isAdmin) {
      setDoc(doc(db, 'global', 'config'), { incomeCategories }, { merge: true });
    }
  }, [incomeCategories, isAdmin]);

  useEffect(() => {
    if (incomeSheetId) {
      localStorage.setItem('pp_income_sheet_id', incomeSheetId);
      if (isAdmin) {
        setDoc(doc(db, 'global', 'config'), { incomeSheetId }, { merge: true });
      }
    }
  }, [incomeSheetId, isAdmin]);

  useEffect(() => {
    if (billingSheetId) {
      localStorage.setItem('pp_billing_sheet_id', billingSheetId);
      if (isAdmin) {
        setDoc(doc(db, 'global', 'config'), { billingSheetId }, { merge: true });
      }
    }
  }, [billingSheetId, isAdmin]);

  // Load User Configuration from Firestore
  useEffect(() => {
    const loadConfig = async () => {
      if (!googleUser) {
        setIsLoadingConfig(false);
        return;
      }
      setIsLoadingConfig(true);
      try {
        let configData: any = {};
        const globalConfigDoc = doc(db, 'global', 'config');
        const globalSnap = await getDoc(globalConfigDoc);
        
        if (globalSnap.exists()) {
          configData = globalSnap.data();
          console.log("Global config loaded:", configData);
        } else {
          // Migration from user config
          const configDoc = doc(db, 'users', googleUser.uid, 'config', 'sheets');
          const catDoc = doc(db, 'users', googleUser.uid, 'config', 'categories');
          const [docSnap, catSnap] = await Promise.all([getDoc(configDoc), getDoc(catDoc)]);
          if (docSnap.exists()) {
            configData = { ...configData, ...docSnap.data() };
          }
          if (catSnap.exists()) {
            configData = { ...configData, ...catSnap.data() };
          }
          if (isAdmin && Object.keys(configData).length > 0) {
            await setDoc(globalConfigDoc, configData, { merge: true });
          }
        }
        
        if (configData.incomeSheetId) {
          setIncomeSheetId(configData.incomeSheetId);
          localStorage.setItem('pp_income_sheet_id', configData.incomeSheetId);
        }
        if (configData.billingSheetId) {
          setBillingSheetId(configData.billingSheetId);
          localStorage.setItem('pp_billing_sheet_id', configData.billingSheetId);
        }
        
        if (configData.expenseCategories) {
          setExpenseCategories(configData.expenseCategories);
          localStorage.setItem('pp_expense_categories', JSON.stringify(configData.expenseCategories));
        }
        if (configData.incomeCategories) {
          setIncomeCategories(configData.incomeCategories);
          localStorage.setItem('pp_income_categories', JSON.stringify(configData.incomeCategories));
        }
      } catch (e: any) {
        console.warn("Firestore offline or unavailable, falling back to local storage:", e.message || e);
        // Fallback to local storage if offline
        const localIncomeSheetId = localStorage.getItem('pp_income_sheet_id');
        const localBillingSheetId = localStorage.getItem('pp_billing_sheet_id');
        const localExpenseCategories = localStorage.getItem('pp_expense_categories');
        const localIncomeCategories = localStorage.getItem('pp_income_categories');

        if (localIncomeSheetId) setIncomeSheetId(localIncomeSheetId);
        if (localBillingSheetId) setBillingSheetId(localBillingSheetId);
        if (localExpenseCategories) {
          try { setExpenseCategories(JSON.parse(localExpenseCategories)); } catch {}
        }
        if (localIncomeCategories) {
          try { setIncomeCategories(JSON.parse(localIncomeCategories)); } catch {}
        }
      } finally {
        setIsLoadingConfig(false);
      }
    };
    loadConfig();
  }, [googleUser, isAdmin]);

  // Auto-Pull Data once config is loaded and token is available
  const [hasAutoPulled, setHasAutoPulled] = useState(false);
  useEffect(() => {
    if (!isLoadingConfig && (incomeSheetId || billingSheetId) && googleAccessToken && !hasAutoPulled) {
      console.log("Auto-pulling data from Google Sheets...");
      setHasAutoPulled(true);
      handlePullDataFromGoogleSheets(true); // Silent pull on load
    }
  }, [isLoadingConfig, incomeSheetId, billingSheetId, googleAccessToken, hasAutoPulled]);

  // Category Management Handlers
  const handleAddCategory = (type: 'income' | 'expense', name: string) => {
    if (type === 'expense') {
      setExpenseCategories(prev => [...prev, name]);
    } else {
      setIncomeCategories(prev => [...prev, name]);
    }
  };

  const handleEditCategory = (type: 'income' | 'expense', oldName: string, newName: string) => {
    if (type === 'expense') {
      setExpenseCategories(prev => prev.map(c => c === oldName ? newName : c));
    } else {
      setIncomeCategories(prev => prev.map(c => c === oldName ? newName : c));
    }

    // Automatically update category name in existing transactions
    setTransactions(prev => prev.map(tx => {
      if (tx.type === type && tx.category === oldName) {
        return { ...tx, category: newName };
      }
      return tx;
    }));
  };

  const handleDeleteCategory = (type: 'income' | 'expense', name: string) => {
    if (type === 'expense') {
      setExpenseCategories(prev => prev.filter(c => c !== name));
    } else {
      setIncomeCategories(prev => prev.filter(c => c !== name));
    }
  };

  const handleResetCategories = () => {
    setExpenseCategories(DEFAULT_EXPENSE_CATS);
    setIncomeCategories(DEFAULT_INCOME_CATS);
  };

  // Callback when user creates sheets in Google Drive folder
  const handleSheetsCreated = (incomeUrl: string, billingUrl: string, incomeId: string, billingId: string, projectUrls?: Record<string, { incomeUrl: string, billingUrl: string }>) => {
    setIncomeSheetId(incomeId);
    setBillingSheetId(billingId);
    localStorage.setItem('pp_income_sheet_id', incomeId);
    localStorage.setItem('pp_billing_sheet_id', billingId);

    if (projectUrls) {
      setProjects(prev => prev.map(p => {
        const urls = projectUrls[p.id];
        if (urls) {
          return { ...p, sheetUrlIncome: urls.incomeUrl, sheetUrlBilling: urls.billingUrl };
        }
        return p;
      }));
    } else {
      // Fallback
      setProjects(prev => prev.map(p => ({
        ...p,
        sheetUrlIncome: incomeUrl,
        sheetUrlBilling: billingUrl
      })));
    }
  };

  // Filter active data
  const activeProjects = projects.filter(p => p.status !== 'completed');
  const activeProjectIds = new Set(activeProjects.map(p => p.id));
  const activeTransactions = transactions.filter(t => activeProjectIds.has(t.projectId));
  const activeBillingItems = billingItems.filter(b => activeProjectIds.has(b.projectId));

  // Overdue Billing Items Count (only active)
  const overdueCount = activeBillingItems.filter(b => b.status === 'overdue').length;

  // Sync / Pull Data from Google Sheets Handler
  const handlePullDataFromGoogleSheets = async (
    overrideIncomeId?: string | boolean,
    overrideBillingId?: string,
    silentParam = false
  ) => {
    let silent = silentParam;
    let customIncomeId: string | undefined;
    if (typeof overrideIncomeId === 'boolean') {
      silent = overrideIncomeId;
    } else {
      customIncomeId = overrideIncomeId;
    }

    let token = googleAccessToken;
    if (!token) {
      token = getAccessToken() || localStorage.getItem('google_access_token');
    }
    if (!token) {
      if (!silent) await handleGoogleSignIn();
      token = googleAccessToken || localStorage.getItem('google_access_token');
    }
    if (!token) {
      if (!silent) alert('กรุณาเข้าสู่ระบบด้วย Google เพื่อดึงข้อมูลจาก Google Sheets');
      return;
    }

    const targetIncomeId = customIncomeId || incomeSheetId || localStorage.getItem('pp_income_sheet_id') || DEFAULT_INCOME_SHEET_ID;
    const targetBillingId = overrideBillingId || billingSheetId || localStorage.getItem('pp_billing_sheet_id') || DEFAULT_BILLING_SHEET_ID;

    // Save and update state & local storage & Firestore config
    setIncomeSheetId(targetIncomeId);
    setBillingSheetId(targetBillingId);
    localStorage.setItem('pp_income_sheet_id', targetIncomeId);
    localStorage.setItem('pp_billing_sheet_id', targetBillingId);
    if (isAdmin) {
      setDoc(doc(db, 'global', 'config'), { incomeSheetId: targetIncomeId, billingSheetId: targetBillingId }, { merge: true });
    }

    let res = await pullDataFromGoogleSheets(token, targetIncomeId, targetBillingId, projects);
    if (!res.success && res.message === 'UNAUTHORIZED') {
      // Token has expired. If NOT silent, try to re-authenticate with Google.
      if (!silent) {
        try {
          const authRes = await googleSignIn();
          if (authRes?.accessToken) {
            token = authRes.accessToken;
            setGoogleUser(authRes.user);
            setGoogleAccessToken(token);
            // Retry pulling data
            res = await pullDataFromGoogleSheets(token, targetIncomeId, targetBillingId, projects);
          }
        } catch (authErr: any) {
          console.error("Re-authentication failed:", authErr);
          // Clean up
          localStorage.removeItem('google_access_token');
          setGoogleAccessToken(null);
          setGoogleUser(null);
          alert(`เซสชัน Google ของคุณหมดอายุและไม่สามารถเชื่อมต่อใหม่ได้:\n${authErr.message || authErr}`);
          return;
        }
      } else {
        // Silent automatic pull failed due to expired token. Clear token silently and return.
        localStorage.removeItem('google_access_token');
        setGoogleAccessToken(null);
        setGoogleUser(null);
        return;
      }
    }

    if (res.success) {
      if (res.projects) {
        setProjects(res.projects.length > 0 ? res.projects : projects);
        localStorage.setItem('pp_projects', JSON.stringify(res.projects.length > 0 ? res.projects : projects));
      }
      if (res.transactions) {
        setTransactions(res.transactions);
        localStorage.setItem('pp_transactions', JSON.stringify(res.transactions));
      }
      if (res.billingItems) {
        setBillingItems(res.billingItems);
        localStorage.setItem('pp_billing', JSON.stringify(res.billingItems));
      }

      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setLastPulledAt(nowStr);

      if (!silent) {
        setToastMessage(`บันทึก ID ชีตเรียบร้อย! ดึงข้อมูลและแสดงรายการปัจจุบันแล้ว`);
        alert(`ดึงข้อมูลสำเร็จ!\n• ชีตรายรับรายจ่าย ID: ${targetIncomeId}\n• ชีตวางบิล ID: ${targetBillingId}\n\n${res.message}`);
      }
    } else {
      if (!silent) alert(res.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้');
    }
  };

  // Trigger password prompt before pulling data from sheets
  const handleTriggerPullFromSheets = () => {
    if (!googleUser) {
      alert('กรุณาเข้าสู่ระบบด้วย Google ก่อนดึงข้อมูลจาก Google Sheets');
      return;
    }
    setIsPasswordModalOpen(true);
  };

  const handleUpdateSheetIds = (incomeInput: string, billingInput: string) => {
    if (incomeInput) {
      const id = extractSpreadsheetId(incomeInput) || incomeInput.trim();
      setIncomeSheetId(id);
      localStorage.setItem('pp_income_sheet_id', id);
    }
    if (billingInput) {
      const id = extractSpreadsheetId(billingInput) || billingInput.trim();
      setBillingSheetId(id);
      localStorage.setItem('pp_billing_sheet_id', id);
    }
  };

  // Add Transaction Handler with Auto-Sync
  const handleAddTransaction = (newTxData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!googleUser) {
      setToastMessage('กรุณาเข้าสู่ระบบก่อนบันทึกรายการ');
      return;
    }
    const finalPayerOrPayee = newTxData.category === 'ค่าแรงคนงาน' 
      ? 'ค่าแรงคนงาน' 
      : newTxData.payerOrPayee;

    const newTx: Transaction = {
      ...newTxData,
      payerOrPayee: finalPayerOrPayee,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);

    // Auto-sync to Google Sheet tab
    const targetSheetId = incomeSheetId || localStorage.getItem('pp_income_sheet_id');
    if (googleAccessToken && targetSheetId) {
      const project = projects.find(p => p.id === newTx.projectId);
      const projectName = project ? project.name : 'โครงการทั่วไป';
      autoSyncTransactionToSheet(googleAccessToken, targetSheetId, projectName, newTx)
        .then(res => {
          if (res.success) {
            console.log(`Auto-synced transaction to Google Sheet project tab: ${projectName}`);
          }
        })
        .catch(err => console.error('Auto sync transaction error:', err));
    }
  };

  // Add Billing Item Handler with Auto-Sync
  const handleAddBilling = (newBillingData: Omit<BillingItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!googleUser) {
      setToastMessage('กรุณาเข้าสู่ระบบก่อนบันทึกใบวางบิล');
      return;
    }
    const newBilling: BillingItem = {
      ...newBillingData,
      id: `bill-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setBillingItems(prev => [newBilling, ...prev]);

    // Auto-sync to Google Sheet tab
    const targetSheetId = billingSheetId || localStorage.getItem('pp_billing_sheet_id');
    if (googleAccessToken && targetSheetId) {
      const project = projects.find(p => p.id === newBilling.projectId);
      const projectName = project ? project.name : (newBilling.projectName || 'โครงการทั่วไป');
      autoSyncBillingToSheet(googleAccessToken, targetSheetId, projectName, newBilling)
        .then(res => {
          if (res.success) {
            console.log(`Auto-synced billing to Google Sheet project tab: ${projectName}`);
          }
        })
        .catch(err => console.error('Auto sync billing error:', err));
    }
  };

  // Update Billing Status Handler
  const handleUpdateBillingStatus = (id: string, newStatus: BillingStatus, newPaidDate?: string) => {
    let updatedItem: BillingItem | null = null;
    
    setBillingItems(prev => prev.map(item => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          paidDate: newPaidDate ? newPaidDate : (newStatus === 'paid' ? (item.paidDate || new Date().toISOString().split('T')[0]) : item.paidDate)
        };
        return updatedItem;
      }
      return item;
    }));
    
    // Auto-sync status to Google Sheet
    setTimeout(() => {
      if (updatedItem && googleAccessToken) {
        const targetSheetId = billingSheetId || localStorage.getItem('pp_billing_sheet_id');
        if (targetSheetId) {
          const project = projects.find(p => p.id === updatedItem!.projectId);
          const projectName = project ? project.name : (updatedItem!.projectName || 'โครงการทั่วไป');
          updateBillingStatusInSheet(
            googleAccessToken, 
            targetSheetId, 
            projectName, 
            updatedItem!.invoiceNo, 
            newStatus,
            updatedItem!.paidDate
          ).then(res => {
            if (res.success) {
              console.log(`Auto-synced billing status to Google Sheet project tab: ${projectName}`);
            }
          }).catch(err => console.error('Auto sync billing status error:', err));
        }
      }
    }, 0);
  };

  // Edit Transaction Handler
  const handleEditTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    setToastMessage('อัปเดตรายการเรียบร้อยแล้ว');
  };

  // Delete Handlers
  const handleDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    if (txToDelete && googleAccessToken) {
      const targetSheetId = incomeSheetId || localStorage.getItem('pp_income_sheet_id');
      if (targetSheetId) {
        const project = projects.find(p => p.id === txToDelete.projectId);
        const projectName = project ? project.name : 'โครงการทั่วไป';
        deleteTransactionInSheet(googleAccessToken, targetSheetId, projectName, txToDelete)
          .catch(err => console.error('Error deleting transaction in sheet:', err));
      }
    }
  };

  const handleDeleteBillingItem = (id: string) => {
    const billingToDelete = billingItems.find(b => b.id === id);
    setBillingItems(prev => prev.filter(b => b.id !== id));
    
    if (billingToDelete && googleAccessToken) {
      const targetSheetId = billingSheetId || localStorage.getItem('pp_billing_sheet_id');
      if (targetSheetId) {
        const project = projects.find(p => p.id === billingToDelete.projectId);
        const projectName = project ? project.name : (billingToDelete.projectName || 'โครงการทั่วไป');
        deleteBillingInSheet(googleAccessToken, targetSheetId, projectName, billingToDelete.invoiceNo)
          .catch(err => console.error('Error deleting billing in sheet:', err));
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (projects.length <= 1) {
      alert('ไม่สามารถลบโครงการได้ ต้องมีอย่างน้อย 1 โครงการในระบบ');
      return;
    }
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    if (googleAccessToken) {
      const tabName = proj.name.slice(0, 80);
      const incId = incomeSheetId || localStorage.getItem('pp_income_sheet_id');
      const bilId = billingSheetId || localStorage.getItem('pp_billing_sheet_id');

      if (incId) {
        deleteSheetTab(googleAccessToken, incId, tabName).catch(err => console.error('Error deleting income tab:', err));
      }
      if (bilId) {
        deleteSheetTab(googleAccessToken, bilId, tabName).catch(err => console.error('Error deleting billing tab:', err));
      }
    }

    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);

    // Update Project Details sheet & รายชื่อโครงการ
    if (googleAccessToken) {
      const incId = incomeSheetId || localStorage.getItem('pp_income_sheet_id');
      if (incId) {
        updateProjectDetailsSheet(googleAccessToken, incId, updatedProjects).catch(err => console.error('Error updating project details after deletion:', err));
      }
      saveProjectsToProjectListSheet(googleAccessToken, updatedProjects).catch(err => console.error('Error updating project list sheet after deletion:', err));
    }
  };

  // Add Project Handler
  const handleAddProject = (newProjData: Omit<Project, 'id'>) => {
    if (!googleUser) {
      setToastMessage('กรุณาเข้าสู่ระบบก่อนเพิ่มโครงการ');
      return;
    }
    const isDuplicate = projects.some(
      p => p.code.trim().toLowerCase() === newProjData.code.trim().toLowerCase()
    );
    if (isDuplicate) {
      setToastMessage(`รหัสโครงการ "${newProjData.code}" ซ้ำในระบบ`);
      alert(`ไม่สามารถเพิ่มโครงการได้: รหัสโครงการ "${newProjData.code}" มีในระบบแล้ว`);
      return;
    }

    const newProj: Project = {
      ...newProjData,
      id: `proj-${Date.now()}`
    };

    const updatedProjects = [...projects, newProj];

    if (googleAccessToken) {
      const tabName = newProj.name.slice(0, 80);
      const incId = incomeSheetId || localStorage.getItem('pp_income_sheet_id');
      const bilId = billingSheetId || localStorage.getItem('pp_billing_sheet_id');

      const txHeader = ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด/รายการ', 'จำนวนเงิน (บาท)', 'รหัสโครงการ', 'ผู้ชำระ/ผู้รับเงิน', 'เลขที่เอกสาร', 'วิธีชำระ'];
      const billingHeader = ['เลขที่ใบวางบิล', 'รหัสโครงการ', 'ผู้ว่าจ้าง', 'งวดงาน', 'มูลค่ารวม (บาท)', 'VAT 7%', 'หัก ณ ที่จ่าย 3%', 'ยอดรับสุทธิ (บาท)', 'วันวางบิล', 'กำหนดชำระ', 'สถานะ', 'วันที่ชำระ'];

      if (incId) {
        ensureSheetTabExists(googleAccessToken, incId, tabName, txHeader).then(gid => {
          if (gid !== null) {
            handleUpdateProject(newProj.id, { sheetUrlIncome: `https://docs.google.com/spreadsheets/d/${incId}/edit#gid=${gid}` });
          }
        }).catch(err => console.error('Error creating income tab:', err));
      }
      if (bilId) {
        ensureSheetTabExists(googleAccessToken, bilId, tabName, billingHeader).then(gid => {
          if (gid !== null) {
            handleUpdateProject(newProj.id, { sheetUrlBilling: `https://docs.google.com/spreadsheets/d/${bilId}/edit#gid=${gid}` });
          }
        }).catch(err => console.error('Error creating billing tab:', err));
      }
      
      // Update Project Details sheet & รายชื่อโครงการ
      updateProjectDetailsSheet(googleAccessToken, incId, updatedProjects).catch(err => console.error('Error updating project details:', err));
      saveProjectsToProjectListSheet(googleAccessToken, updatedProjects).catch(err => console.error('Error updating project list sheet:', err));
    }

    setProjects(updatedProjects);
  };

  const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
    if (updates.code) {
      const isDuplicate = projects.some(
        p => p.id !== projectId && p.code.trim().toLowerCase() === updates.code.trim().toLowerCase()
      );
      if (isDuplicate) {
        setToastMessage(`รหัสโครงการ "${updates.code}" ซ้ำในระบบ`);
        alert(`ไม่สามารถแก้ไขโครงการได้: รหัสโครงการ "${updates.code}" มีในระบบแล้ว`);
        return;
      }
    }

    setProjects(prev => {
      const updated = prev.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      );
      if (googleAccessToken) {
        saveProjectsToProjectListSheet(googleAccessToken, updated).catch(err => console.error('Error updating project list sheet:', err));
        
        const incId = incomeSheetId || localStorage.getItem('pp_income_sheet_id');
        if (incId) {
          updateProjectDetailsSheet(googleAccessToken, incId, updated).catch(err => console.error('Error updating project details:', err));
        }
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col">
      
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* 1. Top Header Banner with Company Logo */}
      <HeaderBanner
        onOpenMobileForm={() => {
          if (!googleUser) {
            alert('กรุณาลอคอินก่อนบันทึกรายการ');
            return;
          }
          setMobileFormInitialTab('expense'); 
          setIsMobileFormOpen(true);
        }}
        onOpenNewProject={() => {
          if (!googleUser) {
            alert('กรุณาลอคอินก่อนเพิ่มโครงการ');
            return;
          }
          setIsNewProjectModalOpen(true);
        }}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        overdueCount={overdueCount}
        googleUser={googleUser}
        isAdmin={isAdmin}
        lastPulledAt={lastPulledAt}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        incomeSheetId={incomeSheetId}
        billingSheetId={billingSheetId}
        onPullFromSheets={handleTriggerPullFromSheets}
        onOpenTxPdfModal={() => setIsTxPdfModalOpen(true)}
      />

      {/* 2. Primary Navigation Bar */}
      <nav className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>สรุปผลรายเดือน & กราฟ</span>
              </button>

              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === 'transactions'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>บัญชีรายรับ-รายจ่าย</span>
                <span className="bg-slate-950/40 px-1.5 py-0.5 rounded-full text-[10px]">
                  {activeTransactions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('billing')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === 'billing'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>หัวข้อการวางบิล</span>
                {overdueCount > 0 && (
                  <span className="bg-red-500 text-white font-extrabold px-1.5 py-0.2 rounded-full text-[10px]">
                    {overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === 'projects'
                    ? 'bg-purple-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>โครงการ & ชีตแต่ละงาน</span>
                <span className="bg-slate-950/40 px-1.5 py-0.5 rounded-full text-[10px]">
                  {projects.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('labor-wages')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === 'labor-wages'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>ค่าแรงคนงาน</span>
              </button>

            </div>

            {/* Desktop Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSheetViewerOpen(true)}
                className="flex items-center space-x-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>เปิดดูตัวอย่างชีต</span>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* 3. Main Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {activeTab === 'dashboard' && (
          <MonthlyDashboard
            projects={activeProjects}
            transactions={activeTransactions}
            billingItems={activeBillingItems}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={activeTransactions}
            projects={activeProjects}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onOpenMobileForm={() => {
              if (!googleUser) {
                alert('กรุณาลอคอินก่อนบันทึกรายการ');
                return;
              }
              setMobileFormInitialTab('expense'); 
              setIsMobileFormOpen(true);
            }}
            onOpenPdfModal={() => setIsTxPdfModalOpen(true)}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'billing' && (
          <BillingManager
            billingItems={activeBillingItems}
            projects={activeProjects}
            onUpdateBillingStatus={handleUpdateBillingStatus}
            onDeleteBillingItem={handleDeleteBillingItem}
            onOpenMobileForm={() => {
              if (!googleUser) {
                alert('กรุณาลอคอินก่อนออกใบวางบิล');
                return;
              }
              setMobileFormInitialTab('billing'); 
              setIsMobileFormOpen(true); 
            }}
            onOpenPdfModal={(item) => {
              setSelectedBillingForPdf(item || null);
              setIsPdfModalOpen(true);
            }}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'labor-wages' && (
          <LaborWagesManager googleUser={googleUser} />
        )}

        {activeTab === 'projects' && (
          <ProjectManager
            projects={projects}
            transactions={transactions}
            isOpenModal={isNewProjectModalOpen}
            onOpenModal={() => {
              if (!googleUser) {
                alert('กรุณาลอคอินก่อนเพิ่มโครงการ');
                return;
              }
              setIsNewProjectModalOpen(true);
            }}
            onCloseModal={() => setIsNewProjectModalOpen(false)}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
            onUpdateProject={handleUpdateProject}
            incomeSheetId={incomeSheetId}
            billingSheetId={billingSheetId}
            isAdmin={isAdmin}
          />
        )}

      </main>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="fixed bottom-5 right-5 sm:hidden z-40">
        <button
          onClick={() => {
            if (!googleUser) {
              alert('กรุณาลอคอินก่อนบันทึกรายการ');
              return;
            }
            setMobileFormInitialTab('expense'); 
            setIsMobileFormOpen(true);
          }}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 p-4 rounded-full shadow-2xl shadow-amber-400/40 border-2 border-slate-950 flex items-center justify-center active:scale-90 transition-transform"
          title="บันทึกรายการใหม่"
        >
          <Smartphone className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      <MobileQuickForm
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
        initialTab={mobileFormInitialTab}
        projects={activeProjects}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onAddTransaction={handleAddTransaction}
        onAddBilling={handleAddBilling}
        googleAccessToken={googleAccessToken}
        isAdmin={isAdmin}
      />

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetDefaults={handleResetCategories}
        isAdmin={isAdmin}
      />

      <GoogleSheetModal
        isOpen={isSheetViewerOpen}
        onClose={() => setIsSheetViewerOpen(false)}
        projects={projects}
        transactions={transactions}
        billingItems={billingItems}
        googleAccessToken={googleAccessToken}
        onGoogleSignIn={handleGoogleSignIn}
        onSheetsCreated={handleSheetsCreated}
        incomeSheetId={incomeSheetId}
        billingSheetId={billingSheetId}
        onPullFromSheets={handleTriggerPullFromSheets}
        onUpdateSheetIds={handleUpdateSheetIds}
        db={db}
        googleUser={googleUser}
      />

      <SheetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirmSuccess={async () => {
          const incId = '1hx4fB50VHf2ZhgIWCnQBFdvrKbFL0hwXwl1JnTyT9nM';
          const billId = '11tcrfaiDgg_BNLUKtT3qgGmRSoT26GCQ0wJv3zXmKUE';
          await handlePullDataFromGoogleSheets(incId, billId, false);
        }}
      />

      <BillingPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        billingItem={selectedBillingForPdf}
        allBillingItems={activeBillingItems}
        projects={projects}
      />

      <TransactionPdfModal
        isOpen={isTxPdfModalOpen}
        onClose={() => setIsTxPdfModalOpen(false)}
        transactions={activeTransactions}
        projects={projects}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 PP. CONSTRUCTION AND MANAGEMENT CO., LTD — บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมเนจเม้นท์ จำกัด</p>
          <div className="flex items-center space-x-3 text-[11px]">
            {incomeSheetId && (
              <a href={`https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                Google Sheet บัญชี
              </a>
            )}
            {incomeSheetId && billingSheetId && <span>•</span>}
            {billingSheetId && (
              <a href={`https://docs.google.com/spreadsheets/d/${billingSheetId}/edit`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                Google Sheet วางบิล
              </a>
            )}
          </div>
        </div>
      </footer>

    </div>
  );
}
