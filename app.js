// Initialize Lucide Icons
lucide.createIcons();

// --- State Management ---
let state = {
    projects: [],
    inventory: []
};

// Load from LocalStorage
function loadState() {
    const saved = localStorage.getItem('junkho_studio_data');
    if (saved) {
        state = JSON.parse(saved);
    }
    
    // Load Sync URL
    const syncUrl = localStorage.getItem('junkho_sync_url');
    if (syncUrl) {
        document.getElementById('syncUrlInput').value = syncUrl;
    }
    
    renderAll();
}

// Save to LocalStorage
function saveState() {
    localStorage.setItem('junkho_studio_data', JSON.stringify(state));
    updateDashboard();
}

// --- Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');
    
    // Update Sidebar Active State
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(`nav-${sectionId}`).classList.add('active');
}

// --- Modals ---
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.toggle('hidden');
}

// --- Project Logic ---
const projectForm = document.getElementById('projectForm');
if (projectForm) {
    // Live Preview
    projectForm.addEventListener('input', () => {
        const formData = new FormData(projectForm);
        const materialCost = parseFloat(formData.get('materialCost')) || 0;
        const totalValue = parseFloat(formData.get('totalValue')) || 0;
        const payoutStrategy = formData.get('payoutStrategy') || 'fixed_10';

        // Toggle Manual Inputs
        const manualContainer = document.getElementById('manualSharesContainer');
        if (payoutStrategy === 'manual') {
            manualContainer.classList.remove('hidden');
        } else {
            manualContainer.classList.add('hidden');
        }

        const manualData = {
            afiq: parseFloat(formData.get('manualAfiq')) || 0,
            amirul: parseFloat(formData.get('manualAmirul')) || 0,
            company: parseFloat(formData.get('manualCompany')) || 0
        };

        const calcs = calculateProjectFinances(materialCost, totalValue, [], payoutStrategy, manualData);
        
        document.getElementById('preview-gross-profit').textContent = formatCurrency(calcs.grossProfit);
        document.getElementById('preview-afiq-share').textContent = formatCurrency(calcs.afiqShare);
        document.getElementById('preview-amirul-share').textContent = formatCurrency(calcs.amirulShare);
        document.getElementById('preview-net-profit').textContent = formatCurrency(calcs.netProfit);
        
        // Update labels to reflect strategy
        let shareLabel = '(10% Share)';
        if (payoutStrategy === 'equal_3') shareLabel = '(1/3 Split)';
        if (payoutStrategy === 'manual') shareLabel = '(Manual)';
        
        document.querySelector('span[id="preview-afiq-share"]').previousElementSibling.textContent = `Afiq's Share ${shareLabel}:`;
        document.querySelector('span[id="preview-amirul-share"]').previousElementSibling.textContent = `Amirul's Share ${shareLabel}:`;

        document.getElementById('preview-deposit').textContent = formatCurrency(calcs.deposit);
        document.getElementById('preview-progress').textContent = formatCurrency(calcs.progress);
        document.getElementById('preview-final').textContent = formatCurrency(calcs.final);
    });

function openAddProjectModal() {
    projectForm.reset();
    document.getElementById('editProjectId').value = '';
    document.getElementById('projectModalTitle').textContent = 'Add New Project';
    document.getElementById('projectSubmitBtn').textContent = 'Save Project';
    document.getElementById('manualSharesContainer').classList.add('hidden');
    toggleModal('projectModal');
    // Trigger input event to reset preview
    projectForm.dispatchEvent(new Event('input'));
}

function openEditProjectModal(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById('editProjectId').value = project.id;
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectSubmitBtn').textContent = 'Update Project';

    const form = projectForm;
    form.date.value = project.date;
    form.name.value = project.name;
    form.location.value = project.location;
    form.materialCost.value = project.manualMaterialCost;
    form.totalValue.value = project.totalValue;
    
    // Set strategy
    const strategyRadios = form.querySelectorAll('input[name="payoutStrategy"]');
    strategyRadios.forEach(radio => {
        if (radio.value === (project.payoutStrategy || 'fixed_10')) {
            radio.checked = true;
        }
    });

    // Set manual shares if applicable
    if (project.payoutStrategy === 'manual' && project.manualShares) {
        form.manualAfiq.value = project.manualShares.afiq;
        form.manualAmirul.value = project.manualShares.amirul;
        form.manualCompany.value = project.manualShares.company;
        document.getElementById('manualSharesContainer').classList.remove('hidden');
    } else {
        document.getElementById('manualSharesContainer').classList.add('hidden');
    }

    toggleModal('projectModal');
    // Trigger input event to update preview
    projectForm.dispatchEvent(new Event('input'));
}

projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(projectForm);
    const editId = formData.get('editProjectId');
    
    const manualCost = parseFloat(formData.get('materialCost')) || 0;
    const totalValue = parseFloat(formData.get('totalValue')) || 0;
    const payoutStrategy = formData.get('payoutStrategy') || 'fixed_10';

    const manualData = {
        afiq: parseFloat(formData.get('manualAfiq')) || 0,
        amirul: parseFloat(formData.get('manualAmirul')) || 0,
        company: parseFloat(formData.get('manualCompany')) || 0
    };

    const projectData = {
        date: formData.get('date'),
        name: formData.get('name'),
        location: formData.get('location'),
        manualMaterialCost: manualCost,
        totalValue: totalValue,
        payoutStrategy: payoutStrategy,
        manualShares: payoutStrategy === 'manual' ? manualData : null,
        ...calculateProjectFinances(manualCost, totalValue, [], payoutStrategy, manualData)
    };

    if (editId) {
        // Update existing project
        const index = state.projects.findIndex(p => p.id == editId);
        if (index !== -1) {
            // Preserve existing materials if any
            const existingMaterials = state.projects[index].materials || [];
            
            state.projects[index] = {
                ...state.projects[index],
                ...projectData,
                materials: existingMaterials,
                // Re-calculate with linked materials
                ...calculateProjectFinances(manualCost, totalValue, existingMaterials, payoutStrategy, manualData)
            };
        }
    } else {
        // Create new project
        state.projects.push({
            id: Date.now(),
            materials: [],
            ...projectData
        });
    }

    saveState();
    renderProjects();
    projectForm.reset();
    toggleModal('projectModal');
});
}

