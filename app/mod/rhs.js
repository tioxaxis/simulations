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

// two parts:  Sliders are on top of rhs
// the list of scenarios are below on the rhs
//  a scenario is stored several ways:
//  1) in the sliders (but without a title called desc)
//  2) in an object called a row,  the array of all of them is rows
//	3) in an li elem in DOM under .scenario;  the set is in the UL element
//  4) encoded in a string to go into a url
//  5) in JSON in a file for the defaults
//   option 2 is the way to go between the various types.
//var framesDone  = 0;
import {
	tioxSpeeds, Heap, StageOnCanvas, fromBase64, toBase64
}
from "./util.js";
import {
	ItemCollection, ResourceCollection
}
from "./stepitem.js";
import {
    Description
}
from "./genHTML.js";

function enableButtonQ(name,bool){
	const elem = document.getElementById(name);
	if (bool) {
		elem.classList.add('actButton');
		elem.classList.remove('disButton');
	} else {
		elem.classList.add('disButton');
		elem.classList.remove('actButton');
	}
};



export function displayToggle(a,b){
	if( Array.isArray(a)){
		for (let elem of a)
			document.getElementById(elem).classList.remove('displayNone');
	} else if (a) { 
		document.getElementById(a).classList.remove('displayNone');
	}
	
	if( Array.isArray(b)){
		for (let elem of b)
			document.getElementById(elem).classList.add('displayNone');
	} else if (b) {
		document.getElementById(b).classList.add('displayNone');
	}
}


export class OmConcept {
	constructor(key){
		this.key = key;
		this.resetCollection = [];
		
		
		this.keyForLocalStorage = 'Tiox-' + key;
		Math.seedrandom('this is a Simulation');
		
		this.textInpBox = document.createElement("INPUT");
		this.textInpBox.type = "text";
		this.textInpBox.className = "textInput";
		this.textInpBox.placeholder = "scenario name";
		
		this.ulPointer = document.getElementById("ULScenarioList"+key);		
		this.currentLi = null, // poiner to current  LI in the UL in the HTML
        this.lastLi = null,

		this.textMode = false,
		this.editMode = false,
		this.toastMode = false,
		this.fromURL = false;

        this.now = 0;
		this.frameNow = 0;
		this.heap = new Heap((x, y) => x.time < y.time);

		this.frameSpeed = 1.0; 

		this.isRunning = false;
		this.requestAFId = null; // id for requestAnimationFrame

		
		this.itemCollection = new ItemCollection();
        this.resourceCollection = new ResourceCollection();
		this.resetCollection.push(this.itemCollection);
		
		//***** Set up event listeners for user interface  ********
		
		// buttons
		document.getElementById('playButton' + this.key)
			.addEventListener('click', this.play.bind(this));
		document.getElementById('pauseButton' + this.key)
			.addEventListener('click', this.pause.bind(this));
		document.getElementById('resetButton' + this.key)
			.addEventListener('click', this.reset.bind(this));
		document.getElementById('addButton' + this.key)
			.addEventListener('click', this.addRow.bind(this));
		document.getElementById('deleteButton' + this.key)
			.addEventListener('click', this.deleteSelected.bind(this));
		document.getElementById('editButton' + this.key)
			.addEventListener('click', this.startEdit.bind(this));
		document.getElementById('exitButton' + this.key)
			.addEventListener('click', this.exitEdit.bind(this));
		document.getElementById('linkButton' + this.key)
			.addEventListener('click', this.exportWithLink.bind(this));
		document.getElementById('resetScenarios' + this.key)
			.addEventListener('click', this.resetScenarios.bind(this));
		document.getElementById(this.key)
			.addEventListener('click', this.anyClick.bind(this),true);

		// click on scenario name
		this.ulPointer.addEventListener('click', this.liClicked.bind(this));
		this.ulPointer.addEventListener('dblclick', this.liDblClicked.bind(this));
    }
	
	anyClick (event){
		if ( this.toastMode ) this.removeToastMessage();
		if ( this.textInpBox.contains(event.target) )return;
		if ( this.textMode ) this.saveModifiedDesc();
	};
	
