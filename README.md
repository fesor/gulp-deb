Build DEB Packages with Gulp
==============================

**Note**: This plugin is not ready to use in production

Deb archives is a great way for distribute your software package

## Basic Usage

Install plugin:
```
npm install --saveDev gulp-deb
```

Then you can use it in your `gulpfile`

```javascript
var gulp = require('gulp');
var deb = require('gulp-deb');

gulp.task('build', function () {

  return gulp
    .src([
      'src/**',
      'node_modules/**',
      '!**/.git/**'
    ], { base: process.cwd() })
    .pipe(deb('example.deb', {
      name: 'example',
      version: '1',
      maintainer: {
        name: 'John Doe',
        email: 'john.doe@example.org'
      },
      architecture: 'all',     // Optional. String. Architecture
      installedSize: 1024,     // Optional. Integer. Installed-Size, KiB.
      preDepends: [
        'dpkg (>= 1.15.6)'
      ],                       // Optional. Array or String. Pre-Depends
      depends: [ 
        'libc6 (>= 2.1)' 
      ],                       // Optional. Array or String. Depends
      recommends: null,        // Optional. Array or String. Recommends
      suggests: null,          // Optional. Array or String. Suggests
      enhances: null,          // Optional. Array or String. Enhances
      section: 'devel',        // Optional. String. Section
      priority: 'optional',    // Optional. String. Priority
      homepage: 'example.org', // Optional. String. Homepage
      short_description: 'some short description',
      long_description: 'some long description'
    }))
    .pipe(gulp.dest('builds/'));
});
```

More information about package control files [here](http://www.debian.org/doc/manuals/debian-faq/ch-pkg_basics#s-controlfile).

## Debian preinst, postinst, prerm, and postrm script

These files are executable scripts which are automatically run before or after a package is installed. Read more [here](http://www.debian.org/doc/manuals/debian-faq/ch-pkg_basics#s-maintscripts).

```javascript
var gulp = require('gulp');
var deb = require('gulp-deb');
var fs = require("fs");

gulp.task('build', function () {

  var preinstContent = fs.readFileSync("scripts/preinst", "utf8");
  var postrmContent = fs.readFileSync("scripts/postrm", "utf8");

  return gulp
    .src([
      'src/**',
      'node_modules/**',
      '!**/.git/**'
    ], { base: process.cwd() })
    .pipe(deb('example.deb', {
      name: 'example',
      version: '1.0.0-1',
      maintainer: {
        name: 'John Doe',
        email: 'john.doe@example.org'
      },
      short_description: 'some short description',
      long_description: 'some long description',
      //...
      scripts: {
        preinst: preinstContent,
        postrm: postrmContent
      }
    }))
    .pipe(gulp.dest('builds/'));
});
```

## TODO

 - Add `md5sums` option for generate corresponding file with checksum for every file

## Contribution

Feel free to contribute! Any help will be useful!
