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

// Deming's Funnel Experiment.  A funnel over a row of 41 columns (0 to 40,
// target 20) drops balls; each ball lands near the funnel, at a random
// offset (50 coin flips, each half a column left or right, so the standard
// deviation is about 3.5 columns).  Columns 18-22 are good parts.
// A ball falls straight down; behind the white board it moves to the column
// where it lands.  A round drops 'ppr' balls and then stops; Play starts the
// next round, first copying the finished columns into the history below the
// stage.  Picking a rule from the menu also stops, and waits for Play.
// Modes: Manual (once the last ball has landed, a ball waits, unseen, at a
// random place in the green release; slide the release slowly until that
// place is over the spout and it drops),
// Adjustable (also move the funnel with the left/right arrow keys),
// and Deming's Rules 1-4, which drop the balls and move the funnel
// automatically.  With s the funnel position for the last ball and
// L where it landed (error L - 20), the funnel moves to
//   Rule 1: s (never adjust)     Rule 2: s - (L - 20)
//   Rule 3: 20 - (L - 20)        Rule 4: L
// always kept between 0 and 40.  Each round of a rule starts with the
// funnel over 20 and drops its first ball before any adjustment.

import {
	cbColors, StageOnCanvas, computeKeyIndex
}
from "../mod/util.js";
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	TioxGraph, GraphLine
}
from "../mod/graph.js";
import {
	ArbParam, Description, NumSlider, ArbSlider, Checkbox, RadioButtons,
	addDiv, genPlayResetBox
}
from '../mod/params.js';

const tioxTimeConv = 1000;   // not used for graphing: the graph is by round
const nCols = 41, target = 20, goodLo = 18, goodHi = 22;
const maxPerRound = 10;

let fex;

// ****** stage layout (canvas 600 x 390)
const anim = {
	stage: {width: 600, height: 390},
	col: {x0: 12, pitch: 12, width: 10, top: 220, bottom: 330},
	ball: {d: 9, pitch: 10.5},
	funnel: {top: 6, bot: 54, topHalf: 40, botHalf: 9, spoutBot: 96},
	// the release: it slides up to maxDx either way; its ball drops when
	// within tol of the spout's center while moving under maxSpeed
	slider: {w: 60, h: 16, y: 56, maxDx: 30, tol: 1,
			 maxSpeed: 0.05},      // pixels per ms of real time
	board: {top: 100, bot: 200, mid: 150},
	labelY: 334,
	countY: 372,
	history: {top: 206},     // part of the stage copied into the history
	fallSpeed: 0.15,         // pixels per ms
	pause: 600               // ms before a rule moves the funnel, and again
	                         //  before it drops the next ball
};
function colX(c) {
	return anim.col.x0 + anim.col.pitch * c + anim.col.pitch / 2;
}
function stackY(k) {
	return anim.col.bottom - anim.ball.d / 2 - 1 - k * anim.ball.pitch;
}
function isGood(c) {
	return goodLo <= c && c <= goodHi;
}
function colColor(c) {
	return isGood(c) ? cbColors.blue : cbColors.red;
}
function clampCol(c) {
	return Math.max(0, Math.min(nCols - 1, c));
}
function isRule(mode) {
	return mode.startsWith('rule');
}
// 50 coin flips, each half a column: Binomial(50, 1/2) - 25
function dropOffset() {
	let heads = 0;
	for (let i = 0; i < 50; i++)
		if (Math.random() < 0.5) heads++;
	return heads - 25;
}
function newRule(mode, start, landed) {
	const error = landed - target;
	switch (mode) {
		case 'rule1': return start;
		case 'rule2': return clampCol(start - error);
		case 'rule3': return clampCol(target - error);
		case 'rule4': return landed;
	}
	return start;
}

