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


export class NumParam{
    constructor(key,min,max,step,deflt){
        this.key = key;
        this.min = min;
        this.max = max;
        this.step = step;
        this.precision = Math.ceil(-Math.log10(step));
        this.scale = Math.pow(10, this.precision);
        this.deflt = deflt;
        this.value = deflt;
    }
    getNumber(){
        return this.value;
    };
    setNumber(x){
        const changed = this.value != x;
        this.value = x;
        return changed;
    };
    encode(str){
        return Number(str) * this.scale;
    };
    decode(x){
        return (x / this.scale).toString();
    };
    verify(str){
        const x = Number(str);
        const i = ( x - this.min) / this.step;
        if ((this.min <= x) && (x <= this.max)
        && (i == Math.floor(i))) return x.toString();
        reportError(this.key, x);
        return this.deflt.toString();
    }
};
export class ArbParam{
    constructor(key, values, deflt){
        this.key = key;
        this.values = values; //.map( v => v.toString());
        this.deflt = deflt; //.toString();
        this.index = values.findIndex( (v) => v == deflt );
    };
    getIndex(){
        return this.index;
    }
    getNumber(){
        return this.values[this.index];
    }
    setIndex(i) {
        const changed = this.index != i;
        this.index = i;
        return changed;
    };
    encode(str) {
        const index = this.values.findIndex((v) => v == str);
        if( index >= 0 ) return index;
        alert('Couldnt find '+str+' in ArbParm values');
        debugger;
        return 0;
    };
    decode(i) {
        if( 0 <= i && i < this.values.length ) return this.values[i];
        alert('index' + i + 'out of bounds in ArbParm');
        debugger;
        return this.values[0];
    };
    verify(x) {
        if (this.values.find(v => v == x)) return x.toString();
        reportError(this.key, x);
        return this.deflt.toString();
    };
};

export class BoolParam{
    // internal store 0,1   external string true or false;
    constructor(key,deflt){
        this.key = key;
        this.deflt = deflt;
        this.value = deflt;
    }
    getBool() {
        return this.value;
    };
    setBool(b) {
        const changed = this.value != b;
        this.value = b;
        return changed;
    };
    verify(x) {
        if ((x == 'true') || (x == 'false')) return x;
        reportError(this.key, x);
        return this.deflt.toString();
    }
    encode(x) {
        return (x == 'true' ? 1 : 0);
    };
    decode(x) {
        return (x == 0 ? 'false' : 'true');
    };
};
export class Description {
    constructor(key) {
        this.key = key;
        this.deflt = 'default' + key;
        this.htmlObj = { set: function () {}}
    }
    encode(x) { return x };
    decode(x) { return x };
    verify(x) { return x };
    set(x) { };
    get() { return '' };
};

function reportError(key, x) {
    if (x == undefined)
        console.log('input with key ' + key + ' has an undefined value and it will be set to the default value');
    else
        console.log('input with key ' + key + ' has a value ' + x + ' which is not an allowed value.  It will be set to the default value');
};

export function match(inps, keys) {
    for (let inp of inps) {
        for (let key of keys) {
            if (key == inp.key) {
                return true;
            }
        }
    }
    return false;
};


class Param{
    constructor(key,deflt){
        this.key = key;
        this.deflt = deflt;

    };

};
export class NumSlider extends NumParam {
    constructor(key, min, max, step, deflt){
        super(key, min, max, step, deflt)
        this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: key } });
        this.display = null;
    }
    create(dispText, sliderValues, bkgndClass = 'backDefault'){

        const sp = document.createElement('span');
        sp.append(this.value.toFixed(this.precision));
        this.display = sp

        const disp = document.createElement('div');
        disp.append(dispText, sp);

        const vals = document.createElement('div');
        vals.className = "spreadValues";
        for (let v of sliderValues) {
            let s = document.createElement('span');
            s.append(v);
            vals.append(s);
        }
        const inp = document.createElement('input');
        this.input = inp;
        inp.type = 'range';
        inp.id = this.key;
        inp.min = this.min;
        inp.max = this.max;
        inp.step = this.step;
        inp.className = bkgndClass;
        inp.setAttribute('value', this.value);
        inp.addEventListener('input', 
            this.userChange.bind(this));

        const d = document.createElement('div');
        d.className = "sliderBox columnAroundCenter";
        d.append(disp, inp, vals);

        return d;
    };
    addListener(input){
        this.input = input;
        input.addEventListener('input', this.userChange.bind(this));
    };
    setDisplay(v){
        if( this.display ) 
            this.display.innerHTML = Number(v).toFixed(this.precision);
    };
    get(){
        return super.getNumber().toString();
    }
    set(v){
        this.input.value = v;
        this.setDisplay(v);
        return super.setNumber(Number(v));
    }
    userChange(){
        const v = Number(this.input.value);
        this.setDisplay(v);
        super.setNumber(v);
        this.input.dispatchEvent(this.event);
    
    };
};

