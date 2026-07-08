import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- ESTADO DE LA APLICACIÓN ---
let transactions = [];
let currentUser = null;
let selectedTransactionIdToDelete = null;
let parsedCsvTransactionsToImport = [];
let editingTransactionId = null;
let userEditedCategory = false;

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


// --- ELEMENTOS DEL DOM ---
const warningBanner = document.getElementById('warning-banner');
const closeBannerBtn = document.getElementById('close-banner-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Elementos de Auth
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
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

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configurar Banner de Advertencia
    initWarningBanner();
    
    // 2. Configurar selector de fecha (valor por defecto: hoy, max: hoy)
    const todayStr = getTodayString();
    inputDate.value = todayStr;
    inputDate.max = todayStr;
    
    // 3. Configurar manejadores de eventos
    setupEventListeners();
});

// --- ESCUCHAR ESTADO DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Actualizar perfil de la barra superior
        if (userPhoto) userPhoto.src = user.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        if (userName) userName.textContent = user.displayName || user.email;
        if (userProfile) userProfile.classList.remove('hidden-element');
        
        // Mostrar dashboard y ocultar login
        loginSection.classList.add('hidden-element');
        dashboardContainer.classList.remove('hidden-element');
        
        // Cargar transacciones
        await loadTransactions();
        
        // Configurar filtros basándose en las transacciones cargadas
        initFilters();
        
        // Renderizar interfaz
        render();
    } else {
        currentUser = null;
        transactions = [];
        
        // Ocultar perfil
        if (userProfile) userProfile.classList.add('hidden-element');
        
        // Mostrar login, ocultar dashboard
        loginSection.classList.remove('hidden-element');
        dashboardContainer.classList.add('hidden-element');
        
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
    } catch (e) {
        console.error('Error cargando transacciones desde localStorage', e);
        transactions = [];
    }
    
    // 2. Si hay sesión iniciada en la nube, sincronizar con Firestore
    if (currentUser && db) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            
            if (docSnap.exists()) {
                const cloudData = docSnap.data().transactions || [];
                transactions = cloudData;
                // Actualizar caché local
                localStorage.setItem('transacciones', JSON.stringify(transactions));
            } else {
                // Si no hay datos en la nube pero sí locales, subirlos (migración automática)
                if (transactions.length > 0) {
                    showToast('Sincronizando tus datos locales con la nube...', 'info');
                    await saveTransactions();
                }
            }
        } catch (error) {
            console.error("Error al cargar de Firestore: ", error);
            showToast('Error al cargar datos en la nube. Usando copia local.', 'warning');
        }
    }
}

async function saveTransactions() {
    // 1. Guardar localmente siempre como copia de respaldo
    try {
        localStorage.setItem('transacciones', JSON.stringify(transactions));
    } catch (e) {
        console.error('Error guardando transacciones en localStorage', e);
    }
    
    // 2. Guardar en la nube si está autenticado
    if (currentUser && db) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, {
                transactions: transactions,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error al guardar en Firestore: ", error);
            showToast('Error al guardar datos en la nube.', 'error');
        }
    }
}

function initWarningBanner() {
    const isDismissed = localStorage.getItem('warning-banner-dismissed');
    if (isDismissed === 'true') {
        warningBanner.style.display = 'none';
    } else {
        warningBanner.style.display = 'flex';
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

// --- EVENT LISTENERS ---

function setupEventListeners() {
    // Banner de advertencia
    closeBannerBtn.addEventListener('click', () => {
        warningBanner.style.display = 'none';
        localStorage.setItem('warning-banner-dismissed', 'true');
    });
    
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
}

// --- LOGICA DE CAMBIO DE TEMA ---

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
    showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
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
            tdCategoria.textContent = t.categoria || '-';
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
    localStorage.removeItem('warning-banner-dismissed');
    
    // Restablecer filtros
    initFilters();
    initWarningBanner();
    
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

// 3. Generar Reporte Mensual (PDF/Impresión)
// 3. Generar Reporte Mensual/Anual (PDF/Impresión)
function downloadMonthlyReport() {
    const isAllMonths = filterMonth.value === 'all';
    const selMonth = isAllMonths ? null : parseInt(filterMonth.value);
    const selYear = parseInt(filterYear.value);
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    // Filtrar y ordenar
    const filtered = transactions.filter(t => {
        if (!t.fecha) return false;
        const [year, month] = t.fecha.split('-').map(Number);
        return year === selYear && (isAllMonths || (month - 1) === selMonth);
    });
    
    if (filtered.length === 0) {
        showToast(isAllMonths ? 'No hay transacciones registradas para este año.' : 'No hay transacciones registradas para este mes.', 'error');
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
    
    // Construir estructura del reporte para el contenedor de impresión
    const printContainer = document.getElementById('print-report-container');
    const dateToday = getTodayString().split('-').reverse().join('/');
    
    let tableRows = '';
    filtered.forEach(t => {
        const isIncome = t.tipo === 'ingreso';
        tableRows += `
            <tr>
                <td>${formatDateString(t.fecha)}</td>
                <td>${t.concepto}</td>
                <td><span class="print-badge print-badge-${t.tipo}">${isIncome ? 'Ingreso' : 'Gasto'}</span></td>
                <td>${t.categoria || '-'}</td>
                <td class="${isIncome ? 'print-td-income' : 'print-td-expense'} text-right">
                    ${isIncome ? '+' : '-'} ${formatCurrency(t.monto).replace('RD$', 'RD$ ')}
                </td>
            </tr>
        `;
    });
    
    const reportTitle = isAllMonths ? 'Reporte Anual de Tesorería' : 'Reporte Mensual de Tesorería';
    const periodText = isAllMonths ? `Año ${selYear}` : `${monthNames[selMonth]} ${selYear}`;
    const balanceLabel = isAllMonths ? 'Saldo del Año' : 'Saldo del Mes';
    
    printContainer.innerHTML = `
        <div class="print-report-wrapper">
            <div class="print-report-header">
                <div class="print-report-header-left">
                    <h1>${reportTitle}</h1>
                    <p>Detalle de ingresos y gastos de la tesorería juvenil</p>
                </div>
                <div class="print-report-header-right">
                    <div class="print-date">Período: ${periodText}</div>
                    <div class="print-subtitle">Generado el: ${dateToday}</div>
                </div>
            </div>
            
            <div class="print-summary-grid">
                <div class="print-summary-card print-card-income">
                    <h3>Total Ingresos</h3>
                    <div class="amount">${formatCurrency(totalIncome).replace('RD$', 'RD$ ')}</div>
                </div>
                <div class="print-summary-card print-card-expense">
                    <h3>Total Gastos</h3>
                    <div class="amount">${formatCurrency(totalExpense).replace('RD$', 'RD$ ')}</div>
                </div>
                <div class="print-summary-card print-card-balance">
                    <h3>${balanceLabel}</h3>
                    <div class="amount">${formatCurrency(balance).replace('RD$', 'RD$ ')}</div>
                </div>
            </div>
            
            <div class="print-section-title">Transacciones del período</div>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Tipo</th>
                        <th>Categoría</th>
                        <th class="text-right">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div class="print-report-footer">
                <p>Reporte de Tesorería Juvenil oficial - Generado de forma local y privada.</p>
            </div>
        </div>
    `;
    
    // Lanzar diálogo de impresión de forma asíncrona para permitir la renderización previa
    setTimeout(() => {
        window.print();
        // Limpiar el contenedor después de imprimir
        printContainer.innerHTML = '';
    }, 100);
    
    showToast('Diálogo de impresión (PDF) abierto.', 'success');
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