	removeToastMessage() {
		this.toastMode = false;
		document.getElementById('linkMessage'+this.key)
			.classList.remove('linkMessageTrigger');
	};

	//this reset routine calls all the other reset()'s eventually
	reset () {
		// console.log('main reset for', this.key);
		this.now = 0;
        this.frameNow = 0;
        this.partialReset();
		this.graph.reset();
		this.localReset();
	};
    
    partialReset(){
		// console.log('partial reset for',this.key)
        this.clearStageForeground();
        this.heap.reset();
        this.resetCollection.forEach(obj => obj.reset());
    };
    
    localReset(){
        alert(' this routine should be ovewritten, right?');
        debugger;
    };


	// play, pause, toggle .
	play() {
		if (this.isRunning) return;
		displayToggle('pauseButton' + this.key, 'playButton' + this.key);
		this.lastPerfNow = performance.now();
		this.isRunning = true;
		if (this.frameSpeed < 100){
			this.requestAFId = window.requestAnimationFrame(
					this.eachFrame.bind(this));
		} else {
			this.fullSpeedSim();
            
			this.pause();
		}
	};
    pauseImmediately(){
        this.pause();
        this.frameNow = this.now-1;
    }
	pause() {
		if (!this.isRunning) return;
		displayToggle('playButton' + this.key, 'pauseButton' + this.key);
		window.cancelAnimationFrame(this.requestAFId);
		this.isRunning = false;
	};

	togglePlayPause() {
		if (this.isRunning) this.pause();
		else this.play();
	};
	
	eachFrame() {
        this.requestAFId = window.requestAnimationFrame(this.eachFrame.bind(this));
        let perfNow = performance.now();
		let deltaRealTime = Math.min(100, perfNow - this.lastPerfNow);
		this.lastPerfNow = perfNow;
		let deltaSimuTime = deltaRealTime * this.frameSpeed;
		this.frameNow += deltaSimuTime;

        
		let theTop;
		while ((theTop = this.heap.top()) &&
				theTop.time <= this.frameNow) {
			const event = this.heap.pull();
			// event on heap is {time: ,proc: ,item: }
			this.now = event.time;
			event.proc(event.item);
		}
		this.now = this.frameNow;
		this.clearRedrawStage(deltaSimuTime,false);
	};
    
    clearRedrawStage(deltaSimuTime, redraw){
        this.clearStageForeground();
		this.itemCollection.moveDisplayAll(deltaSimuTime);
        this.resourceCollection.drawAll(redraw);
    }
    
	adjustSpeed(v){
		if( this.frameSpeed == tioxSpeeds[v].time) return;
        
        const oldFrameSpeed = this.frameSpeed;
		this.frameSpeed = tioxSpeeds[v].time;
		this.graph.scaleXaxis(tioxSpeeds[v]);
        this.graph.setupThenRedraw();
        this.itemCollection.updateForSpeed();
		if (oldFrameSpeed < 100 && this.frameSpeed > 100 ){
			if (this.isRunning){
				this.pause();
				this.play();
			}
			this.coverAnimation();
		} else if (oldFrameSpeed > 100 
				   && this.frameSpeed < 100){
			this.uncoverAnimation();
		}
	};
	coverAnimation(){
		const elem = document.getElementById(
			'coverAnimation'+this.key);
		elem.classList.add('addOpacity');
	};
	uncoverAnimation(){
		const elem = document.getElementById(
			'coverAnimation'+this.key);		
        elem.classList.remove('addOpacity');
	};
	
	fullSpeedSim(){
		// check last data on graph and if we need to move graph over
		// so it updates xInfo.max then continue
		if (this.frameNow == this.graph.xInfo.max * this.tioxTimeConv){
			this.graph.shiftXaxis2();
		}
		this.frameNow = this.graph.xInfo.max * this.tioxTimeConv;;
		let theTop;
		while ((theTop = this.heap.top()) &&
				theTop.time <= this.frameNow) {
			const event = this.heap.pull();
			// event on heap is {time: ,proc: ,item: }
			this.now = event.time;
			event.proc(event.item);
		}
		this.now = this.frameNow;
        // adjust all the queues
        if( this.adjustAllQueues ) this.adjustAllQueues();
        
		this.clearStageForeground();
        this.itemCollection.updatePositionAll();
        this.clearRedrawStage(0,true);
	}
    
