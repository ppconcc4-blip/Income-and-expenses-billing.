import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  RotateCcw, 
  Tag, 
  TrendingUp, 
  TrendingDown,
  AlertCircle
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseCategories: string[];
  incomeCategories: string[];
  onAddCategory: (type: 'income' | 'expense', name: string) => void;
  onEditCategory: (type: 'income' | 'expense', oldName: string, newName: string) => void;
  onDeleteCategory: (type: 'income' | 'expense', name: string) => void;
  onResetDefaults?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  expenseCategories,
  incomeCategories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetDefaults
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [deletingCatName, setDeletingCatName] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    if (currentList.includes(trimmed)) {
      setErrorMsg('มีชื่อหมวดหมู่นี้อยู่แล้ว');
      return;
    }

    onAddCategory(activeTab, trimmed);
    setNewCatName('');
    setErrorMsg('');
  };

  const handleStartEdit = (cat: string) => {
    setEditingCatName(cat);
    setEditValue(cat);
    setErrorMsg('');
  };

  const handleSaveEdit = (oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setErrorMsg('ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง');
      return;
    }
    if (trimmed !== oldName && currentList.includes(trimmed)) {
      setErrorMsg('มีชื่อหมวดหมู่นี้อยู่แล้ว');
      return;
    }

    onEditCategory(activeTab, oldName, trimmed);
    setEditingCatName(null);
    setEditValue('');
    setErrorMsg('');
  };

  const handleDelete = (cat: string) => {
    if (currentList.length <= 1) {
      setErrorMsg('ต้องมีหมวดหมู่อยู่อย่างน้อย 1 หมวดหมู่');
      return;
    }
    if (deletingCatName === cat) {
      onDeleteCategory(activeTab, cat);
      setDeletingCatName(null);
      setErrorMsg('');
    } else {
      setDeletingCatName(cat);
      setTimeout(() => setDeletingCatName(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">จัดการหมวดหมู่รายรับ - รายจ่าย</h3>
              <p className="text-xs text-slate-400">เพิ่ม แก้ไข หรือลบหมวดหมู่ของระบบตามต้องการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('expense'); setErrorMsg(''); setEditingCatName(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'expense' 
                ? 'bg-red-600/90 text-white shadow-md border border-red-500/50' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>หมวดหมู่รายจ่าย ({expenseCategories.length})</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('income'); setErrorMsg(''); setEditingCatName(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'income' 
                ? 'bg-emerald-600/90 text-white shadow-md border border-emerald-500/50' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>หมวดหมู่รายรับ ({incomeCategories.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          
          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              เพิ่มหมวดหมู่{activeTab === 'expense' ? 'รายจ่าย' : 'รายรับ'}ใหม่
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={`กรอกชื่อหมวดหมู่${activeTab === 'expense' ? 'รายจ่าย' : 'รายรับ'}...`}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-slate-950 transition-all flex items-center gap-1 shadow-md ${
                  activeTab === 'expense' ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่ม</span>
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 bg-red-950/60 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category List */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>รายการหมวดหมู่ที่มีอยู่ในระบบ</span>
              <span>{currentList.length} หมวดหมู่</span>
            </div>

            <div className="space-y-1.5">
              {currentList.map((cat) => {
                const isEditing = editingCatName === cat;

                return (
                  <div 
                    key={cat} 
                    className="flex items-center justify-between bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl hover:border-slate-700 transition-all"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 bg-slate-900 border border-amber-400 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(cat)}
                          className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-400 transition-colors"
                          title="บันทึก"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCatName(null)}
                          className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors"
                          title="ยกเลิก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                          <span className={`w-2 h-2 rounded-full ${activeTab === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                          <span>{cat}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="แก้ไขชื่อหมวดหมู่"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold ${
                              deletingCatName === cat
                                ? 'bg-red-600 text-white hover:bg-red-500'
                                : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                            }`}
                            title={deletingCatName === cat ? 'คลิกอีกครั้งเพื่อยืนยันลบ' : 'ลบหมวดหมู่นี้'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingCatName === cat && <span>ยืนยันลบ</span>}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {onResetDefaults && (
            <button
              onClick={() => {
                if (confirm('คุณต้องการรีเซ็ตหมวดหมู่ทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
                  onResetDefaults();
                  setErrorMsg('');
                }
              }}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
