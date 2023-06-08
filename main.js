'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let point; // variable to display a point on a surface
let plane; // variable to display a plane on the background
let userPointCoord; // the coordinate of a point on the texture
let userRotAngle; // texture rotation angle

let camera;
let textureVID, textureORIG, video, track;

let step = 0;
let sphereCoordinates = [0, 0, 0]
let audio;
let panner;
let sphere;
let ctx;
let filter;

function deg2rad(angle) {
  return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.countText = 0;
  this.count = 0;

  this.BufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  this.TextureBufferData = function(points) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

    this.countText = points.length / 2;
  }
  // Draw the surface
  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexture);


    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }
  // Draw a point on the surface
  this.DrawPoint = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  }
}

// Function to create point geometry
function CreateSphereSurface(r = 0.1) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sphereSurfaceDate(r, lon, lat);
      vertexList.push(v1.x, v1.y, v1.z);
      lat += 0.05;
    }
    lat = -Math.PI * 0.5
    lon += 0.05;
  }
  return vertexList;
}

function sphereSurfaceDate(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribTexture = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  // Variables to pass to the shader
  this.iUserPoint = -1;
  this.irotAngle = 0;
  this.iUP = -1;
  this.iTMU = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  readValues();
  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();
  let noRotationView = m4.identity();


  step += 0.02;
  moveCircleSphere(step);
  noRotationView = spaceball.getViewMatrix();



  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(m4.multiply(rotateToPointZero, m4.axisRotation([0, 1, 0], angle)), modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);


  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  let matAccum2 = m4.multiply(rotateToPointZero, noRotationView);
  let matAccum3 = m4.multiply(translateToPointZero, matAccum2);
  let modelViewProjection = m4.multiply(projection, matAccum3);




  // gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);



  // gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewProjection);
  // gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, m4.multiply(projection, matAccum1));
  gl.bindTexture(gl.TEXTURE_2D, textureVID);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    video
  );
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(m4.translation(-2, -2, 0), modelViewProjection));
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, modelViewProjection);
  plane.Draw();

  // Passing variables to the shader
  gl.uniform1i(shProgram.iTMU, 0);
  gl.enable(gl.TEXTURE_2D);
  gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]);
  gl.uniform1f(shProgram.irotAngle, userRotAngle);
  gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]); //giving coordinates of user point
  gl.uniform1f(shProgram.irotAngle, userRotAngle);
  camera.ApplyLeftFrustum();
  // gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(modelViewProjection, m4.multiply(camera.mLeftModelViewMatrix, camera.mLeftProjectionMatrix)));
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(modelViewProjection, camera.mLeftModelViewMatrix));

  projection = camera.mLeftProjectionMatrix;
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, m4.multiply(projection, matAccum1));
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.bindTexture(gl.TEXTURE_2D, textureORIG);
  gl.colorMask(true, false, false, false);
  surface.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);
  camera.ApplyRightFrustum();
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(modelViewProjection, camera.mRightModelViewMatrix));

  projection = camera.mRightProjectionMatrix;
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, m4.multiply(projection, matAccum1));
  gl.colorMask(false, true, true, false);
  surface.Draw();

  let translation = damping(map(userPointCoord.x, 0, 1, 0, 36), map(userPointCoord.y, 0, 1, 0, Math.PI * 2))
  gl.uniform3fv(shProgram.iUP, [translation.x, translation.y, translation.z]);

  // Change the rotation angle to display a point on a surface without a texture
  gl.uniform1f(shProgram.irotAngle, 1100);
  
  panner?.setPosition(...sphereCoordinates);
  gl.bindTexture(gl.TEXTURE_2D, null);
  projection = m4.perspective(deg2rad(90), 1, 0.1, 100);
  const translationSphere = m4.translation(...sphereCoordinates);
  const modelViewMatrix = m4.multiply(translationSphere, modelView);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
  sphere.Draw();

  point.DrawPoint();
  gl.colorMask(true, true, true, true);
}
function requestNewFrame() {
  draw();
  window.requestAnimationFrame(requestNewFrame)
}
function readValues() {
  let eyeSeparation = document.getElementById("eyeseparation").value;
  camera.mEyeSeparation = eyeSeparation
  let fieldOfView = document.getElementById("fieldofview").value;
  camera.mFOV = fieldOfView
  let nearClippingDistance = document.getElementById("nearclippingdistance").value;
  camera.mNearClippingDistance = parseFloat(nearClippingDistance);
  let convergence = document.getElementById("convergence").value;
  camera.mConvergence = convergence
}