    setSlidersFrom (row){
        const inpsChanged = [];
        for( let [key, inp] of this.usrInputs ){
          if( inp.set(row[key]) ) inpsChanged.push(inp);
        } 
        
        if (!this.editMode) {
            if (row.reset == 'true')
                document.getElementById('resetButton'+this.key).click();
            if (row.action == 'play')
                document.getElementById('playButton'+this.key).click();
            else if (row.action == 'pause')
                document.getElementById('pauseButton'+this.key).click();
        }
       this.localUpdateFromSliders(...inpsChanged);
    };
    
    getSliders () {
        let row = {};
        for( let [key, inp]  of this.usrInputs ){
            row[key] = inp.get();
        };
        return row;
    };
    
    sEncode(rows){
        const view = new Int8Array(2000);
        const uint8View = new Uint8Array(view.buffer);
        const textEncoder = new TextEncoder();
        let ptr = 0;
        view[ptr++] = rows.length;
        const nParams = this.usrInputs.size;
        for(let row of rows ){
            view[ptr++]= nParams;// number of parameters
            for ( let [key, inp] of this.usrInputs ){
                const x = inp.encode(row[key]);
//                console.log('in sENCODE key=',key,'x=',x,' type=',typeof x);
                view[ptr++] = this.keyIndex[key];
                //decide if single of multiple byes
                if( typeof x != "string" ){
                   view[ptr++] = Number(x);
                } else {
                    let uint8Str = textEncoder.encode(x);               
                    let n = uint8Str.length;
                    if( n > 127 ){
                        n = 127;
                        uint8Str = uint8Str.subarray(0,n);
                    }
                    view[ptr++] = -n;
                    view.set(uint8Str, ptr);
                    ptr += n;
                }
            }
            if( ptr > 1500 ){
                alert('You have too many scenarios.  They will generated a URL with more than 2000 characters and that may fail on some browsers, notable IE. Your scenarios will continue to work but you can not use the URL button with this set');
            break;
            }
        }
        // convert the corect length to 64 bit str via toBase64()
        const str= toBase64(uint8View.subarray(0,ptr));
        return str;
    };
                
    sDecode(searchStr){
        const textDecoder = new TextDecoder();
        let view = new Int8Array(fromBase64(searchStr));
        const rows = [];
        let ptr = 0;
        const nScenarios = view[ptr++];
        for( let k = 0; k < nScenarios; k++ ){
            const row = {}
            const nParams = view[ptr++];
            for( let j = 0; j < nParams; j++ ){
                const keyIndex = view[ptr++];
                const typeValue = view[ptr++];
                const key = this.keyNames[keyIndex];
                if( this.usrInputs.has(key)){
                    const inp = this.usrInputs.get(key);
                    if( typeValue >= 0 ){
                        row[key] = inp.decode(typeValue);
//                        console.log('in SDecode',
//                        ' keyIndex=',keyIndex,'typeValue',typeValue,
//                        'key=',key,'decoded',row[key]);
                    } else {
                        const n = -typeValue;
//                        console.log('in SDecode with string len=',n);
                        //get n bytes from buffer into LongData
                        row[key] = textDecoder.decode(view.subarray(ptr,ptr+n));
                        ptr += n;
                    };
                };
            };
            for(let [key,inp] of this.usrInputs){
                if( row[key] == undefined ) {
                    row[key] = inp.deflt;
//                    console.log('in SDecode',
//                    ' MISSING value SET DEFAULT for',key);
                }
            }
            rows.push(row);
        };
        return rows;
    };
                
	createLineFromRow(row) {
		const liElem = document.createElement("LI");
		liElem.innerHTML = row.desc;
		liElem.scenario = row;
		return liElem;
	}
    
