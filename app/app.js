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
import {
	queStart
}
from './que.js';

import {
	litStart
}
from './lit.js';
import {
	nvpStart
}
from './nvp.js';

import {
	invStart
}
from './inv.js';
	
function openTab(evt, tabName, startFunc) {
	// remove the old
	currentTab.classList.add('displayNone');
	// add the new
	currentTab = document.getElementById(tabName);
	currentTab.classList.remove('displayNone');
	window.history.pushState({tabName:tabName},'','#'+tabName)
	startFunc();
}
	
function switchTo(which){
	
	if( currentTab ) currentTab.classList.add('displayNone');
	const possibles = [{key:"que", start:queStart},
					   {key:"lit", start:litStart},
					   {key:"nvp", start:nvpStart},
					   {key:"inv", start:invStart}];
	let k = possibles.findIndex(option => option.key == which)
	if( k >= 0 ){
		currentTab = document.getElementById(which);
		currentTab.classList.remove('displayNone');
		possibles[k].start();
	} else {
		currentTab = document.getElementById('mainPage');
		currentTab.classList.remove('displayNone');
	}
	
};

window.onpopstate = function(event) {
	const s = event.state;
	switchTo(s ? s.tabName : '');
};


function router(event){
	let inputElem = event.target.closest('h2');
	if (!inputElem) return;
	let key = inputElem.id.slice(0,3);
	window.history.pushState({tabName:key},'','#'+key);
	switchTo(key);
}
let start = new Date();
var currentTab = null;
var currentButton = null;
switchTo(location.hash.slice(1));
document.getElementById('mainPage').addEventListener('click',router);
queStart();
litStart();
nvpStart();
invStart();
console.log( new Date - start);
debugger;



