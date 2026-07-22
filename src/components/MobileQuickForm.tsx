import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Building, 
  Calendar, 
  DollarSign, 
  Send,
  CheckCircle2,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import { 
  Project, 
  Transaction, 
  BillingItem, 
  ExpenseCategory, 
  IncomeCategory 
} from '../types';
import { appendTransactionToSheet, appendBillingToSheet } from '../lib/googleSheetsService';

interface MobileQuickFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'income' | 'expense' | 'billing';
  projects: Project[];
  expenseCategories?: string[];
  incomeCategories?: string[];
  onOpenCategoryManager?: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onAddBilling: (billing: Omit<BillingItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  googleAccessToken?: string | null;
}

const DEFAULT_EXPENSE_CATS = [
  'ค่าวัสดุก่อสร้าง',
  'ค่าแรงงาน',
  'ค่าเครื่องจักรและอุปกรณ์',
  'ค่าผู้รับเหมาช่วง',
  'ค่าออกแบบและวิศวกร',
  'ค่าบริหารงานโครงการ',
  'ค่าสาธารณูปโภค/เชื้อเพลิง',
  'อื่นๆ'
];

const DEFAULT_INCOME_CATS = [
  'ค่างวดงานก้าวหน้า',
  'เงินมัดจำ/เบิกล่วงหน้า',
  'เงินประกันผลงานคืน (Retention)',
  'รายรับอื่นๆ'
];