    setOrReleaseCurrentLi(inp){
        if( this.editMode ){
            if( this.currentLi ){
                this.currentLi.scenario[inp.key] = inp.get();
                this.saveEdit();
            }
        } else {
            if (this.currentLi){ 
                this.currentLi.classList.remove("selected");
                this.lastLi = this.currentLi;
            }
            this.currentLi = null;
        }
    }

	nextLi() {
		let cur = this.currentLi;
		if (cur) {
			if (cur.nextElementSibling)
				return cur.nextElementSibling;
			return cur;
		}
        if( this.lastLi ){
            return this.lastLi;
        };
		return this.ulPointer.firstElementChild;
	};

	previousLi() {
		let cur = this.currentLi;
		if (cur) {
			if (cur.previousElementSibling)
				return cur.previousElementSibling;
			return cur;
		}
        if( this.lastLi ){
            return this.lastLi;
        };
		return this.ulPointer.lastElementChild;
	};

	neighborLi() {
		let cur = this.currentLi;
		if (!cur) return null;
		if (cur.previousElementSibling)
			return cur.previousElementSibling;
		if (cur.nextElementSibling)
			return cur.nextElementSibling;
		return null;
	};
	
	
	/****** Several Helper Functions for setupScenarios  or resetScenarios *********/
	
	// option 1 get scenarios from search string
    // capture the three possible 'search' parameters
	parseSearchString( key ){
        let search = {url: null, scenarios: null};
        let hash = location.hash.slice(1);
        if( key != hash ) return search;
        let str = decodeURI(location.search.slice(1));
        if (str.length == 0) return search;

        const terms = str.split('&');
        for (let term of terms){
            let j = term.indexOf('=');
            if ( j > 0 ) {
                search[term.substring(0,j)] = term.substring(j+1)
            } else {
                console.log( 'term missing =',term);
            }
        }
        return search
    };
	
	
	// option 2 get scenarios from localStorage
    getlocalStoreAndParse( key ){
        let lsString = localStorage.getItem( key );
        let lsObject = (lsString != '' ? JSON.parse(lsString) : null);
        //fix compatibility problems
        if( Array.isArray(lsObject) ){
            //fix the 'which' parameter
            if( this.key == 'inv' ){
                for( let s of lsObject ) {
                    s.method = s.which;
                    delete s.which
                }
            }
            //fix the 'sr' parameter
            if( this.key == 'lit' ){
                for ( let s of lsObject ) {
                    s.st = s.sr;
                    delete s.sr;
                }
            }
            // add outer wrapper of object
            lsObject = {app:{omConcept:{
                key: this.key,
                scenarios: lsObject}}};
            lsString = JSON.stringify(lsObject);
            localStorage.setItem( key, lsString );
        }
        return lsObject;
    }
    
    // option 3 get default scenarios from 'key'.json file on server
    async getScenariosFromDefault(key){
		let response = await fetch(`app/${key}/${key}.json`);
		if (response.ok) {
			return await response.json();
			}
		console.log("json file HTTP-Error: " + response.status);
		return null;
	};
    
    //verify that json has legitimate values for each parameter for each scenario
    verifyParamsObject(params) {
        //for now we just check each scenario in the params
        if( params == null ) return null;
        let scenarios = params.app.omConcept.scenarios;
        for( let s of scenarios ) {
            for( let [key,input] of this.usrInputs ){
                 s[key] = input.verify(s[key]);
            };   
        };
        return params;
    };
    
    // pick the source 1)URL, 2) localStorage, 3) Default on server
    async threeCases(key, search, lsObject ){
		if ( search.scenarios ){
			this.fromURL = true;
			return this.sDecode(search.scenarios)
        }
		if (lsObject) {
			const params = this.verifyParamsObject( lsObject );
            return params.app.omConcept.scenarios;
		}
		let params = await this.getScenariosFromDefault(key);
        params = this.verifyParamsObject(params);
        return params.app.omConcept.scenarios;
	};
    
