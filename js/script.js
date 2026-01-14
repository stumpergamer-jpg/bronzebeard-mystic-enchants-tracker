/*
 * Copyright (C) 2026 Stumper_Gaming
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
// Cette configuration doit impérativement être placée AVANT le chargement du script power.js
var whTooltips = {
    iconizeLinks: false,
    renameLinks: false,
    colorLinks: true,      // Active la couleur de rareté automatique
    forcePosition: true,   // Empêche le débordement hors de l'écran
    applyToLinks: true,
    fixedWidth: false      // Désactive la largeur fixe
};
let currentLang = localStorage.getItem('asc_lang') || 'en';
let collectedNames = JSON.parse(localStorage.getItem('ascension_save_v1')) || [];

// UNDO SYSTEM
let stateHistory = [];
const MAX_HISTORY = 20;

function pushHistory() {
    stateHistory.push([...collectedNames]);
    if (stateHistory.length > MAX_HISTORY) stateHistory.shift();
    document.getElementById('undoBtn').disabled = false;
}

function undoAction() {
    if (stateHistory.length === 0) {
        alert(translations[currentLang].undo_empty || "Nothing to undo!");
        return;
    }
    collectedNames = stateHistory.pop();
    if (stateHistory.length === 0) document.getElementById('undoBtn').disabled = true;
    renderTable();
    updateProgress();
    saveState();
    localStorage.setItem('ascension_save_v1', JSON.stringify(collectedNames));
    hasUnsavedChanges = true; // Undo is a change
    updateSaveStatus();
}

// PERSISTENCE STATE INITIALIZATION
const defaultState = {
    class: 'all',
    region: 'all',
    faction: 'Both',
    sortKey: 'name',
    sortOrder: 1,
    scroll: 0
};
const savedState = JSON.parse(sessionStorage.getItem('ascension_ui_state_v1')) || defaultState;

let currentClass = savedState.class || "all";
let currentRegion = savedState.region || "all";
let currentFaction = savedState.faction || "Both";
let sortKey = savedState.sortKey || "name";
let sortOrder = savedState.sortOrder || 1;

let hasUnsavedChanges = false;

function saveState() {
    const state = {
        class: currentClass,
        region: currentRegion,
        faction: currentFaction,
        sortKey: sortKey,
        sortOrder: sortOrder,
        scroll: window.scrollY
    };
    sessionStorage.setItem('ascension_ui_state_v1', JSON.stringify(state));
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('asc_lang', lang);
    applyTranslations();
    document.getElementById('currentLangDisplay').innerHTML = `<img src="${flags[lang]}" style="width:18px; border-radius:2px;"> <span>${lang.toUpperCase()}</span>`;
    document.getElementById('langDropdown').classList.remove('show');
    initClassOptions();
    renderTable();
    saveState();
}

function applyTranslations() {
    const t = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (key === 'credits_cta') el.innerHTML = t[key];
            else el.innerText = t[key];
        }
    });
    document.getElementById('searchInput').placeholder = t.search_placeholder;
    document.getElementById('reportDesc').placeholder = t.report_placeholder;

    // Dropdown Defaults
    if (currentClass === 'all') document.getElementById('classDisplayText').innerText = t.all_classes;
    else document.getElementById('classDisplayText').innerText = t.classes[currentClass] || currentClass;

    if (currentRegion === 'all') document.getElementById('regionDisplayText').innerText = t.all_regions;
    else document.getElementById('regionDisplayText').innerText = currentRegion;
}

function loadState() {
    const s = JSON.parse(sessionStorage.getItem('ascension_ui_state_v1') || '{}');
    if (s.class) currentClass = s.class;
    if (s.region) currentRegion = s.region;
    if (s.faction) currentFaction = s.faction;
    if (s.sortKey) sortKey = s.sortKey;
    if (s.sortOrder) sortOrder = s.sortOrder;

    // Reset UI for class
    const classIcon = document.getElementById('classDisplayIcon');
    if (currentClass !== 'all') {
        classIcon.src = `https://wow.zamimg.com/images/wow/icons/small/${classData[currentClass]}.jpg`;
        classIcon.style.display = 'inline-block';
    }

    // Init Faction Buttons
    document.querySelectorAll('.fac-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(currentFaction === 'Both' ? 'fac-both' : `fac-${currentFaction.toLowerCase()}`).classList.add('active');

    applyTranslations();
    document.getElementById('currentLangDisplay').innerHTML = `<img src="${flags[currentLang]}" style="width:18px; border-radius:2px;"> <span>${currentLang.toUpperCase()}</span>`;
    renderTable();
    if (s.scroll) window.scrollTo(0, s.scroll);
}

window.addEventListener('load', loadState);

// SAVE SCROLL ON UNLOAD
window.addEventListener('scroll', () => {
    // Debounce could be good here but simple works for now
    saveState();
});

function renderTable() {
    const body = document.getElementById('reBody');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const factionPool = enchants.filter(e => currentFaction === "Both" || e.faction === "Both" || e.faction === currentFaction);

    updateProgress(factionPool);
    updateSortIcons();
    updateSaveStatus();

    let filtered = factionPool.filter(e => {
        const t = translations[currentLang];
        const translatedZone = (t.regions[e.zone] || e.zone).toLowerCase();
        const translatedEnchant = (t.enchants[e.name] || e.name).toLowerCase();
        const matchesSearch = e.name.toLowerCase().includes(search) || e.zone.toLowerCase().includes(search) || translatedZone.includes(search) || translatedEnchant.includes(search);
        const matchesClass = currentClass === "all" || e.class === currentClass;
        const matchesZone = currentRegion === "all" || e.zone === currentRegion;
        return matchesSearch && matchesClass && matchesZone;
    });

    filtered.sort((a, b) => {
        const isA = collectedNames.includes(a.name.toLowerCase());
        const isB = collectedNames.includes(b.name.toLowerCase());
        if (isA !== isB) return isA ? 1 : -1;

        let valA = a[sortKey];
        let valB = b[sortKey];

        if (sortKey === 'name') {
            valA = (translations[currentLang].enchants && translations[currentLang].enchants[a.name]) || a.name;
            valB = (translations[currentLang].enchants && translations[currentLang].enchants[b.name]) || b.name;
        } else if (sortKey === 'class') {
            valA = (translations[currentLang].classes && translations[currentLang].classes[a.class]) || a.class;
            valB = (translations[currentLang].classes && translations[currentLang].classes[b.class]) || b.class;
        } else if (sortKey === 'zone') {
            valA = (translations[currentLang].regions && translations[currentLang].regions[a.zone]) || a.zone;
            valB = (translations[currentLang].regions && translations[currentLang].regions[b.zone]) || b.zone;
        }

        return String(valA).localeCompare(String(valB), currentLang, {
            sensitivity: 'base',
            numeric: true
        }) * sortOrder;
    });

    body.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const t = translations[currentLang]; // On définit t ici pour l'utiliser dans la boucle

    filtered.forEach(e => {
        const isColl = collectedNames.includes(e.name.toLowerCase());
        const row = document.createElement('tr');
        if (isColl) row.className = 'collected';

        // --- 1. RÉCUPÉRATION DE L'ID DEPUIS TON DICTIONNAIRE ---
        // Try simple name first, then try with class in parentheses for spells like "Holy Mastery"
        let spellId = spellIds[e.name];
        if (!spellId) {
            // For spells that need class differentiation, try name with class in parentheses
            const nameWithClass = `${e.name} (${e.class})`;
            spellId = spellIds[nameWithClass] || "";
        }

        // Debug: Log if spell ID is missing
        if (!spellId) {
            console.warn(`Missing spell ID for: "${e.name}" (class: ${e.class})`);
        }

        // --- 2. URL DIRECTE SI L'ID EXISTE, SINON RECHERCHE PAR NOM ---
        const searchUrl = spellId ? `https://db.ascension.gg/?spell=${spellId}` : `https://db.ascension.gg/?spells=400&filter=na=${encodeURIComponent(e.name)}`;


        const safeName = e.name.replace(/'/g, "\\'");

        // For icons, use name with class for spells that need differentiation
        // Check if icon file exists with class suffix (for Holy Mastery, Restoration Mastery, etc.)
        const needsClassSuffix = ["Holy Mastery", "Restoration Mastery"];
        const iconName = needsClassSuffix.includes(e.name) ? `${e.name} (${e.class})` : e.name;
        const fileName = iconName.replace(/:/g, "");

        const iconHTML = `<img src="Icons/${fileName}.png" class="spell-icon" onerror="handleIconError(this, '${safeName}')">`;

        const factHTML_new = e.faction === 'Both' ?
            `<img src="${icons.alliance}" class="fac-icon"><img src="${icons.horde}" class="fac-icon">` :
            `<img src="${icons[e.faction.toLowerCase()]}" class="fac-icon">`;

        const mapSuffix = e.faction === "Both" ? "" : ` ${e.faction}`;
        const mapPath = `Nonvid Locations/${e.name} Location${mapSuffix}.png`;
        let guideBtn = `<a class="check-map btn-unknown" data-map="${mapPath.replace(/"/g, '&quot;')}">${t.btn_unknown}</a>`;
        if (e.video) {
            const safeUrl = e.video.replace(/'/g, "\\'");
            guideBtn = `<a href="${safeUrl}" class="btn-video" target="_blank">${t.btn_watch}</a>`;
        }

        row.innerHTML = `
            <td>
                <button class="btn-action ${isColl ? 'btn-remove' : 'btn-collect'}" 
                        onclick="toggleRE('${e.name.toLowerCase().replace(/'/g, "\\'")}', ${!isColl})">
                    ${isColl ? '✕' : '✓'}
                </button>
            </td>
            <td style="font-weight:600;">
                <div style="display: flex; align-items: center;">
                    ${iconHTML}
                    <a href="${searchUrl}" 
                       target="_blank" 
                       data-ascension-spell="${spellId}"
                       style="color: inherit; text-decoration: none; border-bottom: 1px dotted #ffd100;">
                        ${t.enchants[e.name] || e.name}
                    </a>
                </div>
            </td>
            <td>
                <img src="https://wow.zamimg.com/images/wow/icons/small/${classData[e.class]}.jpg" class="icon-class">
                <span>${t.classes[e.class] || e.class}</span>
            </td>
            <td>${factHTML_new}</td>
            <td style="color:var(--text-dim)">${t.regions[e.zone] || e.zone}</td>
            <td>${guideBtn}</td>
        `;
        fragment.appendChild(row);
    });

    body.appendChild(fragment);
    updateRegionDropdown(factionPool);
    if (typeof checkMapsVisibility === "function") checkMapsVisibility();
}

function checkMapsVisibility() {
    document.querySelectorAll('.check-map').forEach(btn => {
        // Prevent checking multiple times if we had a lot of re-renders
        if (btn.dataset.checked === "true") return;

        const img = new Image();
        const mapPath = btn.getAttribute('data-map');
        btn.dataset.checked = "true";

        img.onload = () => {
            btn.className = 'btn-map';
            btn.innerText = translations[currentLang].btn_map;
            btn.href = mapPath;
            btn.target = '_blank';
            btn.onclick = null;
        };
        img.onerror = () => {
            // Stays UNKNOWN
        };
        img.src = mapPath;
    });
}

function toggleRE(name, add) {
    pushHistory();
    if (add) { if (!collectedNames.includes(name)) collectedNames.push(name); }
    else { collectedNames = collectedNames.filter(n => n !== name); }
    localStorage.setItem('ascension_save_v1', JSON.stringify(collectedNames));
    hasUnsavedChanges = true;
    renderTable();
}

function updateSaveStatus() {
    const btn = document.getElementById('saveBtn');
    hasUnsavedChanges ? btn.classList.add('btn-save-unsaved') : btn.classList.remove('btn-save-unsaved');
}


function exportData() {
    const blob = new Blob([JSON.stringify(collectedNames)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ME_Backup.json'; a.click();
    hasUnsavedChanges = false;
    updateSaveStatus();
}

window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
});

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    pushHistory();
    const reader = new FileReader();
    reader.onload = (ev) => {
        collectedNames = JSON.parse(ev.target.result);
        localStorage.setItem('ascension_save_v1', JSON.stringify(collectedNames));
        hasUnsavedChanges = false;
        renderTable();
    };
    reader.readAsText(file);
}

function setFaction(f) {
    currentFaction = f;
    document.querySelectorAll('.fac-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(f === 'Both' ? 'fac-both' : `fac-${f.toLowerCase()}`).classList.add('active');
    saveState();
    renderTable();
}

function handleSearchInput() {
    const val = document.getElementById('searchInput').value;
    document.getElementById('clearSearch').style.display = val.length > 0 ? 'flex' : 'none';
    renderTable();
}

function clearSearch() { document.getElementById('searchInput').value = ''; handleSearchInput(); }
function toggleDropdown(e, id) { e.stopPropagation(); document.querySelectorAll('.options-list').forEach(l => { if (l.id === id) l.classList.toggle('show'); else l.classList.remove('show'); }); }
function selectClass(c) {
    currentClass = c;
    const icon = document.getElementById('classDisplayIcon');
    const t = translations[currentLang];
    if (c === 'all') {
        document.getElementById('classDisplayText').innerText = t.all_classes;
        icon.style.display = 'none';
    } else {
        document.getElementById('classDisplayText').innerText = t.classes[c] || c;
        icon.src = `https://wow.zamimg.com/images/wow/icons/small/${classData[c]}.jpg`;
        icon.style.display = 'inline-block';
    }
    saveState();
    renderTable();
}
function selectRegion(r) {
    currentRegion = r;
    const t = translations[currentLang];
    document.getElementById('regionDisplayText').innerText = r === 'all' ? t.all_regions : (t.regions[r] || r);
    saveState();
    renderTable();
}


function updateRegionDropdown(pool) {
    const container = document.getElementById('regionOptions');
    const t = translations[currentLang];

    // 1. On récupère les zones uniques
    const zones = [...new Set(pool.map(e => e.zone))];

    // 2. On trie en utilisant la traduction
    zones.sort((a, b) => {
        const nameA = t.regions[a] || a;
        const nameB = t.regions[b] || b;
        return nameA.localeCompare(nameB, currentLang);
    });

    // 3. On génère le HTML
    let html = `<div class="option-item" onclick="selectRegion('all')">${t.all_regions}</div>`;
    zones.forEach(z => {
        html += `<div class="option-item" onclick="selectRegion('${z}')">${t.regions[z] || z}</div>`;
    });

    container.innerHTML = html;
}

function updateProgress(pool) {
    const calc = (p) => {
        const uniq = [...new Set(p.map(e => e.name.toLowerCase()))];
        return [uniq.filter(n => collectedNames.includes(n)).length, uniq.length];
    };
    const t = translations[currentLang];

    // Global / Faction Progress
    let gLabel = t.global_progress;
    if (currentFaction === 'Alliance') gLabel = t.alliance_progress;
    if (currentFaction === 'Horde') gLabel = t.horde_progress;
    document.getElementById('globalLabel').innerText = gLabel;
    const [gD, gT] = calc(pool); updateBar('global', gD, gT);

    // Class Progress
    const classLabelEl = document.getElementById('classLabel');
    if (currentClass === 'all') {
        classLabelEl.innerHTML = t.class_progress;
    } else {
        const cName = t.classes[currentClass] || currentClass;
        const iconSrc = `https://wow.zamimg.com/images/wow/icons/small/${classData[currentClass]}.jpg`;
        classLabelEl.innerHTML = `<img src="${iconSrc}" class="icon-class" style="margin:0; width:14px; height:14px; border-radius:2px;"> ${cName}`;
    }
    const [cD, cT] = calc(pool.filter(e => currentClass === 'all' || e.class === currentClass)); updateBar('class', cD, cT);

    // Region Progress
    const regionLabelEl = document.getElementById('regionLabel');
    if (currentRegion === 'all') {
        regionLabelEl.innerText = t.region_progress;
    } else {
        regionLabelEl.innerText = t.regions[currentRegion] || currentRegion;
    }
    const [zD, zT] = calc(pool.filter(e => currentRegion === 'all' || e.zone === currentRegion)); updateBar('region', zD, zT);
}

function updateBar(id, val, max) {
    const perc = max === 0 ? 0 : (val / max) * 100;
    document.getElementById(`${id}Fill`).style.width = `${perc}%`;
    document.getElementById(`${id}Text`).innerText = `${val}/${max}`;
}

function initClassOptions() {
    const container = document.getElementById('classOptions');
    const t = translations[currentLang];

    // 1. Garder l'option "Toutes les Classes" en premier
    let html = `<div class="option-item" onclick="selectClass('all')">${t.all_classes}</div>`;

    // 2. Récupérer les clés, mais les trier selon leur valeur traduite
    const sortedKeys = Object.keys(classData).sort((a, b) => {
        const nameA = t.classes[a] || a;
        const nameB = t.classes[b] || b;
        return nameA.localeCompare(nameB, currentLang);
    });

    // 3. Générer le HTML avec les clés triées alphabétiquement par langue
    sortedKeys.forEach(c => {
        html += `<div class="option-item" onclick="selectClass('${c}')">
                    <img src="https://wow.zamimg.com/images/wow/icons/small/${classData[c]}.jpg" class="icon-class"> 
                    ${t.classes[c] || c}
                 </div>`;
    });

    container.innerHTML = html;
}

function setSort(key) {
    if (sortKey === key) sortOrder *= -1; else { sortKey = key; sortOrder = 1; }
    saveState();
    renderTable();
}
function updateSortIcons() { ['name', 'class', 'zone', 'faction'].forEach(key => { const el = document.getElementById(`sort-${key}`); if (el) el.innerText = sortKey === key ? (sortOrder === 1 ? " ▲" : " ▼") : ""; }); }

function bulkAction(add) {
    if (!confirm(add ? "Mark ALL visible as collected?" : "Unmark ALL visible?")) return;
    const visible = enchants.filter(e => (currentFaction === "Both" || e.faction === "Both" || e.faction === currentFaction) && (currentClass === 'all' || e.class === currentClass) && (currentRegion === 'all' || e.zone === currentRegion));
    visible.forEach(e => { const n = e.name.toLowerCase(); if (add && !collectedNames.includes(n)) collectedNames.push(n); else if (!add) collectedNames = collectedNames.filter(x => x !== n); });
    localStorage.setItem('ascension_save_v1', JSON.stringify(collectedNames));
    hasUnsavedChanges = true;
    renderTable();
}

function toggleReportModal(show) { document.getElementById('reportModal').style.display = show ? 'flex' : 'none'; }
function openReportModal() { populateReportSelectors(); toggleReportModal(true); }
function populateReportSelectors() {
    const t = translations[currentLang];
    document.getElementById('reportClass').innerHTML = `<option value="Not specified">${t.not_specified}</option>` + Object.keys(classData).sort().map(c => `<option value="${c}">${t.classes[c] || c}</option>`).join('');
    document.getElementById('reportRegion').innerHTML = `<option value="Not specified">${t.not_specified}</option>` + [...new Set(enchants.map(e => e.zone))].sort().map(r => `<option value="${r}">${t.regions[r] || r}</option>`).join('');
    updateReportEnchantList();
}
function updateReportEnchantList() {
    const t = translations[currentLang];
    const c = document.getElementById('reportClass').value, r = document.getElementById('reportRegion').value;
    let f = enchants;
    if (c !== "Not specified") f = f.filter(e => e.class === c);
    if (r !== "Not specified") f = f.filter(e => e.zone === r);
    document.getElementById('reportEnchant').innerHTML = `<option value="Not specified">${t.not_specified}</option>` +
        [...new Set(f.map(e => e.name))]
            .map(n => ({ original: n, translated: t.enchants[n] || n }))
            .sort((a, b) => a.translated.localeCompare(b.translated, currentLang))
            .map(item => `<option value="${item.original}">${item.translated}</option>`).join('') + `<option value="Other">Other</option>`;

}

document.getElementById('bugReportForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // RECUPERATION DES VALEURS DU FORMULAIRE
    const type = document.getElementById('reportType').value;
    const enchant = document.getElementById('reportEnchant').value;
    const faction = document.getElementById('reportFaction').value;
    const className = document.getElementById('reportClass').value;
    const region = document.getElementById('reportRegion').value;
    const desc = document.getElementById('reportDesc').value;

    // CONSTRUCTION DU TITRE ET DU CORPS
    const title = encodeURIComponent(`[Bug Report] ${type}: ${enchant}`);
    const body = encodeURIComponent(`## Issue Details\n- **Type:** ${type}\n- **Enchant:** ${enchant}\n- **Faction:** ${faction}\n- **Class:** ${className}\n- **Region:** ${region}\n\n## Description\n${desc}`);

    // URL GITHUB MISE A JOUR
    window.open(`https://github.com/stumpergamer-jpg/bronzebeard-mystic-enchants-tracker/issues/new?title=${title}&body=${body}`, '_blank');

    toggleReportModal(false);
});

document.addEventListener('click', () => {
    document.querySelectorAll('.options-list').forEach(l => l.classList.remove('show'));
    document.getElementById('langDropdown').classList.remove('show');
});
initClassOptions();
renderTable();
// On récupère le groupe de boutons
const nav = document.querySelector('.scroll-nav');

// On cache les boutons au chargement
nav.style.display = 'none';

// On surveille le défilement
window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
        nav.style.display = 'flex'; // Apparaît après 200px de descente
    } else {
        nav.style.display = 'none'; // Se cache si on remonte tout en haut
    }
});

