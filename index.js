'use strict';

var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var assign = require('object-assign');
var archiver = require('archiver');
var lodash = require('lodash');
var ar = require('./lib/ar');
var streamToBuffer = require('stream-to-buffer');
var zlib = require('zlib');

module.exports = function (filename, options) {
  if (!filename) {
    throw new gutil.PluginError('gulp-tar', '`filename` required');
  }

  var firstFile;
  var archive = archiver('tar');

  return through.obj(function (file, enc, cb) {
    if (file.relative === '') {
      cb();
      return;
    }

    if (firstFile === undefined) {
      firstFile = file;
    }

    archive.append(file.contents, {
      name: file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : ''),
      mode: file.stat && file.stat.mode
    });

    cb();
  }, function (cb) {
    if (firstFile === undefined) {
      cb();
      return;
    }

    archive.finalize();

    createDeb(archive, options, function (deb) {

      this.push(new gutil.File({
        cwd: firstFile.cwd,
        base: firstFile.base,
        path: path.join(firstFile.base, filename),
        contents: deb
      }));

      cb();
    }.bind(this))
  });

};

function createDeb (data, options, cb) {

  var deb = new ar.Archive();
  streamToBuffer(data, compress(function (err, dataBuffer) {

    generateControl(options, compress(function (err, controlBuffer) {

      cb(deb
          .append(generateDebianBinary(), {
            name: 'debian-binary'
          })
          .append(controlBuffer, {
            name: 'control.tar.gz'
          })
          .append(dataBuffer, {
            name: 'data.tar.gz'
          })
          .finalize()
      )
    }))
  }));
}

function generateControl(options, cb) {

  var archive = archiver('tar');

  archive.append(new Buffer(createControlFile(options)), {
    name: 'control'
  });

  if (options.post_install) {
    archive.append(new Buffer(options.post_install), {
      name: 'postinst'
    });
  }

  if (options.pre_install) {
    archive.append(new Buffer(options.pre_install), {
      name: 'prerm'
    });
  }

  streamToBuffer(archive, cb);
  archive.finalize();
}

function generateDebianBinary() {

  return new Buffer('2.0\n');
}

function compress (cb) {

  return function (err, buffer) {
    if (err) {
      return cb(err);
    }

    zlib.gzip(buffer, cb);
  }
}

function createControlFile (options) {

  return lodash.template([
    'Package: <%= name %>',
    'Version: <%= version %>',
    'Maintainer: <%= maintainer.name %> <<%= maintainer.email %>>',
    'Architecture: all',
    'Description: <%= short_description %>',
    ' <%= short_description %>'
  ].join('\n') + '\n')(options);
}
