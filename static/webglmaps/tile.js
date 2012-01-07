goog.require('goog.Disposable');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('webglmaps.TileCoord');
goog.require('webglmaps.TileUrl');

goog.provide('webglmaps.Tile');



/**
 * @constructor
 * @param {WebGLRenderingContext} gl WebGL rendering context.
 * @param {webglmaps.TileCoord} tileCoord Tile coord.
 * @param {webglmaps.TileUrl} tileUrl Tile URL.
 * @extends {goog.Disposable}
 */
webglmaps.Tile = function(gl, tileCoord, tileUrl) {

  goog.base(this);

  /**
   * @private
   * @type {WebGLRenderingContext}
   */
  this.gl_ = gl;

  this.tileCoord_ = tileCoord;

  /**
   * @private
   * @type {WebGLBuffer}
   */
  this.vertexAttribBuffer_ = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexAttribBuffer_);
  var n = 1 << tileCoord.z;
  var x = tileCoord.x, y = n - tileCoord.y - 1;
  var positions = [
    x / n, y / n, 0, 1,
    (x + 1) / n, y / n, 1, 1,
    x / n, (y + 1) / n, 0, 0,
    (x + 1) / n, (y + 1) / n, 1, 0
  ];
  gl.bufferData(
      gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  /**
   * @private
   * @type {WebGLTexture}
   */
  this.texture_ = null;

  var image = new Image();
  image.crossOrigin = '';
  image.src = tileUrl(this.tileCoord_);

  /**
   * @private
   * @type {?number}
   */
  this.imageLoadListener_ = goog.events.listen(image,
      goog.events.EventType.LOAD, goog.bind(this.onImageLoad_, this));

};
goog.inherits(webglmaps.Tile, goog.Disposable);


/**
 * @protected
 */
webglmaps.Tile.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  var gl = this.gl_;
  this.gl_ = null;
  gl.deleteBuffer(this.vertexAttribBuffer_);
  if (!goog.isNull(this.texture_)) {
    gl.deleteTexture(this.texture_);
    this.texture_ = null;
  }
  if (!goog.isNull(this.imageLoadListener_)) {
    goog.events.unlistenByKey(this.imageLoadListener_);
    this.imageLoadListener_ = null;
  }
};


/**
 * @param {number} positionAttribLocation Position attribute location.
 * @param {number} texCoordAttribLocation Texture coordinate attribute location.
 * @param {WebGLUniformLocation} textureAttribLocation
 *     Texture attribute location.
 */
webglmaps.Tile.prototype.draw = function(
    positionAttribLocation, texCoordAttribLocation, textureAttribLocation) {
  var gl = this.gl_;
  if (this.hasTexture()) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexAttribBuffer_);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 16, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture_);
    gl.uniform1i(textureAttribLocation, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
};


/**
 * @return {boolean} Has texture?
 */
webglmaps.Tile.prototype.hasTexture = function() {
  return !goog.isNull(this.texture_);
};


/**
 * @param {goog.events.BrowserEvent} event Event.
 * @private
 */
webglmaps.Tile.prototype.onImageLoad_ = function(event) {
  var image = /** @type {Image} */ event.currentTarget;
  var gl = this.gl_;
  this.texture_ = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.texture_);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);
  goog.events.unlistenByKey(this.imageLoadListener_);
  this.imageLoadListener_ = null;
};