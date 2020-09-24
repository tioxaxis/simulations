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
	function * verticalAxis(){
		let table = [
			{
				max: 1.0,
				step: 0.2
			},
			{
				max: 1.5,
				step: 0.5
			},
			{
				max: 2,
				step: 0.5
			},
			{
				max: 3,
				step: 1.0
			},
			{
				max: 4,
				step: 1
			},
			{
				max: 5,
				step: 1
			},
			{
				max: 6,
				step: 2
			},
			{
				max: 8,
				step: 2
			}
		];
		var y = 0;
		while(true){
			let changed = false;
			while( y> table[0].max ){
				table.push({max: table[0].max * 10, step: table[0].step * 10});
				table.shift();
				changed = true;
			}
			y = yield {changed: changed, pair: table[0]};
		}
	};


let html1 = '<svg  xmlns="http://www.w3.org/2000/svg" width="20" height="20">   <circle cx="25" cy="25" r="10" fill=';
let html2 = '></circle><text> legend name</text></svg><pre ';

export class TioxGraph {
	constructor (graphId,ratio, xInfo,yMax){
		this.context = document.getElementById(graphId)
						.getContext('2d');
		this.fontSize = 40;
		
		
		this.xInfo = xInfo;
		this.xInfoOrig = Object.assign({}, this.xInfo);
		this.yMax = yMax;
		this.lineInfo = [];
		
		this.outer= {width: 2000, height: 2000*ratio}
		this.margin = {top: this.fontSize, bot: this.fontSize*3/2,
					   left: this.fontSize*3, right:this.fontSize}
		this.inner = {top: this.margin.top, 
					  bot: this.outer.height-this.margin.bot,
					  left: this.margin.left,
					  right: this.outer.width- this.margin.right,
					 height: this.outer.height - this.margin.top - this.margin.bot,
					 width: this.outer.width - this.margin.left - this.margin.right};
		this.reset(this.yMax);
	}
	
	reset(yMax){
		this.data = [];
		this.xInfo = Object.assign({}, this.xInfoOrig);
		this.vertAxisGen = verticalAxis(); //start up the generator
		this.yInfo = this.vertAxisGen.next().value.pair;
		this.updateYaxis(yMax);
		this.setupScalesAxesGrids();
		for( let info of this.lineInfo ){
			info.last ={x:null, y: null}
		}
	};
	setTitle(title){
		document.getElementById('chartTitle').innerHTML = title;
	};
	
	


	setLegendText(elem,info) {
		elem.innerHTML = '<pre style="'+
		( info.visible?'':'text-decoration: line-through; ')
			+'color:'+info.color+'">  &#11044;  ' +info.name+'  </pre>';
	};
	setLegend(k,name){
		let elem = document.getElementById('legend'+k);
		this.lineInfo[k].name = name;
		this.setLegendText(elem,this.lineInfo[k])
		elem.addEventListener('click',this.toggleLegend.bind(this));
		// set event to toggle legend on and off 
		// crossed out if off
	};
	toggleLegend(event){
		let legElem = event.target.closest('div.legitem');
		if (!legElem) return
		let id = legElem.id;
		let k = Number(/[0-9]+/.exec(id)[0]);
		this.lineInfo[k].visible = !this.lineInfo[k].visible;
		
		this.setLegendText(legElem,this.lineInfo[k]);
		this.setupScalesAxesGrids();
		this.drawLines();
	};
	
	
	
	
	xScale (x){
		return ( (x-this.xInfo.min) / (this.xInfo.max - this.xInfo.min) ) * (this.inner.right - this.inner.left) + this.inner.left;
	};
	yScale (y){
		return (1- (y-0) / (this.yInfo.max - 0) )  * (this.inner.bot - this.inner.top) + this.inner.top;
	};
	
	
	setupXScales (){
		this.xValues = [];
		for (let x = this.xInfo.min; 
			 x <= this.xInfo.max; 
			 x += this.xInfo.step){
			this.xValues.push(x);
		};
//		console.log('xvalues',this.xValues);
	};
	
	setupYScales (){
		this.yValues = [];
		for (let y = 0; y<= this.yInfo.max;
			 y += this.yInfo.step ){
			this.yValues.push(Math.round(y*100)/100);
		};
//		console.log('yvalues',this.yValues);
	};
	updateXaxis(x){
		if ( x <= this.xInfo.max ) return false;
		let delta = this.xInfo.max - this.xInfo.min; 
		this.xInfo.min = this.xInfo.max - this.xInfo.step;
		this.xInfo.max = this.xInfo.min + delta;
		let k = this.data.findIndex( 
			elem => this.xInfo.xAccess(elem) >= this.xInfo.min );
		this.data.splice(0,k);
		// fix this for letting show line from one previous value?
		// splice off one less value if it is there??
		return true;	
	};
	
	adjustSpeed(factor){
		//  do I know the base level internally??
	}
		
