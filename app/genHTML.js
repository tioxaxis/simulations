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

export function addKeyForIds(key,node){
		if ( node.id ) node.id += key;
		const children = node.childNodes;
		for( let child of children )
			if ( child.tagName ) 
				addKeyForIds( key, child ); 	
	}

	export function genRadio(name,desc,id,value,checked){	
		const inp = document.createElement('input');
		inp.type = 'radio';
		inp.name = name;
		inp.id = id;
		inp.setAttribute('value',value);
		if (checked) inp.setAttribute('checked','');
		
		const label = document.createElement('LABEL');	
		label.append(inp, desc);
		return label;
	}
	export function genCheckbox(desc,id){
		const inp = document.createElement('input');
		inp.type = 'checkbox';
		inp.id = id;
		
		const label = document.createElement('LABEL');
		label.append(inp, desc);
		return label; 
	}
	export function genRange(id, initial, min, max, step){
		let inp = document.createElement('input');
		inp.type ='range';
		inp.id = id;
		inp.min = min;
		inp.max = max;
		inp.step = step;
		inp.setAttribute('value',initial);
		return inp;
	};


	export function hideNode( node ){
		node.classList.add('displayNone');
		return node;
	}

	export function genSlider( id, before, mid, after,
								initial, min, max, step, values){	
		const sp = document.createElement('span');
		sp.id = id + 'Display';
		sp.append(mid);
		const disp = document.createElement('div');
		disp.append(before,sp,after);
				
		const vals = document.createElement('div');
		vals.className="spreadValues";
		for( let v of values){
			let s = document.createElement('span');
			s.append(v);
			vals.append(s);
		}
		
		const d = document.createElement('div');
		d.className = "sliderBox columnAroundCenter";
		d.append(disp, genRange(id,initial,min,max,step), vals);
		return d;
	}

	 function genPlayResetButtons(key){
		const d = document.getElementById('playButtons').cloneNode(true);
		addKeyForIds(key,d);
		return d;
	};

	 function genPlayResetOptions(key){
		const c1 = document.createElement('div');
		c1.className = 'columnAroundStart';
			const i11 = document.createElement('label');
			i11.append('Action:');
		c1.append(i11,genCheckbox('Reset','reset'+key));

		const c2 = document.createElement('div');
		c2.className = 'columnAroundStart';
		c2.append(
			genRadio('action'+key, 'None','none'+key,'none', true),		
			genRadio('action'+key, 'Pause','pause'+key,'pause', false), 
			genRadio('action'+key, 'Play','play'+key,'play', false) );

		const d = document.createElement('div');
		d.className = "rowAroundCenter displayNone";
		d.id = 'actionOptions'+key;
		d.append(c1,c2);
		
		return d;
	};

	export function genPlayResetBox(key){
		const d = document.createElement('div');
		d.className = 'sliderBox';
		d.append(genPlayResetButtons(key), genPlayResetOptions(key));
		return d
	}
	
	export function copyMainPage(key){
		let page = document.getElementById('whole').cloneNode(true);
		addKeyForIds(key, page);
		let keyPage = document.getElementById(key);
		keyPage.innerHTML = page.innerHTML;

	 	//export: insert the allow edit checkbox
	 	const d1 = document.getElementById('copyURLToClipboard'+ key);
	 	d1.parentNode.append( genCheckbox('Allow Edit',
				'allowEditButton'+ key));	
	}