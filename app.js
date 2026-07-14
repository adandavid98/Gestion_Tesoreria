import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// --- ESTADO DE LA APLICACIÓN ---
let transactions = [];
let currentUser = null;
let selectedTransactionIdToDelete = null;
let parsedCsvTransactionsToImport = [];
let editingTransactionId = null;
let userEditedCategory = false;
let userEditedPfCategory = false;
let personalExpenses = [];
let personalIncomes = {};
let currentModule = 'menu';
let parsedPfExpensesToImport = [];
let parsedPfIncomesToImport = {};
let editingPfExpenseId = null;

const DEFAULT_TREASURY_CATEGORIES = [
    { name: "Ofrenda", color: "#10b981" },
    { name: "Diezmo", color: "#059669" },
    { name: "Donación", color: "#0d9488" },
    { name: "Construcción", color: "#d97706" },
    { name: "Sonido / Multimedia", color: "#4f46e5" },
    { name: "Evangelismo", color: "#7c3aed" },
    { name: "Servicios (Agua/Luz)", color: "#dc2626" },
    { name: "Otros", color: "#6b7280" }
];

const DEFAULT_PERSONAL_CATEGORIES = [
    { name: "Alquiler / Hipoteca", color: "#78350f" },
    { name: "Electricidad / Agua", color: "#eab308" },
    { name: "Gasolina / Transporte", color: "#0284c7" },
    { name: "Supermercado / Comida", color: "#059669" },
    { name: "Salidas / Entretenimiento", color: "#db2777" },
    { name: "Suscripciones", color: "#dc2626" },
    { name: "Salud / Medicinas", color: "#0d9488" },
    { name: "Otros", color: "#6b7280" }
];

let treasuryCategories = [...DEFAULT_TREASURY_CATEGORIES];
let personalCategories = [...DEFAULT_PERSONAL_CATEGORIES];
let currentCategoryModule = 'tesoreria';
let pfDonutChartInstance = null;
let pfBarChartInstance = null;
let tDonutChartInstance = null;
let tBarChartInstance = null;

const DEFAULT_CONCEPT_CATEGORIES = [
    { concepto: "Ofrenda de jóvenes", categoria: "Ofrenda" },
    { concepto: "Ofrenda dominical", categoria: "Ofrenda" },
    { concepto: "Ofrenda especial", categoria: "Ofrenda" },
    { concepto: "Donación", categoria: "Donaciones" },
    { concepto: "Diezmo", categoria: "Diezmos" },
    { concepto: "Compra de micrófonos", categoria: "Equipo de sonido" },
    { concepto: "Compra de cables", categoria: "Equipo de sonido" },
    { concepto: "Alquiler de local", categoria: "Alquiler" },
    { concepto: "Refrigerio para reunión", categoria: "Refrigerios" },
    { concepto: "Pizza reunión", categoria: "Refrigerios" },
    { concepto: "Refrescos y vasos", categoria: "Refrigerios" },
    { concepto: "Impresión de folletos", categoria: "Papelería" },
    { concepto: "Fotocopias e impresiones", categoria: "Papelería" },
    { concepto: "Gasolina transporte", categoria: "Transporte" },
    { concepto: "Alquiler de autobús", categoria: "Transporte" },
    { concepto: "Inscripción campamento", categoria: "Campamento" },
    { concepto: "Materiales de escuela dominical", categoria: "Escuela dominical" },
    { concepto: "Artículos de limpieza", categoria: "Mantenimiento" }
];

const KEYWORD_CATEGORY_RULES = [
    { keywords: ["ofrenda", "donacion", "diezmo", "donar", "contribucion"], categoria: "Ofrenda" },
    { keywords: ["microfono", "cable", "sonido", "audio", "bocina", "consola", "parlante", "audifono", "parlantes"], categoria: "Equipo de sonido" },
    { keywords: ["alquiler", "renta", "local", "salon", "sillas", "mesa", "mesas"], categoria: "Alquiler" },
    { keywords: ["refrigerio", "pizza", "refresco", "comida", "vasos", "platos", "cena", "almuerzo", "pan", "pastel", "gaseosa"], categoria: "Refrigerios" },
    { keywords: ["impresion", "fotocopia", "folleto", "papel", "cuaderno", "lapicero", "tinta", "lapiz", "hoja", "hojas"], categoria: "Papelería" },
    { keywords: ["gasolina", "transporte", "autobus", "pasaje", "viaje", "taxi", "combustible", "flete", "peaje"], categoria: "Transporte" },
    { keywords: ["campamento", "retiro", "inscripcion", "evento", "conferencia"], categoria: "Campamento" },
    { keywords: ["niños", "escuela dominical", "didactico", "juguetes", "clase", "materiales"], categoria: "Escuela dominical" },
    { keywords: ["limpieza", "mantenimiento", "escoba", "jabon", "reparacion", "pintura", "desinfectante", "cloro"], categoria: "Mantenimiento" }
];

const DEFAULT_PF_CONCEPT_CATEGORIES = [
    { concepto: "Pago de Alquiler", categoria: "Alquiler / Hipoteca" },
    { concepto: "Pago de Renta", categoria: "Alquiler / Hipoteca" },
    { concepto: "Pago de Hipoteca", categoria: "Alquiler / Hipoteca" },
    { concepto: "Factura de Electricidad (Luz)", categoria: "Electricidad / Agua" },
    { concepto: "Factura de Agua", categoria: "Electricidad / Agua" },
    { concepto: "Factura de Basura", categoria: "Electricidad / Agua" },
    { concepto: "Compra de Gasolina", categoria: "Gasolina / Transporte" },
    { concepto: "Pasaje de Autobús / Metro", categoria: "Gasolina / Transporte" },
    { concepto: "Pago de Uber / Taxi", categoria: "Gasolina / Transporte" },
    { concepto: "Compra en Supermercado", categoria: "Supermercado / Comida" },
    { concepto: "Cena Familiar / Salida a Comer", categoria: "Supermercado / Comida" },
    { concepto: "Almuerzo Diario", categoria: "Supermercado / Comida" },
    { concepto: "Salida al Cine", categoria: "Salidas / Entretenimiento" },
    { concepto: "Salida con amigos", categoria: "Salidas / Entretenimiento" },
    { concepto: "Suscripción de Netflix", categoria: "Suscripciones" },
    { concepto: "Suscripción de Spotify", categoria: "Suscripciones" },
    { concepto: "Suscripción de Youtube Premium", categoria: "Suscripciones" },
    { concepto: "Consulta Médica", categoria: "Salud / Medicinas" },
    { concepto: "Compra de Medicinas en Farmacia", categoria: "Salud / Medicinas" }
];

const KEYWORD_PF_CATEGORY_RULES = [
    { keywords: ["alquiler", "renta", "hipoteca", "apartamento", "casa", "residencia"], categoria: "Alquiler / Hipoteca" },
    { keywords: ["luz", "electricidad", "agua", "basura", "internet", "wifi", "cable", "telefono", "claro", "altice"], categoria: "Electricidad / Agua" },
    { keywords: ["gasolina", "combustible", "gasoil", "uber", "pasaje", "carro", "peaje", "metro", "pasajes", "transporte"], categoria: "Gasolina / Transporte" },
    { keywords: ["supermercado", "comida", "cena", "almuerzo", "desayuno", "pizza", "restaurante", "mcdonalds", "compra", "platanos", "compras", "comestibles"], categoria: "Supermercado / Comida" },
    { keywords: ["cine", "salida", "bar", "fiesta", "concierto", "playa", "hotel", "viaje", "bebida", "entretenimiento", "diversion"], categoria: "Salidas / Entretenimiento" },
    { keywords: ["netflix", "spotify", "youtube", "disney", "prime", "apple", "suscripcion", "suscripciones", "patreon"], categoria: "Suscripciones" },
    { keywords: ["medico", "medicina", "farmacia", "consulta", "clinica", "salud", "pastillas", "seguro", "medicinas", "dientes", "odontologia"], categoria: "Salud / Medicinas" }
];

// --- ELEMENTOS DEL DOM ---
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Elementos de Auth
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
const menuSection = document.getElementById('menu-section');
const personalFinancesContainer = document.getElementById('personal-finances-container');
const btnGotoTesoreria = document.getElementById('btn-goto-tesoreria');
const btnGotoPersonales = document.getElementById('btn-goto-personales');
const btnBackToMenu = document.getElementById('btn-back-to-menu');
const headerLogo = document.getElementById('header-logo');

// Elementos de Finanzas Personales
const pfMonthlyIncome = document.getElementById('pf-monthly-income');
const pfTotalPaid = document.getElementById('pf-total-paid');
const pfTotalPending = document.getElementById('pf-total-pending');
const pfTotalBalance = document.getElementById('pf-total-balance');
const pfExpenseForm = document.getElementById('pf-expense-form');
const pfConcept = document.getElementById('pf-concept');
const pfAmount = document.getElementById('pf-amount');
const pfType = document.getElementById('pf-type');
const pfStatus = document.getElementById('pf-status');
const pfFixedCount = document.getElementById('pf-fixed-count');
const pfVariableCount = document.getElementById('pf-variable-count');
const pfFixedList = document.getElementById('pf-fixed-list');
const pfVariableList = document.getElementById('pf-variable-list');
const btnPfReport = document.getElementById('btn-pf-report');
const btnPfExport = document.getElementById('btn-pf-export');
const btnPfImportTrigger = document.getElementById('btn-pf-import-trigger');
const pfCsvFileInput = document.getElementById('pf-csv-file-input');
const btnPfClearData = document.getElementById('btn-pf-clear-data');
const pfDate = document.getElementById('pf-date');
const pfSubmitText = document.getElementById('pf-submit-text');
const pfSubmitIconWrapper = document.getElementById('pf-submit-icon-wrapper');
const btnPfCancelEdit = document.getElementById('btn-pf-cancel-edit');
const pfFilterMonth = document.getElementById('pf-filter-month');
const pfFilterYear = document.getElementById('pf-filter-year');
const pfCategory = document.getElementById('pf-category');
const pfAutocompleteList = document.getElementById('pf-autocomplete-list');

// Elementos de Configuración de Categorías
const btnTManageCategories = document.getElementById('btn-t-manage-categories');
const btnPfManageCategories = document.getElementById('btn-pf-manage-categories');
const modalManageCategories = document.getElementById('modal-manage-categories');
const mcModalTitle = document.getElementById('mc-modal-title');
const mcCategoryList = document.getElementById('mc-category-list');
const mcCategoryForm = document.getElementById('mc-category-form');
const mcCategoryName = document.getElementById('mc-category-name');
const mcCategoryIndex = document.getElementById('mc-category-index');
const mcSelectedColor = document.getElementById('mc-selected-color');
const btnMcSubmit = document.getElementById('btn-mc-submit');
const btnMcClose = document.getElementById('btn-mc-close');

const btnLoginGoogle = document.getElementById('btn-login-google');
const btnLogout = document.getElementById('btn-logout');
const userProfile = document.getElementById('user-profile');
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');

// Formulario
const transactionForm = document.getElementById('transaction-form');
const inputDate = document.getElementById('t-date');
const inputConcept = document.getElementById('t-concept');
const inputAmount = document.getElementById('t-amount');
const inputType = document.getElementById('t-type');
const inputCategory = document.getElementById('t-category');
const autocompleteList = document.getElementById('autocomplete-list');
const btnSubmitForm = document.getElementById('btn-submit-form');
const submitBtnText = document.getElementById('submit-btn-text');
const submitBtnIcon = document.getElementById('submit-btn-icon');
const btnCancelEdit = document.getElementById('btn-cancel-edit');


// Filtros y Resumen
const filterMonth = document.getElementById('filter-month');
const filterYear = document.getElementById('filter-year');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const totalBalanceEl = document.getElementById('total-balance');

// Tabla
const transactionsTableBody = document.getElementById('transactions-body');
const emptyStateEl = document.getElementById('empty-state');

// Botones de acciones
const btnMonthlyReport = document.getElementById('btn-monthly-report');
const btnExportBackup = document.getElementById('btn-export-backup');
const btnImportTrigger = document.getElementById('btn-import-trigger');
const csvFileInput = document.getElementById('csv-file-input');
const btnClearData = document.getElementById('btn-clear-data');

// Modales
const modalDelete = document.getElementById('modal-delete');
const deleteDetailBox = document.getElementById('delete-detail-box');
const btnDeleteCancel = document.getElementById('btn-delete-cancel');
const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

const modalImport = document.getElementById('modal-import');
const importStatsText = document.getElementById('import-stats-text');
const btnImportCancel = document.getElementById('btn-import-cancel');
const btnImportConfirm = document.getElementById('btn-import-confirm');

const modalClear = document.getElementById('modal-clear');
const btnClearCancel = document.getElementById('btn-clear-cancel');
const btnClearConfirm = document.getElementById('btn-clear-confirm');

const modalPfImport = document.getElementById('modal-pf-import');
const pfImportStatsText = document.getElementById('pf-import-stats-text');
const btnPfImportCancel = document.getElementById('btn-pf-import-cancel');
const btnPfImportConfirm = document.getElementById('btn-pf-import-confirm');

const modalPfClear = document.getElementById('modal-pf-clear');
const btnPfClearCancel = document.getElementById('btn-pf-clear-cancel');
const btnPfClearConfirm = document.getElementById('btn-pf-clear-confirm');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configurar selector de fecha (valor por defecto: hoy, max: hoy)
    const todayStr = getTodayString();
    inputDate.value = todayStr;
    inputDate.max = todayStr;
    
    if (pfDate) {
        pfDate.value = todayStr;
        pfDate.max = todayStr;
    }
    
    // 2. Configurar manejadores de eventos
    setupEventListeners();
    
    // 3. Inicializar selector de idioma personalizado
    initCustomLanguageSelector();
});

// --- ESCUCHAR ESTADO DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Remover clase de vista de login en el body
        document.body.classList.remove('login-view');
        
        // Actualizar perfil de la barra superior
        if (userPhoto) userPhoto.src = user.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        if (userName) userName.textContent = user.displayName || user.email;
        if (userProfile) userProfile.classList.remove('hidden-element');
        
        // Ocultar login
        loginSection.classList.add('hidden-element');
        
        // Cargar transacciones de Tesorería
        await loadTransactions();
        
        // Cargar Finanzas Personales
        await loadPersonalFinances();
        
        // Configurar filtros basándose en las transacciones cargadas
        initFilters();
        
        // Mostrar módulo activo (por defecto: 'menu')
        showModule(currentModule);
        
        // Renderizar interfaz
        render();
    } else {
        currentUser = null;
        transactions = [];
        personalExpenses = [];
        personalIncomes = {};
        treasuryCategories = [...DEFAULT_TREASURY_CATEGORIES];
        personalCategories = [...DEFAULT_PERSONAL_CATEGORIES];
        
        // Destruir gráficos
        if (pfDonutChartInstance) { pfDonutChartInstance.destroy(); pfDonutChartInstance = null; }
        if (pfBarChartInstance) { pfBarChartInstance.destroy(); pfBarChartInstance = null; }
        if (tDonutChartInstance) { tDonutChartInstance.destroy(); tDonutChartInstance = null; }
        if (tBarChartInstance) { tBarChartInstance.destroy(); tBarChartInstance = null; }
        
        currentModule = 'menu';
        
        // Agregar clase de vista de login en el body
        document.body.classList.add('login-view');
        
        // Ocultar perfil
        if (userProfile) userProfile.classList.add('hidden-element');
        
        // Mostrar login, ocultar todo lo demás
        loginSection.classList.remove('hidden-element');
        dashboardContainer.classList.add('hidden-element');
        menuSection.classList.add('hidden-element');
        personalFinancesContainer.classList.add('hidden-element');
        if (btnBackToMenu) btnBackToMenu.classList.add('hidden-element');
        
        // Sincronizar visibilidad del botón de subir al inicio al desautenticar
        updateScrollTopButtonVisibility();
        
        render();
    }
});

