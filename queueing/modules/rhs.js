import {simuParams} 
    from './simuParams.js';

export const sliders = {
        resetCheckboxPointer: null,
        actionRadioNodelist: null,
            
    // this goes with the next function
    initialize: function(){
        document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderG);
        function captureChangeInSliderG(event){
            let inputElem = event.target.closest('input');
            if (!inputElem) return
            else {
                if( event.isTrusted && presets.editMode ){
                    //setCurrentLi(key, inputElem.value);
                    let k = event.target.id;
                    let v = inputElem.value;
                    let t = inputElem.type;
                    let ds = presets.currentLi.dataset;
                    // pull value into preset based on type of input
                    switch (t) {    
                        case 'range':
                            ds[k] = v;
                            break;
                        case 'checkbox':
                            ds[k] = inputElem.checked.toString();
                            break;
                        case 'radio':
                            ds['action'] = k;
                            break;
                        default:
                    }

                } else {
                    if ( presets.currentLi ) presets.currentLi.classList.remove("selected");
                    presets.currentLi = null;  
                };
                }
        };         
    },




    
     tpes : {ar:'range', acv:'range', sr:'range', scv:'range',
            speed:'range', action:'radio', reset:'checkbox'},
    inputEvent : new Event('input',{bubbles: true}),
      setSlidersFrom: function (aPreset){
        const precision = {ar:1,acv:1,sr:1,scv:1,speed:0};
//        const inputBoxes = document.getElementById("sliderBigBox")
//                .querySelectorAll("input"); 
        let inputBox;  
        for (let key in sliders.tpes ) {
            let t = sliders.tpes[key];
            inputBox = document.getElementById(key);
            let v = aPreset[key];
            if( t == 'range' ){
                inputBox.value = v;
                inputBox.dispatchEvent(sliders.inputEvent);
            } else if( t == 'checkbox' ) 
                inputBox.checked = (v == 'true');
            
            else if( t == 'radio' ){
                inputBox = document.getElementById(v);
                let theNodeList = document.getElementsByName(key);
                let j = findId(theNodeList,v);
                theNodeList[j].checked = true;
            }
                 
        }
        // not in edit mode then may cause a reset, a play, or a pause.
        console.log(aPreset.reset, aPreset.action);
          if ( !presets.editMode ){
            if ( aPreset.reset == 'true' )
                document.getElementById('resetButton').click();
            if ( aPreset.action == 'play' )
                document.getElementById('playButton').click();
            else if ( aPreset.action == 'pause' )
                document.getElementById('pauseButton').click();
            }
    },
    
    getSliders: function () {
        let aPreset = {};
        for ( let k in sliders.tpes ){
            let inputElem = document.getElementById(k);
            let t = sliders.tpes[k] ;
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
    
    actionRadio : function () {
            presets.currentLi.dataset.action = this.value;
    },
        
    resetCheck : function() {
            presets.currentLi.dataset.reset = this.checked;
    },
};
sliders.initialize();

function createOne(params) {
            const liElem = document.createElement("LI");
            liElem.innerHTML = params.desc;
            // liElem.dataset = {...params};
            for ( let key in params ){
                liElem.dataset[key] = params[key];
            }
            return liElem;
        }
    

function setCurrentLi(key, v){
            if (presets.editMode) {
                presets.currentLi.dataset[key] = v;
            } else {
                if ( presets.currentLi ) presets.currentLi.classList.remove("selected");
                presets.currentLi = null;  
            };
         };

function nextLi() {
    if ( presets.currentLi ) {
        if ( presets.currentLi.nextElementSibling )
            return presets.currentLi.nextElementSibling; 
        return presets.currentLi;
    }
    return presets.ulPointer.firstElementChild;  
};

function previousLi() {
    if ( presets.currentLi ) {
        if ( presets.currentLi.previousElementSibling )
            return presets.currentLi.previousElementSibling;
        return presets.currentLi;
    }
    return presets.ulPointer.lastElementChild;  
};

function neighborLi() {
    if ( !presets.currentLi ) return null;
    if ( presets.currentLi.previousElementSibling )
            return presets.currentLi.previousElementSibling;
    if ( presets.currentLi.nextElementSibling )
            return presets.currentLi.nextElementSibling; 
    return null; 
};



export const presets = {
        
        currentLi: null,     // poiner to current  LI in the UL in the HTML
        ulPointer: null,     //pointer to the UL in the HTML
        textInpBox: null,
        
        started: null,    
        textMode: false,
        editMode: false,
    
        saveState: null,
       
    
    initialize: async function (){
         // setup the input text box
        this.textInpBox = document.createElement("INPUT");
        this.textInpBox.type = "text";
        this.textInpBox.className = "textInput";
        this.textInpBox.placeholder = "preset name";
        
        this.ulPointer = document.getElementById("ULPresetList");
        this.ulPointer.addEventListener('click', this.liClicked);
        this.ulPointer.addEventListener('dblclick', this.liDblClicked);
        
        
        // get the presets from the URL, or local storage or .json file in that order
        var presetsRows=null;

        let presetsString = location.search;
        if ( presetsString ) {
            presetsString = decodeURI(presetsString.slice(9));
            presetsRows = JSON.parse(presetsString);
        } else {
            presetsString = localStorage.getItem("TIOX");
            if (presetsString) {
                presetsRows = JSON.parse(presetsString);
            } else {
                let response = await fetch('presets.json');
                if (response.ok) presetsRows = await response.json();
                else alert("json file HTTP-Error: " + response.status);
            }     
        }
        createList(presetsRows);
//        
//            let rows = presetsString.split(';');
//            rows.pop();
//            for (let row of rows ) {
//                let elems = row.split(',');
//                presets.ulPointer.append(createOne({ar:elems[0], acv:elems[1], sr:elems[2], scv:elems[3], speed:elems[4], action: elems[5], reset: elems[6], desc: elems[7]}));
//            }
//        } else {
//            presetsString = localStorage.getItem("TIOX");
//            if (presetsString) {
//                presetsRows = JSON.parse(presetsString);
//            } else {
//                let response = await fetch('presets.json');
//                if (response.ok) presetsRows = await response.json();
//                else alert("json file HTTP-Error: " + response.status);
//            }     
//           createList(presetsRows)
//        }

        presets.printPresets();
        presets.changeCurrentLiTo(nextLi());

        // defaults to nothing selected in list
        //presets.currentLi = null;
        this.started = true;
        
        document.getElementById('addButton')
            .addEventListener('click',presets.addRow);
        document.getElementById('deleteButton')
            .addEventListener('click',presets.deleteSelected);
        document.getElementById('editButton')
            .addEventListener('click',presets.startEdit);
        document.getElementById('saveButton')
            .addEventListener('click',presets.saveEdit);
        document.getElementById('cancelButton')
            .addEventListener('click',presets.cancelEdit);
        document.getElementById('exportButton')
            .addEventListener('click',presets.popupExport);
        document.addEventListener('keydown',keyDownFunction);
        
        function keyDownFunction (evt) {
            const key = evt.key; 
            if (key === "Escape"){
                let elem = document.getElementById( 'exportBoxOuter');
                if (elem.style.display  == 'block' ) 
                    elem.style.display = 'none'
                else presets.deleteTextInpBox();
            } else if (key === "Enter"){
                if ( presets.editMode ) 
                    if ( presets.textMode ) presets.saveModifiedDesc();
                    else  presets.addTextBox(presets.currentLi.innerHTML);
            } else if( key === "ArrowDown"  || key === "PageDown" ){
                presets.nextRow();
            } else if( key === "ArrowUp"  || key === "PageUp" ){
                presets.previousRow();
            }
        }
    },

    
    printPresets: function () {
        console.log(presets.ulPointer);
    },
    
    // utilities for the text box:  Delete, Save, Add  from the CurrentLi row.
    deleteTextInpBox : function () {
        if ( presets.textMode ) {
            presets.currentLi.removeChild(this.textInpBox);
            presets.textMode = false;
        }
    },
    
    saveModifiedDesc : function(){
        if ( this.textMode ) {
            this.textMode = false;
            this.currentLi.removeChild(this.textInpBox);
            this.currentLi.innerHTML =  this.textInpBox.value;   
        }
        return   presets.currentLi ? presets.currentLi.innerHTML : '' ;   //does this test ever apply?
    },
    
    addTextBox : function(name){
        this.textMode = true;
        this.currentLi.appendChild(this.textInpBox);
        this.textInpBox.value = name;
        this.textInpBox.focus();    
    },
    
    // for adding an new Preset row
   addRow: function() {
        let desc =''
        if ( presets.ulPointer.childElementCount > 0 )
                desc = presets.saveModifiedDesc() + " copy";
        if ( presets.currentLi )      
                presets.currentLi.classList.remove("selected");

        const li = createOne(presets.currentLi.dataset)
        li.classList.add("selected");
        presets.ulPointer.append(li);
        presets.currentLi = li;
        }, 
    
    nextRow: function() {
        if ( document.activeElement.tagName=="BODY"){ 
            presets.changeCurrentLiTo(nextLi());
        }
    },
    
    previousRow: function() {
        if( document.activeElement.tagName=="BODY"){
            presets.changeCurrentLiTo( previousLi());
        }
    },
    
    deleteSelected: function (){
        if ( !presets.currentLi )return;
            
        let save = presets.currentLi
        presets.changeCurrentLiTo(neighborLi());
        presets.ulPointer.removeChild(save);               
    },
    
    changeCurrentLiTo: function (newRow){
        presets.saveModifiedDesc();
        if ( presets.currentLi ) this.currentLi.classList.remove("selected");
        if ( newRow ) {
            newRow.classList.add("selected");
            sliders.setSlidersFrom(newRow.dataset);
        };
        presets.currentLi = newRow;
    },

    
    // Routines to start, cancel and save an edit    
    startEdit: function(){
        presets.save = {slidersValues : sliders.getSliders(), theJSON: createJSON()};
        //    save / clone the list ulPointer.
        
        presets.editMode = true; 
        // simulate a click on pause if running.
        let theButton = document.getElementById('pauseButton')
                if (theButton.style.display != 'none' ) theButton.click();
        
        // if nothing is selected as we enter edit mode pick first preset;  Also pause.
        let x = presets.ulPointer.firstElementChild;
        if ( !presets.currentLi ) presets.changeCurrentLiTo(x);
        
        
        document.getElementById("addButton").style.display = "block";
        document.getElementById('deleteButton').style.display = 'block';
        document.getElementById('menuBox').style.display = 'block';
        document.getElementById('editBox').style.display = 'none';
        document.getElementById('actionOptions').style.display = 'flex';
        document.getElementById('playButtons').style.display = 'none';
        
    },
    
     
    // this restores previous state (to what it was at start of edit)
    cancelEdit: function() {
        presets.exitEdit();
        createList(JSON.parse(presets.save.theJSON));
        sliders.setSlidersFrom(presets.save.slidersValues);
        presets.currentLi = null;     
    },
    
    // sorts and saves the current list to localStorage
    saveEdit: function(){
        presets.exitEdit();
                
        // sort the Li's in UL;  key is desc
        function sortTheUL( container ) { 
            let contents = container.querySelectorAll("li");  
            let list = [];
            for ( let i = 0; i < contents.length; i++){
                list.push(contents[i]); 
            }
            list.sort((a, b) => a.innerHTML.localeCompare(b.innerHTML));
            
            for( let i = 0; i < list.length; i++ ){
                container.append(list[i]);
            }
        }
        
        sortTheUL(presets.ulPointer);
        localStorage.setItem("TIOX",createJSON());
    },
    
    exitEdit: function() {
        presets.editMode = false;
        presets.saveModifiedDesc();
        document.getElementById("addButton").style.display = "none";
        document.getElementById('deleteButton').style.display = 'none';
        document.getElementById('menuBox').style.display = 'none';
        document.getElementById('editBox').style.display = 'block';
        document.getElementById('actionOptions').style.display = 'none';
        document.getElementById('playButtons').style.display = 'flex'; 
    },
   
    popupExport: function() {
        document.getElementById('exportBoxOuter').style = 'display:block';
        document.getElementById('jsonDisplay').innerHTML = createJSON();
        document.getElementById('urlDisplay').innerHTML = createURL();
    },
    
    //  user clicked on an item in the list, possibly changing the selected choice
    //  and if textMode save the last entered name into the selected row
    liClicked: function(ev) {
        if (ev.target == presets.currentLi  || ev.target.parentNode == presets.currentLi ) return;
        
        presets.saveModifiedDesc();
        if (ev.target.tagName === 'LI') {
            presets.changeCurrentLiTo(ev.target);
        };
    },
        
    // 2. double click on item in UL list;  start editing name if in edit mode
    liDblClicked: function(ev){
        if( !presets.editMode ) return;
        if ( presets.textMode ) return;  // ignore if in text mode already; everything is setup.
        if(ev.target == presets.currentLi) {
            presets.addTextBox(ev.target.childNodes[0].nodeValue);
         }
    }
};

function createURL() {
    return encodeURI(location.href+'?presets='+ createJSON());
//    let contents = document.querySelectorAll('#ULPresetList li');
//        for (let i = 0; i <contents.length; i++) {
//           searchStr += contents[i].dataset.ar + "," +
//                    contents[i].dataset.acv + "," +
//                    contents[i].dataset.sr + "," +
//                    contents[i].dataset.scv + "," +
//                    contents[i].dataset.speed + "," +
//                    contents[i].dataset.action + "," +
//                    contents[i].dataset.reset + "," +
//                    contents[i].innerHTML + ";" 
//        }
//        return searchStr; 
}

function createJSON() {
            let rows= [];
            let contents = document.querySelectorAll('#ULPresetList li');
            for (let i = 0; i <contents.length; i++) {
                rows[i] = {...contents[i].dataset};
                rows[i].desc = contents[i].innerHTML;
            }
            let JSONstr = JSON.stringify(rows);
            return JSONstr;
};

function createList(presetsRows) {
    presets.ulPointer.innerHTML ='';
    if (presetsRows) {
        for (let row of presetsRows){
            presets.ulPointer.append(createOne(row));
        }  
    }
};


// two Nodelist routines;
    function getChecked (nodelist){
        for (let j = 0; j < nodelist.length; j++){
            if (nodelist[j].checked ) return j
        }
        return -1;
    };
    function setChecked (nodelist,j) {
        nodelist[j].checked = true;
    };
function findId(nodelist,str){
    for ( let j = 0; j<nodelist.length; j++ ) {
        if ( nodelist[j].id == str ) return j
    }
    return -1;
}

presets.initialize();

