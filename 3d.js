var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

let xc = 600;
let yc = 400;

let sin = Math.sin;
let cos = Math.cos;

let default_params = {strokeStyle: 'black', lineWidth: 1};

function draw_coord(m) {
	ctx.font = "15px Arial";
	let p = m.point;
	let coord = "(" + Math.round(p.x) + "," + Math.round(p.y) + "," + Math.round(p.z) + ")";
	ctx.fillText(coord, m.x+xc, -m.y+yc-10);
}

function draw_line(a,b, params) {
    Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);
    ctx.beginPath();

    let x1 = a.x + xc, x2 = b.x + xc;
    let y1 = -a.y + yc, y2 = -b.y + yc;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);

	//draw_coord(l.a); draw_coord(l.b);
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
		draw_line(a,b);
	}
}

function view_from_top(lines) {
	for (let L of lines) {
		let a = {x: L.a.x, y: L.a.y};
		let b = {x: L.b.x, y: L.b.y};
		draw_line(a,b);
	}
}

function move(figure, v) {
	for (let L of figure) {
		L.a = add(L.a, v);
		L.b = add(L.b, v);
	}
}

function move_surface(surface, v) {
	for (let i=0; i < surface.points.length; i++) {
		surface.points[i] = add(surface.points[i], v);
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

function intersection(a,b,c,d) {
	
}

function rotate_figure(figure, angle) {
	for (let s of figure) {
		for (let i=0; i < s.points.length; i++) {
			s.points[i] = rotate_around_Z(s.points[i], angle);
		}
		s.n = rotate_around_Z(s.n, angle);
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

function cross(a,b) {
	return P(a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x);
}

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

function find_angle(a,b) {
	return Math.acos( dot(a,b) / len(a) / len(b) );
}

let screen_distance = 1;

function get_camera_vars(camera) {
	if (camera.pos == camera.prev.pos
	 && camera.yaw == camera.prev.yaw
	 && camera.pitch == camera.prev.pitch 
	 && camera.roll == camera.prev.roll ) return camera.prev;

	let a = camera.yaw;
	let th = camera.pitch;
	let ph = camera.roll;
	let p0 = camera.pos;

	let n = P( cos(a)*cos(th), sin(a)*cos(th), sin(th) );

	let D = -dot(n,p0);

	let ex = rotate_around_Z( rotate_around_Y( rotate_around_X( P(0,1,0), ph), th), a );
	let ey = rotate_around_Z( rotate_around_Y( rotate_around_X( P(0,0,1), ph), th), a );

	camera.prev = {n,D,ex,ey, yaw: camera.yaw, pitch: camera.pitch, roll: camera.roll, pos: camera.pos};
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

	//if (point.x == -30 && point.y == -30 && point.z == 0 && d < 2) console.log({x: cx, y: cy, t, d} );
	return {x: cx, y: cy, t, d, point};
}

function draw_surface(surface, params) {
	let {n,pos} = get_camera_vars(camera);
	let shoot = subtract(surface.points[0], pos);
	if (find_angle(surface.n, shoot) < Math.PI/2 ) return;

	Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);

    let f = project_point(surface.points[0], camera);
    ctx.moveTo(f.x, f.y);
    ctx.beginPath();

	for (let p of surface.points) {
		p = project_point(p, camera);
		ctx.lineTo(p.x + xc, -p.y + yc);
	}
	ctx.lineTo(f.x + xc, -f.y + yc);
	ctx.fillStyle = "#d9c3e0";
	ctx.fill(); 

	ctx.stroke();

	draw_normal(surface);
}

function draw_normal(surface) {
	let sum = P(0,0,0);
	for (let p of surface.points) sum = add(sum, p);
	let center = scale(1/surface.points.length, sum);

	let lines = [];
	let b = add(center, scale(5,surface.n));
	lines[0] = {a: center, b };

	for (let line of lines) {
		draw_line( project_point(line.a, camera), project_point(line.b, camera) , {strokeStyle: 'green'});
	}
}

function make_prism(surface, h) {
	let res = [surface];

	let opp = copy(surface);
	move_surface(opp, scale(-h, surface.n) );
	opp.n = scale(-1, surface.n);
	res.push(opp);

	for (let i=0; i < surface.points.length; i++) {
		let next = (i+1)%surface.points.length;
		let points = [surface.points[i], surface.points[next], opp.points[next], opp.points[i]  ];
		let vf = subtract(points[1], points[0]);
		let vl = subtract(points[points.length-1], points[0]);
		let M = {
			points,
			n: normalize(cross(vf,vl)),
		};
		res.push(M);
	}

	console.log(res);
	return res;
}

let s = 50;

function draw_3d(figure, params) {
	for (let surface of figure) {
		draw_surface(surface, params);
	}
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

		draw_line(a,b, params);
	}
}

let square = {
	points: [ P(0,0,0), P(0,s,0), P(0,s,s), P(0,0,s) ],
	n: P(-1,0,0),
};

let cube = make_prism(square, s);

let triangle = {
	points: [ P(0,0,0), P(0,s,0), P(0,s/2,s) ],
	n: P(-1,0,0),
}

let roof = make_prism(triangle, s/3);

let grid = [];
let size = 30;

for (let i = -size; i <= size; i+=5) {
	grid.push(
		{a: P(i,-size,0), b: P(i,size,0) },
		{a: P(-size,i,0), b: P(size,i,0) }
	);
}

freq = 1;

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

	if (holding.z) camera.roll += 0.02;
	if (holding.c) camera.roll -= 0.02;

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
	// Movements
	rotate_figure(cube, 0.02);
}, freq);

setInterval(function(){
	clear_canvas();
	//move(cube, P(0,0,1) );
	draw_real_3d(grid, {strokeStyle: 'grey'} );
	//draw_real_3d(house,  {strokeStyle: 'purple', lineWidth: 5} );
	//view_from_top(cube);
	//draw_3d(roof);
	draw_3d(cube);
}, freq);

//view_from_top(cube);