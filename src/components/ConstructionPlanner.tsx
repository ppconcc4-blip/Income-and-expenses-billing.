import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  Layers, 
  Save, 
  RefreshCw,
  Sliders,
  ChevronLeft,
  Building2
} from 'lucide-react';
import { Project } from '../types';
import { PPLogo } from './PPLogo';

export interface PlannerTask {
  id: string;
  phaseId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  assignedTo?: string; // ผู้รับผิดชอบ
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  isMilestone?: boolean;
  notes?: string;
}

export interface PlannerPhase {
  id: string;
  name: string; // e.g. งานฐานราก, งานโครงสร้าง
  order: number;
}

// Default initial planner data for each project if not saved yet
const DEFAULT_PHASES: PlannerPhase[] = [
  { id: 'phase-1', name: '1. งานเตรียมการและเคลียร์พื้นที่ (Site Preparation)', order: 1 },
  { id: 'phase-2', name: '2. งานวิศวกรรมฐานราก (Substructure & Foundation)', order: 2 },
  { id: 'phase-3', name: '3. งานวิศวกรรมโครงสร้างส่วนบน (Superstructure)', order: 3 },
  { id: 'phase-4', name: '4. งานระบบไฟฟ้า สุขาภิบาล และสถาปัตยกรรม (MEP & Architectural)', order: 4 },
  { id: 'phase-5', name: '5. งานตกแต่งและส่งมอบอาคาร (Finishing & Handover)', order: 5 }
];

