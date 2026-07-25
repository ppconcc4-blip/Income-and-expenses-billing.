import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, X, Check, ClipboardCheck, Clock, ExternalLink } from 'lucide-react';

interface WorkerRecord {
  id: string;
  no: number;
  fullName: string;
  wagePerDay: number;
  workDays: number;
  overtimeRate: number;
  overtimeHours: number;
  advanceIncome: number;
  bonus: number;
  socialSecurity: number;
  wageDeduction: number;
  utilities: number;
  debt: number;
  period1Pay: number;
  remainingDebt: number;
  totalDebt: number;
  sheetRowIndex?: number;
  imageUrl?: string;
  attendanceRecords?: { date: string, morn: boolean, aft: boolean, ot: number }[];
}

import { User } from 'firebase/auth';
import { getAccessToken, googleSignIn } from '../lib/firebase';
import { extractSpreadsheetId, saveLaborWagesToSheet } from '../lib/googleSheetsService';
import { RefreshCw } from 'lucide-react';

export const LaborWagesManager: React.FC<{ googleUser: User | null }> = ({ googleUser }) => {
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1JKh7fbbfp2X9Ws5aPJKS-JQ_7kOi4TBXSJJlJBDHZsQ/edit?usp=drive_link');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState('1-15');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceModalWorker, setAttendanceModalWorker] = useState<WorkerRecord | null>(null);

  const [workers, setWorkers] = useState<WorkerRecord[]>(() => {
    const saved = localStorage.getItem('pp_labor_wages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pp_labor_wages', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    if (googleUser && sheetUrl) {
      handleFetchData(true);
    }
  }, [selectedMonth, selectedYear, selectedPeriod]);

  const updateWageInSheet = async (rowIndex: number, wage: number) => {
    if (!googleUser || !sheetUrl) return;
    try {
      const token = await getAccessToken();
      const spreadsheetId = extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) return;

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Employees!D${rowIndex}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[wage]]
        })
      });
      if (!response.ok) {
        console.error('Failed to update wage in sheet');
      }
    } catch (error) {
      console.error('Error updating wage:', error);
    }
  };

  const handleFetchData = async (silent = false) => {
    if (!googleUser) {
      if (!silent) alert("กรุณาเข้าสู่ระบบด้วย Google ก่อนดึงข้อมูล");
      return;
    }
    setIsFetching(true);
    try {
      let token = await getAccessToken();

      if (!token) {
        try {
          const authRes = await googleSignIn();
          token = authRes?.accessToken || null;
        } catch (authErr) {
          console.error("Auto sign-in error:", authErr);
        }
      }

      if (!token) {
        if (!silent) alert("ไม่พบสิทธิ์ Google Access Token กรุณากดเข้าสู่ระบบด้วย Google อีกครั้งเพื่อยืนยันสิทธิ์");
        return;
      }

      const spreadsheetId = extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        if (!silent) alert("URL ของ Google Sheet ไม่ถูกต้อง");
        return;
      }

      let empRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Employees!A:H`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let attRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:H`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (empRes.status === 401 || attRes.status === 401) {
        try {
          if (!silent) {
            alert("สิทธิ์ Google Token หมดอายุ ระบบกำลังขอสิทธิ์การเข้าถึงใหม่...");
          }
          const authRes = await googleSignIn();
          if (authRes?.accessToken) {
            token = authRes.accessToken;
            empRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Employees!A:H`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            attRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:H`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } catch (reauthErr) {
          console.error("Reauth error:", reauthErr);
        }
      }

      if (!empRes.ok || !attRes.ok) {
        const empErr = !empRes.ok ? await empRes.json().catch(() => ({})) : {};
        const attErr = !attRes.ok ? await attRes.json().catch(() => ({})) : {};
        const msg = empErr.error?.message || attErr.error?.message || 'ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบสิทธิ์การเข้าถึง Google Sheet หรือชื่อชีต (Employees และ Sheet1)';
        throw new Error(msg);
      }

      const empData = await empRes.json();
      const attData = await attRes.json();

      const empRows = empData.values || [];
      const attRows = attData.values || [];

      let periodRows: any[][] = [];
      let prevPeriodRows: any[][] = [];
      const wageSpreadsheetId = extractSpreadsheetId(WAGE_SAVE_SPREADSHEET_URL) || spreadsheetId;

      try {
        const periodLabel = selectedPeriod === '1-15' ? 'งวด 1-15' : 'งวด 16-สิ้นเดือน';
        const sheetTitle = `${periodLabel}_${selectedMonth}_${selectedYear}`;
        const periodRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${wageSpreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A:T`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (periodRes.ok) {
          const periodData = await periodRes.json();
          periodRows = periodData.values || [];
        }
      } catch (pErr) {
        console.warn("Could not load period sheet (might not exist yet):", pErr);
      }

      try {
        let prevPeriod = '';
        let prevMonthStr = '';
        let prevYearStr = '';

        if (selectedPeriod === '16-end') {
          prevPeriod = '1-15';
          prevMonthStr = selectedMonth;
          prevYearStr = selectedYear;
        } else {
          prevPeriod = '16-end';
          let mNum = parseInt(selectedMonth, 10);
          let yNum = parseInt(selectedYear, 10);
          mNum -= 1;
          if (mNum === 0) {
            mNum = 12;
            yNum -= 1;
          }
          prevMonthStr = mNum.toString().padStart(2, '0');
          prevYearStr = yNum.toString();
        }

        const prevPeriodLabel = prevPeriod === '1-15' ? 'งวด 1-15' : 'งวด 16-สิ้นเดือน';
        const prevSheetTitle = `${prevPeriodLabel}_${prevMonthStr}_${prevYearStr}`;
        const prevPeriodRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${wageSpreadsheetId}/values/'${encodeURIComponent(prevSheetTitle)}'!A:T`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (prevPeriodRes.ok) {
          const prevPeriodData = await prevPeriodRes.json();
          prevPeriodRows = prevPeriodData.values || [];
        }
      } catch (prevErr) {
        console.warn("Could not load previous period sheet:", prevErr);
      }

      if (empRows.length < 2) {
        if (!silent) alert("ไม่พบข้อมูลพนักงานในชีต Employees");
        return;
      }
      if (attRows.length < 2) {
        if (!silent) alert("ไม่พบข้อมูลเวลาเข้างานในชีต Sheet1");
        return;
      }

      const empHeaders = empRows[0].map((h: string) => h.toLowerCase().trim());
      const attHeaders = attRows[0].map((h: string) => h.toLowerCase().trim());

      const nameIdx = empHeaders.findIndex((h: string) => h.includes('ชื่อ') && !h.includes('เล่น'));
      const wageIdx = empHeaders.findIndex((h: string) => h.includes('ค่าแรง') || h.includes('ค่าจ้าง'));
      const otRateIdx = empHeaders.findIndex((h: string) => h.includes('โอที') || h.includes('ล่วงเวลา') || h.includes('ot'));
      const empIdIdx = empHeaders.findIndex((h: string) => h.includes('รหัส'));

      const attDateIdx = attHeaders.findIndex((h: string) => h.includes('วัน'));
      const attNameIdx = attHeaders.findIndex((h: string) => h.includes('ชื่อ') && !h.includes('เล่น'));
      const attEmpIdIdx = attHeaders.findIndex((h: string) => h.includes('รหัส'));
      const attMornIdx = attHeaders.findIndex((h: string) => h.includes('เช้า'));
      const attAftIdx = attHeaders.findIndex((h: string) => h.includes('บ่าย'));
      const attOtIdx = attHeaders.findIndex((h: string) => h.includes('ot') || h.includes('ล่วงเวลา') || h.includes('โอที'));

      if (attDateIdx === -1 || attMornIdx === -1 || attAftIdx === -1) {
        if (!silent) alert("ไม่พบคอลัมน์ วันที่, ช่วงเช้า หรือ ช่วงบ่าย ใน Sheet1");
        return;
      }

      const newWorkers = [];

      for (let i = 1; i < empRows.length; i++) {
        const row = empRows[i];
        if (!row || row.length === 0) continue;
        
        const name = nameIdx !== -1 ? (row[nameIdx] || '') : (row[1] || '');
        const wage = wageIdx !== -1 ? Number((row[wageIdx] || '').replace(/[^0-9.]/g, '')) : Number((row[3] || '').replace(/[^0-9.]/g, ''));
        const otRate = Math.round((wage / 8) * 1.5);
        
        const empId = empIdIdx !== -1 ? (row[empIdIdx] || '') : (row[0] || '');

        if (!name) continue;

        let workDays = 0;
        let overtimeHours = 0;
        const attendanceRecords = [];
        const imageUrl = row[2] || '';

        for (let j = 1; j < attRows.length; j++) {
          const aRow = attRows[j];
          if (!aRow || aRow.length === 0) continue;

          const dateStr = aRow[attDateIdx];
          if (!dateStr) continue;

          let dateObj;
          if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
              dateObj = new Date(dateStr);
          }

          if (isNaN(dateObj.getTime())) continue;

          const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const y = dateObj.getFullYear().toString();
          const d = dateObj.getDate();

          if (m === selectedMonth && y === selectedYear) {
            const inPeriod = selectedPeriod === '1-15' ? (d >= 1 && d <= 15) : (d >= 16);
            if (inPeriod) {
               const attName = attNameIdx !== -1 ? (aRow[attNameIdx] || '') : '';
               const attEmpId = attEmpIdIdx !== -1 ? (aRow[attEmpIdIdx] || '') : '';
               
               let matched = false;
               if (empId && attEmpId && empId === attEmpId) matched = true;
               else if (name && attName && (name.includes(attName) || attName.includes(name))) matched = true;

               if (matched) {
                   const morn = aRow[attMornIdx]?.trim() || '';
                   const aft = aRow[attAftIdx]?.trim() || '';
                   const ot = attOtIdx !== -1 ? Number((aRow[attOtIdx] || '').replace(/[^0-9.]/g, '')) : 0;

                   const isMorn = morn === 'เข้างาน';
                   const isAft = aft === 'เข้างาน';
                   if (isMorn) workDays += 0.5;
                   if (isAft) workDays += 0.5;
                   overtimeHours += ot;
                   
                   attendanceRecords.push({
                     date: `${d.toString().padStart(2, '0')}/${m}/${y}`,
                     morn: isMorn,
                     aft: isAft,
                     ot: ot
                   });
               }
            }
          }
        }

        const nameForMatch = nameIdx !== -1 ? (row[nameIdx] || '') : (row[1] || '');
        const existingWorker = workers.find(w => w.fullName === nameForMatch);
        const prevPeriod1Pay = existingWorker ? (existingWorker.period1Pay || 0) : 0;
        const prevTotalDebt = existingWorker ? (existingWorker.totalDebt || prevPeriod1Pay) : prevPeriod1Pay;
        const prevRemainingDebt = Math.max(0, prevTotalDebt - (existingWorker?.debt || 0));

        let prevRemainingDebtFromSheet = 0;
        let prevPeriod1PayFromSheet = 0;
        let foundPrevInSheet = false;
        if (prevPeriodRows && prevPeriodRows.length > 3) {
          const matchedPrevRow = prevPeriodRows.find(pRow => {
            if (!pRow || pRow.length < 2) return false;
            const pName = String(pRow[1] || '').trim();
            return pName && pName.toLowerCase() === name.trim().toLowerCase();
          });
          if (matchedPrevRow) {
            foundPrevInSheet = true;
            if (matchedPrevRow.length > 17) {
              prevPeriod1PayFromSheet = Number(String(matchedPrevRow[17] || '0').replace(/[^0-9.-]/g, '')) || 0;
            }
            if (matchedPrevRow.length > 18) {
              prevRemainingDebtFromSheet = Number(String(matchedPrevRow[18] || '0').replace(/[^0-9.-]/g, '')) || 0;
            }
          }
        }

        const finalPrevRemainingDebt = foundPrevInSheet ? prevRemainingDebtFromSheet : prevRemainingDebt;
        const finalPrevPeriod1Pay = foundPrevInSheet ? prevPeriod1PayFromSheet : prevPeriod1Pay;

        let savedAdvanceIncome = 0;
        let savedBonus = 0;
        let savedSocialSecurity = 0;
        let savedWageDeduction = 0;
        let savedUtilities = 0;
        let savedDebt = 0;
        let savedPeriod1Pay = 0;
        let savedTotalDebt = 0;
        let savedWagePerDay = wage;
        let savedOvertimeRate = otRate;
        let savedWorkDays = workDays;
        let savedOvertimeHours = overtimeHours;
        let hasSavedData = false;
        let matchedRow: any[] | undefined;

        if (periodRows && periodRows.length > 3) {
          matchedRow = periodRows.find(pRow => {
            if (!pRow || pRow.length < 2) return false;
            const pName = String(pRow[1] || '').trim();
            return pName && pName.toLowerCase() === name.trim().toLowerCase();
          });

          if (matchedRow) {
            hasSavedData = true;
            savedWagePerDay = Number(String(matchedRow[2] || '0').replace(/[^0-9.-]/g, '')) || wage;
            savedWorkDays = Number(String(matchedRow[3] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedOvertimeRate = Number(String(matchedRow[5] || '0').replace(/[^0-9.-]/g, '')) || otRate;
            savedOvertimeHours = Number(String(matchedRow[6] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedAdvanceIncome = Number(String(matchedRow[8] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedBonus = Number(String(matchedRow[9] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedSocialSecurity = Number(String(matchedRow[11] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedWageDeduction = Number(String(matchedRow[12] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedUtilities = Number(String(matchedRow[13] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedDebt = Number(String(matchedRow[14] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedPeriod1Pay = Number(String(matchedRow[17] || '0').replace(/[^0-9.-]/g, '')) || 0;
            savedTotalDebt = Number(String(matchedRow[19] || '0').replace(/[^0-9.-]/g, '')) || 0;
          }
        }

        const finalWagePerDay = hasSavedData ? savedWagePerDay : (wage || 0);
        const finalWorkDays = hasSavedData ? savedWorkDays : workDays;
        const finalOvertimeRate = hasSavedData ? savedOvertimeRate : (otRate || 0);
        const finalOvertimeHours = hasSavedData ? savedOvertimeHours : overtimeHours;
        const advanceIncome = hasSavedData ? savedAdvanceIncome : 0;
        const bonus = hasSavedData ? savedBonus : 0;
        const socialSecurity = hasSavedData ? savedSocialSecurity : 0;
        const wageDeduction = hasSavedData ? savedWageDeduction : 0;
        const utilities = hasSavedData ? savedUtilities : 0;
        const debt = hasSavedData ? savedDebt : 0;
        const period1Pay = hasSavedData ? savedPeriod1Pay : finalPrevPeriod1Pay;
        const totalDebt = hasSavedData ? savedTotalDebt : finalPrevRemainingDebt;
        const remainingDebt = hasSavedData ? Math.max(0, totalDebt - debt) : Math.max(0, totalDebt - debt);
        
        newWorkers.push({
          id: crypto.randomUUID(),
          sheetRowIndex: i + 1,
          imageUrl: imageUrl,
          attendanceRecords: attendanceRecords,
          no: newWorkers.length + 1,
          fullName: name,
          wagePerDay: finalWagePerDay,
          workDays: finalWorkDays,
          overtimeRate: finalOvertimeRate,
          overtimeHours: finalOvertimeHours,
          advanceIncome: advanceIncome,
          bonus: bonus,
          socialSecurity: socialSecurity,
          wageDeduction: wageDeduction,
          utilities: utilities,
          debt: debt,
          period1Pay: period1Pay,
          totalDebt: totalDebt,
          remainingDebt: remainingDebt
        });
      }

      setWorkers(newWorkers);
      if (!silent) alert('ดึงข้อมูลและคำนวณสำเร็จ!');
    } catch (err: any) {
      console.error("Error fetching attendance data:", err);
      if (!silent) {
        alert(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } finally {
      setIsFetching(false);
    }
  };


  const handleAddRow = () => {
    const newWorker: WorkerRecord = {
      id: crypto.randomUUID(),
      no: workers.length + 1,
      fullName: '',
      wagePerDay: 0,
      workDays: 0,
      overtimeRate: 0,
      overtimeHours: 0,
      advanceIncome: 0,
      bonus: 0,
      socialSecurity: 0,
      wageDeduction: 0,
      utilities: 0,
      debt: 0,
      period1Pay: 0,
      remainingDebt: 0,
      totalDebt: 0
    };
    setWorkers([...workers, newWorker]);
  };

  const handleRemoveRow = (id: string) => {
    if (window.confirm('คุณต้องการลบแถวนี้ใช่หรือไม่?')) {
      setWorkers(workers.filter(w => w.id !== id));
    }
  };

  const handleChange = (id: string, field: keyof WorkerRecord, value: string | number) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === id) {
        const updated = { ...w, [field]: value };
        if (field === 'wagePerDay') {
           updated.overtimeRate = Math.round((Number(value) || 0) / 8 * 1.5);
        }
        if (field === 'period1Pay') {
           const numVal = Number(value) || 0;
           // If user sets initial debt, default totalDebt to initialDebt if totalDebt was empty/0 or equal to previous initial debt
           if (!w.totalDebt || w.totalDebt === w.period1Pay) {
             updated.totalDebt = numVal;
           }
           updated.remainingDebt = (updated.totalDebt || numVal) - (updated.debt || 0);
        }
        if (field === 'totalDebt' || field === 'debt') {
           const baseTotal = Number(updated.totalDebt) || Number(updated.period1Pay) || 0;
           updated.remainingDebt = baseTotal - (Number(updated.debt) || 0);
        }
        return updated;
      }
      return w;
    }));
  };

  const WAGE_SAVE_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1XUhV-INyzxA95SBBaHC_2Fs2nWtYVlwlkkskXZrIyg8/edit?usp=drive_link';

  const handleSaveToSheet = async () => {
    if (!googleUser) {
      alert("กรุณาเข้าสู่ระบบด้วย Google ก่อนบันทึกข้อมูล");
      return;
    }
    setIsSaving(true);
    try {
      let token = await getAccessToken();

      if (!token) {
        try {
          const authRes = await googleSignIn();
          token = authRes?.accessToken || null;
        } catch (authErr) {
          console.error("Auto sign-in error:", authErr);
        }
      }

      if (!token) {
        alert("ไม่พบสิทธิ์ Google Access Token กรุณากดเข้าสู่ระบบด้วย Google อีกครั้งเพื่อยืนยันสิทธิ์");
        setIsSaving(false);
        return;
      }

      let res = await saveLaborWagesToSheet(
        token,
        WAGE_SAVE_SPREADSHEET_URL,
        selectedPeriod,
        selectedMonth,
        selectedYear,
        workers
      );

      // If token expired (401), prompt user with Google Auth popup and retry once
      if (!res.success && (res.isAuthError || res.message?.includes('invalid authentication credentials') || res.message?.includes('401') || res.message?.includes('UNAUTHENTICATED'))) {
        try {
          alert("สิทธิ์ Google Token หมดอายุ ระบบกำลังขอสิทธิ์การเข้าถึงใหม่...");
          const authRes = await googleSignIn();
          if (authRes?.accessToken) {
            token = authRes.accessToken;
            res = await saveLaborWagesToSheet(
              token,
              WAGE_SAVE_SPREADSHEET_URL,
              selectedPeriod,
              selectedMonth,
              selectedYear,
              workers
            );
          }
        } catch (reauthErr: any) {
          alert("ไม่สามารถต่ออายุสิทธิ์ Google Token ได้: " + (reauthErr.message || reauthErr));
          setIsSaving(false);
          return;
        }
      }

      if (res.success) {
        alert(`บันทึกข้อมูลค่าแรงลง Google Sheets เรียบร้อยแล้ว!\nสร้าง/อัปเดตชีต: ${res.sheetTitle}`);
      } else {
        alert(`เกิดข้อผิดพลาดในการบันทึก: ${res.message || 'ไม่สามารถบันทึกข้อมูลได้'}`);
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCarryOverDebt = () => {
    if (workers.length === 0) {
      alert("ไม่มีข้อมูลคนงานในตาราง");
      return;
    }
    if (window.confirm("ต้องการนำ 'หนี้สินคงเหลือ' ของคนงานทุกคน ไปตั้งเป็น 'หนี้สินตั้งต้น' (สำหรับงวดถัดไป) และรีเซ็ตยอด 'หนี้' งวดนี้เป็น 0 หรือไม่?")) {
      setWorkers(prev => prev.map(w => {
        const remaining = Math.max(0, (w.totalDebt || w.period1Pay || 0) - (w.debt || 0));
        return {
          ...w,
          period1Pay: remaining,
          totalDebt: remaining,
          debt: 0,
          remainingDebt: remaining
        };
      }));
      alert("อัปเดตหนี้สินตั้งต้นสำหรับงวดถัดไปเรียบร้อยแล้ว!");
    }
  };

  const handlePrint = () => {
    const printElement = document.getElementById('wages-printable-area');
    if (!printElement) {
      window.print();
      return;
    }

    const originalTitle = document.title;
    const periodLabel = selectedPeriod === '1-15' ? 'งวด 1-15' : 'งวด 16-สิ้นเดือน';
    const filename = `${periodLabel}_${selectedMonth}_${selectedYear}`;
    
    // Set parent title so file save default name is correct
    document.title = filename;

    const clone = printElement.cloneNode(true) as HTMLElement;

    const origInputs = printElement.querySelectorAll('input, select');
    const cloneInputs = clone.querySelectorAll('input, select');

    origInputs.forEach((orig, idx) => {
      const val = (orig as HTMLInputElement | HTMLSelectElement).value;
      const cloneEl = cloneInputs[idx];
      if (cloneEl) {
        const span = document.createElement('span');
        span.textContent = val;
        if (cloneEl.classList.contains('text-right')) {
          span.style.textAlign = 'right';
          span.style.display = 'block';
        } else if (cloneEl.classList.contains('text-center')) {
          span.style.textAlign = 'center';
          span.style.display = 'block';
        }
        span.style.color = '#000000';
        span.style.fontSize = '6.5pt';
        span.style.fontWeight = '500';
        cloneEl.parentNode?.replaceChild(span, cloneEl);
      }
    });

    // Remove no-print elements AFTER inputs are replaced
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    // CRITICAL: Remove inner style tag to prevent "body * { visibility: hidden; }" from hiding the print header
    clone.querySelectorAll('style').forEach(el => el.remove());

    const htmlContent = `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>${filename}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 landscape; margin: 4mm; }
      * { box-sizing: border-box !important; }
      body { 
        font-family: 'Sarabun', sans-serif; 
        background: #ffffff !important; 
        color: #0f172a !important; 
        padding: 6px; 
        margin: 0; 
        font-size: 6.5pt;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .min-w-\\[1600px\\] {
        min-width: unset !important;
        width: 100% !important;
      }
      table { 
        border-collapse: collapse !important; 
        width: 100% !important; 
        table-layout: fixed !important;
        font-size: 6.5pt !important; 
        background: #ffffff !important;
      }
      th, td { 
        border: 1px solid #94a3b8 !important; 
        padding: 2px 2px !important; 
        color: #0f172a !important; 
        position: static !important; 
        min-width: 0 !important;
        width: auto !important;
        word-break: break-all !important;
        overflow: hidden !important;
      }
      td {
        background-color: #ffffff !important;
      }
      thead {
        background-color: #f1f5f9 !important;
      }
      th { 
        background-color: #f1f5f9 !important; 
        color: #0f172a !important; 
        font-weight: bold !important; 
        text-align: center !important; 
      }
      td:nth-child(2), th:nth-child(2) {
        white-space: nowrap !important;
        text-align: left !important;
        padding-left: 4px !important;
      }
      /* Specific column group background colors for accurate PDF visualization */
      .bg-slate-700\\/50, .print\\:bg-gray-200 { background-color: #f1f5f9 !important; color: #0f172a !important; }
      .bg-emerald-900\\/30, .print\\:bg-green-100 { background-color: #d1fae5 !important; color: #065f46 !important; }
      .bg-rose-900\\/30, .print\\:bg-red-100 { background-color: #fee2e2 !important; color: #991b1b !important; }
      .bg-emerald-700\\/40, .print\\:bg-green-200 { background-color: #a7f3d0 !important; color: #047857 !important; }
      .bg-amber-900\\/30, .print\\:bg-amber-100 { background-color: #fef3c7 !important; color: #92400e !important; }
      .bg-amber-900\\/40, .print\\:bg-amber-200 { background-color: #fde68a !important; color: #78350f !important; }

      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      .text-left { text-align: left !important; }
      .font-bold { font-weight: bold !important; }
      @media print {
        body { background: #ffffff !important; }
        .printable-container { width: 100% !important; }
      }
    </style>
  </head>
  <body>
    <div style="margin-bottom: 6px; text-align: center;">
      <h2 style="font-size: 13pt; font-weight: bold; margin: 0; color: #0f172a;">บัญชีคำนวณค่าจ้าง ค่าล่วงเวลา</h2>
      <p style="font-size: 8.5pt; margin: 2px 0 0 0; color: #475569;">ประจำเดือน ${selectedMonth}/${selectedYear} งวดวันที่ ${selectedPeriod === '1-15' ? '1 - 15' : '16 - สิ้นเดือน'}</p>
    </div>
    <div class="printable-container" style="width: 100%; overflow: hidden;">
      ${clone.innerHTML}
    </div>
    <script>
      document.title = "${filename}";
      window.onload = function() {
        setTimeout(function() { 
          document.title = "${filename}";
          window.focus(); 
          window.print(); 
        }, 600);
      };
    </script>
  </body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.title = filename;
      printWin.document.close();
    } else {
      // Fallback if popup blocked
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fbWin = window.open(url, '_blank');
      if (fbWin) {
        fbWin.document.title = filename;
      }
    }

    // Restore parent window title after dialog has launched
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  return (
    <div id="wages-printable-area" className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full animate-in fade-in">
      <div className="p-4 sm:p-6 border-b border-slate-800 print:border-gray-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-white print:text-black">บัญชีคำนวณค่าจ้าง ค่าล่วงเวลา</h2>
          <p className="text-sm text-slate-400 print:text-gray-700">ค่าทำงานในวันหยุด และค่าล่วงเวลาในวันหยุด</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSaveToSheet}
            disabled={isSaving}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
            title="พิมพ์ หรือ ส่งออกเป็น PDF ขนาด A4 แนวนอน"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ PDF (A4 แนวนอน)</span>
          </button>
          <button
            onClick={() => window.open(WAGE_SAVE_SPREADSHEET_URL, '_blank')}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            <span>เปิดชีตค่าแรง</span>
          </button>
          <button
            onClick={() => window.open('https://script.google.com/macros/s/AKfycbxbZZXqfVOJs0mWFWiZSDo9iPLXHQTuh4MWTXpm4ugFlvzlOMWzKnmXOaWT9TeIaTry/exec', '_blank')}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
          >
            <Clock className="w-4 h-4" />
            <span>ลงเวลา</span>
          </button>
        </div>
      </div>

      
      <div className="p-4 border-b border-slate-800 print:border-gray-300 bg-slate-800 print:bg-gray-100/50 flex flex-col sm:flex-row gap-3 items-end no-print">
        <div className="flex-1 w-full">
          <label className="block text-xs text-slate-400 print:text-gray-700 mb-1">ลิงก์ Google Sheet พนักงานและเวลาเข้างาน</label>
          <input 
            type="text" 
            value={sheetUrl} 
            onChange={(e) => setSheetUrl(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-700 print:border-gray-400 rounded-lg px-3 py-2 text-sm text-white print:text-black focus:ring-2 focus:ring-blue-500" 
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs text-slate-400 print:text-gray-700 mb-1">ปี</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-slate-950 border border-slate-700 print:border-gray-400 rounded-lg px-3 py-2 text-sm text-white print:text-black">
            {['2024','2025','2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs text-slate-400 print:text-gray-700 mb-1">เดือน</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-slate-950 border border-slate-700 print:border-gray-400 rounded-lg px-3 py-2 text-sm text-white print:text-black">
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs text-slate-400 print:text-gray-700 mb-1">งวด</label>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full bg-slate-950 border border-slate-700 print:border-gray-400 rounded-lg px-3 py-2 text-sm text-white print:text-black">
            <option value="1-15">วันที่ 1 - 15</option>
            <option value="16-end">วันที่ 16 - สิ้นเดือน</option>
          </select>
        </div>
        <button 
          onClick={() => handleFetchData(false)}
          disabled={isFetching}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white print:text-black px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all h-[38px]"
          title="ดึงข้อมูลงวดที่เลือกที่บันทึกไว้ในชีต"
        >
          {isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
          <span>ดึงข้อมูลจากชีตตามงวด</span>
        </button>
        <button 
          onClick={() => handleFetchData(false)}
          disabled={isFetching}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white print:text-black px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all h-[38px]"
        >
          {isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>ดึงข้อมูลเวลาเข้างาน</span>
        </button>
        <button 
          onClick={handleCarryOverDebt}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white print:text-black px-3.5 py-2 rounded-lg text-sm font-bold shadow-md transition-all h-[38px]"
          title="นำหนี้สินคงเหลือไปตั้งเป็นหนี้สินทั้งหมดสำหรับงวดถัดไป"
        >
          <RefreshCw className="w-4 h-4" />
          <span>ยกยอดหนี้สินไปงวดถัดไป</span>
        </button>
      </div>
  \n      <div className="flex-1 overflow-auto p-4 custom-scrollbar printable-area">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #000 !important;
              padding: 2px 4px !important;
              font-size: 10px !important;
              color: #000 !important;
            }
            input {
              border: none !important;
              background: transparent !important;
              color: #000 !important;
              width: 100%;
            }
          }
        `}} />
        <div className="min-w-[1600px]">
          <table className="w-full text-sm text-left border-collapse border border-slate-700 print:border-gray-400">
            <thead className="text-xs text-slate-300 print:text-gray-700 bg-slate-800 print:bg-gray-100 text-center">
              <tr>
                <th rowSpan={2} className="sticky left-0 z-20 bg-slate-800 print:bg-gray-100 border border-slate-700 print:border-gray-400 p-2 w-10 min-w-[40px]">ลำดับ</th>
                <th rowSpan={2} className="sticky left-[40px] z-20 bg-slate-800 print:bg-gray-100 border border-slate-700 print:border-gray-400 p-2 w-48 min-w-[192px]">ชื่อ-สกุล</th>
                <th colSpan={3} className="border border-slate-700 print:border-gray-400 p-2 bg-slate-700/50 print:bg-gray-200">ค่าจ้าง</th>
                <th colSpan={3} className="border border-slate-700 print:border-gray-400 p-2 bg-slate-700/50 print:bg-gray-200">ค่าล่วงเวลา</th>
                <th colSpan={2} className="border border-slate-700 print:border-gray-400 p-2 bg-slate-700/50 print:bg-gray-200">รายรับอื่นๆ</th>
                <th rowSpan={2} className="border border-slate-700 print:border-gray-400 p-2 bg-emerald-900/30 print:bg-green-100">รวมเงินได้</th>
                <th colSpan={4} className="border border-slate-700 print:border-gray-400 p-2 bg-rose-900/30 print:bg-red-100">รายการหัก</th>
                <th rowSpan={2} className="border border-slate-700 print:border-gray-400 p-2 bg-emerald-700/40 print:bg-green-200 text-emerald-100 print:text-black font-bold">รับสุทธิ</th>
                <th rowSpan={2} className="border border-slate-700 print:border-gray-400 p-2 bg-amber-900/30 print:bg-amber-100 text-amber-200 print:text-black">หนี้สินตั้งต้น</th>
                <th rowSpan={2} className="border border-slate-700 print:border-gray-400 p-2">หนี้สินคงเหลือ</th>
                <th rowSpan={2} className="border border-slate-700 print:border-gray-400 p-2 w-28 bg-amber-900/40 print:bg-amber-200 text-amber-200 print:text-black font-bold">ยอดหนี้รวม</th>
                <th rowSpan={2} className="border border-slate-700 print:border-gray-400 p-2 no-print w-12">บันทึกทำงาน</th>
              </tr>
              <tr>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal min-w-[60px] w-16">วันละ</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">จำนวนวัน</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal text-amber-200 print:text-black">รวมเงิน</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">ชั่วโมงละ</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">จำนวนชม.</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal text-amber-200 print:text-black">รวมเงิน</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">เบิกล่วงหน้า/พิเศษ</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">ค่าโบนัส</th>
                
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">ประกันสังคม</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">หักค่าแรง</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">ค่าน้ำ/ค่าไฟ</th>
                <th className="border border-slate-700 print:border-gray-400 p-2 font-normal">หนี้</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, index) => {
                const wageTotal = (w.wagePerDay || 0) * (w.workDays || 0);
                const overtimeTotal = (w.overtimeRate || 0) * (w.overtimeHours || 0);
                const totalIncome = wageTotal + overtimeTotal + (w.advanceIncome || 0) + (w.bonus || 0);
                const totalDeductions = (w.socialSecurity || 0) + (w.wageDeduction || 0) + (w.utilities || 0) + (w.debt || 0);
                const netIncome = totalIncome - totalDeductions;
                const calcTotalDebt = w.totalDebt || w.period1Pay || 0;
                const calcRemainingDebt = calcTotalDebt - (w.debt || 0);

                return (
                  <tr key={w.id} className="bg-slate-900 print:bg-white border-b border-slate-800 print:border-gray-300 hover:bg-slate-800 print:bg-gray-100/50">
                    <td className="sticky left-0 z-10 bg-slate-900 print:bg-white border border-slate-700 print:border-gray-400 p-1 text-center font-medium">{index + 1}</td>
                    <td className="sticky left-[40px] z-10 bg-slate-900 print:bg-white border border-slate-700 print:border-gray-400 p-1">
                      <input type="text" value={w.fullName} onChange={(e) => handleChange(w.id, 'fullName', e.target.value)} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <input type="number" value={w.wagePerDay || ''} onChange={(e) => handleChange(w.id, 'wagePerDay', Number(e.target.value))} onBlur={() => { if (w.sheetRowIndex) { updateWageInSheet(w.sheetRowIndex, w.wagePerDay || 0); } }} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <input type="number" value={w.workDays || ''} onChange={(e) => handleChange(w.id, 'workDays', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-right text-amber-200 print:text-black">{wageTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <input type="number" value={w.overtimeRate || ''} onChange={(e) => handleChange(w.id, 'overtimeRate', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <input type="number" value={w.overtimeHours || ''} onChange={(e) => handleChange(w.id, 'overtimeHours', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-right text-amber-200 print:text-black">{overtimeTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <input type="number" value={w.advanceIncome || ''} onChange={(e) => handleChange(w.id, 'advanceIncome', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <input type="number" value={w.bonus || ''} onChange={(e) => handleChange(w.id, 'bonus', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-blue-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-right font-bold text-emerald-400 bg-emerald-900/10">
                      {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-rose-200 bg-rose-900/10">
                      <input type="number" value={w.socialSecurity || ''} onChange={(e) => handleChange(w.id, 'socialSecurity', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-rose-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-rose-200 bg-rose-900/10">
                      <input type="number" value={w.wageDeduction || ''} onChange={(e) => handleChange(w.id, 'wageDeduction', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-rose-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-rose-200 bg-rose-900/10">
                      <input type="number" value={w.utilities || ''} onChange={(e) => handleChange(w.id, 'utilities', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-rose-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-rose-200 bg-rose-900/10">
                      <input type="number" value={w.debt || ''} onChange={(e) => handleChange(w.id, 'debt', Number(e.target.value))} className="w-full bg-transparent border-none text-white print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-rose-500 rounded" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-right font-bold text-emerald-300 bg-emerald-700/20">
                      {netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 bg-amber-900/10">
                      <input type="number" value={w.period1Pay || ''} onChange={(e) => handleChange(w.id, 'period1Pay', Number(e.target.value))} placeholder="0" className="w-full bg-transparent border-none text-amber-200 print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-amber-500 rounded font-medium" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1">
                      <div className="w-full px-1 text-sm text-right text-slate-300 print:text-gray-700 font-medium">{calcRemainingDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 bg-amber-900/20">
                      <input type="number" value={calcTotalDebt || ''} onChange={(e) => handleChange(w.id, 'totalDebt', Number(e.target.value))} placeholder="0" className="w-full bg-transparent border-none text-amber-300 print:text-black px-1 text-sm text-right focus:ring-1 focus:ring-amber-500 rounded font-bold" />
                    </td>
                    <td className="border border-slate-700 print:border-gray-400 p-1 text-center no-print">
                      <button onClick={() => setAttendanceModalWorker(w)} className="bg-emerald-600 hover:bg-emerald-500 text-white print:text-black p-1.5 rounded" title="บันทึกการทำงาน">
                        <ClipboardCheck className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={21} className="border border-slate-700 print:border-gray-400 p-8 text-center text-slate-500">
                    ยังไม่มีข้อมูลคนงาน คลิก "เพิ่มคนงาน" เพื่อเริ่มต้น
                  </td>
                </tr>
              )}
            </tbody>
            {workers.length > 0 && (
              <tfoot className="bg-slate-800 print:bg-gray-100 text-slate-300 print:text-gray-700 font-bold">
                <tr>
                  <td colSpan={2} className="sticky left-0 z-10 bg-slate-800 print:bg-gray-100 border border-slate-700 print:border-gray-400 p-2 text-right">รวมทั้งหมด</td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + (w.wagePerDay || 0), 0).toLocaleString()}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + (w.workDays || 0), 0)}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-amber-200 print:text-black">
                    {workers.reduce((acc, w) => acc + (w.wagePerDay || 0) * (w.workDays || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + (w.overtimeRate || 0), 0).toLocaleString()}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + (w.overtimeHours || 0), 0)}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-amber-200 print:text-black">
                    {workers.reduce((acc, w) => acc + (w.overtimeRate || 0) * (w.overtimeHours || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + (w.advanceIncome || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + (w.bonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-emerald-400">
                    {workers.reduce((acc, w) => acc + (w.wagePerDay || 0) * (w.workDays || 0) + (w.overtimeRate || 0) * (w.overtimeHours || 0) + (w.advanceIncome || 0) + (w.bonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-rose-300">
                    {workers.reduce((acc, w) => acc + (w.socialSecurity || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-rose-300">
                    {workers.reduce((acc, w) => acc + (w.wageDeduction || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-rose-300">
                    {workers.reduce((acc, w) => acc + (w.utilities || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-rose-300">
                    {workers.reduce((acc, w) => acc + (w.debt || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-emerald-300">
                    {workers.reduce((acc, w) => acc + (w.wagePerDay || 0) * (w.workDays || 0) + (w.overtimeRate || 0) * (w.overtimeHours || 0) + (w.advanceIncome || 0) + (w.bonus || 0) - ((w.socialSecurity || 0) + (w.wageDeduction || 0) + (w.utilities || 0) + (w.debt || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-amber-200">
                    {workers.reduce((acc, w) => acc + (w.period1Pay || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right">
                    {workers.reduce((acc, w) => acc + ((w.totalDebt || w.period1Pay || 0) - (w.debt || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 text-right text-amber-300">
                    {workers.reduce((acc, w) => acc + (w.totalDebt || w.period1Pay || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-700 print:border-gray-400 p-2 no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {attendanceModalWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
            
            {/* Header section matches image */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button onClick={() => setAttendanceModalWorker(null)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-600" />
                </button>
                <div className="font-bold text-gray-800 text-lg">ระบบลงเวลาพนักงาน</div>
              </div>
            </div>
            
            <div className="bg-emerald-600 p-4 flex flex-col items-center justify-center relative shadow-inner">
              <div className="w-20 h-20 bg-emerald-100 rounded-full border-4 border-white overflow-hidden shadow-lg mb-2 flex items-center justify-center">
                {attendanceModalWorker.imageUrl ? (
                  <img src={attendanceModalWorker.imageUrl} alt={attendanceModalWorker.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-emerald-600 font-bold">{attendanceModalWorker.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="text-white print:text-black font-bold text-lg">{attendanceModalWorker.fullName}</div>
              <div className="text-emerald-100 print:text-black text-sm opacity-90 mt-1 px-3 py-1 bg-emerald-800/40 rounded-full">พนักงาน</div>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-50 p-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-center">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium text-sm">
                    <tr>
                      <th className="py-3 px-2 font-medium">วันที่</th>
                      <th className="py-3 px-2 font-medium">เช้า</th>
                      <th className="py-3 px-2 font-medium">บ่าย</th>
                      <th className="py-3 px-2 font-medium">OT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {attendanceModalWorker.attendanceRecords && attendanceModalWorker.attendanceRecords.length > 0 ? (
                      attendanceModalWorker.attendanceRecords.sort((a,b) => {
                        const da = parseInt(a.date.split('/')[0]);
                        const db = parseInt(b.date.split('/')[0]);
                        return da - db;
                      }).map((rec, i) => (
                        <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-3 px-2 font-medium">{rec.date}</td>
                          <td className="py-3 px-2">
                            {rec.morn ? <Check className="w-5 h-5 mx-auto text-emerald-500" /> : <X className="w-5 h-5 mx-auto text-rose-500" />}
                          </td>
                          <td className="py-3 px-2">
                            {rec.aft ? <Check className="w-5 h-5 mx-auto text-emerald-500" /> : <X className="w-5 h-5 mx-auto text-rose-500" />}
                          </td>
                          <td className="py-3 px-2 font-semibold">
                            {rec.ot > 0 ? <span className="text-emerald-600">{rec.ot}</span> : <span className="text-gray-400">0</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-gray-400 text-center">ไม่มีข้อมูลการลงเวลาในงวดนี้</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-emerald-50/50 border-t border-gray-100 text-emerald-800 font-semibold text-sm">
                    <tr>
                      <td colSpan={2} className="py-3 px-2 text-right">จำนวนวันทำงาน:</td>
                      <td className="py-3 px-2 text-left text-emerald-600 text-base">{attendanceModalWorker.workDays} วัน</td>
                      <td className="py-3 px-2 text-center text-emerald-600">รวม: {attendanceModalWorker.overtimeHours}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};
