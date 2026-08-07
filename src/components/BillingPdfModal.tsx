import React, { useState, useEffect } from 'react';
import { Printer, X, Edit3, ChevronDown, ChevronUp, Calendar, User, Phone, DollarSign, CheckSquare, Square, MapPin, Download } from 'lucide-react';
import { BillingItem, Project } from '../types';
import { PPLogo } from './PPLogo';

interface BillingPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingItem: BillingItem | null;
  allBillingItems?: BillingItem[];
  projects?: Project[];
}

export function thaiBahtText(num: number): string {
  if (isNaN(num) || num < 0) return '';
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const numStr = num.toFixed(2);
  const [bahtStr, satangStr] = numStr.split('.');

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const convert = (s: string) => {
    let res = '';
    const len = s.length;
    for (let i = 0; i < len; i++) {
      const d = parseInt(s[i]);
      const p = len - i - 1;
      if (d !== 0) {
        if (p % 6 === 1 && d === 1) {
          res += 'สิบ';
        } else if (p % 6 === 1 && d === 2) {
          res += 'ยี่สิบ';
        } else if (p % 6 === 0 && d === 1 && i > 0 && i === len - 1) {
          res += 'เอ็ด';
        } else {
          res += digits[d] + units[p % 6];
        }
      }
      if (p > 0 && p % 6 === 0) {
        res += 'ล้าน';
      }
    }
    return res;
  };

  let result = convert(bahtStr) + 'บาท';
  if (parseInt(satangStr) === 0) {
    result += 'ถ้วน';
  } else {
    result += convert(satangStr) + 'สตางค์';
  }

  return result;
}

// Convert YYYY-MM-DD to Thai Buddhist date format (e.g., 2026-03-24 -> 24 / มี.ค. / 2569)
function formatThaiDateFromYMD(ymdStr: string): string {
  if (!ymdStr) return '24 / มี.ค. / 2569';
  const parts = ymdStr.split('-');
  if (parts.length !== 3) return ymdStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const thaiYear = year > 2500 ? year : year + 543;
  const monthName = thaiMonths[monthIdx] || `${monthIdx + 1}`;

  return `${day} / ${monthName} / ${thaiYear}`;
}

