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

const tioxInfinity = 5000000000000;

export const cbColors = {
	blue: 'rgb(100,143,255)',
	purple: 'rgb(120,94,240)',
	red: 'rgb(220, 38, 127)',
	orange: 'rgb(254,97,0)',
	yellow: 'rgb(255,176,0)',
    black: 'rgb(0,0,0)',
    lightYellow: 'rgb(255, 230, 175)',
	
	
};



export class GammaRV {
	constructor(rate = 0, CV = 0, minimumTime = 20) {
		this.rate = Number(rate);
		this.CV = Number(CV);;
		this.minimumTime = Number(minimumTime);

		this.setParams(this.rate, this.CV);
	};

	setRate(rate) {
		this.rate = Number(rate);
		this.setParams(this.rate, this.CV);
	};

	setTime(time) {
		this.rate = 1 / Number(time);
		this.setParams(this.rate, this.CV);
	}

	setCV(CV) {
		this.CV = Number(CV);
		this.setParams(this.rate, this.CV);
	};

	setParams(rate, CV) { //note it takes the rate not the mean as input.
		this.zeroRate = rate == 0;
		this.deterministic = CV == 0;

		if (this.zeroRate) return
		this.mean = 1 / rate;

		if (this.deterministic) return
		this.shape = 1 / (CV * CV);
		this.scale = 1 / (rate * this.shape);
	};

	observe() {
		if (this.zeroRate) return tioxInfinity;
		if (this.deterministic) return this.mean;
		const p = Math.random();
		return Math.max(this.minimumTime, jStat.gamma.inv(p, this.shape, this.scale));
	};
};

export class DiscreteUniformRV {
    constructor( low, high ) {
        this.setParams(low,high);
    };
    observe() {
        return Math.floor((this.high - this.low + 1 ) 
                           * Math.random()) + this.low; 
    };
    setParams(low,high){
        this.low  = low;
        this.high = high;
    };
}

export class UniformRV {
	constructor(mean, variance) {
		this.setParams(mean, variance);
	};
	setParams(mean, variance) {
		this.mean = Number(mean);
		this.variance = Number(variance);
	};
	setMean(m) {
		this.mean = Number(m);
	}
	setVariance(variance) {
		this.variance = Number(variance);
	}
	observe() {
		let v = this.variance * this.mean;
		let x = this.mean - v + 2 * v * Math.random();
		//console.log('in demand RV observe=', x);
		return x;
	}
};

export class DeterministicRV {
	constructor(mean) {
		this.mean = Number(mean);
	}
	observe() {
		return this.mean;
	}
    setMean( mean ){
        this.mean = Number(mean);
    }
}

export class Average{
    constructor(){
        this.count = 0;
        this.total = 0;
    };
    getAverage(){
        return this.count >= 1 ? this.total/this.count : null;
    }
    addItem(x){
        this.count++;
        this.total += x;
        return this.getAverage();
    }
}
export class IRT{
    constructor(t,i){
        this.inSys = i;
        this.restart(t);
    }
    restart(t){  //but keep current inventory
        this.firstT = t;
        this.lastT = t;
        this.totFlow = 0;
        this.totInv = 0;
        this.completed = 0;
    };
    in(t){  //arrival at time t
        this.totInv += (t - this.lastT) * this.inSys;
        
        this.inSys++;
        this.lastT = t;
    };
    out(t,a){  //departure at time t with flow time of f
        this.totInv += (t - this.lastT) * this.inSys;
        
        this.totFlow += t - Math.max(this.firstT,a);
        this.inSys--;
        this.completed++;
        this.lastT = t;
    };
    avgI(){  //inventory or in system
        return this.totInv / (this.lastT - this.firstT);
    };
    avgR(){   // throughput
        return this.completed / (this.lastT - this.firstT);
    };
    avgT(){    // flow time
        return this.totFlow / this.completed
    };
    avgRT(){   //throughput * flowtime
        return this.totFlow / (this.lastT - this.firstT);
    };
}

export class Heap {
	constructor(compare) {
		this.compare = compare;
		this.h = [];
	};

	reset() {
		this.h = [];
	};

	top() {
		return (this.h.length > 0) ? this.h[0] : null;
	};

	push(event) {
		this.h.push(event);
		let k = this.h.length - 1;
		while (k >= 1) {
			let pk = Math.floor((k + 1) / 2) - 1;
			if (this.compare(this.h[pk], this.h[k])) return;
			const temp = this.h[pk];
			this.h[pk] = this.h[k];
			this.h[k] = temp;
			k = pk;
		}
		return this.h.length;
	}

	pull() {
		const v = this.h[0];
		const r = this.h.pop();
		const n = this.h.length;
		if (n > 0) {
			this.h[0] = r;

			let k = 0;
			let lchild;
			while ((lchild = k * 2 + 1) < n) {
				let rchild = lchild + 1;
				if (rchild == n || this.compare(this.h[lchild], this.h[rchild])) {
					if (this.compare(this.h[lchild], this.h[k])) {
						const temp = this.h[k];
						this.h[k] = this.h[lchild];
						this.h[lchild] = temp;
						k = lchild;
					} else break;
				} else {
					if (this.compare(this.h[rchild], this.h[k])) {
						const temp = this.h[k];
						this.h[k] = this.h[rchild];
						this.h[rchild] = temp;
						k = rchild;
					} else break;
				}
			}
		}
		return v;
	}


	heapify() {
		// resort in place
		for (let k = 0; k < this.h.length; k++) {
			let k2 = k;
			while (k2 >= 1) {
				let pk = Math.floor((k2 + 1) / 2) - 1;
				if (this.compare(this.h[pk], this.h[k2])) break;
				const temp = this.h[pk];
				this.h[pk] = this.h[k2];
				this.h[k2] = temp;
				k2 = pk;
			}
			// after while h[0:k] is organized as a heap.
		}

	}

	modify(type,timeFunc) {
        let cnt = 0;
		for (let i = 0; i < this.h.length; i++) {
			if (this.h[i].type == type) {
				this.h[i].time = timeFunc();
                cnt++
			}
		}
		this.heapify();
        return cnt;
	}
    
//    modifyNextOrder(now,period){
//        for( let i = 0; i < this.h.length; i++ ){
//            if( this.h[i].type == 'next order' ){
//                this.h[i].time = Math.floor((now+period)/period)*period
//            }
//        }
//    }
}; //end class Heap


export class StageOnCanvas{
    constructor (id, w, h){
        this.id = id;
        this.canv = document.getElementById(id);
        this.context = this.canv.getContext('2d');
        this.stage = {width:w, height:h};
    };
    reset(){
//        const rent = this.canv.parentElement;
//        const rect = this.canv.getBoundingClientRect();
//        console.log('Parent height:', rent.clientHeight);
//        console.log('in StageOnCanvas reset with id=',this.id,
//                    '  and rect =',rect.width,rect.height,
//                    ' and computed = ',rect.right-rect.left,rect.bottom-rect.top,
//                    ' dpr= ',devicePixelRatio.toFixed(1), this.stage.width,this.stage.height);
        
        this.canv.width = this.canv
            .getBoundingClientRect().width * devicePixelRatio;
        
        const ratio = this.stage.width / this.stage.height;
        this.canv.height = this.canv.width / ratio;
        
        const scale = this.canv.width/this.stage.width;
        this.context.scale(scale, scale);
        return this.context;
    };
};
