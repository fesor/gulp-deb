Build DEB Packages with Gulp
==============================

Deb archives is a great way for distribute your software package

## Basic Usage

Install plugin:
```
npm install --saveDev gulp-deb
```

Then you can use it in your `gulpfile`

```javascript
var gulp = require('gulp);
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
         short_description: 'some short description',
         long_description: 'some long description'
       }))
       .pipe(gulp.dest('builds/'));
});
```

## TODO

 - More control over DEB package metadata
 - Add `md5sums` option for generate corresponding file with checksum for every file

## Contribution

Feel free to contribute! Any help will be useful!
