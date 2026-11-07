/*
	TioX a set of Animations for Operations Management
    Copyright (C) 2020  Gregory Dobson
	gregory.c.dobson@gmail.com

    GPL-3.0-or-later
	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Export and Import of the custom scenarios for all animations
// as one JSON file:
//   {"tiox": {"version": 1, "exported": "yyyy-mm-dd",
//             "animations": {"que": {"app": {"omConcept": {...}}}, ...}}}
// Each animation's entry has the same shape as its default <key>.json.
// An animation has custom scenarios exactly when localStorage has
// 'Tiox-<key>' (written by OmConcept.saveEdit in rhs.js).

const fileVersion = 1;

// Bring an older localStorage format up to date, matching the
// conversions in OmConcept.getlocalStoreAndParse (rhs.js).
function currentFormat(key, stored) {
    if (Array.isArray(stored)) {
        for (let s of stored) {
            if (key == 'inv' && s.which !== undefined) {
                s.method = s.which;
                delete s.which;
            }
            if (key == 'lit' && s.sr !== undefined) {
                s.st = s.sr;
                delete s.sr;
            }
        }
        return {app: {omConcept: {key: key, scenarios: stored}}};
    }
    if (stored && stored.app && stored.app.omConcept &&
        Array.isArray(stored.app.omConcept.scenarios))
        return stored;
    return null;
}

function customScenarios(keys) {
    const animations = {};
    for (let key of keys) {
        let stored = null;
        try {
            stored = JSON.parse(localStorage.getItem('Tiox-' + key));
        } catch (e) {
            console.log('could not read stored scenarios for', key, e);
        }
        const params = currentFormat(key, stored);
        if (params) animations[key] = params;
    }
    return animations;
}

function todayString() {
    const d = new Date();
    const two = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
}

// 'A', 'A and B', 'A, B and C'
function listNames(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

// Chrome and Edge show a Save As dialog; other browsers download the
// file to their usual place (normally Downloads).
// Returns false if the user cancelled.
async function saveFile(text, fileName) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{description: 'TioX scenarios',
                         accept: {'application/json': ['.json']}}]
            });
            const writable = await handle.createWritable();
            await writable.write(text);
            await writable.close();
            return true;
        } catch (e) {
            if (e.name == 'AbortError') return false;
            console.log('Save As dialog failed, downloading instead', e);
        }
    }
    const url = URL.createObjectURL(
        new Blob([text], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
}

// names: {key: display name} for every animation, in menu order.
export async function exportScenarios(names) {
    const animations = customScenarios(Object.keys(names));
    const keys = Object.keys(animations);
    if (keys.length == 0) {
        alert('You have no custom scenarios to export. ' +
              'All animations are using the default scenarios.');
        return;
    }
    const today = todayString();
    const text = JSON.stringify({tiox: {version: fileVersion,
                                        exported: today,
                                        animations: animations}},
                                null, 2);
    const saved = await saveFile(text, 'tiox-scenarios-' + today + '.json');
    if (saved)
        alert('Exported custom scenarios for ' +
              listNames(keys.map(k => names[k])) + '.');
}

// ****** Import
// The browser's own file window opens; the chosen file must be one made
// by exportScenarios (otherwise an alert says why).  Then a dialog shows
// a table of every animation that has custom scenarios in localStorage,
// in the file, or both.  Animations in the file have a checkbox
// (initially checked).  Status per animation:
//   only in localStorage           'Remains'  (blue)
//   in both, checked               'Replaces' (red)
//   in both, unchecked             'Remains'  (blue)
//   only in the file, checked      'Adds'     (green)
//   only in the file, unchecked    ''         (name grey)
// Import writes each checked animation's whole record to 'Tiox-<key>'
// (same format as OmConcept.saveEdit) and reloads the home page.
// The file is only read inside the browser; nothing is sent anywhere.

// Returns {key: params} for the animations in the file that TioX knows;
// throws an Error with a message for the user if the file is unusable.
function readImportFile(text, names) {
    const notTiox = 'This is not a TioX scenarios file. ' +
          'Choose a file made with Export scenarios.';
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(notTiox);
    }
    const tiox = data && data.tiox;
    if (!tiox || typeof tiox.version != 'number' ||
        !tiox.animations || typeof tiox.animations != 'object')
        throw new Error(notTiox);
    if (tiox.version > fileVersion)
        throw new Error('This file was made by a newer version of TioX ' +
                        'and cannot be imported here.');
    const records = {};
    for (let key of Object.keys(names)) {
        if (tiox.animations[key] === undefined) continue;
        const params = currentFormat(key, tiox.animations[key]);
        const ok = params && params.app.omConcept.key == key &&
              params.app.omConcept.scenarios.every(s =>
                  s && typeof s == 'object' && !Array.isArray(s) &&
                  typeof s.desc == 'string');
        if (!ok)
            throw new Error('The scenarios for ' + names[key] +
                            ' in this file are damaged, ' +
                            'so the file cannot be imported.');
        records[key] = params;
    }
    if (Object.keys(records).length == 0)
        throw new Error('This file has no scenarios for any TioX animation.');
    return records;
}

export function setupImport(names) {
    const dialog = document.getElementById('importDialog');
    const fileInput = document.getElementById('importFile');
    const importButton = document.getElementById('importGo');
    const tbody = document.getElementById('importRows');
    let records = null;

    function chooseFile() {
        fileInput.value = '';  // so choosing the same file again still works
        fileInput.click();
    }

    async function fileChosen() {
        const file = fileInput.files[0];
        if (!file) return;
        try {
            records = readImportFile(await file.text(), names);
        } catch (e) {
            alert(e.message);
            return;
        }
        showTable(file.name);
    }

    function showTable(fileName) {
        const stored = customScenarios(Object.keys(names));
        tbody.innerHTML = '';
        for (let key of Object.keys(names)) {
            const inFile = records[key] !== undefined;
            const inStorage = stored[key] !== undefined;
            if (!inFile && !inStorage) continue;
            const tr = document.createElement('tr');
            const tdCheck = document.createElement('td');
            const tdName = document.createElement('td');
            const tdStatus = document.createElement('td');
            tdName.textContent = names[key];
            let box = null;
            if (inFile) {
                box = document.createElement('input');
                box.type = 'checkbox';
                box.checked = true;
                box.dataset.key = key;
                // explicit tabindex: Safari otherwise skips checkboxes
                // and buttons when Tab is pressed (unless Option-Tab)
                box.tabIndex = 0;
                tdCheck.append(box);
            }
            const update = () => {
                let status, cls;
                if (!inFile || !box.checked) {
                    status = inStorage ? 'Remains' : '';
                    cls = inStorage ? 'importRemains' : 'importSkipped';
                } else {
                    status = inStorage ? 'Replaces' : 'Adds';
                    cls = inStorage ? 'importReplaces' : 'importAdds';
                }
                tdStatus.textContent = status;
                tdName.className = tdStatus.className = cls;
                importButton.disabled =
                    !tbody.querySelector('input:checked');
            };
            if (box) box.addEventListener('change', update);
            tr.append(tdCheck, tdName, tdStatus);
            tbody.append(tr);
            update();
        }
        document.getElementById('importFileName').textContent =
            'From the file ' + fileName + ':';
        dialog.showModal();
    }

    function doImport() {
        try {
            for (let box of tbody.querySelectorAll('input:checked')) {
                const key = box.dataset.key;
                localStorage.setItem('Tiox-' + key,
                                     JSON.stringify(records[key]));
            }
        } catch (e) {
            alert('The scenarios could not be saved in this browser: ' +
                  e.message);
            return;
        }
        // reload so animations already opened read their new scenarios;
        // drop any ?scenarios= link, which would take priority.
        history.replaceState(null, '', location.pathname + '#dir');
        location.reload();
    }

    document.getElementById('importScenarios')
        .addEventListener('click', chooseFile);
    fileInput.addEventListener('change', fileChosen);
    importButton.addEventListener('click', doImport);
    document.getElementById('importCancel')
        .addEventListener('click', () => dialog.close());
}
