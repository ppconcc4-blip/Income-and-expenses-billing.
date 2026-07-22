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

    const statusMap: Record<string, string> = {
      pending: 'รอวางบิล',
      billed: 'วางบิลแล้ว',
      submitted: 'วางบิลแล้ว',
      paid: 'ชำระแล้ว',
      overdue: 'เกินกำหนด'
    };

    // 3. Populate File 1 (Income/Expense) tabs per project
    const activeProjects = projects.length > 0 ? projects : [{ id: 'default', name: 'โครงการทั่วไป', code: 'MAIN' }];
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
  message?: string;
}> {
  try {
    const newTransactions: Transaction[] = [];
    const newBillingItems: BillingItem[] = [];

    const findProject = (codeOrName: string) => {
      if (!codeOrName) return projects[0];
      const match = projects.find(
        p => p.code.toLowerCase() === codeOrName.toLowerCase() || p.name.toLowerCase() === codeOrName.toLowerCase() || p.id === codeOrName
      );
      return match || projects[0];
    };

    // 1. Pull Transactions
    if (incomeSheetId) {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${incomeSheetId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheets: any[] = meta.sheets || [];
        for (const s of sheets) {
          const tabName = s.properties?.title;
          if (!tabName) continue;
          const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${incomeSheetId}/values/'${encodeURIComponent(tabName)}'!A2:I1000`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            const rows: any[][] = valData.values || [];
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
              const proj = findProject(projCode || tabName);
              const payerOrPayee = row[6] || '';
              const documentNo = row[7] || '';
              const paymentMethod = row[8] || 'โอนเงิน';

              if (amount > 0) {
                newTransactions.push({
                  id: `tx-sheet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  projectId: proj?.id || 'default',
                  projectCode: proj?.code || 'P-001',
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
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheets: any[] = meta.sheets || [];
        for (const s of sheets) {
          const tabName = s.properties?.title;
          if (!tabName) continue;
          const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${billingSheetId}/values/'${encodeURIComponent(tabName)}'!A2:L1000`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            const rows: any[][] = valData.values || [];
            for (const row of rows) {
              if (!row || row.length === 0 || !row[0]) continue;
              const invoiceNo = row[0] || `INV-${Date.now()}`;
              const projCode = row[1] || '';
              const proj = findProject(projCode || tabName);
              const clientName = row[2] || proj?.clientName || 'ไม่ระบุ';
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
                  projectId: proj?.id || 'default',
                  projectCode: proj?.code || 'P-001',
                  projectName: proj?.name || 'โครงการทั่วไป',
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
      message: `ดึงข้อมูลสำเร็จ! ได้รับรายรับรายจ่าย ${newTransactions.length} รายการ และการวางบิล ${newBillingItems.length} รายการ`
    };
  } catch (err: any) {
    console.error('Error pulling data from Google Sheets:', err);
    return {
      success: false,
      message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets'
    };
  }
}

