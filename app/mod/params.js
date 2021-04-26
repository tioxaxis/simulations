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
    constructor(key,min,max,step,scale,deflt){
        this.key = key;
        this.min = min;
        this.max = max;
        this.step = step;
        this.scale = scale;
        this.deflt = deflt;
        this.value = deflt;
    }
    get(){
        return this.value;
    };
    set(x){
        const changed = this.value != x;
        this.value = x;
        /* set HTML if avail 
            set current li[key] = x;
            call simu(x);    */
        return changed;
    };
    encode(x){
        return x * scale;
    };
    decode(x){
        return (x / scale).toString();
    };
    verify(x){
        const i = ( x - this.min) / this.step;

        if ((this.min <= x) && (x <= this.max)
        && (i == Math.floor(i))) return x.toString();
        reportError(this.key, x);
        return this.deflt.toString();
    }
};
export class ArbParam{
    constructor(key,values,deflt){
        this.key = key;
        this.values = values;
        this.deflt = deflt;
        this.index = values.findIndex( (v) => v == deflt );
    };
    getValue(){
        return this.values[this.index];
    }
    get(){
        return this.index;
    };
    set(i) {
        const changed = this.index != i;
        this.index = i;
        /* set HTML if avail 
            set current li[key] = this.values[this.index];
            call simu(this.values[this.index]);    */
        return changed;
    };
    encode(x) {
        return Number(x);
    };
    decode(x) {
        return x.toString();
    };
    verify(x) {
        if ((0 <= x) && (x <= this.values.length))
             return x.toString();
        reportError(this.key, x);
        return this.deflt.toString();
    };


};