export class ArbSlider extends ArbParam {
    constructor(key, values, deflt) {
        super(key, values, deflt);
        this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: key } });
    }
    create(dispText, dispValues, sliderValues, bkgndClass = 'backDefault') {
        this.dispValues = dispValues;

        const sp = document.createElement('span');
        sp.id = 'disp' + this.key;
        sp.append(this.dispValues[this.index]);
        this.display = sp;

        const disp = document.createElement('div');
        
        disp.append(dispText, sp);

        const vals = document.createElement('div');
        vals.className = "spreadValues";
        for (let v of sliderValues) {
            let s = document.createElement('span');
            s.append(v);
            vals.append(s);
        }
        const inp = document.createElement('input');
        this.input = inp;
        inp.type = 'range';
        inp.id = this.key;
        inp.value = this.index;
        inp.min = 0;
        inp.max = this.dispValues.length-1;
        inp.step = 1;
        inp.className = bkgndClass;
        inp.setAttribute('value', this.value);
        inp.addEventListener('input',
            this.userChange.bind(this));

        const d = document.createElement('div');
        d.className = "sliderBox columnAroundCenter";
        d.append(disp, inp, vals);

        return d;
    };
    setDisplay(i){
        this.display.innerHTML = this.dispValues[i];
    }
    get(){
        return this.values[this.index];
    }
    set(str) {
        const index = this.values.findIndex(v => v == str);
        this.input.value = index;
        this.setDisplay(index);
        return super.setIndex(index);
    }
    userChange() {
        const i = Number(this.input.value);
        super.setIndex(i);
        this.setDisplay(i);
        this.input.dispatchEvent(this.event);
    };
};

export class Checkbox extends BoolParam {
    constructor(key, deflt) {
       super(key, deflt);
       this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: this.key } })    };
    create(desc){
        const inp = document.createElement('input');
        this.input = inp;
        inp.type = 'checkbox';
        // inp.id = id;
        inp.checked = this.value;

        const label = document.createElement('LABEL');
        label.append(inp, desc);
        
        inp.addEventListener('input', this.userChange.bind(this));
        return label;
    };
    get(){
        return super.getBool().toString();
    }
    set(x) {
        const b = x == 'true';
        this.input.checked = b;
        return super.setBool(b);
    };
    userChange() {
        super.setBool(this.input.checked);
        this.input.dispatchEvent(this.event);
    };
    
};
export class RadioButtons extends ArbParam {
    constructor(key, values, deflt, name) {
        super(key, values, deflt)
        this.name = name;
        this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: key } });
}
    createAButton(value, checked, desc) {
        const inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = this.name;
        if( this.values.findIndex( v => v == value) < 0 ){
            alert('creating a radio button with value not in associate list:'+value);
            debugger;
        }
        inp.setAttribute('value', value);
        if (checked) inp.setAttribute('checked', '');

        inp.addEventListener('click', this.userChange.bind(this));
        const label = document.createElement('LABEL');
        label.append(inp, desc);
        this.input = inp;
        return label;
    };
    addListeners(){
        this.nodelist = document.getElementsByName(this.name);
        this.input = this.nodelist[0];
        for (let j = 0; j < this.nodelist.length; j++) {
            this.nodelist[j].addEventListener('click',
                this.userChange.bind(this));
        }
    }

    // get() {
    //     for (let j = 0; j < this.nodelist.length; j++) {
    //         if (this.nodelist[j].checked) {
    //             return this.nodelist[j].value;
    //         }
    //     }
    //     return -1;
    // }
    get(){
        return this.values[super.getIndex()];
    }
    set(str) {
        const index = this.values.findIndex(v => v == str);
        super.setIndex(index);

        // can't be done until html exists!!
        if( !this.nodelist ) this.nodelist = document.getElementsByName(this.name);
        for (let j = 0; j < this.nodelist.length; j++) {
            if (this.nodelist[j].value == str) {
                const changed = !this.nodelist[j].checked;
                this.nodelist[j].checked = true;
                
                return changed;
            }
        }
        alert("can't find the doc elem with name"+ this.name+ " and value "+ str);
        debugger;
    };
    
    userChange(event) {
        const value = event.target.value ;
        const index = this.values.findIndex( v => v == value );
        console.log('in userChange Radio',this.key, this.name, index);
        super.setIndex(index);
        this.input.dispatchEvent(this.event);
    };




};
export class ButtonToggle extends BoolParam {
    constructor(key, deflt){
        super(key, deflt);
        this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: key } });
}
    create(input, onId, offId){
        this.input = input;
        this.onId = onId;
        this.offId = offId;
        input.addEventListener('click', this.userChange.bind(this));
        return input;
    }
    setDisplay(b){
        if (b) {
            displayToggle(this.onId, this.offId);
        } else {
            displayToggle(this.offId, this.onId);
        }
    };
    get(){
        return super.getBool().toString();
    }
    set(x){
        const b = ( x == 'true' );
        this.setDisplay(b);
        return super.setBool(b);
    };
    userChange(){
        const b = !super.getBool();
        this.setDisplay(b);
        super.setBool(b);
        this.input.dispatchEvent(this.event);
    }

};
export class IntegerInput extends NumParam {
    constructor(key, min, max) {
        super(key, min, max, 1, min);
        this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: key } });
};
    addListener(input){
        this.input = input;
        this.input.addEventListener('change', this.userChange.bind(this));
    };

    verify(x){
        if (x <= this.min) return this.min;
        if (x >= this.max) return this.max;
        if (x != Math.floor(x)) return Math.floor(x);
        return x;
    }
    get(){
        return super.getNumber();
    }
    set(x) {
        const y = this.verify(x);
        this.input.value = y;
        return super.setNumber(y);
    };
    userChange(event) {
        this.input.value = this.verify(this.input.value);
        super.setNumber(this.input.value);
        this.input.dispatchEvent(this.event);
    }
};
export class LegendButton extends BoolParam {
    constructor(key, deflt) {
        super(key, deflt);       
        this.event = new CustomEvent('localUpdate', { bubbles: true, detail: { key: key } });
}
    create(color, text, omKey){
        this.id = this.key + omKey;
        this.button = document.createElement('div');
        this.button.classList.add('legendbox');
        this.button.id = this.id;

        const dot = document.createElement('div');
        dot.classList.add('legendCircle');
        dot.innerHTML = '&#11044;'
        dot.style = 'color:' + color;

        const txt = document.createElement('div');
        txt.classList.add('legendText');
        txt.innerHTML = text;
        this.button.append(dot, txt);
        if ( !this.value  )
            this.button.classList.add('crossOut');
        
        this.button.addEventListener('click', this.userChange.bind(this));
        return this.button;
    };

