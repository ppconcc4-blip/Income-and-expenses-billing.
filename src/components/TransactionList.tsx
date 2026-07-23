import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  FileSpreadsheet, 
  ExternalLink, 
  Trash2, 
  Calendar, 
  Building2, 
  Tag, 
  Download,
  Plus,
  Printer
} from 'lucide-react';
import { Project, Transaction } from '../types';

interface TransactionListProps {
  isAdmin?: boolean;
  transactions: Transaction[];
  projects: Project[];
  onDeleteTransaction: (id: string) => void;
  onOpenMobileForm: () => void;
  onOpenPdfModal?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  projects,
  onDeleteTransaction,
  onOpenMobileForm,
  onOpenPdfModal,
  isAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = selectedType === 'all' || t.type === selectedType;
      const matchProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        t.description.toLowerCase().includes(searchLower) ||
        t.payerOrPayee.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower) ||
        (t.documentNo && t.documentNo.toLowerCase().includes(searchLower));

      return matchType && matchProject && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedType, selectedProjectId, searchTerm]);

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
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อ, รายละเอียด, ผู้จ่าย/รับเงิน, เลขที่เอกสาร..."
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

      </div>

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

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
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

    </div>
  );
};
