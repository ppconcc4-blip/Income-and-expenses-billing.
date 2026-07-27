export type TransactionType = 'income' | 'expense';

export type ExpenseCategory = 
  | 'ค่าวัสดุก่อสร้าง'
  | 'ค่าแรงงาน'
  | 'ค่าเครื่องจักรและอุปกรณ์'
  | 'ค่าผู้รับเหมาช่วง'
  | 'ค่าออกแบบและวิศวกร'
  | 'ค่าบริหารงานโครงการ'
  | 'ค่าสาธารณูปโภค/เชื้อเพลิง'
  | 'อื่นๆ';

export type IncomeCategory = 
  | 'ค่างวดงานก้าวหน้า'
  | 'เงินมัดจำ/เบิกล่วงหน้า'
  | 'เงินประกันผลงานคืน (Retention)'
  | 'รายรับอื่นๆ';

export interface Transaction {
  id: string;
  projectId: string;
  projectCode: string;
  type: TransactionType;
  category: ExpenseCategory | IncomeCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  payerOrPayee: string; // ผู้จ่ายเงิน หรือ ผู้รับเงิน
  documentNo?: string; // เลขที่ใบเสร็จ / ใบกำกับภาษี
  paymentMethod: 'โอนเงิน' | 'เงินสด' | 'เช็ค' | 'บัตรเครดิต';
  sheetUrl?: string; // ลิงก์ไปยัง Google Sheet เฉพาะรายการ
  createdAt: string;
}

export type BillingStatus = 'pending' | 'billed' | 'paid' | 'overdue';

export interface BillingItem {
  id: string;
  invoiceNo: string; // เลขที่ใบวางบิล / ใบแจ้งหนี้
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string; // ชื่อผู้ว่าจ้าง / ลูกค้า
  period: string; // งวดที่ เช่น งวดที่ 1/5 (งานเสร็จ 20%)
  amount: number; // มูลค่ารวมก่อนภาษี
  vatInclude: boolean; // มี VAT 7% หรือไม่
  vatAmount: number;
  whtDeduct: boolean; // หัก ณ ที่จ่าย 3% หรือไม่
  whtAmount: number;
  totalPayable: number; // ยอดสุทธิที่ต้องชำระ
  billingDate: string; // วันที่วางบิล
  dueDate: string; // วันกำหนดชำระ
  paidDate?: string; // วันที่ชำระจริง
  status: BillingStatus;
  contactPerson?: string; // ชื่อผู้ติดต่อ
  contactPhone?: string; // เบอร์โทรศัพท์ผู้ติดต่อ
  clientAddress?: string; // ที่อยู่ผู้ว่าจ้าง / ลูกค้า
  clientTaxId?: string; // เลขประจำตัวผู้เสียภาษีลูกค้า
  advanceDeduction?: number; // หักเงินเบิกล่วงหน้า (-)
  retentionDeduction?: number; // หักเงินประกันผลงาน (-)
  paymentMethodChoice?: 'cash' | 'transfer' | 'cheque'; // เงื่อนไขการจ่ายเงิน
  issuerName?: string; // ชื่อผู้วางบิลในวงเล็บ
  issuerDate?: string; // วันที่ผู้วางบิล (เช่น 24 / มี.ค. / 2569)
  receiverName?: string; // ชื่อผู้รับวางบิล
  receiverDate?: string; // วันที่ผู้รับวางบิล
  notes?: string;
  sheetUrl?: string; // ลิงก์ Google Sheet การวางบิล
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  code: string; // เช่น PROJ-2026-001
  name: string; // ชื่อโครงการ
  clientName: string; // ชื่อผู้ว่าจ้าง
  contractValue: number; // มูลค่าสัญญา
  budget: number; // งบประมาณ
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'on_hold';
  sheetUrlIncome: string; // ลิงก์ Google Sheet รายรับรายจ่าย
  sheetUrlBilling: string; // ลิงก์ Google Sheet การวางบิล
  sheetTabName?: string; // ชื่อชีตย่อย (Tab)
  drawingDriveId?: string; // ID หรือ ลิงก์ Google Drive ไฟล์แบบแปลน (Drawing)
  boqDriveId?: string; // ID หรือ ลิงก์ Google Drive ไฟล์ BOQ (รายการปริมาณงาน)
  location?: string; // สถานที่ก่อสร้าง
  contractNo?: string; // สัญญาจ้างเลขที่
  plannerSheetUrl?: string; // ลิงก์แผนงาน
}

export interface LineConfig {
  token: string;
  enabled: boolean;
  autoAlertOnStatusChange: boolean;
  autoAlertOnUpcomingDue: boolean;
  notifyTargetName?: string;
}

export interface MonthlyStats {
  monthKey: string; // YYYY-MM
  monthName: string; // เช่น มกราคม 2026
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalBilled: number;
  pendingBilling: number;
}
