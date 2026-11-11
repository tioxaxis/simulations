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

// The scenarios in a copy-link:  ...index.html?s=<code>#<key>
// (Links made before 2026 use ?scenarios= and OmConcept.sDecode in rhs.js;
// older TioX versions ignore ?s=, so they show their usual scenarios.)
//
// <code> is base64url of these bytes:
//   version                        (1 byte, linkVersion)
//   animation key                  (string)
//   number of names, then names    (1 byte, strings)  e.g. 'ar', 'desc'
//   number of values, then values  (1 byte, strings)  each distinct value once
//   number of scenarios            (1 byte)
//   per scenario, per name:        (1 byte) index into the values
// A string is its UTF-8 length (1 byte, at most 255) then the bytes.
// Values are the scenario's own strings ('0.8', 'true', 'play', a name),
// so a link does not depend on the order of keyNames, slider steps, or
// the order of a list of choices.  Whoever reads it ignores names it does
// not know, gives missing names their default, and verifies each value.
//
// Example: the first two default Queueing scenarios.  Bytes are shown
// as [n] and the text in between is the string's UTF-8 (here just ASCII).
//   [1]                                 version 1
//   [3]que                              animation key
//   [11][2]ar[3]acv[2]sr[3]scv[5]reset[6]action[5]speed[4]desc
//       [4]leg0[4]leg1[4]leg2           11 names (in usrInputs order)
//   [9][1]5[1]0[1]6[5]false[4]none[1]1
//      [17]A: No variability[4]true
//      [22]B: Arrival variability       9 values, numbered 0..8:
//                                         0 '5'  1 '0'  2 '6'  3 'false'
//                                         4 'none'  5 '1'  6 'A: No ...'
//                                         7 'true'  8 'B: Arrival ...'
//   [2]                                 2 scenarios
//   [0][1][2][1][3][4][5][6][7][7][3]   A: ar=5 acv=0 sr=6 scv=0
//                                          reset=false action=none speed=1
//                                          desc='A: ...' leg0,leg1=true
//                                          leg2=false
//   [0][5][2][1][3][4][5][8][7][7][3]   B: the same except acv=1, desc='B: ...'
// That is 148 bytes; as base64url the link's code is 198 characters:
//   AQNxdWULAmFyA2FjdgJzcgNzY3YFcmVzZXQGYWN0aW9uBXNwZWVkBGRlc2MEbGVnMARsZWcx
//   BGxlZzIJATUBMAE2BWZhbHNlBG5vbmUBMRFBOiBObyB2YXJpYWJpbGl0eQR0cnVlFkI6IEFy
//   cml2YWwgdmFyaWFiaWxpdHkCAAECAQMEBQYHBwMABQIBAwQFCAcHAw
// A third scenario would add 11 bytes, plus any values not seen before
// (usually just its desc).

const linkVersion = 1;
const maxByte = 255;

function toBase64url(bytes) {
    let s = '';
    for (let b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, c => c.charCodeAt(0));
}

// UTF-8 bytes of str, cut to at most 255 bytes without splitting a character
function utf8(str) {
    let bytes = new TextEncoder().encode(str);
    if (bytes.length > maxByte) {
        let n = maxByte;
        while ((bytes[n] & 0xC0) == 0x80) n--;  // n is not inside a character
        bytes = bytes.subarray(0, n);
    }
    return bytes;
}

// key: animation key;  names: parameter names;
// rows: scenarios, each {name: string value}.  Returns the <code>.
export function encodeLink(key, names, rows) {
    const values = [];
    const valueIndex = new Map();
    const indices = [];
    for (let row of rows) {
        for (let name of names) {
            const v = String(row[name]);
            if (!valueIndex.has(v)) {
                valueIndex.set(v, values.length);
                values.push(v);
            }
            indices.push(valueIndex.get(v));
        }
    }
    if (rows.length > maxByte || values.length > maxByte ||
        names.length > maxByte)
        throw new Error('There are too many scenarios to put in one link.');

    const bytes = [linkVersion];
    const addString = str => {
        const b = utf8(str);
        bytes.push(b.length, ...b);
    };
    addString(key);
    bytes.push(names.length);
    names.forEach(addString);
    bytes.push(values.length);
    values.forEach(addString);
    bytes.push(rows.length);
    bytes.push(...indices);
    return toBase64url(bytes);
}

// Returns {key, rows} with rows as {name: string value}, exactly as stored.
// Throws an Error with a message for the user if the code is unusable.
export function decodeLink(code) {
    const damaged = 'This link is incomplete or damaged (perhaps it was ' +
          'split across lines in an email), so the usual scenarios ' +
          'are shown instead.';
    let bytes;
    try {
        bytes = fromBase64url(code);
    } catch (e) {
        throw new Error(damaged);
    }
    let ptr = 0;
    const next = () => {
        if (ptr >= bytes.length) throw new Error(damaged);
        return bytes[ptr++];
    };
    const decoder = new TextDecoder();
    const nextString = () => {
        const n = next();
        if (ptr + n > bytes.length) throw new Error(damaged);
        const s = decoder.decode(bytes.subarray(ptr, ptr + n));
        ptr += n;
        return s;
    };

    const version = next();
    if (version > linkVersion)
        throw new Error('This link was made by a newer version of TioX, ' +
                        'so the usual scenarios are shown instead.');
    const key = nextString();
    const names = Array.from({length: next()}, nextString);
    const values = Array.from({length: next()}, nextString);
    const rows = Array.from({length: next()}, () => {
        const row = {};
        for (let name of names) {
            const v = values[next()];
            if (v === undefined) throw new Error(damaged);
            row[name] = v;
        }
        return row;
    });
    if (ptr != bytes.length) throw new Error(damaged);
    return {key, rows};
}
