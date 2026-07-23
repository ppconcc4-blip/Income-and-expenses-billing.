import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Bell, 
  PlusCircle, 
  Building2, 
  ExternalLink,
  ShieldAlert,
  Smartphone,
  LogOut,
  UserCheck,
  Tag,
  RefreshCw
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DEFAULT_SHEET_INCOME, DEFAULT_SHEET_BILLING } from '../data/mockData';
import { PPLogo } from './PPLogo';

interface HeaderBannerProps {
  onOpenMobileForm: () => void;
  onOpenNewProject: () => void;
  onOpenCategoryManager?: () => void;
  overdueCount: number;
  googleUser: User | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  isLoggingIn?: boolean;
  incomeSheetId?: string | null;
  billingSheetId?: string | null;
  onPullFromSheets?: () => Promise<void>;
  isAdmin?: boolean;
  lastPulledAt?: string | null;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  onOpenMobileForm,
  onOpenNewProject,
  onOpenCategoryManager,
  overdueCount,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  isLoggingIn,
  incomeSheetId,
  billingSheetId,
  onPullFromSheets,
  isAdmin,
  lastPulledAt
}) => {
  const [isPulling, setIsPulling] = useState<boolean>(false);
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-xl overflow-hidden relative">
      {/* Blueprint background decoration pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"
      />
      
      {/* Company Header Banner Image / Vector Header */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Logo and Company Branding */}
          <div className="flex items-start sm:items-center space-x-4">
            {/* PP Construction Geometric Blue Logo */}
            <div className="relative shrink-0 bg-white p-2.5 rounded-2xl shadow-xl border border-slate-700/60 flex items-center justify-center group hover:scale-105 transition-transform">
              <PPLogo className="w-11 h-11" fillColor="#0a1a8c" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white mt-1">
                PP. CONSTRUCTION AND MANAGEMENT CO., LTD
              </h1>
              <p className="text-sm sm:text-base font-semibold text-amber-400 mt-0.5 flex items-center gap-2">
                <Building2 className="w-4 h-4 inline shrink-0" />
                บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมนเนจเม้นท์ จำกัด
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-blue-600 rounded-full mt-2" />
            </div>
          </div>

          {/* Action Header Controls & Direct Google Sheet Links */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Google Sign-in / Workspace Status */}
            {googleUser ? (
              <div className="flex items-center space-x-2 bg-slate-800/90 p-1.5 px-3 rounded-xl border border-emerald-500/40 text-xs">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt={googleUser.displayName || 'User'} className="w-6 h-6 rounded-full border border-emerald-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-emerald-300 text-[11px] truncate max-w-[120px]">
                    {googleUser.displayName || googleUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">เชื่อมต่อ Google Sheets แล้ว</span>
                </div>
                <button
                  onClick={onGoogleSignOut}
                  title="ออกจากระบบ Google"
                  className="p-1 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                disabled={isLoggingIn}
                className="gsi-material-button flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-md active:scale-95 border border-slate-200"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
              </button>
            )}

            {/* Direct Google Sheets Icon Buttons */}
            <div className="flex items-center space-x-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
              {incomeSheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="เปิด Google Sheets บัญชีรายรับ-รายจ่าย"
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-2 rounded-lg transition-all shadow-sm group"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">รายรับรายจ่าย</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}

              {billingSheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${billingSheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="เปิด Google Sheets ระบบการวางบิล"
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-2.5 py-2 rounded-lg transition-all shadow-sm group"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-100 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">วางบิล</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}

            {onPullFromSheets && (
                <button
                  onClick={async () => {
                    setIsPulling(true);
                    await onPullFromSheets();
                    setIsPulling(false);
                  }}
                  disabled={isPulling}
                  className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
                  title="ดึงข้อมูลล่าสุดที่แก้ไขบน Google Sheets มาอัปเดตในเว็บ"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">ดึงข้อมูลจาก Sheets</span>
                  <span className="md:hidden">Sync</span>
                </button>
              )}
            </div>

            {/* Manage Categories Button */}
            {onOpenCategoryManager && isAdmin && (
              <button
                onClick={onOpenCategoryManager}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                title="เพิ่ม แก้ไข หรือลบหมวดหมู่รายรับ-รายจ่าย"
              >
                <Tag className="w-4 h-4 text-amber-400" />
                <span>จัดการหมวดหมู่</span>
              </button>
            )}

            {/* Add Project Button */}
            {isAdmin && (
              <button
                onClick={onOpenNewProject}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>เพิ่มโครงการใหม่</span>
              </button>
            )}

            {/* Easy Mobile Form Launcher */}
            {isAdmin && (
              <button
                onClick={onOpenMobileForm}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>+ บันทึกรายการใหม่</span>
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
