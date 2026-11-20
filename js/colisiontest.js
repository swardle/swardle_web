function Ray(x1, y1, x2, y2) {
    this.Orig = [x1, y1];
    var a = [x2 - x1, y2 - y1];
    var len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    var oolen = 1.0 / len;
    this.Dir = [a[0] * oolen, a[1] * oolen];
    this.Length = len;
}

function VectorSub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}

// return a normal from a line
function VectorLength(a) {
    // a normal 
    var len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    return len;
}

function LineLength(line) {
    var a = [line.X2 - line.X1, line.Y2 - line.Y1];
    var len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    return len;
}

// return a normal from a line
function NormalizeLine(a) {
    // a normal 
    var l = [a.X2 - a.X1, a.Y2 - a.Y1];
    var llen = Math.sqrt(l[0] * l[0] + l[1] * l[1]);
    var oollen = 1.0 / llen;
    l[0] = l[0] * oollen;
    l[1] = l[1] * oollen;
    return l;
}

// return a normal from a line
function Normalize(a) {
    // clone the vector
    var l = a.slice();
    var llen = Math.sqrt(l[0] * l[0] + l[1] * l[1]);
    var oollen = 1.0 / llen;
    l[0] = l[0] * oollen;
    l[1] = l[1] * oollen;
    return l;
}

// dot 2 vectors a and b
function Dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}

// d is a vector
// n is the normal of the vector to reflect over
//
// Vnew = ( -2*(V dot N)*N + V )
function ReflectVector(d, n) {
    var dn = -2 * Dot(d, n);
    var vnew = [dn * n[0] + d[0], dn * n[1] + d[1]];
    return vnew;
}

// lerp between v0 when t=0 and v1 when t=1
function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}

function MatMult(a, b) {
    var r = [];
    for (var i = 0; i < a.length; i++) {
        row = [0, 0, 0];
        row[0] = b[0][0] * a[i][0] + b[0][1] * a[i][1] + b[0][2] * a[i][2];
        row[1] = b[1][0] * a[i][0] + b[1][1] * a[i][1] + b[1][2] * a[i][2];
        row[2] = b[2][0] * a[i][0] + b[2][1] * a[i][1] + b[2][2] * a[i][2];
        r.push(row);
    }
    return r;
}

function MakeTrans(tx, ty) {
    var mat = [
        [1, 0, tx],
        [0, 1, ty],
        [0, 0, 1]
    ];
    return mat;
}

function MakeRot(rot) {
    var rotRad = rot * Math.PI / 180;
    var sin = Math.sin(rotRad);
    var cos = Math.cos(rotRad);

    var mat = [
        [cos, -sin, 0],
        [sin, cos, 0],
        [0, 0, 1],
    ];
    return mat;
}

function MakeScale(sx, sy) {
    var mat = [
        [sx, 0, 0],
        [0, sy, 0],
        [0, 0, 1]
    ];
    return mat;
}

// from http://www.cg.info.hiroshima-cu.ac.jp/~miyazaki/knowledge/teche23.html
// https://ardoris.wordpress.com/2008/07/18/general-formula-for-the-inverse-of-a-3x3-matrix/
function MatInverse(m) {
    var a = m[0][0];
    var b = m[0][1];
    var c = m[0][2];
    var d = m[1][0];
    var e = m[1][1];
    var f = m[1][2];
    var g = m[2][0];
    var h = m[2][1];
    var i = m[2][2];

    var detm = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    // there is no solusion
    // return null
    if (Math.abs(detm) < 0.0001) {
        return null;
    }
    var oodetm = 1 / detm;
    var ret = [
        [oodetm * (e * i - f * h), oodetm * (c * h - b * i), oodetm * (b * f - c * e)],
        [oodetm * (f * g - d * i), oodetm * (a * i - c * g), oodetm * (c * d - a * f)],
        [oodetm * (d * h - e * g), oodetm * (b * g - a * h), oodetm * (a * e - b * d)],
    ];
    return ret;
}

function TrasVerts(matrix, verts) {
    var outverts = [];
    for (var i = 0; i < verts.length; i++) {
        outvert = [0, 0];
        outvert[0] = matrix[0][0] * verts[i][0] + matrix[0][1] * verts[i][1] + matrix[0][2] * 1;
        outvert[1] = matrix[1][0] * verts[i][0] + matrix[1][1] * verts[i][1] + matrix[1][2] * 1;
        outverts.push(outvert);
    }
    return outverts;
}


