export const simuParams = {
    item: {ar: {value: 5, flag: false},
           acv: {value: 0, flag: false}, 
           sr: {value: 6, flag: false}, 
           scv: {value: 0, flag: false}, 
           speed: {value: 1, flag: false}},
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