function calculateProjectFinances(manualCost, totalValue, linkedMaterials, payoutStrategy = 'fixed_10', manualData = null) {
    const inventoryCost = linkedMaterials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    const totalMaterialCost = manualCost + inventoryCost;
    const grossProfit = totalValue - totalMaterialCost;
    
    let afiqShare, amirulShare, netProfit;

    if (payoutStrategy === 'manual' && manualData) {
        afiqShare = manualData.afiq;
        amirulShare = manualData.amirul;
        netProfit = manualData.company;
    } else if (payoutStrategy === 'equal_3') {
        const equalSplit = grossProfit > 0 ? grossProfit / 3 : 0;
        afiqShare = equalSplit;
        amirulShare = equalSplit;
        netProfit = equalSplit;
    } else {
        afiqShare = totalValue * 0.10;
        amirulShare = totalValue * 0.10;
        netProfit = grossProfit - (afiqShare + amirulShare);
    }

    return {
        totalMaterialCost,
        grossProfit,
        afiqShare,
        amirulShare,
        netProfit,
        deposit: totalValue * 0.50,
        progress: totalValue * 0.40,
        final: totalValue * 0.10
    };
}

function renderProjects() {
    const tableBody = document.getElementById('projectsTableBody');
    const noProjects = document.getElementById('no-projects-message');
    
    tableBody.innerHTML = '';
    
    if (state.projects.length === 0) {
        noProjects.classList.remove('hidden');
    } else {
        noProjects.classList.add('hidden');
        state.projects.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(project => {
            const row = document.createElement('tr');
            row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors group';
            row.innerHTML = `
                <td class="p-6 text-sm text-gray-400 font-medium">${project.date}</td>
                <td class="p-6">
                    <div class="font-bold text-white">${project.name}</div>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-500 uppercase font-bold tracking-tighter">
                            ${project.payoutStrategy === 'equal_3' ? 'Equal Split' : (project.payoutStrategy === 'manual' ? 'Manual' : 'Standard 10%')}
                        </span>
                        <div class="text-[10px] text-gray-500 uppercase tracking-tighter">
                            MILESTONES: DEP(50%): ${formatCurrency(project.deposit)} | PRG(40%): ${formatCurrency(project.progress)} | FIN(10%): ${formatCurrency(project.final)}
                        </div>
                    </div>
                </td>
                <td class="p-6 text-sm text-gray-400">${project.location}</td>
                <td class="p-6 font-semibold text-accent-red">${formatCurrency(project.totalMaterialCost)}</td>
                <td class="p-6 font-semibold text-white">${formatCurrency(project.totalValue)}</td>
                <td class="p-6">
                    <span class="px-3 py-1 bg-accent-green/10 text-accent-green rounded-full text-sm font-bold">
                        ${formatCurrency(project.netProfit)}
                    </span>
                </td>
                <td class="p-6 text-right">
                    <div class="flex justify-end space-x-2">
                        <button onclick="openEditProjectModal(${project.id})" title="Edit Project" class="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-accent-blue transition-all">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="openMaterialsModal(${project.id})" title="Manage Materials" class="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-accent-blue transition-all">
                            <i data-lucide="package" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteProject(${project.id})" title="Delete Project" class="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-accent-red transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    lucide.createIcons();
}

function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project? All financial records will be removed.')) {
        state.projects = state.projects.filter(p => p.id !== id);
        saveState();
        renderProjects();
    }
}

// --- Inventory Logic ---
const inventoryForm = document.getElementById('inventoryForm');
if (inventoryForm) {
    inventoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(inventoryForm);
        
        const item = {
            id: Date.now(),
            name: formData.get('itemName'),
            unit: formData.get('unit'),
            unitPrice: parseFloat(formData.get('unitPrice')) || 0,
            quantity: parseFloat(formData.get('quantity')) || 0
        };

        state.inventory.push(item);
        saveState();
        renderInventory();
        inventoryForm.reset();
        toggleModal('inventoryModal');
    });
}

function renderInventory() {
    const tableBody = document.getElementById('inventoryTableBody');
    const noInventory = document.getElementById('no-inventory-message');
    
    tableBody.innerHTML = '';
    
    if (state.inventory.length === 0) {
        noInventory.classList.remove('hidden');
    } else {
        noInventory.classList.add('hidden');
        state.inventory.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors group';
            row.innerHTML = `
                <td class="p-6 font-bold text-white">${item.name}</td>
                <td class="p-6 text-sm text-gray-400 font-medium uppercase tracking-widest">${item.unit}</td>
                <td class="p-6 font-semibold text-white">${formatCurrency(item.unitPrice)}</td>
                <td class="p-6">
                    <span class="text-xl font-bold ${item.quantity < 10 ? 'text-accent-red' : 'text-white'}">${item.quantity}</span>
                </td>
                <td class="p-6 text-right">
                    <div class="flex justify-end space-x-3">
                         <button onclick="openStockModal(${item.id})" class="bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1">
                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                            <span>Update</span>
                        </button>
                        <button onclick="deleteInventoryItem(${item.id})" class="text-gray-500 hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    lucide.createIcons();
}

function deleteInventoryItem(id) {
    if (confirm('Delete this item from inventory?')) {
        state.inventory = state.inventory.filter(i => i.id !== id);
        saveState();
        renderInventory();
    }
}

// --- Stock Update Modal Logic ---
function openStockModal(id) {
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;

    const form = document.getElementById('stockForm');
    form.itemId.value = item.id;
    form.newQuantity.value = item.quantity;
    document.getElementById('stockItemName').textContent = item.name;
    document.getElementById('currentStockDisplay').textContent = `Current: ${item.quantity} ${item.unit}`;
    
    toggleModal('stockModal');
}

function adjustStock(amount) {
    const input = document.querySelector('#stockForm input[name="newQuantity"]');
    let val = parseFloat(input.value) || 0;
    val = Math.max(0, val + amount);
    input.value = val;
}

document.getElementById('stockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(e.target.itemId.value);
    const newQty = parseFloat(e.target.newQuantity.value);
    
    const index = state.inventory.findIndex(i => i.id === id);
    if (index !== -1) {
        state.inventory[index].quantity = Math.max(0, newQty);
        saveState();
        renderInventory();
        toggleModal('stockModal');
    }
});

// --- Dashboard & Stats ---
function updateDashboard() {
    const totalCustomerPay = state.projects.reduce((sum, p) => sum + p.totalValue, 0);
    const totalRawMaterials = state.projects.reduce((sum, p) => sum + p.totalMaterialCost, 0);
    const totalAfiqShare = state.projects.reduce((sum, p) => sum + p.afiqShare, 0);
    const totalAmirulShare = state.projects.reduce((sum, p) => sum + p.amirulShare, 0);
    const totalPayoutsVal = totalAfiqShare + totalAmirulShare;
    const totalProjectsVal = state.projects.length;
    
    // Formula: Net Company = Total Customer Pay - (Total Raw Materials + Total Afiq Share + Total Amirul Share)
    const netCompanyWallet = totalCustomerPay - (totalRawMaterials + totalPayoutsVal);

    const walletCard = document.getElementById('stat-total-wallet');
    walletCard.textContent = formatCurrency(netCompanyWallet);
    
    const walletStatus = document.getElementById('wallet-status');
    const indicator = document.getElementById('overall-status-indicator');
    
    if (netCompanyWallet < 0) {
        walletCard.classList.add('text-accent-red');
        walletCard.classList.remove('text-white');
        walletStatus.classList.remove('hidden');
        walletStatus.classList.add('text-accent-red');
        indicator.textContent = "Loss Warning: Expenses exceeds revenue";
        indicator.className = "mt-8 p-4 rounded-2xl text-center font-bold uppercase tracking-widest text-sm bg-accent-red/10 text-accent-red mt-auto border border-accent-red/20";
    } else {
        walletCard.classList.remove('text-accent-red');
        walletCard.classList.add('text-white');
        walletStatus.classList.add('hidden');
        indicator.textContent = "Company is Profitable";
        indicator.className = "mt-8 p-4 rounded-2xl text-center font-bold uppercase tracking-widest text-sm bg-accent-green/10 text-accent-green mt-auto border border-accent-green/20";
    }

    document.getElementById('stat-total-sales').textContent = formatCurrency(totalCustomerPay);
    document.getElementById('stat-afiq-share').textContent = formatCurrency(totalAfiqShare);
    document.getElementById('stat-amirul-share').textContent = formatCurrency(totalAmirulShare);
    document.getElementById('stat-total-projects').textContent = totalProjectsVal;

    // Distribution Summary
    document.getElementById('dist-material-cost').textContent = formatCurrency(totalRawMaterials);
    document.getElementById('dist-director-payouts').textContent = formatCurrency(totalPayoutsVal);
    document.getElementById('dist-company-funds').textContent = formatCurrency(netCompanyWallet);

    const totalOut = totalRawMaterials + totalPayoutsVal + Math.max(0, netCompanyWallet);
    if (totalOut > 0) {
        document.getElementById('bar-material-cost').style.width = `${(totalRawMaterials / totalOut) * 100}%`;
        document.getElementById('bar-director-payouts').style.width = `${(totalPayoutsVal / totalOut) * 100}%`;
        document.getElementById('bar-company-funds').style.width = `${(Math.max(0, netCompanyWallet) / totalOut) * 100}%`;
    }

    updateDashboardChart();
}

function updateDashboardChart() {
    const chartContainer = document.getElementById('dashboardChart');
    if (!chartContainer) return;

    // Last 6 months data
    const labels = [];
    const profits = [];
    const costs = [];
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthYear = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        
        const monthProjects = state.projects.filter(p => {
            const pDate = new Date(p.date);
            return pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear();
        });
        
        const monthProfit = monthProjects.reduce((sum, p) => sum + p.netProfit, 0);
        const monthCost = monthProjects.reduce((sum, p) => sum + p.totalMaterialCost, 0);
        
        labels.push(monthYear);
        profits.push(monthProfit);
        costs.push(monthCost);
    }

    const maxVal = Math.max(...profits, ...costs, 100);
    
    chartContainer.innerHTML = '';
    profits.forEach((p, idx) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'flex-1 group relative flex flex-col justify-end items-center h-full space-y-2';
        
        const profitPct = (p / maxVal) * 100;
        const costPct = (costs[idx] / maxVal) * 100;
        
        dayDiv.innerHTML = `
            <div class="flex space-x-1 items-end h-full w-full">
                <div class="flex-1 bg-accent-green/20 rounded-t-lg hover:bg-accent-green/40 transition-all cursor-pointer relative" style="height: ${Math.max(5, profitPct)}%">
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-100 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Profit: RM ${p.toFixed(0)}</div>
                </div>
                <div class="flex-1 bg-accent-red/20 rounded-t-lg hover:bg-accent-red/40 transition-all cursor-pointer relative" style="height: ${Math.max(5, costPct)}%">
                     <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-100 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Cost: RM ${costs[idx].toFixed(0)}</div>
                </div>
            </div>
            <span class="text-[10px] text-gray-400 uppercase tracking-widest font-bold text-center">${labels[idx]}</span>
        `;
        chartContainer.appendChild(dayDiv);
    });
}

