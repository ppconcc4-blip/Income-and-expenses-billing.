import { Transaction, BillingItem, Project, BillingStatus } from '../types';

/**
 * Utility to extract Google Spreadsheet ID from a URL or raw ID
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  // Standard URL match pattern: /spreadsheets/d/([a-zA-Z0-9-_]+)
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }
  return null;
}

/**
 * Append a new transaction row to a Google Sheet
 */
export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetUrlOrId: string,
  tx: Transaction
): Promise<{ success: boolean; message?: string }> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { success: false, message: 'URL หรือ ID ของ Google Sheet ไม่ถูกต้อง' };
  }

  const range = 'Sheet1!A:G'; // default range
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const values = [
    [
      tx.date,
      tx.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      tx.category,
      tx.description,
      tx.amount,
      tx.projectCode || tx.projectId,
      tx.payerOrPayee || '-'
    ]
  ];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'ไม่สามารถเขียนข้อมูลลง Google Sheets ได้');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error appending transaction to sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Append a billing row to Google Sheet
 */
export async function appendBillingToSheet(
  accessToken: string,
  spreadsheetUrlOrId: string,
  billing: BillingItem
): Promise<{ success: boolean; message?: string }> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { success: false, message: 'URL หรือ ID ของ Google Sheet ไม่ถูกต้อง' };
  }

  const range = 'Sheet1!A:H';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const statusMap: Record<string, string> = {
    pending: 'รอวางบิล',
    submitted: 'วางบิลแล้ว',
    paid: 'ชำระแล้ว',
    overdue: 'เกินกำหนด'
  };

  const values = [
    [
      billing.invoiceNo,
      billing.projectName || billing.projectId,
      billing.clientName,
      billing.amount,
      billing.dueDate,
      statusMap[billing.status] || billing.status,
      billing.notes || '-',
      billing.paidDate || '-'
    ]
  ];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'ไม่สามารถเพิ่มการวางบิลลง Google Sheets ได้');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error appending billing to sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Create a new Google Spreadsheet on the user's Google Drive
 */
