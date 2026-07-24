import React, { useState } from 'react';
import { KeyRound, Lock, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface SheetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess: () => Promise<void>;
}

export const SheetPasswordModal: React.FC<SheetPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();

    if (cleanPass === 'pp37' || cleanPass.toLowerCase() === 'pp37') {
      setError(null);
      setIsLoading(true);
      try {
        await onConfirmSuccess();
        setPassword('');
        onClose();
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Google Sheets');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('รหัสผ่านไม่ถูกต้อง! กรุณากรอกรหัสผ่าน pp37');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              ยืนยันรหัสผ่านดึงข้อมูล
            </h3>
            <p className="text-xs text-slate-400">
              กรุณากรอกรหัสผ่านเพื่อดึงข้อมูลจากทุกชีตในโปรเจค
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              รหัสผ่านดึงข้อมูล (Password):
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="กรอกรหัสผ่าน pp37"
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-mono tracking-wider"
            />
            <p className="text-[11px] text-amber-400/80 mt-1">
              * ต้องใส่รหัสผ่าน <span className="font-bold underline">pp37</span> เพื่อปลดล็อกการโหลดข้อมูลจากทุกชีต
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors border border-slate-700 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังโหลดข้อมูล...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ดึงข้อมูลทุกชีต</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