// --- Project Material Management Logic ---
function openMaterialsModal(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById('materialsProjectTitle').textContent = project.name;
    document.querySelector('#addMaterialForm input[name="projectId"]').value = projectId;
    
    // Populate Item Dropdown
    const select = document.getElementById('materialItemSelect');
    select.innerHTML = '<option value="">Select an item...</option>';
    state.inventory.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (${item.quantity} ${item.unit} available at ${formatCurrency(item.unitPrice)}/${item.unit})`;
        select.appendChild(option);
    });

    renderProjectMaterials(projectId);
    toggleModal('materialsModal');
}

function renderProjectMaterials(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    const list = document.getElementById('projectMaterialsList');
    list.innerHTML = '';
    
    let total = 0;
    project.materials.forEach((m, idx) => {
        const subtotal = m.quantity * m.unitPrice;
        total += subtotal;
        
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5';
        row.innerHTML = `
            <td class="p-4 font-medium text-white">${m.name}</td>
            <td class="p-4 text-gray-400">${m.quantity} ${m.unit}</td>
            <td class="p-4 text-gray-400">${formatCurrency(m.unitPrice)}</td>
            <td class="p-4 text-right font-bold text-white">${formatCurrency(subtotal)}</td>
            <td class="p-4 text-right">
                <button onclick="removeMaterialFromProject(${projectId}, ${idx})" class="text-gray-500 hover:text-accent-red transition-colors">
                    <i data-lucide="x-circle" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
    
    document.getElementById('projectMaterialsTotal').textContent = formatCurrency(total);
    lucide.createIcons();
}

