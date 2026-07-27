import re

with open('src/components/ConstructionPlanner.tsx', 'r') as f:
    code = f.read()

target1 = r"""                                    const updatedTasks = tasks.map\(t => t.id === task.id \? \{ ...t, startDate: e.target.value \} : t\);
                                    setTasks\(updatedTasks\);"""
replace1 = """                                    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, startDate: e.target.value } : t);
                                    setTasks(updatedTasks);
                                    savePlannerData(phases, updatedTasks);"""

target2 = r"""                                    const updatedTasks = tasks.map\(t => t.id === task.id \? \{ ...t, endDate: e.target.value \} : t\);
                                    setTasks\(updatedTasks\);"""
replace2 = """                                    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, endDate: e.target.value } : t);
                                    setTasks(updatedTasks);
                                    savePlannerData(phases, updatedTasks);"""

code = re.sub(target1, replace1, code)
code = re.sub(target2, replace2, code)

with open('src/components/ConstructionPlanner.tsx', 'w') as f:
    f.write(code)
print("Done!")
