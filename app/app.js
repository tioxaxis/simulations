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
import {
	eosStart
}
from './eos/eos.js';
import {
    batStart
}
from './bat/bat.js';
import {
    surStart
}
from './sur/sur.js';
	




//function router(event){
//	let inputElem = event.target.closest('div');
//	if (!inputElem) return;
//	let key = inputElem.id.slice(0,3);
//	if ( key == 'doc'){
//		window.location.href="./doc/doc.html";
//	} else {	
//		window.history.pushState({tabName:key},'','#'+key);
//		switchTo(key);
//	}
//}
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

var currentTab = null;


function redrawBackground(){
    const om = omConcepts[currentTab.id];
    if(om) om.redoStagesGraph();
};
window.addEventListener('resize', redrawBackground);

window.onpopstate = function() {
	const h = location.hash;
    switchTo(h != '' ? h.slice(1) : 'dir');
};


const possibles = ['dir','que', 'lit', 'nvp', 'inv',
                   'fac','eos','bat','sur'];
const omConcepts ={};

function switchTo (which){
    if( currentTab ) {
        currentTab.classList.add('displayNone');
        if (currentTab.id != 'dir'){
            const om = omConcepts[currentTab.id];
            om.pause();
        }
    }
    const alreadyStarted = omConcepts[which] != null;
    // console.log(' in APP.js and which',which,alreadyStarted);
    // console.log(omConcepts);
    if( !alreadyStarted ){
        switch (which) {
            case "que":
                omConcepts['que'] = queStart();
                break;
            case "lit":
                omConcepts['lit'] = litStart();
                break;
            case "nvp":
                omConcepts['nvp'] = nvpStart();
                break;
            case "inv":
                omConcepts['inv'] = invStart();
                break;
            case "fac":
                omConcepts['fac'] = facStart();
                break;
            case "eos":
                omConcepts['eos'] = eosStart();
                break;
            case "bat":
                omConcepts['bat'] = batStart();
                break;
            case "sur":
                omConcepts['sur'] = surStart();
                break;
            default :
                break;
                
        }
    }
    
    let k = possibles.findIndex(key => key == which);
    currentTab = document.getElementById(k >= 0 ? which : 'dir');
    currentTab.classList.remove('displayNone');
    if( k > 0 && alreadyStarted ){
        redrawBackground();
    }
};
    const h = location.hash;
    switchTo(h != '' ? h.slice(1) : 'dir');
