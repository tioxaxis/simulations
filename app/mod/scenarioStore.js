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

// Where custom scenarios are kept in the browser's localStorage.
//
// tiox.org/stable, /v1.x and /simulations are the same origin, so they
// share localStorage.  Up to v1.3 the scenarios were kept in
// 'Tiox-<key>', and a slider with a list of values (speed, eos util,
// fac qln) was saved as its position in that list.  From v1.4 on they
// are saved as the value itself, so v1.4 keeps its scenarios in
// 'Tiox2-<key>' and never writes 'Tiox-<key>'; v1.3 keeps its own.
//
// The first time v1.4 opens an animation that has no 'Tiox2-<key>', it
// converts a v1.3 'Tiox-<key>' (if any) and saves the result as
// 'Tiox2-<key>'.  An empty string in 'Tiox2-<key>' means "use the
// default scenarios" (set by reset-scenarios), so the v1.3 copy is not
// converted again after a reset.
//
// The record in either key has the shape of the default <key>.json:
//   {"app": {"omConcept": {"key": key, "scenarios": [...]}}}
// (very old versions stored just the array of scenarios).

const oldPrefix = 'Tiox-';
const newPrefix = 'Tiox2-';

export function storageKey(key) {
    return newPrefix + key;
}

// The v1.3 lists for the sliders saved as a position.  These record
// what v1.3 did, so they must not change with later edits to the
// sliders.  Animations not listed here (bat, sur, mat, fex) did not
// exist in v1.3; a 'Tiox-<key>' for them was written by the v1.4 test
// site and is already in the current format.
const speeds = ['1', '2', '5', '10', '25', '1000'];
const v13Lists = {
    que: {speed: speeds},
    lit: {speed: speeds},
    nvp: {speed: speeds},
    inv: {speed: speeds},
    fac: {speed: ['1', '2', '5', '10', '25'],
          qln: ['1', '3', '5', '-1']},
    eos: {speed: speeds,
          util: ['0.5', '0.7', '0.9', '0.95', '0.99']},
};

// Bring an older record up to the current shape: wrap a bare array,
// and rename fields from before v1.3 (inv: which->method, lit: sr->st).
// Returns null if it is not a scenarios record.
export function currentFormat(key, stored) {
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

// Convert the scenarios of a v1.3 record to the current values.
function fromV13(key, params) {
    const lists = v13Lists[key];
    if (!lists) return params;
    for (let s of params.app.omConcept.scenarios) {
        for (let field of Object.keys(lists)) {
            const i = Number(s[field]);
            if (Number.isInteger(i) && i >= 0 && i < lists[field].length)
                s[field] = lists[field][i];
        }
        // nvp demand CV: steps of .1 in v1.3, .2 now; round to nearest .2
        if (key == 'nvp' && s.dcv !== undefined && s.dcv !== '') {
            const x = Number(s.dcv);
            if (!isNaN(x)) s.dcv = String(Math.round(x * 5) / 5);
        }
    }
    return params;
}

function parse(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        console.log('could not read stored scenarios', e);
        return null;
    }
}

// The custom scenarios for 'key' in the current format, or null if the
// animation uses its default scenarios.  Converts and saves a v1.3
// record the first time.
export function readStored(key) {
    const text = localStorage.getItem(newPrefix + key);
    if (text !== null)
        return text == '' ? null : currentFormat(key, parse(text));

    const oldText = localStorage.getItem(oldPrefix + key);
    if (!oldText) return null;
    let params = currentFormat(key, parse(oldText));
    if (!params) return null;
    params = fromV13(key, params);
    writeStored(key, params);
    return params;
}

export function writeStored(key, params) {
    localStorage.setItem(newPrefix + key, JSON.stringify(params));
}

// reset-scenarios: use the defaults from now on, and do not convert
// the v1.3 copy again (it is left alone for v1.3).
export function clearStored(key) {
    localStorage.setItem(newPrefix + key, '');
}
