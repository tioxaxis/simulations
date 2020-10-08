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
// the list of scenarios (name is still presets) are below on the rhs
//  a scenario is stored several ways:
//  1) in the sliders (but without a title called desc)
//  2) in an object called a row,  the array of all of them is rows
//	3) in an li elem in DOM under .scenario;  the set is in the UL element
//  4) encoded in a string to go into a url
//  5) in JSON in a file for the defaults
//   option 2 is the way to go between the various types.

var keyForLocalStorage = 'Tiox-' + simu.nameOfSimulation;

export const sliders = {
	initialize: function () {
		document.getElementById('sliderBigBox')
			.addEventListener('input', captureChangeInSliderG);
		//		document.getElementById('ropupto')
		//			.addEventListener('input', captureChangeInSliderG);

		function captureChangeInSliderG(event) {
			let inputElem = event.target.closest('input');
			if (!inputElem) return
			if (event.isTrusted && simu.editMode && presets.currentLi) {
				let id = event.target.id;
				let v = inputElem.value;
				let t = inputElem.type;
				let scen = presets.currentLi.scenario;
				// pull value into preset based on type of input
				switch (t) {
					case 'range':
						scen[id] = v;
						break;
					case 'checkbox':
						scen[id] = inputElem.checked.toString();
						break;
					case 'radio':
						scen[inputElem.name] = id;
						break;
					default:
				}
			} else {
				// changing a slider in non edit mode just deselects preset.
				if (presets.currentLi) presets.currentLi.classList.remove("selected");
				presets.currentLi = null;
			};
		};


	},

	inputEvent: new Event('input', {
		bubbles: true
	}),

	setSlidersFrom: function (row) {
		
		//console.log(simu.sliderTypes);
		for (let key in simu.sliderTypes) {
			let t = simu.sliderTypes[key];
			let inputBox = document.getElementById(key);
			let v = row[key];
			switch (t){
				case 'range':
					inputBox.value = v;
					break;
				case 'checkbox':
					inputBox.checked = (v == 'true');
					break;
				case 'radio':
					inputBox = document.getElementById(v);
					let theNodeList = document.getElementsByName(key);
					let j = findId(theNodeList, v);
					if (j < 0) {
						alert("can't find the doc elem with name", key, " and value ", v);
						debugger;
					}
					theNodeList[j].checked = true;
					break;
			}
			inputBox.dispatchEvent(sliders.inputEvent);
		}
		// not in edit mode then may cause a reset, a play, or a pause.
		if (!simu.editMode) {
			if (row.reset == 'true')
				document.getElementById('resetButton').click();
			if (row.action == 'play')
				document.getElementById('playButton').click();
			else if (row.action == 'pause')
				document.getElementById('pauseButton').click();
		}
	},

	getSliders: function () {
		let row = {};
		for (let key in simu.sliderTypes) {
			let inputElem = document.getElementById(key);
			let t = simu.sliderTypes[key];
			switch (t) {
				case 'range':
					row[key] = inputElem.value
					break;
				case 'checkbox':
					row[key] = inputElem.checked.toString();
					break;
				case 'radio':
					let theNodeList = document.getElementsByName(key);
					row[key] = theNodeList[getChecked(theNodeList)].id;
					break;
				default:
			}
		}
		return row;
	},
};

function createLineFromRow(row) {
	const liElem = document.createElement("LI");
	liElem.innerHTML = row.desc;
	liElem.scenario = row;
	return liElem;
}


function nextLi() {
	if (presets.currentLi) {
		if (presets.currentLi.nextElementSibling)
			return presets.currentLi.nextElementSibling;
		return presets.currentLi;
	}
	return presets.ulPointer.firstElementChild;
};

function previousLi() {
	if (presets.currentLi) {
		if (presets.currentLi.previousElementSibling)
			return presets.currentLi.previousElementSibling;
		return presets.currentLi;
	}
	return presets.ulPointer.lastElementChild;
};

function neighborLi() {
	if (!presets.currentLi) return null;
	if (presets.currentLi.previousElementSibling)
		return presets.currentLi.previousElementSibling;
	if (presets.currentLi.nextElementSibling)
		return presets.currentLi.nextElementSibling;
	return null;
};

