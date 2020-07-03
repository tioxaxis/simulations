export const simuParams = {
    item: {ar: {value: 5, flag: true},
           acv: {value: 0, flag: true}, 
           sr: {value: 6, flag: true}, 
           scv: {value: 0, flag: true}, 
           speed: {value: 1, flag: true}},
    changeFlag : true,
    
    setParam: function ( key, v ){
        this.item[key].value =v;
        this.item[key].flag = true;
        this.changeFlag = true;
    },
    
    getParam: function ( key ){
        this.item[key].flag = false;
        return this.item[key].value;
    },
        
    changed: function (key ) {
        return this.item[key].flag ;
    }
}

export const slides = {};
slides['ar'] = {key:'ar', id:'arrivalRate', name:'Arrival Rate', 
             precision: 1, display: [1,3,5,7,9], 
             min: 1, max:9, start:5,
             inputElem:document.getElementById("arrivalRate"),
             displayElem: document.getElementById("arrivalRateDisplay")};
slides['acv'] = {key:'acv', id:'arrivalVariability', name:'Arrival Variability',
             precision: 1, display: [0.0,' ',1.0,' ',2.0], 
             min: 0, max:2, start:0,
             inputElem:document.getElementById("arrivalVariability"),
             displayElem: document.getElementById("arrivalVariabilityDisplay")};
slides['sr'] = {key:'sr', id:'serviceRate', name:'Service Rate',
             precision: 1, display: [1,3,5,7,9],
             min: 1, max:9, start:5,
             inputElem:document.getElementById("serviceRate"),
             displayElem: document.getElementById("serviceRateDisplay")};
slides['acv'] = {key:'acv', id:'serviceVariability', name:'Service Variability',
             precision: 1, display: [0.0,' ',1.0,' ',2.0],
             min: 0, max:2, start:0,
             inputElem:document.getElementById("serviceVariability"),
             displayElem: document.getElementById("serviceVariabilityDisplay")};
slides['speed'] = {key:'speed', id:'speed', name:'Arrival Rate', 
             precision: 0, display: [1,3,5,7,9],
             min: 1, max:9, start:1,
             inputElem:document.getElementById("speed"),
             displayElem: document.getElementById("speedDisplay")};


function getSlides (key) {
    let sl = slides[key];
    sl.flag=false;
    return sl.inputElem.value
}
function setupSliders(){
    for ( let i = 0; i < slides.length; i++ ) {
        let sl = slides[i];
        sl.inputElem.addEventListener('input', function () {
            let v = Number( sl.inputElem.value ).toFixed(sl.precision);
            simuParams.setParam(sl.key,v);
            sl.displayElem.innerHTML = v;
            setCurrentLi(sl.key,v);
            })
    }
}
