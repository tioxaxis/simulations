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
	displayToggle
}
from '../mod/rhs.js';
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
export function genButton(id,name){
    const b = document.createElement('button');
    b.innerHTML = name;
    b.id = id;

    const d = document.createElement('div');
    d.className = "sliderBox columnAroundCenter";
    d.append(b);
    return d;

};
export function genArbSlider( id, name, initial, indivs, values){
    const sp = document.createElement('span');
    sp.id = 'disp' + id;
    sp.append(indivs[initial]);
    const disp = document.createElement('div');
    disp.append(name,sp);

    const vals = document.createElement('div');
    vals.className = 'spreadValues';
    for( let v of values){
        let s = document.createElement('span');
        s.append(v);
        vals.append(s);
    }

    const d = document.createElement('div');
    d.className = "sliderBox columnAroundCenter";
    d.append(disp, 
      genRange(id,initial,0,indivs.length-1,1), vals);
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

export function genPlayResetBox(key, cbElem){
    const d = document.createElement('div');
    d.className = 'sliderBox';
    d.append(genPlayResetButtons(key), genPlayResetOptions(key, cbElem));
    return d
}

export function addDiv(key, toId,...fromIds){
    const d = document.getElementById(toId);
    for (let from of fromIds){
        let elem = document.getElementById(from)
            .cloneNode(true);
        addKeyForIds(key,elem);
        d.append(elem);
    }
}

export function htmlNumSlider( inputElem, displayText, initial, sliderValues) {
        const sp = document.createElement('span');
        sp.id = 'disp' + inputElem.id;
        sp.append(initial);
        const disp = document.createElement('div');
        disp.append(displayText,sp);

        const vals = document.createElement('div');
        vals.className="spreadValues";
        for( let v of sliderValues){
            let s = document.createElement('span');
            s.append(v);
            vals.append(s);
        }

        const d = document.createElement('div');
        d.className = "sliderBox columnAroundCenter";
        d.append(disp, inputElem, vals);
        return d;
    };
function domElem(x){
    if( typeof x == "string" ) 
        x = document.getElementById(x);
    return x;
}
export class NumSlider{
    // slider stores a number; receives and returns string
    constructor (key, inputElem, localUpdate, 
                  min, max, deflt, precision, shortLen, scale){
        this.key = key;
        this.inputElem = domElem(inputElem);
//        this.disp = document.getElementById('disp' + this.inputElem.id);
        this.localUpdate = localUpdate;
        this.min = min;
        this.max = max;
        this.deflt = deflt;
        this.precision = precision;
        this.shortLen = shortLen;
        this.scale = scale;
        this.inputElem.addEventListener('input', this.userUpdate.bind(this));
    };

    get() {
        return this.inputElem.value;
    };
    set(x){
        const changed = this.inputElem.value != x;
        this.inputElem.value = x;
        const disp = document.getElementById('disp' + this.inputElem.id);
        if( disp ) disp.innerHTML = Number(x).toFixed(this.precision);
        return changed;
    };
    verify(x) {
        if( (this.min <= x) && (x <= this.max) ) return x.toString();
        reportError(this.key, x);
        return this.deflt.toString();
    };

    encode(x){
       const y = (x * this.scale)
           .toString().padStart(this.shortLen,'0');
        if( y.length > this.shortLen ){
            alert('data from item='+this.key+'  It should be '+this.shortLen+' characters but is='+y)
        }
        return y;
    };
    decode(x){
        return (x / this.scale).toString();
    }
    userUpdate(){
        let x = this.get();
        const disp = document.getElementById('disp' + this.inputElem.id);
        if( disp ) disp.innerHTML = Number(x).toFixed(this.precision);
        this.localUpdate(this);
    }
};
export function htmlArbSlider(inputElem, displayText, initial, sliderValues){
        const sp = document.createElement('span');
		sp.id = 'disp' + inputElem.id;
		sp.append(initial);
		const disp = document.createElement('div');
		disp.append(displayText,sp);
				
		const vals = document.createElement('div');
		vals.className = 'spreadValues';
		for( let v of sliderValues){
            let s = document.createElement('span');
			s.append(v);
			vals.append(s);
		}
		
		const d = document.createElement('div');
		d.className = "sliderBox columnAroundCenter";
		d.append(disp, inputElem, vals);
		return d;
    };
export class ArbSlider{
    //slider holds the index but otherwise use values[index]
    constructor (key, inputElem, localUpdate,  displayValues, values, deflt ){
        this.key = key;
        this.inputElem = domElem(inputElem);
        this.localUpdate = localUpdate;
        this.displayValues = displayValues;
        this.values = values;
        this.deflt = deflt;
        this.shortLen = 1;
        this.inputElem.addEventListener('input', this.userUpdate.bind(this));
        if( values.length > 10 )
            alert('ArbSlider class intialized with more than 10 values');
    };

    get() {
        return this.inputElem.value;
    };
    getValue() {
        const index = this.inputElem.value;
        return this.values[index];
    }
    set(i){
        const changed = this.inputElem.value != i;
        this.inputElem.value = i;
        const disp = document.getElementById('disp' + this.inputElem.id);
        disp.innerHTML = this.displayValues[i];
        return changed;
    };
    verify(x) {
        if( (0 <= x) && (x < this.values.length) ) return x.toString();
        reportError(this.key, x);
        return this.deflt.toString();
    }
    encode(x){
        return x.toString();;
    };
    decode(x){
        return x;
    };
    
    userUpdate(){
        let index = this.inputElem.value;
        const disp = document.getElementById('disp' + this.inputElem.id);
        disp.innerHTML = this.displayValues[index];
        this.localUpdate(this);
    };
    
    

};

export function htmlCheckBox(inp, desc){
        const label = document.createElement('LABEL');
        label.append(inp, desc);
        return label; 
    };
export class CheckBox{
    //slider holds "checked" receives and returns string
    constructor (key, inputElem, localUpdate, deflt) {
        this.key = key;
        this.inputElem = domElem(inputElem);
        this.localUpdate = localUpdate;
        this.deflt = deflt;
        this.shortLen = 1;
        this.inputElem.addEventListener('input', this.userUpdate.bind(this));
    };
    get() {
        return this.inputElem.checked.toString();
    };
    set(x){
        const b = x == 'true';
        const changed = this.inputElem.checked != b;
        this.inputElem.checked = x == 'true';
        return changed;
    };
    verify(x) {
        if( (x == 'true') || (x == 'false') ) return x;
        reportError(this.key, x);
        return this.deflt.toString();
    }
    encode(x){
        return ( x == 'true' ? 'T' : 'F');
    };
    decode(x){
         return ( x == 'T' ? 'true' : 'false');  
    };
    userUpdate(){
        this.localUpdate(this);
    };
}

export class ButtonOnOff{
    // this holds a binary value swapped by clicking a button which 
    // has an onId and offId inside divElem. 
    constructor (key, divElem, onId, offId, localUpdate, deflt) {
        this.key = key;
        this.divElem = divElem;
        this.onId = onId;
        this.offId = offId;
        this.localUpdate = localUpdate;
        this.deflt = deflt;
        this.shortLen = 1;
        this.divElem.addEventListener('click', this.userUpdate.bind(this));
        this.value = this.deflt;
    };
    get() {
        return this.value.toString();
    };
    getValue() {
        return this.value;
    }
    set(x){
        const b = x == 'true';
        const changed = this.value != b;
        this.value = x == 'true';
        if( !this.value ){
            displayToggle(this.onId,this.offId);
        } else {
            displayToggle(this.offId,this.onId);
        }
        return changed;
    };
    verify(x) {
        if( (x == 'true') || (x == 'false') ) return x;
        reportError(this.key, x);
        return this.deflt.toString();
    }
    encode(x){
        return ( x == 'true' ? 'T' : 'F');
    };
    decode(x){
         return ( x == 'T' ? 'true' : 'false');  
    };
    userUpdate(){
        if( this.value ){
            displayToggle(this.onId,this.offId);
        } else {
            displayToggle(this.offId,this.onId);
        }
        this.value = !this.value;
        this.localUpdate(this);
    };
}


export function htmlRadioButton(id, name, value, checked, desc){
    const inp = document.createElement('input');
    inp.type = 'radio';
    inp.name = name;
    inp.id = id;
    inp.setAttribute('value', value);
    if (checked) inp.setAttribute('checked','');

    const label = document.createElement('LABEL');	
    label.append(inp, desc);
    return label;
};
export class RadioButton{
    constructor (key, name, localUpdate, values, deflt){
        this.key = key;
        this.name = name;
        this.localUpdate = localUpdate;
        this.nodelist = document.getElementsByName(name); 
        this.values = values;
        this.deflt = deflt;
        this.shortLen = 1;
        for( let j = 0; j < this.nodelist.length; j++) {
            this.nodelist[j].addEventListener('click',
                this.userUpdate.bind(this));
        }
        if( values.length > 10 )
            alert('Radio Button class intialized with more than 10 values');
    }
    get(){
        for (let j = 0; j < this.nodelist.length; j++) {
          if (this.nodelist[j].checked) {
              return this.nodelist[j].value;
          }
        }
        return -1;
    }
    set(str){
        // can't be done until html exists!!
        for (let j = 0; j < this.nodelist.length; j++) {
		  if (this.nodelist[j].value == str) {
              const changed = !this.nodelist[j].checked;
              this.nodelist[j].checked = true;
              return changed;
          }
        }
        alert("can't find the doc elem with name", this.name, " and value ", str);
        debugger;
    };
    verify(v) {
        const k = this.values.findIndex((x) => x == v );
        if( k >= 0 ) return v;
        reportError(this.key, v);
        return this.deflt;
    };
    encode(v){
        return this.values.findIndex((x) => x == v ).toString();
    };
    decode(k){
         return this.values[k];
    };
    userUpdate(){
        this.localUpdate(this);
    };
    
    

};
// use genRange(   ) as the inputElem for this.
 
export class IntegerInput{
    //returns and receives number
    constructor (key, inputElem, localUpdate,
                  min, max, deflt, shortLen){
        this.key = key;
        this.inputElem = domElem(inputElem);
        this.localUpdate = localUpdate;
        this.min = min;
        this.max = max;
        this.deflt = deflt;
        this.shortLen = shortLen;
        this.inputElem.addEventListener('change',this.userUpdate.bind(this));
    };

    get() {
        return this.inputElem.value;
    };
    set(x){
        const changed = this.inputElem.value != x;
        this.inputElem.value = x;
        return changed;
    };
    verify(x){
        if( (this.min <= x)  && (x <= this.max) ) return x;
        reportError(this.key, x);
        return this.deflt.toString();
    };
    encode(x){
        const y = x.toString().padStart(this.shortLen,'0');
        if( y.length > this.shortLen ){
            alert('data from item='+this.key+' It should be '+this.shortLen+' characters but is='+y)
        }
        return y;
    };
    decode(x){
       return x; 
    };
    userUpdate(event){
        let x = Number(event.target.value);
        if( x < this.min ) event.target.value = this.min;
        else if( x > this.max ) event.target.value = this.max;
        else if( x != Math.floor(x)) event.target.value = Math.floor(x);
        this.localUpdate(this);
//        if( x != event.target.value ) 
//            console.log(' In integer Input and adjusted value from',x,' to ',
//                   event.target.value);
    }
}
export class LegendItem{
    //returns and receives string 'true'/'false' but stores boolean
    constructor ( key, line, localUpdate, deflt){
        this.key = key;
        this.line = line;
        this.localUpdate = localUpdate;
        this.deflt = deflt;
        this.shortLen = 1;
        this.line.button.addEventListener('click',
             this.userUpdate.bind(this));
    }
    get() {
         return this.line.visible.toString();
    };
    set(x){
        const b = (x == 'true');
        const changed = this.line.visible != b;
        this.line.setVisibility(b);
        return changed;
    };
    verify(x) {
        if( (x == 'true' || x == 'false') ) return x;
        reportError(this.key, x);
        return this.deflt.toString();
    };
    encode(x) {
        return (x == 'true' ? 'T' : 'F');
    };
    
    decode(x) {
        return (x == 'T' ? 'true' : 'false');
    };
    
    userUpdate(){
        if(this.localUpdate) this.localUpdate(this);
    }
    
};

function reportError(key,x){
    if( x == undefined ) 
        console.log('input with key '+key+' has an undefined value and it will be set to the default value');
    else 
        console.log('input with key '+key+' has a value '+x+' which is not an allowed value.  It will be set to the default value');
}

export function match(inps,keys){
    for( let inp of inps ) {
        for( let key of keys ) {
            if( key == inp.key ){
                return true;
            }
        }
    }
    return false;
}