// --- FUNCIONES DE PERSISTENCIA Y CARGA ---

async function loadTransactions() {
    // 1. Intentar cargar localmente primero para visualización rápida
    try {
        const stored = localStorage.getItem('transacciones');
        if (stored) {
            transactions = JSON.parse(stored);
        } else {
            transactions = [];
        }
        
        const storedCats = localStorage.getItem('treasury_categories');
        if (storedCats) {
            treasuryCategories = JSON.parse(storedCats);
        } else {
            treasuryCategories = [...DEFAULT_TREASURY_CATEGORIES];
        }
    } catch (e) {
        console.error('Error cargando transacciones desde localStorage', e);
        transactions = [];
        treasuryCategories = [...DEFAULT_TREASURY_CATEGORIES];
    }
    
    // 2. Si hay sesión iniciada en la nube, sincronizar con Firestore
    if (currentUser && db) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                const cloudData = data.transactions || [];
                transactions = cloudData;
                
                if (data.treasuryCategories !== undefined) {
                    treasuryCategories = data.treasuryCategories || [...DEFAULT_TREASURY_CATEGORIES];
                } else {
                    treasuryCategories = [...DEFAULT_TREASURY_CATEGORIES];
                }
                
                // Actualizar caché local
                localStorage.setItem('transacciones', JSON.stringify(transactions));
                localStorage.setItem('treasury_categories', JSON.stringify(treasuryCategories));
            } else {
                // Si no hay datos en la nube pero sí locales, subirlos (migración automática)
                if (transactions.length > 0 || treasuryCategories.length > 0) {
                    showToast('Sincronizando tus datos locales con la nube...', 'info');
                    await saveTransactions();
                }
            }
        } catch (error) {
            console.error("Error al cargar de Firestore: ", error);
            showToast('Error al cargar datos en la nube. Usando copia local.', 'warning');
        }
    }
    
    // Renderizar datalists de categorías
    renderCategoryDatalists();
}

async function saveTransactions() {
    // 1. Guardar localmente siempre como copia de respaldo
    try {
        localStorage.setItem('transacciones', JSON.stringify(transactions));
        localStorage.setItem('treasury_categories', JSON.stringify(treasuryCategories));
    } catch (e) {
        console.error('Error guardando transacciones en localStorage', e);
    }
    
    // 2. Guardar en la nube si está autenticado
    if (currentUser && db) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, {
                transactions: transactions,
                treasuryCategories: treasuryCategories,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error al guardar en Firestore: ", error);
            showToast('Error al guardar datos en la nube.', 'error');
        }
    }
}



function initFilters() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    filterMonth.value = currentMonth;
    
    // Rellenar años disponibles dinámicamente
    populateYearFilter(currentYear);
}

function populateYearFilter(defaultYear) {
    // Obtenemos todos los años de las transacciones guardadas
    const years = new Set();
    years.add(defaultYear);
    years.add(defaultYear - 1);
    years.add(defaultYear + 1);
    
    transactions.forEach(t => {
        if (t.fecha) {
            const y = parseInt(t.fecha.split('-')[0]);
            if (!isNaN(y)) years.add(y);
        }
    });
    
    // Ordenar años
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    filterYear.innerHTML = '';
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === defaultYear) {
            option.selected = true;
        }
        filterYear.appendChild(option);
    });
}

// --- FUNCIONES MÓDULO FINANZAS PERSONALES ---

async function loadPersonalFinances() {
    // 1. Intentar cargar localmente primero
    try {
        const storedExpenses = localStorage.getItem('pf_expenses');
        const storedIncomes = localStorage.getItem('pf_incomes');
        
        if (storedExpenses) {
            personalExpenses = JSON.parse(storedExpenses);
        } else {
            personalExpenses = [];
        }
        
        const storedCats = localStorage.getItem('personal_categories');
        if (storedCats) {
            personalCategories = JSON.parse(storedCats);
        } else {
            personalCategories = [...DEFAULT_PERSONAL_CATEGORIES];
        }
        
        if (storedIncomes) {
            personalIncomes = JSON.parse(storedIncomes);
        } else {
            personalIncomes = {};
            // Backwards compatibility con pf_income antiguo
            const storedIncome = localStorage.getItem('pf_income');
            if (storedIncome) {
                const legacyVal = parseFloat(storedIncome) || 0.00;
                if (legacyVal > 0) {
                    const now = new Date();
                    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    personalIncomes[currentMonthKey] = legacyVal;
                }
            }
        }
    } catch (e) {
        console.error('Error cargando finanzas personales desde localStorage', e);
        personalExpenses = [];
        personalIncomes = {};
        personalCategories = [...DEFAULT_PERSONAL_CATEGORIES];
    }
    
    // 2. Sincronizar con Firestore si está logueado
    if (currentUser && db) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.personalExpenses !== undefined) {
                    personalExpenses = data.personalExpenses || [];
                    localStorage.setItem('pf_expenses', JSON.stringify(personalExpenses));
                }
                if (data.personalCategories !== undefined) {
                    personalCategories = data.personalCategories || [...DEFAULT_PERSONAL_CATEGORIES];
                    localStorage.setItem('personal_categories', JSON.stringify(personalCategories));
                } else {
                    personalCategories = [...DEFAULT_PERSONAL_CATEGORIES];
                }
                if (data.personalIncomes !== undefined) {
                    personalIncomes = data.personalIncomes || {};
                    localStorage.setItem('pf_incomes', JSON.stringify(personalIncomes));
                } else if (data.personalIncome !== undefined) {
                    // Migración si tiene el campo legacy en Firestore
                    const legacyVal = parseFloat(data.personalIncome) || 0.00;
                    personalIncomes = {};
                    if (legacyVal > 0) {
                        const now = new Date();
                        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        personalIncomes[currentMonthKey] = legacyVal;
                    }
                    localStorage.setItem('pf_incomes', JSON.stringify(personalIncomes));
                }
            }
        } catch (e) {
            console.error('Error sincronizando finanzas personales con la nube', e);
        }
    }
    
    // Renderizar datalists de categorías
    renderCategoryDatalists();
    
    // Renderizar inputs y datos
    initPfFilters();
    renderPersonalFinances();
}

function initPfFilters() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (pfFilterMonth) {
        pfFilterMonth.value = currentMonth;
    }
    
    populatePfYearFilter(currentYear);
}

function populatePfYearFilter(defaultYear) {
    if (!pfFilterYear) return;
    
    const years = new Set();
    years.add(defaultYear);
    years.add(defaultYear - 1);
    years.add(defaultYear + 1);
    
    personalExpenses.forEach(e => {
        if (e.fecha) {
            const y = parseInt(e.fecha.split('-')[0]);
            if (!isNaN(y)) years.add(y);
        }
    });
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    // Guardar selección actual si existe
    const currentSel = pfFilterYear.value;
    
    pfFilterYear.innerHTML = '';
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (currentSel) {
            if (year.toString() === currentSel.toString()) {
                option.selected = true;
            }
        } else if (year === defaultYear) {
            option.selected = true;
        }
        pfFilterYear.appendChild(option);
    });
}

async function savePersonalFinances() {
    // 1. Guardar localmente
    try {
        localStorage.setItem('pf_expenses', JSON.stringify(personalExpenses));
        localStorage.setItem('pf_incomes', JSON.stringify(personalIncomes));
        localStorage.setItem('personal_categories', JSON.stringify(personalCategories));
    } catch (e) {
        console.error('Error guardando en localStorage', e);
    }
    
    // 2. Guardar en la nube si está logueado
    if (currentUser && db) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, {
                personalExpenses: personalExpenses,
                personalIncomes: personalIncomes,
                personalCategories: personalCategories
            }, { merge: true });
        } catch (e) {
            console.error('Error guardando finanzas personales en Firestore', e);
            showToast('Error de sincronización con la nube.', 'error');
        }
    }
}

function showModule(moduleName) {
    currentModule = moduleName;
    
    // Ocultar todos
    menuSection.classList.add('hidden-element');
    dashboardContainer.classList.add('hidden-element');
    personalFinancesContainer.classList.add('hidden-element');
    
    if (moduleName === 'menu') {
        menuSection.classList.remove('hidden-element');
        if (btnBackToMenu) btnBackToMenu.classList.add('hidden-element');
    } else if (moduleName === 'tesoreria') {
        dashboardContainer.classList.remove('hidden-element');
        if (btnBackToMenu) btnBackToMenu.classList.remove('hidden-element');
    } else if (moduleName === 'personales') {
        personalFinancesContainer.classList.remove('hidden-element');
        if (btnBackToMenu) btnBackToMenu.classList.remove('hidden-element');
        renderPersonalFinances();
    }
    
    // Sincronizar visibilidad del botón de subir al inicio al cambiar de vista
    updateScrollTopButtonVisibility();
}

async function checkAndClonePfExpenses(selYear, selMonth) {
    if (personalExpenses.length === 0) return false;
    
    // 1. Filtrar los gastos que pertenecen al mes/año seleccionado
    const currentMonthExpenses = personalExpenses.filter(e => {
        if (!e.fecha) return false;
        const [y, m] = e.fecha.split('-').map(Number);
        return y === selYear && (m - 1) === selMonth;
    });
    
    // Si ya hay gastos en este mes, no hacemos nada
    if (currentMonthExpenses.length > 0) return false;
    
    // 2. Buscar el mes más cercano en el pasado que contenga gastos
    let bestPastYear = -1;
    let bestPastMonth = -1;
    let maxTimeVal = -1;
    
    personalExpenses.forEach(e => {
        if (!e.fecha) return;
        const [y, m] = e.fecha.split('-').map(Number);
        const mIdx = m - 1;
        
        if (y < selYear || (y === selYear && mIdx < selMonth)) {
            const timeVal = y * 12 + mIdx;
            if (timeVal > maxTimeVal) {
                maxTimeVal = timeVal;
                bestPastYear = y;
                bestPastMonth = mIdx;
            }
        }
    });
    
    // Si no se encontró ningún período anterior con datos, salir
    if (maxTimeVal === -1) return false;
    
    // 3. Obtener los gastos del período origen
    const sourceExpenses = personalExpenses.filter(e => {
        if (!e.fecha) return false;
        const [y, m] = e.fecha.split('-').map(Number);
        return y === bestPastYear && (m - 1) === bestPastMonth;
    });
    
    if (sourceExpenses.length === 0) return false;
    
    // 4. Clonar gastos al nuevo período
    const clonedExpenses = [];
    const targetMonthStr = String(selMonth + 1).padStart(2, '0');
    const targetPeriodKey = `${selYear}-${targetMonthStr}`;
    
    // Obtener último día del mes destino
    const lastDayOfTargetMonth = new Date(selYear, selMonth + 1, 0).getDate();
    
    sourceExpenses.forEach(e => {
        let origDay = 1;
        if (e.fecha) {
            const parts = e.fecha.split('-');
            origDay = parseInt(parts[2]) || 1;
        }
        
        const targetDay = Math.min(origDay, lastDayOfTargetMonth);
        const targetDayStr = String(targetDay).padStart(2, '0');
        const newFecha = `${selYear}-${targetMonthStr}-${targetDayStr}`;
        
        clonedExpenses.push({
            id: 'pf-' + Date.now() + Math.random().toString(36).substr(2, 5) + '-' + Math.floor(Math.random()*100),
            concepto: e.concepto,
            monto: e.monto,
            tipo: e.tipo,
            estado: 'pagar', // Inicia pendiente
            fecha: newFecha
        });
    });
    
    // Copiar también el presupuesto si no está configurado en el mes destino
    if (!personalIncomes[targetPeriodKey]) {
        const sourcePeriodKey = `${bestPastYear}-${String(bestPastMonth + 1).padStart(2, '0')}`;
        const sourceIncome = personalIncomes[sourcePeriodKey];
        if (sourceIncome !== undefined) {
            personalIncomes[targetPeriodKey] = sourceIncome;
        }
    }
    
    // Insertar los nuevos gastos
    personalExpenses = [...clonedExpenses, ...personalExpenses];
    
    // Guardar en Firestore/localStorage
    await savePersonalFinances();
    showToast(`Se precargaron los gastos y presupuesto desde el período anterior.`, 'info');
    return true;
}