export const presets = {

	currentLi: null, // poiner to current  LI in the UL in the HTML
	ulPointer: null, //pointer to the UL in the HTML
	textInpBox: null,

	started: null,
	textMode: false,
	editMode: false,

	saveState: null,


	initialize: async function (sEncode,sDecode) {
		// setup the input text box
		this.textInpBox = document.createElement("INPUT");
		this.textInpBox.type = "text";
		this.textInpBox.className = "textInput";
		this.textInpBox.placeholder = "preset name";
		this.sEncode = sEncode;
		this.sDecode = sDecode;
		this.ulPointer = document.getElementById("ULPresetList");


		// get the presets from 1) the URL, 2) user specified .json
		// 3) local storage or 4) default .json file in that order

		// capture the three possible 'search' parameters
		function parseSearchString(str){
			let search = {edit: null, url: null, scenarios: null}
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
		}
		
		
		
		// try the 4 options in order returning the rows of parameters 
		async function fourCases(search,presetsString ){
			if ( search.scenarios ){
				if ( search.edit != "allow" ){
					document.getElementById("editBox")
							.style.display = 'none'
				} 
				return parseURLScenariosToRows(search.scenarios)
			}
			
			if ( search.url ) { 
				let response = await fetch(search.url);
				if (response.ok) {
					return await response.json();
				} 
			}
			if (presetsString) {
				 return JSON.parse(presetsString);
			}
			let response = await fetch(simu.nameOfSimulation + '.json');
			if (response.ok) {
				return await response.json();
				}
			console.log("json file HTTP-Error: " + response.status);
			return null
		}
		
		let search = parseSearchString(decodeURI(location.search.slice(1)))
		let presetsString =  localStorage.getItem(keyForLocalStorage);
		simu.warningLSandScens = search.scenarios  && presetsString;
		let rows = await fourCases(search, presetsString);
		
		
	
		// if one thing worked 'rows' has it.
		setUL(rows);
		this.started = true;

		//set up event listeners for user interface
		this.ulPointer.addEventListener('click', this.liClicked);
		this.ulPointer.addEventListener('dblclick', this.liDblClicked);
		document.getElementById('addButton')
			.addEventListener('click', presets.addRow);
		document.getElementById('deleteButton')
			.addEventListener('click', presets.deleteSelected);
		document.getElementById('editButton')
			.addEventListener('click', presets.startEdit);
		document.getElementById('saveButton')
			.addEventListener('click', presets.saveEdit);
		document.getElementById('cancelButton')
			.addEventListener('click', presets.cancelEdit);
		document.getElementById('exportButton')
			.addEventListener('click', presets.popupExport);
		document.getElementById('allowEditButton')
			.addEventListener('click', toggleAllowEdit);
		document.addEventListener('keydown', keyDownFunction);


		function keyDownFunction(evt) {
			const key = evt.key;
			if (key == "Escape") {
				let elem = document.getElementById('exportBoxOuter');
				if (elem.style.display == 'block')
					elem.style.display = 'none'
				else presets.deleteTextInpBox();
			} else if (key == "Enter") {
				if (simu.editMode)
					if (presets.textMode) presets.saveModifiedDesc();
					else presets.addTextBox(presets.currentLi.innerHTML);
			} else if (key == "ArrowLeft" 
					   || key == "ArrowDown" 
					   || key == "PageDown") {
				evt.preventDefault();
				presets.nextRow();
			} else if (key == "ArrowRight" 
					   || key == "ArrowUp" 
					   || key == "PageUp") {
				evt.preventDefault();
				presets.previousRow();
			}
		}
	},


	printPresets: function () {
		//console.log(presets.ulPointer);
	},

	// utilities for the text box:  
	//  Delete, Save, Add  from the CurrentLi row.
	deleteTextInpBox: function () {
		if (presets.textMode) {
			presets.currentLi.removeChild(this.textInpBox);
			presets.textMode = false;
		}
	},

	saveModifiedDesc: function () {
		if (this.textMode) {
			this.textMode = false;
			this.currentLi.removeChild(this.textInpBox);
			this.currentLi.innerHTML = this.textInpBox.value;
			this.currentLi.scenario.desc = this.textInpBox.value;
		}
		return presets.currentLi ? presets.currentLi.innerHTML : ''; //does this test ever apply?
	},

	addTextBox: function (name) {
		this.textMode = true;
		this.currentLi.appendChild(this.textInpBox);
		this.textInpBox.value = name;
		this.textInpBox.focus();
	},

	// for adding an new Preset row
	addRow: function () {
		let desc = ''
		if (presets.currentLi) {
			desc = createCopyName(presets.saveModifiedDesc());
			presets.currentLi.classList.remove("selected");
		}

		const row = sliders.getSliders();
		row.desc = desc;
		const li = createLineFromRow(row);
		li.innerHTML = desc; 
		li.classList.add("selected");
		presets.ulPointer.append(li);
		presets.currentLi = li;
		presets.addTextBox(presets.currentLi.innerHTML);

		function createCopyName(str) {
			let reg = str.match(/(.*) (copy) *(\d*)/);
			if (!reg) return str + ' copy';
			const n = reg[3] == '' ? ' 2' : ++reg[3];
			return reg[1] + ' copy ' + n;
		};
	},


	nextRow: function () {
		//      if ( document.activeElement.tagName=="BODY"){        
		presets.changeCurrentLiTo(nextLi());
		//      }
	},

	previousRow: function () {
		//        if ( document.activeElement.tagName=="BODY"){                   
		presets.changeCurrentLiTo(previousLi());
		//        }
	},

	deleteSelected: function () {
		if (!presets.currentLi) return;

		let save = presets.currentLi
		presets.changeCurrentLiTo(neighborLi());
		presets.ulPointer.removeChild(save);
	},

	changeCurrentLiTo: function (newRow) {
		presets.saveModifiedDesc();
		if (presets.currentLi) this.currentLi.classList.remove("selected");
		if (newRow) {
			sliders.setSlidersFrom(newRow.scenario);
			newRow.classList.add("selected");
		};
		presets.currentLi = newRow;
		this.printCurrentLi();
	},

	printCurrentLi() {
		//		console.log(presets.currentLi);
	},


	// Routines to start, cancel and save an edit    
	startEdit: function () {
		//    save / clone the list ulPointer.
		presets.save = {
			slidersValues: sliders.getSliders(),
			rows: createRowsFromUL()
		};
		
		simu.editMode = true;
		
		// simulate a click on pause if running.
		let theButton = document.getElementById('pauseButton')
		if (theButton.style.display != 'none') theButton.click();

		//adjust the page for edit mode
		document.getElementById("scenariosBot").style.display = "block";
		document.getElementById('menuBox').style.display = 'block';
		document.getElementById('editBox').style.display = 'none';
		document.getElementById('actionOptions').style.display = 'flex';
		document.getElementById('playButtons').style.display = 'none';
		
		if (simu.warningLSandScens){
			alert('If you exit this edit by saving you will overwrite your current scenarios stored in Local Storage');
		}
	},


	// this restores previous state (to what it was at start of edit)
	cancelEdit: function () {
		presets.exitEdit();
		setUL(presets.save.rows);
		sliders.setSlidersFrom(presets.save.slidersValues);
		presets.currentLi = null;
	},

	// sorts and saves the current list to localStorage
	saveEdit: function () {
		simu.warningLSandScens= false;
		presets.exitEdit();

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

		sortTheUL(presets.ulPointer);
		localStorage.setItem(keyForLocalStorage, createJSONfromUL());
	},

	exitEdit: function () {
		// restore the page to non-edit mode
		simu.editMode = false;
		presets.saveModifiedDesc();
		document.getElementById("scenariosBot").style.display = "none";
		document.getElementById('menuBox').style.display = 'none';
		document.getElementById('editBox').style.display = 'block';
		document.getElementById('actionOptions').style.display = 'none';
		document.getElementById('playButtons').style.display = 'flex';
	},

	popupExport: function () {
		document.getElementById('exportBoxOuter').style = 'display:block';
		document.getElementById('jsonDisplay').innerHTML = createJSONfromUL();
		document.getElementById('urlDisplay').innerHTML = createURL(false);
		document.getElementById('allowEditButton').checked = false;
	},

	//  user clicked on an item in the list, 
	//  possibly changing the selected choice
	//  and if textMode save the last entered name into the selected row
	liClicked: function (ev) {
		if (ev.target == presets.currentLi || 
			ev.target.parentNode == presets.currentLi) return;

		presets.saveModifiedDesc();
		if (ev.target.tagName === 'LI') {
			presets.changeCurrentLiTo(ev.target);
		};
	},

	// 2. double click on item in UL list;  
	//    start editing name if in edit mode
	liDblClicked: function (ev) {
		if (!simu.editMode) return;
		if (presets.textMode) return; // ignore if in text mode already; everything is setup.
		if (ev.target == presets.currentLi) {
			if (ev.target.childNodes[0]) {
				presets.addTextBox(ev.target.childNodes[0].nodeValue);
			} else {
				presets.addTextBox('');
			}
		}
	}
};