// Helper to get stored address per project from localStorage
const getStoredAddressForProject = (projectId?: string, projectName?: string, defaultAddr?: string) => {
  const key = projectId ? `pp_project_address_${projectId}` : `pp_project_address_${projectName || 'default'}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
  } catch (e) {
    console.error('Error reading localStorage address', e);
  }
  return defaultAddr || 'เอกอุดร ตำบลหลักหก อำเภอเมืองปทุมธานี ปทุมธานี 12000';
};

const saveAddressForProject = (projectId: string | undefined, projectName: string | undefined, address: string) => {
  const key = projectId ? `pp_project_address_${projectId}` : `pp_project_address_${projectName || 'default'}`;
  try {
    localStorage.setItem(key, address);
  } catch (e) {
    console.error('Error saving localStorage address', e);
  }
};

export const BillingPdfModal: React.FC<BillingPdfModalProps> = ({
  isOpen,
  onClose,
  billingItem,
  allBillingItems = [],
  projects = []
}) => {
  const [exportMode, setExportMode] = useState<'single' | 'table'>(billingItem ? 'single' : 'table');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(billingItem?.id || (allBillingItems[0]?.id || ''));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Active single item based on selection or prop
  const activeItem = allBillingItems.find(item => item.id === selectedInvoiceId) || billingItem || allBillingItems[0];

  // Editable fields for Single Invoice PDF
  const [subjectName, setSubjectName] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [clientTaxId, setClientTaxId] = useState<string>('-');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactFax, setContactFax] = useState<string>('-');
  
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [periodText, setPeriodText] = useState<string>('');
  const [billingDateText, setBillingDateText] = useState<string>('');
  const [dueDateText, setDueDateText] = useState<string>('-');
  const [receivedDateText, setReceivedDateText] = useState<string>('-');

  const [itemDesc, setItemDesc] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [advanceDeduction, setAdvanceDeduction] = useState<number>(0);
  const [retentionDeduction, setRetentionDeduction] = useState<number>(0);
  
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<'cash' | 'transfer' | 'cheque'>('transfer');
  
  // Signature Fields
  const [issuerName, setIssuerName] = useState<string>('');
  const [issuerRawDate, setIssuerRawDate] = useState<string>('2026-03-24');
  const [issuerDateFormatted, setIssuerDateFormatted] = useState<string>('24 / มี.ค. / 2569');

  // Bank Info
  const [bankName, setBankName] = useState<string>('ธนาคาร กสิกรไทย บัญชีเงินฝากออมทรัพย์');
  const [bankBranch, setBankBranch] = useState<string>('สาขา ลาดพร้าว 10');
  const [bankAccountNo, setBankAccountNo] = useState<string>('029 -1- 96080-4');

  // Collapse state for edit options bar
  const [showEditPanel, setShowEditPanel] = useState<boolean>(true);

  // Sync state when active item changes
  useEffect(() => {
    if (activeItem) {
      setSubjectName(activeItem.projectName || 'บ้านไม้เมืองเอก');
      setClientName(activeItem.clientName || 'คุณกิ๊ฟ');
      
      // Load saved project address from localStorage or fallback to default
      const savedAddress = getStoredAddressForProject(
        activeItem.projectId,
        activeItem.projectName,
        activeItem.clientAddress || 'เอกอุดร ตำบลหลักหก อำเภอเมืองปทุมธานี ปทุมธานี 12000'
      );
      setClientAddress(savedAddress);

      setClientTaxId(activeItem.clientTaxId || '-');
      setContactPerson(activeItem.contactPerson || 'คุณเก้ง');
      setContactPhone(activeItem.contactPhone || '081-165-7555');
      setContactFax('-');

      setInvoiceNo(activeItem.invoiceNo || 'PP-MA-01');
      setPeriodText(activeItem.period || 'งวดที่ 1');
      setBillingDateText(activeItem.billingDate || '24/3/2026');
      setDueDateText(activeItem.dueDate || '-');
      setReceivedDateText(activeItem.paidDate || '-');

      setItemDesc(activeItem.projectName || 'บ้านไม้เมืองเอก');
      setAmount(activeItem.amount || 186915.89);
      setAdvanceDeduction(activeItem.advanceDeduction || 0);
      setRetentionDeduction(activeItem.retentionDeduction || 0);

      setPaymentMethodChoice(activeItem.paymentMethodChoice || 'transfer');
      setIssuerName(activeItem.issuerName || '');

      // Today YYYY-MM-DD default for calendar date picker
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayYmd = `${yyyy}-${mm}-${dd}`;

      setIssuerRawDate(todayYmd);
      setIssuerDateFormatted(activeItem.issuerDate || formatThaiDateFromYMD(todayYmd));
    }
  }, [activeItem?.id]);

  if (!isOpen) return null;

  // Handle Client Address Change & Save per Project
  const handleClientAddressChange = (newAddr: string) => {
    setClientAddress(newAddr);
    if (activeItem) {
      saveAddressForProject(activeItem.projectId, activeItem.projectName, newAddr);
    }
  };

  // Handle Date Picker Change for Issuer Date
  const handleIssuerDateChange = (ymdStr: string) => {
    setIssuerRawDate(ymdStr);
    const formatted = formatThaiDateFromYMD(ymdStr);
    setIssuerDateFormatted(formatted);
  };

  // Calculations matching sample PDF exactly
  const baseSubtotal = amount;
  const remaining = baseSubtotal;
  const netAfterAdvance = baseSubtotal - advanceDeduction;
  const vat7 = activeItem?.vatInclude !== false ? netAfterAdvance * 0.07 : 0;
  const netTotal = netAfterAdvance + vat7 - retentionDeduction;

  // Filtered items for summary table mode based on project selector
  const filteredTableItems = selectedProjectId === 'all'
    ? allBillingItems
    : allBillingItems.filter(item => item.projectId === selectedProjectId);

  const handlePrint = () => {
    const printElement = document.getElementById('billing-printable-area');
    if (!printElement) {
      window.print();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>${exportMode === 'single' ? `ใบแจ้งหนี้_${invoiceNo}` : 'รายงานสรุปการวางบิล'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 portrait; margin: 6mm; }
      body { font-family: 'Sarabun', sans-serif; background: #ffffff !important; color: #000000 !important; padding: 12px; margin: 0; }
      table { border-collapse: collapse !important; width: 100% !important; }
      .page-break { page-break-before: always !important; break-before: page !important; }
      .no-print { display: none !important; }
    </style>
  </head>
  <body>
    <div id="billing-printable-area">
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

  const handleExportCSV = () => {
    if (exportMode === 'single') {
      const headers = ['เลขที่ใบวางบิล', 'ชื่อโครงการ', 'ลูกค้า', 'งวดงาน', 'วันวางบิล', 'วันครบกำหนด', 'จำนวนเงินก่อน VAT', 'หักเงินล่วงหน้า', 'VAT 7%', 'หักประกันผลงาน', 'จำนวนเงินสุทธิ'];
      const row = [
        invoiceNo,
        `"${itemDesc.replace(/"/g, '""')}"`,
        `"${clientName.replace(/"/g, '""')}"`,
        `"${periodText.replace(/"/g, '""')}"`,
        billingDateText,
        dueDateText,
        baseSubtotal,
        advanceDeduction,
        vat7,
        retentionDeduction,
        netTotal
      ];
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), row.join(',')].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `PP_Invoice_${invoiceNo}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['เลขที่ใบวางบิล', 'ชื่อโครงการ', 'ผู้ว่าจ้าง', 'งวดงาน', 'วันวางบิล', 'วันครบกำหนด', 'วันที่ชำระ', 'ยอดรับสุทธิ (บาท)', 'สถานะ'];
      const rows = filteredTableItems.map(item => [
        item.invoiceNo,
        `"${(item.projectName || '').replace(/"/g, '""')}"`,
        `"${(item.clientName || '').replace(/"/g, '""')}"`,
        `"${(item.period || '').replace(/"/g, '""')}"`,
        item.billingDate,
        item.dueDate,
        item.paidDate || '',
        item.totalPayable,
        item.status === 'paid' ? 'ชำระแล้ว' : item.status === 'billed' ? 'วางบิลแล้ว' : item.status === 'pending' ? 'รอวางบิล' : 'เกินกำหนด'
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `PP_Billing_Summary_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to render exact single invoice sheet matching original / copy PDF
  const renderInvoiceSheet = (copyType: 'original' | 'copy') => {
    const isCopy = copyType === 'copy';

    return (
      <div className={`p-4 sm:p-6 bg-white text-black font-sans text-[11px] leading-tight space-y-2 border ${isCopy ? 'border-slate-800' : 'border-blue-700'}`}>
        
        {/* TOP HEADER: Logo & Company Name + Document Type Box */}
        <div className="flex justify-between items-start gap-2">
          
          {/* Logo & Company Info */}
          <div className="flex items-start gap-4 flex-1">
            {/* PP Construction Logo */}
            <div className="w-20 h-20 shrink-0">
              <PPLogo className="w-full h-full" fillColor={isCopy ? "#334155" : "#1e3a8a"} />
            </div>

            <div className="space-y-0.5 text-[10px]">
              <h1 className={`text-[13px] font-black uppercase ${isCopy ? 'text-slate-900' : 'text-blue-900'}`}>
                บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมนเนจเม้นท์ จำกัด (สำนักงานใหญ่)
              </h1>
              <h2 className={`text-[11px] font-bold tracking-tight ${isCopy ? 'text-slate-800' : 'text-blue-800'}`}>
                PP. CONSTRUCTION AND MANAGEMENT CO.,LTD. ( Head Office )
              </h2>
              <p className="text-[10px] text-slate-800 font-medium">
                45 ซอยโชคชัย 4 ซอย 83 ถนนโชคชัย 4 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230
              </p>
              <p className="text-[10px] text-slate-800">
                45 Soi Chokchai 4 Soi 83 , Chokchai 4 Road , Ladprao , Bangkok 10230
              </p>
              <p className="text-[10.5px] font-bold text-slate-900 pt-1">
                เลขประจำตัวผู้เสียภาษี/ TAX ID : <span className="font-black">0105556120098</span> &nbsp;&nbsp; โทรศัพท์ / TEL : <span className="font-bold">062-519-9517</span>
              </p>
            </div>
          </div>

          {/* Right Header Document Badge */}
          <div className="w-56 text-right shrink-0">
            {isCopy ? (
              <div className="border-2 border-slate-900 bg-white text-black p-2 text-center rounded-sm">
                <p className="text-[11px] font-black">สำเนาใบวางบิล</p>
                <p className="text-[14px] font-black tracking-widest uppercase">BILLING NOTE COPY</p>
              </div>
            ) : (
              <div className="bg-blue-900 text-white p-2 text-center rounded-sm shadow-md">
                <p className="text-[12px] font-black">ต้นฉบับใบวางบิล</p>
                <p className="text-[16px] font-black tracking-widest uppercase">BILLING NOTE</p>
              </div>
            )}
            
            <div className="mt-2 text-right text-[11px] space-y-1">
              <p><span className="text-slate-600 font-bold">เลขที่ / NO :</span> <span className="font-black text-slate-950 text-[12px]">{invoiceNo || 'PP-MA-01'}</span></p>
              <p><span className="text-slate-600 font-bold">วันที่ / DATE :</span> <span className="font-black text-slate-950">{billingDateText || '24/3/2026'}</span></p>
            </div>
          </div>

        </div>

        {/* SUBJECT & CUSTOMER BOX */}
        <div className={`border ${isCopy ? 'border-slate-800' : 'border-blue-900'} text-[11px] overflow-hidden`}>
          <div className="grid grid-cols-12 divide-x divide-slate-300">
            {/* Left: Customer Info */}
            <div className="col-span-7 p-3 space-y-1.5">
              <div className="flex">
                <span className="w-24 text-slate-600 font-bold shrink-0">ลูกค้า / CUSTOMER :</span>
                <span className="font-black text-slate-950">{clientName}</span>
              </div>
              <div className="flex items-start">
                <span className="w-24 text-slate-600 font-bold shrink-0">ที่อยู่ / ADDRESS :</span>
                <span className="text-slate-900 leading-tight font-medium">{clientAddress}</span>
              </div>
              <div className="flex pt-1">
                <span className="w-40 text-slate-600 font-bold shrink-0">เลขประจำตัวผู้เสียภาษี / TAX ID :</span>
                <span className="text-slate-950 font-black tracking-wider">{clientTaxId}</span>
              </div>
            </div>

            {/* Right: Project & Contact */}
            <div className="col-span-5 p-3 space-y-1.5 bg-slate-50/30">
              <div className="flex">
                <span className="w-24 text-slate-600 font-bold shrink-0">โครงการ / PROJECT :</span>
                <span className="font-black text-blue-900">{subjectName}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-600 font-bold shrink-0">งวดงาน / PERIOD :</span>
                <span className="font-black text-slate-950">{periodText}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-600 font-bold shrink-0">ผู้ติดต่อ / CONTACT :</span>
                <span className="font-black text-slate-950">{contactPerson}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-600 font-bold shrink-0">โทรศัพท์ / TEL :</span>
                <span className="font-black text-slate-950">{contactPhone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS & FINANCIAL TABLE */}
        <div className={`border ${isCopy ? 'border-slate-800' : 'border-blue-900'}`}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className={`${isCopy ? 'bg-slate-900 text-white' : 'bg-blue-900 text-white'} font-bold border-b border-slate-800`}>
                <th className="py-2 px-1 text-center w-[10%] border-r border-slate-400">ลำดับ<br/><span className="text-[8px] font-normal">NO.</span></th>
                <th className="py-2 px-3 text-center w-[65%] border-r border-slate-400">รายการ<br/><span className="text-[8px] font-normal">DESCRIPTION</span></th>
                <th className="py-2 px-3 text-right w-[25%]">จำนวนเงิน<br/><span className="text-[8px] font-normal">AMOUNT</span></th>
              </tr>
            </thead>
            <tbody>
              {/* Item row centered horizontally & vertically */}
              <tr className="min-h-[160px]">
                <td className="py-4 px-1 border-r border-slate-300 text-center align-top font-bold text-slate-900">
                  1
                </td>
                <td className="py-4 px-4 border-r border-slate-300 h-40 align-top">
                  <p className="font-black text-slate-950 text-[12px] leading-relaxed mb-1">{itemDesc}</p>
                  <p className="text-slate-600 text-[10px] italic">({periodText})</p>
                </td>
                <td className="py-4 px-3 text-right font-black text-slate-950 align-top">
                  {amount > 0 ? amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </td>
              </tr>

              {/* Subtotals breakdown inside table */}
              <tr className="border-t border-slate-400 font-bold">
                <td className="py-1 px-3 text-right border-r border-slate-400 bg-slate-50">รวมเงิน / SUB TOTAL</td>
                <td className="py-1 px-3 text-right text-slate-900 bg-slate-50">
                  {baseSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="border-t border-slate-300">
                <td className="py-1 px-3 text-right border-r border-slate-400 font-medium">คงเหลือ</td>
                <td className="py-1 px-3 text-right font-bold text-slate-900">
                  {remaining.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="border-t border-slate-300">
                <td className="py-1 px-3 text-right border-r border-slate-400 font-medium">หัก เงินเบิกล่วงหน้า (-)</td>
                <td className="py-1 px-3 text-right font-bold text-slate-900">
                  {advanceDeduction > 0 ? advanceDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </td>
              </tr>

              <tr className="border-t border-slate-300 font-bold">
                <td className="py-1 px-3 text-right border-r border-slate-400">รวมเป็นเงิน</td>
                <td className="py-1 px-3 text-right text-slate-900">
                  {netAfterAdvance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="border-t border-slate-300">
                <td className="py-1 px-3 text-right border-r border-slate-400 font-bold">VAT 7%</td>
                <td className="py-1 px-3 text-right font-bold text-slate-900">
                  {vat7.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="border-t border-slate-300">
                <td className="py-1 px-3 text-right border-r border-slate-400 font-medium">หัก เงินประกันผลงาน (-)</td>
                <td className="py-1 px-3 text-right font-bold text-slate-900">
                  {retentionDeduction > 0 ? retentionDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </td>
              </tr>

              {/* NET TOTAL AMOUNT */}
              <tr className={`border-t-2 ${isCopy ? 'border-slate-900 bg-slate-100' : 'border-blue-900 bg-blue-50/50'} font-black text-[11.5px]`}>
                <td className="py-1.5 px-3 text-right border-r border-slate-400">
                  จำนวนเงินรวมทั้งสิ้น<br/><span className="text-[9.5px] font-bold uppercase">NET TOTAL AMOUNT</span>
                </td>
                <td className="py-1.5 px-3 text-right text-[13px] text-blue-950 font-black">
                  {netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* THAI BAHT WORDING BAR */}
        <div className="bg-slate-200 text-slate-900 text-center font-bold py-1 px-2 border border-slate-400 text-[11px] rounded-xs">
          {thaiBahtText(netTotal)}
        </div>

        {/* BOTTOM SECTION: Left Bank & Terms | Right Signatures */}
        <div className="grid grid-cols-12 gap-3 text-[10px] items-stretch pt-1">
          
          {/* Left Box: Notes & Payment Terms */}
          <div className="col-span-6 space-y-1 pr-1 border-r border-slate-300">
            <p className="font-bold text-slate-900">หมายเหตุ :</p>
            <div className="pl-1 space-y-0.5 text-slate-900">
              <p className="font-bold">บัญชี บจก. พีพี. คอนสตรัคชั่น แอนด์ แมนเนจเม้นท์</p>
              <p>{bankName}</p>
              <p>{bankBranch}</p>
              <p className="font-extrabold text-[10.5px]">เลขที่บัญชี {bankAccountNo}</p>
            </div>

            <div className="pt-2 border-t border-slate-300">
              <p className="font-bold text-slate-900 mb-1">เงื่อนไขการชำระเงิน / TERM OF PAYMENT</p>
              <div className="flex items-center space-x-4 font-bold text-slate-900">
                <div className="flex items-center space-x-1">
                  <span className="w-4 h-4 border border-slate-900 flex items-center justify-center text-[10px]">
                    {paymentMethodChoice === 'cash' ? '✓' : ''}
                  </span>
                  <span>สด</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-4 h-4 border border-slate-900 flex items-center justify-center text-[10px]">
                    {paymentMethodChoice === 'transfer' ? '✓' : ''}
                  </span>
                  <span>โอน</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-4 h-4 border border-slate-900 flex items-center justify-center text-[10px]">
                    {paymentMethodChoice === 'cheque' ? '✓' : ''}
                  </span>
                  <span>เช็ค</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Box: Signature Columns */}
          <div className="col-span-6 border border-slate-800 grid grid-cols-2 text-center text-[11px] divide-x divide-slate-800">
            {/* Receiver Signature */}
            <div className="p-3 flex flex-col justify-between h-40">
              <p className="font-black text-slate-950 underline underline-offset-4">ผู้รับวางบิล / RECEIVER</p>
              
              <div className="space-y-1.5">
                <p className="text-slate-800 font-bold">
                  (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
                </p>
                <p className="font-bold text-slate-950 pt-2 border-t border-slate-200">
                  วันที่/DATE <span className="font-black">____/_____/_____</span>
                </p>
              </div>
            </div>

            {/* Issuer Signature */}
            <div className="p-3 flex flex-col justify-between h-40 bg-slate-50/50">
              <p className="font-black text-slate-950 underline underline-offset-4">ผู้วางบิล / ISSUED BY</p>
              
              <div className="space-y-1.5">
                <p className="text-slate-950 font-black">
                  ( {issuerName ? issuerName : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'} )
                </p>
                <p className="font-black text-blue-950 pt-2 border-t border-slate-200">
                  วันที่/DATE <span className="font-black text-[12px]">{issuerDateFormatted}</span>
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      
      {/* Modal Card Container */}
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Toolbar */}
        <div className="no-print flex flex-col gap-3 p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-950 rounded-xl border border-blue-500/30 text-blue-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  พิมพ์ / บันทึก PDF ใบวางบิลเดี่ยว (รูปแบบมาตรฐาน)
                </h3>
                <p className="text-xs text-slate-400">
                  มี 2 หน้า (ต้นฉบับ + สำเนา) พร้อมเลือกวันที่ใต้ชื่อผู้วางบิลจากปฏิทิน
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Mode Selector */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setExportMode('single')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    exportMode === 'single' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📄 ใบวางบิลเดี่ยว (2 ใบ)
                </button>
                <button
                  onClick={() => setExportMode('table')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    exportMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📊 ตารางสรุปการวางบิล
                </button>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                title="ส่งออกข้อมูลเป็นไฟล์ CSV"
              >
                <Download className="w-4 h-4" />
                <span>ส่งออก CSV</span>
              </button>

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

          {/* Sub-Filters / Invoice Selection */}
          <div className="flex flex-wrap items-center bg-slate-900/80 p-2 rounded-xl border border-slate-700/80 gap-3 text-xs">
            {exportMode === 'single' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-slate-400 font-medium shrink-0">เลือกใบวางบิล:</span>
                  <select
                    value={activeItem?.id || ''}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-blue-300 font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 w-full"
                  >
                    {allBillingItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.invoiceNo}] {item.projectName} - {item.clientName} ({item.period} : {item.totalPayable.toLocaleString()} บาท)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditPanel(!showEditPanel)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition-all shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{showEditPanel ? 'ซ่อนแผงกรอกข้อมูล' : '✏️ แก้ไขข้อมูลโครงการ / ที่อยู่ / ปฏิทินผู้วางบิล'}</span>
                  {showEditPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-slate-400 font-medium shrink-0">กรองตามโครงการ:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-blue-300 font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
                >
                  <option value="all">📂 แสดงทุกโครงการ (All Projects) [{allBillingItems.length} รายการ]</option>
                  {projects.map((proj) => {
                    const count = allBillingItems.filter(b => b.projectId === proj.id).length;
                    return (
                      <option key={proj.id} value={proj.id}>
                        🏢 [{proj.code}] {proj.name} ({count} รายการ)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* FULL EDITABLE INPUT PANEL */}
          {exportMode === 'single' && showEditPanel && (
            <div className="bg-slate-950/90 border border-blue-500/30 p-3 rounded-xl text-xs space-y-3 animate-in fade-in duration-150">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div>
                  <label className="block text-[10px] text-blue-300 font-bold mb-1">SUBJECT (ชื่อโครงการ)</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="บ้านไม้เมืองเอก"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-medium mb-1">ลูกค้า (CUSTOMER)</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="คุณกิ๊ฟ"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-blue-400"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] text-emerald-300 font-bold mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>ที่อยู่ผู้ว่าจ้าง / ลูกค้า (บันทึกอัตโนมัติประจำโครงการ)</span>
                  </label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => handleClientAddressChange(e.target.value)}
                    placeholder="เอกอุดร ตำบลหลักหก อำเภอเมืองปทุมธานี ปทุมธานี 12000"
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded px-2 py-1 text-emerald-200 focus:border-emerald-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-medium mb-1">ชื่อผู้ติดต่อ (CONTACT)</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="คุณเก้ง"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-medium mb-1">เบอร์โทรศัพท์ (TEL)</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="081-165-7555"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Signature & Date & Financial Deductions Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[10px] text-amber-300 font-bold mb-1">หัก เงินเบิกล่วงหน้า (-)</label>
                  <input
                    type="number"
                    value={advanceDeduction || ''}
                    onChange={(e) => setAdvanceDeduction(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-medium mb-1">หัก เงินประกันผลงาน (-)</label>
                  <input
                    type="number"
                    value={retentionDeduction || ''}
                    onChange={(e) => setRetentionDeduction(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-blue-300 font-bold mb-1">ชื่อผู้วางบิล (ในวงเล็บ)</label>
                  <input
                    type="text"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="นายสมเกียรติ สุขใจ"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-emerald-300 font-extrabold mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>เลือกวันที่ใต้ชื่อผู้วางบิล (ปฏิทิน)</span>
                  </label>
                  <input
                    type="date"
                    value={issuerRawDate}
                    onChange={(e) => handleIssuerDateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500/60 rounded px-2 py-1 text-emerald-300 font-bold focus:border-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Payment Methods Checkboxes */}
              <div className="flex items-center space-x-6 pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-[10px] text-slate-400 font-bold">เงื่อนไขการชำระเงิน (TERM OF PAYMENT):</span>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethodChoice === 'cash'}
                    onChange={() => setPaymentMethodChoice('cash')}
                    className="accent-blue-500"
                  />
                  <span className="font-medium">สด</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethodChoice === 'transfer'}
                    onChange={() => setPaymentMethodChoice('transfer')}
                    className="accent-blue-500"
                  />
                  <span className="font-medium">โอน</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethodChoice === 'cheque'}
                    onChange={() => setPaymentMethodChoice('cheque')}
                    className="accent-blue-500"
                  />
                  <span className="font-medium">เช็ค</span>
                </label>
              </div>

            </div>
          )}
        </div>

        {/* PDF Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center">
          
          <div 
            id="billing-printable-area" 
            className="w-full max-w-3xl bg-white text-slate-900 p-4 sm:p-6 shadow-2xl rounded-sm border border-slate-300 min-h-[1050px] font-sans text-xs print:m-0 print:p-2 print:shadow-none print:w-full"
          >
            {exportMode === 'single' && activeItem && (
              <div className="space-y-6">
                {/* PAGE 1: ORIGINAL (ต้นฉบับใบแจ้งหนี้ INVOICE - Blue Theme) */}
                {renderInvoiceSheet('original')}

                {/* Page Divider for Screen Preview */}
                <div className="my-6 border-b-2 border-dashed border-slate-400 flex items-center justify-center no-print">
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider -mb-3">
                    --- หน้าที่ 2 : สำเนา (COPY) - ขาวดำสำหรับบริษัท ---
                  </span>
                </div>

                {/* PAGE 2: COPY (สำเนาใบแจ้งหนี้สำหรับบริษัท INVOICE COPY - Black/Monochrome Theme) */}
                <div className="page-break pt-2">
                  {renderInvoiceSheet('copy')}
                </div>
              </div>
            )}

            {/* SUMMARY TABLE MODE */}
            {exportMode === 'table' && (
              <div className="space-y-4 p-4 bg-white text-slate-900">
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-end">
                  <div>
                    <h1 className="text-sm font-extrabold text-slate-900 uppercase">
                      บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมนเนจเม้นท์ จำกัด (สำนักงานใหญ่)
                    </h1>
                    <h2 className="text-xs font-bold text-blue-900 mt-0.5">
                      รายงานสรุปการวางบิลและติดตามชำระเงิน (BILLING REPORT)
                    </h2>
                  </div>
                  <div className="text-right text-[10px] text-slate-600">
                    <p>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
                    <p>จำนวนที่แสดง: <span className="font-bold text-slate-900">{filteredTableItems.length}</span> รายการ</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
                    <thead>
                      <tr className="bg-blue-950 text-white font-bold border-b border-slate-300 text-[9px]">
                        <th className="py-1.5 px-1.5 border-r border-slate-700 text-center whitespace-nowrap">เลขที่ใบวางบิล</th>
                        <th className="py-1.5 px-1.5 border-r border-slate-700">ชื่อโครงการ / ผู้ว่าจ้าง</th>
                        <th className="py-1.5 px-1.5 border-r border-slate-700">งวดงาน</th>
                        <th className="py-1.5 px-1.5 border-r border-slate-700 text-center whitespace-nowrap">วันวางบิล</th>
                        <th className="py-1.5 px-1.5 border-r border-slate-700 text-center whitespace-nowrap">วันครบกำหนด</th>
                        <th className="py-1.5 px-1.5 border-r border-slate-700 text-center whitespace-nowrap text-emerald-300">วันที่ชำระ</th>
                        <th className="py-1.5 px-1.5 border-r border-slate-700 text-right whitespace-nowrap">ยอดรับสุทธิ (บาท)</th>
                        <th className="py-1.5 px-1.5 text-center whitespace-nowrap">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTableItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-500 font-medium italic">
                            ไม่พบรายการวางบิลสำหรับโครงการนี้
                          </td>
                        </tr>
                      ) : (
                        filteredTableItems.map((item, idx) => (
                          <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 font-bold text-slate-900 text-center whitespace-nowrap">
                              {item.invoiceNo}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200">
                              <p className="font-bold text-slate-800 leading-tight">{item.projectName}</p>
                              <p className="text-slate-500 text-[8.5px]">{item.clientName}</p>
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-slate-700">
                              {item.period}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-600 whitespace-nowrap">
                              {item.billingDate}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-semibold text-slate-800 whitespace-nowrap">
                              {item.dueDate}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-bold text-emerald-700 whitespace-nowrap">
                              {item.paidDate ? item.paidDate : <span className="text-slate-400 font-normal">-</span>}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                              {item.totalPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-1.5 text-center font-bold whitespace-nowrap">
                              {item.status === 'paid' && <span className="text-emerald-700">ชำระแล้ว</span>}
                              {item.status === 'billed' && <span className="text-blue-700">วางบิลแล้ว</span>}
                              {item.status === 'pending' && <span className="text-amber-700">รอวางบิล</span>}
                              {item.status === 'overdue' && <span className="text-red-700">เกินกำหนด</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                        <td colSpan={6} className="py-2 px-2 text-right">
                          รวมยอดรับสุทธิ ({filteredTableItems.length} รายการ):
                        </td>
                        <td className="py-2 px-1.5 text-right text-slate-900 font-black text-[10px]">
                          {filteredTableItems.reduce((sum, item) => sum + item.totalPayable, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