// orgin 2d vector x and y of start of ray. 
// rdir 2d vector x and y of the normalized direction of ray. 
// b is a box 
// {IsHit=false, Normal=side, Time=t}
function RayVsBoxInside(orig, rdir, b) {
    dfx = 1.0 / rdir[0];
    dfy = 1.0 / rdir[1];

    // time to hit left, right, bottom, top
    var t1 = (b.X - orig[0]) * dfx;
    var t2 = (b.X + b.Width - orig[0]) * dfx;
    var t3 = (b.Y + b.Height - orig[1]) * dfy;
    var t4 = (b.Y - orig[1]) * dfy;
    var xdir = [1, 0];
    var ydir = [0, 1];
    var tdir = [0, 1];

    // x did we hit the left wall first?
    var xmin = t1;
    var xmax = t2;
    xdir[0] = 1;
    if (t1 < t2) {
        // nope we hit the right wall first.
        xmin = t2;
        xmax = t1;
        xdir[0] = -1;
    }

    // If we hit the left or right wall in the past then 
    // really we should hit the other wall. 
    if (xmin < 0) {
        xmin = xmax;
        xdir[0] *= -1;
    }

    // y
    var ymin = t3;
    var ymax = t4;
    ydir[1] = -1;
    if (t3 < t4) {
        ymin = t4;
        ymax = t3;
        ydir[1] = 1;
    }

    if (ymin < 0) {
        ymin = ymax;
        ydir[1] *= -1;
    }

    // pick which one is closer x or y. 
    var tmin = ymin;
    tdir = ydir;
    if (ymin > xmin) {
        tmin = xmin;
        tdir = xdir;
    }

    if (tmin < 0) {
        return [];
    }

    var colPos = [orig[0] + rdir[0] * tmin, orig[1] + rdir[1] * tmin];
    var hit = { Position: colPos, Normal: tdir, Time: tmin };
    return [hit];
}

// orgin 2d vector x and y of start of ray. 
// rdir 2d vector x and y of the normalized direction of ray. 
// b is a box 
// {IsHit=false, Normal=side, Time=t}
function RayVsBoxOutsize(orig, rdir, b) {

    var dfx = 1.0 / rdir[0];
    var dfy = 1.0 / rdir[1];

    // time to hit left, right, bottom, top
    var t1 = (b.X - orig[0]) * dfx;
    var t2 = (b.X + b.Width - orig[0]) * dfx;
    var t3 = (b.Y + b.Height - orig[1]) * dfy;
    var t4 = (b.Y - orig[1]) * dfy;

    var xside = [0, 0];
    var yside = [0, 0];
    var side = [0, 0];
    var tmin;
    var tmax;
    var xmin;
    var ymin;
    var xmax;
    var ymax;

    // See if the left closer then the right
    if (t1 < t2) {
        xside = [-1, 0]; // left
        xmin = t1;
        xmax = t2;
    } else {
        xside = [1, 0]; // right
        xmin = t2;
        xmax = t1;
    }

    // See if the bottom closer then the top
    if (t3 < t4) {
        yside = [0, 1]; // bottom 
        ymin = t3;
        ymax = t4;
    } else {
        yside = [0, -1]; // top
        ymin = t4;
        ymax = t3;
    }

    // See if the side hit before top or bottom
    if (xmin > ymin) {
        side = xside;
        tmin = xmin;
    } else {
        side = yside;
        tmin = ymin;
    }

    // see what was hit last top/bottom vs sides
    if (xmax < ymax) {
        tmax = xmax;
    } else {
        tmax = ymax;
    }

    // if tmax < 0, ray (line) is intersecting AABB, but whole AABB is behing us
    if (tmax < 0) {
        t = tmax;
        return [];
    }

    // if tmin > tmax, ray doesn't intersect AABB
    if (tmin > tmax) {
        t = tmax;
        return [];
    }

    t = tmin;

    var colPos = [orig[0] + rdir[0] * t, orig[1] + rdir[1] * t];
    var hit = { Position: colPos, Normal: side, Time: t };
    return [hit];
}

// orgin 2d vector x and y of start of ray. 
// rdir 2d vector x and y of the normalized direction of ray. 
// b is a box 
// {IsHit=false, Normal=side, Time=t}
function RayVsBox(orig, rdir, b) {
    if (b.X <= orig[0] && orig[0] <= b.X + b.Width &&
        b.Y <= orig[1] && orig[1] <= b.Y + b.Height) {
        return RayVsBoxInside(orig, rdir, b);
    }
    return RayVsBoxOutsize(orig, rdir, b);
}

