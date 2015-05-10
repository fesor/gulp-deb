var assign = require('object-assign');
var path = require('path');

module.exports = {
  Archive: Archive
};

function Archive (options) {
  options = assign({
    uid: 0,
    gid: 0,
    mode: 420
  }, options);

  this.uid = options.uid;
  this.gid = options.gid;
  this.mode = options.mode;
  this.files = [];
}

Archive.prototype.append = function (fileBuffer, options) {
  if (!options.name) {
    throw new Error("File name is required");
  }

  var name = options.name;
  var size = fileBuffer.length;

  var stats = assign({
    mtime: new Date(),
    uid: this.uid,
    gid: this.gid,
    mode: this.mode
  }, options);

  var paddedSize = getPaddingBytes(size, 2);
  if(paddedSize > 0) {
    fileBuffer = Buffer.concat([fileBuffer,
      new Buffer(padLF(paddedSize), "ascii")], size + paddedSize);
  }

  var header = buildHeader(name,
    (stats.mtime.getTime()/1000) + "",
    stats.uid + "",
    stats.gid + "",
    stats.mode.toString(8),
    size + "");

  if (!Buffer.isBuffer(fileBuffer)) {
    console.log(fileBuffer);
  }

  this.files.push({
    header: header,
    contents: fileBuffer
  });

  return this;
};

Archive.prototype.finalize = function () {

  var contents = new Buffer("!<arch>\n", "ascii");

  this.files.forEach(function (file) {
    contents = Buffer.concat([contents, file.header, file.contents]);
  });

  return contents;
};

function buildHeader(name, ts, uid, gid, mode, size) {
  var header = strictWidthField(name, 16)
    + strictWidthField(ts, 12)
    + strictWidthField(uid, 6)
    + strictWidthField(gid, 6)
    + strictWidthField(mode, 8)
    + strictWidthField(size, 10)
    + "`\n";

  return new Buffer(header, "ascii");
}

function strictWidthField(str, width) {
  if(str.length>width) {
    return str.substring(0, width);
  } else {
    return padWhitespace(str, width);
  }
}

/**
 * Given something of size *size* bytes that needs to be aligned by *alignment*
 * bytes, returns the total number of padding bytes that need to be appended to
 * the end of the data.
 */
function getPaddingBytes(size, alignment) {
  return (alignment - (size % alignment)) % alignment;
}

function padWhitespace(str, width) {
  while(str.length<width) {
    str += " ";
  }
  return str;
}

function padLF(width) {
  var str = "";
  while(str.length<width) {
    str += "\n";
  }
  return str;
}

/**
 * Trims trailing whitespace from the given string (both ends, although we
 * only really need the RHS).
 */
function trimWhitespace(str) {

  return String.prototype.trim ?
    str.trim() : str.replace(/^\s+|\s+$/gm, '');
}

/**
 * Trims trailing NULL characters.
 */
function trimNulls(str) {
  return str.replace(/\0/g, '');
}

