const fs = require('fs');
let code = fs.readFileSync('src/components/ConstructionPlanner.tsx', 'utf8');

const target = `                            <div key={task.id} className="flex items-center h-12 px-4 hover:bg-slate-800/30 transition-all group print:bg-white print:border-b print:border-gray-100">
                              <div className="w-[5%] text-[11px] text-slate-500 font-bold">{idx + 1}</div>
                              
                              <div className="w-[65%] pl-1 pr-2 truncate">
                                <span className="text-xs text-slate-200 font-semibold group-hover:text-amber-300 transition-colors print:text-black block truncate">
                                  {task.name}
                                </span>
                                <span className="text-[10px] text-slate-500 print:text-gray-500 font-semibold block">
                                  {task.startDate} ถึง {task.endDate}
                                </span>
                              </div>
                              <div className="w-[18%] text-center text-xs font-black text-slate-300 print:text-black">
                                {durationDays} วัน
                              </div>
                              <div className="w-[12%] flex items-center justify-end space-x-1 no-print">`;

const replace = `                            <div key={task.id} className="flex items-center h-12 px-2 hover:bg-slate-800/30 transition-all group print:bg-white print:border-b print:border-gray-100">
                              <div className="w-[32px] text-center text-[11px] text-slate-500 font-bold">{idx + 1}</div>
                              
                              <div className="w-[240px] pl-1 pr-2 truncate">
                                <span className="text-xs text-slate-200 font-semibold group-hover:text-amber-300 transition-colors print:text-black block truncate">
                                  {task.name}
                                </span>
                              </div>

                              <div className="w-[130px] px-1 text-center">
                                <input 
                                  type="date" 
                                  value={task.startDate}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, startDate: e.target.value } : t);
                                    setTasks(updatedTasks);
                                  }}
                                  className="w-full bg-slate-950/50 border border-slate-700/50 hover:border-amber-500/50 focus:border-amber-500 rounded px-1 py-1 text-[10px] text-slate-300 focus:outline-none transition-colors cursor-pointer"
                                />
                              </div>
                              <div className="w-[130px] px-1 text-center">
                                <input 
                                  type="date" 
                                  value={task.endDate}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, endDate: e.target.value } : t);
                                    setTasks(updatedTasks);
                                  }}
                                  className="w-full bg-slate-950/50 border border-slate-700/50 hover:border-amber-500/50 focus:border-amber-500 rounded px-1 py-1 text-[10px] text-slate-300 focus:outline-none transition-colors cursor-pointer"
                                />
                              </div>

                              <div className="w-[80px] text-center text-xs font-black text-slate-300 print:text-black">
                                {durationDays} วัน
                              </div>
                              <div className="w-[88px] flex items-center justify-end space-x-1 no-print">`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/components/ConstructionPlanner.tsx', code, 'utf8');
  console.log("Success!");
} else {
  console.log("Target not found!");
}
