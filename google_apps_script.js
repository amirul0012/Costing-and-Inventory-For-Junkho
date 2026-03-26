/* Updated Google Apps Script for Junkho Studio - Formatted View */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getRange("Z1").getValue(); // Still uses Z1 for hidden sync data
  
  if (!data) {
    return ContentService.createTextOutput(JSON.stringify({projects: [], inventory: []}))
          .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(data)
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var state = JSON.parse(e.postData.contents);
  var projects = state.projects || [];
  
  // 1. Save hidden raw data for sync in Z1
  sheet.getRange("Z1").setValue(JSON.stringify(state));
  
  // 2. Clear current view
  sheet.clear();
  
  // 3. Create Summary Section
  sheet.getRange("A1:B1").setValues([["FINANCIAL SUMMARY", ""]])
       .setFontWeight("bold").setBackground("#d9ead3");
  
  var totalSales = projects.reduce((sum, p) => sum + p.totalValue, 0);
  var totalCost = projects.reduce((sum, p) => sum + p.totalMaterialCost, 0);
  var totalAfiq = projects.reduce((sum, p) => sum + p.afiqShare, 0);
  var totalAmirul = projects.reduce((sum, p) => sum + p.amirulShare, 0);
  var totalWallet = totalSales - (totalCost + totalAfiq + totalAmirul);

  var summaryData = [
    ["Total Sales (Revenue)", totalSales],
    ["Total Company Wallet", totalWallet],
    ["Afiq's Total Share", totalAfiq],
    ["Amirul's Total Share", totalAmirul]
  ];
  sheet.getRange("A2:B5").setValues(summaryData);
  sheet.getRange("B2:B5").setNumberFormat("RM #,##0.00");
  
  // 4. Create Projects Table
  var headers = [["Date", "Project Name", "Location", "Raw Material Cost", "Total Value", "Net Profit", "Afiq Share", "Amirul Share"]];
  sheet.getRange("A7:H7").setValues(headers)
       .setFontWeight("bold").setBackground("#cfe2f3");
  
  if (projects.length > 0) {
    var rows = projects.map(p => [
      p.date, 
      p.name, 
      p.location, 
      p.totalMaterialCost, 
      p.totalValue, 
      p.netProfit,
      p.afiqShare,
      p.amirulShare
    ]);
    sheet.getRange(8, 1, rows.length, 8).setValues(rows);
    sheet.getRange(8, 4, rows.length, 5).setNumberFormat("RM #,##0.00");
  }
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
