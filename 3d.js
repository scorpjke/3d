var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

let xc = 600;
let yc = 400;

let sin = Math.sin;
let cos = Math.cos;

let default_params = {strokeStyle: 'black', lineWidth: 1, fillStyle: 'white'};

function draw_coord(m) {
	ctx.font = "15px Arial";
	let p = m.point;
	let coord = "(" + Math.round(p.x) + "," + Math.round(p.y) + "," + Math.round(p.z) + ")";
	ctx.fillText(coord, m.x+xc, -m.y+yc-10);
}

function draw_line(a,b, params) {
	a = project_point(a);
	b = project_point(b);

    Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);
    ctx.beginPath();

	ctx.moveTo(a.x + xc, -a.y + yc);
	ctx.lineTo(b.x + xc, -b.y + yc);

	//draw_coord(l.a); draw_coord(l.b);

	ctx.stroke();

	if (params.circle_at_the_tip) {
	    ctx.beginPath();
	    ctx.arc(b.x + xc, -b.y + yc, 5, 0, 2 * Math.PI);
	    ctx.fillStyle = 'red';
	    ctx.strokeStyle = 'red';
	    ctx.fill()
	    ctx.stroke();
	}
}

function L(a,b) {
	return {a,b};
}

function copy(o) {
	return JSON.parse(JSON.stringify(o));
}