function renderPersonalFinances() {
    if (!personalFinancesContainer || personalFinancesContainer.classList.contains('hidden-element')) return;
    
    // Filtrar fijos y variables por período seleccionado
    const isAllMonths = pfFilterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(pfFilterMonth.value);
    const selYear = parseInt(pfFilterYear.value);
    
    // Si no es vista anual, verificar y precargar gastos si está vacío
    if (!isAllMonths) {
        checkAndClonePfExpenses(selYear, selMonth).then(wasCloned => {
            if (wasCloned) {
                renderPersonalFinances();
            }
        });
    }
    
    const filteredExpenses = personalExpenses.filter(e => {
        if (!e.fecha) return false;
        const [year, month] = e.fecha.split('-').map(Number);
        return year === selYear && (isAllMonths || (month - 1) === selMonth);
    });
    
    const fixedExpenses = filteredExpenses.filter(e => e.tipo === 'fijo');
    const variableExpenses = filteredExpenses.filter(e => e.tipo === 'variable');
    
    // Renderizar contadores
    if (pfFixedCount) pfFixedCount.textContent = `${fixedExpenses.length} ${fixedExpenses.length === 1 ? 'item' : 'items'}`;
    if (pfVariableCount) pfVariableCount.textContent = `${variableExpenses.length} ${variableExpenses.length === 1 ? 'item' : 'items'}`;
    
    // Calcular resúmenes
    let totalPaid = 0;
    let totalPending = 0;
    
    filteredExpenses.forEach(e => {
        const amt = parseFloat(e.monto) || 0;
        if (e.estado === 'pagado') {
            totalPaid += amt;
        } else {
            totalPending += amt;
        }
    });
    
    // Obtener presupuesto/ingreso según el filtro
    let currentIncome = 0;
    if (isAllMonths) {
        let annualSum = 0;
        Object.keys(personalIncomes).forEach(key => {
            if (key.startsWith(`${selYear}-`)) {
                annualSum += parseFloat(personalIncomes[key]) || 0;
            }
        });
        currentIncome = annualSum;
        
        if (pfMonthlyIncome) {
            pfMonthlyIncome.value = currentIncome > 0 ? currentIncome.toFixed(2) : '0.00';
            pfMonthlyIncome.disabled = true;
            pfMonthlyIncome.style.opacity = '0.7';
            pfMonthlyIncome.title = 'El ingreso anual es la suma de los ingresos mensuales individuales.';
        }
    } else {
        const monthStr = String(selMonth + 1).padStart(2, '0');
        const periodKey = `${selYear}-${monthStr}`;
        currentIncome = parseFloat(personalIncomes[periodKey]) || 0.00;
        
        if (pfMonthlyIncome) {
            pfMonthlyIncome.disabled = false;
            pfMonthlyIncome.style.opacity = '1';
            pfMonthlyIncome.title = '';
            if (document.activeElement !== pfMonthlyIncome) {
                pfMonthlyIncome.value = currentIncome > 0 ? currentIncome.toFixed(2) : '';
            }
        }
    }
    
    const balance = currentIncome - totalPaid;
    
    // Renderizar resúmenes en las tarjetas
    if (pfTotalPaid) pfTotalPaid.textContent = formatCurrency(totalPaid).replace('RD$', 'RD$ ');
    if (pfTotalPending) pfTotalPending.textContent = formatCurrency(totalPending).replace('RD$', 'RD$ ');
    if (pfTotalBalance) {
        pfTotalBalance.textContent = formatCurrency(balance).replace('RD$', 'RD$ ');
        if (balance < 0) {
            pfTotalBalance.className = 'amount bold red-text';
        } else if (balance === 0) {
            pfTotalBalance.className = 'amount bold';
        } else {
            pfTotalBalance.className = 'amount bold blue-text';
        }
    }
    
    // Calcular porcentaje gastado (fijos + variables)
    const totalSpent = totalPaid + totalPending;
    let spentPct = 0;
    if (currentIncome > 0) {
        spentPct = (totalSpent / currentIncome) * 100;
    }
    
    // Determinar color dinámico de la barra
    let barColor = 'var(--income-color)'; // Verde < 70%
    if (spentPct >= 70 && spentPct <= 90) {
        barColor = '#f59e0b'; // Amarillo 70% - 90%
    } else if (spentPct > 90) {
        barColor = 'var(--expense-color)'; // Rojo > 90% o sobregirado
    }
    
    // Actualizar elementos de la barra de progreso
    const progressBar = document.getElementById('pf-budget-progress-bar');
    const progressPct = document.getElementById('pf-budget-progress-pct');
    const progressRem = document.getElementById('pf-budget-progress-rem');
    
    if (progressBar) {
        progressBar.style.width = `${Math.min(spentPct, 100)}%`;
        progressBar.style.backgroundColor = barColor;
    }
    if (progressPct) {
        progressPct.textContent = `${spentPct.toFixed(0)}% gastado`;
    }
    if (progressRem) {
        const remaining = currentIncome - totalSpent;
        if (remaining >= 0) {
            progressRem.textContent = `RD$ ${remaining.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} restante`;
            progressRem.style.color = 'var(--text-muted)';
        } else {
            progressRem.textContent = `RD$ ${Math.abs(remaining).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} sobregirado`;
            progressRem.style.color = 'var(--expense-color)';
        }
    }
    
    // Inyectar HTML en listas
    const renderList = (listEl, items) => {
        if (!listEl) return;
        if (items.length === 0) {
            listEl.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No hay gastos registrados aquí.</p></div>';
            return;
        }
        
        listEl.innerHTML = items.map(item => {
            const isPaid = item.estado === 'pagado';
            
            // Buscar color de la categoría
            let catColor = '#6b7280'; // gris por defecto
            if (item.categoria) {
                const found = personalCategories.find(c => c.name.toLowerCase() === item.categoria.toLowerCase());
                if (found) catColor = found.color;
            }
            
            const catBadge = item.categoria 
                ? `<span style="background-color: ${catColor}15; color: ${catColor}; border: 1px solid ${catColor}30; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: 600; margin-left: 8px; display: inline-block;">${item.categoria}</span>`
                : '';
                
            return `
                <div class="pf-expense-item">
                    <div class="pf-item-left">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <span class="pf-item-title">${item.concepto}</span>
                            ${catBadge}
                        </div>
                        <span class="pf-item-date">${formatDateString(item.fecha)}</span>
                    </div>
                    <div class="pf-item-right">
                        <span class="pf-item-amount">${formatCurrency(item.monto).replace('RD$', 'RD$ ')}</span>
                        <button class="btn-payment-state ${isPaid ? 'btn-state-paid' : 'btn-state-unpaid'}" data-id="${item.id}">
                            ${isPaid ? 'Pagado' : 'Pagar'}
                        </button>
                        <button class="btn-edit-item" data-id="${item.id}" title="Editar gasto">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-delete-item" data-id="${item.id}" title="Eliminar gasto">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar manejadores de eventos dinámicos
        listEl.querySelectorAll('.btn-payment-state').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                togglePersonalExpenseState(id);
            });
        });
        
        listEl.querySelectorAll('.btn-edit-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                startEditPersonalExpense(id);
            });
        });
        
        listEl.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                deletePersonalExpense(id);
            });
        });
    };
    
    renderList(pfFixedList, fixedExpenses);
    renderList(pfVariableList, variableExpenses);
    
    // Renderizar gráficos de Finanzas Personales
    renderPfCharts();
}

async function handlePfExpenseSubmit(e) {
    e.preventDefault();
    
    const conceptVal = pfConcept.value.trim();
    const amountVal = parseFloat(pfAmount.value) || 0;
    const typeVal = pfType.value;
    const statusVal = pfStatus.value;
    const dateVal = pfDate ? pfDate.value : getTodayString();
    const categoryVal = pfCategory ? pfCategory.value.trim() : '';
    
    if (!dateVal) {
        showToast('Por favor, selecciona una fecha.', 'error');
        return;
    }
    if (!conceptVal) {
        showToast('Por favor, ingresa el concepto del gasto.', 'error');
        return;
    }
    if (amountVal <= 0) {
        showToast('El monto debe ser mayor a 0.', 'error');
        return;
    }
    
    if (editingPfExpenseId) {
        // Modo Edición
        const idx = personalExpenses.findIndex(item => item.id === editingPfExpenseId);
        if (idx !== -1) {
            personalExpenses[idx].fecha = dateVal;
            personalExpenses[idx].concepto = conceptVal;
            personalExpenses[idx].monto = amountVal;
            personalExpenses[idx].tipo = typeVal;
            personalExpenses[idx].estado = statusVal;
            personalExpenses[idx].categoria = categoryVal;
            
            await savePersonalFinances();
            showToast('Gasto personal actualizado con éxito.', 'success');
            
            // Restablecer el botón de envío y limpiar estado de edición
            cancelEditPersonalExpense();
        }
    } else {
        // Modo Registro Nuevo
        const newExpense = {
            id: 'pf-' + Date.now() + Math.random().toString(36).substr(2, 5),
            concepto: conceptVal,
            monto: amountVal,
            tipo: typeVal,
            estado: statusVal,
            fecha: dateVal,
            categoria: categoryVal
        };
        
        personalExpenses.unshift(newExpense);
        await savePersonalFinances();
        showToast('Gasto personal registrado con éxito.', 'success');
        
        // Resetear formulario
        pfConcept.value = '';
        pfAmount.value = '';
        pfType.value = 'fijo';
        pfStatus.value = 'pagar';
        if (pfCategory) pfCategory.value = '';
        if (pfDate) pfDate.value = getTodayString();
        userEditedPfCategory = false;
    }
    
    // Recargar filtros en base a los nuevos años registrados si aplica
    const now = new Date();
    populatePfYearFilter(now.getFullYear());
    
    renderPersonalFinances();
}

function startEditPersonalExpense(id) {
    const item = personalExpenses.find(x => x.id === id);
    if (!item) return;
    
    editingPfExpenseId = id;
    userEditedPfCategory = false;
    
    // Cargar datos en el formulario
    if (pfDate) pfDate.value = item.fecha;
    pfConcept.value = item.concepto;
    pfAmount.value = item.monto;
    pfType.value = item.tipo;
    pfStatus.value = item.estado;
    if (pfCategory) pfCategory.value = item.categoria || '';
    
    // Cambiar texto de botón submit
    if (pfSubmitText) pfSubmitText.textContent = 'Guardar';
    if (btnPfCancelEdit) btnPfCancelEdit.classList.remove('hidden-btn');
    
    // Cambiar icono de submit button a un disquete
    if (pfSubmitIconWrapper) {
        pfSubmitIconWrapper.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
            </svg>
        `;
    }
    
    // Scroll suave hacia arriba
    const formSection = document.querySelector('.pf-form-section');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    showToast('Editando gasto...', 'info');
}

function cancelEditPersonalExpense() {
    editingPfExpenseId = null;
    userEditedPfCategory = false;
    
    // Restablecer formulario
    pfConcept.value = '';
    pfAmount.value = '';
    pfType.value = 'fijo';
    pfStatus.value = 'pagar';
    if (pfCategory) pfCategory.value = '';
    if (pfDate) pfDate.value = getTodayString();
    
    // Restablecer botón submit
    if (pfSubmitText) pfSubmitText.textContent = 'Agregar';
    if (btnPfCancelEdit) btnPfCancelEdit.classList.add('hidden-btn');
    
    if (pfSubmitIconWrapper) {
        pfSubmitIconWrapper.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        `;
    }
}

async function handlePfBudgetChange() {
    const isAllMonths = pfFilterMonth.value === 'all';
    if (isAllMonths) return; // No se puede editar en vista anual
    
    const selMonth = parseInt(pfFilterMonth.value);
    const selYear = parseInt(pfFilterYear.value);
    const monthStr = String(selMonth + 1).padStart(2, '0');
    const periodKey = `${selYear}-${monthStr}`;
    
    const val = parseFloat(pfMonthlyIncome.value) || 0;
    if (val > 0) {
        personalIncomes[periodKey] = val;
    } else {
        delete personalIncomes[periodKey];
    }
    
    await savePersonalFinances();
    renderPersonalFinances();
}

async function togglePersonalExpenseState(id) {
    const expense = personalExpenses.find(e => e.id === id);
    if (expense) {
        expense.estado = expense.estado === 'pagado' ? 'pagar' : 'pagado';
        await savePersonalFinances();
        renderPersonalFinances();
        const msg = expense.estado === 'pagado' ? 'Gasto marcado como PAGADO.' : 'Gasto marcado como PENDIENTE.';
        showToast(msg, 'info');
    }
}

async function deletePersonalExpense(id) {
    const idx = personalExpenses.findIndex(e => e.id === id);
    if (idx !== -1) {
        personalExpenses.splice(idx, 1);
        await savePersonalFinances();
        renderPersonalFinances();
        showToast('Gasto personal eliminado.', 'info');
    }
}

// --- ACCIONES FINANZAS PERSONALES: REPORTES Y RESPALDOS ---

function downloadPfReport() {
    if (personalExpenses.length === 0) {
        showToast('No hay gastos personales registrados para generar el reporte.', 'error');
        return;
    }
    
    // Filtrar fijos y variables por período seleccionado
    const isAllMonths = pfFilterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(pfFilterMonth.value);
    const selYear = parseInt(pfFilterYear.value);
    
    const filteredExpenses = personalExpenses.filter(e => {
        if (!e.fecha) return false;
        const [year, month] = e.fecha.split('-').map(Number);
        return year === selYear && (isAllMonths || (month - 1) === selMonth);
    });
    
    if (filteredExpenses.length === 0) {
        showToast('No hay gastos registrados en el período seleccionado.', 'error');
        return;
    }
    
    const fixedExpenses = filteredExpenses.filter(e => e.tipo === 'fijo');
    const variableExpenses = filteredExpenses.filter(e => e.tipo === 'variable');
    
    let totalPaid = 0;
    let totalPending = 0;
    filteredExpenses.forEach(e => {
        const amt = parseFloat(e.monto) || 0;
        if (e.estado === 'pagado') totalPaid += amt;
        else totalPending += amt;
    });
    // Obtener presupuesto/ingreso según el filtro
    let currentIncome = 0;
    if (isAllMonths) {
        let annualSum = 0;
        Object.keys(personalIncomes).forEach(key => {
            if (key.startsWith(`${selYear}-`)) {
                annualSum += parseFloat(personalIncomes[key]) || 0;
            }
        });
        currentIncome = annualSum;
    } else {
        const monthStr = String(selMonth + 1).padStart(2, '0');
        const periodKey = `${selYear}-${monthStr}`;
        currentIncome = parseFloat(personalIncomes[periodKey]) || 0.00;
    }
    
    const balance = currentIncome - totalPaid;
    
    const dateToday = getTodayString().split('-').reverse().join('/');
    
    const monthsNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const periodText = isAllMonths ? `Año ${selYear}` : `${monthsNames[selMonth]} ${selYear}`;
    
    // Generar las filas de las tablas
    const makeTableRows = (items) => {
        if (items.length === 0) {
            return `<tr><td colspan="4" style="text-align:center; color:#777777; padding:12px;">No hay registros en esta sección</td></tr>`;
        }
        return items.map(item => `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;">${formatDateString(item.fecha)}</td>
                <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;">${item.concepto}</td>
                <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;"><span class="print-badge" style="padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 600; text-transform: uppercase; border: 1px solid ${item.estado === 'pagado' ? '#ffbdad' : '#abf5d1'}; background-color: ${item.estado === 'pagado' ? '#ffebe6' : '#e3fcef'}; color: ${item.estado === 'pagado' ? '#bf2600' : '#006644'};">${item.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE'}</span></td>
                <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt; text-align:right; font-weight:600; color: ${item.estado === 'pagado' ? '#bf2600' : '#f59e0b'};">
                    ${formatCurrency(item.monto).replace('RD$', 'RD$ ')}
                </td>
            </tr>
        `).join('');
    };

    let contentHTML = '';
    
    if (isAllMonths) {
        // Agrupar por mes
        const expensesByMonth = {};
        filteredExpenses.forEach(e => {
            const [year, month] = e.fecha.split('-').map(Number);
            const monthKey = month - 1; // 0-indexed
            if (!expensesByMonth[monthKey]) {
                expensesByMonth[monthKey] = [];
            }
            expensesByMonth[monthKey].push(e);
        });
        
        const sortedMonthKeys = Object.keys(expensesByMonth).map(Number).sort((a, b) => a - b);
        
        sortedMonthKeys.forEach(mKey => {
            const monthExpenses = expensesByMonth[mKey];
            const monthFixed = monthExpenses.filter(e => e.tipo === 'fijo');
            const monthVariable = monthExpenses.filter(e => e.tipo === 'variable');
            
            const fixedRows = makeTableRows(monthFixed);
            const variableRows = makeTableRows(monthVariable);
            
            contentHTML += `
                <div class="print-month-section" style="margin-top: 30px; page-break-inside: avoid;">
                    <h2 style="font-size: 14pt; font-weight: 700; color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 5px; margin-bottom: 15px;">
                        ${monthsNames[mKey]} ${selYear}
                    </h2>
                    
                    <div class="print-section-title" style="font-size: 11pt; font-weight: 600; margin-top: 10px; margin-bottom: 8px; color: #333333;">Gastos Fijos</div>
                    <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="width: 15%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600;">Fecha</th>
                                <th style="width: 50%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600;">Concepto</th>
                                <th style="width: 15%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600;">Estado</th>
                                <th style="width: 20%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fixedRows}
                        </tbody>
                    </table>
                    
                    <div class="print-section-title" style="font-size: 11pt; font-weight: 600; margin-top: 10px; margin-bottom: 8px; color: #333333;">Gastos Variables / Imprevistos</div>
                    <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="width: 15%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600;">Fecha</th>
                                <th style="width: 50%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600;">Concepto</th>
                                <th style="width: 15%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600;">Estado</th>
                                <th style="width: 20%; padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${variableRows}
                        </tbody>
                    </table>
                </div>
            `;
        });
    } else {
        const fixedRows = makeTableRows(fixedExpenses);
        const variableRows = makeTableRows(variableExpenses);
        contentHTML = `
            <div class="print-section-title" style="font-size:13pt; font-weight:600; margin-top:25px; margin-bottom:10px; border-bottom:1px solid #dddddd; padding-bottom:5px;">Gastos Fijos</div>
            <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="width: 15%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600;">Fecha</th>
                        <th style="width: 50%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600;">Concepto</th>
                        <th style="width: 15%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600;">Estado</th>
                        <th style="width: 20%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600; text-align:right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${fixedRows}
                </tbody>
            </table>
            
            <div class="print-section-title" style="font-size:13pt; font-weight:600; margin-top:25px; margin-bottom:10px; border-bottom:1px solid #dddddd; padding-bottom:5px;">Gastos Variables / Imprevistos</div>
            <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="width: 15%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600;">Fecha</th>
                        <th style="width: 50%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600;">Concepto</th>
                        <th style="width: 15%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600;">Estado</th>
                        <th style="width: 20%; padding: 8px 10px; border-bottom: 1px solid #dddddd; font-size: 9pt; font-weight: 600; text-align:right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${variableRows}
                </tbody>
            </table>
        `;
    }
    
    const reportTitle = "Reporte de Finanzas Personales";
    
    // Detectar si es dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
                     
    const reportHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #000000;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .print-report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000000;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .print-report-header h1 {
            font-size: 20pt;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .print-report-header p {
            font-size: 10pt;
            color: #555555;
        }
        .print-report-header-right {
            text-align: right;
            flex-shrink: 0;
        }
        .print-date {
            font-size: 12pt;
            font-weight: 600;
        }
        .print-subtitle {
            font-size: 9pt;
            color: #666666;
            margin-top: 4px;
        }
        .print-summary-grid {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 30px;
        }
        .print-summary-card {
            flex: 1;
            border: 1px solid #dddddd;
            padding: 12px;
            border-radius: 6px;
            background-color: #fafafa !important;
        }
        .print-summary-card h3 {
            font-size: 9pt;
            color: #555555;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .print-summary-card .amount {
            font-size: 13pt;
            font-weight: 700;
        }
        .print-card-income .amount { color: #0052cc !important; }
        .print-card-expense .amount { color: #de350b !important; }
        .print-card-pending .amount { color: #f59e0b !important; }
        .print-card-balance .amount { color: #00875a !important; }
        
        .print-section-title {
            font-size: 13pt;
            font-weight: 600;
            margin-top: 25px;
            margin-bottom: 10px;
            border-bottom: 1px solid #dddddd;
            padding-bottom: 5px;
        }
        .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .print-table th, .print-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #dddddd;
            font-size: 9pt;
            text-align: left;
        }
        .print-table th {
            font-weight: 600;
            background-color: #f0f0f0 !important;
        }
        .print-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: 600;
            text-transform: uppercase;
            border: 1px solid #cccccc;
        }
        .print-report-footer {
            border-top: 1px dashed #cccccc;
            padding-top: 15px;
            text-align: center;
            font-size: 8pt;
            color: #777777;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="print-report-header">
        <div>
            <h1>Reporte de Finanzas Personales</h1>
            <p>Control de gastos y presupuesto personal</p>
        </div>
        <div class="print-report-header-right">
            <div class="print-date">${isAllMonths ? periodText : `Período: ${periodText}`}</div>
            <div class="print-subtitle">Generado: ${dateToday}</div>
        </div>
    </div>
    
    <div class="print-summary-grid">
        <div class="print-summary-card print-card-income">
            <h3>Ingreso / Presupuesto</h3>
            <div class="amount">RD$ ${currentIncome.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        </div>
        <div class="print-summary-card print-card-expense">
            <h3>Total Pagado</h3>
            <div class="amount">RD$ ${totalPaid.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        </div>
        <div class="print-summary-card print-card-pending">
            <h3>Total Pendiente</h3>
            <div class="amount">RD$ ${totalPending.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        </div>
        <div class="print-summary-card print-card-balance">
            <h3>Saldo Disponible</h3>
            <div class="amount">RD$ ${balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        </div>
    </div>
    
    ${contentHTML}
    
    <div class="print-report-footer">
        Reporte de Finanzas Personales - Generado localmente y de forma privada por Income Manage.
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        }
    </script>
</body>
</html>`;

    if (isMobile) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(reportHTML);
            printWindow.document.close();
        } else {
            showToast('El navegador bloqueó la ventana emergente de impresión.', 'error');
        }
    } else {
        const printReportContainer = document.getElementById('print-report-container');
        if (printReportContainer) {
            printReportContainer.innerHTML = `
                <div class="print-report-wrapper">
                    <div class="print-report-header">
                        <div>
                            <h1>Reporte de Finanzas Personales</h1>
                            <p>Control de gastos y presupuesto personal</p>
                        </div>
                        <div class="print-report-header-right">
                            <div class="print-date">${isAllMonths ? periodText : `Período: ${periodText}`}</div>
                            <div class="print-subtitle">Generado: ${dateToday}</div>
                        </div>
                    </div>
                    
                    <div class="print-summary-grid" style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 30px;">
                        <div class="print-summary-card print-card-income" style="flex:1; border: 1px solid #dddddd; padding: 12px; border-radius: 6px; background-color: #fafafa;">
                            <h3 style="font-size: 9pt; color: #555555; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Ingreso / Presupuesto</h3>
                            <div class="amount" style="font-size: 13pt; font-weight: 700; color: #0052cc;">RD$ ${currentIncome.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                        </div>
                        <div class="print-summary-card print-card-expense" style="flex:1; border: 1px solid #dddddd; padding: 12px; border-radius: 6px; background-color: #fafafa;">
                            <h3 style="font-size: 9pt; color: #555555; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Total Pagado</h3>
                            <div class="amount" style="font-size: 13pt; font-weight: 700; color: #de350b;">RD$ ${totalPaid.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                        </div>
                        <div class="print-summary-card print-card-pending" style="flex:1; border: 1px solid #dddddd; padding: 12px; border-radius: 6px; background-color: #fafafa;">
                            <h3 style="font-size: 9pt; color: #555555; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Total Pendiente</h3>
                            <div class="amount" style="font-size: 13pt; font-weight: 700; color: #f59e0b;">RD$ ${totalPending.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                        </div>
                        <div class="print-summary-card print-card-balance" style="flex:1; border: 1px solid #dddddd; padding: 12px; border-radius: 6px; background-color: #fafafa;">
                            <h3 style="font-size: 9pt; color: #555555; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Saldo Disponible</h3>
                            <div class="amount" style="font-size: 13pt; font-weight: 700; color: #00875a;">RD$ ${balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                        </div>
                    </div>
                    
                    ${contentHTML}
                    
                    <div class="print-report-footer" style="border-top:1px dashed #cccccc; padding-top:15px; text-align:center; font-size:8pt; color:#777777; margin-top:30px;">
                        Reporte de Finanzas Personales - Generado localmente y de forma privada por Income Manage.
                    </div>
                </div>
            `;
            window.print();
        }
    }
}

function exportPfBackup() {
    if (personalExpenses.length === 0 && Object.keys(personalIncomes).length === 0) {
        showToast('No hay datos de finanzas personales que respaldar.', 'error');
        return;
    }
    
    let csvContent = '\uFEFF'; // BOM para soporte de caracteres en Excel
    
    // Exportar presupuestos mensuales
    Object.keys(personalIncomes).forEach(key => {
        csvContent += `METADATA_PRESUPUESTO_MENSUAL,${key},${personalIncomes[key]}\r\n`;
    });
    
    csvContent += 'id,fecha,concepto,monto,tipo,estado\r\n';
    
    // De más antiguo a más reciente
    const sorted = [...personalExpenses].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    sorted.forEach(e => {
        const row = [
            e.id,
            e.fecha,
            escapeCSVField(e.concepto),
            e.monto,
            e.tipo,
            e.estado
        ];
        csvContent += row.join(',') + '\r\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateToday = getTodayString();
    
    link.setAttribute('href', url);
    link.setAttribute('download', `respaldo-finanzas-personales-${dateToday}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Respaldo de finanzas personales exportado con éxito.', 'success');
}

function handleImportPfCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showToast('El archivo seleccionado debe ser de formato CSV.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        parseAndValidatePfCsv(text);
    };
    reader.onerror = function() {
        showToast('Error al leer el archivo seleccionado.', 'error');
    };
    reader.readAsText(file, 'UTF-8');
}

function parseAndValidatePfCsv(content) {
    parsedPfExpensesToImport = [];
    parsedPfIncomesToImport = {};
    
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
        showToast('El archivo CSV está vacío o incompleto.', 'error');
        return;
    }
    
    let errorCount = 0;
    let validCount = 0;
    let startIdx = 0;
    
    // Analizar metadata del presupuesto (pueden ser múltiples líneas de presupuesto mensual)
    while (startIdx < lines.length) {
        const lineClean = lines[startIdx].replace(/^\uFEFF/, '').trim();
        if (lineClean.startsWith('METADATA_PRESUPUESTO_MENSUAL,')) {
            const parts = lineClean.split(',');
            const mKey = parts[1];
            const mVal = parseFloat(parts[2]) || 0.00;
            parsedPfIncomesToImport[mKey] = mVal;
            startIdx++;
        } else if (lineClean.startsWith('METADATA_PRESUPUESTO,')) {
            // Compatibilidad legacy: asignar presupuesto único al mes actual
            const parts = lineClean.split(',');
            const mVal = parseFloat(parts[1]) || 0.00;
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            parsedPfIncomesToImport[currentMonthKey] = mVal;
            startIdx++;
        } else {
            break;
        }
    }
    
    // Analizar encabezado
    if (lines.length <= startIdx) {
        showToast('El archivo no contiene filas de datos.', 'error');
        return;
    }
    
    const headerLine = lines[startIdx].trim().toLowerCase();
    const headers = headerLine.split(',');
    
    if (headers.length !== 6 || headers[0] !== 'id' || headers[1] !== 'fecha' || headers[2] !== 'concepto' || headers[3] !== 'monto' || headers[4] !== 'tipo' || headers[5] !== 'estado') {
        showToast('Formato de CSV de finanzas personales inválido.', 'error');
        return;
    }
    
    for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const row = splitCsvLine(line);
        if (row.length !== 6) {
            errorCount++;
            continue;
        }
        
        const [id, fecha, concepto, montoRaw, tipo, estado] = row.map(s => s.trim());
        const monto = parseFloat(montoRaw);
        const tipoNorm = tipo.toLowerCase();
        const estadoNorm = estado.toLowerCase();
        
        const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
        const isConceptValid = concepto.length > 0;
        const isTypeValid = tipoNorm === 'fijo' || tipoNorm === 'variable';
        const isStatusValid = estadoNorm === 'pagar' || estadoNorm === 'pagado';
        const isAmountValid = !isNaN(monto) && monto > 0;
        
        if (isDateValid && isConceptValid && isTypeValid && isStatusValid && isAmountValid) {
            parsedPfExpensesToImport.push({
                id: id || ('pf-' + Date.now() + Math.random().toString(36).substr(2, 5)),
                fecha: fecha,
                concepto: concepto,
                monto: monto,
                tipo: tipoNorm,
                estado: estadoNorm
            });
            validCount++;
        } else {
            errorCount++;
        }
    }
    
    if (validCount === 0 && Object.keys(parsedPfIncomesToImport).length === 0) {
        showToast('No se encontraron registros de finanzas personales válidos.', 'error');
        return;
    }
    
    // Preparar mensaje modal
    let statsMessage = `Se encontraron: <br>
                        - <strong>${Object.keys(parsedPfIncomesToImport).length}</strong> registros de presupuesto mensual.<br>
                        - <strong>${parsedPfExpensesToImport.filter(x => x.tipo === 'fijo').length}</strong> gastos fijos.<br>
                        - <strong>${parsedPfExpensesToImport.filter(x => x.tipo === 'variable').length}</strong> gastos variables.`;
                        
    if (errorCount > 0) {
        statsMessage += `<br><span style="color: var(--expense-color);">Se omitieron <strong>${errorCount}</strong> filas debido a errores de formato.</span>`;
    }
    statsMessage += `<br><br>¿Estás seguro de que deseas proceder? Los gastos actuales serán reemplazados por completo.`;
    
    if (pfImportStatsText) {
        pfImportStatsText.innerHTML = statsMessage;
    }
    openModal(modalPfImport);
}

async function executePfImport() {
    personalExpenses = parsedPfExpensesToImport;
    personalIncomes = parsedPfIncomesToImport;
    
    // Guardar cambios
    await savePersonalFinances();
    
    // Recargar vista
    renderPersonalFinances();
    
    closeModal(modalPfImport);
    showToast('Respaldo de finanzas personales importado con éxito.', 'success');
}

async function executePfClearData() {
    personalExpenses = [];
    personalIncomes = {};
    
    await savePersonalFinances();
    
    if (pfMonthlyIncome) {
        pfMonthlyIncome.value = '';
    }
    renderPersonalFinances();
    
    closeModal(modalPfClear);
    showToast('Todos los datos de finanzas personales han sido eliminados.', 'info');
}

// --- EVENT LISTENERS ---

function setupEventListeners() {
    // Cambio de tema
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Filtros de fecha
    filterMonth.addEventListener('change', render);
    filterYear.addEventListener('change', render);
    
    // Autocompletado y validaciones en el Formulario
    inputConcept.addEventListener('input', handleConceptInput);
    inputConcept.addEventListener('focus', handleConceptInput);
    inputCategory.addEventListener('input', () => {
        userEditedCategory = true;
    });
    
    // Cerrar lista de autocompletado si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (e.target !== inputConcept && e.target !== autocompleteList) {
            closeAutocomplete();
        }
        if (e.target !== pfConcept && e.target !== pfAutocompleteList) {
            closePfAutocomplete();
        }
    });
    
    // Envío del formulario
    transactionForm.addEventListener('submit', handleFormSubmit);
    btnCancelEdit.addEventListener('click', cancelEdit);
    
    // Botón para simular clic en input file para importar CSV
    btnImportTrigger.addEventListener('click', () => {
        csvFileInput.value = ''; // Resetear
        csvFileInput.click();
    });
    csvFileInput.addEventListener('change', handleImportCsvFile);
    
    // Botones de acciones generales
    btnMonthlyReport.addEventListener('click', downloadMonthlyReport);
    btnExportBackup.addEventListener('click', downloadFullBackup);
    btnClearData.addEventListener('click', () => openModal(modalClear));
    
    // Botones del modal de eliminar
    btnDeleteCancel.addEventListener('click', () => closeModal(modalDelete));
    btnDeleteConfirm.addEventListener('click', confirmDeleteTransaction);
    
    // Botones del modal de importación
    btnImportCancel.addEventListener('click', () => {
        closeModal(modalImport);
        parsedCsvTransactionsToImport = [];
    });
    btnImportConfirm.addEventListener('click', executeImportCsv);
    
    // Botones del modal de limpiar
    btnClearCancel.addEventListener('click', () => closeModal(modalClear));
    btnClearConfirm.addEventListener('click', executeClearData);
    
    // Habilitar cierre de modales con la 'X' superior
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) closeModal(modal);
        });
    });
    
    // Autenticación con Google
    if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error("Error al iniciar sesión: ", error);
                showToast('Error al iniciar sesión con Google.', 'error');
            }
        });
    }
    
    // Cerrar sesión
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showToast('Sesión cerrada correctamente.', 'info');
            } catch (error) {
                console.error("Error al cerrar sesión: ", error);
                showToast('Error al cerrar sesión.', 'error');
            }
        });
    }
    
    // Navegación de módulos
    if (btnGotoTesoreria) {
        btnGotoTesoreria.addEventListener('click', () => showModule('tesoreria'));
    }
    if (btnGotoPersonales) {
        btnGotoPersonales.addEventListener('click', () => showModule('personales'));
    }
    if (btnBackToMenu) {
        btnBackToMenu.addEventListener('click', () => showModule('menu'));
    }
    if (headerLogo) {
        headerLogo.addEventListener('click', () => {
            if (currentUser) {
                showModule('menu');
            }
        });
    }
    
    // Finanzas Personales
    if (pfConcept) {
        pfConcept.addEventListener('input', handlePfConceptInput);
        pfConcept.addEventListener('focus', handlePfConceptInput);
    }
    if (pfCategory) {
        pfCategory.addEventListener('input', () => {
            userEditedPfCategory = true;
        });
    }
    if (pfExpenseForm) {
        pfExpenseForm.addEventListener('submit', handlePfExpenseSubmit);
    }
    if (pfMonthlyIncome) {
        pfMonthlyIncome.addEventListener('change', handlePfBudgetChange);
        pfMonthlyIncome.addEventListener('input', handlePfBudgetChange);
    }
    
    // Filtros de Finanzas Personales
    if (pfFilterMonth) {
        pfFilterMonth.addEventListener('change', renderPersonalFinances);
    }
    if (pfFilterYear) {
        pfFilterYear.addEventListener('change', renderPersonalFinances);
    }
    if (btnPfCancelEdit) {
        btnPfCancelEdit.addEventListener('click', cancelEditPersonalExpense);
    }
    
    // Acciones de Finanzas Personales
    if (btnPfReport) {
        btnPfReport.addEventListener('click', downloadPfReport);
    }
    if (btnPfExport) {
        btnPfExport.addEventListener('click', exportPfBackup);
    }
    if (btnPfImportTrigger) {
        btnPfImportTrigger.addEventListener('click', () => {
            pfCsvFileInput.value = '';
            pfCsvFileInput.click();
        });
    }
    if (pfCsvFileInput) {
        pfCsvFileInput.addEventListener('change', handleImportPfCsvFile);
    }
    if (btnPfClearData) {
        btnPfClearData.addEventListener('click', () => openModal(modalPfClear));
    }
    
    // Botones de Modales de Finanzas Personales
    if (btnPfImportCancel) {
        btnPfImportCancel.addEventListener('click', () => {
            closeModal(modalPfImport);
            parsedPfExpensesToImport = [];
            parsedPfIncomeToImport = 0.00;
        });
    }
    if (btnPfImportConfirm) {
        btnPfImportConfirm.addEventListener('click', executePfImport);
    }
    if (btnPfClearCancel) {
        btnPfClearCancel.addEventListener('click', () => closeModal(modalPfClear));
    }
    if (btnPfClearConfirm) {
        btnPfClearConfirm.addEventListener('click', executePfClearData);
    }
    
    // Panel de Configuración de Categorías
    if (btnTManageCategories) {
        btnTManageCategories.addEventListener('click', () => {
            currentCategoryModule = 'tesoreria';
            if (mcModalTitle) mcModalTitle.textContent = 'Configurar Categorías: Tesorería';
            resetMcForm();
            renderMcColorPicker();
            renderCategoryManagerList();
            openModal(modalManageCategories);
        });
    }
    if (btnPfManageCategories) {
        btnPfManageCategories.addEventListener('click', () => {
            currentCategoryModule = 'personales';
            if (mcModalTitle) mcModalTitle.textContent = 'Configurar Categorías: Finanzas Personales';
            resetMcForm();
            renderMcColorPicker();
            renderCategoryManagerList();
            openModal(modalManageCategories);
        });
    }
    if (mcCategoryForm) {
        mcCategoryForm.addEventListener('submit', handleMcCategorySubmit);
    }
    if (btnMcClose) {
        btnMcClose.addEventListener('click', () => closeModal(modalManageCategories));
    }
    
    // Botón de subir al inicio (Scroll-to-top)
    window.addEventListener('scroll', updateScrollTopButtonVisibility);
    const btnScrollTop = document.getElementById('btn-scroll-top');
    if (btnScrollTop) {
        btnScrollTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// --- LOGICA DE CAMBIO DE TEMA ---

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
    showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
    
    // Si estamos en algún módulo activo, refrescar para actualizar los colores de los textos de los gráficos
    if (currentModule === 'personales') {
        renderPersonalFinances();
    } else if (currentModule === 'tesoreria') {
        render();
    }
}

// --- LOGICA DE AUTOCOMPLETADO ---

// Normaliza texto eliminando acentos/diacríticos y convirtiendo a minúsculas
function normalizeText(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function handleConceptInput() {
    const val = inputConcept.value;
    const valNorm = normalizeText(val);
    closeAutocomplete();
    
    if (!valNorm) {
        if (!userEditedCategory) {
            inputCategory.value = '';
        }
        return;
    }
    
    // Obtener conceptos únicos de los valores por defecto
    const conceptMap = new Map();
    DEFAULT_CONCEPT_CATEGORIES.forEach(item => {
        conceptMap.set(normalizeText(item.concepto), {
            original: item.concepto,
            categoria: item.categoria
        });
    });
    
    // Sobrescribir/añadir con el historial de transacciones reales (máxima prioridad)
    transactions.forEach(t => {
        const conceptNorm = t.concepto.trim();
        if (conceptNorm) {
            conceptMap.set(normalizeText(conceptNorm), {
                original: conceptNorm,
                categoria: t.categoria
            });
        }
    });
    
    const uniqueConcepts = Array.from(conceptMap.values());
    
    // Buscar coincidencias parciales con el texto normalizado
    const matches = uniqueConcepts.filter(item => 
        normalizeText(item.original).includes(valNorm)
    ).slice(0, 5); // Máximo 5 sugerencias
    
    if (matches.length > 0) {
        matches.forEach(match => {
            const div = document.createElement('div');
            
            // Resaltar el fragmento coincidente en el texto original
            const origLower = match.original.toLowerCase();
            const valLower = val.toLowerCase();
            const index = origLower.indexOf(valLower);
            
            if (index !== -1) {
                const before = match.original.substring(0, index);
                const matchText = match.original.substring(index, index + val.length);
                const after = match.original.substring(index + val.length);
                div.innerHTML = `${before}<strong>${matchText}</strong>${after}`;
            } else {
                div.textContent = match.original;
            }
            
            div.addEventListener('click', () => {
                inputConcept.value = match.original;
                inputCategory.value = match.categoria;
                userEditedCategory = false; // Resetear bandera al elegir una sugerencia
                closeAutocomplete();
                showToast('Categoría autocompletada', 'info');
            });
            
            autocompleteList.appendChild(div);
        });
    }
    
    // Autocompletado directo y reactivo en el campo categoría
    if (!userEditedCategory) {
        // Buscar coincidencia que empiece con el texto escrito
        const bestMatch = uniqueConcepts.find(item => normalizeText(item.original).startsWith(valNorm)) ||
                          uniqueConcepts.find(item => normalizeText(item.original).includes(valNorm));
        
        if (bestMatch) {
            inputCategory.value = bestMatch.categoria;
        } else {
            // Intentar detectar coincidencia por palabras clave (keywords)
            let matchedCategoryByKeyword = null;
            for (const rule of KEYWORD_CATEGORY_RULES) {
                const found = rule.keywords.some(kw => valNorm.includes(normalizeText(kw)));
                if (found) {
                    matchedCategoryByKeyword = rule.categoria;
                    break;
                }
            }

            if (matchedCategoryByKeyword) {
                inputCategory.value = matchedCategoryByKeyword;
            } else {
                // Intentar detectar si el término ingresado coincide con el nombre de alguna categoría conocida
                const knownCategories = new Set(uniqueConcepts.map(item => item.categoria));
                const matchedCategory = Array.from(knownCategories).find(cat => 
                    valNorm.includes(normalizeText(cat)) || normalizeText(cat).includes(valNorm)
                );
                if (matchedCategory && valNorm.length >= 3) {
                    inputCategory.value = matchedCategory;
                } else {
                    inputCategory.value = '';
                }
            }
        }
    }
}

function closeAutocomplete() {
    autocompleteList.innerHTML = '';
}

// --- LOGICA DE RENDERIZACIÓN ---

function render() {
    const isAllMonths = filterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(filterMonth.value);
    const selYear = parseInt(filterYear.value);
    
    // Filtrar transacciones del mes (o todos) y año seleccionados
    const filtered = transactions.filter(t => {
        if (!t.fecha) return false;
        const [year, month] = t.fecha.split('-').map(Number);
        return year === selYear && (isAllMonths || (month - 1) === selMonth);
    });
    
    // Ordenar por fecha descendente, y luego por fecha de creación descendente
    filtered.sort((a, b) => {
        const dateDiff = new Date(b.fecha) - new Date(a.fecha);
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    
    // Calcular Resumen del período filtrado
    let totalIncome = 0;
    let totalExpense = 0;
    
    filtered.forEach(t => {
        const monto = parseFloat(t.monto) || 0;
        if (t.tipo === 'ingreso') {
            totalIncome += monto;
        } else if (t.tipo === 'gasto') {
            totalExpense += monto;
        }
    });
    
    const totalBalance = totalIncome - totalExpense;
    
    // Calcular Saldo Histórico (toda la historia guardada)
    let histIncome = 0;
    let histExpense = 0;
    transactions.forEach(t => {
        const monto = parseFloat(t.monto) || 0;
        if (t.tipo === 'ingreso') {
            histIncome += monto;
        } else if (t.tipo === 'gasto') {
            histExpense += monto;
        }
    });
    const historicalBalance = histIncome - histExpense;
    
    // Mostrar totales del período
    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpenseEl.textContent = formatCurrency(totalExpense);
    totalBalanceEl.textContent = formatCurrency(totalBalance);
    
    // Mostrar Saldo Histórico
    const historicalBalanceEl = document.getElementById('historical-balance');
    if (historicalBalanceEl) {
        historicalBalanceEl.textContent = formatCurrency(historicalBalance);
        if (historicalBalance < 0) {
            historicalBalanceEl.style.color = 'var(--expense-color)';
        } else {
            historicalBalanceEl.style.color = 'var(--historical-color)';
        }
    }
    
    // Actualizar etiqueta del saldo del período
    const labelBalanceEl = document.getElementById('label-balance');
    if (labelBalanceEl) {
        labelBalanceEl.textContent = isAllMonths ? 'Saldo del año' : 'Saldo del mes';
    }

    // Actualizar título de la sección de transacciones
    const labelTransactionsTitleEl = document.getElementById('label-transactions-title');
    if (labelTransactionsTitleEl) {
        labelTransactionsTitleEl.textContent = isAllMonths ? 'Transacciones del año' : 'Transacciones del mes';
    }
    
    // Actualizar párrafo de estado vacío
    const labelEmptyStateEl = document.getElementById('label-empty-state');
    if (labelEmptyStateEl) {
        labelEmptyStateEl.textContent = isAllMonths ? 'No hay transacciones registradas para este año.' : 'No hay transacciones registradas para este mes.';
    }
    
    // Actualizar texto del botón de reporte
    const labelReportBtnEl = document.getElementById('label-report-btn');
    if (labelReportBtnEl) {
        labelReportBtnEl.textContent = isAllMonths ? 'Generar reporte anual' : 'Generar reporte mensual';
    }
    
    // Modificar clases del saldo según su valor (opcional, siempre azul pero da feedback)
    if (totalBalance < 0) {
        totalBalanceEl.style.color = 'var(--expense-color)';
    } else {
        totalBalanceEl.style.color = 'var(--balance-color)';
    }
    
    // Limpiar tabla
    transactionsTableBody.innerHTML = '';
    
    if (filtered.length === 0) {
        emptyStateEl.style.display = 'block';
    } else {
        emptyStateEl.style.display = 'none';
        
        filtered.forEach(t => {
            const tr = document.createElement('tr');
            
            const tdFecha = document.createElement('td');
            tdFecha.textContent = formatDateString(t.fecha);
            tr.appendChild(tdFecha);
            
            const tdConcepto = document.createElement('td');
            tdConcepto.textContent = t.concepto;
            tr.appendChild(tdConcepto);
            
            const tdTipo = document.createElement('td');
            const spanBadge = document.createElement('span');
            spanBadge.className = `badge badge-${t.tipo}`;
            spanBadge.textContent = t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
            tdTipo.appendChild(spanBadge);
            tr.appendChild(tdTipo);
            
            const tdCategoria = document.createElement('td');
            if (t.categoria) {
                let catColor = '#6b7280';
                const found = treasuryCategories.find(c => c.name.toLowerCase() === t.categoria.toLowerCase());
                if (found) catColor = found.color;
                
                const badge = document.createElement('span');
                badge.style.backgroundColor = `${catColor}15`;
                badge.style.color = catColor;
                badge.style.border = `1px solid ${catColor}30`;
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '8pt';
                badge.style.fontWeight = '600';
                badge.style.display = 'inline-block';
                badge.textContent = t.categoria;
                tdCategoria.appendChild(badge);
            } else {
                tdCategoria.textContent = '-';
            }
            tr.appendChild(tdCategoria);
            
            const tdMonto = document.createElement('td');
            tdMonto.className = t.tipo === 'ingreso' ? 'td-income' : 'td-expense';
            tdMonto.textContent = (t.tipo === 'ingreso' ? '+ ' : '- ') + formatCurrency(t.monto);
            tr.appendChild(tdMonto);
            
            const tdAcciones = document.createElement('td');
            tdAcciones.className = 'text-right';
            
            // Botón Editar
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-edit';
            btnEdit.setAttribute('aria-label', 'Editar transacción');
            btnEdit.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            `;
            btnEdit.addEventListener('click', () => startEditTransaction(t.id));
            tdAcciones.appendChild(btnEdit);
            
            // Botón Eliminar
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-delete';
            btnDel.setAttribute('aria-label', 'Eliminar transacción');
            btnDel.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            `;
            btnDel.addEventListener('click', () => requestDeleteTransaction(t.id));
            tdAcciones.appendChild(btnDel);
            tr.appendChild(tdAcciones);
            
            transactionsTableBody.appendChild(tr);
        });
    }
    
    // Renderizar gráficos de Tesorería
    renderTCharts();
}

// --- CREAR O EDITAR TRANSACCIÓN (FORM SUBMIT) ---

function handleFormSubmit(e) {
    e.preventDefault();
    
    const fecha = inputDate.value;
    const concepto = inputConcept.value.trim();
    const montoRaw = inputAmount.value;
    const tipo = inputType.value;
    const categoria = inputCategory.value.trim();
    
    // Validaciones de negocio
    if (!fecha || !concepto || !montoRaw || !tipo || !categoria) {
        showToast('Todos los campos son obligatorios.', 'error');
        return;
    }
    
    const monto = parseFloat(montoRaw);
    if (isNaN(monto) || monto <= 0) {
        showToast('El monto debe ser un número positivo mayor que 0.', 'error');
        return;
    }
    
    // Comprobar fecha futura
    const dateSelected = new Date(fecha + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final de hoy
    
    if (dateSelected > today) {
        showToast('La fecha no puede ser futura.', 'error');
        return;
    }
    
    if (editingTransactionId !== null) {
        // Modo Edición
        const idx = transactions.findIndex(t => t.id === editingTransactionId);
        if (idx !== -1) {
            transactions[idx].fecha = fecha;
            transactions[idx].concepto = concepto;
            transactions[idx].tipo = tipo;
            transactions[idx].categoria = categoria;
            transactions[idx].monto = monto;
            
            saveTransactions();
            showToast('Transacción modificada con éxito.', 'success');
            
            // Restablecer filtros del mes/año modificado para verlo
            const [tYear, tMonth] = fecha.split('-').map(Number);
            filterMonth.value = tMonth - 1;
            filterYear.value = tYear;
            
            cancelEdit();
            render();
        } else {
            showToast('No se encontró la transacción a editar.', 'error');
            cancelEdit();
        }
        return;
    }
    
    // Modo Creación (Nuevo registro)
    const newTransaction = {
        id: 't-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        fecha: fecha,
        concepto: concepto,
        tipo: tipo,
        categoria: categoria,
        monto: monto,
        createdAt: new Date().toISOString()
    };
    
    // Añadir al inicio o guardar
    transactions.push(newTransaction);
    
    // Guardar en localStorage
    saveTransactions();
    
    // Actualizar filtro de año si ingresaron un año nuevo
    const inputYear = parseInt(fecha.split('-')[0]);
    populateYearFilter(inputYear);
    
    // Ajustar filtros para que muestren la fecha de la transacción agregada
    const [tYear, tMonth] = fecha.split('-').map(Number);
    filterMonth.value = tMonth - 1;
    filterYear.value = tYear;
    
    // Limpiar formulario y restablecer valores
    inputConcept.value = '';
    inputAmount.value = '';
    inputCategory.value = '';
    inputType.value = 'ingreso';
    userEditedCategory = false;
    
    const todayStr = getTodayString();
    inputDate.value = todayStr;
    
    showToast('Transacción registrada con éxito.', 'success');
    
    // Re-renderizar
    render();
}

// --- SOPORTE PARA EDICIÓN ---

function startEditTransaction(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;
    
    editingTransactionId = id;
    
    // Cargar datos en el formulario
    inputDate.value = t.fecha;
    inputConcept.value = t.concepto;
    inputAmount.value = t.monto;
    inputType.value = t.tipo;
    inputCategory.value = t.categoria;
    
    // Modificar botón de guardar cambios
    submitBtnText.textContent = 'Guardar';
    btnCancelEdit.classList.remove('hidden-btn');
    
    // Cambiar icono del submit button a un disquete
    submitBtnIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
        </svg>
    `;
    
    // Scroll suave hacia arriba para que el usuario vea el formulario cargado
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    showToast('Editando transacción...', 'info');
}

function cancelEdit() {
    editingTransactionId = null;
    userEditedCategory = false;
    
    // Limpiar formulario y restablecer valores
    inputConcept.value = '';
    inputAmount.value = '';
    inputCategory.value = '';
    inputType.value = 'ingreso';
    
    const todayStr = getTodayString();
    inputDate.value = todayStr;
    
    // Revertir elementos visuales del submit button
    submitBtnText.textContent = 'Agregar';
    btnCancelEdit.classList.add('hidden-btn');
    
    submitBtnIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    `;
}

// --- ELIMINAR TRANSACCIÓN ---

function requestDeleteTransaction(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;
    
    selectedTransactionIdToDelete = id;
    
    // Cargar detalles en el modal
    deleteDetailBox.innerHTML = `
        <p><strong>Fecha:</strong> ${formatDateString(t.fecha)}</p>
        <p><strong>Concepto:</strong> ${t.concepto}</p>
        <p><strong>Tipo:</strong> ${t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</p>
        <p><strong>Categoría:</strong> ${t.categoria}</p>
        <p><strong>Monto:</strong> ${formatCurrency(t.monto)}</p>
    `;
    
    openModal(modalDelete);
}

function confirmDeleteTransaction() {
    if (!selectedTransactionIdToDelete) return;
    
    const initialCount = transactions.length;
    transactions = transactions.filter(t => t.id !== selectedTransactionIdToDelete);
    
    if (transactions.length < initialCount) {
        saveTransactions();
        showToast('Transacción eliminada correctamente.', 'success');
    }
    
    closeModal(modalDelete);
    selectedTransactionIdToDelete = null;
    render();
}

// --- ACCIONES GENERALES ---

// 1. Limpiar Datos
function executeClearData() {
    transactions = [];
    saveTransactions();
    
    // Restablecer filtros
    initFilters();
    
    closeModal(modalClear);
    showToast('Todos los datos han sido borrados.', 'success');
    render();
}

// 2. Exportar Respaldo Completo (CSV)
function downloadFullBackup() {
    if (transactions.length === 0) {
        showToast('No hay transacciones para exportar.', 'error');
        return;
    }
    
    // Generar contenido CSV
    let csvContent = '\uFEFF'; // UTF-8 BOM para soporte correcto de caracteres en Excel
    csvContent += 'fecha,concepto,tipo,categoria,monto\r\n';
    
    // Ordenar de más antiguo a más reciente para respaldos coherentes
    const sorted = [...transactions].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    sorted.forEach(t => {
        const row = [
            t.fecha,
            escapeCSVField(t.concepto),
            t.tipo,
            escapeCSVField(t.categoria),
            t.monto
        ];
        csvContent += row.join(',') + '\r\n';
    });
    
    // Crear Blob y enlace de descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateToday = getTodayString();
    link.setAttribute('href', url);
    link.setAttribute('download', `respaldo-tesoreria-completo-${dateToday}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Respaldo completo exportado con éxito.', 'success');
}

// 3. Generar Reporte Mensual/Anual (PDF/Impresión)
function downloadMonthlyReport() {
    const isAllMonths = filterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(filterMonth.value);
    const selYear = parseInt(filterYear.value);
    
    // Obtener idioma actual del navegador / Google Translate
    const currentLang = (document.documentElement.lang || 'es').split('-')[0].toLowerCase();
    
    const translations = {
        es: {
            noTransactionsYear: 'No hay transacciones registradas para este año.',
            noTransactionsMonth: 'No hay transacciones registradas para este mes.',
            annualReport: 'Reporte Anual de Tesorería',
            monthlyReport: 'Reporte Mensual de Tesorería',
            subtitle: 'Detalle de ingresos y gastos de la tesorería de la iglesia',
            period: 'Período',
            generated: 'Generado el',
            totalIncome: 'Total Ingresos',
            totalExpense: 'Total Gastos',
            annualBalance: 'Saldo del Año',
            monthlyBalance: 'Saldo del Mes',
            date: 'Fecha',
            concept: 'Concepto',
            type: 'Tipo',
            category: 'Categoría',
            amount: 'Monto',
            income: 'Ingreso',
            expense: 'Gasto',
            footer: 'Reporte de Tesorería de la Iglesia oficial - Generado de forma local y privada.',
            transactionsTitle: 'Transacciones del período',
            months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        },
        en: {
            noTransactionsYear: 'No transactions recorded for this year.',
            noTransactionsMonth: 'No transactions recorded for this month.',
            annualReport: 'Annual Treasury Report',
            monthlyReport: 'Monthly Treasury Report',
            subtitle: 'Detail of income and expenses of the church treasury',
            period: 'Period',
            generated: 'Generated on',
            totalIncome: 'Total Income',
            totalExpense: 'Total Expenses',
            annualBalance: 'Year Balance',
            monthlyBalance: 'Month Balance',
            date: 'Date',
            concept: 'Concept',
            type: 'Type',
            category: 'Category',
            amount: 'Amount',
            income: 'Income',
            expense: 'Expense',
            footer: 'Official Church Treasury Report - Generated locally and privately.',
            transactionsTitle: 'Transactions of the period',
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        fr: {
            noTransactionsYear: 'Aucune transaction enregistrée pour cette année.',
            noTransactionsMonth: 'Aucune transaction enregistrée pour ce mois.',
            annualReport: 'Rapport Annuel de la Trésorerie',
            monthlyReport: 'Rapport Mensuel de la Trésorerie',
            subtitle: 'Détail des revenus et dépenses de la trésorerie de l\'église',
            period: 'Période',
            generated: 'Généré le',
            totalIncome: 'Total des Revenus',
            totalExpense: 'Total des Dépenses',
            annualBalance: 'Solde de l\'Année',
            monthlyBalance: 'Solde du Mois',
            date: 'Date',
            concept: 'Concept',
            type: 'Type',
            category: 'Catégorie',
            amount: 'Montant',
            income: 'Revenu',
            expense: 'Dépense',
            footer: 'Rapport officiel de la trésorerie de l\'église - Généré localement et en privé.',
            transactionsTitle: 'Transactions de la période',
            months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
        },
        pt: {
            noTransactionsYear: 'Nenhuma transação registrada para este ano.',
            noTransactionsMonth: 'Nenhuma transação registrada para este mês.',
            annualReport: 'Relatório Anual de Tesouraria',
            monthlyReport: 'Relatório Mensal de Tesouraria',
            subtitle: 'Detalhamento de receitas e despesas da tesouraria da igreja',
            period: 'Período',
            generated: 'Gerado em',
            totalIncome: 'Total de Receitas',
            totalExpense: 'Total de Despesas',
            annualBalance: 'Saldo do Ano',
            monthlyBalance: 'Saldo do Mês',
            date: 'Data',
            concept: 'Conceito',
            type: 'Tipo',
            category: 'Categoria',
            amount: 'Valor',
            income: 'Receita',
            expense: 'Despesa',
            footer: 'Relatório Oficial da Tesouraria da Igreja - Gerado localmente e de forma privada.',
            transactionsTitle: 'Transações do período',
            months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        },
        it: {
            noTransactionsYear: 'Nessuna transazione registrata per quest\'anno.',
            noTransactionsMonth: 'Nessuna transazione registrata per questo mese.',
            annualReport: 'Rapporto Generale di Tesoreria',
            monthlyReport: 'Rapporto Mensile di Tesoreria',
            subtitle: 'Dettaglio delle entrate e delle uscite della tesoreria della chiesa',
            period: 'Periodo',
            generated: 'Generato il',
            totalIncome: 'Totale Entrate',
            totalExpense: 'Totale Spese',
            annualBalance: 'Saldo dell\'Anno',
            monthlyBalance: 'Saldo del Mese',
            date: 'Date',
            concept: 'Concept',
            type: 'Type',
            category: 'Category',
            amount: 'Importo',
            income: 'Entrata',
            expense: 'Spesa',
            footer: 'Rapporto Ufficiale della Tesoreria della Chiesa - Generato localmente e privatamente.',
            transactionsTitle: 'Transazioni del periodo',
            months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
        },
        de: {
            noTransactionsYear: 'Für dieses Jahr wurden keine Transaktionen erfasst.',
            noTransactionsMonth: 'Für diesen Monat wurden keine Transaktionen erfasst.',
            annualReport: 'Jährlicher Kassenbericht',
            monthlyReport: 'Monatlicher Kassenbericht',
            subtitle: 'Details zu Einnahmen und Ausgaben der Kirchenkasse',
            period: 'Zeitraum',
            generated: 'Generiert am',
            totalIncome: 'Gesamteinnahmen',
            totalExpense: 'Gesamtausgaben',
            annualBalance: 'Jahressaldo',
            monthlyBalance: 'Monatssaldo',
            date: 'Datum',
            concept: 'Konzept',
            type: 'Typ',
            category: 'Kategorie',
            amount: 'Betrag',
            income: 'Einnahme',
            expense: 'Ausgabe',
            footer: 'Offizieller Bericht der Kirchenkasse - Lokal und privat generiert.',
            transactionsTitle: 'Transaktionen des Zeitraums',
            months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
        }
    };
    
    const trans = translations[currentLang] || translations.es;
    
    // Filtrar y ordenar
    const filtered = transactions.filter(t => {
        if (!t.fecha) return false;
        const [year, month] = t.fecha.split('-').map(Number);
        return year === selYear && (isAllMonths || (month - 1) === selMonth);
    });
    
    if (filtered.length === 0) {
        showToast(isAllMonths ? trans.noTransactionsYear : trans.noTransactionsMonth, 'error');
        return;
    }
    
    // Ordenar por fecha ascendente
    filtered.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    // Calcular totales
    let totalIncome = 0;
    let totalExpense = 0;
    filtered.forEach(t => {
        const m = parseFloat(t.monto) || 0;
        if (t.tipo === 'ingreso') totalIncome += m;
        else if (t.tipo === 'gasto') totalExpense += m;
    });
    const balance = totalIncome - totalExpense;
    
    const dateToday = getTodayString().split('-').reverse().join('/');
    
    let tContentHTML = '';
    let tableRows = '';
    
    if (isAllMonths) {
        // Agrupar por mes
        const tExpensesByMonth = {};
        filtered.forEach(t => {
            const [year, month] = t.fecha.split('-').map(Number);
            const monthKey = month - 1;
            if (!tExpensesByMonth[monthKey]) {
                tExpensesByMonth[monthKey] = [];
            }
            tExpensesByMonth[monthKey].push(t);
        });
        
        const sortedTMonthKeys = Object.keys(tExpensesByMonth).map(Number).sort((a, b) => a - b);
        
        sortedTMonthKeys.forEach(mKey => {
            const monthTransactions = tExpensesByMonth[mKey];
            monthTransactions.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            
            let monthRows = '';
            monthTransactions.forEach(t => {
                const isIncome = t.tipo === 'ingreso';
                monthRows += `
                    <tr>
                        <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;">${formatDateString(t.fecha)}</td>
                        <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;">${t.concepto}</td>
                        <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;"><span class="print-badge print-badge-${t.tipo}">${isIncome ? trans.income : trans.expense}</span></td>
                        <td style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt;">${t.categoria || '-'}</td>
                        <td class="${isIncome ? 'print-td-income' : 'print-td-expense'}" style="padding:8px; border-bottom:1px solid #dddddd; font-size:9pt; text-align:right;">
                            ${isIncome ? '+' : '-'} ${formatCurrency(t.monto).replace('RD$', 'RD$ ')}
                        </td>
                    </tr>
                `;
            });
            
            tContentHTML += `
                <div class="print-month-section" style="margin-top: 30px; page-break-inside: avoid;">
                    <h2 style="font-size: 14pt; font-weight: 700; color: #0052cc; border-bottom: 2px solid #0052cc; padding-bottom: 5px; margin-bottom: 15px;">
                        ${trans.months[mKey]} ${selYear}
                    </h2>
                    <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:left;">Fecha</th>
                                <th style="padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:left;">Concepto</th>
                                <th style="padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:left;">Tipo</th>
                                <th style="padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:left;">Categoría</th>
                                <th style="padding: 6px 8px; border-bottom: 1px solid #dddddd; font-size: 8.5pt; font-weight: 600; text-align:right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthRows}
                        </tbody>
                    </table>
                </div>
            `;
        });
    } else {
        filtered.forEach(t => {
            const isIncome = t.tipo === 'ingreso';
            tableRows += `
                <tr>
                    <td>${formatDateString(t.fecha)}</td>
                    <td>${t.concepto}</td>
                    <td><span class="print-badge print-badge-${t.tipo}">${isIncome ? trans.income : trans.expense}</span></td>
                    <td>${t.categoria || '-'}</td>
                    <td class="${isIncome ? 'print-td-income' : 'print-td-expense'}" style="text-align:right;">
                        ${isIncome ? '+' : '-'} ${formatCurrency(t.monto).replace('RD$', 'RD$ ')}
                    </td>
                </tr>
            `;
        });
        
        tContentHTML = `
            <div class="print-section-title">${trans.transactionsTitle}</div>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>${trans.date}</th>
                        <th>${trans.concept}</th>
                        <th>${trans.type}</th>
                        <th>${trans.category}</th>
                        <th style="text-align:right;">${trans.amount}</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }
    
    const reportTitle = isAllMonths ? trans.annualReport : trans.monthlyReport;
    const periodText = isAllMonths ? `${trans.period}: ${selYear}` : `${trans.months[selMonth]} ${selYear}`;
    const balanceLabel = isAllMonths ? trans.annualBalance : trans.monthlyBalance;
    
    // Detectar si es dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    
    if (isMobile) {
        // === MÓVIL: Abrir ventana nueva con documento HTML completo e independiente ===
        const reportHTML = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #000000;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .print-report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000000;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .print-report-header h1 {
            font-size: 20pt;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .print-report-header p {
            font-size: 10pt;
            color: #555555;
        }
        .print-report-header-right {
            text-align: right;
            flex-shrink: 0;
        }
        .print-date {
            font-size: 12pt;
            font-weight: 600;
        }
        .print-subtitle {
            font-size: 9pt;
            color: #666666;
            margin-top: 4px;
        }
        .print-summary-grid {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 30px;
        }
        .print-summary-card {
            flex: 1;
            border: 1px solid #dddddd;
            padding: 12px;
            border-radius: 6px;
            background-color: #fafafa;
        }
        .print-summary-card h3 {
            font-size: 9pt;
            color: #555555;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .print-summary-card .amount {
            font-size: 14pt;
            font-weight: 700;
        }
        .print-card-income .amount { color: #00875a; }
        .print-card-expense .amount { color: #de350b; }
        .print-card-balance .amount { color: #0052cc; }
        .print-section-title {
            font-size: 14pt;
            font-weight: 600;
            margin-bottom: 10px;
            border-bottom: 1px solid #dddddd;
            padding-bottom: 5px;
        }
        .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .print-table th,
        .print-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #dddddd;
            font-size: 10pt;
            text-align: left;
        }
        .print-table th {
            font-weight: 600;
            background-color: #f0f0f0;
        }
        .print-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 600;
            text-transform: uppercase;
            border: 1px solid #cccccc;
        }
        .print-badge-ingreso { background-color: #e3fcef; color: #006644; border-color: #abf5d1; }
        .print-badge-gasto { background-color: #ffebe6; color: #bf2600; border-color: #ffbdad; }
        .print-td-income { color: #006644; font-weight: 600; }
        .print-td-expense { color: #bf2600; font-weight: 600; }
        .print-report-footer {
            border-top: 1px dashed #cccccc;
            padding-top: 15px;
            text-align: center;
            font-size: 8pt;
            color: #777777;
            margin-top: 40px;
        }
        @media print {
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="print-report-header">
        <div class="print-report-header-left">
            <h1>${reportTitle}</h1>
            <p>${trans.subtitle}</p>
        </div>
        <div class="print-report-header-right">
            <div class="print-date">${isAllMonths ? periodText : `${trans.period}: ${periodText}`}</div>
            <div class="print-subtitle">${trans.generated}: ${dateToday}</div>
        </div>
    </div>
    
    <div class="print-summary-grid">
        <div class="print-summary-card print-card-income">
            <h3>${trans.totalIncome}</h3>
            <div class="amount">${formatCurrency(totalIncome).replace('RD$', 'RD$ ')}</div>
        </div>
        <div class="print-summary-card print-card-expense">
            <h3>${trans.totalExpense}</h3>
            <div class="amount">${formatCurrency(totalExpense).replace('RD$', 'RD$ ')}</div>
        </div>
        <div class="print-summary-card print-card-balance">
            <h3>${balanceLabel}</h3>
            <div class="amount">${formatCurrency(balance).replace('RD$', 'RD$ ')}</div>
        </div>
    </div>
    
    ${tContentHTML}
    
    <div class="print-report-footer">
        <p>${trans.footer}</p>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 400);
        };
    </script>
</body>
</html>`;
        
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(reportHTML);
            reportWindow.document.close();
            showToast('Reporte generado. Se abrió en una nueva pestaña.', 'success');
        } else {
            // Fallback si el navegador bloquea pop-ups
            const blob = new Blob([reportHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.click();
            URL.revokeObjectURL(url);
            showToast('Reporte generado. Si no se abrió, permite las ventanas emergentes.', 'info');
        }
        
    } else {
        // === PC/ESCRITORIO: Método original directo con window.print() ===
        const printContainer = document.getElementById('print-report-container');
        printContainer.innerHTML = `
            <div class="print-report-wrapper">
                <div class="print-report-header">
                    <div class="print-report-header-left">
                        <h1>${reportTitle}</h1>
                        <p>${trans.subtitle}</p>
                    </div>
                    <div class="print-report-header-right">
                        <div class="print-date">${isAllMonths ? periodText : `${trans.period}: ${periodText}`}</div>
                        <div class="print-subtitle">${trans.generated}: ${dateToday}</div>
                    </div>
                </div>
                
                <div class="print-summary-grid">
                    <div class="print-summary-card print-card-income">
                        <h3>${trans.totalIncome}</h3>
                        <div class="amount">${formatCurrency(totalIncome).replace('RD$', 'RD$ ')}</div>
                    </div>
                    <div class="print-summary-card print-card-expense">
                        <h3>${trans.totalExpense}</h3>
                        <div class="amount">${formatCurrency(totalExpense).replace('RD$', 'RD$ ')}</div>
                    </div>
                    <div class="print-summary-card print-card-balance">
                        <h3>${balanceLabel}</h3>
                        <div class="amount">${formatCurrency(balance).replace('RD$', 'RD$ ')}</div>
                    </div>
                </div>
                
                ${tContentHTML}
                
                <div class="print-report-footer">
                    <p>${trans.footer}</p>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            window.print();
            printContainer.innerHTML = '';
        }, 100);
        
        showToast('Diálogo de impresión (PDF) abierto.', 'success');
    }
}

// 4. Importar Respaldo (Selección y Parseo)
function handleImportCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar extensión
    if (!file.name.endsWith('.csv')) {
        showToast('El archivo seleccionado debe ser de formato CSV.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        parseAndValidateCsv(text);
    };
    reader.onerror = function() {
        showToast('Error al leer el archivo seleccionado.', 'error');
    };
    reader.readAsText(file, 'UTF-8');
}

function parseAndValidateCsv(content) {
    parsedCsvTransactionsToImport = [];
    
    // Separar líneas limpiando retornos de carro
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
        showToast('El archivo CSV está vacío o incompleto.', 'error');
        return;
    }
    
    // Analizar encabezado (primera línea)
    // Buscamos: fecha,concepto,tipo,categoria,monto
    const headerLine = lines[0].replace(/^\uFEFF/, '').trim().toLowerCase(); // Quitar BOM
    const headers = headerLine.split(',');
    
    if (headers.length !== 5) {
        showToast('Formato de CSV inválido. Debe contener exactamente 5 columnas.', 'error');
        return;
    }
    
    let errorCount = 0;
    let validCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Saltar líneas vacías
        
        const row = splitCsvLine(line);
        if (row.length !== 5) {
            errorCount++;
            continue;
        }
        
        const [fecha, concepto, tipo, categoria, montoRaw] = row.map(s => s.trim());
        const monto = parseFloat(montoRaw);
        const tipoNorm = tipo.toLowerCase();
        
        // Validaciones individuales de datos
        const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
        const isConceptValid = concepto.length > 0;
        const isTypeValid = tipoNorm === 'ingreso' || tipoNorm === 'gasto';
        const isCategoryValid = categoria.length > 0;
        const isAmountValid = !isNaN(monto) && monto > 0;
        
        if (isDateValid && isConceptValid && isTypeValid && isCategoryValid && isAmountValid) {
            parsedCsvTransactionsToImport.push({
                id: 't-' + (Date.now() + i) + '-' + Math.random().toString(36).substr(2, 9),
                fecha: fecha,
                concepto: concepto,
                tipo: tipoNorm,
                categoria: categoria,
                monto: monto,
                createdAt: new Date().toISOString()
            });
            validCount++;
        } else {
            errorCount++;
        }
    }
    
    if (validCount === 0) {
        showToast('No se encontraron transacciones válidas en el archivo.', 'error');
        parsedCsvTransactionsToImport = [];
        return;
    }
    
    // Preparar texto de estadísticas en el modal
    let statsMessage = `Se encontraron <strong>${validCount}</strong> transacciones válidas para importar.`;
    if (errorCount > 0) {
        statsMessage += `<br><span style="color: var(--expense-color);">Se omitieron <strong>${errorCount}</strong> filas debido a errores de formato.</span>`;
    }
    statsMessage += `<br><br>¿Estás seguro de que deseas proceder? Los datos actuales del navegador serán reemplazados por completo.`;
    
    importStatsText.innerHTML = statsMessage;
    openModal(modalImport);
}

function executeImportCsv() {
    if (parsedCsvTransactionsToImport.length === 0) return;
    
    // Guardar lista
    transactions = parsedCsvTransactionsToImport;
    saveTransactions();
    
    // Guardar timestamp de última importación
    localStorage.setItem('ultimaImportacion', new Date().toISOString());
    
    // Actualizar filtros
    const now = new Date();
    initFilters();
    
    closeModal(modalImport);
    showToast('Datos importados correctamente.', 'success');
    parsedCsvTransactionsToImport = [];
    
    render();
}

// --- MODALES (MOSTRAR Y OCULTAR) ---

function openModal(modalEl) {
    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
}

function closeModal(modalEl) {
    modalEl.classList.remove('active');
    document.body.style.overflow = '';
}

// --- UTILIDADES ---

function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatCurrency(amount) {
    const val = parseFloat(amount);
    if (isNaN(val)) return 'RD$0.00';
    return 'RD$' + val.toLocaleString('es-DO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDateString(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    // Retorna DD/MM/YYYY
    return `${day}/${month}/${year}`;
}

function escapeCSVField(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Si contiene comas o comillas dobles, escapar
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Parsea una línea de CSV teniendo en cuenta campos con comillas y comas internas
function splitCsvLine(line) {
    const result = [];
    let curVal = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            // Verificar si es comilla doble escapada
            if (inQuotes && line[i + 1] === '"') {
                curVal += '"';
                i++; // Saltar la siguiente comilla
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(curVal);
            curVal = '';
        } else {
            curVal += char;
        }
    }
    result.push(curVal);
    return result;
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Iconos para toast
    let svgIcon = '';
    if (type === 'success') {
        svgIcon = `
            <svg class="toast-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--income-color);">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `;
    } else if (type === 'error') {
        svgIcon = `
            <svg class="toast-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--expense-color);">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        `;
    } else {
        svgIcon = `
            <svg class="toast-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--primary-color);">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
        `;
    }
    
    toast.innerHTML = `
        ${svgIcon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Desvanecer y remover después de 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                container.removeChild(toast);
            }
        }, 400);
    }, 3000);
}

// --- SISTEMA DE CATEGORÍAS PERSONALIZABLES ---

function renderCategoryDatalists() {
    const tDatalist = document.getElementById('t-category-list');
    if (tDatalist) {
        tDatalist.innerHTML = '';
        treasuryCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            tDatalist.appendChild(opt);
        });
    }
    
    const pfDatalist = document.getElementById('pf-category-list');
    if (pfDatalist) {
        pfDatalist.innerHTML = '';
        personalCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            pfDatalist.appendChild(opt);
        });
    }
}

