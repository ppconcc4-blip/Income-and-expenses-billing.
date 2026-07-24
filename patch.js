const fs = require('fs');

const appFile = fs.readFileSync('src/App.tsx', 'utf8');
const newAppFile = appFile.replace(
  '<LaborWagesManager />',
  '<LaborWagesManager googleUser={googleUser} />'
);
fs.writeFileSync('src/App.tsx', newAppFile);

let lwFile = fs.readFileSync('src/components/LaborWagesManager.tsx', 'utf8');
if (!lwFile.includes('googleUser')) {
  lwFile = lwFile.replace(
    'export const LaborWagesManager: React.FC = () => {',
    `import { User } from 'firebase/auth';
import { getAccessToken } from '../lib/firebase';
import { extractSpreadsheetId } from '../lib/googleSheetsService';
import { RefreshCw } from 'lucide-react';

export const LaborWagesManager: React.FC<{ googleUser: User | null }> = ({ googleUser }) => {
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1JKh7fbbfp2X9Ws5aPJKS-JQ_7kOi4TBXSJJlJBDHZsQ/edit?usp=drive_link');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState('1-15');
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchData = async () => {
    if (!googleUser) {
      alert("กรุณาลอคอินก่อนดึงข้อมูล");
      return;
    }
    setIsFetching(true);
    try {
      const token = await getAccessToken();
      const spreadsheetId = extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        alert("URL ไม่ถูกต้อง");
        return;
      }

      const empRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Employees!A:H\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const attRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Sheet1!A:H\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });

      if (!empRes.ok || !attRes.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงหรือชื่อชีต (Employees และ Sheet1)');
      }

      const empData = await empRes.json();
      const attData = await attRes.json();

      const empRows = empData.values || [];
      const attRows = attData.values || [];

      if (empRows.length < 2) {
        alert("ไม่พบข้อมูลพนักงานในชีต Employees");
        return;
      }
      if (attRows.length < 2) {
        alert("ไม่พบข้อมูลเวลาเข้างานในชีต Sheet1");
        return;
      }

      const empHeaders = empRows[0].map((h: string) => h.toLowerCase().trim());
      const attHeaders = attRows[0].map((h: string) => h.toLowerCase().trim());

      const nameIdx = empHeaders.findIndex((h: string) => h.includes('ชื่อ') && !h.includes('เล่น'));
      const nickIdx = empHeaders.findIndex((h: string) => h.includes('เล่น'));
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
        alert("ไม่พบคอลัมน์ วันที่, ช่วงเช้า หรือ ช่วงบ่าย ใน Sheet1");
        return;
      }

      const newWorkers: WorkerRecord[] = [];

      for (let i = 1; i < empRows.length; i++) {
        const row = empRows[i];
        if (!row || row.length === 0) continue;
        
        const name = nameIdx !== -1 ? (row[nameIdx] || '') : (row[1] || '');
        const nickname = nickIdx !== -1 ? (row[nickIdx] || '') : (row[2] || '');
        const wage = wageIdx !== -1 ? Number((row[wageIdx] || '').replace(/[^0-9.]/g, '')) : Number((row[3] || '').replace(/[^0-9.]/g, ''));
        const otRate = otRateIdx !== -1 ? Number((row[otRateIdx] || '').replace(/[^0-9.]/g, '')) : Number((row[4] || '').replace(/[^0-9.]/g, ''));
        const empId = empIdIdx !== -1 ? (row[empIdIdx] || '') : (row[0] || '');

        if (!name) continue;

        let workDays = 0;
        let overtimeHours = 0;

        for (let j = 1; j < attRows.length; j++) {
          const aRow = attRows[j];
          if (!aRow || aRow.length === 0) continue;

          const dateStr = aRow[attDateIdx];
          if (!dateStr) continue;

          let dateObj: Date;
          if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              dateObj = new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
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
               else if (name && attName && name.includes(attName) || attName.includes(name)) matched = true;

               if (matched) {
                   const morn = aRow[attMornIdx]?.trim() || '';
                   const aft = aRow[attAftIdx]?.trim() || '';
                   const ot = attOtIdx !== -1 ? Number((aRow[attOtIdx] || '').replace(/[^0-9.]/g, '')) : 0;

                   if (morn === 'เข้างาน') workDays += 0.5;
                   if (aft === 'เข้างาน') workDays += 0.5;
                   overtimeHours += ot;
               }
            }
          }
        }

        newWorkers.push({
          id: crypto.randomUUID(),
          no: newWorkers.length + 1,
          fullName: name,
          nickname: nickname,
          wagePerDay: wage || 0,
          workDays: workDays,
          overtimeRate: otRate || 0,
          overtimeHours: overtimeHours,
          advanceIncome: 0,
          bonus: 0,
          socialSecurity: 0,
          wageDeduction: 0,
          utilities: 0,
          debt: 0,
          period1Pay: 0,
          remainingDebt: 0,
          note: ''
        });
      }

      setWorkers(newWorkers);
      alert('ดึงข้อมูลและคำนวณสำเร็จ!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFetching(false);
    }
  };`
  );
  fs.writeFileSync('src/components/LaborWagesManager.tsx', lwFile);
}