function CreateSurfaceData() {
  let C = 1;
  let vertexList = [];
  let x = 0;
  let y = 0;
  let z = 0;
  let f_u = 0;
  let a_uv = 0;
  let r_uv = 0;
  for (let u = -90; u <= 90; u += 2) {
    for (let v = 0; v <= 180; v += 2) {
      f_u = -deg2rad(u) / Math.sqrt(C + 1) + Math.atan(Math.sqrt(C + 1) * Math.tan(deg2rad(u)));
      a_uv = 2 / (C + 1 - C * Math.sin(deg2rad(v)) * Math.sin(deg2rad(v)) * Math.cos(deg2rad(u)) * Math.cos(deg2rad(u)));
      r_uv = (a_uv / Math.sqrt(C)) * Math.sqrt((C + 1) * (1 + C * Math.sin(deg2rad(u)) * Math.sin(deg2rad(u)))) * Math.sin(deg2rad(v));
      x = r_uv * Math.cos(f_u);
      y = r_uv * Math.sin(f_u);
      z = (Math.log(deg2rad(v) / 2) + a_uv * (C + 1) * Math.cos(deg2rad(v))) / Math.sqrt(C);
      vertexList.push(x, y, z);
    }
  }
  return vertexList;
}

function map(val, f1, t1, f2, t2) {
  let m;
  m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
  return Math.min(Math.max(m, f2), t2);
}

function CreateTextureData() {
  let vertexList = [];
  const m = 6;
  const b = 6 * m;

  // Surface of Revolution with Damping Circular Waves
  for (let r = 0; r <= b; r += 0.2) {
    for (let uGeg = 0; uGeg < 360; uGeg += 5) {
      let u = map(r, 0, b, 0, 1);
      let v = map(uGeg, 0, 360, 0, 1);
      vertexList.push(u, v);
      u = map(r + 0.2, 0, b, 0, 1);
      vertexList.push(u, v);
      u = map(r, 0, b, 0, 1);
      v = map(uGeg + 5, 0, 360, 0, 1);
      vertexList.push(u, v);
      u = map(r + 0.2, 0, b, 0, 1);
      v = map(uGeg, 0, 360, 0, 1);
      vertexList.push(u, v);
      u = map(r + 0.2, 0, b, 0, 1);
      v = map(uGeg + 5, 0, 360, 0, 1);
      vertexList.push(u, v);
      u = map(r, 0, b, 0, 1);
      v = map(uGeg + 5, 0, 360, 0, 1);
      vertexList.push(u, v);
    }
  }
  return vertexList;
}

function damping(r, u) {
  // Equations parameters
  const m = 6;
  const b = 6 * m;
  const a = 4 * m;
  const n = 0.1;
  const fi = 0;
  const omega = m * Math.PI / b;

  // Point parameters
  let x = r * Math.cos(u);
  let y = r * Math.sin(u);
  let z = a * Math.pow(Math.E, -n * r) * Math.sin(omega * r + fi);

  // Transform coordinates to make surface smaller
  return { x: x / 20, y: y / 20, z: z / 20 }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
  video = document.createElement('video');
  video.setAttribute('autoplay', true);
  window.vid = video;
  getWebcam();
  CreateWebCamTexture();
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  // Parameters for passing variables to the shader
  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');
  shProgram.irotAngle = gl.getUniformLocation(prog, 'rotA');
  shProgram.iUP = gl.getUniformLocation(prog, 'translateUP');
  shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

  const sphereData = CreateSphereData(0.5, 500, 500);
  sphere = new Model('Sphere');
  sphere.BufferData(sphereData.vertexList, sphereData.textureList);


  point = new Model('Point');
  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());
  LoadTexture()
  surface.TextureBufferData(CreateTextureData());
  point.BufferData(CreateSphereSurface())
  plane = new Model('Plane');
  let planeSize = 8.0;
  plane.BufferData([0.0, 0.0, 0.0, planeSize, 0.0, 0.0, planeSize, planeSize, 0.0, planeSize, planeSize, 0.0, 0.0, planeSize, 0.0, 0.0, 0.0, 0.0]);
  plane.TextureBufferData([1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0]);

  gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  userPointCoord = { x: 0.1, y: 0.1 };
  userRotAngle = 0.0;
  let canvas;
  camera = new StereoCamera(
    50,
    0.2,
    1,
    Math.PI / 8,
    8,
    20
  );
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
  setAudioParams()
  initAudioContext();
  requestNewFrame();
}

