var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

let WIDTH = 1200;
let HEIGHT = 800;

let sin = Math.sin;
let cos = Math.cos;

let default_params = {strokeStyle: 'black', lineWidth: 1, fillStyle: 'white'};

function draw_coord(m) {
	ctx.font = "15px Arial";
	let p = m.point;
	let coord = "(" + Math.round(p.x) + "," + Math.round(p.y) + "," + Math.round(p.z) + ")";
	ctx.fillText(coord, m.x, m.y-10);
}

function draw_line(a,b, params) {
	a = project_point(a);
	b = project_point(b);

    Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);
    ctx.beginPath();

	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);

	//draw_coord(l.a); draw_coord(l.b);

	ctx.stroke();

	if (params && params.circle_at_the_tip) {
	    ctx.beginPath();
	    ctx.arc(b.x, b.y, 5, 0, 2 * Math.PI);
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
	for (let s of figure.polygons) move_polygon(s, v);
}

function move_polygon(polygon, v) {
	for (let i=0; i < polygon.points.length; i++) {
		polygon.points[i] = add(polygon.points[i], v);
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

function rotate_full(p, roll, pitch, yaw) {
	return rotate_around_Z( rotate_around_Y( rotate_around_X( p, roll), pitch), yaw );
}

function rotate_2D(p, a) {
	return {
		x: cos(a)*p.x - sin(a)*p.y,
		y: sin(a)*p.x + cos(a)*p.y,
	};
}

function rotate_figure(figure, angle) {
	for (let s of figure.polygons) {
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


let camera = {
	pos: P(-200,0,100),
	yaw: 0,
	pitch: -0.5,
	roll: 0,
	prev: {},
};

function calc_camera_vars(camera) {
	let {yaw, pitch, roll, pos} = camera;

	//camera.n = P( cos(yaw)*cos(pitch), sin(yaw)*cos(pitch), sin(pitch) );

	camera.n  = rotate_full( P(1,0,0), 0, pitch, yaw);
	camera.ex = rotate_full( P(0,1,0), roll, pitch, yaw);
	camera.ey = rotate_full( P(0,0,1), roll, pitch, yaw);

	camera.D = -dot(camera.n, pos);
}

calc_camera_vars(camera);

let aspect_ratio = WIDTH/HEIGHT;
let angle_of_view = 2*Math.PI/3;
let F = 1/Math.tan(angle_of_view/2);

function project_point(point) {
	let {n,pos,ex,ey} = camera;
	if (equal(point,pos) ) return {x:0, y:0};

	let b = subtract(point, pos);
	let cz = dot(n, b);
	let cx = dot(ex, b);
	let cy = dot(ey, b);

	//if (point.x == -30 && point.y == -30 && point.z == 0 && d < 2) console.log({x: cx, y: cy, t, d} );

	//cx = cx*aspect_ratio*F*WIDTH/cz + WIDTH/2;
	//cy = -(cx*F*HEIGHT/cz) + HEIGHT/2;
	cx = cx/cz*900 + WIDTH/2;
	cy = -cy/cz*900 + HEIGHT/2;
	return {x: cx, y: cy, z: cz, point};
}

function from_2d_coord_to_ray(cx, cy) {
	let {n,D,ex,ey} = camera;

	let b = P(ex.x*cx + ey.x*cy, ex.y*cx + ey.y*cy, ex.z*cx + ey.z*cy);

	return add( scale(1/900,b), n);
}

function intersection_between_line_and_plane(p, v, n, D) {
	let t = -(dot(n,p) + D) / dot(n,v);
	return add(p, scale(t,v) );
}

function point_is_on_polygon(point, polygon) {
	//console.log("checking polygon:", polygon);
	let n = cross(subtract(polygon.points[1], polygon.points[0]), subtract(polygon.points[2], polygon.points[1]) );

	for (let i=0; i < polygon.points.length; i++) {
		let next = (i+1)%polygon.points.length;
		let c = cross(subtract(point, polygon.points[i]), subtract(polygon.points[next], point) );
		//console.log(dot(c, n));
		if (dot(c, n) > 0) return false;
	}
	//console.log("yes, point is on polygon!");
	return true;
}

function raycast(pos, r) {
	let closest_polygon;
	let closest_distance = 1000000000;
	let intersection;

	for (let figure of world) {
		for (let polygon of figure.polygons) {
			let n = polygon.n;
			if (dot(n, r) > 0) continue;

			let D = -dot(polygon.n, polygon.points[0]);
			let t = -(dot(n,pos) + D) / dot(n,r);

			if (t < 0) continue;
			let path = scale(t,r);
			let i = add(pos, path);

			if (!point_is_on_polygon(i, polygon)) continue;

			let d = len(path);
			if (d < closest_distance) {
				closest_polygon = polygon;
				closest_distance = d;
				intersection = i;
			}
		}
	}

	//console.log(closest_polygon, closest_distance);
	return closest_polygon ? {point: intersection, polygon: closest_polygon} : null;
}

function draw_polygon(polygon, params) {
	let {n,pos} = camera;
	let shoot = subtract(polygon.points[0], pos);
	if (dot(polygon.n, shoot) > 0 ) return;

	Object.assign(ctx, default_params);
    if (params) Object.assign(ctx, params);
    else if (polygon.parent) Object.assign(ctx, polygon.parent.params);

    let f = project_point(polygon.points[0]);
    ctx.moveTo(f.x, f.y);
    ctx.beginPath();

	for (let p of polygon.points) {
		p = project_point(p);
		ctx.lineTo(p.x, p.y);
	}
	ctx.lineTo(f.x, f.y);
	ctx.fill(); 

	ctx.stroke();

	draw_normal(polygon);
}

function middle_point(polygon) {
	let sum = P(0,0,0);
	for (let p of polygon.points) sum = add(sum, p);
	let center = scale(1/polygon.points.length, sum);
	return center;
}

function distance_to_polygon() {

}

function draw_normal(polygon) {
	let center = middle_point(polygon);

	let lines = [];
	let b = add(center, scale(5,polygon.n));
	lines[0] = {a: center, b };

	for (let line of lines) {
		draw_line( line.a, line.b , {strokeStyle: 'green'});
	}
}

function look_at(target) {
	let {n,pos} = camera;
	let v = subtract(target, pos);

	//camera.yaw = find_angle( P(1,0,0), P(v.x, v.y, 0) );
	camera.yaw = Math.atan(v.y/v.x);
	//camera.pitch = Math.PI/2 - find_angle( P(0,0,1), v );
	camera.pitch = Math.PI/2 - Math.atan(Math.sqrt(v.x*v.x + v.y*v.y)/v.z);
}

function make_prism(polygon, h) {
	let res = {
		polygons: [copy(polygon)]
	};

	let opp = copy(polygon);

	move_polygon(opp, scale(-h, polygon.n) );
	opp.n = scale(-1, polygon.n);
	res.polygons.push(opp);

	for (let i=0; i < polygon.points.length; i++) {
		let next = (i+1)%polygon.points.length;
		let points = [polygon.points[i], polygon.points[next], opp.points[next], opp.points[i]  ];
		let vf = subtract(points[1], points[0]);
		let vl = subtract(points[2], points[1]);
		let M = {
			points,
			n: normalize(cross(vf,vl)),
		};
		res.polygons.push(M);
	}
	for (let p of res.polygons) {
		p.parent = res;
	}

	return res;
}

function make_pyramid(polygon, h) {
	let res = [copy(polygon)];
	let peak = add(middle_point(polygon), scale(-h,polygon.n) );

	for (let i=0; i < polygon.points.length; i++) {
		let next = (i+1)%polygon.points.length;
		let points = [polygon.points[i], polygon.points[next], peak];
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
	let polygon = {
		points: [ P(0,0,0) ],
		n: P(0,0,-1),
	};
	let v = P(0, perimeter/n, 0);
	let a = Math.PI*2/n;

	for (let i=1; i < n; i++) {
		v = rotate_around_Z(v,a);
		polygon.points[i] = add(polygon.points[i-1], v);
	}
	return polygon;
}

function to_triangles(figure) {
	let res = [];

	for (let polygon of figure.polygons) {
		if (polygon.points.length == 3) {
			res.push(polygon);
			continue;
		}
		for (let i=0; i < polygon.points.length-2; i++) {
			let M = {
				points: [polygon.points[0], polygon.points[i+1], polygon.points[i+2] ],
				n: polygon.n,
				parent: figure,
			};
			res.push(M);
		}
	}
	figure.polygons = res;
}

/*
function equal_polygons(a,b) {
	for (let i=0; i < a.points.length; i++) {
		i < 
	}

	return equal(a[0], b[0]) && 
}


function remove_invisible_polygons(figure) {
	for (let i=0; i < figure.length; i++) {
		for (let k=i+1; k < figure.length; k++) {
			if (figure[i])
		}
	}
}
*/

function draw_3d(figure) {
	for (let polygon of figure.polygons) {
		draw_polygon(polygon, figure.params);
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
	let {n,ex,ey} = camera;
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
	let {n,pos} = camera;
	let r = from_2d_coord_to_ray(e.clientX - WIDTH/2 - 8, -e.clientY + HEIGHT/2 + 7);

	let intersection = raycast(pos, r);
	if (intersection == null) {
		//console.log("no polygon found");
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
cube.params = {fillStyle: "#d6c0e8" };
cube.color = [255,0,0];

let triangle = {
	points: [ P(0,0,0), P(0,s,0), P(0,s/2,s) ],
	n: P(-1,0,0),
};

let roof = make_prism(triangle, s/3);

move(roof, P(30,-30,0) );
roof.params = {fillStyle: "#dbf2c6" };
roof.color = [0,255,0];

let regular_polygon = make_regular_polygon(10, 100);
let column = make_prism(regular_polygon, 50);
column.params = {fillStyle: "grey"};

let pyramid = make_pyramid(regular_polygon, s);
pyramid.params = {fillStyle: "#d6c0e8"};

let world = [cube, roof];

for (let i=0; i < world.length; i++) {
	to_triangles(world[i]);
}

let lines = [];

setInterval(function(){
	// Movements
	rotate_figure(cube, 0.01);
	//look_at(cube[0].points[0] );
}, freq);

let prev_pos = camera.pos;

let cam_path = [];

let all_polygons = [];
for (let figure of world) all_polygons = all_polygons.concat(figure.polygons);


setInterval(function(){
	for (let p of all_polygons) {
		p.distance = len( subtract(camera.pos, middle_point(p) ));
	}
	all_polygons.sort( (a,b) => a.distance < b.distance);
}, 200);


setInterval(function(){
	clear_canvas();
	
	calc_camera_vars(camera);

	if (holding.ShiftLeft ) {
		if ( len(subtract(camera.pos, prev_pos)) > 3 ) {
			console.log("New line in the path!");
			cam_path.push({a:prev_pos, b:camera.pos});
			prev_pos = camera.pos;
		}
	}
	else prev_pos = camera.pos;

	for (let L of grid) draw_line(L.a, L.b, {strokeStyle: "grey"});

	for (let p of all_polygons) draw_polygon(p);


	for (let L of lines) draw_line(L.a, L.b, {circle_at_the_tip: true});
	for (let L of cam_path) draw_line(L.a, L.b, {});

	//draw_polygon(polygon);
}, freq);


/*
var imgData = ctx.createImageData(xc*2, yc*2);


setInterval(function(){
	let pixel_x = 0, pixel_y = 0;

	calc_camera_vars(camera);

	for (let i = 0; i < imgData.data.length; i += 4) {
		//if (i > 1000) break;

		pixel_x++;
		if ( i % (xc*8) == 0) {
			pixel_x = 0;
			pixel_y++;
		}

		//console.log(pixel_x, pixel_y);

		let {n,pos} = camera;
		let r = from_2d_coord_to_ray(pixel_x - xc, -pixel_y + yc);

		let intersection = null;
		//let intersection = raycast(pos, r);
		
		//console.log(r);
		if (intersection == null) {
			//console.log("no polygon found");
			imgData.data[i+0] = 0;
			imgData.data[i+1] = 0;
			imgData.data[i+2] = 0;
			imgData.data[i+3] = 255;
			continue;
		}

		let c = intersection.polygon.parent.color;

		imgData.data[i+0] = c[0];
		imgData.data[i+1] = c[1];
		imgData.data[i+2] = c[2];
		imgData.data[i+3] = 255;
	}

	ctx.putImageData(imgData, 10, 10); 
}, 50);

*/