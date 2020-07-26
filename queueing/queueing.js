'use strict';

// declaration of Globals


import {GammaRV, Heap} from "../modules/utility.js";
//    from './modules/utility.js';
import { Queue, WalkAndDestroy, MachineCenter,
    InfiniteMachineCenter,SPerson,allSPerson, StickFigure,
       GStickFigure, NStickFigure }
from "../modules/procsteps.js" ;
//import {presets, sliders } from '../modules/rhs.js';
const tioxTimeConv = 10000;  //rates in tiox are k/10 seconds
const theStage = {
normalSpeed : .25,    //.25 pixels per millisecond
width: 1000,
height: 300,
pathY: 100,
person: {dx: 40, dy: 60}   
};
{
theStage.offStageLeft = {x: -100, y: theStage.pathY};
theStage.offStageRight = {x: theStage.width*1.1, y: theStage.pathY};

theStage.headQueue = {x: theStage.width*0.70, y: theStage.pathY};
theStage.queueDelta = {dx: theStage.person.dx, dy: 0};
theStage.scanner = {x: theStage.width*0.75, y: theStage.pathY};
theStage.pastScanner = {x: theStage.width*0.75+theStage.person.dx,
                       y: theStage.pathY};
theStage.scannerDelta = {dx: 0, dy: theStage.person.dy};
};


// specific info for queueing needed by general routines
// in procsteps and rhs.
simu.sliderTypes = {ar:'range', acv:'range', sr:'range',
    scv:'range', speed:'range', action:'radio', reset:'checkbox'};
simu.framedelta = 5;
simu.framedeltaFor1X = 5;



class ProcessCollection {
 constructor (){
     this.processList = [];  
 };

 push (aProcess) {
     this.processList.push(aProcess);
 };

 reset () {
     this.processList.forEach( aProcess => aProcess.reset() );
 };
}; // end class processCollection

var qLenDisplay= null;

 function resetBackground(){
//        let theFabricCanvas = simu.theCanvas;
//        theFabricCanvas.clear();
//        qLenDisplay = new fabric.Text( 'Queue Length = 0', 
//            { fontSize: 20, visible: false, 
//             left: 100, top: 250 });
//        theFabricCanvas.add(qLenDisplay); 
        
        // put other things that are fixed and not people on stage.
    };

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
const precision = {ar:1,acv:1,sr:1,scv:1,speed:0}
const speeds = [1,2,5,10,25];
function captureChangeInSliderS(event){
//    console.log('is event '+(event.isTrusted?'real':'scripted'));
    let inputElem = event.target.closest('input');
    if (!inputElem) return
    
    var id = inputElem.id;
    if (inputElem.type == 'range'){
        var v = Number( inputElem.value )       
                .toFixed(precision[id]);
        document.getElementById(id+'Display')
            .innerHTML = v;
    }
    switch(id) {
    case 'ar':  
        theSimulation.interarrivalRV
            .setRate(v/tioxTimeConv);
        simu.heap.modify('finish/creator',theSimulation.interarrivalRV);
        theChart.updatePredictedWait();
        break;
            
    case 'acv':  
        theSimulation.interarrivalRV.setCV(v);
        simu.heap.modify('finish/creator',theSimulation.interarrivalRV);
        theChart.updatePredictedWait();

        break;        

    case 'sr':  
        theSimulation.serviceRV
            .setRate(v/tioxTimeConv);
        simu.heap.modify('finish/TSAagent',theSimulation.serviceRV);
        theChart.updatePredictedWait();
        break;
            
    case 'scv':  
        theSimulation.serviceRV.setCV(v);
        simu.heap.modify('finish/TSAagent',theSimulation.serviceRV);    
        theChart.updatePredictedWait();
        break;       

    case 'speed':
        simu.framedelta = simu.framedeltaFor1X * 
            speeds[v];
        simu.frameSpeed = speeds[v];
        theChart.continue();
        Person.updateForSpeed();
        document.getElementById(id+'Display')
            .innerHTML = speeds[v];
        break;

    default:
        console.log(' reached part for default');
        break;                       
    }   
}



simu.reset2 = function(){
    resetBackground();
    Person.reset();
    theChart.reset();     
    theProcessCollection.reset();
        
    // schedule the initial Person to arrive and start the simulation/animation.
    theSimulation.supply.previous = null;
    theSimulation.creator.knockFromPrevious();
    
    //fudge to get animation started quickly
    let t = simu.heap.top().time-1;
    simu.frametime = Math.floor(t/simu.framedelta)*simu.framedelta;
    
};


    


