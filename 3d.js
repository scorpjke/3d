var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

let xc = 600;
let yc = 400;

let sin = Math.sin;
let cos = Math.cos;

let default_params = {strokeStyle: 'black', lineWidth: 1};

function draw_line(l, params) {
    Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);
    ctx.beginPath();
	ctx.moveTo(l.a.x + xc, -l.a.y + yc);
	ctx.lineTo(l.b.x + xc, -l.b.y + yc);
	ctx.stroke();
}

function L(a,b) {
	return {a,b};
}

function copy(o) {
	return JSON.parse(JSON.stringify(o));
}

function stretch_along_X(figure, width) {
	let new_figure = [];
	for (let line of figure) {
		let corr_line = copy(line);
		corr_line.a.x += width;
		corr_line.b.x += width;

		new_figure.push(line, corr_line, L(line.a, corr_line.a), L(line.b, corr_line.b));
	}

	return new_figure;
}

function make_pyramid(base, peak) {
	let pyramid = [];
	for (let line of base) {
		pyramid.push(line, L(line.a, peak), L(line.b, peak) );
	}

	return pyramid;
}

function view_from_front(lines) {
	for (let L of lines) {
		let a = {x: L.a.y, y: L.a.z};
		let b = {x: L.b.y, y: L.b.z};
		draw_line({a,b});
	}
}

function view_from_top(lines) {
	for (let L of lines) {
		let a = {x: L.a.x, y: L.a.y};
		let b = {x: L.b.x, y: L.b.y};
		draw_line({a,b});
	}
}

function move(figure, v) {
	for (let L of figure) {
		L.a = add(L.a, v);
		L.b = add(L.b, v);
	}
}

function rotate_around_X(p, a) {
	return {
		x: p.x,
		y: cos(a)*p.y - sin(a)*p.z,
		z: sin(a)*p.y + cos(a)*p.z,
	};
}

function rotate_around_Y(p, a) {
	return {
		x: cos(a)*p.x - sin(a)*p.z,
		y: p.y,
		z: sin(a)*p.x + cos(a)*p.z,
	};
}

function rotate_around_Z(p, a) {
	return {
		x: cos(a)*p.x - sin(a)*p.y,
		y: sin(a)*p.x + cos(a)*p.y,
		z: p.z
	};
}

function rotate_2D(p, a) {
	return {
		x: cos(a)*p.x - sin(a)*p.y,
		y: sin(a)*p.x + cos(a)*p.y,
	};
}

function rotate_figure(figure, angle) {
	for (let line of figure) {
		line.a = rotate_around_Z(line.a, angle);
		line.b = rotate_around_Z(line.b, angle);
		//line.a = rotate_around_X(line.a, angle);
		//line.b = rotate_around_X(line.b, angle);
	}
}

function P(x,y,z) {
	return {x,y,z};
}

let camera = {
	pos: P(-100,0,25),
	yaw: 0,
	pitch: 0,
	roll: 0,
	prev: {},
};

function dot(a,b) {
	return a.x*b.x + a.y*b.y + a.z*b.z;
}

function add(a,b) {
	return P(a.x+b.x, a.y+b.y, a.z+b.z);
}

function subtract(a,b) {
	return P(a.x-b.x, a.y-b.y, a.z-b.z);
}

function scale(n, v) {
	return P(v.x*n, v.y*n, v.z*n);
}

function len(v) {
	return Math.sqrt(dot(v,v));
}

function normalize(v) {
	return scale(1/len(v), v);
}

let screen_distance = 1;

function get_camera_vars(camera) {
	if (camera.pos == camera.prev.pos
	 && camera.yaw == camera.prev.yaw
	 && camera.pitch == camera.prev.pitch 
	 && camera.roll == camera.prev.roll ) return camera.prev;

	let a = camera.yaw;
	let th = camera.pitch;
	let p0 = camera.pos;

	let n = P( cos(a)*cos(th), sin(a)*cos(th), sin(th) );

	let D = -dot(n,p0);

	let ex = rotate_around_Z( rotate_around_Y( P(0,1,0), th), a );
	let ey = rotate_around_Z( rotate_around_Y( P(0,0,1), th), a );

	camera.prev = {n,D,ex,ey};
	return camera.prev;
}

