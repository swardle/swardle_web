var asteroids;
(function (asteroids) {
    var gGame = null;
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    function MatMult(a, b) {
        var r = [];
        for (var i = 0; i < a.length; i++) {
            var row = [0, 0, 0];
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
    function MakeRot(rotRad) {
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
    function TrasVerts(matrix, verts) {
        var outverts = [];
        for (var i = 0; i < verts.length; i++) {
            var outvert = [0, 0];
            outvert[0] = matrix[0][0] * verts[i][0] + matrix[0][1] * verts[i][1] + matrix[0][2] * 1;
            outvert[1] = matrix[1][0] * verts[i][0] + matrix[1][1] * verts[i][1] + matrix[1][2] * 1;
            outverts.push(outvert);
        }
        return outverts;
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
    function VectorSub(a, b) {
        return [a[0] - b[0], a[1] - b[1]];
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
        }
        else if (discr === 0) {
            return [-0.5 * b / a];
        }
        else {
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
    function Distance(a, b) {
        var l = [0, 0];
        l[0] = b[0] - a[0];
        l[1] = b[1] - a[1];
        var llen = Math.sqrt(l[0] * l[0] + l[1] * l[1]);
        return llen;
    }
    function Magnitude(l) {
        var llen = Math.sqrt(l[0] * l[0] + l[1] * l[1]);
        return llen;
    }
    var BouncedVelocities = /** @class */ (function () {
        function BouncedVelocities(avec, bvec) {
            this.avec = avec;
            this.bvec = bvec;
        }
        return BouncedVelocities;
    }());
    function Bounce(aCenter, aMass, aMoveVec, bCenter, bMass, bMoveVec) {
        // First, find the normalized vector n from the center of 
        // circle1 to the center of circle2
        var n = VectorSub(aCenter, bCenter);
        n = Normalize(n);
        // Find the length of the component of each of the movement
        // vectors along n. 
        // a1 = aMoveVec . n
        // a2 = bMoveVec . n
        var a1 = Dot(aMoveVec, n);
        var a2 = Dot(bMoveVec, n);
        // Using the optimized version, 
        // optimizedP =  2(a1 - a2)
        //              -----------
        //                m1 + m2
        var optimizedP = (2.0 * (a1 - a2)) / (aMass + bMass);
        // Calculate amv', the new movement vector of circle a
        // amv' = aMoveVec - optimizedP * m2 * n
        var amvp = [
            aMoveVec[0] - optimizedP * bMass * n[0],
            aMoveVec[1] - optimizedP * bMass * n[1]
        ];
        // Calculate bmv', the new movement vector of circle1
        // bmv' = bMoveVec + optimizedP * m1 * n
        var bmvp = [
            bMoveVec[0] + optimizedP * aMass * n[0],
            bMoveVec[1] + optimizedP * aMass * n[1]
        ];
        // return the updated movement vectors 
        return new BouncedVelocities(amvp, bmvp);
    }
    var Hit = /** @class */ (function () {
        function Hit(isHit, time) {
            this.isHit = isHit;
            this.time = time;
        }
        return Hit;
    }());
    ;
    function BallvBall(aCenter, aRadius, aMoveVecParam, bCenter, bRadius, bMoveVecParam) {
        // find the relative movment between a and b.  
        // make it so b is not moving. 
        var aMoveVec = VectorSub(aMoveVecParam, bMoveVecParam);
        return BallvBallStationary(aCenter, aRadius, aMoveVec, bCenter, bRadius);
    }
    function BallvBallStationary(aCenter, aRadius, aMoveVecParam, bCenter, bRadius) {
        // make a copy of this vector
        var aMoveVec = aMoveVecParam.slice();
        // Early Escape test: if the length of the aMoveVec is less
        // than distance between the centers of these circles minus 
        // their radii, there's no way they can hit. 
        var dist = Distance(aCenter, bCenter);
        var sumRadii = (bRadius + aRadius);
        dist -= sumRadii;
        if (Magnitude(aMoveVec) < dist) {
            return new Hit(false, 0.0);
        }
        // Normalize the aMoveVec
        var N = Normalize(aMoveVec);
        // Find C, the vector from the center of the moving 
        // circle A to the center of B
        var C = VectorSub(bCenter, aCenter);
        // D = N . C = ||C|| * cos(angle between N and C)
        var D = Dot(N, C);
        // Another early escape: Make sure that A is moving 
        // towards B! If the dot product between the aMoveVec and 
        // bCenter - a.aCenter that or equal to 0, 
        // A isn't isn't moving towards B
        if (D <= 0) {
            return new Hit(false, 0.0);
        }
        // Find the length of the vector C
        var lengthC = Magnitude(C);
        var F = (lengthC * lengthC) - (D * D);
        // Escape test: if the closest that A will get to B 
        // is more than the sum of their radii, there's no 
        // way they are going collide
        var sumRadiiSquared = sumRadii * sumRadii;
        if (F >= sumRadiiSquared) {
            return new Hit(false, 0.0);
        }
        // We now have F and sumRadii, two sides of a right triangle. 
        // Use these to find the third side, sqrt(T)
        var T = sumRadiiSquared - F;
        // If there is no such right triangle with sides length of 
        // sumRadii and sqrt(f), T will probably be less than 0. 
        // Better to check now than perform a square root of a 
        // negative number. 
        if (T < 0) {
            return new Hit(false, 0.0);
        }
        // Therefore the distance the circle has to travel along 
        // aMoveVec is D - sqrt(T)
        var distance = D - Math.sqrt(T);
        // Get the magnitude of the movement vector
        var mag = Magnitude(aMoveVec);
        // Finally, make sure that the distance A has to move 
        // to touch B is not greater than the magnitude of the 
        // movement vector. 
        if (mag < distance) {
            return new Hit(false, 0.0);
        }
        // return distance / mag or the time of colision
        var t = distance / mag;
        return new Hit(true, t);
    }
    // Line a vs ball b
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
    // d is a vector
    // n is the normal of the vector to reflect over
    //
    // Vnew = ( -2*(V dot N)*N + V )
    function ReflectVector(d, n) {
        var dn = -2 * Dot(d, n);
        var vnew = [dn * n[0] + d[0], dn * n[1] + d[1]];
        return vnew;
    }
    var Buttons = /** @class */ (function () {
        function Buttons() {
            this.dir = [0, 0];
            this.fire = 0;
            this.start = 0;
        }
        return Buttons;
    }());
    var Bullet = /** @class */ (function () {
        function Bullet(pos, dir) {
            this.pos = pos;
            this.dir = dir;
            this.speed = 7;
            this.lifetime = 30;
        }
        return Bullet;
    }());
    function LineReflection(b, HitLoc) {
        // Find where the ball colision happened.                                                                             
        var dir = b.dir;
        var speed = b.speed;
        var colPos = HitLoc.Position;
        // Calulate the reflected vector so we have the new direction.                       
        var vnew = ReflectVector(dir, HitLoc.Normal);
        // From the colision point move the ball away keeping the same speed.                                                                             
        var newPos = [
            colPos[0] + vnew[0] * (speed - HitLoc.Time),
            colPos[1] + vnew[1] * (speed - HitLoc.Time)
        ];
        return { ColPos: colPos, NewPos: newPos, dir: vnew };
    }
    /*
    function isMobile2(): boolean {
        let isAndroid = navigator.userAgent.match(/Android/i) !== null;
        let isiOS = navigator.userAgent.match(/iPhone|iPad|iPod/i) !== null;
        let isBlackBerry = navigator.userAgent.match(/BlackBerry/i) !== null;
        let isOpera = navigator.userAgent.match(/Opera Mini/i) !== null;
        let isWindows = navigator.userAgent.match(/IEMobile/i) !== null;
        return (isAndroid || isiOS || isBlackBerry || isOpera || isWindows);
    }
    */
    function isMobile() {
        var isMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile/i) !== null;
        return (isMobile);
    }
    var TouchScreenButton = /** @class */ (function () {
        function TouchScreenButton(name, pos, size) {
            this.name = name;
            this.pos = pos;
            this.size = size;
        }
        return TouchScreenButton;
    }());
    var Game = /** @class */ (function () {
        // Game::Game
        function Game(canvas, backcanvas, frontctx, backctx) {
            this.Objects = [];
            this.TouchButtons = [];
            this.Canvas = backcanvas;
            this.FrontCanvas = canvas;
            this.Ctx = backctx;
            this.FrontCtx = frontctx;
            this.ScreenWidth = canvas.width;
            this.ScreenHeight = canvas.height;
            this.reset();
            this.AddButtons();
        }
        Game.prototype.reset = function (reset_type) {
            if (reset_type === void 0) { reset_type = ""; }
            this.ConButtons = new Buttons;
            this.Bullets = [];
            this.Objects = [];
            this.Objects.push(this.AddSpaceShip());
            //this.Objects.push(this.AddAsteroid(20));
            //this.Objects.push(this.AddAsteroid(20));
            this.Objects.push(this.AddAsteroid(20));
            if (reset_type === "level_end") {
            }
            else {
                this.Score = 0;
                this.Level = 0;
            }
        };
        Game.prototype.AddButtons = function () {
            if (!isMobile()) {
                return;
            }
            var buttonSize = this.ScreenWidth * 0.05;
            // the pos of B botton
            var x = this.ScreenWidth * 0.25;
            var y = this.ScreenHeight * 0.85;
            //   U
            // L D R X   S
            this.TouchButtons = [];
            this.TouchButtons.push(new TouchScreenButton("U", [x, y - buttonSize * 3], buttonSize));
            this.TouchButtons.push(new TouchScreenButton("L", [x - buttonSize * 3, y], buttonSize));
            this.TouchButtons.push(new TouchScreenButton("D", [x, y], buttonSize));
            this.TouchButtons.push(new TouchScreenButton("R", [x + buttonSize * 3, y], buttonSize));
            this.TouchButtons.push(new TouchScreenButton("F", [x + buttonSize * 7, y], buttonSize));
            this.TouchButtons.push(new TouchScreenButton("S", [x + buttonSize * 12, y], buttonSize));
        };
        // game::AddSpaceShip
        Game.prototype.AddSpaceShip = function () {
            var sizeSpaceShip = 5;
            var x = randomInt(sizeSpaceShip, this.ScreenWidth - sizeSpaceShip);
            var y = randomInt(sizeSpaceShip, this.ScreenHeight - sizeSpaceShip);
            var rot = randomInt(0, 359);
            var rotRad = rot * Math.PI / 180;
            var sin = Math.sin(rotRad);
            var cos = Math.cos(rotRad);
            return {
                objtype: "SpaceShip",
                verts: [
                    [-1, 1],
                    [1, 0],
                    [-1, -1],
                    [-.8, -.6],
                    [-.8, .6],
                    [-1, 0],
                    [-.8, .6],
                ],
                matrix: [
                    [cos, -sin, x],
                    [sin, cos, y],
                    [0, 0, 1],
                ],
                pos: [x, y],
                scale: [5, 5],
                rotation: rotRad,
                speed: 0,
                dead: false
            };
        };
        // Game::AddAsteroid
        Game.prototype.AddAsteroid = function (default_size, default_pos) {
            if (default_size === void 0) { default_size = 0; }
            if (default_pos === void 0) { default_pos = []; }
            var ship = this.Objects[0];
            var sizetable = [5, 10, 20];
            var si = randomInt(0, sizetable.length - 1);
            var sizeAsteroid = sizetable[si];
            if (default_size !== 0) {
                sizeAsteroid = default_size;
            }
            var x;
            var y;
            if (default_pos.length !== 0) {
                x = default_pos[0];
                y = default_pos[1];
            }
            else {
                while (1) {
                    x = randomInt(sizeAsteroid, this.ScreenWidth - sizeAsteroid);
                    y = randomInt(sizeAsteroid, this.ScreenWidth - sizeAsteroid);
                    var v = [x - ship.pos[0], y - ship.pos[1]];
                    var vlen = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                    // at least 100 pix away.
                    if (vlen > sizeAsteroid + ship.scale[0] + 100) {
                        break;
                    }
                }
            }
            var types = "abcd";
            var ty = randomInt(0, types.length - 1);
            var sp = (randomInt(30, 100) / 100.0) * 1;
            var rot = randomInt(0, 359);
            var rotRad = rot * Math.PI / 180;
            var sin = Math.sin(rotRad);
            var cos = Math.cos(rotRad);
            var objs = {
                a: [[0, 1], [.8, .6], [1, -.4], [.4, -.2], [.6, -.6], [0, -1], [-1, -.3], [-1, .5]],
                b: [[0, 1], [.8, .6], [1, -.4], [.4, -.2], [.6, -.6], [0, -1], [-.8, -.8], [-.6, -.3], [-.8, -.4], [-1, .5]],
                c: [[-.4, 1], [.1, .8], [.7, 1], [1, -.4], [.4, -.2], [.6, -.6], [0, -1], [-1, -.3], [-1, .5]],
                d: [[-.8, 1], [.7, .8], [1, -.2], [.6, -1], [-.2, -.8], [-.6, -1], [-1, -.6], [-.7, 0]],
            };
            return {
                objtype: "Asteroid",
                verts: objs[types[ty]],
                matrix: [
                    [cos, -sin, x],
                    [sin, cos, y],
                    [0, 0, 1],
                ],
                pos: [x, y],
                scale: [sizeAsteroid, sizeAsteroid],
                rotation: rotRad,
                speed: sp,
                dead: false,
                hitpoints: (sizeAsteroid / 5)
            };
        };
        // game::DrawSpaceShip
        Game.prototype.DrawSpaceShip = function (spaceShip) {
            var ctx = this.Ctx;
            var i = 0;
            var outverts = TrasVerts(spaceShip.matrix, spaceShip.verts);
            ctx.strokeStyle = 'rgb(255, 255, 255)';
            ctx.beginPath();
            ctx.moveTo(outverts[0][0], outverts[0][1]);
            for (i = 0; i < outverts.length; i++) {
                ctx.lineTo(outverts[i][0], outverts[i][1]);
            }
            ctx.stroke();
        };
        ;
        // game::DrawAsteroid
        Game.prototype.DrawAsteroid = function (asteroid) {
            var ctx = this.Ctx;
            var i = 0;
            // Draw as circle
            /*
            let outverts: number[][] = TrasVerts(asteroid.matrix, [[0.0, 0.0]]);
            ctx.strokeStyle = 'rgb(255, 255, 255)';
            ctx.beginPath();
            ctx.arc(outverts[0][0], outverts[0][1], asteroid.scale[0], 0, 2 * Math.PI);
            ctx.closePath();
            ctx.stroke();
            */
            var outverts = TrasVerts(asteroid.matrix, asteroid.verts);
            ctx.strokeStyle = 'rgb(255, 255, 255)';
            ctx.beginPath();
            ctx.moveTo(outverts[0][0], outverts[0][1]);
            for (i = 0; i < outverts.length; i++) {
                ctx.lineTo(outverts[i][0], outverts[i][1]);
            }
            ctx.closePath();
            ctx.stroke();
        };
        ;
        Game.prototype.updateBullets = function () {
            var width = this.Canvas.width;
            var height = this.Canvas.height;
            // move bullets
            for (var i = 0; i < this.Bullets.length; i++) {
                var b = this.Bullets[i];
                b.lifetime -= 1;
                if (b.lifetime < 0) {
                    this.Bullets.splice(i, 1);
                }
                else {
                    b.pos[0] += b.dir[0] * b.speed;
                    b.pos[1] += b.dir[1] * b.speed;
                    // wrap around
                    b.pos[0] = (b.pos[0] + width) % width;
                    b.pos[1] = (b.pos[1] + height) % height;
                }
            }
        };
        Game.prototype.shipVsAsteroids = function () {
            var ship = this.Objects[0];
            for (var j = 1; j < this.Objects.length; j++) {
                var obj = this.Objects[j];
                if (obj.objtype === "Asteroid") {
                    // find the disance between ship and asteroid
                    // is within the asteroid radius + ship radius
                    var v = [obj.pos[0] - ship.pos[0], obj.pos[1] - ship.pos[1]];
                    var vlen = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                    if (vlen < obj.scale[0] + ship.scale[0]) {
                        ship.dead = true;
                    }
                }
            }
        };
        Game.prototype.bulletsVsAsteroids = function () {
            var ctx = this.Ctx;
            var newbullets = [];
            var newobjs = [];
            var asteroidsToDelete = [];
            // Test bullets vs objtype = Asteroid
            for (var i = 0; i < this.Bullets.length; i++) {
                var b = this.Bullets[i];
                var bvec = [b.dir[0] * b.speed, b.dir[1] * b.speed];
                for (var j = 0; j < this.Objects.length; j++) {
                    var obj = this.Objects[j];
                    if (obj.objtype === "Asteroid") {
                        var rotRad = obj.rotation;
                        var sin = Math.sin(rotRad);
                        var cos = Math.cos(rotRad);
                        var speed = obj.speed;
                        var objvec = [cos * speed, sin * speed];
                        var hit = BallvBall(b.pos, 1, bvec, obj.pos, obj.scale[0], objvec);
                        if (hit.isHit === true) {
                            var HitLocBullet = [b.pos[0] + b.dir[0] * b.speed * hit.time,
                                b.pos[1] + b.dir[1] * b.speed * hit.time];
                            var HitLocObj = [obj.pos[0] + objvec[0] * hit.time,
                                obj.pos[1] + objvec[1] * hit.time];
                            this.Score += 1;
                            obj.hitpoints -= 1;
                            if (obj.hitpoints < 0) {
                                asteroidsToDelete.push(j);
                                if (obj.scale[0] > 5) {
                                    newobjs.push(this.AddAsteroid(obj.scale[0] / 2, HitLocObj));
                                    newobjs.push(this.AddAsteroid(obj.scale[0] / 2, HitLocObj));
                                    newobjs.push(this.AddAsteroid(obj.scale[0] / 2, HitLocObj));
                                }
                            }
                            var bv = Bounce(b.pos, 2, bvec, obj.pos, obj.scale[0], objvec);
                            var newbulletpos = [HitLocBullet[0] + bv.avec[0], HitLocBullet[1] + bv.avec[1]];
                            var objrot = Math.atan2(bv.bvec[1], bv.bvec[0]);
                            var objspeed = Magnitude(bv.bvec);
                            obj.pos = HitLocObj;
                            obj.rotation = objrot;
                            obj.speed = objspeed;
                            ctx.strokeStyle = 'rgb(0, 200, 0)';
                            ctx.beginPath();
                            ctx.moveTo(b.pos[0], b.pos[1]);
                            ctx.lineTo(HitLocBullet[0], HitLocBullet[1]);
                            ctx.lineTo(newbulletpos[0], newbulletpos[1]);
                            ctx.stroke();
                            ctx.strokeStyle = 'rgb(255, 0, 0)';
                            ctx.beginPath();
                            ctx.arc(HitLocBullet[0], HitLocBullet[1], 1, 0, 2 * Math.PI);
                            ctx.closePath();
                            ctx.stroke();
                            ctx.strokeStyle = 'rgb(255, 0, 0)';
                            ctx.beginPath();
                            ctx.arc(HitLocObj[0], HitLocObj[1], obj.scale[0], 0, 2 * Math.PI);
                            ctx.closePath();
                            ctx.stroke();
                            ctx.strokeStyle = 'rgb(0, 0, 255)';
                            ctx.beginPath();
                            ctx.arc(b.pos[0], b.pos[1], 1, 0, 2 * Math.PI);
                            ctx.closePath();
                            ctx.stroke();
                            ctx.strokeStyle = 'rgb(255, 255, 0)';
                            ctx.beginPath();
                            ctx.arc(obj.pos[0], obj.pos[1], obj.scale[0], 0, 2 * Math.PI);
                            ctx.closePath();
                            ctx.stroke();
                            newbullets.push(new Bullet(newbulletpos, Normalize(bv.avec)));
                            newbullets[newbullets.length - 1].lifetime = b.lifetime;
                            b.lifetime = 0;
                        }
                    }
                }
            }
            // guarantee the order
            asteroidsToDelete.sort();
            // delete in reverse order so the index are not messed with
            for (var index = asteroidsToDelete.length - 1; index >= 0; --index) {
                this.Objects.splice(asteroidsToDelete[index], 1);
            }
            this.Bullets = this.Bullets.concat(newbullets);
            this.Objects = this.Objects.concat(newobjs);
        };
        Game.prototype.drawBullets = function () {
            var ctx = this.Ctx;
            ctx.strokeStyle = 'rgb(255, 255, 255)';
            ctx.beginPath();
            for (var _i = 0, _a = this.Bullets; _i < _a.length; _i++) {
                var b = _a[_i];
                ctx.moveTo(b.pos[0] - b.dir[0] * b.speed, b.pos[1] - b.dir[1] * b.speed);
                ctx.lineTo(b.pos[0], b.pos[1]);
            }
            ctx.closePath();
            ctx.stroke();
        };
        Game.prototype.ApplyTransformToObj = function (obj) {
            var rotRad = obj.rotation;
            var sin = Math.sin(rotRad);
            var cos = Math.cos(rotRad);
            obj.speed *= 1.0 - 0.01;
            var speed = obj.speed;
            var vel = [cos * speed, sin * speed];
            var pos = [obj.pos[0], obj.pos[1]];
            pos[0] += vel[0];
            pos[1] += vel[1];
            pos[0] = (pos[0] + this.Canvas.width) % this.Canvas.width;
            pos[1] = (pos[1] + this.Canvas.height) % this.Canvas.height;
            obj.pos = pos;
            obj.speed = speed;
            var s = MakeScale(obj.scale[0], obj.scale[1]);
            var r = MakeRot(obj.rotation);
            var t = MakeTrans(obj.pos[0], obj.pos[1]);
            obj.matrix = MatMult(t, MatMult(s, r));
        };
        // Game::Draw
        Game.prototype.Draw = function () {
            var ctx = this.Ctx;
            // clear last frame
            ctx.fillStyle = 'rgb(100, 100, 100)';
            ctx.fillRect(0, 0, this.Canvas.width, this.Canvas.height);
            var ship = this.Objects[0];
            if (!ship.dead && this.Objects.length > 1) {
                var el = document.getElementById("scoreboard");
                if (el) {
                    el.innerText = "Score: " + this.Score + " Level: " + this.Level + "\n";
                }
                ship.rotation += (this.ConButtons.dir[0] * 8 * Math.PI) / 180.0;
                ship.speed = ship.speed + this.ConButtons.dir[1] * 0.25;
                if (this.ConButtons.fire) {
                    var rotRad = ship.rotation;
                    var sin = Math.sin(rotRad);
                    var cos = Math.cos(rotRad);
                    this.Bullets.push(new Bullet(ship.pos, [cos, sin]));
                }
                for (var i = 0; i < this.Objects.length; i++) {
                    var obj = this.Objects[i];
                    this.ApplyTransformToObj(obj);
                    obj.outverts = TrasVerts(obj.matrix, obj.verts);
                    if (obj.objtype === "Asteroid") {
                        this.DrawAsteroid(obj);
                    }
                    else if (obj.objtype === "SpaceShip" && obj.dead === false) {
                        this.DrawSpaceShip(obj);
                    }
                }
                this.updateBullets();
                this.drawBullets();
                this.bulletsVsAsteroids();
                this.shipVsAsteroids();
                if (this.ConButtons.start) {
                    ship.dead = false;
                    ship.speed = 0;
                    this.Objects.splice(1, this.Objects.length - 1);
                    //this.Objects.push(this.AddAsteroid(20));
                    //this.Objects.push(this.AddAsteroid(20));
                    this.Objects.push(this.AddAsteroid(20));
                }
            }
            else if (ship.dead && this.Objects.length > 1) {
                var el = document.getElementById("scoreboard");
                if (el) {
                    el.innerText = "Score: " + this.Score + " Level: " + this.Level + "\n" +
                        "press s to start";
                }
                if (this.ConButtons.start) {
                    this.reset();
                    ship = this.Objects[0];
                    ship.dead = false;
                }
            }
            else if (this.Objects.length <= 1) {
                var el = document.getElementById("scoreboard");
                if (el) {
                    el.innerText = "Score: " + this.Score + " Level: " + this.Level + "\n" +
                        "level over press s to start next level";
                }
                if (this.ConButtons.start) {
                    this.Level += 1;
                    this.reset("level_end");
                    ship = this.Objects[0];
                    ship.dead = false;
                }
            }
            //render the buffered canvas onto the original canvas element
            this.FrontCtx.drawImage(this.Canvas, 0, 0);
        };
        ;
        Game.prototype.getButtons = function () {
            return this.ConButtons;
        };
        Game.prototype.setButtons = function (b) {
            this.ConButtons = b;
        };
        return Game;
    }());
    function CreateKeyboardInputHandlers(gGame, canvas) {
        document.addEventListener('keyup', function (event) {
            if (gGame !== null) {
                var b = gGame.getButtons();
                if (event.keyCode == 37) {
                    b.dir[0] = 0; // to left
                }
                else if (event.keyCode == 38) {
                    b.dir[1] = 0; // to up
                }
                else if (event.keyCode == 39) {
                    b.dir[0] = 0; // to right
                }
                else if (event.keyCode == 40) {
                    b.dir[1] = 0; // to down
                }
                else if (event.keyCode == 32) {
                    b.fire = 0; // fire
                }
                else if (event.keyCode == 83) {
                    b.start = 0; // start s key
                }
                gGame.setButtons(b);
            }
        });
        document.addEventListener('keydown', function (event) {
            if (gGame !== null) {
                var b = gGame.getButtons();
                if (event.keyCode == 37) {
                    b.dir[0] = -1; // to left
                }
                else if (event.keyCode == 38) {
                    b.dir[1] = 1; // to up
                }
                else if (event.keyCode == 39) {
                    b.dir[0] = 1; // to right
                }
                else if (event.keyCode == 40) {
                    b.dir[1] = -1; // to down
                }
                else if (event.keyCode == 32) {
                    b.fire = 1; // fire
                }
                else if (event.keyCode == 83) {
                    b.start = 1; // start s key
                }
                gGame.setButtons(b);
            }
        });
    }
    function newGame() {
        console.log("myNewAnim");
        var canvas = document.getElementById('canvas');
        // let canvasContainer = document.getElementById('CanvasContainer');
        if (canvas.getContext) {
            var w = canvas.clientWidth;
            var h = canvas.clientHeight;
            canvas.width = w;
            canvas.height = h;
            var backcanvas = document.createElement('canvas');
            backcanvas.width = w;
            backcanvas.height = h;
            var backctx = backcanvas.getContext('2d');
            var frontctx = canvas.getContext('2d');
            if (gGame === null) {
                console.log("myNewAnim");
                gGame = new Game(canvas, backcanvas, frontctx, backctx);
                var id = setInterval(updateFrame, 60);
                if (isMobile()) {
                    // CreateTouchInputHandlers(gGame, canvas);
                }
                else {
                    CreateKeyboardInputHandlers(gGame, canvas);
                }
            }
        }
        function updateFrame() {
            gGame.Draw();
        }
    }
    asteroids.newGame = newGame;
    function HtmlButtonDown(button, type, e) {
        if (gGame !== null /* &&
            isMobile() && type === "touch") ||
        (!isMobile() && type === "mouse")*/) {
            var b = gGame.getButtons();
            if (button.id === "L") {
                b.dir[0] = -1; // to left
            }
            else if (button.id === "U") {
                b.dir[1] = 1; // to up
            }
            else if (button.id === "R") {
                b.dir[0] = 1; // to right
            }
            else if (button.id === "D") {
                b.dir[1] = -1; // to down
            }
            else if (button.id === "F") {
                b.fire = 1; // fire
            }
            else if (button.id === "S") {
                b.start = 1; // start s key
            }
            gGame.setButtons(b);
            e.preventDefault();
        }
    }
    asteroids.HtmlButtonDown = HtmlButtonDown;
    function HtmlButtonUp(button, type, e) {
        if (gGame !== null /* &&
           (isMobile() && type === "touch") ||
        (!isMobile() && type === "mouse")*/) {
            var b = gGame.getButtons();
            if (button.id === "L") {
                b.dir[0] = 0; // to left
            }
            else if (button.id === "U") {
                b.dir[1] = 0; // to up
            }
            else if (button.id === "R") {
                b.dir[0] = 0; // to right
            }
            else if (button.id === "D") {
                b.dir[1] = 0; // to down
            }
            else if (button.id === "F") {
                b.fire = 0; // fire
            }
            else if (button.id === "S") {
                b.start = 0; // start s key
            }
            gGame.setButtons(b);
            e.preventDefault();
        }
    }
    asteroids.HtmlButtonUp = HtmlButtonUp;
    function DoNothing(e) {
        e.preventDefault();
        return false;
    }
    asteroids.DoNothing = DoNothing;
})(asteroids || (asteroids = {}));
window.onload = function () {
    asteroids.newGame();
};
//# sourceMappingURL=asteroids.js.map