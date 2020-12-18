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
from './que/que.js';

import {
	litStart
}
from './lit/lit.js';
import {
	nvpStart
}
from './nvp/nvp.js';

import {
	invStart
}
from './inv/inv.js';
import {
	facStart
}
from './fac/fac.js';
	
	
const possibles = ["que", "lit", "nvp", "inv","fac" ];
const omConcepts ={};

function switchTo(which){
	if( currentTab ) {
		currentTab.classList.add('displayNone');
		if (currentTab.id != 'mainPage')
			omConcepts[currentTab.id].pause();
	}
	
	let k = possibles.findIndex(key => key == which)
	if( k >= 0 ){
		currentTab = document.getElementById(which);
		currentTab.classList.remove('displayNone');
//		possibles[k].start();
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
	let inputElem = event.target.closest('div');
	if (!inputElem) return;
	let key = inputElem.id.slice(0,3);
	if ( key == 'doc'){
		window.location.href = "./doc/doc.html";
	} else {	
		window.history.pushState({tabName:key},'','#'+key);
		switchTo(key);
	}
}
//handles keyboard entry for all simulations.
function keyDownFunction(evt) {
	let omConc = omConcepts[currentTab.id]; 
	if (!omConc) return;
	if ( omConc.toastMode ) omConc.removeToastMessage(); 
	switch (evt.code) {
		case "Space":
			if (omConc.editMode) return;
			evt.preventDefault();
			omConc.togglePlayPause();
			break;
		case "Enter":
			if (!omConc.editMode) return;
			if (omConc.textMode) omConc.saveModifiedDesc();
			else if (omConc.currentLi){
				omConc.addTextBox(omConc.currentLi.innerHTML);
			}
			break;
		case "KeyB":
			if (omConc.editMode) return;
			evt.preventDefault();
			omConc.reset();
			break;
		case "Escape":
			omConc.deleteTextInpBox();
			break;
		case "ArrowDown":
		case "PageDown":
			evt.preventDefault();
			omConc.nextRow();
			break;
		case "ArrowUp":
		case "PageUp":
			evt.preventDefault();
			omConc.previousRow();
			break;
	};
};
document.addEventListener('keydown', keyDownFunction);
document.getElementById('mainPage').addEventListener('click',router);


var currentTab = null;
switchTo(location.hash.slice(1));

omConcepts['que'] = queStart();
//omConcepts['lit'] = litStart();
//omConcepts['nvp'] = nvpStart();
//omConcepts['inv'] = invStart();
omConcepts['fac'] = facStart();




