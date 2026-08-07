import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  FileSpreadsheet, 
  ExternalLink, 
  Trash2, 
  Pencil,
  X,
  Calendar, 
  Building2, 
  Tag, 
  Download,
  Plus,
  Printer,
  User,
  Wallet,
  PiggyBank,
  Scale
} from 'lucide-react';
import { Project, Transaction } from '../types';

interface TransactionListProps {
  isAdmin?: boolean;
  transactions: Transaction[];
  projects: Project[];
  expenseCategories?: string[];
  incomeCategories?: string[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (updatedTx: Transaction) => void;
  onOpenMobileForm: () => void;
  onOpenPdfModal?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  projects,
  expenseCategories,
  incomeCategories,
  onDeleteTransaction,
  onEditTransaction,
  onOpenMobileForm,
  onOpenPdfModal,
  isAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedPayee, setSelectedPayee] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Extract unique payees/payers from transactions
  const availablePayees = useMemo(() => {
    const payees = new Set<string>();
    transactions.forEach(t => {
      if (t.payerOrPayee && t.payerOrPayee.trim()) {
        payees.add(t.payerOrPayee.trim());
      }
    });
    return Array.from(payees).sort((a, b) => a.localeCompare(b, 'th'));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = selectedType === 'all' || t.type === selectedType;
      const matchProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
      const matchPayee = selectedPayee === 'all' || (t.payerOrPayee && t.payerOrPayee.trim() === selectedPayee);
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        t.description.toLowerCase().includes(searchLower) ||
        t.payerOrPayee.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower) ||
        (t.documentNo && t.documentNo.toLowerCase().includes(searchLower));

      return matchType && matchProject && matchPayee && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedType, selectedProjectId, selectedPayee, searchTerm]);

  // Summary of Income grouped by Category & Site Reserve Funds
  const incomeCategorySummary = useMemo(() => {
    const map = new Map<string, { category: string; total: number; count: number }>();
    let totalInc = 0;
    let siteAdvanceTotal = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        const cat = (t.category || '').trim() || 'รายรับอื่นๆ';
        const current = map.get(cat) || { category: cat, total: 0, count: 0 };
        current.total += t.amount;
        current.count += 1;
        map.set(cat, current);
        totalInc += t.amount;

        // Count site advance / reserve funds
        if (cat.includes('สำรอง') || cat.includes('เบิก') || cat.toLowerCase().includes('advance') || cat.toLowerCase().includes('reserve')) {
          siteAdvanceTotal += t.amount;
        }
      }
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      percentage: totalInc > 0 ? (item.total / totalInc) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    return { list, totalInc, siteAdvanceTotal };
  }, [filteredTransactions]);

  // Summary of Expenses grouped by Category
  const expenseCategorySummary = useMemo(() => {
    const map = new Map<string, { category: string; total: number; count: number }>();
    let totalExp = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = (t.category || '').trim() || 'หมวดหมู่อื่นๆ';
        const current = map.get(cat) || { category: cat, total: 0, count: 0 };
        current.total += t.amount;
        current.count += 1;
        map.set(cat, current);
        totalExp += t.amount;
      }
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      percentage: totalExp > 0 ? (item.total / totalExp) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    return { list, totalExp };
  }, [filteredTransactions]);

  const totalIncome = incomeCategorySummary.totalInc;
  const siteAdvanceTotal = incomeCategorySummary.siteAdvanceTotal;
  const totalExpense = expenseCategorySummary.totalExp;
  const netBalance = totalIncome - totalExpense;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['วันที่', 'ประเภท', 'โครงการ', 'หมวดหมู่', 'รายละเอียด', 'ผู้รับ/จ่ายเงิน', 'จำนวนเงิน', 'เลขที่เอกสาร', 'วิธีชำระ'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      t.projectCode,
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.payerOrPayee.replace(/"/g, '""')}"`,
      t.amount,
      t.documentNo || '',
      t.paymentMethod
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PP_Account_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            สมุดลงบัญชีรายรับ - รายจ่าย (Income & Expense Ledger)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            บันทึกรายการบัญชีไซต์งานก่อสร้าง แยกตามโครงการ พร้อมลิงก์ Google Sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={onOpenPdfModal}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ PDF / สรุปบัญชี</span>
          </button>

          <button
            onClick={onOpenMobileForm}
            className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มรายการ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อ, รายละเอียด, ผู้รับ/จ่าย..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 p-1 rounded-xl">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedType === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setSelectedType('income')}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedType === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            รายรับ
          </button>
          <button
            onClick={() => setSelectedType('expense')}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedType === 'expense' ? 'bg-red-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            รายจ่าย
          </button>
        </div>

        {/* Project Select */}
        <div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">กรองตามโครงการ: ทุกโครงการ</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payee / Payer Select Filter */}
        <div>
          <select
            value={selectedPayee}
            onChange={(e) => setSelectedPayee(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="all">กรองตามผู้รับ/จ่ายเงิน: ทั้งหมด ({availablePayees.length} ราย)</option>
            {availablePayees.map(payee => (
              <option key={payee} value={payee}>
                👤 {payee}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* OVERVIEW STAT CARDS BAR */}
      <div className="p-4 bg-slate-950/90 border-b border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Income Card */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>รวมรายรับทั้งหมด</span>
            </span>
            <span className="text-[10px] text-emerald-500/80 bg-emerald-950 px-1.5 py-0.5 rounded font-mono">INCOME</span>
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-400 mt-1">
            +฿{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Site Reserve / Advance Funds Card */}
        <div className="bg-slate-900 border border-blue-900/50 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5 text-blue-400">
              <PiggyBank className="w-4 h-4" />
              <span>เงินสำรองหน้างาน</span>
            </span>
            <span className="text-[10px] text-blue-400/80 bg-blue-950 px-1.5 py-0.5 rounded font-mono">RESERVE</span>
          </div>
          <p className="text-base sm:text-lg font-black text-blue-400 mt-1">
            ฿{siteAdvanceTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Total Expense Card */}
        <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5 text-rose-400">
              <TrendingDown className="w-4 h-4" />
              <span>รวมรายจ่ายทั้งหมด</span>
            </span>
            <span className="text-[10px] text-rose-500/80 bg-rose-950 px-1.5 py-0.5 rounded font-mono">EXPENSE</span>
          </div>
          <p className="text-base sm:text-lg font-black text-rose-400 mt-1">
            -฿{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Net Balance Card */}
        <div className={`bg-slate-900 border ${netBalance >= 0 ? 'border-emerald-700/50' : 'border-amber-700/50'} rounded-xl p-3 shadow-xs`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span className={`flex items-center gap-1.5 ${netBalance >= 0 ? 'text-emerald-300' : 'text-amber-400'}`}>
              <Scale className="w-4 h-4" />
              <span>ยอดคงเหลือสุทธิ</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${netBalance >= 0 ? 'text-emerald-400 bg-emerald-950' : 'text-amber-400 bg-amber-950'}`}>NET</span>
          </div>
          <p className={`text-base sm:text-lg font-black mt-1 ${netBalance >= 0 ? 'text-emerald-300' : 'text-amber-400'}`}>
            ฿{netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* EXPENSE BREAKDOWN BY CATEGORY CARDS */}
      {expenseCategorySummary.list.length > 0 && (
        <div className="p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
              <Tag className="w-3.5 h-3.5 text-rose-400" />
              <span>สรุปแยกรายจ่ายตามหมวดหมู่ (Expense Breakdown by Category)</span>
            </h3>
            <span className="text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-lg">
              รวมรายจ่าย: {expenseCategorySummary.totalExp.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {expenseCategorySummary.list.map((item) => (
              <div 
                key={item.category} 
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 transition-all flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-slate-200 truncate" title={item.category}>
                    {item.category}
                  </span>
                  <span className="text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800/50 px-1.5 py-0.5 rounded-md shrink-0">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, item.percentage)}%` }} 
                  />
                </div>

                <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400 text-[10px]">{item.count} รายการ</span>
                  <span className="font-extrabold text-rose-400">
                    ฿{item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Table / Responsive Cards */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">วันที่ / โครงการ</th>
              <th className="py-3 px-4">ประเภท / หมวดหมู่</th>
              <th className="py-3 px-4">รายละเอียด / ผู้รับ-จ่าย</th>
              <th className="py-3 px-4">เลขที่เอกสาร</th>
              <th className="py-3 px-4 text-right">จำนวนเงิน (บาท)</th>
              <th className="py-3 px-4 text-center">ชีต Google</th>
              <th className="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  ไม่พบรายการบัญชีตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const project = projects.find(p => p.id === tx.projectId);

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors group">
                    
                    {/* Date & Project */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {tx.date}
                      </div>
                      <div className="text-[11px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 inline" />
                        {tx.projectCode}
                      </div>
                    </td>

                    {/* Type & Category */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isIncome 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-red-950 text-red-300 border border-red-500/40'
                      }`}>
                        {isIncome ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isIncome ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                      <div className="text-slate-300 font-semibold mt-1">
                        {tx.category}
                      </div>
                    </td>

                    {/* Description & Payee */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-white line-clamp-1">
                        {tx.description}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        👤 {tx.payerOrPayee}
                      </div>
                    </td>

                    {/* Document No & Payment Method */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300 font-mono text-[11px]">
                        {tx.documentNo || '-'}
                      </div>
                      <div className="text-slate-500 text-[10px] bg-slate-950 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {tx.paymentMethod}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className={`py-3 px-4 text-right font-bold text-sm ${
                      isIncome ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isIncome ? '+' : '-'}฿{tx.amount.toLocaleString('th-TH')}
                    </td>

                    {/* Google Sheets Icon */}
                    <td className="py-3 px-4 text-center">
                      <a
                        href={tx.sheetUrl || project?.sheetUrlIncome || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg transition-transform hover:scale-110"
                        title="เปิดดูใน Google Sheets"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                      </a>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingTx({ ...tx })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="แก้ไขรายการนี้"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (deletingId === tx.id) {
                              onDeleteTransaction(tx.id);
                              setDeletingId(null);
                            } else {
                              setDeletingId(tx.id);
                              setTimeout(() => setDeletingId(null), 3000);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${deletingId === tx.id ? 'text-white bg-red-600 hover:bg-red-500' : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'}`}
                          title={deletingId === tx.id ? 'คลิกอีกครั้งเพื่อยืนยัน' : 'ลบรายการนี้'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
        <div>
          แสดง <span className="font-bold text-white">{filteredTransactions.length}</span> จากทั้งหมด <span className="font-bold text-white">{transactions.length}</span> รายการ
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-emerald-400 font-bold">
            รวมรายรับ: ฿{filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}
          </span>
          <span className="text-red-400 font-bold">
            รวมรายจ่าย: ฿{filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                แก้ไขรายการบัญชี
              </h3>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingTx.amount || editingTx.amount <= 0) {
                  alert('กรุณากรอกจำนวนเงินให้ถูกต้อง');
                  return;
                }
                if (!editingTx.description.trim()) {
                  alert('กรุณากรอกรายละเอียด');
                  return;
                }
                if (onEditTransaction) {
                  onEditTransaction(editingTx);
                }
                setEditingTx(null);
              }}
              className="space-y-4 text-xs"
            >
              {/* Type Selection */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">ประเภทรายการ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cats = incomeCategories || ['เงินสำรองหน้างาน'];
                      setEditingTx({
                        ...editingTx,
                        type: 'income',
                        category: cats[0] || 'เงินสำรองหน้างาน'
                      });
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      editingTx.type === 'income'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>รายรับ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cats = expenseCategories || ['ค่าวัสดุก่อสร้าง', 'ค่าแรงคนงาน'];
                      setEditingTx({
                        ...editingTx,
                        type: 'expense',
                        category: cats[0] || 'ค่าวัสดุก่อสร้าง'
                      });
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      editingTx.type === 'expense'
                        ? 'bg-red-950 border-red-500 text-red-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span>รายจ่าย</span>
                  </button>
                </div>
              </div>

              {/* Project & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">โครงการ</label>
                  <select
                    value={editingTx.projectId}
                    onChange={(e) => {
                      const p = projects.find(proj => proj.id === e.target.value);
                      setEditingTx({
                        ...editingTx,
                        projectId: e.target.value,
                        projectCode: p ? p.code : editingTx.projectCode
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">วันที่</label>
                  <input
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">หมวดหมู่</label>
                  <select
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {(editingTx.type === 'income' ? (incomeCategories || ['เงินสำรองหน้างาน']) : (expenseCategories || ['ค่าวัสดุก่อสร้าง', 'ค่าแรงคนงาน', 'ค่าน้ำมัน', 'ค่าเดินทาง', 'ค่าทางด่วน', 'ค่าเครื่องจักรและอุปกรณ์', 'ค่าซ่อมเครื่องมือ'])).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    {!((editingTx.type === 'income' ? (incomeCategories || []) : (expenseCategories || [])).includes(editingTx.category)) && (
                      <option value={editingTx.category}>{editingTx.category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingTx.amount || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold text-amber-400"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">รายละเอียด</label>
                <input
                  type="text"
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="ระบุรายละเอียดรายการ"
                  required
                />
              </div>

              {/* Payer/Payee & Document No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ผู้รับ / ผู้จ่ายเงิน</label>
                  <input
                    type="text"
                    value={editingTx.payerOrPayee}
                    onChange={(e) => setEditingTx({ ...editingTx, payerOrPayee: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="ชื่อผู้รับ หรือ ผู้จ่าย"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">เลขที่เอกสาร</label>
                  <input
                    type="text"
                    value={editingTx.documentNo || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, documentNo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="เช่น INV-001 / ใบรับเงิน"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">วิธีชำระเงิน</label>
                <select
                  value={editingTx.paymentMethod}
                  onChange={(e) => setEditingTx({ ...editingTx, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="โอนเงิน">โอนเงิน</option>
                  <option value="เงินสด">เงินสด</option>
                  <option value="เช็ค">เช็ค</option>
                  <option value="บัตรเครดิต">บัตรเครดิต</option>
                </select>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Pencil className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