function move(figure, v) {
	for (let s of figure) {
		for (let i=0; i < s.points.length; i++) {
			s.points[i] = add(s.points[i], v);
		}
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

function rotate_figure(figure, angle) {
	for (let s of figure) {
		for (let i=0; i < s.points.length; i++) {
			s.points[i] = rotate_around_Z(s.points[i], angle);
		}
		s.n = rotate_around_Z(s.n, angle);
	}
}

let P = (x,y,z) => ({x,y,z});
let cross = (a,b) => P(a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x);
let dot = (a,b) => a.x*b.x + a.y*b.y + a.z*b.z;
let add = (a,b) => P(a.x+b.x, a.y+b.y, a.z+b.z);
let subtract = (a,b) => P(a.x-b.x, a.y-b.y, a.z-b.z);
let scale = (n, v) => P(v.x*n, v.y*n, v.z*n);
let len = (v) => Math.sqrt(dot(v,v));
let normalize = (v) => scale(1/len(v), v);
let find_angle = (a,b) => Math.acos( dot(a,b) / (len(a) * len(b)) );
let equal = (a,b) => a.x == b.x && a.y == b.y && a.z == b.z;

let screen_distance = 1;

let camera = {
	pos: P(-100,0,25),
	yaw: 0,
	pitch: 0,
	roll: 0,
	prev: {},
};

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

function project_point(point) {
	if (equal(point,camera.pos) ) return {x:0, y:0};
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

function from_2d_coord_to_ray(cx, cy) {
	let {n,D,ex,ey} = get_camera_vars(camera);

	let b = P(ex.x*cx + ey.x*cy, ex.y*cx + ey.y*cy, ex.z*cx + ey.z*cy);

	return add( scale(1/900,b), n);
}

function intersection_between_line_and_plane(p, v, n, D) {
	let t = -(dot(n,p) + D) / dot(n,v);
	return add(p, scale(t,v) );
}

function point_is_on_surface(point, surface) {
	//console.log("checking surface:", surface);
	let n = cross(subtract(surface.points[1], surface.points[0]), subtract(surface.points[2], surface.points[1]) );

	for (let i=0; i < surface.points.length; i++) {
		let next = (i+1)%surface.points.length;
		let c = cross(subtract(point, surface.points[i]), subtract(surface.points[next], point) );
		//console.log(dot(c, n));
		if (dot(c, n) > 0) return false;
	}
	//console.log("yes, point is on surface!");
	return true;
}

function raycast(r) {
	let {n,pos} = get_camera_vars(camera);
	let closest_surface;
	let closest_distance = 1000000000;
	let intersection;

	for (let figure of world) {
		for (let surface of figure) {
			let n = surface.n;
			if (dot(n, r) > 0) continue;

			let D = -dot(surface.n, surface.points[0]);
			let t = -(dot(n,pos) + D) / dot(n,r);

			if (t < 0) continue;
			let path = scale(t,r);
			let i = add(pos, path);

			if (!point_is_on_surface(i, surface)) continue;

			let d = len(path);
			if (d < closest_distance) {
				closest_surface = surface;
				closest_distance = d;
				intersection = i;
			}
		}
	}

	//console.log(closest_surface, closest_distance);
	return closest_surface ? {point: intersection, surface: closest_surface} : null;
}

function draw_surface(surface, params) {
	let {n,pos} = get_camera_vars(camera);
	let shoot = subtract(surface.points[0], pos);
	if (dot(surface.n, shoot) > 0 ) return;

	Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);

    let f = project_point(surface.points[0]);
    ctx.moveTo(f.x, f.y);
    ctx.beginPath();

	for (let p of surface.points) {
		p = project_point(p);
		ctx.lineTo(p.x + xc, -p.y + yc);
	}
	ctx.lineTo(f.x + xc, -f.y + yc);
	ctx.fill(); 

	ctx.stroke();

	draw_normal(surface);
}

function middle_point(surface) {
	let sum = P(0,0,0);
	for (let p of surface.points) sum = add(sum, p);
	let center = scale(1/surface.points.length, sum);
	return center;
}

function draw_normal(surface) {
	let center = middle_point(surface);

	let lines = [];
	let b = add(center, scale(5,surface.n));
	lines[0] = {a: center, b };

	for (let line of lines) {
		draw_line( line.a, line.b , {strokeStyle: 'green'});
	}
}

function make_prism(surface, h) {
	let res = [copy(surface)];

	let opp = copy(surface);
	move_surface(opp, scale(-h, surface.n) );
	opp.n = scale(-1, surface.n);
	res.push(opp);

	for (let i=0; i < surface.points.length; i++) {
		let next = (i+1)%surface.points.length;
		let points = [surface.points[i], surface.points[next], opp.points[next], opp.points[i]  ];
		let vf = subtract(points[1], points[0]);
		let vl = subtract(points[2], points[1]);
		let M = {
			points,
			n: normalize(cross(vf,vl)),
		};
		res.push(M);
	}

	return res;
}

function make_pyramid(surface, h) {
	let res = [copy(surface)];
	let peak = add(middle_point(surface), scale(-h,surface.n) );

	for (let i=0; i < surface.points.length; i++) {
		let next = (i+1)%surface.points.length;
		let points = [surface.points[i], surface.points[next], peak];
		let vf = subtract(points[1], points[0]);
		let vl = subtract(points[2], points[1]);
		let M = {
			points,
			n: normalize(cross(vf,vl)),
		};
		res.push(M);
	}

	return res;
}

function make_regular_polygon(n, perimeter) {
	let surface = {
		points: [ P(0,0,0) ],
		n: P(0,0,-1),
	};
	let v = P(0, perimeter/n, 0);
	let a = Math.PI*2/n;

	for (let i=1; i < n; i++) {
		v = rotate_around_Z(v,a);
		surface.points[i] = add(surface.points[i-1], v);
	}
	return surface;
}

function draw_3d(figure) {
	for (let surface of figure) {
		draw_surface(surface, figure.params);
	}
}

freq = 10;

function clear_canvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
}

let k = 1;

let holding = {};

document.addEventListener('keydown', function(e){
	holding[e.code] = true;
});

document.addEventListener('keyup', function(e){
	delete holding[e.code];
});

setInterval(function(){
	let {n,ex,ey} = get_camera_vars(camera);
	let step = 1;

	let v = P(0,0,0);

	if (holding.KeyA) v = subtract(v, ex);
	if (holding.KeyD) v = add(v, ex);
	if (holding.KeyW) v = add(v, n);
	if (holding.KeyS) v = subtract(v, n);
	if (holding.KeyE) v.z += 1;
	if (holding.KeyQ) v.z -= 1;

	if (holding.KeyZ) camera.roll += 0.02;
	if (holding.KeyC) camera.roll -= 0.02;

	if (len(v) > 0) camera.pos = add(camera.pos, normalize(v));
}, 10);


canvas.addEventListener('mousemove', e => {
	camera.pitch -= e.movementY/200;
	camera.yaw += e.movementX/200;
	if (camera.pitch > 1.57) camera.pitch = 1.57;
	else if (camera.pitch < -1.57) camera.pitch = -1.57;

	if (camera.yaw > 2*Math.PI) camera.yaw -= 2*Math.PI;
	else if (camera.yaw < 0) camera.yaw += 2*Math.PI;
});

canvas.addEventListener('click', e => {
	let {n,pos} = get_camera_vars(camera);
	let r = from_2d_coord_to_ray(e.clientX - xc - 8, -e.clientY + yc + 7);

	let intersection = raycast(r);
	if (intersection == null) {
		//console.log("no surface found");
		return;
	}

	let L = {
		a: pos,
		b: intersection.point,
	};
	lines.push(L);
});

let grid = [];
let size = 30;

for (let i = -size; i <= size; i+=5) {
	grid.push(
		{a: P(i,-size,0), b: P(i,size,0) },
		{a: P(-size,i,0), b: P(size,i,0) }
	);
}

let s = 50;

let square = {
	points: [ P(0,0,0), P(s,0,0), P(s,s,0), P(0,s,0) ],
	n: P(0,0,-1),
};

let cube = make_prism(square, s);
cube.params = {fillStyle: "#d6c0e8"};

let triangle = {
	points: [ P(0,0,0), P(0,s,0), P(0,s/2,s) ],
	n: P(-1,0,0),
};

let roof = make_prism(triangle, s/3);

move(roof, P(60,0,0) );
roof.params = {fillStyle: "#dbf2c6"};

let polygon = make_regular_polygon(5, 100);
let column = make_prism(polygon, 50);
column.params = {fillStyle: "grey"};

let pyramid = make_pyramid(polygon, s);
pyramid.params = {fillStyle: "#d6c0e8"};

let world = [roof, cube];
let lines = [];
let dots = [];

setInterval(function(){
	// Movements
	//rotate_figure(column, 0.02);
}, freq);

setInterval(function(){
	clear_canvas();

	for (let L of grid) draw_line(L.a, L.b, {strokeStyle: "grey"});
	for (let thing of world) draw_3d(thing);
	for (let L of lines) draw_line(L.a, L.b, {circle_at_the_tip: true});

	//draw_surface(polygon);
}, freq);