// ****** drawing the columns (used for the stage and for the history)
function drawColumns(ctx) {
	const c = anim.col;
	ctx.lineWidth = 1.5;
	for (let k = 0; k < nCols; k++) {
		const left = c.x0 + c.pitch * k + (c.pitch - c.width) / 2;
		ctx.strokeStyle = colColor(k);
		ctx.beginPath();
		ctx.moveTo(left, c.top);
		ctx.lineTo(left, c.bottom);
		ctx.lineTo(left + c.width, c.bottom);
		ctx.lineTo(left + c.width, c.top);
		ctx.stroke();
	}
	ctx.fillStyle = 'black';
	ctx.font = '11px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	for (let k = 0; k < nCols; k += 2)
		ctx.fillText(k, colX(k), anim.labelY);
}
function drawBoard(ctx) {
	const b = anim.board;
	const right = anim.col.x0 + anim.col.pitch * nCols;
	ctx.fillStyle = 'white';
	ctx.strokeStyle = 'black';
	ctx.lineWidth = 1;
	ctx.fillRect(anim.col.x0, b.top, right - anim.col.x0, b.bot - b.top);
	ctx.strokeRect(anim.col.x0, b.top, right - anim.col.x0, b.bot - b.top);
}
function drawBall(ctx, x, y, color) {
	ctx.beginPath();
	ctx.arc(x, y, anim.ball.d / 2, 0, 2 * Math.PI);
	ctx.fillStyle = color;
	ctx.fill();
}
function drawCounts(ctx, good, total) {
	ctx.font = '16px Arial';
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'center';
	ctx.fillStyle = cbColors.blue;
	ctx.fillText('Good: ' + good, colX(target), anim.countY);
	ctx.fillStyle = 'black';
	ctx.fillText('Total: ' + total, colX(36), anim.countY);
}

// ****** one round's balls
class Tray {
	constructor() {
		this.balls = [];                     // released, in order
		this.counts = new Array(nCols).fill(0);  // balls headed to each column
		this.landed = 0;
		this.good = 0;
	}
}

// ****** the graph: good parts in each round, by round
class FexGraph {
	constructor() {
		this.chart = new TioxGraph(fex, 'chartCanvasfex', 22,
			{width: 10, step: 2}, d => d.r, 500, 760, false);
		this.chart.fixYaxis(10, 2);
		new GraphLine(this.chart, d => d.g,
			{color: cbColors.blue, vertical: false,
			 visible: {getBool: () => true}, continuous: false,
			 lineWidth: 3, dotSize: 6, right: false});
	}
	get xInfo() {
		return this.chart.xInfo;
	}
	reset() {
		this.chart.reset();
	}
	setupThenRedraw() {
		this.chart.setupThenRedraw();
	}
	scaleXaxis() {}     // the x-axis is rounds, so speed does not change it
	push(round, good) {
		this.chart.drawOnePoint({r: round, g: good});
	}
}

// ****** the animation itself
class FunnelExperiment extends OmConcept {
	constructor(usrInputs) {
		super('fex');
		this.usrInputs = usrInputs;
		this.keyNames = ['mode', 'ppr', 'speed', 'action', 'reset', 'desc'];
		this.keyIndex = computeKeyIndex(this.keyNames);
		this.tioxTimeConv = tioxTimeConv;
		this.sliderDx = 0;
		this.drag = null;
		this.waiting = null;     // the ball in the release
		this.sliderSpeed = 0;
		this.lastMoveT = 0;
		this.history = document.getElementById('historyfex');
		const canv = document.getElementById('foregroundfex');
		canv.addEventListener('pointerdown', this.pointerDown.bind(this));
		canv.addEventListener('pointermove', this.pointerMove.bind(this));
		canv.addEventListener('pointerup', this.pointerUp.bind(this));
		canv.addEventListener('pointercancel', this.pointerUp.bind(this));
	}
	mode() {
		return this.usrInputs.get('mode').get();
	}
	ppr() {
		return this.usrInputs.get('ppr').getNumber();
	}
	localReset() {
		this.funnelCol = target;
		this.tray = new Tray();
		this.round = 1;
		this.roundDone = false;
		this.lastDrop = null;
		this.waiting = null;
		this.sliderDx = 0;
		this.history.innerHTML = '';
		this.redrawBackground();
		this.drawForeground();
	}
	localUpdateFromSliders(...inpsChanged) {
		for (let inp of inpsChanged) localUpdate(inp);
	}

	// ****** play starts a new round once the last one is done
	play() {
		if (this.isRunning) return;
		if (this.roundDone) this.newRound();
		super.play();
		this.startRuleIfNeeded();
	}
	newRound() {
		this.copyToHistory();
		this.heap.reset();    // nothing left over from the last round
		this.tray = new Tray();
		this.waiting = null;
		this.round++;
		this.roundDone = false;
		this.drawForeground();
	}
	endRound() {
		this.roundDone = true;
		this.graph.push(this.round, this.tray.good);
		this.pause();
		this.drawForeground();
	}
	roundComplete() {
		const t = this.tray;
		return t.landed > 0 && t.landed >= this.ppr()
			&& t.landed == t.balls.length;
	}

