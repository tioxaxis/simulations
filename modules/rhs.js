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
// the list of presets are below on the rhs

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
				let ds = presets.currentLi.dataset;
				// pull value into preset based on type of input
				switch (t) {
					case 'range':
						ds[id] = v;
						break;
					case 'checkbox':
						ds[id] = inputElem.checked.toString();
						break;
					case 'radio':
						ds[inputElem.name] = id;
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

	setSlidersFrom: function (aPreset) {
		let inputBox;
		//console.log(simu.sliderTypes);
		for (let key in simu.sliderTypes) {
			let t = simu.sliderTypes[key];
			inputBox = document.getElementById(key);
			let v = aPreset[key];
			if (t == 'range') {
				inputBox.value = v;
			} else if (t == 'checkbox')
				inputBox.checked = (v == 'true');

			else if (t == 'radio') {
				inputBox = document.getElementById(v);
				let theNodeList = document.getElementsByName(key);
				let j = findId(theNodeList, v);
				if (j < 0) {
					alert("can't find the doc elem with name", key, " and value ", v);
					debugger;
				}
				theNodeList[j].checked = true;
			}
			////			console.log('in setSliders inputBox ',
			//							inputBox.type, inputBox.id, inputBox.value);
			inputBox.dispatchEvent(sliders.inputEvent);
		}
		// not in edit mode then may cause a reset, a play, or a pause.
		if (!simu.editMode) {
			if (aPreset.reset == 'true')
				document.getElementById('resetButton').click();
			if (aPreset.action == 'play')
				document.getElementById('playButton').click();
			else if (aPreset.action == 'pause')
				document.getElementById('pauseButton').click();
		}
	},

	getSliders: function () {
		let aPreset = {};
		for (let k in simu.sliderTypes) {
			let inputElem = document.getElementById(k);
			let t = simu.sliderTypes[k];
			switch (t) {
				case 'range':
					aPreset[k] = inputElem.value
					break;
				case 'checkbox':
					aPreset[k] = inputElem.checked.toString();
					break;
				case 'radio':
					let theNodeList = document.getElementsByName(k);
					aPreset[k] = theNodeList[getChecked(theNodeList)].id;
					break;
				default:
			}
		}
		return aPreset;
	},
};

