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

  var contents = [
    'Package: <%= name %>',
    'Version: <%= version %>',
    'Maintainer: <%= maintainer.name %> <<%= maintainer.email %>>'
  ];
  
  if (options.architecture) {
    contents.push('Architecture: <%= architecture %>');
  } else {
    contents.push('Architecture: all');
  }
  
  if (options.installedSize) {
    contents.push('Installed-Size: <%= installedSize %>');
  }
  
  if (options.preDepends) {
    if (options.preDepends instanceof Array) {
      options.preDepends = options.preDepends.join(',');
    }
    
    contents.push('Pre-Depends: <%= preDepends %>');
  }
  
  if (options.depends) {
    if (options.depends instanceof Array) {
      options.depends = options.depends.join(',');
    }
  
    contents.push('Depends: <%= depends %>');
  }
  
  if (options.recommends) {
    if (options.recommends instanceof Array) {
      options.recommends = options.recommends.join(',');
    }
  
    contents.push('Recommends: <%= recommends %>');
  }
  
  if (options.suggests) {
    if (options.suggests instanceof Array) {
      options.suggests = options.suggests.join(',');
    }
    
    contents.push('Suggests: <%= suggests %>');
  }
  
  if (options.enhances) {
    if (options.enhances instanceof Array) {
      options.enhances = options.enhances.join(',');
    }
    
    contents.push('Enhances: <%= enhances %>');
  }
  
  if (options.section) {
    contents.push('Section: <%= section %>');
  }
  
  if (options.priority) {
    contents.push('Priority: <%= priority %>');
  }
  
  if (options.homepage) {
    contents.push('Homepage: <%= homepage %>');
  }
  
  contents.push('Description: <%= short_description %>');
  contents.push(' <%= long_description %>');

  return lodash.template(contents.join('\n') + '\n')(options);
}
