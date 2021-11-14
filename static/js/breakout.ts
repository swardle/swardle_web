namespace breakout {

    // a very simple clone of atari breakout. 
    var gPlayerSpeed: number = 11;
    var gBallSpeed: number = 8;
    // x,y,width,hieght
    var gInitBallBox: number[] = [8, 128, 8, 8];
    var gInitPlayerBox: number[] = [0, 256 - 4, 64, 4];
    var gInitField0Box: number[] = [0, 0, 32, 16];

    // ResourceCache a cache for loading art for the game.
    class ResourceCache {
        resourceCache = {};
        readyCallbacks = [];
        constructor() {
            this.resourceCache = {};
            this.readyCallbacks = [];
        }

        // ResourceCache::Load
        // Load an image url or an array of image urls
        load(urlOrArr) {
            if (urlOrArr instanceof Array) {
                urlOrArr.forEach(function (url) {
                    this._load(url);
                });
            } else {
                this._load(urlOrArr);
            }
        };

        // ResourceCache::_Load
        // only loads one at a time
        _load(url: string) {
            if (this.resourceCache[url]) {
                return this.resourceCache[url];
            } else {
                var img = new Image();
                var _this = this;
                img.onload = function () {
                    _this.resourceCache[url] = img;

                    if (_this.isReady()) {
                        _this.readyCallbacks.forEach(function (func) { func(); });
                    }
                };
                this.resourceCache[url] = false;
                img.src = url;
            }
        };

        // ResourceCache::get
        // get a maybe cached image
        get(url): HTMLImageElement {
            return <HTMLImageElement>this.resourceCache[url];
        };

        // ResourceCache::isReady
        // get a maybe cached image
        isReady(): boolean {
            var ready = true;
            for (var k in this.resourceCache) {
                if (this.resourceCache.hasOwnProperty(k) &&
                    !this.resourceCache[k]) {
                    ready = false;
                }
            }
            return ready;
        };

        // ResourceCache::get
        // get a maybe cached image
        onReady(func) {
            this.readyCallbacks.push(func);
        };
    }

    var gBox: string = "img/box.png";
    export let gCache: ResourceCache = new ResourceCache();
    gCache.load(gBox);

    class Ball {
        X: number = gInitBallBox[0];
        Y: number = gInitBallBox[1];
        Width: number = gInitBallBox[2];
        Height: number = gInitBallBox[3];
        Speed: number = gBallSpeed;
        Velocity: number[] = [0, gBallSpeed];
        Direction: number[] = Normalize(this.Velocity);
        OldPos: number[] = [gInitBallBox[0] - this.Velocity[1], gInitBallBox[1] - this.Velocity[1]];
        IsHit: boolean = false;

        // Ball::Ball
        constructor() {
        }

        // Ball::BallCollision
        BallCollision(testBox, objectType, collisionFunction) {
            var a = new Line(this.X, this.Y, this.OldPos[0], this.OldPos[1]);
            var HitLoc = collisionFunction(a, testBox);
            return HitLoc;
        }

        // Ball::BallReflection
        BallReflection(testBox, objectType, collisionFunction, HitLoc) {
            var a = new Line(this.X, this.Y, this.OldPos[0], this.OldPos[1]);
            HitLoc = collisionFunction(a, testBox);
            // Find where the ball colision happened.                                                                             
            var balldir = NormalizeLine(a);
            var justBeforeHit = HitLoc.Time - 1;
            var colBallPos = [a.X2 + balldir[0] * justBeforeHit, a.Y2 + balldir[1] * justBeforeHit];
            // Calulate the reflected vector so we have the new direction.                       
            var vnew = ReflectVector(balldir, HitLoc.Normal);

            // With Players hack the colision normal so it will bouce different depending on where it hits the players box. 
            // If it hits the left size it goes left right side goes right
            if (objectType == "Player") {
                // NormalizedDistFromLeftSize the left side of the box is -0.5 right size of the box is 0.5.                                                      
                var NormalizedDistFromLeftSize = (colBallPos[0] + (this.Width / 2.0) - (testBox.X + (testBox.Width / 2.0))) / testBox.Width;
                NormalizedDistFromLeftSize = Math.min(Math.max(NormalizedDistFromLeftSize, -0.5), 0.5);
                // Move the range to be 1/4 * PI                                                                                                                  
                //      this will make normallized vector using sin and cos like this \/                                                                          
                // If it is close to the right the ball goes right if left left.                                                                                  
                NormalizedDistFromLeftSize *= (1 / 2) * Math.PI;
                vnew[0] = Math.sin(NormalizedDistFromLeftSize);
                vnew[1] = -Math.cos(NormalizedDistFromLeftSize);
            }

            this.OldPos = colBallPos;
            // From the colision point move the ball away keeping the same speed.                                                                             
            this.X = colBallPos[0] + vnew[0] * (gBallSpeed - justBeforeHit);
            this.Y = colBallPos[1] + vnew[1] * (gBallSpeed - justBeforeHit);
            // Set the new velocity given the reflected vector.                                                                                               
            this.Velocity[0] = vnew[0] * gBallSpeed;
            this.Velocity[1] = vnew[1] * gBallSpeed;
            // Mark that we have already moved the ball so we don't move it next frame                                                                        
            this.IsHit = true;
        }

        // Draw the ball centered
        // Ball::Draw
        Draw(ctx) {
            // Draw Ball
            //ctx.fillStyle = 'rgb(0, 0, 200)';
            //ctx.fillRect(this.X - this.Width / 2.0, this.Y - this.Height / 2.0, this.Width, this.Height);

            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(this.X, this.Y, gInitBallBox[2] / 2, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Ball::Move
        Move() {
            // If the ball was hit last frame don't move it as it has already been moved when the ball was hit. 
            if (!this.IsHit) {
                // Animate Ball
                this.OldPos = [this.X, this.Y];
                this.X += this.Velocity[0];
                this.Y += this.Velocity[1];
            } else {
                this.IsHit = false;
            }
        }
    }

    class Box {
        X: number;
        Y: number;
        Width: number;
        Height: number;
        constructor(x: number, y: number, width: number, height: number) {
            this.X = x;
            this.Y = y;
            this.Width = width;
            this.Height = height;
        }
    }

    function BoxFromArray(boxarray): Box {
        return new Box(boxarray[0], boxarray[1], boxarray[2], boxarray[3])
    }

    class Line {
        X1: number;
        Y1: number;
        X2: number;
        Y2: number;
        constructor(x1: number, y1: number, x2: number, y2: number) {
            this.X1 = x1;
            this.Y1 = y1;
            this.X2 = x2;
            this.Y2 = y2;
        }
    }

    function LineFromArray(linearray): Line {
        return new Line(linearray[0], linearray[1], linearray[2], linearray[3]);
    }

    // return a normal from a line
    function VectorLength(a: number[]): number {
        // a normal 
        let len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
        return len;
    }

    // return a normal from a line
    function NormalizeLine(a: Line): number[] {
        // a normal 
        let l = [a.X1 - a.X2, a.Y1 - a.Y2];
        let llen = Math.sqrt(l[0] * l[0] + l[1] * l[1]);
        let oollen = 1.0 / llen;
        l[0] = l[0] * oollen;
        l[1] = l[1] * oollen;
        return l;
    }

    // return a normal from a line
    function Normalize(a: number[]): number[] {
        // clone the vector
        let l = a.slice();
        let llen = Math.sqrt(l[0] * l[0] + l[1] * l[1]);
        let oollen = 1.0 / llen;
        l[0] = l[0] * oollen;
        l[1] = l[1] * oollen;
        return l;
    }

    // dot 2 vectors a and b
    function Dot(a: number[], b: number[]): number {
        return a[0] * b[0] + a[1] * b[1];
    }

    // d is a vector
    // n is the normal of the vector to reflect over
    //
    // Vnew = ( -2*(V dot N)*N + V )
    function ReflectVector(d: number[], n: number[]) {
        let dn: number = -2 * Dot(d, n);
        let vnew: number[] = [dn * n[0] + d[0], dn * n[1] + d[1]];
        return vnew;
    }



    function LineVsBoxInside(a: Line, b: Box) {
        let rdir: number[] = NormalizeLine(a);
        let dfx: number = 90000.0;
        let dfy: number = 90000.0;
        if (Math.abs(rdir[0]) > 0.0001) {
            dfx = 1.0 / rdir[0];
        }
        if (Math.abs(rdir[1]) > 0.0001) {
            dfy = 1.0 / rdir[1];
        }

        // time to hit left, right, bottom, top
        let t1: number = (b.X - a.X2) * dfx;
        let t2: number = (b.X + b.Width - a.X2) * dfx;
        let t3: number = (b.Y + b.Height - a.Y2) * dfy;
        let t4: number = (b.Y - a.Y2) * dfy;
        let xdir: number[] = [1, 0];
        let ydir: number[] = [0, 1];
        let tdir: number[] = [0, 1];

        // x did we hit the left wall first?
        let xmin: number = t1;
        let xmax: number = t2;
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
        let ymin: number = t3;
        let ymax: number = t4;
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
        let tmin: number = ymin;
        tdir = ydir;
        if (ymin > xmin) {
            tmin = xmin;
            tdir = xdir;
        }

        if (tmin < 0) {
            return { IsHit: false, Normal: tdir, Time: tmin };
        }

        return { IsHit: true, Normal: tdir, Time: tmin };

    }

    // Line a vs box b
    // {IsHit=false, Normal=side, Time=t}
    function LineVsBox(a: Line, b: Box) {
        let rdir: number[] = NormalizeLine(a);
        let dfx: number = 90000.0;
        let dfy: number = 90000.0;
        if (Math.abs(rdir[0]) > 0.0001) {
            dfx = 1.0 / rdir[0];
        }
        if (Math.abs(rdir[1]) > 0.0001) {
            dfy = 1.0 / rdir[1];
        }

        // time to hit left, right, bottom, top
        let t1: number = (b.X - a.X2) * dfx;
        let t2: number = (b.X + b.Width - a.X2) * dfx;
        let t3: number = (b.Y + b.Height - a.Y2) * dfy;
        let t4: number = (b.Y - a.Y2) * dfy;

        let yside: number[] = [0, 0];
        let xside: number[] = [0, 0];
        let side: number[] = [0, 0];
        let tmin: number;
        let tmax: number;
        let xmin: number;
        let ymin: number;
        let xmax: number;
        let ymax: number;

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

        let t: number;
        // if tmax < 0, ray (line) is intersecting AABB, but whole AABB is behing us
        if (tmax < 0) {
            t = tmax;
            return { IsHit: false, Normal: side, Time: 0.0 };
        }

        // if tmin > tmax, ray doesn't intersect AABB
        if (tmin > tmax) {
            t = tmax;
            return { IsHit: false, Normal: side, Time: 0.0 };
        }

        t = tmin;
        return { IsHit: true, Normal: side, Time: t };
    }

    class Game {
        Canvas: HTMLCanvasElement;
        FrontCanvas: HTMLCanvasElement;
        Ctx: CanvasRenderingContext2D;
        FrontCtx: CanvasRenderingContext2D;
        ScreenWidth: number;
        ScreenHeight: number;
        WorldWidth: number;
        WorldHight: number;
        PlayerVelocityX: number = 0;
        PlayerVelocityY: number = 0;
        WorldBox: Box;
        Player: Box;
        Field0Box: Box;
        Ball: Ball;
        Score: number = 0;
        Field: number[][] = [[]];

        BoxCanvas: HTMLCanvasElement;
        BoxCtx: CanvasRenderingContext2D;

        ScoreElement: HTMLElement;

        // Game::Game
        constructor(canvas: HTMLCanvasElement, backcanvas: HTMLCanvasElement,
            frontctx: CanvasRenderingContext2D, backctx: CanvasRenderingContext2D) {
            this.Canvas = backcanvas;
            this.FrontCanvas = canvas;
            this.Ctx = backctx;
            this.FrontCtx = frontctx;
            this.ScreenWidth = canvas.width;
            this.ScreenHeight = canvas.height;
            this.WorldWidth = canvas.width;
            this.WorldHight = canvas.height;
            this.PlayerVelocityX = 0;
            this.PlayerVelocityY = 0;
            this.WorldBox = BoxFromArray([0, 0, this.WorldWidth, this.WorldHight]);
            this.Player = BoxFromArray(gInitPlayerBox);
            this.Field0Box = BoxFromArray(gInitField0Box);
            this.ResetField();


            let img = gCache.get(gBox);

            this.BoxCanvas = document.createElement("canvas");
            this.BoxCtx = this.BoxCanvas.getContext('2d');

            this.BoxCanvas.width = gInitField0Box[2];
            this.BoxCanvas.height = gInitField0Box[3];

            this.BoxCtx.drawImage(img, 0, 0, img.width, img.height,
                0, 0, gInitField0Box[2], gInitField0Box[3]);
            this.BoxCtx.globalCompositeOperation = "multiply"; // 'source-atop';
            this.BoxCtx.fillStyle = 'red';
            this.BoxCtx.fillRect(0, 0, gInitField0Box[2], gInitField0Box[3]);

            this.ScoreElement = document.getElementById("score");
        }


        // Game::RightButtonDown
        RightButtonDown() {
            this.PlayerVelocityX = gPlayerSpeed;
        };

        // Game::LeftButtonDown
        LeftButtonDown() {
            this.PlayerVelocityX = -gPlayerSpeed;
        };

        // Game::LeftButtonUp
        LeftButtonUp() {
            this.PlayerVelocityX = 0;
        };

        // Game::RightButtonUp
        RightButtonUp() {
            this.PlayerVelocityX = 0;
        };

        // Game::ResetField
        ResetField() {
            this.Ball = new Ball();
            this.Score = 0;

            var widthInBoxes = this.WorldWidth / gInitField0Box[2];
            let stars: string = "";
            for (let i: number = 0; i < widthInBoxes; i++) {
                stars += '*';
            }
            var a = [
                stars,
                stars,
                stars,
                "",
                "",
                "",
                stars,
                stars,
            ];

            this.Field = [];
            for (var i = 0; i < a.length; i++) {
                var temp: number[] = [];
                for (var j = 0; j < a[i].length; j++) {
                    if (a[i][j] === "*") {
                        temp.push(1);
                    }
                }
                this.Field.push(temp);
            }
        };

        // Game::Draw 
        Draw() {
            var ctx = this.Ctx;

            // clear last frame
            ctx.fillStyle = 'rgb(200, 200, 200)';
            ctx.fillRect(0, 0, this.Canvas.width, this.Canvas.height);

            // Draw Player 
            ctx.fillStyle = 'rgb(0, 200, 0)';
            // ctx.fillRect(this.Player.X, this.Player.Y, this.Player.Width, this.Player.Height);
            let img = gCache.get(gBox);
            ctx.drawImage(img, 0, 0, img.width, img.height,
                this.Player.X, this.Player.Y, this.Player.Width, this.Player.Height);


            this.Ball.Draw(ctx);

            var bx = 0;
            var by = 0;
            var a = null;
            var hitloc = null;
            var ballv = 0;
            var vnew = 0;
            var balldir = 0;
            var justBeforeHit = 0;
            var colBallPos = [0, 0, 0, 0];

            // Draw Field
            ctx.fillStyle = 'rgb(200, 0, 0)';
            for (by = 0; by < this.Field.length; by++) {
                let row = this.Field[by];
                var y = this.Field0Box.Y + by * this.Field0Box.Height;
                for (bx = 0; bx < row.length; bx++) {
                    if (row[bx] == 1) {
                        var x = this.Field0Box.X + bx * this.Field0Box.Width;
                        ctx.drawImage(this.BoxCanvas, 0, 0, this.BoxCanvas.width, this.BoxCanvas.height,
                            x, y, this.Field0Box.Width, this.Field0Box.Height);

                    }
                }
            }

            this.Ball.Move();

            // did ball hit field
            var testBox = new Box(0, 0, this.Field0Box.Width, this.Field0Box.Height);
            // loop backward so I hit the first row first. 
            for (by = this.Field.length - 1; by >= 0; by--) {
                let row = this.Field[by];
                testBox.Y = this.Field0Box.Y + by * this.Field0Box.Height;
                for (bx = 0; bx < row.length; bx++) {
                    if (row[bx] == 1) {
                        testBox.X = this.Field0Box.X + bx * this.Field0Box.Width;

                        let HitLoc = this.Ball.BallCollision(testBox, "Field", LineVsBox);
                        if (HitLoc.IsHit && HitLoc.Time > 0 && HitLoc.Time < this.Ball.Speed) {
                            // Delete the box we hit. 
                            row[bx] = 0;
                            this.Ball.BallReflection(testBox, "Field", LineVsBox, HitLoc);
                            this.Score += 1;
                        }
                    }
                }
            }

            this.ScoreElement.innerText = "Score: " + this.Score;

            // Check to see if the ball is going out of the world
            let HitLoc = this.Ball.BallCollision(this.WorldBox, "World", LineVsBoxInside);
            if (HitLoc.IsHit && HitLoc.Time > 0 && HitLoc.Time < this.Ball.Speed && HitLoc.Normal[1] !== -1) {
                this.Ball.BallReflection(this.WorldBox, "World", LineVsBoxInside, HitLoc);
            }

            // Check to see if the ball is going out of the world
            HitLoc = this.Ball.BallCollision(this.Player, "Player", LineVsBox);
            if (HitLoc.IsHit && HitLoc.Time > 0 && HitLoc.Time < this.Ball.Speed) {
                this.Ball.BallReflection(this.Player, "Player", LineVsBox, HitLoc);
            }

            this.Player.X += this.PlayerVelocityX;
            if (this.Player.X + this.Player.Width > this.WorldWidth) {
                this.Player.X = this.WorldWidth - this.Player.Width;
            }
            if (this.Player.X < 0) {
                this.Player.X = 0;
            }

            //render the buffered canvas onto the original canvas element
            this.FrontCtx.drawImage(this.Canvas, 0, 0);
        }
    }


    export function newGame() {
        let gGame: Game = null;
        console.log("myNewAnim");
        let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas');
        if (canvas.getContext) {
            let backcanvas: HTMLCanvasElement = document.createElement('canvas');
            backcanvas.width = canvas.width;
            backcanvas.height = canvas.height;
            let backctx: CanvasRenderingContext2D = backcanvas.getContext('2d');
            let frontctx: CanvasRenderingContext2D = canvas.getContext('2d');

            if (gGame === null) {
                console.log("myNewAnim");
                gGame = new Game(canvas, backcanvas, frontctx, backctx);
                let id = setInterval(updateFrame, 60);
            }
        }

        document.addEventListener('keyup', function (event) {
            if (event.keyCode == 37) {
                if (gGame !== null) {
                    gGame.LeftButtonUp();
                }
            } else if (event.keyCode == 39) {
                if (gGame !== null) {
                    gGame.RightButtonUp();
                }
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.keyCode == 37) {
                if (gGame !== null) {
                    gGame.LeftButtonDown();
                }
            } else if (event.keyCode == 39) {
                if (gGame !== null) {
                    gGame.RightButtonDown();
                }
            } else if (event.keyCode == 32) {
                if (gGame !== null) {
                    gGame.ResetField();
                }
            }
        });

        function updateFrame() {
            gGame.Draw();
        }
    }
}

breakout.gCache.onReady(breakout.newGame);