export async function createNewGoogleSheet(
  accessToken: string,
  title: string
): Promise<{ success: boolean; spreadsheetUrl?: string; spreadsheetId?: string; message?: string }> {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: title || 'PP Construction Management Sheet'
        },
        sheets: [
          {
            properties: {
              title: 'รายรับรายจ่าย',
              gridProperties: { rowCount: 100, columnCount: 10 }
            }
          },
          {
            properties: {
              title: 'การวางบิล',
              gridProperties: { rowCount: 100, columnCount: 10 }
            }
          },
          {
            properties: {
              title: 'รายละเอียดโครงการ',
              gridProperties: { rowCount: 100, columnCount: 10 }
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'ไม่สามารถสร้าง Google Sheet ใหม่ได้');
    }

    const data = await res.json();
    const spreadsheetUrl = data.spreadsheetUrl;
    const spreadsheetId = data.spreadsheetId;

    // Add header row to 'รายรับรายจ่าย'
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/รายรับรายจ่าย!A1:G1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายการ/รายละเอียด', 'จำนวนเงิน (บาท)', 'โครงการ', 'ผู้จ่าย/ผู้รับเงิน']
        ]
      })
    });

    // Add header row to 'การวางบิล'
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/การวางบิล!A1:H1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          ['เลขที่ใบแจ้งหนี้', 'ชื่อโครงการ', 'ชื่อผู้ว่าจ้าง', 'จำนวนเงิน (บาท)', 'วันกำหนดชำระ', 'สถานะ', 'รายละเอียด', 'วันที่ชำระ']
        ]
      })
    });

    // Add header row to 'รายละเอียดโครงการ'
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/รายละเอียดโครงการ!A1:H1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          ['รหัสโครงการ', 'ชื่อโครงการ', 'ชื่อลูกค้า/ผู้ว่าจ้าง', 'มูลค่าสัญญา (บาท)', 'งบประมาณ (บาท)', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ']
        ]
      })
    });

    return { success: true, spreadsheetUrl, spreadsheetId };
  } catch (err: any) {
    console.error('Error creating Google Sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Bulk Export ALL Current App Data (Transactions + Billing) into a new Google Spreadsheet on Drive
 */
export const TARGET_DRIVE_FOLDER_ID = '1Wv_bv4jD_tAC5gTiksSwdFaMA0-IcDBH';
export const TARGET_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${TARGET_DRIVE_FOLDER_ID}`;

/**
 * Helper to create a Google Sheet directly in a specific Google Drive folder
 */
export async function createSheetInDriveFolder(
  accessToken: string,
  title: string,
  folderId: string = TARGET_DRIVE_FOLDER_ID
): Promise<{ id: string; url: string }> {
  // 1. Try creating via Drive API v3 directly into target folder
  try {
    const driveRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId]
      })
    });

    if (driveRes.ok) {
      const fileData = await driveRes.json();
      return {
        id: fileData.id,
        url: `https://docs.google.com/spreadsheets/d/${fileData.id}/edit`
      };
    }
  } catch (e) {
    console.warn('Drive API direct create failed, trying Sheets API fallback...', e);
  }

  // 2. Fallback: create via Sheets API v4
  const sheetsRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title }
    })
  });

  if (!sheetsRes.ok) {
    const err = await sheetsRes.json();
    throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Sheet บน Google Drive ได้');
  }

  const sheetData = await sheetsRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Move to folder via Drive PATCH
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&fields=id,parents`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  } catch (e) {
    console.warn('Move to folder warning:', e);
  }

  return {
    id: spreadsheetId,
    url: sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

/**
 * Ensure a worksheet tab exists in a Google Spreadsheet. If not, creates it with headers.
 */
export async function ensureSheetTabExists(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[]
): Promise<number | null> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!metaRes.ok) return null;

    const meta = await metaRes.json();
    const existingSheets: any[] = meta.sheets || [];
    const sheet = existingSheets.find((s: any) => s.properties?.title === tabName);

    if (!sheet) {
      // Create new tab
      const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: tabName }
              }
            }
          ]
        })
      });

      let newSheetId = null;
      if (addRes.ok) {
        const addData = await addRes.json();
        newSheetId = addData.replies?.[0]?.addSheet?.properties?.sheetId;
      }

      // Write header row
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1:Z1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [headers] })
      });
      return newSheetId;
    }

    return sheet.properties?.sheetId ?? null;
  } catch (err) {
    console.error('Error ensuring sheet tab exists:', err);
    return null;
  }
}

/**
 * Create 2 Separate Google Sheet files in the specified folder:
 * 1. "PP Construction - บัญชีรายรับรายจ่าย" (Tabs separated by Project name)
 * 2. "PP Construction - ระบบการวางบิล" (Tabs separated by Project name)
 */
export async function createFolderSheetsSeparatedByProjects(
  accessToken: string,
  projects: any[],
  transactions: Transaction[],
  billingItems: BillingItem[],
  folderId: string = TARGET_DRIVE_FOLDER_ID
): Promise<{
  success: boolean;
  incomeSheetUrl?: string;
  billingSheetUrl?: string;
  incomeSheetId?: string;
  billingSheetId?: string;
  message?: string;
  projectUrls?: Record<string, { incomeUrl: string, billingUrl: string }>;
}> {
  try {
    const timeStr = new Date().toLocaleDateString('th-TH');

    // 1. Create File 1: Income/Expense
    const incomeFile = await createSheetInDriveFolder(
      accessToken,
      `PP Construction - บัญชีรายรับรายจ่าย (${timeStr})`,
      folderId
    );

    // 2. Create File 2: Billing
    const billingFile = await createSheetInDriveFolder(
      accessToken,
      `PP Construction - ระบบการวางบิล (${timeStr})`,
      folderId
    );

    const txHeader = ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด/รายการ', 'จำนวนเงิน (บาท)', 'รหัสโครงการ', 'ผู้ชำระ/ผู้รับเงิน', 'เลขที่เอกสาร', 'วิธีชำระ'];
    const billingHeader = ['เลขที่ใบวางบิล', 'รหัสโครงการ', 'ผู้ว่าจ้าง', 'งวดงาน', 'มูลค่ารวม (บาท)', 'VAT 7%', 'หัก ณ ที่จ่าย 3%', 'ยอดรับสุทธิ (บาท)', 'วันวางบิล', 'กำหนดชำระ', 'สถานะ', 'วันที่ชำระ'];
    const projectDetailsHeader = ['รหัสโครงการ', 'ชื่อโครงการ', 'ชื่อลูกค้า/ผู้ว่าจ้าง', 'มูลค่าสัญญา (บาท)', 'งบประมาณ (บาท)', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ', 'ID แบบโครงการ', 'ID BOQ โครงการ'];

    const statusMap: Record<string, string> = {
      pending: 'รอวางบิล',
      billed: 'วางบิลแล้ว',
      submitted: 'วางบิลแล้ว',
      paid: 'ชำระแล้ว',
      overdue: 'เกินกำหนด'
    };

    const activeProjects = projects.length > 0 ? projects : [{ id: 'default', name: 'โครงการทั่วไป', code: 'MAIN' }];

    // 2.5 Create and populate 'รายละเอียดโครงการ' tab in incomeFile
    await updateProjectDetailsSheet(accessToken, incomeFile.id, activeProjects);

    // 3. Populate File 1 (Income/Expense) tabs per project
    const projectUrls: Record<string, { incomeUrl: string, billingUrl: string }> = {};

    for (let index = 0; index < activeProjects.length; index++) {
      const proj = activeProjects[index];
      const tabName = proj.name.slice(0, 80);

      // Filter transactions for this project
      const projTx = transactions.filter(t => t.projectId === proj.id || t.projectCode === proj.code);
      const txRows = projTx.map(tx => [
        tx.date,
        tx.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        tx.category,
        tx.description || '-',
        tx.amount,
        tx.projectCode || tx.projectId,
        tx.payerOrPayee || '-',
        tx.documentNo || '-',
        tx.paymentMethod || '-'
      ]);

      const incGid = await ensureSheetTabExists(accessToken, incomeFile.id, tabName, txHeader);

      if (txRows.length > 0) {
        const payload = [txHeader, ...txRows];
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${incomeFile.id}/values/'${encodeURIComponent(tabName)}'!A1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: payload })
        });
      }

      // Filter billing for this project
      const projBilling = billingItems.filter(b => b.projectId === proj.id || b.projectCode === proj.code);
      const billingRows = projBilling.map(b => [
        b.invoiceNo,
        b.projectCode || b.projectId,
        b.clientName,
        b.period || '-',
        b.amount,
        b.vatAmount,
        b.whtAmount,
        b.totalPayable,
        b.billingDate,
        b.dueDate,
        statusMap[b.status] || b.status,
        b.paidDate || '-'
      ]);

      const bilGid = await ensureSheetTabExists(accessToken, billingFile.id, tabName, billingHeader);

      if (billingRows.length > 0) {
        const payload = [billingHeader, ...billingRows];
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${billingFile.id}/values/'${encodeURIComponent(tabName)}'!A1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: payload })
        });
      }

      projectUrls[proj.id] = {
        incomeUrl: incGid !== null ? `https://docs.google.com/spreadsheets/d/${incomeFile.id}/edit#gid=${incGid}` : incomeFile.url,
        billingUrl: bilGid !== null ? `https://docs.google.com/spreadsheets/d/${billingFile.id}/edit#gid=${bilGid}` : billingFile.url
      };
    }

    return {
      success: true,
      incomeSheetUrl: incomeFile.url,
      billingSheetUrl: billingFile.url,
      incomeSheetId: incomeFile.id,
      billingSheetId: billingFile.id,
      projectUrls
    };

  } catch (err: any) {
    console.error('Error creating folder sheets:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Delete a specific worksheet tab from a Google Spreadsheet
 */
export async function deleteSheetTab(
  accessToken: string,
  spreadsheetId: string,
  tabName: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!metaRes.ok) return { success: false, message: 'ไม่สามารถดึงข้อมูล Google Sheet ได้' };

    const meta = await metaRes.json();
    const sheet = meta.sheets?.find((s: any) => s.properties?.title === tabName);

    if (!sheet) {
      return { success: true, message: `ไม่พบชีตชื่อ "${tabName}" (อาจถูกลบไปแล้ว)` };
    }

    const sheetId = sheet.properties.sheetId;

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteSheet: {
              sheetId: sheetId
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'ไม่สามารถลบชีตได้');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting sheet tab:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Automatically sync a single transaction to the project's sheet tab
 */
export async function autoSyncTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  projectName: string,
  tx: Transaction
): Promise<{ success: boolean; message?: string }> {
  try {
    const tabName = (projectName || 'โครงการทั่วไป').slice(0, 80);
    const txHeader = ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด/รายการ', 'จำนวนเงิน (บาท)', 'รหัสโครงการ', 'ผู้ชำระ/ผู้รับเงิน', 'เลขที่เอกสาร', 'วิธีชำระ'];

    await ensureSheetTabExists(accessToken, spreadsheetId, tabName, txHeader);

    const values = [
      [
        tx.date,
        tx.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        tx.category,
        tx.description || '-',
        tx.amount,
        tx.projectCode || tx.projectId,
        tx.payerOrPayee || '-',
        tx.documentNo || '-',
        tx.paymentMethod || '-'
      ]
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A:I:append?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'ไม่สามารถซิงค์ลง Google Sheet ได้');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error auto-syncing transaction:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Automatically sync a single billing item to the project's sheet tab
 */
export async function autoSyncBillingToSheet(
  accessToken: string,
  spreadsheetId: string,
  projectName: string,
  billing: BillingItem
): Promise<{ success: boolean; message?: string }> {
  try {
    const tabName = (projectName || 'โครงการทั่วไป').slice(0, 80);
    const billingHeader = ['เลขที่ใบวางบิล', 'รหัสโครงการ', 'ผู้ว่าจ้าง', 'งวดงาน', 'มูลค่ารวม (บาท)', 'VAT 7%', 'หัก ณ ที่จ่าย 3%', 'ยอดรับสุทธิ (บาท)', 'วันวางบิล', 'กำหนดชำระ', 'สถานะ', 'วันที่ชำระ'];

    await ensureSheetTabExists(accessToken, spreadsheetId, tabName, billingHeader);

    const statusMap: Record<string, string> = {
      pending: 'รอวางบิล',
      billed: 'วางบิลแล้ว',
      submitted: 'วางบิลแล้ว',
      paid: 'ชำระแล้ว',
      overdue: 'เกินกำหนด'
    };

    const values = [
      [
        billing.invoiceNo,
        billing.projectCode || billing.projectId,
        billing.clientName,
        billing.period || '-',
        billing.amount,
        billing.vatAmount,
        billing.whtAmount,
        billing.totalPayable,
        billing.billingDate,
        billing.dueDate,
        statusMap[billing.status] || billing.status,
        billing.paidDate || '-'
      ]
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A:L:append?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'ไม่สามารถซิงค์การวางบิลลง Google Sheet ได้');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error auto-syncing billing:', err);
    return { success: false, message: err.message };
  }
}

export async function updateBillingStatusInSheet(
  accessToken: string,
  spreadsheetId: string,
  projectName: string,
  invoiceNo: string,
  newStatus: string,
  paidDate?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const tabName = (projectName || 'โครงการทั่วไป').slice(0, 80);
    
    // 1. Fetch current sheet values to find the row
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A:L`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!getRes.ok) return { success: false, message: 'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้' };
    
    const data = await getRes.json();
    const rows = data.values || [];
    
    // 2. Find the row index (1-based for A1 notation)
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === invoiceNo) { // Column A is invoiceNo
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'ไม่พบเลขที่ใบวางบิลนี้ใน Sheet' };
    }
    
    // 3. Update the row (Status is Column K, PaidDate is Column L)
    const statusMap: Record<string, string> = {
      pending: 'รอวางบิล',
      billed: 'วางบิลแล้ว',
      submitted: 'วางบิลแล้ว',
      paid: 'ชำระแล้ว',
      overdue: 'เกินกำหนด'
    };
    
    const thaiStatus = statusMap[newStatus] || newStatus;
    const finalPaidDate = paidDate || '-';
    
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!K${rowIndex}:L${rowIndex}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [[thaiStatus, finalPaidDate]] })
    });
    
    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.error?.message || 'ไม่สามารถอัปเดตสถานะใน Sheet ได้');
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating billing status in sheet:', err);
    return { success: false, message: err.message };
  }
}

export async function deleteTransactionInSheet(
  accessToken: string,
  spreadsheetId: string,
  projectName: string,
  tx: Transaction
): Promise<{ success: boolean; message?: string }> {
  try {
    const tabName = (projectName || 'โครงการทั่วไป').slice(0, 80);
    
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A:I`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!getRes.ok) return { success: false, message: 'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้' };
    
    const data = await getRes.json();
    const rows = data.values || [];
    
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Match by date, type, category, description, and amount
      if (r[0] === tx.date && r[1] === (tx.type === 'income' ? 'รายรับ' : 'รายจ่าย') && r[2] === tx.category && r[3] === (tx.description || '-') && String(r[4]) === String(tx.amount)) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'ไม่พบรายการนี้ใน Sheet' };
    }
    
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meta = await metaRes.json();
    const sheet = meta.sheets.find((s: any) => s.properties.title === tabName);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    
    const deleteRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      })
    });
    
    if (!deleteRes.ok) throw new Error('ไม่สามารถลบแถวได้');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting transaction in sheet:', err);
    return { success: false, message: err.message };
  }
}