// x = -b +- sqrt(b^2 - 4ac)
//     ---------------------
//             2a  
function solveQuadratic(a, b, c) {
    var x0;
    var x1;
    var discr = b * b - 4 * a * c;
    if (discr < 0) {
        return [];
    } else if (discr === 0) {
        return [-0.5 * b / a];
    } else {
        var q = (b > 0) ?
            -0.5 * (b + Math.sqrt(discr)) :
            -0.5 * (b - Math.sqrt(discr));
        x0 = q / a;
        x1 = c / q;
    }
    if (x0 > x1) {
        var tmp = x0;
        x0 = x1;
        x1 = tmp;
    }
    return [x0, x1];
}

// Line a vs box b
// {IsHit=false, Normal=side, Time=t}

// Circle: abs(x-c)^2 = r^2
// Line: x = o + dl
// replace x with o + dl 
// abs(o + dl-c)^2 = r^2
// (o + dl-c)*(o + dl-c) = r^2
// o^2 + odl - oc + odl + dl^2 - dlc - oc - dlc + c^2 = r^2
// d^2(l*l) + 2*odl - 2*dlc - oc + c^2 + o^2 - oc = r^2
// d^2(l*l) + 2*d((l)*(o - c)) + c^2 - oc + o^2 - oc = r^2
// d^2(l*l) + 2*d((l)*(o - c)) + c(c - o) - o(c - o) = r^2
// d^2(l*l) + 2*d((l)*(o - c)) + (c-o)(c-o) = r^2
// d^2(l*l) + 2*d((l)*(o - c)) + (c-o)(c-o) = r^2
// d^2(l*l) + 2*d((l)*(o - c)) + (c-o)(c-o) - r^2 = 0
// Solve for d using Quadratic formula
// 
// x = -b +- sqrt(b^2 - 4ac)
//     ---------------------
//             2a  
// Where d will be x
// a = (l*l)
// b = ((l)*(o - c))
// c = ((c-o)(c-o)-r^2)
// 
// x = -((l)*(o - c)) +- sqrt(((l)*(o - c))^2 - 4(l*l)((c-o)(c-o)-r^2)
//       -------------------------------------------------------
//                 2(l*l)
//

// orig of ray
// dir of ray
// center of sphere
// radius of sphere
function RayVsBall(orig, dir, center, radius) {

    var L = VectorSub(orig, center);
    var a = Dot(dir, dir);
    var b = 2 * Dot(dir, L);
    var c = Dot(L, L) - radius * radius;
    var solutions = solveQuadratic(a, b, c);

    var hits = [];

    for (var i = 0; i < solutions.length; i++) {
        var s = solutions[i];
        if (s > 0) {
            var colPos = [orig[0] + dir[0] * s, orig[1] + dir[1] * s];
            var n = VectorSub(colPos, center);
            n = Normalize(n);
            var hit = { Position: colPos, Normal: n, Time: s };
            hits.push(hit);
        }
    }

    return hits;
}


var gGame = null;

function GameOnMouseDown(_this, canvas, evt) {
    var rect = canvas.getBoundingClientRect();

    _this.MouseX = evt.clientX - rect.left;
    _this.MouseY = evt.clientY - rect.top;
    _this.OldMouseX = _this.MouseX;
    _this.OldMouseY = _this.MouseY;

    _this.MouseDown = true;
    _this.MouseSelected = null;
    _this.MouseSelectedObjIndex = 0;
    _this.MouseSelectedMouseMode = document.querySelector('input[name = "SelectMode"]:checked').value;
    _this.MouseSelectedVertIndex = 0;

    for (var i = 0; i < _this.Objects.length; i++) {
        var obj = _this.Objects[i];
        var pix = 5;
        var outverts = TrasVerts(obj.matrix, obj.verts);

        for (var j = 0; j < outverts.length; j++) {
            if (Math.abs(_this.MouseX - outverts[j][0]) < pix &&
                Math.abs(_this.MouseY - outverts[j][1]) < pix) {
                _this.MouseSelected = obj;
                _this.MouseSelectedObjIndex = i;
                _this.MouseSelectedVertIndex = j;
            }
        }
    }
}

function GameOnMouseUp(_this, canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    _this.MouseSelected = null;
    _this.MouseSelectedObjIndex = 0;
    _this.MouseSelectedMouseMode = null;
    _this.MouseSelectedVertIndex = 0;
}