export const MobileQuickForm: React.FC<MobileQuickFormProps> = ({
  isOpen,
  onClose,
  initialTab = 'expense',
  projects,
  expenseCategories = DEFAULT_EXPENSE_CATS,
  incomeCategories = DEFAULT_INCOME_CATS,
  onOpenCategoryManager,
  onAddTransaction,
  onAddBilling,
  googleAccessToken
}) => {
  const [formType, setFormType] = useState<'income' | 'expense' | 'billing'>(initialTab);
  
  React.useEffect(() => {
    if (isOpen) {
      setFormType(initialTab);
    }
  }, [isOpen, initialTab]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>(expenseCategories[0] || 'อื่นๆ');
  const [description, setDescription] = useState<string>('');
  const [payerOrPayee, setPayerOrPayee] = useState<string>('');
  const [documentNo, setDocumentNo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'โอนเงิน' | 'เงินสด' | 'เช็ค' | 'บัตรเครดิต'>('โอนเงิน');
  
  // Billing specific fields
  const [period, setPeriod] = useState<string>('งวดงานที่ 1');
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [vatInclude, setVatInclude] = useState<boolean>(true);
  const [whtDeduct, setWhtDeduct] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }
    if (!selectedProjectId) {
      alert('กรุณาเลือกโครงการ');
      return;
    }

    setIsSubmitting(true);
    const numAmount = parseFloat(amount);

    try {
      if (formType === 'income' || formType === 'expense') {
        const txObj: Omit<Transaction, 'id' | 'createdAt'> = {
          projectId: currentProject.id,
          projectCode: currentProject.code,
          type: formType,
          category: category as any,
          amount: numAmount,
          date,
          description: description || `${formType === 'income' ? 'รับเงิน' : 'จ่ายเงิน'} ${category}`,
          payerOrPayee: payerOrPayee || (formType === 'income' ? currentProject.clientName : 'ร้านค้า/ผู้รับเหมา'),
          documentNo,
          paymentMethod,
          sheetUrl: currentProject.sheetUrlIncome
        };

        onAddTransaction(txObj);

        // Append directly to user's Google Sheet if authenticated
        if (googleAccessToken && currentProject.sheetUrlIncome) {
          try {
            await appendTransactionToSheet(
              googleAccessToken,
              currentProject.sheetUrlIncome,
              { ...txObj, id: 'tx-temp', createdAt: new Date().toISOString() }
            );
          } catch (gErr) {
            console.error('Failed to sync to Google Sheet:', gErr);
          }
        }

        setSuccessMsg(`บันทึก${formType === 'income' ? 'รายรับ' : 'รายจ่าย'} ${numAmount.toLocaleString()} บาท สำเร็จ!`);
      } else {
        // Billing
        const vatAmt = vatInclude ? numAmount * 0.07 : 0;
        const whtAmt = whtDeduct ? numAmount * 0.03 : 0;
        const totalNet = numAmount + vatAmt - whtAmt;

        const billingObj: Omit<BillingItem, 'id' | 'createdAt' | 'updatedAt'> = {
          invoiceNo: documentNo || `BILL-${Date.now().toString().slice(-6)}`,
          projectId: currentProject.id,
          projectCode: currentProject.code,
          projectName: currentProject.name,
          clientName: currentProject.clientName,
          period,
          amount: numAmount,
          vatInclude,
          vatAmount: vatAmt,
          whtDeduct,
          whtAmount: whtAmt,
          totalPayable: totalNet,
          billingDate: date,
          dueDate,
          status: 'pending',
          notes: description,
          sheetUrl: currentProject.sheetUrlBilling
        };

        onAddBilling(billingObj);

        // Append to Google Sheet
        if (googleAccessToken && currentProject.sheetUrlBilling) {
          try {
            await appendBillingToSheet(
              googleAccessToken,
              currentProject.sheetUrlBilling,
              { ...billingObj, id: 'bill-temp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            );
          } catch (gErr) {
            console.error('Failed to sync billing to Google Sheet:', gErr);
          }
        }

        setSuccessMsg(`บันทึกเอกสารวางบิลยอดสุทธิ ${totalNet.toLocaleString()} บาท สำเร็จ!`);
      }

      setTimeout(() => {
        setSuccessMsg('');
        setIsSubmitting(false);
        // Reset form
        setAmount('');
        setDescription('');
        setPayerOrPayee('');
        setDocumentNo('');
        onClose();
      }, 1200);

    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700/80">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              บันทึกข้อมูล (Mobile Quick Form)
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {successMsg ? (
            <div className="bg-emerald-950/80 border border-emerald-500/50 p-6 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <p className="text-emerald-200 text-base font-bold">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Switcher */}
              {initialTab === 'billing' ? (
                <div className="bg-blue-950/80 border border-blue-500/40 p-2.5 rounded-xl text-center shadow-inner">
                  <span className="text-xs font-extrabold text-blue-300 flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    ออกเอกสารใบวางบิลใหม่ (New Billing Document)
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('expense');
                      setCategory(expenseCategories[0] || '');
                    }}
                    className={`flex items-center justify-center space-x-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      formType === 'expense'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>รายจ่าย</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType('income');
                      setCategory(incomeCategories[0] || '');
                    }}
                    className={`flex items-center justify-center space-x-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      formType === 'income'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>รายรับ</span>
                  </button>
                </div>
              )}

              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  เลือกระบุโครงการ <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category selector for Income / Expense */}
              {formType !== 'billing' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      หมวดหมู่รายการ
                    </label>
                    {onOpenCategoryManager && (
                      <button
                        type="button"
                        onClick={onOpenCategoryManager}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                      >
                        + จัดการหมวดหมู่
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {(formType === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`text-left px-2.5 py-2 rounded-lg text-xs font-medium truncate transition-all ${
                          category === cat
                            ? formType === 'expense'
                              ? 'bg-red-950 border border-red-500 text-red-200 font-bold'
                              : 'bg-emerald-950 border border-emerald-500 text-emerald-200 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Billing Period for Billing */}
              {formType === 'billing' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    งวดงาน / รายละเอียดงวด
                  </label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="เช่น งวดงานที่ 1 (งานเสร็จ 20%)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Amount Input with Quick Addition Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    {formType === 'billing' ? 'มูลค่าก่อนภาษี (บาท)' : 'จำนวนเงิน (บาท)'} <span className="text-red-400">*</span>
                  </span>
                  {amount && (
                    <span className="text-amber-400 text-xs font-bold">
                      = {parseFloat(amount).toLocaleString('th-TH')} บาท
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-lg font-bold text-amber-300 focus:outline-none focus:border-amber-400 text-right"
                />
                
                {/* Mobile Quick Add Buttons */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {[1000, 5000, 10000, 50000, 100000].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => handleQuickAddAmount(val)}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold px-2 py-1 rounded-md transition-all active:scale-95"
                    >
                      +{val.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="bg-slate-800 text-red-400 hover:bg-red-950 text-[11px] font-semibold px-2 py-1 rounded-md transition-all"
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    {formType === 'billing' ? 'วันที่วางบิล' : 'วันที่ทำรายการ'}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (_) {} }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                </div>

                {formType === 'billing' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-red-400" />
                      วันกำหนดชำระเงิน (Due Date)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        onClick={(e) => { try { e.currentTarget.showPicker(); } catch (_) {} }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-400 cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Billing Tax options */}
              {formType === 'billing' && (
                <div className="flex items-center space-x-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vatInclude}
                      onChange={(e) => setVatInclude(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>+ VAT 7%</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whtDeduct}
                      onChange={(e) => setWhtDeduct(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>- หัก ณ ที่จ่าย 3%</span>
                  </label>
                </div>
              )}

              {/* Document No & Payee/Payer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {formType === 'billing' ? 'เลขที่ใบวางบิล' : 'เลขที่ใบเสร็จ/ใบกำกับ'}
                  </label>
                  <input
                    type="text"
                    value={documentNo}
                    onChange={(e) => setDocumentNo(e.target.value)}
                    placeholder="เช่น INV-2026-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {formType !== 'billing' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {formType === 'income' ? 'ผู้จ่ายเงิน (ลูกค้า)' : 'ผู้รับเงิน (ร้านค้า/ช่าง)'}
                    </label>
                    <input
                      type="text"
                      value={payerOrPayee}
                      onChange={(e) => setPayerOrPayee(e.target.value)}
                      placeholder="ชื่อผู้รับ/จ่ายเงิน"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  รายละเอียดเพิ่มเติม / หมายเหตุ
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุข้อความสั้นๆ..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center space-x-2 transition-all shadow-lg ${
                  formType === 'income'
                    ? 'bg-emerald-400 hover:bg-emerald-300'
                    : formType === 'expense'
                    ? 'bg-amber-400 hover:bg-amber-300'
                    : 'bg-blue-400 hover:bg-blue-300'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'กำลังบันทึกข้อมูล...'
                    : `ยืนยันบันทึก${
                        formType === 'income'
                          ? 'รายรับ'
                          : formType === 'expense'
                          ? 'รายจ่าย'
                          : 'เอกสารวางบิล'
                      }`}
                </span>
              </button>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
