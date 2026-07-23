import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  FileSpreadsheet, 
  ExternalLink, 
  Calendar, 
  Building2, 
  Trash2,
  BellRing,
  Printer
} from 'lucide-react';
import { Project, BillingItem, BillingStatus } from '../types';

interface BillingManagerProps {
  billingItems: BillingItem[];
  projects: Project[];
  onUpdateBillingStatus: (id: string, newStatus: BillingStatus, newPaidDate?: string) => void;
  onDeleteBillingItem: (id: string) => void;
  onOpenMobileForm: () => void;
  onOpenPdfModal?: (item?: BillingItem) => void;
  isAdmin?: boolean;
}

export const BillingManager: React.FC<BillingManagerProps> = ({
  billingItems,
  projects,
  onUpdateBillingStatus,
  onDeleteBillingItem,
  onOpenMobileForm,
  onOpenPdfModal,
  isAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredBilling = useMemo(() => {
    return billingItems.filter(item => {
      const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const matchProject = selectedProjectId === 'all' || item.projectId === selectedProjectId;
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        item.invoiceNo.toLowerCase().includes(searchLower) ||
        item.projectName.toLowerCase().includes(searchLower) ||
        item.clientName.toLowerCase().includes(searchLower) ||
        item.period.toLowerCase().includes(searchLower);

      return matchStatus && matchProject && matchSearch;
    }).sort((a, b) => b.billingDate.localeCompare(a.billingDate));
  }, [billingItems, selectedStatus, selectedProjectId, searchTerm]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            ระบบการวางบิลและติดตามชำระเงิน (Billing & Invoicing)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            จัดการใบวางบิล ติดตาม Due Date และสถานะการชำระเงิน
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onOpenPdfModal && (
            <button
              onClick={() => onOpenPdfModal()}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-2 rounded-xl transition-all shadow-md active:scale-95"
              title="ส่งออกตารางสรุปการวางบิลทั้งหมดเป็น PDF"
            >
              <Printer className="w-4 h-4" />
              <span>ส่งออก PDF / พิมพ์</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenMobileForm}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ ออกใบวางบิลใหม่</span>
            </button>
          )}
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
            placeholder="ค้นหาเลขที่ใบวางบิล, โครงการ, ชื่อลูกค้า..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">สถานะ: ทั้งหมด</option>
            <option value="pending">🟡 รอวางบิล (Pending)</option>
            <option value="billed">🔵 วางบิลแล้ว (Billed)</option>
            <option value="paid">🟢 ชำระเงินแล้ว (Paid)</option>
            <option value="overdue">🔴 เกินกำหนดชำระ (Overdue)</option>
          </select>
        </div>

        {/* Project Select */}
        <div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">โครงการ: ทุกโครงการ</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Billing Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">เลขที่ใบวางบิล / โครงการ</th>
              <th className="py-3 px-4">ผู้ว่าจ้าง / งวดงาน</th>
              <th className="py-3 px-4">วันวางบิล / วันครบกำหนด</th>
              <th className="py-3 px-4 text-right">ยอดรับสุทธิ (บาท)</th>
              <th className="py-3 px-4 text-center">สถานะ</th>
              <th className="py-3 px-4 text-center">อัปเดตสถานะ & LINE</th>
              <th className="py-3 px-4 text-center">ชีต</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredBilling.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  ไม่พบรายการวางบิลตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredBilling.map((item) => {
                const project = projects.find(p => p.id === item.projectId);

                return (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    
                    {/* Invoice No & Project */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-blue-400 text-sm">
                        {item.invoiceNo}
                      </div>
                      <div className="text-white font-semibold text-xs mt-0.5 line-clamp-1">
                        {item.projectName}
                      </div>
                    </td>

                    {/* Client & Period */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-bold">
                        👤 {item.clientName}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        📌 {item.period}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 text-xs flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        วางบิล: {item.billingDate}
                      </div>
                      <div className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${
                        item.status === 'overdue' ? 'text-red-400 font-bold' : 'text-slate-400'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        ครบกำหนด: {item.dueDate}
                      </div>
                    </td>

                    {/* Total Net Amount */}
                    <td className="py-3.5 px-4 text-right font-black text-sm text-amber-300">
                      ฿{item.totalPayable.toLocaleString('th-TH')}
                      <div className="text-[10px] text-slate-500 font-normal">
                        (ก่อนภาษี: ฿{item.amount.toLocaleString()})
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          รอวางบิล
                        </span>
                      )}
                      {item.status === 'billed' && (
                        <span className="inline-flex items-center gap-1 bg-blue-950 text-blue-300 border border-blue-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                          <FileText className="w-3 h-3" />
                          วางบิลแล้ว
                        </span>
                      )}
                      {item.status === 'paid' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          ชำระแล้ว
                        </span>
                      )}
                      {item.status === 'overdue' && (
                        <span className="inline-flex items-center gap-1 bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          เกินกำหนด
                        </span>
                      )}
                    </td>

                    {/* Status Updater + LINE Trigger Button */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <div className="flex items-center justify-center space-x-1.5">
                          <select
                            value={item.status}
                            onChange={(e) => onUpdateBillingStatus(item.id, e.target.value as BillingStatus)}
                            disabled={!isAdmin}
                            className={`bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <option value="pending">รอวางบิล</option>
                            <option value="billed">วางบิลแล้ว</option>
                            <option value="paid">ชำระแล้ว</option>
                            <option value="overdue">เกินกำหนด</option>
                          </select>
                        </div>
                        {item.status === 'paid' && (
                          <input
                            type="date"
                            value={item.paidDate || ''}
                            onChange={(e) => onUpdateBillingStatus(item.id, 'paid', e.target.value)}
                            disabled={!isAdmin}
                            onClick={(e) => { if (isAdmin) { try { e.currentTarget.showPicker(); } catch (_) {} } }}
                            className={`w-full max-w-[120px] bg-slate-950 border border-slate-700 text-[10px] text-emerald-400 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 [color-scheme:dark] ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            title="วันที่ชำระเงิน"
                          />
                        )}
                      </div>
                    </td>

                    {/* Actions: PDF Print, Google Sheets Link, Delete */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {onOpenPdfModal && (
                          <button
                            onClick={() => onOpenPdfModal(item)}
                            className="p-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 rounded-lg transition-transform hover:scale-110"
                            title="พิมพ์ / ส่งออกใบวางบิลเป็น PDF"
                          >
                            <Printer className="w-4 h-4 text-amber-400" />
                          </button>
                        )}

                        <a
                          href={item.sheetUrl || project?.sheetUrlBilling || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-500/40 text-blue-300 rounded-lg transition-transform hover:scale-110"
                          title="เปิดชีต Google Sheets การวางบิล"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                        </a>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (deletingId === item.id) {
                                onDeleteBillingItem(item.id);
                                setDeletingId(null);
                              } else {
                                setDeletingId(item.id);
                                setTimeout(() => setDeletingId(null), 3000);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${deletingId === item.id ? 'bg-red-600 text-white hover:bg-red-500' : 'text-slate-500 hover:text-red-400'}`}
                            title={deletingId === item.id ? 'คลิกอีกครั้งเพื่อยืนยัน' : 'ลบ'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