document.getElementById('addMaterialForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const projectId = parseInt(formData.get('projectId'));
    const itemId = parseInt(formData.get('itemId'));
    const quantity = parseFloat(formData.get('quantity'));

    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return;

    // Safety Check
    if (quantity > item.quantity) {
        alert(`Warning: Insufficient Inventory! Only ${item.quantity} ${item.unit} in stock.`);
        return;
    }

    // Deduct Stock
    item.quantity -= quantity;

    // Add to Project
    const project = state.projects.find(p => p.id === projectId);
    project.materials.push({
        name: item.name,
        quantity: quantity,
        unit: item.unit,
        unitPrice: item.unitPrice
    });

    // Re-calculate Project Finances
    Object.assign(project, calculateProjectFinances(project.manualMaterialCost, project.totalValue, project.materials));

    saveState();
    renderAll();
    renderProjectMaterials(projectId);
    e.target.reset();
});

function removeMaterialFromProject(projectId, materialIndex) {
    if (!confirm('Remove this material? Stock will NOT be automatically restored.')) return;
    
    const project = state.projects.find(p => p.id === projectId);
    project.materials.splice(materialIndex, 1);
    
    Object.assign(project, calculateProjectFinances(project.manualMaterialCost, project.totalValue, project.materials));
    
    saveState();
    renderAll();
    renderProjectMaterials(projectId);
}

