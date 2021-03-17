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
import {
	tioxSpeeds, Average, cbColors, StageOnCanvas
}
from "./util.js";
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
function horizontalScaleAxis(newScale, oldScale, xInfo){
	xInfo.width = xInfo.width / oldScale * newScale;
	xInfo.step = xInfo.step / oldScale * newScale;
	xInfo.max = xInfo.min + xInfo.width;
}
const vertLines = {color: 'grey', lineWidth: 6 };


export class TioxGraph {
	constructor (omConcept, domElem, fontSize, xOrigWidthStep, xAccess,
                  width, height, hasRight = false ){
		this.omConcept = omConcept;
		this.chart = new StageOnCanvas(domElem, width, height);
        
        this.ctx = this.chart.context;
		this.fontSize = fontSize;
		this.extraLine = {width: 15, origWidth: 15};
		this.xOrigWidthStep = xOrigWidthStep;
		this.xAccess= xAccess;
		this.lines = [];
        this.vertCoors = [];
        this.hasRight = hasRight;
        this.lastVertCoor = 0;
		
		this.outer= {width: width, height: height}
		this.margin = {top: this.fontSize, bot: this.fontSize*3/2,
					   left: this.fontSize*3, 
                       right:this.fontSize * (this.hasRight ? 3 : 1)}
		this.inner = 
			{top: this.margin.top, 
			 bot: this.outer.height-this.margin.bot,
			 left: this.margin.left,
			 right: this.outer.width- this.margin.right,
			 height: this.outer.height - this.margin.top - this.margin.bot,
			 width: this.outer.width - this.margin.left - this.margin.right};
        this.CurSpeed = tioxSpeeds[0];
	}
	
	reset(yMax, yMaxRight = null){

        this.vertCoors = [];
        for( let line of this.lines )
            line.data = [{x:0,y:null}];;
		//make copy of table
		this.table = [...[
			{
				max: 1.2,
				step: 0.3
			},
			{
				max: 2,
				step: 0.5
			},
			{
				max: 4,
				step: 1
			},
			{
				max: 6,
				step: 1.5
			},
			{
				max: 8,
				step: 2
			}
		]];
        this.tableRight = [...[
			{
				max: 1.2,
				step: 0.3
			},
			{
				max: 2,
				step: 0.5
			},
			{
				max: 4,
				step: 1
			},
			{
				max: 6,
				step: 1.5
			},
			{
				max: 8,
				step: 2
			}
		]];
        this.xInfo = {min: 0, 
                      max: this.xOrigWidthStep.width,
					  step: this.xOrigWidthStep.step,
					  width: this.xOrigWidthStep.width,
					  lastX: 0};
        this.yInfo = {min:0, 
                      max: this.table[0].max,
					  step: this.table[0].step};
        this.yInfoRight = {min:0, 
                      max: this.tableRight[0].max,
					  step: this.tableRight[0].step};				
		this.updateYaxis(yMax)
        if( yMaxRight ) this.updateYaxisRight(yMaxRight);
		for( let line of this.lines ){
			line.last ={x:null, y: null}
		}
        this.scaleXaxis(this.CurSpeed);
		this.setupThenRedraw();
	};
	setTitle(title,id){
		document.getElementById(id + this.omConcept.key).innerHTML = title;
	};
	
	
	xScale (x){
		return ( (x-this.xInfo.min) / (this.xInfo.max - this.xInfo.min) ) 
			* (this.inner.right - this.inner.left) + this.inner.left;
	};
	yScale (y, bool){
		const max = (bool ? this.yInfoRight.max: this.yInfo.max);
        return (1- (y-0) / (max - 0) )  * (this.inner.bot - this.inner.top) + this.inner.top;
	};
    
