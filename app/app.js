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
	
const possibles = ['dir','que', 'lit', 'nvp', 'inv',
                   'fac','eos'];
const omConcepts ={};

//handles resize window event.
function redrawBackground(){
    const om = omConcepts[currentTab.id];
    if(om) om.redoStagesGraph();
}
function switchTo(which){
    if( currentTab ) {
        currentTab.classList.add('displayNone');
        if (currentTab.id != 'dir'){
            const om = omConcepts[currentTab.id];
            om.pause();
        }
    }

    
    let k = possibles.findIndex(key => key == which);
    currentTab = document.getElementById(k >= 0 ? which : 'dir');
    currentTab.classList.remove('displayNone');
    if( k > 0 ){
        redrawBackground();
    }
//    console.log('Current Tab = ',currentTab.id,'<<<')
};

window.onpopstate = function(event) {
	const s = event.state;
	switchTo(s ? s.tabName : 'dir');
};


function router(event){
	let inputElem = event.target.closest('div');
	if (!inputElem) return;
	let key = inputElem.id.slice(0,3);
	if ( key == 'doc'){
		window.location.href="./doc/doc.html";
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
var currentTab = null;
    if(performance.navigation.type == 2){
        alert('  caused a reload');
        location.reload(true);
        console.log('just did the reload thing')
        
    }
    
    document.addEventListener('keydown', keyDownFunction);
    window.addEventListener('resize', redrawBackground);
    document.getElementById('dir').addEventListener('click', router);


    
//    console.log('REdoing all the starts of all the animations')
    omConcepts['que'] = queStart();
    omConcepts['lit'] = litStart();
    omConcepts['nvp'] = nvpStart();
    omConcepts['inv'] = invStart();
    omConcepts['fac'] = facStart();
    omConcepts['eos'] = eosStart();


    const h = location.hash;
    switchTo(h != '' ? h.slice(1) : 'dir');