function renderCategoryManagerList() {
    const listContainer = document.getElementById('mc-category-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const currentList = currentCategoryModule === 'tesoreria' ? treasuryCategories : personalCategories;
    
    if (currentList.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 9.5pt; padding: 15px 0;">No hay categorías configuradas.</p>';
        return;
    }
    
    currentList.forEach((cat, idx) => {
        const row = document.createElement('div');
        row.className = 'category-item-row';
        
        row.innerHTML = `
            <div class="category-item-left">
                <div class="category-color-dot" style="background-color: ${cat.color};"></div>
                <span class="category-item-name">${cat.name}</span>
            </div>
            <div class="category-item-actions">
                <button class="btn-cat-action btn-cat-edit" data-index="${idx}" title="Editar" type="button">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-cat-action btn-cat-delete" data-index="${idx}" title="Eliminar" type="button">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;
        listContainer.appendChild(row);
    });
    
    listContainer.querySelectorAll('.btn-cat-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            editCategoryInManager(idx);
        });
    });
    
    listContainer.querySelectorAll('.btn-cat-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            deleteCategoryInManager(idx);
        });
    });
}

function editCategoryInManager(idx) {
    const currentList = currentCategoryModule === 'tesoreria' ? treasuryCategories : personalCategories;
    const cat = currentList[idx];
    
    const nameInput = document.getElementById('mc-category-name');
    const indexInput = document.getElementById('mc-category-index');
    const formTitle = document.getElementById('mc-form-title');
    const submitBtnSpan = document.querySelector('#btn-mc-submit span');
    
    nameInput.value = cat.name;
    indexInput.value = idx;
    formTitle.textContent = 'Editar Categoría';
    submitBtnSpan.textContent = 'Guardar';
    
    selectMcColor(cat.color);
}

async function deleteCategoryInManager(idx) {
    const currentList = currentCategoryModule === 'tesoreria' ? treasuryCategories : personalCategories;
    const catName = currentList[idx].name;
    
    currentList.splice(idx, 1);
    
    if (currentCategoryModule === 'tesoreria') {
        treasuryCategories = currentList;
        await saveTransactions();
    } else {
        personalCategories = currentList;
        await savePersonalFinances();
    }
    
    resetMcForm();
    renderCategoryManagerList();
    renderCategoryDatalists();
    render();
    renderPersonalFinances();
    
    showToast(`Categoría "${catName}" eliminada con éxito.`, 'success');
}

async function handleMcCategorySubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('mc-category-name');
    const indexInput = document.getElementById('mc-category-index');
    const colorInput = document.getElementById('mc-selected-color');
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    const idx = parseInt(indexInput.value);
    
    if (!name) return;
    
    const currentList = currentCategoryModule === 'tesoreria' ? treasuryCategories : personalCategories;
    
    const exists = currentList.some((cat, i) => cat.name.toLowerCase() === name.toLowerCase() && i !== idx);
    if (exists) {
        showToast('Ya existe una categoría con ese nombre.', 'error');
        return;
    }
    
    if (idx === -1) {
        currentList.push({ name, color });
        showToast(`Categoría "${name}" agregada con éxito.`, 'success');
    } else {
        const oldName = currentList[idx].name;
        currentList[idx] = { name, color };
        
        if (currentCategoryModule === 'tesoreria') {
            transactions.forEach(t => {
                if (t.categoria === oldName) t.categoria = name;
            });
        } else {
            personalExpenses.forEach(pe => {
                if (pe.categoria === oldName) pe.categoria = name;
            });
        }
        showToast(`Categoría "${name}" actualizada con éxito.`, 'success');
    }
    
    if (currentCategoryModule === 'tesoreria') {
        treasuryCategories = currentList;
        await saveTransactions();
    } else {
        personalCategories = currentList;
        await savePersonalFinances();
    }
    
    resetMcForm();
    renderCategoryManagerList();
    renderCategoryDatalists();
    render();
    renderPersonalFinances();
}

function resetMcForm() {
    const nameInput = document.getElementById('mc-category-name');
    const indexInput = document.getElementById('mc-category-index');
    const formTitle = document.getElementById('mc-form-title');
    const submitBtnSpan = document.querySelector('#btn-mc-submit span');
    
    if (nameInput) nameInput.value = '';
    if (indexInput) indexInput.value = '-1';
    if (formTitle) formTitle.textContent = 'Agregar Nueva Categoría';
    if (submitBtnSpan) submitBtnSpan.textContent = 'Agregar';
    
    const colors = [
        '#10b981', '#3b82f6', '#6366f1', '#7c3aed', 
        '#ec4899', '#ef4444', '#f97316', '#f59e0b', 
        '#eab308', '#14b8a6', '#06b6d4', '#6b7280'
    ];
    selectMcColor(colors[0]);
}

function renderMcColorPicker() {
    const colorGrid = document.getElementById('mc-color-grid');
    if (!colorGrid) return;
    
    colorGrid.innerHTML = '';
    const colors = [
        '#10b981', '#3b82f6', '#6366f1', '#7c3aed', 
        '#ec4899', '#ef4444', '#f97316', '#f59e0b', 
        '#eab308', '#14b8a6', '#06b6d4', '#6b7280'
    ];
    
    colors.forEach(col => {
        const circle = document.createElement('div');
        circle.className = 'color-circle';
        circle.style.backgroundColor = col;
        circle.setAttribute('data-color', col);
        
        circle.addEventListener('click', () => {
            selectMcColor(col);
        });
        
        colorGrid.appendChild(circle);
    });
}

function selectMcColor(color) {
    const selectedColorInput = document.getElementById('mc-selected-color');
    if (selectedColorInput) selectedColorInput.value = color;
    
    const colorGrid = document.getElementById('mc-color-grid');
    if (colorGrid) {
        colorGrid.querySelectorAll('.color-circle').forEach(circle => {
            if (circle.getAttribute('data-color') === color) {
                circle.classList.add('selected');
            } else {
                circle.classList.remove('selected');
            }
        });
    }
}

function renderPfCharts() {
    // Verificar si Chart.js está cargado
    if (typeof Chart === 'undefined') return;
    
    // Obtener variables de período
    const isAllMonths = pfFilterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(pfFilterMonth.value);
    const selYear = parseInt(pfFilterYear.value);
    
    // ----------------------------------------------------
    // 1. CONFIGURACIÓN DEL GRÁFICO DE DONA (DONUT)
    // ----------------------------------------------------
    const donutCanvas = document.getElementById('pf-donut-chart');
    const donutEmpty = document.getElementById('pf-donut-empty');
    
    if (donutCanvas) {
        // Filtrar gastos del período seleccionado
        const currentPeriodExpenses = personalExpenses.filter(e => {
            if (!e.fecha) return false;
            const [y, m] = e.fecha.split('-').map(Number);
            return y === selYear && (isAllMonths || (m - 1) === selMonth);
        });
        
        // Destruir instancia anterior si existe
        if (pfDonutChartInstance) {
            pfDonutChartInstance.destroy();
            pfDonutChartInstance = null;
        }
        
        if (currentPeriodExpenses.length === 0) {
            if (donutEmpty) donutEmpty.classList.remove('hidden-element');
            donutCanvas.style.display = 'none';
        } else {
            if (donutEmpty) donutEmpty.classList.add('hidden-element');
            donutCanvas.style.display = 'block';
            
            // Agrupar por categoría
            const grouped = {};
            currentPeriodExpenses.forEach(e => {
                const catName = e.categoria || 'Otros';
                const amt = parseFloat(e.monto) || 0;
                grouped[catName] = (grouped[catName] || 0) + amt;
            });
            
            const categories = Object.keys(grouped);
            const values = Object.values(grouped);
            
            // Obtener colores
            const colors = categories.map(catName => {
                const found = personalCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                return found ? found.color : '#6b7280';
            });
            
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
            const cardBgColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#ffffff';
            
            const ctxDonut = donutCanvas.getContext('2d');
            pfDonutChartInstance = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: cardBgColor
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: {
                                    size: 10,
                                    family: 'Poppins'
                                },
                                boxWidth: 10,
                                padding: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = ((val / total) * 100).toFixed(1);
                                    return ` RD$ ${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${pct}%)`;
                                }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }
    
    // ----------------------------------------------------
    // 2. CONFIGURACIÓN DEL GRÁFICO DE BARRAS COMPARATIVO
    // ----------------------------------------------------
    const barCanvas = document.getElementById('pf-bar-chart');
    if (barCanvas) {
        if (pfBarChartInstance) {
            pfBarChartInstance.destroy();
            pfBarChartInstance = null;
        }
        
        // Calcular ingresos y gastos mensuales para el año seleccionado
        const monthlyIncomes = Array(12).fill(0);
        const monthlyExpenses = Array(12).fill(0);
        
        // Cargar ingresos mensuales
        for (let m = 0; m < 12; m++) {
            const monthStr = String(m + 1).padStart(2, '0');
            const key = `${selYear}-${monthStr}`;
            monthlyIncomes[m] = parseFloat(personalIncomes[key]) || 0;
        }
        
        // Cargar gastos mensuales (agrupados por mes)
        personalExpenses.forEach(e => {
            if (!e.fecha) return;
            const [y, m] = e.fecha.split('-').map(Number);
            if (y === selYear) {
                const mIdx = m - 1;
                if (mIdx >= 0 && mIdx < 12) {
                    monthlyExpenses[mIdx] += parseFloat(e.monto) || 0;
                }
            }
        });
        
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
        const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#888888';
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#333333';
        
        const ctxBar = barCanvas.getContext('2d');
        pfBarChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [
                    {
                        label: 'Presupuesto',
                        data: monthlyIncomes,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    },
                    {
                        label: 'Gastos',
                        data: monthlyExpenses,
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: {
                                size: 10,
                                family: 'Poppins'
                              },
                            boxWidth: 10,
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                return ` ${context.dataset.label}: RD$ ${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textMuted,
                            font: { size: 9, family: 'Poppins' }
                        }
                    },
                    y: {
                        grid: {
                            color: borderColor
                        },
                        ticks: {
                            color: textMuted,
                            font: { size: 9, family: 'Poppins' },
                            callback: function(val) {
                                return val >= 1000 ? (val / 1000) + 'k' : val;
                            }
                        }
                    }
                }
            }
        });
    }
}

