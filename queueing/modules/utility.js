export class GammaRV {  
    constructor (rate,CV=0,minimumTime=20){
        this.rate = rate;
        this.CV = CV;
        this.minimumTime = minimumTime;
        
        this.setParams (rate, CV);
    };
    
    setRate(rate){
        this.rate = rate;
        this.setParams(this.rate,this.CV);
    };
   
    setCV(CV) {
           this.CV = CV;
           this.setParams(this.rate,this.CV);
    };
    
    setParams (rate, CV){    //note it takes the rate not the mean as input.
         this.zeroRate = rate == 0;
        this.deterministic = CV == 0;
       
        if (this.zeroRate) return
        this.mean = 1/rate;
        
        if (this.deterministic) return
        this.shape = 1/(CV*CV);
        this.scale =1/(rate*this.shape);
    };
    
   observe() {
       if ( this.zeroRate ) return tioxInfinity;
       if ( this.deterministic ) return this.mean; 
       const p = Math.random();
       return Math.max(this.minimumTime,jStat.gamma.inv(p,this.shape,this.scale));
   }; 
}; 
 
export class Heap {
    constructor(compare){
        this.compare = compare;
        this.h = [];
    };
    
    reset (){
        this.h = [];
    };

     top(){
        return (this.h.length >0)? this.h[0] : null ;
    };

     push(event){
//         console.log('at heap pushing person or machine for proc', event.proc, 'future time ', event.time);
         
        this.h.push(event);
        let k = this.h.length - 1;
        while ( k >= 1 ){
            let pk = Math.floor( (k+1)/2 ) - 1;
            if ( this.compare(this.h[pk],this.h[k]) ) return;
            const temp = this.h[pk];
            this.h[pk] = this.h[k];
            this.h[k] = temp;
            k = pk;
            }
         return this.h.length;
     }

     pull(){
        const v = this.h[0];
        const r = this.h.pop();
        const n = this.h.length;
        if (n > 0) {
            this.h[0] = r;

            let k = 0;
            let lchild;
            while ( (lchild = k*2+1) < n ){
                let rchild = lchild + 1;
                if ( rchild == n || this.compare(this.h[lchild],this.h[rchild]) ){
                    if ( this.compare( this.h[lchild], this.h[k] )) {
                        const temp = this.h[k];
                        this.h[k] = this.h[lchild];
                        this.h[lchild] = temp;
                        k = lchild;
                    }
                    else break;
                }
                else {
                    if( this.compare(this.h[rchild], this.h[k]) ){
                         const temp = this.h[k];
                        this.h[k] = this.h[rchild];
                        this.h[rchild] = temp;
                        k = rchild; 
                    }
                    else break;    
                }
            }
        }
        return v;
    }
    }; //end class Heap