	// ****** dropping balls
	release(y0 = anim.funnel.spoutBot - anim.ball.d / 2) {
		const start = this.funnelCol;
		const col = clampCol(start + dropOffset());
		const slot = this.tray.counts[col]++;
		// it falls straight down at one speed; behind the white board
		// it moves over to its column
		const ball = {start, col, slot, y0, t0: this.now};
		ball.t3 = ball.t0 + (stackY(slot) - y0) / anim.fallSpeed;
		this.tray.balls.push(ball);
		this.heap.push({time: ball.t3, type: 'land',
						proc: this.land.bind(this), item: ball});
	}
	land(ball) {
		const t = this.tray;
		if (!t.balls.includes(ball)) return;
		t.landed++;
		if (isGood(ball.col)) t.good++;
		this.lastDrop = {start: ball.start, col: ball.col};
		if (this.roundComplete()) this.endRound();
		else if (isRule(this.mode()) && t.balls.length < this.ppr())
			this.adjustThenRelease();
	}
	// a rule: wait, move the funnel, wait, drop the next ball
	adjustThenRelease() {
		this.heap.push({time: this.now + anim.pause, type: 'adjust',
			proc: () => {
				if (!isRule(this.mode())) return;
				if (this.lastDrop) this.funnelCol = newRule(this.mode(),
					this.lastDrop.start, this.lastDrop.col);
				this.heap.push({time: this.now + anim.pause, type: 'drop',
					proc: () => {
						if (isRule(this.mode())
							&& this.tray.balls.length < this.ppr())
							this.release();
					}});
			}});
	}
	// a rule starts each round with the funnel over 20 and drops the first
	// ball before any adjustment; in the middle of a round it carries on
	startRuleIfNeeded() {
		if (!isRule(this.mode()) || !this.isRunning || this.roundDone
			|| this.heap.top() || this.tray.balls.length >= this.ppr())
			return;
		if (this.tray.balls.length > 0) {
			this.adjustThenRelease();
			return;
		}
		this.funnelCol = target;
		this.drawForeground();
		this.heap.push({time: this.now, type: 'drop',
						proc: () => this.release()});
	}
	// the user picked a rule: stop, and start its round when Play is pressed
	waitForPlay() {
		this.pause();
		if (this.tray.balls.length == 0) this.heap.reset();
		else if (!this.roundDone) this.roundDone = true;  // an unfinished
		this.drawForeground();      // round goes to history, not the graph
	}
	// a ball goes into the release only after the last one has landed
	canDragRelease() {
		const t = this.tray;
		return !isRule(this.mode()) && this.isRunning && !this.roundDone
			&& t.balls.length < this.ppr() && t.landed == t.balls.length;
	}
	// the left/right arrow keys, in Adjustable mode only
	arrowLeftRight(d) {
		if (this.mode() != 'adjustable') return false;
		this.funnelCol = clampCol(this.funnelCol + d);
		this.drawForeground();
		return true;
	}