//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
    loc : theStage.headQueue,
    delta : theStage.queueDelta,
    dontOverlap: true,
    walkingTime: (theStage.headQueue.x-theStage.offStageLeft.x)/theStage.normalSpeed,

    reset : function (){  
        this.loc = theStage.headQueue;
    },

    join: function ( nInQueue, arrivalTime, person ) {
        let dist = nInQueue * animForQueue.delta.dx;
        let time = simu.now + dist/theStage.normalSpeed;
        person.addPath( {t: time, x: person.cur.x, y: person.cur.y});
        person.addPath( {t: arrivalTime, 
                         x: animForQueue.loc.x - dist,
                         y: animForQueue.loc.y } );
        if ( person.isThereOverlap() ){
            person.cur.y = person.ahead.cur.y - 10;
        }
          
    },

    arrive: function (nSeatsUsed, person) {
  //      person.setColor( "orange");
        if ( nSeatsUsed > 10 ) qLenDisplay.set('text',
                    'Queue Length = ' + nSeatsUsed).set('visible',true);
    },

    leave: function (procTime, nSeatsUsed) {
        if ( nSeatsUsed > 5 )                
            qLenDisplay.set('text', 'Queue Length = ' + nSeatsUsed);
        else qLenDisplay.set('visible',false);
        
        for (let k = 0; k < theSimulation.queue.q.length; k++){
            let p = theSimulation.queue.q[k];
            let time = simu.now + Math.min( animForQueue.delta.dx / theStage.normalSpeed, procTime);
            if( p.pathList.length == 0 ) {
                p.addPath( 
                    {t: time,
                     x: p.cur.x + animForQueue.delta.dx,
                     y: p.cur.y + animForQueue.delta.dy} );
            } else {
                let dest = p.pathList[p.pathList.length-1];
                p.updatePathDelta(Math.max(time,dest.t), 
                     animForQueue.delta.dx, animForQueue.delta.dy )
            }
        }
        
    }
};

//function printPath(p, str){
//   
//    if(p.pathList.length == 0) 
//        console.log(str,'person',p.which,'no path****');
//    for ( let i = 0; i < p.pathList.length; i++ ) {
//        let pt = p.pathList[i];
//        console.log(str,'person',p.which, pt.t,pt.x,pt.y);
//    }
//};

const animForWalkOffStage = {
    loc: theStage.offStageRight,
    walkingTime: null,

    computeWalkingTime: function (){
         this.walkingTime =  Math.abs(theStage.scanner.x - this.loc.x)/theStage.normalSpeed;
        return this.walkingTime
    },

    start: function (person){
        person.addPath( {t: simu.now+this.walkingTime,
                          x: this.loc.x, y: this.loc.y } );
        if ( person.isThereOverlap() ){
            person.cur.y = person.ahead.cur.y - 10;
         }
        
    }
};
        
 const animForCreator = {
    loc: theStage.offStageLeft,
    dontOverlap: false,

    reset: function () {
    },

    start: function (theProcTime,person,m)  {  // only 1 machine for creator m=1
//    let x = animForCreator.loc.x - person.width *    
//        theSimulation.queue.queueLength();
//    person.addPath({t:simu.now+theProcTime, 
//                    x:x, y: animForCreator.loc.y});
 //       person.setColor("red");
    },
     
     finish: function () {},
       
};
        
const animForTSA = {
    firstLoc : theStage.scanner,
    delta : theStage.scannerDelta,
    dontOverlap: true,

    machLoc: null,
    lastFinPerson: null,
    
    reset:function ( numMachines ) {
         animForTSA.machLoc = [];
         animForTSA.lastFinPerson = null;
         let locX = animForTSA.firstLoc.x;
         let locY = animForTSA.firstLoc.y;
         for( let k = 0; k< numMachines; k++ ){
//            const rect1 = new fabric.Rect(
//                {left: theStage.scanner.x -10 , 
//                 top: theStage.scanner.y -35 + k*animForTSA.delta.dy,
//                fill: 'white', stroke: 'blue', strokeWidth: 5,
//                width: 55, height: 150});
//            rect1.selectable = false;
//            simu.theCanvas.add(rect1);
            animForTSA.machLoc[k] = {x :locX, y :locY} //, rect: rect1};
            locX += animForTSA.delta.dx;
            locY += animForTSA.delta.dy;
        }    
    },
    start: function (theProcTime, person, m){
        person.setDestWithProcTime(theProcTime,
                animForTSA.machLoc[m].x,animForTSA.machLoc[m].y);
 //       person.setColor("purple");
        if (animForTSA.lastFinPerson &&
           animForTSA.lastFinPerson.pathList.length > 0 ){
            let path = animForTSA.lastFinPerson.pathList[0];
            if (path.t > simu.now){
                    animForTSA.lastFinPerson.updatePathDelta( 
                        Math.min(path.t, simu.now+theProcTime),0,0);
            }
        }    
    },
    
    finish: function(person){
        animForTSA.lastFinPerson = person;  
    }
};


