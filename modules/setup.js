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

//export function testfunc(){
//	return 12};

export function animSetup(){
	anim.stage = { 
	normalSpeed: .10, //.10 pixels per millisecond
	width: 1000,
	height: 300
	};
	anim.person =  {
			width: 40,
			height: 60
	};

	anim.box = {space: 20, size: 16, perRow: 10};
	anim.store = {
			left: 400,
			top: 80,
			stroke: 1,
			width: anim.box.space * anim.box.perRow,
	};
	anim.store.height = anim.store.width;
	anim.store.right = anim.store.left + anim.store.width;
	anim.store.bot = anim.store.top + anim.store.width;

	anim.person.path = {
		left: -100,
		right: anim.store.left - 20,
		top: anim.store.top,
		bot: anim.store.top + anim.box.space * 7,
		mid: anim.store.top + anim.box.space * 3.5,
	};
	anim.truck = {
		height: anim.box.space *5,
		
		bedWidth: anim.box.perRow * anim.box.space,
		
		path:{
			left: anim.store.right,
			right: 1000,
			top: anim.store.top - 2 * anim.box.space,
			bot: anim.store.bot - 5 * anim.box.space,
		}
	};
	anim.truck.cabWidth = anim.truck.height/2;
	anim.truck.width = anim.truck.bedWidth + anim.truck.cabWidth;


};