	// ****** the release: a ball waits in it, unseen, at a random place
	waitingBall() {
		if (!this.canDragRelease()) {
			this.waiting = null;
			return null;
		}
		if (!this.waiting) {
			const r = anim.ball.d / 2 + 1;
			this.waiting = {offset: r + Math.random() * (anim.slider.w - 2 * r),
							moved: false};
		}
		return this.waiting;
	}
	waitingX() {
		return colX(this.funnelCol) - anim.slider.w / 2 + this.sliderDx
			+ this.waiting.offset;
	}
	// it drops once the release has been moved, if it is over the spout
	// and the release is moving slowly enough (or has stopped)
	tryRelease() {
		const w = this.waitingBall();
		if (!w || !w.moved) return;
		const s = anim.slider;
		const speed = performance.now() - this.lastMoveT > 60 ? 0 : this.sliderSpeed;
		if (speed > s.maxSpeed) return;
		if (Math.abs(this.waitingX() - colX(this.funnelCol)) > s.tol) return;
		this.waiting = null;
		this.release(s.y + s.h / 2);
		// the release goes back to the center, and the user must let go
		// of it and press on it again
		this.sliderDx = 0;
		this.drag = null;
	}
	stagePoint(evt) {
		const r = evt.target.getBoundingClientRect();
		return {x: (evt.clientX - r.left) * anim.stage.width / r.width,
				y: (evt.clientY - r.top) * anim.stage.height / r.height};
	}
	onSlider(p) {
		const s = anim.slider;
		const left = colX(this.funnelCol) - s.w / 2 + this.sliderDx;
		return left <= p.x && p.x <= left + s.w && s.y <= p.y && p.y <= s.y + s.h;
	}
	pointerDown(evt) {
		const p = this.stagePoint(evt);
		if (isRule(this.mode()) || !this.onSlider(p)) return;
		this.drag = {x: p.x, dx0: this.sliderDx, lastT: evt.timeStamp};
		evt.target.setPointerCapture(evt.pointerId);
		evt.preventDefault();
	}
	pointerMove(evt) {
		const p = this.stagePoint(evt);
		if (!this.drag) {
			evt.target.style.cursor =
				(!isRule(this.mode()) && this.onSlider(p)) ? 'ew-resize' : 'default';
			return;
		}
		const max = anim.slider.maxDx;
		const dx = Math.max(-max, Math.min(max, this.drag.dx0 + p.x - this.drag.x));
		const dt = Math.max(1, evt.timeStamp - this.drag.lastT);
		this.sliderSpeed = Math.abs(dx - this.sliderDx) / dt;
		this.lastMoveT = performance.now();
		this.drag.lastT = evt.timeStamp;
		if (dx != this.sliderDx && this.waiting) this.waiting.moved = true;
		this.sliderDx = dx;
		this.tryRelease();
		this.drawForeground();
	}
	pointerUp(evt) {
		this.drag = null;
		this.drawForeground();
	}

	// ****** drawing
	clearStageForeground() {
		this.stage.foreground.clear();
	}
	clearRedrawStage() {
		this.tryRelease();
		this.drawForeground();
	}
	redoStagesGraph() {
		this.stage.foreground.reset();
		this.stage.background.reset();
		this.graph.chart.chart.reset();
		this.redrawBackground();
		this.graph.setupThenRedraw();
		this.drawForeground();
	}
	redrawBackground() {
		const ctx = anim.stage.backContext;
		ctx.clearRect(0, 0, anim.stage.width, anim.stage.height);
		drawColumns(ctx);
	}
	ballPosition(ball) {
		if (this.now >= ball.t3)
			return {x: colX(ball.col), y: stackY(ball.slot), inCol: true};
		const y = ball.y0 + (this.now - ball.t0) * anim.fallSpeed;
		if (y < anim.board.mid) return {x: colX(ball.start), y: y};
		return {x: colX(ball.col), y: y, inCol: y > anim.col.top};
	}
	drawForeground() {
		const ctx = anim.stage.foreContext;
		ctx.clearRect(0, 0, anim.stage.width, anim.stage.height);
		for (let ball of this.tray.balls) {
			const p = this.ballPosition(ball);
			drawBall(ctx, p.x, p.y, p.inCol ? colColor(ball.col) : 'black');
		}
		drawBoard(ctx);   // in front of the balls, which pass behind it
		this.drawFunnel(ctx);
		drawCounts(ctx, this.tray.good, this.tray.landed);
	}
	drawFunnel(ctx) {
		const f = anim.funnel, s = anim.slider;
		const x = colX(this.funnelCol);
		ctx.beginPath();
		ctx.moveTo(x - f.topHalf, f.top);
		ctx.lineTo(x + f.topHalf, f.top);
		ctx.lineTo(x + f.botHalf, f.bot);
		ctx.lineTo(x - f.botHalf, f.bot);
		ctx.closePath();
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		ctx.stroke();
		// the spout
		ctx.beginPath();
		ctx.moveTo(x - 6, f.bot);
		ctx.lineTo(x - 6, f.spoutBot);
		ctx.moveTo(x + 6, f.bot);
		ctx.lineTo(x + 6, f.spoutBot);
		ctx.stroke();
		ctx.fillStyle = 'white';
		ctx.font = '16px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(this.funnelCol, x, (f.top + f.bot) / 2 - 6);
		// the release: green, or grey (and centered) when a rule drops the balls
		const rule = isRule(this.mode());
		const left = x - s.w / 2 + (rule ? 0 : this.sliderDx);
		ctx.fillStyle = rule ? 'lightgrey' : '#54ed77';
		ctx.fillRect(left, s.y, s.w, s.h);
		ctx.strokeStyle = 'darkgreen';
		ctx.strokeRect(left, s.y, s.w, s.h);
	}
	// the finished round goes to the top of the history
	copyToHistory() {
		const h = anim.history.top, w = anim.stage.width;
		const height = anim.stage.height - h;
		const canv = document.createElement('canvas');
		canv.width = 2 * w;
		canv.height = 2 * height;
		canv.className = 'fexHistoryTray';
		const ctx = canv.getContext('2d');
		ctx.scale(2, 2);
		ctx.translate(0, -h);
		drawColumns(ctx);
		for (let ball of this.tray.balls)
			drawBall(ctx, colX(ball.col), stackY(ball.slot), colColor(ball.col));
		drawCounts(ctx, this.tray.good, this.tray.landed);
		ctx.fillStyle = 'black';
		ctx.font = '14px Arial';
		ctx.textAlign = 'left';
		ctx.fillText('Round ' + this.round, colX(1), anim.countY);
		this.history.prepend(canv);
	}
}