const DEFAULT_TASKS: PlannerTask[] = [
  // Phase 1
  {
    id: 'task-1-1',
    phaseId: 'phase-1',
    name: 'ปรับระดับดินและเคลียร์พื้นที่ก่อสร้าง',
    startDate: '2026-07-01',
    endDate: '2026-07-06',
    progress: 100,
    assignedTo: 'ผู้รับเหมาปรับดิน',
    status: 'completed'
  },
  {
    id: 'task-1-2',
    phaseId: 'phase-1',
    name: 'ทำรั้วไซส์งานชั่วคราวและตู้คอนเทนเนอร์สำนักงาน',
    startDate: '2026-07-05',
    endDate: '2026-07-10',
    progress: 100,
    assignedTo: 'ช่างวิโรจน์',
    status: 'completed'
  },
  {
    id: 'task-1-3',
    phaseId: 'phase-1',
    name: 'ติดตั้งตู้ไฟชั่วคราวและน้ำประปาไซส์งาน',
    startDate: '2026-07-08',
    endDate: '2026-07-12',
    progress: 100,
    assignedTo: 'ทีมช่างไฟไซส์',
    status: 'completed'
  },
  {
    id: 'task-1-4',
    phaseId: 'phase-1',
    name: 'งานวางผัง หมุดพิกัด และแนวอาคาร',
    startDate: '2026-07-12',
    endDate: '2026-07-15',
    progress: 100,
    assignedTo: 'วิศวกรสมเกียรติ',
    status: 'completed'
  },
  // Phase 2
  {
    id: 'task-2-1',
    phaseId: 'phase-2',
    name: 'งานเจาะเสาเข็มลึก 21 เมตร และทดสอบแรงแบกทาน (Seismic Test)',
    startDate: '2026-07-15',
    endDate: '2026-07-24',
    progress: 100,
    assignedTo: 'บจก.เข็มแกร่ง',
    status: 'completed'
  },
  {
    id: 'task-2-2',
    phaseId: 'phase-2',
    name: 'ขุดดินรอบเสาเข็ม หล่อลีนคอนกรีตฐานราก',
    startDate: '2026-07-23',
    endDate: '2026-07-28',
    progress: 85,
    assignedTo: 'ช่างสมยศ',
    status: 'in_progress'
  },
  {
    id: 'task-2-3',
    phaseId: 'phase-2',
    name: 'ผูกเหล็กและเข้าแบบโครงสร้างฐานราก (Footing)',
    startDate: '2026-07-26',
    endDate: '2026-08-01',
    progress: 40,
    assignedTo: 'ช่างสมยศ',
    status: 'in_progress'
  },
  {
    id: 'task-2-4',
    phaseId: 'phase-2',
    name: 'เทคอนกรีตฐานรากและคานคอดิน (Ground Beam)',
    startDate: '2026-07-31',
    endDate: '2026-08-07',
    progress: 0,
    assignedTo: 'ช่างอุดม',
    status: 'not_started'
  },
  // Phase 3
  {
    id: 'task-3-1',
    phaseId: 'phase-3',
    name: 'หล่อเสาตอม่อและเทคานชั้น 1',
    startDate: '2026-08-06',
    endDate: '2026-08-15',
    progress: 0,
    assignedTo: 'ช่างอุดม',
    status: 'not_started'
  },
  {
    id: 'task-3-2',
    phaseId: 'phase-3',
    name: 'ติดตั้งแผ่นพื้นคอนกรีตสำเร็จรูปและเท Topping ชั้น 1',
    startDate: '2026-08-14',
    endDate: '2026-08-20',
    progress: 0,
    assignedTo: 'ช่างอุดม',
    status: 'not_started'
  },
  {
    id: 'task-3-3',
    phaseId: 'phase-3',
    name: 'หล่อเสา คาน และพื้นสำเร็จรูป ชั้น 2',
    startDate: '2026-08-19',
    endDate: '2026-09-02',
    progress: 0,
    assignedTo: 'ช่างอุดม',
    status: 'not_started'
  },
  {
    id: 'task-3-4',
    phaseId: 'phase-3',
    name: 'ติดตั้งโครงหลังคาเหล็กถัก (Truss) กันสนิม',
    startDate: '2026-08-30',
    endDate: '2026-09-12',
    progress: 0,
    assignedTo: 'ช่างเหล็กแสงทอง',
    status: 'not_started'
  },
  {
    id: 'task-3-5',
    phaseId: 'phase-3',
    name: 'มุงหลังคาแผ่นเมทัลชีทและติดตั้งฉนวนกันความร้อน PU',
    startDate: '2026-09-10',
    endDate: '2026-09-20',
    progress: 0,
    assignedTo: 'ช่างเหล็กแสงทอง',
    status: 'not_started'
  },
  // Phase 4
  {
    id: 'task-4-1',
    phaseId: 'phase-4',
    name: 'งานก่อผนังอิฐมอญเบา (ชั้น 1 และ ชั้น 2)',
    startDate: '2026-09-18',
    endDate: '2026-10-10',
    progress: 0,
    assignedTo: 'ทีมช่างก่อฉาบ',
    status: 'not_started'
  },
  {
    id: 'task-4-2',
    phaseId: 'phase-4',
    name: 'เดินท่อร้อยสายไฟฝังผนังและติดตั้งตู้ Consumer Unit',
    startDate: '2026-09-25',
    endDate: '2026-10-15',
    progress: 0,
    assignedTo: 'ช่างไฟมนตรี',
    status: 'not_started'
  },
  {
    id: 'task-4-3',
    phaseId: 'phase-4',
    name: 'เดินท่อน้ำดี/น้ำทิ้ง และระบบสุขาภิบาลฝังผนัง',
    startDate: '2026-09-28',
    endDate: '2026-10-18',
    progress: 0,
    assignedTo: 'ทีมช่างประปา',
    status: 'not_started'
  },
  {
    id: 'task-4-4',
    phaseId: 'phase-4',
    name: 'งานฉาบปูนตกแต่งผนังภายใน-ภายนอก',
    startDate: '2026-10-08',
    endDate: '2026-10-30',
    progress: 0,
    assignedTo: 'ทีมช่างก่อฉาบ',
    status: 'not_started'
  },
  {
    id: 'task-4-5',
    phaseId: 'phase-4',
    name: 'ติดตั้งระบบฝ้าเพดานยิปซั่มบอร์ดฉาบเรียบ',
    startDate: '2026-10-25',
    endDate: '2026-11-10',
    progress: 0,
    assignedTo: 'ช่างฝ้าดีไซน์',
    status: 'not_started'
  },
  // Phase 5
  {
    id: 'task-5-1',
    phaseId: 'phase-5',
    name: 'ปูกระเบื้องพื้นและผนังห้องน้ำ (แกรนิตโต้)',
    startDate: '2026-11-05',
    endDate: '2026-11-20',
    progress: 0,
    assignedTo: 'ช่างประสิทธิ์',
    status: 'not_started'
  },
  {
    id: 'task-5-2',
    phaseId: 'phase-5',
    name: 'ติดตั้งประตู หน้าต่างอลูมิเนียมอบดำ และกระจกเขียวตัดแสง',
    startDate: '2026-11-12',
    endDate: '2026-11-22',
    progress: 0,
    assignedTo: 'บจก.อลูกระจก',
    status: 'not_started'
  },
  {
    id: 'task-5-3',
    phaseId: 'phase-5',
    name: 'งานทาสีรองพื้นและทาสีจริง ภายใน-ภายนอก TOA',
    startDate: '2026-11-18',
    endDate: '2026-12-05',
    progress: 0,
    assignedTo: 'ช่างสุนทร',
    status: 'not_started'
  },
  {
    id: 'task-5-4',
    phaseId: 'phase-5',
    name: 'ติดตั้งสุขภัณฑ์ห้องน้ำและดวงโคมสวิตช์ปลั๊กไฟ',
    startDate: '2026-11-28',
    endDate: '2026-12-10',
    progress: 0,
    assignedTo: 'ช่างไฟมนตรี & ช่างประปา',
    status: 'not_started'
  },
  {
    id: 'task-5-5',
    phaseId: 'phase-5',
    name: 'ทำความสะอาดสะอ้านใหญ่ (Big Cleaning) และตรวจรับมอบงาน',
    startDate: '2026-12-08',
    endDate: '2026-12-15',
    progress: 0,
    assignedTo: 'ทีมตรวจวิศวกร',
    status: 'not_started'
  }
];

