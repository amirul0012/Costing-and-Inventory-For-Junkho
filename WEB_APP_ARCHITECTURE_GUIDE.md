# Building Web Apps with Google Apps Script (BaaS) Setup Guide

This guide explains the architecture and steps to create a serverless web application using **Google Sheets as a Database** and **Google Apps Script as the Backend API**. By using this method, your app's data lives in the cloud, allowing any device that uses the app to see the exact same synchronized history.

## 1. Architecture Overview
- **Database:** Google Sheets
- **Backend Server / API:** Google Apps Script (`Code.gs`)
- **Frontend / Client:** Standard HTML, CSS, JavaScript hosted anywhere (like GitHub Pages, Vercel, or local devices).
- **Local Storage (`localStorage`):** Used ONLY for device-specific settings (like saved login state or UI preferences), not for storing the master data.

---

## 2. Backend Setup (Google Side)

### Step A: Prepare the Database
1. Go to Google Sheets and create a new blank spreadsheet.
2. Set up your columns in the first row (e.g., ID, Date, User, Status, Details).

### Step B: Create the API (Apps Script)
1. In your Google Sheet, click on `Extensions` > `Apps Script`.
2. Delete any code in the editor and write your `doPost(e)` and `doGet(e)` functions to handle incoming internet requests.
3. Your script must parse incoming JSON, perform actions on the sheet, and return a JSON stringified response.
   ```javascript
   function doPost(e) {
     // 1. Read the incoming payload sent by the phone
     var payload = JSON.parse(e.postData.contents);
     
     // 2. Decide what to do based on payload.action
     if (payload.action === 'getData') {
        // Read from Sheet, create an array, and return it
     } else if (payload.action === 'submit') {
        // Write a new row to the Sheet
     }
     
     // 3. Send the answer back to the phone
     return ContentService.createTextOutput(JSON.stringify({
         status: 'success', 
         data: "..." // your data here
     })).setMimeType(ContentService.MimeType.JSON);
   }
   ```

### Step C: Deploy as a Web App
1. Click the blue **Deploy** button at the top right > **New deployment**.
2. Select **Web app** as the type (click the gear icon if you don't see it).
3. **Execute as:** "Me" (your Google account).
4. **Who has access:** "Anyone" (This allows your frontend fetch requests to reach it without requiring the user to log into Google).
5. Click **Deploy** and copy the resulting **Web App URL**. 
   - *Note: Every time you change your Apps Script code, you must Deploy > Manage Deployments > Edit > select "New version" to push the update.*

---

## 3. Frontend Setup (Your Website Side)

### Step A: Connect the URL
At the very top of your main JavaScript file, save the URL you got from Google:
```javascript
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```

### Step B: Create the API Caller Function
Use an `async` function to handle all communication with your Google Server. This automatically packages your data and sends it over the internet.
```javascript
async function callAPI(payload) {
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
            // Note: Google Apps Script doesn't require extra Headers for simple POSTs
        });
        return await res.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
```

### Step C: Fetching Data (Reading from Cloud)
To download the history/database to the phone, ask the API for the data:
```javascript
async function fetchMasterData() {
    const payload = { action: 'getData' };
    const response = await callAPI(payload);
    
    if (response.status === 'success') {
        const myDatabase = response.data;
        // The data is now downloaded. Render myDatabase to the screen using HTML
    }
}
```

### Step D: Sending Data (Writing to Cloud)
When a user submits a form or makes a change, package the data into a payload and send it via the API.
```javascript
async function handleSubmit(event) {
    event.preventDefault(); // Stop standard form submission
    
    const payload = {
        action: 'submit',
        user: document.getElementById('username').value,
        details: document.getElementById('details').value
    };
    
    const response = await callAPI(payload);
    if (response.status === 'success') {
        alert("Saved to cloud!");
        fetchMasterData(); // Refresh the screen to show the new submission
    }
}
```

### Step E: Managing Local Device State
Use `localStorage` ONLY for data that *should* stay on one specific device (like remembering that someone logged in so they don't have to log in again if they refresh the page).
```javascript
// Saving login session to stay logged in
localStorage.setItem('currentUser', JSON.stringify({ name: "John" }));

// Reading it back when the app loads
let user = JSON.parse(localStorage.getItem('currentUser'));
if (user) {
    // Show the dashboard
}
```

---

*By following this architecture, your Web App is officially connected to the cloud! No matter what phone or computer you use, the history is always pulled from the Google Server.*
