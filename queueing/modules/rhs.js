import {theSimulation, theAnimation, resetAll, theChart } 
        from '../queueing.js';



// this is the structure to keep track of the sliders (both values and displays)
export const sliders = {
        // pointers to the slider, i.e.,input range objects
        arSlider: null,
        acvSlider: null,
        srSlider: null,
        scvSlider: null,
        speedSlider: null,
        resetCheckboxPointer: null,
        actionRadioNodelist: null,
    
        // pointers to the display of the values of the sliders
        arDisplay: null,
        acvDisplay: null,
        srDisplay: null,
        scvDisplay: null,
        speedDisplay: null,
        
    // this goes with the next function
    initialize: function(){
        this.arSlider = document.getElementById("arrivalRate");
        this.arDisplay = document.getElementById("arrivalRateDisplay");
        this.acvSlider = document.getElementById("arrivalVariability");
        this.acvDisplay = document.getElementById("arrivalVariabilityDisplay");
        this.srSlider = document.getElementById("serviceRate");
        this.srDisplay = document.getElementById("serviceRateDisplay");
        this.scvSlider = document.getElementById("serviceVariability");
        this.scvDisplay = document.getElementById("serviceVariabilityDisplay");
        this.speedSlider = document.getElementById("speed");
        this.speedDisplay = document.getElementById("speedDisplay");
        this.actionRadioNodelist = document.getElementsByName("actionRadio");
        this.resetCheckboxPointer = document.getElementById("resetCheckbox");
        
        
        this.arSlider.addEventListener('input',  function () {
            let v = Number( sliders.arSlider.value ).toFixed(1);
            theSimulation.interarrivalRV.setRate(v/10000);
            sliders.arDisplay.innerHTML = v;
            setCurrentLi('ar', v); 
            });
        
        this.acvSlider.addEventListener('input', function () {
            let v = Number( sliders.acvSlider.value ).toFixed(1);
            theSimulation.interarrivalRV.setCV(v);
            sliders.acvDisplay.innerHTML = v;
            setCurrentLi('acv', v);
            });
        
        this.srSlider.addEventListener('input',  function () {
           let v = Number( sliders.srSlider.value ).toFixed(1);
            theSimulation.serviceRV.setRate(v/10000);
            sliders.srDisplay.innerHTML = v;
            setCurrentLi('sr', v);
            });
        
        this.scvSlider.addEventListener('input',  function () {
            let v = Number( sliders.scvSlider.value ).toFixed(1);
            theSimulation.serviceRV.setCV(v);
            sliders.scvDisplay.innerHTML = v;
            setCurrentLi('scv', v);
            });
        
        this.speedSlider.addEventListener('input', function(){ 
            let v = Number( sliders.speedSlider.value ).toFixed(0);
            theAnimation.framedelta =  
                theAnimation.framedeltaFor1X*v;
            theChart.continue(); 
            sliders.speedDisplay.innerHTML = v;
            setCurrentLi('speed', v);
            theAnimation.speedUpdateFlag = true;
            });
        
        this.resetCheckboxPointer.addEventListener('change',this.resetCheck);
        for (let j = 0; j < this.actionRadioNodelist.length; j++){
            this.actionRadioNodelist[j].
                addEventListener('change',this.actionRadio);
        }
         
    },
    
    setSlidersFrom: function (aPreset){
        this.arSlider.value = aPreset.ar;
        this.arDisplay.innerHTML = aPreset.ar;
        this.acvSlider.value = aPreset.acv;
        this.acvDisplay.innerHTML = aPreset.acv;
        
        this.srSlider.value = aPreset.sr;
        this.srDisplay.innerHTML = aPreset.sr;
        this.scvSlider.value = aPreset.scv;
        this.scvDisplay.innerHTML= aPreset.scv;
         
        this.speedSlider.value = aPreset.speed;
        this.speedDisplay.innerHTML = aPreset.speed;
        
        if (presets.editMode) {
            setChecked(this.actionRadioNodelist,aPreset.action);
            this.resetCheckboxPointer.checked = aPreset.reset == "true";
        }
        // if things are setup and need to be adjusted fix 5 values for theSimulation/theAnimation.
        if( theSimulation.interarrivalRV ) {
            theSimulation.interarrivalRV.setParams(
                Number( sliders.arSlider.value )/10000,
                Number( sliders.acvSlider.value ));
            
            theSimulation.serviceRV.setParams(
                Number( sliders.srSlider.value )/10000,
                Number( sliders.scvSlider.value ));
        
            theAnimation.framedelta =  
               theAnimation.framedeltaFor1X*Number( sliders.speedSlider.value );
             theChart.continue();
            theAnimation.speedUpdateFlag = true;
           
        }
    },
    
    getSliders: function () {
        return  {ar: this.arSlider.value,
                 acv: this.acvSlider.value,
                 sr: this.srSlider.value,
                 scv : this.scvSlider.value,
                 speed : this.speedSlider.value};
    },
    
    actionRadio : function () {
            presets.currentLi.dataset.action = this.value;
    },
        
    resetCheck : function() {
            presets.currentLi.dataset.reset = this.checked;
    },
};

