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

		this.saveState = null,

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
		document.getElementById('saveButton' + this.key)
			.addEventListener('click', this.saveEdit.bind(this));
		document.getElementById('cancelButton' + this.key)
			.addEventListener('click', this.cancelEdit.bind(this));
		document.getElementById('exportButton' + this.key)
			.addEventListener('click', this.popupExport.bind(this));
		document.getElementById('allowEditButton' + this.key)
			.addEventListener('click', this.toggleAllowEdit.bind(this));
		document.getElementById('copyURLToClipboard' + this.key)
			.addEventListener('click', this.copyURLToClipboard.bind(this));
		document.getElementById('copyJSONToClipboard' + this.key)
			.addEventListener('click', this.copyJSONToClipboard.bind(this));
		document.getElementById('closeExportBox' + this.key)
			.addEventListener('click', this.closeExportBox.bind(this));
		
		// click on scenario name
		this.ulPointer.addEventListener('click', this.liClicked.bind(this));
		this.ulPointer.addEventListener('dblclick', this.liDblClicked.bind(this));
		
		//adjust slider
		document.getElementById('slidersWrapper'+this.key)
			.addEventListener('input', this.captureChangeInSliderG.bind(this));
		this.inputEvent = new Event('input', {bubbles: true});
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
//		this.itemCollection.updatePositionAll();
		this.itemCollection.moveDisplayAll(deltaSimuTime);
		this.requestAFId = window.requestAnimationFrame(this.eachFrame.bind(this));