// ****** the user's inputs
document.getElementById('fex')
	.addEventListener('localUpdate', localUpdateFromUser);
function localUpdateFromUser(event) {
	const inp = fex.usrInputs.get(event.detail.key);
	fex.setOrReleaseCurrentLi(inp);
	if (inp.key == 'mode' && isRule(inp.get())) fex.waitForPlay();
	else localUpdate(inp);
}

function localUpdate(inp) {
	switch (inp.key) {
		case 'action':
		case 'reset':
			break;
		case 'mode':
			fex.startRuleIfNeeded();
			fex.drawForeground();
			break;
		case 'ppr':
			if (!fex.roundDone && fex.roundComplete()) fex.endRound();
			else fex.startRuleIfNeeded();
			break;
		case 'speed':
			fex.adjustSpeed(inp.getIndex());
			break;
		default:
			console.log('Funnel Experiment: unknown input', inp.key);
			break;
	}
}

// a pull-down menu of choices, kept in scenarios like a set of radio buttons
class SelectMenu extends ArbParam {
	constructor(key, values, labels, deflt) {
		super(key, values, deflt);
		this.labels = labels;
		this.event = new CustomEvent('localUpdate',
			{bubbles: true, detail: {key: key}});
	}
	create(dispText) {
		const sel = document.createElement('select');
		sel.id = this.key;
		sel.className = 'fexSelect';
		this.values.forEach((v, i) => {
			const opt = document.createElement('option');
			opt.value = v;
			opt.append(this.labels[i]);
			sel.append(opt);
		});
		sel.value = this.values[this.index];
		sel.addEventListener('change', this.userChange.bind(this));
		this.input = sel;
		const d = document.createElement('div');
		d.className = 'sliderBox columnAroundCenter';
		d.append(dispText, sel);
		return d;
	}
	get() {
		return this.values[this.index];
	}
	set(str) {
		const index = this.values.findIndex(v => v == str);
		this.input.value = str;
		return super.setIndex(index);
	}
	userChange() {
		super.setIndex(this.values.findIndex(v => v == this.input.value));
		this.input.blur();   // so the arrow keys go to the funnel
		this.input.dispatchEvent(this.event);
	}
}

// a dial the user can turn, showing 0 to 1; it changes nothing
function createDial() {
	const size = 100;
	const canv = document.createElement('canvas');
	canv.width = canv.height = size;
	canv.className = 'fexDial';
	const text = document.createElement('span');
	text.className = 'fexDialValue';
	let value = 0;
	function draw() {
		const ctx = canv.getContext('2d');
		const c = size / 2, r = size / 2 - 4;
		ctx.clearRect(0, 0, size, size);
		ctx.beginPath();
		ctx.arc(c, c, r, 0, 2 * Math.PI);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.lineWidth = 4;
		ctx.strokeStyle = cbColors.blue;
		ctx.stroke();
		const a = 2 * Math.PI * value - Math.PI / 2;
		ctx.beginPath();
		ctx.moveTo(c, c);
		ctx.lineTo(c + r * Math.cos(a), c + r * Math.sin(a));
		ctx.stroke();
		text.innerHTML = value.toFixed(3);
	}
	function turn(evt) {
		const rect = canv.getBoundingClientRect();
		const dx = evt.clientX - rect.left - rect.width / 2;
		const dy = evt.clientY - rect.top - rect.height / 2;
		let a = Math.atan2(dx, -dy) / (2 * Math.PI);   // 0 at the top, clockwise
		value = a < 0 ? a + 1 : a;
		draw();
	}
	let turning = false;
	canv.addEventListener('pointerdown', evt => {
		turning = true;
		canv.setPointerCapture(evt.pointerId);
		turn(evt);
	});
	canv.addEventListener('pointermove', evt => { if (turning) turn(evt); });
	canv.addEventListener('pointerup', () => { turning = false; });
	draw();
	const d = document.createElement('div');
	d.className = 'sliderBox rowAroundCenter fexDialBox';
	d.append(canv, text);
	return d;
}

