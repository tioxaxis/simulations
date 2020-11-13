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

import {
	Heap
}
from "./util.js";
import {
	ItemCollection
}
from "./stepitem.js";
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
	constructor(key, sEncode, sDecode, localReset){
		this.key = key;
		this.sEncode = sEncode;
		this.sDecode = sDecode;
		this.localReset = localReset;
		this.resetCollection = [];
		
		
		this.keyForLocalStorage = 'Tiox-' + key;
		Math.seedrandom('this is a Simulation');
		
		this.textInpBox = document.createElement("INPUT");
		this.textInpBox.type = "text";
		this.textInpBox.className = "textInput";
		this.textInpBox.placeholder = "scenario name";
		
		this.ulPointer = document.getElementById("ULScenarioList"+key);		
		this.currentLi = null, // poiner to current  LI in the UL in the HTML

		this.textMode = false,
		this.editMode = false,
		this.fromURL = false;

//		this.saveState = null,

		this.now = 0;
		this.frameNow = 0;
		this.heap = new Heap((x, y) => x.time < y.time);

		this.frameSpeed = 1.0; 

		this.isRunning = false;
		this.requestAFId = null; // id for requestAnimationFrame

		this.setupScenarios();
		this.itemCollection = new ItemCollection();
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
			.addEventListener('click', this.anyClick.bind(this));

		// click on scenario name
		this.ulPointer.addEventListener('click', this.liClicked.bind(this));
		this.ulPointer.addEventListener('dblclick', this.liDblClicked.bind(this));
		
		//adjust slider
		document.getElementById('slidersWrapper'+this.key)
			.addEventListener('input', this.captureChangeInSliderG.bind(this));
		this.inputEvent = new Event('input', {bubbles: true});
	}
	
	anyClick (event){
		if ( this.textInpBox.contains(event.target) )return;
		if ( this.textMode ) this.saveModifiedDesc();
	}

	//this reset routine calls all the other reset()'s eventually
	reset  () {
		this.clearStageForeground();
		this.now = 0;
		this.frameNow = 0;
		this.heap.reset();
		this.resetCollection.forEach(obj => obj.reset());
		this.localReset();
	};

	clearStageForeground() {
		this.stage.foreContext.clearRect(0, 0, this.stage.width, this.stage.height);
	}

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
		this.clearStageForeground();
		this.itemCollection.moveDisplayAll(deltaSimuTime);
		this.requestAFId = window.requestAnimationFrame(this.eachFrame.bind(this));
	};
	
	adjustSpeed(idShort,v,speeds){
		const oldFrameSpeed = this.frameSpeed;
		this.frameSpeed = speeds[v].time;
		this.graph.updateForSpeed(speeds[v].graph);
		this.itemCollection.updateForSpeed();
		document.getElementById(idShort + this.key + 'Display')
				.innerHTML = speeds[v].time;
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
	}
	coverAnimation(){
		const elem = document.getElementById(
			'coverAnimation'+this.key);
		elem.classList.add('coverAnimation2');
	}
	uncoverAnimation(){
		const elem = document.getElementById(
			'coverAnimation'+this.key);		elem.classList.remove('coverAnimation2');
	}
	
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
		this.clearStageForeground();
		this.itemCollection.updatePositionAll();
	}

	
	 captureChangeInSliderG(event) {
			let inputElem = event.target.closest('input');
			if (!inputElem) return
			if (event.isTrusted && this.editMode && this.currentLi) {
				let iShort = event.target.id.slice(0,-3);
				let v = inputElem.value;
				let t = inputElem.type;
				let nShort = inputElem.name.slice(0,-3);
				let scen = this.currentLi.scenario;
				// pull value into 'scen' or currentLi based on type of input
				switch (t) {
					case 'range':
						scen[iShort] = v;
						break;
					case 'checkbox':
						scen[iShort] = inputElem.checked.toString();
						break;
					case 'radio':
						scen[nShort] = iShort;
						break;
					default:
				}
				this.saveEdit();
			} else {
				// changing a slider in non edit mode just deselects currentLi row.
				if (this.currentLi) this.currentLi.classList.remove("selected");
				this.currentLi = null;
			};
		};
	
	setSlidersFrom (row) {
		for (let key in this.sliderTypes) {
			let t = this.sliderTypes[key];
			let inputBox = document.getElementById(key+this.key);
			let v = row[key];
			switch (t){
				case 'range':
					inputBox.value = v;
					break;
				case 'checkbox':
					inputBox.checked = (v == 'true');
					break;
				case 'radio':
					inputBox = document.getElementById(v+this.key);
					let theNodeList = document.getElementsByName(key+this.key);
					let j = findId(theNodeList, v+this.key);
					if (j < 0) {
						alert("can't find the doc elem with name", key, " and value ", v);
						debugger;
					}
					theNodeList[j].checked = true;
					break;
				case 'legend':
					this.graph.setVisible(key.slice(3), v == 'true');
					break;
			}
			inputBox.dispatchEvent(this.inputEvent);
		}
		// not in edit mode then may cause a reset, a play, or a pause.
		if (!this.editMode) {
			if (row.reset == 'true')
				document.getElementById('resetButton'+this.key).click();
			if (row.action == 'play')
				document.getElementById('playButton'+this.key).click();
			else if (row.action == 'pause')
				document.getElementById('pauseButton'+this.key).click();
		}
	};

	getSliders () {
		let row = {};
		for (let key in this.sliderTypes) {
			let inputElem = document.getElementById(key+this.key);
			let t = this.sliderTypes[key];
			switch (t) {
				case 'range':
					row[key] = inputElem.value
					break;
				case 'checkbox':
					row[key] = inputElem.checked.toString();
					break;
				case 'radio':
					let theNodeList = document.getElementsByName(key+this.key);
					row[key] = theNodeList[getChecked(theNodeList)].value;
					break;
				case 'legend':
					const k = key.slice(3);
					row[key] = this.graph.lineInfo[k].visible.toString();
					break;
					
				default:
			}
		}
		return row;
	};
	
	createLineFromRow(row) {
		const liElem = document.createElement("LI");
		liElem.innerHTML = row.desc;
		liElem.scenario = row;
		return liElem;
	}

	nextLi() {
		let cur = this.currentLi;
		if (cur) {
			if (cur.nextElementSibling)
				return cur.nextElementSibling;
			return cur;
		}
		return this.ulPointer.firstElementChild;
	};

	previousLi() {
		let cur = this.currentLi;
		if (cur) {
			if (cur.previousElementSibling)
				return cur.previousElementSibling;
			return cur;
		}
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

	async getScenariosFromDefault(key){
		let response = await fetch(`app/${key}/${key}.json`);
		if (response.ok) {
			return await response.json();
			}
		console.log("json file HTTP-Error: " + response.status);
		return null;
	};
	
	
	
	/******************* Two Helper Functions for setupScenarios  *********/
	// try the 4 options in order returning the rows of parameters 
	async threeCases(key,search,scenariosString ){
		if ( search.scenarios ){
			this.fromURL = true;
			return this.parseURLScenariosToRows(search.scenarios)
			}
			
		if (scenariosString) {
			return JSON.parse(scenariosString);
		}
		return this.getScenariosFromDefault(key);
	};
	
	// capture the three possible 'search' parameters
	parseSearchString(str, hashMatchesKey ){
			let search = {url: null, scenarios: null}
			if (str.length == 0) return search;
			if (!hashMatchesKey) return search;
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
		}
	
	async resetScenarios() {
		let rows;
		if ( this.fromURL ){
			let hash = location.hash.slice(1);
			let search = this.parseSearchString(
				decodeURI(location.search.slice(1)), hash == this.key)
			rows = this.parseURLScenariosToRows(search.scenarios)
		} else {
			rows = await  this.getScenariosFromDefault(
					this.key);
		};
		this.setUL(rows);
		this.currentLi = null;
		this.saveEdit();
		enableButtonQ('deleteButton'+this.key, false);
	};
	
	async setupScenarios () {
		// get the scenarios from 1) the URL, 2) user specified .json
		// 3) local storage or 4) default .json file in that order
		let hash = location.hash.slice(1);
		let search = this.parseSearchString(
			decodeURI(location.search.slice(1)), hash == this.key)
		
		let scenariosString =  localStorage.getItem(this.keyForLocalStorage);
		this.warningLSandScens = search.scenarios  && scenariosString;
		
		let rows = await this.threeCases(this.key,search, scenariosString);
	
		// if one thing worked 'rows' has it.
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

	exportWithLink () {
		copyToClipboard(this.createURL());
		const elem = document.getElementById('linkMessage'+this.key);
		elem.classList.add('linkMessageTrigger');
    	setTimeout(function() {
        	elem.classList.remove('linkMessageTrigger');}, 5100);
	};
		
	liClicked (ev) {
		if (ev.target == this.currentLi || 
			ev.target.parentNode == this.currentLi) return;

//		this.saveModifiedDesc();
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

	createURLScenarioStr(rows){
		let first = true;
		let str = '';
		for (let row of rows){
			str += (first ? "" : ";") + this.sEncode(row);
			first = false;
		}
		return str;
	};

	//convert each coded scenario into a row of parameters
	parseURLScenariosToRows(str){
		let rows = [];
		let scens = str.split(';')
		for ( let scenario of scens){
			rows.push( this.sDecode(scenario) );
		}
		return rows;
	};

	createURL() { //from current UL
		const result = location.origin + location.pathname +
			'?scenarios=' +
			this.createURLScenarioStr(this.createRowsFromUL()) +
//			( edit ? "&edit=allow" : "" ) +
			  '#' + this.key;
		const encResult =  encodeURI(result);
		//console.log('in createURL',result, encResult);
		return encResult;
	};

	createJSONfromUL() { //from curreent UL
		return JSON.stringify(this.createRowsFromUL());
	};
};


function copyToClipboard(txt){
	navigator.clipboard.writeText(txt)
		.then(  function() {
			console.log('successful copy to clipboard')
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