function createOne(params) {
	const liElem = document.createElement("LI");
	liElem.innerHTML = params.desc;
	// liElem.dataset = {...params};
	for (let key in params) {
		liElem.dataset[key] = params[key];
	}
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

function handleSearchStr(str) {
	return ;
}


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
		this.ulPointer = document.getElementById("ULPresetList");


		// get the presets from the URL, or local storage or .json file in that order
		var presetsRows = [];
		var editValue = false;
		var urlValue = null;
		var scens = [];
		//process search string
		const searchString = decodeURI(location.search.slice(1));
		if (searchString.length > 0){
			const terms = searchString.split('&');
			console.log('terms',terms);
			let pairs =[];
			let k = 0;
			for (let term of terms){
				let j = term.indexOf('=');
				if ( j > 0 ) {
					pairs[k] = {key: term.substr(0,j),
							   value: term.substr(j+1)};
					k++;
				} else {
					console.log( 'term missing =',term);
				}
			}
			console.log('print pairs',pairs);
			for (let pair of pairs){
				switch (pair.key){
					case "edit":
						editValue = pair.value;
						break;
					case "url":
						urlValue = pair.value;
						break;
					case "scenarios":
						scens = pair.value.split(';');
						break;
					default:
						console.log('this didnt match',pair.key);
				}

			}
		}
		
		let presetsString =  localStorage.getItem(keyForLocalStorage);
		simu.warningLSandScens = ( scens.length > 0) && presetsString;
		
		// case 1: scenarios in url,
		if ( scens.length > 0 ){
			for ( let k = 0; k < scens.length; k++ ){
				presetsRows[k] = sDecode(scens[k]);
			}
			if ( editValue != "allow"){
				document.getElementById("editBox")
						.style.display = 'none'
			}
			simu.warningLocalStorageExists = true;
		} else {  // case 2: local storage
			if (presetsString) {
				presetsRows = JSON.parse(presetsString);
			} else {
				if ( urlValue ) { // case 3: try url given
					let response = await fetch(urlValue);
					if (response.ok) {
						presetsRows = await response.json();
					} 
				}
				//case 4: url wasn't given or url given failed
				// try standard .json file
				if ( !urlValue || !response.ok) {
					let response = await fetch(
						simu.nameOfSimulation + '.json');
					if (response.ok) {
						presetsRows = await response.json();
					} else {
						console.log("json file HTTP-Error: " + response.status);
					}
				}
			}
		}
		// if one thing worked the presetsRows has it.
		createList(presetsRows);
		//presets.printPresets();
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

		const li = createOne(sliders.getSliders()); //presets.currentLi.dataset)
		li.innerHTML = li.dataset.desc = desc;
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
			sliders.setSlidersFrom(newRow.dataset);
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
		presets.save = {
			slidersValues: sliders.getSliders(),
			theJSON: createJSON()
		};
		//    save / clone the list ulPointer.

		simu.editMode = true;
		// simulate a click on pause if running.
		let theButton = document.getElementById('pauseButton')
		if (theButton.style.display != 'none') theButton.click();

		// if nothing is selected as we enter edit mode pick first preset;  
		//        let x = presets.ulPointer.firstElementChild;
		//        if ( !presets.currentLi ) presets.changeCurrentLiTo(x);
		//        
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
		createList(JSON.parse(presets.save.theJSON));
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
		localStorage.setItem(keyForLocalStorage, createJSON());
	},

	exitEdit: function () {
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
		document.getElementById('jsonDisplay').innerHTML = createJSON();
		document.getElementById('urlDisplay').innerHTML = createURL(false);
	},

	//  user clicked on an item in the list, 
	//  possibly changing the selected choice
	//  and if textMode save the last entered name into the selected row
	liClicked: function (ev) {
		if (ev.target == presets.currentLi || ev.target.parentNode == presets.currentLi) return;

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



function createRows(){
	let rows = [];
	let contents = document.querySelectorAll('#ULPresetList li');
	for (let i = 0; i < contents.length; i++) {
		rows[i] = {...contents[i].dataset
		};
		rows[i].desc = contents[i].innerHTML;
	}
	console.log('in createRows',rows);
	return rows;
};

function createScenarioStr(rows){
	let first = true;
	let str = '';
	for (let row of rows){
		str += (first ? "" : ";") + presets.sEncode(row);
		first = false;
	}
	console.log('in crateScenarioStr', str);
	return str;
}

function createURL(edit) { //from current UL
	let result = location.origin + location.pathname +
		'?scenarios=' + createScenarioStr(createRows()) +
		( edit ? "&edit=allow" : "" );
	let encResult =  encodeURI(result);
	console.log('in createURL',result, encResult);
	return encResult;
};
					 
function toggleAllowEdit(event){
	document.getElementById('urlDisplay')
		.innerHTML = createURL(event.target.checked)
	}
	

function createJSON() { //from curreent UL
	return JSON.stringify(createRows());
};

function createList(presetsRows) { //from row of objects in argument
	presets.ulPointer.innerHTML = '';
	if (presetsRows) {
		for (let row of presetsRows) {
			presets.ulPointer.append(createOne(row));
		}
	}
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
simu.copyToClipboard = function (id){
	let url = document.getElementById(id);
//	console.log('HTML', url.innerHTML);
//	console.log('innerText', url.innerText);
//	console.log('textContent', url.textContent);
	navigator.clipboard.writeText(url.innerText)
		.then(function() {
  				/* clipboard successfully set */
				}, 
			  function() {
  				alert('failed to copy to clipboard')
				});

}

//sliders.initialize();
//presets.initialize();