	scaleXaxis(speed){
       
        this.xInfo.width =this.xOrigWidthStep.width * speed.xAxis;
        this.xInfo.step =this.xOrigWidthStep.step * speed.xAxis;
        this.xInfo.max = this.xInfo.min + this.xInfo.width;
        this.CurSpeed = speed;
        
		for (let line of this.lines ) {
			line.params.dotSize = Math.ceil(line.origDotSize * speed.dotScale);
			line.params.lineWidth = Math.ceil(line.origLineWidth * speed.lineScale);
		}
		this.extraLine.width = Math.ceil(
			this.extraLine.origWidth * speed.lineScale);

		this.shiftXaxis(this.xInfo.lastX, this.xInfo);
	};
	shiftXaxis(x){
		if ( x <= this.xInfo.max ) return false;
		horizonalShiftAxis(x,this.xInfo);
		
        //need to shift data for all lines and vertCoors
        for( let line of this.lines ){
            let k = line.data.findIndex( 
			     elem => elem.x >= this.xInfo.min );
		if ( k > 0 ) line.data.splice(0,k-1);
        }
        let k = this.vertCoors.findIndex( 
			x => x >= this.xInfo.min );
		if ( k > 0 ) this.vertCoors.splice(0,k-1);
        
		return true;	
	};
	shiftXaxis2(){
		let delta = this.xInfo.max - this.xInfo.min;
		this.xInfo.min = this.xInfo.max;
		this.xInfo.max += delta;
		
        for( let line of this.lines ){
             line.data.splice(0,line.data.length - 1);
        }
        this.setupThenRedraw();
	}
	updateYaxis(y){
		if ( y <= this.yInfo.max ) return false;
		this.yInfo = verticalAxis(y,this.table);
		return true; 
	};
    updateYaxisRight(y){
		if ( y <= this.yInfoRight.max ) return false;
		this.yInfoRight = verticalAxis(y,this.tableRight);
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
		
		this.ctx.textBaseline ='middle';
        for( let y = this.yInfo.min, yRight = this.yInfoRight.min;
            y <= this.yInfo.max;  
            y += this.yInfo.step, yRight += this.yInfoRight.step ) {
			let yg = this.yScale(y);
			this.ctx.moveTo(this.inner.left - delta, yg);
			const xRight =  this.inner.right + (this.hasRight ? delta : 0);
            this.ctx.lineTo(xRight, yg);
			let roundedY = Math.round(y*1000)/1000;
			this.ctx.textAlign = 'right';
            this.ctx.fillText(roundedY, this.inner.left - delta, yg );
            if( this.hasRight) {
                let roundedYRight = Math.round(yRight*1000)/1000;
                this.ctx.textAlign = 'left';
                this.ctx.fillText(roundedYRight, xRight, yg);
                
            }
		}
		
		this.ctx.closePath();
		this.ctx.stroke();
	};
	setExtraLines(color,horz,vert){
		if( horz && !horz.step ) horz.step = Infinity;
		if( vert && !vert.step ) vert.step = Infinity;
		this.xl = {horz: horz, vert: vert, color: color};
	};
	
	drawExtraLines(){
		if( !this.xl ) return;
		this.ctx.beginPath();
		this.ctx.lineWidth = this.extraLine.width;
		this.ctx.strokeStyle = this.xl.color;
		if (this.xl.horz )
			for( let y = this.xl.horz.min; y <= this.yInfo.max;
				y += this.xl.horz.step){
				let yg = this.yScale(y);
				this.ctx.moveTo(this.inner.left, yg);
				this.ctx.lineTo( this.inner.right, yg);	
			}
		if (this.xl.vert )
			for( let x = this.xl.vert.min; x <= this.xInfo.max;
				x += this.xl.vert.step){
				if ( x > this.xInfo.min ){
					let xg = this.xScale(x);
					this.ctx.moveTo(xg, this.inner.bot);
					this.ctx.lineTo(xg, this.inner.top);
				}
		}
			this.ctx.closePath();
			this.ctx.stroke();
	};