export async function deleteBillingInSheet(
  accessToken: string,
  spreadsheetId: string,
  projectName: string,
  invoiceNo: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const tabName = (projectName || 'โครงการทั่วไป').slice(0, 80);
    
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A:A`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!getRes.ok) return { success: false, message: 'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้' };
    
    const data = await getRes.json();
    const rows = data.values || [];
    
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === invoiceNo) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'ไม่พบรายการนี้ใน Sheet' };
    }
    
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meta = await metaRes.json();
    const sheet = meta.sheets.find((s: any) => s.properties.title === tabName);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    
    const deleteRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      })
    });
    
    if (!deleteRes.ok) throw new Error('ไม่สามารถลบแถวได้');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting billing in sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Pull and sync all data from Google Sheets into local web app state
 */
export async function pullDataFromGoogleSheets(
  accessToken: string,
  incomeSheetId?: string | null,
  billingSheetId?: string | null,
  projects: Project[] = []
): Promise<{
  success: boolean;
  transactions?: Transaction[];
  billingItems?: BillingItem[];
  projects?: Project[];
  message?: string;
}> {
  try {
    const newTransactions: Transaction[] = [];
    const newBillingItems: BillingItem[] = [];
    const updatedProjects: Project[] = [];

    const getOrCreateProject = (tabName: string, projCode?: string) => {
      const identifier = projCode || tabName;
      let existing = updatedProjects.find(
        p => (projCode && p.code.toLowerCase() === projCode.toLowerCase()) || 
             p.name.toLowerCase() === tabName.toLowerCase() || 
             p.id === identifier || 
             p.sheetTabName === tabName
      );
      if (!existing) {
        const isGeneric = ['รายรับรายจ่าย', 'การวางบิล', 'Sheet1', 'sheet1', 'รายรับ', 'รายจ่าย'].includes(tabName);
        const newProj: Project = {
          id: `proj-sheet-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: projCode || (isGeneric ? `P-${Math.floor(100 + updatedProjects.length)}` : tabName),
          name: isGeneric && projCode ? projCode : tabName,
          clientName: 'ลูกค้าทั่วไป',
          contractValue: 0,
          budget: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
          status: 'active',
          sheetUrlIncome: incomeSheetId ? `https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit` : '',
          sheetUrlBilling: billingSheetId ? `https://docs.google.com/spreadsheets/d/${billingSheetId}/edit` : '',
          sheetTabName: tabName
        };
        updatedProjects.push(newProj);
        existing = newProj;
      }
      return existing;
    };

    // 0. Pull Project Details Tab if exists in incomeSheetId or billingSheetId
    const pullProjectDetailsFromSheet = async (sheetId: string) => {
      const candidateTabs = ['รายละเอียดโครงการ', 'ข้อมูลโครงการ', 'Projects', 'รายชื่อโครงการ'];
      for (const tabName of candidateTabs) {
        try {
          const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodeURIComponent(tabName)}'!A2:J1000`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (valRes.status === 401) {
            throw new Error('UNAUTHORIZED');
          }
          if (valRes.ok) {
            const valData = await valRes.json();
            const rows: any[][] = valData.values || [];
            const isProjListTab = tabName === 'รายชื่อโครงการ';
            for (const row of rows) {
              if (!row || row.length === 0 || (!row[0] && !row[1])) continue;
              const code = row[0] || '';
              const name = row[1] || row[0] || '';
              if (!name) continue;

              let clientName = 'ลูกค้าทั่วไป';
              let contractValue = 0;
              let budget = 0;
              let startDate = new Date().toISOString().split('T')[0];
              let endDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
              let drawingDriveId = '';
              let boqDriveId = '';
              let status: 'active' | 'completed' = 'active';

              let location = '';
              let contractNo = '';
              let plannerSheetUrl = '';
              
              if (isProjListTab) {
                startDate = row[2] || startDate;
                // row[3] is duration
                endDate = row[4] || endDate;
                clientName = row[5] || 'ลูกค้าทั่วไป';
                contractValue = parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0;
                budget = parseFloat(String(row[7] || '0').replace(/,/g, '')) || 0;
                // Because we repurposed some columns before, we should just read indices as they are in the headers array
                // 8: ลิงก์รายรับรายจ่าย (but stored as sheetUrlIncome, wait, previously we assigned to drawingDriveId. Let's fix that too)
                const sheetUrlIncome = row[8] || ''; 
                const sheetUrlBilling = row[9] || '';
                location = row[10] || '';
                contractNo = row[11] || '';
                plannerSheetUrl = row[12] || '';
                
                // Let's not overwrite drawing/boq with these if they were incorrectly mapped before, but we can't change history easily.
              } else {
                clientName = row[2] || 'ลูกค้าทั่วไป';
                contractValue = parseFloat(String(row[3] || '0').replace(/,/g, '')) || 0;
                budget = parseFloat(String(row[4] || '0').replace(/,/g, '')) || 0;
                startDate = row[5] || startDate;
                endDate = row[6] || endDate;
                const statusStr = String(row[7] || '').toLowerCase();
                status = statusStr.includes('เสร็จ') || statusStr.includes('completed') ? 'completed' : 'active';
                drawingDriveId = row[8] || '';
                boqDriveId = row[9] || '';
              }

              const existingIdx = updatedProjects.findIndex(p => p.code.toLowerCase() === code.toLowerCase() || p.name.toLowerCase() === name.toLowerCase());
              
              const newProjData = {
                code: code,
                name: name,
                clientName: clientName,
                contractValue: contractValue,
                budget: budget,
                startDate: startDate,
                endDate: endDate,
                status: status,
                drawingDriveId: drawingDriveId,
                boqDriveId: boqDriveId,
                location: location,
                contractNo: contractNo,
                plannerSheetUrl: plannerSheetUrl
              };

              if (existingIdx >= 0) {
                updatedProjects[existingIdx] = {
                  ...updatedProjects[existingIdx],
                  ...newProjData,
                  code: code || updatedProjects[existingIdx].code,
                  name: name || updatedProjects[existingIdx].name,
                  clientName: clientName || updatedProjects[existingIdx].clientName,
                  contractValue: contractValue || updatedProjects[existingIdx].contractValue,
                  budget: budget || updatedProjects[existingIdx].budget,
                  startDate: startDate || updatedProjects[existingIdx].startDate,
                  endDate: endDate || updatedProjects[existingIdx].endDate,
                  status: status || updatedProjects[existingIdx].status,
                  drawingDriveId: drawingDriveId || updatedProjects[existingIdx].drawingDriveId,
                  boqDriveId: boqDriveId || updatedProjects[existingIdx].boqDriveId,
                  location: location || updatedProjects[existingIdx].location,
                  contractNo: contractNo || updatedProjects[existingIdx].contractNo,
                  plannerSheetUrl: plannerSheetUrl || updatedProjects[existingIdx].plannerSheetUrl,
                  sheetUrlIncome: (isProjListTab && row[8]) ? row[8] : (incomeSheetId ? `https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit` : updatedProjects[existingIdx].sheetUrlIncome),
                  sheetUrlBilling: (isProjListTab && row[9]) ? row[9] : (billingSheetId ? `https://docs.google.com/spreadsheets/d/${billingSheetId}/edit` : updatedProjects[existingIdx].sheetUrlBilling),
                  sheetTabName: name
                };
              } else {
                updatedProjects.push({
                  id: `proj-sheet-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  ...newProjData,
                  code: code || `P-${Math.floor(100 + updatedProjects.length)}`,
                  sheetUrlIncome: (isProjListTab && row[8]) ? row[8] : (incomeSheetId ? `https://docs.google.com/spreadsheets/d/${incomeSheetId}/edit` : ''),
                  sheetUrlBilling: (isProjListTab && row[9]) ? row[9] : (billingSheetId ? `https://docs.google.com/spreadsheets/d/${billingSheetId}/edit` : ''),
                  sheetTabName: name
                });
              }
            }
          }
        } catch (e: any) {
          if (e.message === 'UNAUTHORIZED') {
            throw e;
          }
          console.warn('Pull project details tab warning:', e);
        }
      }
    };

    if (incomeSheetId) {
      await pullProjectDetailsFromSheet(incomeSheetId);
    }
    if (billingSheetId && billingSheetId !== incomeSheetId) {
      await pullProjectDetailsFromSheet(billingSheetId);
    }

    const metaTabNames = ['รายละเอียดโครงการ', 'ข้อมูลโครงการ', 'Projects'];

    // 1. Pull Transactions
    if (incomeSheetId) {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${incomeSheetId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (metaRes.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheets: any[] = meta.sheets || [];
        for (const s of sheets) {
          const tabName = s.properties?.title;
          if (!tabName) continue;
          if (metaTabNames.includes(tabName)) continue;
          
          const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${incomeSheetId}/values/'${encodeURIComponent(tabName)}'!A2:I1000`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            const rows: any[][] = valData.values || [];
            
            // If tab has rows, ensure project exists for this tab
            const proj = getOrCreateProject(tabName, rows[0] ? rows[0][5] : undefined);

            for (const row of rows) {
              if (!row || row.length === 0 || !row[0]) continue;
              const dateStr = row[0] || new Date().toISOString().split('T')[0];
              const typeStr = String(row[1] || '').trim().toLowerCase();
              const isIncome = typeStr.includes('รายรับ') || typeStr.includes('income');
              const category = row[2] || (isIncome ? 'ค่างวดงาน' : 'ค่าวัสดุก่อสร้าง');
              const description = row[3] || '';
              const amountStr = String(row[4] || '0').replace(/,/g, '');
              const amount = parseFloat(amountStr) || 0;
              const projCode = row[5] || '';
              const rowProj = projCode ? getOrCreateProject(tabName, projCode) : proj;
              const payerOrPayee = row[6] || '';
              const documentNo = row[7] || '';
              const paymentMethod = row[8] || 'โอนเงิน';

              if (amount > 0) {
                newTransactions.push({
                  id: `tx-sheet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  projectId: rowProj?.id || 'default',
                  projectCode: rowProj?.code || 'P-001',
                  date: dateStr,
                  type: isIncome ? 'income' : 'expense',
                  category: category,
                  description: description,
                  amount: amount,
                  payerOrPayee: payerOrPayee,
                  documentNo: documentNo,
                  paymentMethod: paymentMethod,
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    }

    // 2. Pull Billing Items
    if (billingSheetId) {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${billingSheetId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (metaRes.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheets: any[] = meta.sheets || [];
        for (const s of sheets) {
          const tabName = s.properties?.title;
          if (!tabName) continue;
          if (metaTabNames.includes(tabName)) continue;
          
          const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${billingSheetId}/values/'${encodeURIComponent(tabName)}'!A2:L1000`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            const rows: any[][] = valData.values || [];

            const proj = getOrCreateProject(tabName, rows[0] ? rows[0][1] : undefined);

            for (const row of rows) {
              if (!row || row.length === 0 || !row[0]) continue;
              const invoiceNo = row[0] || `INV-${Date.now()}`;
              const projCode = row[1] || '';
              const rowProj = projCode ? getOrCreateProject(tabName, projCode) : proj;
              const clientName = row[2] || rowProj?.clientName || 'ไม่ระบุ';
              const period = row[3] || 'งวดงาน';
              const amount = parseFloat(String(row[4] || '0').replace(/,/g, '')) || 0;
              const vatAmount = parseFloat(String(row[5] || '0').replace(/,/g, '')) || 0;
              const whtAmount = parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0;
              const totalPayable = parseFloat(String(row[7] || '0').replace(/,/g, '')) || (amount + vatAmount - whtAmount);
              const billingDate = row[8] || new Date().toISOString().split('T')[0];
              const dueDate = row[9] || new Date().toISOString().split('T')[0];
              const rawStatus = String(row[10] || '').trim().toLowerCase();
              let status: BillingStatus = 'pending';
              if (rawStatus.includes('ชำระแล้ว') || rawStatus.includes('paid')) {
                status = 'paid';
              } else if (rawStatus.includes('เกินกำหนด') || rawStatus.includes('overdue')) {
                status = 'overdue';
              } else if (rawStatus.includes('วางบิลแล้ว') || rawStatus.includes('billed') || rawStatus.includes('submitted')) {
                status = 'billed';
              }

              const paidDate = row[11] && row[11] !== '-' ? row[11] : undefined;

              if (amount > 0 || totalPayable > 0) {
                newBillingItems.push({
                  id: `billing-sheet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  projectId: rowProj?.id || 'default',
                  projectCode: rowProj?.code || 'P-001',
                  projectName: rowProj?.name || 'โครงการทั่วไป',
                  clientName: clientName,
                  invoiceNo: invoiceNo,
                  period: period,
                  amount: amount,
                  vatInclude: vatAmount > 0,
                  vatAmount: vatAmount,
                  whtDeduct: whtAmount > 0,
                  whtAmount: whtAmount,
                  totalPayable: totalPayable,
                  billingDate: billingDate,
                  dueDate: dueDate,
                  status: status,
                  paidDate: paidDate,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      transactions: newTransactions,
      billingItems: newBillingItems,
      projects: updatedProjects,
      message: `ดึงข้อมูลสำเร็จ! พบโครงการ ${updatedProjects.length} โครงการ, รายรับรายจ่าย ${newTransactions.length} รายการ และการวางบิล ${newBillingItems.length} รายการ`
    };
  } catch (err: any) {
    console.error('Error pulling data from Google Sheets:', err);
    return {
      success: false,
      message: err.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : (err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets')
    };
  }
}

export async function updateProjectDetailsSheet(
  accessToken: string,
  spreadsheetId: string,
  projects: Project[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const projectDetailsHeader = ['รหัสโครงการ', 'ชื่อโครงการ', 'ชื่อลูกค้า/ผู้ว่าจ้าง', 'มูลค่าสัญญา (บาท)', 'งบประมาณ (บาท)', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ', 'ID แบบโครงการ', 'ID BOQ โครงการ'];
    const projectRows = projects.map(p => [
      p.code,
      p.name,
      p.clientName || 'ลูกค้าทั่วไป',
      p.contractValue || 0,
      p.budget || 0,
      p.startDate || '',
      p.endDate || '',
      p.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ',
      p.drawingDriveId || '',
      p.boqDriveId || ''
    ]);

    await ensureSheetTabExists(accessToken, spreadsheetId, 'รายละเอียดโครงการ', projectDetailsHeader);

    // Clear existing data
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'รายละเอียดโครงการ'!A1:Z1000:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    // Write new data
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'รายละเอียดโครงการ'!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [projectDetailsHeader, ...projectRows] })
    });

    return { success: response.ok };
  } catch (err: any) {
    console.error('Error updating project details:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Save labor wages data into a Google Sheet tab named after period + month + year
 */
export async function saveLaborWagesToSheet(
  accessToken: string,
  spreadsheetUrlOrId: string,
  selectedPeriod: string,
  selectedMonth: string,
  selectedYear: string,
  workers: any[]
): Promise<{ success: boolean; isAuthError?: boolean; message?: string; sheetTitle?: string }> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { success: false, message: 'URL หรือ ID ของ Google Sheet ไม่ถูกต้อง' };
  }

  // Generate sheet title based on งวด+เดือน+ปี
  const periodLabel = selectedPeriod === '1-15' ? 'งวด 1-15' : 'งวด 16-สิ้นเดือน';
  const sheetTitle = `${periodLabel}_${selectedMonth}_${selectedYear}`;

  try {
    // 1. Get spreadsheet metadata to check if tab already exists
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}));
      const isAuthError = metaRes.status === 401 || errData.error?.status === 'UNAUTHENTICATED' || errData.error?.code === 401;
      return { 
        success: false, 
        isAuthError, 
        message: errData.error?.message || (isAuthError ? 'สิทธิ์การใช้งาน Google Sheets หมดอายุ (401)' : 'ไม่สามารถดึงข้อมูล Google Sheet ได้') 
      };
    }

    const metaData = await metaRes.json();
    const existingSheets = metaData.sheets || [];
    let sheetId: number | null = null;
    const foundSheet = existingSheets.find(
      (s: any) => s.properties?.title === sheetTitle
    );
    const sheetExists = !!foundSheet;

    if (foundSheet) {
      sheetId = foundSheet.properties.sheetId;
    }

    // 2. If sheet does not exist, create a new sheet tab
    if (!sheetExists || sheetId === null) {
      const addSheetRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetTitle
                  }
                }
              }
            ]
          })
        }
      );

      if (!addSheetRes.ok) {
        const errData = await addSheetRes.json();
        throw new Error(errData.error?.message || `ไม่สามารถสร้างชีต ${sheetTitle} ใหม่ได้`);
      }

      const addSheetData = await addSheetRes.json();
      sheetId = addSheetData.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
    } else {
      // Clear existing values in this sheet tab
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}':clear`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 3. Prepare row data
    const headerRow1 = [
      `บัญชีคำนวณค่าจ้าง ค่าล่วงเวลา ประจำเดือน ${selectedMonth}/${selectedYear} งวดวันที่ ${selectedPeriod === '1-15' ? '1 - 15' : '16 - สิ้นเดือน'}`
    ];
    const headerRow2 = [
      'ลำดับ', 'ชื่อ-สกุล', 'ค่าจ้างวันละ', 'จำนวนวัน', 'รวมเงินค่าจ้าง',
      'OT ชม.ละ', 'จำนวนชม. OT', 'รวมเงิน OT', 'เบิกล่วงหน้า/พิเศษ', 'ค่าโบนัส',
      'รวมเงินได้', 'ประกันสังคม', 'หักค่าแรง', 'ค่าน้ำ/ค่าไฟ', 'หนี้',
      'รวมรายการหัก', 'รับสุทธิ', 'หนี้สินตั้งต้น', 'หนี้สินคงเหลือ', 'หนี้สินทั้งหมด'
    ];

    let sumWagePerDay = 0;
    let sumWorkDays = 0;
    let sumWageTotal = 0;
    let sumOtHours = 0;
    let sumOtTotal = 0;
    let sumAdvance = 0;
    let sumBonus = 0;
    let sumTotalIncome = 0;
    let sumSocial = 0;
    let sumWageDeduct = 0;
    let sumUtil = 0;
    let sumDebt = 0;
    let sumTotalDeduction = 0;
    let sumNetIncome = 0;
    let sumPeriod1Pay = 0;
    let sumRemainingDebt = 0;
    let sumTotalDebt = 0;

    const workerRows = workers.map((w, index) => {
      const wageTotal = (w.wagePerDay || 0) * (w.workDays || 0);
      const overtimeTotal = (w.overtimeRate || 0) * (w.overtimeHours || 0);
      const totalIncome = wageTotal + overtimeTotal + (w.advanceIncome || 0) + (w.bonus || 0);
      const totalDeductions = (w.socialSecurity || 0) + (w.wageDeduction || 0) + (w.utilities || 0) + (w.debt || 0);
      const netIncome = totalIncome - totalDeductions;

      sumWagePerDay += (w.wagePerDay || 0);
      sumWorkDays += (w.workDays || 0);
      sumWageTotal += wageTotal;
      sumOtHours += (w.overtimeHours || 0);
      sumOtTotal += overtimeTotal;
      sumAdvance += (w.advanceIncome || 0);
      sumBonus += (w.bonus || 0);
      sumTotalIncome += totalIncome;
      sumSocial += (w.socialSecurity || 0);
      sumWageDeduct += (w.wageDeduction || 0);
      sumUtil += (w.utilities || 0);
      sumDebt += (w.debt || 0);
      sumTotalDeduction += totalDeductions;
      sumNetIncome += netIncome;
      sumPeriod1Pay += (w.period1Pay || 0);
      sumRemainingDebt += (w.remainingDebt || 0);
      sumTotalDebt += (w.totalDebt || 0);

      return [
        index + 1,
        w.fullName || '',
        w.wagePerDay || 0,
        w.workDays || 0,
        wageTotal,
        w.overtimeRate || 0,
        w.overtimeHours || 0,
        overtimeTotal,
        w.advanceIncome || 0,
        w.bonus || 0,
        totalIncome,
        w.socialSecurity || 0,
        w.wageDeduction || 0,
        w.utilities || 0,
        w.debt || 0,
        totalDeductions,
        netIncome,
        w.period1Pay || 0,
        w.remainingDebt || 0,
        w.totalDebt || 0
      ];
    });

    const summaryRow = [
      'รวมทั้งหมด', '', sumWagePerDay, sumWorkDays, sumWageTotal,
      '', sumOtHours, sumOtTotal, sumAdvance, sumBonus,
      sumTotalIncome, sumSocial, sumWageDeduct, sumUtil, sumDebt,
      sumTotalDeduction, sumNetIncome, sumPeriod1Pay, sumRemainingDebt, sumTotalDebt
    ];

    const values = [
      headerRow1,
      [],
      headerRow2,
      ...workerRows,
      summaryRow
    ];

    // 4. Update values in Google Sheets
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!updateRes.ok) {
      const errData = await updateRes.json();
      throw new Error(errData.error?.message || 'ไม่สามารถเขียนข้อมูลลง Google Sheets ได้');
    }

    // 5. Apply rich styling via batchUpdate if sheetId is known
    if (sheetId !== null) {
      const numRows = workerRows.length;
      const totalColumns = 21;
      const summaryRowIdx = 3 + numRows;

      const formatRequests: any[] = [
        // Unmerge Title first to prevent merge collision
        {
          unmergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            }
          }
        },
        // Unmerge Summary A:C
        {
          unmergeCells: {
            range: {
              sheetId,
              startRowIndex: summaryRowIdx,
              endRowIndex: summaryRowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: 3
            }
          }
        },
        // 1) Merge Title Row (A1:U1) and center it
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            mergeType: 'MERGE_ALL'
          }
        },
        // Format Title Row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: {
                  fontSize: 14,
                  bold: true,
                  foregroundColor: { red: 0.1, green: 0.18, blue: 0.3 }
                },
                backgroundColor: { red: 0.93, green: 0.95, blue: 0.98 }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,backgroundColor)'
          }
        },
        // Set Title Row height
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 0,
              endIndex: 1
            },
            properties: {
              pixelSize: 42
            },
            fields: 'pixelSize'
          }
        },
        // 2) Format Column Headers (Row 2, index 2) - Navy background, white bold text, centered
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
                textFormat: {
                  fontSize: 10,
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 }
                },
                backgroundColor: { red: 0.12, green: 0.23, blue: 0.38 }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,textFormat,backgroundColor)'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 2,
              endIndex: 3
            },
            properties: {
              pixelSize: 38
            },
            fields: 'pixelSize'
          }
        },
        // 3) Format Data Rows (Row 3 to 3+numRows)
        // General text alignment & number formatting for numeric columns
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 3 + numRows,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            cell: {
              userEnteredFormat: {
                verticalAlignment: 'MIDDLE',
                textFormat: {
                  fontSize: 10,
                  foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 }
                }
              }
            },
            fields: 'userEnteredFormat(verticalAlignment,textFormat)'
          }
        },
        // Align Col 0 (Index) Center
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 3 + numRows,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // Align Col 1 (Name) Left & Bold
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 3 + numRows,
              startColumnIndex: 1,
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT',
                textFormat: { bold: true }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,textFormat.bold)'
          }
        },
        // Align Col 2 (Signature) Center
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 3 + numRows,
              startColumnIndex: 2,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // Align Col 3-20 (Numbers) Right & Currency/Number Pattern
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 3 + numRows,
              startColumnIndex: 3,
              endColumnIndex: totalColumns
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0.00'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // 4) Merge summary A:C ("รวมทั้งหมด")
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: summaryRowIdx,
              endRowIndex: summaryRowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            mergeType: 'MERGE_ALL'
          }
        },
        // Format Summary Row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: summaryRowIdx,
              endRowIndex: summaryRowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            cell: {
              userEnteredFormat: {
                verticalAlignment: 'MIDDLE',
                horizontalAlignment: 'RIGHT',
                textFormat: {
                  fontSize: 10,
                  bold: true,
                  foregroundColor: { red: 0.05, green: 0.1, blue: 0.25 }
                },
                backgroundColor: { red: 0.86, green: 0.9, blue: 0.96 },
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0.00'
                }
              }
            },
            fields: 'userEnteredFormat(verticalAlignment,horizontalAlignment,textFormat,backgroundColor,numberFormat)'
          }
        },
        // Center text on summary cell A:C
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: summaryRowIdx,
              endRowIndex: summaryRowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                textFormat: {
                  fontSize: 11,
                  bold: true,
                  foregroundColor: { red: 0.05, green: 0.1, blue: 0.25 }
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,textFormat)'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: summaryRowIdx,
              endIndex: summaryRowIdx + 1
            },
            properties: {
              pixelSize: 32
            },
            fields: 'pixelSize'
          }
        },
        // 5) Borders for table (Headers + Data + Summary)
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: summaryRowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            top: { style: 'SOLID', width: 1, color: { red: 0.7, green: 0.75, blue: 0.82 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0.7, green: 0.75, blue: 0.82 } },
            left: { style: 'SOLID', width: 1, color: { red: 0.7, green: 0.75, blue: 0.82 } },
            right: { style: 'SOLID', width: 1, color: { red: 0.7, green: 0.75, blue: 0.82 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.85, blue: 0.9 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.85, blue: 0.9 } }
          }
        },
        // Heavy border for header bottom & double border for summary top
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            bottom: { style: 'SOLID_MEDIUM', color: { red: 0.12, green: 0.23, blue: 0.38 } }
          }
        },
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: summaryRowIdx,
              endRowIndex: summaryRowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: totalColumns
            },
            top: { style: 'DOUBLE', color: { red: 0.12, green: 0.23, blue: 0.38 } }
          }
        }
      ];

      // Set individual column widths
      const colWidths = [
        45,  // 0: ลำดับ
        170, // 1: ชื่อ-สกุล
        85,  // 2: เซ็นชื่อ
        95,  // 3: ค่าจ้างวันละ
        80,  // 4: จำนวนวัน
        105, // 5: รวมเงินค่าจ้าง
        85,  // 6: OT ชม.ละ
        95,  // 7: จำนวนชม. OT
        100, // 8: รวมเงิน OT
        110, // 9: เบิกล่วงหน้า/พิเศษ
        90,  // 10: ค่าโบนัส
        110, // 11: รวมเงินได้
        95,  // 12: ประกันสังคม
        90,  // 13: หักค่าแรง
        90,  // 14: ค่าน้ำ/ค่าไฟ
        90,  // 15: หนี้
        110, // 16: รวมรายการหัก
        115, // 17: รับสุทธิ
        95,  // 18: งวดที่ 1
        110, // 19: หนี้สินคงเหลือ
        110  // 20: หนี้สินทั้งหมด
      ];

      colWidths.forEach((width, colIdx) => {
        formatRequests.push({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: colIdx,
              endIndex: colIdx + 1
            },
            properties: {
              pixelSize: width
            },
            fields: 'pixelSize'
          }
        });
      });

      // Execute formatting batchUpdate
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests: formatRequests })
        }
      ).catch(err => {
        console.warn('Formatting batchUpdate warning:', err);
      });
    }

    return { success: true, sheetTitle };
  } catch (err: any) {
    console.error('Error saving labor wages to sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Save/update project list into Google Sheet's 'รายชื่อโครงการ' tab
 */
export async function saveProjectsToProjectListSheet(
  accessToken: string,
  projects: Project[],
  spreadsheetId: string = '1go5YGEV455ENaxoL5oQ4b55GmCOSOKdescT4mNHyBAw'
): Promise<{ success: boolean; message?: string }> {
  try {
    const tabName = 'รายชื่อโครงการ';
    const headers = [
      'ชื่อโครงการ',
      'รหัสโครงการ',
      'ชื่อผู้ว่าจ้าง',
      'สถานที่ก่อสร้าง',
      'สัญญาเลขที่',
      'วันที่เริ่มต้น',
      'จำนวนวัน',
      'วันสิ้นสุด',
      'มูลค่าสัญญา'
    ];
    
    await ensureSheetTabExists(accessToken, spreadsheetId, tabName, headers);
    
    const rows = projects.map(p => {
      let duration = 0;
      if (p.startDate && p.endDate) {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        const diffTime = end.getTime() - start.getTime();
        const days = isNaN(diffTime) ? 0 : Math.round(diffTime / (24 * 60 * 60 * 1000)) + 1;
        duration = days > 0 ? days : 1;
      }
      
      return [
        p.name || '',
        p.code || '',
        p.clientName || 'ลูกค้าทั่วไป',
        p.location || '',
        p.contractNo || '',
        p.startDate || '',
        duration > 0 ? duration : 1,
        p.endDate || '',
        p.contractValue || 0
      ];
    });
    
    // Clear existing data in range A1:I1000
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1:I1000:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });
    
    // Write data (headers + rows)
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [headers, ...rows] })
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'ไม่สามารถเขียนข้อมูลลง Google Sheets ได้');
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error saving projects to list sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Fetch project list from Google Sheet's 'รายชื่อโครงการ' tab
 */