function project_point(point, camera) {
	let {n,D,ex,ey} = get_camera_vars(camera);

	let t = - (dot(n,point) + D) / dot(n,n);

	let p = add(point, scale(t,n) );

	let d = len(subtract(point, p));

	let b = scale(900/d, subtract(p, camera.pos));
	let cx = dot(ex, b);
	let cy = dot(ey, b);

	return {x: cx, y: cy, t, d};
}

function draw_real_3d(figure, params) {
	for (let L of figure) {
		let a = project_point(L.a, camera);
		let b = project_point(L.b, camera);
		
		if (a.t > 0 && b.t > 0) return;
		/*
		if (a.t > 0 || b.t > 0) {
			a.z = 0; b.z = 0;
			let front, behind;

			if (a.t > 0) {
				behind = a;
				front = b;
			}
			else {
				behind = b;
				front = a;
			}

			let c = subtract(behind,front);
			let k = front.d / (front.d + behind.d);
			//console.log({front, behind, c});

			a = front;
			b = add(front, scale(k,c) );
		}
		*/

		draw_line({a,b}, params);
	}
}


let s = 50;

let square = [
	L( P(0,0,0), P(0,s,0) ),
	L( P(0,0,s), P(0,s,s) ),
	L( P(0,0,0), P(0,0,s) ),
	L( P(0,s,0), P(0,s,s) )
];

let pyramid_base = [
	L( P(0,0,0), P(0,s,0) ),
	L( P(s,0,0), P(s,s,0) ),
	L( P(0,0,0), P(s,0,0) ),
	L( P(0,s,0), P(s,s,0) )
];

let triangle = [
	L( P(0,0,0), P(0,s,0) ),
	L( P(0,s,0), P(0,s/2,s) ),
	L( P(0,s/2,s), P(0,0,0) )
];

let cube = stretch_along_X(square, s);
let roof = stretch_along_X(triangle, s/3);
//move(roof, P(0,15,0) );
let pyramid = make_pyramid(pyramid_base, P(s/2,s/2,s) );

let grid = [];
let size = 30;

for (let i = -size; i <= size; i+=5) {
	grid.push(
		{a: P(i,-size,0), b: P(i,size,0) },
		{a: P(-size,i,0), b: P(size,i,0) }
	);
}

freq = 20;

function clear_canvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
}

let k = 1;

function camera_animation() {
	setInterval(function(){
		clear_canvas();
		if (camera.pos.x > -2) k = -1;
		else if (camera.pos.x < -5) k = 1;

		camera.pos.x += k*freq/100;
	}, freq);
}

let holding = {};

document.addEventListener('keydown', function(e){
	holding[e.key] = true;
});

document.addEventListener('keyup', function(e){
	delete holding[e.key];
});

setInterval(function(){
	let {n,ex,ey} = get_camera_vars(camera);
	let step = 1;

	let v = P(0,0,0);

	if (holding.a) v = subtract(v, ex);
	if (holding.d) v = add(v, ex);
	if (holding.w) v = add(v, n);
	if (holding.s) v = subtract(v, n);
	if (holding.e) v.z += 1;
	if (holding.q) v.z -= 1;

	if (len(v) > 0) camera.pos = add(camera.pos, normalize(v));
}, 10);


document.addEventListener('mousemove', e => {
	camera.pitch -= e.movementY/200;
	camera.yaw += e.movementX/200;
	if (camera.pitch > 1.57) camera.pitch = 1.57;
	else if (camera.pitch < -1.57) camera.pitch = -1.57;

	if (camera.yaw > 2*Math.PI) camera.yaw -= 2*Math.PI;
	else if (camera.yaw < 0) camera.yaw += 2*Math.PI;
});


setInterval(function(){
	clear_canvas();

	rotate_figure(pyramid, freq/1000);
	//draw_real_3d(cube);
	draw_real_3d(grid, {strokeStyle: 'grey'} );
	draw_real_3d(pyramid,  {strokeStyle: 'red', lineWidth: 3} );
	//view_from_front(cube);
	//view_from_front(grid);
}, freq);

//view_from_top(cube);