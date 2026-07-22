import React, { useState, useMemo } from 'react';
import { Printer, X, FileSpreadsheet, Filter, Calendar, Building2, ArrowUpRight, ArrowDownRight, DollarSign, ExternalLink } from 'lucide-react';
import { Transaction, Project } from '../types';

interface TransactionPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  projects: Project[];
}

export const TransactionPdfModal: React.FC<TransactionPdfModalProps> = ({
  isOpen,
  onClose,
  transactions,
  projects
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');

  if (!isOpen) return null;

  // Filter and sort ASCENDING by date (เรียงตามวันที่น้อยไปหามาก)
  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
        const matchType = selectedType === 'all' || t.type === selectedType;
        return matchProject && matchType;
      })
      .sort((a, b) => {
        // Date ascending: earliest first (น้อยไปหามาก)
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }, [transactions, selectedProjectId, selectedType]);

  // Calculations for summary totals
  const totalIncome = filteredAndSortedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredAndSortedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Selected project details
  const activeProjectObj = projects.find(p => p.id === selectedProjectId);
  const projectTitleText = selectedProjectId === 'all' 
    ? 'ทุกโครงการ (All Projects)' 
    : `[${activeProjectObj?.code || ''}] ${activeProjectObj?.name || ''}`;

  const handlePrint = () => {
    const printElement = document.getElementById('transaction-printable-area');
    if (!printElement) {
      window.print();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>รายงานสมุดบัญชีรายรับ-รายจ่าย_${new Date().toISOString().split('T')[0]}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: 'Sarabun', sans-serif; background: #ffffff !important; color: #000000 !important; padding: 16px; margin: 0; }
      table { border-collapse: collapse !important; width: 100% !important; }
      th, td { border: 1px solid #cbd5e1 !important; }
      .no-print { display: none !important; }
    </style>
  </head>
  <body>
    <div id="transaction-printable-area">
      ${printElement.innerHTML}
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() { window.focus(); window.print(); }, 400);
      };
    </script>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Controls */}
        <div className="no-print flex flex-col gap-3 p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-950 rounded-xl border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  ส่งออก PDF / พิมพ์ รายงานสมุดบัญชีรายรับ-รายจ่าย
                </h3>
                <p className="text-xs text-slate-400">
                  เลือกทุกโครงการ หรือระบุโครงการเฉพาะ • เรียงตามวันที่จากเก่าไปใหม่ (น้อยไปหามาก)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                title="พิมพ์ / บันทึก PDF"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ / บันทึก PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-700 gap-3 text-xs">
            
            {/* Project Selector */}
            <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>โครงการ:</span>
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-emerald-300 font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 w-full"
              >
                <option value="all">📂 แสดงทุกโครงการ (All Projects) [{transactions.length} รายการ]</option>
                {projects.map(p => {
                  const count = transactions.filter(t => t.projectId === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      🏢 [{p.code}] {p.name} ({count} รายการ)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Type Selector */}
            <div className="flex items-center space-x-2 min-w-[180px]">
              <span className="text-slate-400 font-medium shrink-0">ประเภท:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'income' | 'expense')}
                className="bg-slate-950 border border-slate-700 text-white font-semibold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
              >
                <option value="all">ทั้งหมด (รายรับ & รายจ่าย)</option>
                <option value="income">🟢 เฉพาะรายรับ</option>
                <option value="expense">🔴 เฉพาะรายจ่าย</option>
              </select>
            </div>

            {/* Sort Badge Indicator */}
            <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>เรียงตามวันที่: น้อยไปหามาก (เก่า → ใหม่)</span>
            </div>

          </div>
        </div>

        {/* Printable & Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center">
          <div 
            id="transaction-printable-area" 
            className="w-full max-w-4xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl rounded-sm border border-slate-300 min-h-[900px] font-sans text-xs"
          >
            {/* PDF HEADER */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-blue-900 text-white font-extrabold flex items-center justify-center text-sm">
                    PP
                  </div>
                  <div>
                    <h1 className="text-sm font-extrabold text-blue-950 uppercase leading-none">
                      บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมเนจเม้นท์ จำกัด (สำนักงานใหญ่)
                    </h1>
                    <p className="text-[10px] text-slate-700 font-semibold mt-0.5">
                      PP. CONSTRUCTION AND MANAGEMENT CO., LTD. ( Head Office )
                    </p>
                  </div>
                </div>
                <p className="text-[9.5px] text-slate-600 pt-1">
                  45 ซอยโชคชัย 4 ซอย 83 ถนนโชคชัย 4 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230 | TAX ID: 0105556120098
                </p>
              </div>

              <div className="text-right border-l border-slate-300 pl-4 space-y-0.5 min-w-[180px]">
                <span className="bg-emerald-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  INCOME & EXPENSE LEDGER
                </span>
                <h2 className="text-xs font-bold text-slate-900 mt-1">
                  รายงานสมุดบัญชีรายรับ-รายจ่าย
                </h2>
                <p className="text-[9.5px] text-slate-600">
                  เงื่อนไข: <span className="font-bold text-slate-900">{projectTitleText}</span>
                </p>
                <p className="text-[9.5px] text-slate-600">
                  เรียงตาม: <span className="font-bold text-slate-900">วันที่ (น้อยไปหามาก)</span>
                </p>
                <p className="text-[9px] text-slate-500">
                  วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}
                </p>
              </div>
            </div>

            {/* FINANCIAL SUMMARY CARDS */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-[10.5px]">
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-950">
                <p className="text-[9.5px] font-bold text-emerald-800">รวมรายรับทั้งหมด (TOTAL INCOME)</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">
                  +{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </p>
              </div>
              <div className="p-2.5 bg-red-50 border border-red-300 rounded text-red-950">
                <p className="text-[9.5px] font-bold text-red-800">รวมรายจ่ายทั้งหมด (TOTAL EXPENSE)</p>
                <p className="text-sm font-black text-red-700 mt-0.5">
                  -{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </p>
              </div>
              <div className={`p-2.5 border rounded ${netBalance >= 0 ? 'bg-blue-50 border-blue-300 text-blue-950' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
                <p className="text-[9.5px] font-bold text-slate-800">ยอดคงเหลือสุทธิ (NET BALANCE)</p>
                <p className={`text-sm font-black mt-0.5 ${netBalance >= 0 ? 'text-blue-900' : 'text-amber-700'}`}>
                  {netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </p>
              </div>
            </div>

            {/* MAIN TRANSACTIONS TABLE */}
            <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[9px]">
                  <th className="py-2 px-1.5 text-center w-[30px] border-r border-slate-700">#</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap border-r border-slate-700">วันที่</th>
                  <th className="py-2 px-2 border-r border-slate-700">รหัส/โครงการ</th>
                  <th className="py-2 px-2 text-center border-r border-slate-700">ประเภท</th>
                  <th className="py-2 px-2 border-r border-slate-700">หมวดหมู่</th>
                  <th className="py-2 px-2 border-r border-slate-700">รายละเอียด / รายการ</th>
                  <th className="py-2 px-2 border-r border-slate-700">ผู้จ่าย / ผู้รับเงิน</th>
                  <th className="py-2 px-2 text-center border-r border-slate-700">เลขที่เอกสาร</th>
                  <th className="py-2 px-2 text-right border-r border-slate-700 text-emerald-300">รายรับ (บาท)</th>
                  <th className="py-2 px-2 text-right text-red-300">รายจ่าย (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAndSortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 font-medium italic">
                      ไม่พบรายการบันทึกรายรับ-รายจ่ายตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTransactions.map((tx, idx) => (
                    <tr key={tx.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'}>
                      <td className="py-1.5 px-1.5 text-center font-bold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 text-center font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-slate-800">
                        {tx.projectCode}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold whitespace-nowrap">
                        {tx.type === 'income' ? (
                          <span className="text-emerald-700 font-bold">รายรับ</span>
                        ) : (
                          <span className="text-red-700 font-bold">รายจ่าย</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-medium text-slate-900">
                        {tx.description}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-slate-700">
                        {tx.payerOrPayee || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600 font-mono text-[8.5px]">
                        {tx.documentNo || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-bold text-emerald-700 whitespace-nowrap">
                        {tx.type === 'income' ? tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-red-700 whitespace-nowrap">
                        {tx.type === 'expense' ? tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* GRAND TOTALS FOOTER */}
              <tfoot>
                <tr className="bg-slate-100 font-bold text-[10px] border-t-2 border-slate-800">
                  <td colSpan={8} className="py-2 px-3 text-right border-r border-slate-300 uppercase font-black text-slate-900">
                    รวมทั้งสิ้น ({filteredAndSortedTransactions.length} รายการ) :
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-300 font-extrabold text-emerald-800 text-[10.5px]">
                    {totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 text-right font-extrabold text-red-800 text-[10.5px]">
                    {totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-slate-200 font-black text-[11px] border-t border-slate-400">
                  <td colSpan={8} className="py-2 px-3 text-right border-r border-slate-300 uppercase text-slate-950">
                    ยอดเงินคงเหลือสุทธิ (NET TOTAL BALANCE) :
                  </td>
                  <td colSpan={2} className={`py-2 px-3 text-right font-black text-xs ${netBalance >= 0 ? 'text-blue-950' : 'text-red-950'}`}>
                    {netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* SIGNATURE SECTION */}
            <div className="grid grid-cols-2 gap-8 mt-10 pt-4 border-t border-slate-300 text-[10px] text-center">
              <div className="space-y-12">
                <p className="font-bold text-slate-900">ผู้จัดทำรายงาน / Prepared By</p>
                <div>
                  <p className="text-slate-800 font-medium">(____________________________________)</p>
                  <p className="text-slate-600 mt-1">วันที่ / DATE : ____ / _____ / ________</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-slate-900">ผู้ตรวจสอบและอนุมัติ / Approved By</p>
                <div>
                  <p className="text-slate-800 font-medium">(____________________________________)</p>
                  <p className="text-slate-600 mt-1">วันที่ / DATE : ____ / _____ / ________</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