	setupThenRedraw(){
		this.cleargraph();
		this.drawGrid();
		this.drawExtraLines();
		this.drawLines();
	};
    drawLines () {
		let ctx = this.ctx;
        ctx.save();
		ctx.beginPath();
  		ctx.rect(this.inner.left, 0,
						  this.inner.width, this.outer.height);
  		ctx.clip(); // for the first quadrant of graph.
        
        for( let line of this.lines ){
            line.drawLine();
        }
        
        ctx.beginPath();
        ctx.strokeStyle = vertLines.color;
        ctx.lineWidth = vertLines.lineWidth;
        for( let t of this.vertCoors){
            const xg = this.xScale(t);
            ctx.moveTo(xg, this.inner.bot);
            ctx.lineTo(xg, this.inner.top);   
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };
	
	checkBounds(p){
		//either p.x or one of p.y is out of bounds 
		// update axes and redraw all the graph up to point p
		let y = 0;
        let yRight = 0;
		let x = this.xAccess(p);
		for( let line of this.lines ){
			let v = line.yAccess(p);
			if (v != undefined){
                if(line.params.yLimit) v = Math.min(v,line.params.yLimit);
                if (line.right) yRight = Math.max(yRight,v);
                else y = Math.max(y,v);
            }
		}
		let bool1 = this.shiftXaxis(x,1);
		let bool2 = this.updateYaxis(y);
        let bool3 = this.updateYaxisRight(yRight);
		if( bool1 || bool2 || bool3) {
			this.setupThenRedraw();
		};
	};
	
	drawOnePoint(p){
		this.checkBounds(p);
		const pair = {};
        pair.x = this.xAccess(p);
        for( let line of this.lines) {
            pair.y = line.yAccess(p);
            if( !(pair.y === undefined) && pair.y <= this.yInfo.max ){
                    line.drawPoint(pair);
                    line.data.push({...pair});
                }   
        };
    };
    restartGraph(t){
        // plot gray line if new point or some time has passed
        //  which > 1/50 of x-axis spread
        const dt = t - this.lastVertCoor;
        this.lastVertCoor = t;
        const smallX = (this.xInfo.max - this.xInfo.min) / 50;
        const line0data = this.lines[0].data;
        let k = line0data.length -1;
        if( !( line0data[k].y != null || dt > smallX )) return;
        
        
        for( let line of this.lines ){
           k = line.data.length - 1;
            
          if( line.data[k].y != null && !line.params.continuous){
              line.data.push({x:t,y:null});
          }
        };
        
        //graph grey veritcal line at t
        this.vertCoors.push(t);
        this.ctx.strokeStyle = vertLines.color;
        this.ctx.lineWidth = vertLines.lineWidth;
        this.ctx.beginPath();
        const xg = this.xScale(t);
        this.ctx.moveTo(xg, this.inner.top);
        this.ctx.lineTo(xg, this.inner.bot);
        this.ctx.closePath();
        this.ctx.stroke();
    };
	
};
    
export class GraphLine{
        
    
	//line constructor, knows its graph and adds obj to set. or do graph.lines.push(new Line)
    constructor(graph, yAccess, params) {
		this.graph = graph;
        this.graph.lines.push(this);
        this.yAccess = yAccess;
        this.params = params;
        this.origLineWidth = params.lineWidth;
        this.origDotSize = params.dotSize;
        this.data = [{x:0,y:null}];
    };
        
    createLegend(text){
        this.button = document.createElement('div');
        this.button.classList.add('legendbox');
        
        const dot = document.createElement('div');
        dot.classList.add('legendCircle');
        dot.innerHTML = '&#11044;'
        dot.style = 'color:'+this.params.color;
        
        const txt = document.createElement('div');
        txt.classList.add('legendText');
        txt.innerHTML = text ;
        this.button.append(dot, txt);
        if( !this.params.visible ) 
            this.button.classList.add('crossOut');
        return this.button;
    };
	
    setLegendText(text){
        const children = this.button.childNodes;
        children[1].innerHTML = text;
    };
    
	clickResponse(){
        this.setVisibility(!this.params.visible);
        
    };
    setVisibility(b){
        this.params.visible = b;
        if( this.params.visible )
            this.button.classList.remove('crossOut');
        else
          this.button.classList.add('crossOut');
        this.graph.setupThenRedraw();
    };
    
    //process one point for a line for either drawPoint or drawLine.
    processOne(ctx,last,pair){
        const gx = this.graph.xScale(pair.x);
        const gy = this.graph.yScale(pair.y,this.params.right);
        if( last.y != null){
            const gLx = this.graph.xScale(last.x);
            const gLy = this.graph.yScale(last.y,this.params.right);
            
            ctx.beginPath();
            ctx.lineWidth = this.params.lineWidth;
            ctx.moveTo(gLx,gLy);
            if( this.params.vertical){
                ctx.lineTo(gx,gLy)
            }
            ctx.lineTo(gx,gy);
            ctx.stroke();
            ctx.closePath();
        }
        
        if( this.params.dotSize > 0) {
            ctx.beginPath();
            ctx.lineWidth = 0
            ctx.arc(gx, gy, this.params.dotSize, 0, 2*Math.PI, true);
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
        }
    };
    
    drawPoint(pair){
        if( !this.params.visible ) return;
        const ctx = this.graph.ctx;
        ctx.fillStyle = this.params.color;
        ctx.strokeStyle = this.params.color;
        ctx.lineWidth = this.params.lineWidth;
        ctx.beginPath();
        
        const k = this.data.length - 1;
        const last = this.data[k];
        
        this.processOne(ctx,last,pair);
        
    };
    
    drawLine(){
        if( !this.params.visible) return;
        const ctx = this.graph.ctx;
        ctx.fillStyle = this.params.color;
        ctx.strokeStyle = this.params.color;
        ctx.lineWidth = this.params.lineWidth;
        ctx.beginPath();
        
        let last = {x: null, y: null};
        for( let pair of this.data ){
            if( pair.y != null ){
                this.processOne(ctx,last,pair);
            };
            last = pair;
        };
    }
};
    	
	
