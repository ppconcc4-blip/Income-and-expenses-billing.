import re

with open('src/components/ConstructionPlanner.tsx', 'r') as f:
    code = f.read()

target = r"""                        \}\)
                      </div>
                    </div>
                  \);
                \}\)\}
              </div>
            </div>"""

replace = """                        })
                      </div>
                    </div>
                  );
                })}
                
                {/* Add Phase Button at the bottom of WBS table */}
                <div 
                  onClick={() => setIsPhaseModalOpen(true)}
                  className="flex items-center h-12 px-2 bg-slate-950/80 hover:bg-slate-800 transition-all cursor-pointer border-t border-slate-800/80 group no-print"
                >
                  <div className="w-[32px] flex items-center justify-center text-amber-500/70 group-hover:text-amber-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="w-[240px] font-bold text-slate-400 text-sm truncate pl-1 group-hover:text-amber-400 transition-colors">
                    เพิ่มหมวดหมู่แผนงาน
                  </div>
                </div>

              </div>
            </div>"""

if re.search(target, code):
    code = re.sub(target, replace, code)
    with open('src/components/ConstructionPlanner.tsx', 'w') as f:
        f.write(code)
    print("Success!")
else:
    print("Target not found!")