function closePfAutocomplete() {
    if (pfAutocompleteList) {
        pfAutocompleteList.innerHTML = '';
    }
}

function handlePfConceptInput() {
    const val = pfConcept.value;
    const valNorm = normalizeText(val);
    closePfAutocomplete();
    
    if (!valNorm) {
        if (!userEditedPfCategory) {
            if (pfCategory) pfCategory.value = '';
        }
        return;
    }
    
    // Obtener conceptos únicos de los valores por defecto
    const conceptMap = new Map();
    DEFAULT_PF_CONCEPT_CATEGORIES.forEach(item => {
        conceptMap.set(normalizeText(item.concepto), {
            original: item.concepto,
            categoria: item.categoria
        });
    });
    
    // Historial de gastos reales de Finanzas Personales
    personalExpenses.forEach(e => {
        const conceptNorm = e.concepto.trim();
        if (conceptNorm) {
            conceptMap.set(normalizeText(conceptNorm), {
                original: conceptNorm,
                categoria: e.categoria || ''
            });
        }
    });
    
    const uniqueConcepts = Array.from(conceptMap.values()).filter(x => x.categoria);
    
    // Buscar coincidencias parciales con el texto normalizado
    const matches = uniqueConcepts.filter(item => 
        normalizeText(item.original).includes(valNorm)
    ).slice(0, 5); // Máximo 5 sugerencias
    
    if (matches.length > 0) {
        matches.forEach(match => {
            const div = document.createElement('div');
            
            // Resaltar el fragmento coincidente
            const origLower = match.original.toLowerCase();
            const valLower = val.toLowerCase();
            const index = origLower.indexOf(valLower);
            
            if (index !== -1) {
                const before = match.original.substring(0, index);
                const matchText = match.original.substring(index, index + val.length);
                const after = match.original.substring(index + val.length);
                div.innerHTML = `${before}<strong>${matchText}</strong>${after}`;
            } else {
                div.textContent = match.original;
            }
            
            div.addEventListener('click', () => {
                pfConcept.value = match.original;
                if (pfCategory) pfCategory.value = match.categoria;
                userEditedPfCategory = false; // Resetear bandera
                closePfAutocomplete();
                showToast('Categoría autocompletada', 'info');
            });
            
            pfAutocompleteList.appendChild(div);
        });
    }
    
    // Autocompletado directo en el campo categoría por palabras clave
    if (!userEditedPfCategory && pfCategory) {
        const bestMatch = uniqueConcepts.find(item => normalizeText(item.original).startsWith(valNorm)) ||
                          uniqueConcepts.find(item => normalizeText(item.original).includes(valNorm));
        
        if (bestMatch) {
            pfCategory.value = bestMatch.categoria;
        } else {
            let matchedCategoryByKeyword = null;
            for (const rule of KEYWORD_PF_CATEGORY_RULES) {
                const found = rule.keywords.some(kw => valNorm.includes(normalizeText(kw)));
                if (found) {
                    matchedCategoryByKeyword = rule.categoria;
                    break;
                }
            }
            
            if (matchedCategoryByKeyword) {
                pfCategory.value = matchedCategoryByKeyword;
            }
        }
    }
}