export function ConstructionPlanner({ projects, onClose }: { projects: Project[], onClose?: () => void }) {
  // Active Project Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return projects[0]?.id || 'proj-1';
  });

  // Load phases and tasks per project from local storage
  const [phases, setPhases] = useState<PlannerPhase[]>(DEFAULT_PHASES);
  const [tasks, setTasks] = useState<PlannerTask[]>(DEFAULT_TASKS);

  // Load state on mount/project change
  useEffect(() => {
    const key = `pp_planner_data_${selectedProjectId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.phases && parsed.tasks) {
          setPhases(parsed.phases);
          setTasks(parsed.tasks);
          return;
        }
      } catch (err) {
        console.error('Failed to parse saved planner data:', err);
      }
    }
    // Fallback/Default for this project
    setPhases(DEFAULT_PHASES);
    // Shift default task dates relative to selected project start date if available
    const project = projects.find(p => p.id === selectedProjectId);
    if (project && project.startDate) {
      const pStart = new Date(project.startDate);
      const defaultStart = new Date('2026-07-01');
      const timeDiff = pStart.getTime() - defaultStart.getTime();
      
      const shiftedTasks = DEFAULT_TASKS.map(t => {
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);
        
        const newStart = new Date(tStart.getTime() + timeDiff);
        const newEnd = new Date(tEnd.getTime() + timeDiff);
        
        return {
          ...t,
          startDate: newStart.toISOString().split('T')[0],
          endDate: newEnd.toISOString().split('T')[0]
        };
      });
      setTasks(shiftedTasks);
    } else {
      setTasks(DEFAULT_TASKS);
    }
  }, [selectedProjectId, projects]);

  // Save to local storage whenever phases or tasks change
  const savePlannerData = (updatedPhases: PlannerPhase[], updatedTasks: PlannerTask[]) => {
    const key = `pp_planner_data_${selectedProjectId}`;
    localStorage.setItem(key, JSON.stringify({ phases: updatedPhases, tasks: updatedTasks }));
  };

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Zoom Level state: 'day' | 'week' | 'month'
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('week');

  // Modal State for Add/Edit task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null);

  // Modal fields state
  const [taskName, setTaskName] = useState('');
  const [taskPhaseId, setTaskPhaseId] = useState('');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskEndDate, setTaskEndDate] = useState('');
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskStatus, setTaskStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'delayed'>('not_started');
  const [taskNotes, setTaskNotes] = useState('');

  // Modal State for Add Phase
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [phaseNameInput, setPhaseNameInput] = useState('');

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Calendar Timeline calculations
  const getTimelineRange = () => {
    if (tasks.length === 0) {
      return {
        start: new Date('2026-07-01'),
        end: new Date('2026-12-31')
      };
    }
    const dates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add 5 days buffer on start and end
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    return {
      start: minDate,
      end: maxDate
    };
  };

  const { start: timelineStart, end: timelineEnd } = getTimelineRange();

  // Generate date points for grid columns
  const getTimelineColumns = () => {
    const cols = [];
    const curr = new Date(timelineStart);
    
    if (zoomLevel === 'day') {
      while (curr <= timelineEnd) {
        cols.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
    } else if (zoomLevel === 'week') {
      // Find previous Monday or start
      const day = curr.getDay();
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      curr.setDate(diff);
      while (curr <= timelineEnd) {
        cols.push(new Date(curr));
        curr.setDate(curr.getDate() + 7);
      }
    } else { // month
      curr.setDate(1); // start of month
      while (curr <= timelineEnd) {
        cols.push(new Date(curr));
        curr.setMonth(curr.getMonth() + 1);
      }
    }
    return cols;
  };

  const columns = getTimelineColumns();

  // Helper to format date label
  const formatDateLabel = (date: Date) => {
    if (zoomLevel === 'day') {
      return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    } else if (zoomLevel === 'week') {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${date.getDate()} - ${weekEnd.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}`;
    } else {
      return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    }
  };

  const formatHeaderMonth = (date: Date) => {
    return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  };

  // Calculate percentage offset and width for task bar
  const getTaskBarCoords = (startDateStr: string, endDateStr: string) => {
    const tStart = new Date(startDateStr).getTime();
    const tEnd = new Date(endDateStr).getTime();
    const timelineTotalTime = timelineEnd.getTime() - timelineStart.getTime();

    const leftPercentage = ((tStart - timelineStart.getTime()) / timelineTotalTime) * 100;
    const widthPercentage = ((tEnd - tStart) / timelineTotalTime) * 100;

    return {
      left: `${Math.max(0, leftPercentage)}%`,
      width: `${Math.max(1, widthPercentage)}%`
    };
  };

  // Handlers for Add/Edit/Delete Tasks
  const handleOpenAddTask = (phaseId: string) => {
    setModalMode('add');
    setSelectedTask(null);
    setTaskName('');
    setTaskPhaseId(phaseId);
    
    // Set default dates based on today or project start
    const todayStr = new Date().toISOString().split('T')[0];
    setTaskStartDate(todayStr);
    
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    setTaskEndDate(weekLater.toISOString().split('T')[0]);
    
    setTaskProgress(0);
    setTaskAssignedTo('');
    setTaskStatus('not_started');
    setTaskNotes('');
    
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: PlannerTask) => {
    setModalMode('edit');
    setSelectedTask(task);
    setTaskName(task.name);
    setTaskPhaseId(task.phaseId);
    setTaskStartDate(task.startDate);
    setTaskEndDate(task.endDate);
    setTaskProgress(task.progress);
    setTaskAssignedTo(task.assignedTo || '');
    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName || !taskStartDate || !taskEndDate || !taskPhaseId) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (new Date(taskStartDate) > new Date(taskEndDate)) {
      alert('วันที่เริ่มต้น ไม่สามารถอยู่หลังวันที่สิ้นสุดได้');
      return;
    }

    let updatedTasks: PlannerTask[];
    if (modalMode === 'add') {
      const newTask: PlannerTask = {
        id: `task-${Date.now()}`,
        phaseId: taskPhaseId,
        name: taskName,
        startDate: taskStartDate,
        endDate: taskEndDate,
        progress: Number(taskProgress),
        assignedTo: taskAssignedTo,
        status: taskStatus,
        notes: taskNotes
      };
      updatedTasks = [...tasks, newTask];
    } else {
      updatedTasks = tasks.map(t => {
        if (t.id === selectedTask?.id) {
          return {
            ...t,
            phaseId: taskPhaseId,
            name: taskName,
            startDate: taskStartDate,
            endDate: taskEndDate,
            progress: Number(taskProgress),
            assignedTo: taskAssignedTo,
            status: taskStatus,
            notes: taskNotes
          };
        }
        return t;
      });
    }

    setTasks(updatedTasks);
    savePlannerData(phases, updatedTasks);
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการแผนงานนี้?')) {
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      savePlannerData(phases, updated);
    }
  };

  // Handlers for Phases
  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseNameInput.trim()) return;

    const newPhase: PlannerPhase = {
      id: `phase-${Date.now()}`,
      name: `${phases.length + 1}. ${phaseNameInput.trim()}`,
      order: phases.length + 1
    };

    const updatedPhases = [...phases, newPhase];
    setPhases(updatedPhases);
    savePlannerData(updatedPhases, tasks);
    setPhaseNameInput('');
    setIsPhaseModalOpen(false);
  };

  const handleDeletePhase = (phaseId: string) => {
    const tasksInPhase = tasks.filter(t => t.phaseId === phaseId);
    if (tasksInPhase.length > 0) {
      if (!confirm(`มีรายการงานทั้งหมด ${tasksInPhase.length} งานในหมวดหมู่นี้ คุณต้องการลบหมวดหมู่และงานทั้งหมดหรือไม่?`)) {
        return;
      }
    } else {
      if (!confirm('คุณต้องการลบหมวดหมู่นี้หรือไม่?')) {
        return;
      }
    }

    const updatedPhases = phases.filter(p => p.id !== phaseId);
    const updatedTasks = tasks.filter(t => t.phaseId !== phaseId);

    setPhases(updatedPhases);
    setTasks(updatedTasks);
    savePlannerData(updatedPhases, updatedTasks);
  };

  // Auto-Update status when progress changes
  const handleProgressSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTaskProgress(val);
    if (val === 100) {
      setTaskStatus('completed');
    } else if (val > 0 && taskStatus === 'not_started') {
      setTaskStatus('in_progress');
    } else if (val === 0) {
      setTaskStatus('not_started');
    }
  };

  // Quick Inline Progress & Status Update
  const handleQuickUpdateProgress = (taskId: string, newProgress: number) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        let status = t.status;
        if (newProgress === 100) status = 'completed';
        else if (newProgress > 0 && status === 'not_started') status = 'in_progress';
        else if (newProgress === 0) status = 'not_started';
        return { ...t, progress: newProgress, status };
      }
      return t;
    });
    setTasks(updated);
    savePlannerData(phases, updated);
  };

  // Print & Export to PDF Setup
  const handlePrintPlanner = () => {
    window.print();
  };

  // Filter & Search Logic
  const filteredTasks = tasks.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.assignedTo && t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate Overall project completion percent
  const getOverallProgress = () => {
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(totalProgress / tasks.length);
  };

  // Count summary
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const delayedCount = tasks.filter(t => t.status === 'delayed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none print:bg-white print:text-black">
      
      {/* Dynamic Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print relative">
        {/* Blueprint background decoration pattern */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"
        />
        <div className="flex items-center space-x-3.5 relative z-10">
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all mr-1"
              title="ย้อนกลับหน้าหลัก"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {/* PP Construction Geometric Blue Logo */}
          <div className="relative shrink-0 bg-white p-2 rounded-xl shadow-xl border border-slate-700/60 flex items-center justify-center">
            <PPLogo className="w-9 h-9" fillColor="#0a1a8c" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight text-white">
              PP. CONSTRUCTION AND MANAGEMENT CO., LTD
            </h1>
            <p className="text-xs font-semibold text-amber-400 mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 inline shrink-0" />
              <span>บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมนเนจเม้นท์ จำกัด</span>
              <span className="text-slate-500 font-normal">|</span>
              <span className="text-slate-300 font-extrabold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-amber-400 inline" />
                <span>PP. Construction Planner</span>
              </span>
            </p>
            <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 via-amber-400 to-blue-600 rounded-full mt-1.5" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">โครงการ:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-amber-400 border-none outline-none cursor-pointer max-w-[200px]"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">{p.name}</option>
              ))}
            </select>
          </div>

          {/* Zoom Level Selectors */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
            <button
              onClick={() => setZoomLevel('day')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${zoomLevel === 'day' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setZoomLevel('week')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${zoomLevel === 'week' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              รายสัปดาห์
            </button>
            <button
              onClick={() => setZoomLevel('month')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${zoomLevel === 'month' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              รายเดือน
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => setIsPhaseModalOpen(true)}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>เพิ่มหมวดหมู่</span>
          </button>

          <button
            onClick={handlePrintPlanner}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
            title="พิมพ์แผนงานโครงการขนาด A4 แนวนอน"
          >
            <Download className="w-4 h-4" />
            <span>พิมพ์ / บันทึก PDF ( landscape )</span>
          </button>
        </div>
      </header>

      {/* Main Board Container */}
      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-hidden">
        
        {/* Project Meta Info Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row justify-between gap-6 print:border-gray-300 print:bg-white print:text-black">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full print:bg-yellow-100 print:text-yellow-800">
                {currentProject?.code || 'PP-2026-X'}
              </span>
              <h2 className="text-xl font-black text-white print:text-black">{currentProject?.name}</h2>
            </div>
            <p className="text-sm text-slate-400 print:text-gray-600">
              <span className="font-semibold text-slate-300 print:text-black">ผู้ว่าจ้าง:</span> {currentProject?.clientName} | 
              <span className="font-semibold text-slate-300 print:text-black ml-3">ช่วงสัญญา:</span> {currentProject?.startDate} ถึง {currentProject?.endDate}
            </p>
          </div>

          {/* Core progress dashboard widget */}
          <div className="flex flex-wrap items-center gap-6 md:border-l border-slate-800 md:pl-6 print:border-gray-300">
            <div className="flex items-center space-x-3.5">
              <div className="relative w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-950/40 print:border-gray-200">
                <span className="text-sm font-black text-amber-400">{getOverallProgress()}%</span>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold">ความคืบหน้ารวมทั้งหมด</div>
                <div className="text-sm font-black text-white print:text-black">ระบบ WBS เฉลี่ยน้ำหนักคงที่</div>
              </div>
            </div>

            {/* Counts metrics */}
            <div className="flex items-center space-x-4 border-l border-slate-800 pl-4 print:border-gray-300">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">ทั้งหมด</div>
                <div className="text-lg font-black text-slate-300 print:text-black">{totalCount} งาน</div>
              </div>
              <div className="border-r border-slate-800 h-6 print:border-gray-300" />
              <div>
                <div className="text-[10px] text-emerald-500 font-bold uppercase">เสร็จแล้ว</div>
                <div className="text-lg font-black text-emerald-400 print:text-green-700">{completedCount}</div>
              </div>
              <div className="border-r border-slate-800 h-6 print:border-gray-300" />
              <div>
                <div className="text-[10px] text-sky-400 font-bold uppercase">กำลังทำ</div>
                <div className="text-lg font-black text-sky-400 print:text-blue-700">{inProgressCount}</div>
              </div>
              <div className="border-r border-slate-800 h-6 print:border-gray-300" />
              <div>
                <div className="text-[10px] text-rose-500 font-bold uppercase">ล่าช้ากว่าแผน</div>
                <div className="text-lg font-black text-rose-500 print:text-red-700">{delayedCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls (No Print) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-bold mr-2">ตัวกรองสถานะ:</span>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'not_started', label: 'ยังไม่เริ่ม' },
              { id: 'in_progress', label: 'กำลังดำเนินงาน' },
              { id: 'completed', label: 'เสร็จสมบูรณ์' },
              { id: 'delayed', label: 'ล่าช้ากว่าแผน' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setFilterStatus(btn.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  filterStatus === btn.id 
                    ? 'bg-amber-500 text-slate-950 shadow-md' 
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="ค้นหารายชื่อแผนงาน หรือผู้รับผิดชอบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Construction Planner Workspace Table & Gantt */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col flex-1 print:border-gray-300 print:bg-white print:text-black">
          
          {/* Scrollable grid housing both WBS and Gantt */}
          <div className="flex-1 overflow-auto flex max-h-[70vh]">
            
            {/* WBS LEFT TABLE (Fixed/Sticky on horizontal scroll) */}
            <div className="w-[500px] shrink-0 border-r border-slate-800 bg-slate-900 sticky left-0 z-20 flex flex-col print:border-gray-300 print:bg-white">
              
              {/* Header */}
              <div className="h-[60px] border-b border-slate-800 px-4 flex items-center bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 print:border-gray-300 print:bg-gray-100 print:text-black">
                <div className="w-[4%] text-center"></div>
                <div className="w-[46%] pl-2">หัวข้อแผนงานก่อสร้าง (WBS)</div>
                <div className="w-[20%] text-center">ระยะเวลา</div>
                <div className="w-[18%] text-center">ผู้รับผิดชอบ</div>
                <div className="w-[12%] text-center no-print">จัดการ</div>
              </div>

              {/* Phases and Tasks */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 print:divide-gray-200">
                {phases.map((phase) => {
                  const tasksInPhase = filteredTasks.filter(t => t.phaseId === phase.id);
                  
                  return (
                    <div key={phase.id} className="bg-slate-900/40 print:bg-white">
                      
                      {/* Phase row */}
                      <div className="flex items-center h-11 px-3 bg-slate-800/50 border-b border-slate-800/80 hover:bg-slate-800/70 transition-all print:bg-gray-50 print:border-gray-200">
                        <div className="w-[6%] flex items-center justify-center text-amber-500 print:text-black">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="w-[54%] font-bold text-white text-sm truncate pl-1 print:text-black">
                          {phase.name}
                        </div>
                        <div className="w-[15%] text-center text-xs text-slate-400 font-semibold print:text-black">
                          {tasks.filter(t => t.phaseId === phase.id).length} รายการ
                        </div>
                        <div className="w-[15%]"></div>
                        <div className="w-[10%] flex justify-end space-x-1.5 no-print">
                          <button
                            onClick={() => handleOpenAddTask(phase.id)}
                            className="p-1.5 bg-slate-700/80 hover:bg-amber-500 text-slate-300 hover:text-slate-950 rounded-lg transition-all"
                            title="เพิ่มงานในหมวดหมู่นี้"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePhase(phase.id)}
                            className="p-1.5 bg-slate-700/80 hover:bg-rose-500 text-slate-300 hover:text-white rounded-lg transition-all"
                            title="ลบหมวดหมู่นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tasks of Phase */}
                      <div className="divide-y divide-slate-800/40 print:divide-gray-100">
                        {tasksInPhase.map((task, idx) => {
                          const dateStart = new Date(task.startDate);
                          const dateEnd = new Date(task.endDate);
                          const durationDays = Math.max(1, Math.ceil((dateEnd.getTime() - dateStart.getTime()) / (1000 * 3600 * 24)));
                          
                          return (
                            <div key={task.id} className="flex items-center h-12 px-4 hover:bg-slate-800/30 transition-all group print:bg-white print:border-b print:border-gray-100">
                              <div className="w-[5%] text-[11px] text-slate-500 font-bold">{idx + 1}</div>
                              
                              <div className="w-[45%] pl-1 pr-2 truncate">
                                <span className="text-xs text-slate-200 font-semibold group-hover:text-amber-300 transition-colors print:text-black block truncate">
                                  {task.name}
                                </span>
                                <span className="text-[10px] text-slate-500 print:text-gray-500 font-semibold block">
                                  {task.startDate} ถึง {task.endDate}
                                </span>
                              </div>

                              <div className="w-[20%] text-center text-xs font-black text-slate-300 print:text-black">
                                {durationDays} วัน
                              </div>

                              <div className="w-[18%] text-center truncate pr-1">
                                <span className="text-[11px] text-slate-400 font-bold bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/40 print:border-none print:bg-transparent print:text-black truncate block">
                                  {task.assignedTo || 'ไม่ระบุ'}
                                </span>
                              </div>

                              <div className="w-[12%] flex items-center justify-end space-x-1 no-print">
                                <button
                                  onClick={() => handleOpenEditTask(task)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                                  title="แก้ไขแผนงาน"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-500 rounded-lg border border-slate-700 hover:border-rose-500/30"
                                  title="ลบแผนงาน"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {tasksInPhase.length === 0 && (
                          <div className="h-10 flex items-center justify-center text-xs text-slate-500 italic">
                            ยังไม่มีรายการงานในหมวดหมู่นี้
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* GANTT TIMELINE TIMEFRAME (Right Side, Horizontal Scrollable) */}
            <div className="flex-1 overflow-x-auto relative min-w-[800px] flex flex-col bg-slate-950 print:bg-white print:border-gray-200">
              
              {/* Top Timeline Column Header */}
              <div className="h-[60px] border-b border-slate-800 relative bg-slate-950 shrink-0 select-none print:border-gray-300 print:bg-gray-100">
                
                {/* Year / Month upper header row */}
                <div className="absolute top-0 left-0 right-0 h-1/2 flex border-b border-slate-800/80 text-[10px] font-bold text-slate-500 tracking-wider items-center divide-x divide-slate-800/40 print:border-gray-200 print:divide-gray-200">
                  {columns.map((col, idx) => {
                    // Only render months or first indices for space efficiency
                    if (zoomLevel === 'day' && col.getDate() !== 1 && idx !== 0) return null;
                    if (zoomLevel === 'week' && col.getDate() > 7 && idx !== 0) return null;
                    return (
                      <div 
                        key={idx} 
                        className="px-3 uppercase font-extrabold text-amber-500/80 print:text-black"
                        style={{
                          width: zoomLevel === 'day' ? '120px' : zoomLevel === 'week' ? '180px' : '260px'
                        }}
                      >
                        {formatHeaderMonth(col)}
                      </div>
                    );
                  })}
                </div>

                {/* Subdivided intervals lower header row */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 flex text-[10px] font-extrabold text-slate-400 tracking-wide items-center divide-x divide-slate-800/60 print:border-gray-200 print:divide-gray-200">
                  {columns.map((col, idx) => (
                    <div 
                      key={idx} 
                      className="text-center shrink-0 flex items-center justify-center text-slate-300 font-bold px-1 print:text-black"
                      style={{
                        width: zoomLevel === 'day' ? '60px' : zoomLevel === 'week' ? '120px' : '200px'
                      }}
                    >
                      {formatDateLabel(col)}
                    </div>
                  ))}
                </div>

              </div>

              {/* Gantt Bars Rows Container */}
              <div className="flex-1 relative divide-y divide-slate-800/60 print:divide-gray-200">
                
                {/* Dynamic Grid Background Vertical lines */}
                <div className="absolute inset-y-0 left-0 right-0 flex pointer-events-none divide-x divide-slate-800/30 print:divide-gray-100">
                  {columns.map((_, idx) => (
                    <div 
                      key={idx} 
                      className="h-full shrink-0" 
                      style={{
                        width: zoomLevel === 'day' ? '60px' : zoomLevel === 'week' ? '120px' : '200px'
                      }}
                    />
                  ))}
                </div>

                {/* Draw matching spacer row blocks for Phases & Tasks */}
                {phases.map((phase) => {
                  const tasksInPhase = filteredTasks.filter(t => t.phaseId === phase.id);

                  return (
                    <div key={phase.id} className="relative">
                      
                      {/* Phase Row block spacer */}
                      <div className="h-11 bg-slate-800/20 border-b border-slate-800/80 print:bg-gray-50 print:border-gray-200" />

                      {/* Tasks of Phase rows */}
                      {tasksInPhase.map((task) => {
                        const { left, width } = getTaskBarCoords(task.startDate, task.endDate);
                        
                        // Status color configurations
                        let barBg = 'bg-slate-500';
                        let barBorder = 'border-slate-400';
                        let progressBg = 'bg-slate-400';
                        let statusText = 'ยังไม่เริ่ม';
                        let textTheme = 'text-slate-400';
                        
                        if (task.status === 'completed') {
                          barBg = 'bg-emerald-950/80';
                          barBorder = 'border-emerald-500/40';
                          progressBg = 'bg-emerald-500';
                          statusText = 'เสร็จสมบูรณ์';
                          textTheme = 'text-emerald-400';
                        } else if (task.status === 'in_progress') {
                          barBg = 'bg-sky-950/80';
                          barBorder = 'border-sky-500/40';
                          progressBg = 'bg-sky-500';
                          statusText = 'กำลังทำ';
                          textTheme = 'text-sky-400';
                        } else if (task.status === 'delayed') {
                          barBg = 'bg-rose-950/80';
                          barBorder = 'border-rose-500/40';
                          progressBg = 'bg-rose-600';
                          statusText = 'ล่าช้า';
                          textTheme = 'text-rose-400';
                        }

                        return (
                          <div key={task.id} className="h-12 relative flex items-center px-4 hover:bg-slate-800/10 transition-all print:bg-white">
                            
                            {/* Horizontal Gantt bar wrapper */}
                            <div 
                              className="absolute h-6 rounded-lg border flex overflow-hidden items-center group/bar shadow-md cursor-pointer print:h-5"
                              style={{ left, width }}
                              onClick={() => handleOpenEditTask(task)}
                            >
                              
                              {/* Inner Shaded Progress Background */}
                              <div 
                                className={`absolute inset-y-0 left-0 transition-all ${progressBg} opacity-25`}
                                style={{ width: `${task.progress}%` }}
                              />
                              
                              {/* Left thicker indicator of progress */}
                              <div 
                                className={`absolute inset-y-0 left-0 ${progressBg} rounded-l-md`}
                                style={{ width: `${Math.min(100, task.progress)}%` }}
                              />

                              {/* Text label overlaying inside the bar if wide enough */}
                              <span className="relative z-10 px-2 text-[9px] font-black text-white whitespace-nowrap drop-shadow truncate w-full flex justify-between items-center">
                                <span>{task.progress}%</span>
                                <span className="opacity-0 group-hover/bar:opacity-100 transition-opacity text-[8px] tracking-tight ml-2">คลิกแก้ไข</span>
                              </span>

                            </div>

                            {/* Text badge outside for quick view if bars are extremely small or zoomed */}
                            <div 
                              className="absolute text-[9px] font-black pointer-events-none no-print"
                              style={{ 
                                left: `calc(${left} + ${width} + 8px)`,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span className={`${textTheme}`}>{task.progress}% - {statusText}</span>
                            </div>

                          </div>
                        );
                      })}

                      {tasksInPhase.length === 0 && (
                        <div className="h-10" />
                      )}

                    </div>
                  );
                })}

              </div>

            </div>

          </div>

          {/* Quick Help Legend Footer */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 print:hidden">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-slate-300">ความหมายสี:</span>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-slate-500 rounded-md"></div>
                <span className="font-semibold text-slate-400">ยังไม่เริ่ม (0%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-sky-500 rounded-md"></div>
                <span className="font-semibold text-sky-400">กำลังดำเนินงาน (1-99%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-md"></div>
                <span className="font-semibold text-emerald-400">เสร็จสิ้นสมบูรณ์ (100%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-rose-600 rounded-md"></div>
                <span className="font-semibold text-rose-500">ล่าช้ากว่าแผน (มีอุปสรรค)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              💡 แนะนำ: คลิกไอคอน <Plus className="w-3 h-3 inline text-amber-400" /> เพื่อเพิ่มแผนงานย่อย หรือคลิก <Edit3 className="w-3 h-3 inline text-slate-300" /> เพื่อปรับเลื่อนวันที่และอัปเดต % ความคืบหน้าของงานจริง
            </div>
          </div>

        </div>

      </main>

      {/* MODAL 1: ADD / EDIT TASK POPUP */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>{modalMode === 'add' ? 'เพิ่มแผนงานก่อสร้างย่อย' : 'แก้ไข / อัปเดตแผนงานก่อสร้าง'}</span>
              </h3>
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ปิด
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              
              {/* Task Name */}
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">ชื่อแผนงาน/กิจกรรมย่อย *</label>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="เช่น หล่อเสา คาน และวางแผ่นพื้นสำเร็จรูป"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              {/* Phase Selection */}
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">หมวดหมู่กลุ่มงาน (Phase WBS) *</label>
                <select
                  required
                  value={taskPhaseId}
                  onChange={(e) => setTaskPhaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                >
                  <option value="" disabled>เลือกหมวดหมู่</option>
                  {phases.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">วันที่เริ่มแผนงาน *</label>
                  <input
                    type="date"
                    required
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">วันที่สิ้นสุดแผนงาน *</label>
                  <input
                    type="date"
                    required
                    value={taskEndDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                  />
                </div>
              </div>

              {/* Progress Slider */}
              <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-bold uppercase">ความคืบหน้าหน้างานจริง</label>
                  <span className="text-sm font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    {taskProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={taskProgress}
                  onChange={handleProgressSliderChange}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>0% (ยังไม่เริ่ม)</span>
                  <span>50% (ครึ่งทาง)</span>
                  <span>100% (เสร็จสมบูรณ์)</span>
                </div>
              </div>

              {/* Resource & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">ผู้รับผิดชอบ/ช่างหน้างาน</label>
                  <input
                    type="text"
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    placeholder="เช่น ช่างสมยศ, ผู้รับเหมาโครงเหล็ก"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">สถานะงานควบคุม</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                  >
                    <option value="not_started">ยังไม่เริ่มงาน</option>
                    <option value="in_progress">กำลังดำเนินงาน</option>
                    <option value="completed">เสร็จสมบูรณ์ 100%</option>
                    <option value="delayed">ล่าช้ากว่าแผน</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">หมายเหตุ / อุปสรรคหน้างาน</label>
                <textarea
                  rows={2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="ระบุปัญหาอุปสรรค เช่น ฝนตกหนัก ขาดแรงงาน หรือวัสดุเข้าช้ากว่ากำหนด"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl transition-all border border-slate-750"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-lg"
                >
                  {modalMode === 'add' ? 'เพิ่มแผนงาน' : 'บันทึกอัปเดต'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: ADD PHASE POPUP */}
      {isPhaseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>เพิ่มหมวดหมู่กลุ่มงาน (Phase)</span>
              </h3>
              <button 
                onClick={() => setIsPhaseModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ปิด
              </button>
            </div>

            <form onSubmit={handleAddPhase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1.5">ชื่อหมวดหมู่กลุ่มงาน</label>
                <input
                  type="text"
                  required
                  value={phaseNameInput}
                  onChange={(e) => setPhaseNameInput(e.target.value)}
                  placeholder="เช่น งานติดตั้งเสาไฟและภูมิทัศน์"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhaseModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-lg"
                >
                  สร้างหมวดหมู่
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
