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
function verticalAxis(y,table) {
	while( y > table[0].max ){
		table.push({max: table[0].max * 10,
					step: table[0].step * 10});
		table.shift();
		}
	return {min: 0, max: table[0].max,
			step: table[0].step};
}

function horizonalShiftAxis(x, xInfo){
	while ( x > xInfo.max ){
		xInfo.min = xInfo.max - xInfo.step 
		xInfo.max = xInfo.min + xInfo.width 
		};
}
function horizontalScaleAxis(newScale, xInfo){
	xInfo.width = xInfo.width / xInfo.scale * newScale;
	xInfo.step = xInfo.step / xInfo.scale * newScale;
	xInfo.max = xInfo.min + xInfo.width;
	xInfo.scale = newScale;
}

export class TioxGraph {
	constructor (graphId, ratio, xWidthStep, xAccess ){
		this.ctx = document.getElementById(graphId)
						.getContext('2d');
		this.fontSize = 40;
		
		
		this.xWidthStep = xWidthStep;
		this.xAccess= xAccess;
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
		
	}
	
	reset(yMax){
		this.data = [];
		//make copy of table
		this.table = [...[
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
		]];
		this.xInfo = {min: 0, max: this.xWidthStep.width,
					 step: this.xWidthStep.step,
					  width: this.xWidthStep.width,
					  lastX: 0, scale: 1};
		this.yInfo = {min:0, max: this.table[0].max,
					 step: this.table[0].step};
		this.updateYaxis(yMax);
		for( let info of this.lineInfo ){
			info.last ={x:null, y: null}
		}
		this.setupThenRedraw();
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
		this.setupThenRedraw();
	};
	
	xScale (x){
//		this.xInfo.lastX = x;
		return ( (x-this.xInfo.min) / (this.xInfo.max - this.xInfo.min) ) 
			* (this.inner.right - this.inner.left) + this.inner.left;
	};
	yScale (y){
		return (1- (y-0) / (this.yInfo.max - 0) )  * (this.inner.bot - this.inner.top) + this.inner.top;
	};
	scaleXaxis(scale){
		if ( scale == this.xInfo.scale ) return false;
		horizontalScaleAxis(scale, this.xInfo);
		
		for (let info of this.lineInfo ) {
			info.dotSize = Math.ceil(info.origDotSize / scale);
			info.lineWidth = Math.ceil(info.origLineWidth / scale);
		}
		this.shiftXaxis(this.xInfo.lastX, this.xInfo);
		this.setupThenRedraw();
		return true;
	};
	shiftXaxis(x){
		if ( x <= this.xInfo.max ) return false;
		horizonalShiftAxis(x,this.xInfo);
		let k = this.data.findIndex( 
			elem => this.xAccess(elem) >= this.xInfo.min );
		if ( k > 0 ) this.data.splice(0,k-1);
		return true;	
	};
	updateYaxis(y){
		if ( y <= this.yInfo.max ) return false;
		this.yInfo = verticalAxis(y,this.table);
		return true; 
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
		for( let x = this.xInfo.min; x <= this.xInfo.max;
			x += this.xInfo.step ) {
			let xg = this.xScale(x);
			this.ctx.moveTo(xg, this.inner.bot + delta);
			this.ctx.lineTo(xg, this.inner.top);
			let roundedX = Math.round(x*1000)/1000;
			this.ctx.fillText(roundedX, xg, this.inner.bot + delta);
		}
		
		//y-axis
		this.ctx.textAlign = 'right';
		this.ctx.textBaseline ='middle';
		for( let y = this.yInfo.min; y <= this.yInfo.max;
			y += this.yInfo.step ) {
			let yg = this.yScale(y);
			this.ctx.moveTo(this.inner.left - delta, yg);
			this.ctx.lineTo( this.inner.right, yg);
			let roundedY = Math.round(y*1000)/1000;
			this.ctx.fillText(roundedY, this.inner.left - delta, yg );
		}
		
		this.ctx.closePath();
		this.ctx.stroke();
	};

	setupThenRedraw(){
		this.cleargraph();
		this.drawGrid();
		this.drawLines();
	};
	
	setupLine (k, yAccess, color, vertical,
				visible, lineWidth, dotSize) {
		this.lineInfo[k] = {
			yAccess: yAccess, color: color,
			vertical: vertical, visible: visible, 
			lineWidth: lineWidth, origLineWidth: lineWidth,
			dotSize: dotSize, origDotSize: dotSize,
			last: {x:null,y:null} };
	};
	
	drawLines () {
		this.ctx.save();
		this.ctx.beginPath();
  		this.ctx.rect(this.inner.left, 0,
						  this.inner.width, this.outer.height);
  		this.ctx.clip(); // for the first quadrant of graph.

		for( let info of this.lineInfo ) {
			if( !info.visible ) continue;
			this.ctx.lineWidth = info.lineWidth;
			this.ctx.strokeStyle = 
					this.ctx.fillStyle = info.color;
			let last = {x:null, y: null};
			this.ctx.beginPath();
			
			for (let  p of this.data ){
				let cur = {x: this.xAccess(p),
								y: info.yAccess(p)};
				if( cur.y == undefined) continue;
				if( last.y == null ) {  //handles first point.
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
		this.ctx.restore();   // removes the clip path
	};
	
	checkBounds(p){
		//either p.x or one of p.y is out of bounds 
		// update axes and redraw all the graph up to point p
		let y = 0;
		let x = this.xAccess(p);
		for( let info of this.lineInfo ){
			let v = info.yAccess(p);
			if (v != undefined) y = Math.max(y,v);
		}
		let bool1 = this.shiftXaxis(x,1);
		let bool2 = this.updateYaxis(y);
		if( bool1 || bool2 ) {
			this.setupThenRedraw();
		};
	};
	
	drawOnePoint(p){
		this.checkBounds(p);
		this.data.push(p);
//		console.log('in draw one',p);
		for( let info of this.lineInfo ) {
		  let cur = {x: this.xAccess(p), y: info.yAccess(p)};
		  if( info.visible ) {
			this.ctx.lineWidth = info.lineWidth;
			this.ctx.strokeStyle = 
				this.ctx.fillStyle = info.color;
			
			//if no data then skip it and keep last for next data point
			if( cur.y === undefined) continue;
			
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
		  this.xInfo.lastX = cur.x;	
		}
	};
	
};
	
