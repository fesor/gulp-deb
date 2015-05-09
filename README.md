Build DEB Packages with Gulp
==============================

Deb archives is a great way for distribute your software package

## Basic Usage

var gulp = require('gulp);
var deb = require('gulp-deb');

```javascript
function buildPackage () {

   return gulp
     .src([
        // this is example for Symfony2 App Directory structure
        'app/**',
        '!app/cache',
        '!app/logs',
        '!app/config/parameters.yml',
        'src/**',
        'vendor/**'
        'web/**',
        '!**/.git/**
     ], {base: process.cwd()})
     .pipe(deb('build.deb', {
         maintainer: {
           name: 'John Doe',
           email: 'john.doe@example.org'
         },
         short_description: 'the short description',
         long_description: 'the long description added to the debian package'
     })
     .pipe(gulp.dest('builds/'))
}
```

## TODO

 - More control over DEB package metadata
 - Add `md5sums` option for generate corresponding file with checksum for every file
