export const simuParams = {
    item: {ar: {value: null, flag: false},
           acv: {value: null, flag: false}, 
           sr: {value: null, flag: false}, 
           scv: {value: null, flag: false}, 
           speed: {value: null, flag: false}},
    changeFlag : false,
    
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