// --- Utils ---
function formatCurrency(amount) {
    return 'RM ' + amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function renderAll() {
    renderProjects();
    renderInventory();
    updateDashboard();
}

// --- Excel Export (XLSX) ---
document.getElementById('downloadReport').addEventListener('click', () => {
    if (state.projects.length === 0 && state.inventory.length === 0) {
        alert('No data to export!');
        return;
    }

    const wb = XLSX.utils.book_new();
    
    // Project Data
    const projectSheetData = state.projects.map(p => ({
        Date: p.date,
        'Project Name': p.name,
        Location: p.location,
        'Raw Material Cost (RM)': p.materialCost,
        'Total Value (RM)': p.totalValue,
        'Gross Profit (RM)': p.grossProfit,
        "Afiq's Share (RM)": p.afiqShare,
        "Amirul's Share (RM)": p.amirulShare,
        'Company Net Profit (RM)': p.netProfit,
        'Deposit (50%)': p.deposit,
        'Progress (40%)': p.progress,
        'Final (10%)': p.final
    }));
    
    const ws_projects = XLSX.utils.json_to_sheet(projectSheetData);
    XLSX.utils.book_append_sheet(wb, ws_projects, "Projects");
    
    // Inventory Data
    const inventorySheetData = state.inventory.map(i => ({
        'Item Name': i.name,
        Unit: i.unit,
        Quantity: i.quantity
    }));
    
    const ws_inventory = XLSX.utils.json_to_sheet(inventorySheetData);
    XLSX.utils.book_append_sheet(wb, ws_inventory, "Inventory");
    
    // Financial Summary
    const summaryData = [
        ['Summary Metric', 'Value'],
        ['Total Company Profit', state.projects.reduce((sum, p) => sum + p.netProfit, 0)],
        ['Total Outstanding Payouts', state.projects.reduce((sum, p) => sum + p.afiqShare + p.amirulShare, 0)],
        ['Total Projects Completed', state.projects.length]
    ];
    const ws_summary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws_summary, "Financial Summary");

    // Save File
    XLSX.writeFile(wb, `Junkho_Studio_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
});

// --- Backup & Sync (Data Portability) ---
function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `junkho_data_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function triggerImport() {
    document.getElementById('importFileInput').click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            
            // Basic validation
            if (!importedState.projects || !importedState.inventory) {
                throw new Error("Invalid backup file format.");
            }

            if (confirm("This will overwrite your current data with the backup. Continue?")) {
                state = importedState;
                saveState();
                renderAll();
                alert("Data restored successfully!");
            }
        } catch (err) {
            alert("Error importing data: " + err.message);
        }
        // Reset input so the same file can be selected again
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --- Cloud Sync Logic ---
async function uploadToCloud() {
    const url = document.getElementById('syncUrlInput').value.trim();
    if (!url) {
        alert("Please enter a Google Apps Script URL first.");
        return;
    }

    localStorage.setItem('junkho_sync_url', url);
    updateSyncStatus('Syncing...', 'bg-blue-500/20 text-blue-400');

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Standard Apps Script approach
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(state)
        });
        
        // Note: With no-cors, we can't read the response body, 
        // but it's the only way to avoid CORS errors with regular App Script URLs from browser.
        updateSyncStatus('Successfully Uploaded!', 'bg-accent-green/20 text-accent-green');
    } catch (error) {
        console.error('Upload error:', error);
        updateSyncStatus('Upload Failed', 'bg-accent-red/20 text-accent-red');
    }
}

