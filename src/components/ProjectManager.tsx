import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  FileSpreadsheet, 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  X,
  CheckCircle2,
  FolderPlus,
  Trash2,
  Edit3,
  Edit2,
  Ruler,
  ClipboardList
} from 'lucide-react';
import { Project } from '../types';
import { DEFAULT_SHEET_INCOME, DEFAULT_SHEET_BILLING } from '../data/mockData';

export const getGoogleDriveUrl = (idOrUrl?: string) => {
  if (!idOrUrl || !idOrUrl.trim()) return null;
  const val = idOrUrl.trim();
  if (val.startsWith('http://') || val.startsWith('https://')) {
    return val;
  }
  return `https://drive.google.com/file/d/${val}/view`;
};

interface ProjectManagerProps {
  projects: Project[];
  isOpenModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onAddProject: (proj: Omit<Project, 'id'>) => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => void;
  incomeSheetId?: string | null;
  billingSheetId?: string | null;
  isAdmin?: boolean;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  isOpenModal,
  onCloseModal,
  onOpenModal,
  onAddProject,
  onDeleteProject,
  onUpdateProject,
  incomeSheetId,
  billingSheetId,
  isAdmin
}) => {
  const [code, setCode] = useState<string>(`PP-2026-0${projects.length + 1}`);
  const [name, setName] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [contractValue, setContractValue] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [sheetUrlIncome, setSheetUrlIncome] = useState<string>(DEFAULT_SHEET_INCOME);
  const [sheetUrlBilling, setSheetUrlBilling] = useState<string>(DEFAULT_SHEET_BILLING);
  const [drawingDriveId, setDrawingDriveId] = useState<string>('');
  const [boqDriveId, setBoqDriveId] = useState<string>('');

  // Deletion confirmation state
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Edit state
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editCode, setEditCode] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editClientName, setEditClientName] = useState<string>('');
  const [editContractValue, setEditContractValue] = useState<string>('');
  const [editBudget, setEditBudget] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'active' | 'completed'>('active');
  const [editDrawingDriveId, setEditDrawingDriveId] = useState<string>('');
  const [editBoqDriveId, setEditBoqDriveId] = useState<string>('');

  useEffect(() => {
    if (projectToEdit) {
      setEditCode(projectToEdit.code);
      setEditName(projectToEdit.name);
      setEditClientName(projectToEdit.clientName || '');
      setEditContractValue(projectToEdit.contractValue.toString());
      setEditBudget(projectToEdit.budget.toString());
      setEditStartDate(projectToEdit.startDate || new Date().toISOString().split('T')[0]);
      setEditEndDate(projectToEdit.endDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]);
      setEditStatus(projectToEdit.status === 'completed' ? 'completed' : 'active');
      setEditDrawingDriveId(projectToEdit.drawingDriveId || '');
      setEditBoqDriveId(projectToEdit.boqDriveId || '');
    }
  }, [projectToEdit]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit || !onUpdateProject) return;

    onUpdateProject(projectToEdit.id, {
      code: editCode.trim() || projectToEdit.code,
      name: editName.trim() || projectToEdit.name,
      clientName: editClientName.trim() || 'ไม่ระบุ',
      contractValue: Number(editContractValue) || 0,
      budget: Number(editBudget) || 0,
      startDate: editStartDate || projectToEdit.startDate,
      endDate: editEndDate || projectToEdit.endDate,
      status: editStatus,
      drawingDriveId: editDrawingDriveId.trim(),
      boqDriveId: editBoqDriveId.trim()
    });
    setProjectToEdit(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('กรุณากรอกชื่อโครงการก่อสร้าง');
      return;
    }

    onAddProject({
      code: code || `PP-2026-${Date.now().toString().slice(-2)}`,
      name,
      clientName: clientName.trim() || 'ไม่ระบุ',
      contractValue: parseFloat(contractValue) || 0,
      budget: parseFloat(budget) || 0,
      startDate,
      endDate,
      status: 'active',
      sheetUrlIncome: sheetUrlIncome || DEFAULT_SHEET_INCOME,
      sheetUrlBilling: sheetUrlBilling || DEFAULT_SHEET_BILLING,
      sheetTabName: name.trim(),
      drawingDriveId: drawingDriveId.trim(),
      boqDriveId: boqDriveId.trim()
    });

    // Reset
    setName('');
    setClientName('');
    setContractValue('');
    setBudget('');
    setDrawingDriveId('');
    setBoqDriveId('');
    onCloseModal();
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            การจัดการโครงการ & ชีตแต่ละงาน (Project & Sheet Management)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            เพิ่มโครงการใหม่เพื่อสร้างชีตติดตาม แยกรายรับรายจ่ายและการวางบิลอิสระ
          </p>
        </div>

        <button
          onClick={onOpenModal}
          className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มโครงการใหม่ (เพิ่มชีต)</span>
        </button>
      </div>

      {/* Projects Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((p) => (
          <div 
            key={p.id}
            className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl shadow-lg transition-all flex flex-col justify-between space-y-4 group"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                    {p.code}
                  </span>
                  {p.status === 'completed' ? (
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                      เสร็จสิ้น
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ดำเนินงานอยู่
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {isAdmin && onUpdateProject && (
                    <button
                      onClick={() => setProjectToEdit(p)}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="แก้ไขโครงการ"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && onDeleteProject && (
                    <button
                      onClick={() => setProjectToDelete(p.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="ลบโครงการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-white mt-2 group-hover:text-amber-300 transition-colors line-clamp-2">
                {p.name}
              </h3>
              <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
                <p className="flex items-center gap-1">
                  👤 ผู้ว่าจ้าง: <span className="text-slate-200 font-semibold">{p.clientName}</span>
                </p>
                {p.startDate && (
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-500/20">
                    ⏱️ ดำเนินการมาแล้ว {Math.max(0, Math.floor(( (p.status === 'completed' && p.endDate ? new Date(p.endDate).getTime() : Date.now()) - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)))} วัน
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">มูลค่าสัญญา:</span>
                  <span className="font-bold text-emerald-400">฿{p.contractValue.toLocaleString('th-TH')}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">งบประมาณ:</span>
                  <span className="font-bold text-amber-400">฿{p.budget.toLocaleString('th-TH')}</span>
                </div>
              </div>
            </div>

            {/* Google Sheets & Drive Action Links for this Project */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center space-x-2">
                <a
                  href={p.sheetUrlIncome || (incomeSheetId ? `https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit` : '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold py-2 px-2 rounded-xl transition-all"
                  title="เปิด Google Sheets บัญชีงานนี้"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ชีตรายรับจ่าย</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>

                <a
                  href={p.sheetUrlBilling || (billingSheetId ? `https://docs.google.com/spreadsheets/d/${billingSheetId}/edit` : '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-xs font-bold py-2 px-2 rounded-xl transition-all"
                  title="เปิด Google Sheets การวางบิลงานนี้"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                  <span>ชีตวางบิล</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>

              {/* Google Drive Links for แบบ & BOQ */}
              <div className="flex items-center space-x-2">
                {getGoogleDriveUrl(p.drawingDriveId) ? (
                  <a
                    href={getGoogleDriveUrl(p.drawingDriveId)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold py-2 px-2 rounded-xl transition-all"
                    title="เปิดดูแบบโครงการบน Google Drive"
                  >
                    <Ruler className="w-3.5 h-3.5 text-purple-400" />
                    <span>แบบโครงการ</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <button
                    onClick={() => setProjectToEdit(p)}
                    className="flex-1 flex items-center justify-center space-x-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-purple-300 text-xs font-medium py-2 px-2 rounded-xl transition-all"
                    title="คลิกเพื่อแก้ไขและใส่ ID/ลิงก์ แบบโครงการ"
                  >
                    <Ruler className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ ใส่ ID แบบ</span>
                  </button>
                )}

                {getGoogleDriveUrl(p.boqDriveId) ? (
                  <a
                    href={getGoogleDriveUrl(p.boqDriveId)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-bold py-2 px-2 rounded-xl transition-all"
                    title="เปิดดู BOQ บน Google Drive"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                    <span>BOQ โครงการ</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <button
                    onClick={() => setProjectToEdit(p)}
                    className="flex-1 flex items-center justify-center space-x-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-amber-300 text-xs font-medium py-2 px-2 rounded-xl transition-all"
                    title="คลิกเพื่อแก้ไขและใส่ ID/ลิงก์ BOQ"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ ใส่ ID BOQ</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Add New Project Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  เพิ่มโครงการใหม่ (สร้าง/เชื่อมต่อชีต)
                </h3>
              </div>
              <button 
                onClick={onCloseModal}
                className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    รหัสโครงการ
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อชีตย่อย (อัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={name || 'ใช้อัตโนมัติตามชื่อโครงการ'}
                    className="w-full bg-slate-950/60 border border-slate-800 text-slate-400 rounded-xl px-3 py-2 text-xs font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชื่อโครงการก่อสร้าง <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น โครงการก่อสร้างโรงงาน..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชื่อผู้ว่าจ้าง / ลูกค้า <span className="text-slate-500 font-normal">(ไม่จำเป็นต้องกรอก)</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="เช่น บริษัท เอสพี จำกัด (ถ้ามี)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    วันที่เริ่มโครงการ
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    วันที่สิ้นสุดโครงการ
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Google Drive Files: แบบ & BOQ */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <p className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-purple-400" />
                  ไฟล์ Google Drive (แบบแปลน & BOQ โครงการ)
                </p>
                <div>
                  <label className="block text-[10px] text-slate-300 mb-0.5">
                    ID หรือ ลิงก์ Google Drive ไฟล์แบบ (Drawing):
                  </label>
                  <input
                    type="text"
                    value={drawingDriveId}
                    onChange={(e) => setDrawingDriveId(e.target.value)}
                    placeholder="ใส่ File ID (เช่น 1A2b3C...) หรือ ลิงก์เต็ม Google Drive"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-purple-300 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-300 mb-0.5">
                    ID หรือ ลิงก์ Google Drive ไฟล์ BOQ:
                  </label>
                  <input
                    type="text"
                    value={boqDriveId}
                    onChange={(e) => setBoqDriveId(e.target.value)}
                    placeholder="ใส่ File ID (เช่น 1X2y3Z...) หรือ ลิงก์เต็ม Google Drive"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Sheet URLs */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ลิงก์ Google Sheets สำหรับโครงการนี้ (ใช้ลิงก์ตั้งต้น หรือสร้างชีตใหม่)
                </p>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Sheet รายรับรายจ่าย:</label>
                  <input
                    type="text"
                    value={sheetUrlIncome}
                    onChange={(e) => setSheetUrlIncome(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Sheet การวางบิล:</label>
                  <input
                    type="text"
                    value={sheetUrlBilling}
                    onChange={(e) => setSheetUrlBilling(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-blue-300 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 font-extrabold text-xs text-slate-950 rounded-xl transition-all shadow-md"
              >
                บันทึกสร้างโครงการใหม่
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">ยืนยันการลบโครงการ?</h3>
              <p className="text-xs text-slate-400">
                คุณต้องการลบโครงการนี้ใช่หรือไม่? 
                หากลบแล้ว แท็บสำหรับโครงการนี้ใน Google Drive จะถูกลบด้วย
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (onDeleteProject) {
                    onDeleteProject(projectToDelete);
                  }
                  setProjectToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {projectToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                แก้ไขข้อมูลโครงการ
              </h3>
              <button onClick={() => setProjectToEdit(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    รหัสโครงการ
                  </label>
                  <input 
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ผู้ว่าจ้าง / ลูกค้า
                  </label>
                  <input 
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชื่อโครงการ
                </label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    มูลค่าสัญญา (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">฿</span>
                    <input 
                      type="number"
                      value={editContractValue}
                      onChange={(e) => setEditContractValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-7 pr-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    งบประมาณ (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">฿</span>
                    <input 
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-7 pr-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    วันที่เริ่มโครงการ
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    วันที่สิ้นสุดโครงการ
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  สถานะโครงการ
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'completed')}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="active">ดำเนินงานอยู่</option>
                  <option value="completed">เสร็จสิ้น</option>
                </select>
              </div>

              {/* Google Drive Files: แบบ & BOQ */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <p className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-purple-400" />
                  ไฟล์ Google Drive (แบบแปลน & BOQ โครงการ)
                </p>
                <div>
                  <label className="block text-[10px] text-slate-300 mb-0.5">
                    ID หรือ ลิงก์ Google Drive ไฟล์แบบ (Drawing):
                  </label>
                  <input
                    type="text"
                    value={editDrawingDriveId}
                    onChange={(e) => setEditDrawingDriveId(e.target.value)}
                    placeholder="ใส่ File ID หรือ ลิงก์เต็ม Google Drive"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-purple-300 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-300 mb-0.5">
                    ID หรือ ลิงก์ Google Drive ไฟล์ BOQ:
                  </label>
                  <input
                    type="text"
                    value={editBoqDriveId}
                    onChange={(e) => setEditBoqDriveId(e.target.value)}
                    placeholder="ใส่ File ID หรือ ลิงก์เต็ม Google Drive"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectToEdit(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
