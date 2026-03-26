function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "syncAll") {
      var projects = data.projects || [];
      var inventory = data.inventory || [];
      
      // Update Projects Sheet
      var projSheet = ss.getSheetByName("Projects");
      if (!projSheet) {
        projSheet = ss.insertSheet("Projects");
      }
      projSheet.clear(); // Clear existing content
      var projHeaders = [
        "ID", "Date", "Project Name", "Location", "Raw Material Cost (RM)", 
        "Total Value (RM)", "Payout Strategy", "Gross Profit (RM)", "Net Profit (RM)", 
        "Afiq's Share (RM)", "Amirul's Share (RM)", "Deposit (RM)", "Progress (RM)", "Final (RM)", "Materials Used"
      ];
      var projRows = [projHeaders];
      projects.forEach(function(p) {
        // Stringify materials so it can fit in one cell
        var materialsStr = p.materials ? JSON.stringify(p.materials) : "[]";
        
        projRows.push([
          p.id, p.date, p.name, p.location, p.manualMaterialCost, 
          p.totalValue, p.payoutStrategy, p.grossProfit, p.netProfit, 
          p.afiqShare, p.amirulShare, p.deposit, p.progress, p.final, materialsStr
        ]);
      });
      if (projRows.length > 0) {
        projSheet.getRange(1, 1, projRows.length, projRows[0].length).setValues(projRows);
      }
      
      // Update Inventory Sheet
      var invSheet = ss.getSheetByName("Inventory");
      if (!invSheet) {
        invSheet = ss.insertSheet("Inventory");
      }
      invSheet.clear(); // Clear existing content
      var invHeaders = ["ID", "Item Name", "Unit", "Unit Price (RM)", "Current Quantity"];
      var invRows = [invHeaders];
      inventory.forEach(function(item) {
        invRows.push([
          item.id, item.name, item.unit, item.unitPrice, item.quantity
        ]);
      });
      if (invRows.length > 0) {
        invSheet.getRange(1, 1, invRows.length, invRows[0].length).setValues(invRows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data synced successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action." }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Ensure pre-flight requests (CORS) are handled correctly if using doGet
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Google Apps Script backend is active." }))
    .setMimeType(ContentService.MimeType.JSON);
}