    setLegendText(text) {
        const children = this.button.childNodes;
        children[1].innerHTML = text;
    };
    setDisplay(visible){
        if (visible)
            this.button.classList.remove('crossOut');
        else
            this.button.classList.add('crossOut');
    }
    get(){
        return super.getBool().toString();
    }
    set(x) {
        const b = ( x == 'true' );
        this.setDisplay(b);
        return super.setBool(b);
    };
    userChange() {
        const visible = !super.getBool();
        this.setDisplay(visible);
        super.setBool(visible);
        this.button.dispatchEvent(this.event);
    }

};


export function htmlNoSlider(id, displayText, initial) {
    const sp = document.createElement('span');
    sp.id = 'disp' + id;
    sp.append(initial);
    const disp = document.createElement('div');
    disp.append(displayText, sp);
    const dummySlider = document.createElement('div');
    dummySlider.innerHTML = '  '
    const dummyValues = document.createElement('div');
    dummyValues.innerHTML = '  '
    const d = document.createElement('div');
    d.className = "sliderBox columnAroundCenter";
    d.append(disp, dummySlider, dummyValues);
    return d;
};

export function genPlayResetBox(key, usrInputs) {
    const d1 = document.getElementById('playButtons').cloneNode(true);
    addKeyForIds(key, d1);

    const c1 = document.createElement('div');
    c1.className = 'columnAroundStart';

    const i11 = document.createElement('label');
    i11.append('Action:');

    const checkbox = usrInputs.get('reset');
    c1.append(i11, checkbox.create('Reset'));

    const c2 = document.createElement('div');
    c2.className = 'columnAroundStart';
    const radioSet = usrInputs.get('action');
    const none = radioSet.createAButton('none', true, 'None');
    const play = radioSet.createAButton('play', false, 'Play');
    const pause = radioSet.createAButton('pause', false, 'Pause');
    c2.append(none, pause, play);
    // radioSet.addListeners();

    const d2 = document.createElement('div');
    d2.className = "rowAroundCenter displayNone";
    d2.id = 'actionOptions' + key;
    d2.append(c1, c2);

    const d = document.createElement('div');
    d.className = 'sliderBox';
    d.append(d1, d2);
    return d
};

export function addDiv(key, toId, ...fromIds) {
    const d = document.getElementById(toId);
    for (let from of fromIds) {
        let elem = document.getElementById(from)
            .cloneNode(true);
        addKeyForIds(key, elem);
        d.append(elem);
    }
}


export function addKeyForIds(key, node) {
    if (node.id) node.id += key;
    const children = node.childNodes;
    for (let child of children)
        if (child.tagName)
            addKeyForIds(key, child);
}

export function hideNode(node) {
    node.classList.add('displayNone');
    return node;
}