function GameOnMouseMove(_this, canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    _this.MouseX = evt.clientX - rect.left;
    _this.MouseY = evt.clientY - rect.top;
}

function Game(canvas, backcanvas, frontctx, backctx) {
    this.Canvas = backcanvas;
    this.FrontCanvas = canvas;
    this.Ctx = backctx;
    this.FrontCtx = frontctx;
    this.ScreenWidth = canvas.width;
    this.ScreenHeight = canvas.height;

    this.MouseX = 0;
    this.MouseY = 0;
    this.OldMouseX = 0;
    this.OldMouseY = 0;
    this.MouseSelected = null;
    this.MouseSelectedObjIndex = 0;
    this.MouseSelectedVertIndex = 0;
    this.MouseSelectedMouseMode = null;
    this.Objects = [];

    var _this = this;
    this.FrontCanvas.onmousedown = function(evt) {
        GameOnMouseDown(_this, _this.FrontCanvas, evt);
    };
    this.FrontCanvas.onmouseup = function(evt) {
        GameOnMouseUp(_this, _this.FrontCanvas, evt);
    };
    this.FrontCanvas.onmousemove = function(evt) {
        GameOnMouseMove(_this, _this.FrontCanvas, evt);
    };
}

function AddRay() {
    var x1 = parseInt(document.getElementById('LineX1').value);
    var y1 = parseInt(document.getElementById('LineY1').value);
    var x2 = parseInt(document.getElementById('LineX2').value);
    var y2 = parseInt(document.getElementById('LineY2').value);
    gGame.Objects.push({
        objtype: "Ray",
        verts: [
            [x1, y1],
            [x2, y2]
        ],
        matrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
        pos: [0, 0],
        scale: [1, 1],
        rotation: 0,
    });
}

function AddBox() {

    var x = parseInt(document.getElementById('BoxX').value);
    var y = parseInt(document.getElementById('BoxY').value);
    var w = parseInt(document.getElementById('BoxWidth').value);
    var h = parseInt(document.getElementById('BoxHieght').value);

    gGame.Objects.push({
        objtype: "Box",
        verts: [
            [x, y],
        ],
        matrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
        pos: [0, 0],
        scale: [1, 1],
        rotation: 0,
        width: w,
        height: h
    });
}

function AddBall() {

    var x = parseInt(document.getElementById('BallX').value);
    var y = parseInt(document.getElementById('BallY').value);
    var r = parseInt(document.getElementById('BallR').value);

    gGame.Objects.push({
        objtype: "Ball",
        verts: [
            [x, y],
        ],
        matrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
        pos: [0, 0],
        scale: [1, 1],
        rotation: 0,
        radius: r,
    });
}


function AddAsteroid() {

    var x = parseInt(document.getElementById('AsteroidX').value);
    var y = parseInt(document.getElementById('AsteroidY').value);
    var type = document.getElementById('AsteroidType').value.toLowerCase();
    var r = parseInt(document.getElementById('AsteroidR').value);


    objs = {
        a: [
            [r * 0, r * 10],
            [r * 8, r * 6],
            [r * 10, r * -4],
            [r * 4, r * -2],
            [r * 6, r * -6],
            [r * 0, r * -10],
            [r * -10, r * -3],
            [r * -10, r * 5],
        ],
        b: [
            [r * 0, r * 10],
            [r * 8, r * 6],
            [r * 10, r * -4],
            [r * 4, r * -2],
            [r * 6, r * -6],
            [r * 0, r * -10],
            [r * -8, r * -8],
            [r * -6, r * -3],
            [r * -8, r * -4],
            [r * -10, r * 5],
        ],
        c: [
            [r * -4, r * 10],
            [r * 1, r * 8],
            [r * 7, r * 10],
            [r * 10, r * -4],
            [r * 4, r * -2],
            [r * 6, r * -6],
            [r * 0, r * -10],
            [r * -10, r * -3],
            [r * -10, r * 5],

        ],
        d: [
            [r * -8, r * 10],
            [r * 7, r * 8],
            [r * 10, r * -2],
            [r * 6, r * -10],
            [r * -2, r * -8],
            [r * -6, r * -10],
            [r * -10, r * -6],
            [r * -7, r * 0],
        ],
    };

    gGame.Objects.push({
        objtype: "Asteroid",
        verts: objs[type],
        matrix: [
            [1, 0, x],
            [0, 1, y],
            [0, 0, 1],
        ],
        pos: [x, y],
        scale: [1, 1],
        rotation: 0,
    });
}

