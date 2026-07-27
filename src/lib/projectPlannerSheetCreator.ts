import { extractSpreadsheetId } from './googleSheetsService';

export async function createProjectPlannerSheet(
  accessToken: string,
  title: string,
  folderId: string,
  projectData: {
    location: string;
    clientName: string;
    contractNo: string;
    startDate: string;
    endDate: string;
  }
) {
  // 1. Create the sheet in the folder
  let spreadsheetId = '';
  let spreadsheetUrl = '';
  
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
    const data = await driveRes.json();
    spreadsheetId = data.id;
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.id}/edit`;
  } else {
    throw new Error('ไม่สามารถสร้าง Google Sheet ได้ กรุณาตรวจสอบสิทธิ์โฟลเดอร์');
  }

  // 2. Format the sheet with batchUpdate
  const formattedStartDate = formatDateThai(projectData.startDate);
  const formattedEndDate = formatDateThai(projectData.endDate);

  const requests = [
    {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 5,
          startColumnIndex: 0,
          endColumnIndex: 8
        },
        rows: [
          {
            values: [
              { userEnteredValue: { stringValue: `สถานที่ก่อสร้าง : ${projectData.location}` } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: `สัญญาจ้างเลขที่ : ${projectData.contractNo}` } }
            ]
          },
          {
            values: [
              { userEnteredValue: { stringValue: `ผู้ว่าจ้าง : ${projectData.clientName}` } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: 'แผนงานการปฏิบัติงาน' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: `เริ่มสัญญาจ้างวันที่ : ${formattedStartDate}` } }
            ]
          },
          {
            values: [
              { userEnteredValue: { stringValue: `ผู้รับจ้าง : บริษัท พีพี. คอนสตรัคชั่น แอนด์ แมนเนจเม้นท์ จำกัด` } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: `โครงการ${title}` } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: '' } },
              { userEnteredValue: { stringValue: `สิ้นสุดสัญญาจ้างวันที่ : ${formattedEndDate}` } }
            ]
          }
        ],
        fields: 'userEnteredValue'
      }
    },
    {
      mergeCells: {
        range: {
          sheetId: 0,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 3,
          endColumnIndex: 6
        },
        mergeType: 'MERGE_ALL'
      }
    },
    {
      mergeCells: {
        range: {
          sheetId: 0,
          startRowIndex: 2,
          endRowIndex: 3,
          startColumnIndex: 3,
          endColumnIndex: 6
        },
        mergeType: 'MERGE_ALL'
      }
    },
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 1,
          endRowIndex: 3,
          startColumnIndex: 3,
          endColumnIndex: 6
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true, fontSize: 12 }
          }
        },
        fields: 'userEnteredFormat(horizontalAlignment,textFormat)'
      }
    }
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  return { id: spreadsheetId, url: spreadsheetUrl };
}

function formatDateThai(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `วันที่ ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}
