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

// The Matches Game, after the boys' game in Goldratt's "The Goal".
// Five stations in a line.  An endless supply of work waits on the left;
// between stations are queues limited to 'max' items (a station whose
// finished item has no room downstream is blocked), each starting with
// 'init' items.  A station's time per item comes from a die: on a roll of
// k it works at k items per round, with k weighted so that one station
// alone averages 3.5 items per round (as in the earlier Java version).
// Graph time is in rounds: tioxTimeConv is the length of a round in ms.

import {
	cbColors, StageOnCanvas, Average, Thruput, computeKeyIndex
}
from "../mod/util.js";
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter, Item
}
from "../mod/stepitem.js";
import {
	TioxGraph, GraphLine
}
from "../mod/graph.js";
import {
	Description, match, NumSlider, ArbSlider, Checkbox, RadioButtons,
	LegendButton, addDiv, addKeyForIds, genPlayResetBox
}
from '../mod/params.js';

const tioxTimeConv = 18000;  // one round of the game, in ms of simulated time
const expectedThruput = 3.5; // items per round for one station alone
const nStations = 5;

let mat;

// ****** stage layout (canvas 1000 x 480)
const anim = {
	stage: {width: 1000, height: 480, normalSpeed: 0.5 / 3},  // pixels per ms
	box: {size: 17, pitch: 21},     // items, and spacing in a queue column
	baseY: 430,                     // the line the work moves along
	// left 15% of the stage: the supply, a row with its front at the right
	supplyFrontX: 93,
	stationX: [],                   // centers of the 5 stations
	queueX: [],                     // centers of the 4 queues between them
	// stations fill the middle 70% (x 150 to 850); the right 15% is empty
	station: {width: 100, height: 80, pitch: 150, firstLeft: 150},
	exitX: 1050
};
for (let k = 0; k < nStations; k++) anim.stationX[k] =
	anim.station.firstLeft + anim.station.width / 2 + anim.station.pitch * k;
for (let k = 0; k < nStations - 1; k++)
	anim.queueX[k] = anim.stationX[k] + anim.station.pitch / 2;
const supplySeats = 7;  // how many supply items fit in front of station 1
const maxQueue = 20;    // the largest queue must fit vertically on the stage

function travelTime(item, x, y) {
	return Math.max(Math.abs(x - item.cur.x), Math.abs(y - item.cur.y))
		/ anim.stage.normalSpeed;
}

// ****** the die: a roll of k means k items per round, chosen with weight k
class DieRV {
	constructor() {
		this.times = [];
		for (let k = 1; k <= 6; k++)
			for (let j = 0; j < k; j++) this.times.push(tioxTimeConv / k);
	}
	observe() {
		return this.times[Math.floor(Math.random() * this.times.length)];
	}
}

// ****** an item of work: a small blue box, gold when marked
class MatBox {
	constructor(ctx) {
		this.ctx = ctx;
		this.mark = false;
	}
	draw(cur) {
		const s = anim.box.size;
		const ctx = this.ctx;
		ctx.fillStyle = this.mark ? cbColors.yellow : cbColors.blue;
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		ctx.fillRect(cur.x - s / 2, cur.y - s / 2, s, s);
		ctx.strokeRect(cur.x - s / 2, cur.y - s / 2, s, s);
	}
}
class Match extends Item {
	constructor(x, y) {
		super(mat, x, y);
		this.graphic = new MatBox(anim.stage.foreContext);
		this.entryTime = null;  // when it started at station 1
	}
}

// ****** endless supply of work: a row in front of station 1
class Supply {
	constructor() {
		this.items = [];
	}
	reset() {
		this.items = [];
	}
	seatX(k) {
		return anim.supplyFrontX - k * anim.box.pitch;
	}
	// fill the row; a new item slides in from the left edge
	fill() {
		while (this.items.length < supplySeats) {
			const k = this.items.length;
			const fresh = this.items.length > 0 && mat.now > 0;
			const item = new Match(fresh ? this.seatX(k + 1) : this.seatX(k),
								   anim.baseY);
			if (fresh) item.updatePath({
				t: mat.now + travelTime(item, this.seatX(k), anim.baseY),
				x: this.seatX(k), y: anim.baseY});
			this.items.push(item);
		}
	}
	front() {
		this.fill();
		return this.items[0];
	}
	pull() {
		const item = this.front();
		this.items.shift();
		// everyone left moves right one place
		for (let k = 0; k < this.items.length; k++) {
			const other = this.items[k];
			other.updatePath({
				t: mat.now + travelTime(other, this.seatX(k), anim.baseY),
				x: this.seatX(k), y: anim.baseY});
		}
		this.fill();
		return item;
	}
	mark() {
		this.front().graphic.mark = true;
	}
}