function AddSpaceShip() {

    var x = parseInt(document.getElementById('SpaceShipX').value);
    var y = parseInt(document.getElementById('SpaceShipY').value);
    var rot = parseInt(document.getElementById('SpaceShipRot').value);
    var r = parseInt(document.getElementById('SpaceShipR').value);
    var rotRad = rot * Math.PI / 180;
    var sin = Math.sin(rotRad);
    var cos = Math.cos(rotRad);

    gGame.Objects.push({
        objtype: "SpaceShip",
        verts: [
            [-5, 5], // left fin
            [0, -5], // top nose
            [5, 5], // right fin
            [4, 3], // right end flame
            [-4, 3], // left end flame
            [0, 6], // end flame
            [4, 3], // left end flame
        ],
        matrix: [
            [cos, -sin, x],
            [sin, cos, y],
            [0, 0, 1],
        ],
        pos: [x, y],
        scale: [1, 1],
        rotation: rot,
        radius: r,
    });
}

function ApplyTransformToObj(obj) {
    s = MakeScale(obj.scale[0], obj.scale[1]);
    r = MakeRot(obj.rotation);
    t = MakeTrans(obj.pos[0], obj.pos[1]);
    obj.matrix = MatMult(t, MatMult(s, r));
}

function LineReflection(ray, HitLoc) {
    // Find where the ball colision happened.                                                                             
    dir = ray.Dir;
    speed = ray.Length;
    var colPos = HitLoc.Position;
    // Calulate the reflected vector so we have the new direction.                       
    vnew = ReflectVector(dir, HitLoc.Normal);

    // From the colision point move the ball away keeping the same speed.                                                                             
    var newPos = [colPos[0] + vnew[0] * (speed - HitLoc.Time),
        colPos[1] + vnew[1] * (speed - HitLoc.Time)
    ];

    return { ColPos: colPos, NewPos: newPos };
}

Game.prototype.DrawSpaceShip = function(spaceShip) {
    var ctx = this.Ctx;
    var i = 0;

    outverts = TrasVerts(spaceShip.matrix, spaceShip.verts);
    ctx.strokeStyle = 'rgb(255, 0, 0)';
    ctx.beginPath();
    ctx.moveTo(outverts[0][0], outverts[0][1]);
    for (i = 0; i < outverts.length; i++) {
        ctx.lineTo(outverts[i][0], outverts[i][1]);
    }
    ctx.stroke();
};