//		console.log(this.now);
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
//		console.log(this.now);
//		for( let p of this.itemCollection){
//			console.log(p.which,p.cur.x)
//			for (let path of p.pathList){
//				console.log('    pathlist =' ,path.x,path.speedX);
//			}
//		}
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

	/******************* Two Helper Functions for setupScenarios  *********/
	// try the 4 options in order returning the rows of parameters 
	async fourCases(key,search,scenariosString ){
			if ( search.scenarios ){
				if ( search.edit != "allow" ){
					displayToggle(null, 'editBox'+this.key);
				} 
				return this.parseURLScenariosToRows(search.scenarios)
			}
			
			if ( search.url ) { 
				let response = await fetch(search.url);
				if (response.ok) {
					return await response.json();
				} 
			}
			if (scenariosString) {
				 return JSON.parse(scenariosString);
			}
		console.log(location);
		
			let response = await fetch(`app/${key}/${key}.json`);
			if (response.ok) {
				return await response.json();
				}
			console.log("json file HTTP-Error: " + response.status);
			return null
		};
	
	// capture the three possible 'search' parameters
	parseSearchString(str, hashMatchesKey ){
			let search = {edit: null, url: null, scenarios: null}
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
	
	async setupScenarios () {
		// get the scenarios from 1) the URL, 2) user specified .json
		// 3) local storage or 4) default .json file in that order
		let hash = location.hash.slice(1);
		let search = this.parseSearchString(
			decodeURI(location.search.slice(1)), hash == this.key)
		
		let scenariosString =  localStorage.getItem(this.keyForLocalStorage);
		this.warningLSandScens = search.scenarios  && scenariosString;
		let rows = await this.fourCases(this.key,search, scenariosString);
	
		// if one thing worked 'rows' has it.
		this.setUL(rows);
	};
	

	printScenarios () {
		//console.log(this.ulPointer);
	};

	// ***** Utilities for the text box:  
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
			this.currentLi.innerHTML = this.textInpBox.value;
			this.currentLi.scenario.desc = this.textInpBox.value;
		}
		return this.currentLi ? this.currentLi.innerHTML : ''; //does this test ever apply?
	};

	addTextBox (name) {
		this.textMode = true;
		this.currentLi.appendChild(this.textInpBox);
		this.textInpBox.value = name;
		this.textInpBox.focus();
	};

	// for adding an new scenario row
	addRow () {
		let desc = ''
		if (this.currentLi) {
			desc = createCopyName(this.saveModifiedDesc());
			this.currentLi.classList.remove("selected");
		}

		const row = this.getSliders();
		row.desc = desc;
		const li = this.createLineFromRow(row);
		li.innerHTML = desc; 
		li.classList.add("selected");
		this.ulPointer.append(li);
		this.currentLi = li;
		this.addTextBox(this.currentLi.innerHTML);

		function createCopyName(str) {
			let reg = str.match(/(.*) (copy) *(\d*)/);
			if (!reg) return str + ' copy';
			const n = reg[3] == '' ? ' 2' : ++reg[3];
			return reg[1] + ' copy ' + n;
		};
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
	};

	printCurrentLi() {
		//		console.log(this.currentLi);
	};


	// ****** Routines to start, cancel and save an edit    
	startEdit () {
		//    save / clone the list ulPointer.
		this.save = {
			slidersValues: this.getSliders(),
			rows: this.createRowsFromUL()
		};
		
		this.editMode = true;
		
		this.pause();

		//adjust the page for edit mode
		displayToggle(
			['scenariosBot'+this.key,'menuBox'+this.key, 'actionOptions'+this.key],
			['editBox'+this.key,'playButtons'+this.key]);
		
		if (this.warningLSandScens){
			alert('If you Save you will overwrite your current scenarios stored in Local Storage');
		}
	};


	// this restores previous state (to what it was at start of edit)
	cancelEdit () {
		this.exitEdit();
		this.setUL(this.save.rows);
		this.setSlidersFrom(this.save.slidersValues);
		this.currentLi = null;
	};

	// sorts and saves the current list to localStorage
	saveEdit () {
		this.warningLSandScens= false;
		this.exitEdit();

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
		this.saveModifiedDesc();
		displayToggle(['editBox'+this.key,'playButtons'+this.key],
			['scenariosBot'+this.key, 'menuBox'+this.key, 'actionOptions'+this.key]);
	};

	popupExport () {
		this.exporting = true;
		this.saveModifiedDesc (); 
		document.getElementById('exportBoxOuter'+this.key)
			.style = 'display:block';
		document.getElementById('jsonDisplay'+this.key)
			.innerHTML = this.createJSONfromUL();
		document.getElementById('urlDisplay'+this.key)
			.innerHTML = this.createURL(false);
		document.getElementById('allowEditButton'+this.key)
			.checked = false;
	};

	//  user clicked on an item in the list, 
	//  possibly changing the selected choice
	//  and if textMode save the last entered name into the selected row
	liClicked (ev) {
		if (ev.target == this.currentLi || 
			ev.target.parentNode == this.currentLi) return;

		this.saveModifiedDesc();
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

	createURL(edit) { //from current UL
		const result = location.origin + location.pathname +
			'?scenarios=' +
			this.createURLScenarioStr(this.createRowsFromUL()) +
			( edit ? "&edit=allow" : "" ) + '#' + this.key;
		const encResult =  encodeURI(result);
		//console.log('in createURL',result, encResult);
		return encResult;
	};

	createJSONfromUL() { //from curreent UL
		return JSON.stringify(this.createRowsFromUL());
	};


	toggleAllowEdit(event){
		document.getElementById('urlDisplay'+this.key)
			.innerHTML = this.createURL(event.target.checked)
	};

	copyURLToClipboard (event){
		copyToClipboard('urlDisplay'+this.key)
	};
	copyJSONToClipboard (event){
		copyToClipboard('jsonDisplay'+this.key)
	};
	closeExportBox (event){
		this.exporting = false;
		document.getElementById('exportBoxOuter'+this.key)
				.style='display:none';
	};
};


function copyToClipboard (id){
	let elem = document.getElementById(id);
	navigator.clipboard.writeText(elem.innerText)
		.then(  function() {
			/* clipboard successfully set */
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