// ****** queue between two stations: a column growing upward
class MatQueue extends Queue {
	constructor(which) {
		super(mat, 'queue' + which, 1, 0);
		this.x = anim.queueX[which];
	}
	seatY(k) {
		return anim.baseY - k * anim.box.pitch;
	}
	// put an item in the queue at the start of a run
	place(item) {
		item.cur.x = this.x;
		item.cur.y = this.seatY(this.q.length);
		super.push(item, 0);
	}
	push(item) {
		const y = this.seatY(this.q.length);
		const walkingTime = travelTime(item, this.x, y);
		if (!super.push(item, 0)) return false;   // the walk is animation only
		item.updatePath({t: mat.now + walkingTime, x: this.x, y: y});
		return true;
	}
	arriveAnim(item) {}
	pullAnim(item) {
		// everyone left moves down one place
		for (let k = 0; k < this.q.length; k++) {
			const other = this.q[k];
			const y = this.seatY(k);
			other.updatePath({t: mat.now + travelTime(other, this.x, y),
							  x: this.x, y: y});
		}
	}
}

// ****** a station: green when working, yellow with 'idle' or 'blocked'
class Station extends MachineCenter {
	constructor(which) {
		super(mat, 'station' + which, 1, mat.die);
		this.which = which;
		this.x = anim.stationX[which];
		this.ctx = anim.stage.backContext;
	}
	startAnim(machine, time) {
		const item = machine.person;
		if (this.which == 0) item.entryTime = mat.now;
		const t = Math.min(travelTime(item, this.x, anim.baseY), time / 2);
		item.updatePath({t: mat.now + t, x: this.x, y: anim.baseY});
	}
	finishAnim(machine) {
		const item = machine.person;
		if (this.which == nStations - 1) mat.graph.push(mat.now, item);
	}
	draw() {
		const w = anim.station.width, h = anim.station.height;
		const left = this.x - w / 2, top = anim.baseY - h / 2;
		const ctx = this.ctx;
		ctx.clearRect(left - 4, top - 4, w + 8, h + 8);
		const status = this.machs[0].status;
		ctx.fillStyle = (status == 'busy' ? '#54ed77' : 'lightyellow');
		ctx.strokeStyle = cbColors.darkBlue;
		ctx.lineWidth = 3;
		ctx.fillRect(left, top, w, h);
		ctx.strokeRect(left, top, w, h);
		if (status != 'busy') {
			ctx.fillStyle = 'black';
			ctx.font = '20px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(status, this.x, top + 24);
		}
	}
}

class WalkOff extends WalkAndDestroy {
	constructor() {
		super(mat, 'walkOff', false,
			  (anim.exitX - anim.stationX[nStations - 1]) / anim.stage.normalSpeed);
	}
	pushAnim(item) {
		item.updatePath({t: mat.now + this.walkingTime,
						 x: anim.exitX, y: anim.baseY});
	}
}

const theSimulation = {
	supply: null,
	stations: [],
	queues: [],
	walkOff: null,

	initialize() {
		this.supply = new Supply();
		mat.resetCollection.push(this.supply);
		for (let k = 0; k < nStations - 1; k++) {
			this.queues[k] = new MatQueue(k);
			mat.resetCollection.push(this.queues[k]);
		}
		this.walkOff = new WalkOff();
		mat.resetCollection.push(this.walkOff);
		for (let k = 0; k < nStations; k++) {
			this.stations[k] = new Station(k);
			mat.resetCollection.push(this.stations[k]);
			mat.resourceCollection.push(this.stations[k]);
		}
		for (let k = 0; k < nStations; k++) {
			const before = (k == 0 ? this.supply : this.queues[k - 1]);
			const after = (k == nStations - 1 ? this.walkOff : this.queues[k]);
			this.stations[k].setPreviousNext(before, after);
			if (k > 0) this.queues[k - 1].setPreviousNext(
				this.stations[k - 1], this.stations[k]);
		}
	}
};

// maximum queue size, and the initial queue size capped at it
function queueSizes() {
	const max = mat.usrInputs.get('max').getNumber();
	const init = Math.min(mat.usrInputs.get('init').getNumber(), max);
	return {max, init};
}

