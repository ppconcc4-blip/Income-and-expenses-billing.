import re

with open('src/components/ConstructionPlanner.tsx', 'r') as f:
    code = f.read()

# Change the toggle button text
code = code.replace("<span>{showAddProjectForm ? 'ปิดแบบฟอร์ม' : 'บันทึกรายชื่อโครงการ'}</span>", "<span>{showAddProjectForm ? 'ปิดแบบฟอร์ม' : 'เพิ่มโครงการใหม่'}</span>")

with open('src/components/ConstructionPlanner.tsx', 'w') as f:
    f.write(code)
print("Done!")