var theProcessCollection = new ProcessCollection();

 const theSimulation = {
    //  the two random variables in the simulation
    interarrivalRV: null,
    serviceRV : null,
    
     // the 5 process steps in the simulation
    supply : null,
    queue : null,
    walkOffStage :null,
    creator : null,
    TSAagent: null,
    
    initialize: function (){
    
        // random variables
        let r = document.getElementById('ar').value;
        let cv = document.getElementById('acv').value; 
        theSimulation.interarrivalRV = new GammaRV(r/tioxTimeConv,cv);
        r = document.getElementById('sr').value;
        cv = document.getElementById('scv').value;
        theSimulation.serviceRV = new GammaRV(r/tioxTimeConv,cv);
        
        //queues
        this.supply = new Supplier
              ( theStage.offStageLeft.x, theStage.offStageLeft.y);
    
                
        this.queue = new Queue("theQueue",-1, animForQueue.walkingTime,     
                animForQueue,
                recordQueueArrival, recordQueueLeave  );
        
        // define the helper functions for theQueue
        function recordQueueArrival (person){
            person.arrivalTime = simu.now;
        };
        function recordQueueLeave(person) {            
            theChart.push(simu.now,simu.now-person.arrivalTime);
         };
            
      
        this.walkOffStage = new WalkAndDestroy("walkOff",  animForWalkOffStage, true);
    
    
        // machine centers 
        this.creator = new MachineCenter("creator", 
             1,theSimulation.interarrivalRV,
             this.supply, this.queue, 
             animForCreator);
            
        this.TSAagent = new MachineCenter("TSAagent",
              1,theSimulation.serviceRV,
              this.queue, this.walkOffStage,
              animForTSA);
         
        //link the queue to machine before and after
        this.queue.setPreviousNext(
            this.creator,this.TSAagent);

        // put all the process steps with visible people in theProcessCollection
        theProcessCollection.push(this.supply);
        theProcessCollection.push(this.creator);
        theProcessCollection.push(this.queue);
        theProcessCollection.push(this.TSAagent);
        theProcessCollection.push(this.walkOffStage);
     },
};

// SUPPLIER
class Supplier {
    constructor ( x, y ){
        this.x = x;
        this.y = y;
        this.previous = null;
    };
    reset() {
        this.previous = null;
    }

    pull () {
       
        this.previous = new Person(this.previous, this.x, this.y,
                                  30, theStage.person.height); 
        return this.previous;
     }
};   //end class Supplier

var gSF = new GStickFigure(80);

 export class Person extends SPerson {
    
    
    constructor (ahead, x,y= 100,w = 30,h = 30) {
        super(ahead, x, y);
        this.width = w;
        
        this.graphic = new NStickFigure( gSF, x, y );
        //simu.theCanvas.add(this.graphic.figure);
     };
     
    
    isThereOverlap() {
        // is 'p' graph above the 'a' graph in [0, p.count] ?
        let p = this;
        let a = this.ahead;
        if ( !a ) return false;
        let pPath = p.pathList[0];
        let aPath = a.pathList[0];
        if ( !aPath ) return false;
        
        if (  p.cur.x + p.width > a.cur.x ) return true;
        if ( pPath.deltaX <= aPath.deltaX ) return false;
        return (a.cur.x - p.width - p.cur.x)/(pPath.deltaX - aPath.deltaX) <= pPath.count;
    };
     
     setDestWithProcTime(procTime,x,y){
         let distance = Math.max(Math.abs(this.cur.x-x),
                                 Math.abs(this.cur.y-y));  
         let deltaTime = Math.min( distance / theStage.normalSpeed,  procTime);
         this.addPath( {t:simu.now +deltaTime, x:x, y:y} );
     };

  };  // end class Person

    

 function initializeAll(){ 
    Math.seedrandom('this is the Queueing Simulation');
    simu.initialize();   // the generic
    theSimulation.initialize();   // the specific to queueing
     theChart.initialize();
    //reset first time to make sure it is ready to play.
    document.getElementById('resetButton').click();   
};
document.addEventListener("DOMContentLoaded",initializeAll);
 