// ****** graphs: flow time and throughput, both against rounds
class MatGraph {
	constructor() {
		this.flowGraph = new TioxGraph(mat, 'fchartCanvasmat',
				40, {width: 40, step: 10}, d => d.t, 1000, 370, false);
		this.flowGraph.setTitle('Flow time', 'fchartTitle');
		this.indivLine = new GraphLine(this.flowGraph, d => d.i,
			{color: cbColors.blue, vertical: false,
			 visible: mat.usrInputs.get('leg0'), continuous: false,
			 lineWidth: 1, dotSize: 5, right: false});
		new GraphLine(this.flowGraph, d => d.a,
			{color: cbColors.yellow, vertical: false,
			 visible: mat.usrInputs.get('leg1'), continuous: false,
			 lineWidth: 10, dotSize: 0, right: false});

		this.thruGraph = new TioxGraph(mat, 'tchartCanvasmat',
				40, {width: 40, step: 10}, d => d.t, 1000, 370, false);
		this.thruGraph.setTitle('Throughput', 'tchartTitle');
		this.thruGraph.fixYaxis(4, 1);
		new GraphLine(this.thruGraph, d => d.a,
			{color: cbColors.yellow, vertical: false,
			 visible: mat.usrInputs.get('leg1'), continuous: false,
			 lineWidth: 10, dotSize: 0, right: false});
		new GraphLine(this.thruGraph, d => d.e,
			{color: cbColors.red, vertical: false, dashed: true,
			 visible: mat.usrInputs.get('leg2'), continuous: true,
			 lineWidth: 10, dotSize: 0, right: false});

		const legend = document.getElementById('chartLegendmat');
		legend.classList.add('rowAroundCenter');
		legend.append(
			mat.usrInputs.get('leg0').create(cbColors.blue,
				'Individual flow time', 'mat'),
			mat.usrInputs.get('leg1').create(cbColors.yellow,
				'Average', 'mat'),
			mat.usrInputs.get('leg2').create(cbColors.red,
				'Expected throughput (3.5)', 'mat'));
	}
	// an item has left station 5 at time now
	push(now, item) {
		const t = now / tioxTimeConv;
		if (item.entryTime != null) {
			// items that started in a queue have no flow time
			const f = (now - item.entryTime) / tioxTimeConv;
			const avg = this.avgFlow.addItem(f);
			this.flowGraph.drawOnePoint({t: t, i: f, a: avg});
			// dots only: a gap after each one, so they are not joined
			this.indivLine.data.push({x: t, y: null});
		}
		const thru = this.thruput.observe(t);
		if (thru !== undefined)
			this.thruGraph.drawOnePoint({t: t, a: thru, e: expectedThruput});
	}
	startStats() {
		this.avgFlow = new Average();
		this.thruput = new Thruput();
	}
	reset() {
		this.startStats();
		this.flowGraph.reset();
		this.thruGraph.reset();
		this.xInfo = this.flowGraph.xInfo;
	}
	updateForParamChange() {
		this.startStats();
		this.flowGraph.restartGraph(mat.now / tioxTimeConv);
		this.thruGraph.restartGraph(mat.now / tioxTimeConv);
	}
	setupThenRedraw() {
		this.flowGraph.setupThenRedraw();
		this.thruGraph.setupThenRedraw();
	}
	scaleXaxis(factor) {
		this.flowGraph.scaleXaxis(factor);
		this.thruGraph.scaleXaxis(factor);
	}
	shiftXaxis2() {
		this.flowGraph.shiftXaxis2();
		this.thruGraph.shiftXaxis2();
	}
}

// ****** the animation itself
const needRestart = ['max', 'init'];

class MatchesGame extends OmConcept {
	constructor(usrInputs) {
		super('mat');
		this.usrInputs = usrInputs;
		this.keyNames = ['max', 'init', 'speed', 'action', 'reset',
						 'leg0', 'leg1', 'leg2', 'desc'];
		this.keyIndex = computeKeyIndex(this.keyNames);
		this.tioxTimeConv = tioxTimeConv;
		this.die = new DieRV();
		document.getElementById('markButtonmat')
			.addEventListener('click', () => theSimulation.supply.mark());
	}
	localReset() {
		const {max, init} = queueSizes();
		for (let q of theSimulation.queues) {
			q.setMaxSeats(max);
			for (let j = 0; j < init; j++) q.place(new Match(0, 0));
		}
		theSimulation.supply.front();
		theSimulation.stations[0].knockFromPrevious();
		this.redrawBackground();
		this.clearRedrawStage(0, true);
	}
	restartWithNewSizes() {
		this.partialReset();
		this.localReset();
		this.graph.updateForParamChange();
	}
	localUpdateFromSliders(...inpsChanged) {
		for (let inp of inpsChanged) localUpdate(inp);
		if (match(inpsChanged, needRestart)) this.restartWithNewSizes();
	}
	clearStageForeground() {
		this.stage.foreground.clear();
	}
	redoStagesGraph() {
		this.stage.foreground.reset();
		this.stage.background.reset();
		this.graph.flowGraph.chart.reset();
		this.graph.thruGraph.chart.reset();
		this.redrawBackground();
		this.graph.setupThenRedraw();
		this.clearRedrawStage(0, true);
	}
	// the supply column and, in light grey, the space each queue may use
	redrawBackground() {
		const ctx = anim.stage.backContext;
		ctx.clearRect(0, 0, anim.stage.width, anim.stage.height);
		const p = anim.box.pitch;
		const {max} = queueSizes();
		ctx.strokeStyle = 'lightgrey';
		ctx.lineWidth = 2;
		for (let x of anim.queueX)
			ctx.strokeRect(x - p / 2, anim.baseY + p / 2 - max * p, p, max * p);
		for (let st of theSimulation.stations) st.draw();
	}
}

