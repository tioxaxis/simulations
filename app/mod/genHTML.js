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
export function genButton(id,name){
    const b = document.createElement('span');
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

export function genSlider( id, before, mid, after,
                            initial, min, max, step, values){	
    const sp = document.createElement('span');
    sp.id = 'disp' + id;
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

export function addDiv(key, toId,...fromIds){
    const d = document.getElementById(toId);
    for (let from of fromIds){
        let elem = document.getElementById(from)
            .cloneNode(true);
        addKeyForIds(key,elem);
        d.append(elem);
    }
}

export function copyMainPage(key){
    let page = document.getElementById('whole')
        .cloneNode(true);
    addKeyForIds(key, page);
    let keyPage = document.getElementById(key);
    keyPage.innerHTML = page.innerHTML;
}

export function htmlNumSlider(slider, displayText,initial,sliderValues){
    const sp = document.createElement('span');
    sp.id = 'disp' + slider.id;
    sp.append(initial.toFixed(slider.precision));
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
    d.append(disp, genRange(slider.id,initial,
                slider.min,slider.max,slider.step),vals);
    return d;
};

export class NumRange{
    constructor (id, specifics, precision, min, max, step){
        this.id = id;
        this.key = id.slice(-3);
        this.specifics = specifics;
        this.precision = precision;
        this.min = min;
        this.max = max;
        this.step = step;   
    };

    get() {
        return Number(document.getElementById(this.id).value);
    };
    set(x){
        document.getElementById(this.id).value = x;
        const disp = document.getElementById('disp' + this.id);
        if( disp ) disp.innerHTML = x.toFixed(this.precision);
        if( this.specifics ) this.specifics(this.id, x);
    };
    userUpdate(){
        let x = this.get();
        const disp = document.getElementById('disp' + this.id);
        if( disp ) disp.innerHTML = x.toFixed(this.precision);
        if( this.specifics ) this.specifics(this.id, x);
        return x;
    }
};
export function htmlArbSlider(slider, displayText,
                                   initial, sliderValues){
        const sp = document.createElement('span');
		sp.id = 'disp' + slider.id;
		sp.append(slider.displayValues[initial]);
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
		d.append(disp, 
		  genRange(slider.id,initial,0,slider.values.length-1,1), vals);
		return d;
    };

export class ArbRange{
    constructor (id, specifics, displayValues, values ){
        this.id = id;
        this.displayValues = displayValues;
        this.values = values;
        this.specifics = specifics;
    };

    get() {
        return this.values[document.getElementById(this.id).value];
    };
    set(index){
        document.getElementById(this.id).value = index;
        const disp = document.getElementById('disp' + this.id);
        disp.innerHTML = this.displayValues[index];
        if( this.specifics ) this.specifics(this.id, index, this.values);

    };
    userUpdate(){
        let index = document.getElementById(this.id).value;
        const disp = document.getElementById('disp' + this.id);
        disp.innerHTML = this.displayValues[index];
        if( this.specifics ) this.specifics(this.id, index, this.values);
        return index;
    };


};
    
export function htmlCheckBox(checkBox,desc){
    const inp = document.createElement('input');
		inp.type = 'checkbox';
		inp.id = checkBox.id;
		
		const label = document.createElement('LABEL');
		label.append(inp, desc);
		return label; 
};

export class CheckBox{
    constructor(id, specifics){
        this.id = id;
        this.specifics = specifics;
    };
    get() {
            return document.getElementById(this.id).checked.toString();
        };
    set(x){
            const elem = document.getElementById(this.id);
            elem.checked = x == 'true';
            if( this.specifics ) this.specifics(this.id, x);
            
        };
    userUpdate(){
            const b = this.get();
            if( this.specifics ) this.specifics(this.id, b);
            return b;
        };
}

export function htmlRadioButton(radioButton, id ,value, checked, desc){
    const inp = document.createElement('input');
    inp.type = 'radio';
    inp.name = radioButton.name;
    inp.id = id;
    inp.setAttribute('value', value);
    if (checked) inp.setAttribute('checked','');
    
    const label = document.createElement('LABEL');	
    label.append(inp, desc);
    return label;
};

export class RadioButton{
    constructor(name, specifics){
        this.name = name;
        this.specifics = specifics;
    }
    get(){
        const nodelist = document.getElementsByName(this.name);
        for (let j = 0; j < nodelist.length; j++) {
          if (nodelist[j].checked) return nodelist[j].value;
        }
        return -1;
    }
    set(x){
        // can't be done until html exists!!
        const nodelist = document.getElementsByName(this.name);
        for (let j = 0; j < nodelist.length; j++) {
		  if (nodelist[j].value == x) {
              nodelist[j].checked = true;
              this.specifics(this.name, x);
              return;
          }
        }
        alert("can't find the doc elem with name", this.name, " and value ", x);
        debugger;
    };
    userUpdate(){
        const v = this.get();
        if( this.specifics ) this.specifics(this.name, v)
        return v;
        
    };
    
};

 
export class IntegerInput{
    constructor (id, specifics, min, max, step){
        this.id = id;
        this.specifics = specifics;
        this.min = min;
        this.max = max;
        this.step = step;   
    };

    get() {
        return Number(document.getElementById(this.id).value);
    };
    set(x){
        document.getElementById(this.id).value = x;
//        const disp = document.getElementById('disp' + this.id);
//        if( disp ) disp.innerHTML = x.toFixed(this.precision);
        if( this.specifics ) this.specifics(this.id, x);
    };
    userUpdate(){
        let x = this.get();
//        const disp = document.getElementById('disp' + this.id);
//        if( disp ) disp.innerHTML = x.toFixed(this.precision);
        if( this.specifics ) this.specifics(this.id, x);
        return x;
    }
}


	
	