export class BoolParam{
    // internal store 0,1   external string true or false;
    constructor(key,deflt){
        this.key = key;
        this.deflt = deflt;
        this.value = deflt == 'true' ? 1 : 0;
    }
    get() {
        return this.value.toString();
    };
    set(x) {
        const b = x == 'true';
        const changed = this.value != b;
        this.value = x == 'true';
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

class Param{
    constructor(key,deflt){
        this.key = key;
        this.deflt = deflt;

    };

};
export class HtmlNumSlider{
    constructor(param, dispText, dispValues){
        this.param = param;
        this.dispText = dispText;
        this.dispValues = dispValues;
    }
    create(){
        const sp = document.createElement('span');
        sp.id = 'disp' + this.param.key;
        sp.append(this.param.value);

        const disp = document.createElement('div');
        this.display = disp;
        disp.append(this.dispText, sp);

        const vals = document.createElement('div');
        vals.className = "spreadValues";
        for (let v of dispValues) {
            let s = document.createElement('span');
            s.append(v);
            vals.append(s);
        }
        const inp = document.createElement('input');
        this.input = inp;
        inp.type = 'range';
        inp.id = this.param.key;
        inp.min = this.param.min;
        inp.max = this.param.max;
        inp.step = this.param.step;
        inp.className = 'backDefault';
        inp.setAttribute('value', this.param.value);
        inp.addEventListener('input', 
            this.userChange.bind(this));

        const d = document.createElement('div');
        d.className = "sliderBox columnAroundCenter";
        d.append(disp, inp, vals);

        return d;
    };
    get(){
        return this.input.value;
    };
    set(v){
        this.input.value = v;
        this.display.innerHTML = v.toFixed(this.precision);
    }
    userChange(){
        const v = Number(this.input.value);
        this.param.set(v);
        this.display.innerHTML = v.toFixed(this.precision);
    };
};

export class HtmlArbSlider {
    constructor(param, dispText, dispValues) {
        this.param = param;
        this.dispText = dispName;
        this.dispValues = dispValues;
    }
    create() {
        const sp = document.createElement('span');
        sp.id = 'disp' + this.param.key;
        sp.append(this.param.value);

        const disp = document.createElement('div');
        this.display = disp;
        disp.append(this.dispText, sp);

        const vals = document.createElement('div');
        vals.className = "spreadValues";
        for (let v of dispValues) {
            let s = document.createElement('span');
            s.append(v);
            vals.append(s);
        }
        const inp = document.createElement('input');
        this.input = inp;
        inp.type = 'range';
        inp.id = this.param.key;
        inp.min = 0;
        inp.max = this.dispValues.length-1;
        inp.step = 1;
        inp.className = 'backDefault';
        inp.setAttribute('value', this.param.value);
        inp.addEventListener('input',
            this.userChange.bind(this));

        const d = document.createElement('div');
        d.className = "sliderBox columnAroundCenter";
        d.append(disp, inp, vals);

        return d;
    };
    get() {
        return this.input.value;
    };
    set(i) {
        this.input.value = i;
        this.display.innerHTML = this.displayValues[i];
    }
    userChange() {
        const i = Number(this.input.value);
        this.param.set(i);
        this.display.innerHTML = this.displayValues[i];
    };
};

export class HtmlCheckBox{
    constructor(param) {
        this.param = param; 
    };
    create(desc){
        const inp = document.createElement('input');
        this.input = inp;
        inp.type = 'checkbox';
        inp.id = id;
        inp.checked = this.param.value =='true' ? true : false;

        const label = document.createElement('LABEL');
        label.append(inp, desc);
        
        inp.addEventListener('input', this.userChange.bind(this));
        return label;
    };
    get() {
        return this.input.checked.toString();
    };
    set(x) {
        const b = x == 'true';
        const changed = this.input.checked != b;
        this.input.checked = x == 'true';
        return changed;
    };
    userChange() {
        this.param.set(this.input.checked);
    };
};
export class HtmlRadioButtons{
    constructor(param,name) {
        this.param = param;
        this.name = name;
    }
    createAButton(value, checked, desc) {
        const inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = this.name;
        if( this.param.values.findIndex( v => v == value) < 0 ){
            alert('creating a radio button with value not in associate list:'+value);
            debugger;
        }
        inp.setAttribute('value', value);
        if (checked) inp.setAttribute('checked', '');

        inp.addEventListener('click', this.userChange.bind(this));
        const label = document.createElement('LABEL');
        label.append(inp, desc);
        return label;
    };
    //     this.nodelist = document.getElementsByName(param.name);
    //     for (let j = 0; j < this.nodelist.length; j++) {
    //         this.nodelist[j].addEventListener('click',
    //             this.userChange.bind(this));
    //     }
    // }
    create(){

    }
    get() {
        for (let j = 0; j < this.nodelist.length; j++) {
            if (this.nodelist[j].checked) {
                return this.nodelist[j].value;
            }
        }
        return -1;
    }
    set(str) {
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
    
    userChange(event) {
        const value = event.target.value ;
        const index = this.values.findIndex( v => v == value );
        this.param.set(index);
    };




};
export class HtmlButtonOnOff{
    constructor(param, onId, offId){
        this.param = param;
        this.onId = onId;
        this.offId = offId;
    }
    create(input){
        this.input = input;

    }
    set(x){
        if (x) {
            displayToggle(this.onId, this.offId);
        } else {
            displayToggle(this.offId, this.onId);
        }
    };
    userChange(){
        if (this.param.value) {
            displayToggle(this.onId, this.offId);
        } else {
            displayToggle(this.offId, this.onId);
        }
        this.param.value = !this.param.value;
    }

};
export class HtmlIntegerInput{
    constructor(param, min, max) {
        this.param = param;
        this.min = min;
        this.max = max;
        //        this.shortLen = shortLen;
        
    };
    create(input){
        this.input = input;
        this.input.addEventListener('change', this.userChange.bind(this));
    };

    get() {
        return this.input.value;
    };
    set(x) {
        const changed = this.input.value != x;
        this.input.value = x;
        return changed;
    };
    userChange(event) {
        let x = Number(event.target.value);
        if (x < this.min) event.target.value = this.min;
        else if (x > this.max) event.target.value = this.max;
        else if (x != Math.floor(x)) event.target.value = Math.floor(x);
        this.localUpdate(this);
    }
};
export class HtmlLegendItem{
    constructor(param) {
        this.param = param;
        
    }
    create(input){
        this.input = input;
        input.addEventListener('click', this.userChange.bind(this));
    }
    set(x) {
        const b = (x == 'true');
        const changed = this.param.get() != b;
        this.param.set(b);
        return changed;
    };
    userChange() {
        this.param.set(!this.param.get())
    }

};