// Function of loading a picture as a texture for a surface
function LoadTexture() {
  textureORIG = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureORIG);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const image = new Image();
  image.crossOrigin = 'anonymus';

  // String with source of the texture
  image.src = "https://raw.githubusercontent.com/gassniffer8/university/CGW/Polished_metal_texture.jpeg";
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, textureORIG);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );

    draw();
  }
}

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function(stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function(e) {
    console.error('Rejected!', e);
  });
}

function CreateWebCamTexture() {
  textureVID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureVID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function StereoCamera(
  Convergence,
  EyeSeparation,
  AspectRatio,
  FOV,
  NearClippingDistance,
  FarClippingDistance
) {
  this.mConvergence = Convergence;
  this.mEyeSeparation = EyeSeparation;
  this.mAspectRatio = AspectRatio;
  this.mFOV = FOV;
  this.mNearClippingDistance = NearClippingDistance;
  this.mFarClippingDistance = FarClippingDistance;

  this.mLeftProjectionMatrix = null;
  this.mRightProjectionMatrix = null;

  this.mLeftModelViewMatrix = null;
  this.mRightModelViewMatrix = null;

  this.ApplyLeftFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-b * this.mNearClippingDistance) / this.mConvergence;
    right = (c * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mLeftProjectionMatrix = m4.frustum(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to right
    this.mLeftModelViewMatrix = m4.translation(
      this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.ApplyRightFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-c * this.mNearClippingDistance) / this.mConvergence;
    right = (b * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mRightProjectionMatrix = m4.frustum(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to left
    this.mRightModelViewMatrix = m4.translation(
      -this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };
}
let angle = 0
function onRead() {
  angle = Math.atan2(magSensor.y, magSensor.x)
  if (angle < 0) {
    angle += Math.PI * 2
  }
}
let magSensor = new Magnetometer()
magSensor.addEventListener("reading", onRead)
magSensor.start();



const getSoundBuffer = (soundFileName) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", soundFileName, true);
    request.responseType = "arraybuffer";
    request.onload = function(e) {
      resolve(request.response);
    };
    request.send();
  })
}

let box;
let source

function setAudioParams() {
  box = document.getElementById('boxik');
  audio = document.getElementById('audio');

  audio.addEventListener('play', () => {
    if (!ctx) {
      ctx = new AudioContext();
      source = ctx.createMediaElementSource(audio);
      panner = ctx.createPanner();
      filter = ctx.createBiquadFilter();

      source.connect(panner);
      panner.connect(filter);
      filter.connect(ctx.destination);

      filter.type = 'highpass';
      filter.Q.value = 0.5;
      filter.frequency.value = 5000;
      filter.gain.value = 7;
      ctx.resume();
    }
  })


  audio.addEventListener('pause', () => {
    console.log('pause');
    ctx.resume();
  })
}

function initAudioContext() {
  box.addEventListener('change', function() {
    if (box.checked) {
      panner.disconnect();
      panner.connect(filter);
      filter.connect(ctx.destination);
    } else {
      panner.disconnect();
      panner.connect(ctx.destination);
    }
  });
  audio.play();
}

function CreateSphereData(multiplier, iSegments, jSegments) {
  const vertexList = [];
  const textureList = [];

  for (let i = 0; i <= iSegments; i++) {
    const theta = i * Math.PI / iSegments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let j = 0; j <= jSegments; j++) {
      const phi = j * 2 * Math.PI / jSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const x = multiplier * cosPhi * sinTheta;
      const y = multiplier * cosTheta;
      const z = multiplier * sinPhi * sinTheta;

      vertexList.push(x, y, z)

      const u = 1 - (j / jSegments);
      const v = 1 - (i / iSegments);
      textureList.push(u, v);
    }
  }

  return { vertexList, textureList };
}

function moveCircleSphere(angle, offsetX = 0, offsetZ = -5, radius = 4) {
  sphereCoordinates[0] = offsetX + Math.cos(angle) * radius;
  sphereCoordinates[2] = offsetZ + Math.sin(angle) * radius;
}