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
		this.ctx = document.getElementById(graphId)
						.getContext('2d');
		this.fontSize = 40;
		
		
		this.xInfo = xInfo;
		this.xInfoOrig = Object.assign({}, this.xInfo);
		this.yMax = yMax;
		this.lineInfo = [];
		
		this.outer= {width: 2000, height: 2000*ratio}
		this.margin = {top: this.fontSize, bot: this.fontSize*3/2,
					   left: this.fontSize*3, right:this.fontSize}
		this.inner = 
			{top: this.margin.top, 
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
		for( let info of this.lineInfo ){
			info.last ={x:null, y: null}
		this.setupRedraw();
		
		}
	};
	setTitle(title){
		document.getElementById('chartTitle').innerHTML = title;
	};
	
	//Legend routines
	setLegendText(elem,info) {
		elem.innerHTML = "<span style='color:" +
		info.color + "'>&#11044;&nbsp;</span><span " +
		(info.visible ? 
		 ">" : "style= 'text-decoration: line-through;' >") +
		info.name + "</span>&emsp; &emsp;"
	};
	
	setLegend(k,name){
		let elem = document.getElementById('legend'+k);
		let info = this.lineInfo[k]
		info.name = name;
		this.setLegendText(elem,info);
		elem.addEventListener('click',this.toggleLegend.bind(this));
	};
	
	toggleLegend(event){
		let elem = event.target.closest('div.legitem');
		if (!elem) return
		let k = Number(/[0-9]+/.exec(elem.id)[0]);
		let info = this.lineInfo[k];
		info.visible = !info.visible;
		this.setLegendText(elem,info);
		this.setupRedraw();
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
	};
	
	setupYScales (){
		this.yValues = [];
		for (let y = 0; y<= this.yInfo.max;
			 y += this.yInfo.step ){
			this.yValues.push(Math.round(y*100)/100);
		};
	};
	
	updateXaxis(x){
		if ( x <= this.xInfo.max ) return false;
		let delta = this.xInfo.max - this.xInfo.min; 
		this.xInfo.min = this.xInfo.max - this.xInfo.step;
		this.xInfo.max = this.xInfo.min + delta;
		let k = this.data.findIndex( 
			elem => this.xInfo.xAccess(elem) >= this.xInfo.min );
		if ( k > 0 ) this.data.splice(0,k-1);
		return true;	
	};
	
	updateYaxis(y){
		let result = this.vertAxisGen.next(y).value;
		if( !result.changed ) return false
		this.yInfo = result.pair;
		return true; 
	};
	
	adjustSpeed(factor){
		//  do I know the base level internally??
	};
		
	cleargraph(){
		this.ctx.clearRect(0,0,
			this.outer.width,this.outer.height);
	};
	
	drawGrid(){
		//setup 
		this.ctx.beginPath();
		this.ctx.font = this.fontSize+'px Ariel ';
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = 'grey';
		this.ctx.fillStyle = '#5f5c5c';
		let delta = this.fontSize/2;
		
		//x-axis
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline ='top';
		for( let x of this.xValues ) {
			let xg = this.xScale(x);
			this.ctx.moveTo(xg, this.inner.bot + delta);
			this.ctx.lineTo(xg, this.inner.top);
			this.ctx.fillText(x, xg, this.inner.bot + delta);
		}
		
		//y-axis
		this.ctx.textAlign = 'right';
		this.ctx.textBaseline ='middle';
		for( let y of this.yValues ) {
			let yg = this.yScale(y);
			this.ctx.moveTo(this.inner.left - delta, yg);
			this.ctx.lineTo( this.inner.right, yg);
			this.ctx.fillText(y, this.inner.left - delta, yg );
		}
		
		this.ctx.closePath();
		this.ctx.stroke();
	};

	setupRedraw(){
		this.cleargraph();
		this.setupXScales();
		this.setupYScales();
		this.drawGrid();
		this.drawLines();
	};
	
	setupLine (k, yAccess, color, vertical,
				visible, lineWidth, dotSize) {
		this.lineInfo[k] = {
			yAccess: yAccess, color: color,
			vertical: vertical, visible: visible, 
			lineWidth: lineWidth, dotSize: dotSize,
			last: {x:null,y:null} };
	};
	
	drawLines () {
		this.ctx.save();
		this.ctx.beginPath();
  		this.ctx.rect(this.inner.left, this.inner.top,
						  this.inner.width, this.inner.height);
  		this.ctx.clip(); // for the first quadrant of graph.

		for( let info of this.lineInfo ) {
			if( !info.visible ) continue;
			this.ctx.lineWidth = info.lineWidth;
			
			this.ctx.strokeStyle = 
					this.ctx.fillStyle = info.color;
			let last = {x:null, y: null};
			this.ctx.beginPath();
			for (let  p of this.data ){
				let cur = {x: this.xInfo.xAccess(p),
								y: info.yAccess(p)};
				if( cur.y == undefined) continue;
				if( last.y == null ) {
					this.ctx.moveTo( 
							this.xScale(cur.x),
							this.yScale(cur.y));

				} else {
					if(info.vertical) {
						this.ctx.lineTo( 
								this.xScale(cur.x),
								this.yScale(last.y));
					}
					if( cur.y != null ) {
						this.ctx.lineTo( 
								this.xScale(cur.x),
								this.yScale(cur.y));
						this.ctx.stroke();
					}
				}

				if( cur.y != null && info.dotSize > 0) {
					this.ctx.beginPath();
					this.ctx.arc(this.xScale(cur.x),
						this.yScale(cur.y), info.dotSize,
							0,2*Math.PI, true);
					this.ctx.fill();
				}
				last = cur;
			}
		}
		this.ctx.restore();
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
		if( bool1 || bool2 ) {
			this.setupRedraw();
		};
	};
	
	drawOnePoint(p){
		this.checkBounds(p);
		this.data.push(p);
		for( let info of this.lineInfo ) {
		  	let cur = {x: this.xInfo.xAccess(p), y: info.yAccess(p)};

			//if no data then skip it and keep last for next data point
			if( cur.y === undefined) continue;
			if( info.visible ){
				this.ctx.strokeStyle = 
					this.ctx.fillStyle = info.color;
				this.ctx.lineWidth = info.lineWidth;


				//no previous point then skip drawing line
				if( info.last.y != null ) {
					this.ctx.beginPath();

					this.ctx.moveTo( 
						this.xScale(info.last.x),
						this.yScale(info.last.y));

					if(info.vertical) {
						this.ctx.lineTo( 
							this.xScale(cur.x),
							this.yScale(info.last.y));
					}
					if( cur.y != null) {
						this.ctx.lineTo( 
							this.xScale(cur.x),
							this.yScale(cur.y));
						this.ctx.stroke();
					}
				}
				
				if( cur.y != null && info.dotSize > 0 ) {
					this.ctx.beginPath();
					this.ctx.arc(this.xScale(cur.x),
						this.yScale(cur.y), info.dotSize,
						0,2*Math.PI, true);
					this.ctx.fill();
				}
			}
			info.last = cur;
		}
	};
	
};
	
