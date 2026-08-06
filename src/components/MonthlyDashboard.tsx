import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  FileCheck2, 
  AlertCircle, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Calendar, 
  Building2,
  FileSpreadsheet,
  ExternalLink,
  Users,
  Search,
  ArrowUpDown,
  UserCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Project, Transaction, BillingItem } from '../types';

interface MonthlyDashboardProps {
  projects: Project[];
  transactions: Transaction[];
  billingItems: BillingItem[];
}

const COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export const MonthlyDashboard: React.FC<MonthlyDashboardProps> = ({
  projects,
  transactions,
  billingItems
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [payerSearch, setPayerSearch] = useState<string>('');
  const [payerSort, setPayerSort] = useState<'total' | 'expense' | 'income' | 'net'>('total');

  // Available unique YYYY-MM months from transactions & billing
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    transactions.forEach(t => monthSet.add(t.date.substring(0, 7)));
    billingItems.forEach(b => monthSet.add(b.billingDate.substring(0, 7)));
    return Array.from(monthSet).sort().reverse();
  }, [transactions, billingItems]);

  // Filtered dataset
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
      const matchMonth = selectedMonth === 'all' || t.date.startsWith(selectedMonth);
      return matchProject && matchMonth;
    });
  }, [transactions, selectedProjectId, selectedMonth]);

  const filteredBilling = useMemo(() => {
    return billingItems.filter(b => {
      const matchProject = selectedProjectId === 'all' || b.projectId === selectedProjectId;
      const matchMonth = selectedMonth === 'all' || b.billingDate.startsWith(selectedMonth);
      return matchProject && matchMonth;
    });
  }, [billingItems, selectedProjectId, selectedMonth]);

  // Aggregate Metrics
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netBalance = totalIncome - totalExpense;

  const totalBilled = useMemo(() => {
    return filteredBilling.reduce((sum, b) => sum + b.totalPayable, 0);
  }, [filteredBilling]);

  const pendingBillingCount = useMemo(() => {
    return filteredBilling.filter(b => b.status === 'pending' || b.status === 'billed').length;
  }, [filteredBilling]);

  const overdueBillingCount = useMemo(() => {
    return filteredBilling.filter(b => b.status === 'overdue').length;
  }, [filteredBilling]);

  // Chart Data 1: Monthly Comparison (Income vs Expense vs Net)
  const monthlyComparisonData = useMemo(() => {
    const monthMap: Record<string, { month: string; income: number; expense: number; net: number }> = {};
    
    // Sort transactions chronologically
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach(t => {
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return;
      const mKey = t.date.substring(0, 7);
      if (!monthMap[mKey]) {
        monthMap[mKey] = { month: mKey, income: 0, expense: 0, net: 0 };
      }
      if (t.type === 'income') monthMap[mKey].income += t.amount;
      if (t.type === 'expense') monthMap[mKey].expense += t.amount;
      monthMap[mKey].net = monthMap[mKey].income - monthMap[mKey].expense;
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions, selectedProjectId]);

  // Chart Data 2: Expense Breakdown by Category
  const categoryExpenseData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });

    return Object.keys(catMap).map(key => ({
      name: key,
      value: catMap[key]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Chart Data 3: Project Budget vs Actual Spend
  const projectComparisonData = useMemo(() => {
    return projects.map(p => {
      const pIncome = transactions
        .filter(t => t.projectId === p.id && t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const pExpense = transactions
        .filter(t => t.projectId === p.id && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        client: p.clientName,
        budget: p.budget,
        income: pIncome,
        expense: pExpense,
        contract: p.contractValue
      };
    });
  }, [projects, transactions]);

  // Payer / Payee Aggregate Summary Data
  const payerPayeeData = useMemo(() => {
    const map: Record<string, { name: string; income: number; expense: number; net: number; count: number }> = {};

    filteredTransactions.forEach(t => {
      const rawName = (t.payerOrPayee || '').trim();
      const name = rawName ? rawName : 'ไม่ระบุชื่อผู้รับ/ผู้จ่าย';

      if (!map[name]) {
        map[name] = { name, income: 0, expense: 0, net: 0, count: 0 };
      }

      if (t.type === 'income') {
        map[name].income += t.amount;
      } else if (t.type === 'expense') {
        map[name].expense += t.amount;
      }
      map[name].net = map[name].income - map[name].expense;
      map[name].count += 1;
    });

    return Object.values(map);
  }, [filteredTransactions]);

  const filteredAndSortedPayers = useMemo(() => {
    return payerPayeeData
      .filter(p => p.name.toLowerCase().includes(payerSearch.toLowerCase().trim()))
      .sort((a, b) => {
        if (payerSort === 'expense') return b.expense - a.expense;
        if (payerSort === 'income') return b.income - a.income;
        if (payerSort === 'net') return Math.abs(b.net) - Math.abs(a.net);
        return (b.income + b.expense) - (a.income + a.expense);
      });
  }, [payerPayeeData, payerSearch, payerSort]);

  const currentProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      
      {/* Filter Controls Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            สรุปผลรายเดือน & รายรับ-รายจ่ายตามผู้รับ/ผู้จ่าย
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            อัปเดตข้อมูลอัตโนมัติ Real-time พร้อมเลือกกรองข้อมูลรายโครงการและรายเดือน
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl">
            <Building2 className="w-4 h-4 text-amber-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">ทุกโครงการทั้งหมด</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-blue-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">ทุกช่วงเดือน</option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  เดือน {m}
                </option>
              ))}
            </select>
          </div>

          {/* Google Sheets Icon for direct access */}
          {currentProject && (
            <a
              href={currentProject.sheetUrlIncome}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all"
              title="เปิด Google Sheets ของโครงการนี้"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>เปิดชีตงานนี้</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Section 1: Payer / Payee Balance Summary Table (No Bar Chart) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              สรุปยอดรับ-จ่าย และคงเหลือ แยกตามผู้รับเงิน / ผู้จ่ายเงิน
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              รวม {payerPayeeData.length} รายชื่อ | วิเคราะห์กระแสเงินสดแยกตามผู้รับหรือผู้จ่ายเงิน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้รับ/ผู้จ่าย..."
                value={payerSearch}
                onChange={(e) => setPayerSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Sort Selection */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={payerSort}
                onChange={(e) => setPayerSort(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="total" className="bg-slate-900 text-white">เรียงตาม มูลค่ารวมสูงสุด</option>
                <option value="expense" className="bg-slate-900 text-white">เรียงตาม รายจ่ายสูงสุด</option>
                <option value="income" className="bg-slate-900 text-white">เรียงตาม รายรับสูงสุด</option>
                <option value="net" className="bg-slate-900 text-white">เรียงตาม ยอดคงเหลือสูงสุด</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Payers/Payees Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ชื่อผู้รับเงิน / ผู้จ่ายเงิน</th>
                <th className="py-3 px-4 text-center">จำนวนรายการ</th>
                <th className="py-3 px-4 text-right text-emerald-400">รายรับรวม</th>
                <th className="py-3 px-4 text-right text-red-400">รายจ่ายรวม</th>
                <th className="py-3 px-4 text-right text-amber-400">คงเหลือสุทธิ</th>
                <th className="py-3 px-4 text-center">สัดส่วนกระแสเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {filteredAndSortedPayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    ไม่พบข้อมูลผู้รับเงิน/ผู้จ่ายเงินตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredAndSortedPayers.map((item, idx) => {
                  const totalVolume = item.income + item.expense;
                  const expensePercent = totalVolume > 0 ? Math.round((item.expense / totalVolume) * 100) : 0;
                  const incomePercent = totalVolume > 0 ? Math.round((item.income / totalVolume) * 100) : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-extrabold text-[11px] shrink-0 border border-slate-700">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[200px] sm:max-w-xs">{item.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-semibold">
                        {item.count} รายการ
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {item.income > 0 ? `+฿${item.income.toLocaleString('th-TH')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-400">
                        {item.expense > 0 ? `-฿${item.expense.toLocaleString('th-TH')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className={`inline-block px-2 py-0.5 rounded-lg border text-xs ${
                          item.net > 0 
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' 
                            : item.net < 0 
                            ? 'bg-red-950/80 border-red-500/40 text-red-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {item.net > 0 ? `+฿${item.net.toLocaleString('th-TH')}` : item.net < 0 ? `-฿${Math.abs(item.net).toLocaleString('th-TH')}` : '฿0'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="w-24 sm:w-32 mx-auto space-y-1">
                          <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                            <div className="bg-emerald-500 h-full" style={{ width: `${incomePercent}%` }} title={`รายรับ: ${incomePercent}%`} />
                            <div className="bg-red-500 h-full" style={{ width: `${expensePercent}%` }} title={`รายจ่าย: ${expensePercent}%`} />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span className="text-emerald-400 font-semibold">{incomePercent}%</span>
                            <span className="text-red-400 font-semibold">{expensePercent}%</span>
                          </div>
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

      {/* Section 2: สรุปผลการดำเนินงานรายเดือน & กราฟภาพรวม */}
      <div className="pt-2">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          สรุปผลการดำเนินงานรายเดือน & กราฟภาพรวม
        </h3>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Income Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              รายรับรวม (Total Income)
            </span>
            <div className="p-2 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              ฿{totalIncome.toLocaleString('th-TH')}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              จากรายการรับเงินค่างวดและเงินมัดจำ
            </p>
          </div>
          <div className="w-full h-1 bg-emerald-500/30 rounded-full mt-4" />
        </div>

        {/* Expense Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-red-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              รายจ่ายรวม (Total Expense)
            </span>
            <div className="p-2 bg-red-950 rounded-xl text-red-400 border border-red-500/30">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-400 tracking-tight">
              ฿{totalExpense.toLocaleString('th-TH')}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ค่าวัสดุ ค่าแรง เครื่องจักร และผู้รับเหมา
            </p>
          </div>
          <div className="w-full h-1 bg-red-500/30 rounded-full mt-4" />
        </div>

        {/* Net Cashflow Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              กระแสเงินสดสุทธิ (Net Profit)
            </span>
            <div className={`p-2 rounded-xl border ${
              netBalance >= 0 
                ? 'bg-amber-950 text-amber-400 border-amber-500/30' 
                : 'bg-red-950 text-red-400 border-red-500/30'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black tracking-tight ${
              netBalance >= 0 ? 'text-amber-400' : 'text-red-400'
            }`}>
              ฿{netBalance.toLocaleString('th-TH')}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ส่วนต่างรายรับหักรายจ่ายสะสม
            </p>
          </div>
          <div className={`w-full h-1 rounded-full mt-4 ${
            netBalance >= 0 ? 'bg-amber-500/40' : 'bg-red-500/40'
          }`} />
        </div>

        {/* Billing Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ยอดวางบิลสะสม (Billed)
            </span>
            <div className="p-2 bg-blue-950 rounded-xl text-blue-400 border border-blue-500/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-400 tracking-tight">
              ฿{totalBilled.toLocaleString('th-TH')}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-amber-300 font-medium">
                รอวางบิล: {pendingBillingCount} รายการ
              </span>
              {overdueBillingCount > 0 && (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  เกินกำหนด: {overdueBillingCount}
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-1 bg-blue-500/30 rounded-full mt-4" />
        </div>

      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Monthly Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  เปรียบเทียบรายรับ - รายจ่าย รายเดือน
                </h3>
                <p className="text-xs text-slate-400">เปรียบเทียบมูลค่าการเข้า-ออกของเงินในแต่ละช่วงเดือน</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                    formatter={(value: any) => [`฿${Number(value).toLocaleString('th-TH')}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="income" name="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="คงเหลือ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Expense Breakdown by Category Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-400" />
              สัดส่วนรายจ่ายตามหมวดหมู่
            </h3>
            <p className="text-xs text-slate-400 mb-2">จำแนกตามหมวดหมู่รายจ่ายที่เกิดขึ้น</p>
            {categoryExpenseData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                ยังไม่มีข้อมูลรายจ่ายตามหมวดหมู่
              </div>
            ) : (
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryExpenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryExpenseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                      formatter={(value: any) => [`฿${Number(value).toLocaleString('th-TH')}`, 'มวลรวม']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Project Budget vs Expenditure Progress */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400" />
          ภาพรวมงบประมาณและการเบิกจ่ายรายโครงการ
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          เปรียบเทียบสัดส่วนรายจ่ายเทียบกับงบประมาณโครงการ และอัตราการรับเงินเทียบกับมูลค่าสัญญา
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectComparisonData.map((item) => {
            const expensePercent = item.budget > 0 ? Math.min(100, Math.round((item.expense / item.budget) * 100)) : 0;
            const incomePercent = item.contract > 0 ? Math.min(100, Math.round((item.income / item.contract) * 100)) : 0;

            return (
              <div key={item.id} className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs truncate max-w-[180px]">
                    [{item.code}] {item.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800">
                    {item.client}
                  </span>
                </div>

                {/* Progress 1: Expense vs Budget */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">ใช้จ่าย / งบประมาณ:</span>
                    <span className={`font-bold ${expensePercent > 90 ? 'text-red-400' : 'text-amber-400'}`}>
                      {expensePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${expensePercent > 90 ? 'bg-red-500' : 'bg-amber-500'}`} 
                      style={{ width: `${expensePercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>จ่ายแล้ว ฿{(item.expense / 1000000).toFixed(2)}M</span>
                    <span>งบ ฿{(item.budget / 1000000).toFixed(2)}M</span>
                  </div>
                </div>

                {/* Progress 2: Income Billed vs Contract */}
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">รับเงินแล้ว / มูลค่าสัญญา:</span>
                    <span className="font-bold text-emerald-400">{incomePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${incomePercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>รับแล้ว ฿{(item.income / 1000000).toFixed(2)}M</span>
                    <span>สัญญา ฿{(item.contract / 1000000).toFixed(2)}M</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