Game.prototype.DrawAsteroid = function(asteroid) {
    var ctx = this.Ctx;
    var i = 0;

    outverts = TrasVerts(asteroid.matrix, asteroid.verts);
    ctx.strokeStyle = 'rgb(255, 0, 0)';
    ctx.beginPath();
    ctx.moveTo(outverts[0][0], outverts[0][1]);
    for (i = 0; i < outverts.length; i++) {
        ctx.lineTo(outverts[i][0], outverts[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
};

Game.prototype.DrawRay = function(rayobj) {
    var ctx = this.Ctx;
    var i = 0;
    var rayoutverts = TrasVerts(rayobj.matrix, rayobj.verts);

    var ray = new Ray(rayoutverts[0][0], rayoutverts[0][1], rayoutverts[1][0], rayoutverts[1][1]);
    var speed = ray.Length;
    var hits;
    var HitLoc;

    ctx.strokeStyle = 'rgb(255, 0, 0)';
    ctx.beginPath();
    ctx.moveTo(rayoutverts[0][0], rayoutverts[0][1]);
    ctx.lineTo(rayoutverts[1][0], rayoutverts[1][1]);
    ctx.stroke();

    for (var j = 0; j < this.Objects.length; j++) {
        var obj = this.Objects[j];
        var outverts = TrasVerts(obj.matrix, obj.verts);

        if (obj.objtype == "Ball") {
            hits = RayVsBall(ray.Orig, ray.Dir, [outverts[0][0], outverts[0][1]], obj.radius);
            for (i = 0; i < hits.length; i++) {
                HitLoc = hits[i];
                if (HitLoc.Time < speed) {
                    ColData = LineReflection(ray, HitLoc);
                    ctx.strokeStyle = 'rgb(200, 200, 0)';
                    ctx.beginPath();
                    ctx.moveTo(ColData.ColPos[0], ColData.ColPos[1]);
                    ctx.lineTo(ColData.NewPos[0], ColData.NewPos[1]);
                    ctx.stroke();
                }
            }
        } else if (obj.objtype == "Box") {
            var box = {
                X: outverts[0][0],
                Y: outverts[0][1],
                Width: obj.width,
                Height: obj.height
            };
            hits = RayVsBox(ray.Orig, ray.Dir, box);
            for (i = 0; i < hits.length; i++) {
                HitLoc = hits[i];
                if (HitLoc.Time < speed) {
                    ColData = LineReflection(ray, HitLoc);
                    ctx.strokeStyle = 'rgb(200, 200, 0)';
                    ctx.beginPath();
                    ctx.moveTo(ColData.ColPos[0], ColData.ColPos[1]);
                    ctx.lineTo(ColData.NewPos[0], ColData.NewPos[1]);
                    ctx.stroke();
                }
            }

        }
    }
};

Game.prototype.Draw = function() {
    var ctx = this.Ctx;

    // clear last frame
    ctx.fillStyle = 'rgb(100, 100, 100)';
    ctx.fillRect(0, 0, this.Canvas.width, this.Canvas.height);

    if (this.MouseSelected) {

        var x = this.MouseX;
        var y = this.MouseY;

        if (this.MouseSelectedMouseMode === "obj_trans") {
            var SelectedVertsInWorld = TrasVerts(this.MouseSelected.matrix, [this.MouseSelected.verts[this.MouseSelectedVertIndex]]);

            var tx = (this.MouseX - SelectedVertsInWorld[0][0]);
            var ty = (this.MouseY - SelectedVertsInWorld[0][1]);
            this.MouseSelected.pos[0] += tx;
            this.MouseSelected.pos[1] += ty;

            ApplyTransformToObj(this.MouseSelected);


        } else if (this.MouseSelectedMouseMode === "obj_rot") {

            var r = (this.MouseX - this.OldMouseX);
            this.MouseSelected.rotation += r;

            ApplyTransformToObj(this.MouseSelected);

        } else if (this.MouseSelectedMouseMode === "obj_scale") {

            var sx = (this.MouseX - this.OldMouseX) / 100.0;
            var sy = (this.MouseY - this.OldMouseY) / 100.0;

            this.MouseSelected.scale[0] += sx;
            this.MouseSelected.scale[1] += sy;

            ApplyTransformToObj(this.MouseSelected);

        } else if (this.MouseSelectedMouseMode === "verts") {

            var mouseVert = [x, y];
            var mouse2obj = MatInverse(this.MouseSelected.matrix);

            var MousePosInObjSpace = TrasVerts(mouse2obj, [mouseVert]);

            this.MouseSelected.verts[this.MouseSelectedVertIndex][0] = MousePosInObjSpace[0][0];
            this.MouseSelected.verts[this.MouseSelectedVertIndex][1] = MousePosInObjSpace[0][1];

        }

    }

    for (var i = 0; i < this.Objects.length; i++) {
        var obj = this.Objects[i];
        var outverts;

        if (obj.objtype == "Ray") {
            this.DrawRay(obj);
        } else if (obj.objtype == "Box") {
            outverts = TrasVerts(obj.matrix, obj.verts);
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.fillRect(outverts[0][0], outverts[0][1], obj.width, obj.height);
        } else if (obj.objtype == "Ball") {
            outverts = TrasVerts(obj.matrix, obj.verts);
            ctx.strokeStyle = 'rgb(0, 0, 255)';
            ctx.beginPath();
            ctx.arc(outverts[0][0], outverts[0][1], obj.radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (obj.objtype == "Asteroid") {
            this.DrawAsteroid(obj);
        } else if (obj.objtype == "SpaceShip") {
            this.DrawSpaceShip(obj);
        }
    }

    //render the buffered canvas onto the original canvas element
    this.FrontCtx.drawImage(this.Canvas, 0, 0);
};


function updateFrame() {
    gGame.Draw();
}


function newGame() {
    var canvas = document.getElementById('canvas');
    if (canvas.getContext) {
        var backcanvas = document.createElement('canvas');
        backcanvas.width = canvas.width;
        backcanvas.height = canvas.height;
        var backctx = backcanvas.getContext('2d');
        var frontctx = canvas.getContext('2d');

        if (gGame === null) {
            console.log("myNewAnim");
            gGame = new Game(canvas, backcanvas, frontctx, backctx);
            var id = setInterval(updateFrame, 60);
        }
    }
}

newGame();