	updateYaxis(y){
		let result = this.vertAxisGen.next(y).value;
		if( !result.changed ) return false
		this.yInfo = result.pair;
		return true; 
	};
	
	cleargraph(){
		this.context.clearRect(0,0,this.outer.width,this.outer.height);
	};
	
	drawGrid(){
		this.context.beginPath();
		this.context.font = this.fontSize+'px Ariel ';
		this.context.lineWidth = 1;
		this.context.strokeStyle = 'grey';
		this.context.fillStyle = '#5f5c5c';
		let delta = this.fontSize/2;
		
		this.context.textAlign = 'center';
		this.context.textBaseline ='top';
		for( let x of this.xValues ) {
			let xg = this.xScale(x);
			this.context.moveTo(xg, this.inner.bot + delta);
			this.context.lineTo(xg, this.inner.top);
			this.context.fillText(x, xg, this.inner.bot + delta);
		}
		
		this.context.textAlign = 'right';
		this.context.textBaseline ='middle';
		for( let y of this.yValues ) {
			let yg = this.yScale(y);
			this.context.moveTo(this.inner.left - delta, yg);
			this.context.lineTo( this.inner.right, yg);
			this.context.fillText(y, this.inner.left - delta, yg );
		}
		this.context.closePath();
		this.context.stroke();
	};

	setupScalesAxesGrids(){
		this.cleargraph();
		this.setupXScales();
		this.setupYScales();
		this.drawGrid();
	};
	
	setupLine (k,  yAccess, color, vertical, visible, lineWidth, dotSize) {
		this.lineInfo[k] = { yAccess: yAccess,
				color: color, vertical: vertical,
				visible: visible, 
				lineWidth: lineWidth, dotSize: dotSize,
				last: {x:null,y:null} };
	};
	
	
	drawLines () {
		for( let info of this.lineInfo ) {
			this.context.lineWidth = info.lineWidth;
			if( info.visible ){
				this.context.strokeStyle = 
					this.context.fillStyle = info.color;
				let last = {x:null, y: null};
				this.context.beginPath();
				for (let  p of this.data ){
					let cur = {x: this.xInfo.xAccess(p),
								y: info.yAccess(p)};
					if( last.y == null ) {
						this.context.moveTo( 
							this.xScale(cur.x),
							this.yScale(cur.y));

					} else {
						if(info.vertical) {
							this.context.lineTo( 
								this.xScale(cur.x),
								this.yScale(last.y));
						}
						if( cur.y != null ) {
							this.context.lineTo( 
								this.xScale(cur.x),
								this.yScale(cur.y));
							this.context.stroke();
						}
					}

					if( cur.y != null && info.dotSize > 0) {
						this.context.beginPath();
						this.context.arc(this.xScale(cur.x),
							this.yScale(cur.y), info.dotSize,
							0,2*Math.PI, true);
						this.context.fill();
					}
					last = cur;
				}
			}
		}
		
	};
	checkBounds(p){
		//either p.x or one of p.y is out of bounds 
		// update axes and redraw all the graph up to point p
		let y = 0;
		let x = this.xInfo.xAccess(p);
		for( let info of this.lineInfo ){
			y = Math.max(y,info.yAccess(p));
		}
		let bool1 = this.updateXaxis(x);
		let bool2 = this.updateYaxis(y);
//		console.log('checkbounds',y,this.yInfo,bool2)
		if( bool1 || bool2 ) {
			this.setupScalesAxesGrids();
			this.drawLines();
		};
	};
	drawOnePoint(p){
		this.checkBounds(p);
		this.data.push(p);
		for( let info of this.lineInfo ) {
		  	let cur = {x: this.xInfo.xAccess(p), y: info.yAccess(p)};
			if( info.visible ){
				this.context.strokeStyle = 
					this.context.fillStyle = info.color;
				this.context.lineWidth = info.lineWidth;


				//no previous point then skip drawing line
				if( info.last.y != null ) {
					this.context.beginPath();

					this.context.moveTo( 
						this.xScale(info.last.x),
						this.yScale(info.last.y));

					if(info.vertical) {
						this.context.lineTo( 
							this.xScale(cur.x),
							this.yScale(info.last.y));
					}
					if( cur.y != null) {
						this.context.lineTo( 
							this.xScale(cur.x),
							this.yScale(cur.y));
						this.context.stroke();
					}
				}
				
				if( cur.y != null && info.dotSize > 0 ) {
					this.context.beginPath();
					this.context.arc(this.xScale(cur.x),
						this.yScale(cur.y), info.dotSize,
						0,2*Math.PI, true);
					this.context.fill();
				}

			}
			info.last = cur;
		}
	};
	
};

function toggleVisible(k){
		//change legend to have it cross off or not
		this.lineInfo[k].visible = !this.lineInfo[k].visible;
	};
	function setLegendStatus(bool){
		
	};
	