    // called for reset scenario button
    async resetScenarios() {
		let search = this.parseSearchString(this.key);
        let rows = await this.threeCases(this.key, search, null);
        
		this.setUL(rows);
		this.currentLi = null;
		localStorage.removeItem(this.keyForLocalStorage);
		enableButtonQ('deleteButton'+this.key, false);
	};
    
	// called at initiation
    async setupScenarios () {
        // get the scenarios from 1) the URL, 2) user specified .json
		// 3) local storage or 4) default .json file in that order
		let search = this.parseSearchString(this.key);
		let lsObject = this.getlocalStoreAndParse(this.keyForLocalStorage);
		this.warningLSandScens = search.scenarios  && lsObject;
		
		let rows = await this.threeCases(this.key, search, lsObject);
		this.setUL(rows);
	};
    
    
	

	printScenarios () {
		//console.log(this.ulPointer);
	};

	// ***** Utilities for the text box:    *********** 
	//  Delete, Save, Add  from the CurrentLi row.
	deleteTextInpBox () {
		if (this.textMode) {
			this.currentLi.removeChild(this.textInpBox);
			this.textMode = false;
		}
	};

	saveModifiedDesc () {
		if (this.textMode) {
			this.textMode = false;
			this.currentLi.removeChild(this.textInpBox);
			if (this.currentLi.innerHTML != this.textInpBox.value ){
				const name = this.textInpBox.value;
				const adjustedName = (name==''?'(no name)':name);
				this.currentLi.innerHTML = adjustedName;
				this.currentLi.scenario.desc = adjustedName;
				this.saveEdit();
			}
			
		}
		return this.currentLi ? this.currentLi.innerHTML : '';
	};

	addTextBox (name) {
		this.textMode = true;
		this.currentLi.appendChild(this.textInpBox);
		this.textInpBox.value = name;
		this.textInpBox.focus();
	};

	// for adding an new scenario row
	addRow () {
		const noName = '(no name)';
		let desc = noName;
		if (this.currentLi) {
			desc = createCopyName(this.currentLi.innerHTML);
			this.currentLi.classList.remove("selected");
		}

		const row = this.getSliders();
		row.desc = desc;
		const li = this.createLineFromRow(row);
		li.innerHTML = desc; 
		li.classList.add("selected");
		this.ulPointer.append(li);
		this.currentLi = li;
        this.lastLi = null;
		this.addTextBox(desc==noName ? '' : desc);

		function createCopyName(str) {
			let reg = str.match(/(.*) (copy) *(\d*)/);
			if (!reg) return str + ' copy';
			const n = reg[3] == '' ? ' 2' : ++reg[3];
			return reg[1] + ' copy ' + n;
		};
		this.saveEdit();
		enableButtonQ('deleteButton'+this.key, true);
	};

	nextRow () {   
		this.changeCurrentLiTo(this.nextLi());
	};

	previousRow () { 
		this.changeCurrentLiTo(this.previousLi());
	};

	deleteSelected () {
		if (!this.currentLi) return;

		let save = this.currentLi
		this.changeCurrentLiTo(this.neighborLi());
		this.ulPointer.removeChild(save);
		this.saveEdit();
	};

	changeCurrentLiTo (newRow) {
		this.saveModifiedDesc();
		if (this.currentLi) this.currentLi.classList.remove("selected");
		if (newRow) {
            this.lastLi = null;
			this.setSlidersFrom(newRow.scenario);
			newRow.classList.add("selected");
		};
		this.currentLi = newRow;
		this.printCurrentLi();
		enableButtonQ('deleteButton'+this.key,
					  this.currentLi);
	};

	printCurrentLi() {
		//		console.log(this.currentLi);
	};


	// ****** Routines to start and exit an edit 
	//  also save each change to local storage
	startEdit () {
		this.pause();
		if (this.warningLSandScens){
			const response = confirm('Continuing will replace the current scenarios (from the URL) with those you have stored');
			if (!response) return;
			this.saveEdit();
		}
		this.warningLSandScens = false;
		this.editMode = true;
		
		//adjust the page for edit mode
		displayToggle(
			['scenariosBot'+this.key,'exitButton'+this.key,
			 'actionOptions'+this.key],
			['editButton'+this.key,
			 'playButtons'+this.key]);
		enableButtonQ('deleteButton'+this.key,
					  this.currentLi);
	};