function renderTCharts() {
    // Verificar si Chart.js está cargado
    if (typeof Chart === 'undefined') return;
    
    // Obtener variables de período
    const isAllMonths = filterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(filterMonth.value);
    const selYear = parseInt(filterYear.value);
    
    // ----------------------------------------------------
    // 1. CONFIGURACIÓN DEL GRÁFICO DE DONA (DONUT)
    // ----------------------------------------------------
    const donutCanvas = document.getElementById('t-donut-chart');
    const donutEmpty = document.getElementById('t-donut-empty');
    
    if (donutCanvas) {
        // Filtrar transacciones de gastos del período seleccionado
        const currentPeriodExpenses = transactions.filter(t => {
            if (!t.fecha || t.tipo !== 'gasto') return false;
            const [y, m] = t.fecha.split('-').map(Number);
            return y === selYear && (isAllMonths || (m - 1) === selMonth);
        });
        
        // Destruir instancia anterior si existe
        if (tDonutChartInstance) {
            tDonutChartInstance.destroy();
            tDonutChartInstance = null;
        }
        
        if (currentPeriodExpenses.length === 0) {
            if (donutEmpty) donutEmpty.classList.remove('hidden-element');
            donutCanvas.style.display = 'none';
        } else {
            if (donutEmpty) donutEmpty.classList.add('hidden-element');
            donutCanvas.style.display = 'block';
            
            // Agrupar por categoría
            const grouped = {};
            currentPeriodExpenses.forEach(t => {
                const catName = t.categoria || 'Otros';
                const amt = parseFloat(t.monto) || 0;
                grouped[catName] = (grouped[catName] || 0) + amt;
            });
            
            const categories = Object.keys(grouped);
            const values = Object.values(grouped);
            
            // Obtener colores
            const colors = categories.map(catName => {
                const found = treasuryCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                return found ? found.color : '#6b7280';
            });
            
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
            const cardBgColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#ffffff';
            
            const ctxDonut = donutCanvas.getContext('2d');
            tDonutChartInstance = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: cardBgColor
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: {
                                    size: 10,
                                    family: 'Poppins'
                                },
                                boxWidth: 10,
                                padding: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = ((val / total) * 100).toFixed(1);
                                    return ` RD$ ${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${pct}%)`;
                                }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }
    
    // ----------------------------------------------------
    // 2. CONFIGURACIÓN DEL GRÁFICO DE LÍNEA DE TENDENCIA
    // ----------------------------------------------------
    const barCanvas = document.getElementById('t-bar-chart');
    if (barCanvas) {
        if (tBarChartInstance) {
            tBarChartInstance.destroy();
            tBarChartInstance = null;
        }
        
        // Calcular ingresos y gastos mensuales para el año seleccionado
        const monthlyNet = Array(12).fill(0);
        
        // Cargar montos mensuales de transacciones (Ingresos - Gastos)
        transactions.forEach(t => {
            if (!t.fecha) return;
            const [y, m] = t.fecha.split('-').map(Number);
            if (y === selYear) {
                const mIdx = m - 1;
                if (mIdx >= 0 && mIdx < 12) {
                    const amt = parseFloat(t.monto) || 0;
                    if (t.tipo === 'ingreso') {
                        monthlyNet[mIdx] += amt;
                    } else if (t.tipo === 'gasto') {
                        monthlyNet[mIdx] -= amt;
                    }
                }
            }
        });
        
        // Calcular el balance acumulado mes a mes
        const cumulativeBalances = [];
        let runningSum = 0;
        for (let m = 0; m < 12; m++) {
            runningSum += monthlyNet[m];
            cumulativeBalances.push(runningSum);
        }
        
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
        const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#888888';
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#333333';
        
        const ctxBar = barCanvas.getContext('2d');
        
        // Crear gradiente de fondo
        const gradient = ctxBar.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.18)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.00)');
        
        tBarChartInstance = new Chart(ctxBar, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Balance Acumulado',
                    data: cumulativeBalances,
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Ocultar leyenda ya que es una sola serie de datos obvia
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                return ` Balance: RD$ ${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textMuted,
                            font: { size: 9, family: 'Poppins' }
                        }
                    },
                    y: {
                        grid: {
                            color: borderColor
                        },
                        ticks: {
                            color: textMuted,
                            font: { size: 9, family: 'Poppins' },
                            callback: function(val) {
                                if (Math.abs(val) >= 1000) {
                                    return (val / 1000) + 'k';
                                }
                                return val;
                            }
                        }
                    }
                }
            }
        });
    }
}

// --- SELECTOR DE IDIOMA PERSONALIZADO (GOOGLE TRANSLATE - COOKIE + RELOAD) ---

const LANG_NAMES = {
    es: 'Español', en: 'English', fr: 'Français',
    pt: 'Português', it: 'Italiano', de: 'Deutsch'
};

function getCurrentLangFromCookie() {
    const match = document.cookie.match(/googtrans=\/es\/([a-z]+)/);
    return (match && match[1] !== 'es') ? match[1] : 'es';
}

function changeGoogleTranslateLanguage(langCode) {
    // Escribir cookies en path raíz y dominio local (el único método confiable)
    document.cookie = `googtrans=/es/${langCode}; path=/;`;
    document.cookie = `googtrans=/es/${langCode}; path=/; domain=${window.location.hostname};`;

    // Mostrar un toast de aviso antes de recargar
    const langName = LANG_NAMES[langCode] || langCode.toUpperCase();
    showToast(`Aplicando idioma: ${langName}...`, 'info');

    // Pequeño delay para que el toast sea visible, luego recargar
    setTimeout(() => {
        window.location.reload();
    }, 600);
}

function syncLanguageSelectorUI() {
    const currentLangText = document.getElementById('current-lang-code');
    const options = document.querySelectorAll('.translate-option');
    if (!currentLangText) return false;

    const activeLang = getCurrentLangFromCookie();
    currentLangText.textContent = activeLang.toUpperCase();

    options.forEach(opt => {
        if (opt.getAttribute('data-lang') === activeLang) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
    return true;
}

function initCustomLanguageSelector() {
    const triggerBtn = document.getElementById('translate-trigger-btn');
    const dropdown = document.getElementById('custom-translate-dropdown');
    const options = document.querySelectorAll('.translate-option');

    if (!triggerBtn || !dropdown) return;

    // Sincronizar UI con el idioma activo (leído de la cookie)
    syncLanguageSelectorUI();

    triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        triggerBtn.setAttribute('aria-expanded', dropdown.classList.contains('active'));
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.getAttribute('data-lang');
            dropdown.classList.remove('active');
            triggerBtn.setAttribute('aria-expanded', 'false');
            changeGoogleTranslateLanguage(lang);
        });
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            triggerBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

function updateScrollTopButtonVisibility() {
    const btnScrollTop = document.getElementById('btn-scroll-top');
    if (!btnScrollTop) return;
    
    // El botón se habilita únicamente si el usuario está logueado, dentro de los módulos
    // (tesoreria o personales), y ha scrolled down más de 300px
    const isInsideModule = currentUser && (currentModule === 'tesoreria' || currentModule === 'personales');
    if (isInsideModule && window.scrollY > 300) {
        btnScrollTop.classList.add('visible');
    } else {
        btnScrollTop.classList.remove('visible');
    }
}