//   TheChart variable is the interface to create the charts using Chart.js

export const theChart ={
    predictedWaitValue : null,
    canvas: null,
    ctx: null,
    chart: null,
    stuff: {
        type: 'scatter',
        data: {
       	    datasets: [
                {  //*** Series #1
                label: 'individual wait',
                pointBackgroundColor: 'rgba(0,0,220,1)',
                pointBorderColor: 'rgba(0,0,220,1)',
                showLine: true,
                lineTension:0,
                pointRadius: 5,
                borderColor: 'rgba(0,0,220,1)',
                    borderWidth: 3,
                fill: false,

                data: []
                },
                {   //*** Series #2
                label: 'average wait',
                pointBackgroundColor: 'rgba(0,150,0,1)',
                pointBorderColor: 'rgba(0,150,0,1)',
                showLine: true,
                lineTension: 0,
                pointRadius: 3,
                borderColor: 'rgba(0,150,0,1)',
                    borderWidth: 3,
                fill: false,

                data: [],
                },
                {   //*** Series #3
                label: 'predicted wait',
                pointBackgroundColor: 'rgb(185, 26, 26)',
                pointBorderColor: 'rgba(185, 26, 26)',
                showLine: true,
                    hidden: true,
                lineTension: 0,
                pointRadius: 0,
                borderColor: 'rgba(185, 26, 26)',
                    borderWidth: 3,
                fill: false,

                data: [],
                }
            ]
        },
        options: {
            animation: {duration: 0}, // general animation time
            hover: {animationDuration: 0}, // duration of animations when hovering an item
            responsiveAnimationDuration: 0, // animation duration after a resize
            maintainAspectRatio: false,
            responsive: true,
            pointBackgroundColor : 'rgba(255,0,0,1)',
            //showLiness: true,
            layout:{
                padding: {
                    left: 20,
                    right: 60,
                    top:20,
                    bottom:20
                }
            },
            legend:{
                display: true,
                position: 'bottom',
                labels: {boxWidth: 20,
                        //fontSize: 14,
                        padding: 20}
            },
            title:{
               display: true,
                position: 'top',
                text: 'Waiting Time',
                //fontSize: 20,
            },   
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    gridLines:{color: 'rgba(0,0,0,.3)'
                              },
                    zeroLineColor:'rgba(0,0,0,.3)',
                   //ticks:{ fontSize: 14,}
                }],
                yAxes: [{
                    type: 'linear',
                    gridLines:{color: 'rgba(0,0,0,.3)'
                              },
                    zeroLineColor:'rgba(0,0,0,.3)', 
                    //ticks:{ fontSize: 14,}
                }]
            }
            }
        
            },
    total: null,
    count: null,
    graphInitialTimeWidth: 5,
    graphInitialTimeShift: 4,
    graphTimeWidth: null,
    graphTimeShift: null,
    graphMin: null,
    graphMax: null,
    graphScale: null,  
    yAxisScale: null,
    initialize: function(){
        this.canvas = document.getElementById('chart')
        this.ctx = this.canvas.getContext('2d'); 
        this.chart =  new Chart(this.ctx, this.stuff);
        resizeChart();
        this.reset();
        this.predictedWaitValue = this.predictedWait();
    }, 
    reset: function(){
        this.stuff.data.datasets[0].data=[];
        this.stuff.data.datasets[1].data=[];
        this.stuff.data.datasets[2].data=[];
        this.total = 0;
        this.count = 0;
        this.graphScale = 1;
        this.yAxisScale = {max: 1, stepSize: .2};
        this.aVAxis = new VerticalAxisValue();
        this.graphMin = 0;
        this.graphMax = this.graphInitialTimeWidth;
        this.chart.options.scales.yAxes[0].ticks.min = 0;
        this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
        this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        this.continue();
    },
    continue: function(){
        this.graphScale = Math.max(this.graphScale, simu.frameSpeed); 
        this.graphTimeWidth = this.graphInitialTimeWidth*this.graphScale;
        this.graphTimeShift = this.graphInitialTimeShift*this.graphScale;
        this.graphMax = Math.max(this.graphMax,this.graphMin + this.graphTimeWidth);
        this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
        this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
        this.chart.options.scales.xAxes[0].ticks.stepSize = this.graphTimeWidth - this.graphTimeShift;
        var points = Math.max(1,Math.floor( (11-this.graphScale)/2));
        this.chart.data.datasets[0].pointRadius = points;
        this.chart.data.datasets[0].borderWidth = points;
        this.chart.data.datasets[1].pointRadius = points;
        this.chart.data.datasets[1].borderWidth = points;
        this.chart.data.datasets[2].borderWidth = points;
        this.chart.update();
    },
    push: function (t,w){ 
        t /= 10000;
        w /= 10000;
        this.total += w;
        this.count++;
        if (t > this.graphMax) {
            this.graphMin += this.graphTimeShift;
            this.graphMax += this.graphTimeShift;
            this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
            this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
            }
        const pW = theChart.predictedWaitValue;
        if ( w > this.yAxisScale.max  || 
            ( pW > this.yAxisScale.max && pW < Infinity) ){
            this.yAxisScale = this.aVAxis.update(w);
            if ( pW >= 0 && pW < Infinity )
                    this.yAxisScale = this.aVAxis.update(pW);
            this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
            this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        }
        this.chart.data.datasets[0].data.push({x:t,y:w});
        this.chart.data.datasets[1].data.push({x:t,y:this.total/this.count});
        if ( pW >= 0 && pW < Infinity) {
            this.chart.data.datasets[2].data.push({x:t,y:pW})
        }
        this.chart.update();
        // update graph with time, this.total/this.waits.length
    },
    updatePredictedWait: function(){
        let pW = theChart.predictedWaitValue;
        let pDS = this.chart.data.datasets[2];
        
        pDS.data.push( {x:(simu.now-1)/10000, y:pW});
        pW = theChart.predictedWait();
        pDS.data.push( {x:(simu.now/10000), y:pW});
        pDS.label = 'predicted wait' + ((pW == Infinity)? ' = ∞':'');
        
        theChart.predictedWaitValue = pW;
        this.chart.generateLegend();
        this.chart.update();
     },
    
     predictedWait: function(){
        if (theSimulation.serviceRV.rate == 0 ) return Infinity;
        let rho = theSimulation.interarrivalRV.rate/theSimulation.serviceRV.rate;
        if (rho >= 1) return Infinity;
        let p = ( rho / (1-rho) / theSimulation.serviceRV.rate/10000 )*
            (theSimulation.interarrivalRV.CV**2 + theSimulation.serviceRV.CV**2)/2;
        return p;
     },   

}