export async function fetchProjectsFromProjectListSheet(
  accessToken: string,
  spreadsheetId: string = '1go5YGEV455ENaxoL5oQ4b55GmCOSOKdescT4mNHyBAw'
): Promise<{ success: boolean; projects?: Project[]; message?: string }> {
  try {
    const tabName = 'รายชื่อโครงการ';
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1:I1000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'ไม่สามารถอ่านข้อมูลจาก Google Sheets ได้');
    }

    const data = await response.json();
    const allRows: any[][] = data.values || [];

    if (allRows.length === 0) {
      return { success: true, projects: [] };
    }

    // Header detection
    const firstRow = allRows[0] || [];
    const isHeader = firstRow.some((col: any) => 
      typeof col === 'string' && (col.includes('โครงการ') || col.includes('ชื่อ') || col.includes('รหัส') || col.includes('สัญญา'))
    );

    const rows = isHeader ? allRows.slice(1) : allRows;

    let nameIdx = 0;
    let codeIdx = 1;
    let clientIdx = 2;
    let locIdx = 3;
    let contractNoIdx = 4;
    let startIdx = 5;
    let durationIdx = 6;
    let endIdx = 7;
    let valIdx = 8;

    if (isHeader) {
      firstRow.forEach((col: any, idx: number) => {
        if (typeof col !== 'string') return;
        const colStr = col.trim();
        if (colStr === 'ชื่อโครงการ') nameIdx = idx;
        else if (colStr === 'รหัสโครงการ') codeIdx = idx;
        else if (colStr.includes('ผู้ว่าจ้าง') || colStr.includes('ลูกค้า')) clientIdx = idx;
        else if (colStr.includes('สถานที่')) locIdx = idx;
        else if (colStr.includes('สัญญาเลขที่') || colStr.includes('สัญญาจ้าง')) contractNoIdx = idx;
        else if (colStr.includes('เริ่มต้น')) startIdx = idx;
        else if (colStr.includes('จำนวนวัน')) durationIdx = idx;
        else if (colStr.includes('สิ้นสุด')) endIdx = idx;
        else if (colStr.includes('มูลค่า')) valIdx = idx;
      });
    }

    const projects: Project[] = rows
      .filter((row: any[]) => row && (row[nameIdx] || row[codeIdx]) && (row[nameIdx] || '').toString().trim())
      .map((row: any[], idx: number) => {
        const name = (row[nameIdx] || '').toString().trim();
        const code = (row[codeIdx] || `PP-${idx + 1}`).toString().trim();
        const clientName = (row[clientIdx] || 'ลูกค้าทั่วไป').toString().trim();
        const location = (row[locIdx] || '').toString().trim();
        const contractNo = (row[contractNoIdx] || '').toString().trim();
        const startDate = (row[startIdx] || new Date().toISOString().split('T')[0]).toString().trim();
        const endDate = (row[endIdx] || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]).toString().trim();
        const contractValue = parseFloat((row[valIdx] || '0').toString().replace(/,/g, '')) || 0;

        return {
          id: `proj-gsheet-${idx + 1}-${code || idx}`,
          code,
          name,
          startDate,
          endDate,
          clientName,
          contractValue,
          budget: contractValue,
          location,
          contractNo,
          sheetUrlIncome: '',
          sheetUrlBilling: '',
          plannerSheetUrl: '',
          sheetTabName: name,
          status: 'active' as const
        };
      });

    return { success: true, projects };
  } catch (err: any) {
    console.error('Error fetching projects from list sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Save / sync construction planner tasks to a dedicated tab (named after project) in Google Sheet
 */
export async function saveProjectPlannerTasksToSheet(
  accessToken: string,
  spreadsheetId: string = '1go5YGEV455ENaxoL5oQ4b55GmCOSOKdescT4mNHyBAw',
  sheetTitle: string,
  projectInfo: Partial<Project>,
  phases: { id: string; name: string; order: number }[],
  tasks: {
    id: string;
    phaseId: string;
    name: string;
    startDate: string;
    endDate: string;
    progress: number;
    assignedTo?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
    notes?: string;
  }[]
): Promise<{ success: boolean; message?: string; gid?: number | null; sheetUrl?: string; tabName?: string }> {
  try {
    const cleanSheetTitle = sheetTitle.trim();
    if (!cleanSheetTitle) {
      return { success: false, message: 'ชื่อชีตโครงการไม่ถูกต้อง' };
    }

    const headers = [
      'ลำดับ',
      'หมวดงาน/เฟส',
      'ชื่องานแผนงาน',
      'วันที่เริ่มต้น',
      'วันที่สิ้นสุด',
      'ความคืบหน้า (%)',
      'ผู้รับผิดชอบ',
      'สถานะ',
      'หมายเหตุ'
    ];

    const gid = await ensureSheetTabExists(accessToken, spreadsheetId, cleanSheetTitle, headers);

    const statusMap: Record<string, string> = {
      not_started: 'ยังไม่เริ่มต้น',
      in_progress: 'กำลังดำเนินงาน',
      completed: 'เสร็จสิ้นแล้ว',
      delayed: 'ล่าช้ากว่าแผน'
    };

    const phaseMap = new Map(phases.map(p => [p.id, p.name]));

    const metaRow1 = [`โครงการ: ${projectInfo.name || cleanSheetTitle} (${projectInfo.code || ''})`];
    const metaRow2 = [
      `ผู้ว่าจ้าง: ${projectInfo.clientName || 'ลูกค้าทั่วไป'} | สัญญาเลขที่: ${projectInfo.contractNo || '-'} | ช่วงสัญญา: ${projectInfo.startDate || '-'} ถึง ${projectInfo.endDate || '-'} | สถานที่: ${projectInfo.location || '-'}`
    ];

    const taskRows = tasks.map((t, index) => [
      index + 1,
      phaseMap.get(t.phaseId) || t.phaseId || 'หมวดงานทั่วไป',
      t.name,
      t.startDate,
      t.endDate,
      t.progress || 0,
      t.assignedTo || '-',
      statusMap[t.status] || t.status,
      t.notes || '-'
    ]);

    const values = [
      metaRow1,
      metaRow2,
      [],
      headers,
      ...taskRows
    ];

    // Clear range first
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(cleanSheetTitle)}'!A1:I1000:clear`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    // Update range
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(cleanSheetTitle)}'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'ไม่สามารถบันทึกข้อมูลแผนงานลง Google Sheets ได้');
    }

    const sheetUrl = gid !== null
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    return { success: true, gid, sheetUrl, tabName: cleanSheetTitle };
  } catch (err: any) {
    console.error('Error saving project planner tasks to sheet:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Fetch construction planner tasks from project's dedicated tab in Google Sheet
 */
export async function fetchProjectPlannerTasksFromSheet(
  accessToken: string,
  spreadsheetId: string = '1go5YGEV455ENaxoL5oQ4b55GmCOSOKdescT4mNHyBAw',
  sheetTitle: string
): Promise<{
  success: boolean;
  phases?: { id: string; name: string; order: number }[];
  tasks?: {
    id: string;
    phaseId: string;
    name: string;
    startDate: string;
    endDate: string;
    progress: number;
    assignedTo?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
    notes?: string;
  }[];
  message?: string;
}> {
  try {
    const cleanSheetTitle = sheetTitle.trim();
    if (!cleanSheetTitle) {
      return { success: false, message: 'ชื่อชีตโครงการไม่ถูกต้อง' };
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(cleanSheetTitle)}'!A4:I1000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'ไม่สามารถโหลดแผนงานจาก Google Sheets ได้');
    }

    const data = await response.json();
    const rows: any[][] = data.values || [];

    if (rows.length <= 1) {
      return { success: true, phases: [], tasks: [] };
    }

    // Skip header row (index 0)
    const taskRows = rows.slice(1);

    const phasesMap = new Map<string, { id: string; name: string; order: number }>();
    const tasks: any[] = [];

    const statusReverseMap: Record<string, 'not_started' | 'in_progress' | 'completed' | 'delayed'> = {
      'ยังไม่เริ่มต้น': 'not_started',
      'กำลังดำเนินงาน': 'in_progress',
      'เสร็จสิ้นแล้ว': 'completed',
      'ล่าช้ากว่าแผน': 'delayed'
    };

    taskRows.forEach((row, idx) => {
      if (!row || !row[2] || !row[2].trim()) return; // Require task name

      const phaseName = row[1] && row[1].trim() ? row[1].trim() : 'หมวดงานทั่วไป';
      let phaseId = '';

      for (const [pId, pObj] of phasesMap.entries()) {
        if (pObj.name === phaseName) {
          phaseId = pId;
          break;
        }
      }

      if (!phaseId) {
        phaseId = `phase-${phasesMap.size + 1}`;
        phasesMap.set(phaseId, {
          id: phaseId,
          name: phaseName,
          order: phasesMap.size + 1
        });
      }

      const assignedToVal = row[6] && row[6] !== '-' ? row[6].trim() : '';
      const statusRaw = row[7] ? row[7].trim() : (row[6] && statusReverseMap[row[6].trim()] ? row[6].trim() : 'not_started');
      const status = statusReverseMap[statusRaw] || (['not_started', 'in_progress', 'completed', 'delayed'].includes(statusRaw) ? statusRaw as any : 'not_started');
      const notesVal = row[8] && row[8] !== '-' ? row[8].trim() : '';

      tasks.push({
        id: `task-gsheet-${idx + 1}`,
        phaseId,
        name: row[2].trim(),
        startDate: row[3] || new Date().toISOString().split('T')[0],
        endDate: row[4] || new Date().toISOString().split('T')[0],
        progress: parseFloat(row[5]) || 0,
        assignedTo: assignedToVal,
        status,
        notes: notesVal
      });
    });

    const phases = Array.from(phasesMap.values());

    return { success: true, phases, tasks };
  } catch (err: any) {
    console.error('Error fetching project planner tasks from sheet:', err);
    return { success: false, message: err.message };
  }
}


