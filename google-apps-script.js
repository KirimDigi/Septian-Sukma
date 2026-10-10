/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - RSVP & BUKU UCAPAN WEDDING (SEPTIAN & SUKMA)
 * =========================================================================
 * Spreadsheet ID: 1W7aKWNjmMShgOBxKisf4XpK3u3MxvOeBodwo7HxENyY
 * Sheet Name    : Sheet1
 * 
 * Kolom yang digunakan:
 * 1. Timestamp
 * 2. Nama Tamu
 * 3. Ucapan
 * 4. Konfirmasi Kehadiran
 * 5. Jumlah Tamu
 * =========================================================================
 */

const SPREADSHEET_ID = "1W7aKWNjmMShgOBxKisf4XpK3u3MxvOeBodwo7HxENyY";
const SHEET_NAME = "Sheet1";

/**
 * Mengambil referensi sheet dan memastikan header sudah tersedia
 */
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Jika baris pertama masih kosong, buatkan header otomatis
  if (sheet.getLastRow() === 0) {
    const headers = ["Timestamp", "Nama Tamu", "Ucapan", "Konfirmasi Kehadiran", "Jumlah Tamu"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
  }
  
  return sheet;
}

/**
 * Menangani HTTP GET Request (Mengambil daftar ucapan atau tes koneksi)
 */
function doGet(e) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    
    // Jika hanya ada header atau kosong
    if (lastRow <= 1) {
      return createJsonResponse({
        status: "success",
        total: 0,
        data: []
      });
    }
    
    // Ambil data mulai dari baris ke-2
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 5);
    const values = dataRange.getValues();
    
    // Susun data ucapan (diurutkan dari yang terbaru / paling atas)
    const listUcapan = [];
    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      const rawTimestamp = row[0];
      let formattedTimestamp = "";
      
      if (rawTimestamp instanceof Date) {
        formattedTimestamp = Utilities.formatDate(rawTimestamp, "Asia/Jakarta", "dd MMM yyyy, HH:mm");
      } else {
        formattedTimestamp = String(rawTimestamp || "");
      }
      
      // Pastikan baris tidak kosong
      if (row[1] || row[2]) {
        listUcapan.push({
          timestamp: formattedTimestamp,
          nama: String(row[1] || "Tamu Undangan").trim(),
          ucapan: String(row[2] || "").trim(),
          kehadiran: String(row[3] || "-").trim(),
          jumlah: String(row[4] || "-").trim()
        });
      }
    }
    
    return createJsonResponse({
      status: "success",
      total: listUcapan.length,
      data: listUcapan
    });
    
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Menangani HTTP POST Request (Menyimpan ucapan & RSVP baru)
 */
function doPost(e) {
  try {
    const sheet = getSheet();
    let payload = {};
    
    // Cek jika request dikirim via form-data / url-encoded parameter
    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      payload = e.parameter;
    }
    
    // Cek jika request dikirim sebagai raw JSON
    if (e && e.postData && e.postData.contents) {
      try {
        const jsonBody = JSON.parse(e.postData.contents);
        payload = Object.assign({}, payload, jsonBody);
      } catch (err) {
        // Bukan format JSON, gunakan payload yang sudah ada
      }
    }
    
    const namaTamu = payload.nama || payload.author || payload["Nama Tamu"] || "Tamu Undangan";
    const ucapan = payload.ucapan || payload.comment || payload["Ucapan"] || "";
    let kehadiran = payload.kehadiran || payload.attendance || payload["Konfirmasi Kehadiran"] || "-";
    let jumlahTamu = payload.jumlah || payload.guest || payload["Jumlah Tamu"] || "-";
    
    // Normalisasi teks kehadiran
    if (kehadiran === "present" || kehadiran.toLowerCase() === "hadir") {
      kehadiran = "Hadir";
    } else if (kehadiran === "notpresent" || kehadiran.toLowerCase() === "tidak hadir") {
      kehadiran = "Tidak Hadir";
      jumlahTamu = "-";
    } else if (kehadiran === "notsure" || kehadiran.toLowerCase() === "masih ragu") {
      kehadiran = "Masih Ragu";
    }
    
    // Format jumlah tamu
    if (jumlahTamu && jumlahTamu !== "-" && !String(jumlahTamu).toLowerCase().includes("orang")) {
      jumlahTamu = `${jumlahTamu} orang`;
    }
    
    // Timestamp waktu Jakarta (WIB)
    const timestampFormatted = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    // Simpan baris baru ke spreadsheet
    sheet.appendRow([
      timestampFormatted,
      namaTamu,
      ucapan,
      kehadiran,
      jumlahTamu
    ]);
    
    return createJsonResponse({
      status: "success",
      message: "Ucapan & konfirmasi kehadiran berhasil disimpan!"
    });
    
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Helper untuk response JSON dengan CORS Header
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
