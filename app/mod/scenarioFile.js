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

// Export (and later Import) of the custom scenarios for all animations
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