function createOne(params) {
            const liElem = document.createElement("LI");
            liElem.innerHTML = params.desc;
            liElem.dataset.ar = params.ar;
            liElem.dataset.acv = params.acv;
            liElem.dataset.sr = params.sr;
            liElem.dataset.scv = params.scv;
            liElem.dataset.speed = params.speed;
            liElem.dataset.action = params.action;
            liElem.dataset.reset = params.reset;
            return liElem;
        }

function setCurrentLi(key, v){
            if (presets.editMode) {
                presets.currentLi.dataset[key] = v;
            } else {
                if ( presets.currentLi ) presets.currentLi.classList.remove("selected");
                presets.currentLi = null;  
            };
         }
function nextLi() {
    if ( presets.currentLi ) {
        if ( presets.currentLi.nextElementSibling )
            return presets.currentLi.nextElementSibling; 
        return presets.currentLi;
    }
    return presets.ulPointer.firstElementChild;  
}

function previousLi() {
    if ( presets.currentLi ) {
        if ( presets.currentLi.previousElementSibling )
            return presets.currentLi.previousElementSibling;
        return presets.currentLi;
    }
    return presets.ulPointer.lastElementChild;  
}

function neighborLi() {
    if ( !presets.currentLi ) return null;
    if ( presets.currentLi.previousElementSibling )
            return presets.currentLi.previousElementSibling;
    if ( presets.currentLi.nextElementSibling )
            return presets.currentLi.nextElementSibling; 
    return null; 
}



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
        
        
        var presetsRows=null;

        let presetsString = location.search;
        if ( presetsString ) {
            presetsString = decodeURI(presetsString.slice(9));
            let rows = presetsString.split(';');
            rows.pop();
            for (let row of rows ) {
                let elems = row.split(',');
                presets.ulPointer.append(createOne({ar:elems[0], acv:elems[1], sr:elems[2], scv:elems[3], speed:elems[4], action: elems[5], reset: elems[6], desc: elems[7]}));
            }
        } else {
        
        
            presetsString = localStorage.getItem("TIOX");
            if (presetsString) {
                presetsRows = JSON.parse(presetsString);

            } else {
                let response = await fetch('presets.json');
                if (response.ok) { 
                 presetsRows = await response.json();
                } 
//              else {
//                  alert("HTTP-Error: " + response.status);
//               }
           
            }     
           createList(presetsRows)
        }

        presets.printPresets();


        // defaults to nothing selected in list
        presets.currentLi = null;
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
            .addEventListener('click',presets.export);
        document.addEventListener('keydown',keyDownFunction);
        
        function keyDownFunction (evt) {
            // evt = evt || window.event;
            const key = evt.key; 
            if (evt.code === "Space") {
                togglePlayPause();
            } else if (key === "Escape"){
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
        if ( presets.ulPointer.childElementCount > 0 ) desc = presets.saveModifiedDesc() + " copy";
        if ( presets.currentLi ) presets.currentLi.classList.remove("selected");

        const li = createOne({ desc: desc,
                            ar: sliders.arSlider.value,
                            acv: sliders.acvSlider.value,
                            sr: sliders.srSlider.value,
                            scv: sliders.scvSlider.value,
                            speed: sliders.speedSlider.value,
                            action: getChecked(sliders.actionRadioNodelist), 
                            reset: sliders.resetCheckboxPointer.checked.toString()  
                             })
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
            if ( !presets.editMode ){
                if (newRow.dataset.reset == "true") resetAll();
                if ( newRow.dataset.action == '1' &&    theAnimation.isRunning ) pause();
                else if ( newRow.dataset.action == '2' && !theAnimation.isRunning ) play();
            }
        };
        presets.currentLi = newRow;
    },

    
    // Routines to start, cancel and save an edit    
    startEdit: function(){
        presets.save = {slidersValues : sliders.getSliders(), theJSON: createJSON()};
        //    save / clone the list ulPointer.
        
        presets.editMode = true; 
        // if nothing is selected as we enter edit mode pick first preset;  Also pause.
        let x = presets.ulPointer.firstElementChild;
        if ( !presets.currentLi ) presets.changeCurrentLiTo(x);
        pause();
        
        document.getElementById("addButton").style.display = "block";
        document.getElementById('deleteButton').style.display = 'block';
        document.getElementById('menuBox').style.display = 'block';
        document.getElementById('editBox').style.display = 'none';
        document.getElementById('actionOptions').style.display = 'flex';
        document.getElementById('playButtons').style.display = 'none';
        
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
    
    // this restores previous state (to what it was at start of edit)
    cancelEdit: function() {
        presets.exitEdit();
        // delete the list and insert the old one, need to make sure currentLi is correct.
        createList(JSON.parse(presets.save.theJSON));
        sliders.setSlidersFrom(presets.save.slidersValues);
        presets.currentLi = null;     
    },
    
    // sorts and saves the cuurent list to localStorage
    saveEdit: function(){
        presets.exitEdit();
        // delete the cloned UL
                
        // sort the Li's in UL;  key is desc
        function sortTheUL( container ) { 
            let contents = container.querySelectorAll("li");  
            let list = [];
            for ( let i = 0; i < contents.length; i++){
                list.push(contents[i]); 
            }
            list.sort((a, b) => a.innerHTML.localeCompare(b.innerHTML));
            
            for( let i = 0; i < list.length; i++ ){
//                console.log(list[i].innerHTML);
                container.append(list[i]);
            }
        }
        
        sortTheUL(presets.ulPointer);
        localStorage.setItem("TIOX",createJSON());
    },
    
    export: function() {
        document.getElementById('exportBoxOuter').style = 'display:block';
        //document.getElementById('containerOuter').style = 'display:none';
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

 function togglePlayPause() {
        if ( theAnimation.isRunning ) pause();
        else play();
    };

function play(){ 
        document.getElementById('playButton').style.display = 'none';
        document.getElementById('pauseButton').style.display = 'inline';  
        theAnimation.start() ;
    };
function pause(){
        document.getElementById('pauseButton').style.display ='none';
        document.getElementById('playButton').style.display = 'block';
        theAnimation.stop()
};
document.getElementById('playButton').addEventListener('click',play);
document.getElementById('pauseButton').addEventListener('mouseup',pause);
document.getElementById('resetButton').addEventListener('mouseup',resetAll);


function createURL() {
    let searchStr = location.href+'?presets=';
    let contents = document.querySelectorAll('#ULPresetList li');
        for (let i = 0; i <contents.length; i++) {
           searchStr += contents[i].dataset.ar + "," +
                    contents[i].dataset.acv + "," +
                    contents[i].dataset.sr + "," +
                    contents[i].dataset.scv + "," +
                    contents[i].dataset.speed + "," +
                    contents[i].dataset.action + "," +
                    contents[i].dataset.reset + "," +
                    contents[i].innerHTML + ";" 
        }
        return searchStr; 
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

}


// two Nodelist routines;
    function getChecked (nodelist){
        for (let j = 0; j < nodelist.length; j++){
            if (nodelist[j].checked ) return j
        }
        return -1;
    }
    function setChecked (nodelist,j) {
        nodelist[j].checked = true;
    }