	// sorts and saves the current list to localStorage
	saveEdit () {
		// sort the Li's in UL;  key is desc
		function sortTheUL(container) {
			let contents = container.querySelectorAll("li");
			let list = [];
			for (let i = 0; i < contents.length; i++) {
				list.push(contents[i]);
			}
			list.sort((a, b) => a.innerHTML.localeCompare(b.innerHTML));

			for (let i = 0; i < list.length; i++) {
				container.append(list[i]);
			}
		}
		sortTheUL(this.ulPointer);
		localStorage.setItem(this.keyForLocalStorage, 
							 this.createJSONfromUL());
	};
	
	exitEdit () {
		// restore the page to non-edit mode
		this.editMode = false;
//		this.saveModifiedDesc();
		displayToggle(['editButton'+this.key, 'playButtons'+this.key],
			['scenariosBot'+this.key, 'exitButton'+this.key,
			  'actionOptions'+this.key]);
	};

	exportWithLink (event) {
		//my backdoor to get JSON out of current scenarios
        if( event.altKey && event.shiftKey && event.metaKey ) {            
            copyToClipboard(this.createJSONfromUL());
            return;
        }    
        
        //rest of routine to create the URL link
        this.toastMode = true;
		copyToClipboard(this.createURL());
		const message = document.
			getElementById('linkMessage'+this.key);
		message.classList.remove('linkMessageTrigger');
		void message.offsetWidth;
		message.classList.add('linkMessageTrigger');
    	clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(
			this.removeToastMessage.bind(this), 4100);
	};
		
	liClicked (ev) {
		if (ev.target == this.currentLi || 
			ev.target.parentNode == this.currentLi) return;

		if (ev.target.tagName === 'LI') {
			this.changeCurrentLiTo(ev.target);
		};
	};

	//   double click on item in UL list;  
	//    start editing name if in edit mode
	liDblClicked (ev) {
		if (!this.editMode) return;
		if (this.textMode) return; 
		// ignore if in text mode already; everything is setup.
		
		if (ev.target == this.currentLi) {
			if (ev.target.childNodes[0]) {
				this.addTextBox(ev.target.childNodes[0].nodeValue);
			} else {
				this.addTextBox('');
			}
		}
	};
	

// ****** A set of routines for manipulating a collection of scenarios (rows)
	createRowsFromUL(){
		let rows = [];
		let lines = document.querySelectorAll(`#ULScenarioList${this.key} li`);
		for (let i = 0; i < lines.length; i++) {
			rows[i] = lines[i].scenario;
		}
		return rows;
	};

	setUL(rows){ 
		this.ulPointer.innerHTML = '';
		for (let row of rows) {
			let li = this.createLineFromRow(row);
			this.ulPointer.append(li);
		}
	};

	createURL() { //from current UL
		const result = location.origin + location.pathname +
			'?scenarios=' +
			this.sEncode(this.createRowsFromUL()) +
			  '#' + this.key;
		const encResult =  encodeURI(result);
		return encResult;
	};

	createJSONfromUL() { //from curreent UL
		const allParams = {app: { omConcept: { 
                           key: this.key,
                           scenarios: this.createRowsFromUL()}
                    }};
        return JSON.stringify(allParams);
	};
};


function copyToClipboard(txt){
	navigator.clipboard.writeText(txt)
		.then(  function() {
			}, 
			function() {
				alert('failed to copy to clipboard')
			});
};


// three Nodelist routines;
function getChecked(nodelist) {
	for (let j = 0; j < nodelist.length; j++) {
		if (nodelist[j].checked) return j
	}
	return -1;
};

function setChecked(nodelist, j) {
	nodelist[j].checked = true;
};

function findId(nodelist, str) {
	for (let j = 0; j < nodelist.length; j++) {
		if (nodelist[j].id == str) return j
	}
	return -1;
};