async function downloadFromCloud() {
    const url = document.getElementById('syncUrlInput').value.trim();
    if (!url) {
        alert("Please enter a Google Apps Script URL first.");
        return;
    }

    localStorage.setItem('junkho_sync_url', url);
    updateSyncStatus('Fetching...', 'bg-blue-500/20 text-blue-400');

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const cloudData = await response.json();
        
        if (cloudData && (cloudData.projects || cloudData.inventory)) {
            if (confirm("Data found in cloud! This will overwrite your current local data. Continue?")) {
                state = cloudData;
                saveState();
                renderAll();
                updateSyncStatus('Data Synced!', 'bg-accent-green/20 text-accent-green');
            } else {
                updateSyncStatus('Sync Cancelled', 'bg-yellow-500/20 text-yellow-500');
            }
        } else {
            updateSyncStatus('No Data in Cloud', 'bg-yellow-500/20 text-yellow-500');
        }
    } catch (error) {
        console.error('Download error:', error);
        updateSyncStatus('Sync Failed', 'bg-accent-red/20 text-accent-red');
        alert("Make sure the URL is correct and Google App Script is deployed as Web App (Anyone).");
    }
}

function updateSyncStatus(text, classes) {
    const status = document.getElementById('syncStatus');
    status.textContent = text;
    status.className = `p-3 rounded-lg text-center text-xs font-bold uppercase tracking-widest ${classes}`;
    status.classList.remove('hidden');
    setTimeout(() => {
        status.classList.add('hidden');
    }, 3000);
}

// Initialize
loadState();