document.getElementById('mat')
	.addEventListener('localUpdate', localUpdateFromUser);
function localUpdateFromUser(event) {
	const inp = mat.usrInputs.get(event.detail.key);
	mat.setOrReleaseCurrentLi(inp);
	localUpdate(inp);
	if (match([inp], needRestart)) mat.restartWithNewSizes();
}

function localUpdate(inp) {
	switch (inp.key) {
		case 'max':
		case 'init':
		case 'action':
		case 'reset':
			break;
		case 'speed':
			mat.adjustSpeed(inp.getIndex());
			break;
		case 'leg0':
		case 'leg1':
		case 'leg2':
			mat.graph.setupThenRedraw();
			break;
		default:
			console.log('Matches Game: unknown input', inp.key);
			break;
	}
}

function defineParams() {
	const usrInputs = new Map();
	usrInputs.set('max', new NumSlider('max', 1, maxQueue, 1, 10));
	usrInputs.set('init', new NumSlider('init', 0, maxQueue, 1, 0));
	usrInputs.set('reset', new Checkbox('reset', false));
	usrInputs.set('action', new RadioButtons('action',
		['none', 'play', 'pause'], 'none', 'actionmat'));
	usrInputs.set('speed', new ArbSlider('speed', [1, 2, 5, 10, 25, 1000], 1));
	usrInputs.set('desc', new Description('desc'));
	usrInputs.set('leg0', new LegendButton('leg0', true));
	usrInputs.set('leg1', new LegendButton('leg1', true));
	usrInputs.set('leg2', new LegendButton('leg2', true));
	return usrInputs;
}

function matHTML(usrInputs) {
	addDiv('mat', 'mat', 'whole');
	addDiv('mat', 'leftHandSideBoxmat', 'tallStageWrapper', 'twoChartWrapper');

	// grey cover over the stage at speed ∞
	const cover = document.createElement('div');
	cover.id = 'coverAnimationmat';
	cover.className = 'coverAnimation';
	document.getElementById('tallStageWrappermat').append(cover);

	const elem = document.getElementById('slidersWrappermat');
	elem.append(usrInputs.get('max').create('Maximum Queue Size = ',
		[1, 5, 10, 15, 20]));
	elem.append(usrInputs.get('init').create('Initial Queue Size = ',
		[0, 5, 10, 15, 20]));

	const mark = document.getElementById('markButton').cloneNode(true);
	addKeyForIds('mat', mark);
	mark.setAttribute('title', 'Mark the next item');
	elem.append(mark);
	const empty = document.createElement('div');
	empty.className = 'sliderBox';
	elem.append(empty);

	elem.append(genPlayResetBox('mat', usrInputs));
	elem.append(usrInputs.get('speed')
		.create('Speed = ', ['1x', '2x', '5x', '10x', '25x', '∞'],
			['slow', ' ', ' ', ' ', 'fast', '∞']));

	document.getElementById('scenariosMidmat').style = 'min-height: 12vw';
}

export function matStart() {
	const usrInputs = defineParams();
	matHTML(usrInputs);
	mat = new MatchesGame(usrInputs);
	document.getElementById('mat').omConcept = mat;
	anim.stage.foreground = new StageOnCanvas('foregroundmat',
		anim.stage.width, anim.stage.height);
	anim.stage.background = new StageOnCanvas('backgroundmat',
		anim.stage.width, anim.stage.height);
	anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	mat.stage = anim.stage;
	mat.graph = new MatGraph();
	mat.setupScenarios();
	theSimulation.initialize();
	mat.reset();
	return mat;
}
