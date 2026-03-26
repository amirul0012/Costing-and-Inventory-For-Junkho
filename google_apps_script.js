/* Google Apps Script for Junkho Studio Cloud Sync */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getRange(1, 1).getValue();
  
  if (!data) {
    // If sheet is empty, return a default empty state
    return ContentService.createTextOutput(JSON.stringify({projects: [], inventory: []}))
          .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(data)
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = e.postData.contents;
  
  // Save the entire JSON data into the first cell (Sheet1!A1)
  sheet.getRange(1, 1).setValue(data);
  
  return ContentService.createTextOutput("Success")
        .setMimeType(ContentService.MimeType.TEXT);
}
