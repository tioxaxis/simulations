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
	function addKeyForIds(name,node){
		if ( node.id ) node.id += name;
		const children = node.childNodes;
		for( let child of children )
			if ( child.tagName ) 
				addKeyForIds( name, child ); 
		
	}

	function genRadio(name,desc,id,value,checked){	
		const inp = document.createElement('input');
		inp.type = 'radio';
		inp.name = name;
		inp.id = id;
		inp.value = value;
		if (checked) inp.setAttribute('checked','');
		
		const label = document.createElement('LABEL');	
		label.append(inp, desc);
		return label;
	}

	function genCheckbox(desc,id,value){
		const inp = document.createElement('input');
		inp.type = 'checkbox';
		inp.id = id;
//		inp.value = value;
		
		const label = document.createElement('LABEL');
		label.append(inp, desc);
		return label; 
	}
	function genRange(id, initial, min, max, step){
		let inp = document.createElement('input');
		inp.type ='range';
		inp.id = id;
		inp.min = min;
		inp.max = max;
		inp.step = step;
		inp.value = initial;
		return inp;
	};

	function genSlider(name, desc, initial, min, max, step, values){
		
		const dispSpan = document.createElement('span');
		dispSpan.id = name+"Display";
		dispSpan.innerHTML= initial;
		
		const disp = document.createElement('div');
		disp.append(desc + ' = ',dispSpan);
		
		const vals = document.createElement('div');
		vals.className="spreadValues";
		for( let v of values){
			let s = document.createElement('span');
			s.append(v);
			vals.append(s);
		}
		
		const d = document.createElement('div');
		d.className = "sliderBox inputBox";
		d.append(disp, genRange(name,initial,min,max,step), vals);
		return d;
	}
//	function genSlider(name,desc,
//				init,min,max,step,values){
//		let d = document.createElement('div');
//		d.className = "sliderBox inputBox";
//		let str = `<div>${desc} = <span id="${name}Display">${init}	</span></div><input id="${name}" type="range" min=" ${min}" max="${max}" step="${step}" value="${init}">  <div class="spreadValues">`;
//		for( let v of values){
//			str += `<span>${v}</span>`;
//		}
//		d.innerHTML = str;
//		return d;
//	}

	function genPlayResetButtons(key){
		const d = document.getElementById('playButtons').cloneNode(true);
		addKeyForIds(key,d);
		return d;
	};
	function genPlayResetOptions(key){
		const d = document.createElement('div');
		d.style = "display:none";
		d.className = "actionBox";
		d.id = 'actionOptions'+key;
	 	const d1 = document.createElement('div');
		d1.appendChild(document.createTextNode('Action:'));
	 	d.appendChild(d1);
		
	 	const d2 = document.createElement('div');
			const d21 = document.createElement('div');
			d21.appendChild( 
				genRadio('action'+key, 'None','none'+key,'none', true) );
			d2.appendChild(d21);

			const d22 = document.createElement('div');
			d22.appendChild( 
				genRadio('action'+key, 'Pause','pause'+key,'pause', false) );
			d2.appendChild(d22);

			const d23 = document.createElement('div');
			d23.appendChild( 
				genRadio('action'+key, 'Play','play'+key,'play', false) );
			d2.appendChild(d23);
		d.appendChild(d2);
		
		const d3 = document.createElement('div');
		d3.appendChild( genCheckbox('Reset','reset'+key,'reset') );
		d.appendChild(d3);
		return d;
	};



 function queHTML(){	
	let page = document.getElementById('whole').cloneNode(true);
	addKeyForIds('que',page);
	let quePage = document.getElementById('que');
	quePage.innerHTML = page.innerHTML;
	quePage.classList.remove('displayNone');

	 //export: insert the allow edit checkbox
	 {	const d = document.getElementById('copyURLToClipboard'+'que')
	 		.parentNode;
	 	d.appendChild( genCheckbox('Allow Edit',
					 'allowEditButton'+'que','allowEditButton'));
	 }
	 
	//stats line
	document.getElementById('statsWrapperque')
	 	.innerHTML = '<div>Number in Queue: <span id="nInQueue"></span></div>';
	 
	//put in the sliders
	let elem = document.getElementById('slidersWrapperque');
	elem.appendChild(genSlider('arque', 'Arrival Rate',
				'5.0',0,10,.5,[0,2,4,6,8,10]));
	elem.appendChild(genSlider('acvque','Arrival CV',
			'0.0',0,2,.5,['0.0','1.0','2.0']));
	elem.appendChild(genSlider('srque','Service Rate',
			'6.0',0,10,.5,[0,2,4,6,8,10] ));
	elem.appendChild(genSlider('scvque','Service CV',
			'0.0',0,2,.5,['0.0','1.0','2.0']));
		 
	 {const d = document.createElement('div');
		 d.className = 'sliderBox';
		 d.appendChild(genPlayResetButtons('que'));
		 d.appendChild(genPlayResetOptions('que'));	
		 elem.appendChild(d);
	 }
	 elem.appendChild(genSlider('speedque','Speed',
					'1x',0,4,1,["slow","fast"]));
	
	
	
};
queHTML();
queStart();