function defineParams() {
	const usrInputs = new Map();
	usrInputs.set('mode', new SelectMenu('mode',
		['manual', 'adjustable', 'rule1', 'rule2', 'rule3', 'rule4'],
		['Manual', 'Adjustable', 'Rule 1', 'Rule 2', 'Rule 3', 'Rule 4'],
		'manual'));
	usrInputs.set('ppr', new NumSlider('ppr', 1, maxPerRound, 1, maxPerRound));
	usrInputs.set('reset', new Checkbox('reset', false));
	usrInputs.set('action', new RadioButtons('action',
		['none', 'play', 'pause'], 'none', 'actionfex'));
	usrInputs.set('speed', new ArbSlider('speed', [1, 2, 5, 10], 1));
	usrInputs.set('desc', new Description('desc'));
	return usrInputs;
}

function fexHTML(usrInputs) {
	addDiv('fex', 'fex', 'whole');

	// left: the stage over the history; right: the graph
	const lhs = document.getElementById('leftHandSideBoxfex');
	lhs.classList.add('fexLeft');
	const stageCol = document.createElement('div');
	stageCol.className = 'fexStageColumn';
	const stage = document.createElement('div');
	stage.className = 'fexStage';
	for (let name of ['foreground', 'background']) {
		const c = document.createElement('canvas');
		c.className = 'theStage ' + name;
		c.id = name + 'fex';
		c.width = anim.stage.width;
		c.height = anim.stage.height;
		stage.append(c);
	}
	const history = document.createElement('div');
	history.id = 'historyfex';
	history.className = 'fexHistory';
	stageCol.append(stage, history);

	const chartCol = document.createElement('div');
	chartCol.className = 'fexChartColumn';
	const title = document.createElement('div');
	title.className = 'chartTitle center';
	title.append('Good parts per round');
	const chart = document.createElement('div');
	chart.className = 'fexChart';
	const canv = document.createElement('canvas');
	canv.className = 'chartCanvas';
	canv.id = 'chartCanvasfex';
	canv.width = 500;
	canv.height = 760;
	chart.append(canv);
	chartCol.append(title, chart);
	lhs.append(stageCol, chartCol);

	// right hand side: the dial across the top, then two columns
	const elem = document.getElementById('slidersWrapperfex');
	elem.append(createDial());
	const mode = usrInputs.get('mode').create('Mode');
	mode.classList.add('fexLeftBox');
	elem.append(mode);
	const ppr = usrInputs.get('ppr').create('Parts per round = ',
		[1, 4, 7, 10]);
	ppr.classList.add('fexRightBox');
	elem.append(ppr);
	const playReset = genPlayResetBox('fex', usrInputs);
	playReset.classList.add('fexLeftBox');
	elem.append(playReset);
	const speed = usrInputs.get('speed')
		.create('Speed = ', ['1x', '2x', '5x', '10x'],
			['slow', ' ', ' ', 'fast']);
	speed.classList.add('fexRightBox');
	elem.append(speed);

	document.getElementById('scenariosMidfex').style = 'min-height: 12vw';
}

export function fexStart() {
	const usrInputs = defineParams();
	fexHTML(usrInputs);
	fex = new FunnelExperiment(usrInputs);
	document.getElementById('fex').omConcept = fex;
	anim.stage.foreground = new StageOnCanvas('foregroundfex',
		anim.stage.width, anim.stage.height);
	anim.stage.background = new StageOnCanvas('backgroundfex',
		anim.stage.width, anim.stage.height);
	anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	fex.stage = anim.stage;
	fex.graph = new FexGraph();
	fex.tray = new Tray();
	fex.funnelCol = target;
	fex.setupScenarios();
	fex.reset();
	return fex;
}
