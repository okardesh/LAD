var gulp = require('gulp');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var rename = require('gulp-rename');
var cleanCSS = require('gulp-clean-css');
var del = require('del');
 
/* Not all tasks need to use streams, a gulpfile is just another node program
 * and you can use all packages available on npm, but it must return either a
 * Promise, a Stream or take a callback and call it
 */
function beforeClean() {
  // You can use multiple globbing patterns as you would with `gulp.src`,
  // for example if you are using del 2.0 or above, return its promise
  return del([ 'public/dist/css/main-min.css', 'public/dist/js/main-min.js' ]);
}

function afterClean() {
  // You can use multiple globbing patterns as you would with `gulp.src`,
  // for example if you are using del 2.0 or above, return its promise
  return del([ 'public/dist/css/main.css', 'public/dist/js/main.js' ]);
}
 
/*
 * Define our tasks using plain functions
 */
function styles() {
  return gulp.src(['public/src/css/style.css', 'public/src/css/custom.css'])
    .pipe(concat('main.css'))
    .pipe(cleanCSS())
    // pass in options to the stream
    .pipe(rename({
      basename: 'main',
      suffix: '-min'
    }))
    .pipe(gulp.dest('public/dist/css/'));
}
 
function scripts() {
  return gulp.src(['public/src/js/custom.js', 'public/src/js/statistic.js'], { sourcemaps: true })
    .pipe(babel())
    .pipe(concat('main.js'))
    .pipe(minify())
    .pipe(gulp.dest('public/dist/js/'));
  
}
 
function watch() {
  gulp.watch(['public/src/css/style.css', 'public/src/css/custom.css'], gulp.series(styles, afterClean));
  gulp.watch(['public/src/js/custom.js', 'public/src/js/statistic.js'], gulp.series(scripts, afterClean));
}
 
/*
 * Specify if tasks run in series or parallel using `gulp.series` and `gulp.parallel`
 */
var build = gulp.series(beforeClean, gulp.parallel(styles, scripts), afterClean);
 
/*
 * You can use CommonJS `exports` module notation to declare tasks
 */
exports.styles = styles;
exports.scripts = scripts;
exports.watch = watch;
exports.build = build;
/*
 * Define default task that can be called by just running `gulp` from cli
 */
exports.default = build;