function createRowsFromUL(){
	let rows = [];
	let lines = document.querySelectorAll('#ULPresetList li');
	for (let i = 0; i < lines.length; i++) {
		rows[i] = lines[i].scenario;
	}
	return rows;
};


function setUL(rows){ 
	presets.ulPointer.innerHTML = '';
	for (let row of rows) {
		let li = createLineFromRow(row);
		presets.ulPointer.append(li);
	}
}

function createURLScenarioStr(rows){
	let first = true;
	let str = '';
	for (let row of rows){
		str += (first ? "" : ";") + presets.sEncode(row);
		first = false;
	}
	//console.log('in crateScenarioStr', str);
	return str;
};

//convert each coded scenario into a row of parameters
function parseURLScenariosToRows(str){
	let rows = [];
	let scens = str.split(';')
	for ( let scenario of scens){
		rows.push( presets.sDecode(scenario) );
	}
	return rows;
}


function createURL(edit) { //from current UL
	const result = location.origin + location.pathname +
		'?scenarios=' +
		createURLScenarioStr(createRowsFromUL()) +
		( edit ? "&edit=allow" : "" );
	const encResult =  encodeURI(result);
	//console.log('in createURL',result, encResult);
	return encResult;
};

function createJSONfromUL() { //from curreent UL
	return JSON.stringify(createRowsFromUL());
};


function toggleAllowEdit(event){
	document.getElementById('urlDisplay')
		.innerHTML = createURL(event.target.checked)
	}
	



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

simu.copyToClipboard = function (id){
	let url = document.getElementById(id);
	navigator.clipboard.writeText(url.innerText)
		.then(  function() { /* clipboard successfully set */
				}, 
			    function() {
  					alert('failed to copy to clipboard')
				});
}