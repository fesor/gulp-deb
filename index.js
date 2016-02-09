'use strict';

var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var assign = require('object-assign');
var tar = require('tar-stream');
var lodash = require('lodash');
var ar = require('./lib/ar');
var streamToBuffer = require('stream-to-buffer');
var zlib = require('zlib');
var fs = require('fs');

module.exports = function (filename, options) {
  if (!filename) {
    throw new gutil.PluginError('gulp-tar', '`filename` required');
  }

  var firstFile;
  var archive = tar.pack();

  return through.obj(function (file, enc, cb) {
    if (file.relative === '') {
      cb();
      return;
    }

    if (firstFile === undefined) {
      firstFile = file;
    }

    gutil.log('Packing:', file.relative);

    if(file.stat.isSymbolicLink()) {
      archive.entry({
        name: file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : ''),
        mode: file.stat.mode,
        type: 'symlink',
        linkname: fs.readlinkSync(file.path)
      });

      return cb();
    } else if(file.stat.isDirectory()) {
      archive.entry({
        name: file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : ''),
        mode: file.stat.mode,
        type: 'directory',
      });

      return cb();
    } else {
      archive.entry({
        name: file.relative.replace(/\\/g, '/') + (file.isNull() ? '/' : ''),
        mode: file.stat.mode,
        size: file.stat.size,
        uid: 0,
        gid: 0,
        type: 'file',
        mtime: file.stat.mtime
      }, file.contents);

      return cb();
    }
  }, function (cb) {
    if (firstFile === undefined) {
      gutil.log('First file is undefined!');

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

  var archive = tar.pack();

  archive.entry({name: 'control'}, new Buffer(createControlFile(options)));

  if (options.scripts) {

    // Adding preinst, postinst, prerm, postrm to package

    for (var script in options.scripts) {
      if (options.scripts.hasOwnProperty(script)) {
        var content = options.scripts[script];

        archive.entry({name: script}, new Buffer(content));
      }
    }
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

  var controlFileTemplate = [
    'Package: <%= name %>',
    'Version: <%= version %>',
    'Maintainer: <%= maintainer.name %> <<%= maintainer.email %>>'
  ];

  checkFieldOption('architecture', 'Architecture: <%= architecture %>', false, 'all');
  checkFieldOption('installedSize', 'Installed-Size: <%= installedSize %>');
  checkFieldOption('preDepends', 'Pre-Depends: <%= preDepends %>', true);
  checkFieldOption('depends', 'Depends: <%= depends %>', true);
  checkFieldOption('recommends', 'Recommends: <%= recommends %>', true);
  checkFieldOption('suggests', 'Suggests: <%= suggests %>', true);
  checkFieldOption('enhances', 'Enhances: <%= enhances %>', true);
  checkFieldOption('section', 'Section: <%= section %>');
  checkFieldOption('priority', 'Priority: <%= priority %>');
  checkFieldOption('homepage', 'Homepage: <%= homepage %>');

  controlFileTemplate.push('Description: <%= short_description %>');
  controlFileTemplate.push(' <%= long_description %>');

  return lodash.template(controlFileTemplate.join('\n') + '\n')(options);

  /**
   * @param {string} prop
   * @param {string} template
   * @param {boolean} [canBeArray=false]
   * @param {string=} defaultValue
     */
  function checkFieldOption (prop, template, canBeArray, defaultValue) {
    canBeArray = canBeArray === true;
    if (!options.hasOwnProperty(prop) || !options[prop]) {
      if (undefined === defaultValue) {
        return;
      }

      options[prop] = defaultValue;
    }

    if (canBeArray && Array.isArray(options[prop])) {
      options[prop] = options[prop].join(',');
    }

    controlFileTemplate.push(template);
  }
}
