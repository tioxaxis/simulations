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