function predictedWait(){
    if (theSimulation.serviceRV.rate == 0 ) return -1;
    let rho = theSimulation.interarrivalRV.rate/theSimulation.serviceRV.rate;
    if (rho >= 1) return -1;
    let p = ( rho / (1-rho) / theSimulation.serviceRV.rate/10000 )*
        (theSimulation.interarrivalRV.CV**2 + theSimulation.serviceRV.CV**2)/2;
//    console.log(' predicted wait / 10000 ', p/10000);
    return p;
}

class VerticalAxisValue {
    constructor(){
        this.table= [
           { max: 1.0,  stepSize: 0.2},
           { max: 1.5,  stepSize: 0.5},
           { max: 2,    stepSize: 0.5},
           { max: 3,    stepSize: 1.0},
           { max: 4,    stepSize: 1},
           { max: 5,    stepSize: 1},
           { max: 6,    stepSize: 2},
           { max: 8,    stepSize: 2},
        ];   
    };
    update (y) {
        while (y > this.table[0].max){
            this.table.push({max: this.table[0].max*10,stepSize: this.table[0].stepSize*10});
            this.table.shift();
        }
        return this.table[0];
    }
} ;

function resizeChart(){
    const w = document.getElementById('canvasWrapper');
    const wW   = w.clientWidth;
    const newFontSize = wW / 750 * 14;
    theChart.chart.options.title.fontSize = newFontSize;
    theChart.chart.options.title.padding = 5;
    theChart.chart.options.legend.labels.fontSize = newFontSize;
    theChart.chart.options.legend.labels.padding = 10;

    theChart.chart.update();
    //alert(' in resize and w,h = '+wW+'  new font size');
    };
window.addEventListener('resize', resizeChart);



